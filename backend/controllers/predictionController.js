const Prediction = require('../models/Prediction');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.getPredictionAndSave = async (req, res) => {
    const { date, time } = req.body;
    
    try {
        // Calling Flask on Port 3000
        const response = await fetch('http://localhost:3000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, time })
        });

        const data = await response.json();

        const newRecord = new Prediction({
            date: new Date(data.date),
            time: data.time,
            predictedCrowd: data.predicted_crowd,
            dayOfWeek: data.day_of_week
        });

        await newRecord.save();
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};