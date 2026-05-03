"""
Feature Engineering Module
Creates features for ML model training
"""

import pandas as pd
import json
import os
from math import radians, sin, cos, sqrt, atan2


# ---------------------------------------------------------------------------
# Geographic distance helpers
# ---------------------------------------------------------------------------

def haversine_km(lat1, lng1, lat2, lng2):
    """Haversine great-circle distance in km between two GPS points."""
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


_route_stops_cache = None


def _load_route_stops():
    """Load Route 177 stops with module-level caching. Tries ml/data/ then root/data/."""
    global _route_stops_cache
    if _route_stops_cache is not None:
        return _route_stops_cache

    this_dir = os.path.dirname(os.path.abspath(__file__))
    journey_model_dir = os.path.dirname(this_dir)
    ml_dir = os.path.dirname(journey_model_dir)
    root_dir = os.path.dirname(ml_dir)

    for path in [
        os.path.join(ml_dir, 'data', 'main_bus_stops.json'),
        os.path.join(root_dir, 'data', 'main_bus_stops.json'),
    ]:
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    _route_stops_cache = json.load(f).get('stages', [])
                return _route_stops_cache
            except Exception:
                pass

    _route_stops_cache = []
    return _route_stops_cache


def _nearest_stop_idx(lat, lng, stops):
    """Return 0-based index of the stop nearest to (lat, lng)."""
    best_idx, best_dist = 0, float('inf')
    for i, s in enumerate(stops):
        c = s['coordinates']
        d = haversine_km(lat, lng, c['latitude'], c['longitude'])
        if d < best_dist:
            best_dist, best_idx = d, i
    return best_idx


def calculate_route_sequence_distance_km(b_lat, b_lng, d_lat, d_lng):
    """
    Along-route distance by summing Haversine distances between consecutive
    stops from boarding to destination.
    Direction-independent: A->B == B->A.
    Falls back to straight-line Haversine when stops data is unavailable.
    """
    stops = _load_route_stops()
    if not stops:
        return haversine_km(b_lat, b_lng, d_lat, d_lng)

    b_idx = _nearest_stop_idx(b_lat, b_lng, stops)
    d_idx = _nearest_stop_idx(d_lat, d_lng, stops)

    if b_idx == d_idx:
        return 0.0

    lo, hi = min(b_idx, d_idx), max(b_idx, d_idx)
    total = 0.0
    for i in range(lo, hi):
        c1 = stops[i]['coordinates']
        c2 = stops[i + 1]['coordinates']
        total += haversine_km(c1['latitude'], c1['longitude'],
                              c2['latitude'], c2['longitude'])
    return round(total, 3)


def estimate_expected_stop_duration(hour, is_rush_hour, traffic_intensity):
    """
    Estimate dwell time at a stop using context features available at prediction
    time to avoid future-data leakage.
    """
    base_stop_seconds = 30

    if int(is_rush_hour) == 1:
        base_stop_seconds += 45

    intensity_multiplier = {0: 0, 1: 20, 2: 60}
    base_stop_seconds += intensity_multiplier.get(int(traffic_intensity), 20)

    return int(base_stop_seconds)


# ---------------------------------------------------------------------------
# Feature creation
# ---------------------------------------------------------------------------

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
        # Ensure required columns exist even for empty frames (minimal set)
        for column in [
            'hour', 'day_of_week', 'is_weekend', 'is_rush_hour',
            'weather_was_raining', 'speed_kmh', 'stop_duration_minutes',
            'journey_distance_km', 'traffic_intensity', 'avg_route_speed_last_15m'
        ]:
            if column not in df.columns:
                df[column] = pd.Series(dtype='float64')
        return df

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
    
    # Journey Distance: prefer Google road_distance_km when available (real-time)
    if 'road_distance_km' in df.columns:
        df['journey_distance_km'] = pd.to_numeric(df['road_distance_km'], errors='coerce').fillna(0.0)
        print("--- journey_distance_km: using Google road distance")
    else:
        # If Google distance is not provided, default to 0.0 (caller should provide road_distance_km)
        df['journey_distance_km'] = 0.0
    
    # Stop duration feature (from bus_stop_data.csv)
    if 'stop_duration_seconds' in df.columns:
        df['stop_duration_minutes'] = pd.to_numeric(df['stop_duration_seconds'], errors='coerce').fillna(0.0) / 60.0
    else:
        df['stop_duration_minutes'] = 0.0
    
    # Traffic intensity: infer from speed_kmh when available
    if 'speed_kmh' in df.columns:
        speed_series = pd.to_numeric(df['speed_kmh'], errors='coerce').fillna(20.0)

        def get_intensity_from_speed(speed):
            if speed < 15:
                return 2  # heavy
            if speed < 28:
                return 1  # medium
            return 0      # low

        df['traffic_intensity'] = speed_series.apply(get_intensity_from_speed).astype(int)
    else:
        df['traffic_intensity'] = 1
    
    # Lag/default speed feature for prediction-time single rows
    if 'avg_route_speed_last_15m' not in df.columns:
        if 'speed_kmh' in df.columns:
            df['avg_route_speed_last_15m'] = pd.to_numeric(df['speed_kmh'], errors='coerce').fillna(20.0)
        else:
            df['avg_route_speed_last_15m'] = 20.0
    
    # CRITICAL: Ensure ALL required model features are present with defaults (for single-row predictions)
    required_features = get_feature_list()
    for feature in required_features:
        if feature not in df.columns:
            # Set appropriate defaults based on feature name
            # Minimal sensible defaults
            if 'duration' in feature:
                df[feature] = 0.0
            elif 'speed' in feature:
                df[feature] = 20.0
            else:
                df[feature] = 0.0
    
    print("--- Features created: minimal set (time, weather, speed, stop duration, google distance, traffic)")
    
    return df


def get_feature_list():
    """Get list of features used in model"""
    features = [
        "hour",
        "day_of_week",
        "is_weekend",
        "is_rush_hour",
        "weather_was_raining",
        "speed_kmh",
        "stop_duration_minutes",
        "traffic_intensity",
        "journey_distance_km",
        "avg_route_speed_last_15m"
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
