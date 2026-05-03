"""
Training Script for ETAModel
Trains the ETA prediction model using collected data
"""

import os
import sys
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import xgboost as xgb
import joblib
from datetime import datetime

# add parent 'ml' directory to path so ETAModel package imports resolve
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ETAModel.config import MODELS_PATH, MODEL_CONFIG, TRAIN_TEST_SPLIT, RANDOM_STATE
from utils.feature_engineering import create_features, get_feature_list
from data_collector import ETADataCollector


def load_training_data(filepath=None):
    """Load training data from file or collect new data"""
    if filepath and os.path.exists(filepath):
        print(f"--- Loading training data from {filepath}")
        data = pd.read_csv(filepath)
    else:
        print("--- Collecting new training data...")
        collector = ETADataCollector()
        data = collector.create_training_data()

        if data.empty:
            print("!!! No training data available")
            return None

    print(f"--- Loaded {len(data)} training samples")
    return data


def preprocess_data(data):
    """Preprocess training data"""
    print("--- Preprocessing data...")

    # Remove invalid samples
    data = data.dropna(subset=['bus_lat', 'bus_lng', 'user_lat', 'user_lng', 'actual_eta_seconds'])

    # Filter reasonable ETA values (1 minute to 3 hours)
    data = data[
        (data['actual_eta_seconds'] >= 60) &
        (data['actual_eta_seconds'] <= 10800)
    ]

    # Create features
    feature_data = create_features(data)

    # Get target variable
    y = feature_data['actual_eta_seconds']

    # Get feature columns
    features = get_feature_list()
    X = feature_data[features]

    print(f"--- Preprocessed: {len(X)} samples, {len(features)} features")
    print(f"  Target range: {y.min()/60:.1f} - {y.max()/60:.1f} minutes")

    return X, y


def train_model(X_train, y_train, X_test, y_test):
    """Train XGBoost model"""
    print("--- Training ETA model...")

    # Create model
    model = xgb.XGBRegressor(**MODEL_CONFIG)

    # Train model
    model.fit(
        X_train, y_train,
        eval_set=[(X_train, y_train), (X_test, y_test)],
        verbose=False
    )

    # Evaluate model
    train_pred = model.predict(X_train)
    test_pred = model.predict(X_test)

    train_mae = mean_absolute_error(y_train, train_pred)
    test_mae = mean_absolute_error(y_test, test_pred)
    train_rmse = np.sqrt(mean_squared_error(y_train, train_pred))
    test_rmse = np.sqrt(mean_squared_error(y_test, test_pred))

    print("--- Model Performance:")
    print(f"  Train MAE: {train_mae/60:.2f} minutes")
    print(f"  Test MAE: {test_mae/60:.2f} minutes")
    print(f"  Train RMSE: {train_rmse/60:.2f} minutes")
    print(f"  Test RMSE: {test_rmse/60:.2f} minutes")

    return model


def save_model(model, feature_names):
    """Save trained model and feature information"""
    os.makedirs(MODELS_PATH, exist_ok=True)

    # Save model
    model_path = os.path.join(MODELS_PATH, "eta_model.pkl")
    joblib.dump(model, model_path)

    # Save feature names
    feature_path = os.path.join(MODELS_PATH, "eta_features.pkl")
    joblib.dump(feature_names, feature_path)

    # Save metadata
    metadata = {
        'trained_at': datetime.now().isoformat(),
        'model_type': 'XGBoost',
        'features': feature_names,
        'config': MODEL_CONFIG
    }
    metadata_path = os.path.join(MODELS_PATH, "eta_metadata.pkl")
    joblib.dump(metadata, metadata_path)

    print(f"--- Model saved to {model_path}")
    return model_path


def main():
    """Main training function"""
    print("="*60)
    print("  [*] ETA MODEL TRAINING")
    print("="*60)

    # Load training data
    data = load_training_data("datasets/eta_training_data.csv")
    if data is None or data.empty:
        print("!!! No training data available. Exiting.")
        return

    # Preprocess data
    X, y = preprocess_data(data)

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TRAIN_TEST_SPLIT, random_state=RANDOM_STATE
    )

    print(f"--- Train/Test split: {len(X_train)}/{len(X_test)} samples")

    # Train model
    model = train_model(X_train, y_train, X_test, y_test)

    # Save model
    model_path = save_model(model, X.columns.tolist())

    print("\n" + "="*60)
    print("  [OK] ETA MODEL TRAINING COMPLETED")
    print("="*60)
    print(f"Model saved: {model_path}")
    print(f"Features: {len(X.columns)}")
    print(f"Training samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")


if __name__ == "__main__":
    main()