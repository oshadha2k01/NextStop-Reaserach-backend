import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# add parent 'ml' directory so ETAModel package can be imported when running script directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ETAModel.config import (
    MONGODB_URI, MONGODB_DB_NAME,
    MONGODB_SENSOR_COLLECTION
)

class ETADataCollector:
    def __init__(self):
        self.client = None
        self.db = None
        self.connect_db()

    def connect_db(self):
        try:
            self.client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
            self.client.admin.command('ping')
            
            # CRITICAL FIX: Automatically use the database from your connection URL (NextBusDB)
            try:
                self.db = self.client.get_default_database()
            except:
                self.db = self.client[MONGODB_DB_NAME]
                
            print(f"--- Connected to MongoDB (Database: {self.db.name})")
            
            # DEBUG CHECK: Count exactly how many documents are in the collection
            total_docs = self.db[MONGODB_SENSOR_COLLECTION].count_documents({})
            print(f"--- 📊 DEBUG: Found {total_docs} total documents inside '{MONGODB_SENSOR_COLLECTION}' collection")

        except Exception as e:
            print(f"!!! MongoDB connection failed: {e}")
            self.client = None

    def get_bus_locations(self, hours_back=168):
        """Get ESP32 sensor data from MongoDB"""
        if not self.client:
            return pd.DataFrame()

        try:
            pipeline = [
                {
                    # Relaxed match to catch ALL data first
                    '$match': {
                        'gps': {'$exists': True} 
                    }
                },
                {
                    '$project': {
                        'bus_id': '$device_id',
                        'lat': '$gps.lat',
                        'lng': '$gps.lng',
                        'speed': '$gps.speed_kmh',
                        'timestamp': '$received_at',
                        'weather_raining': '$weather.is_raining'
                    }
                },
                {'$sort': {'timestamp': 1}} # Sort ascending so time travels forward
            ]

            cursor = self.db[MONGODB_SENSOR_COLLECTION].aggregate(pipeline)
            data = list(cursor)

            if data:
                df = pd.DataFrame(data)
                
                # Filter out indoor testing where GPS might be 0.0
                df = df[(df['lat'] != 0.0) & (df['lng'] != 0.0)]
                
                print(f"--- Retrieved {len(df)} valid ESP32 sensor records (with GPS lock)")
                return df
            else:
                print("--- No ESP32 data found in the pipeline")
                return pd.DataFrame()

        except Exception as e:
            print(f"!!! Error retrieving bus data: {e}")
            return pd.DataFrame()

    def create_training_data(self, hours_back=168):
        print("--- Creating ETA training dataset...")

        bus_data = self.get_bus_locations(hours_back)
        if bus_data.empty:
            return pd.DataFrame()

        # Clean and prepare data
        bus_data = bus_data.dropna(subset=['lat', 'lng'])
        bus_data['speed'] = bus_data['speed'].fillna(25)
        bus_data['weather_raining'] = bus_data['weather_raining'].fillna(False).astype(int)

        # CRITICAL FIX: Convert MongoDB timestamps to Pandas DateTime objects
        bus_data['timestamp'] = pd.to_datetime(bus_data['timestamp'])

        training_data = self._create_synthetic_training_data(bus_data)
        print(f"--- Created training dataset with {len(training_data)} samples")
        return training_data

    def _create_synthetic_training_data(self, bus_data):
        training_samples = []

        for bus_id, group in bus_data.groupby('bus_id'):
            group = group.sort_values('timestamp').reset_index(drop=True)

            for i in range(len(group) - 1):
                current_pos = group.iloc[i]

                # Look ahead to find a target location in the future (1 to 15 mins ahead)
                for j in range(i + 30, min(i + 450, len(group)), 10): 
                    future_pos = group.iloc[j]
                    time_diff = (future_pos['timestamp'] - current_pos['timestamp']).total_seconds()

                    if 60 <= time_diff <= 900: 
                        distance = self._haversine_distance(
                            current_pos['lat'], current_pos['lng'],
                            future_pos['lat'], future_pos['lng']
                        )

                        if distance > 0.1:  # At least 100m away
                            sample = {
                                'bus_lat': current_pos['lat'],
                                'bus_lng': current_pos['lng'],
                                'user_lat': future_pos['lat'], 
                                'user_lng': future_pos['lng'],
                                'bus_speed_kmh': current_pos['speed'],
                                'weather_was_raining': current_pos['weather_raining'],
                                'timestamp': current_pos['timestamp'],
                                'actual_eta_seconds': time_diff 
                            }
                            training_samples.append(sample)
                            break 
                            
        return pd.DataFrame(training_samples)

    def _haversine_distance(self, lat1, lng1, lat2, lng2):
        import math
        lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
        c = 2 * math.asin(math.sqrt(a))
        return c * 6371

    def save_training_data(self, filename="eta_training_data.csv"):
        data = self.create_training_data()
        if not data.empty:
            os.makedirs("datasets", exist_ok=True)
            filepath = os.path.join("datasets", filename)
            data.to_csv(filepath, index=False)
            print(f"--- Training data saved to {filepath}")
            return filepath
        else:
            print("!!! No training data to save")
            return None

if __name__ == "__main__":
    collector = ETADataCollector()
    collector.save_training_data()