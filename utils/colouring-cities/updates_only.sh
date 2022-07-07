#!/bin/bash

set -euo pipefail

# Step 1. Generate list of years that were already found
already_collected="already_collected.json"
csvcut -c year "../../csv/$1.csv" | tail -n+2 | jq -sR '. | split("\n") | map(select(length > 0))' > $already_collected

# Step 2. Process edit_history.csv

# Remove not required columns
less_columns="edit_history_less_columns.csv"
csvcut -c revision_timestamp,building_id,forward_patch edit_history.csv > $less_columns

# Fix timestamps to sqllite format
sed -i '' -e 's/+00//g' $less_columns

# Keep only rows with the current year revision_timestamp and year changed
only_with_years="edit_history_only_with_years.csv"
grep -e "_year" -e "forward_patch" $less_columns | grep -E "^($(date +%Y)-|revision_timestamp)" > $only_with_years

# Filter only rows after requested date with year change
# Note: this is quite slow, would be nice to find a better alternative
updates="edit_history_updates.csv"
csvsql --query "select printf(\"%d\", building_id) from edit_history_only_with_years where datetime(revision_timestamp) > datetime('$2');" $only_with_years > $updates

# Convert to json
json="edit_history_updates.json"
tail -n+2 $updates | jq -sRr 'split("\n") | map(select(length > 0))' > $json

# Step 3. Process building_attributes.csv

# Remove not required columns
less_columns_attr="building_attributes_less_columns.csv"
csvcut -c building_id,location_latitude,location_longitude,date_year,facade_year building_attributes.csv > $less_columns_attr

# Remove rows without dates and coordinates
only_with_dates_attr="building_attributes_only_with_dates.csv"
grep -E "^[^,]+,[^,]+,[^,]+,.*\d\d\d\d.*" $less_columns_attr > $only_with_dates_attr

# Convert to json with the link to google maps
# note: we are ignoring here items where date_year != facade_year
json_attr="building_attributes.json"
jq -sRr 'split("\n") | map(split(",")) | map(select(length > 0)) | map(select(.[3] == "" or .[4] == "" or .[3] == .[4]) | {"id": .[0], "year": (if .[3] == "" then .[4] else .[3] end), "latlng": ("https://www.google.com/maps/search/" + .[1] + "," + .[2])})' $only_with_dates_attr > $json_attr

# Step 4. Generate final list

# Build the final list
jq -s '.[0] as $ignore | .[1] as $updates | .[2] | map(select(.year as $year | $ignore | index($year) | not)) | map(select(.id as $id | $updates | index($id))) | map({"year": .year, "latlng": .latlng}) | group_by(.year)' $already_collected $json $json_attr > updates_only.json

# Step 5. Cleanup

rm $less_columns $only_with_years $updates $json $less_columns_attr $only_with_dates_attr $json_attr $already_collected