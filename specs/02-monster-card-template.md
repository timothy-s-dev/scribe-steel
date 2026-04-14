# Spec 02: Monster Card Template

## Goal
Add a Monster Cards page where users pick monsters from the preset bestiary and generate printable 3x5 index cards (3 per sheet, duplex-friendly).

## Dependencies
- Spec 01 (bestiary data layer)

## Scope

### Typst template
- Port `monster-card.typ` from aether-peaks into `src/typst/templates/monster-card.typ`.
- Adapt to work with the virtual file system and print mode toggle already in the app.
- Template function signature: `monster-card-sheet(monsters: (), body)` taking an array of monster dictionaries.

### Custom params form
- The standard `TemplateParamsForm` won't work here -- we need a monster picker.
- Build a custom form component (`MonsterCardForm`) that:
  - Shows the bestiary grouped by faction.
  - Lets users check monsters to include.
  - Reorders selected monsters (drag or up/down buttons).
  - Shows count of cards / sheets needed.
- This form replaces the default params form via the `paramsForm` prop on `TypstEditor`.

### Preamble generation
- Generate a virtual JSON file (e.g., `selected-monsters.json`) containing the selected monsters' data.
- The Typst template loads it with `json("selected-monsters.json")` — no Typst dict serialization needed.

### Page component
- Create `MonsterCardsPage.tsx` with the schema, custom form, and route.
- Add navigation entry with appropriate icon.
- The editor body area can show a Typst comment or be mostly empty (cards are data-driven, not content-driven).

### Fonts
- Monster card template uses Liberation Sans. Add to `/public/fonts/` and register in compiler.

## Out of scope
- Editing monster stats inline (future: spec 04).
- The editor text area may be minimized or hidden since these templates are form-driven rather than content-driven.
