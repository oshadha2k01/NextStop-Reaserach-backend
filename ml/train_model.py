import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
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
df['year'] = df['DateTime'].dt.year
df['day_of_month'] = df['DateTime'].dt.day
df['quarter'] = df['DateTime'].dt.quarter
df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
df['is_peak_morning'] = ((df['hour'] >= 7) & (df['hour'] <= 9)).astype(int)
df['is_peak_evening'] = ((df['hour'] >= 17) & (df['hour'] <= 19)).astype(int)
df['is_lunch_time'] = ((df['hour'] >= 12) & (df['hour'] <= 14)).astype(int)
df['is_early_morning'] = (df['hour'] < 7).astype(int)
df['is_late_night'] = (df['hour'] >= 20).astype(int)
df['is_winter'] = df['month'].isin([12, 1, 2]).astype(int)
df['is_summer'] = df['month'].isin([6, 7, 8]).astype(int)

# Enhanced features
features = [
    'hour', 'minute', 'day_of_week', 'month', 'year', 'day_of_month', 'quarter',
    'is_weekend', 'is_peak_morning', 'is_peak_evening', 'is_lunch_time',
    'is_early_morning', 'is_late_night', 'is_winter', 'is_summer'
]
X = df[features]
y = df['Passenger_Count']

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print(f"🤖 Training model on {len(X_train):,} samples...")
# Improved model with better hyperparameters
model = RandomForestRegressor(
    n_estimators=200,
    max_depth=20,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
r2 = r2_score(y_test, y_pred)
mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))

# Save model
joblib.dump(model, MODEL_FILE)
print(f"\n Model saved to {MODEL_FILE}")
