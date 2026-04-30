const express = require('express');
const router = express.Router();
const NationalRouteController = require('../../controllers/AllRoutes/NationalRouteController');

// Search between two stops (e.g. /api/national-routes/search?fromLocation=X&toLocation=Y)
router.get('/search', NationalRouteController.searchRouteBetweenStops);

// Filter by region (e.g. /api/national-routes/filter?province=Western)
router.get('/filter', NationalRouteController.getFilteredRoutes);

// Get single route for map plotting (e.g. /api/national-routes/60d5ec...)
router.get('/:id', NationalRouteController.getRouteById);

module.exports = router;
