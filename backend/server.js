// FILE: /backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const predictionController = require('./controllers/predictionController');
require('dotenv').config(); // Load environment variables from .env

const app = express();
const PORT = process.env.PORT || 3000;

// FIX: Ensure body-parser is configured to handle both JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- MongoDB Connection ---
// Use the URI from .env if available, otherwise fallback to local
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/BusCrowdDB';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
        process.exit(1);
    });

// --- API Route ---
app.post('/api/predict', predictionController.getPredictionAndSave);

// Start Server
app.listen(PORT, () => {
    console.log(`🌍 Node.js Server running on http://localhost:${PORT}`);
    console.log('--- Start Flask service on Port 5000 BEFORE testing ---');
});