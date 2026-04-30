const NationalRoute = require('../../models/AllRoutes/NationalRoute');

// 1. Home Page Search (Find route containing From & To)
exports.searchRouteBetweenStops = async (req, res) => {
  try {
    const { fromLocation, toLocation } = req.query;

    if (!fromLocation || !toLocation) {
      return res.status(400).json({ success: false, message: 'Missing from or to location' });
    }

    const matchingRoutes = await NationalRoute.find({
      $and: [
        { 'stages.name': fromLocation },
        { 'stages.name': toLocation }
      ]
    });

    if (matchingRoutes.length === 0) {
      return res.status(404).json({ success: false, message: 'No direct route found' });
    }

    res.status(200).json({ success: true, routes: matchingRoutes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. All Routes Page (Filter by Province/District)
exports.getFilteredRoutes = async (req, res) => {
  try {
    const { province, district } = req.query;
    let query = {};

    if (province && province !== 'All') query.province = province;
    if (district && district !== 'All') query.district = district;

    const routes = await NationalRoute.find(query).select('-stages.coordinates');

    res.status(200).json({ success: true, count: routes.length, routes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Map View (Get full details for a single route)
exports.getRouteById = async (req, res) => {
  try {
    const route = await NationalRoute.findById(req.params.id);
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
    res.status(200).json({ success: true, route });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
