// FILE: /backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err.message));

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'NextStop Research Backend API' });
});

// Prediction Route - Forward to Flask ML Service
app.post('/api/predict', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:5000/predict', req.body);
        res.json(response.data);
    } catch (error) {
        console.error('❌ Error calling Flask ML service:', error.message);
        res.status(500).json({ 
            error: 'Failed to get prediction',
            message: 'Make sure Flask ML service is running on port 5000'
        });
    }
});

// Import routes here
// const predictionRoutes = require('./routes/predictions');
// app.use('/api/predictions', predictionRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log( Node.js Server running on http://localhost:${PORT});
    console.log('--- Start Flask service on Port 5000 BEFORE testing ---');
});