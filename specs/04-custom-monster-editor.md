# Spec 04: Custom Monster Editor (Future)

## Goal
Let users create and edit custom monsters through a form UI, extending the preset bestiary with their own creations.

## Dependencies
- Spec 01 (data layer defines the Monster interface)
- Spec 05 (persistence -- custom monsters need to be saved somewhere)

## Scope (high level -- detail later)

### Monster editor form
- Full form matching the Monster interface: identity fields, combat stats, characteristics, abilities (with power rolls), traits.
- Ability sub-form is the most complex part: dynamic list of abilities, each with optional power-roll tiers, keywords, targeting, etc.
- "Clone from bestiary" workflow: pick a preset monster as a starting point, modify fields.
- Validation: required fields, stat ranges.

### Integration
- Custom monsters appear alongside preset ones in the monster picker (spec 02) and encounter group builder (spec 03).
- Visually distinguished from presets (badge or icon).

### Malice pool editor
- Separate section or page for editing faction malice features.

## Key questions (resolve before building)
- Where do custom monsters live? (See spec 05 for persistence options.)
- Do we support "factions" as a user-defined concept, or just a flat list of custom monsters?
- Version compatibility: what happens when the Monster JSON schema evolves?
- Editor reads/writes JSON directly — same format the Typst templates consume via `json()`.
