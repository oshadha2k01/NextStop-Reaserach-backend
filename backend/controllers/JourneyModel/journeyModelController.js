const journeyService = require('../../services/JourneyModel/journeyModelService');
const JourneyPrediction = require('../../models/JourneyModel/JourneyPrediction');
const fs = require('fs');
const path = require('path');

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
        const validation = data.validation || null;
        const modelVersion = (() => {
            try {
                const registryPath = path.join(__dirname, '../../../ml/JourneyModel/models/model_registry.json');
                if (fs.existsSync(registryPath)) {
                    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
                    return registry?.trained_at || null;
                }
            } catch (error) {
                console.warn('Unable to read model registry:', error.message);
            }
            return null;
        })();

        const predictedMinutes = data.prediction.predicted_time_minutes;
        const expectedMinutes  = userExpectedTime != null ? Number(userExpectedTime) : null;
        const differenceMinutes = expectedMinutes != null
            ? Math.round((predictedMinutes - expectedMinutes) * 100) / 100
            : null;

        // 2. Persist to History Database (The 'M' in MVC)
        const newPrediction = new JourneyPrediction({
            boardingLocation: data.details.boarding_location,
            destinationLocation: data.details.destination_location,
            predictedTimeMinutes: predictedMinutes,
            journeyDistanceKm: data.prediction.journey_distance_km,
            trafficCondition: data.prediction.traffic_analysis.condition,
            userExpectedTime: expectedMinutes,
            recommendation: data.prediction.recommendation,
            route: data.details.route,
            nearestStages: {
                boarding: data.details.nearest_stages?.boarding,
                destination: data.details.nearest_stages?.destination
            },
            validation: validation ? {
                distanceSource: validation.distance_source,
                distanceDisagreementPct: validation.distance_disagreement_pct,
                googleDistanceKm: validation.google_distance_km,
                routeSequenceDistanceKm: validation.route_sequence_distance_km,
                resolvedCoordinates: validation.resolved_coordinates
            } : undefined,
            modelVersion
        });

        await newPrediction.save();

        // 3. Build time comparison block (only when userExpectedTime was provided)
        const timeComparison = expectedMinutes != null ? {
            predicted_minutes:      predictedMinutes,
            user_expected_minutes:  expectedMinutes,
            difference_minutes:     differenceMinutes,
            status: differenceMinutes > 0
                ? `${differenceMinutes} min longer than expected`
                : differenceMinutes < 0
                    ? `${Math.abs(differenceMinutes)} min shorter than expected`
                    : "Matches your expected time exactly"
        } : null;

        // 4. Send clean JSON back (The 'V' technically, via Express response)
        return res.status(200).json({
            success: true,
            prediction: {
                predicted_time_minutes: predictedMinutes,
                journey_distance_km:    data.prediction.journey_distance_km,
                traffic_analysis:       data.prediction.traffic_analysis,
                recommendation:         data.prediction.recommendation
            },
            ...(timeComparison && { time_comparison: timeComparison }),
            details: data.details,
            validation: data.validation,
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

/**
 * Record actual trip outcome after the journey completes.
 * This closes the feedback loop for model accuracy monitoring.
 */
exports.recordJourneyOutcome = async (req, res) => {
    try {
        const { predictionId } = req.params;
        const { actualTimeMinutes } = req.body;

        if (!predictionId) {
            return res.status(400).json({ error: "Missing predictionId" });
        }

        const actualMinutes = Number(actualTimeMinutes);
        if (!Number.isFinite(actualMinutes) || actualMinutes <= 0) {
            return res.status(400).json({ error: "actualTimeMinutes must be a positive number" });
        }

        const prediction = await JourneyPrediction.findById(predictionId);
        if (!prediction) {
            return res.status(404).json({ error: "Prediction record not found" });
        }

        const absoluteErrorMinutes = Math.abs(actualMinutes - prediction.predictedTimeMinutes);
        const errorPercent = prediction.predictedTimeMinutes > 0
            ? (absoluteErrorMinutes / prediction.predictedTimeMinutes) * 100
            : null;

        prediction.actualTimeMinutes = actualMinutes;
        prediction.absoluteErrorMinutes = absoluteErrorMinutes;
        prediction.errorPercent = errorPercent;
        await prediction.save();

        return res.status(200).json({
            success: true,
            predictionId: prediction._id,
            predictedTimeMinutes: prediction.predictedTimeMinutes,
            actualTimeMinutes: actualMinutes,
            absoluteErrorMinutes,
            errorPercent
        });
    } catch (error) {
        console.error("❌ Outcome Logging Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
