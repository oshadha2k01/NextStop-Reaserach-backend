const mongoose = require('mongoose');

const busRealTimeDataSchema = new mongoose.Schema(
    {
        busId: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        currentLatitude: {
            type: Number,
            required: true
        },
        currentLongitude: {
            type: Number,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    {
        strict: false
    }
);

module.exports = mongoose.model('BusRealTimeData', busRealTimeDataSchema, 'bus_real_time_data');
