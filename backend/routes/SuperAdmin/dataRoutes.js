const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/SuperAdmin/dataController');

// Get latest people count data
router.get('/people-count', dataController.getPeopleCountData);

// Get people count with filtering (date range, pagination)
// Query params: startDate, endDate, limit, skip
router.get('/people-count/filtered', dataController.getPeopleCountFiltered);

// Get aggregated statistics
// Query param: timeRange (hour, day, week, month, all)
router.get('/people-count/stats', dataController.getPeopleCountStats);

// Get people count history (time series)
// Query param: limit
router.get('/people-count/history', dataController.getPeopleCountHistory);

module.exports = router;
