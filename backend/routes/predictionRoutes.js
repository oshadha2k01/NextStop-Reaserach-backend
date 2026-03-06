const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');

router.post('/predict', predictionController.getPredictionAndSave);
router.post('/destinationpredict', predictionController.getDestinationPrediction);

module.exports = router;
