const express = require('express');
const router = express.Router();
const BusData = require('../models/BusRealTimeData');
const predictionTimeController = require('../controllers/predictionTimeController');

// POST endpoint to receive bus data from IoT devices
router.post('/data', async (req, res) => {
    try {
        const { latitude, longitude, speed, rain_level, device_id, timestamp } = req.body;

        // Validate required fields
        if (!latitude || !longitude || speed === undefined || !device_id) {
            console.error('Validation failed. Received:', req.body);
            return res.status(400).json({ 
                message: 'Missing required fields: latitude, longitude, speed, or device_id',
                received: req.body
            });
        }

        const busData = new BusData({
            latitude,
            longitude,
            speed,
            rain_level: rain_level || 0,
            device_id,
            timestamp: timestamp ? new Date(timestamp) : new Date()
        });

        await busData.save();
        console.log(`✓ Saved: ${device_id} at (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) - Speed: ${speed} km/h`);
        res.status(201).json({ message: 'Bus data saved successfully' });
    } catch (error) {
        console.error('Error saving bus data:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// POST endpoint for time prediction
router.post('/predict', predictionTimeController.getPredictedTime);

module.exports = router;
