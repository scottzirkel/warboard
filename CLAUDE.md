# Army Tracker - Project Guide

A Warhammer 40k army list builder and game state tracker, currently focused on **Adeptus Custodes**.

## Tech Stack

- **Frontend**: Alpine.js (lightweight reactive framework) + Tailwind CSS
- **Backend**: Simple PHP API (`api.php`) for list persistence
- **Build Tool**: Vite
- **Data**: JSON files in `/data/`
- **Storage**: File-based JSON in `/data/lists/`

No Laravel, Vue, or React. This is intentionally lightweight.

## Project Structure

```
army-tracker/
├── src/
│   ├── main.js          # Alpine.js app (~715 lines, all state/logic)
│   └── style.css        # Tailwind + custom styles
├── data/
│   ├── custodes.json    # Unit data, detachments, enhancements, abilities
│   └── lists/           # Saved army lists (JSON files)
├── api.php              # Backend: save/load/delete lists
├── index.html           # UI template with Alpine.js bindings
├── vite.config.js
└── package.json
```

## Running the App

```bash
npm install
npm run dev          # Starts Vite dev server on localhost:5173
php -S localhost:8000 # Serve PHP API (separate terminal)
```

Access at `http://localhost:8000` (PHP serves index.html, Vite handles JS/CSS hot reload).

---

## Warhammer 40k 10th Edition - Core Rules Reference

### Unit Stats
| Stat | Meaning |
|------|---------|
| M | Movement (inches per move) |
| T | Toughness (defensive stat vs Strength) |
| SV | Save (armor save on d6, lower is better - "2+" is best) |
| W | Wounds (health per model) |
| LD | Leadership (morale checks, lower is better) |
| OC | Objective Control (for holding objectives) |
| Invuln | Invulnerable save (cannot be modified, optional) |

### Weapon Stats
**Ranged:**
| Stat | Meaning |
|------|---------|
| Range | Maximum distance in inches |
| A | Attacks (number of shots) |
| BS | Ballistic Skill (hit roll target, "2+" hits on 2+) |
| S | Strength (compared to target T to wound) |
| AP | Armor Penetration (modifier to enemy save, -2 means 2+ becomes 4+) |
| D | Damage (wounds dealt per failed save) |

**Melee:**
| Stat | Meaning |
|------|---------|
| A | Attacks (number of swings) |
| WS | Weapon Skill (hit roll target) |
| S | Strength |
| AP | Armor Penetration |
| D | Damage |

### Common Weapon Abilities
- **Assault**: Can shoot after Advancing (at -1 to hit)
- **Pistol**: Can shoot in Engagement Range
- **Blast**: +1 attack per 5 models in target unit (min 3 attacks vs 6+ models)
- **Devastating Wounds**: Critical wounds (6s) skip saves entirely
- **Lethal Hits**: Critical hits (6s) auto-wound
- **Sustained Hits X**: Critical hits generate X additional hits
- **Twin-linked**: Re-roll wound rolls

### Game Flow
1. **Command Phase**: Gain CP, use start-of-turn abilities
2. **Movement Phase**: Move units (M stat in inches)
3. **Shooting Phase**: Ranged attacks
4. **Charge Phase**: Declare and roll charges (2d6 inches)
5. **Fight Phase**: Melee combat
6. **Morale Phase**: Battle-shock tests

### Wounding Chart
| Strength vs Toughness | Wound Roll Needed |
|-----------------------|-------------------|
| S >= 2x T | 2+ |
| S > T | 3+ |
| S = T | 4+ |
| S < T | 5+ |
| S <= T/2 | 6+ |

---

## King of the Colosseum - Custom Game Mode

A narrative 500-point format with specific list-building restrictions:

### Requirements
1. **Warlord Required**: Must include at least one Character (non-Epic Hero) as Warlord
2. **No Epic Heroes**: Named characters are forbidden
3. **Infantry Core**: Must include 2+ Infantry units that are NOT Characters
4. **No Heavy Armor**: Units with T10+ are forbidden

### Validation
The app enforces these rules when "Colosseum" format is selected. Errors display in the Army List panel and block Play Mode until resolved.

---

## Adeptus Custodes - Faction Overview

Elite army of the Emperor's personal guardians. Low model count, extremely high stats.

### Key Characteristics
- **Elite Infantry**: 2+ Save, 4+ Invuln, 3 Wounds per model (base)
- **High Points Cost**: Individual models cost 30-50+ points
- **Small Armies**: Typical 500pt list has 10-15 models total
- **Versatile Weapons**: Most weapons are good at both shooting and melee

### Army Rule: Martial Ka'tah
Choose a stance each round that grants army-wide bonuses:
- **Dacatarai**: Re-roll hit rolls of 1 (melee)
- **Rendax**: +1 to wound rolls (vs wounded units)

### Common Units
- **Custodian Guard**: Battleline, 4-5 models, Guardian Spears or Sentinel Blades
- **Custodian Wardens**: Elite infantry, work well with attached Characters
- **Allarus Custodians**: Terminators, deep strike, high toughness
- **Shield-Captain**: Character, can take enhancements
- **Blade Champion**: Melee-focused Character

### Detachments Available
- **Shield Host**: Balanced, good stratagems
- **Talons of the Emperor**: Sisters of Silence synergy
- **Null Maiden Vigil**: Anti-psyker focus
- **Auric Champions**: Character-focused
- **Solar Spearhead**: Bikes and vehicles
- **Lions of the Emperor**: Aggressive melee

---

## Data Structures

### Unit (in custodes.json)
```javascript
{
  id: "custodian-guard",
  name: "Custodian Guard",
  points: { "4": 150, "5": 190 },  // Model count -> points
  stats: { m: 6, t: 6, sv: "2+", w: 3, ld: "6+", oc: 2 },
  invuln: "4+",
  weapons: [...],
  loadoutOptions: [...],  // Weapon/equipment choices
  abilities: [...],
  keywords: ["Infantry", "Battleline", "Imperium", "Adeptus Custodes"]
}
```

### List Unit (in saved lists)
```javascript
{
  unitId: "custodian-guard",
  modelCount: 5,
  enhancement: "auric-mantle",  // Enhancement ID or empty string
  loadout: { "main-weapon": "spears", "vexilla": "none" },
  currentWounds: null  // Set during play, null = full health
}
```

### Enhancement
```javascript
{
  id: "auric-mantle",
  name: "Auric Mantle",
  points: 15,
  description: "Shield-Captain or Blade Champion only. Bearer gains +2 Wounds.",
  modifiers: [
    { stat: "w", operation: "add", value: 2, scope: "model" }
  ]
}
```

### Loadout Option (in unit.loadoutOptions)
```javascript
{
  id: "main-weapon",
  name: "Weapon",
  type: "choice",           // "choice" or "optional"
  pattern: "replacement",   // "replacement" or "addition"
  choices: [
    { id: "spears", name: "Guardian Spears", default: true },
    { id: "blades", name: "Sentinel Blades + Shield", maxModels: 1 }
  ]
}
```

### Loadout Pattern Values
- `replacement`: Selecting a choice replaces the default weapon (e.g., swapping Guardian Spear for Castellan Axe)
- `addition`: Selecting a choice adds equipment while keeping the base weapon (e.g., adding Vexilla to a model)

### Loadout Choice Fields
- `id`: Unique identifier for the choice
- `name`: Display name
- `default`: (optional) If true, this is the pre-selected option
- `maxModels`: (optional) Maximum number of models that can take this option (e.g., "1 model can be equipped with a vexilla" → `maxModels: 1`)
- `paired`: (optional) If true, this choice represents two items that must be equipped together (e.g., "Sentinel Blade + Praesidium Shield" → `paired: true`)

### Weapon Modifiers
Weapons can have a `modifiers` array that grants stat bonuses when the weapon is equipped:
```javascript
{
  id: "sentinel-blade",
  name: "Sentinel Blade",
  type: "melee",
  stats: { a: 5, ws: "2+", s: 6, ap: -2, d: 1 },
  abilities: [],
  loadoutGroup: "blades",
  modifiers: [
    { stat: "w", operation: "add", value: 1, scope: "model", source: "Praesidium Shield" }
  ]
}
```

### Modifier Fields
- `stat`: The stat to modify (e.g., "w" for wounds, "a" for attacks)
- `operation`: How to apply the modifier (see Modifier Operations)
- `value`: The numeric value for the operation
- `scope`: What the modifier affects (see Modifier Scopes)
- `source`: (optional) The name of the wargear/ability granting this modifier, for display in tooltips

### Modifier Operations
- `add`: Add value to stat
- `subtract`: Subtract value from stat
- `multiply`: Multiply stat by value
- `set`: Replace stat with value

### Modifier Scopes
- `model`: Affects the model's base stats
- `unit`: Affects the entire unit
- `melee`: Affects melee weapons only
- `ranged`: Affects ranged weapons only
- `weapon`: Affects all weapons

### Leader Ability (in unit.abilities)
Character units with the Leader ability can attach to specific bodyguard units:
```javascript
{
  id: "leader",
  name: "Leader",
  description: "This model can be attached to Custodian Guard or Custodian Wardens.",
  eligibleUnits: ["custodian-guard", "custodian-wardens"]
}
```

### Leader Ability Fields
- `id`: Always "leader" for leader abilities
- `name`: Always "Leader"
- `description`: Human-readable description of attachment rules
- `eligibleUnits`: Array of unit IDs this leader can attach to

---

## Current Features

### Build Mode
- Unit selection from roster (grouped by type)
- Model count selection per unit
- Loadout customization (weapon choices, Vexilla)
- Enhancement selection for Characters
- Points calculation with limit enforcement
- Game format selection (Standard / Colosseum)
- Detachment selection
- List save/load/delete
- Yellowscribe import

### Play Mode
- Battle round tracking (1-5)
- Command points tracking
- Martial Ka'tah stance selection
- Stratagem activation/deactivation
- Unit selection with modified stat display
- Basic wound tracking (unit-level, not per-model)
- Active modifiers summary

### Quick Reference Panel
- Detachment stratagems
- Weapon ability definitions
- Unit ability definitions

---

## Planned Features (from feature-list.md)

1. **Leader Attachment**: Attach Character leaders to units, apply their modifiers to the combined unit
2. **Per-Model Wound Tracking**: Track damage per individual model, show model count decreasing as models die
3. **Enhancements in Quick Reference**: Add enhancement descriptions to the reference panel
4. **Dropdown Icon Spacing**: CSS fix for loadout dropdowns
5. **Mixed Weapons**: Allow different models in a unit to have different weapon selections
6. **Vexilla Availability**: Extend Vexilla option to units beyond Custodian Guard

---

## Development Guidelines

### Keep It Simple
This is a lightweight app. Avoid over-engineering:
- No build abstractions or component libraries
- Single JS file is intentional
- Direct DOM manipulation via Alpine.js

### Data-Driven
- Unit stats and rules come from JSON files
- Add new armies by creating new JSON files
- Modifiers are declarative, not hard-coded

### State Management
All state lives in the Alpine.js component:
- `currentList`: The active army list being built/played
- `gameState`: Play mode state (round, CP, active stratagems)
- `data`: Loaded faction data from JSON

### Testing Changes
1. Run dev server: `npm run dev`
2. Run PHP server: `php -S localhost:8000`
3. Test both Build and Play modes
4. Test list save/load functionality
5. Test Colosseum validation if relevant

### Adding Units
Edit `data/custodes.json`:
1. Add unit to `units` array
2. Include all stats, weapons, abilities
3. Add loadout options if unit has choices
4. Ensure keywords are accurate for grouping

### Wargear Options - IMPORTANT
**Always check the actual datasheet wargear options text** before modeling weapon choices:
1. Look for "can be replaced with" - indicates substitution
2. Look for "can be equipped with" - indicates addition (keeps original weapon)
3. Note paired loadouts (e.g., "blade and shield" as one option)
4. Check for "1 model" vs "any number of models" restrictions
5. Check wargear abilities for stat modifiers (e.g., Praesidium Shield adds +1 Wounds)

Example patterns:
- **Replacement**: "guardian spear can be replaced with 1 castellan axe" → mutually exclusive
- **Addition**: "1 model can be equipped with a vexilla" → keeps their weapon
- **Paired**: "1 sentinel blade and 1 praesidium shield" → must take both together

### Adding Enhancements
Edit the relevant detachment in `data/custodes.json`:
1. Add to `detachments.[detachment].enhancements`
2. Include modifiers array if it affects stats
3. Points are required

---

## Data Sources

Unit stats, points costs, and rules are sourced from:

- **Wahapedia** (primary): https://wahapedia.ru/wh40k10ed/factions/adeptus-custodes/
- **Goonhammer Review**: https://www.goonhammer.com/codex-adeptus-custodes-10th-edition-the-goonhammer-review/
- **Munitorum Field Manual** (points): https://spikeybits.com/munitorum-field-manual-points-update-10th-edition-40k-changes-guide/

When updating unit data, cross-reference Wahapedia for current stats and the Munitorum Field Manual for latest points costs.

---

## Ralph Task Runner

Ralph is an automated task runner that uses Claude Code to implement features from a PRD (Product Requirements Document).

### Files

- **PRD.jsonl**: Feature specifications in JSON Lines format. Each line is a task with:
  ```json
  {"id":"feature-001","category":"setup","phase":"phase-1","description":"Feature description","passes":false,"acceptance":["Acceptance criteria 1","Criteria 2"],"dependencies":["other-feature-id"]}
  ```
- **progress.txt**: Log of completed work with decisions made and files changed
- **ralph-once.sh**: Run one iteration (Human-in-the-Loop mode)
- **afk-ralph.sh**: Run multiple iterations autonomously (AFK mode)

### Usage

**Single iteration (recommended for debugging/refinement):**
```bash
./ralph-once.sh
```

**Multiple iterations (once you trust the output):**
```bash
./afk-ralph.sh 5      # Run up to 5 iterations
./afk-ralph.sh 10     # Run up to 10 iterations
./afk-ralph.sh --sandbox  # Run in Docker sandbox (safer for AFK)
```

### How It Works

1. Ralph reads CLAUDE.md, PRD.jsonl, and progress.txt
2. Finds incomplete features (`"passes":false`) with met dependencies
3. Implements ONE feature following project conventions
4. Runs feedback loops (npm run build)
5. Updates progress.txt and marks the feature `"passes":true` in PRD.jsonl
6. Commits all changes together
7. Repeats until all features complete or max iterations reached

### Adding Tasks

Add a line to PRD.jsonl:
```json
{"id":"feature-001","category":"ui","phase":"phase-1","description":"Add dark mode toggle","passes":false,"acceptance":["Toggle visible in settings","Theme persists on reload"],"dependencies":[]}
```

### Priority Order

Ralph prioritizes tasks in this order:
1. Architectural decisions and core abstractions
2. Integration points between modules
3. Unknown unknowns and spike work
4. Standard features and implementation
5. Polish, cleanup, and quick wins
