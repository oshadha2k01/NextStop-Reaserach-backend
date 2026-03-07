const express = require('express');
const router = express.Router();
const controller = require('../../controllers/PredictionService/predictionServiceController');

// POST /api/arrival/predict
// Two-stage bus arrival prediction using live IoT bus data
router.post('/predict', controller.predictArrival);

module.exports = router;
