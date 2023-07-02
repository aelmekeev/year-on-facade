#!/bin/bash

set -euo pipefail

temp=./utils/temp.json.tmp
min_year="2000"

rm -rf ./js/_generated/*

# generate js files for each city
for filename in ./csv/**/*.csv; do
  city=$(basename "$filename" .csv)

  echo "Generating $city.js..."

  # sort
  header="year,latitude,longitude,notes"
  if $(jq ".[.[\"$city\"].config.country].config | has(\"external\")" utils/configs.json); then
    header="$header,external"
  fi
  echo -ne "$header\n$(tail -n +2 $filename | sort)" >$filename

  # generate temporary json files for each city
  cat $filename | jq -sRr "split(\"\\n\") | .[1:] | map(split(\",\")) | map({(.[0]): {latlng: {lat: .[1]|tonumber, lng: .[2]|tonumber}, notes: .[3], external: .[4]} }) | add as \$points | {\"$city\": {\"points\": \$points}} | del(..|nulls)" >$temp
  jq -s "(.[0] | del(.apiKey)) as \$globalConfigs |
    (.[1][.[1][\"$city\"].config.country].config.external) as \$countryExternal |
    .[1] * .[2] |
    {\"$city\": .[\"$city\"]} |
    .[\"$city\"].config += if \$countryExternal then {external: \$countryExternal} else {} end |
    .[\"$city\"].config += \$globalConfigs |
    .[\"$city\"].config.city = \"$city\"" \
    config.json ./utils/configs.json $temp >"./utils/$city.json.tmp"

  cat >"./js/_generated/$city.js" <<EOF
const data = $(cat ./utils/$city.json.tmp | jq ".[\"$city\"]")
EOF
done

function generateFakeCity {
  city=$1
  jq -s "(.[1] as \$config |
    .[1] | with_entries(.value.config |= del(.zoom, .borders, .center)) |
    with_entries(.value.config += if .value.config.country then {external: \$config[.value.config.country].config.external} else {} end)) as \$citiesConfigs |
    (.[0] | del(.apiKey)) as \$globalConfigs |
    .[1] * .[2] | {\"$city\": .[\"$city\"]} |
    .[\"$city\"].config += \$globalConfigs |
    .[\"$city\"].citiesConfig = \$citiesConfigs |
    .[\"$city\"].points |= with_entries(select(.key | length == 4))" \
    config.json ./utils/configs.json $temp >"./utils/$city.json.tmp"

  cat >"./js/_generated/$city.js" <<EOF
const data = $(cat ./utils/$city.json.tmp | jq ".[\"$city\"]")
EOF
}

#generate world.js
echo "Generating world.js..."
jq -s --sort-keys '
  {"World":
    {"points": [
      .[] | ..? | .config.city as $city | .points // empty |
      with_entries(.value += {"city": $city})] | add }
  }' \
  $(ls -SA1 utils/*tmp | grep -v temp.json.tmp) >$temp
generateFakeCity "World"

#generate <country>.js
for d in ./csv/*/; do
  country=$(basename "$d")
  echo "Generating $country.js..."
  jq -s --sort-keys "
    {\"$country\":
      {\"points\": [
        .[] | ..? | .config.city as \$city | .points // empty |
        with_entries(.value += {\"city\": \$city})] | add }
    }" \
    $(ls -SA1 csv/$country/* | \
    sed -e "s/^csv\/$country/utils/" -e 's/csv$/json.tmp/') >$temp
  generateFakeCity "$country"
done

# generate list.js
echo "Generating list.js..."
list_js="./js/_generated/list.js"
echo "const data = [" >$list_js
for filename in $(ls -A1 utils/*tmp | grep -v temp.json.tmp); do
  name=$(basename "$filename" .json.tmp)

  country=$(jq -r ".$name.config.country" $filename)
  min_year=$(jq -r ".$name.points | keys | map(.[0:4]) | sort | first" $filename)
  count=$(jq -r ".$name.points | keys | map(select(. | length == 4)) | length" $filename)

  echo "  {name: \"$name\", country: \"$country\", count: $count, minYear: $min_year}," >>$list_js
done
echo "]" >>$list_js

# generate svg files for each city
function generateSvg {
  filename=$1

  city=$(basename "$filename" .json.tmp)
  country=$(jq -r ".$city.config.country" $filename)

  [[ "$country" != "null" ]] && key="$country" || key="$city"
  [[ "$2" = true ]] && svg_name=$city && key="World" || svg_name="country_$city"

  echo "Generating $svg_name.svg..."

  min_year=$(jq -r ".$key.points | keys | map(.[0:4]) | sort | first" "utils/$key.json.tmp")
  svg_file="./img/_generated/$svg_name.svg"

  current_year=$(date +%Y)
  height=35

  width=$(($current_year - $min_year))

  cat >$svg_file <<EOF
<svg viewBox="0 0 $width $height" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
EOF

  # draw range
  first_year=$(jq -r ".$city.points | keys | first | .[0:4]" $filename)
  last_year=$(jq -r ".$city.points | keys | last | .[0:4]" $filename)
  background_width=$(($last_year - $first_year + 1))
  background_start=$(($first_year - $min_year))

  cat >>$svg_file <<EOF
  <rect y="0" x="$background_start" width="$background_width" height="$height" fill="#a3bff4" />
EOF

  for year in $(jq -r ".$city.points | keys | .[] | select(. | length == 4)" $filename); do
    rect_start=$(($year - $min_year))
    cat >>$svg_file <<EOF
  <rect y="0" x="$rect_start" width="1" height="$height" fill="#c8e3c2" />
EOF
  done

  echo "</svg>" >>$svg_file
}

for filename in $(ls -A1 utils/*tmp | grep -v temp.json.tmp); do
  generateSvg $filename true  # world view
  generateSvg $filename false # country view
done

# update api key
api_key=$(jq -r '.apiKey' config.json)
cat ./map/index.html | sed -E "s/key=[^&]+/key=$api_key/g" >./utils/index.html.tmp
mv ./utils/index.html.tmp ./map/index.html

# update "what is this?" link
wit_link=$(jq -r '.whatIsThisLink' config.json)
cat ./index.html | sed -E "s,\"wit\" href=\"[^\"]+\",\"wit\" href=\"$wit_link\",g" >./utils/index.html.tmp
mv ./utils/index.html.tmp ./index.html

rm ./utils/*.tmp
