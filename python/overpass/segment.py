import json
import shapefile


def read_stops():
    stops = {}

    with open("data/stops.geojson") as file:
        json_file = json.load(file)
        for feature in json_file["features"]:
            stop_name = feature["properties"]["name"]
            coords = feature["geometry"]["coordinates"]
            coord_id = f"{coords[0]},{coords[1]}"
            stops[coord_id] = stop_name

        return stops


def get_line_features():
    with open("data/railway_lines.geojson") as file:
        json_file = json.load(file)
        features = json_file["features"]
    return features


def segment(features: list, stops: dict):
    filename = "segments"
    with shapefile.Writer(f"output/{filename}", type=shapefile.POLYLINE) as shp:
        shp.field("rel_id", "N")
        shp.field("name", "C", 250)
        shp.field("from", "C", 250)
        shp.field("to", "C", 250)

        for feature in features:
            rel_id = int(feature["properties"]["rel_id"])
            name = feature["properties"]["name"]
            start_station = feature["properties"]["from"]
            coords = feature["geometry"]["coordinates"]

            from_stop = start_station
            segment_coords = []
            route_stops = set()

            line_coords: list = coords[0]
            first_point = line_coords.pop(0)
            segment_coords.append((first_point[0], first_point[1]))
            for point in line_coords:
                x, y = point
                segment_coords.append((x, y))
                coord_id = f"{x},{y}"
                if coord_id not in stops:
                    continue

                to_stop = stops[coord_id]
                if to_stop in route_stops:
                    continue

                shp.line([segment_coords])
                shp.record(rel_id, name, from_stop, to_stop)
                segment_coords = [point]
                from_stop = to_stop
                route_stops.add(to_stop)


    with open(f"output/{filename}.prj", "w") as prj_file:
        prj_file.write('GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]')


def main():
    features = get_line_features()
    stops = read_stops()
    segment(features, stops)



if __name__ == "__main__":
    main()