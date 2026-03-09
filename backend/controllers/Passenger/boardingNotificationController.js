const BusDevice = require('../../models/Bus/BusDevice');
const SensorData = require('../../models/IoTDevice/SensorData');
const axios = require('axios');

// Compound index should be created in MongoDB for performance:
// db.sensor_readings.createIndex({ device_id: 1, received_at: -1 })

/**
 * POST /api/notify/board
 * Body: { deviceId: "ESP32 device ID", passengerLat: 6.9271, passengerLng: 79.8612 }
 *
 * Flow:
 * 1. Get latest sensor data directly using deviceId
 * 2. Reverse-lookup BusDevice to get busId for Socket.IO room
 * 3. Call Google Maps Distance Matrix API for real road distance/time
 * 4. Call Google Maps Directions API to count stops between bus and passenger
 * 5. Emit Socket.IO event to driver's room with all calculated data
 */
exports.notifyBusDriver = async (req, res) => {
    try {
        const { deviceId, passengerLat, passengerLng, message } = req.body;

        // Validation
        if (!deviceId || !passengerLat || !passengerLng) {
            return res.status(400).json({
                error: "Missing required fields: deviceId, passengerLat, passengerLng"
            });
        }

        console.log("\n🚌 PASSENGER BOARDING NOTIFICATION");
        console.log(`📍 Passenger at: ${passengerLat}, ${passengerLng}`);
        console.log(`🆔 Device ID: ${deviceId}`);

        // STEP 1: Get latest GPS position directly using deviceId
        // Skips documents where the GPS had no fix yet (lat/lng = 0)
        const latestBusData = await SensorData.findOne({
            device_id: deviceId,
            'gps.lat': { $exists: true, $ne: 0 },
            'gps.lng': { $exists: true, $ne: 0 }
        })
            .sort({ received_at: -1 })
            .lean();

        if (!latestBusData || !latestBusData.gps) {
            console.error(`❌ No GPS data found for device ${deviceId}`);
            return res.status(404).json({
                error: "Bus location unavailable — device has no GPS fix yet"
            });
        }

        const busLat = latestBusData.gps.lat;
        const busLng = latestBusData.gps.lng;
        console.log(`📡 Bus current position: ${busLat}, ${busLng}`);

        // STEP 2: Reverse-lookup busId from BusDevice for Socket.IO room name
        const busDevice = await BusDevice.findOne({ device_id: deviceId, is_active: true });

        if (!busDevice) {
            console.error(`❌ No active BusDevice registration found for device ${deviceId}`);
            return res.status(404).json({
                error: "Device is not registered to any active bus"
            });
        }

        const busId = busDevice.bus_id.toString();
        console.log(`🔗 Resolved Bus ID: ${busId}`);

        // STEP 3: Call Google Maps Distance Matrix API
        // Returns real road distance and estimated travel time with traffic
        const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
        
        if (!GOOGLE_API_KEY) {
            console.error("❌ GOOGLE_MAPS_API_KEY not set in environment");
            return res.status(500).json({ 
                error: "Google Maps API key not configured" 
            });
        }

        const distanceMatrixUrl = `https://maps.googleapis.com/maps/api/distancematrix/json`;
        const distanceMatrixParams = {
            origins: `${busLat},${busLng}`,
            destinations: `${passengerLat},${passengerLng}`,
            mode: 'driving',
            departure_time: 'now', // Enables real-time traffic data
            key: GOOGLE_API_KEY
        };

        console.log(`🗺️  Calling Google Distance Matrix API...`);
        const distanceResponse = await axios.get(distanceMatrixUrl, { 
            params: distanceMatrixParams,
            timeout: 10000 
        });

        if (distanceResponse.data.status !== 'OK' || 
            distanceResponse.data.rows[0].elements[0].status !== 'OK') {
            console.error("❌ Google Distance Matrix API error:", distanceResponse.data);
            return res.status(500).json({ 
                error: "Unable to calculate route distance" 
            });
        }

        const element = distanceResponse.data.rows[0].elements[0];
        const roadDistanceMeters = element.distance.value; // metres
        const roadDistanceText = element.distance.text;    // "1.2 km"
        const travelDurationSeconds = element.duration.value; // seconds
        const travelDurationText = element.duration.text;     // "4 mins"

        console.log(`✅ Road distance: ${roadDistanceText} (${roadDistanceMeters}m)`);
        console.log(`✅ Travel time: ${travelDurationText} (${travelDurationSeconds}s)`);

        // STEP 4: Call Google Directions API to count bus stops
        // Uses waypoints and steps to snap to roads and count intermediate stops
        const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json`;
        const directionsParams = {
            origin: `${busLat},${busLng}`,
            destination: `${passengerLat},${passengerLng}`,
            mode: 'driving',
            key: GOOGLE_API_KEY
        };

        console.log(`🗺️  Calling Google Directions API for stop count...`);
        const directionsResponse = await axios.get(directionsUrl, { 
            params: directionsParams,
            timeout: 10000 
        });

        let stopCount = 0;

        if (directionsResponse.data.status === 'OK' && 
            directionsResponse.data.routes.length > 0) {
            
            // The route geometry gives us the snapped-to-road path
            // For a production system, you'd maintain a database of bus stop GPS coordinates
            // and check which stops fall along this route using spatial queries
            // For now, we'll estimate based on distance (average 400m between stops)
            const AVERAGE_STOP_DISTANCE_METERS = 400;
            stopCount = Math.max(1, Math.round(roadDistanceMeters / AVERAGE_STOP_DISTANCE_METERS));
            
            console.log(`📊 Estimated stops between bus and passenger: ${stopCount}`);
        } else {
            console.warn("⚠️  Directions API didn't return a route, using fallback");
            stopCount = Math.max(1, Math.round(roadDistanceMeters / 400));
        }

        // STEP 5: Emit Socket.IO event to driver's room
        const io = req.app.get('io');
        
        if (!io) {
            console.error("❌ Socket.IO not found on app");
            return res.status(500).json({ 
                error: "Real-time communication unavailable" 
            });
        }

        const notificationPayload = {
            timestamp: Date.now(),
            passenger: {
                lat: passengerLat,
                lng: passengerLng
            },
            bus: {
                lat: busLat,
                lng: busLng
            },
            distance: {
                meters: roadDistanceMeters,
                text: roadDistanceText
            },
            duration: {
                seconds: travelDurationSeconds,
                text: travelDurationText
            },
            stopsAway: stopCount,
            message: message || "I'm waiting at the stop",
            status: 'unacknowledged'
        };

        // Emit to room named after busId (driver joins this room on login)
        const roomName = `bus-${busId}`;
        io.to(roomName).emit('passenger_boarding', notificationPayload);
        
        console.log(`🔔 Notification sent to room: ${roomName}`);
        console.log(`📦 Payload:`, JSON.stringify(notificationPayload, null, 2));

        // Return success to passenger app
        res.status(200).json({
            success: true,
            message: "Driver has been notified",
            data: {
                distance: roadDistanceText,
                estimatedTime: travelDurationText,
                stopsAway: stopCount
            }
        });

    } catch (error) {
        console.error("❌ Error in notifyBusDriver:", error);
        res.status(500).json({ 
            error: "Failed to notify driver",
            details: error.message 
        });
    }
};
