/**
 * Prediction Service (Two-Stage Bus Arrival)
 * Communicates with the Python Flask ML Service for real-time arrival predictions
 */

const axios = require('axios');

const ML_API_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

/**
 * Predict two-stage bus arrival time
 * Stage 1: Bus current position -> Passenger location
 * Stage 2: Passenger location -> Destination
 */
exports.predictBusArrival = async (busId, segment1_meters, segment1_google_seconds, segment2_meters, segment2_google_seconds) => {
    try {
        const response = await axios.post(`${ML_API_URL}/predict_bus`, {
            busId,
            segment1_meters,
            segment1_google_seconds,
            segment2_meters,
            segment2_google_seconds
        }, {
            timeout: 15000,
            headers: { 'Content-Type': 'application/json' }
        });

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('PredictionService error:', error.message);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
            statusCode: error.response?.status || 500
        };
    }
};
