const mongoose = require('mongoose');

// Clean dataset exclusively for training the ML Model
const stopSchema = new mongoose.Schema({
    device_id: String,
    lat: Number,
    lng: Number,
    stop_duration_seconds: Number,
    weather_was_raining: Boolean,
    imu_status: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BusStop', stopSchema, 'ml_bus_stops');