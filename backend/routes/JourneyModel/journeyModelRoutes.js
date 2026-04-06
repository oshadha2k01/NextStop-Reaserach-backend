const express = require('express');
const router = express.Router();
const journeyController = require('../../controllers/JourneyModel/journeyModelController');

/**
 * JourneyModel Routes
 * Matches the production-grade Hybrid ML API
 */

// POST /api/journey-model/predict
// Calculates journey time using road distance and real-time 177 traffic
router.post('/predict', journeyController.getJourneyPrediction);

// PATCH /api/journey-model/:predictionId/outcome
// Records the actual journey time after the trip completes
router.patch('/:predictionId/outcome', journeyController.recordJourneyOutcome);

// GET /api/journey-model/health
// Checks if the Flask service is alive
router.get('/health', journeyController.checkMLHealth);

module.exports = router;
