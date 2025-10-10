import os
import requests
from dotenv import load_dotenv

load_dotenv('.env.local')

API_KEY = os.getenv('RAPIDAPI_KEY')
if not API_KEY:
    print('Please set RAPIDAPI_KEY in .env.local')
    raise SystemExit(1)

url = "https://google-map-places-new-v2.p.rapidapi.com/v1/places:searchText"

payload = {
    "textQuery": "restaurants",
    "languageCode": "",
    "regionCode": "",
    "rankPreference": 0,
    "includedType": "",
    "openNow": True,
    "minRating": 0,
    "maxResultCount": 1,
    "priceLevels": [],
    "strictTypeFiltering": True,
    "locationBias": { "circle": {
            "center": {
                "latitude": 40,
                "longitude": -110
            },
            "radius": 10000
        } },
    "evOptions": {
        "minimumChargingRateKw": 0,
        "connectorTypes": []
    }
}

headers = {
    "x-rapidapi-key": API_KEY,
    "x-rapidapi-host": "google-map-places-new-v2.p.rapidapi.com",
    "Content-Type": "application/json",
    "X-Goog-FieldMask": "*"
}

resp = requests.post(url, json=payload, headers=headers, timeout=30)
try:
    print(resp.json())
except Exception:
    print('Non-JSON response:', resp.text)
