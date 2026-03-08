const express = require('express');
const router = express.Router();
const journeyController = require('../../controllers/JourneyModel/journeyModelController');

/**
 * JourneyModel Routes
 * Matches the production-grade Hybrid ML API
 */

// POST /api/destination          (used by Flutter app)
// POST /api/destination/predict  (canonical endpoint)
router.post('/', journeyController.getJourneyPrediction);
router.post('/predict', journeyController.getJourneyPrediction);

// GET /api/journey-model/health
// Checks if the Flask service is alive
router.get('/health', journeyController.checkMLHealth);

module.exports = router;
