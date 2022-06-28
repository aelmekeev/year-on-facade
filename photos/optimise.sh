# list missing photos (ignore TODO)
echo "\nStep 1. Find missing photos\n"
has_missing_photos="no"
for filename in ./csv/*.csv; do
  city=$(basename "$filename" .csv)

  city_folder="photos/original/$city"
  if [ -d $city_folder ]; then
    photos_years="years.json.tmp"
    photos_close_years="years_close.json.tmp"
    items="$city_folder/items.json.tmp"
    exceptions="$city_folder/exceptions.json"
    touch $exceptions

    (cd $city_folder && ls -A1 ????.jpg 2>/dev/null | sed -e 's/\.jpg$//' | jq -R '[.]' | jq -s -c 'add' >$photos_years)
    (cd $city_folder && ls -A1 *_close.jpg 2>/dev/null | sed -e 's/_close\.jpg$//' | jq -R '[.]' | jq -s -c 'add // empty' >$photos_close_years)
    cat "./csv/$city.csv" | jq -sRr "[split(\"\\n\") | .[1:] | map(split(\",\"))[] | select(if .[3] then .[3] | startswith(\"TODO\") | not else true end) | .[0]]" >$items

    missing=$(jq -s '.[0] - (if .[1] == null then [] else .[1] end) - (if .[2] == null then [] else .[2] end)' $items "$city_folder/$photos_years" $exceptions)
    if [ "$missing" != "[]" ]; then
      has_missing_photos="yes"
      echo "The following photos are missing for $city: $missing"
    fi
    missing=$(jq -s '.[0] - (if .[1] == null then [] else .[1] end) - (if .[2] == null then [] else .[2] end)' $items "$city_folder/$photos_close_years" $exceptions)
    if [ "$missing" != "[]" ]; then
      has_missing_photos="yes"
      echo "The following close-up photos are missing for $city: $missing"
    fi    
  else
    if [ "$city" != "Replacements" ]; then
      echo "No photos for $city"
    fi
  fi

done

if [ "$has_missing_photos" == "yes" ]; then
  echo "\nNOTE: You can add exceptions with for missing photos to exceptions.json in city folder\n"
fi


echo "\nStep 2. Generate photos for web\n"

function optimise_photo() {
  magick $1 -quality 80 -resize '1024x1024' $2
}

for city_dir in photos/original/*/; do
  mkdir -p "${city_dir/original/web}"
done

rm -rf photos/upload
mkdir photos/upload

checksum_file="checksum.json"
checksum_new_file="checksum.json.tmp"
(cd photos/original && for d in */; do
  (
    cd $d
    ls -A1 -s *.jpg | jq -sRrS 'rtrimstr("\n") | split("\n") | map(ltrimstr(" ") | split(" ") | .[1] + "|" + .[0])' >$checksum_new_file

    updated=$(jq -s '[(.[0] - (if .[1] == null then [] else .[1] end))[] | split("|")[0]]' $checksum_new_file $checksum_file 2>/dev/null)
    if [ "$updated" != "[]" ]; then
      echo "The following photos were updated in $d: $updated"

      if [ "$1" == "update" ]; then
        rm -f $checksum_file
        mv $checksum_new_file $checksum_file
        echo "Checksum file was updated."
      else
        mkdir "../../upload/$d"
        updated_raw=$(jq -r '. | join(" ")' <<< $updated)
        for updated_item in $updated_raw; do
          original_photo="../../original/$d/$updated_item"
          web_photo="../../web/$d/$updated_item"
          echo "$updated_item has a different checksum. Re-generating..."
          optimise_photo $original_photo $web_photo
          cp $web_photo "../../upload/$d/$updated_item"
        done
      fi
    fi
  )
done)

if [ "$1" != "update" ]; then
  echo "\nNOTE: Run \`make photos-update\` once the above photos were uploaded\n"
fi

rm -rf ./photos/original/**/*.tmp
