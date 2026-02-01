"""
Route Information Routes Blueprint
Endpoints for route data
"""
from flask import Blueprint, jsonify

# Blueprint will be initialized with route_service in app.py
route_bp = Blueprint('route', __name__)

# Service will be set from app.py
route_service = None


def init_route_routes(service):
    """Initialize route routes with service instance"""
    global route_service
    route_service = service


@route_bp.route('/get_route_info', methods=['GET'])
def get_route_info():
    """
    Get complete route information including all stages and fare matrix.
    """
    if not route_service or not route_service.fare_data:
        return jsonify({"error": "Fare data not loaded"}), 500
    
    try:
        result = route_service.get_route_info()
        return jsonify(result), 200
    except Exception as e:
        print(f"Get Route Info Error: {e}")
        return jsonify({"error": str(e)}), 500


@route_bp.route('/get_stages', methods=['GET'])
def get_stages():
    """
    Get list of all stages.
    """
    if not route_service or not route_service.fare_data:
        return jsonify({"error": "Fare data not loaded"}), 500
    
    try:
        result = route_service.get_stages()
        return jsonify(result), 200
    except Exception as e:
        print(f"Get Stages Error: {e}")
        return jsonify({"error": str(e)}), 500
