if [ "$#" -ne 2 ]; then
  echo "Usage: _crawl.sh <start id> <end id>"
  exit 1
fi

output="$1-$2-list"
echo "id,years" >$output

for i in $(seq -f "%.0f" $1 $2); do
  details=$(curl -s "https://historicengland.org.uk/listing/the-list/list-entry/$i?section=official-list-entry" | xmllint --html --xpath '//h3[contains(text(), "Details")]/following::p[1]' --format - 2>/dev/null)
  if [[ ! -z "$details" ]]; then
    echo $details > $i
    years=$(echo $details | grep -oE '([^0-9]|^)1\d{3}([^0-9]|$)' | sort | sed 's/[^0-9]//g' | paste -sd "," -)
    if [[ ! -z "$years" ]]; then
      echo "$i,\"$years\"" >>$output
    fi
  fi
done
