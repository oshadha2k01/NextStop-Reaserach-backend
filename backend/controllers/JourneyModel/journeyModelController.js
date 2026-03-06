const journeyService = require('../../services/JourneyModel/journeyModelService');
const JourneyPrediction = require('../../models/JourneyModel/JourneyPrediction');

/**
 * JourneyModel MVC Controller
 * Handles the flow between routes, services, and the database
 */

exports.getJourneyPrediction = async (req, res) => {
    try {
        const { boardingLocation, destinationLocation, userExpectedTime } = req.body;

        if (!boardingLocation || !destinationLocation) {
            return res.status(400).json({ 
                error: "Missing required fields: boardingLocation, destinationLocation" 
            });
        }

        // 1. Delegate to Service for ML processing
        const result = await journeyService.getSimplePrediction(
            boardingLocation, 
            destinationLocation, 
            userExpectedTime
        );

        if (!result.success) {
            return res.status(result.statusCode).json({ error: result.error });
        }

        const data = result.data;

        // 2. Persist to History Database (The 'M' in MVC)
        const newPrediction = new JourneyPrediction({
            boardingLocation: data.details.boarding_location,
            destinationLocation: data.details.destination_location,
            predictedTimeMinutes: data.prediction.predicted_time_minutes,
            journeyDistanceKm: data.prediction.journey_distance_km,
            trafficCondition: data.prediction.traffic_analysis.condition,
            userExpectedTime: userExpectedTime,
            recommendation: data.prediction.recommendation,
            route: data.details.route,
            nearestStages: {
                boarding: data.details.nearest_stages?.boarding,
                destination: data.details.nearest_stages?.destination
            }
        });

        await newPrediction.save();

        // 3. Send clean JSON back (The 'V' technically, via Express response)
        return res.status(200).json({
            success: true,
            prediction: data.prediction,
            details: data.details,
            historyId: newPrediction._id
        });

    } catch (error) {
        console.error("❌ Controller Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Check ML Backend Health
 */
exports.checkMLHealth = async (req, res) => {
    const health = await journeyService.checkHealth();
    if (health.success) {
        return res.status(200).json(health.data);
    }
    return res.status(503).json({ status: "disconnected", error: health.error });
};
