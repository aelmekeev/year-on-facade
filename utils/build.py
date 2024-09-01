import os
import glob
import json
import logging
from datetime import datetime
import pandas as pd

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')

# Define paths
csv_dir = './csv/'
utils_dir = './utils/'
img_dir = './img/_generated/'
site_config_file = 'config.json'
config_file = 'utils/configs.json'
output_dir = './js/_generated/'
temp_json = './utils/temp.json.tmp'
list_js = "./js/_generated/list.js"


# Generate js files for each city
def generate_cities_js_files(site_configs, configs):
  del site_configs["apiKey"] # TODO: remove me after api key is removed from config.json

  # Process each CSV file
  for filepath in glob.glob(os.path.join(csv_dir, '**/*.csv'), recursive=True):
      city = os.path.basename(filepath).replace('.csv', '')

      logging.info(f"Generating {city}.js...")

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


def generate_fake_city(site_configs, city):
    with open(config_file) as f:
        global_configs = json.load(f)

    with open(temp_json) as f:
        data = json.load(f)

    city_config = {}
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


def generate_countries_js_files(site_configs, configs):
  for directory in glob.glob(os.path.join(csv_dir, '*/')):
      country = os.path.basename(os.path.dirname(directory))
      logging.info(f"Generating {country}.js...")

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
      generate_fake_city(site_configs, country)


def generate_world_js_file(site_configs, configs):
  logging.info("Generating world.js...")
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

  generate_fake_city(site_configs, 'World')


def generate_list_js_file():
  # Start writing to list.js
  logging.info("Generating list.js...")
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


def generate_svg(filename, world_view):
    city = os.path.basename(filename).replace('.json.tmp', '')
    
    with open(filename, 'r') as f:
        city_data = json.load(f)

    country = city_data.get('config', {}).get('country', None)
    
    if country:
        key = country
    else:
        key = city
    
    if world_view:
        svg_name = city
        key = "World"
    else:
        svg_name = f"country_{city}"

    logging.info(f"Generating {svg_name}.svg...")

    with open(f"{utils_dir}{key}.json.tmp", 'r') as f:
        key_data = json.load(f)

    points = key_data.get('points', {})
    keys = list(points.keys())

    min_year = min(int(k[:4]) for k in keys) if keys else None
    current_year = datetime.now().year
    height = 35
    width = current_year - min_year if min_year else 2000  # Default to 100 if min_year is None

    svg_file = f"{img_dir}{svg_name}.svg"

    with open(svg_file, 'w') as f:
        f.write(f'<svg viewBox="0 0 {width} {height}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">\n')

        # Draw background range
        city_points = city_data.get('points', {})
        city_keys = list(city_points.keys())

        if city_keys:
            first_year = int(city_keys[0][:4])
            last_year = int(city_keys[-1][:4])
            background_width = last_year - first_year + 1
            background_start = first_year - min_year

            f.write(f'  <rect y="0" x="{background_start}" width="{background_width}" height="{height}" fill="#a3bff4" />\n')

            # Draw each year's rectangle
            for year in city_keys:
                if len(year) == 4:
                    rect_start = int(year) - min_year
                    f.write(f'  <rect y="0" x="{rect_start}" width="1" height="{height}" fill="#c8e3c2" />\n')

        f.write('</svg>\n')


def generate_geoguesser_json():
  # build geoguesser json
  logging.info("Generating World_geogesser.json...")

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
def cleanup():
  temp_files = glob.glob('./utils/*.json.tmp')
  for temp_file in temp_files:
      try:
          os.remove(temp_file)
      except OSError as e:
          logging.info(f"Error removing {temp_file}: {e}")


def main():
  with open(site_config_file) as f:
    site_configs = json.load(f)

  with open(config_file) as f:
    configs = json.load(f)
    
  generate_cities_js_files(site_configs, configs)
  generate_countries_js_files(site_configs, configs)
  generate_world_js_file(site_configs, configs)
  
  generate_list_js_file()
  
  generate_geoguesser_json()
  
  # Generate SVGs for each city
  for filename in glob.glob(f"{utils_dir}*.json.tmp"): # TODO do not rely on tmp files here
      if 'temp.json.tmp' not in filename:
          generate_svg(filename, True)  # World view
          generate_svg(filename, False) # Country view
  
  cleanup()


if __name__ == "__main__":
    main()