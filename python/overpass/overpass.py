import json
import shapefile


nodes = {}
ways = {}
relations = {}

def get_data(elements):
    node_count = 0
    way_count = 0
    relation_count = 0
    for element in elements:
        element_id = element["id"]
        tags = element["tags"] if "tags" in element else None

        if element["type"] == "node":
            nodes[element_id] = {"lat": element["lat"], "lon": element["lon"], "tags": tags}
            node_count += 1

        elif element["type"] == "way":
            ways[element_id] = {"nodes": element["nodes"], "tags": tags}
            way_count += 1

        elif element["type"] == "relation":
            relations[element_id] = {"members": element["members"], "tags": tags}
            relation_count += 1

    print(node_count, way_count, relation_count)
    print(len(nodes.keys()), len(ways.keys()), len(relations.keys()))


def get_way_coords(way_id: str):
    coords = []
    way = ways[way_id]
    for node_id in way["nodes"]:
        node = nodes[node_id]
        coords.append((node["lon"], node["lat"]))
    return coords


def get_line(members: list):
    line_coords = []
    for member in members:
        if member["type"] == "way" and member["role"] == "":
            way_id = member["ref"]
            way_coords = get_way_coords(way_id)
            line_coords.append(way_coords)
    return line_coords


def write_lines():
    filename = "line"
    with shapefile.Writer(f"output/{filename}", shapeType=shapefile.POLYLINE) as shp:
        shp.field("rel_id", "N")
        shp.field("name", "C", 250)
        shp.field("from", "C", 250)
        shp.field("to", "C", 250)

        for relation_id, relation in relations.items():
            line = get_line(relation["members"])
            tags = relation["tags"]
            name, from_station, to_station = None, None, None
            if tags:
                name = tags["name"]
                from_station = tags["from"] if "from" in tags else None
                to_station = tags["to"] if "to" in tags else None

            shp.line(line)
            shp.record(relation_id, name, from_station, to_station)

    with open(f"output/{filename}.prj", "w") as prj_file:
        prj_file.write('GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]')


def write_stops():
    filename = "stops"
    written_stops = set()
    with shapefile.Writer(f"output/{filename}", shapeType=shapefile.POINT) as shp:
        shp.field("node_id", "N")
        shp.field("name", "C", 250)

        for relation_id, relation in relations.items():
            for member in relation["members"]:
                if member["type"] == "node" and member["role"] == "stop":
                    node_id = member["ref"]
                    node = nodes[node_id]
                    name = None

                    if node_id in written_stops:
                        continue

                    if node["tags"] and "name" in node["tags"]:
                        name = node["tags"]["name"]

                    shp.point(node["lon"], node["lat"])
                    shp.record(node_id, name)
                    written_stops.add(node_id)

    with open(f"output/{filename}.prj", "w") as prj_file:
        prj_file.write('GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]')


def main():
    with open("data/response.json", "r") as file:
        json_data = json.load(file)
        elements = json_data["elements"]
        get_data(elements)
        print("Data extracted")
        # print(json.dumps(relations, indent=2))

    write_lines()
    write_stops()


if __name__ == "__main__":
    main()