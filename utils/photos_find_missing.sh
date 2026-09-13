#!/bin/bash

set -euo pipefail

function find_missing_photos {
  city_folder="$1"
  items="$2"
  postfix="$3"

  photos_years="years.json.tmp"

  (cd $city_folder && ls -A1 ????$postfix.jpg 2>/dev/null | sed -e "s/$postfix\.jpg$//" | jq -R '[.]' | jq -s -c 'add // empty' >$photos_years)

  missing=$(jq -s '.[0] - (if .[1] == null then [] else .[1] end)' $items "$city_folder/$photos_years")
  if [ "$missing" != "[]" ]; then
    echo "The following $postfix photos are missing for $city: $missing"
  fi
}

# list missing photos (ignore TODO)
for filename in ./csv/**/*.csv; do
  city=$(basename "$filename" .csv)

  city_folder="photos/original/$city"
  if [ ! -d $city_folder ]; then
    echo "No photos for $city"
  else
    items="$city_folder/items.json.tmp"
    cat $filename | jq -sRr "[split(\"\\n\") | .[1:] | map(split(\",\"))[] | select(if .[3] then .[3] | startswith(\"TODO\") | not else true end) | .[0]] | map(select(. | length == 4))" >$items

    find_missing_photos $city_folder $items ""
    find_missing_photos $city_folder $items "_close"
  fi
done

rm -rf ./photos/original/**/*.tmp