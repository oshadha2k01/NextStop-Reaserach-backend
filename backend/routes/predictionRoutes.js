/**
 * Prediction Routes
 * REST routes for journey time prediction API
 * 
 * Endpoints:
 * GET  /api/prediction/health
 * POST /api/prediction/journey-time
 * POST /api/prediction/compare
 * GET  /api/prediction/model-info
 */

const express = require('express');
const router = express.Router();

const {
    checkPredictionHealth,
    predictJourneyTime,
    predictAndCompare,
    getModelInformation
} = require('../controllers/predictionTimeController');

/**
 * GET /api/prediction/health
 * Check if ML prediction API is available and healthy
 */
router.get('/health', checkPredictionHealth);

/**
 * POST /api/prediction/journey-time
 * Predict journey time for a bus route
 * 
 * Body:
 * {
 *   "boardingLat": number,
 *   "boardingLng": number,
 *   "destinationLat": number,
 *   "destinationLng": number,
 *   "stopDurationSeconds": number,
 *   "hour": number,
 *   "dayOfWeek": number (optional),
 *   "isWeekend": number (optional)
 * }
 */
router.post('/journey-time', predictJourneyTime);

/**
 * POST /api/prediction/compare
 * Predict and compare with user's expected time
 * 
 * Body:
 * {
 *   "boardingLat": number,
 *   "boardingLng": number,
 *   "destinationLat": number,
 *   "destinationLng": number,
 *   "stopDurationSeconds": number,
 *   "hour": number,
 *   "userExpectedMinutes": number
 * }
 */
router.post('/compare', predictAndCompare);

/**
 * GET /api/prediction/model-info
 * Get information about the ML model
 */
router.get('/model-info', getModelInformation);

module.exports = router;
