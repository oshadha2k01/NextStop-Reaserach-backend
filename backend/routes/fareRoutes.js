const express = require('express');
const router = express.Router();
const axios = require('axios');

// Python ML Service URL (from environment or default)
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

/**
 * POST /api/fare/calculate
 * Calculate fare between two bus stages
 * Body: { boarding_stage: "Malabe", alighting_stage: "Borella" }
 * or { boarding_stage_id: 3, alighting_stage_id: 8 }
 */
router.post('/calculate', async (req, res) => {
    try {
        const response = await axios.post(`${ML_SERVICE_URL}/calculate_fare`, req.body, {
            timeout: 5000
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Error calculating fare:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ 
                error: 'ML Service unavailable. Please ensure Python service is running on port 5000.',
                details: error.message 
            });
        }
        
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        
        res.status(500).json({ 
            error: 'Failed to calculate fare',
            details: error.message 
        });
    }
});

/**
 * GET /api/fare/route-info
 * Get complete route information including stages and fare matrix
 */
router.get('/route-info', async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/get_route_info`, {
            timeout: 5000
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching route info:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ 
                error: 'ML Service unavailable. Please ensure Python service is running on port 5000.',
                details: error.message 
            });
        }
        
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        
        res.status(500).json({ 
            error: 'Failed to fetch route info',
            details: error.message 
        });
    }
});

/**
 * POST /api/fare/calculate-journey
 * Calculate complete journey with fare and bus status
 * Body: { boarding_stage_id: 3, alighting_stage_id: 8, bus_id: "NA-1234" }
 */
router.post('/calculate-journey', async (req, res) => {
    try {
        const response = await axios.post(`${ML_SERVICE_URL}/calculate_journey`, req.body, {
            timeout: 5000
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Error calculating journey:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ 
                error: 'ML Service unavailable. Please ensure Python service is running on port 5000.',
                details: error.message 
            });
        }
        
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        
        res.status(500).json({ 
            error: 'Failed to calculate journey',
            details: error.message 
        });
    }
});

/**
 * POST /api/fare/calculate-by-location
 * Calculate fare using GPS coordinates - perfect for locations BETWEEN stages!
 * Body: {
 *   boarding_location: { latitude: 6.925, longitude: 79.985 },
 *   alighting_location: { latitude: 6.912, longitude: 79.970 },
 *   bus_id: "NA-1234" (optional)
 * }
 */
router.post('/calculate-by-location', async (req, res) => {
    try {
        const response = await axios.post(`${ML_SERVICE_URL}/calculate_fare_by_location`, req.body, {
            timeout: 5000
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Error calculating fare by location:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ 
                error: 'ML Service unavailable. Please ensure Python service is running on port 5000.',
                details: error.message 
            });
        }
        
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        
        res.status(500).json({ 
            error: 'Failed to calculate fare by location',
            details: error.message 
        });
    }
});

/**
 * POST /api/fare/find-nearest-stage
 * Find the nearest bus stage to a GPS location
 * Body: { latitude: 6.925, longitude: 79.985 }
 */
router.post('/find-nearest-stage', async (req, res) => {
    try {
        const response = await axios.post(`${ML_SERVICE_URL}/find_nearest_stage`, req.body, {
            timeout: 5000
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Error finding nearest stage:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ 
                error: 'ML Service unavailable. Please ensure Python service is running on port 5000.',
                details: error.message 
            });
        }
        
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        
        res.status(500).json({ 
            error: 'Failed to find nearest stage',
            details: error.message 
        });
    }
});

module.exports = router;
