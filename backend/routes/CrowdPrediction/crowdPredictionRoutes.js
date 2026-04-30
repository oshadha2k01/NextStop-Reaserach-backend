const express = require('express');
const router = express.Router();
const predictionController = require('../../controllers/CrowdPrediction/crowdPredictionController');

router.post('/crowd', predictionController.getPredictionAndSave); 
router.post('/route-predict', predictionController.getRoutePrediction);
router.patch('/crowd/:predictionId/actual', predictionController.updateActualCrowd);
router.get('/crowd/metrics', predictionController.getValidationMetrics);

module.exports = router;
