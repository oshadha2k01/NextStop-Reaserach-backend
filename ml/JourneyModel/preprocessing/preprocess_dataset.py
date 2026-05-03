"""
Data Preprocessing Module
Cleans and prepares data for model training
"""

import pandas as pd
import numpy as np
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DATASETS_PATH
from utils.feature_engineering import create_features, get_feature_list


def load_raw_data():
    """Load raw datasets from CSV files"""
    try:
        sensor_path = os.path.join(DATASETS_PATH, "sensor_data.csv")
        stop_path = os.path.join(DATASETS_PATH, "bus_stop_data.csv")
        
        if not os.path.exists(sensor_path) or not os.path.exists(stop_path):
            print("--- Raw datasets not found. Run mongodb_to_csv.py first")
            return None, None
        
        sensor_df = pd.read_csv(sensor_path)
        stop_df = pd.read_csv(stop_path)
        
        print(f"--- Loaded sensor data: {len(sensor_df)} records")
        print(f"--- Loaded stop data: {len(stop_df)} records")
        
        return sensor_df, stop_df
        
    except Exception as e:
        print(f"--- Error loading raw data: {e}")
        return None, None


def merge_datasets(sensor_df, stop_df):
    """Merge sensor and stop datasets"""
    try:
        # Primary training rows should come from stop records because they contain target: stop_duration_seconds
        required_stop_fields = {'device_id', 'lat', 'lng', 'stop_duration_seconds'}
        if required_stop_fields.issubset(set(stop_df.columns)):
            base_df = stop_df.copy()

            # Enrich stop rows with sensor-level context by device (not cartesian merge)
            if 'device_id' in sensor_df.columns:
                enrichment_columns = [col for col in [
                    'device_id', 'speed_kmh', 'weather_temperature', 'weather_was_raining', 'imu_status'
                ] if col in sensor_df.columns]

                if len(enrichment_columns) > 1:
                    sensor_subset = sensor_df[enrichment_columns].copy()
                    aggregate_map = {}
                    for column in enrichment_columns:
                        if column == 'device_id':
                            continue
                        if pd.api.types.is_numeric_dtype(sensor_subset[column]):
                            aggregate_map[column] = 'median'
                        else:
                            aggregate_map[column] = lambda values: values.mode().iloc[0] if not values.mode().empty else values.dropna().iloc[0] if not values.dropna().empty else None

                    sensor_agg = sensor_subset.groupby('device_id', as_index=False).agg(aggregate_map)
                    merged_df = pd.merge(base_df, sensor_agg, on='device_id', how='left')
                else:
                    merged_df = base_df
            else:
                merged_df = base_df
        else:
            # Fallback for legacy schemas
            if 'device_id' in sensor_df.columns and 'device_id' in stop_df.columns:
                merge_columns = ['device_id']
                print(f"--- Merging on columns: {merge_columns}")
                merged_df = pd.merge(stop_df, sensor_df, on=merge_columns, how="left")
            else:
                print("--- 'device_id' not found in both datasets, using outer concat")
                merged_df = pd.concat([stop_df.reset_index(drop=True), sensor_df.reset_index(drop=True)], axis=1)
        
        print(f"--- Merged dataset: {len(merged_df)} records")
        return merged_df
        
    except Exception as e:
        print(f"--- Error merging datasets: {e}")
        return None


def clean_data(df):
    """Clean and normalize data"""
    print("\n--- Cleaning data...")
    
    # Remove duplicates
    initial_count = len(df)
    df = df.drop_duplicates()
    print(f"--- Removed duplicates: {initial_count - len(df)} rows")
    
    # Keep only rows with core fields required for training
    core_fields = [field for field in ['device_id', 'lat', 'lng', 'stop_duration_seconds'] if field in df.columns]
    if core_fields:
        before_core = len(df)
        df = df.dropna(subset=core_fields)
        print(f"--- Removed rows missing core fields: {before_core - len(df)} rows")

    # Remove obviously invalid coordinates (e.g., 0,0) and out-of-route noise.
    # Route 177 is in Colombo region; keep a conservative geo-bounding box.
    if 'lat' in df.columns and 'lng' in df.columns:
        before_geo = len(df)
        lat_series = pd.to_numeric(df['lat'], errors='coerce')
        lng_series = pd.to_numeric(df['lng'], errors='coerce')
        valid_geo_mask = (
            lat_series.between(5.5, 8.0)
            & lng_series.between(79.5, 81.0)
            & ~((lat_series.abs() < 1e-6) & (lng_series.abs() < 1e-6))
        )
        df = df[valid_geo_mask].copy()
        print(f"--- Removed invalid/out-of-route coordinates: {before_geo - len(df)} rows")

    # Fill optional fields with safe defaults (avoid wiping out data)
    if 'weather_was_raining' in df.columns:
        df['weather_was_raining'] = pd.to_numeric(df['weather_was_raining'], errors='coerce').fillna(0).astype(int)
    if 'weather_temperature' in df.columns:
        weather_temp = pd.to_numeric(df['weather_temperature'], errors='coerce')
        weather_temp_median = weather_temp.median() if weather_temp.notna().any() else 28.0
        df['weather_temperature'] = weather_temp.fillna(weather_temp_median)
    if 'speed_kmh' in df.columns:
        speed_series = pd.to_numeric(df['speed_kmh'], errors='coerce')
        speed_median = speed_series.median() if speed_series.notna().any() else 20.0
        df['speed_kmh'] = speed_series.fillna(speed_median)

    missing_count = df.isnull().sum().sum()
    if missing_count > 0:
        print(f"--- Remaining optional missing values: {missing_count}")
    
    # Remove outliers on target only (more stable for real operational data)
    if 'stop_duration_seconds' in df.columns and len(df) > 0:
        target_mean = df['stop_duration_seconds'].mean()
        target_std = df['stop_duration_seconds'].std()
        if pd.notna(target_std) and target_std > 0:
            df = df[np.abs(df['stop_duration_seconds'] - target_mean) <= 3 * target_std]
    
    print(f"--- Outliers removed")
    print(f"--- Final dataset: {len(df)} records")
    
    return df


def preprocess_pipeline():
    """Run complete preprocessing pipeline"""
    print("\n--- Starting Data Preprocessing Pipeline...")
    print(f"--- Datasets Path: {DATASETS_PATH}\n")
    
    # Load data
    sensor_df, stop_df = load_raw_data()
    if sensor_df is None or stop_df is None:
        return False
    
    # Merge datasets
    print("\n--- Merging datasets...")
    df_merged = merge_datasets(sensor_df, stop_df)
    if df_merged is None:
        return False
    
    # Clean data
    cleaned_df = clean_data(df_merged)
    
    # Create features
    print("\n--- Creating features...")
    processed_df = create_features(cleaned_df)

    # Create journey_time_seconds target: use stop_duration_seconds as proxy
    # (actual journey time not available in MongoDB exports; will improve with journey outcome data)
    if 'journey_time_seconds' not in processed_df.columns:
        if 'stop_duration_seconds' in processed_df.columns:
            processed_df['journey_time_seconds'] = processed_df['stop_duration_seconds']
            print("--- Using stop_duration_seconds as journey_time_seconds proxy (actual journey times not in data)")
        else:
            processed_df['journey_time_seconds'] = 0.0

    # Keep only essential model columns plus available target/time columns
    keep_columns = get_feature_list()
    for optional_col in ['timestamp', 'journey_time_seconds', 'stop_duration_seconds']:
        if optional_col in processed_df.columns:
            keep_columns.append(optional_col)
    keep_columns = [col for col in keep_columns if col in processed_df.columns]
    processed_df = processed_df[keep_columns].copy()

    # Remove duplicate columns from merge (_x, _y artifacts)
    duplicate_merge_columns = [col for col in processed_df.columns if col.endswith('_x') or col.endswith('_y')]
    if duplicate_merge_columns:
        processed_df = processed_df.drop(columns=duplicate_merge_columns)
        print(f"--- Removed duplicate merge columns: {duplicate_merge_columns}")
    
    # Validate processed data
    print("\n--- Validating processed data...")
    print(f"   Shape: {processed_df.shape}")
    print(f"   Data types:\n{processed_df.dtypes}")
    print(f"   Missing values: {processed_df.isnull().sum().sum()}")
    
    # Save processed dataset
    processed_path = os.path.join(DATASETS_PATH, "processed_dataset.csv")
    processed_df.to_csv(processed_path, index=False)
    print(f"\n--- Saved processed dataset to {processed_path}")
    
    print("\n--- Data Preprocessing Completed Successfully!")
    
    return True


if __name__ == "__main__":
    preprocess_pipeline()
