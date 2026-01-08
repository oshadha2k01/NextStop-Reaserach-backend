# FILE: /ml/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS 
import joblib
import os
from pymongo import MongoClient

app = Flask(__name__)
CORS(app) 

# --- Configuration ---
# Update with your specific database name
MONGO_URI = 'mongodb+srv://NextBus:RPSLIIT@researchp.pf7k4qq.mongodb.net/NextBusDB?retryWrites=true&w=majority' 

# Initialize MongoDB Client
try:
    mongo_client = MongoClient(MONGO_URI)
    db = mongo_client.get_database()
    # Ensure this matches the collection name in your Atlas
    # Mongoose typically pluralizes your model "BusRealTimeData" to "busrealtimedatas"
    bus_data_collection = db.busrealtimedatas 
    print(f"✅ Flask ML Service: Connected to MongoDB")
except Exception as e:
    print(f"❌ Flask ML Service: MongoDB Error: {e}")
    bus_data_collection = None

@app.route('/predict_bus', methods=['POST'])
def predict_bus():
    """
    Calculates a two-stage journey prediction.
    Stage 1: Bus -> User (Onboarding)
    Stage 2: User -> Destination (Ride)
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
        # 1. Fetch live sensor data from MongoDB
        latest = bus_data_collection.find_one(
            {"busId": bus_id},
            sort=[('timestamp', -1)]
        )
        
        current_speed = latest.get('speed', 35) if latest else 35
        passenger_count = latest.get('passengerCount', 10) if latest else 10
        
        # --- HIGH ACCURACY PREDICTION LOGIC ---
        
        # A. Calculate Time to User (Segment 1)
        # We adjust Google's traffic time based on current bus speed variance
        speed_factor = max(0.85, 40 / max(current_speed, 10))
        predicted_time_to_user = seg1_google_time * speed_factor
        
        # B. Calculate Boarding Delay (The time the bus sits at the stop)
        # 5 seconds per existing passenger + 15 seconds base stop time
        boarding_delay = (passenger_count * 5) + 15
        
        # C. Calculate Time on Bus (Segment 2)
        # Buses travel slower than Google's 'driving' mode due to frequent stops.
        # We apply a 20% "Transit Overhead" factor.
        predicted_time_on_bus = seg2_google_time * 1.20
        
        # D. Total Calculation
        total_seconds = predicted_time_to_user + boarding_delay + predicted_time_on_bus
        
        return jsonify({
            "timeToUserSeconds": int(predicted_time_to_user),
            "timeOnBusSeconds": int(predicted_time_on_bus + boarding_delay),
            "totalJourneySeconds": int(total_seconds),
            "debug_speed": current_speed,
            "debug_passengers": passenger_count,
            "source": "ML-Hybrid-V3-TwoStage"
        }), 200

    except Exception as e:
        print(f"Flask Prediction Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Ensure Port matches your Node.js .env
    app.run(host='0.0.0.0', port=5000)