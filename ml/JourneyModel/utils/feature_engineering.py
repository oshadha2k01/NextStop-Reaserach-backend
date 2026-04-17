"""
Feature Engineering Module
Creates features for ML model training
"""

import pandas as pd
import numpy as np
import json
import os
from datetime import datetime
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


def _route_stop_count():
    stops = _load_route_stops()
    return len(stops) if stops else 0


def _nearest_stop_idx_safe(lat, lng):
    stops = _load_route_stops()
    if not stops:
        return 0
    try:
        return int(_nearest_stop_idx(float(lat), float(lng), stops))
    except Exception:
        return 0


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


def get_route_direction(b_lat, b_lng, d_lat, d_lng):
    """
    0 = forward  (boarding closer to Kaduwela  / stop id=1)
    1 = reverse  (boarding closer to Kollupitiya / stop id=20)
    """
    stops = _load_route_stops()
    if not stops:
        return 0
    b_idx = _nearest_stop_idx(b_lat, b_lng, stops)
    d_idx = _nearest_stop_idx(d_lat, d_lng, stops)
    return 0 if b_idx <= d_idx else 1


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
        # Ensure required columns exist even for empty frames
        for column in [
            'hour', 'day_of_week', 'is_weekend', 'is_rush_hour',
            'weather_was_raining', 'is_hot', 'is_cold',
            'distance_from_center', 'stop_duration_minutes', 'traffic_intensity',
            'direction'
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
        try:
            from ..config import DEFAULT_CENTER_LAT, DEFAULT_CENTER_LNG
        except ImportError:
            from config import DEFAULT_CENTER_LAT, DEFAULT_CENTER_LNG
        
        # Haversine distance from Colombo city centre
        df['distance_from_center'] = df.apply(
            lambda row: haversine_km(
                float(row['lat']), float(row['lng']),
                DEFAULT_CENTER_LAT, DEFAULT_CENTER_LNG
            ), axis=1
        )

        # Journey Distance
        # Priority 1: real road_distance_km injected by Node.js Google Maps call
        if 'road_distance_km' in df.columns:
            df['journey_distance_km'] = pd.to_numeric(df['road_distance_km'], errors='coerce').fillna(0.0)
            print("--- journey_distance_km: using Google road distance")
        # Priority 2: route-sequence Haversine (accurate along-route; same for A->B and B->A)
        elif 'boarding_lat' in df.columns and 'destination_lat' in df.columns:
            def _route_dist(row):
                try:
                    return calculate_route_sequence_distance_km(
                        float(row['boarding_lat']), float(row['boarding_lng']),
                        float(row['destination_lat']), float(row['destination_lng'])
                    )
                except Exception:
                    return haversine_km(
                        float(row['boarding_lat']), float(row['boarding_lng']),
                        float(row['destination_lat']), float(row['destination_lng'])
                    )
            df['journey_distance_km'] = df.apply(_route_dist, axis=1)
            print("--- journey_distance_km: using route-sequence Haversine")
        # Priority 3: default
        else:
            df['journey_distance_km'] = 0.0

        # Direction feature (0=forward Kaduwela->Kollupitiya, 1=reverse)
        # Stored here for future model retraining; not yet in get_feature_list()
        if 'boarding_lat' in df.columns and 'destination_lat' in df.columns:
            def _direction(row):
                try:
                    return get_route_direction(
                        float(row['boarding_lat']), float(row['boarding_lng']),
                        float(row['destination_lat']), float(row['destination_lng'])
                    )
                except Exception:
                    return 0
            df['direction'] = df.apply(_direction, axis=1)

            # Route segment features from nearest route stop indices.
            df['boarding_stop_idx'] = df.apply(
                lambda row: _nearest_stop_idx_safe(row['boarding_lat'], row['boarding_lng']),
                axis=1
            )
            df['destination_stop_idx'] = df.apply(
                lambda row: _nearest_stop_idx_safe(row['destination_lat'], row['destination_lng']),
                axis=1
            )
            df['segment_count'] = (df['destination_stop_idx'] - df['boarding_stop_idx']).abs().astype(int)
        else:
            df['direction'] = 0

            # Training-time fallback when only current GPS is available.
            df['current_stop_idx'] = df.apply(
                lambda row: _nearest_stop_idx_safe(row['lat'], row['lng']),
                axis=1
            )
            if 'timestamp' in df.columns and 'device_id' in df.columns:
                df = df.sort_values(['device_id', 'timestamp']).reset_index(drop=True)
                df['previous_stop_idx'] = df.groupby('device_id')['current_stop_idx'].shift(1)
            else:
                df['previous_stop_idx'] = df['current_stop_idx']

            df['previous_stop_idx'] = df['previous_stop_idx'].fillna(df['current_stop_idx']).astype(int)
            df['boarding_stop_idx'] = df['previous_stop_idx']
            df['destination_stop_idx'] = df['current_stop_idx']
            df['segment_count'] = (df['destination_stop_idx'] - df['boarding_stop_idx']).abs().astype(int)

        stop_count = max(_route_stop_count() - 1, 1)
        df['route_progress'] = pd.to_numeric(df['destination_stop_idx'], errors='coerce').fillna(0) / stop_count
    
    # Stop duration features
    if 'stop_duration_seconds' in df.columns:
        df['stop_duration_minutes'] = df['stop_duration_seconds'] / 60

    # Historical stop-duration proxy features (leakage-safe via shift(1)).
    # These features give the model route/stop temporal context and are only
    # computed from past observations.
    expected_proxy_seconds = estimate_expected_stop_duration(
        hour=int(df['hour'].iloc[0]) if len(df) else 12,
        is_rush_hour=int(df['is_rush_hour'].iloc[0]) if len(df) else 0,
        traffic_intensity=int(df['traffic_intensity'].iloc[0]) if 'traffic_intensity' in df.columns and len(df) else 1,
    )

    if 'stop_duration_seconds' in df.columns and 'timestamp' in df.columns:
        target_series = pd.to_numeric(df['stop_duration_seconds'], errors='coerce')
        global_target_median = float(target_series.dropna().median()) if target_series.dropna().size > 0 else float(expected_proxy_seconds)

        grouped = df.groupby(['destination_stop_idx', 'hour'])['stop_duration_seconds']
        df['hist_stop_duration_mean'] = grouped.transform(
            lambda series: pd.to_numeric(series, errors='coerce').shift(1).expanding().mean()
        )
        df['hist_stop_obs_count'] = grouped.cumcount()

        if 'device_id' in df.columns:
            device_target = df.groupby('device_id')['stop_duration_seconds']
            df['device_prev_stop_duration'] = device_target.shift(1)
            df['device_prev3_stop_duration_mean'] = device_target.transform(
                lambda series: pd.to_numeric(series, errors='coerce').shift(1).rolling(3, min_periods=1).mean()
            )
        else:
            df['device_prev_stop_duration'] = np.nan
            df['device_prev3_stop_duration_mean'] = np.nan

        df['hist_stop_duration_mean'] = pd.to_numeric(df['hist_stop_duration_mean'], errors='coerce').fillna(global_target_median)
        df['hist_stop_obs_count'] = pd.to_numeric(df['hist_stop_obs_count'], errors='coerce').fillna(0).astype(int)
        df['device_prev_stop_duration'] = pd.to_numeric(df['device_prev_stop_duration'], errors='coerce').fillna(global_target_median)
        df['device_prev3_stop_duration_mean'] = pd.to_numeric(df['device_prev3_stop_duration_mean'], errors='coerce').fillna(global_target_median)
    else:
        df['hist_stop_duration_mean'] = float(expected_proxy_seconds)
        df['hist_stop_obs_count'] = 0
        df['device_prev_stop_duration'] = float(expected_proxy_seconds)
        df['device_prev3_stop_duration_mean'] = float(expected_proxy_seconds)
    
    # Traffic intensity must not be derived from target-like stop duration values.
    # Priority:
    # 1) keep provided traffic_intensity if present
    # 2) infer from speed_kmh (slower speed => heavier traffic)
    # 3) fallback to medium
    if 'traffic_intensity' in df.columns:
        df['traffic_intensity'] = pd.to_numeric(df['traffic_intensity'], errors='coerce').fillna(1).astype(int)
    elif 'speed_kmh' in df.columns:
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
    
    # Passenger count features (if available)
    if 'passenger_count' in df.columns:
        df['passenger_count'] = df['passenger_count'].fillna(0)

    # Lag feature default for prediction-time single rows
    if 'avg_route_speed_last_15m' not in df.columns:
        if 'speed_kmh' in df.columns:
            df['avg_route_speed_last_15m'] = pd.to_numeric(df['speed_kmh'], errors='coerce').fillna(20.0)
        else:
            df['avg_route_speed_last_15m'] = 20.0
    
    print("--- Features created:")
    print(f"  - Time-based: hour, day_of_week, is_weekend, is_rush_hour")
    print(f"  - Weather: weather_was_raining, is_hot, is_cold")
    print(f"  - Location: lat, lng, distance_from_center")
    print(f"  - Route segments: boarding_stop_idx, destination_stop_idx, segment_count, route_progress")
    print(f"  - Historical proxies: hist_stop_duration_mean, hist_stop_obs_count, device_prev_stop_duration, device_prev3_stop_duration_mean")
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
        "journey_distance_km",
        "avg_route_speed_last_15m",
        "boarding_stop_idx",
        "destination_stop_idx",
        "segment_count",
        "route_progress",
        "hist_stop_duration_mean",
        "hist_stop_obs_count",
        "device_prev_stop_duration",
        "device_prev3_stop_duration_mean"
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
