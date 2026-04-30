"""
Generate a scatter plot showing Actual vs. Predicted Journey Times.

This uses the processed dataset and the saved JourneyModel to produce a
holdout evaluation plot and save it under models/.
"""

import json
import os

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from config import DATASETS_PATH, MODELS_PATH
from utils.feature_engineering import get_feature_list


MODEL_PATH = os.path.join(MODELS_PATH, "journey_time_model.pkl")
METADATA_PATH = os.path.join(MODELS_PATH, "model_metadata.json")
PROCESSED_DATA_PATH = os.path.join(DATASETS_PATH, "processed_dataset.csv")
OUTPUT_PATH = os.path.join(MODELS_PATH, "actual_vs_predicted_journey_times.png")


def load_target_transform() -> str | None:
    if not os.path.exists(METADATA_PATH):
        return None

    with open(METADATA_PATH, "r", encoding="utf-8") as metadata_file:
        metadata = json.load(metadata_file)

    return (metadata.get("metrics") or {}).get("target_transform")


def main() -> None:
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

    if not os.path.exists(PROCESSED_DATA_PATH):
        raise FileNotFoundError(f"Processed dataset not found: {PROCESSED_DATA_PATH}")

    model = joblib.load(MODEL_PATH)
    target_transform = load_target_transform()

    df = pd.read_csv(PROCESSED_DATA_PATH)
    feature_list = get_feature_list()

    available_features = [feature for feature in feature_list if feature in df.columns]
    if len(available_features) != len(feature_list):
        missing = [feature for feature in feature_list if feature not in df.columns]
        raise ValueError(f"Processed dataset is missing required features: {missing}")

    target_column = "stop_duration_seconds" if "stop_duration_seconds" in df.columns else "journey_time_seconds"
    if target_column not in df.columns:
        raise ValueError("No target column found in processed dataset")

    df_clean = df.dropna(subset=[target_column]).copy()
    if "timestamp" in df_clean.columns:
        df_clean["timestamp"] = pd.to_datetime(df_clean["timestamp"], errors="coerce")
        df_clean = df_clean.sort_values("timestamp").reset_index(drop=True)

    split_index = int(len(df_clean) * 0.8)
    split_index = max(1, min(split_index, len(df_clean) - 1))
    X_holdout = df_clean.iloc[split_index:][available_features].fillna(0)
    y_holdout = df_clean.iloc[split_index:][target_column].astype(float)

    raw_predictions = model.predict(X_holdout)
    if target_transform == "log1p":
        predictions = np.expm1(raw_predictions)
    else:
        predictions = raw_predictions
    predictions = np.maximum(predictions, 0)

    mae = float(np.mean(np.abs(y_holdout - predictions)))
    r2 = float(1 - np.sum((y_holdout - predictions) ** 2) / np.sum((y_holdout - y_holdout.mean()) ** 2))

    plt.figure(figsize=(8, 8))
    plt.scatter(y_holdout, predictions, alpha=0.75, color="#ff6b35", edgecolors="white", linewidths=0.5)

    max_value = max(float(y_holdout.max()), float(predictions.max()))
    min_value = min(float(y_holdout.min()), float(predictions.min()))
    plt.plot([min_value, max_value], [min_value, max_value], "--", color="#1f2937", linewidth=2, label="Perfect prediction")

    plt.title("Actual vs. Predicted Journey Times", fontsize=15, fontweight="bold")
    plt.xlabel("Actual Journey Time (seconds)")
    plt.ylabel("Predicted Journey Time (seconds)")
    plt.grid(True, linestyle=":", alpha=0.4)
    plt.legend()

    stats_text = f"Holdout MAE: {mae:.2f}s\nHoldout R²: {r2:.3f}\nSamples: {len(y_holdout)}"
    plt.gca().text(
        0.05,
        0.95,
        stats_text,
        transform=plt.gca().transAxes,
        va="top",
        ha="left",
        fontsize=10,
        bbox=dict(boxstyle="round,pad=0.4", facecolor="white", edgecolor="#d1d5db", alpha=0.95),
    )

    os.makedirs(MODELS_PATH, exist_ok=True)
    plt.tight_layout()
    plt.savefig(OUTPUT_PATH, dpi=200, bbox_inches="tight")
    plt.close()

    print(f"Saved plot to: {OUTPUT_PATH}")
    print(f"Holdout MAE: {mae:.2f} seconds")
    print(f"Holdout R²: {r2:.3f}")


if __name__ == "__main__":
    main()