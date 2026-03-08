const express = require('express');
const router = express.Router();
const predictionController = require('../../controllers/CrowdPrediction/crowdPredictionController');

router.post('/crowd-predict', predictionController.getPredictionAndSave);
router.post('/route-predict', predictionController.getRoutePrediction);

module.exports = router;
