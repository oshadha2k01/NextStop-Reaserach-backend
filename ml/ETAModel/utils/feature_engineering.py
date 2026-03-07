import numpy as np
import pandas as pd
from datetime import datetime

def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points on the earth."""
    # Convert decimal degrees to radians 
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arcsin(np.sqrt(a)) 
    r = 6371 # Radius of earth in kilometers
    return c * r

def create_features(df_input):
    """
    Creates all necessary machine learning features from the raw data.
    Works for both training (pandas DataFrame) and single predictions.
    """
    # Create a copy to avoid modifying the original data
    df = df_input.copy()
    
    # 1. Distance Feature
    df['distance_km'] = calculate_haversine_distance(
        df['bus_lat'], df['bus_lng'], 
        df['user_lat'], df['user_lng']
    )
    
    # 2. Time Features
    if 'timestamp' in df.columns:
        # For training data with timestamps
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
    elif 'hour' not in df.columns:
        # For live predictions (if timestamp isn't provided, use current time)
        now = datetime.now()
        df['hour'] = now.hour
        df['day_of_week'] = now.weekday()
        
    # 3. Categorical Time Features
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    
    # Rush hour: 7-9 AM and 4-7 PM (16-19) on weekdays
    is_rush = ((df['hour'].between(7, 9)) | (df['hour'].between(16, 19))) & (df['is_weekend'] == 0)
    df['is_rush_hour'] = is_rush.astype(int)
    
    # 4. Simulated Traffic Intensity (0.0 to 1.0)
    # Higher during rush hours, lower at night, medium during the day
    conditions = [
        (df['is_rush_hour'] == 1),
        (df['hour'].between(22, 24) | df['hour'].between(0, 5)), # Night
        (df['is_weekend'] == 1) # Weekend daytime
    ]
    choices = [0.9, 0.1, 0.4]
    df['traffic_intensity'] = np.select(conditions, choices, default=0.6)
    
    # 5. Ensure data types are correct for XGBoost (float or int)
    df['weather_was_raining'] = df['weather_was_raining'].astype(int)
    df['bus_speed_kmh'] = df['bus_speed_kmh'].astype(float)
    
    return df

def get_feature_list():
    """Returns the exact list and order of features the ML model expects"""
    return [
        'bus_lat', 'bus_lng', 'user_lat', 'user_lng', 
        'distance_km', 'bus_speed_kmh', 'weather_was_raining', 
        'hour', 'day_of_week', 'is_weekend', 'is_rush_hour', 'traffic_intensity'
    ]