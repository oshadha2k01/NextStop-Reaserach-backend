"""
NextStop DL Service
Serves people-count data written by the edge YOLO device (test.py)
running at each bus stop.

Architecture:
  Edge device (bus stop):  test.py -> YOLO inference -> MongoDB every 5 s
  Cloud (this service):    Flask API -> reads MongoDB -> serves HTTP endpoints
"""

import os
from datetime import datetime, timedelta

from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient, DESCENDING
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# ── MongoDB ──────────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME   = os.getenv("DL_DB_NAME", "NextBusDB")

mongo_ok   = False
collection = None

try:
    client     = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")          # fail fast if URI is wrong
    db         = client[DB_NAME]
    collection = db["people_count"]
    mongo_ok   = True
    print(f"MongoDB connected — db: {DB_NAME}")
except Exception as e:
    print(f"MongoDB connection failed: {e}")

# ── Health ────────────────────────────────────────────────────────────────────
@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":  "running",
        "service": "NextStop DL Service",
        "version": "1.0",
        "mongodb": "connected" if mongo_ok else "disconnected",
    })

# ── Latest count ──────────────────────────────────────────────────────────────
@app.route("/api/people-count/latest", methods=["GET"])
def get_latest():
    """
    Returns the most recent people-count record written by the edge device.

    Response:
        {
            "timestamp": "2026-03-07T10:05:00",
            "in_count": 42,
            "out_count": 15,
            "total_people": 27,
            "frame_number": 3000
        }
    """
    if collection is None:
        return jsonify({"error": "MongoDB not connected"}), 503
    try:
        doc = collection.find_one(sort=[("timestamp", DESCENDING)])
        if not doc:
            return jsonify({"message": "No data available yet"}), 404
        doc["_id"] = str(doc["_id"])
        if isinstance(doc.get("timestamp"), datetime):
            doc["timestamp"] = doc["timestamp"].isoformat()
        return jsonify(doc)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── History ───────────────────────────────────────────────────────────────────
@app.route("/api/people-count/history", methods=["GET"])
def get_history():
    """
    Returns recent records for the last N minutes (default 5).

    Query params:
        minutes (int): how far back to look  (default 5, max 60)

    Response:
        [ { timestamp, in_count, out_count, total_people, ... }, ... ]
    """
    if collection is None:
        return jsonify({"error": "MongoDB not connected"}), 503
    try:
        minutes = min(int(request.args.get("minutes", 5)), 60)
        cutoff  = datetime.now() - timedelta(minutes=minutes)
        docs    = list(
            collection.find(
                {"timestamp": {"$gte": cutoff}},
                sort=[("timestamp", DESCENDING)],
                limit=100,
            )
        )
        for d in docs:
            d["_id"] = str(d["_id"])
            if isinstance(d.get("timestamp"), datetime):
                d["timestamp"] = d["timestamp"].isoformat()
        return jsonify(docs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── Current occupancy ─────────────────────────────────────────────────────────
@app.route("/api/people-count/occupancy", methods=["GET"])
def get_occupancy():
    """
    Returns simplified current bus-stop occupancy level.

    Response:
        {
            "total_people": 27,
            "level": "Moderate",   // Empty / Low / Moderate / High / Over Capacity
            "in_count": 42,
            "out_count": 15,
            "timestamp": "..."
        }
    """
    if collection is None:
        return jsonify({"error": "MongoDB not connected"}), 503
    try:
        doc = collection.find_one(sort=[("timestamp", DESCENDING)])
        if not doc:
            return jsonify({"message": "No data available yet"}), 404

        total = doc.get("total_people", 0)

        if total <= 0:
            level = "Empty"
        elif total <= 10:
            level = "Low"
        elif total <= 25:
            level = "Moderate"
        elif total <= 40:
            level = "High"
        else:
            level = "Over Capacity"

        ts = doc.get("timestamp")
        return jsonify({
            "total_people": total,
            "level":        level,
            "in_count":     doc.get("in_count",  0),
            "out_count":    doc.get("out_count", 0),
            "timestamp":    ts.isoformat() if isinstance(ts, datetime) else str(ts),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
