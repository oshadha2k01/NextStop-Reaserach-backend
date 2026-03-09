const axios = require('axios');
const SensorData = require('../../models/IoTDevice/SensorData');

const ETA_API_URL = process.env.ETA_API_URL || 'http://localhost:5002'; // Updated to 5002 for ETAModel
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

/**
 * Fetch latest IoT data for a bus device
 */
async function fetchIoTData(deviceId) {
    try {
        const latestData = await SensorData.findOne({ device_id: deviceId })
            .sort({ timestamp: -1 })
            .limit(1);
        
        if (!latestData) return null;
        
        return {
            lat: latestData.gps?.lat,
            lng: latestData.gps?.lng,
            speed: latestData.gps?.speed_kmh || 25 // Default speed
        };
    } catch (error) {
        console.error('Error fetching IoT data:', error);
        return null;
    }
}

/**
 * Fetch traffic data from Google Maps
 */
async function fetchTrafficData(originLat, originLng, destLat, destLng) {
    try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&departure_time=now&traffic_model=best_guess&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await axios.get(url);
        
        if (response.data.rows[0]?.elements[0]?.status === 'OK') {
            const element = response.data.rows[0].elements[0];
            return {
                duration_seconds: element.duration_in_traffic?.value || element.duration.value,
                distance_meters: element.distance.value
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching traffic data:', error);
        return null;
    }
}

/**
 * Fetch weather data
 */
async function fetchWeatherData(lat, lng) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const response = await axios.get(url);
        
        const weather = response.data.weather[0];
        const isRaining = weather.main.toLowerCase().includes('rain') || weather.description.toLowerCase().includes('rain');
        
        return {
            is_raining: isRaining ? 1 : 0,
            temperature: response.data.main.temp,
            humidity: response.data.main.humidity
        };
    } catch (error) {
        console.error('Error fetching weather data:', error);
        return { is_raining: 0 }; // Default to no rain
    }
}

/**
 * Predict ETA for bus to reach user location
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function predictETA(req, res) {
    try {
        const {
            device_id,
            user_lat,
            user_lng
        } = req.body;

        // Validate required fields
        if (!device_id || !user_lat || !user_lng) {
            return res.status(400).json({
                message: 'Missing required fields: device_id, user_lat, user_lng',
                received: req.body
            });
        }

        // Fetch IoT data for bus
        const iotData = await fetchIoTData(device_id);
        if (!iotData) {
            return res.status(404).json({
                message: 'No IoT data found for device'
            });
        }

        const { lat: bus_lat, lng: bus_lng, speed: bus_speed_kmh } = iotData;

        // Fetch weather data for user location
        const weatherData = await fetchWeatherData(user_lat, user_lng);

        // Fetch traffic data
        const trafficData = await fetchTrafficData(bus_lat, bus_lng, user_lat, user_lng);

        // Use traffic-adjusted ETA if available, else fallback to model
        let etaSeconds;
        if (trafficData) {
            // Simple calculation: distance / speed, adjusted for traffic
            const distanceKm = trafficData.distance_meters / 1000;
            const adjustedSpeed = bus_speed_kmh * 0.8; // Assume 20% traffic reduction
            etaSeconds = (distanceKm / adjustedSpeed) * 3600;
        }

        // Call ETA API with all data
        const response = await axios.post(`${ETA_API_URL}/predict`, {
            bus_lat: parseFloat(bus_lat),
            bus_lng: parseFloat(bus_lng),
            user_lat: parseFloat(user_lat),
            user_lng: parseFloat(user_lng),
            bus_speed_kmh: parseFloat(bus_speed_kmh),
            weather_was_raining: weatherData.is_raining
        });

        res.json({
            success: true,
            eta: response.data.prediction,
            bus_location: { lat: bus_lat, lng: bus_lng },
            traffic_data: trafficData,
            weather_data: weatherData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('ETA prediction error:', error.message);
        res.status(500).json({
            message: 'ETA prediction failed',
            error: error.message
        });
    }
}

/**
 * Health check for ETA service
 */
async function etaHealthCheck(req, res) {
    try {
        const response = await axios.get(`${ETA_API_URL}/health`);
        res.json(response.data);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            service: 'ETA API',
            error: error.message
        });
    }
}

/**
 * Predict ETA using query parameters (GET request)
 * Accepts: busId, userLat, userLng as query parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function predictETAFromQuery(req, res) {
    try {
        const {
            busId,
            userLat,
            userLng
        } = req.query;

        // Validate required fields
        if (!busId || !userLat || !userLng) {
            return res.status(400).json({
                message: 'Missing required query parameters: busId, userLat, userLng',
                received: req.query,
                example: '/api/eta?busId=ESP32_WROOM_DA_01&userLat=6.9124&userLng=79.8516'
            });
        }

        // Convert query params to request body format and call predictETA
        req.body = {
            device_id: busId,
            user_lat: parseFloat(userLat),
            user_lng: parseFloat(userLng)
        };

        // Call the existing predictETA function with converted parameters
        await predictETA(req, res);

    } catch (error) {
        console.error('ETA prediction from query error:', error.message);
        res.status(500).json({
            message: 'ETA prediction failed',
            error: error.message
        });
    }
}

module.exports = {
    predictETA,
    predictETAFromQuery,
    etaHealthCheck
};