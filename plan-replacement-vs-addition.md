# Plan: Replacement vs Addition Wargear Patterns

## Overview
Distinguish between wargear that **replaces** existing equipment vs wargear that is **added** in addition to existing equipment. This affects how weapons are displayed and tracked.

## Current State
- All loadout options treated as mutually exclusive choices
- No distinction between "replace guardian spear with X" vs "can also equip Y"
- `type: "choice"` and `type: "optional"` exist but don't capture this nuance

## Wargear Patterns in 40k

### Replacement Pattern
"Any number of models can each have their guardian spear replaced with 1 castellan axe"
- Model loses original weapon
- Model gains new weapon
- Mutually exclusive

### Addition Pattern
"1 model can be equipped with 1 vexilla"
- Model keeps original weapon
- Model gains additional equipment
- Not mutually exclusive with main weapon

### Paired Loadout Pattern
"Any model can have their guardian spear replaced with 1 sentinel blade and 1 praesidium shield"
- Two items treated as single choice
- Both equipped together or neither

## Implementation Steps

### 1. Update Data Structure (`data/custodes.json`)
Add `pattern` field to loadout options:
```json
{
  "id": "main-weapon",
  "name": "Weapon",
  "pattern": "replacement",
  "choices": [
    { "id": "spears", "name": "Guardian Spears", "default": true },
    { "id": "blades", "name": "Sentinel Blade + Shield", "paired": true }
  ]
},
{
  "id": "vexilla",
  "name": "Vexilla",
  "pattern": "addition",
  "choices": [
    { "id": "none", "name": "None", "default": true },
    { "id": "vexilla", "name": "Vexilla Magnifica" }
  ]
}
```

### 2. Update Weapon Display Logic (`src/main.js`)
For **replacement** pattern:
- Only show weapons from selected choice
- Hide weapons from unselected choices

For **addition** pattern:
- Always show base weapons
- Additionally show equipped optional weapons

```javascript
getEquippedWeapons(listUnit, unit) {
  return unit.weapons.filter(weapon => {
    if (!weapon.loadoutGroup) return true

    const option = this.getLoadoutOptionForGroup(unit, weapon.loadoutGroup)
    if (option.pattern === 'addition') {
      // Addition: show if explicitly selected
      return listUnit.weaponCounts[weapon.loadoutGroup] > 0
    } else {
      // Replacement (default): show if this group is selected
      return listUnit.weaponCounts[weapon.loadoutGroup] > 0
    }
  })
}
```

### 3. Update UI Labels (`index.html`)
Show pattern type in loadout selection:
- Replacement: "Replace with:" dropdown
- Addition: "Add:" checkbox style

### 4. Handle Paired Loadouts
When a choice has `paired: true`:
- Display as single selection
- Equip both items together
- Show combined name in UI

## Files to Modify
- `data/custodes.json` - Add `pattern` to loadout options, `paired` to choices
- `src/main.js` - Update weapon filtering and display logic
- `index.html` - Update UI to reflect pattern types

## Testing Checklist
- [ ] Replacement options hide unselected weapons
- [ ] Addition options show alongside base weapons
- [ ] Paired loadouts equip/unequip together
- [ ] UI clearly indicates pattern type
- [ ] Saved lists preserve pattern selections correctly

## Estimated Effort
1-2 hours
