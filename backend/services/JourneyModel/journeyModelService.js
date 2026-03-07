/**
 * JourneyModel Service
 * Communicates with the Python Flask ML Service for high-fidelity predictions
 */

const axios = require('axios');

// Internal service URL for production scalability
const ML_API_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

/**
 * Get simple prediction (locations as names)
 */
exports.getSimplePrediction = async (boardingLocation, destinationLocation, userExpectedTime) => {
    try {
        const response = await axios.post(`${ML_API_URL}/predict-simple`, {
            boardingLocation,
            destinationLocation,
            userExpectedTime
        }, { 
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
