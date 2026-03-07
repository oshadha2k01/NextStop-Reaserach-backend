const express = require('express');
const router = express.Router();
const routes = require('../config/routes');

// Get all available routes
router.get('/routes', (req, res) => {
    const routeList = Object.keys(routes).map(routeNum => ({
        routeNumber: routeNum,
        name: routes[routeNum].name,
        totalStops: routes[routeNum].stops.length
    }));
    
    res.json({
        success: true,
        routes: routeList
    });
});

// Get stops for a specific route
router.get('/routes/:routeNumber/stops', (req, res) => {
    const { routeNumber } = req.params;
    const route = routes[routeNumber];
    
    if (!route) {
        return res.status(404).json({
            success: false,
            message: `Route ${routeNumber} not found`
        });
    }
    
    res.json({
        success: true,
        routeNumber,
        routeName: route.name,
        stops: route.stops
    });
});

// Get all available locations (from all routes)
router.get('/locations', (req, res) => {
    const allLocations = new Set();
    
    Object.values(routes).forEach(route => {
        route.stops.forEach(stop => {
            allLocations.add(stop.name);
        });
    });
    
    res.json({
        success: true,
        locations: Array.from(allLocations).sort()
    });
});

// Get stops between two locations (auto-detect route)
router.post('/stops-between', (req, res) => {
    const { from, to } = req.body;
    
    // Find route that contains both locations
    let foundRoute = null;
    let fromStop = null;
    let toStop = null;
    
    for (const [routeNum, routeData] of Object.entries(routes)) {
        fromStop = routeData.stops.find(stop => stop.name === from);
        toStop = routeData.stops.find(stop => stop.name === to);
        
        if (fromStop && toStop) {
            foundRoute = { number: routeNum, data: routeData };
            break;
        }
    }
    
    if (!foundRoute) {
        return res.status(404).json({
            success: false,
            message: 'No route found connecting these locations'
        });
    }
    
    if (fromStop.order >= toStop.order) {
        return res.status(400).json({
            success: false,
            message: 'From location must be before to location on the route'
        });
    }
    
    const stopsInBetween = foundRoute.data.stops.filter(
        stop => stop.order >= fromStop.order && stop.order <= toStop.order
    );
    
    res.json({
        success: true,
        routeNumber: foundRoute.number,
        routeName: foundRoute.data.name,
        from: fromStop.name,
        to: toStop.name,
        stops: stopsInBetween,
        totalStops: stopsInBetween.length
    });
});

module.exports = router;
