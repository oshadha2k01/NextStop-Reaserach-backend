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
const fareSystemRoutes = require("./routes/FareSystem/fareSystemRoutes");
const predictionRoutes = require("./routes/CrowdPrediction/crowdPredictionRoutes");
const driverRoutes = require("./routes/SuperAdmin/driverRoutes");
const complaintRoutes = require("./routes/SuperAdmin/complaintRoutes");
const feedbackRoutes = require("./routes/SuperAdmin/feedbackRoutes");
const dashboardRoutes = require("./routes/SuperAdmin/dashboardRoutes");
const journeyModelRoutes = require("./routes/JourneyModel/journeyModelRoutes");
const routeRoutes = require("./routes/SuperAdmin/routeRoutes");
const peopleConutRoutes = require("./routes/DL/peopleConutRoutes");

// Import New IoT Routes
const iotRoutes = require("./routes/IoTDevice/IoTRoutes");

// Import Passenger Auth Routes
const passengerAuthRoutes = require("./routes/Passenger/passengerAuthRoutes");

// Import Passenger Boarding Notification Routes
const boardingNotificationRoutes = require("./routes/Passenger/boardingNotificationRoutes");

// Import ETA Routes
const etaRoutes = require("./routes/IoTDevice/etaRoutes");
// Import Bus-Device Registration Routes
const busDeviceRoutes = require("./routes/BusDevice/busDeviceRoutes");

// Import Data Routes
const dataRoutes = require("./routes/SuperAdmin/dataRoutes");

const app = express();
const { MONGO_URI, PORT = 3000 } = process.env;
const configuredSocketPath = (process.env.SOCKET_PATH || '').trim();
const SOCKET_PATH = configuredSocketPath === '/backend/socket.io'
  ? '/socket.io'
  : (configuredSocketPath || '/socket.io');

if (!MONGO_URI) {
  console.error("Missing MONGO_URI environment variable. Set it in a .env file at the project root.");
  process.exit(1);
}

// -----------------------------------------------------
// WEBSOCKET SETUP
// Create a standard HTTP server first, then attach Socket.IO before Express.
// This avoids Express returning 404 for handshake URLs before Socket.IO sees them.
const server = http.createServer();
const buildCorsOrigin = () => {
    if (process.env.NODE_ENV !== 'production') return '*';
    const raw = process.env.CORS_ORIGIN || '';
    if (!raw) return false;
    const origins = raw.split(',').map(o => o.trim()).filter(Boolean);
    if (origins.length === 0) return false;
    if (origins.length === 1) return origins[0];
    return (origin, callback) => {
        if (!origin) return callback(null, true); // allow non-browser clients
        const isAllowed = origins.some(allowed => {
            if (allowed === 'http://localhost' || allowed === 'localhost') {
                return /^http:\/\/localhost(:\d+)?$/.test(origin);
            }
            return allowed === origin;
        });
        callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
    };
};
const corsOrigin = buildCorsOrigin();
const io = new Server(server, {
  cors: { origin: corsOrigin },
  path: SOCKET_PATH,
});

// Attach Express after Socket.IO listeners are in place.
server.on('request', app);


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

// Auto-remove '/backend' prefix if DigitalOcean forwards it that way
app.use((req, res, next) => {
  // Never rewrite Socket.IO handshake URLs.
  if (req.url.startsWith('/socket.io') || req.url.startsWith('/backend/socket.io')) {
    return next();
  }

    if (req.url === '/backend' || req.url === '/backend/') {
        req.url = '/';
    } else if (req.url.startsWith('/backend/')) {
        req.url = req.url.slice('/backend'.length);
    }
    next();
});

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Health check (used by DigitalOcean App Platform)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Local health alias for simpler checks in Postman
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Root route — required so DigitalOcean health checks and /backend access return 200
app.get('/', (req, res) => res.json({
    status: 'ok',
    message: 'NextStop Backend API is running',
    version: '1.0.0'
}));

// Serve Driver Dashboard test page (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/driver', (req, res) => {
    res.sendFile(require('path').join(__dirname, 'driver-dashboard.html'));
  });

  // Serve Passenger App test page (development only)
  app.get('/passenger', (req, res) => {
    res.sendFile(require('path').join(__dirname, 'passenger-app.html'));
  });
}

// Mount Existing Routes
app.use("/api/admin", adminAuthRoutes);
app.use("/api/passenger", passengerAuthRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/superadmin", superAdminAuthRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/feedbacks", feedbackRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/destination", journeyModelRoutes);
app.use("/api/journey-model", journeyModelRoutes);
app.use("/api/fare", fareSystemRoutes);
app.use("/api/predict", predictionRoutes);
app.use("/api/dl", peopleConutRoutes);
app.use("/api", routeRoutes);

// Mount New IoT Routes (Matches your ESP32 Config.h: /api/sensor-data)
// This will route to your iotController
app.use("/api", iotRoutes);

// Mount Passenger Boarding Notification Routes
app.use("/api/notify", boardingNotificationRoutes);

// Mount ETA Routes
app.use("/api/eta", etaRoutes); 
// Mount Bus-Device Registration Routes
app.use("/api/bus-device", busDeviceRoutes);

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});


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
  console.log(` Socket.IO path: ${SOCKET_PATH}`);
  console.log(` API endpoint: POST http://localhost:${PORT}/api/predict`);
  console.log(` IoT endpoint: POST http://localhost:${PORT}/api/sensor-data`);
  console.log('Start Flask service on Port 5000 BEFORE testing');
});