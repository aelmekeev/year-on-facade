#!/bin/bash

set -euo pipefail

# Step 1. Generate list of years that were already found

# Generate list of years that were already found
already_collected="already_collected.json"
csvcut -c year "../../csv/${1:-London}.csv" | tail -n+2 | jq -sR '. | split("\n") | map(select(length > 0))' > $already_collected

# Step 2. Process building_attributes.csv

# Remove not required columns
less_columns="building_attributes_less_columns.csv"
csvcut -c location_latitude,location_longitude,date_year,facade_year building_attributes.csv > $less_columns

# Remove rows without dates and coordinates
only_with_dates="building_attributes_only_with_dates.csv"
grep -E "^[^,]+,[^,]+,.*\d\d\d\d.*" $less_columns > $only_with_dates

# Convert to json with the link to google maps
# note: we are ignoring here items where date_year != facade_year
json="building_attributes.json"
jq -sRr 'split("\n") | map(split(",")) | map(select(length > 0)) | map(select(.[2] == "" or .[3] == "" or .[2] == .[3]) | {"year": (if .[2] == "" then .[3] else .[2] end), "latlng": ("https://www.google.com/maps/search/" + .[0] + "," + .[1])})' $only_with_dates > $json

# Step 3. Generate final list

# Build the final list
jq -s '.[0] as $ignore | .[1] | map(select(.year as $year | $ignore | index($year) | not)) | group_by(.year)' $already_collected $json > initial_review.json

# Step 4. Cleanup

rm $less_columns $only_with_dates $json $already_collected