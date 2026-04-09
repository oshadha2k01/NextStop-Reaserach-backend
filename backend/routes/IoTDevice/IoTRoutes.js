const express = require('express');
const router = express.Router();
const iotController = require('../../controllers/IoTDevice/IoTController');

// ESP32 POSTs to: /api/sensor-data
router.post('/sensor-data', iotController.receiveSensorData);

// Frontend GETs from: /api/eta
router.get('/eta', iotController.getLiveEta);

// Frontend GETs from: /api/iot-devices
router.get('/iot-devices', iotController.getKnownDevices);

module.exports = router;