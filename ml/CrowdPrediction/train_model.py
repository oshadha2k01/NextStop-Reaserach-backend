import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os

DATA_FILE = 'data/historical_crowd_data.csv'
MODEL_FILE = 'models/crowd_model.pkl'

print(" Loading data...")
df = pd.read_csv(DATA_FILE)

# Feature engineering
df['DateTime'] = pd.to_datetime(df['Date'] + ' ' + df['Turn_Time'])
df['hour'] = df['DateTime'].dt.hour
df['minute'] = df['DateTime'].dt.minute
df['day_of_week'] = df['DateTime'].dt.dayofweek
df['month'] = df['DateTime'].dt.month
df['quarter'] = df['DateTime'].dt.quarter
df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
df['is_peak_morning'] = ((df['hour'] >= 7) & (df['hour'] <= 9)).astype(int)
df['is_peak_evening'] = ((df['hour'] >= 17) & (df['hour'] <= 19)).astype(int)
df['is_lunch_time'] = ((df['hour'] >= 12) & (df['hour'] <= 14)).astype(int)
df['is_early_morning'] = (df['hour'] < 7).astype(int)
df['is_late_night'] = (df['hour'] >= 20).astype(int)
df['is_winter'] = df['month'].isin([12, 1, 2]).astype(int)
df['is_summer'] = df['month'].isin([6, 7, 8]).astype(int)

# Features — year and day_of_month intentionally excluded:
# year breaks predictions for any date beyond the training END_DATE because XGBoost
# cannot extrapolate to unseen (year, month) combinations → produces near-zero output.
# day_of_month adds noise since synthetic data patterns do not vary by day number.
features = [
    'hour', 'minute', 'day_of_week', 'month', 'quarter',
    'is_weekend', 'is_peak_morning', 'is_peak_evening', 'is_lunch_time',
    'is_early_morning', 'is_late_night', 'is_winter', 'is_summer'
]
X = df[features]
y = df['Passenger_Count']

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print(f"Training XGBoost model on {len(X_train):,} samples...")
# Upgrade to XGBoost for superior accuracy with a tiny file size
model = xgb.XGBRegressor(
    n_estimators=150,
    max_depth=8,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
r2 = r2_score(y_test, y_pred)
mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))

print("\n--- Model Evaluation ---")
print(f"R2 Score: {r2:.4f}")
print(f"MAE: {mae:.2f}")
print(f"RMSE: {rmse:.2f}")

# Save model
joblib.dump(model, MODEL_FILE)
print(f"\nModel saved to {MODEL_FILE}")
