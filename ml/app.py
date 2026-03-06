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
    print(f"✅ Loaded fare data for Route {fare_data['route_number']}")
except Exception as e:
    print(f"❌ Error loading fare data: {e}")
    fare_data = None

# Initialize MongoDB
bus_data_collection = None
try:
    if MONGO_URI:
        mongo_client = MongoClient(MONGO_URI)
        db = mongo_client.get_database()
        bus_data_collection = db[MONGO_COLLECTION_NAME]
        print(f"✅ Flask ML Service: Connected to MongoDB")
    else:
        print("⚠️  MONGO_URI not provided, running in offline mode")
except Exception as e:
    print(f"❌ Flask ML Service: MongoDB Error: {e}")
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
    
    print("✅ All services and routes initialized successfully")
else:
    print("❌ Cannot initialize services without fare data")

# ============================================================================
# HYBRID JOURNEY MODEL INTEGRATION
# ============================================================================
import sys
import os

# Ensure we can import from JourneyModel
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'JourneyModel'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'JourneyModel', 'prediction'))

try:
    from JourneyModel.prediction.predict import JourneyTimePredictor
    journey_predictor = JourneyTimePredictor()
    print("✅ JourneyModel (Hybrid Distance) loaded successfully")
except Exception as e:
    print(f"⚠️  Could not load JourneyModel: {e}")
    journey_predictor = None

@app.route('/predict-simple', methods=['POST'])
def predict_simple():
    """Unified endpoint for the Hybrid Distance & Traffic Model"""
    if not journey_predictor:
        return {"error": "Prediction model not initialized"}, 500
    
    from flask import request
    data = request.get_json() or {}
    
    # Ported logic from prediction_api.py
    boarding_loc = data.get('boardingLocation')
    dest_loc = data.get('destinationLocation')
    user_time = data.get('userExpectedTime')

    if not boarding_loc or not dest_loc:
        return {"error": "Missing boardingLocation or destinationLocation"}, 400

    try:
        from JourneyModel.prediction.predict import predict_time
        result = predict_time(journey_predictor, boarding_loc, dest_loc, user_time)
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
            "FareSystem": "✅ Loaded" if fare_data else "❌ Not loaded",
            "JourneyModel": "✅ Loaded" if journey_predictor else "❌ Not loaded",
            "MongoDB": "✅ Connected" if bus_data_collection else "❌ Not connected"
        }
    }, 200

if __name__ == '__main__':
    print(f"\n{'='*60}")
    print(f"🚀 NextStop ML Service - Modular Architecture")
    print(f"{'='*60}")
    print(f"📂 FareSystem Module: Fare calculations, distance, geocoding")
    print(f"🤖 Prediction Module: ML-based arrival predictions")
    print(f"🌐 Server: http://{FLASK_HOST}:{FLASK_PORT}")
    print(f"{'='*60}\n")
    
    app.run(host=FLASK_HOST, port=FLASK_PORT)
