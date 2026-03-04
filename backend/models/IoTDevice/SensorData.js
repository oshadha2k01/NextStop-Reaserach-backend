const mongoose = require('mongoose');

// Using strict: false allows dynamic data (great for IoT sensors)
const sensorSchema = new mongoose.Schema({
    device_id: String,
    timestamp: Number,
    gps: Object,
    imu: Object,
    weather: Object,
    received_at: { type: Date, default: Date.now }
}, { strict: false });

module.exports = mongoose.model('SensorData', sensorSchema, 'sensor_readings');