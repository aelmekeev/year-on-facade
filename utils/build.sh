#!/bin/bash

set -euo pipefail

temp=./utils/temp.json.tmp
min_year="2000"

# generate js files for each city
for filename in ./csv/*.csv; do
  city=$(basename "$filename" .csv)

  # sort
  header="year,latitude,longitude,notes"
  if $(jq ".[\"$city\"].config | has(\"external\")" utils/configs.json); then
    header="$header,external"
  fi
  echo -ne "$header\n$(tail -n +2 $filename | sort)" >$filename

  # get first year and compare it with minimum among all cities
  first_year=$(cat $filename | sed -n 2p | cut -d ',' -f 1)
  min_year=$([ "$first_year" \< "$min_year" ] && echo "$first_year" || echo "$min_year")

  # generate temporary json files for each city
  cat "./csv/$city.csv" | jq -sRr "split(\"\\n\") | .[1:] | map(split(\",\")) | map({(.[0]): {latlng: {lat: .[1]|tonumber, lng: .[2]|tonumber}, notes: .[3], external: .[4]} }) | add as \$points | {\"$city\": {\"points\": \$points}} | del(..|nulls)" >$temp
  jq -s "(.[0] | del(.apiKey)) as \$globalConfigs | .[1] * .[2] | {\"$city\": .[\"$city\"]} | .[\"$city\"].config += \$globalConfigs | .[\"$city\"].config.city = \"$city\"" config.json ./utils/configs.json $temp >"./utils/$city.json.tmp"

  cat >"./js/_generated/$city.js" <<EOF
const data = $(cat ./utils/$city.json.tmp | jq ".[\"$city\"]")
EOF
done

function generateFakeCity {
  city=$1
  jq -s "(.[1] | with_entries(.value.config |= del(.zoom, .borders, .center))) as \$citiesConfigs |
  (.[0] | del(.apiKey)) as \$globalConfigs |
  .[1] * .[2] | {\"$city\": .[\"$city\"]} |
  .[\"$city\"].config += \$globalConfigs |
  .[\"$city\"].citiesConfig = \$citiesConfigs" config.json ./utils/configs.json $temp >"./utils/$city.json.tmp"

  cat >"./js/_generated/$city.js" <<EOF
const data = $(cat ./utils/$city.json.tmp | jq ".[\"$city\"]")
EOF
}

#generate world.js
jq -s --sort-keys '{"World": {"points": [.[] | ..? | .config.city as $city | .points // empty | with_entries(.value += {"city": $city})] | add }}' $(ls -SA1 utils/*tmp | grep -v temp.json.tmp) >$temp
generateFakeCity "World"

#generate todo.js
jq -s --sort-keys '{"TODO": {"points": [.[] | ..? | .config.city as $city | .points // empty | with_entries(.value += {"city": $city}) | with_entries(select(.value.notes | contains("TODO")))] | add }}' $(ls -SA1 utils/*tmp | grep -v temp.json.tmp) >$temp
generateFakeCity "TODO"

# generate list.js
list_js="./js/_generated/list.js"
echo "const data = {" >$list_js
for filename in $(ls -A1 utils/*tmp | grep -v temp.json.tmp); do
  city=$(basename "$filename" .json.tmp)

  city_with_country=$(jq -r "[[\"$city\", .$city.config.country][] | strings ] | join(\", \")" $filename)
  echo "  \"$city_with_country\": $(jq -r ".$city.points | keys | length" $filename)," >>$list_js
done
echo "}" >>$list_js
echo "const minYear = $min_year;" >>$list_js

# generate svg files for each city
current_year=$(date +%Y)
height=35
width=$(($current_year - $min_year))
for filename in $(ls -A1 utils/*tmp | grep -v temp.json.tmp); do
  city=$(basename "$filename" .json.tmp)
  svg_file="./img/_generated/$city.svg"

  cat >$svg_file <<EOF
<svg viewBox="0 0 $width $height" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
EOF

  # draw range
  first_year=$(jq -r ".$city.points | keys | first" $filename)
  last_year=$(jq -r ".$city.points | keys | last" $filename)
  background_width=$(($last_year - $first_year + 1))
  background_start=$(($first_year - $min_year))

  cat >>$svg_file <<EOF
  <rect y="0" x="$background_start" width="$background_width" height="$height" fill="#a3bff4" />
EOF

  for year in $(jq -r ".$city.points | keys | .[]" $filename); do
    rect_start=$(($year - $min_year))
    cat >>$svg_file <<EOF
  <rect y="0" x="$rect_start" width="1" height="$height" fill="#c8e3c2" />
EOF
  done

  echo "</svg>" >>$svg_file
done

# update api key
api_key=$(jq -r '.apiKey' config.json)
cat ./map/index.html | sed -E "s/key=[^&]+/key=$api_key/g" >./utils/index.html.tmp
mv ./utils/index.html.tmp ./map/index.html

rm ./utils/*.tmp
