# Plan: Wargear Abilities (Stat Modifiers)

## Overview
Allow wargear/weapons to apply stat modifiers to models, using the existing modifier system built for enhancements. Example: Praesidium Shield grants +1 Wound.

## Current State
- Modifier system exists and works for enhancements
- Supports operations: `add`, `subtract`, `multiply`, `set`
- Supports scopes: `model`, `unit`, `melee`, `ranged`, `weapon`
- Weapons have an `abilities` array but no `modifiers` array

## Implementation Steps

### 1. Update Data Structure (`data/custodes.json`)
Add `modifiers` array to weapons that grant stat bonuses:
```json
{
  "id": "sentinel-blade-melee",
  "name": "Sentinel Blade",
  "type": "melee",
  "stats": { "a": 5, "ws": "2+", "s": 6, "ap": -2, "d": 1 },
  "abilities": [],
  "loadoutGroup": "blades",
  "modifiers": [
    { "stat": "w", "operation": "add", "value": 1, "scope": "model", "source": "Praesidium Shield" }
  ]
}
```

### 2. Update `collectModifiers()` (`src/main.js`)
Extend to collect modifiers from equipped weapons:
```javascript
collectModifiers(unitIndex, stat) {
  const modifiers = []
  const listUnit = this.currentList.units[unitIndex]
  const unit = this.getUnitById(listUnit.unitId)

  // Existing: collect from enhancement
  if (listUnit.enhancement) {
    // ... existing code ...
  }

  // NEW: collect from equipped weapons
  for (const weapon of unit.weapons) {
    if (!weapon.modifiers) continue
    if (!this.isWeaponEquipped(listUnit, weapon)) continue

    for (const mod of weapon.modifiers) {
      if (mod.stat === stat && (mod.scope === 'model' || mod.scope === 'unit')) {
        modifiers.push(mod)
      }
    }
  }

  return modifiers
}
```

### 3. Add Helper Function
```javascript
isWeaponEquipped(listUnit, weapon) {
  if (!weapon.loadoutGroup) return true // Always equipped if no group
  return (listUnit.weaponCounts[weapon.loadoutGroup] || 0) > 0
}
```

### 4. Update Quick Reference Panel
Add wargear abilities section showing stat modifiers:
- "Praesidium Shield: Bearer gains +1 Wound"

### 5. Update Stat Display
Ensure modified stats show the bonus source in tooltips.

## Custodes Wargear with Stat Modifiers
Based on datasheets:
- **Praesidium Shield** (with Sentinel Blade): +1 Wound to bearer
- **Storm Shield** (various units): May have similar effect

## Files to Modify
- `data/custodes.json` - Add `modifiers` to relevant weapons
- `src/main.js` - Update `collectModifiers()`, add `isWeaponEquipped()`
- `index.html` - Update Quick Reference panel

## Testing Checklist
- [ ] Selecting Sentinel Blade + Shield shows +1W on model
- [ ] Switching back to Guardian Spear removes the bonus
- [ ] Modifier source shown in stat tooltip
- [ ] Quick Reference shows wargear abilities

## Estimated Effort
2 hours
