# Spec 03: Encounter Sheet Template

## Goal
Add an Encounter Sheet page where users configure an encounter (name, objectives, conditions, malice features, monster groups) and generate a single-page GM reference sheet.

## Dependencies
- Spec 01 (bestiary data layer)
- Spec 02 (monster card template -- shares font, patterns, and the monster picker can be reused for group building)

## Scope

### Typst template
- Port `encounter.typ` from aether-peaks into `src/typst/templates/encounter.typ`.
- Template function: `encounter-sheet(encounter, objective, victory, failure, malice, groups, body)`.

### Custom params form
- Build `EncounterForm` with sections:
  - **Encounter Info**: name, objective, victory condition, failure condition (text inputs/textareas -- these fit the existing param model).
  - **Malice Features**: dynamic list of (cost, name, description) entries. Add/remove rows.
  - **Creature Groups**: each group has a label and a list of creatures. For each creature:
    - Pick from bestiary (auto-fills stats) or enter manually.
    - Override: count, notes, distance.
    - Quick-stats shown: stamina, stability, speed, free-strike.
  - **Notes**: freeform text area (becomes the Typst body content).

### Preamble generation
- Encounter metadata (name, objective, conditions) can use the standard preamble params.
- Malice features and creature groups: generate a virtual JSON file (e.g., `encounter-data.json`) that the Typst template loads with `json()`. No Typst dict serialization needed.

### Page component
- Create `EncounterSheetPage.tsx` with route and nav entry.
- More form-driven than content-driven, similar to monster cards.

## Out of scope
- Saving/loading encounter configurations (spec 05).
- Custom monsters in groups (spec 04 dependency).
