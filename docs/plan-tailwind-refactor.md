# Plan: Replace CSS Classes with Tailwind in React Components

## Goal
Remove custom CSS classes from `globals.css` and replace them with Tailwind utilities directly in React components.

## What to Keep in globals.css
- `@import "tailwindcss"`
- `@theme` block (Tailwind theme extensions)
- `:root` and `[data-theme]` CSS variables (army themes)
- Scrollbar styles (`::-webkit-scrollbar` - no Tailwind equivalent)
- `body` base styles

## Components to Update

### High Priority (heavily used)

| Component | CSS Classes to Remove | File |
|-----------|----------------------|------|
| Badge | `.badge`, `.badge-accent`, `.badge-red`, `.badge-purple`, `.badge-green`, `.badge-blue` | `src/components/ui/Badge.tsx` |
| Button | `.btn-ios`, `.btn-ios-primary`, `.btn-ios-secondary`, `.btn-ios-tinted`, `.btn-ios-sm` | `src/components/ui/Button.tsx` |
| Card | `.card-depth` | `src/components/ui/Card.tsx` |
| SegmentedControl | `.segmented-control`, `.segmented-control-item` | **NEW** `src/components/ui/SegmentedControl.tsx` |
| StatCell | `.stat-cell`, `.stat-label`, `.stat-value` | `src/components/ui/StatCell.tsx` |

### Medium Priority

| Component | CSS Classes to Remove | File |
|-----------|----------------------|------|
| Stepper | `.stepper`, `.stepper-btn`, `.stepper-divider` | `src/components/ui/Stepper.tsx` |
| Select | `.select-dark` | `src/components/ui/Select.tsx` |
| Input | `.input-dark` | `src/components/ui/Input.tsx` |
| SectionHeader | `.section-header`, `.section-header-inline` | **NEW** `src/components/ui/SectionHeader.tsx` |
| ListRow | `.list-row`, `.list-row-compact` | **NEW** `src/components/ui/ListRow.tsx` |

### Low Priority (minimal usage)

| Component | CSS Classes to Remove | Notes |
|-----------|----------------------|-------|
| Material styles | `.material-dark`, `.material-elevated`, `.nav-blur` | Used in 3 places, can inline |
| InsetGroup | `.inset-group`, `.inset-group-item` | Only in GameStatePanel |
| WeaponTable | `.weapon-table` | Only in UnitDetailsPanel |
| Divider | `.divider` | Simple, inline where needed |

### Unused (delete from CSS)
- `.pill-toggle` (not used)
- `.wound-dot` (not used)
- `.stat-modified` (legacy)
- `.stat-highlight` (legacy)

## Tailwind Conversions

### Badge
```tsx
// Before: className="badge badge-accent"
// After:
const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold";
const variants = {
  default: "bg-white/10 text-white/60",
  accent: "bg-accent-500/20 text-accent-400",
  success: "bg-green-500/20 text-green-400",
  error: "bg-red-500/20 text-red-400",
  // ...
};
```

### Button
```tsx
// Before: className="btn-ios btn-ios-primary"
// After:
const base = "min-h-[44px] px-4 rounded-xl font-semibold text-[15px] transition-all inline-flex items-center justify-center gap-1.5 active:scale-[0.97] active:opacity-80";
const variants = {
  primary: "bg-gradient-to-b from-accent-500 to-accent-600 text-gray-900",
  secondary: "bg-white/15 text-white",
  // ...
};
```

### Card
```tsx
// Before: className="card-depth"
// After:
const base = "bg-[rgba(44,44,46,0.65)] rounded-2xl shadow-[0_0_0_0.5px_rgba(255,255,255,0.05),0_2px_8px_rgba(0,0,0,0.15),0_8px_24px_rgba(0,0,0,0.1)]";
```

### SegmentedControl (new component)
```tsx
// Container
const container = "flex items-stretch bg-white/10 rounded-lg p-0.5";
// Item
const item = "flex-1 flex flex-col items-center justify-center px-3 py-2 rounded-md text-sm font-medium text-white/60 transition-all cursor-pointer select-none text-center";
const itemActive = "bg-gray-500/85 text-white shadow-md";
```

## Implementation Order

1. **Create SegmentedControl component** - Currently uses raw CSS classes in 3 files
2. **Update Badge** - Most used, straightforward conversion
3. **Update Button** - Second most used
4. **Update Card** - Complex shadow, test carefully
5. **Update StatCell** - Play mode critical
6. **Update Stepper, Select, Input** - Medium priority
7. **Create SectionHeader, ListRow** - Low priority helpers
8. **Clean up unused CSS** - Delete legacy classes
9. **Inline remaining one-off styles** - material, inset-group, etc.

## Files to Modify

### New Files
- `src/components/ui/SegmentedControl.tsx`
- `src/components/ui/SectionHeader.tsx`
- `src/components/ui/ListRow.tsx`

### Update Files
- `src/components/ui/Badge.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/StatCell.tsx`
- `src/components/ui/Stepper.tsx`
- `src/components/ui/Select.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/index.ts` (add exports)

### Update Usages
- `src/components/navigation/Navigation.tsx` (SegmentedControl)
- `src/components/play/PlayMode.tsx` (SegmentedControl)
- `src/components/play/GameStatePanel.tsx` (SegmentedControl, material styles)
- Other files using raw CSS classes

### Trim CSS
- `src/app/globals.css` - Remove all component classes

## Verification

1. Run `npm run typecheck` after each component
2. Run `npm run lint` to catch issues
3. Visual test in browser:
   - Build mode: badges, buttons, cards render correctly
   - Play mode: stat cells, segmented controls work
   - Navigation: mode switcher looks right
4. Run `npm run build` to ensure production build works
