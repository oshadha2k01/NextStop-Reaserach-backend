from pymongo import MongoClient
import pandas as pd
import os
from datetime import datetime
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import MONGODB_URI, MONGODB_DB_NAME, DATASETS_PATH
from config import MONGODB_SENSOR_COLLECTION, MONGODB_STOPS_COLLECTION


def _to_datetime_series(series):
    """Convert mixed timestamp formats to pandas datetime."""
    # numeric epoch (seconds/ms) or datetime strings
    if pd.api.types.is_numeric_dtype(series):
        # heuristics: values > 1e12 are likely milliseconds
        is_ms = series.dropna().astype('float64').gt(1e12).any()
        unit = 'ms' if is_ms else 's'
        return pd.to_datetime(series, unit=unit, errors='coerce')
    return pd.to_datetime(series, errors='coerce')


def extract_sensor_data():
    """Extract sensor data from MongoDB"""
    try:
        print(f"--- Connecting to MongoDB...")
        client = MongoClient(MONGODB_URI)
        db = client[MONGODB_DB_NAME]
        sensor_collection = db[MONGODB_SENSOR_COLLECTION]
        
        print(f"--- Fetching sensor data...")
        sensor_data = list(sensor_collection.find({}, {"_id": 0}))
        print(f"--- Fetched {len(sensor_data)} records")
        
        if not sensor_data:
            print("--- No sensor data found in MongoDB")
            return None
        
        print(f"--- Converting to DataFrame...")
        sensor_df = pd.DataFrame(sensor_data)
        print(f"--- DataFrame created")

        # Flatten nested IoT structure into tabular ML fields
        if 'gps' in sensor_df.columns:
            sensor_df['lat'] = sensor_df['gps'].apply(lambda value: (value or {}).get('lat'))
            sensor_df['lng'] = sensor_df['gps'].apply(lambda value: (value or {}).get('lng'))
            sensor_df['speed_kmh'] = sensor_df['gps'].apply(lambda value: (value or {}).get('speed_kmh'))

        if 'weather' in sensor_df.columns:
            sensor_df['weather_was_raining'] = sensor_df['weather'].apply(
                lambda value: bool((value or {}).get('is_raining', False))
            )
            sensor_df['weather_temperature'] = sensor_df['weather'].apply(
                lambda value: (value or {}).get('temperature')
            )

        if 'imu' in sensor_df.columns:
            sensor_df['imu_status'] = sensor_df['imu'].apply(lambda value: (value or {}).get('status'))

        # Normalize timestamp column to datetime
        if 'received_at' in sensor_df.columns:
            sensor_df['timestamp'] = _to_datetime_series(sensor_df['received_at'])
        elif 'timestamp' in sensor_df.columns:
            sensor_df['timestamp'] = _to_datetime_series(sensor_df['timestamp'])

        # Keep only useful columns for downstream preprocessing
        preferred_columns = [
            'timestamp', 'device_id', 'lat', 'lng', 'speed_kmh',
            'weather_was_raining', 'weather_temperature', 'imu_status'
        ]
        available_columns = [column for column in preferred_columns if column in sensor_df.columns]
        sensor_df = sensor_df[available_columns]

        # Drop rows without core identifiers/coordinates
        required = [column for column in ['device_id', 'lat', 'lng'] if column in sensor_df.columns]
        if required:
            sensor_df = sensor_df.dropna(subset=required)

        print(f"--- Extracted {len(sensor_df)} sensor records")
        return sensor_df
        
    except Exception as e:
        print(f"!!! Error extracting sensor data: {e}")
        return None
    finally:
        client.close()


def extract_stop_data():
    """Extract bus stop data from MongoDB"""
    try:
        print(f"--- Connecting to MongoDB...")
        client = MongoClient(MONGODB_URI)
        db = client[MONGODB_DB_NAME]
        stop_collection = db[MONGODB_STOPS_COLLECTION]
        
        print(f"--- Fetching stop data...")
        stop_data = list(stop_collection.find({}, {"_id": 0}))
        print(f"--- Fetched {len(stop_data)} records")
        
        if not stop_data:
            print("--- No stop data found in MongoDB")
            return None
        
        print(f"--- Converting to DataFrame...")
        stop_df = pd.DataFrame(stop_data)
        print(f"--- DataFrame created")

        # Normalize timestamp for consistency
        if 'timestamp' in stop_df.columns:
            stop_df['timestamp'] = _to_datetime_series(stop_df['timestamp'])

        # Coerce raining flag to int for feature engineering compatibility
        if 'weather_was_raining' in stop_df.columns:
            stop_df['weather_was_raining'] = stop_df['weather_was_raining'].astype(int)

        # Keep expected ML columns if present
        preferred_columns = [
            'timestamp', 'device_id', 'lat', 'lng', 'stop_duration_seconds',
            'weather_was_raining', 'imu_status'
        ]
        available_columns = [column for column in preferred_columns if column in stop_df.columns]
        if available_columns:
            stop_df = stop_df[available_columns]

        required = [column for column in ['device_id', 'lat', 'lng', 'stop_duration_seconds'] if column in stop_df.columns]
        if required:
            stop_df = stop_df.dropna(subset=required)

        print(f"--- Extracted {len(stop_df)} bus stop records")
        return stop_df
        
    except Exception as e:
        print(f"!!! Error extracting stop data: {e}")
        return None
    finally:
        client.close()


def generate_datasets():
    """Generate CSV datasets from MongoDB"""
    print("\n--- Starting MongoDB to CSV Pipeline...")
    print(f"--- MongoDB URI: {MONGODB_URI}")
    print(f"--- Database: {MONGODB_DB_NAME}")
    print(f"--- Sensor Collection: {MONGODB_SENSOR_COLLECTION}")
    print(f"--- Stops Collection: {MONGODB_STOPS_COLLECTION}")
    print(f"--- Output Path: {DATASETS_PATH}\n")
    
    # Create datasets directory if it doesn't exist
    os.makedirs(DATASETS_PATH, exist_ok=True)
    
    # Extract data
    sensor_df = extract_sensor_data()
    stop_df = extract_stop_data()
    
    if sensor_df is None or stop_df is None:
        print("\n!!! Failed to extract data from MongoDB")
        return False
    
    # Save raw datasets
    sensor_path = os.path.join(DATASETS_PATH, "sensor_data.csv")
    stop_path = os.path.join(DATASETS_PATH, "bus_stop_data.csv")
    
    sensor_df.to_csv(sensor_path, index=False)
    stop_df.to_csv(stop_path, index=False)
    
    print(f"--- Saved sensor data to {sensor_path}")
    print(f"--- Saved stop data to {stop_path}")
    
    print("\n--- MongoDB to CSV pipeline completed successfully!")
    print(f"--- Datasets ready for preprocessing")
    
    return True


if __name__ == "__main__":
    generate_datasets()
