#!/bin/bash

set -euo pipefail

temp=./utils/temp.json.tmp

for filename in ./csv/*.csv; do
  cat $filename | jq -sRre "split(\"\\n\") | .[1:] | map(split(\",\")) | map(.[0]) | length as \$pointsNumber | . | unique | length == \$pointsNumber" &>/dev/null ||
    (echo "Error: $filename contains duplicates" && exit 1)
done

for filename in ./js/_generated/*.js; do
  city=$(basename "$filename" .js)
  if [ "$city" != "list" ] && [ "$city" != "World" ]; then
    echo $(cat $filename | sed 's/const data = //') >$temp

    jq '. as $data |
      $data.config.borders as $borders |
      $borders.south as $minLat | $borders.north as $maxLat | $borders.west as $minLng | $borders.east as $maxLng |
      $data.points[] | .latlng.lat as $lat | .latlng.lng as $lng |
      $lat > $minLat and $lat < $maxLat and $lng > $minLng and $lng < $maxLng
      ' $temp | jq -se '. | all' &>/dev/null ||
      (echo "Error: $city.csv has coordinates outside of config specified in configs.json." && rm $temp && exit 1)
  fi
done

rm $temp
