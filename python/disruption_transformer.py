import csv
import json


def read_disruptions():
    with open("data/disruptions-2023.csv") as file:
        csv_file = csv.DictReader(file)
        data = {}

        for row in csv_file:
            rdt_lines = row["rdt_lines"]
            station_names = row["rdt_station_names"]
            station_codes = row["rdt_station_codes"]
            statistical_cause = row["statistical_cause_en"]
            cause_group = row["cause_group"]
            start_time = row["start_time"]
            end_time = row["end_time"]
            duration = row["duration_minutes"]
            date = start_time[:10]
            disruption = {"rdt_lines": rdt_lines, "station_names": station_names, "station_codes": station_codes,
                          "statistical_cause": statistical_cause,
                          "cause_group": cause_group, "start_time": start_time, "end_time": end_time, "duration": duration}
            if not date:
                continue

            if date in data:
                data[date].append(disruption)
            else:
                data[date] = [disruption]

        return data


def write_transformed(data: dict):
    with open("data/disruptions-transformed.json", "w") as file:
        json.dump(data, file)


if __name__== "__main__":
    disruptions = read_disruptions()
    write_transformed(disruptions)
