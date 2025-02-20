import json
from datetime import datetime


def filter_data(input_file: str, output_file: str):
    with open(input_file, "r") as file, open(output_file, "w") as output_file:
        data = json.load(file)
        features = data["features"]
        filtered_features = []
        max_date = datetime.strptime("2023-04-03", "%Y-%m-%d")

        for feature in features:
            coords = feature["geometry"]["coordinates"]
            if len(coords) < 2:
                print("Invalid line", feature)
                continue

            journeys = feature["properties"]["journey_properties"]
            if type(journeys) is str:
                journeys = json.loads(journeys)

            arr_time = journeys[0]["arr_time"]
            dept_time = journeys[0]["dept_time"]

            if dept_time:
                timestamp = datetime.strptime(dept_time, "%Y-%m-%d %H:%M:%S")
            elif arr_time:
                timestamp = datetime.strptime(arr_time, "%Y-%m-%d %H:%M:%S")
            else:
                print(feature)
                continue

            if timestamp <= max_date:
                filtered_features.append(feature)

        result = {
            "type": "FeatureCollection",
            "features": filtered_features
        }

        json.dump(result, output_file)


# filter_data("services_2023-04.geojson", "filtered_services.geojson")
filter_data("disruption_services_2023-04.geojson", "filtered_disruptions.geojson")
