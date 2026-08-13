#!/usr/bin/env python3
"""Update pokedata locale JSONs from the holoholo-text GitHub repository.

Reads the Release (live) and Remote (upcoming) raw JSONs for each language,
merges them (Remote overwrites Release), and updates the local locale files
in locales/pokedata/.

Usage:
    python update_pokedata_strings.py
"""

import json
import re
import sys
import urllib.request
from pathlib import Path

LOCALES_DIR = Path(__file__).resolve().parent
STRINGS_URL = "https://raw.githubusercontent.com/sora10pls/holoholo-text/main"

LANG_MAP = {
    "en": ("English", "en-us"),
    "de": ("German", "de-de"),
    "es": ("Spanish", "es-es"),
    "fr": ("French", "fr-fr"),
    "it": ("Italian", "it-it"),
}

SPECIAL_MOVE_NAMES = {"Weather Ball", "Aura Wheel", "Techno Blast"}


def fetch_json(url):
    try:
        with urllib.request.urlopen(url) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw)
    except Exception as e:
        print(f"  ERROR fetching {url}: {e}", file=sys.stderr)
        return None


def build_flat_dict(raw_data):
    data = raw_data["data"]
    return {data[i]: data[i + 1] for i in range(0, len(data), 2)}


def fetch_merged(lang_dir, lang_file):
    release_url = f"{STRINGS_URL}/Release/{lang_dir}/{lang_file}_raw.json"
    remote_url = f"{STRINGS_URL}/Remote/{lang_dir}/{lang_file}_raw.json"

    release = fetch_json(release_url)
    if release is None:
        return None
    merged = build_flat_dict(release)

    remote = fetch_json(remote_url)
    if remote is not None:
        merged.update(build_flat_dict(remote))

    return merged


def load_local(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_local(path, data):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
        f.write("\n")


def update_species(local, source):
    species = local["species"]
    for key, val in source.items():
        if not key.startswith("pokemon_name_"):
            continue
        parts = key.split("_")
        if len(parts) != 3:
            continue
        try:
            idx = int(parts[2])
        except ValueError:
            continue
        if idx < len(species):
            species[idx] = val
        else:
            while len(species) <= idx:
                species.append("")
            species[idx] = val


_MOVE_REF = re.compile(r"<<move_name_(\d+)>>")


def resolve_move_references(local):
    for move_id, val in list(local["moves"].items()):
        matches = _MOVE_REF.findall(val)
        if matches:
            new_val = val
            for ref_id in matches:
                ref_key = str(int(ref_id))
                resolved = local["moves"].get(ref_key, f"<<move_name_{ref_id}>>")
                new_val = new_val.replace(f"<<move_name_{ref_id}>>", resolved)
            local["moves"][move_id] = new_val


def update_moves(local, source):
    for key, val in source.items():
        if not key.startswith("move_name_"):
            continue
        try:
            move_id = str(int(key.split("_")[2]))
        except (ValueError, IndexError):
            continue
        local["moves"][move_id] = val


def update_types(local, source, english_source):
    type_keys = [k for k in english_source if k.startswith("pokemon_type_")]
    for key in type_keys:
        english_name = english_source[key]
        if english_name in local["types"]:
            localized = source.get(key)
            if localized:
                local["types"][english_name] = localized


def update_forms(local, source, english_source, local_english):
    reverse = {}
    for lk, lv in local_english["forms"].items():
        reverse.setdefault(lv, []).append(lk)

    # Keys that map to forms but don't start with "form_"
    extra_form_keys = {"filter_label_shiny"}

    for key, val in source.items():
        if not key.startswith("form_") and key not in extra_form_keys:
            continue
        english_val = english_source.get(key)
        if english_val is None:
            continue
        candidates = reverse.get(english_val)
        if not candidates:
            continue
        if len(candidates) == 1:
            local["forms"][candidates[0]] = val
        else:
            suffix = key[5:]
            matched = None
            for c in candidates:
                if c.lower() == suffix or c.lower() in suffix or suffix.endswith(c.lower()):
                    matched = c
                    break
            if matched:
                local["forms"][matched] = val


def update_special_moves(local, source, english_source):
    family_ids = {}
    for key, val in english_source.items():
        if not key.startswith("move_name_"):
            continue
        if val in SPECIAL_MOVE_NAMES:
            family_ids.setdefault(val, []).append(key)

    for family_name, ids in family_ids.items():
        if family_name not in local.get("special_moves", {}):
            continue
        for mid in ids:
            localized = source.get(mid)
            if localized:
                local["special_moves"][family_name] = localized
                break


def main():
    print("Fetching English source for reference mappings...")
    english_source = fetch_merged(*LANG_MAP["en"])
    if english_source is None:
        print("FATAL: Could not fetch English source data.", file=sys.stderr)
        sys.exit(1)

    local_english = load_local(LOCALES_DIR / "en.json")

    for code in LANG_MAP:
        lang_dir, lang_file = LANG_MAP[code]
        print(f"\nUpdating {code} ({lang_dir}/{lang_file})...")

        source = fetch_merged(lang_dir, lang_file)
        if source is None:
            print(f"  SKIPPED {code}: failed to fetch source data.")
            continue

        local_path = LOCALES_DIR / f"{code}.json"
        local = load_local(local_path)

        update_species(local, source)
        update_moves(local, source)
        resolve_move_references(local)
        update_types(local, source, english_source)
        update_forms(local, source, english_source, local_english)
        update_special_moves(local, source, english_source)

        # Sort moves by numeric ID
        local["moves"] = dict(sorted(local["moves"].items(), key=lambda x: int(x[0])))

        save_local(local_path, local)
        print(f"  Saved {local_path.name}")

    print("\nDone.")


if __name__ == "__main__":
    main()
