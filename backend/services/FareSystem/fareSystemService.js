/**
 * FareSystem Service
 * Communicates with the Python Flask ML FareSystem component
 */

const axios = require('axios');

const ML_API_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

/**
 * Calculate fare between stages
 */
exports.calculateFare = async (payload) => {
    try {
        const response = await axios.post(`${ML_API_URL}/calculate_fare`, payload, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });
        // Normalize ML response to a consistent shape for frontend
        const raw = response.data || {};
        const fare = (typeof raw.fare === 'number') ? raw.fare : (raw.journey && raw.journey.fare && raw.journey.fare.amount) || null;
        const boardingName = raw.boarding_stage || (raw.journey && raw.journey.from && raw.journey.from.name) || (raw.boarding && raw.boarding.nearest_stage && raw.boarding.nearest_stage.name) || null;
        const alightingName = raw.alighting_stage || (raw.journey && raw.journey.to && raw.journey.to.name) || (raw.destination && raw.destination.nearest_stage && raw.destination.nearest_stage.name) || null;
        const boardingId = raw.boarding_stage_id || (raw.journey && raw.journey.from && raw.journey.from.id) || (raw.boarding && raw.boarding.nearest_stage && raw.boarding.nearest_stage.id) || null;
        const alightingId = raw.alighting_stage_id || (raw.journey && raw.journey.to && raw.journey.to.id) || (raw.destination && raw.destination.nearest_stage && raw.destination.nearest_stage.id) || null;
        const stagesTraveled = raw.stages_traveled || (raw.journey && raw.journey.stages) || (boardingId !== null && alightingId !== null ? Math.abs(boardingId - alightingId) : null);

        const normalized = {
            fare: fare,
            currency: raw.currency || 'LKR',
            route_number: raw.route_number || raw.route && raw.route.number || '',
            route_name: raw.route_name || raw.route && raw.route.name || '',
            service_type: raw.service_type || (raw.route && raw.route.service_type) || '',
            stages_traveled: stagesTraveled,
            boarding_stage: boardingName,
            alighting_stage: alightingName,
            boarding_stage_sinhala: raw.boarding_stage_sinhala || (raw.journey && raw.journey.from && raw.journey.from.sinhala) || null,
            alighting_stage_sinhala: raw.alighting_stage_sinhala || (raw.journey && raw.journey.to && raw.journey.to.sinhala) || null,
            boarding_stage_id: boardingId,
            alighting_stage_id: alightingId,
            // include raw for debugging if needed
            _raw: raw,
        };

        return { success: true, data: normalized };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.error || error.message,
            statusCode: error.response?.status || 500
        };
    }
};

/**
 * Calculate fare by exact GPS location
 */
exports.calculateFareByLocation = async (payload) => {
    try {
        const response = await axios.post(`${ML_API_URL}/calculate_fare_by_location`, payload, {
            timeout: 15000,
            headers: { 'Content-Type': 'application/json' }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.error || error.message,
            statusCode: error.response?.status || 500
        };
    }
};

/**
 * Get route info from FareSystem
 */
exports.getRouteInfo = async () => {
    try {
        const response = await axios.get(`${ML_API_URL}/get_route_info`, { timeout: 10000 });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: "Unable to fetch route info" };
    }
};

/**
 * Find nearest stage
 */
exports.findNearestStage = async (payload) => {
    try {
        const response = await axios.post(`${ML_API_URL}/find_nearest_stage`, payload, { timeout: 10000 });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: "Unable to find nearest stage" };
    }
};

/**
 * Calculate complete journey (fare, distance, time)
 */
exports.calculateJourney = async (payload) => {
    try {
        const response = await axios.post(`${ML_API_URL}/calculate_journey`, payload, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.error || error.message,
            statusCode: error.response?.status || 500
        };
    }
};
