const express = require('express');
const router = express.Router();
const boardingController = require('../../controllers/Passenger/boardingNotificationController');

// POST /api/notify/board
// Passenger taps "I'm getting on" and sends bus ID + their GPS coordinates
// Backend calculates real road distance, travel time, stop count, then alerts driver via Socket.IO
router.post('/board', boardingController.notifyBusDriver);

module.exports = router;
