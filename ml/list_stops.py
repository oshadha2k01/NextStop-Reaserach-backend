import json

with open('data/main_bus_stops.json', encoding='utf-8') as f:
    data = json.load(f)

stops = data.get('stages', [])
print("Available Bus Stops (Route 177):")
print("=" * 50)
for i, s in enumerate(stops):
    print(f"{i+1:2d}. {s.get('name', 'N/A')}")
