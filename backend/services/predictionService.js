/**
 * Prediction Service
 * Integrates with NextStop Journey Time ML Model API
 * 
 * Usage:
 * const { predictJourney, predictMultipleRoutes, getModelInfo } = require('./predictionService');
 */

const axios = require('axios');

const PREDICTION_API_URL = process.env.PREDICTION_API_URL || 'http://localhost:5000';

/**
 * Predict single journey time
 * 
 * @param {number} boardingLat - Pickup latitude
 * @param {number} boardingLng - Pickup longitude
 * @param {number} destinationLat - Destination latitude
 * @param {number} destinationLng - Destination longitude
 * @param {number} stopDurationSeconds - Stop duration in seconds
 * @param {number} hour - Hour of day (0-23)
 * @param {number} dayOfWeek - Day of week (0=Monday, 6=Sunday)
 * @param {number} isWeekend - 1 if weekend, 0 otherwise
 * 
 * @returns {Promise<Object>} Prediction result with journey time
 */
async function predictJourney(
    boardingLat,
    boardingLng,
    destinationLat,
    destinationLng,
    stopDurationSeconds,
    hour,
    dayOfWeek = 2,
    isWeekend = 0,
    options = {}
) {
    try {
        const {
            routeNumber = '177',
            boardingStage = null,
            destinationStage = null
        } = options;

        const response = await axios.post(
            `${PREDICTION_API_URL}/predict`,
            {
                boarding_lat: parseFloat(boardingLat),
                boarding_lng: parseFloat(boardingLng),
                destination_lat: parseFloat(destinationLat),
                destination_lng: parseFloat(destinationLng),
                stop_duration_seconds: parseFloat(stopDurationSeconds),
                hour: parseInt(hour),
                day_of_week: parseInt(dayOfWeek),
                is_weekend: parseInt(isWeekend),
                route_number: String(routeNumber),
                boarding_stage: boardingStage,
                destination_stage: destinationStage
            },
            {
                timeout: 30000, // 30 second timeout
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data,
            status: 200
        };
    } catch (error) {
        console.error('❌ Prediction service error:', error.message);
        
        return {
            success: false,
            error: error.message,
            status: error.response?.status || 500,
            details: error.response?.data
        };
    }
}

/**
 * Predict journey times for multiple routes
 * 
 * @param {Array} routes - Array of route objects
 * @returns {Promise<Object>} Batch prediction results
 */
async function predictMultipleRoutes(routes) {
    try {
        const response = await axios.post(
            `${PREDICTION_API_URL}/predict-multiple`,
            { routes },
            {
                timeout: 60000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data,
            status: 200
        };
    } catch (error) {
        console.error('❌ Batch prediction error:', error.message);
        
        return {
            success: false,
            error: error.message,
            status: error.response?.status || 500
        };
    }
}

/**
 * Get model information
 * 
 * @returns {Promise<Object>} Model metadata
 */
async function getModelInfo() {
    try {
        const response = await axios.get(
            `${PREDICTION_API_URL}/model-info`,
            { timeout: 10000 }
        );

        return {
            success: true,
            data: response.data,
            status: 200
        };
    } catch (error) {
        console.error('❌ Error fetching model info:', error.message);
        
        return {
            success: false,
            error: error.message,
            status: error.response?.status || 500
        };
    }
}

/**
 * Check API health
 * 
 * @returns {Promise<Object>} Health check result
 */
async function checkHealth() {
    try {
        const response = await axios.get(
            `${PREDICTION_API_URL}/health`,
            { timeout: 5000 }
        );

        return {
            success: true,
            healthy: response.data.status === 'healthy',
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            healthy: false,
            error: error.message
        };
    }
}

/**
 * Helper function to compare predicted vs user expected time
 * 
 * @param {number} predictedMinutes - Predicted time in minutes
 * @param {number} expectedMinutes - User's expected time in minutes
 * 
 * @returns {Object} Recommendation
 */
function compareWithExpected(predictedMinutes, expectedMinutes) {
    const difference = Math.abs(predictedMinutes - expectedMinutes);
    const percentDifference = (difference / expectedMinutes) * 100;

    let recommendation = 'Take this bus';
    let urgency = 'normal';

    if (predictedMinutes > expectedMinutes) {
        if (percentDifference > 20) {
            recommendation = 'Bus may be late - Wait for next one';
            urgency = 'high';
        } else {
            recommendation = 'Bus slightly delayed - Consider waiting';
            urgency = 'medium';
        }
    } else if (predictedMinutes < expectedMinutes) {
        recommendation = 'Bus will arrive early - Good choice';
        urgency = 'low';
    }

    return {
        recommendation,
        urgency,
        time_difference_minutes: Number(difference.toFixed(2)),
        percent_difference: Number(percentDifference.toFixed(2))
    };
}

/**
 * Full journey prediction with comparison
 * 
 * @param {Object} params - Journey parameters
 * @returns {Promise<Object>} Complete prediction result
 */
async function predictWithComparison(params) {
    const {
        boardingLat,
        boardingLng,
        destinationLat,
        destinationLng,
        stopDurationSeconds,
        hour,
        userExpectedMinutes,
        dayOfWeek = 2,
        isWeekend = 0,
        routeNumber = '177',
        boardingStage = null,
        destinationStage = null
    } = params;

    try {
        const prediction = await predictJourney(
            boardingLat,
            boardingLng,
            destinationLat,
            destinationLng,
            stopDurationSeconds,
            hour,
            dayOfWeek,
            isWeekend,
            {
                routeNumber,
                boardingStage,
                destinationStage
            }
        );

        if (!prediction.success) {
            return prediction;
        }

        const predictedMinutes = prediction.data.predicted_time.minutes;
        const comparison = compareWithExpected(predictedMinutes, userExpectedMinutes);

        return {
            success: true,
            data: {
                ...prediction.data,
                comparison
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    predictJourney,
    predictMultipleRoutes,
    getModelInfo,
    checkHealth,
    compareWithExpected,
    predictWithComparison,
    PREDICTION_API_URL
};
