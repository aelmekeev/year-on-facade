import os
import glob
import json
import logging
from datetime import datetime
import pandas as pd

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s - %(message)s")

# Define paths
csv_dir = "csv"
site_config_file = "site-config.json"
config_file = os.path.join("utils", "configs.json")
img_output_dir = os.path.join("img", "_generated")
js_output_dir = os.path.join("js", "_generated")

js_file_prefix = "const data = "
current_year = datetime.now().year
default_min_year = 2000
csv_height = 35
csv_bg_color = "#a3bff4"
csv_color = "#c8e3c2"


# Generate js files for each city
def generate_cities_js_files(site_configs):
    with open(config_file) as f:
        configs = json.load(f)

    # Process each CSV file
    for filepath in glob.glob(os.path.join(csv_dir, "**", "*.csv")):
        city = os.path.basename(filepath).replace(".csv", "")

        logging.info(f"Generating {city}.js...")

        # Determine header based on config
        dftypes = {"year": "int", "latitude": "string", "longitude": "string", "notes": "string"}
        if city in configs and "external" in configs[configs[city]["config"]["country"]]["config"]:
            dftypes["external"] = "string"

        # Load and sort the CSV file, preserving the header
        df = pd.read_csv(filepath, dtype=dftypes)
        df = df.fillna("")
        df = df.sort_values(by="year")
        df.to_csv(filepath, index=False)

        # Delete last \n in the file as pandas adds it
        with open(filepath, "rb+") as filehandle:
            filehandle.seek(-1, os.SEEK_END)
            filehandle.truncate()

        # generate data points
        data_list = df.to_dict(orient="records")
        points = {}
        for record in data_list:
            point_data = {"latlng": {"lat": float(record["latitude"]), "lng": float(record["longitude"])}, "notes": record.get("notes", "")}
            # Conditionally add 'external' only if it exists in the record
            if "external" in record:
                point_data["external"] = str(record["external"])

            points[record["year"]] = point_data

        country = configs[city]["config"]["country"]
        country_external = configs.get(country, {}).get("config", {}).get("external", None)

        # build an object
        city_config = {}
        city_config["config"] = {}
        city_config["config"].update(configs[city]["config"])
        if country_external:
            city_config["config"]["external"] = country_external
        city_config["config"].update(site_configs)
        city_config["config"]["city"] = city
        city_config["points"] = points

        with open(os.path.join(js_output_dir, f"{city}.js"), "w") as f:
            f.write(f"{js_file_prefix}{json.dumps(city_config, indent=2, ensure_ascii=False)}\n")


# Read a js file and return the data
def read_js_file(js_file):
    with open(js_file) as f:
        content = f.read()[len(js_file_prefix) :]
        data = json.loads(content)
    return data


# Decide which point to keep
def choose_point(points, prioritize_world=False):
    chosen_point = points[0]
    for point in points:
        # return first non-UK point
        if prioritize_world and point["country"] != "UK":
            chosen_point = point
            break
        # return first visited external point
        elif "external" in point and point["notes"] != "TODO":
            chosen_point = point
            break
        # prefer visited
        elif point["notes"] != "TODO" and chosen_point["notes"] == "TODO":
            chosen_point = point
        # prefer external
        elif "external" in point and "external" not in chosen_point:
            chosen_point = point
    del chosen_point["country"]
    return chosen_point


# Extract points from a set of js files
def extract_points_from_js_files(js_files, prioritize_world=False):
    points = {}
    for js_file in js_files:
        data = read_js_file(js_file)
        country = data.get("config", {}).get("country")
        city = data.get("config", {}).get("city")
        if city and "points" in data:
            for point_key, point_value in data["points"].items():
                point_value["city"] = city
                point_value["country"] = country
                point_value = {k: point_value[k] for k in sorted(point_value)}
                if point_key not in points:
                    points[point_key] = [point_value]
                else:
                    points[point_key].append(point_value)

    combined_points = {}
    for year, points in points.items():
        combined_points[year] = choose_point(points, prioritize_world)

    return {k: combined_points[k] for k in sorted(combined_points)}


# Generate json file with the name from the points provided
def generate_js_file(site_configs, name, points):
    with open(config_file) as f:
        global_configs = json.load(f)

    city_config = {}
    # Merge global configs with city-specific configs
    city_config["config"] = global_configs[name]["config"].copy()
    # add site_config_file to city_config['config']
    city_config["config"].update(site_configs)
    city_config["points"] = points

    if name == "World":
        city_config["citiesConfig"] = global_configs
        for key in city_config["citiesConfig"].keys():
            if "borders" in city_config["citiesConfig"][key]["config"]:
                del city_config["citiesConfig"][key]["config"]["borders"]
            if "country" in city_config["citiesConfig"][key]["config"]:
                country = city_config["citiesConfig"][key]["config"]["country"]
                city_config["citiesConfig"][key]["config"]["external"] = global_configs[country]["config"].get("external", None)

    # Write the final JavaScript file
    with open(os.path.join(js_output_dir, f"{name}.js"), "w") as f:
        f.write(f"{js_file_prefix}{json.dumps(city_config, indent=2, ensure_ascii=False)}\n")


# Generate js files for each country
def generate_countries_js_files(site_configs):
    for directory in glob.glob(os.path.join(csv_dir, "*/")):
        country = os.path.basename(os.path.dirname(directory))
        logging.info(f"Generating {country}.js...")

        js_files = []
        for filepath in sorted(glob.glob(os.path.join(directory, "*")), key=os.path.getsize):
            city = os.path.basename(filepath).replace(".csv", "")
            js_files.append(os.path.join(js_output_dir, f"{city}.js"))

        points = extract_points_from_js_files(js_files)
        generate_js_file(site_configs, country, points)


# Generate js file for the world
def generate_world_js_file(site_configs):
    logging.info("Generating world.js...")
    js_files = []
    for filepath in sorted(glob.glob(os.path.join(js_output_dir, "*js")), key=os.path.getsize):
        js_files.append(filepath)

    points = extract_points_from_js_files(js_files, True)
    generate_js_file(site_configs, "World", points)


# Generate js file for the list
def generate_list_js_file():
    logging.info("Generating list.js...")

    with open("./js/_generated/list.js", "w") as f:
        f.write(f"{js_file_prefix}[\n")

        for filename in sorted(glob.glob(os.path.join(js_output_dir, "*js"))):
            name = os.path.basename(filename).replace(".js", "")

            if name == "list":
                continue

            data = read_js_file(filename)
            country = data.get("config", {}).get("country", "null")
            years = list(data.get("points", {}).keys())

            # Extract minimum year and count of valid entries
            min_year = min([year[:4] for year in years]) if years else None
            count = sum(1 for year in years if len(year) == 4)

            # Write the data to the list.js file
            f.write(f'  {{name: "{name}", country: "{country}", count: {count}, minYear: {min_year}}},\n')

        # End the data array
        f.write("]\n")


# Generate SVG files for each city or country
def generate_svg(filename, world_view):
    name = os.path.basename(filename).replace(".js", "")
    svg_name = name if world_view else f"country_{name}"

    logging.info(f"Generating {svg_name}.svg...")

    data = read_js_file(filename)

    country = data.get("config", {}).get("country", None)
    parent = "World" if world_view else country or name

    parent_data = read_js_file(os.path.join(js_output_dir, f"{parent}.js"))
    parent_years = list(parent_data.get("points", {}).keys())

    min_year = min(int(year[:4]) for year in parent_years) if parent_years else None
    width = current_year - min_year if min_year else default_min_year

    svg_file = os.path.join(img_output_dir, f"{svg_name}.svg")
    with open(svg_file, "w") as f:
        f.write(f'<svg viewBox="0 0 {width} {csv_height}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">\n')

        # Draw the background
        years = list(data.get("points", {}).keys())
        first_year = int(years[0][:4])
        last_year = int(years[-1][:4])
        background_width = last_year - first_year + 1
        background_start = first_year - min_year

        f.write(f'  <rect y="0" x="{background_start}" width="{background_width}" height="{csv_height}" fill="{csv_bg_color}" />\n')

        # Draw each year's rectangle
        for year in years:
            if len(year) == 4:
                rect_start = int(year) - min_year
                f.write(f'  <rect y="0" x="{rect_start}" width="1" height="{csv_height}" fill="{csv_color}" />\n')

        f.write("</svg>\n")


# build geoguesser json
def generate_geoguesser_json():
    logging.info("Generating World_geogesser.json...")

    world_data = read_js_file(os.path.join(js_output_dir, "World.js"))
    geoguesser_data = [{**point["latlng"], "heading": 0, "pitch": 0, "zoom": 1} for point in world_data.get("points", {}).values()]

    with open(os.path.join(js_output_dir, "World_geogesser.json"), "w") as f:
        json.dump(geoguesser_data, f, indent=2)


# Remove all generated files
def cleanup():
    for file in glob.glob(os.path.join(js_output_dir, "*.js")):
        os.remove(file)
    for file in glob.glob(os.path.join(img_output_dir, "*.svg")):
        os.remove(file)


def main():
    cleanup()

    with open(site_config_file) as f:
        site_configs = json.load(f)

    generate_cities_js_files(site_configs)
    generate_world_js_file(site_configs)
    generate_countries_js_files(site_configs)

    for filename in glob.glob(os.path.join(js_output_dir, "*js")):
        generate_svg(filename, True)  # World view
        generate_svg(filename, False)  # Country view

    generate_list_js_file()

    generate_geoguesser_json()


if __name__ == "__main__":
    main()
