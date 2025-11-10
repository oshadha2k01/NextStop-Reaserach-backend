// FILE: /backend/controllers/predictionController.js
const Prediction = require('../models/Prediction');
// Require the fetch library
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)); 

// --- Configuration ---
const FLASK_API_URL = 'http://localhost:5000/predict'; 

exports.getPredictionAndSave = async (req, res) => {
    const { date, time } = req.body; 

    if (!date || !time) {
        return res.status(400).json({ message: 'Date (YYYY-MM-DD) and Time (HH:MM:SS) are required.' });
    }

    try {
        // --- 1. Call the Flask API Service ---
        const flaskResponse = await fetch(FLASK_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, time })
        });

        const result = await flaskResponse.json();

        // Check for non-200 status or error message from Flask
        if (!flaskResponse.ok || result.error) {
            console.error('Flask API Error:', result.error || 'Unknown error');
            return res.status(500).json({ 
                message: 'Prediction service failed.', 
                details: result.error || 'Check Flask logs.' 
            });
        }
        
        // --- 2. Save to MongoDB ---
        const newPrediction = new Prediction({
            date: new Date(result.date),
            time: result.time,
            predictedCrowd: result.predicted_crowd,
            dayOfWeek: result.day_of_week
        });

        await newPrediction.save();

        // 3. Send final response
        res.status(200).json({
            message: '✅ Prediction retrieved, processed, and saved.',
            prediction: result
        });

    } catch (error) {
        console.error('Node.js Controller Error:', error.message);
        res.status(500).json({ 
            message: 'Internal server error during API call or saving.', 
            details: error.message 
        });
    }
};