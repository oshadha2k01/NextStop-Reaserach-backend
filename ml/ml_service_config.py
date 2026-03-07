"""
Configuration for ML Service
Centralizes all configuration values for easy team management
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API Keys
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')

# MongoDB Configuration
MONGO_URI = os.getenv('MONGO_URI') or os.getenv('MONGODB_URI')
MONGO_COLLECTION_NAME = os.getenv('MONGO_COLLECTION_NAME', 'busrealtimedatas')

# Data Paths - Point to internal ml/data for deployment
FARE_DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'route_177.json')

# Server Configuration
FLASK_HOST = '0.0.0.0'
FLASK_PORT = int(os.getenv('PORT', 5000))

# Distance Calculation Settings
DEFAULT_BUS_SPEED_KMH = 30  # Average bus speed for fallback calculations
EARTH_RADIUS_KM = 6371  # Earth radius for Haversine formula
