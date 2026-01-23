# Alpine.js vs Next.js Implementation Differences

This document lists all differences between the original Alpine.js implementation and the current Next.js version. Items marked with `[FIXED]` have been addressed. Items marked `[TODO]` still need to be fixed.

---

## Build Mode

### Army List Panel (Left Column)

#### List Unit Cards
- `[TODO]` **Model count selector**: Alpine uses a dropdown `<select>` with "X models" text. Next.js uses a Stepper component.
- `[TODO]` **Unit row styling**: Alpine uses `list-row` class with more compact styling. Next.js cards are taller with more padding.
- `[TODO]` **Weapon loadout row styling**: Alpine has `bg-black/20 rounded-lg px-3 py-2` for each weapon choice row. Next.js is missing the background styling.
- `[TODO]` **Weapon count display**: Alpine shows the count on the right side of the stepper inline. Need to verify Next.js stepper matches.
- `[FIXED]` **Loadout labels removed**: Previously showed "Replace with:" and "Add:" - now removed per user request.
- `[TODO]` **Addition pattern border**: Alpine has `border-l-2 border-green-500` for addition choices. Next.js has `border-l-2 border-green-500/30` (more transparent).

#### Points Summary Bar
- `[TODO]` **Points display styling**: Verify the progress bar and points status colors match Alpine.js.

### Unit Roster Panel (Middle Column)

- `[TODO]` **Accordion expand/collapse**: Alpine uses `x-collapse` for smooth animations. Verify Next.js accordion has similar animations.
- `[TODO]` **Unit row click behavior**: Alpine highlights with `bg-accent-tint-strong` on selection. Verify Next.js matches.

### Unit Details Panel (Right Column)

- `[TODO]` **Invuln badge position**: Alpine shows invuln badge centered below the stats grid. Next.js shows it inline with "Stats" header.
- `[TODO]` **Weapon display**: Alpine shows weapons in individual cards with `bg-black/20 rounded-lg p-3`. Verify Next.js matches.
- `[TODO]` **Weapon abilities display**: Alpine shows abilities as comma-separated text below weapon stats in accent color. Verify Next.js matches.

---

## Play Mode

### Army Overview Panel (Left Column)

- `[TODO]` **Unit card selection ring**: Alpine uses `ring-2 ring-accent-500`. Verify Next.js matches.
- `[TODO]` **Models alive display**: Alpine shows "X/Y models" with red text when damaged.
- `[TODO]` **Leader indicator**: Alpine shows "+ LeaderName" text below unit when leader is attached.
- `[TODO]` **Wounds display**: Alpine shows "W: X/Y" on the right side of each unit card.
- `[TODO]` **Chevron icon**: Alpine shows a chevron (`>`) on the right of each unit card indicating it can be selected.

### Game State Panel (Middle Column)

- `[TODO]` **Battle Round stepper layout**: Alpine shows the round number (large) on the RIGHT of the stepper, not in the middle. Format: `[- +]  5`
- `[TODO]` **Command Points stepper layout**: Same as above - number on the right.
- `[TODO]` **Ka'tah state storage**: Alpine stores `currentList.activeKatah`, Next.js stores `gameState.katah`. Need to verify both work correctly.
- `[TODO]` **Ka'tah description display**: Alpine shows the description with "Melee weapons gain" removed. Verify Next.js does the same.
- `[TODO]` **Stratagem list styling**: Alpine uses `inset-group-item` class with specific hover states.
- `[TODO]` **Detachment Rules section**: Alpine shows detachment rules at the bottom of game state panel. Verify Next.js includes this.

### Selected Unit Details Panel (Right Column)

#### Unit Stats
- `[TODO]` **Stat labels**: Alpine shows stat labels as uppercase abbreviations (M, T, SV, W, LD, OC). Verify Next.js matches.
- `[TODO]` **Modified stat styling**: Alpine uses `modified` class with cursor-help. Verify Next.js tooltip shows modifier sources.

#### Wounds Tracker
- `[TODO]` **Damage section title**: Alpine shows "Damage" as section title.
- `[TODO]` **Models alive display**: Alpine shows "X / Y models" with large number for alive count.
- `[TODO]` **Wound dots**: Alpine shows dots for multi-wound models to track current model wounds. Class `wound-dot` with `filled` state.
- `[TODO]` **Wound buttons**: Alpine shows "- Wound" (red) and "+ Heal" (green) buttons with color-coded text.
- `[TODO]` **Leader wounds section**: Alpine has purple-themed section for leader wounds with separate controls.

#### Weapons Display
- `[FIXED]` **Weapon grouping by loadout**: Implemented with LoadoutGroupCard.
- `[FIXED]` **Activation tracking**: Groups can be marked as "activated" (green styling).
- `[TODO]` **Activation button text**: Alpine shows "Act" button that changes to "✓" when activated.
- `[TODO]` **Model count prefix**: Alpine shows "4×" before the weapon group name. Verify Next.js format matches.
- `[TODO]` **Paired indicator**: Alpine shows "⬡" symbol for paired loadouts.
- `[TODO]` **Weapon stat table headers**: Alpine uses "RNG" not "Range" for ranged weapons.
- `[FIXED]` **Modified weapon stats**: Stats modified by stratagems now shown in green.
- `[TODO]` **Modified stat color**: Alpine uses `text-accent-400` for modified stats, Next.js uses `text-green-400`. Should match faction accent color.

#### Leader Weapons Section
- `[TODO]` **Leader section styling**: Alpine has purple border and background for leader section.
- `[TODO]` **Leader activation button**: Purple "Act" button that changes to green "✓" when activated.
- `[FIXED]` **Leader collapse/activation state**: Added to gameStore.

#### Active Modifiers Section
- `[TODO]` **Ka'tah modifier display**: Alpine shows Ka'tah name and description in accent-tinted box.
- `[TODO]` **Enhancement modifier display**: Alpine shows enhancement name in accent-tinted box.
- `[TODO]` **Stratagem modifier display**: Alpine shows stratagem names in stronger accent-tinted boxes.
- `[TODO]` **Empty state**: Alpine shows "No modifiers active" when nothing is active.

---

## Quick Reference Panel

- `[TODO]` **Panel position**: Alpine uses fixed right-side panel with slide-in animation.
- `[TODO]` **Panel styling**: Alpine uses `material-elevated` class.
- `[TODO]` **Section headers**: Alpine uses colored uppercase section headers (purple for stratagems, accent for enhancements, etc.).
- `[FIXED]` **Wargear abilities section**: Implemented.

---

## Modals

### Import Modal
- `[TODO]` **Animation**: Alpine uses `animate-spring` class for modal appearance.
- `[TODO]` **Textarea styling**: Alpine uses `input-dark font-mono text-sm`.

### Load Modal
- `[TODO]` **List item styling**: Alpine uses `list-row` class with hover states.
- `[TODO]` **Delete button**: Alpine shows trash icon on hover.

---

## Navigation

- `[TODO]` **Army selector**: Alpine shows army selector dropdown on the left of the nav bar.
- `[TODO]` **Mode segmented control**: Verify styling matches Alpine's `segmented-control` class.
- `[TODO]` **Play mode disabled state**: Alpine shows opacity-40 and cursor-not-allowed when list is invalid.
- `[TODO]` **Reference button styling**: Alpine toggles between `btn-ios-primary` and `btn-ios-tinted`.

---

## CSS Classes & Styling

### Missing/Different Classes
- `[TODO]` **list-row**: Compact list row styling
- `[TODO]` **list-row-compact**: Even more compact variant
- `[TODO]` **inset-group-item**: Inset group item styling for stratagems
- `[TODO]` **wound-dot**: Circle for tracking individual model wounds
- `[TODO]` **touch-highlight**: Touch feedback for mobile
- `[TODO]` **scroll-smooth**: Smooth scrolling for overflow containers
- `[TODO]` **animate-spring**: Spring animation for modals

### Color Tokens
- `[TODO]` **Modified stats**: Should use `text-accent-400` not `text-green-400`

---

## Functionality

### Already Implemented (Verified Working)
- [x] Model count changes adjust weapon counts
- [x] Single-model weapon mutual exclusivity
- [x] Filter out 'none' choice from weapon selector
- [x] maxModels validation
- [x] Toast notifications for leader attach/detach
- [x] Combined unit name with leader
- [x] Combined model count with leader
- [x] Loadout group activation tracking
- [x] Leader activation/collapse tracking
- [x] Stratagem modifiers on weapon stats
- [x] Wargear abilities in Quick Reference

### Needs Verification
- `[TODO]` **Battle round reset**: Should reset activation state when round changes.
- `[TODO]` **List save/load**: Verify all state is persisted correctly.
- `[TODO]` **Wound tracking persistence**: Verify wounds persist in Play Mode.
- `[TODO]` **Leader wound tracking**: Verify leader wounds track separately.

---

## Data/State Differences

- `[TODO]` **Ka'tah storage location**: Alpine uses `currentList.activeKatah`, Next.js uses `gameState.katah`. Should be consistent.
- `[TODO]` **Collapsed state persistence**: Should collapsed/activated states persist across mode switches?

---

## Priority Order for Fixes

### High Priority (Core Functionality)
1. Battle Round/CP stepper layout (number on right)
2. Wounds tracker UI (dots, buttons, layout)
3. Modified stat color (accent vs green)
4. Leader weapons section styling

### Medium Priority (Visual Polish)
5. Unit card compact styling
6. Weapon choice row backgrounds
7. Section headers and colors
8. Animation classes

### Low Priority (Nice to Have)
9. Touch highlight feedback
10. Smooth scroll behavior
11. Spring animations
