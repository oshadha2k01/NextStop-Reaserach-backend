"""
ML Model Training Module
Trains XGBoost model for journey time prediction
"""

import pandas as pd
import numpy as np
import joblib
import os
import sys
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATASETS_PATH, MODELS_PATH, MODEL_CONFIG
from utils.feature_engineering import get_feature_list, validate_features


def load_processed_data():
    """Load preprocessed dataset"""
    # Load data
    processed_path = os.path.join(DATASETS_PATH, "processed_dataset.csv")
    
    if not os.path.exists(processed_path):
        print(f"--- Processed dataset not found at {processed_path}")
        return None
    
    df = pd.read_csv(processed_path)
    print(f"--- Loaded processed dataset: {len(df)} records")
    print(f"  Shape: {df.shape}")
    
    return df


def prepare_training_data(df):
    """Prepare features and target for training"""
    try:
        # Validate features exist
        if not validate_features(df):
            print("\n--- Data Preprocessing Completed Successfully!")
            return None, None, None, None
        
        feature_list = get_feature_list()
        
        # Filter to only available features
        available_features = [f for f in feature_list if f in df.columns]
        
        # Target variable
        if 'stop_duration_seconds' in df.columns:
            target = 'stop_duration_seconds'
        elif 'journey_time_seconds' in df.columns:
            target = 'journey_time_seconds'
        else:
            print("--- No target variable found")
            return None, None, None, None
        
        # Remove rows with missing target
        df_clean = df.dropna(subset=[target])
        
        X = df_clean[available_features].fillna(0)
        y = df_clean[target]
        
        print(f"\n--- Training features: {len(available_features)}")
        print(f"  {available_features}")
        print(f"\n--- Target variable: {target}")
        print(f"  Mean: {y.mean():.2f}, Std: {y.std():.2f}")
        
        return X, y, available_features, target
        
    except Exception as e:
        print(f"--- Error preparing training data: {e}")
        return None, None, None, None


def train_model(X, y):
    """Train XGBoost model"""
    print("\n--- Starting Data Preprocessing Pipeline...")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"--- Training set: {len(X_train)} samples")
    print(f"--- Test set: {len(X_test)} samples")
    
    # Train model using standard project config
    model = XGBRegressor(
        **MODEL_CONFIG
    )
    
    try:
        model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
    except Exception as e:
        print(f"!!! XGBoost Training Error: {e}")
        return None, None, None
    
    # Predictions
    y_train_pred = model.predict(X_train)
    y_test_pred = model.predict(X_test)
    
    # Evaluate
    train_mae = mean_absolute_error(y_train, y_train_pred)
    test_mae = mean_absolute_error(y_test, y_test_pred)
    
    train_rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))
    test_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))
    
    train_r2 = r2_score(y_train, y_train_pred)
    test_r2 = r2_score(y_test, y_test_pred)
    
    print("\n--- Model Performance:")
    print(f"\n  Training Set:")
    print(f"    MAE:  {train_mae:.4f}")
    print(f"    RMSE: {train_rmse:.4f}")
    print(f"    R^2:   {train_r2:.4f}")
    
    print(f"\n  Test Set:")
    print(f"    MAE:  {test_mae:.4f}")
    print(f"    RMSE: {test_rmse:.4f}")
    print(f"    R^2:   {test_r2:.4f}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\n--- Top 5 Important Features:")
    for idx, row in feature_importance.head(5).iterrows():
        print(f"    {row['feature']}: {row['importance']:.4f}")
    
    metrics = {
        'train_mae': float(train_mae),
        'test_mae': float(test_mae),
        'train_rmse': float(train_rmse),
        'test_rmse': float(test_rmse),
        'train_r2': float(train_r2),
        'test_r2': float(test_r2)
    }
    
    return model, metrics, feature_importance


def save_model(model, metrics, feature_importance, features_used):
    """Save trained model and metadata"""
    os.makedirs(MODELS_PATH, exist_ok=True)
    
    # Save model
    model_path = os.path.join(MODELS_PATH, "journey_time_model.pkl")
    joblib.dump(model, model_path)
    print(f"--- Model saved to {model_path}")
    
    # Save metadata
    metadata_path = os.path.join(MODELS_PATH, "model_metadata.json")
    with open(metadata_path, "w") as f:
        json.dump({
            "trained_at": datetime.now().isoformat(),
            "features": features_used,
            "metrics": metrics
        }, f, indent=4)
    print(f"--- Metadata saved to {metadata_path}")
    
    # Save feature importance
    importance_path = os.path.join(MODELS_PATH, "feature_importance.csv")
    feature_importance.to_csv(importance_path, index=False)
    print(f"--- Feature importance saved to {importance_path}")


def training_pipeline():
    """Run complete training pipeline"""
    print("\n" + "="*60)
    print("  --- NEXTSTOP JOURNEY TIME MODEL TRAINING")
    print("="*60)
    
    
    # Load data
    df = load_processed_data()
    if df is None:
        return False
    
    
    # Prepare data
    X, y, features_used, target = prepare_training_data(df)
    if X is None:
        return False
    
    
    # Train model
    model, metrics, feature_importance = train_model(X, y)
    
    # Save model
    save_model(model, metrics, feature_importance, features_used)
    
    print("\n" + "="*60)
    print("  --- MODEL TRAINING COMPLETED SUCCESSFULLY!")
    print("="*60)
    
    return True


if __name__ == "__main__":
    training_pipeline()
