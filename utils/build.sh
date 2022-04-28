#!/bin/bash

set -euo pipefail

temp=./utils/temp.json.tmp
min_year="2000"

# generate js files for each city
for filename in ./csv/*.csv; do
  city=$(basename "$filename" .csv)

  # sort
  echo -ne "year;latitude;longitude\n$(tail -n +2 $filename | sort | sed -E 's/,/;/g' | sed -E 's/[[:space:]]//g')" >$filename

  # get first year and compare it with minimum among all cities
  first_year=$(cat $filename | sed -n 2p | cut -d ';' -f 1)
  min_year=$([ "$first_year" \< "$min_year" ] && echo "$first_year" || echo "$min_year")

  # generate temporary json files for each city
  cat "./csv/$city.csv" | jq -sRr "split(\"\\n\") | .[1:] | map(split(\";\")) | map({(.[0]): [.[1], .[2]] | join(\",\") }) | add as \$points | {\"$city\": {\"points\": \$points}}" >$temp
  jq -s ".[0] * .[1] | {\"$city\": .[\"$city\"]}" ./utils/configs.json $temp >"./utils/$city.json.tmp"

  cat >"./js/_generated/$city.js" <<EOF
const data = $(cat ./utils/$city.json.tmp | jq ".[\"$city\"]")
EOF
done

# generate list.js
list_js="./js/_generated/list.js"
echo "const data = {" >$list_js
for filename in ./csv/*.csv; do
  city=$(basename "$filename" .csv)

  echo "  \"$city\": $(grep -c '^\d' $filename)," >>$list_js
done
echo "}" >>$list_js

# generate svg files for each city
current_year=$(date +%Y)
height=35
width=$(($current_year - $min_year))
for filename in ./csv/*.csv; do
  city=$(basename "$filename" .csv)
  svg_file="./svg/_generated/$city.svg"

  cat >$svg_file <<EOF
<svg viewBox="0 0 $width $height" xmlns="http://www.w3.org/2000/svg">
EOF

  # draw range
  first_year=$(cat $filename | sed -n 2p | cut -d ';' -f 1)
  last_year=$(cat $filename | tail -n 1 | cut -d ';' -f 1)
  background_width=$(($last_year - $first_year + 1))
  background_start=$(($first_year - $min_year))

  cat >>$svg_file <<EOF
  <rect y="0" x="$background_start" width="$background_width" height="$height" fill="#a3bff4" />
EOF

  for line in $(cat $filename | sed -n '/^[[:digit:]]/p'); do
    year=$(echo $line | cut -d ';' -f 1)
    rect_start=$(($year - $min_year))
    cat >>$svg_file <<EOF
  <rect y="0" x="$rect_start" width="1" height="$height" fill="#c8e3c2" />
EOF
  done

  echo "</svg>" >>$svg_file
done

rm ./utils/*.tmp
