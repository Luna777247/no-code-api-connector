import requests

url = "https://tripadvisor16.p.rapidapi.com/api/v1/restaurant/searchLocation"

querystring = {"query":"mumbai"}

headers = {
	"x-rapidapi-key": "02ad4fd6f3msh1f0390da51ae627p19a5cfjsn7f2b23cadfdb",
	"x-rapidapi-host": "tripadvisor16.p.rapidapi.com"
}

response = requests.get(url, headers=headers, params=querystring)

print(response.json())