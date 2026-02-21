import os
import sys
import joblib
import pandas as pd
import numpy as np

# Add parent directory to path to import config and utils
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ETAModel.config import (
    MODELS_PATH, 
    MIN_LATITUDE, MAX_LATITUDE, 
    MIN_LONGITUDE, MAX_LONGITUDE
)
from ETAModel.utils.feature_engineering import create_features, get_feature_list

class ETAPredictor:
    def __init__(self):
        self.model = None
        self.features = get_feature_list()
        self.load_model()
        
    def load_model(self):
        """Loads the saved XGBoost model from the disk"""
        model_path = os.path.join(MODELS_PATH, "eta_model.pkl")
        try:
            if os.path.exists(model_path):
                self.model = joblib.load(model_path)
                print(f"✅ Successfully loaded ETA Model from {model_path}")
            else:
                print(f"⚠️ Model file not found at {model_path}. Please run train_model.py first!")
        except Exception as e:
            print(f"❌ Error loading model: {e}")

    def predict_eta(self, bus_lat, bus_lng, user_lat, user_lng, bus_speed_kmh=25.0, weather_was_raining=0):
        """
        Predicts ETA in seconds.
        Falls back to basic physics math if the ML model is missing or fails.
        """
        # 1. Check for missing/None values
        if None in [bus_lat, bus_lng, user_lat, user_lng]:
            raise ValueError("Coordinate parameters cannot be None.")
            
        # 2. Convert to float safely
        b_lat, b_lng = float(bus_lat), float(bus_lng)
        u_lat, u_lng = float(user_lat), float(user_lng)
        
        # 3. Validate coordinate bounds (This is what the test was checking!)
        if not (MIN_LATITUDE <= b_lat <= MAX_LATITUDE) or not (MIN_LATITUDE <= u_lat <= MAX_LATITUDE):
            raise ValueError(f"Latitude must be between {MIN_LATITUDE} and {MAX_LATITUDE}")
            
        if not (MIN_LONGITUDE <= b_lng <= MAX_LONGITUDE) or not (MIN_LONGITUDE <= u_lng <= MAX_LONGITUDE):
            raise ValueError(f"Longitude must be between {MIN_LONGITUDE} and {MAX_LONGITUDE}")

        # Create a single-row DataFrame for the input
        input_data = pd.DataFrame([{
            'bus_lat': b_lat,
            'bus_lng': b_lng,
            'user_lat': u_lat,
            'user_lng': u_lng,
            'bus_speed_kmh': float(bus_speed_kmh),
            'weather_was_raining': int(weather_was_raining)
        }])
        
        # Apply Feature Engineering (calculates distance, rush hour, etc.)
        processed_data = create_features(input_data)
        
        # Extract the exact features the model needs
        X = processed_data[self.features]
        
        if self.model is not None:
            try:
                # Use the AI Model to predict seconds!
                prediction_seconds = self.model.predict(X)[0]
                return max(60.0, float(prediction_seconds)) # Ensure it doesn't predict negative time or < 1 min
            except Exception as e:
                print(f"⚠️ ML Prediction failed: {e}. Using fallback.")
        
        # --- HARDWARE FALLBACK ---
        # If the model isn't trained yet, use simple math: Time = Distance / Speed
        distance_km = processed_data['distance_km'].iloc[0]
        speed = max(5.0, float(bus_speed_kmh)) # Prevent division by zero
        
        # Apply basic penalties for rain
        if weather_was_raining:
            speed *= 0.8 
            
        hours = distance_km / speed
        return hours * 3600.0 # Convert to seconds

    def predict_with_explanation(self, **kwargs):
        """Returns the ETA along with all the context used to calculate it"""
        eta_seconds = self.predict_eta(**kwargs)
        
        return {
            "eta_seconds": round(eta_seconds),
            "eta_minutes": round(eta_seconds / 60.0, 1),
            "bus_location": f"{kwargs.get('bus_lat')}, {kwargs.get('bus_lng')}",
            "user_location": f"{kwargs.get('user_lat')}, {kwargs.get('user_lng')}",
            "weather": "Raining" if kwargs.get('weather_was_raining') else "Clear",
            "model_used": "XGBoost AI" if self.model is not None else "Physics Fallback"
        }

# Simple wrapper function for easy imports
def predict_eta(**kwargs):
    predictor = ETAPredictor()
    return predictor.predict_eta(**kwargs)