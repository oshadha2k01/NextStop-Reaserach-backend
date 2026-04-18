import requests
import json

# Use correct place names from the stops list
payload = {
    "boardingLocation": "SLIIT Campus",
    "destinationLocation": "Rajagiriya (Welikada)",
    "userExpectedTime": 15
}

print("Testing prediction endpoint...")
print(f"Request: {json.dumps(payload, indent=2)}")
print()

try:
    response = requests.post(
        "http://localhost:5000/predict-simple",
        json=payload,
        timeout=10
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    print(json.dumps(response.json(), indent=2))
    
except Exception as e:
    print(f"Error: {e}")
