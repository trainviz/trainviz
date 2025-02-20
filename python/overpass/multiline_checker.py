import json


with open("data/segments.geojson") as file:
    json_file = json.load(file)
    for feature in json_file["features"]:
        coordinates = feature["geometry"]["coordinates"]
        if len(coordinates) > 1:
            print("Contains multiple geometries")
            break

    print("Contains single geometries")

