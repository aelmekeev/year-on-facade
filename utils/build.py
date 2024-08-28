import os
import glob
import json
import pandas as pd

# Define paths
csv_dir = './csv/'
site_config_file = 'config.json'
config_file = 'utils/configs.json'
output_dir = './js/_generated/'
temp_json = './utils/temp.json.tmp'

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
        json.dump({city: city_config}, f, indent=2)

    # Write the final JavaScript file
    with open(os.path.join(output_dir, f'{city}.js'), 'w') as f:
        f.write(f'const data = {json.dumps(city_config, indent=2, ensure_ascii=False)}\n')

# Cleanup temporary .json.tmp files
temp_files = glob.glob('./utils/*.json.tmp')
for temp_file in temp_files:
    try:
        os.remove(temp_file)
    except OSError as e:
        print(f"Error removing {temp_file}: {e}")
