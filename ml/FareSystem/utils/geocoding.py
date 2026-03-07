"""
Geocoding Utilities
Converts location names to GPS coordinates using Google Geocoding API
"""
import requests
from ml_service_config import GOOGLE_MAPS_API_KEY


def get_coordinates_from_location_name(location_name):
    """
    Convert location name/address to GPS coordinates using Google Geocoding API.
    
    Args:
        location_name: Location name or address (e.g., "SLIIT Malabe, Sri Lanka")
    
    Returns:
        dict with latitude, longitude, formatted_address, source
        or None if geocoding fails
    """
    try:
        if not GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY == 'your_google_api_key_here':
            return None
        
        # Build Google Geocoding API URL
        base_url = "https://maps.googleapis.com/maps/api/geocode/json"
        
        params = {
            'address': location_name,
            'key': GOOGLE_MAPS_API_KEY,
            'region': 'lk'  # Bias results to Sri Lanka
        }
        
        response = requests.get(base_url, params=params, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        
        if data['status'] == 'OK' and len(data['results']) > 0:
            location = data['results'][0]['geometry']['location']
            formatted_address = data['results'][0]['formatted_address']
            
            return {
                'latitude': location['lat'],
                'longitude': location['lng'],
                'formatted_address': formatted_address,
                'source': 'google_geocoding_api'
            }
        else:
            print(f"Geocoding failed: {data.get('status', 'UNKNOWN')}")
            return None
            
    except Exception as e:
        print(f"Google Geocoding API Error: {e}")
        return None
