const predictionService = require('../../services/PredictionService/predictionServiceService');

/**
 * POST /api/arrival/predict
 * Predict two-stage bus arrival time using live bus sensor data from MongoDB.
 *
 * Body:
 *   busId                    (string, required)  - IoT device_id of the bus
 *   segment1_meters          (number, required)  - Distance in metres: bus -> passenger
 *   segment1_google_seconds  (number, required)  - Google estimated seconds: bus -> passenger
 *   segment2_meters          (number, required)  - Distance in metres: passenger -> destination
 *   segment2_google_seconds  (number, required)  - Google estimated seconds: passenger -> destination
 */
exports.predictArrival = async (req, res) => {
    try {
        const {
            busId,
            segment1_meters,
            segment1_google_seconds,
            segment2_meters,
            segment2_google_seconds
        } = req.body;

        if (!busId) {
            return res.status(400).json({ error: "Missing required field: busId" });
        }
        if (segment1_meters === undefined || segment1_google_seconds === undefined ||
            segment2_meters === undefined || segment2_google_seconds === undefined) {
            return res.status(400).json({
                error: "Missing required fields: segment1_meters, segment1_google_seconds, segment2_meters, segment2_google_seconds"
            });
        }

        const result = await predictionService.predictBusArrival(
            busId,
            segment1_meters,
            segment1_google_seconds,
            segment2_meters,
            segment2_google_seconds
        );

        if (!result.success) {
            return res.status(result.statusCode || 500).json({ error: result.error });
        }

        return res.status(200).json({
            success: true,
            busId,
            arrival: result.data
        });

    } catch (error) {
        console.error("PredictionService Controller Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
