import requests
import os
from ETAModel.config import GOOGLE_MAPS_API_KEY, WEATHER_API_KEY

def get_traffic_duration(bus_lat, bus_lng, user_lat, user_lng):
    """
    Fetches traffic-aware duration from Google Maps Distance Matrix API.
    Returns duration in seconds, or None if failed.
    """
    if not GOOGLE_MAPS_API_KEY:
        print("⚠️ No Google Maps API key provided. Skipping traffic data.")
        return None

    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        'origins': f"{bus_lat},{bus_lng}",
        'destinations': f"{user_lat},{user_lng}",
        'departure_time': 'now',
        'key': GOOGLE_MAPS_API_KEY
    }

    try:
        response = requests.get(url, params=params)
        data = response.json()
        if data['status'] == 'OK' and data['rows'][0]['elements'][0]['status'] == 'OK':
            duration = data['rows'][0]['elements'][0].get('duration_in_traffic', data['rows'][0]['elements'][0]['duration'])
            return duration['value']  # seconds
        else:
            print(f"⚠️ Google Maps API error: {data['status']}")
            return None
    except Exception as e:
        print(f"⚠️ Error fetching traffic data: {e}")
        return None

def get_weather_data(lat, lng):
    """
    Fetches weather data from OpenWeatherMap API.
    Returns {'is_raining': bool, 'temperature': float}, or None if failed.
    """
    if not WEATHER_API_KEY:
        print("⚠️ No Weather API key provided. Skipping weather data.")
        return None

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        'lat': lat,
        'lon': lng,
        'appid': WEATHER_API_KEY,
        'units': 'metric'
    }

    try:
        response = requests.get(url, params=params)
        data = response.json()
        if response.status_code == 200:
            is_raining = 'rain' in data or data['weather'][0]['main'].lower() in ['rain', 'drizzle', 'thunderstorm']
            temperature = data['main']['temp']
            return {'is_raining': is_raining, 'temperature': temperature}
        else:
            print(f"⚠️ Weather API error: {data.get('message', 'Unknown error')}")
            return None
    except Exception as e:
        print(f"⚠️ Error fetching weather data: {e}")
        return None