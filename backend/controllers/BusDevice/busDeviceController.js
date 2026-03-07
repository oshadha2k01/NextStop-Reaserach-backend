const BusDevice = require('../../models/Bus/BusDevice');
const Bus       = require('../../models/Bus/BusModel');
const mongoose  = require('mongoose');

/**
 * POST /api/bus-device/register
 * Register (or re-activate) a Bus ↔ IoT Device pairing.
 * Body: { busId, deviceId }
 *
 * After calling this, POST /api/notify/board will be able to
 * locate the IoT device for the given busId.
 */
exports.register = async (req, res) => {
    try {
        const { busId, deviceId } = req.body;

        if (!busId || !deviceId) {
            return res.status(400).json({
                error: 'Missing required fields: busId, deviceId'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(busId)) {
            return res.status(400).json({ error: 'busId must be a valid MongoDB ObjectId' });
        }

        // Confirm the bus document actually exists
        const bus = await Bus.findById(busId);
        if (!bus) {
            return res.status(404).json({ error: `No bus found with id ${busId}` });
        }

        // Upsert: if a record already exists for this bus_id, update it;
        // otherwise create a new one.
        const registration = await BusDevice.findOneAndUpdate(
            { bus_id: busId },
            {
                bus_id:        busId,
                device_id:     deviceId,
                is_active:     true,
                registered_at: new Date()
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Bus-Device registration saved successfully',
            registration: {
                id:            registration._id,
                busId:         registration.bus_id,
                deviceId:      registration.device_id,
                isActive:      registration.is_active,
                registeredAt:  registration.registered_at,
                busRegNo:      bus.regNo,
                busRoute:      bus.route
            }
        });

    } catch (error) {
        console.error('BusDevice register error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

/**
 * GET /api/bus-device
 * List all bus-device registrations (both active and inactive).
 */
exports.listAll = async (req, res) => {
    try {
        const registrations = await BusDevice.find()
            .populate('bus_id', 'regNo route ownerName approvalStatus')
            .sort({ registered_at: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            count: registrations.length,
            registrations: registrations.map(r => ({
                id:           r._id,
                busId:        r.bus_id?._id,
                busRegNo:     r.bus_id?.regNo,
                busRoute:     r.bus_id?.route,
                deviceId:     r.device_id,
                isActive:     r.is_active,
                registeredAt: r.registered_at
            }))
        });

    } catch (error) {
        console.error('BusDevice listAll error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/bus-device/:busId
 * Get the registration for one specific bus.
 */
exports.getByBusId = async (req, res) => {
    try {
        const { busId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(busId)) {
            return res.status(400).json({ error: 'busId must be a valid MongoDB ObjectId' });
        }

        const registration = await BusDevice.findOne({ bus_id: busId })
            .populate('bus_id', 'regNo route ownerName approvalStatus')
            .lean();

        if (!registration) {
            return res.status(404).json({ error: `No device registration found for bus ${busId}` });
        }

        return res.status(200).json({
            success: true,
            registration: {
                id:           registration._id,
                busId:        registration.bus_id?._id,
                busRegNo:     registration.bus_id?.regNo,
                busRoute:     registration.bus_id?.route,
                deviceId:     registration.device_id,
                isActive:     registration.is_active,
                registeredAt: registration.registered_at
            }
        });

    } catch (error) {
        console.error('BusDevice getByBusId error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * PUT /api/bus-device/:busId
 * Update the IoT device ID or active status for a bus.
 * Body: { deviceId?, isActive? }
 */
exports.update = async (req, res) => {
    try {
        const { busId } = req.params;
        const { deviceId, isActive } = req.body;

        if (!mongoose.Types.ObjectId.isValid(busId)) {
            return res.status(400).json({ error: 'busId must be a valid MongoDB ObjectId' });
        }

        if (deviceId === undefined && isActive === undefined) {
            return res.status(400).json({ error: 'Provide at least one field to update: deviceId, isActive' });
        }

        const updateFields = {};
        if (deviceId  !== undefined) updateFields.device_id = deviceId;
        if (isActive  !== undefined) updateFields.is_active = isActive;

        const updated = await BusDevice.findOneAndUpdate(
            { bus_id: busId },
            updateFields,
            { new: true }
        ).populate('bus_id', 'regNo route');

        if (!updated) {
            return res.status(404).json({ error: `No registration found for bus ${busId}` });
        }

        return res.status(200).json({
            success: true,
            message: 'Registration updated',
            registration: {
                id:           updated._id,
                busId:        updated.bus_id?._id,
                busRegNo:     updated.bus_id?.regNo,
                deviceId:     updated.device_id,
                isActive:     updated.is_active,
                registeredAt: updated.registered_at
            }
        });

    } catch (error) {
        console.error('BusDevice update error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * DELETE /api/bus-device/:busId
 * Permanently remove a bus-device registration.
 */
exports.remove = async (req, res) => {
    try {
        const { busId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(busId)) {
            return res.status(400).json({ error: 'busId must be a valid MongoDB ObjectId' });
        }

        const deleted = await BusDevice.findOneAndDelete({ bus_id: busId });

        if (!deleted) {
            return res.status(404).json({ error: `No registration found for bus ${busId}` });
        }

        return res.status(200).json({
            success: true,
            message: `Registration for bus ${busId} (device: ${deleted.device_id}) removed`
        });

    } catch (error) {
        console.error('BusDevice remove error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
