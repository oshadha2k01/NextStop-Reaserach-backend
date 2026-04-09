const mongoose = require('mongoose');

// Bridge table connecting Bus MongoDB ObjectId to IoT device_id
// This allows device reassignment - one device can be assigned to different buses over time
const busDeviceSchema = new mongoose.Schema({
    bus_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
        required: true,
        index: true
    },
    device_id: {
        type: String,
        required: true,
        index: true
        // REMOVED: unique: true  (allows device to be reassigned from one bus to another)
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
