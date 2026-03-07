"""
Prediction Module
Makes journey time predictions using trained model
"""

import joblib
import pandas as pd
import numpy as np
import os
from datetime import datetime

from ..config import MODELS_PATH
from ..utils.feature_engineering import create_features, get_feature_list


class JourneyTimePredictor:
    """Journey Time Prediction Model"""
    
    def __init__(self):
        """Initialize predictor with trained model"""
        self.model_path = os.path.join(MODELS_PATH, "journey_time_model.pkl")
        self.model = None
        self.features = None
        self.load_model()
    
    def load_model(self):
        """Load trained model from disk"""
        try:
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"Model not found at {self.model_path}")
            
            self.model = joblib.load(self.model_path)
            self.features = get_feature_list()
            print(f"--- Model loaded successfully")
            print(f"  Features: {len(self.features)}")
            
        except Exception as e:
            print(f"!!! Error loading model: {e}")
            raise
    
    def validate_input(self, data):
        """Validate input data"""
        required_fields = ['lat', 'lng', 'stop_duration_seconds', 'rain', 'hour']
        
        for field in required_fields:
            if field not in data:
                return False, f"Missing required field: {field}"
        
        return True, "Valid"
    
    def predict_time(self, lat, lng, stop_duration_seconds, rain, hour,
                     day_of_week=2, is_weekend=0, traffic_api_data=None,
                     boarding_lat=None, boarding_lng=None, 
                     destination_lat=None, destination_lng=None):
        """
        Predict journey time
        """
        try:
            # Create input dataframe
            input_dict = {
                'lat': lat,
                'lng': lng,
                'stop_duration_seconds': stop_duration_seconds,
                'weather_was_raining': int(rain),
                'hour': int(hour),
                'day_of_week': int(day_of_week),
                'is_weekend': int(is_weekend),
                'timestamp': datetime.now().isoformat()
            }
            
            # Add journey coords if available for distance feature
            if boarding_lat is not None:
                input_dict['boarding_lat'] = boarding_lat
                input_dict['boarding_lng'] = boarding_lng
                input_dict['destination_lat'] = destination_lat
                input_dict['destination_lng'] = destination_lng
            
            input_data = pd.DataFrame([input_dict])
            
            # Create features
            feature_data = create_features(input_data)
            
            # Get only required features (ensure all model features are present)
            X = pd.DataFrame(index=[0])
            for f in self.features:
                if f in feature_data.columns:
                    X[f] = feature_data[f]
                else:
                    X[f] = 0.0 # Default fallback
            
            # Make model prediction (this predicts stop/operating delay)
            ml_delay = self.model.predict(X)[0]
            ml_delay = max(ml_delay, 0)
            
            # Hybrid Calculation
            google_duration = 0
            if traffic_api_data and isinstance(traffic_api_data, dict):
                google_duration = traffic_api_data.get('duration_seconds', 0)
            
            if google_duration == 0:
                print("--- Traffic API data missing or invalid, using fallback calculation")
                # Fallback to speed-based estimation if Google fails
                # Average speed for bus in SL: 22 km/h
                avg_speed_kmh = 22
                
                # Use distance from features if available, otherwise calculate from coords
                if boarding_lat and destination_lat:
                    dist_km = np.sqrt(
                        (float(boarding_lat) - float(destination_lat))**2 + 
                        (float(boarding_lng) - float(destination_lng))**2
                    ) * 111.32
                    
                    google_duration = (dist_km / avg_speed_kmh) * 3600
                    print(f"--- Fallback: Distance={dist_km:.2f}km, Estimated Duration={google_duration/60:.1f} mins")
                else:
                    print("--- Fallback failed: Coordinates missing")

            if google_duration > 0:
                # If ML delay is small (typical stop duration), add it as a 'delta' to travel time
                if ml_delay < 900: # Less than 15 mins
                    prediction = google_duration + ml_delay
                    print(f"--- Hybrid (Base+Delay): {google_duration/60:.1f} + {ml_delay/60:.1f} = {prediction/60:.1f} mins")
                else:
                    # Weighted blend for independent journey model
                    prediction = (ml_delay * 0.6) + (google_duration * 0.4)
                    print(f"--- Hybrid (Blend): ML={ml_delay/60:.1f}, Google={google_duration/60:.1f}, Result={prediction/60:.1f} mins")
            else:
                prediction = ml_delay
                print(f"--- No base duration, using ML only: {prediction/60:.1f} mins")
            
            return float(prediction)
            
        except Exception as e:
            print(f"!!! Prediction error: {e}")
            raise
    
    def predict_with_explanation(self, lat, lng, stop_duration_seconds, rain, hour):
        """
        Predict with explanation
        
        Returns:
            Dictionary with prediction and explanation
        """
        prediction = self.predict_time(lat, lng, stop_duration_seconds, rain, hour)
        
        # Generate explanation
        explanation = {
            'predicted_time_seconds': prediction,
            'predicted_time_minutes': round(prediction / 60, 2),
            'location': f"({lat:.4f}, {lng:.4f})",
            'weather': 'Rainy' if rain else 'Clear',
            'hour': hour,
            'stop_duration_minutes': round(stop_duration_seconds / 60, 2)
        }
        
        return explanation


def predict_time(lat, lng, stop_duration, rain, hour):
    """
    Simplified prediction function for snippet compatibility
    """
    predictor = JourneyTimePredictor()
    return predictor.predict_time(lat, lng, stop_duration, rain, hour)


def predict_single(lat, lng, stop_duration_seconds, rain, hour):
    """
    Simple prediction function
    """
    predictor = JourneyTimePredictor()
    return predictor.predict_time(lat, lng, stop_duration_seconds, rain, hour)
if __name__ == "__main__":
    # Test prediction
    predictor = JourneyTimePredictor()
    
    # Example prediction
    result = predictor.predict_with_explanation(
        lat=-33.8688,
        lng=151.2093,
        stop_duration_seconds=300,
        rain=0,
        hour=14
    )
    
    print("\n" + "="*60)
    print("  🔮 JOURNEY TIME PREDICTION")
    print("="*60)
    print(f"\nPredicted Time: {result['predicted_time_minutes']} minutes")
    print(f"Location: {result['location']}")
    print(f"Weather: {result['weather']}")
    print(f"Time of Day: {result['hour']}:00")
    print(f"Stop Duration: {result['stop_duration_minutes']} minutes")
