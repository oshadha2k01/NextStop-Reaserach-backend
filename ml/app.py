# FILE: /ml/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS # For allowing cross-origin requests from Node.js
import joblib
import pandas as pd
import os

app = Flask(__name__)
# Enable CORS to allow Node.js (Port 3000) to call Flask (Port 5000)
CORS(app) 

# --- Configuration ---
MODEL_PATH = 'models/trained_model.pkl'
MODEL = None 

# --- 1. Load Model (runs once when Flask starts) ---
def load_model():
    """Loads the model and sets up the global MODEL variable."""
    global MODEL
    try:
        # Load the model relative to the current working directory (/ml)
        MODEL = joblib.load(MODEL_PATH)
        print(f"✅ Model loaded successfully from {MODEL_PATH}")
    except FileNotFoundError:
        print(f"❌ ERROR: Model file not found at {MODEL_PATH}. Run train_model.py first.")
        # Do NOT exit the server, but make sure the API returns a 500 error later
        MODEL = None 

# --- 2. Feature Engineering Function ---
def create_features(date_str, time_str):
    """Converts input strings into the required numerical features."""
    try:
        full_datetime = pd.to_datetime(f"{date_str} {time_str}")
        full_only = full_datetime.to_pydatetime()
    except ValueError:
        return None, None 

    # Must match the features used in train_model.py
    input_data = pd.DataFrame([{
        'hour': full_only.hour,
        'minute': full_only.minute,
        'day_of_week': full_only.weekday(),
        'month': full_only.month,
        'day_of_year': full_only.timetuple().tm_yday
    }])
    
    return input_data, full_only

# --- 3. API Endpoint ---
@app.route('/predict', methods=['POST'])
def predict():
    """Receives JSON input, predicts, and returns JSON output."""
    data = request.get_json()
    date_str = data.get('date') 
    time_str = data.get('time') 

    if MODEL is None:
        return jsonify({'error': 'ML model failed to load.'}), 500
    if not date_str or not time_str:
        return jsonify({'error': 'Missing date or time parameters in request body.'}), 400

    input_X, full_datetime = create_features(date_str, time_str)
    
    if input_X is None:
        return jsonify({'error': 'Invalid date or time format.'}), 400
    
    try:
        # Make Prediction
        predicted_count = MODEL.predict(input_X)[0]
    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500
    
    # Prepare the final result
    result = {
        'date': date_str,
        'time': time_str,
        'predicted_crowd': int(round(predicted_count)),
        'day_of_week': full_datetime.strftime('%A')
    }
    
    return jsonify(result), 200

# --- Main Execution ---
if __name__ == '__main__':
    load_model()
    # Flask will run on Port 5000
    app.run(host='0.0.0.0', port=5000)