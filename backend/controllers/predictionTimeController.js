const axios = require('axios');
const fs = require('fs');
const path = require('path');
const BusData = require('../models/BusRealTimeData');
const PredictionHistory = require('../models/PredictionHistory');
const { predictWithComparison } = require('../services/predictionService');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const ROUTE_177_PATH = path.join(__dirname, '..', '..', 'data', 'route_177.json');

let route177Stages = [];
try {
    if (fs.existsSync(ROUTE_177_PATH)) {
        const routeData = JSON.parse(fs.readFileSync(ROUTE_177_PATH, 'utf-8'));
        route177Stages = (routeData.stages || []).map((stage) => ({
            id: stage.id,
            name: stage.name,
            lat: Number(stage.coordinates?.latitude),
            lng: Number(stage.coordinates?.longitude)
        }));
    }
} catch (error) {
    console.error('Failed to load Route 177 stages:', error.message);
}

function parseLatLngString(value) {
    if (typeof value !== 'string' || !value.includes(',')) {
        return null;
    }

    const [latRaw, lngRaw] = value.split(',').map((part) => part.trim());
    const lat = Number(latRaw);
    const lng = Number(lngRaw);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
    }

    return { lat, lng };
}

async function geocodeLocationByName(locationName) {
    if (!GOOGLE_MAPS_API_KEY) {
        throw new Error('GOOGLE_MAPS_API_KEY is required to resolve location names.');
    }

    const geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
    const response = await axios.get(geocodeUrl, {
        params: {
            address: locationName,
            region: 'lk',
            key: GOOGLE_MAPS_API_KEY
        },
        timeout: 10000
    });

    const geocodeData = response.data;
    if (geocodeData.status !== 'OK' || !geocodeData.results?.length) {
        throw new Error(`Failed to geocode location: ${locationName}`);
    }

    const coords = geocodeData.results[0].geometry.location;
    return {
        lat: coords.lat,
        lng: coords.lng,
        resolvedAddress: geocodeData.results[0].formatted_address
    };
}

function findRoute177Stage(locationInput, lat, lng) {
    if (!route177Stages.length) {
        return null;
    }

    if (typeof locationInput === 'string') {
        const normalized = locationInput.trim().toLowerCase();
        const directMatch = route177Stages.find((stage) => stage.name.toLowerCase() === normalized);
        if (directMatch) {
            return directMatch;
        }
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
    }

    let nearestStage = route177Stages[0];
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const stage of route177Stages) {
        const distance = Math.sqrt(((stage.lat - lat) ** 2) + ((stage.lng - lng) ** 2));
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestStage = stage;
        }
    }

    return nearestStage;
}

async function resolveLocation(locationInput) {
    if (!locationInput) {
        throw new Error('Location is required.');
    }

    if (typeof locationInput === 'object' && locationInput.latitude !== undefined && locationInput.longitude !== undefined) {
        return {
            lat: Number(locationInput.latitude),
            lng: Number(locationInput.longitude),
            source: 'object_coordinates'
        };
    }

    if (typeof locationInput === 'object' && locationInput.lat !== undefined && locationInput.lng !== undefined) {
        return {
            lat: Number(locationInput.lat),
            lng: Number(locationInput.lng),
            source: 'object_coordinates'
        };
    }

    const parsed = parseLatLngString(locationInput);
    if (parsed) {
        return {
            lat: parsed.lat,
            lng: parsed.lng,
            source: 'string_coordinates'
        };
    }

    if (typeof locationInput === 'string') {
        const stageMatch = route177Stages.find(
            (stage) => stage.name.toLowerCase() === locationInput.trim().toLowerCase()
        );
        if (stageMatch) {
            return {
                lat: stageMatch.lat,
                lng: stageMatch.lng,
                source: 'route_177_stage'
            };
        }
    }

    const geocoded = await geocodeLocationByName(String(locationInput));
    return {
        lat: geocoded.lat,
        lng: geocoded.lng,
        source: 'geocoded_name',
        resolvedAddress: geocoded.resolvedAddress
    };
}

exports.getPredictedTime = async (req, res) => {
    const {
        busId,
        userLocation,
        boardingLocation,
        passengerDestination,
        destinationLocation,
        passengerArrivalTimeMinutes,
        userExpectedTime,
        stopDurationSeconds = 300,
        routeNumber = '177'
    } = req.body;

    const normalizedUserLocation = userLocation || boardingLocation;
    const normalizedPassengerDestination = passengerDestination || destinationLocation;
    const normalizedExpectedMinutes = passengerArrivalTimeMinutes ?? userExpectedTime;
    const normalizedBusId = busId || 'N/A';

    if (!normalizedUserLocation || !normalizedPassengerDestination || normalizedExpectedMinutes === undefined || normalizedExpectedMinutes === null) {
        return res.status(400).json({ 
            message: 'Missing required fields: boardingLocation (or userLocation), destinationLocation (or passengerDestination), or userExpectedTime (or passengerArrivalTimeMinutes).'
        });
    }

    try {
        if (busId) {
            const latestBusData = await BusData.findOne({ device_id: busId }).sort({ timestamp: -1 }).limit(1);
            if (!latestBusData) {
                return res.status(404).json({ message: `No recent data found for device ${busId}. Is the simulator running?` });
            }
        }

        const boarding = await resolveLocation(normalizedUserLocation);
        const destination = await resolveLocation(normalizedPassengerDestination);

        const boardingStage = findRoute177Stage(normalizedUserLocation, boarding.lat, boarding.lng);
        const destinationStage = findRoute177Stage(normalizedPassengerDestination, destination.lat, destination.lng);

        const now = new Date();
        const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=Mon in ML API
        const hour = now.getHours();
        const isWeekend = dayOfWeek >= 5 ? 1 : 0;

        const prediction = await predictWithComparison({
            boardingLat: boarding.lat,
            boardingLng: boarding.lng,
            destinationLat: destination.lat,
            destinationLng: destination.lng,
            stopDurationSeconds: Number(stopDurationSeconds),
            hour,
            dayOfWeek,
            isWeekend,
            userExpectedMinutes: Number(normalizedExpectedMinutes),
            routeNumber: String(routeNumber),
            boardingStage: boardingStage ? boardingStage.id : null,
            destinationStage: destinationStage ? destinationStage.id : null
        });

        if (!prediction.success) {
            return res.status(prediction.status || 500).json({
                message: 'Failed to get journey prediction.',
                detail: prediction.error || prediction.details || 'Unknown prediction error.'
            });
        }

        const predictedTimeMinutes = prediction.data.predicted_time.minutes;
        const predictedTimeSeconds = prediction.data.predicted_time.seconds;
        const distanceKm = prediction.data.traffic?.google_distance_km || null;
        const comparison = prediction.data.comparison;

        const responsePayload = {
            busId: normalizedBusId,
            routeNumber: String(routeNumber),
            userLocation: normalizedUserLocation,
            passengerDestination: normalizedPassengerDestination,
            resolvedLocations: {
                boarding,
                destination,
                boardingStage: boardingStage ? boardingStage.name : null,
                destinationStage: destinationStage ? destinationStage.name : null
            },
            predictedTimeMinutes,
            predictedTimeSeconds,
            distanceKm,
            desiredTimeMinutes: Number(normalizedExpectedMinutes),
            alertStatus: comparison.urgency === 'high' || comparison.urgency === 'medium' ? 'warning' : 'success',
            alertMessage: comparison.recommendation,
            comparison,
            traffic: prediction.data.traffic || null,
            dataSources: prediction.data.data_sources || []
        };

        res.status(200).json(responsePayload);

        try {
            const predictionRecord = new PredictionHistory({
                busId: normalizedBusId,
                userLocation: typeof normalizedUserLocation === 'string' ? normalizedUserLocation : JSON.stringify(normalizedUserLocation),
                destination: typeof normalizedPassengerDestination === 'string' ? normalizedPassengerDestination : JSON.stringify(normalizedPassengerDestination),
                predictedTimeMinutes: Number(predictedTimeMinutes),
                distanceKm: distanceKm ? Number(distanceKm) : undefined,
                desiredTimeMinutes: Number(normalizedExpectedMinutes),
                alertStatus: responsePayload.alertStatus,
                alertMessage: responsePayload.alertMessage
            });

            await predictionRecord.save();
            console.log('Prediction saved to database successfully');
        } catch (saveError) {
            console.error('Error saving prediction to database:', saveError.message);
        }

    } catch (error) {
        console.error('Error in prediction pipeline:', error.message);
        res.status(500).json({ 
            message: 'Failed to complete prediction pipeline.',
            detail: error.message
        });
    }
};

/**
 * Simplified Compare Handler - Direct ML API call
 * Takes only: boardingLocation, destinationLocation, userExpectedTime
 * Calls ML API endpoint which auto-calculates all parameters
 * Returns: Simple formatted prediction result
 */
exports.predictAndCompare = async (req, res) => {
    const {
        boardingLocation,
        destinationLocation,
        userExpectedTime
    } = req.body;

    // Validate required fields
    if (!boardingLocation || !destinationLocation || userExpectedTime === undefined || userExpectedTime === null) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            missing: ['boardingLocation', 'destinationLocation', 'userExpectedTime'],
            message: 'Please provide: boardingLocation, destinationLocation, and userExpectedTime (in minutes)'
        });
    }

    try {
        const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';
        
        // Call ML service
        console.log(`--- [ML CALL] Triggering ML prediction for: ${boardingLocation} -> ${destinationLocation}`);
        const mlResponse = await axios.post(
            `${ML_SERVICE_URL}/predict-simple`,
            {
                boardingLocation: String(boardingLocation).trim(),
                destinationLocation: String(destinationLocation).trim(),
                userExpectedTime: Number(userExpectedTime)
            },
            {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!mlResponse.data.success) {
            return res.status(400).json({
                success: false,
                error: 'Prediction failed',
                message: mlResponse.data.error || 'Unknown error from ML service'
            });
        }

        // Extract and format response - Simplified structure only
        const prediction = mlResponse.data.prediction;

        const responsePayload = {
            success: true,
            prediction: mlResponse.data.prediction,
            details: mlResponse.data.details,
            traffic_analysis: mlResponse.data.traffic_analysis
        };

        res.status(200).json(responsePayload);

        // Log prediction history (optional, non-blocking)
        try {
            const predictionRecord = new PredictionHistory({
                busId: 'N/A',
                userLocation: String(boardingLocation),
                destination: String(destinationLocation),
                predictedTimeMinutes: Number(prediction.predicted_time_minutes),
                distanceKm: mlResponse.data.traffic?.google_distance_km || 18.5,
                desiredTimeMinutes: Number(userExpectedTime),
                alertStatus: prediction.urgency === 'high' || prediction.urgency === 'medium' ? 'warning' : 'success',
                alertMessage: prediction.recommendation
            });

            await predictionRecord.save();
            console.log('✓ Prediction comparison saved to database');
        } catch (saveError) {
            console.error('Warning: Could not save prediction history:', saveError.message);
        }

    } catch (error) {
        console.error('Error in compare pipeline:', error.message);
        
        // Handle specific axios errors
        if (error.response?.status === 400) {
            return res.status(400).json({
                success: false,
                error: error.response.data.error || 'Validation error',
                message: error.response.data.message || error.message,
                details: error.response.data.details
            });
        }
        
        if (error.response?.status === 500) {
            return res.status(500).json({
                success: false,
                error: 'ML Service error',
                message: error.response.data.error || 'Internal server error from ML service'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Comparison failed',
            message: error.message,
            details: 'Failed to connect to ML service or process prediction'
        });
    }
};