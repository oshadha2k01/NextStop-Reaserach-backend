import requests
import json
from datetime import datetime

def fetch_osm_bus_routes():
    print("Fetching bus routes for Sri Lanka from Overpass API...")
    overpass_url = "http://overpass-api.de/api/interpreter"
    
    overpass_query = """
    [out:json][timeout:300];
    area["ISO3166-1"="LK"][admin_level=2]->.searchArea;
    relation["type"="route"]["route"="bus"](area.searchArea);
    out geom;
    """
    
    response = requests.post(overpass_url, data={'data': overpass_query})
    if response.status_code != 200:
        print(f"Error: API returned status code {response.status_code}")
        return None
    return response.json()

def format_to_nextstop_json(osm_data):
    print("Formatting to NextStop JSON...")
    
    routes_list = []
    elements = osm_data.get('elements', [])
    
    for element in elements:
        tags = element.get('tags', {})
        route_number = tags.get('ref', 'Unknown')
        route_name = tags.get('name', 'Unknown Route')
        
        if route_number == 'Unknown' and route_name == 'Unknown Route':
            continue
            
        new_route = {
            "province": "Draft",
            "district": "Draft",
            "route_number": route_number,
            "route_name": route_name,
            "operator": tags.get('operator', 'Unknown'),
            "service_type": "Normal",
            "stages": []
        }
        
        members = element.get('members', [])
        stage_id = 0
        
        for member in members:
            if member.get('type') == 'node' and member.get('role') in ['stop', 'platform']:
                new_stage = {
                    "id": stage_id,
                    "name": "Unknown Stop",
                    "fare_stage": stage_id,
                    "coordinates": {
                        "latitude": member.get('lat'),
                        "longitude": member.get('lon')
                    }
                }
                new_route["stages"].append(new_stage)
                stage_id += 1
                
        if len(new_route["stages"]) > 0:
            routes_list.append(new_route)

    return routes_list

if __name__ == '__main__':
    raw_osm_data = fetch_osm_bus_routes()
    if raw_osm_data:
        final_json = format_to_nextstop_json(raw_osm_data)
        with open('../data/sl_national_routes.json', 'w', encoding='utf-8') as f:
            json.dump(final_json, f, indent=2, ensure_ascii=False)
        print(f"Success! Saved {len(final_json)} routes to data/sl_national_routes.json")
