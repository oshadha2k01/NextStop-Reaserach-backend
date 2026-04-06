import json
import os
import pandas as pd
import time
import requests
from datetime import datetime

# Paths
MODELS_PATH = "models"
METADATA_FILE = os.path.join(MODELS_PATH, "model_metadata.json")
REGISTRY_FILE = os.path.join(MODELS_PATH, "model_registry.json")
REPORT_FILE = os.path.join(MODELS_PATH, "evaluation_report.json")
IMPORTANCE_FILE = os.path.join(MODELS_PATH, "feature_importance.csv")

def check_model_accuracy():
    print("\n" + "="*50)
    print("  NEXTSTOP MODEL ACCURACY & PERFORMANCE REPORT")
    print("="*50)

    if not os.path.exists(METADATA_FILE):
        print("!!! Error: No model metadata found. Please train the model first.")
        return

    with open(METADATA_FILE, 'r') as f:
        meta = json.load(f)

    metrics = meta.get('metrics', {})
    registry = {}
    if os.path.exists(REGISTRY_FILE):
        with open(REGISTRY_FILE, 'r', encoding='utf-8') as f:
            registry = json.load(f)

    report = {}
    if os.path.exists(REPORT_FILE):
        with open(REPORT_FILE, 'r', encoding='utf-8') as f:
            report = json.load(f)
    
    # Prefer holdout metrics when available; fall back to older fields.
    r2 = metrics.get('holdout_r2', metrics.get('test_r2', 0))
    accuracy_score = max(0, min(100, r2 * 100))
    if r2 < 0:
        # If R2 is negative, the model is worse than a simple average
        accuracy_score = 0
    
    # Alternative MAE based score (assuming 60 mins is max error)
    mae = metrics.get('holdout_mae', metrics.get('test_mae', 100))
    mae_score = max(0, 100 - (mae / 60 * 100))
    
    # Combined Rating
    final_rating = (accuracy_score * 0.4) + (mae_score * 0.6)

    print(f"\n--- General Information ---")
    print(f"  Trained At: {meta.get('trained_at')}")
    print(f"  Features Used: {len(meta.get('features', []))}")
    print(f"  Production State: {meta.get('production_state', registry.get('production_state', 'unknown'))}")
    if registry.get('backup_path'):
        print(f"  Backup Model: {registry.get('backup_path')}")

    print(f"\n--- Accuracy Metrics ---")
    print(f"  Accuracy Rating: {final_rating:.1f}/100")
    print(f"  Holdout MAE (Error): {metrics.get('holdout_mae', metrics.get('test_mae', 0)):.2f} minutes")
    print(f"  Holdout R^2: {metrics.get('holdout_r2', metrics.get('test_r2', 0)):.4f}")
    if metrics.get('cv_best_neg_mae') is not None:
        print(f"  CV Best Neg MAE: {metrics.get('cv_best_neg_mae'):.4f}")

    if report:
        print(f"\n--- Latest Evaluation Report ---")
        candidate = report.get('candidate_metrics', {})
        print(f"  Candidate Holdout MAE: {candidate.get('holdout_mae')}")
        print(f"  Candidate Holdout R^2: {candidate.get('holdout_r2')}")
        drift = report.get('drift_summary', {})
        if drift:
            print(f"  Drift Score: {drift.get('drift_score_pct')}")
            print(f"  Drift Available: {drift.get('available')}")

    if os.path.exists(IMPORTANCE_FILE):
        print(f"\n--- Top Feature Drivers ---")
        df_imp = pd.read_csv(IMPORTANCE_FILE)
        for _, row in df_imp.head(3).iterrows():
            print(f"  {row['feature']}: {row['importance']:.4f}")

    print(f"\n--- API Performance (Latency) ---")
    try:
        start_time = time.time()
        res = requests.get("http://localhost:5000/health", timeout=5)
        latency = (time.time() - start_time) * 1000
        print(f"  API Status: {'Healthy' if res.status_code == 200 else 'Error'}")
        print(f"  Response Time: {latency:.1f} ms")
    except:
        print("  API Status: OFFLINE (Could not connect to Port 5000)")

    print("\n" + "="*50 + "\n")

if __name__ == "__main__":
    check_model_accuracy()
