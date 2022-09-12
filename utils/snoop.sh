#!/bin/bash

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: ./snoop.sh <author github id> <city name> <optional, alias for the city in author's repository>"
  exit 1
fi

author=$1
city=$2
city_remote="${3:-$city}"

curl -sf https://raw.githubusercontent.com/$author/year-on-facade/main/csv/$city_remote.csv > remote.csv.tmp || (echo "Failed to get $city_remote from the $author repository" && exit 1)

get_years="split(\"\\n\") | .[1:] | map(split(\",\")) | map(.[0]) | map(.[0:4]) | unique"

cat "../csv/$city.csv" | jq -sRre "$get_years" > "local.json.tmp"
cat remote.csv.tmp | jq -sRre "$get_years" > "remote.remote.json.tmp"

echo "You probably can borrow below from https://github.com/$author/year-on-facade/blob/main/csv/$city_remote.csv"
jq -sr ".[0] as \$config | .[2] - .[1] | map(\"- \" + \$config[\"$author\"] + \"item/?city="${city_remote##*/}"&year=\" + .) | .[]" snoop.config.json "local.json.tmp" "remote.remote.json.tmp"

rm *.tmp