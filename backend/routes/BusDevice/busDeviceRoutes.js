const express    = require('express');
const router     = express.Router();
const controller = require('../../controllers/BusDevice/busDeviceController');

// POST   /api/bus-device/register   — link a Bus ObjectId to an IoT device_id
router.post('/register', controller.register);

// GET    /api/bus-device/stats      — dashboard stats
router.get('/stats', controller.getStats);

// GET    /api/bus-device/unassigned-buses — buses with no linked device
router.get('/unassigned-buses', controller.listUnassignedBuses);

// GET    /api/bus-device            — list all registrations
router.get('/', controller.listAll);

// GET    /api/bus-device/:busId     — get registration for one bus
router.get('/:busId', controller.getByBusId);

// PUT    /api/bus-device/:busId     — change device_id or toggle is_active
router.put('/:busId', controller.update);

// DELETE /api/bus-device/:busId     — permanently remove a registration
router.delete('/:busId', controller.remove);

module.exports = router;
