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
