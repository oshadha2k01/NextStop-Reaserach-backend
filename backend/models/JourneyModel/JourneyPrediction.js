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
    actualTimeMinutes: {
        type: Number
    },
    absoluteErrorMinutes: {
        type: Number
    },
    errorPercent: {
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
    validation: {
        distanceSource: String,
        distanceDisagreementPct: Number,
        googleDistanceKm: Number,
        routeSequenceDistanceKm: Number,
        resolvedCoordinates: {
            boarding: {
                lat: Number,
                lng: Number
            },
            destination: {
                lat: Number,
                lng: Number
            }
        }
    },
    modelVersion: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'journey_predictions'
});

module.exports = mongoose.model('JourneyPrediction', journeyPredictionSchema);
