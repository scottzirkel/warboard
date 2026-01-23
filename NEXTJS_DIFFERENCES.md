# Alpine.js vs Next.js Implementation Differences

This document catalogs all differences between the reference Alpine.js implementation (`/reference/alpine-original/`) and the current Next.js implementation. **Alpine.js is the source of truth** - wherever implementations differ, the Next.js version should be updated to match Alpine.js.

---

## Summary

| Category | Issues Found |
|----------|--------------|
| Layout | 8 |
| Design | 15 |
| Content | 10 |
| Functionality | 14 |
| **Total** | **47** |

---

## 1. Layout Differences

### 1.1 Build Mode - Points Summary Bar Structure

**Alpine.js:**
- Points summary bar has `flex-shrink-0` class
- Uses single card for entire summary

**Next.js:**
- Uses `shrink-0` (Tailwind shorthand, should work)
- Structure matches but class naming differs slightly

### 1.2 Build Mode - Format/Points Selectors Layout

**Alpine.js:**
- Format and Points selectors in single row: `<div class="flex gap-2 mb-3 flex-shrink-0">`
- Format is a dropdown (`<select>`) with all format options
- Points dropdown shows format-specific options from `gameFormats[currentList.gameFormat].pointsOptions`

**Next.js:**
- Uses a grid layout: `<div className="grid grid-cols-2 gap-3">`
- Format uses segmented control instead of dropdown
- Points dropdown has static options `[500, 1000, 1500, 2000, 2500, 3000]` instead of format-specific ones

**Fix needed:**
- Change Format selector to dropdown
- Make Points options dynamic based on selected format

### 1.3 Build Mode - Unit Roster Accordion Styling

**Alpine.js:**
- Accordion headers: `class="w-full flex justify-between items-center px-4 py-3 hover:bg-white/5 transition-colors text-left touch-highlight"`
- Group label styled: `class="font-semibold text-accent-300"`
- Chevron rotates with `rotate-180` on expand
- Uses `x-collapse` Alpine directive for smooth animation

**Next.js:**
- Different accordion styling: `bg-gray-700/50 rounded-lg hover:bg-gray-600/50`
- Group label styled as: `text-gray-200`
- Chevron rotates with `rotate-90` (different rotation)
- Uses CSS `max-h` transition instead of collapse directive

**Fix needed:** Match Alpine's accordion styling and animation approach

### 1.4 Play Mode - No Top-Level Container Padding

**Alpine.js:**
- Play mode grid: `class="h-full grid grid-cols-1 lg:grid-cols-3 gap-4"`
- No extra wrapper, grid fills the `<main>` area

**Next.js:**
- Has extra padding: `className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4 p-4"`
- The `p-4` adds extra padding that Alpine doesn't have

**Fix needed:** Remove the `p-4` from PlayMode component

### 1.5 Quick Reference Panel - Missing Shrink Class

**Alpine.js:**
- Panel header has flex-shrink-0 implied via positioning

**Next.js:**
- Uses explicit `shrink-0` on header

**Status:** Minor, likely functionally equivalent

### 1.6 Build Mode - Main Content Max Width

**Alpine.js:**
- `<main class="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 py-4">`

**Next.js:**
- `<main className="flex-1 overflow-hidden">`
- Then BuildMode has: `<div className="h-full flex flex-col gap-4 max-w-7xl mx-auto w-full px-4 py-4">`

**Status:** Structurally similar, minor difference

---

## 2. Design Differences

### 2.1 Unit Card in Build Mode - Border Styling for Attached Leaders

**Alpine.js:**
- Attached-as-leader units: `opacity-60` only
- Uses `border-l-2 border-purple-500` for ally units

**Next.js:**
- Uses `opacity-75 border-l-4 border-l-purple-400` for attached leaders
- Different opacity and border width/color

**Fix needed:** Change to `opacity-60` and remove the purple border for attached leaders (keep only for allies)

### 2.2 Unit Card in Build Mode - Model Count Selector

**Alpine.js:**
- Uses `<select>` dropdown with model counts as options
- Shows "X models" text in each option

**Next.js:**
- Uses `<Stepper>` component with +/- buttons
- Shows numeric value between buttons

**Fix needed:** Change model count selector to dropdown matching Alpine.js

### 2.3 Weapon Loadout Display in Build Mode

**Alpine.js:**
- Loadout options grouped by pattern (replacement vs addition)
- Replacement options have: `<span class="text-blue-400">Replace</span>` label
- Addition options have: `<span class="text-green-400">Add</span>` label and `border-l-2 border-green-500`
- Uses inline `<div class="stepper">` with button-divider-count-divider-button pattern

**Next.js:**
- Uses `WeaponLoadoutSelector` component with different structure
- Doesn't clearly distinguish replacement vs addition patterns visually
- Different stepper styling

**Fix needed:** Match the loadout option visual grouping with Replace/Add labels

### 2.4 Unit Roster - Points Display Format

**Alpine.js:**
- Shows range: `getPointsDisplay(unit)` returns "150-190 pts" for multi-model units
- Shows single: "150 pts" for single-model units

**Next.js:**
- Shows minimum only: `{getMinPoints(unit)}+ pts`

**Fix needed:** Show point ranges for multi-model units

### 2.5 Unit Roster - Group Labels Color

**Alpine.js:**
- Group label: `text-accent-300` (gold/themed color)

**Next.js:**
- Group label: `text-gray-200` (neutral gray)

**Fix needed:** Use `text-accent-300` for group labels

### 2.6 Play Mode Unit Card - Enhancement Badge

**Alpine.js:**
- Shows enhancement with `badge badge-accent` styling

**Next.js:**
- Uses `Badge variant="accent"` component which may render differently

**Status:** Verify badge styling matches

### 2.7 Play Mode - Selected Unit Details Stats

**Alpine.js:**
- Movement shown with `formatInches()` helper, e.g., `6"`
- All stats in consistent stat-cell layout

**Next.js:**
- Also uses `formatInches()` but check it matches

**Status:** Verify formatting matches

### 2.8 Segmented Control Sizing

**Alpine.js:**
- Mode control: `class="segmented-control w-52"`

**Next.js:**
- Same: `className="segmented-control w-52"`

**Status:** Matches

### 2.9 Badge Styling in Lists

**Alpine.js:**
- Uses `text-[10px] py-0` and `py-0.5` for compact badges
- Example: `class="badge badge-purple text-[10px] py-0.5"`

**Next.js:**
- Uses `Badge` component with size props

**Fix needed:** Verify Badge component outputs same sizing

### 2.10 Play Mode - Weapons Section Collapse/Expand Icon

**Alpine.js:**
- Chevron: `class="h-3 w-3"` with `-rotate-90` when collapsed
- Conditional classes for activation state coloring

**Next.js:**
- May have different icon sizing or rotation

**Fix needed:** Verify chevron styling and rotation matches

### 2.11 Toast Notification Position

**Alpine.js:**
- `class="fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg"`
- Colors: `bg-green-600` for success, `bg-red-600` for error

**Next.js:**
- Uses `ToastContainer` component with potentially different positioning

**Fix needed:** Verify toast position and styling matches

### 2.12 Quick Reference Panel - Wargear Abilities Section

**Alpine.js:**
- Has "Wargear Abilities" section with orange styling: `text-orange-400`, `text-orange-300`
- Populated by `getWargearAbilities()` function

**Next.js:**
- Does not have Wargear Abilities section in Quick Reference panel

**Fix needed:** Add Wargear Abilities section to Quick Reference panel

---

## 3. Content Differences

### 3.1 Game Formats Configuration

**Alpine.js:**
```javascript
gameFormats: {
  standard: { name: 'Standard', pointsOptions: [500, 1000, 2000] },
  colosseum: { name: 'Colosseum', pointsOptions: [500] }
}
```

**Next.js:**
- Points options are static array: `[500, 1000, 1500, 2000, 2500, 3000]`
- Format stored as `currentList.format` instead of `currentList.gameFormat`

**Fix needed:**
- Use dynamic points options per format
- Consider if 1500, 2500, 3000 should be in Standard format

### 3.2 Unit Grouping Categories

**Alpine.js:**
- Groups: characters, battleline, infantry, mounted, vehicles, allies
- "Other Infantry" label for infantry group
- "Mounted" as separate category

**Next.js:**
- Groups: Characters, Battleline, Infantry, Vehicles, Other
- No "Mounted" category
- "Other" instead of explicit categories

**Fix needed:**
- Add "Mounted" category
- Add "Allies" category
- Match Alpine's grouping logic exactly

### 3.3 Empty State Messages

**Alpine.js - Army List Empty:**
```html
<p class="text-lg mb-1">No units added yet</p>
<p class="text-sm">Select a unit from the roster to add it</p>
```

**Next.js:**
```html
<p>No units added yet</p>
<p className="text-xs mt-1">Select units from the roster →</p>
```

**Fix needed:** Match text and styling exactly

### 3.4 Empty State - Play Mode No Selection

**Alpine.js:**
- `<p>Select a unit from your army to view details</p>`

**Next.js:**
- Same text, verify styling matches

**Status:** Verify styling matches

### 3.5 Section Headers Text

**Alpine.js:**
- "Army List" header uses `section-header-inline` class
- "Unit Roster" uses same

**Next.js:**
- Uses `section-header` class (different from `section-header-inline`)

**Fix needed:** Use correct header class per context

### 3.6 Quick Reference - Section Order and Headers

**Alpine.js order:**
1. Detachment Stratagems (purple header)
2. Detachment Enhancements (accent header)
3. Wargear Abilities (orange header)
4. Weapon Abilities (blue header)
5. Unit Abilities (green header)

**Next.js order:**
1. Detachment Stratagems (purple header)
2. Detachment Enhancements (accent header)
3. Weapon Abilities (blue header)
4. Unit Abilities (green header)

**Fix needed:** Add Wargear Abilities section between Enhancements and Weapon Abilities

### 3.7 Ka'tah Stance Labels

**Alpine.js:**
- Shows stance names with " Stance" removed: `x-text="stance.name.replace(' Stance', '')"`

**Next.js:**
- Also removes " Stance" - verify it's consistent

**Status:** Verify implementation matches

### 3.8 Play Mode - Detachment Rules Section

**Alpine.js:**
- Has "Detachment Rules" section at bottom of Game State panel

**Next.js:**
- Also has this section

**Status:** Verify content and styling matches

---

## 4. Functionality Differences

### 4.1 Format-Dependent Points Limits

**Alpine.js:**
- When format changes, auto-adjusts points limit if current limit not in new format's options:
```javascript
setGameFormat(format) {
  this.currentList.gameFormat = format
  const options = this.gameFormats[format].pointsOptions
  if (!options.includes(this.currentList.pointsLimit)) {
    this.currentList.pointsLimit = options[0]
  }
}
```

**Next.js:**
- Points limit is independent of format

**Fix needed:** Implement format-dependent points limit options

### 4.2 Model Count Change Behavior

**Alpine.js:**
- Uses `@change="onModelCountChange(index, $event.target.value)"` handler
- Adjusts weapon counts proportionally when model count changes
- When reducing: caps and adjusts to fit
- When increasing: adds to default weapon

**Next.js:**
- Uses `updateUnitModelCount` which may not handle weapon redistribution

**Fix needed:** Verify weapon count redistribution logic matches

### 4.3 Weapon Count Validation Display

**Alpine.js:**
- Shows validation error directly in the loadout section:
```html
<template x-if="getWeaponCountError(listUnit)">
  <div class="text-xs text-red-400" x-text="getWeaponCountError(listUnit)"></div>
</template>
```

**Next.js:**
- Has `weaponCountError` but verify display location matches

**Status:** Verify placement and styling matches

### 4.4 Battle Round Change - Reset Activation State

**Alpine.js:**
- Watches battle round changes and resets activation:
```javascript
this.$watch('gameState.battleRound', () => {
  this.resetActivationState()
})
```

**Next.js:**
- May not automatically reset activations on round change

**Fix needed:** Implement activation reset on battle round change

### 4.5 Loadout Group Activation Auto-Collapse

**Alpine.js:**
- When activating a loadout group, also collapses it:
```javascript
toggleLoadoutGroupActivated(unitIndex, groupId) {
  // ... toggle activation ...
  if (this.gameState.activatedLoadoutGroups[unitIndex][groupId]) {
    // When activating, also collapse
    if (!this.gameState.collapsedLoadoutGroups[unitIndex]) {
      this.gameState.collapsedLoadoutGroups[unitIndex] = {}
    }
    this.gameState.collapsedLoadoutGroups[unitIndex][groupId] = true
  }
}
```

**Next.js:**
- May not auto-collapse on activation

**Fix needed:** Auto-collapse loadout groups when activated

### 4.6 Leader Activation Auto-Collapse

**Alpine.js:**
- Same pattern for leader activation:
```javascript
toggleLeaderActivated(unitIndex) {
  // ... toggle ...
  if (this.gameState.activatedLeaders[unitIndex]) {
    this.gameState.collapsedLeaders[unitIndex] = true
  }
}
```

**Next.js:**
- May not have leader-specific collapse/activation tracking

**Fix needed:** Implement leader activation with auto-collapse

### 4.7 Unit Selection Behavior in Build Mode

**Alpine.js:**
- Clicking roster unit calls `selectUnit(unit)` which sets `selectedUnit`
- Separate from list unit selection

**Next.js:**
- `onSelectUnit` called `handlePreviewUnit` which sets `previewedUnit`
- Structure similar but naming differs

**Status:** Functionally similar, verify behavior

### 4.8 Enhancement Selector - Available Options

**Alpine.js:**
- Uses `getAvailableEnhancements()` which returns all detachment enhancements
- Does not filter by unit type restriction in the selector itself

**Next.js:**
- May have different filtering logic

**Status:** Verify enhancement availability logic

### 4.9 Delete List Confirmation

**Alpine.js:**
- Uses native `confirm()` dialog:
```javascript
async deleteList(filename) {
  if (!confirm('Are you sure you want to delete this list?')) return
  // ...
}
```

**Next.js:**
- May use custom modal or different confirmation

**Status:** Verify delete confirmation exists

### 4.10 Import Modal - Textarea Placeholder

**Alpine.js:**
- Placeholder: `placeholder='{"roster": {...}}'`

**Next.js:**
- Verify placeholder matches

**Status:** Minor, verify matches

### 4.11 Points Status Calculation

**Alpine.js:**
```javascript
get pointsStatus() {
  const over = this.totalPoints - this.currentList.pointsLimit
  if (over > 10) return 'error'
  if (over > 0) return 'warning'
  return 'ok'
}
```

**Next.js:**
```javascript
const pointsStatus = currentPoints > pointsLimit ? 'error' : percentage >= 90 ? 'warning' : 'ok';
```

**Critical difference:**
- Alpine: warning when 1-10 pts over, error when >10 over
- Next.js: warning when ≥90% filled, error when over limit

**Fix needed:** Match Alpine's points status logic (allows going slightly over)

---

---

## 5. Additional Differences Found (Pass 4)

### 5.1 Play Mode - Stepper Layout for Battle Round

**Alpine.js:**
- Stepper buttons are BEFORE the number: `[- ] [ + ] 1`
- Layout: `<stepper buttons> <number>`

**Next.js:**
- Layout matches: stepper then number

**Status:** Appears to match

### 5.2 Play Mode - Unit Card Wounds Display

**Alpine.js:**
- Shows `W: {current}/{max}` for wounds

**Next.js:**
- Same format

**Status:** Matches

### 5.3 Build Mode - Unit Details Panel Empty State

**Alpine.js:**
```html
<div class="text-center py-8 text-white/40 text-sm">
  <p class="text-lg mb-1">Select a unit</p>
  <p class="text-sm">Click on a unit in your army list or roster to view details</p>
</div>
```

**Next.js:**
```typescript
<div className="flex flex-col h-full items-center justify-center text-white/40">
  <p>Select a unit from your army list</p>
  <p className="text-xs mt-1">or add one from the roster</p>
</div>
```

**Fix needed:** Match Alpine's text and styling exactly

### 5.4 Play Mode - Leader Indicator on PlayUnitCard

**Alpine.js:**
- Shows leader in unit name: `"Unit Name + Leader Name"`
- Also shows separate purple indicator below

**Next.js:**
- Shows combined name AND a separate `+ LeaderName` indicator below

**Status:** Next.js shows BOTH which may be redundant - verify Alpine doesn't double-display

### 5.5 Build Mode - Weapon Abilities Display in Details Panel

**Alpine.js:**
- Weapon abilities in yellow/accent color: `text-accent-400`

**Next.js:**
- Same: `text-accent-400`

**Status:** Matches

### 5.6 Play Mode - Section Header for Stratagems

**Alpine.js:**
- Uses `section-header` class (with padding `24px 16px 8px`)

**Next.js:**
- Uses `section-header` class

**Status:** Verify padding matches CSS

### 5.7 Build Mode - Configuration Row Layout

**Alpine.js:**
```html
<div class="flex gap-2 mb-3 flex-shrink-0">
  <div class="flex-1">Format dropdown</div>
  <div class="flex-1">Points dropdown</div>
</div>
<div class="mb-3">Detachment dropdown (full width)</div>
```

**Next.js:**
```typescript
<div className="space-y-3 mb-4 shrink-0">
  <div className="grid grid-cols-2 gap-3">
    <div>Format segmented control</div>
    <div>Points dropdown</div>
  </div>
  <div>Detachment dropdown</div>
</div>
```

**Fix needed:**
- Format should be a dropdown, not segmented control
- Use `flex gap-2` instead of `grid grid-cols-2 gap-3`

### 5.8 Build Mode - Format Selector Options

**Alpine.js:**
- Uses `<select>` with options from `Object.entries(gameFormats)`
- Each option shows `format.name`

**Next.js:**
- Uses segmented control with hardcoded "Standard" and "Colosseum"

**Fix needed:** Change to dropdown matching Alpine

### 5.9 Unit Roster - Accordion Collapse Animation

**Alpine.js:**
- Uses `x-collapse` directive for smooth height animation

**Next.js:**
- Uses `max-h-[2000px]` transition which may have different timing

**Status:** Functionally similar but animation may differ

### 5.10 Game State Panel - Stepper Value Display

**Alpine.js:**
- Battle round value: `text-4xl font-bold text-white w-8 text-center`
- CP value: `text-4xl font-bold text-accent-400 w-8 text-center`

**Next.js:**
- Same styling

**Status:** Matches

---

## Priority Fixes

### High Priority (Functionality)
1. **Format-dependent points options** - Wrong behavior for Colosseum format
2. **Points status calculation** - Different warning/error thresholds
3. **Battle round reset activations** - Missing feature
4. **Model count change weapon redistribution** - May be broken
5. **Format selector type** - Should be dropdown, not segmented control

### Medium Priority (Design)
1. **Model count selector** - Should be dropdown not stepper
2. **Loadout display with Replace/Add labels** - Visual mismatch
3. **Unit roster points display** - Should show range not minimum
4. **Quick Reference wargear abilities** - Missing section
5. **Unit details empty state text** - Different wording
6. **Group label colors** - Should be `text-accent-300`

### Low Priority (Polish)
1. **Accordion styling differences**
2. **Empty state text variations**
3. **Badge sizing consistency**
4. **Configuration row layout** (flex vs grid)

---

## Files to Modify

| File | Priority | Changes Needed |
|------|----------|----------------|
| `src/components/build/ArmyListPanel.tsx` | High | Format selector (dropdown), points options |
| `src/stores/armyStore.ts` | High | Format-dependent points logic |
| `src/components/build/BuildMode.tsx` | Medium | Points status calculation |
| `src/components/build/ListUnitCard.tsx` | High | Model count dropdown, loadout styling |
| `src/components/build/UnitRosterPanel.tsx` | Medium | Points range display, group categories, group label colors |
| `src/components/build/UnitDetailsPanel.tsx` | Low | Empty state text |
| `src/stores/gameStore.ts` | High | Activation reset on round change |
| `src/components/play/GameStatePanel.tsx` | Medium | Auto-collapse on activation |
| `src/app/page.tsx` | Medium | Quick Reference wargear abilities section |

---

## Verification Checklist

After making fixes, verify these behaviors match Alpine.js:

- [x] Format dropdown shows format names (not segmented control) ✅ FIXED
- [x] Points dropdown options change based on selected format ✅ FIXED
- [x] Colosseum format only shows 500 pts option ✅ FIXED
- [x] Points warning at 1-10 pts over limit (not at 90% fill) ✅ FIXED
- [x] Points error at >10 pts over limit (not at exactly over) ✅ FIXED
- [x] Model count uses dropdown (not stepper) ✅ FIXED
- [x] Unit roster shows points range "150-190 pts" (not "150+ pts") ✅ FIXED
- [x] Group labels use `text-accent-300` color ✅ FIXED
- [x] Wargear Abilities section appears in Quick Reference ✅ FIXED
- [x] Battle round change resets activation states ✅ ALREADY IMPLEMENTED
- [x] Loadout groups auto-collapse when activated ✅ ALREADY IMPLEMENTED
- [x] Leader sections auto-collapse when activated ✅ ALREADY IMPLEMENTED
- [x] Weapon count redistribution works on model count change ✅ ALREADY IMPLEMENTED
- [ ] Delete list shows native confirm() dialog (uses custom modal)
- [x] Empty state text matches Alpine.js ✅ FIXED
- [x] Accordion styling matches Alpine.js ✅ FIXED
- [x] Attached-as-leader opacity is 60% (not 75%) ✅ FIXED

---

## Fixes Applied (2024-01-23)

### High Priority Fixes Implemented:
1. **Format selector** - Changed from segmented control to dropdown
2. **Format-dependent points options** - Standard: [500, 1000, 2000], Colosseum: [500]
3. **Auto-adjust points on format change** - Resets to first option if current limit not available
4. **Points status calculation** - Now warning at 1-10 pts over, error at >10 over

### Medium Priority Fixes Implemented:
1. **Model count selector** - Changed from Stepper to dropdown with "X models" text
2. **Unit roster points display** - Now shows range "150-190 pts" for multi-model units
3. **Group label colors** - Changed to `text-accent-300` (gold/themed)
4. **Accordion styling** - Updated to match Alpine (transparent bg, hover:bg-white/5, chevron rotates 180°)
5. **Wargear Abilities section** - Added to Quick Reference panel with orange styling
6. **Empty state text** - Updated to match Alpine exactly in ArmyListPanel and UnitDetailsPanel

### Other Fixes:
1. **Attached-as-leader opacity** - Changed from `opacity-75` to `opacity-60`
2. **Removed purple border** - Attached leaders no longer have border-l-4 styling

---

## Fixes Applied (Pass 5 - Play Mode Right Panel)

### Play Mode SelectedUnitDetailsPanel:
1. **Leader badge text** - Changed from leader enhancement name to leader unit name
2. **Stats labels** - Changed from uppercase to lowercase (matching Alpine: m, t, sv, w, ld, oc)
3. **Removed Abilities sections** - Alpine Play Mode doesn't show Unit Abilities or Leader Abilities
4. **Added leader collapse/activation** - Leader weapons now have accordion with Act toggle

### PlayModeWeaponsDisplay:
1. **Leader weapons section** - Changed from static card to collapsible accordion with activation toggle
2. **Leader header styling** - Purple when not activated, green when activated
3. **Leader activation toggle** - Added Act button matching loadout group style

### WeaponStatsTable (complete rewrite):
1. **Removed duplicate section headers** - RANGED/MELEE headers now only in LoadoutGroupCard
2. **Removed WEAPON column** - Weapon name now displayed above stats table, not in column
3. **Removed ABILITIES column** - Abilities now plain text below stats, not badges in column
4. **Weapon structure** - Now matches Alpine: name → stats table → abilities text

### LoadoutGroupAccordion:
1. **Chevron direction** - Changed from right-pointing to down-pointing arrow (M19 9l-7 7-7-7)
2. **Chevron rotation** - Now rotates -90deg when collapsed (not +90deg when expanded)
3. **Chevron color** - Now green when activated, gray when not
4. **Act button styling** - Changed to bg-white/20 when not activated (was bg-gray-600)
5. **Hover state** - Changed to hover:bg-white/5 when not activated
6. **Content padding** - Changed to px-2 pb-2 with no background
