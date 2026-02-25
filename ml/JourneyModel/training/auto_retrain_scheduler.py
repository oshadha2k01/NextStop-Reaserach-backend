"""
Automatic retraining scheduler for JourneyModel.

Default behavior (recommended for Route 177):
- Retrain every 24 hours (Asia/Colombo)
- Skip run if new MongoDB records are below threshold
"""

import os
import sys
import json
import time
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from pymongo import MongoClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import (
    MONGODB_URI,
    MONGODB_DB_NAME,
    MONGODB_SENSOR_COLLECTION,
    MODELS_PATH,
    APP_TIMEZONE,
    RETRAIN_INTERVAL_HOURS,
    RETRAIN_MIN_NEW_RECORDS,
    RETRAIN_REALTIME_ENABLED,
    RETRAIN_REALTIME_DEBOUNCE_SECONDS,
    MONGODB_STOPS_COLLECTION,
)

from data_pipeline.mongodb_to_csv import generate_datasets
from preprocessing.preprocess_dataset import preprocess_pipeline
from training.train_model import training_pipeline


STATE_FILE = os.path.join(MODELS_PATH, "retrain_state.json")


def _load_state():
    if not os.path.exists(STATE_FILE):
        return {"last_retrain_utc": None}

    with open(STATE_FILE, "r", encoding="utf-8") as state_file:
        return json.load(state_file)


def _save_state(last_retrain_utc):
    os.makedirs(MODELS_PATH, exist_ok=True)
    with open(STATE_FILE, "w", encoding="utf-8") as state_file:
        json.dump({"last_retrain_utc": last_retrain_utc}, state_file, indent=2)


def _count_new_records(last_retrain_utc):
    client = MongoClient(MONGODB_URI)
    try:
        collection = client[MONGODB_DB_NAME][MONGODB_SENSOR_COLLECTION]

        if not last_retrain_utc:
            return collection.count_documents({})

        last_dt = datetime.fromisoformat(last_retrain_utc.replace("Z", "+00:00"))
        last_epoch_seconds = int(last_dt.timestamp())
        last_epoch_millis = int(last_dt.timestamp() * 1000)

        return collection.count_documents(
            {
                "$or": [
                    {"received_at": {"$gt": last_dt}},
                    {"timestamp": {"$gt": last_dt}},
                    {"timestamp": {"$gt": last_epoch_seconds}},
                    {"timestamp": {"$gt": last_epoch_millis}},
                ]
            }
        )
    finally:
        client.close()


def run_retrain_once():
    state = _load_state()
    last_retrain_utc = state.get("last_retrain_utc")

    new_records = _count_new_records(last_retrain_utc)
    now_local = datetime.now(ZoneInfo(APP_TIMEZONE))

    print("\n" + "=" * 72)
    print(f"[AutoRetrain] {now_local.isoformat()} | New records since last retrain: {new_records}")
    print("=" * 72)

    if new_records < RETRAIN_MIN_NEW_RECORDS:
        print(
            f"[AutoRetrain] Skipped. Need at least {RETRAIN_MIN_NEW_RECORDS} new records; got {new_records}."
        )
        return False

    print("[AutoRetrain] Step 1/3 - MongoDB to CSV")
    if not generate_datasets():
        print("[AutoRetrain] Failed at data extraction step.")
        return False

    print("[AutoRetrain] Step 2/3 - Preprocessing")
    if not preprocess_pipeline():
        print("[AutoRetrain] Failed at preprocessing step.")
        return False

    print("[AutoRetrain] Step 3/3 - Training")
    if not training_pipeline():
        print("[AutoRetrain] Failed at training step.")
        return False

    now_utc = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    _save_state(now_utc)
    print(f"[AutoRetrain] Completed successfully. last_retrain_utc={now_utc}")
    return True


def run_scheduler():
    interval_seconds = RETRAIN_INTERVAL_HOURS * 3600
    print("\n" + "=" * 72)
    print(" NextStop JourneyModel Auto Retrain Scheduler")
    print(f" Timezone: {APP_TIMEZONE}")
    print(f" Interval: every {RETRAIN_INTERVAL_HOURS} hours")
    print(f" Min new records: {RETRAIN_MIN_NEW_RECORDS}")
    print("=" * 72)

    while True:
        try:
            run_retrain_once()
        except Exception as error:
            print(f"[AutoRetrain] Unexpected error: {error}")

        print(f"[AutoRetrain] Sleeping {RETRAIN_INTERVAL_HOURS}h...\n")
        time.sleep(interval_seconds)


def run_realtime_watcher():
    """Watch MongoDB collections and trigger retraining on updates."""
    print("\n" + "=" * 72)
    print(" NextStop JourneyModel Realtime Retrain Watcher")
    print(f" Datbase: {MONGODB_DB_NAME}")
    print(f" Watching Collections: {MONGODB_SENSOR_COLLECTION}, {MONGODB_STOPS_COLLECTION}")
    print(f" Debounce: {RETRAIN_REALTIME_DEBOUNCE_SECONDS}s")
    print(f" Min new records: {RETRAIN_MIN_NEW_RECORDS}")
    print("=" * 72)

    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DB_NAME]
    
    last_trigger_ts = 0.0

    pipeline = [{
        "$match": {
            "operationType": {"$in": ["insert", "update", "replace"]}
        }
    }]

    try:
        # Watch the database for changes in relevant collections
        with db.watch(pipeline, full_document='updateLookup') as stream:
            print("[AutoRetrain] Watching MongoDB changes...\n")
            for change in stream:
                collection_name = change['ns']['coll']
                
                # Only trigger for relevant collections
                if collection_name not in [MONGODB_SENSOR_COLLECTION, MONGODB_STOPS_COLLECTION]:
                    continue

                now_ts = time.time()
                if (now_ts - last_trigger_ts) < RETRAIN_REALTIME_DEBOUNCE_SECONDS:
                    continue

                last_trigger_ts = now_ts
                now_local = datetime.now(ZoneInfo(APP_TIMEZONE)).isoformat()
                print(f"[AutoRetrain] Change detected in '{collection_name}' at {now_local}. Evaluating retrain...")

                try:
                    run_retrain_once()
                except Exception as error:
                    print(f"[AutoRetrain] Realtime retrain failed: {error}")

    finally:
        client.close()


if __name__ == "__main__":
    if RETRAIN_REALTIME_ENABLED:
        run_realtime_watcher()
    else:
        run_scheduler()
