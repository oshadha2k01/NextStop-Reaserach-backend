"""
Prediction Routes Blueprint
Bus arrival time prediction endpoints
"""
from flask import Blueprint, request, jsonify

# Blueprint will be initialized with prediction_service in app.py
prediction_bp = Blueprint('prediction', __name__)

# Service will be set from app.py
prediction_service = None


def init_prediction_routes(service):
    """Initialize prediction routes with service instance"""
    global prediction_service
    prediction_service = service


@prediction_bp.route('/predict_bus', methods=['POST'])
def predict_bus():
    """
    Calculate a two-stage journey prediction.
    Stage 1: Bus -> User (Onboarding)
    Stage 2: User -> Destination (Ride)
    
    Request body:
    {
        "busId": "NA-1234",
        "segment1_meters": 5000,
        "segment1_google_seconds": 300,
        "segment2_meters": 8000,
        "segment2_google_seconds": 600
    }
    """
    data = request.get_json() or {}
    bus_id = data.get('busId')
    
    # Distance data from Google
    seg1_dist = data.get('segment1_meters', 0)
    seg1_google_time = data.get('segment1_google_seconds', 0)
    seg2_dist = data.get('segment2_meters', 0)
    seg2_google_time = data.get('segment2_google_seconds', 0)
    
    if not bus_id:
        return jsonify({"error": "busId is required"}), 400
    
    try:
        result = prediction_service.predict_bus_arrival(
            bus_id,
            seg1_dist,
            seg1_google_time,
            seg2_dist,
            seg2_google_time
        )
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Flask Prediction Error: {e}")
        return jsonify({"error": str(e)}), 500
