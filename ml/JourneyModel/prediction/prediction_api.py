"""
Prediction API
Flask REST API for journey time predictions with Google Traffic API integration
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import requests
import json
from datetime import datetime
import logging
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from predict import JourneyTimePredictor, predict_time
except ImportError:
    from .predict import JourneyTimePredictor, predict_time
from config import (
    GOOGLE_TRAFFIC_API_KEY,
    GOOGLE_MAPS_API_KEY,
    ROUTE_177_DATA_PATH,
    DEFAULT_ROUTE_NUMBER
)

app = Flask(__name__)
CORS(app)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize predictor
predictor = JourneyTimePredictor()


def load_route_177_stages():
    """Load Route 177 stage coordinates from JSON file"""
    try:
        if not os.path.exists(ROUTE_177_DATA_PATH):
            logger.warning(f"--- Route 177 file not found: {ROUTE_177_DATA_PATH}")
            return []

        with open(ROUTE_177_DATA_PATH, 'r', encoding='utf-8') as route_file:
            route_data = json.load(route_file)

        stages = route_data.get('stages', [])
        normalized = []

        for stage in stages:
            coords = stage.get('coordinates', {})
            normalized.append({
                'id': stage.get('id'),
                'name': stage.get('name', '').strip(),
                'lat': float(coords.get('latitude')),
                'lng': float(coords.get('longitude'))
            })

        logger.info(f"--- Loaded Route 177 stages: {len(normalized)}")
        return normalized

    except Exception as error:
        logger.error(f"!!! Failed to load Route 177 stages: {error}")
        return []


ROUTE_177_STAGES = load_route_177_stages()


def _nearest_stage_index(lat, lng, stages):
    """Find nearest stage index for given coordinates"""
    closest_index = 0
    closest_distance = float('inf')

    for index, stage in enumerate(stages):
        distance = ((stage['lat'] - lat) ** 2 + (stage['lng'] - lng) ** 2) ** 0.5
        if distance < closest_distance:
            closest_distance = distance
            closest_index = index

    return closest_index


def _stage_index_from_identifier(identifier, stages):
    """Resolve stage index from id/name/value"""
    if identifier is None:
        return None

    stage_value = str(identifier).strip().lower()

    if stage_value.isdigit():
        numeric_value = int(stage_value)
        for idx, stage in enumerate(stages):
            if stage.get('id') == numeric_value:
                return idx
        if 0 <= numeric_value < len(stages):
            return numeric_value

    for idx, stage in enumerate(stages):
        if stage.get('name', '').strip().lower() == stage_value:
            return idx

    return None


def get_segmented_traffic_data(route_stages, start_index, end_index):
    """
    Fetch segmented traffic for route stages and sum durations/distances.
    This improves accuracy for Route 177 over single OD call.
    """
    if not GOOGLE_MAPS_API_KEY:
        logger.warning("--- Google Maps API key not configured")
        return None

    if start_index == end_index:
        return {
            'duration_seconds': 0,
            'distance_meters': 0,
            'confidence': 0.85,
            'source': 'route_177_segmented',
            'segments_count': 0
        }

    try:
        print(f"--- [GOOGLE API] Triggering segmented traffic for {len(route_stages)} stages...", flush=True)
        direction = 1 if end_index > start_index else -1
        total_duration = 0
        total_distance = 0
        segment_results = []

        current_index = start_index
        while current_index != end_index:
            next_index = current_index + direction
            origin = route_stages[current_index]
            destination = route_stages[next_index]

            params = {
                'origins': f"{origin['lat']},{origin['lng']}",
                'destinations': f"{destination['lat']},{destination['lng']}",
                'key': GOOGLE_MAPS_API_KEY,
                'traffic_model': 'best_guess',
                'departure_time': 'now'
            }

            response = requests.get(
                "https://maps.googleapis.com/maps/api/distancematrix/json",
                params=params,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()

            if data.get('status') != 'OK' or not data.get('rows'):
                logger.warning(f"--- Segment traffic unavailable ({data.get('status')}): {origin['name']} -> {destination['name']}")
                current_index = next_index
                continue

            element = data['rows'][0]['elements'][0]
            if element.get('status') != 'OK':
                logger.warning(f"--- Segment status not OK: {element.get('status')}")
                current_index = next_index
                continue

            segment_duration = element.get('duration_in_traffic', element['duration'])['value']
            segment_distance = element['distance']['value']

            total_duration += segment_duration
            total_distance += segment_distance
            segment_results.append({
                'from': origin['name'],
                'to': destination['name'],
                'duration_seconds': segment_duration,
                'distance_meters': segment_distance
            })

            current_index = next_index

        if total_duration == 0:
            print("--- [GOOGLE API] Segmented traffic failed (No data returned)", flush=True)
            return None

        # Aggregate traffic analysis for the entire segmented route
        avg_delay_seconds = max(0, total_duration - (total_distance / 13.0)) # 13 m/s = ~47 km/h base
        if avg_delay_seconds > 600: condition = "Heavy Traffic"
        elif avg_delay_seconds > 300: condition = "Moderate Traffic"
        elif avg_delay_seconds > 60: condition = "Slow Traffic"
        else: condition = "Clear / Smooth Traffic"

        print(f"--- [GOOGLE API] Segmented traffic: {total_distance/1000:.2f}km, Condition: {condition}", flush=True)

        return {
            'duration_seconds': total_duration,
            'distance_meters': total_distance,
            'traffic_condition': condition,
            'delay_minutes': round(avg_delay_seconds / 60, 1),
            'confidence': 0.9,
            'source': 'route_177_segmented',
            'segments_count': len(segment_results),
            'segments': segment_results
        }

    except requests.exceptions.RequestException as error:
        logger.error(f"!!! Error fetching segmented traffic data: {error}")
        return None


def get_traffic_data(origin_lat, origin_lng, destination_lat, destination_lng):
    """
    Get traffic data from Google Maps Distance Matrix API
    
    Args:
        origin_lat, origin_lng: Starting coordinates
        destination_lat, destination_lng: Destination coordinates
    
    Returns:
        Dictionary with duration and traffic status
    """
    if not GOOGLE_MAPS_API_KEY:
        logger.warning("--- Google Maps API key not configured")
        return None
    
    try:
        url = "https://maps.googleapis.com/maps/api/distancematrix/json"
        
        params = {
            'origins': f"{origin_lat},{origin_lng}",
            'destinations': f"{destination_lat},{destination_lng}",
            'key': GOOGLE_MAPS_API_KEY,
            'traffic_model': 'best_guess',
            'departure_time': 'now'
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if data['status'] == 'OK' and len(data['rows']) > 0:
            element = data['rows'][0]['elements'][0]
            
            if element['status'] == 'OK':
                # Extract road distance and check for traffic delay
                distance_meters = element['distance']['value']
                duration_seconds = element['duration']['value']
                duration_in_traffic = element.get('duration_in_traffic', {}).get('value', duration_seconds)
                delay_seconds = max(0, duration_in_traffic - duration_seconds)
                
                # Determine condition
                if delay_seconds > 600: condition = "Heavy Traffic"
                elif delay_seconds > 300: condition = "Moderate Traffic"
                elif delay_seconds > 60: condition = "Slow Traffic"
                else: condition = "Clear / Smooth Traffic"

                traffic_data = {
                    'duration_seconds': duration_in_traffic,
                    'duration_text': element.get('duration_in_traffic', element['duration'])['text'],
                    'distance_meters': distance_meters,
                    'distance_text': element['distance']['text'],
                    'traffic_condition': condition,
                    'delay_minutes': round(delay_seconds / 60, 1),
                    'confidence': 0.85,
                    'source': 'google_maps'
                }
                
                print(f"--- [GOOGLE API] Road Distance: {traffic_data['distance_text']}, Condition: {condition}", flush=True)
                logger.info(f"--- Traffic data fetched: {traffic_data['duration_text']} (Condition: {condition})")
                return traffic_data
        
        print(f"--- [GOOGLE API] FAIL: {data.get('status')} - {data.get('error_message') or 'No message'}", flush=True)
        logger.warning(f"--- [GOOGLE API] FAIL: {data.get('status')} - {data.get('error_message')}")
        return None
        
    except requests.exceptions.RequestException as e:
        logger.error(f"!!! Error fetching traffic data: {e}")
        return None


def get_weather_data(lat, lng):
    """
    Get weather data (optional - from local sources)
    
    Args:
        lat, lng: Location coordinates
    
    Returns:
        Dictionary with weather info
    """
    # This would connect to your weather API or local weather service
    # For now, returning default
    return {
        'is_raining': 0,
        'temperature': 25,
        'source': 'local'
    }


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'NextStop Journey Time Prediction API',
        'model_loaded': predictor.model is not None,
        'timestamp': datetime.now().isoformat()
    }), 200


@app.route('/predict', methods=['POST'])
def predict():
    """
    Research Snippet Compatible Prediction Endpoint
    """
    try:
        data = request.json
        result = predict_time(
            data["lat"],
            data["lng"],
            data["stop_duration"],
            data["rain"],
            data["hour"]
        )
        return jsonify({
            "predicted_journey_time": result
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/predict-advanced', methods=['POST'])
def predict_journey_time():
    """
    Predict journey time
    
    Request body:
    {
        "boarding_lat": -33.8688,
        "boarding_lng": 151.2093,
        "destination_lat": -33.8752,
        "destination_lng": 151.2026,
        "stop_duration_seconds": 300,
        "hour": 14,
        "day_of_week": 2,
        "is_weekend": 0
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = [
            'boarding_lat', 'boarding_lng',
            'destination_lat', 'destination_lng',
            'stop_duration_seconds', 'hour'
        ]
        
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            return jsonify({
                'error': 'Missing required fields',
                'missing': missing_fields
            }), 400
        
        # Extract data
        boarding_lat = float(data['boarding_lat'])
        boarding_lng = float(data['boarding_lng'])
        destination_lat = float(data['destination_lat'])
        destination_lng = float(data['destination_lng'])
        stop_duration_seconds = float(data['stop_duration_seconds'])
        hour = int(data['hour'])
        day_of_week = int(data.get('day_of_week', 2))
        is_weekend = int(data.get('is_weekend', 0))

        route_number = str(data.get('route_number', DEFAULT_ROUTE_NUMBER))
        boarding_stage = data.get('boarding_stage')
        destination_stage = data.get('destination_stage')
        
        # Get traffic data
        # Route 177 uses stage-wise segment aggregation for highest accuracy.
        traffic_data = None
        if route_number == '177' and ROUTE_177_STAGES:
            start_index = _stage_index_from_identifier(boarding_stage, ROUTE_177_STAGES)
            end_index = _stage_index_from_identifier(destination_stage, ROUTE_177_STAGES)

            if start_index is None:
                start_index = _nearest_stage_index(boarding_lat, boarding_lng, ROUTE_177_STAGES)
            if end_index is None:
                end_index = _nearest_stage_index(destination_lat, destination_lng, ROUTE_177_STAGES)

            traffic_data = get_segmented_traffic_data(ROUTE_177_STAGES, start_index, end_index)

            if not traffic_data:
                logger.warning("--- Falling back to single OD traffic for Route 177")
                traffic_data = get_traffic_data(
                    boarding_lat, boarding_lng,
                    destination_lat, destination_lng
                )
        else:
            traffic_data = get_traffic_data(
                boarding_lat, boarding_lng,
                destination_lat, destination_lng
            )
        
        # Get weather data (if available)
        weather_data = get_weather_data(boarding_lat, boarding_lng)
        rain = weather_data.get('is_raining', 0)
        
        # Make prediction
        prediction = predictor.predict_time(
            lat=boarding_lat,
            lng=boarding_lng,
            stop_duration_seconds=stop_duration_seconds,
            rain=rain,
            hour=hour,
            day_of_week=day_of_week,
            is_weekend=is_weekend,
            traffic_api_data=traffic_data,
            boarding_lat=boarding_lat,
            boarding_lng=boarding_lng,
            destination_lat=destination_lat,
            destination_lng=destination_lng
        )
        
        # Prepare response
        response = {
            'success': True,
            'predicted_time': {
                'seconds': round(prediction, 2),
                'minutes': round(prediction / 60, 2),
                'hours': round(prediction / 3600, 2)
            },
            'journey': {
                'route_number': route_number,
                'boarding': {
                    'lat': boarding_lat,
                    'lng': boarding_lng
                },
                'destination': {
                    'lat': destination_lat,
                    'lng': destination_lng
                },
                'stop_duration_minutes': round(stop_duration_seconds / 60, 2)
            },
            'conditions': {
                'weather': 'Rainy' if rain else 'Clear',
                'hour': hour,
                'day_of_week': day_of_week,
                'is_weekend': bool(is_weekend)
            },
            'data_sources': [],
            'timestamp': datetime.now().isoformat()
        }
        
        # Add traffic data if available
        if traffic_data:
            response['data_sources'].append('google_maps')
            response['traffic'] = {
                'google_duration_seconds': traffic_data['duration_seconds'],
                'google_distance_km': round(traffic_data['distance_meters'] / 1000, 2),
                'confidence': traffic_data['confidence'],
                'source': traffic_data.get('source', 'google_maps'),
                'segments_count': traffic_data.get('segments_count', 1)
            }
        
        # Add weather data source
        response['data_sources'].append('local_weather')
        
        logger.info(f"--- Prediction successful: {prediction:.2f} seconds")
        
        return jsonify(response), 200
        
    except ValueError as e:
        return jsonify({
            'error': 'Invalid input format',
            'details': str(e)
        }), 400
    except Exception as e:
        logger.error(f"!!! Prediction error: {e}")
        return jsonify({
            'error': 'Prediction failed',
            'details': str(e)
        }), 500


def resolve_location_to_coordinates(location_name):
    """
    Resolve location name to coordinates using Route 177 stages or Google Maps API
    
    Args:
        location_name: Name of location (e.g., "Kaduwela", "Kollupitiya")
    
    Returns:
        Dict with 'lat' and 'lng' keys
    """
    location_lower = str(location_name).strip().lower()
    
    # Check Route 177 stages first (fastest)
    for stage in ROUTE_177_STAGES:
        if stage['name'].lower() == location_lower:
            return {'lat': stage['lat'], 'lng': stage['lng']}
    
    # Fallback: Use Google Maps Geocoding API
    if not GOOGLE_MAPS_API_KEY:
        logger.error("--- Google Maps API key not configured for geocoding")
        raise ValueError(f"Cannot resolve location: {location_name}")
    
    try:
        geocode_url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            'address': f"{location_name}, Sri Lanka",
            'key': GOOGLE_MAPS_API_KEY
        }
        
        response = requests.get(geocode_url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        if data['results']:
            location = data['results'][0]['geometry']['location']
            return {'lat': location['lat'], 'lng': location['lng']}
        else:
            raise ValueError(f"Location not found: {location_name}")
    
    except Exception as e:
        logger.error(f"!!! Geocoding error for {location_name}: {e}")
        raise ValueError(f"Failed to resolve location: {location_name}")


@app.route('/predict-simple', methods=['POST'])
def predict_journey_time_simple():
    """
    Simplified prediction endpoint - accepts location names only
    
    Request body:
    {
        "boardingLocation": "Kaduwela",
        "destinationLocation": "Kollupitiya",
        "userExpectedTime": 60
    }
    
    Auto-calculates: hour, dayOfWeek, isWeekend, stopDurationSeconds
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['boardingLocation', 'destinationLocation', 'userExpectedTime']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            return jsonify({
                'error': 'Missing required fields',
                'missing': missing_fields,
                'message': 'Please provide: boardingLocation, destinationLocation, userExpectedTime'
            }), 400
        
        boarding_location = str(data['boardingLocation']).strip()
        destination_location = str(data['destinationLocation']).strip()
        user_expected_time = float(data['userExpectedTime'])
        
        if not boarding_location or not destination_location:
            return jsonify({
                'error': 'Location names cannot be empty'
            }), 400
        
        # Resolve locations to coordinates
        boarding_coords = resolve_location_to_coordinates(boarding_location)
        destination_coords = resolve_location_to_coordinates(destination_location)
        print(f"--- [LOCATIONS] Resolved to: ({boarding_coords['lat']}, {boarding_coords['lng']}) -> ({destination_coords['lat']}, {destination_coords['lng']})", flush=True)
        
        boarding_lat = boarding_coords['lat']
        boarding_lng = boarding_coords['lng']
        destination_lat = destination_coords['lat']
        destination_lng = destination_coords['lng']
        
        # Auto-calculate temporal parameters
        from datetime import datetime
        now = datetime.now()
        hour = now.hour
        day_of_week = now.weekday()  # 0=Monday, 6=Sunday
        is_weekend = 1 if day_of_week >= 5 else 0  # 5=Saturday, 6=Sunday
        stop_duration_seconds = 300  # 5 minutes default
        
        # Route 177 stage lookup (Attempt exact match first, then snap to nearest)
        boarding_stage = None
        destination_stage = None
        
        for idx, stage in enumerate(ROUTE_177_STAGES):
            if stage['name'].lower() == boarding_location.lower():
                boarding_stage = idx
            if stage['name'].lower() == destination_location.lower():
                destination_stage = idx
        
        # If no exact match found, snap to nearest stage using coordinates
        if boarding_stage is None:
            boarding_stage = _nearest_stage_index(boarding_lat, boarding_lng, ROUTE_177_STAGES)
            print(f"--- [MAPPING] Boarding snapped to nearest stage: {ROUTE_177_STAGES[boarding_stage]['name']}", flush=True)
            
        if destination_stage is None:
            destination_stage = _nearest_stage_index(destination_lat, destination_lng, ROUTE_177_STAGES)
            print(f"--- [MAPPING] Destination snapped to nearest stage: {ROUTE_177_STAGES[destination_stage]['name']}", flush=True)
        
        # Get direct traffic/distance data first (Source of Truth for Distance)
        direct_traffic = get_traffic_data(boarding_lat, boarding_lng, destination_lat, destination_lng)
        
        # Get segmented traffic for deeper delay analysis
        route_number = '177'
        segmented_traffic = None
        
        if route_number == '177' and ROUTE_177_STAGES and boarding_stage is not None and destination_stage is not None:
            segmented_traffic = get_segmented_traffic_data(ROUTE_177_STAGES, boarding_stage, destination_stage)
        
        # Final traffic data: Use direct distance, but prefer segmented delay if available
        traffic_data = direct_traffic.copy() if direct_traffic else {}
        if segmented_traffic:
            traffic_data['traffic_condition'] = segmented_traffic.get('traffic_condition', traffic_data.get('condition', 'Unknown'))
            traffic_data['delay_minutes'] = segmented_traffic.get('delay_minutes', traffic_data.get('traffic_delay_minutes', 0))
            traffic_data['source'] = 'hybrid_segmented'
            dist_km = float(traffic_data.get('distance_meters', 0)) / 1000
            print(f"--- [HYBRID] Using direct distance ({dist_km:.2f}km) with segmented delay ({traffic_data.get('delay_minutes')}m)", flush=True)
        
        # Get weather data
        weather_data = get_weather_data(boarding_lat, boarding_lng)
        rain = weather_data.get('is_raining', 0)
        
        # Make prediction
        prediction = predictor.predict_time(
            lat=boarding_lat,
            lng=boarding_lng,
            stop_duration_seconds=stop_duration_seconds,
            rain=rain,
            hour=hour,
            day_of_week=day_of_week,
            is_weekend=is_weekend,
            traffic_api_data=traffic_data,
            boarding_lat=boarding_lat,
            boarding_lng=boarding_lng,
            destination_lat=destination_lat,
            destination_lng=destination_lng
        )
        
        # Calculate comparison with user expectation
        predicted_minutes = round(prediction / 60, 2)
        time_difference = predicted_minutes - user_expected_time
        
        # Determine recommendation
        if time_difference < -5:
            recommendation = "Good choice - Bus will arrive early"
            urgency = "low"
        elif time_difference <= 5:
            recommendation = "Recommended to take this bus"
            urgency = "low"
        elif time_difference <= 15:
            recommendation = "Consider waiting for next bus - Bus may be delayed"
            urgency = "medium"
        else:
            recommendation = "NOT recommended - Bus will be significantly late"
            urgency = "high"
        
        # Calculate distance (prefer Google, fallback to coordinate distance)
        distance_km = 0
        if traffic_data:
            distance_km = round(traffic_data.get('distance_meters', 0) / 1000, 2)
        elif boarding_lat and boarding_lng and destination_lat and destination_lng:
            # Fallback coordinate distance
            distance_km = round(np.sqrt((boarding_lat - destination_lat)**2 + (boarding_lng - destination_lng)**2) * 111.32, 2)

        # Enhanced Response with Traffic Analysis
        response = {
            "success": True,
            "prediction": {
                "predicted_time_minutes": predicted_minutes,
                "recommendation": recommendation,
                "time_difference_minutes": round(time_difference, 2),
                "user_expected_time_minutes": float(user_expected_time),
                "journey_distance_km": float(distance_km)
            },
            "details": {
                "boarding_location": boarding_location,
                "destination_location": destination_location,
                "nearest_stages": {
                    "boarding": ROUTE_177_STAGES[boarding_stage]['name'],
                    "destination": ROUTE_177_STAGES[destination_stage]['name']
                },
                "route": "177"
            },
            "traffic_analysis": {
                "condition": traffic_data.get('traffic_condition', "Normal") if traffic_data else "Unknown",
                "traffic_delay_minutes": traffic_data.get('delay_minutes', 0.0) if traffic_data else 0.0,
                "estimated_road_distance_km": float(distance_km),
                "source": traffic_data.get('source', "Hybrid Estimation") if traffic_data else "Fallback"
            },
            "timestamp": datetime.now().isoformat()
        }
        
        return jsonify(response), 200
        
    except ValueError as e:
        return jsonify({
            'error': 'Validation error',
            'details': str(e)
        }), 400
    except Exception as e:
        logger.error(f"!!! Simple prediction error: {e}")
        return jsonify({
            'error': 'Prediction failed',
            'details': str(e)
        }), 500


@app.route('/predict-multiple', methods=['POST'])
def predict_multiple_routes():
    """
    Predict journey times for multiple routes
    
    Request body:
    {
        "routes": [
            {
                "boarding_lat": -33.8688,
                "boarding_lng": 151.2093,
                "destination_lat": -33.8752,
                "destination_lng": 151.2026,
                "stop_duration_seconds": 300,
                "hour": 14
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        routes = data.get('routes', [])
        
        if not routes:
            return jsonify({'error': 'No routes provided'}), 400
        
        predictions = []
        
        for route in routes:
            try:
                # Make prediction for each route
                prediction = predictor.predict_time(
                    lat=float(route['boarding_lat']),
                    lng=float(route['boarding_lng']),
                    stop_duration_seconds=float(route['stop_duration_seconds']),
                    rain=int(route.get('rain', 0)),
                    hour=int(route['hour'])
                )
                
                predictions.append({
                    'route': route,
                    'predicted_time_seconds': round(prediction, 2),
                    'predicted_time_minutes': round(prediction / 60, 2)
                })
            except Exception as e:
                logger.error(f"!!! Error predicting route: {e}")
                predictions.append({
                    'route': route,
                    'error': str(e)
                })
        
        return jsonify({
            'success': True,
            'predictions': predictions,
            'total_routes': len(routes),
            'successful': len([p for p in predictions if 'error' not in p]),
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"!!! Batch prediction error: {e}")
        return jsonify({
            'error': 'Batch prediction failed',
            'details': str(e)
        }), 500


@app.route('/model-info', methods=['GET'])
def model_info():
    """Get model information"""
    return jsonify({
        'model_type': 'XGBoost',
        'features_count': len(predictor.features) if predictor.features else 0,
        'features': predictor.features,
        'version': '1.0',
        'status': 'ready'
    }), 200


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'error': 'Endpoint not found',
        'available_endpoints': [
            '/health',
            '/predict',
            '/predict-multiple',
            '/model-info'
        ]
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        'error': 'Internal server error',
        'details': str(error)
    }), 500


if __name__ == "__main__":
    print("\n" + "="*60)
    print("  --- NEXTSTOP JOURNEY TIME PREDICTION API")
    print("="*60)
    print("\n--- Model Status: --- Loaded")
    print(f"--- Google API:    {'CONNECTED' if GOOGLE_MAPS_API_KEY else 'DISCONNECTED (Missing Key)'}")
    print("--- API Endpoints:")
    print("   GET  /health")
    print("   POST /predict")
    print("   POST /predict-multiple")
    print("   GET  /model-info")
    print("\n--- Running on http://localhost:5000")
    print("="*60 + "\n")
    
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
