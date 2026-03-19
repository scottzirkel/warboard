#!/bin/bash
# Copy faction JSON files from @scottzirkel/40k-data into public/data/
# and validate critical data integrity after copy.
SRC="node_modules/@scottzirkel/40k-data/data"
DEST="public/data"

if [ ! -d "$SRC" ]; then
  echo "40k-data package not found, skipping copy"
  exit 0
fi

cp "$SRC"/*.json "$DEST/"
echo "Copied faction data to $DEST/"

# Post-copy validation: check critical cross-faction relationships
node -e "
const sm = JSON.parse(require('fs').readFileSync('$DEST/spacemarines.json', 'utf8'));
const errors = [];

// SM terminator characters must include deathwing-terminator-squad
const dwLeaders = [
  'captain-in-terminator-armour',
  'librarian-in-terminator-armour',
  'chaplain-in-terminator-armour',
  'ancient-in-terminator-armor',
];
for (const id of dwLeaders) {
  const unit = sm.units.find(u => u.id === id);
  if (!unit) { errors.push(id + ' not found'); continue; }
  const leader = unit.abilities?.find(a => a.id === 'leader');
  if (!leader?.eligibleUnits?.includes('deathwing-terminator-squad')) {
    errors.push(unit.name + ' missing deathwing-terminator-squad eligibility');
  }
}

// Selection rules must have choices
for (const [key, det] of Object.entries(sm.detachments)) {
  for (const rule of det.rules || []) {
    if (rule.type === 'selection' && (!rule.choices || rule.choices.length === 0)) {
      errors.push(det.name + ' > ' + rule.name + ' is selection type but has no choices');
    }
  }
}

if (errors.length > 0) {
  console.error('\\n❌ Faction data validation failed:');
  errors.forEach(e => console.error('  - ' + e));
  console.error('\\nThe @scottzirkel/40k-data package may need updating.');
  process.exit(1);
}
"

if [ $? -ne 0 ]; then
  exit 1
fi
