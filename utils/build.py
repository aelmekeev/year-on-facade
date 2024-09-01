import os
import glob
import json
import pandas as pd

# Define paths
csv_dir = './csv/'
utils_dir = './utils/'
site_config_file = 'config.json'
config_file = 'utils/configs.json'
output_dir = './js/_generated/'
temp_json = './utils/temp.json.tmp'
list_js = "./js/_generated/list.js"

# Ensure output directories exist
os.makedirs(output_dir, exist_ok=True)

# Load configurations
with open(config_file) as f:
    configs = json.load(f)

with open(site_config_file) as f:
    site_configs = json.load(f)
    del site_configs["apiKey"]

# Process each CSV file
for filepath in glob.glob(os.path.join(csv_dir, '**/*.csv'), recursive=True):
    city = os.path.basename(filepath).replace('.csv', '')

    print(f"Generating {city}.js...")

    # Determine header based on config
    dftypes = {'year': 'int', 'latitude': 'string', 'longitude': 'string', 'notes': 'string'}
    if city in configs and "external" in configs[configs[city]["config"]["country"]]["config"]:
        dftypes["external"] = 'string'

    # Load and sort the CSV file, preserving the header
    df = pd.read_csv(filepath, dtype=dftypes)
    df = df.fillna('')
    df = df.sort_values(by='year')
    df.to_csv(filepath, index=False)

    # Delete last \n in the file as pandas adds it
    with open(filepath, 'rb+') as filehandle:
        filehandle.seek(-1, os.SEEK_END)
        filehandle.truncate()

    # Generate temporary JSON files for each city
    # check if column external exists in df
    data_list = df.to_dict(orient='records')
    points = {}

    for record in data_list:
        point_data = {
            "latlng": {"lat": float(record["latitude"]), "lng": float(record["longitude"])},
            "notes": record.get("notes", "")
        }

        # Conditionally add 'external' only if it exists in the record
        if "external" in record:
            point_data["external"] = str(record["external"])

        points[record["year"]] = point_data

    city_data = {city: {"points": points}}
    with open(temp_json, 'w') as f:
        json.dump(city_data, f, indent=2)

    # Process and merge JSON data
    with open(config_file) as f:
        global_configs = json.load(f)

    country = configs[city]["config"]["country"]
    country_external = configs.get(country, {}).get("config", {}).get("external", None)

    with open(temp_json) as f:
        city_data = json.load(f)

    # Merging configurations
    city_config = {}
    city_config["config"] = {}
    city_config["config"].update(global_configs[city]["config"])
    if country_external:
        city_config["config"]["external"] = country_external
    city_config["config"].update(site_configs)
    city_config["config"]["city"] = city
    city_config["points"] = city_data[city]["points"]

    # Write to temporary city JSON file
    city_temp_json = f'./utils/{city}.json.tmp'
    with open(city_temp_json, 'w') as f:
        json.dump(city_config, f, indent=2)

    # Write the final JavaScript file
    with open(os.path.join(output_dir, f'{city}.js'), 'w') as f:
        f.write(f'const data = {json.dumps(city_config, indent=2, ensure_ascii=False)}\n')


def generate_fake_city(city):
    with open(config_file) as f:
        global_configs = json.load(f)

    with open(temp_json) as f:
        data = json.load(f)

    # Merge global configs with city-specific configs
    city_config['config'] = global_configs[city]['config'].copy()
    # add site_config_file to city_config['config']
    city_config['config'].update(site_configs)
    city_config['points'] = data['points']
    city_config['citiesConfig'] = global_configs

    for key in city_config['citiesConfig'].keys():
      if 'borders' in city_config['citiesConfig'][key]['config']:
          del city_config['citiesConfig'][key]['config']['borders']
      if 'country' in city_config['citiesConfig'][key]['config']:
          country = city_config['citiesConfig'][key]['config']['country']
          city_config['citiesConfig'][key]['config']['external'] = global_configs[country]['config'].get('external', None)

    # Write to temporary city JSON file
    city_temp_json = f'./utils/{city}.json.tmp'
    with open(city_temp_json, 'w') as f:
        json.dump(city_config, f, indent=2)

    # Write the final JavaScript file
    with open(os.path.join(output_dir, f'{city}.js'), 'w') as f:
        f.write(f'const data = {json.dumps(city_config, indent=2, ensure_ascii=False)}\n')

# Generate world.js TODO: can combine with country.js
print("Generating world.js...")
json_files = []
for filepath in sorted(glob.glob(os.path.join(utils_dir, '*tmp')), key=os.path.getsize, reverse=True):
    json_files.append(filepath)

points = []
for json_file in json_files:
    with open(json_file) as f:
        data = json.load(f)
        city = data.get('config', {}).get('city')
        if city and 'points' in data:
            for point_key, point_value in data['points'].items():
                point_value['city'] = city
                points.append({point_key: point_value})

# Combine all points and create the world JSON
combined_points = {k: v for point in points for k, v in point.items()}
world_data = {"points": combined_points}

with open(temp_json, 'w') as f:
    json.dump(world_data, f, indent=2, sort_keys=True)

generate_fake_city('World')

# Generate <country>.js
for directory in glob.glob(os.path.join(csv_dir, '*/')):
    country = os.path.basename(os.path.dirname(directory))
    print(f"Generating {country}.js...")

    # List all the files and process them
    json_files = []
    for filepath in sorted(glob.glob(os.path.join(directory, '*')), key=os.path.getsize, reverse=True):
        json_temp_file = filepath.replace(f'csv/{country}', 'utils').replace('.csv', '.json.tmp')
        json_files.append(json_temp_file)

    points = []
    for json_file in json_files:
        with open(json_file) as f:
            data = json.load(f)
            city = data.get('config', {}).get('city')
            if city and 'points' in data:
                for point_key, point_value in data['points'].items():
                    point_value['city'] = city
                    points.append({point_key: point_value})

    # Combine all points and create the country-specific JSON
    combined_points = {k: v for point in points for k, v in point.items()}
    country_data = {"points": combined_points}

    # Write temporary JSON to file
    with open(temp_json, 'w') as f:
        json.dump(country_data, f, indent=2, sort_keys=True)

    # Generate the fake city file
    generate_fake_city(country)

# Start writing to list.js
print("Generating list.js...")
with open(list_js, 'w') as f:
    f.write("const data = [\n")

    # Process each JSON.tmp file in the utils directory, except temp.json.tmp
    for filename in sorted(glob.glob("utils/*.json.tmp")):
        if 'temp.json.tmp' in filename:
            continue

        # Extract the base name (without the .json.tmp extension)
        name = os.path.basename(filename).replace('.json.tmp', '')

        # Load the JSON data
        with open(filename, 'r') as json_file:
            data = json.load(json_file)

        # Extract required fields from the JSON data
        country = data.get('config', {}).get('country', 'null')
        points = data.get('points', {})
        keys = list(points.keys())

        # Extract minimum year and count of valid entries
        min_year = min([key[:4] for key in keys]) if keys else None
        count = sum(1 for key in keys if len(key) == 4)

        # Write the data to the list.js file
        f.write(f'  {{name: "{name}", country: "{country}", count: {count}, minYear: {min_year}}},\n')

    # End the data array
    f.write("]\n")

# build geoguesser json
print("Generating World_geogesser.json...")

# Path to the input and output files
world_js_path = "./js/_generated/World.js"
world_geoguesser_json_path = "./js/_generated/World_geogesser.json"

# Read the contents of World.js, removing the first 13 characters
with open(world_js_path, 'r') as f:
    content = f.read()[13:]  # Remove the first 13 characters

# Parse the remaining content as JSON
world_data = json.loads(content)

# Extract the 'points' dictionary, map each entry to include latlng, heading, pitch, and zoom
geoguesser_data = [
    {**point['latlng'], 'heading': 0, 'pitch': 0, 'zoom': 1}
    for point in world_data.get('points', {}).values()
]

# Write the resulting list to World_geogesser.json with an empty line at the end
with open(world_geoguesser_json_path, 'w') as f:
    json.dump(geoguesser_data, f, indent=2)
    f.write('\n')

# Cleanup temporary .json.tmp files
temp_files = glob.glob('./utils/*.json.tmp')
for temp_file in temp_files:
    try:
        os.remove(temp_file)
    except OSError as e:
        print(f"Error removing {temp_file}: {e}")
