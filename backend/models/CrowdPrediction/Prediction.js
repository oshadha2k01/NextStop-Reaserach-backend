const mongoose = require('mongoose');

const PredictionSchema = new mongoose.Schema({
    routeNumber: String,
    fromLocation: String,
    toLocation: String,
    stopsIncluded: [String],
    date: Date,
    time: String,
    predictedCrowd: Number,
    dayOfWeek: String,
    status: String,
    recommendation: String,
    crowdLevel: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Prediction', PredictionSchema);