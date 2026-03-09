"""
ETA Prediction API
REST API for real-time ETA predictions
"""

import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback
from datetime import datetime

# make sure package root is on path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ETAModel.config import API_HOST, API_PORT, API_DEBUG
from prediction.predict import ETAPredictor

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize predictor
predictor = ETAPredictor()


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ETAModel API',
        'timestamp': datetime.now().isoformat(),
        'model_loaded': predictor.model is not None
    })


@app.route('/predict', methods=['POST'])
def predict_eta():
    """
    Predict ETA for bus to reach user location

    Expected JSON payload:
    {
        "bus_lat": 6.9271,
        "bus_lng": 79.8612,
        "user_lat": 6.9171,
        "user_lng": 79.8712,
        "bus_speed_kmh": 30,
        "weather_was_raining": 0
    }
    """
    try:
        # Get JSON data
        data = request.get_json()

        if not data:
            return jsonify({
                'error': 'No JSON data provided',
                'status': 'error'
            }), 400

        # Extract parameters
        bus_lat = data.get('bus_lat')
        bus_lng = data.get('bus_lng')
        user_lat = data.get('user_lat')
        user_lng = data.get('user_lng')
        bus_speed_kmh = data.get('bus_speed_kmh', 25)
        weather_was_raining = data.get('weather_was_raining', 0)

        # Validate required parameters
        required_params = ['bus_lat', 'bus_lng', 'user_lat', 'user_lng']
        missing_params = [p for p in required_params if data.get(p) is None]

        if missing_params:
            return jsonify({
                'error': f'Missing required parameters: {missing_params}',
                'status': 'error'
            }), 400

        # Make prediction
        result = predictor.predict_with_explanation(
            bus_lat=bus_lat,
            bus_lng=bus_lng,
            user_lat=user_lat,
            user_lng=user_lng,
            bus_speed_kmh=bus_speed_kmh,
            weather_was_raining=weather_was_raining
        )

        # Return successful response
        return jsonify({
            'status': 'success',
            'prediction': result,
            'request_timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        print(f"!!! API Error: {e}")
        traceback.print_exc()

        return jsonify({
            'error': str(e),
            'status': 'error',
            'traceback': traceback.format_exc()
        }), 500


@app.route('/predict/simple', methods=['GET'])
def predict_eta_simple():
    """
    Simple GET endpoint for ETA prediction

    Query parameters:
    - bus_lat: Bus latitude
    - bus_lng: Bus longitude
    - user_lat: User latitude
    - user_lng: User longitude
    - speed: Bus speed (optional, default 25)
    - rain: Weather raining (optional, default 0)
    """
    try:
        # Get query parameters
        bus_lat = request.args.get('bus_lat', type=float)
        bus_lng = request.args.get('bus_lng', type=float)
        user_lat = request.args.get('user_lat', type=float)
        user_lng = request.args.get('user_lng', type=float)
        bus_speed_kmh = request.args.get('speed', default=25, type=float)
        weather_was_raining = request.args.get('rain', default=0, type=int)

        # Validate required parameters
        if None in [bus_lat, bus_lng, user_lat, user_lng]:
            return jsonify({
                'error': 'Missing required query parameters: bus_lat, bus_lng, user_lat, user_lng',
                'status': 'error'
            }), 400

        # Make prediction
        eta_seconds = predictor.predict_eta(
            bus_lat=bus_lat,
            bus_lng=bus_lng,
            user_lat=user_lat,
            user_lng=user_lng,
            bus_speed_kmh=bus_speed_kmh,
            weather_was_raining=weather_was_raining
        )

        # Return response
        return jsonify({
            'status': 'success',
            'eta_seconds': eta_seconds,
            'eta_minutes': round(eta_seconds / 60, 2),
            'bus_location': f"{bus_lat:.4f},{bus_lng:.4f}",
            'user_location': f"{user_lat:.4f},{user_lng:.4f}",
            'request_timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        print(f"!!! API Error: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'error': 'Endpoint not found',
        'status': 'error'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        'error': 'Internal server error',
        'status': 'error'
    }), 500


if __name__ == '__main__':
    print(f"Starting ETA Prediction API on {API_HOST}:{API_PORT}")
    print(f"Debug mode: {API_DEBUG}")
    print(f"Model loaded: {predictor.model is not None}")

    app.run(
        host=API_HOST,
        port=API_PORT,
        debug=API_DEBUG
    )