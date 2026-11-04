#!/usr/bin/env bash
# Fetches (or updates) the game repositories the cookbook is generated from.
# Only the folders the generator reads are checked out (sparse, shallow).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p sources

sync() {
  local name=$1 url=$2 branch=$3
  shift 3
  local dir="sources/$name"
  if [ ! -d "$dir/.git" ]; then
    echo ">> Cloning $url ($branch) into $dir"
    git clone --depth 1 --filter=blob:none --sparse --branch "$branch" "$url" "$dir"
    git -C "$dir" sparse-checkout set "$@"
  else
    echo ">> Updating $dir"
    git -C "$dir" sparse-checkout set "$@"
    git -C "$dir" fetch --depth 1 origin "$branch"
    git -C "$dir" reset --hard FETCH_HEAD
  fi
  git -C "$dir" log -1 --format="   now at %h (%cd)" --date=short
}

# Recipes, names (en-US + ru-RU) and sprites.
sync lust-station https://github.com/makura-games/lust-station.git master \
  Resources/Prototypes Resources/Locale Resources/Textures

# Vanilla WizDen, only to mark recipes that Lust Station adds on top.
sync wizden https://github.com/space-wizards/space-station-14.git master \
  Resources/Prototypes
