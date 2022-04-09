#!/bin/bash

set -euo pipefail

temp=./utils/temp.json.tmp

echo $(cat ./js/data.js | sed 's/const data = //') >$temp

jq '. as $data |
  $data | keys[] | . as $city |
  $data[$city].config.borders as $borders |
  $borders.south as $minLat | $borders.north as $maxLat | $borders.west as $minLng | $borders.east as $maxLng |
  $data[$city].points[] | split(",") as [$lat, $lng] |
  ($lat | tonumber > $minLat) and ($lat | tonumber < $maxLat) and ($lng | tonumber > $minLng) and ($lng | tonumber) < $maxLng
  ' $temp | jq -se '. | all' &>/dev/null ||
  (echo "Error: some cities have coordinates outside of config specified in $config." && rm $temp && exit 1)

rm $temp
