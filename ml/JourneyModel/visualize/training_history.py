"""
Produce training-iteration charts for XGBoost Journey Time model.

This script trains an XGBRegressor using the default `MODEL_CONFIG` from
the JourneyModel config and captures per-iteration evaluation metrics
(`rmse`, `mae`) on both training and holdout sets. It also computes
per-iteration R^2 on the holdout set by predicting with increasing
numbers of trees. The resulting charts are saved to the models folder.

Usage:
    python visualize/training_history.py

Requirements: the processed dataset must exist at `datasets/processed_dataset.csv`.
"""

import os
import sys
from datetime import datetime
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
from xgboost import DMatrix

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATASETS_PATH, MODELS_PATH, MODEL_CONFIG
# Import helper functions from training module (works when running script directly)
from training.train_model import prepare_training_data, _time_series_holdout_split


def load_processed():
    path = os.path.join(DATASETS_PATH, "processed_dataset.csv")
    if not os.path.exists(path):
        print(f"Processed dataset not found at {path}")
        return None
    return pd.read_csv(path)


def train_and_capture(X, y, n_estimators=None):
    # Use provided MODEL_CONFIG and override n_estimators if given
    params = MODEL_CONFIG.copy() if isinstance(MODEL_CONFIG, dict) else {}
    if n_estimators is not None:
        params['n_estimators'] = n_estimators

    # Ensure deterministic objective
    params.update({'objective': 'reg:squarederror', 'random_state': params.get('random_state', 42)})

    # Log-transform target as used by training pipeline
    y_log = np.log1p(np.clip(y, a_min=0, a_max=None))

    X_train, X_holdout, y_train, y_holdout = _time_series_holdout_split(X, y, holdout_ratio=0.2)

    y_train_log = np.log1p(np.clip(y_train, a_min=0, a_max=None))
    y_holdout_log = np.log1p(np.clip(y_holdout, a_min=0, a_max=None))

    # Prepare DMatrix objects
    dtrain = DMatrix(X_train, label=y_train_log)
    dvalid = DMatrix(X_holdout, label=y_holdout_log)

    train_params = params.copy()
    # Remove sklearn-specific keys if present
    for drop_key in ['n_estimators']:
        train_params.pop(drop_key, None)

    num_boost_round = params.get('n_estimators', 100)

    evals_result = {}
    print("Training XGBoost (xgb.train) to capture evals_result...")
    booster = xgb.train(
        train_params,
        dtrain,
        num_boost_round=num_boost_round,
        evals=[(dtrain, 'train'), (dvalid, 'validation')],
        evals_result=evals_result,
        verbose_eval=False
    )

    evals = evals_result
    n_rounds = num_boost_round

    holdout_mae = []
    holdout_rmse = []
    holdout_r2 = []

    X_hold_dmat = DMatrix(X_holdout)

    for i in range(1, n_rounds + 1):
        # newer xgboost versions accept `num_iteration` instead of `ntree_limit`
        try:
            preds_log = booster.predict(X_hold_dmat, num_iteration=i)
        except TypeError:
            preds_log = booster.predict(X_hold_dmat, iteration_range=(0, i))
        preds = np.expm1(preds_log)
        preds = np.maximum(preds, 0)
        if len(y_holdout) > 0:
            holdout_mae.append(mean_absolute_error(y_holdout, preds))
            holdout_rmse.append(np.sqrt(mean_squared_error(y_holdout, preds)))
            try:
                holdout_r2.append(r2_score(y_holdout, preds))
            except Exception:
                holdout_r2.append(float('nan'))
        else:
            holdout_mae.append(float('nan'))
            holdout_rmse.append(float('nan'))
            holdout_r2.append(float('nan'))

    # wrap booster in a simple namespace to keep compatibility with earlier return values
    class SimpleModel:
        def __init__(self, booster):
            self.booster = booster
        def get_booster(self):
            return self.booster

    model = SimpleModel(booster)

    # Get final predictions on holdout set
    final_preds_log = booster.predict(X_hold_dmat, iteration_range=(0, n_rounds))
    final_preds = np.expm1(final_preds_log)
    final_preds = np.maximum(final_preds, 0)

    return model, evals, {
        'holdout_mae': holdout_mae,
        'holdout_rmse': holdout_rmse,
        'holdout_r2': holdout_r2,
        'n_rounds': n_rounds,
        'final_preds': final_preds,
        'y_holdout': y_holdout.values if hasattr(y_holdout, 'values') else y_holdout,
        'X_train': X_train,
        'X_holdout': X_holdout,
        'y_train': y_train.values if hasattr(y_train, 'values') else y_train,
        'booster': booster
    }


def plot_metrics(evals, per_iter_stats, out_dir):
    os.makedirs(out_dir, exist_ok=True)

    n = per_iter_stats['n_rounds']
    rounds = np.arange(1, n + 1)

    # Plot RMSE and MAE from evals if available, otherwise plot computed holdout
    try:
        plt.style.use('seaborn-whitegrid')
    except Exception:
        plt.style.use('default')
    fig, ax = plt.subplots(2, 1, figsize=(12, 8), sharex=True)

    # Top: RMSE
    if evals and 'validation_0' in evals and 'rmse' in evals['validation_0']:
        ax[0].plot(rounds[:len(evals['validation_0']['rmse'])], evals['validation_0']['rmse'], label='Train RMSE')
    if evals and 'validation_1' in evals and 'rmse' in evals['validation_1']:
        ax[0].plot(rounds[:len(evals['validation_1']['rmse'])], evals['validation_1']['rmse'], label='Holdout RMSE')
    else:
        ax[0].plot(rounds, per_iter_stats['holdout_rmse'], label='Holdout RMSE (computed)')

    ax[0].set_ylabel('RMSE (seconds)')
    ax[0].legend()
    ax[0].set_title('XGBoost Training: RMSE over Boosting Rounds')

    # Bottom: MAE
    if evals and 'validation_0' in evals and 'mae' in evals['validation_0']:
        ax[1].plot(rounds[:len(evals['validation_0']['mae'])], evals['validation_0']['mae'], label='Train MAE')
    if evals and 'validation_1' in evals and 'mae' in evals['validation_1']:
        ax[1].plot(rounds[:len(evals['validation_1']['mae'])], evals['validation_1']['mae'], label='Holdout MAE')
    else:
        ax[1].plot(rounds, per_iter_stats['holdout_mae'], label='Holdout MAE (computed)')

    ax[1].set_xlabel('Boosting Round')
    ax[1].set_ylabel('MAE (seconds)')
    ax[1].legend()
    ax[1].set_title('XGBoost Training: MAE over Boosting Rounds')

    plt.tight_layout()
    out_path = os.path.join(out_dir, f"training_history_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png")
    fig.savefig(out_path, dpi=150)
    print(f"Saved training history plot to: {out_path}")

    # Also plot R^2 on holdout
    fig2, ax2 = plt.subplots(figsize=(12, 4))
    ax2.plot(rounds, per_iter_stats['holdout_r2'], color='tab:purple')
    ax2.set_xlabel('Boosting Round')
    ax2.set_ylabel('Holdout R^2')
    ax2.set_title('Holdout R^2 over Boosting Rounds')
    ax2.grid(True)
    out_path2 = os.path.join(out_dir, f"training_r2_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png")
    fig2.savefig(out_path2, dpi=150)
    print(f"Saved holdout R^2 plot to: {out_path2}")


def plot_actual_vs_predicted(per_iter_stats, out_dir):
    """Plot Actual vs Predicted scatter plot"""
    os.makedirs(out_dir, exist_ok=True)

    final_preds = per_iter_stats.get('final_preds')
    y_holdout = per_iter_stats.get('y_holdout')

    if final_preds is None or y_holdout is None:
        print("Warning: Cannot plot Actual vs Predicted (missing data)")
        return

    fig, ax = plt.subplots(figsize=(10, 8))

    # Scatter plot
    ax.scatter(y_holdout, final_preds, alpha=0.6, s=50, edgecolors='navy', linewidth=0.5)

    # Perfect prediction line
    min_val = min(y_holdout.min(), final_preds.min())
    max_val = max(y_holdout.max(), final_preds.max())
    ax.plot([min_val, max_val], [min_val, max_val], 'r--', lw=2, label='Perfect Prediction')

    ax.set_xlabel('Actual Time (seconds)', fontsize=12)
    ax.set_ylabel('Predicted Time (seconds)', fontsize=12)
    ax.set_title('Actual vs Predicted Journey Times (Holdout Set)', fontsize=14, fontweight='bold')
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3)

    # Equal aspect ratio
    ax.set_aspect('equal', adjustable='box')

    plt.tight_layout()
    out_path = os.path.join(out_dir, f"actual_vs_predicted_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png")
    fig.savefig(out_path, dpi=150)
    print(f"Saved Actual vs Predicted plot to: {out_path}")
    plt.close(fig)


def main():
    df = load_processed()
    if df is None:
        return 1

    X, y, features_used, target = prepare_training_data(df)
    if X is None:
        return 1

    # Train and capture
    model, evals, per_iter_stats = train_and_capture(X, y, n_estimators=MODEL_CONFIG.get('n_estimators', 300))

    out_dir = os.path.join(MODELS_PATH)
    plot_metrics(evals, per_iter_stats, out_dir)
    plot_actual_vs_predicted(per_iter_stats, out_dir)

    print('Done')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
