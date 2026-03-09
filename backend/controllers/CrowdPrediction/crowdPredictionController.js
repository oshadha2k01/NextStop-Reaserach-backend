const Prediction = require('../../models/CrowdPrediction/Prediction');
const routes = require('../../config/routes');
const axios = require('axios');

exports.getPredictionAndSave = async (req, res) => {
    const { date, time } = req.body;
    
    try {
        // Calling Flask on ML_SERVICE_URL
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
        const response = await axios.post(`${mlServiceUrl}/predict-crowd`, { date, time });
        const data = response.data;

        const newRecord = new Prediction({
            date: new Date(data.date),
            time: data.time,
            predictedCrowd: data.predicted_crowd,
            dayOfWeek: data.day_of_week,
            status: data.status,
            recommendation: data.recommendation,
            crowdLevel: data.crowd_level
        });

        await newRecord.save();
        
        // Return complete prediction data with recommendations
        res.status(200).json({
            success: true,
            prediction: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
};

// Helper: find route by locations using case-insensitive partial matching.
// Accepts partial input like "Kaduwela" → matches "Kaduwela Bus Stand".
const findRouteByLocations = (fromLocation, toLocation) => {
    const fromLower = fromLocation.trim().toLowerCase();
    const toLower   = toLocation.trim().toLowerCase();

    for (const [routeNum, routeData] of Object.entries(routes)) {
        const fromStop = routeData.stops.find(stop => {
            const s = stop.name.toLowerCase();
            return s.includes(fromLower) || fromLower.includes(s);
        });
        const toStop = routeData.stops.find(stop => {
            const s = stop.name.toLowerCase();
            return s.includes(toLower) || toLower.includes(s);
        });

        if (fromStop && toStop && fromStop.order < toStop.order) {
            return { routeNumber: routeNum, route: routeData, fromStop, toStop };
        }
    }
    return null;
};

// Route-based prediction with from/to locations (auto-detect route).
// Accepts fromStop/toStop (Flutter) and from/to (legacy) field names.
exports.getRoutePrediction = async (req, res) => {
    const { fromStop, toStop, from, to, date, time } = req.body;

    // Support both field name conventions
    const fromLocation = (fromStop || from || '').trim();
    const toLocation   = (toStop   || to   || '').trim();

    if (!fromLocation || !toLocation) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: fromStop and toStop (or from and to).'
        });
    }

    if (!date || !time) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: date and time.'
        });
    }
        
    try {
        // Auto-detect route based on partial location names
        const routeInfo = findRouteByLocations(fromLocation, toLocation);

        if (!routeInfo) {
            return res.status(404).json({
                success: false,
                message: `No route found between "${fromLocation}" and "${toLocation}". Check the stop names.`
            });
        }

        const { routeNumber, route, fromStop: resolvedFrom, toStop: resolvedTo } = routeInfo;

        // Get stops in between
        const stopsInBetween = route.stops.filter(
            stop => stop.order >= resolvedFrom.order && stop.order <= resolvedTo.order
        );

        // Call Flask ML service for prediction
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
        const response = await axios.post(`${mlServiceUrl}/predict-crowd`, { date, time });
        const predictionData = response.data;

        // Save to database
        const newRecord = new Prediction({
            routeNumber,
            fromLocation: resolvedFrom.name,
            toLocation: resolvedTo.name,
            stopsIncluded: stopsInBetween.map(s => s.name),
            date: new Date(predictionData.date),
            time: predictionData.time,
            predictedCrowd: predictionData.predicted_crowd,
            dayOfWeek: predictionData.day_of_week,
            status: predictionData.status,
            recommendation: predictionData.recommendation,
            crowdLevel: predictionData.crowd_level
        });

        await newRecord.save();

        // Return complete prediction with resolved (full) stop names
        res.status(200).json({
            success: true,
            route: {
                routeNumber,
                routeName: route.name,
                from: resolvedFrom.name,
                to: resolvedTo.name,
                totalStops: stopsInBetween.length
            },
            prediction: predictionData
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};