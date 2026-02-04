#!/usr/bin/env python3
"""
BSData Importer for Warboard

Converts BSData .cat files to Warboard JSON format.
BSData repository: https://github.com/BSData/wh40k-10e

Usage:
    # Generate reference JSON from BSData
    python scripts/bsdata-importer.py import /path/to/wh40k-10e "Imperium - Adeptus Custodes"

    # Compare against current Warboard data
    python scripts/bsdata-importer.py compare /path/to/wh40k-10e "Imperium - Adeptus Custodes" public/data/custodes.json

    # Sync points from BSData to Warboard (updates in place)
    python scripts/bsdata-importer.py sync /path/to/wh40k-10e "Imperium - Adeptus Custodes" public/data/custodes.json

Output is written to public/data/bsdata-{faction}.json
"""

import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Optional
from dataclasses import dataclass, field, asdict


# BSData type IDs
POINTS_TYPE_ID = "51b2-306e-1021-d207"

# Characteristic type IDs for unit stats
STAT_TYPE_IDS = {
    "e703-ecb6-5ce7-aec1": "m",   # Movement
    "d29d-cf75-fc2d-34a4": "t",   # Toughness
    "450-a17e-9d5e-29da": "sv",   # Save
    "750a-a2ec-90d3-21fe": "w",   # Wounds
    "58d2-b879-49c7-43bc": "ld",  # Leadership
    "bef7-942a-1a23-59f8": "oc",  # Objective Control
}

# Weapon characteristic type IDs
RANGED_WEAPON_STAT_IDS = {
    "914c-b413-91e3-a132": "range",
    "2337-daa1-6682-b110": "a",
    "94d-8a98-cf90-183d": "bs",
    "ab33-d393-96ce-ccba": "s",
    "41a0-1301-112a-e2f2": "ap",
    "3254-9fe6-d824-513e": "d",
}

MELEE_WEAPON_STAT_IDS = {
    "914c-b413-91e3-a132": "range",
    "2337-daa1-6682-b110": "a",
    "95d1-95f-45b4-11d6": "ws",
    "ab33-d393-96ce-ccba": "s",
    "41a0-1301-112a-e2f2": "ap",
    "3254-9fe6-d824-513e": "d",
}


@dataclass
class Weapon:
    id: str
    name: str
    type: str  # "ranged" or "melee"
    stats: dict
    abilities: list = field(default_factory=list)


@dataclass
class Ability:
    id: str
    name: str
    description: str


@dataclass
class Unit:
    id: str
    name: str
    points: dict  # model_count -> points
    stats: dict
    invuln: Optional[str] = None
    weapons: list = field(default_factory=list)
    abilities: list = field(default_factory=list)
    keywords: list = field(default_factory=list)


@dataclass
class Enhancement:
    id: str
    name: str
    points: int
    description: str = ""


@dataclass
class Detachment:
    id: str
    name: str
    rule_name: str
    rule_description: str
    enhancements: list = field(default_factory=list)
    stratagems: list = field(default_factory=list)


def clean_text(text: str) -> str:
    """Clean up BSData text formatting."""
    if not text:
        return ""
    # Remove BSData markup
    text = re.sub(r'\^\^|\*\*', '', text)
    # Clean up quotes
    text = text.replace('&quot;', '"').replace('&apos;', "'")
    # Remove extra whitespace
    text = ' '.join(text.split())
    return text


def parse_stat_value(value: str) -> Any:
    """Parse a stat value, handling things like '6"' -> 6, '2+' -> '2+'."""
    if not value:
        return 0
    # Remove quotes for movement
    value = value.replace('"', '').replace("'", "").strip()
    # Try to parse as int
    try:
        return int(value)
    except ValueError:
        return value


def extract_unit_stats(profile_elem) -> dict:
    """Extract unit stats from a profile element."""
    stats = {}
    for char in profile_elem.findall('.//characteristic'):
        type_id = char.get('typeId', '')
        if type_id in STAT_TYPE_IDS:
            stat_name = STAT_TYPE_IDS[type_id]
            stats[stat_name] = parse_stat_value(char.text or '')
    return stats


def extract_weapon(profile_elem, weapon_type: str) -> Optional[Weapon]:
    """Extract weapon stats from a profile element."""
    name = profile_elem.get('name', '')
    if not name:
        return None

    stat_ids = MELEE_WEAPON_STAT_IDS if weapon_type == "melee" else RANGED_WEAPON_STAT_IDS
    stats = {}

    for char in profile_elem.findall('.//characteristic'):
        type_id = char.get('typeId', '')
        if type_id in stat_ids:
            stat_name = stat_ids[type_id]
            stats[stat_name] = parse_stat_value(char.text or '')

    if not stats:
        return None

    return Weapon(
        id=profile_elem.get('id', ''),
        name=name,
        type=weapon_type,
        stats=stats
    )


def extract_ability(profile_elem) -> Optional[Ability]:
    """Extract ability from a profile element."""
    name = profile_elem.get('name', '')
    if not name:
        return None

    description = ""
    for char in profile_elem.findall('.//characteristic'):
        if char.get('name') == 'Description':
            description = clean_text(char.text or '')
            break

    return Ability(
        id=profile_elem.get('id', ''),
        name=name,
        description=description
    )


def extract_keywords(entry_elem) -> list:
    """Extract keywords from a selection entry."""
    keywords = []
    for cat_link in entry_elem.findall('.//categoryLink'):
        name = cat_link.get('name', '')
        if name and name not in ['Configuration', 'Faction:']:
            # Clean up faction prefixes
            name = re.sub(r'^Faction:\s*', '', name)
            keywords.append(name)
    return keywords


def extract_points_scaling(entry_elem) -> dict:
    """Extract points costs including scaling from modifiers."""
    points = {}

    # Get base cost
    for cost in entry_elem.findall('costs/cost'):
        if cost.get('typeId') == POINTS_TYPE_ID or cost.get('name') == 'pts':
            base_pts = int(float(cost.get('value', '0')))
            if base_pts > 0:
                # Try to determine base model count from constraints
                min_count = 1
                for constraint in entry_elem.findall('.//constraint'):
                    if constraint.get('type') == 'min' and constraint.get('field') == 'selections':
                        min_count = int(constraint.get('value', '1'))
                        break
                points[str(min_count)] = base_pts

    # Get scaled costs from modifiers
    for modifier in entry_elem.findall('.//modifier'):
        if modifier.get('type') == 'set' and modifier.get('field') == POINTS_TYPE_ID:
            pts = int(float(modifier.get('value', '0')))
            # Try to get the model count from conditions
            for cond in modifier.findall('.//condition'):
                if 'selections' in cond.get('field', ''):
                    count = cond.get('value', '')
                    if count and pts > 0:
                        points[count] = pts

    return points


def parse_unit(entry_elem) -> Optional[Unit]:
    """Parse a unit selection entry into a Unit object."""
    name = entry_elem.get('name', '')
    entry_id = entry_elem.get('id', '')

    if not name:
        return None

    # Extract points
    points = extract_points_scaling(entry_elem)
    if not points:
        return None

    # Find the main unit profile for stats
    stats = {}
    invuln = None
    weapons = []
    abilities = []

    for profile in entry_elem.findall('.//profile'):
        type_name = profile.get('typeName', '')

        if type_name == 'Unit':
            stats = extract_unit_stats(profile)
        elif type_name == 'Ranged Weapons':
            weapon = extract_weapon(profile, 'ranged')
            if weapon:
                weapons.append(asdict(weapon))
        elif type_name == 'Melee Weapons':
            weapon = extract_weapon(profile, 'melee')
            if weapon:
                weapons.append(asdict(weapon))
        elif type_name == 'Abilities':
            ability = extract_ability(profile)
            if ability:
                abilities.append(asdict(ability))
        elif type_name == 'Invulnerable Save':
            for char in profile.findall('.//characteristic'):
                if char.get('name') == 'Invulnerable Save':
                    invuln = char.text

    keywords = extract_keywords(entry_elem)

    return Unit(
        id=entry_id,
        name=name,
        points=points,
        stats=stats,
        invuln=invuln,
        weapons=weapons,
        abilities=abilities,
        keywords=keywords
    )


def parse_enhancement(entry_elem) -> Optional[Enhancement]:
    """Parse an enhancement/upgrade entry."""
    name = entry_elem.get('name', '')
    entry_id = entry_elem.get('id', '')

    if not name:
        return None

    # Get points
    pts = 0
    for cost in entry_elem.findall('.//cost'):
        if cost.get('typeId') == POINTS_TYPE_ID or cost.get('name') == 'pts':
            pts = int(float(cost.get('value', '0')))
            break

    if pts == 0:
        return None

    # Get description from abilities profile
    description = ""
    for profile in entry_elem.findall('.//profile'):
        if profile.get('typeName') == 'Abilities':
            for char in profile.findall('.//characteristic'):
                if char.get('name') == 'Description':
                    description = clean_text(char.text or '')
                    break

    return Enhancement(
        id=entry_id,
        name=name,
        points=pts,
        description=description
    )


def parse_detachment(entry_elem) -> Optional[Detachment]:
    """Parse a detachment entry."""
    name = entry_elem.get('name', '')
    entry_id = entry_elem.get('id', '')

    if not name:
        return None

    # Get the detachment rule
    rule_name = ""
    rule_description = ""
    for rule in entry_elem.findall('.//rule'):
        rule_name = rule.get('name', '')
        desc_elem = rule.find('description')
        if desc_elem is not None:
            rule_description = clean_text(desc_elem.text or '')
        break

    # Get enhancements
    enhancements = []
    for child in entry_elem.findall('.//selectionEntry[@type="upgrade"]'):
        enh = parse_enhancement(child)
        if enh:
            enhancements.append(asdict(enh))

    return Detachment(
        id=entry_id,
        name=name,
        rule_name=rule_name,
        rule_description=rule_description,
        enhancements=enhancements
    )


def parse_bsdata_catalog(filepath: str) -> dict:
    """Parse a BSData .cat file and extract all data."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Remove XML namespaces for easier parsing
    content = re.sub(r'xmlns[^"]*"[^"]*"', '', content)
    root = ET.fromstring(content)

    result = {
        "source": str(filepath),
        "units": [],
        "enhancements": [],
        "detachments": [],
    }

    processed_ids = set()

    for entry in root.iter('selectionEntry'):
        entry_id = entry.get('id', '')
        entry_type = entry.get('type', '')
        name = entry.get('name', '')

        if entry_id in processed_ids:
            continue

        # Units
        if entry_type == 'unit':
            unit = parse_unit(entry)
            if unit:
                result["units"].append(asdict(unit))
                processed_ids.add(entry_id)

        # Single model units (characters)
        elif entry_type == 'model':
            # Check if this is a top-level character (has points)
            for cost in entry.findall('costs/cost'):
                if cost.get('name') == 'pts':
                    pts = int(float(cost.get('value', '0')))
                    if pts > 0:
                        unit = parse_unit(entry)
                        if unit:
                            result["units"].append(asdict(unit))
                            processed_ids.add(entry_id)
                    break

        # Enhancements at top level
        elif entry_type == 'upgrade':
            # Check if this is a detachment container
            if name == 'Detachments':
                for det_entry in entry.findall('.//selectionEntry[@type="upgrade"]'):
                    det = parse_detachment(det_entry)
                    if det and det.rule_name:
                        result["detachments"].append(asdict(det))
            else:
                enh = parse_enhancement(entry)
                if enh:
                    result["enhancements"].append(asdict(enh))
                    processed_ids.add(entry_id)

    # Sort by name
    result["units"].sort(key=lambda x: x["name"])
    result["enhancements"].sort(key=lambda x: x["name"])
    result["detachments"].sort(key=lambda x: x["name"])

    # Deduplicate
    seen = set()
    result["units"] = [u for u in result["units"] if u["name"] not in seen and not seen.add(u["name"])]
    seen = set()
    result["enhancements"] = [e for e in result["enhancements"] if e["name"] not in seen and not seen.add(e["name"])]

    return result


def compare_data(bsdata: dict, warboard_path: str) -> dict:
    """Compare BSData against current Warboard data."""
    with open(warboard_path, "r") as f:
        warboard = json.load(f)

    comparison = {
        "unit_differences": [],
        "enhancement_differences": [],
        "missing_in_warboard": [],
        "missing_in_bsdata": [],
        "matching_units": 0,
        "matching_enhancements": 0,
    }

    # Build lookups
    bsdata_units = {u["name"]: u for u in bsdata["units"]}
    warboard_units = {u["name"]: u for u in warboard.get("units", [])}

    bsdata_enh = {e["name"]: e["points"] for e in bsdata["enhancements"]}
    warboard_enh = {}
    for det in warboard.get("detachments", {}).values():
        for enh in det.get("enhancements", []):
            warboard_enh[enh["name"]] = enh["points"]

    # Compare units
    for name, wb_unit in warboard_units.items():
        if name in bsdata_units:
            bs_unit = bsdata_units[name]
            # Compare base points (minimum model count)
            wb_min = min(wb_unit["points"].keys(), key=int)
            wb_base = wb_unit["points"][wb_min]
            bs_base = bs_unit["points"].get(wb_min) or min(bs_unit["points"].values())

            if wb_base != bs_base:
                comparison["unit_differences"].append({
                    "name": name,
                    "warboard": wb_base,
                    "bsdata": bs_base
                })
            else:
                comparison["matching_units"] += 1
        else:
            comparison["missing_in_bsdata"].append({"name": name, "type": "unit"})

    # Check for units in BSData not in Warboard
    for name in bsdata_units:
        if name not in warboard_units:
            comparison["missing_in_warboard"].append({
                "name": name,
                "type": "unit",
                "points": bsdata_units[name]["points"]
            })

    # Compare enhancements
    for name, wb_pts in warboard_enh.items():
        if name in bsdata_enh:
            if wb_pts != bsdata_enh[name]:
                comparison["enhancement_differences"].append({
                    "name": name,
                    "warboard": wb_pts,
                    "bsdata": bsdata_enh[name]
                })
            else:
                comparison["matching_enhancements"] += 1

    # Check for enhancements in BSData not in Warboard
    for name, pts in bsdata_enh.items():
        if name not in warboard_enh:
            comparison["missing_in_warboard"].append({
                "name": name,
                "type": "enhancement",
                "points": pts
            })

    return comparison


def sync_points(bsdata: dict, warboard_path: str) -> dict:
    """Sync points from BSData to Warboard data. Returns the updated data."""
    with open(warboard_path, "r") as f:
        warboard = json.load(f)

    bsdata_units = {u["name"]: u for u in bsdata["units"]}
    bsdata_enh = {e["name"]: e for e in bsdata["enhancements"]}

    changes = []

    # Update unit points
    for unit in warboard.get("units", []):
        name = unit["name"]
        if name in bsdata_units:
            bs_unit = bsdata_units[name]
            # Update points if different
            for count, pts in bs_unit["points"].items():
                if unit["points"].get(count) != pts:
                    changes.append(f"Unit '{name}' ({count} models): {unit['points'].get(count)} -> {pts}")
                    unit["points"][count] = pts

    # Update enhancement points
    for det_key, det in warboard.get("detachments", {}).items():
        for enh in det.get("enhancements", []):
            name = enh["name"]
            if name in bsdata_enh:
                bs_enh = bsdata_enh[name]
                if enh["points"] != bs_enh["points"]:
                    changes.append(f"Enhancement '{name}': {enh['points']} -> {bs_enh['points']}")
                    enh["points"] = bs_enh["points"]

    return warboard, changes


def format_markdown(data: dict, comparison: dict = None) -> str:
    """Format the data as markdown."""
    lines = ["# BSData Reference", ""]

    if comparison:
        lines.append("## Comparison Summary")
        lines.append(f"- ✅ Matching units: {comparison['matching_units']}")
        lines.append(f"- ✅ Matching enhancements: {comparison['matching_enhancements']}")

        if comparison["unit_differences"]:
            lines.append("")
            lines.append("### ❌ Unit Point Differences")
            for diff in comparison["unit_differences"]:
                lines.append(f"- {diff['name']}: Warboard={diff['warboard']}, BSData={diff['bsdata']}")

        if comparison["enhancement_differences"]:
            lines.append("")
            lines.append("### ❌ Enhancement Point Differences")
            for diff in comparison["enhancement_differences"]:
                lines.append(f"- {diff['name']}: Warboard={diff['warboard']}, BSData={diff['bsdata']}")

        if comparison["missing_in_warboard"]:
            lines.append("")
            lines.append("### ⚠️ Missing in Warboard (available in BSData)")
            for item in comparison["missing_in_warboard"]:
                lines.append(f"- {item['name']} ({item['type']}): {item['points']} pts")

        lines.append("")

    lines.append("## Units")
    for unit in data["units"]:
        pts_list = [f"{k}: {v}" for k, v in sorted(unit["points"].items(), key=lambda x: int(x[0]))]
        lines.append(f"- **{unit['name']}**: {', '.join(pts_list)} pts")

    lines.append("")
    lines.append("## Enhancements")
    for enh in data["enhancements"]:
        lines.append(f"- **{enh['name']}**: {enh['points']} pts")

    if data["detachments"]:
        lines.append("")
        lines.append("## Detachments")
        for det in data["detachments"]:
            lines.append(f"### {det['name']}")
            if det["rule_name"]:
                lines.append(f"**{det['rule_name']}**: {det['rule_description'][:200]}...")
            if det["enhancements"]:
                lines.append("")
                lines.append("Enhancements:")
                for enh in det["enhancements"]:
                    lines.append(f"- {enh['name']}: {enh['points']} pts")

    return "\n".join(lines)


def find_catalog(repo_path: Path, faction_name: str) -> Path:
    """Find the catalog file for a faction."""
    cat_file = repo_path / f"{faction_name}.cat"
    if cat_file.exists():
        return cat_file

    # Try partial match
    matches = list(repo_path.glob(f"*{faction_name}*.cat"))
    if matches:
        return matches[0]

    # List available
    print(f"Error: Could not find catalog for '{faction_name}'")
    print("Available catalogs:")
    for f in sorted(repo_path.glob("*.cat")):
        if 'Library' not in f.name:
            print(f"  - {f.stem}")
    sys.exit(1)


def main():
    if len(sys.argv) < 4:
        print("Usage:")
        print("  python bsdata-importer.py import <bsdata-repo> <faction-name>")
        print("  python bsdata-importer.py compare <bsdata-repo> <faction-name> <warboard.json>")
        print("  python bsdata-importer.py sync <bsdata-repo> <faction-name> <warboard.json>")
        print("")
        print("Example:")
        print("  python bsdata-importer.py compare ~/BSData/wh40k-10e 'Imperium - Adeptus Custodes' public/data/custodes.json")
        sys.exit(1)

    command = sys.argv[1]
    repo_path = Path(sys.argv[2])
    faction_name = sys.argv[3]

    cat_file = find_catalog(repo_path, faction_name)
    print(f"Parsing: {cat_file}")
    data = parse_bsdata_catalog(str(cat_file))

    # Output paths
    faction_slug = faction_name.lower().replace(" - ", "-").replace(" ", "-")
    output_dir = Path(__file__).parent.parent / "public" / "data"

    if command == "import":
        # Just extract and save BSData
        output_json = output_dir / f"bsdata-{faction_slug}.json"
        output_md = output_dir / f"bsdata-{faction_slug}.md"

        with open(output_json, "w") as f:
            json.dump(data, f, indent=2)
        print(f"Written: {output_json}")

        with open(output_md, "w") as f:
            f.write(format_markdown(data))
        print(f"Written: {output_md}")

        print(f"\nExtracted: {len(data['units'])} units, {len(data['enhancements'])} enhancements, {len(data['detachments'])} detachments")

    elif command == "compare":
        if len(sys.argv) < 5:
            print("Error: compare requires warboard.json path")
            sys.exit(1)

        warboard_path = sys.argv[4]
        comparison = compare_data(data, warboard_path)

        output_md = output_dir / f"bsdata-{faction_slug}.md"
        with open(output_md, "w") as f:
            f.write(format_markdown(data, comparison))
        print(f"Written: {output_md}")

        print(f"\n✅ Matching: {comparison['matching_units']} units, {comparison['matching_enhancements']} enhancements")
        if comparison["unit_differences"]:
            print(f"❌ Unit differences: {len(comparison['unit_differences'])}")
            for d in comparison["unit_differences"]:
                print(f"   {d['name']}: {d['warboard']} -> {d['bsdata']}")
        if comparison["enhancement_differences"]:
            print(f"❌ Enhancement differences: {len(comparison['enhancement_differences'])}")
        if comparison["missing_in_warboard"]:
            print(f"⚠️  Missing in Warboard: {len(comparison['missing_in_warboard'])}")
            for item in comparison["missing_in_warboard"][:10]:
                print(f"   {item['name']} ({item['type']})")

    elif command == "sync":
        if len(sys.argv) < 5:
            print("Error: sync requires warboard.json path")
            sys.exit(1)

        warboard_path = sys.argv[4]
        updated_data, changes = sync_points(data, warboard_path)

        if changes:
            print(f"\nChanges to apply:")
            for change in changes:
                print(f"  {change}")

            response = input("\nApply changes? [y/N]: ")
            if response.lower() == 'y':
                with open(warboard_path, "w") as f:
                    json.dump(updated_data, f, indent=2)
                print(f"Updated: {warboard_path}")
            else:
                print("Aborted.")
        else:
            print("\n✅ All points match - no changes needed.")

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
