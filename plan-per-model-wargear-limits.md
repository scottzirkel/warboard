# Plan: Per-Model Wargear Limits

## Overview
Add support for limiting how many models in a unit can take specific wargear options (e.g., "1 model can be equipped with a Vexilla").

## Current State
- `loadoutOptions` exist with `choices` arrays
- No mechanism to limit choices to specific model counts
- All models can currently select any available option

## Implementation Steps

### 1. Update Data Structure (`data/custodes.json`)
Add `maxModels` field to choice definitions:
```json
{
  "id": "vexilla",
  "name": "Vexilla",
  "type": "optional",
  "choices": [
    { "id": "none", "name": "None", "default": true },
    { "id": "vexilla", "name": "Vexilla Magnifica", "maxModels": 1 }
  ]
}
```

### 2. Add Validation Logic (`src/main.js`)
In the weapon count update function, enforce `maxModels`:
```javascript
// When updating weapon counts, check maxModels constraint
const choice = this.getChoiceById(option.id, choiceId)
if (choice.maxModels && newCount > choice.maxModels) {
  newCount = choice.maxModels
}
```

### 3. Update UI (`index.html`)
- Show max limit indicator next to constrained options
- Disable increment button when limit reached
- Display tooltip explaining the restriction

### 4. Add List Validation
- Validate on save that no limits are exceeded
- Validate on entering Play Mode
- Show error message if limits violated

## Files to Modify
- `data/custodes.json` - Add `maxModels` to relevant choices
- `src/main.js` - Add validation in `updateWeaponCount()` and list validation
- `index.html` - Update UI to show limits and disable controls

## Testing Checklist
- [ ] Vexilla limited to 1 model on Custodian Guard
- [ ] Cannot increment past maxModels limit
- [ ] Saved lists with violations show errors
- [ ] Clear error messaging in UI

## Estimated Effort
1-2 hours
