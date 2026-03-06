"""
Start the automatic retraining watcher.

This script runs continuously and automatically retrains the model
whenever new IoT data arrives in MongoDB.

Usage:
    python start_auto_retrain.py

To run in background (Windows):
    start /B python start_auto_retrain.py > logs/retrain.log 2>&1
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from training.auto_retrain_scheduler import run_realtime_watcher, run_scheduler
from config import RETRAIN_REALTIME_ENABLED


def main():
    print("\n--- Starting NextStop Auto-Retrain Service...\n")
    
    if RETRAIN_REALTIME_ENABLED:
        print("  --- JOURNEY TIME PREDICTION (MongoDB Change Streams)")
        print("--- The model will automatically retrain when new IoT data arrives")
        print("--- Press Ctrl+C to stop\n")
        run_realtime_watcher()
    else:
        print("--- Mode: SCHEDULED (Interval-based)")
        print("--- The model will retrain on fixed intervals")
        print("--- Press Ctrl+C to stop\n")
        run_scheduler()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n--- Auto-retrain service stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n!!! Error: {e}")
        sys.exit(1)
