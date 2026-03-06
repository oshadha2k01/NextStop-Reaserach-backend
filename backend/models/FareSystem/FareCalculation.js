const mongoose = require('mongoose');

const fareCalculationSchema = new mongoose.Schema({
    boardingStage: {
        name: String,
        id: Number
    },
    alightingStage: {
        name: String,
        id: Number
    },
    fare: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'LKR'
    },
    distanceKm: {
        type: Number
    },
    estimatedTimeMinutes: {
        type: Number
    },
    busId: {
        type: String
    },
    source: {
        type: String,
        enum: ['stage', 'location'],
        default: 'stage'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'fare_calculations'
});

module.exports = mongoose.model('FareCalculation', fareCalculationSchema);
