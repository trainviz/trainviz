import json
import os
from geojson import Feature, LineString


def join(data):
    features = data["features"]
    properties = features[0]["properties"]
    rel_id = properties["rel_id"]
    name = properties["name"]
    from_station = properties["from"]
    to_station = properties["to"]
    coords = []

    if "segment_id" in properties:
        features = sorted(features, key=lambda feature: feature["properties"]["segment_id"])

    for feature in features:
        coords.extend(feature["geometry"]["coordinates"])

    linestring = LineString(coords, precision=12)
    line_feature = Feature(geometry=linestring,
                           properties={"rel_id": rel_id, "name": name, "from": from_station, "to": to_station})

    return line_feature


def main():
    files = os.listdir("data/lines")
    for filename in files:
        with open(f"data/lines/{filename}") as file, open(f"data/joint_lines/{filename}", "w") as out_file:
            json_file = json.load(file)
            line = join(json_file)
            json.dump(line, out_file)


if __name__ == "__main__":
    main()