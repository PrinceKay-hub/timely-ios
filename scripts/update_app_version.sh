#!/usr/bin/env bash
set -euo pipefail

# Usage: ./update_app_version.sh 3.7.9
NEW_VERSION="${1:?Usage: update_app_version.sh <version>}"
MANIFEST_PATH="app-version.json"

if [ ! -f "$MANIFEST_PATH" ]; then
  echo "Error: $MANIFEST_PATH not found at repo root." >&2
  exit 1
fi

# Only updates the "version" key for each platform - "minVersion" and
# "critical" are left untouched since those are manual, deliberate decisions.
jq \
  --arg v "$NEW_VERSION" \
  '.android.version = $v | .ios.version = $v' \
  "$MANIFEST_PATH" > "$MANIFEST_PATH.tmp"

mv "$MANIFEST_PATH.tmp" "$MANIFEST_PATH"

echo "Updated $MANIFEST_PATH -> version $NEW_VERSION"
cat "$MANIFEST_PATH"