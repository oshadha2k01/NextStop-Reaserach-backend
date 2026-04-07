const mongoose = require('mongoose');

const PredictionSchema = new mongoose.Schema({
    routeNumber: String,
    direction: {
        type: String,
        enum: ['inbound', 'outbound'],
        default: 'inbound'
    },
    fromLocation: String,
    toLocation: String,
    stopsIncluded: [String],
    date: Date,
    time: String,
    isPublicHoliday: { type: Boolean, default: false },
    isRaining: { type: Boolean, default: false },
    predictedCrowd: Number,
    actualCrowd: { type: Number, default: null },
    absoluteError: { type: Number, default: null },
    validatedAt: { type: Date, default: null },
    dayOfWeek: String,
    status: String,
    recommendation: String,
    crowdLevel: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Prediction', PredictionSchema);