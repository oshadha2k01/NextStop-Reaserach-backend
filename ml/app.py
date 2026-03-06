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
from config import (
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
    mongo_client = MongoClient(MONGO_URI)
    db = mongo_client.get_database()
    bus_data_collection = db[MONGO_COLLECTION_NAME]
    print(f"✅ Flask ML Service: Connected to MongoDB")
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

# Health check endpoint
@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "NextStop ML Service",
        "version": "2.0 - Modular",
        "modules": {
            "FareSystem": "✅ Loaded" if fare_data else "❌ Not loaded",
            "Prediction": "✅ Loaded",
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
