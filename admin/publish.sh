#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Building site..."
make build

if [[ -z $(git status -s) ]]; then
  echo "No changes to publish."
  exit 0
fi

branch_name="add-buildings-$(date +%s)"
echo "Creating branch $branch_name..."
git checkout -b "$branch_name"

echo "Staging changes..."
git add csv/ js/ img/

echo "Generating PR description..."
make pr

echo "Committing changes..."
git commit -m "Add new buildings"

echo "Pushing branch..."
git push -u origin "$branch_name"

echo "Creating Pull Request..."
gh pr create --title "Add new buildings" --body-file pr-body.txt

echo "Uploading photos to S3..."
make photos-upload

echo "Cleaning up..."
rm -f pr-body.txt
git checkout main
echo "Done!"
