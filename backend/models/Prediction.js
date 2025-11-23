const mongoose = require('mongoose');

const PredictionSchema = new mongoose.Schema({
    date: Date,
    time: String,
    predictedCrowd: Number,
    dayOfWeek: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Prediction', PredictionSchema);