# Plan: Leader Attachment System

## Overview
Allow Character models with the "Leader" ability to attach to eligible units, combining their profiles and applying any modifiers from the leader to the unit.

## Current State
- Characters exist as standalone units
- `leader` ability exists in data with description of eligible units
- No mechanism to attach leaders to units
- No combined stat display

## 40k Leader Rules
- Leaders attach to specific unit types (defined in their ability)
- Attached leader's wounds are tracked separately but unit acts as one
- Leader's abilities/auras affect the combined unit
- Leader can be targeted via Precision or Look Out Sir rules

## Implementation Steps

### 1. Update Data Structure (`data/custodes.json`)
Enhance leader ability with structured data:
```json
{
  "id": "leader",
  "name": "Leader",
  "description": "This model can be attached to Custodian Guard or Custodian Wardens.",
  "eligibleUnits": ["custodian-guard", "custodian-wardens"]
}
```

### 2. Update List Unit Structure (`src/main.js`)
Add `attachedLeader` field to list units:
```javascript
addUnitToList(unit) {
  this.currentList.units.push({
    unitId: unit.id,
    modelCount: initialModelCount,
    enhancement: '',
    weaponCounts: this.getDefaultWeaponCounts(unit, initialModelCount),
    currentWounds: null,
    attachedLeader: null  // NEW: { unitIndex: number } or null
  })
}
```

### 3. Add Leader Attachment Functions
```javascript
getAvailableLeaders(unitIndex) {
  const listUnit = this.currentList.units[unitIndex]
  const unit = this.getUnitById(listUnit.unitId)

  return this.currentList.units
    .map((lu, idx) => ({ listUnit: lu, index: idx }))
    .filter(({ listUnit: lu, index }) => {
      if (index === unitIndex) return false
      const leaderUnit = this.getUnitById(lu.unitId)
      const leaderAbility = leaderUnit.abilities.find(a => a.id === 'leader')
      if (!leaderAbility?.eligibleUnits) return false
      return leaderAbility.eligibleUnits.includes(unit.id)
    })
}

attachLeader(unitIndex, leaderIndex) {
  // Detach from any previous unit
  this.currentList.units.forEach(u => {
    if (u.attachedLeader?.unitIndex === leaderIndex) {
      u.attachedLeader = null
    }
  })
  // Attach to new unit
  this.currentList.units[unitIndex].attachedLeader = { unitIndex: leaderIndex }
}

detachLeader(unitIndex) {
  this.currentList.units[unitIndex].attachedLeader = null
}
```

### 4. Update Modifier Collection
Include leader's enhancement modifiers when collecting:
```javascript
collectModifiers(unitIndex, stat) {
  const modifiers = []
  const listUnit = this.currentList.units[unitIndex]

  // Existing enhancement modifiers...

  // NEW: Leader's modifiers
  if (listUnit.attachedLeader) {
    const leaderListUnit = this.currentList.units[listUnit.attachedLeader.unitIndex]
    if (leaderListUnit.enhancement) {
      const enhancement = this.getEnhancementById(leaderListUnit.enhancement)
      // Collect applicable modifiers...
    }
  }

  return modifiers
}
```

### 5. Update UI (`index.html`)
Add leader attachment dropdown to unit cards:
```html
<div x-show="getAvailableLeaders(index).length > 0" class="mt-2">
  <label class="text-sm text-gray-400">Attach Leader:</label>
  <select x-model="unit.attachedLeader" @change="attachLeader(index, $event.target.value)">
    <option value="">None</option>
    <template x-for="leader in getAvailableLeaders(index)">
      <option :value="leader.index" x-text="getUnitById(leader.listUnit.unitId).name"></option>
    </template>
  </select>
</div>
```

### 6. Update Unit Display
When a unit has an attached leader:
- Show leader name with unit name: "Custodian Guard + Shield-Captain"
- Show leader's weapons in weapon list
- Show combined model count
- Track wounds separately for leader vs unit

### 7. Hide Attached Leaders from Main List
Leaders that are attached shouldn't appear as separate units in the army list during play.

## Validation Rules
- A leader can only attach to one unit
- A unit can only have one leader attached
- Leader must be eligible for that unit type
- Detaching resets any applied modifiers

## Files to Modify
- `data/custodes.json` - Add `eligibleUnits` to leader abilities
- `src/main.js` - Add attachment functions, update modifier collection
- `index.html` - Add leader dropdown UI, update unit display

## Testing Checklist
- [ ] Shield-Captain can attach to Custodian Guard
- [ ] Shield-Captain can attach to Custodian Wardens
- [ ] Cannot attach to ineligible units
- [ ] Leader's enhancement modifiers apply to unit
- [ ] Leader appears combined with unit, not separate
- [ ] Detaching leader removes modifiers
- [ ] Wounds tracked separately for leader
- [ ] Saved lists preserve attachments

## Estimated Effort
3-4 hours
