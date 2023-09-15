#!/bin/bash

set -euo pipefail

aws_profile="year-on-facade"
photos_dir="./photos/original"

# read bucket name from config.properties file
s3_bucket="$(grep '^bucket' config.properties | cut -d'=' -f2 | cut -d'#' -f1 | cut -d'"' -f2)-photos"
s3_folder="s3://$s3_bucket/original"

aws-vault exec $aws_profile -- aws s3 sync --dryrun $photos_dir $s3_folder --exclude "*" --include "*.jpg"