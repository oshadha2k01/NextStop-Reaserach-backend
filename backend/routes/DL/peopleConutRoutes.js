const express = require('express');
const router = express.Router();
const peopleConutController = require('../../controllers/DL/peopleConutController');

// GET /api/dl/peopleConut
router.get('/peopleConut', peopleConutController.getPeopleConutData);

// GET /api/dl/peopleConut/filtered
router.get('/peopleConut/filtered', peopleConutController.getPeopleConutFiltered);

// GET /api/dl/peopleConut/stats
router.get('/peopleConut/stats', peopleConutController.getPeopleConutStats);

// GET /api/dl/peopleConut/history
router.get('/peopleConut/history', peopleConutController.getPeopleConutHistory);

module.exports = router;
