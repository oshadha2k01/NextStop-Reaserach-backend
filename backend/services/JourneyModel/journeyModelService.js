/**
 * JourneyModel Service
 * Communicates with the Python Flask ML Service for high-fidelity predictions
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Internal service URL for production scalability
const ML_API_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

let routeStopsCache = null;

function loadRouteStops() {
    if (routeStopsCache) return routeStopsCache;

    const candidates = [
        path.join(__dirname, '../../../data/main_bus_stops.json'),
        path.join(__dirname, '../../../../data/main_bus_stops.json')
    ];

    for (const filePath of candidates) {
        try {
            if (fs.existsSync(filePath)) {
                const raw = fs.readFileSync(filePath, 'utf-8');
                const parsed = JSON.parse(raw);
                routeStopsCache = parsed?.stages || [];
                if (Array.isArray(routeStopsCache) && routeStopsCache.length > 0) {
                    return routeStopsCache;
                }
            }
        } catch (error) {
            console.warn('⚠️  Could not load route stop data:', error.message);
        }
    }

    routeStopsCache = [];
    return routeStopsCache;
}

function resolveToRouteStopCoordinates(locationName) {
    if (!locationName || typeof locationName !== 'string') return null;

    const stops = loadRouteStops();
    if (!stops.length) return null;

    const query = locationName.toLowerCase().trim();

    // Pass 1: exact stage name
    let matched = stops.find((stop) => stop?.name?.toLowerCase() === query);
    if (matched?.coordinates) {
        return {
            name: matched.name,
            lat: matched.coordinates.latitude,
            lng: matched.coordinates.longitude
        };
    }

    // Pass 2: substring match
    matched = stops.find((stop) => {
        const stageName = stop?.name?.toLowerCase();
        return stageName && (query.includes(stageName) || stageName.includes(query));
    });

    if (matched?.coordinates) {
        return {
            name: matched.name,
            lat: matched.coordinates.latitude,
            lng: matched.coordinates.longitude
        };
    }

    return null;
}

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
        const originStop = resolveToRouteStopCoordinates(origin);
        const destinationStop = resolveToRouteStopCoordinates(destination);

        // Prefer exact Route 177 coordinates to avoid ambiguous place-name geocoding.
        const originsParam = originStop
            ? `${originStop.lat},${originStop.lng}`
            : `${origin}, Colombo, Sri Lanka`;
        const destinationsParam = destinationStop
            ? `${destinationStop.lat},${destinationStop.lng}`
            : `${destination}, Colombo, Sri Lanka`;

        const response = await axios.get(
            'https://maps.googleapis.com/maps/api/distancematrix/json',
            {
                params: {
                    origins: originsParam,
                    destinations: destinationsParam,
                    mode: 'driving',
                    departure_time: 'now',
                    region: 'lk',
                    language: 'en',
                    units: 'metric',
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

        // Sanity check for Route 177: reject obviously wrong geocoding outcomes.
        // Typical trip distances are well below this threshold.
        const distanceKm = distanceMeters / 1000;
        if (distanceKm > 40) {
            console.warn(`⚠️  Ignoring suspicious distance result (${distanceKm.toFixed(2)} km) for origin='${origin}' destination='${destination}'`);
            return null;
        }

        console.log(`✅ Google road distance: ${distanceKm.toFixed(2)} km, duration: ${Math.round(durationSeconds / 60)} min`);

        return {
            road_distance_km: Math.round(distanceKm * 100) / 100,
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
