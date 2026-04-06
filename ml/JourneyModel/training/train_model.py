"""
ML Model Training Module
Trains XGBoost model for journey time prediction
"""

import pandas as pd
import numpy as np
import joblib
import os
import sys
import shutil
from sklearn.model_selection import TimeSeriesSplit, GridSearchCV
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import (
    DATASETS_PATH,
    MODELS_PATH,
    MODEL_CONFIG,
    MODEL_PROMOTION_MIN_IMPROVEMENT_PCT,
    MODEL_ROLLBACK_ENABLED,
    MODEL_REGISTRY_FILE,
    MODEL_EVALUATION_REPORT_FILE,
)
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
        
        if 'timestamp' in df_clean.columns:
            df_clean['timestamp'] = pd.to_datetime(df_clean['timestamp'], errors='coerce')
            df_clean = df_clean.sort_values('timestamp').reset_index(drop=True)

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


def _time_series_holdout_split(X, y, holdout_ratio=0.2):
    split_index = int(len(X) * (1 - holdout_ratio))
    split_index = max(1, min(split_index, len(X) - 1))

    X_train = X.iloc[:split_index].copy()
    y_train = y.iloc[:split_index].copy()
    X_holdout = X.iloc[split_index:].copy()
    y_holdout = y.iloc[split_index:].copy()

    return X_train, X_holdout, y_train, y_holdout


def _evaluate_model(model, X_eval, y_eval):
    predictions = model.predict(X_eval)
    return {
        'mae': float(mean_absolute_error(y_eval, predictions)),
        'rmse': float(np.sqrt(mean_squared_error(y_eval, predictions))),
        'r2': float(r2_score(y_eval, predictions))
    }


def _load_current_model_metrics():
    if not os.path.exists(MODEL_REGISTRY_FILE):
        return None

    try:
        with open(MODEL_REGISTRY_FILE, 'r', encoding='utf-8') as registry_file:
            registry = json.load(registry_file)
        return registry.get('production_metrics')
    except Exception:
        return None


def _load_current_data_profile():
    if not os.path.exists(MODEL_REGISTRY_FILE):
        return None

    try:
        with open(MODEL_REGISTRY_FILE, 'r', encoding='utf-8') as registry_file:
            registry = json.load(registry_file)
        return registry.get('data_profile')
    except Exception:
        return None


def _write_registry(payload):
    os.makedirs(MODELS_PATH, exist_ok=True)
    with open(MODEL_REGISTRY_FILE, 'w', encoding='utf-8') as registry_file:
        json.dump(payload, registry_file, indent=4)


def _write_evaluation_report(report):
    os.makedirs(MODELS_PATH, exist_ok=True)
    with open(MODEL_EVALUATION_REPORT_FILE, 'w', encoding='utf-8') as report_file:
        json.dump(report, report_file, indent=4)


def _build_data_profile(df, features):
    numeric_features = [feature for feature in features if feature in df.columns and pd.api.types.is_numeric_dtype(df[feature])]
    profile = {}

    for feature in numeric_features:
        series = pd.to_numeric(df[feature], errors='coerce').dropna()
        if series.empty:
            continue

        profile[feature] = {
            'mean': float(series.mean()),
            'std': float(series.std()) if len(series) > 1 else 0.0,
            'min': float(series.min()),
            'max': float(series.max())
        }

    return profile


def _compare_profiles(current_profile, previous_profile):
    if not previous_profile:
        return {
            'available': False,
            'drift_score_pct': None,
            'feature_changes': {}
        }

    feature_changes = {}
    drift_values = []

    for feature, current_stats in current_profile.items():
        previous_stats = previous_profile.get(feature)
        if not previous_stats:
            continue

        prev_mean = previous_stats.get('mean', 0.0)
        curr_mean = current_stats.get('mean', 0.0)
        prev_std = previous_stats.get('std') or 1e-6

        relative_mean_shift = abs(curr_mean - prev_mean) / max(abs(prev_mean), 1e-6)
        standardized_shift = abs(curr_mean - prev_mean) / prev_std

        feature_changes[feature] = {
            'relative_mean_shift_pct': float(relative_mean_shift * 100),
            'standardized_shift': float(standardized_shift)
        }
        drift_values.append(relative_mean_shift)

    return {
        'available': True,
        'drift_score_pct': float((sum(drift_values) / len(drift_values)) * 100) if drift_values else 0.0,
        'feature_changes': feature_changes
    }


def train_model(X, y):
    """Train XGBoost model with time-series CV and hyperparameter tuning"""
    print("\n--- Starting Model Training with Time-Series CV and Tuning...")

    X_train, X_holdout, y_train, y_holdout = _time_series_holdout_split(X, y, holdout_ratio=0.2)
    print(f"--- Time-series split: train={len(X_train)}, holdout={len(X_holdout)}")

    tscv = TimeSeriesSplit(n_splits=5)

    param_grid = {
        'max_depth': [4, 6, 8],
        'learning_rate': [0.01, 0.05, 0.1],
        'n_estimators': [100, 300, 500],
        'subsample': [0.8, 1.0]
    }

    base_params = {
        'objective': 'reg:squarederror',
        'random_state': 42
    }

    if isinstance(MODEL_CONFIG, dict):
        for key in ['colsample_bytree', 'min_child_weight', 'gamma', 'reg_alpha', 'reg_lambda']:
            if key in MODEL_CONFIG:
                base_params[key] = MODEL_CONFIG[key]

    base_model = XGBRegressor(**base_params)

    print("--- Searching for optimal hyperparameters (this may take a while)...")
    grid_search = GridSearchCV(
        estimator=base_model,
        param_grid=param_grid,
        cv=tscv,
        scoring='neg_mean_absolute_error',
        n_jobs=-1,
        verbose=1
    )

    try:
        grid_search.fit(X_train, y_train)
    except Exception as e:
        print(f"!!! XGBoost Training Error: {e}")
        return None, None, None

    best_model = grid_search.best_estimator_
    print(f"--- Best Parameters Found: {grid_search.best_params_}")

    train_metrics = _evaluate_model(best_model, X_train, y_train)
    holdout_metrics = _evaluate_model(best_model, X_holdout, y_holdout) if len(X_holdout) > 0 else None

    print("\n--- Final Model Performance:")
    print(f"    Train MAE:  {train_metrics['mae']:.4f}")
    print(f"    Train RMSE: {train_metrics['rmse']:.4f}")
    print(f"    Train R^2:   {train_metrics['r2']:.4f}")
    if holdout_metrics:
        print(f"    Holdout MAE:  {holdout_metrics['mae']:.4f}")
        print(f"    Holdout RMSE: {holdout_metrics['rmse']:.4f}")
        print(f"    Holdout R^2:   {holdout_metrics['r2']:.4f}")

    feature_importance = pd.DataFrame({
        'feature': X_train.columns,
        'importance': best_model.feature_importances_
    }).sort_values('importance', ascending=False)

    print(f"\n--- Top 5 Important Features:")
    for _, row in feature_importance.head(5).iterrows():
        print(f"    {row['feature']}: {row['importance']:.4f}")

    metrics = {
        'best_params': grid_search.best_params_,
        'cv_best_neg_mae': float(grid_search.best_score_),
        'train_mae': train_metrics['mae'],
        'train_rmse': train_metrics['rmse'],
        'train_r2': train_metrics['r2'],
        'holdout_mae': holdout_metrics['mae'] if holdout_metrics else None,
        'holdout_rmse': holdout_metrics['rmse'] if holdout_metrics else None,
        'holdout_r2': holdout_metrics['r2'] if holdout_metrics else None
    }

    return best_model, metrics, feature_importance


def _should_promote(candidate_metrics, current_metrics):
    if not current_metrics:
        return True

    candidate_mae = candidate_metrics.get('holdout_mae')
    current_mae = current_metrics.get('holdout_mae')

    if candidate_mae is None or current_mae is None:
        return True

    improvement_pct = ((current_mae - candidate_mae) / current_mae) * 100 if current_mae > 0 else 0
    return improvement_pct >= MODEL_PROMOTION_MIN_IMPROVEMENT_PCT


def save_model(model, metrics, feature_importance, features_used, data_profile=None, drift_summary=None):
    """Promote candidate only if it beats the current production model."""
    os.makedirs(MODELS_PATH, exist_ok=True)

    model_path = os.path.join(MODELS_PATH, "journey_time_model.pkl")
    backup_path = os.path.join(MODELS_PATH, "journey_time_model_backup.pkl")
    candidate_path = os.path.join(MODELS_PATH, "journey_time_model_candidate.pkl")

    current_metrics = _load_current_model_metrics()
    promote = _should_promote(metrics, current_metrics)

    joblib.dump(model, candidate_path)

    if promote:
        if os.path.exists(model_path) and MODEL_ROLLBACK_ENABLED:
            shutil.copy2(model_path, backup_path)
            print(f"--- Backed up current production model to {backup_path}")

        shutil.copy2(candidate_path, model_path)
        print(f"--- Promoted candidate model to {model_path}")
        promoted_state = 'promoted'
    else:
        print("--- Candidate model not promoted; current production model retained")
        promoted_state = 'retained_current'

    registry_payload = {
        'trained_at': datetime.now().isoformat(),
        'production_state': promoted_state,
        'promotion_threshold_percent': MODEL_PROMOTION_MIN_IMPROVEMENT_PCT,
        'features': features_used,
        'production_metrics': metrics,
        'current_metrics': current_metrics,
        'data_profile': data_profile,
        'drift_summary': drift_summary,
        'model_path': model_path,
        'backup_path': backup_path if os.path.exists(backup_path) else None,
        'candidate_path': candidate_path
    }
    _write_registry(registry_payload)

    metadata_path = os.path.join(MODELS_PATH, "model_metadata.json")
    with open(metadata_path, "w", encoding='utf-8') as f:
        json.dump({
            "trained_at": datetime.now().isoformat(),
            "features": features_used,
            "metrics": metrics,
            "current_metrics": current_metrics,
            "production_state": promoted_state
        }, f, indent=4)
    print(f"--- Metadata saved to {metadata_path}")

    importance_path = os.path.join(MODELS_PATH, "feature_importance.csv")
    feature_importance.to_csv(importance_path, index=False)
    print(f"--- Feature importance saved to {importance_path}")

    report = {
        'trained_at': datetime.now().isoformat(),
        'features_used': features_used,
        'promotion_threshold_percent': MODEL_PROMOTION_MIN_IMPROVEMENT_PCT,
        'production_state': promoted_state,
        'candidate_metrics': metrics,
        'current_metrics': current_metrics,
        'drift_summary': drift_summary,
        'feature_importance_top5': feature_importance.head(5).to_dict(orient='records')
    }
    _write_evaluation_report(report)
    print(f"--- Evaluation report saved to {MODEL_EVALUATION_REPORT_FILE}")

    return promote


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

    current_data_profile = _build_data_profile(X, features_used)
    previous_data_profile = _load_current_data_profile()
    drift_summary = _compare_profiles(current_data_profile, previous_data_profile)
    if drift_summary.get('available'):
        print(f"--- Drift score vs previous profile: {drift_summary.get('drift_score_pct'):.2f}%")
    else:
        print("--- Drift profile baseline created (no previous profile available)")
    
    
    # Train model
    model, metrics, feature_importance = train_model(X, y)
    
    # Save / promote model
    save_model(
        model,
        metrics,
        feature_importance,
        features_used,
        data_profile=current_data_profile,
        drift_summary=drift_summary
    )
    
    print("\n" + "="*60)
    print("  --- MODEL TRAINING COMPLETED SUCCESSFULLY!")
    print("="*60)
    
    return True


if __name__ == "__main__":
    training_pipeline()
