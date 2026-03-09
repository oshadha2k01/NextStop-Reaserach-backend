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
import traceback
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
    journey_model_error = None
    print("JourneyModel (Hybrid Distance) loaded successfully")
except Exception as e:
    print(f"Could not load JourneyModel: {e}")
    traceback.print_exc()
    journey_predictor = None
    journey_model_error = str(e)

def _resolve_location(location_name):
    """
    Resolve a location string to GPS coordinates.

    Resolution priority:
      1. Exact stage name match against loaded route_177 data    (no API call)
      2. Substring match (stage name inside input or vice versa) (no API call)
      3. Word-overlap fuzzy match with stopword removal          (no API call)
      4. Google Geocoding API — only if key works                (API call)

    Returns:
      (lat, lng, display_name, matched_stage_name | None)  or raises ValueError
    """
    stages = fare_data['stages'] if fare_data else []
    loc_lower = location_name.lower().strip()

    # Stopwords to ignore when comparing tokens
    _STOP = {'sri', 'lanka', 'road', 'junction', 'bus', 'stop', 'stand',
             'the', 'a', 'an', 'colombo', 'malabe', 'mw', 'st', 'place'}

    # --- Pass 1: exact match ---
    for stage in stages:
        if stage['name'].lower() == loc_lower:
            c = stage['coordinates']
            return c['latitude'], c['longitude'], stage['name'], stage['name']

    # --- Pass 2: substring match ---
    for stage in stages:
        stage_lower = stage['name'].lower()
        if loc_lower in stage_lower or stage_lower in loc_lower:
            c = stage['coordinates']
            return c['latitude'], c['longitude'], stage['name'], stage['name']

    # --- Pass 3: word-overlap fuzzy match ---
    import re
    loc_words = set(re.split(r'[\s,()]+', loc_lower)) - _STOP - {''}
    best_stage = None
    best_score = 0.0
    for stage in stages:
        stage_words = set(re.split(r'[\s,()]+', stage['name'].lower())) - _STOP - {''}
        if not stage_words:
            continue
        common = loc_words & stage_words
        if common:
            score = len(common) / max(len(loc_words), len(stage_words))
            if score > best_score:
                best_score = score
                best_stage = stage
    if best_stage and best_score >= 0.3:
        c = best_stage['coordinates']
        return c['latitude'], c['longitude'], best_stage['name'], best_stage['name']

    # --- Pass 4: Google Geocoding API fallback (requires Geocoding API enabled) ---
    try:
        from FareSystem.utils.geocoding import get_coordinates_from_location_name
        coords = get_coordinates_from_location_name(location_name)
        if coords:
            return (
                coords['latitude'],
                coords['longitude'],
                coords.get('formatted_address', location_name),
                None
            )
    except Exception:
        pass  # Geocoding unavailable — fall through to helpful error

    # Build a helpful error with all valid stage names
    valid = [s['name'] for s in stages]
    raise ValueError(
        f"Cannot resolve '{location_name}' to a Route 177 stop. "
        f"Valid stage names: {', '.join(valid)}"
    )


@app.route('/predict-simple', methods=['POST'])
def predict_simple():
    """Unified endpoint for the Hybrid Distance & Traffic Model"""
    if not journey_predictor:
        return {"error": "Prediction model not initialized"}, 500

    from flask import request
    from datetime import datetime
    import math

    data = request.get_json() or {}

    boarding_loc = data.get('boardingLocation')
    dest_loc = data.get('destinationLocation')
    road_distance_km = data.get('road_distance_km')       # from Node.js Google API call
    road_duration_seconds = data.get('road_duration_seconds')  # from Node.js Google API call

    if not boarding_loc or not dest_loc:
        return {"error": "Missing boardingLocation or destinationLocation"}, 400

    try:
        # Step 1: Resolve both locations to GPS coordinates
        #         Checks route stage names first (no API call), then geocodes
        b_lat, b_lng, boarding_display, boarding_stage = _resolve_location(boarding_loc)
        d_lat, d_lng, dest_display, dest_stage = _resolve_location(dest_loc)

        # Step 2: Derive time-based features from current datetime
        now = datetime.now()
        hour = now.hour
        day_of_week = now.weekday()   # 0=Monday, 6=Sunday
        is_weekend = 1 if day_of_week >= 5 else 0
        is_rush_hour = 1 if hour in range(7, 9) or hour in range(16, 19) else 0

        # Step 3: Call predict_time METHOD on the existing predictor instance
        traffic_api_data = {'duration_seconds': road_duration_seconds} if road_duration_seconds else None

        prediction_seconds = journey_predictor.predict_time(
            lat=b_lat,
            lng=b_lng,
            stop_duration_seconds=120,   # default average stop duration
            rain=0,                      # default clear weather
            hour=hour,
            day_of_week=day_of_week,
            is_weekend=is_weekend,
            traffic_api_data=traffic_api_data,
            boarding_lat=b_lat,
            boarding_lng=b_lng,
            destination_lat=d_lat,
            destination_lng=d_lng,
            road_distance_km=road_distance_km
        )

        predicted_minutes = round(prediction_seconds / 60, 2)

        # Use actual road distance from Google if provided,
        # otherwise fall back to accurate route-sequence Haversine distance
        if road_distance_km is not None:
            journey_distance_km = round(road_distance_km, 2)
        else:
            try:
                from JourneyModel.utils.feature_engineering import calculate_route_sequence_distance_km
                journey_distance_km = round(
                    calculate_route_sequence_distance_km(b_lat, b_lng, d_lat, d_lng), 2
                )
            except Exception:
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
                "journey_distance_km": journey_distance_km,
                "traffic_analysis": {
                    "condition": traffic_condition
                },
                "recommendation": recommendation
            },
            "details": {
                "boarding_location": boarding_display,
                "destination_location": dest_display,
                "route": "177",
                "nearest_stages": {
                    "boarding": boarding_stage,
                    "destination": dest_stage
                }
            }
        }

        return result, 200

    except ValueError as ve:
        return {"error": str(ve)}, 400
    except Exception as e:
        return {"error": str(e)}, 500

# ============================================================================
# ETA MODEL INTEGRATION
# ============================================================================

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ETAModel'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ETAModel', 'prediction'))

# load ETA model first
try:
    from ETAModel.prediction.predict import ETAPredictor
    eta_predictor = ETAPredictor()
    print("ETAModel loaded successfully")
except Exception as e:
    print(f"Could not load ETAModel: {e}")
    traceback.print_exc()
    eta_predictor = None

# now load crowd prediction separately
try:
    from CrowdPrediction.prediction.predict import CrowdPredictor
    crowd_predictor_instance = CrowdPredictor()
    crowd_predictor = crowd_predictor_instance.model
    crowd_model_error = None
    print("Crowd Prediction Model loaded successfully")
except Exception as e:
    print(f"Could not load Crowd Prediction Model: {e}")
    traceback.print_exc()
    crowd_predictor_instance = None
    crowd_predictor = None
    crowd_model_error = str(e)

@app.route('/predict', methods=['POST'])
def predict_eta():
    """Endpoint for ETA Prediction using ETAModel"""
    if not eta_predictor:
        return {"error": "ETA Prediction model not initialized"}, 500
    
    from flask import request
    data = request.get_json() or {}
    
    bus_lat = data.get('bus_lat')
    bus_lng = data.get('bus_lng')
    user_lat = data.get('user_lat')
    user_lng = data.get('user_lng')
    bus_speed_kmh = data.get('bus_speed_kmh', 25.0)
    weather_was_raining = data.get('weather_was_raining', 0)
    
    if not all([bus_lat, bus_lng, user_lat, user_lng]):
        return {"error": "Missing required parameters: bus_lat, bus_lng, user_lat, user_lng"}, 400

    try:
        eta_seconds = eta_predictor.predict_eta(
            bus_lat=bus_lat,
            bus_lng=bus_lng,
            user_lat=user_lat,
            user_lng=user_lng,
            bus_speed_kmh=bus_speed_kmh,
            weather_was_raining=weather_was_raining,
            fetch_external=False  # Backend (IoTController) handles Google Maps independently
        )
        
        result = {
            "prediction": {
                "eta_seconds": eta_seconds,
                "eta_minutes": round(eta_seconds / 60, 2)
            }
        }
        return result, 200
    except Exception as e:
        return {"error": str(e)}, 500

@app.route('/predict-crowd', methods=['POST'])
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
@app.route('/', methods=['GET'])
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    modules = {
        "FareSystem": "Loaded" if fare_data else "Not loaded",
        "JourneyModel": "Loaded" if journey_predictor else "Not loaded",
        "ETAModel": "Loaded" if (eta_predictor and eta_predictor.model is not None) else ("Loaded (physics fallback)" if eta_predictor else "Not loaded"),
        "CrowdPrediction": "Loaded" if crowd_predictor is not None else "Not loaded",
        "MongoDB": "Connected" if bus_data_collection is not None else "Not connected"
    }
    errors = {}
    if journey_predictor is None and journey_model_error:
        errors["JourneyModel"] = journey_model_error
    if crowd_predictor is None and crowd_model_error:
        errors["CrowdPrediction"] = crowd_model_error

    response = {
        "status": "running",
        "service": "NextStop ML Service",
        "version": "2.0 - Modular",
        "modules": modules
    }
    if errors:
        response["load_errors"] = errors
    return response, 200

if __name__ == '__main__':
    print(f"\n{'='*60}")
    print(f"NextStop ML Service - Modular Architecture")
    print(f"{'='*60}")
    print(f"FareSystem Module: Fare calculations, distance, geocoding")
    print(f"Prediction Module: ML-based arrival predictions")
    print(f"ETAModel Module: Bus ETA predictions")
    print(f"CrowdModel Module: Bus crowd passenger predictions")
    print(f"Server: http://{FLASK_HOST}:{FLASK_PORT}")
    print(f"{'='*60}\n")
    
    app.run(host=FLASK_HOST, port=FLASK_PORT)
