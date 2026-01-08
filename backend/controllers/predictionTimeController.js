const axios = require('axios');
const BusData = require('../models/BusRealTimeData');
const PredictionHistory = require('../models/PredictionHistory');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const FLASK_PREDICTION_API = process.env.FLASK_PREDICTION_API;

exports.getPredictedTime = async (req, res) => {
    const { busId, userLocation, passengerDestination, passengerArrivalTimeMinutes } = req.body;
    
    // Verify API key is loaded
    console.log('Google Maps API Key loaded:', GOOGLE_MAPS_API_KEY ? 'Yes (length: ' + GOOGLE_MAPS_API_KEY.length + ')' : 'No - MISSING!');
    console.log('Flask API URL:', FLASK_PREDICTION_API);
    
    if (!busId || !userLocation || !passengerDestination || !passengerArrivalTimeMinutes) {
        return res.status(400).json({ 
            message: 'Missing required fields: busId, userLocation, passengerDestination, or passengerArrivalTimeMinutes.' 
        });
    }

    try {
        // 1. Get Current Bus Location from MongoDB using device_id
        const latestBusData = await BusData.findOne({ device_id: busId }).sort({ timestamp: -1 }).limit(1);
        if (!latestBusData) {
             return res.status(404).json({ message: `No recent data found for device ${busId}. Is the simulator running?` });
        }
        const busCurrentLocation = `${latestBusData.latitude},${latestBusData.longitude}`;

        console.log('Bus Current Location:', busCurrentLocation);
        console.log('User Location:', userLocation);
        console.log('Passenger Destination:', passengerDestination);

        // 2. Calculate Distance from User Location to Destination (via bus route)
        const userToDestUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?` + 
                            `origins=${encodeURIComponent(userLocation)}` +
                            `&destinations=${encodeURIComponent(passengerDestination)}` +
                            `&mode=driving` + 
                            `&departure_time=now` + 
                            `&key=${GOOGLE_MAPS_API_KEY}`;
                            
        console.log('Calling Google Maps for User-to-Destination distance...');
        const userToDestResponse = await axios.get(userToDestUrl);
        const userToDestData = userToDestResponse.data;
        
        if (userToDestData.status !== 'OK' || !userToDestData.rows || userToDestData.rows.length === 0) {
            console.error('Google Maps API Error:', userToDestData);
            return res.status(500).json({ 
                message: `Google Maps API Error: ${userToDestData.status}. Check User Location or Destination format.`,
                details: userToDestData
            });
        }
        
        const userToDestElement = userToDestData.rows[0].elements[0];
        if (userToDestElement.status !== 'OK') {
            console.error('Google Maps Routing Error:', userToDestElement.status);
            return res.status(500).json({ 
                message: `Cannot calculate route from user location to destination. Status: ${userToDestElement.status}` 
            });
        }
        
        const totalDistanceMeters = userToDestElement.distance.value;
        const totalDistanceKm = (totalDistanceMeters / 1000).toFixed(2);
        
        console.log(`User to Destination: ${totalDistanceMeters}m (${totalDistanceKm} km)`);

        // 3. Call Flask ML Prediction API for Bus Journey Time
        const flaskData = {
            busId: busId,
            distanceMeters: totalDistanceMeters
        };

        console.log('Calling Flask API at:', FLASK_PREDICTION_API);
        console.log('Sending to Flask:', flaskData);
        
        try {
            const flaskResponse = await axios.post(FLASK_PREDICTION_API, flaskData);
            console.log('Flask Response Status:', flaskResponse.status);
            console.log('Flask Response Data:', flaskResponse.data);
            
            if (!flaskResponse.data || typeof flaskResponse.data.totalJourneySeconds === 'undefined') {
                console.error('Invalid Flask Response - missing totalJourneySeconds:', flaskResponse.data);
                return res.status(500).json({ 
                    message: 'Flask API returned invalid response format.',
                    detail: 'Expected field "totalJourneySeconds" is missing',
                    receivedData: flaskResponse.data
                });
            }
            
            const predictedTimeSeconds = flaskResponse.data.totalJourneySeconds;
            
            if (isNaN(predictedTimeSeconds) || predictedTimeSeconds === null) {
                console.error('Invalid predictedTimeSeconds value:', predictedTimeSeconds);
                return res.status(500).json({ 
                    message: 'Flask API returned invalid time value.',
                    detail: `totalJourneySeconds is ${predictedTimeSeconds}`,
                    receivedData: flaskResponse.data
                });
            }
            
            // 4. Compare with Desired Time
            const desiredTimeSeconds = parseInt(passengerArrivalTimeMinutes) * 60;
            
            console.log('=== PREDICTION RESULT ===');
            console.log(`Predicted Bus Journey Time: ${(predictedTimeSeconds/60).toFixed(1)} min`);
            console.log(`Desired Time: ${passengerArrivalTimeMinutes} min`);
            console.log(`Distance: ${totalDistanceKm} km`);
            
            let alertStatus;
            let alertMessage;

            if (predictedTimeSeconds > desiredTimeSeconds) {
                alertStatus = 'warning';
                alertMessage = `ALERT: Predicted journey time (${(predictedTimeSeconds/60).toFixed(1)} min) exceeds your desired time (${passengerArrivalTimeMinutes} min). You may be late!`;
            } else {
                alertStatus = 'success';
                alertMessage = `SUCCESS: Predicted journey time (${(predictedTimeSeconds/60).toFixed(1)} min) is within your desired time (${passengerArrivalTimeMinutes} min). You'll arrive on time!`;
            }

            res.status(200).json({
                busId: busId,
                userLocation: userLocation,
                destination: passengerDestination,
                predictedTimeMinutes: (predictedTimeSeconds / 60).toFixed(1),
                distanceKm: totalDistanceKm,
                desiredTimeMinutes: passengerArrivalTimeMinutes,
                alertStatus: alertStatus,
                alertMessage: alertMessage
            });

            // Save prediction to MongoDB
            try {
                const predictionRecord = new PredictionHistory({
                    busId: busId,
                    userLocation: userLocation,
                    destination: passengerDestination,
                    predictedTimeMinutes: parseFloat((predictedTimeSeconds / 60).toFixed(1)),
                    distanceKm: parseFloat(totalDistanceKm),
                    desiredTimeMinutes: passengerArrivalTimeMinutes,
                    alertStatus: alertStatus,
                    alertMessage: alertMessage
                });
                
                await predictionRecord.save();
                console.log('Prediction saved to database successfully');
            } catch (saveError) {
                console.error('Error saving prediction to database:', saveError.message);
                // Don't fail the request if DB save fails, just log it
            }
            
        } catch (flaskError) {
            console.error('Flask API Error Details:', {
                url: FLASK_PREDICTION_API,
                status: flaskError.response?.status,
                statusText: flaskError.response?.statusText,
                data: flaskError.response?.data,
                message: flaskError.message
            });
            return res.status(500).json({ 
                message: 'Flask Prediction API is not available or endpoint is incorrect.',
                detail: `Flask API returned ${flaskError.response?.status || 'connection error'}. Is Flask server running on ${FLASK_PREDICTION_API}?`,
                flaskUrl: FLASK_PREDICTION_API
            });
        }

    } catch (error) {
        console.error('Error in prediction pipeline:', error.message);
        res.status(500).json({ 
            message: 'Failed to complete prediction pipeline.',
            detail: error.message
        });
    }
};