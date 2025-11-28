const Prediction = require('../models/Prediction');
const routes = require('../config/routes');
const axios = require('axios');

exports.getPredictionAndSave = async (req, res) => {
    const { date, time } = req.body;
    
    try {
        // Calling Flask on Port 5000
        const response = await axios.post('http://localhost:5000/predict', { date, time });
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

// Helper function to find route by locations
const findRouteByLocations = (fromLocation, toLocation) => {
    for (const [routeNum, routeData] of Object.entries(routes)) {
        const fromStop = routeData.stops.find(stop => stop.name === fromLocation);
        const toStop = routeData.stops.find(stop => stop.name === toLocation);
        
        if (fromStop && toStop && fromStop.order < toStop.order) {
            return {
                routeNumber: routeNum,
                route: routeData,
                fromStop,
                toStop
            };
        }
    }
    return null;
};

// New: Route-based prediction with from/to locations (auto-detect route)
exports.getRoutePrediction = async (req, res) => {
    const { from, to, date, time } = req.body;
    
    try {
        // Auto-detect route based on locations
        const routeInfo = findRouteByLocations(from, to);
        
        if (!routeInfo) {
            return res.status(404).json({
                success: false,
                message: 'No route found for the specified locations. Please check the location names.'
            });
        }
        
        const { routeNumber, route, fromStop, toStop } = routeInfo;
        
        // Get stops in between
        const stopsInBetween = route.stops.filter(
            stop => stop.order >= fromStop.order && stop.order <= toStop.order
        );
        
        // Call Flask ML service for prediction
        const response = await axios.post('http://localhost:5000/predict', { date, time });
        const predictionData = response.data;

        // Save to database
        const newRecord = new Prediction({
            routeNumber,
            fromLocation: from,
            toLocation: to,
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
        
        // Return complete prediction with route info (without stops array)
        res.status(200).json({
            success: true,
            route: {
                routeNumber,
                routeName: route.name,
                from: from,
                to: to,
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