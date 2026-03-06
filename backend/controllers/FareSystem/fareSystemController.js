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

        // Persist history
        const data = result.data;
        const history = new FareCalculation({
            boardingStage: { name: data.boarding_stage, id: data.boarding_stage_id },
            alightingStage: { name: data.alighting_stage, id: data.alighting_stage_id },
            fare: data.fare,
            source: 'stage'
        });
        await history.save();

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

        // Persist history
        const data = result.data;
        const history = new FareCalculation({
            boardingStage: { name: data.boarding_stage.name, id: data.boarding_stage.id },
            alightingStage: { name: data.alighting_stage.name, id: data.alighting_stage.id },
            fare: data.fare,
            distanceKm: data.distance_km,
            estimatedTimeMinutes: data.estimated_time_minutes,
            busId: req.body.bus_id,
            source: 'location'
        });
        await history.save();

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

        // Persist history
        const data = result.data;
        const history = new FareCalculation({
            boardingStage: { name: data.boarding_stage, id: data.boarding_stage_id },
            alightingStage: { name: data.alighting_stage, id: data.alighting_stage_id },
            fare: data.fare_amount,
            distanceKm: data.total_distance_km,
            estimatedTimeMinutes: data.estimated_travel_time_minutes,
            busId: req.body.bus_id,
            source: 'stage'
        });
        await history.save();

        return res.status(200).json(result.data);
    } catch (error) {
        console.error("❌ Journey Controller Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
