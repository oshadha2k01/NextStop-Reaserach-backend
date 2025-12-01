// FILE: /backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const predictionController = require('./controllers/predictionController');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// --- MongoDB Connection ---
const MONGODB_URI = 'mongodb://localhost:27017/BusCrowdDB'; // UPDATE THIS!

mongoose.connect(MONGODB_URI)
    .then(() => console.log(' MongoDB Connected'))
    .catch(err => {
        console.error(' MongoDB Connection Error:', err.message);
        process.exit(1);
    });

// --- API Route ---
app.post('/api/predict/route', predictionController.getPredictionAndSave);

// Start Server
app.listen(PORT, () => {
    // Corrected line below:
    console.log(`Node.js Server running on http://localhost:${PORT}`);
    console.log('--- Start Flask service on Port 5000 BEFORE testing ---');
});