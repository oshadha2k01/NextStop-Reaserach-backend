"""
NextStop ML Service - Modular Architecture
Main Flask application - Routes only, business logic in modules

Structure:
- FareSystem/ - All fare calculation, distance, and route logic
- prediction/ - ML prediction logic
- config.py - Centralized configuration
"""
from flask import Flask
from flask_cors import CORS
import json
from pymongo import MongoClient

# Import configuration
from ml_service_config import (
    FARE_DATA_PATH,
    MONGO_URI,
    MONGO_COLLECTION_NAME,
    FLASK_HOST,
    FLASK_PORT
)

# Import services
from FareSystem.services import FareService, RouteService
from prediction.services import PredictionService

# Import routes
from FareSystem.routes import fare_bp, route_bp
from prediction.routes import prediction_bp

# Import route initializers
from FareSystem.routes.fare_routes import init_fare_routes
from FareSystem.routes.route_routes import init_route_routes
from prediction.routes.prediction_routes import init_prediction_routes

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load fare data
fare_data = None
try:
    with open(FARE_DATA_PATH, 'r', encoding='utf-8') as f:
        fare_data = json.load(f)
    print(f"Loaded fare data for Route {fare_data['route_number']}")
except Exception as e:
    print(f"Error loading fare data: {e}")
    fare_data = None

# Initialize MongoDB
bus_data_collection = None
try:
    if MONGO_URI:
        mongo_client = MongoClient(MONGO_URI)
        db = mongo_client.get_database()
        bus_data_collection = db[MONGO_COLLECTION_NAME]
        print(f"Flask ML Service: Connected to MongoDB")
    else:
        print("MONGO_URI not provided, running in offline mode")
except Exception as e:
    print(f"Flask ML Service: MongoDB Error: {e}")
    bus_data_collection = None

# Initialize services
if fare_data:
    fare_service = FareService(fare_data, bus_data_collection)
    route_service = RouteService(fare_data)
    prediction_service = PredictionService(bus_data_collection)
    
    # Initialize routes with services
    init_fare_routes(fare_service)
    init_route_routes(route_service)
    init_prediction_routes(prediction_service)
    
    # Register blueprints
    app.register_blueprint(fare_bp)
    app.register_blueprint(route_bp)
    app.register_blueprint(prediction_bp)
    
    print("All services and routes initialized successfully")
else:
    print("Cannot initialize services without fare data")

# ============================================================================
# HYBRID JOURNEY MODEL INTEGRATION
# ============================================================================
import sys
import os
import pandas as pd

# Ensure we can import from JourneyModel
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'JourneyModel'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'JourneyModel', 'prediction'))

try:
    from JourneyModel.prediction.predict import JourneyTimePredictor
    journey_predictor = JourneyTimePredictor()
    print("JourneyModel (Hybrid Distance) loaded successfully")
except Exception as e:
    print(f"Could not load JourneyModel: {e}")
    journey_predictor = None

@app.route('/predict-simple', methods=['POST'])
def predict_simple():
    """Unified endpoint for the Hybrid Distance & Traffic Model"""
    if not journey_predictor:
        return {"error": "Prediction model not initialized"}, 500

    from flask import request
    from datetime import datetime
    from FareSystem.utils.geocoding import get_coordinates_from_location_name
    import math

    data = request.get_json() or {}

    boarding_loc = data.get('boardingLocation')
    dest_loc = data.get('destinationLocation')

    if not boarding_loc or not dest_loc:
        return {"error": "Missing boardingLocation or destinationLocation"}, 400

    try:
        # Step 1: Geocode both location name strings to GPS coordinates
        boarding_coords = get_coordinates_from_location_name(boarding_loc)
        if not boarding_coords:
            return {"error": f"Could not geocode boarding location: {boarding_loc}"}, 400

        dest_coords = get_coordinates_from_location_name(dest_loc)
        if not dest_coords:
            return {"error": f"Could not geocode destination location: {dest_loc}"}, 400

        b_lat = boarding_coords['latitude']
        b_lng = boarding_coords['longitude']
        d_lat = dest_coords['latitude']
        d_lng = dest_coords['longitude']

        # Step 2: Derive time-based features from current datetime
        now = datetime.now()
        hour = now.hour
        day_of_week = now.weekday()           # 0=Monday, 6=Sunday
        is_weekend = 1 if day_of_week >= 5 else 0
        is_rush_hour = 1 if hour in range(7, 9) or hour in range(16, 19) else 0

        # Step 3: Call predict_time METHOD on the existing predictor instance
        #         (not the module-level predict_time function)
        prediction_seconds = journey_predictor.predict_time(
            lat=b_lat,
            lng=b_lng,
            stop_duration_seconds=120,   # default average stop duration
            rain=0,                      # default clear weather
            hour=hour,
            day_of_week=day_of_week,
            is_weekend=is_weekend,
            boarding_lat=b_lat,
            boarding_lng=b_lng,
            destination_lat=d_lat,
            destination_lng=d_lng
        )

        predicted_minutes = round(prediction_seconds / 60, 2)

        # Straight-line distance between boarding and destination (km)
        journey_distance_km = round(
            math.sqrt((b_lat - d_lat) ** 2 + (b_lng - d_lng) ** 2) * 111.32, 2
        )

        traffic_condition = "heavy" if is_rush_hour else "normal"
        recommendation = (
            f"Expected journey time is {predicted_minutes} minutes."
            + (" Rush hour detected — consider leaving early." if is_rush_hour else "")
        )

        result = {
            "success": True,
            "prediction": {
                "predicted_time_minutes": predicted_minutes,
                "predicted_time_seconds": round(prediction_seconds, 2),
                "journey_distance_km": journey_distance_km,
                "traffic_analysis": {
                    "condition": traffic_condition
                },
                "recommendation": recommendation
            },
            "details": {
                "boarding_location": boarding_coords.get('formatted_address', boarding_loc),
                "destination_location": dest_coords.get('formatted_address', dest_loc),
                "route": "177",
                "nearest_stages": {
                    "boarding": None,
                    "destination": None
                }
            }
        }

        return result, 200

    except Exception as e:
        return {"error": str(e)}, 500

# ============================================================================
# CROWD PREDICTION MODEL INTEGRATION
# ============================================================================

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'CrowdPrediction'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'CrowdPrediction', 'prediction'))

try:
    from CrowdPrediction.prediction.predict import CrowdPredictor
    crowd_predictor_instance = CrowdPredictor()
    crowd_predictor = crowd_predictor_instance.model
    # Note: Emoji removed for prod logs
    print("Crowd Prediction Model loaded successfully")
except Exception as e:
    print(f"Could not load Crowd Prediction Model: {e}")
    crowd_predictor_instance = None
    crowd_predictor = None

@app.route('/predict', methods=['POST'])
def predict_crowd():
    """Endpoint for Crowd Size Prediction based on historical patterns"""
    if not crowd_predictor_instance or not crowd_predictor_instance.model:
        return {"error": "Crowd Prediction model not initialized"}, 500
    
    from flask import request
    data = request.get_json() or {}
    
    date_str = data.get('date')
    time_str = data.get('time')
    
    if not date_str or not time_str:
        return {"error": "Missing date or time"}, 400
        
    try:
        result = crowd_predictor_instance.predict(date_str, time_str)
        return result, 200
    except Exception as e:
        return {"error": str(e)}, 500

# Health check endpoint
@app.route('/', methods=['GET'])
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "NextStop ML Service",
        "version": "2.0 - Modular",
        "modules": {
            "FareSystem": "Loaded" if fare_data else "Not loaded",
            "JourneyModel": "Loaded" if journey_predictor else "Not loaded",
            "CrowdPrediction": "Loaded" if crowd_predictor is not None else "Not loaded",
            "MongoDB": "Connected" if bus_data_collection is not None else "Not connected"
        }
    }, 200

if __name__ == '__main__':
    print(f"\n{'='*60}")
    print(f"NextStop ML Service - Modular Architecture")
    print(f"{'='*60}")
    print(f"FareSystem Module: Fare calculations, distance, geocoding")
    print(f"Prediction Module: ML-based arrival predictions")
    print(f"CrowdModel Module: Bus crowd passenger predictions")
    print(f"Server: http://{FLASK_HOST}:{FLASK_PORT}")
    print(f"{'='*60}\n")
    
    app.run(host=FLASK_HOST, port=FLASK_PORT)
