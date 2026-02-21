const express = require('express');
const router = express.Router();
const etaController = require('../controllers/etaController');

// POST endpoint for ETA prediction
router.post('/predict', etaController.predictETA);

// GET endpoint for ETA service health check
router.get('/health', etaController.etaHealthCheck);

module.exports = router;