import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib

def train():
    df = pd.read_csv('data/historical_crowd_data.csv')
    df['Date'] = pd.to_datetime(df['Date'])
    
    # Feature Engineering
    df['hour'] = pd.to_datetime(df['Turn_Time']).dt.hour
    df['day_of_week'] = df['Date'].dt.dayofweek
    df['month'] = df['Date'].dt.month
    df['day_of_year'] = df['Date'].dt.dayofyear
    
    X = df[['hour', 'day_of_week', 'month', 'day_of_year']]
    y = df['Passenger_Count']
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    joblib.dump(model, 'models/trained_model.pkl')
    print("✅ Model trained and saved to models/trained_model.pkl")

if _name_ == "_main_":
    train()