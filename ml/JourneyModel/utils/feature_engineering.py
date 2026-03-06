"""
Feature Engineering Module
Creates features for ML model training
"""

import pandas as pd
import numpy as np
from datetime import datetime


def create_features(data):
    """
    Create engineered features from raw data
    
    Features:
    - hour: Hour of day (0-23)
    - is_rush_hour: 1 if during peak hours (7-9 AM, 4-7 PM), 0 otherwise
    - day_of_week: Day of week (0=Monday, 6=Sunday)
    - is_weekend: 1 if weekend, 0 otherwise
    """
    df = data.copy()

    if df.empty:
        # Ensure required columns exist even for empty frames
        for column in [
            'hour', 'day_of_week', 'is_weekend', 'is_rush_hour',
            'weather_was_raining', 'is_hot', 'is_cold',
            'distance_from_center', 'stop_duration_minutes', 'traffic_intensity'
        ]:
            if column not in df.columns:
                df[column] = pd.Series(dtype='float64')
        return df

    # Normalize merged coordinate column names to expected model schema
    if 'lat' not in df.columns:
        if 'lat_x' in df.columns:
            df['lat'] = df['lat_x']
        elif 'lat_y' in df.columns:
            df['lat'] = df['lat_y']

    if 'lng' not in df.columns:
        if 'lng_x' in df.columns:
            df['lng'] = df['lng_x']
        elif 'lng_y' in df.columns:
            df['lng'] = df['lng_y']
    
    # Parse timestamp if exists
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Extract time-based features
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['is_weekend'] = df['day_of_week'].apply(lambda x: 1 if x >= 5 else 0)
    else:
        # Default values if timestamp doesn't exist
        df['hour'] = 12
        df['day_of_week'] = 2
        df['is_weekend'] = 0
    
    # Rush hour detection (7-9 AM: 7,8,9 and 4-7 PM: 16,17,18,19)
    df['is_rush_hour'] = df['hour'].apply(
        lambda x: 1 if (7 <= x <= 9 or 16 <= x <= 19) else 0
    )
    
    # Weather features
    if 'weather_was_raining' in df.columns:
        df['weather_was_raining'] = pd.to_numeric(df['weather_was_raining'], errors='coerce').fillna(0).astype(int)
    else:
        df['weather_was_raining'] = 0
    
    if 'weather_temperature' in df.columns:
        df['is_hot'] = (df['weather_temperature'] > 30).astype(int)
        df['is_cold'] = (df['weather_temperature'] < 10).astype(int)
    else:
        df['is_hot'] = 0
        df['is_cold'] = 0
    
    # Location-based features
    if 'lat' in df.columns and 'lng' in df.columns:
        from config import DEFAULT_CENTER_LAT, DEFAULT_CENTER_LNG
        
        # Calculate distance from city center (Colombo)
        df['distance_from_center'] = np.sqrt(
            (df['lat'] - DEFAULT_CENTER_LAT)**2 + (df['lng'] - DEFAULT_CENTER_LNG)**2
        )
        
        # Calculate Journey Distance if both boarding and destination coords are present
        if 'boarding_lat' in df.columns and 'destination_lat' in df.columns:
            df['journey_distance_km'] = np.sqrt(
                (df['boarding_lat'] - df['destination_lat'])**2 + 
                (df['boarding_lng'] - df['destination_lng'])**2
            ) * 111.32 # Rough conversion to KM
        else:
            df['journey_distance_km'] = 0.0
    
    # Stop duration features
    if 'stop_duration_seconds' in df.columns:
        df['stop_duration_minutes'] = df['stop_duration_seconds'] / 60
    
    # Traffic intensity (inferred from stop duration or speed)
    # Robust version for single-row prediction
    if 'stop_duration_seconds' in df.columns:
        # Instead of pd.cut which fails on single rows, use simple thresholds
        def get_intensity(sec):
            if sec < 120: return 0 # low
            if sec < 300: return 1 # medium
            return 2 # high
            
        df['traffic_intensity'] = df['stop_duration_seconds'].apply(get_intensity)
    elif 'traffic_intensity' not in df.columns:
        df['traffic_intensity'] = 1 # Default to medium
    
    # Passenger count features (if available)
    if 'passenger_count' in df.columns:
        df['passenger_count'] = df['passenger_count'].fillna(0)
    
    print("--- Features created:")
    print(f"  - Time-based: hour, day_of_week, is_weekend, is_rush_hour")
    print(f"  - Weather: weather_was_raining, is_hot, is_cold")
    print(f"  - Location: lat, lng, distance_from_center")
    print(f"  - Traffic: stop_duration_minutes, traffic_intensity")
    
    return df


def get_feature_list():
    """Get list of features used in model"""
    features = [
        "hour",
        "day_of_week",
        "is_weekend",
        "is_rush_hour",
        "weather_was_raining",
        "is_hot",
        "is_cold",
        "lat",
        "lng",
        "distance_from_center",
        "traffic_intensity",
        "journey_distance_km"
    ]
    return features


def validate_features(df):
    """Validate that all required features exist"""
    required_features = get_feature_list()
    missing_features = [f for f in required_features if f not in df.columns]
    
    if missing_features:
        print(f"--- Missing features: {missing_features}")
        return False
    
    return True
