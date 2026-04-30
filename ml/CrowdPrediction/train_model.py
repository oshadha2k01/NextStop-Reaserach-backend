import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

DATA_FILE = 'data/historical_crowd_data.csv'
MODEL_FILE = 'models/crowd_model.json'

print(" Loading data...")
df = pd.read_csv(DATA_FILE)

if 'Route_ID' not in df.columns:
    df['Route_ID'] = 177
if 'Direction' not in df.columns:
    df['Direction'] = 'inbound'
if 'is_public_holiday' not in df.columns:
    df['is_public_holiday'] = 0
if 'is_raining' not in df.columns:
    df['is_raining'] = 0

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
df['route_id'] = pd.to_numeric(df['Route_ID'], errors='coerce').fillna(177).astype(int)
df['direction_code'] = df['Direction'].astype(str).str.lower().map({'inbound': 0, 'outbound': 1}).fillna(0).astype(int)
df['is_public_holiday'] = pd.to_numeric(df['is_public_holiday'], errors='coerce').fillna(0).astype(int)
df['is_raining'] = pd.to_numeric(df['is_raining'], errors='coerce').fillna(0).astype(int)

# year and day_of_month excluded — year breaks predictions for dates
# beyond training END_DATE; day_of_month adds noise in synthetic data
features = [
    'hour', 'minute', 'day_of_week', 'month', 'quarter',
    'is_weekend', 'is_peak_morning', 'is_peak_evening', 'is_lunch_time',
    'is_early_morning', 'is_late_night', 'is_winter', 'is_summer',
    'route_id', 'direction_code', 'is_public_holiday', 'is_raining'
]

# Time-series split to avoid future-data leakage.
df = df.sort_values('DateTime').reset_index(drop=True)
split_date = pd.Timestamp('2026-01-01')
train_mask = df['DateTime'] < split_date
test_mask = df['DateTime'] >= split_date

if test_mask.sum() == 0 or train_mask.sum() == 0:
    split_index = int(len(df) * 0.8)
    train_mask = df.index < split_index
    test_mask = df.index >= split_index

X_train = df.loc[train_mask, features]
X_test = df.loc[test_mask, features]
y_train = df.loc[train_mask, 'Passenger_Count']
y_test = df.loc[test_mask, 'Passenger_Count']

print(f"Training XGBoost model on {len(X_train):,} samples...")
# Upgrade to XGBoost for superior accuracy with a tiny file size
model = xgb.XGBRegressor(
    n_estimators=100,
    max_depth=4,
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
print(f"Train window: {df.loc[train_mask, 'DateTime'].min()} -> {df.loc[train_mask, 'DateTime'].max()}")
print(f"Test window: {df.loc[test_mask, 'DateTime'].min()} -> {df.loc[test_mask, 'DateTime'].max()}")
print(f"R2 Score: {r2:.4f}")
print(f"MAE: {mae:.2f}")
print(f"RMSE: {rmse:.2f}")

# Save model using XGBoost native format (produces ~1-2MB vs 700MB+ with joblib)
model.save_model(MODEL_FILE)
print(f"\nModel saved to {MODEL_FILE}")
