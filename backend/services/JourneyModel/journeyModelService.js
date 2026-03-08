/**
 * JourneyModel Service
 * Communicates with the Python Flask ML Service for high-fidelity predictions
 */

const axios = require('axios');

// Internal service URL for production scalability
const ML_API_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

/**
 * Fetch actual road distance and driving duration between two location names
 * using the Google Maps Distance Matrix API.
 * Returns null if the API key is missing or the call fails (graceful fallback).
 */
async function fetchRoadDistance(origin, destination) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.warn('⚠️  GOOGLE_MAPS_API_KEY not set – road distance lookup skipped');
        return null;
    }

    try {
        const response = await axios.get(
            'https://maps.googleapis.com/maps/api/distancematrix/json',
            {
                params: {
                    origins: origin,
                    destinations: destination,
                    mode: 'driving',
                    departure_time: 'now',
                    key: apiKey
                },
                timeout: 8000
            }
        );

        const element = response.data?.rows?.[0]?.elements?.[0];
        if (!element || element.status !== 'OK') {
            console.warn('⚠️  Distance Matrix non-OK status:', element?.status);
            return null;
        }

        const distanceMeters = element.distance.value;
        const durationSeconds =
            element.duration_in_traffic?.value ?? element.duration?.value ?? 0;

        console.log(`✅ Google road distance: ${(distanceMeters / 1000).toFixed(2)} km, duration: ${Math.round(durationSeconds / 60)} min`);

        return {
            road_distance_km: Math.round((distanceMeters / 1000) * 100) / 100,
            road_duration_seconds: durationSeconds
        };
    } catch (error) {
        console.warn('⚠️  Google Distance Matrix call failed:', error.message);
        return null;
    }
}

/**
 * Get simple prediction (locations as names)
 */
exports.getSimplePrediction = async (boardingLocation, destinationLocation, userExpectedTime) => {
    try {
        // Fetch actual road distance & duration before calling Flask
        const roadData = await fetchRoadDistance(boardingLocation, destinationLocation);

        const body = {
            boardingLocation,
            destinationLocation,
            userExpectedTime,
            // Only include road data if Google API returned a valid result
            ...(roadData && {
                road_distance_km: roadData.road_distance_km,
                road_duration_seconds: roadData.road_duration_seconds
            })
        };

        const response = await axios.post(`${ML_API_URL}/predict-simple`, body, {
            timeout: 15000,
            headers: { 'Content-Type': 'application/json' }
        });

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('❌ JourneyModel Service error:', error.message);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
            statusCode: error.response?.status || 500
        };
    }
};

/**
 * Health Check for ML Service
 */
exports.checkHealth = async () => {
    try {
        const response = await axios.get(`${ML_API_URL}/health`, { timeout: 5000 });
        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            error: "Service unreachable"
        };
    }
};
