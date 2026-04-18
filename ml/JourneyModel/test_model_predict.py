import joblib
import pandas as pd
import numpy as np

model_path = "./models/journey_time_model.pkl"
model = joblib.load(model_path)

print("=== MODEL PREDICTION TEST ===\n")
print(f"Model expects features: {list(model.feature_names_in_)}")
print(f"Total features: {len(model.feature_names_in_)}\n")

# Create a test DataFrame with all 21 features
test_data = {
   'hour': [12],
    'day_of_week': [2],
    'is_weekend': [0],
    'is_rush_hour': [0],
    'weather_was_raining': [0],
    'is_hot': [0],
    'is_cold': [0],
    'lat': [6.85],
    'lng': [80.77],
    'distance_from_center': [4.5],
    'traffic_intensity': [1],
    'journey_distance_km': [3.5],
    'avg_route_speed_last_15m': [22.0],
    'boarding_stop_idx': [3],
    'destination_stop_idx': [8],
    'segment_count': [5],
    'route_progress': [0.25],
    'hist_stop_duration_mean': [45.0],
    'hist_stop_obs_count': [5],
    'device_prev_stop_duration': [50.0],
    'device_prev3_stop_duration_mean': [48.0]
}

X_test = pd.DataFrame(test_data)

print(f"Test DataFrame shape: {X_test.shape}")
print(f"Test DataFrame columns: {list(X_test.columns)}\n")

# Check if columns match exactly
missing_cols = set(model.feature_names_in_) - set(X_test.columns)
extra_cols = set(X_test.columns) - set(model.feature_names_in_)

if missing_cols:
    print(f"ERROR - Missing columns: {missing_cols}")
if extra_cols:
    print(f"ERROR - Extra columns: {extra_cols}")
    
if not missing_cols and not extra_cols:
    print("✓ All columns match!\n")

try:
    # Make prediction
    prediction = model.predict(X_test)
    print(f"Prediction successful!")
    print(f"Prediction value (raw): {prediction[0]:.4f}")
    
    # Inverse log transform
    import numpy as np
    inverse_pred = np.expm1(prediction[0])
    print(f"Prediction value (inverse log1p): {inverse_pred:.2f} seconds")
    print(f"Prediction value: {inverse_pred/60:.2f} minutes")
    
except Exception as e:
    print(f"ERROR during prediction:")
    print(f"  {type(e).__name__}: {e}")
