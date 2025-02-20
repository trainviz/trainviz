import json


def get_stations():
    with open("data/stops.geojson") as file:
        data = json.load(file)
        stations = set()
        for feature in data["features"]:
            station = feature["properties"]["name"]
            stations.add(station)

        return stations


def validate(stations: set):
    with open("data/disrupted_lines.json") as file:
        data = json.load(file)
        unmatched_stations = set()

        for disruption in data:
            if not disruption["rdt_lines"]:
                continue

            rdt_lines = disruption["rdt_lines"].split(" - ")
            from_station = rdt_lines[0].strip()
            to_station = rdt_lines[1].strip()

            if from_station not in stations:
                unmatched_stations.add(from_station)

            if to_station not in stations:
                unmatched_stations.add(to_station)

        return unmatched_stations


def main():
    stations =  get_stations()
    unmatched_stations = validate(stations)
    print("Total unmatched:", len(unmatched_stations))
    for station in unmatched_stations:
        print(station)


if __name__ == "__main__":
    main()