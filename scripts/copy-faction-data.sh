#!/bin/bash
# Copy faction JSON files from @scottzirkel/40k-data into public/data/
SRC="node_modules/@scottzirkel/40k-data/data"
DEST="public/data"

if [ ! -d "$SRC" ]; then
  echo "40k-data package not found, skipping copy"
  exit 0
fi

cp "$SRC"/*.json "$DEST/"
echo "Copied faction data to $DEST/"
