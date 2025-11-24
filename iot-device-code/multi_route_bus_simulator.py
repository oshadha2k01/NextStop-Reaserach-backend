import requests
import time
import random
import threading

# --- CONFIGURATION ---
NODEJS_API_URL = 'http://localhost:3000/api/predictive-time-buses/data'

# Define all bus routes with stops
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
    },
    'BUS-190': {
        'routeName': 'Route 190: Meegoda - Pettah',
        'device_id': 'ESP32_Bus_190',
        'stops': [
            {'name': 'Meegoda', 'latitude': 6.8398, 'longitude': 80.0475, 'baseSpeed': 0},
            {'name': 'Godagama', 'latitude': 6.8519, 'longitude': 80.0097, 'baseSpeed': 40},
            {'name': 'Athurugiriya', 'latitude': 6.8774, 'longitude': 79.9897, 'baseSpeed': 45},
            {'name': 'Malabe', 'latitude': 6.9045, 'longitude': 79.9548, 'baseSpeed': 35},
            {'name': 'Battaramulla', 'latitude': 6.8998, 'longitude': 79.9134, 'baseSpeed': 30},
            {'name': 'Rajagiriya', 'latitude': 6.9092, 'longitude': 79.8964, 'baseSpeed': 25},
            {'name': 'Pettah (Fort)', 'latitude': 6.9344, 'longitude': 79.8499, 'baseSpeed': 0},
        ]
    },
    'BUS-138': {
        'routeName': 'Route 138: Homagama - Pettah',
        'device_id': 'ESP32_Bus_138',
        'stops': [
            {'name': 'Homagama', 'latitude': 6.8412, 'longitude': 79.9981, 'baseSpeed': 0},
            {'name': 'Kottawa Junction', 'latitude': 6.8436, 'longitude': 79.9641, 'baseSpeed': 35},
            {'name': 'Pannipitiya', 'latitude': 6.8500, 'longitude': 79.9500, 'baseSpeed': 40},
            {'name': 'Maharagama', 'latitude': 6.8494, 'longitude': 79.9236, 'baseSpeed': 30},
            {'name': 'Nugegoda', 'latitude': 6.8744, 'longitude': 79.8863, 'baseSpeed': 25},
            {'name': 'Kirulapone', 'latitude': 6.8845, 'longitude': 79.8774, 'baseSpeed': 20},
            {'name': 'Thummulla', 'latitude': 6.9034, 'longitude': 79.8614, 'baseSpeed': 15},
            {'name': 'Town Hall', 'latitude': 6.9147, 'longitude': 79.8601, 'baseSpeed': 10},
            {'name': 'Pettah (Main Stand)', 'latitude': 6.9361, 'longitude': 79.8523, 'baseSpeed': 0},
        ]
    },
    'BUS-17': {
        'routeName': 'Route 17: Panadura - Kandy',
        'device_id': 'ESP32_Bus_017',
        'stops': [
            {'name': 'Panadura Bus Stand', 'latitude': 6.7111, 'longitude': 79.9074, 'baseSpeed': 0},
            {'name': 'Dehiwala Junction', 'latitude': 6.8502, 'longitude': 79.8635, 'baseSpeed': 45},
            {'name': 'Nugegoda', 'latitude': 6.8744, 'longitude': 79.8863, 'baseSpeed': 35},
            {'name': 'Battaramulla', 'latitude': 6.8998, 'longitude': 79.9134, 'baseSpeed': 40},
            {'name': 'Malabe', 'latitude': 6.9045, 'longitude': 79.9548, 'baseSpeed': 45},
            {'name': 'Kaduwela', 'latitude': 6.9442, 'longitude': 79.9866, 'baseSpeed': 50},
            {'name': 'Biyagama', 'latitude': 6.9322, 'longitude': 80.0041, 'baseSpeed': 55},
            {'name': 'Nittambuwa', 'latitude': 7.1444, 'longitude': 80.0954, 'baseSpeed': 60},
            {'name': 'Kandy (Goods Shed)', 'latitude': 7.2912, 'longitude': 80.6331, 'baseSpeed': 0},
        ]
    }
}

def calculate_speed_variation(base_speed, stop_name):
    """Calculate realistic speed based on traffic conditions."""
    urban_areas = ['Pettah', 'Fort', 'Kollupitiya', 'Borella', 'Town Hall', 'Nugegoda']
    highway_areas = ['Kaduwela', 'Malabe', 'Nittambuwa', 'Kandy']
    
    traffic_factor = 1.0
    
    if any(area in stop_name for area in urban_areas):
        traffic_factor = random.uniform(0.4, 0.7)
    elif any(area in stop_name for area in highway_areas):
        traffic_factor = random.uniform(0.8, 1.2)
    else:
        traffic_factor = random.uniform(0.6, 0.9)
    
    speed = base_speed * traffic_factor + random.uniform(-5, 5)
    return max(0, int(speed))

def generate_rain_level():
    """Generate realistic rain level (0-10000 range based on your data)."""
    # 70% chance of no rain, 20% light rain, 10% heavy rain
    chance = random.random()
    if chance < 0.7:
        return 0  # No rain
    elif chance < 0.9:
        return random.randint(100, 3000)  # Light rain
    else:
        return random.randint(3000, 10000)  # Heavy rain

def generate_bus_data(bus_id, stop_index, route):
    """Generates simulated data matching MongoDB structure."""
    stops = route['stops']
    stop = stops[stop_index]
    
    # GPS jitter simulation
    lat = stop['latitude'] + random.uniform(-0.0001, 0.0001)
    lon = stop['longitude'] + random.uniform(-0.0001, 0.0001)
    
    # Calculate realistic speed with traffic variations
    speed = calculate_speed_variation(stop['baseSpeed'], stop['name'])
    
    # Generate rain level
    rain_level = generate_rain_level()
    
    data = {
        'latitude': lat,
        'longitude': lon,
        'speed': speed,
        'rain_level': rain_level,
        'device_id': route['device_id'],
        'timestamp': int(time.time() * 1000)
    }
    return data, stop['name']

def send_data_to_backend(data, bus_id, location_name):
    """Sends the data via HTTP POST."""
    try:
        response = requests.post(NODEJS_API_URL, json=data)
        if response.status_code == 201:
            rain_status = f"Rain: {data['rain_level']}" if data['rain_level'] > 0 else "Clear"
            print(f"[{data['device_id']}] ✓ {location_name} | Speed: {data['speed']} km/h | {rain_status}")
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
        time.sleep(random.randint(10, 20))

def main():
    """Start all bus simulations in separate threads."""
    print("=" * 70)
    print("🚍 Multi-Route Bus Simulator - Sri Lanka (IoT Device Format)")
    print("=" * 70)
    print(f"Backend API: {NODEJS_API_URL}")
    print(f"Total Routes: {len(BUS_ROUTES)}")
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
