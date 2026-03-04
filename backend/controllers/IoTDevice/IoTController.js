const SensorData = require('../../models/IoTDevice/SensorData');
const BusStop = require('../../models/IoTDevice/BusStops');

// SERVER MEMORY STATE 
// We use a dictionary object so we can track 100+ different buses at the same time
const busStates = {}; 

exports.receiveSensorData = async (req, res) => {
    try {
        const data = req.body;
        const deviceId = data.device_id;
        
        console.log("\n-----------------------------------------");
        console.log(`📡 Data received from Bus: ${deviceId}`);

        // 1. Save Raw Data
        const newData = new SensorData(data);
        await newData.save();

        // 2. WEBSOCKET BROADCAST
        // Grab the Socket.io instance from the main Express app
        const io = req.app.get('io'); 
        if (io) {
            io.emit('bus_location_update', {
                bus_id: deviceId, // Tell frontend WHICH bus is moving
                lat: data.gps.lat,
                lng: data.gps.lng,
                speed: data.gps.speed_kmh,
                status: data.imu.status
            });
        }

        // 3. STOP DETECTION LOGIC (Multi-Bus Support)
        const speed = data.gps.speed_kmh;
        const SPEED_THRESHOLD = 3.0; 

        // Initialize state memory for this specific bus if it's the first time we see it
        if (!busStates[deviceId]) {
            busStates[deviceId] = {
                isStopped: false, stopStartTime: null, lastLat: null, lastLng: null
            };
        }
        
        const state = busStates[deviceId];

        if (speed < SPEED_THRESHOLD && !state.isStopped) {
            // Bus just stopped!
            state.isStopped = true;
            state.stopStartTime = Date.now();
            state.lastLat = data.gps.lat;
            state.lastLng = data.gps.lng;
            console.log(`🛑 Bus ${deviceId} stopped. Tracking duration...`);
        } 
        else if (speed >= SPEED_THRESHOLD && state.isStopped) {
            // Bus started moving! Calculate duration.
            const stopDurationMillis = Date.now() - state.stopStartTime;
            const stopDurationSeconds = Math.floor(stopDurationMillis / 1000);

            if (stopDurationSeconds > 10) {
                await BusStop.create({
                    device_id: deviceId,
                    lat: state.lastLat,
                    lng: state.lastLng,
                    stop_duration_seconds: stopDurationSeconds,
                    weather_was_raining: data.weather.is_raining,
                    imu_status: data.imu.status
                });
                console.log(`📊 ML DATA SAVED: Bus ${deviceId} stopped for ${stopDurationSeconds}s`);
            }
            
            // Reset the state for this bus
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
        const { busId } = req.query;
        const latestBusData = await SensorData.findOne({ "device_id": busId }).sort({ received_at: -1 });
        
        if (!latestBusData) {
            return res.status(404).json({ error: "Bus not found" });
        }

        res.json({
            message: "Success",
            bus_location: { lat: latestBusData.gps.lat, lng: latestBusData.gps.lng },
            current_speed: latestBusData.gps.speed_kmh,
            is_raining: latestBusData.weather.is_raining,
            imu_status: latestBusData.imu.status
        });

    } catch (error) {
        res.status(500).json({ error: "Failed to get ETA data" });
    }
};