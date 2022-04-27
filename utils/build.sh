#!/bin/bash

set -euo pipefail

temp=./utils/temp.json.tmp
for filename in ./csv/*.csv; do
  city=$(basename "$filename" .csv)

  # sort
  echo -ne "year;latitude;longitude\n$(tail -n +2 $filename | sort | sed -E 's/,/;/g' | sed -E 's/[[:space:]]//g')" > $filename

  # generate temporary json files for each city
  cat "./csv/$city.csv" | jq -sRr "split(\"\\n\") | .[1:] | map(split(\";\")) | map({(.[0]): [.[1], .[2]] | join(\",\") }) | add as \$points | {\"$city\": {\"points\": \$points}}" >$temp
  jq -s ".[0] * .[1] | {\"$city\": .[\"$city\"]}" ./utils/configs.json $temp >"./utils/$city.json.tmp"

  cat >"./js/_generated/$city.js" <<EOF
const data = $(cat ./utils/$city.json.tmp | jq ".[\"$city\"]")
EOF
done

rm ./utils/*.tmp
