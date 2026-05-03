const NationalRoute = require('../../models/AllRoutes/NationalRoute');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Helper: convert a raw coordinates array [[lat, lng], ...] into stages-compatible
 * objects that the Flutter frontend can render on Google Maps.
 * Samples up to MAX_POINTS waypoints so the response stays lean.
 */
const coordinatesToStages = (coordinates = []) => {
  if (!coordinates || coordinates.length === 0) return [];

  const MAX_POINTS = 200;
  let sampled = coordinates;

  if (coordinates.length > MAX_POINTS) {
    const step = Math.floor(coordinates.length / MAX_POINTS);
    sampled = coordinates.filter((_, i) => i % step === 0);
    const last = coordinates[coordinates.length - 1];
    if (sampled[sampled.length - 1] !== last) sampled.push(last);
  }

  return sampled.map((coord, i) => ({
    id: i + 1,
    name:
      i === 0
        ? 'Start'
        : i === sampled.length - 1
        ? 'End'
        : `Stop ${i + 1}`,
    fare_stage: 0,
    coordinates: {
      latitude: coord[0],
      longitude: coord[1],
    },
  }));
};

// 1. Home Page Search
// BUG FIX: previously only searched route_name/route_number.
// Now also searches stages[].name so individual stop names work (e.g. "Kaduwela").
exports.searchRouteBetweenStops = async (req, res) => {
  try {
    const { fromLocation, toLocation } = req.query;

    if (!fromLocation || !toLocation) {
      return res.status(400).json({ success: false, message: 'Missing from or to location' });
    }

    const fromTerm = String(fromLocation).trim();
    const toTerm = String(toLocation).trim();

    if (!fromTerm || !toTerm) {
      return res.status(400).json({ success: false, message: 'Location values cannot be empty' });
    }

    const fromPattern = new RegExp(escapeRegex(fromTerm), 'i');
    const toPattern = new RegExp(escapeRegex(toTerm), 'i');

    const matchingRoutes = await NationalRoute.find({
      $and: [
        {
          $or: [
            { 'stages.name': fromPattern },
            { route_name: fromPattern },
            { route_number: fromPattern },
          ],
        },
        {
          $or: [
            { 'stages.name': toPattern },
            { route_name: toPattern },
            { route_number: toPattern },
          ],
        },
      ],
    });

    if (matchingRoutes.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No direct route found between "${fromTerm}" and "${toTerm}"`,
      });
    }

    const routesWithStages = matchingRoutes.map((r) => {
      const obj = r.toObject();
      if (!obj.stages || obj.stages.length === 0) {
        obj.stages = coordinatesToStages(obj.coordinates);
      }
      return obj;
    });

    res.status(200).json({ success: true, routes: routesWithStages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. All Routes Page (Filter by Province/District)
// BUG FIX: '-stages.coordinates' is invalid Mongoose projection; use '-stages -coordinates'.
exports.getFilteredRoutes = async (req, res) => {
  try {
    const { province, district } = req.query;
    const query = {};

    if (province && province !== 'All') query.province = province;
    if (district && district !== 'All') query.district = district;

    const routes = await NationalRoute.find(query).select('-stages -coordinates');

    res.status(200).json({ success: true, count: routes.length, routes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Map View (Get full route details by _id)
// BUG FIX: seed script populates coordinates[] but stages[] is empty.
// Flutter only reads stages, so the map rendered nothing. Now we convert
// coordinates -> stages when stages are absent.
exports.getRouteById = async (req, res) => {
  try {
    const route = await NationalRoute.findById(req.params.id);
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });

    const obj = route.toObject();
    if (!obj.stages || obj.stages.length === 0) {
      obj.stages = coordinatesToStages(obj.coordinates);
    }

    res.status(200).json({ success: true, route: obj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
