const axios = require('axios');

const ETA_API_URL = process.env.ETA_API_URL || 'http://localhost:5001';

/**
 * Predict ETA for bus to reach user location
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function predictETA(req, res) {
    try {
        const {
            bus_lat,
            bus_lng,
            user_lat,
            user_lng,
            bus_speed_kmh,
            weather_was_raining
        } = req.body;

        // Validate required fields
        if (!bus_lat || !bus_lng || !user_lat || !user_lng || bus_speed_kmh === undefined) {
            return res.status(400).json({
                message: 'Missing required fields: bus_lat, bus_lng, user_lat, user_lng, bus_speed_kmh',
                received: req.body
            });
        }

        // Call ETA API
        const response = await axios.post(`${ETA_API_URL}/predict`, {
            bus_lat: parseFloat(bus_lat),
            bus_lng: parseFloat(bus_lng),
            user_lat: parseFloat(user_lat),
            user_lng: parseFloat(user_lng),
            bus_speed_kmh: parseFloat(bus_speed_kmh),
            weather_was_raining: weather_was_raining ? 1 : 0
        });

        res.json({
            success: true,
            eta: response.data.prediction,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('ETA prediction error:', error.message);
        res.status(500).json({
            message: 'ETA prediction failed',
            error: error.message
        });
    }
}

/**
 * Health check for ETA service
 */
async function etaHealthCheck(req, res) {
    try {
        const response = await axios.get(`${ETA_API_URL}/health`);
        res.json(response.data);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            service: 'ETA API',
            error: error.message
        });
    }
}

module.exports = {
    predictETA,
    etaHealthCheck
};