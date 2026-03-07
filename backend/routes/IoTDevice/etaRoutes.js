const express = require('express');
const router = express.Router();
const etaController = require('../../controllers/IoTDevice/etaController');

// POST endpoint for ETA prediction
router.post('/predict', etaController.predictETA);

// POST endpoint for enhanced ETA prediction with real-time data
router.post('/predict/enhanced', etaController.predictETA);

// GET endpoint for ETA service health check
router.get('/health', etaController.etaHealthCheck);

module.exports = router;