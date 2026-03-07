require('dotenv').config();
console.log('Environment check - API Key exists:', !!process.env.GOOGLE_MAPS_API_KEY);
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

// Import Existing Routes
const adminAuthRoutes = require("./routes/Admin/adminAuthRoutes");
const busRoutes = require("./routes/Bus/busRoutes");
const superAdminAuthRoutes = require("./routes/SuperAdmin/superAdminAuthRoutes");
const journeyModelRoutes = require("./routes/JourneyModel/journeyModelRoutes");
const fareSystemRoutes = require("./routes/FareSystem/fareSystemRoutes");
const predictionRoutes = require("./routes/CrowdPrediction/crowdPredictionRoutes");

// Import New IoT Routes
const iotRoutes = require("./routes/IoTDevice/IoTRoutes");

// Import Passenger Boarding Notification Routes
const boardingNotificationRoutes = require("./routes/Passenger/boardingNotificationRoutes");

const app = express();
const { MONGO_URI, PORT = 3000 } = process.env;

if (!MONGO_URI) {
  console.error("Missing MONGO_URI environment variable. Set it in a .env file at the project root.");
  process.exit(1);
}

// -----------------------------------------------------
// WEBSOCKET SETUP
// Wrap the Express app in a standard HTTP server
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// CRITICAL: Make the 'io' instance globally accessible to our controllers
// Now you can call `req.app.get('io')` in your iotController to send live updates!
app.set('io', io);

// Socket.IO Connection Handler
// Drivers join a private room keyed to their busId on connection
io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);
    
    // Driver sends their busId when they login and connect
    socket.on('driver_join', (data) => {
        const { busId } = data;
        if (busId) {
            const roomName = `bus-${busId}`;
            socket.join(roomName);
            console.log(`🚌 Driver joined room: ${roomName} (socket: ${socket.id})`);
            socket.emit('driver_joined', { room: roomName, message: 'Successfully joined driver room' });
        }
    });
    
    // Clean up on disconnect
    socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected:', socket.id);
    });
});
// -----------------------------------------------------

// Auto-remove '/backend' from the URL if DigitalOcean forwards it that way
app.use((req, res, next) => {
    if (req.url.startsWith('/backend/')) {
        req.url = req.url.replace('/backend', '');
    }
    next();
});

app.use(cors());
app.use(express.json());

// Mount Existing Routes
app.use("/api/admin", adminAuthRoutes);
app.use("/api/buses", busRoutes); 
app.use("/api/superadmin", superAdminAuthRoutes);
app.use("/api/destination", journeyModelRoutes); 
app.use("/api/fare", fareSystemRoutes);
app.use("/api/prediction", predictionRoutes);

// Mount New IoT Routes (Matches your ESP32 Config.h: /api/sensor-data)
// This will route to your iotController
app.use("/api", iotRoutes);

// Mount Passenger Boarding Notification Routes
app.use("/api/notify", boardingNotificationRoutes); 

// MongoDB Connection
mongoose
  .connect(MONGO_URI)
  .then(() => console.log(" MongoDB Connected Successfully"))
  .catch((err) => {
    console.error(" MongoDB Connection Error:", err);
    process.exit(1);
  });

// Server Running 
// Note: We use `server.listen` instead of `app.listen` to allow WebSockets to work!
server.listen(PORT, () => {
  console.log(`\n Server running on port ${PORT}`);
  console.log(` API endpoint: POST http://localhost:${PORT}/api/predict`);
  console.log(` IoT endpoint: POST http://localhost:${PORT}/api/sensor-data`);
  console.log('Start Flask service on Port 5000 BEFORE testing');
});