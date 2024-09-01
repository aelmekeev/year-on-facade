import os
import glob
import json
import csv

errors = []

# Check for duplicates in CSV files
def check_for_duplicates(csv_file):
    with open(csv_file, 'r') as f:
        reader = csv.reader(f)
        next(reader)  # Skip the header
        points = [row[0] for row in reader]
        unique_points = set(points)
        if len(points) != len(unique_points):
            errors.append(f"{csv_file} contains duplicates")

# Validates that coordinates are within borders
def validate_coordinates_within_borders(filename):
    with open(filename, 'r') as f:
        data = json.loads(f.read().replace('const data = ', ''))

    borders = data.get('config', {}).get('borders', {})
    
    min_lat = borders['south']
    max_lat = borders['north']
    min_lng = borders['west']
    max_lng = borders['east']

    for point in data['points'].values():
        lat = point['latlng']['lat']
        lng = point['latlng']['lng']

        if not (min_lat < lat < max_lat and min_lng < lng < max_lng):
            errors.append(f"{city}.csv has coordinates outside of config specified in utils/configs.json.")

# Step 1: Check for duplicates in CSV files
for filename in glob.glob('./csv/**/*.csv'):
    check_for_duplicates(filename)

# Step 2: Validate coordinates within borders
for filename in glob.glob('./js/_generated/*.js'):
    city = os.path.basename(filename).replace('.js', '')
    if city not in ["list", "World"]:
        validate_coordinates_within_borders(filename)

if errors:
    for error in errors:
        print(f"ERROR: {error}")
    exit(1)
else:
    print("All data seems to be valid.")
