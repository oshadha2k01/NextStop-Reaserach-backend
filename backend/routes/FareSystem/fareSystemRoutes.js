const express = require('express');
const router = express.Router();
const fareController = require('../../controllers/FareSystem/fareSystemController');

/**
 * FareSystem Routes
 * Connects Frontend to the refined ML FareSystem
 */

// POST /api/fare-system/calculate
router.post('/calculate', fareController.calculateFare);

// POST /api/fare-system/calculate-by-location
router.post('/calculate-by-location', fareController.calculateFareByLocation);

// POST /api/fare-system/find-nearest
router.post('/find-nearest', fareController.findNearestStage);

// GET /api/fare-system/route-info
router.get('/route-info', fareController.getRouteInfo);

// POST /api/fare-system/calculate-journey
router.post('/calculate-journey', fareController.calculateJourney);

module.exports = router;
