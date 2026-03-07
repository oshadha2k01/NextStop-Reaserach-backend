# ETAModel - Bus ETA Prediction System

AI-powered model for predicting bus arrival times to passenger locations in real-time.

## Overview

The ETAModel uses machine learning to predict how long it will take for a bus to reach a passenger's current location. It combines:

- **Real-time bus data**: Current location, speed, and sensor readings
- **Passenger location**: GPS coordinates from mobile devices
- **Traffic conditions**: Google Maps Traffic API integration
- **Weather data**: Impact of rain and other conditions
- **Historical patterns**: ML model trained on past journey data

## Features

- Real-time ETA prediction with high accuracy
- Traffic-aware routing using Google Maps API
- Weather condition integration
- Fallback calculations when APIs are unavailable
- MongoDB integration for live data
- XGBoost-based machine learning model

## Architecture

```
ETAModel/
├── config.py              # Configuration settings
├── __init__.py           # Package initialization
├── requirements.txt      # Python dependencies
├── data_collector.py     # Data collection from MongoDB
├── train_model.py        # Model training script
├── prediction/
│   ├── __init__.py
│   └── predict.py        # Core prediction logic
└── utils/
    ├── __init__.py
    └── feature_engineering.py  # Feature creation
```

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables in `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DB_NAME=nextstop
GOOGLE_TRAFFIC_API_KEY=your_google_api_key
```

## Usage

### Basic ETA Prediction

```python
from ETAModel import ETAPredictor

# Initialize predictor
predictor = ETAPredictor()

# Predict ETA
eta_seconds = predictor.predict_eta(
    bus_lat=6.9271,      # Bus latitude
    bus_lng=79.8612,     # Bus longitude
    user_lat=6.9171,     # User latitude
    user_lng=79.8712,    # User longitude
    bus_speed_kmh=30,    # Current bus speed
    weather_was_raining=0  # Weather condition
)

print(f"ETA: {eta_seconds/60:.1f} minutes")
```

### With Detailed Explanation

```python
result = predictor.predict_with_explanation(
    bus_lat=6.9271,
    bus_lng=79.8612,
    user_lat=6.9171,
    user_lng=79.8712,
    bus_speed_kmh=30,
    weather_was_raining=0
)

print(f"ETA: {result['eta_minutes']} minutes")
print(f"Bus Location: {result['bus_location']}")
print(f"User Location: {result['user_location']}")
```

## Data Collection

Collect training data from MongoDB:

```python
from data_collector import ETADataCollector

collector = ETADataCollector()
data = collector.create_training_data(hours_back=168)  # 1 week
collector.save_training_data("eta_training_data.csv")
```

## Model Training

Train the ETA model:

```bash
python train_model.py
```

This will:
1. Load training data
2. Preprocess features
3. Train XGBoost model
4. Evaluate performance
5. Save model to `models/eta_model.pkl`

## API Integration

The model integrates with:

- **MongoDB**: Real-time bus location and sensor data
- **Google Maps API**: Traffic-aware travel times
- **Weather APIs**: Current weather conditions

## Features Used

The model uses these features for prediction:

- Bus and user coordinates
- Distance between locations
- Current bus speed
- Weather conditions (rain)
- Time of day and day of week
- Rush hour indicators
- Traffic intensity

## Performance

Typical performance metrics:
- MAE: 2-5 minutes
- RMSE: 3-8 minutes

Performance varies based on:
- Traffic conditions
- Weather accuracy
- GPS precision
- Training data quality

## Fallback Behavior

When APIs are unavailable, the model falls back to:
1. Speed-based distance calculation
2. Historical average speeds
3. Weather-adjusted estimates

## Configuration

Key settings in `config.py`:
- Database connections
- API keys
- Model hyperparameters
- Feature validation ranges

## Dependencies

- joblib: Model serialization
- pandas/numpy: Data processing
- scikit-learn: ML utilities
- xgboost: ML model
- requests: API calls
- pymongo: Database access

## License

NextStop Research Team