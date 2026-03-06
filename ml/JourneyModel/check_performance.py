import json
import os
import pandas as pd
import time
import requests
from datetime import datetime

# Paths
MODELS_PATH = "models"
METADATA_FILE = os.path.join(MODELS_PATH, "model_metadata.json")
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
    
    # Calculate an accuracy score out of 100 based on R-squared or MAE
    # Since R2 is currently negative (overfitting), we use a bounded logic
    r2 = metrics.get('test_r2', 0)
    accuracy_score = max(0, min(100, r2 * 100))
    if r2 < 0:
        # If R2 is negative, the model is worse than a simple average
        accuracy_score = 0
    
    # Alternative MAE based score (assuming 60 mins is max error)
    mae = metrics.get('test_mae', 100)
    mae_score = max(0, 100 - (mae / 60 * 100))
    
    # Combined Rating
    final_rating = (accuracy_score * 0.4) + (mae_score * 0.6)

    print(f"\n--- General Information ---")
    print(f"  Trained At: {meta.get('trained_at')}")
    print(f"  Features Used: {len(meta.get('features', []))}")

    print(f"\n--- Accuracy Metrics ---")
    print(f"  Accuracy Rating: {final_rating:.1f}/100")
    print(f"  Test MAE (Error): {metrics.get('test_mae', 0):.2f} minutes")
    print(f"  Model Confidence (R^2): {metrics.get('test_r2', 0):.4f}")

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
