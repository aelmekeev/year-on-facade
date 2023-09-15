#!/bin/bash

set -euo pipefail

aws_profile="year-on-facade"
photos_dir="./photos/original"

s3_bucket="$(grep '^bucket' config.properties | cut -d'=' -f2 | cut -d'#' -f1 | cut -d'"' -f2)-photos"
s3_folder="s3://$s3_bucket/original"

s3_storage_class="$(grep '^s3_storage_class' config.properties | cut -d'=' -f2 | cut -d'#' -f1 | cut -d'"' -f2)"

aws-vault exec $aws_profile -- aws s3 sync $photos_dir $s3_folder --storage-class $s3_storage_class --exclude "*" --include "*.jpg"