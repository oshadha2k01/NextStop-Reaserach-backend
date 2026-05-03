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

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371.0;
    const toRad = (deg) => (deg * Math.PI) / 180.0;
    const dlat = toRad(lat2 - lat1);
    const dlon = toRad(lon2 - lon1);
    const a = Math.sin(dlat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateRouteSequenceDistanceKm(b_lat, b_lng, d_lat, d_lng) {
    const stops = loadRouteStops();
    if (!stops || !stops.length) {
        // fallback to straight-line haversine
        return haversineKm(b_lat, b_lng, d_lat, d_lng);
    }

    // find nearest stops
    let b_idx = 0, d_idx = 0, bestDist = Infinity;
    for (let i = 0; i < stops.length; i++) {
        const c = stops[i].coordinates;
        const dist = haversineKm(b_lat, b_lng, c.latitude, c.longitude);
        if (dist < bestDist) { bestDist = dist; b_idx = i; }
    }
    bestDist = Infinity;
    for (let i = 0; i < stops.length; i++) {
        const c = stops[i].coordinates;
        const dist = haversineKm(d_lat, d_lng, c.latitude, c.longitude);
        if (dist < bestDist) { bestDist = dist; d_idx = i; }
    }

    if (b_idx === d_idx) return 0.0;
    const lo = Math.min(b_idx, d_idx), hi = Math.max(b_idx, d_idx);
    let total = 0.0;
    for (let i = lo; i < hi; i++) {
        const c1 = stops[i].coordinates;
        const c2 = stops[i + 1].coordinates;
        total += haversineKm(c1.latitude, c1.longitude, c2.latitude, c2.longitude);
    }
    return Math.round(total * 1000) / 1000;
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

        console.log(`--- Resolving stops: "${origin}" → ${originStop ? `(${originStop.lat}, ${originStop.lng})` : 'UNRESOLVED'}`);
        console.log(`                  "${destination}" → ${destinationStop ? `(${destinationStop.lat}, ${destinationStop.lng})` : 'UNRESOLVED'}`);

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
        console.log(`\n--- getSimplePrediction: ${boardingLocation} → ${destinationLocation}`);
        
        // Fetch actual road distance & duration before calling Flask
        const roadData = await fetchRoadDistance(boardingLocation, destinationLocation);
        console.log(`--- Google result: ${roadData ? `${roadData.road_distance_km} km, ${Math.round(roadData.road_duration_seconds/60)} min` : 'FAILED'}`);

        // Ensure we always inject road distance + duration (prefer Google, else estimate)
        let injectedRoadData = null;
        if (roadData) {
            // Validate Google result against route-sequence distance
            let routeSeqKm = null;
            try {
                const originStop = resolveToRouteStopCoordinates(boardingLocation);
                const destStop = resolveToRouteStopCoordinates(destinationLocation);
                if (originStop && destStop) {
                    routeSeqKm = calculateRouteSequenceDistanceKm(originStop.lat, originStop.lng, destStop.lat, destStop.lng);
                }
            } catch (err) {
                routeSeqKm = null;
            }

            // If Google disagrees wildly with route sequence, ignore Google
            let useGoogle = true;
            if (routeSeqKm && routeSeqKm > 0) {
                const diff = Math.abs(roadData.road_distance_km - routeSeqKm) / routeSeqKm;
                if (diff > 0.5) {
                    console.warn(`⚠️  Google distance disagrees with route-sequence by ${(diff*100).toFixed(1)}% — ignoring Google result`);
                    useGoogle = false;
                }
            }

            if (useGoogle) {
                injectedRoadData = {
                    road_distance_km: roadData.road_distance_km,
                    road_duration_seconds: roadData.road_duration_seconds,
                    road_data_source: 'google'
                };
            } else {
                // fallback to estimated using routeSeqKm when available
                const est_distance_km = routeSeqKm && routeSeqKm > 0 ? routeSeqKm : 2.0;
                const est_duration_seconds = Math.round((est_distance_km / 22.0) * 3600);
                injectedRoadData = {
                    road_distance_km: Math.round(est_distance_km * 100) / 100,
                    road_duration_seconds: est_duration_seconds,
                    road_data_source: 'estimated'
                };
            }
        } else {
            // Estimate using route sequence distance and a conservative average speed
            try {
                const stops = loadRouteStops();
                // fallback simple estimate: zero if stops missing
                let est_km = 0.0;
                if (stops && stops.length) {
                    // Resolve nearest indices for origin/destination similar to ML side
                    const findNearestIdx = (latlngStr) => {
                        // latlngStr may be a name; resolution not possible here, return null
                        return null;
                    };
                }
            } catch (err) {
                // ignore
            }

            // Conservative default: assume short trip of 2 km and 22 km/h if unknown
            const est_distance_km = 2.0;
            const est_duration_seconds = Math.round((est_distance_km / 22.0) * 3600);
            injectedRoadData = {
                road_distance_km: Math.round(est_distance_km * 100) / 100,
                road_duration_seconds: est_duration_seconds,
                road_data_source: 'estimated'
            };
            console.warn('⚠️  Google road data missing — injecting estimated road_distance_km and road_duration_seconds');
        }

        const body = Object.assign({
            boardingLocation,
            destinationLocation,
            userExpectedTime
        }, injectedRoadData);

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
