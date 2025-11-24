const mongoose = require('mongoose');

const predictionHistorySchema = new mongoose.Schema({
    busId: {
        type: String,
        required: true
    },
    userLocation: {
        type: String,
        required: true
    },
    destination: {
        type: String,
        required: true
    },
    predictedTimeMinutes: {
        type: Number,
        required: true
    },
    distanceKm: {
        type: Number,
        required: true
    },
    desiredTimeMinutes: {
        type: Number,
        required: true
    },
    alertStatus: {
        type: String,
        enum: ['success', 'warning'],
        required: true
    },
    alertMessage: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('PredictionHistory', predictionHistorySchema);
