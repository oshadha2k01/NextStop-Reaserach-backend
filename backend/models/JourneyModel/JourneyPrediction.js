const mongoose = require('mongoose');

const journeyPredictionSchema = new mongoose.Schema({
    boardingLocation: {
        type: String,
        required: true
    },
    destinationLocation: {
        type: String,
        required: true
    },
    predictedTimeMinutes: {
        type: Number,
        required: true
    },
    journeyDistanceKm: {
        type: Number,
        required: true
    },
    trafficCondition: {
        type: String,
        required: true
    },
    userExpectedTime: {
        type: Number
    },
    recommendation: {
        type: String
    },
    route: {
        type: String,
        default: '177'
    },
    nearestStages: {
        boarding: String,
        destination: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'journey_predictions'
});

module.exports = mongoose.model('JourneyPrediction', journeyPredictionSchema);
