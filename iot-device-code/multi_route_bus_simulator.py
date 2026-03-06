import requests
import time
import random
import threading
import csv
import os
from datetime import datetime

# --- CONFIGURATION ---
NODEJS_API_URL = 'http://localhost:3000/api/predictive-time-buses/data'
CSV_FILE_PATH = '../ml//data/realtime_iot_data.csv'

# Define only Route 177 with enhanced accuracy
BUS_ROUTES = {
    'BUS-177': {
        'routeName': 'Route 177: Kaduwela - Kollupitiya',
        'device_id': 'ESP32_Bus_177',
        'stops': [
            {'name': 'Kaduwela Bus Stand', 'latitude': 6.9442, 'longitude': 79.9866, 'baseSpeed': 0},
            {'name': 'Kothalawala', 'latitude': 6.9268, 'longitude': 79.9701, 'baseSpeed': 35},
            {'name': 'Malabe Junction', 'latitude': 6.9045, 'longitude': 79.9548, 'baseSpeed': 40},
            {'name': 'Thalangama', 'latitude': 6.9110, 'longitude': 79.9324, 'baseSpeed': 30},
            {'name': 'Koswatta', 'latitude': 6.9071, 'longitude': 79.9214, 'baseSpeed': 25},
            {'name': 'Battaramulla', 'latitude': 6.8998, 'longitude': 79.9134, 'baseSpeed': 30},
            {'name': 'Rajagiriya', 'latitude': 6.9092, 'longitude': 79.8964, 'baseSpeed': 35},
            {'name': 'Ayurveda Junction', 'latitude': 6.9115, 'longitude': 79.8863, 'baseSpeed': 20},
            {'name': 'Borella', 'latitude': 6.9142, 'longitude': 79.8778, 'baseSpeed': 15},
            {'name': 'Horton Place', 'latitude': 6.9103, 'longitude': 79.8692, 'baseSpeed': 20},
            {'name': 'Liberty Plaza', 'latitude': 6.9124, 'longitude': 79.8516, 'baseSpeed': 10},
            {'name': 'Kollupitiya', 'latitude': 6.9114, 'longitude': 79.8488, 'baseSpeed': 0},
        ]
    }
}

# State tracking for smoother transitions
previous_speed = {}
previous_rain_level = {}

def calculate_speed_variation(base_speed, stop_name, bus_id):
    """Calculate realistic speed with smoother transitions."""
    global previous_speed
    
    urban_areas = ['Pettah', 'Fort', 'Kollupitiya', 'Borella', 'Town Hall', 'Liberty Plaza', 'Horton Place']
    congested_areas = ['Rajagiriya', 'Ayurveda Junction', 'Battaramulla']
    highway_areas = ['Kaduwela', 'Malabe', 'Kothalawala']
    
    # Determine traffic factor based on location
    if any(area in stop_name for area in urban_areas):
        traffic_factor = random.uniform(0.5, 0.75)  # Heavy urban traffic
    elif any(area in stop_name for area in congested_areas):
        traffic_factor = random.uniform(0.6, 0.85)  # Moderate congestion
    elif any(area in stop_name for area in highway_areas):
        traffic_factor = random.uniform(0.85, 1.15)  # Better flow
    else:
        traffic_factor = random.uniform(0.7, 0.95)  # Normal suburban
    
    # Calculate target speed with smaller random variation
    target_speed = base_speed * traffic_factor + random.uniform(-2, 2)
    
    # Smooth transition from previous speed
    if bus_id in previous_speed:
        # Gradual speed change (max 5 km/h change per update)
        speed_diff = target_speed - previous_speed[bus_id]
        if abs(speed_diff) > 5:
            target_speed = previous_speed[bus_id] + (5 if speed_diff > 0 else -5)
    
    speed = max(0, min(70, int(target_speed)))  # Cap at 70 km/h max
    previous_speed[bus_id] = speed
    
    return speed

def generate_rain_level(bus_id):
    """Generate realistic rain level with gradual changes."""
    global previous_rain_level
    
    # 75% chance of no rain, 15% light rain, 8% moderate, 2% heavy
    chance = random.random()
    
    if chance < 0.75:
        target_rain = 0  # No rain
    elif chance < 0.90:
        target_rain = random.randint(200, 2500)  # Light rain
    elif chance < 0.98:
        target_rain = random.randint(2500, 6000)  # Moderate rain
    else:
        target_rain = random.randint(6000, 10000)  # Heavy rain
    
    # Smooth rain level transitions
    if bus_id in previous_rain_level:
        rain_diff = target_rain - previous_rain_level[bus_id]
        if abs(rain_diff) > 1000:
            target_rain = previous_rain_level[bus_id] + (1000 if rain_diff > 0 else -1000)
    
    previous_rain_level[bus_id] = target_rain
    return target_rain

def generate_bus_data(bus_id, stop_index, route):
    """Generates high-accuracy simulated data matching MongoDB structure."""
    stops = route['stops']
    stop = stops[stop_index]
    
    # Reduced GPS jitter for higher accuracy (±0.00005 ≈ ±5 meters)
    lat = round(stop['latitude'] + random.uniform(-0.00005, 0.00005), 6)
    lon = round(stop['longitude'] + random.uniform(-0.00005, 0.00005), 6)
    
    # Calculate realistic speed with smooth transitions
    speed = calculate_speed_variation(stop['baseSpeed'], stop['name'], bus_id)
    
    # Generate rain level with gradual changes
    rain_level = generate_rain_level(bus_id)
    
    data = {
        'latitude': lat,
        'longitude': lon,
        'speed': speed,
        'rain_level': rain_level,
        'device_id': route['device_id'],
        'timestamp': int(time.time() * 1000)
    }
    return data, stop['name']

def save_to_csv(data, bus_id):
    """Save IoT data to CSV file for ML training."""
    try:
        # Check if file exists to write header
        file_exists = os.path.isfile(CSV_FILE_PATH)
        
        with open(CSV_FILE_PATH, 'a', newline='') as csvfile:
            fieldnames = ['_id', 'busId', 'currentLatitude', 'currentLongitude', 
                         'speed', 'passengerCount', 'timestamp']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            # Write header only if file is new
            if not file_exists:
                writer.writeheader()
            
            # Generate unique ID and add passenger count
            csv_row = {
                '_id': f"{bus_id}_{data['timestamp']}",
                'busId': bus_id,
                'currentLatitude': data['latitude'],
                'currentLongitude': data['longitude'],
                'speed': data['speed'],
                'passengerCount': random.randint(5, 45),  # Simulated passenger count
                'timestamp': data['timestamp']
            }
            writer.writerow(csv_row)
            
    except Exception as e:
        print(f"[CSV] ✗ Error writing to CSV: {e}")

def send_data_to_backend(data, bus_id, location_name):
    """Sends the data via HTTP POST and saves to CSV."""
    try:
        response = requests.post(NODEJS_API_URL, json=data)
        if response.status_code == 201:
            rain_status = f"Rain: {data['rain_level']}" if data['rain_level'] > 0 else "Clear"
            print(f"[{data['device_id']}] ✓ {location_name} | Speed: {data['speed']} km/h | {rain_status} | GPS: ({data['latitude']:.6f}, {data['longitude']:.6f})")
            
            # Save to CSV
            save_to_csv(data, bus_id)
            
        else:
            print(f"[{bus_id}] ✗ Failed. Status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print(f"[{bus_id}] ✗ Connection Error to {NODEJS_API_URL}")

def simulate_bus_route(bus_id, route):
    """Simulate a single bus going through its route continuously."""
    print(f"\n🚌 Starting {route['device_id']}: {route['routeName']}")
    stops = route['stops']
    stop_index = 0
    
    while True:
        data, location_name = generate_bus_data(bus_id, stop_index, route)
        send_data_to_backend(data, bus_id, location_name)
        
        stop_index = (stop_index + 1) % len(stops)
        # More frequent updates for better accuracy (8-12 seconds)
        time.sleep(random.randint(8, 12))

def main():
    """Start Route 177 bus simulation."""
    print("=" * 70)
    print("🚍 High-Accuracy IoT Bus Simulator - Route 177")
    print("=" * 70)
    print(f"Backend API: {NODEJS_API_URL}")
    print(f"CSV Output: {CSV_FILE_PATH}")
    print(f"Route: Kaduwela - Kollupitiya (Route 177)")
    print(f"GPS Accuracy: ±5 meters")
    print(f"Update Interval: 8-12 seconds")
    print("=" * 70)
    
    threads = []
    
    for bus_id, route in BUS_ROUTES.items():
        thread = threading.Thread(target=simulate_bus_route, args=(bus_id, route), daemon=True)
        thread.start()
        threads.append(thread)
        time.sleep(2)
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n🛑 Simulator stopped by user")
        print("=" * 70)

if __name__ == "__main__":
    main()
