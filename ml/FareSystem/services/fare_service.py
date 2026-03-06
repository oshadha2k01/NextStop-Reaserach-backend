"""
Fare Service
Business logic for all fare-related calculations
"""
from FareSystem.utils import (
    haversine_distance,
    get_google_distance,
    get_coordinates_from_location_name,
    calculate_fare_from_matrix
)


class FareService:
    """Service class handling fare calculations"""
    
    def __init__(self, fare_data, bus_data_collection=None):
        """
        Initialize FareService with fare data and optional bus data collection
        
        Args:
            fare_data: Route fare data (loaded from route_177.json)
            bus_data_collection: MongoDB collection for bus data (optional)
        """
        self.fare_data = fare_data
        self.bus_data_collection = bus_data_collection
    
    def calculate_fare_by_stage(self, boarding_id, alighting_id):
        """
        Calculate fare between two stages
        
        Args:
            boarding_id: Boarding stage ID
            alighting_id: Alighting stage ID
        
        Returns:
            dict with fare information
        """
        if boarding_id < 0 or boarding_id >= len(self.fare_data['stages']):
            raise ValueError(f"Invalid boarding stage ID: {boarding_id}")
        
        if alighting_id < 0 or alighting_id >= len(self.fare_data['stages']):
            raise ValueError(f"Invalid alighting stage ID: {alighting_id}")
        
        fare = calculate_fare_from_matrix(
            boarding_id,
            alighting_id,
            self.fare_data['fares']
        )
        
        boarding_stage = self.fare_data['stages'][boarding_id]
        alighting_stage = self.fare_data['stages'][alighting_id]
        
        return {
            "route_number": self.fare_data['route_number'],
            "route_name": self.fare_data['route_name'],
            "service_type": self.fare_data['service_type'],
            "boarding_stage": boarding_stage['name'],
            "boarding_stage_sinhala": boarding_stage['sinhala_name'],
            "alighting_stage": alighting_stage['name'],
            "alighting_stage_sinhala": alighting_stage['sinhala_name'],
            "stages_traveled": abs(alighting_id - boarding_id),
            "fare": fare,
            "currency": "LKR"
        }
    
    def find_nearest_stage_to_location(self, latitude, longitude):
        """
        Find the nearest bus stage to given GPS coordinates
        
        Args:
            latitude: User's latitude
            longitude: User's longitude
        
        Returns:
            dict with nearest stage and distance information
        """
        nearest_stage = None
        min_distance = float('inf')
        
        for stage in self.fare_data['stages']:
            if 'coordinates' not in stage:
                continue
            
            stage_lat = stage['coordinates']['latitude']
            stage_lon = stage['coordinates']['longitude']
            
            distance = haversine_distance(latitude, longitude, stage_lat, stage_lon)
            
            if distance < min_distance:
                min_distance = distance
                nearest_stage = stage
        
        if nearest_stage is None:
            raise ValueError("No stages with coordinates found")
        
        return {
            "nearest_stage": {
                "id": nearest_stage['id'],
                "name": nearest_stage['name'],
                "sinhala_name": nearest_stage['sinhala_name'],
                "coordinates": nearest_stage['coordinates']
            },
            "distance_km": round(min_distance, 2),
            "distance_meters": round(min_distance * 1000, 0),
            "user_location": {
                "latitude": latitude,
                "longitude": longitude
            }
        }
    
    def calculate_journey(self, boarding_id, alighting_id, bus_id=None):
        """
        Calculate complete journey information
        
        Args:
            boarding_id: Boarding stage ID
            alighting_id: Alighting stage ID
            bus_id: Optional bus ID for real-time data
        
        Returns:
            dict with journey details
        """
        fare = calculate_fare_from_matrix(
            boarding_id,
            alighting_id,
            self.fare_data['fares']
        )
        
        boarding_stage = self.fare_data['stages'][boarding_id]
        alighting_stage = self.fare_data['stages'][alighting_id]
        
        # Get bus data if available
        bus_status = None
        if bus_id and self.bus_data_collection:
            latest = self.bus_data_collection.find_one(
                {"busId": bus_id},
                sort=[('timestamp', -1)]
            )
            if latest:
                bus_status = {
                    "id": bus_id,
                    "current_speed": latest.get('speed', 35),
                    "passenger_count": latest.get('passengerCount', 10)
                }
        
        return {
            "route": {
                "number": self.fare_data['route_number'],
                "name": self.fare_data['route_name']
            },
            "journey": {
                "from": {
                    "id": boarding_id,
                    "name": boarding_stage['name'],
                    "sinhala": boarding_stage['sinhala_name']
                },
                "to": {
                    "id": alighting_id,
                    "name": alighting_stage['name'],
                    "sinhala": alighting_stage['sinhala_name']
                },
                "stages": abs(alighting_id - boarding_id),
                "fare": {
                    "amount": fare,
                    "currency": "LKR"
                }
            },
            "bus_status": bus_status
        }
    
    def calculate_fare_by_location(self, boarding_location, alighting_location, bus_id=None):
        """
        Calculate fare using GPS coordinates or location names
        
        Args:
            boarding_location: Dict with lat/lng OR location name string
            alighting_location: Dict with lat/lng OR location name string
            bus_id: Optional bus ID
        
        Returns:
            dict with fare, distance, and location information
        """
        # Process boarding location
        boarding_loc, boarding_source = self._process_location_input(boarding_location, "boarding")
        
        # Process alighting location
        alighting_loc, alighting_source = self._process_location_input(alighting_location, "alighting")
        
        # Find nearest stages
        nearest_boarding = self._find_nearest_stage(boarding_loc)
        nearest_alighting = self._find_nearest_stage(alighting_loc)
        
        # Calculate fare
        fare = calculate_fare_from_matrix(
            nearest_boarding['id'],
            nearest_alighting['id'],
            self.fare_data['fares']
        )
        
        # Calculate journey distance
        journey_distance = get_google_distance(
            boarding_loc['latitude'],
            boarding_loc['longitude'],
            alighting_loc['latitude'],
            alighting_loc['longitude']
        )
        
        # Build response
        response_data = {
            "boarding": {
                "nearest_stage": {
                    "name": nearest_boarding['name'],
                    "sinhala": nearest_boarding['sinhala_name']
                },
                "location": boarding_loc
            },
            "destination": {
                "nearest_stage": {
                    "name": nearest_alighting['name'],
                    "sinhala": nearest_alighting['sinhala_name']
                },
                "location": alighting_loc
            },
            "journey": {
                "fare": {
                    "amount": fare,
                    "currency": "LKR"
                },
                "distance": {
                    "kilometers": journey_distance['distance_km'],
                    "text": journey_distance.get('distance_text', f"{journey_distance['distance_km']} km")
                }
            }
        }
        
        # Add original input if location names were used
        if boarding_source.get('type') == 'location_name':
            response_data['boarding']['original_input'] = boarding_source.get('input')
        
        if alighting_source.get('type') == 'location_name':
            response_data['destination']['original_input'] = alighting_source.get('input')
        
        return response_data
    
    def _process_location_input(self, location_input, location_type):
        """
        Process location input (either coordinates dict or location name string)
        
        Args:
            location_input: Either dict with lat/lng or string location name
            location_type: "boarding" or "alighting" (for error messages)
        
        Returns:
            tuple: (location_dict, source_dict)
        """
        if isinstance(location_input, str):
            # It's a location name - convert to coordinates
            geocode_result = get_coordinates_from_location_name(location_input)
            if geocode_result:
                location = {
                    'latitude': geocode_result['latitude'],
                    'longitude': geocode_result['longitude']
                }
                source = {
                    'input': location_input,
                    'formatted_address': geocode_result['formatted_address'],
                    'type': 'location_name'
                }
                return location, source
            else:
                raise ValueError(
                    f"Could not find coordinates for {location_type} location: '{location_input}'"
                )
        elif isinstance(location_input, dict):
            # It's coordinates
            if 'latitude' not in location_input or 'longitude' not in location_input:
                raise ValueError(f"{location_type}_location must have latitude and longitude")
            return location_input, {'type': 'coordinates'}
        else:
            raise ValueError(
                f"{location_type}_location must be either coordinates object or location name string"
            )
    
    def _find_nearest_stage(self, location):
        """
        Find nearest stage to given location
        
        Args:
            location: Dict with latitude and longitude
        
        Returns:
            Stage dict
        """
        nearest_stage = None
        min_distance = float('inf')
        
        for stage in self.fare_data['stages']:
            if 'coordinates' not in stage:
                continue
            
            dist = haversine_distance(
                location['latitude'],
                location['longitude'],
                stage['coordinates']['latitude'],
                stage['coordinates']['longitude']
            )
            
            if dist < min_distance:
                min_distance = dist
                nearest_stage = stage
        
        if nearest_stage is None:
            raise ValueError("Could not find nearest stages")
        
        return nearest_stage
