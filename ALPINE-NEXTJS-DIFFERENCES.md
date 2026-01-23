# Alpine.js vs Next.js Implementation Differences

This document lists all differences between the original Alpine.js implementation and the current Next.js version. Items marked with `[FIXED]` have been addressed. Items marked `[TODO]` still need to be fixed.

---

## Build Mode

### Army List Panel (Left Column)

#### List Unit Cards
- `[TODO]` **Model count selector**: Alpine uses a dropdown `<select>` with "X models" text. Next.js uses a Stepper component.
- `[TODO]` **Unit row styling**: Alpine uses `list-row` class with more compact styling. Next.js cards are taller with more padding.
- `[FIXED]` **Weapon loadout row styling**: Alpine has `bg-black/20 rounded-lg px-3 py-2` for each weapon choice row. Now matches in Next.js.
- `[TODO]` **Weapon count display**: Alpine shows the count on the right side of the stepper inline. Need to verify Next.js stepper matches.
- `[FIXED]` **Loadout labels removed**: Previously showed "Replace with:" and "Add:" - now removed per user request.
- `[FIXED]` **Addition pattern border**: Alpine has `border-l-2 border-green-500` for addition choices. Now matches in Next.js.

#### Points Summary Bar
- `[TODO]` **Points display styling**: Verify the progress bar and points status colors match Alpine.js.

### Unit Roster Panel (Middle Column)

- `[TODO]` **Accordion expand/collapse**: Alpine uses `x-collapse` for smooth animations. Verify Next.js accordion has similar animations.
- `[TODO]` **Unit row click behavior**: Alpine highlights with `bg-accent-tint-strong` on selection. Verify Next.js matches.

### Unit Details Panel (Right Column)

- `[FIXED]` **Invuln badge position**: Now shows invuln badge centered below the stats grid.
- `[FIXED]` **Weapon display**: Now shows weapons in individual cards with `bg-black/20 rounded-lg p-3`.
- `[FIXED]` **Weapon abilities display**: Now shows abilities as comma-separated text below weapon stats in accent color.

---

## Play Mode

### Army Overview Panel (Left Column)

- `[TODO]` **Unit card selection ring**: Alpine uses `ring-2 ring-accent-500`. Verify Next.js matches.
- `[FIXED]` **Models alive display**: Now shows "X/Y models" with red text when damaged.
- `[FIXED]` **Leader indicator**: Now shows "+ LeaderName" text below unit when leader is attached.
- `[FIXED]` **Wounds display**: Now shows "W: X/Y" on the right side of each unit card.
- `[FIXED]` **Chevron icon**: Now shows a chevron (`>`) on the right of each unit card.
- `[FIXED]` **Points display**: Now shows unit points (including leader if attached) on the right side.
- `[FIXED]` **Combined unit name**: Now shows combined unit name when leader is attached (e.g., "Custodian Guard + Shield-Captain").

### Game State Panel (Middle Column)

- `[FIXED]` **Battle Round stepper layout**: Already shows the round number (large) on the RIGHT of the stepper.
- `[FIXED]` **Command Points stepper layout**: Same as above - number on the right.
- `[TODO]` **Ka'tah state storage**: Alpine stores `currentList.activeKatah`, Next.js stores `gameState.katah`. Need to verify both work correctly.
- `[TODO]` **Ka'tah description display**: Alpine shows the description with "Melee weapons gain" removed. Verify Next.js does the same.
- `[TODO]` **Stratagem list styling**: Alpine uses `inset-group-item` class with specific hover states.
- `[FIXED]` **Detachment Rules section**: Now shows detachment rules at the bottom of game state panel.

### Selected Unit Details Panel (Right Column)

#### Unit Stats
- `[TODO]` **Stat labels**: Alpine shows stat labels as uppercase abbreviations (M, T, SV, W, LD, OC). Verify Next.js matches.
- `[TODO]` **Modified stat styling**: Alpine uses `modified` class with cursor-help. Verify Next.js tooltip shows modifier sources.

#### Wounds Tracker
- `[FIXED]` **Damage section title**: Now shows "Damage" as section title.
- `[FIXED]` **Models alive display**: Now shows "X / Y models" with large number for alive count.
- `[FIXED]` **Wound dots**: Now shows dots for multi-wound models to track current model wounds.
- `[FIXED]` **Wound buttons**: Now shows "- Wound" (red) and "+ Heal" (green) buttons with color-coded text.
- `[FIXED]` **Leader wounds section**: Now has purple-themed section for leader wounds with separate controls.

#### Weapons Display
- `[FIXED]` **Weapon grouping by loadout**: Implemented with LoadoutGroupCard.
- `[FIXED]` **Activation tracking**: Groups can be marked as "activated" (green styling).
- `[FIXED]` **Activation button text**: Now shows "Act" button that changes to "✓" when activated.
- `[FIXED]` **Model count prefix**: Now shows "4×" before the weapon group name in accent color.
- `[FIXED]` **Paired indicator**: Now shows "⬡" symbol in blue for paired loadouts.
- `[FIXED]` **Weapon stat table headers**: Now uses "RNG" instead of "Range" for ranged weapons.
- `[FIXED]` **Modified weapon stats**: Stats modified by stratagems now shown in accent color.
- `[FIXED]` **Modified stat color**: Now uses `text-accent-400` for modified stats to match faction accent color.

#### Leader Weapons Section
- `[FIXED]` **Leader section styling**: Has purple border and background for leader section.
- `[TODO]` **Leader activation button**: Purple "Act" button that changes to green "✓" when activated.
- `[FIXED]` **Leader collapse/activation state**: Added to gameStore.

#### Active Modifiers Section
- `[FIXED]` **Ka'tah modifier display**: Now shows Ka'tah name and description in accent-tinted box.
- `[FIXED]` **Enhancement modifier display**: Now shows enhancement name in accent-tinted box.
- `[FIXED]` **Stratagem modifier display**: Now shows stratagem names in stronger accent-tinted boxes.
- `[FIXED]` **Empty state**: Now shows "No modifiers active" when nothing is active.

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
- `[FIXED]` **list-row**: Compact list row styling (exists in globals.css)
- `[FIXED]` **list-row-compact**: Even more compact variant (exists in globals.css)
- `[TODO]` **inset-group-item**: Inset group item styling for stratagems
- `[FIXED]` **wound-dot**: Circle for tracking individual model wounds (exists in globals.css)
- `[TODO]` **touch-highlight**: Touch feedback for mobile
- `[TODO]` **scroll-smooth**: Smooth scrolling for overflow containers
- `[TODO]` **animate-spring**: Spring animation for modals

### Color Tokens
- `[FIXED]` **Modified stats**: Now uses `text-accent-400` for modified stats.

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
- [x] Points display in Play Mode unit cards
- [x] Wound tracker with dots, buttons, and layout
- [x] Active modifiers summary section

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
1. ~~Battle Round/CP stepper layout (number on right)~~ DONE
2. ~~Wounds tracker UI (dots, buttons, layout)~~ DONE
3. ~~Modified stat color (accent vs green)~~ DONE
4. ~~Play Mode unit card (points, wounds, chevron, combined name)~~ DONE
5. ~~Active modifiers section~~ DONE

### Medium Priority (Visual Polish)
6. Unit card compact styling (Build Mode)
7. ~~Weapon choice row backgrounds~~ DONE
8. Section headers and colors
9. Animation classes
10. Leader activation button (purple "Act")

### Low Priority (Nice to Have)
11. Touch highlight feedback
12. Smooth scroll behavior
13. Spring animations
