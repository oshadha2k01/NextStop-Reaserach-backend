from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
from create_dummy_data import format_prediction_output

app = Flask(__name__)
CORS(app)

# Load model at startup
try:
    MODEL = joblib.load('models/crowd_model.pkl')
    print("✅ Model loaded successfully")
except:
    MODEL = None
    print(" Model not found. Train the model first.")

@app.route('/predict', methods=['POST'])
def predict():
    if MODEL is None:
        return jsonify({'error': 'Model not trained yet'}), 500
    
    try:
        data = request.json
        date = data.get('date')
        time = data.get('time')
        
        # Parse date and time
        dt = pd.to_datetime(f"{date} {time}")
        
        # Feature engineering - MUST match train_model.py exactly
        features = pd.DataFrame([{
            'hour': dt.hour,
            'minute': dt.minute,
            'day_of_week': dt.dayofweek,
            'month': dt.month,
            'year': dt.year,
            'day_of_month': dt.day,
            'quarter': dt.quarter,
            'is_weekend': 1 if dt.dayofweek >= 5 else 0,
            'is_peak_morning': 1 if 7 <= dt.hour <= 9 else 0,
            'is_peak_evening': 1 if 17 <= dt.hour <= 19 else 0,
            'is_lunch_time': 1 if 12 <= dt.hour <= 14 else 0,
            'is_early_morning': 1 if dt.hour < 7 else 0,
            'is_late_night': 1 if dt.hour >= 20 else 0,
            'is_winter': 1 if dt.month in [12, 1, 2] else 0,
            'is_summer': 1 if dt.month in [6, 7, 8] else 0
        }])
        
        # Make prediction
        predicted_crowd = int(MODEL.predict(features)[0])
        
        # Use format_prediction_output to get recommendation
        result = format_prediction_output(date, time, predicted_crowd)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'Flask ML service is running', 'model_loaded': MODEL is not None})

if __name__ == '__main__':
    # Flask ML Service on Port 5000
    app.run(port=5000, debug=True)
