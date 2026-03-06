"""
Configuration Module
Central configuration for the JourneyModel
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ============================================================================
# PATHS
# ============================================================================

BASE_PATH = os.path.dirname(os.path.abspath(__file__))
DATASETS_PATH = os.path.join(BASE_PATH, "datasets")
MODELS_PATH = os.path.join(BASE_PATH, "models")

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================

# MongoDB Configuration
MONGODB_URI = os.getenv(
    'MONGODB_URI',
    'mongodb://localhost:27017/'
)
MONGODB_DB_NAME = os.getenv(
    'MONGODB_DB_NAME',
    'nextstop'
)

# Collections
MONGODB_SENSOR_COLLECTION = os.getenv('MONGODB_SENSOR_COLLECTION', 'sensor_readings')
MONGODB_STOPS_COLLECTION = os.getenv('MONGODB_STOPS_COLLECTION', 'ml_bus_stops')
MONGODB_BUS_COLLECTION = os.getenv('MONGODB_BUS_COLLECTION', 'buses')

# ============================================================================
# EXTERNAL API KEYS
# ============================================================================

# Google Maps API
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')
GOOGLE_TRAFFIC_API_KEY = os.getenv('GOOGLE_TRAFFIC_API_KEY', '')

# Weather API (optional)
WEATHER_API_KEY = os.getenv('WEATHER_API_KEY', '')

# ============================================================================
# MODEL CONFIGURATION
# ============================================================================

# XGBoost Model Parameters
MODEL_CONFIG = {
    'n_estimators': 300,
    'max_depth': 8,
    'learning_rate': 0.1,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'random_state': 42
}

# Train-Test Split
TRAIN_TEST_SPLIT = 0.2
RANDOM_STATE = 42

# ============================================================================
# FEATURE CONFIGURATION
# ============================================================================

# Features used in the model
REQUIRED_FEATURES = [
    'lat',
    'lng',
    'distance_from_center',
    'weather_was_raining',
    'hour',
    'day_of_week',
    'is_weekend',
    'is_rush_hour',
    'traffic_intensity',
    'journey_distance_km'
]

# ============================================================================
# API CONFIGURATION
# ============================================================================

# Prediction API
API_HOST = os.getenv('API_HOST', '0.0.0.0')
API_PORT = int(os.getenv('API_PORT', 5000))
API_DEBUG = os.getenv('API_DEBUG', 'False').lower() == 'true'
API_WORKERS = int(os.getenv('API_WORKERS', 4))

# ============================================================================
# BACKEND INTEGRATION
# ============================================================================

# NextStop Backend Configuration
BACKEND_URL = os.getenv(
    'BACKEND_URL',
    'http://localhost:3000'
)
BACKEND_PREDICTION_ENDPOINT = '/api/prediction'

# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================

LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FILE = os.path.join(BASE_PATH, 'logs', 'journey_model.log')

# ============================================================================
# DATA CONFIGURATION
# ============================================================================

# Data validation
MIN_LATITUDE = -90
MAX_LATITUDE = 90
MIN_LONGITUDE = -180
MAX_LONGITUDE = 180

# Time range (in minutes)
MIN_JOURNEY_TIME = 1
MAX_JOURNEY_TIME = 300

# ============================================================================
# LOCATION DEFAULTS
# ============================================================================

# Colombo city center (default location for distance calculation)
DEFAULT_CENTER_LAT = 6.9271
DEFAULT_CENTER_LNG = 79.8612

# Route data
# Route data - Point to internal ml/data for deployment
ROUTE_DATA_ROOT = os.path.dirname(BASE_PATH) # Root of the ml/ folder
ROUTE_177_DATA_PATH = os.path.join(ROUTE_DATA_ROOT, "data", "main_bus_stops.json")

# Default route for prediction optimization
DEFAULT_ROUTE_NUMBER = os.getenv('DEFAULT_ROUTE_NUMBER', '177')

# ============================================================================
# VALIDATION SETTINGS
# ============================================================================

# Outlier detection (in standard deviations)
OUTLIER_THRESHOLD = 3.0

# Missing value handling
MISSING_VALUE_STRATEGY = 'drop'  # 'drop' or 'impute'

# ============================================================================
# RETRAINING CONFIGURATION
# ============================================================================

# Asia/Colombo = UTC+05:30
APP_TIMEZONE = os.getenv('APP_TIMEZONE', 'Asia/Colombo')

# Recommended default retraining cadence for Route 177
RETRAIN_INTERVAL_HOURS = int(os.getenv('RETRAIN_INTERVAL_HOURS', 24))

# Minimum new records required before retraining starts
RETRAIN_MIN_NEW_RECORDS = int(os.getenv('RETRAIN_MIN_NEW_RECORDS', 50))

# If model error drifts beyond this percentage, retrain immediately
RETRAIN_DRIFT_THRESHOLD_PERCENT = float(os.getenv('RETRAIN_DRIFT_THRESHOLD_PERCENT', 12.0))

# Realtime retraining mode (MongoDB change stream trigger)
RETRAIN_REALTIME_ENABLED = os.getenv('RETRAIN_REALTIME_ENABLED', 'true').lower() == 'true'
RETRAIN_REALTIME_DEBOUNCE_SECONDS = int(os.getenv('RETRAIN_REALTIME_DEBOUNCE_SECONDS', 120))

print("--- Configuration loaded")
print(f"  MongoDB URI: {MONGODB_URI}")
print(f"  Datasets Path: {DATASETS_PATH}")
print(f"  Models Path: {MODELS_PATH}")
print(f"  API: {API_HOST}:{API_PORT}")
print(f"  Route177 Data: {ROUTE_177_DATA_PATH}")
print(f"  Retrain Interval (hours): {RETRAIN_INTERVAL_HOURS}")
print(f"  Google API Key: {'VALID (Loaded)' if GOOGLE_MAPS_API_KEY else 'MISSING (Not Found)'}")
