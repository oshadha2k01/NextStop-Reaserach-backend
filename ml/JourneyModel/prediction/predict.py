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
from ..utils.feature_engineering import (
    create_features,
    get_feature_list,
    estimate_expected_stop_duration,
    calculate_route_sequence_distance_km,
)


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
        required_fields = ['lat', 'lng', 'rain', 'hour']
        
        for field in required_fields:
            if field not in data:
                return False, f"Missing required field: {field}"
        
        return True, "Valid"
    
    def predict_time(self, lat, lng, rain, hour,
                     day_of_week=2, is_weekend=0, traffic_api_data=None,
                     boarding_lat=None, boarding_lng=None,
                     destination_lat=None, destination_lng=None,
                     road_distance_km=None):
        """
        Predict journey time.

        When both boarding and destination coords are provided, the geographic
        midpoint is used as the lat/lng model input so the location feature is
        direction-neutral (same midpoint for A->B and B->A).
        """
        try:
            # Use midpoint lat/lng so the location feature is the same regardless
            # of whether the journey is forward or reverse on the route.
            if boarding_lat is not None and destination_lat is not None:
                effective_lat = (float(boarding_lat) + float(destination_lat)) / 2
                effective_lng = (float(boarding_lng) + float(destination_lng)) / 2
            else:
                effective_lat = lat
                effective_lng = lng

            is_rush_hour_val = 1 if (7 <= int(hour) <= 9 or 16 <= int(hour) <= 19) else 0

            # Estimate traffic intensity from external duration when available.
            traffic_intensity_val = 1
            if traffic_api_data and isinstance(traffic_api_data, dict):
                traffic_intensity_val = 2 if traffic_api_data.get('duration_seconds', 0) > 1800 else 1

            expected_stop_duration = estimate_expected_stop_duration(
                hour=int(hour),
                is_rush_hour=is_rush_hour_val,
                traffic_intensity=traffic_intensity_val
            )

            input_dict = {
                'lat': effective_lat,
                'lng': effective_lng,
                'stop_duration_seconds': expected_stop_duration,
                'weather_was_raining': int(rain),
                'hour': int(hour),
                'day_of_week': int(day_of_week),
                'is_weekend': int(is_weekend),
                'traffic_intensity': int(traffic_intensity_val),
                'timestamp': datetime.now().isoformat()
            }

            # Add journey coords for distance + direction features
            if boarding_lat is not None:
                input_dict['boarding_lat'] = boarding_lat
                input_dict['boarding_lng'] = boarding_lng
                input_dict['destination_lat'] = destination_lat
                input_dict['destination_lng'] = destination_lng

            # Inject real road distance so feature_engineering skips fallback
            if road_distance_km is not None:
                input_dict['road_distance_km'] = float(road_distance_km)

            input_data = pd.DataFrame([input_dict])
            feature_data = create_features(input_data)

            X = pd.DataFrame(index=[0])
            for f in self.features:
                X[f] = feature_data[f] if f in feature_data.columns else 0.0

            ml_delay = self.model.predict(X)[0]
            ml_delay = max(ml_delay, 0)

            # Hybrid Calculation
            google_duration = 0
            if traffic_api_data and isinstance(traffic_api_data, dict):
                google_duration = traffic_api_data.get('duration_seconds', 0)

            # Guard against external duration outliers that can distort predictions.
            if google_duration and boarding_lat is not None and destination_lat is not None:
                try:
                    route_km = calculate_route_sequence_distance_km(
                        float(boarding_lat), float(boarding_lng),
                        float(destination_lat), float(destination_lng)
                    )
                    # Conservative expected bounds for city buses on Route 177.
                    min_seconds = (route_km / 45.0) * 3600.0 if route_km > 0 else 0.0
                    max_seconds = (route_km / 8.0) * 3600.0 if route_km > 0 else 7200.0
                    max_seconds = max(max_seconds, 1800.0)

                    if google_duration < min_seconds * 0.5 or google_duration > max_seconds * 1.5:
                        print(f"--- Ignoring suspicious Google duration: {google_duration/60:.1f} mins for {route_km:.2f} km route")
                        google_duration = 0
                except Exception:
                    # Keep existing fallback behavior if route bounds cannot be computed.
                    pass

            if google_duration == 0:
                print("--- Traffic API data missing, using Haversine speed fallback")
                if boarding_lat and destination_lat:
                    from math import radians, sin, cos, sqrt, atan2
                    R = 6371.0
                    lat1, lon1 = radians(float(boarding_lat)), radians(float(boarding_lng))
                    lat2, lon2 = radians(float(destination_lat)), radians(float(destination_lng))
                    dlat, dlon = lat2 - lat1, lon2 - lon1
                    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
                    dist_km = R * 2 * atan2(sqrt(a), sqrt(1 - a))
                    google_duration = (dist_km / 22) * 3600
                    print(f"--- Fallback: Haversine={dist_km:.2f}km, Estimated={google_duration/60:.1f} mins")
                else:
                    print("--- Fallback failed: coordinates missing")

            if google_duration > 0:
                if ml_delay < 900:
                    prediction = google_duration + ml_delay
                    print(f"--- Hybrid (Base+Delay): {google_duration/60:.1f} + {ml_delay/60:.1f} = {prediction/60:.1f} mins")
                else:
                    prediction = (ml_delay * 0.6) + (google_duration * 0.4)
                    print(f"--- Hybrid (Blend): ML={ml_delay/60:.1f}, Google={google_duration/60:.1f}, Result={prediction/60:.1f} mins")
            else:
                prediction = ml_delay
                print(f"--- No base duration, using ML only: {prediction/60:.1f} mins")

            return float(prediction)

        except Exception as e:
            print(f"!!! Prediction error: {e}")
            raise
    
    def predict_with_explanation(self, lat, lng, rain, hour):
        """
        Predict with explanation
        
        Returns:
            Dictionary with prediction and explanation
        """
        prediction = self.predict_time(lat, lng, rain, hour)

        is_rush_hour_val = 1 if (7 <= int(hour) <= 9 or 16 <= int(hour) <= 19) else 0
        expected_stop_duration = estimate_expected_stop_duration(
            hour=int(hour),
            is_rush_hour=is_rush_hour_val,
            traffic_intensity=1
        )
        
        # Generate explanation
        explanation = {
            'predicted_time_seconds': prediction,
            'predicted_time_minutes': round(prediction / 60, 2),
            'location': f"({lat:.4f}, {lng:.4f})",
            'weather': 'Rainy' if rain else 'Clear',
            'hour': hour,
            'stop_duration_minutes': round(expected_stop_duration / 60, 2)
        }
        
        return explanation


def predict_time(lat, lng, rain, hour):
    """
    Simplified prediction function for snippet compatibility
    """
    predictor = JourneyTimePredictor()
    return predictor.predict_time(lat, lng, rain, hour)


def predict_single(lat, lng, rain, hour):
    """
    Simple prediction function
    """
    predictor = JourneyTimePredictor()
    return predictor.predict_time(lat, lng, rain, hour)
if __name__ == "__main__":
    # Test prediction
    predictor = JourneyTimePredictor()
    
    # Example prediction
    result = predictor.predict_with_explanation(
        lat=-33.8688,
        lng=151.2093,
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
