const Prediction = require('../../models/CrowdPrediction/Prediction');
const routes = require('../../config/routes');
const axios = require('axios');

exports.getPredictionAndSave = async (req, res) => {
    const {
        date,
        time,
        routeNumber = '177',
        direction = 'inbound',
        isPublicHoliday,
        isRaining = false
    } = req.body;
    
    try {
        // Calling Flask on ML_SERVICE_URL
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
        const response = await axios.post(`${mlServiceUrl}/predict-crowd`, {
            date,
            time,
            routeNumber,
            direction,
            isPublicHoliday,
            isRaining
        });
        const data = response.data;

        const newRecord = new Prediction({
            routeNumber: String(routeNumber),
            direction: data.direction || direction,
            date: new Date(data.date),
            time: data.time,
            isPublicHoliday: Boolean(data.is_public_holiday),
            isRaining: Boolean(data.is_raining),
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

        if (fromStop && toStop && fromStop.order !== toStop.order) {
            const direction = fromStop.order < toStop.order ? 'inbound' : 'outbound';
            return { routeNumber: routeNum, route: routeData, fromStop, toStop, direction };
        }
    }
    return null;
};

// Route-based prediction with from/to locations (auto-detect route).
// Accepts fromStop/toStop (Flutter) and from/to (legacy) field names.
exports.getRoutePrediction = async (req, res) => {
    const {
        fromStop,
        toStop,
        from,
        to,
        date,
        time,
        isPublicHoliday,
        isRaining = false
    } = req.body;

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

        const { routeNumber, route, fromStop: resolvedFrom, toStop: resolvedTo, direction } = routeInfo;

        // Get stops in between for both inbound and outbound directions.
        const minOrder = Math.min(resolvedFrom.order, resolvedTo.order);
        const maxOrder = Math.max(resolvedFrom.order, resolvedTo.order);
        let stopsInBetween = route.stops.filter(
            stop => stop.order >= minOrder && stop.order <= maxOrder
        );
        if (direction === 'outbound') {
            stopsInBetween = stopsInBetween.sort((a, b) => b.order - a.order);
        }

        // Call Flask ML service for prediction
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
        const response = await axios.post(`${mlServiceUrl}/predict-crowd`, {
            date,
            time,
            routeNumber,
            direction,
            isPublicHoliday,
            isRaining
        });
        const predictionData = response.data;

        // Save to database
        const newRecord = new Prediction({
            routeNumber,
            direction,
            fromLocation: resolvedFrom.name,
            toLocation: resolvedTo.name,
            stopsIncluded: stopsInBetween.map(s => s.name),
            date: new Date(predictionData.date),
            time: predictionData.time,
            isPublicHoliday: Boolean(predictionData.is_public_holiday),
            isRaining: Boolean(predictionData.is_raining),
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
                direction,
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

// Save observed crowd and compute absolute error for live validation.
exports.updateActualCrowd = async (req, res) => {
    const { predictionId } = req.params;
    const { actualCrowd } = req.body;

    if (actualCrowd === undefined || actualCrowd === null || Number.isNaN(Number(actualCrowd))) {
        return res.status(400).json({
            success: false,
            message: 'Missing valid numeric field: actualCrowd.'
        });
    }

    try {
        const record = await Prediction.findById(predictionId);
        if (!record) {
            return res.status(404).json({ success: false, message: 'Prediction record not found.' });
        }

        const actual = Number(actualCrowd);
        record.actualCrowd = actual;
        record.absoluteError = Math.abs((record.predictedCrowd || 0) - actual);
        record.validatedAt = new Date();
        await record.save();

        res.status(200).json({
            success: true,
            validation: {
                predictionId: record._id,
                predictedCrowd: record.predictedCrowd,
                actualCrowd: record.actualCrowd,
                absoluteError: record.absoluteError,
                validatedAt: record.validatedAt
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Aggregate live MAE from validated prediction records.
exports.getValidationMetrics = async (req, res) => {
    try {
        const metrics = await Prediction.aggregate([
            { $match: { actualCrowd: { $ne: null }, absoluteError: { $ne: null } } },
            {
                $group: {
                    _id: null,
                    mae: { $avg: '$absoluteError' },
                    sampleSize: { $sum: 1 },
                    lastValidatedAt: { $max: '$validatedAt' }
                }
            }
        ]);

        const summary = metrics[0] || { mae: null, sampleSize: 0, lastValidatedAt: null };

        res.status(200).json({
            success: true,
            metrics: {
                mae: summary.mae !== null ? Number(summary.mae.toFixed(2)) : null,
                sampleSize: summary.sampleSize,
                lastValidatedAt: summary.lastValidatedAt
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};