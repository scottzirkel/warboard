# Alpine.js Alignment Plan

Goal: Align the Next.js app with the original Alpine.js design in `/reference/alpine-original/`.

## Status Summary

| Phase | Status | Notes |
|-------|--------|-------|
| 1 - Navigation | ✅ Done | Simplified nav, segmented control, Quick Ref button |
| 2 - Quick Reference | ✅ Done | Slide-out panel from right edge |
| 3 - Build Mode | ✅ Done | Points summary, Army List, Roster, Unit Details |
| 4 - Play Mode | 🔴 Not started | Layout refinements needed |
| 5 - Modals | 🔴 Not started | Import/Load styling alignment |
| 6 - CSS | ✅ Done | All classes present in globals.css |

---

## Phase 1: Navigation ✅ COMPLETE

**File:** `src/components/navigation/Navigation.tsx`

Changes made:
- Removed "Army Tracker" title/icon
- Simplified to: army selector (left) → segmented control (center) → Quick Ref button (right)
- Replaced custom `ModeToggle` with proper `.segmented-control` CSS styling
- Added Quick Reference toggle button with book icon
- Removed `ListNameDisplay` and `UserMenu` from nav

---

## Phase 2: Quick Reference Panel ✅ COMPLETE

**File:** `src/app/page.tsx`

Changes made:
- Added `showReferencePanel` state
- Created slide-out panel with fixed positioning on right edge
- Smooth slide-in/out transition (`translate-x-full` → `translate-x-0`)
- Panel shows: stratagems, enhancements, weapon abilities, unit abilities
- Close button inside panel header
- Replaced inline QuickReferencePanel in PlayMode with "Select a unit" placeholder

---

## Phase 3: Build Mode Layout ✅ COMPLETE

### BuildMode.tsx
- Inlined Points Summary Bar with editable name input
- Detachment/format badges below name
- Large points display with color coding (ok/warning/error)
- Progress bar with color states
- Validation errors card with styled list
- 3-column grid with `.card-depth` panels

### ArmyListPanel.tsx
- Removed Panel/PanelSection, using direct markup
- Header with Import/Load/Save buttons inline
- Format as segmented control, Points as dropdown (in one row)
- Detachment selector full width
- Units section with `.section-header-inline` styling

### UnitRosterPanel.tsx
- Created inline `SimpleAccordion` component
- Search input with `.input-dark` styling
- Accordion groups with chevron rotation
- Units with `.list-row` and `.touch-highlight` styling

### UnitDetailsPanel.tsx
- Removed Panel/PanelSection
- Unit name with "+ Add" button option
- Badge-based character/enhancement indicators
- Weapon tables with proper type guards
- Abilities section with dark card styling

---

## Phase 4: Play Mode Layout 🔴 TODO

**Files to update:**
- `src/components/play/PlayMode.tsx`
- `src/components/play/ArmyOverviewPanel.tsx`
- `src/components/play/GameStatePanel.tsx`
- `src/components/play/SelectedUnitDetailsPanel.tsx`

**Changes needed:**
1. Remove PlayModeHeader (info now in nav/Points Summary)
2. Update ArmyOverviewPanel:
   - Unit cards with wound dots
   - Leader attachment indicators
   - Collapsed/expanded states
3. Update GameStatePanel:
   - Battle round stepper
   - Command points stepper
   - Ka'tah selector (segmented control style)
   - Stratagems as toggle buttons
4. Update SelectedUnitDetailsPanel:
   - Stats with modified values highlighted
   - Weapon groups with activation toggle
   - Damage tracker with wound dots

---

## Phase 5: Modals 🔴 TODO

**Files to update:**
- `src/components/ui/ImportModal.tsx`
- `src/components/ui/LoadModal.tsx`

**Changes needed:**
1. Modal backdrop styling (darker, blur)
2. Modal container with `.card-depth` or `.material-elevated`
3. Button styling with `.btn-ios-*` classes
4. Input styling with `.input-dark`
5. List items with `.list-row` styling

---

## Phase 6: CSS Classes ✅ COMPLETE

All required CSS classes present in `src/app/globals.css`:
- `.nav-blur` ✓
- `.card-depth` ✓
- `.segmented-control` / `.segmented-control-item` / `.active` ✓
- `.btn-ios`, `.btn-ios-primary`, `.btn-ios-secondary`, `.btn-ios-tinted`, `.btn-ios-sm` ✓
- `.stepper`, `.stepper-btn`, `.stepper-divider` ✓
- `.badge`, `.badge-accent`, `.badge-purple`, `.badge-blue`, `.badge-red` ✓
- `.stat-cell`, `.stat-label`, `.stat-value`, `.modified` ✓
- `.section-header`, `.section-header-inline` ✓
- `.list-row`, `.list-row-compact` ✓
- `.inset-group-item` ✓
- `.weapon-table` ✓
- `.select-dark`, `.input-dark` ✓
- `.wound-dot`, `.filled` ✓
- `.material-elevated` ✓
- `.touch-highlight` ✓
- `.scroll-smooth` ✓

---

## Reference Files

Located in `/reference/alpine-original/`:
- `index.html` - Original layout and component structure
- `main.js` - Original Alpine.js app logic
- `style.css` - Original styles including faction themes
