import json
from collections import defaultdict

# Load dataset from JSON file
with open("data/disrupted_lines.json", "r") as file:
    disruptions = json.load(file)

# Define all possible categories
all_categories = {"infrastructure", "external", "rolling stock", "accidents", "weather", "unknown", "engineering work", "logistical", "staff"}  # Add more if needed

# Dictionary to store disruptions by date
disruptions_by_date = defaultdict(lambda: defaultdict(int))

# Process each disruption
for disruption in disruptions:
    date = disruption["start_time"].split(" ")[0]  # Extract date (YYYY-MM-DD)
    cause_group = disruption["cause_group"].strip().lower()  # Normalize cause name

    disruptions_by_date[date][cause_group] += 1  # Count occurrences

# Convert dictionary to required format, ensuring all categories exist
output_data = []
for date, data in sorted(disruptions_by_date.items()):
    complete_data = {category: data.get(category, 0) for category in all_categories}
    complete_data["date"] = date
    output_data.append(complete_data)

# Write output JSON
with open("data/summary.json", "w") as outfile:
    json.dump(output_data, outfile, indent=4)

print("JSON file 'summary.json' created successfully!")
