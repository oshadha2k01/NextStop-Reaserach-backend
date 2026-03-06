const mongoose = require('mongoose');

const BusRealTimeDataSchema = new mongoose.Schema({
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    speed: { type: Number, required: true },
    rain_level: { type: Number, default: 0 },
    device_id: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('BusRealTimeData', BusRealTimeDataSchema);