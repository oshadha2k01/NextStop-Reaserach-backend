const express = require('express');
const router = express.Router();
const etaController = require('../../controllers/IoTDevice/etaController');

// GET endpoint for ETA prediction with query parameters
// Usage: /api/eta?busId=ESP32_WROOM_DA_01&userLat=6.9124&userLng=79.8516
router.get('/', etaController.predictETAFromQuery);

// POST endpoint for ETA prediction
router.post('/predict', etaController.predictETA);

// POST endpoint for enhanced ETA prediction with real-time data
router.post('/predict/enhanced', etaController.predictETA);

// GET endpoint for ETA service health check
router.get('/health', etaController.etaHealthCheck);

module.exports = router;