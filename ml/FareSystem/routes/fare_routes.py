"""
Fare Routes Blueprint
All fare calculation endpoints
"""
from flask import Blueprint, request, jsonify

# Blueprint will be initialized with fare_service in app.py
fare_bp = Blueprint('fare', __name__)

# Service will be set from app.py
fare_service = None


def init_fare_routes(service):
    """Initialize fare routes with service instance"""
    global fare_service
    fare_service = service


@fare_bp.route('/calculate_fare', methods=['POST'])
def calculate_fare():
    """
    Calculate bus fare based on boarding and alighting stages using fare matrix.
    Request body: { "boarding_stage": "Malabe", "alighting_stage": "Borella" }
    or { "boarding_stage_id": 3, "alighting_stage_id": 8 }
    """
    if not fare_service or not fare_service.fare_data:
        return jsonify({"error": "Fare data not loaded"}), 500
    
    data = request.get_json() or {}
    
    try:
        # Support both stage names and IDs
        boarding_id = data.get('boarding_stage_id')
        alighting_id = data.get('alighting_stage_id')
        
        # If names provided, convert to IDs
        if boarding_id is None and 'boarding_stage' in data:
            boarding_name = data['boarding_stage']
            boarding_id = next(
                (s['id'] for s in fare_service.fare_data['stages'] if s['name'] == boarding_name),
                None
            )
        
        if alighting_id is None and 'alighting_stage' in data:
            alighting_name = data['alighting_stage']
            alighting_id = next(
                (s['id'] for s in fare_service.fare_data['stages'] if s['name'] == alighting_name),
                None
            )
        
        # Validate inputs
        if boarding_id is None or alighting_id is None:
            return jsonify({"error": "Invalid boarding or alighting stage"}), 400
        
        result = fare_service.calculate_fare_by_stage(boarding_id, alighting_id)
        return jsonify(result), 200
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Fare Calculation Error: {e}")
        return jsonify({"error": str(e)}), 500


@fare_bp.route('/find_nearest_stage', methods=['POST'])
def find_nearest_stage():
    """
    Find the nearest bus stage to user's location.
    Request body: { "latitude": 6.9147, "longitude": 79.9729 }
    """
    if not fare_service or not fare_service.fare_data:
        return jsonify({"error": "Fare data not loaded"}), 500
    
    data = request.get_json() or {}
    user_lat = data.get('latitude')
    user_lon = data.get('longitude')
    
    if user_lat is None or user_lon is None:
        return jsonify({"error": "latitude and longitude are required"}), 400
    
    try:
        result = fare_service.find_nearest_stage_to_location(user_lat, user_lon)
        return jsonify(result), 200
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Find Nearest Stage Error: {e}")
        return jsonify({"error": str(e)}), 500


@fare_bp.route('/calculate_journey', methods=['POST'])
def calculate_journey():
    """
    Calculate complete journey including fare and time.
    Request body: {
        "boarding_stage_id": 3,
        "alighting_stage_id": 8,
        "bus_id": "NA-1234" (optional)
    }
    """
    if not fare_service or not fare_service.fare_data:
        return jsonify({"error": "Fare data not loaded"}), 500
    
    data = request.get_json() or {}
    
    try:
        boarding_id = data.get('boarding_stage_id')
        alighting_id = data.get('alighting_stage_id')
        bus_id = data.get('bus_id')
        
        if boarding_id is None or alighting_id is None:
            return jsonify({
                "error": "boarding_stage_id and alighting_stage_id are required"
            }), 400
        
        result = fare_service.calculate_journey(boarding_id, alighting_id, bus_id)
        return jsonify(result), 200
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Calculate Journey Error: {e}")
        return jsonify({"error": str(e)}), 500


@fare_bp.route('/calculate_fare_by_location', methods=['POST'])
def calculate_fare_by_location():
    """
    Calculate fare using GPS coordinates OR location names - automatically finds nearest stages.
    
    Request body OPTION 1 (Coordinates):
    {
        "boarding_location": {"latitude": 6.925, "longitude": 79.985},
        "alighting_location": {"latitude": 6.912, "longitude": 79.970},
        "bus_id": "NA-1234" (optional)
    }
    
    Request body OPTION 2 (Location Names):
    {
        "boarding_location": "SLIIT Malabe, Sri Lanka",
        "alighting_location": "Kaduwela Town, Sri Lanka",
        "bus_id": "NA-1234" (optional)
    }
    """
    if not fare_service or not fare_service.fare_data:
        return jsonify({"error": "Fare data not loaded"}), 500
    
    data = request.get_json() or {}
    
    try:
        boarding_loc_input = data.get('boarding_location')
        alighting_loc_input = data.get('alighting_location')
        bus_id = data.get('bus_id')
        
        if not boarding_loc_input or not alighting_loc_input:
            return jsonify({
                "error": "boarding_location and alighting_location are required"
            }), 400
        
        result = fare_service.calculate_fare_by_location(
            boarding_loc_input,
            alighting_loc_input,
            bus_id
        )
        return jsonify(result), 200
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Calculate Fare By Location Error: {e}")
        return jsonify({"error": str(e)}), 500
