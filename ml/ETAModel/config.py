"""
Configuration Module for ETAModel
Central configuration for the ETA (Estimated Time of Arrival) prediction model
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
# MongoDB Configuration
MONGODB_URI = os.getenv(
    'MONGODB_URI',
    'mongodb+srv://NextBus:RPSLIIT@researchp.pf7k4qq.mongodb.net/NextBusDB?retryWrites=true&w=majority'
)
MONGODB_DB_NAME = os.getenv(
    'MONGODB_DB_NAME',
    'nextstop'
)

# Collections
MONGODB_BUS_COLLECTION = os.getenv('MONGODB_BUS_COLLECTION', 'buses')
MONGODB_SENSOR_COLLECTION = os.getenv('MONGODB_SENSOR_COLLECTION', 'sensor_readings')

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

# XGBoost Model Parameters for ETA prediction
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

# Features used in the ETA model
REQUIRED_FEATURES = [
    'bus_lat',
    'bus_lng',
    'user_lat',
    'user_lng',
    'distance_km',
    'bus_speed_kmh',
    'weather_was_raining',
    'hour',
    'day_of_week',
    'is_weekend',
    'is_rush_hour',
    'traffic_intensity'
]

# ============================================================================
# API CONFIGURATION
# ============================================================================

# Prediction API
API_HOST = os.getenv('API_HOST', '0.0.0.0')
API_PORT = int(os.getenv('API_PORT', 5002))  # Different port from JourneyModel
API_DEBUG = os.getenv('API_DEBUG', 'False').lower() == 'true'
API_WORKERS = int(os.getenv('API_WORKERS', 4))

# ============================================================================
# LOCATION DEFAULTS
# ============================================================================

# Colombo city center (default location for distance calculation)
DEFAULT_CENTER_LAT = 6.9271
DEFAULT_CENTER_LNG = 79.8612

# ============================================================================
# VALIDATION SETTINGS
# ============================================================================

# Coordinate validation
MIN_LATITUDE = -90
MAX_LATITUDE = 90
MIN_LONGITUDE = -180
MAX_LONGITUDE = 180

# Speed validation (km/h)
MIN_SPEED = 0
MAX_SPEED = 120

# Distance validation (km)
MIN_DISTANCE = 0.01
MAX_DISTANCE = 100

# Time range (in minutes)
MIN_ETA = 1
MAX_ETA = 180

# Outlier detection (in standard deviations)
OUTLIER_THRESHOLD = 3.0