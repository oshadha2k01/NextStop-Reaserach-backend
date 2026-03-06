const mongoose = require('mongoose');

// Bridge table connecting Bus MongoDB ObjectId to IoT device_id
const busDeviceSchema = new mongoose.Schema({
    bus_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
        required: true,
        unique: true,
        index: true
    },
    device_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    registered_at: {
        type: Date,
        default: Date.now
    },
    is_active: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('BusDevice', busDeviceSchema, 'bus_devices');
