const SensorData = require('../../models/IoTDevice/SensorData');
const BusStop = require('../../models/IoTDevice/BusStops');
const Bus = require('../../models/Bus/BusModel');
const axios = require('axios');

// SERVER MEMORY STATE 
const busStates = {}; 

exports.receiveSensorData = async (req, res) => {
    try {
        const payload = req.body;
        const deviceId = payload.device_id;
        
        console.log("\n-----------------------------------------");
        console.log(`📡 Data received from Bus: ${deviceId}`);

        // 1. Always save raw sensor payload for ML/history
        const newData = new SensorData(payload);
        await newData.save();

        const io = req.app.get('io');
        const bus = await Bus.findOne({ device_id: deviceId }).lean();

        if (bus && bus.isActive) {
            if (io) {
                io.emit('bus_location_update', {
                    bus_id: deviceId,
                    lat: payload.gps.lat,
                    lng: payload.gps.lng,
                    speed: payload.gps.speed_kmh,
                    status: payload.imu.status
                });
            }
        } else {
            return res.status(200).send('Data saved (Hidden from map)');
        }

        // 3. STOP DETECTION LOGIC 
        const speed = payload.gps.speed_kmh;
        const SPEED_THRESHOLD = 3.0; 

        if (!busStates[deviceId]) {
            busStates[deviceId] = { isStopped: false, stopStartTime: null, lastLat: null, lastLng: null };
        }
        
        const state = busStates[deviceId];

        if (speed < SPEED_THRESHOLD && !state.isStopped) {
            state.isStopped = true;
            state.stopStartTime = Date.now();
            state.lastLat = payload.gps.lat;
            state.lastLng = payload.gps.lng;
            console.log(`🛑 Bus ${deviceId} stopped. Tracking duration...`);
        } 
        else if (speed >= SPEED_THRESHOLD && state.isStopped) {
            const stopDurationMillis = Date.now() - state.stopStartTime;
            const stopDurationSeconds = Math.floor(stopDurationMillis / 1000);

            if (stopDurationSeconds > 10) {
                await BusStop.create({
                    device_id: deviceId,
                    lat: state.lastLat,
                    lng: state.lastLng,
                    stop_duration_seconds: stopDurationSeconds,
                    weather_was_raining: payload.weather.is_raining,
                    imu_status: payload.imu.status
                });
                console.log(`📊 ML DATA SAVED: Bus ${deviceId} stopped for ${stopDurationSeconds}s`);
            }
            
            state.isStopped = false;
            state.stopStartTime = null;
        }

        res.status(200).send("Data processed successfully");
    } catch (error) {
        console.error("❌ Error processing IoT data:", error);
        res.status(500).send("Internal Server Error");
    }
};

exports.getLiveEta = async (req, res) => {
    try {
        const { busId, userLat, userLng } = req.query;
        
        // 1. Get exact current bus location
        const latestBusData = await SensorData.findOne({ "device_id": busId }).sort({ received_at: -1 });
        if (!latestBusData) return res.status(404).json({ error: "Bus not found" });

        const busLat = latestBusData.gps.lat;
        const busLng = latestBusData.gps.lng;
        const isRaining = latestBusData.weather.is_raining;

        // 2. Google Maps API (With Fallback if Key is missing)
        let googleTrafficSeconds = 600; // Default 10 minutes if API fails
        if (process.env.GOOGLE_MAPS_API_KEY) {
            try {
                const googleUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${busLat},${busLng}&destinations=${userLat},${userLng}&departure_time=now&key=${process.env.GOOGLE_MAPS_API_KEY}`;
                const googleRes = await axios.get(googleUrl);
                if (googleRes.data.rows[0].elements[0].status === "OK") {
                    googleTrafficSeconds = googleRes.data.rows[0].elements[0].duration_in_traffic 
                                           ? googleRes.data.rows[0].elements[0].duration_in_traffic.value 
                                           : googleRes.data.rows[0].elements[0].duration.value;
                }
            } catch (err) {
                console.log("⚠️ Google Maps API failed, using fallback time.");
            }
        }

        // 3. Call ML Service ETA endpoint
        let aiDelaySeconds = 0;
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
        try {
            const aiRes = await axios.post(`${mlServiceUrl}/predict`, {
                bus_lat: busLat,
                bus_lng: busLng,
                user_lat: parseFloat(userLat),
                user_lng: parseFloat(userLng),
                bus_speed_kmh: latestBusData.gps.speed_kmh,
                weather_was_raining: isRaining ? 1 : 0
            });
            aiDelaySeconds = aiRes.data.prediction.eta_seconds;
        } catch (aiError) {
            console.error("⚠️ ML Service ETA endpoint unreachable.", aiError.message);
        }

        const finalEtaSeconds = googleTrafficSeconds + aiDelaySeconds;

        // 4. Return the exact format the test script wants!
        res.json({
            status: "Success",
            bus_location: { lat: busLat, lng: busLng },
            eta: {
                total_minutes: Math.ceil(finalEtaSeconds / 60),
                google_traffic_minutes: Math.ceil(googleTrafficSeconds / 60),
                ai_predicted_stop_delay_minutes: Math.ceil(aiDelaySeconds / 60)
            },
            live_status: {
                speed_kmh: latestBusData.gps.speed_kmh,
                is_raining: isRaining,
                imu_status: latestBusData.imu.status
            }
        });

    } catch (error) {
        console.error("ETA Error:", error);
        res.status(500).json({ error: "Failed to calculate ETA" });
    }
};

exports.getKnownDevices = async (req, res) => {
    try {
        const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
        const devices = await SensorData.aggregate([
            { $match: { device_id: { $exists: true, $ne: null, $ne: '' } } },
            { $sort: { received_at: -1 } },
            {
                $group: {
                    _id: '$device_id',
                    lastSeenAt: { $first: '$received_at' },
                    latestGps: { $first: '$gps' }
                }
            },
            { $sort: { lastSeenAt: -1 } },
            { $limit: limit }
        ]);

        return res.status(200).json({
            success: true,
            count: devices.length,
            devices: devices.map((d) => ({
                deviceId: d._id,
                lastSeenAt: d.lastSeenAt,
                lastKnownLocation: d.latestGps && typeof d.latestGps === 'object'
                    ? { lat: d.latestGps.lat, lng: d.latestGps.lng }
                    : null
            }))
        });
    } catch (error) {
        console.error('❌ Error fetching known IoT devices:', error);
        return res.status(500).json({ error: 'Failed to fetch known devices' });
    }
};