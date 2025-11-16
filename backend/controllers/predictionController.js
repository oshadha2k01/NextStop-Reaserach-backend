// FILE: /backend/controllers/predictionController.js
const Prediction = require('../models/Prediction');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)); 

const FLASK_API_URL = 'http://localhost:5000/predict'; 

exports.getPredictionAndSave = async (req, res) => {
    // FIX: Safety check to ensure req.body exists
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ 
            message: 'Empty request body. Ensure you are sending JSON and the Content-Type header is set.' 
        });
    }

    const { date, time } = req.body; 

    if (!date || !time) {
        return res.status(400).json({ message: 'Date (YYYY-MM-DD) and Time (HH:MM:SS) are required.' });
    }

    try {
        const flaskResponse = await fetch(FLASK_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, time })
        });

        const result = await flaskResponse.json();

        if (!flaskResponse.ok || result.error) {
            console.error('Flask API Error:', result.error || 'Unknown error');
            return res.status(500).json({ 
                message: 'Prediction service failed.', 
                details: result.error || 'Check Flask logs.' 
            });
        }
        
        // --- Save to MongoDB ---
        const newPrediction = new Prediction({
            date: new Date(result.date),
            time: result.time,
            // FIX: Ensure key matches 'predicted_count' returned by app.py
            predictedCrowd: result.predicted_count, 
            dayOfWeek: result.day_of_week
        });

        await newPrediction.save();

        res.status(200).json({
            message: '✅ Prediction retrieved and saved.',
            prediction: result
        });

    } catch (error) {
        console.error('Node.js Controller Error:', error.message);
        res.status(500).json({ 
            message: 'Internal server error.', 
            details: error.message 
        });
    }
};