const fareService = require('../../services/FareSystem/fareSystemService');
const FareCalculation = require('../../models/FareSystem/FareCalculation');

/**
 * FareSystem MVC Controller
 */

exports.calculateFare = async (req, res) => {
    try {
        const result = await fareService.calculateFare(req.body);

        if (!result.success) {
            return res.status(result.statusCode).json({ error: result.error });
        }

        // Normalize ML response into a consistent shape before persisting
        const data = result.data || {};
        const boardingName = data.boarding_stage || data.boarding || (data.journey && data.journey.from && data.journey.from.name) || null;
        const alightingName = data.alighting_stage || data.destination || (data.journey && data.journey.to && data.journey.to.name) || null;
        const fareAmount = (typeof data.fare === 'number') ? data.fare : (data.journey && data.journey.fare && data.journey.fare.amount) || null;

        // Only persist when we have at least a fare and one stage name
        if (fareAmount !== null && (boardingName || alightingName)) {
            const history = new FareCalculation({
                boardingStage: { name: boardingName || null, id: data.boarding_stage_id || (data.journey && data.journey.from && data.journey.from.id) || null },
                alightingStage: { name: alightingName || null, id: data.alighting_stage_id || (data.journey && data.journey.to && data.journey.to.id) || null },
                fare: fareAmount,
                source: 'stage'
            });
            try { await history.save(); } catch (e) { console.warn('Could not save fare history (calculateFare):', e.message); }
        }

        return res.status(200).json(result.data);
    } catch (error) {
        console.error("❌ Fare Controller Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

exports.calculateFareByLocation = async (req, res) => {
    try {
        const result = await fareService.calculateFareByLocation(req.body);
        
        if (!result.success) {
            return res.status(result.statusCode).json({ error: result.error });
        }

        // Normalize ML response (expected nested structure)
        const data = result.data || {};
        // ML returns boarding.nearest_stage and destination.nearest_stage
        const boardingNearest = data.boarding && data.boarding.nearest_stage ? data.boarding.nearest_stage : (data.boarding_stage || null);
        const alightingNearest = data.destination && data.destination.nearest_stage ? data.destination.nearest_stage : (data.alighting_stage || null);
        const fareAmount = (data.journey && data.journey.fare && data.journey.fare.amount) || data.fare || null;
        const distanceKm = (data.journey && data.journey.distance && (data.journey.distance.kilometers || data.journey.distance.distance_km)) || data.distance_km || null;
        const estMinutes = data.estimated_time_minutes || (data.journey && data.journey.estimated_time_minutes) || null;

        if (fareAmount !== null && (boardingNearest || alightingNearest)) {
            const history = new FareCalculation({
                boardingStage: {
                    name: boardingNearest && (boardingNearest.name || boardingNearest.title) ? (boardingNearest.name || boardingNearest.title) : null,
                    id: boardingNearest && (boardingNearest.id || boardingNearest.stage_id) ? (boardingNearest.id || boardingNearest.stage_id) : null
                },
                alightingStage: {
                    name: alightingNearest && (alightingNearest.name || alightingNearest.title) ? (alightingNearest.name || alightingNearest.title) : null,
                    id: alightingNearest && (alightingNearest.id || alightingNearest.stage_id) ? (alightingNearest.id || alightingNearest.stage_id) : null
                },
                fare: fareAmount,
                distanceKm: distanceKm,
                estimatedTimeMinutes: estMinutes,
                busId: req.body.bus_id,
                source: 'location'
            });
            try { await history.save(); } catch (e) { console.warn('Could not save fare history (calculateFareByLocation):', e.message); }
        }

        return res.status(200).json(result.data);
    } catch (error) {
        console.error("❌ Fare Location Controller Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

exports.getRouteInfo = async (req, res) => {
    const result = await fareService.getRouteInfo();
    if (result.success) return res.status(200).json(result.data);
    return res.status(503).json({ error: result.error });
};

exports.findNearestStage = async (req, res) => {
    const result = await fareService.findNearestStage(req.body);
    if (result.success) return res.status(200).json(result.data);
    return res.status(503).json({ error: result.error });
};

exports.calculateJourney = async (req, res) => {
    try {
        const result = await fareService.calculateJourney(req.body);
        
        if (!result.success) {
            return res.status(result.statusCode).json({ error: result.error });
        }

        // Normalize ML response
        const data = result.data || {};
        // ML returns nested structure: journey.from / journey.to and journey.fare.amount
        const boarding = (data.journey && data.journey.from) || data.boarding_stage || null;
        const alighting = (data.journey && data.journey.to) || data.alighting_stage || null;
        const fareAmount = (data.journey && data.journey.fare && data.journey.fare.amount) || data.fare_amount || data.fare || null;
        const distanceKm = data.total_distance_km || (data.journey && data.journey.distance && data.journey.distance.kilometers) || null;
        const estMinutes = data.estimated_travel_time_minutes || data.estimated_time_minutes || null;

        if (fareAmount !== null && (boarding || alighting)) {
            const history = new FareCalculation({
                boardingStage: { name: boarding && (boarding.name || boarding.boarding_stage) ? (boarding.name || boarding.boarding_stage) : null, id: boarding && (boarding.id || boarding.boarding_stage_id) ? (boarding.id || boarding.boarding_stage_id) : null },
                alightingStage: { name: alighting && (alighting.name || alighting.alighting_stage) ? (alighting.name || alighting.alighting_stage) : null, id: alighting && (alighting.id || alighting.alighting_stage_id) ? (alighting.id || alighting.alighting_stage_id) : null },
                fare: fareAmount,
                distanceKm: distanceKm,
                estimatedTimeMinutes: estMinutes,
                busId: req.body.bus_id,
                source: 'stage'
            });
            try { await history.save(); } catch (e) { console.warn('Could not save fare history (calculateJourney):', e.message); }
        }

        return res.status(200).json(result.data);
    } catch (error) {
        console.error("❌ Journey Controller Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
