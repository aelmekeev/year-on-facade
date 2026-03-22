import os
import glob
import json
import logging
from datetime import datetime
import csv

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
csv_bg_color = "#e5e5e5"  # Neutral light grey for the track


# --- Architectural Color Gradient Logic (V2 - Bright & High Contrast) ---
# Sequential colors to prevent muddy gradients and ensure centuries are distinct
CENTURY_COLORS = {
    1500: (194, 89, 83),  # Tudor Brick (Red)
    1600: (224, 130, 75),  # Amber Terracotta (Orange)
    1700: (232, 196, 79),  # Sandstone Gold (Yellow)
    1800: (152, 201, 87),  # Victorian Garden (Bright Green)
    1900: (75, 179, 169),  # Industrial Patina (Teal)
    2000: (78, 140, 230),  # Modern Glass (Blue)
    2100: (155, 93, 230),  # Future Steel (Violet)
}


def rgb_to_hex(rgb):
    return "#{:02x}{:02x}{:02x}".format(int(rgb[0]), int(rgb[1]), int(rgb[2]))


def get_year_color(year):
    # Clamp the year between 1500 and 2100 for safety
    year = max(1500, min(2100, year))
    century_start = (year // 100) * 100
    century_end = century_start + 100

    if century_start >= 2100:
        return rgb_to_hex(CENTURY_COLORS[2100])

    c1 = CENTURY_COLORS[century_start]
    c2 = CENTURY_COLORS[century_end]

    # Linear interpolation between the two century anchor colors
    factor = (year - century_start) / 100.0
    r = c1[0] + (c2[0] - c1[0]) * factor
    g = c1[1] + (c2[1] - c1[1]) * factor
    b = c1[2] + (c2[2] - c1[2]) * factor

    return rgb_to_hex((r, g, b))


# ------------------------------------------


# Generate js files for each city
def generate_cities_js_files(site_configs):
    with open(config_file) as f:
        configs = json.load(f)

    # Process each CSV file
    for filepath in glob.glob(os.path.join(csv_dir, "**", "*.csv")):
        city = os.path.basename(filepath).replace(".csv", "")

        logging.info(f"Generating {city}.js...")

        # Determine header based on config
        fieldnames = ["year", "latitude", "longitude", "notes"]
        if city in configs and "external" in configs[configs[city]["config"]["country"]]["config"]:
            fieldnames.append("external")

        # Read CSV file using built-in csv module
        data_list = []
        with open(filepath, newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            rows = list(reader)
            # Remove header row if present
            if rows and rows[0]["year"] == "year":
                rows = rows[1:]
            # Fill missing fields with empty string and sort by year
            for row in rows:
                for field in fieldnames:
                    if row.get(field) is None:
                        row[field] = ""
                data_list.append(row)
            data_list.sort(key=lambda x: int(x["year"]))

        # Overwrite CSV file with sorted data (no trailing newline)
        with open(filepath, "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            for i, row in enumerate(data_list):
                writer.writerow(row)
            # Remove trailing newline if present
            csvfile.flush()
            csvfile.seek(0, os.SEEK_END)
            pos = csvfile.tell()
            if pos > 0:
                csvfile.truncate(pos - 1)

        # generate data points
        points = {}
        for record in data_list:
            point_data = {
                "latlng": {"lat": float(record["latitude"]), "lng": float(record["longitude"])},
                "notes": record.get("notes", ""),
            }
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
                city_config["citiesConfig"][key]["config"]["external"] = global_configs[country]["config"].get(
                    "external", None
                )

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


# Generate mappings from year to all associated cities
def generate_years_js_file():
    logging.info("Generating years.js...")
    years_dict = {}

    for filepath in sorted(glob.glob(os.path.join(csv_dir, "**", "*.csv"))):
        city = os.path.basename(filepath).replace(".csv", "")
        with open(filepath, newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                year = row.get("year", "")
                if year and year != "year":
                    if year not in years_dict:
                        years_dict[year] = []
                    if city not in years_dict[year]:
                        years_dict[year].append(city)

    for year in years_dict:
        years_dict[year].sort()

    with open(os.path.join(js_output_dir, "years.js"), "w") as f:
        f.write(f"const yearsData = {json.dumps(years_dict, indent=2, ensure_ascii=False, sort_keys=True)};\n")


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
        f.write(
            f'<svg viewBox="0 0 {width} {csv_height}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">\n'
        )

        # Draw the background
        years = list(data.get("points", {}).keys())
        first_year = int(years[0][:4])
        last_year = int(years[-1][:4])
        background_width = last_year - first_year + 1
        background_start = first_year - min_year

        f.write(
            f'  <rect y="0" x="{background_start}" width="{background_width}" height="{csv_height}" fill="{csv_bg_color}" />\n'
        )

        # Draw each year's rectangle with the new calculated bright color
        for year in years:
            if len(year) == 4:
                rect_start = int(year) - min_year
                fill_color = get_year_color(int(year))
                f.write(f'  <rect y="0" x="{rect_start}" width="1" height="{csv_height}" fill="{fill_color}" />\n')

        f.write("</svg>\n")


# build geoguessr json
def generate_geoguessr_json(name):
    logging.info(f"Generating {name}_geoguessr.json...")

    data = read_js_file(os.path.join(js_output_dir, f"{name}.js"))
    geoguessr_data = [
        {**point["latlng"], "heading": 0, "pitch": 0, "zoom": 1} for point in data.get("points", {}).values()
    ]

    with open(os.path.join(js_output_dir, f"{name}_geoguessr.json"), "w") as f:
        json.dump(geoguessr_data, f, indent=2)


# generates list of *.js files located in /js/routes/ and saves them as a JSON array in /js/_generated/routes.js
def generate_list_of_routes():
    logging.info("Generating routes.js...")

    routes = []
    for filename in glob.glob(os.path.join("js", "routes", "*.js")):
        count = 0
        route_id = os.path.basename(filename).replace(".js", "")
        # extract route name from the file content from the line that starts with '  "name": "'
        # also extra number of points by counting number of lines with "latlng" in the file
        with open(filename) as f:
            for line in f:
                if line.strip().startswith('"name":'):
                    name = line.strip().split('"name":')[1].strip().strip('",')
                if '"latlng"' in line:
                    count += 1
        routes.append({"id": route_id, "name": name, "count": count})

    with open("./js/_generated/routes.js", "w") as f:
        f.write(f"{js_file_prefix}[\n")
        for route in sorted(routes, key=lambda x: x["id"]):
            f.write(f'  {{ "id": "{route["id"]}", "name": "{route["name"]}", "count": {route["count"]} }},\n')
        f.write("]\n")


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
    generate_years_js_file()

    generate_geoguessr_json("World")
    generate_geoguessr_json("UK")

    generate_list_of_routes()


if __name__ == "__main__":
    main()
