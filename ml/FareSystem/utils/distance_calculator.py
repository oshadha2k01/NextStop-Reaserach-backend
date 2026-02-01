"""
Distance Calculation Utilities
Handles Haversine distance and Google Distance Matrix API
"""
import math
import requests
from config import GOOGLE_MAPS_API_KEY, EARTH_RADIUS_KM


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two points on Earth using Haversine formula.
    
    Args:
        lat1: Latitude of point 1
        lon1: Longitude of point 1
        lat2: Latitude of point 2
        lon2: Longitude of point 2
    
    Returns:
        Distance in kilometers
    """
    # Convert to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return EARTH_RADIUS_KM * c


def get_google_distance(origin_lat, origin_lng, dest_lat, dest_lng):
    """
    Calculate road distance using Google Distance Matrix API.
    Falls back to Haversine if API fails or no API key available.
    
    Args:
        origin_lat: Origin latitude
        origin_lng: Origin longitude
        dest_lat: Destination latitude
        dest_lng: Destination longitude
    
    Returns:
        dict with distance_km, distance_meters, duration_minutes, and source
    """
    try:
        if not GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY == 'your_google_api_key_here':
            # Fallback to haversine if no API key
            return _haversine_fallback(origin_lat, origin_lng, dest_lat, dest_lng)
        
        # Build Google Distance Matrix API URL
        base_url = "https://maps.googleapis.com/maps/api/distancematrix/json"
        origin = f"{origin_lat},{origin_lng}"
        destination = f"{dest_lat},{dest_lng}"
        
        params = {
            'origins': origin,
            'destinations': destination,
            'mode': 'driving',
            'key': GOOGLE_MAPS_API_KEY
        }
        
        response = requests.get(base_url, params=params, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        
        if data['status'] == 'OK' and data['rows'][0]['elements'][0]['status'] == 'OK':
            element = data['rows'][0]['elements'][0]
            distance_meters = element['distance']['value']
            duration_seconds = element['duration']['value']
            
            return {
                'distance_km': round(distance_meters / 1000, 2),
                'distance_meters': distance_meters,
                'distance_text': element['distance']['text'],
                'duration_minutes': round(duration_seconds / 60, 0),
                'duration_text': element['duration']['text'],
                'source': 'google_maps_api'
            }
        else:
            return _haversine_fallback(origin_lat, origin_lng, dest_lat, dest_lng)
            
    except Exception as e:
        print(f"Google Distance Matrix API Error: {e}")
        return _haversine_fallback(origin_lat, origin_lng, dest_lat, dest_lng)


def _haversine_fallback(origin_lat, origin_lng, dest_lat, dest_lng):
    """
    Fallback distance calculation using Haversine formula.
    Used when Google API is unavailable.
    """
    straight_line = haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)
    return {
        'distance_km': round(straight_line, 2),
        'distance_meters': round(straight_line * 1000, 0),
        'duration_minutes': round(straight_line / 0.5, 0),  # Assume 30 km/h avg speed
        'source': 'haversine_fallback'
    }
