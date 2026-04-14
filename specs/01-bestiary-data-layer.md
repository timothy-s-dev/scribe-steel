# Spec 01: Bestiary Data Layer

## Goal
Create a JSON-based bestiary that serves as the single source of truth for monster data, consumable by both the TypeScript UI and Typst templates natively.

## Why first
Both the monster card template (spec 02) and encounter sheet template (spec 03) depend on having monster data available. Building the data layer first means the templates can consume it immediately.

## Approach: JSON as single source of truth
- **TypeScript side**: import JSON directly for the picker UI, type it with TS interfaces.
- **Typst side**: load with `#let data = json("bestiary.json")` — Typst parses JSON into native dictionaries/arrays, no conversion needed.
- **Future editor (spec 04)**: reads and writes JSON, no serialization layer needed.

## Scope

### JSON data files
- Port all monsters from `demons.typ` and `humans.typ` into JSON format.
- Structure: one JSON file per faction (e.g., `demons.json`, `humans.json`) or one combined `bestiary.json` — decide during detailed planning.
- Include malice pool data alongside each faction.

### TypeScript interfaces
- Define `Monster`, `Ability`, `Trait`, `PowerRollTier`, `MaliceFeature` interfaces matching the JSON schema.
- These are for type safety in the UI — the JSON files are the actual data.
- Lightweight helpers for the picker UI: group by faction, filter, search.

### Typst integration
- Register the JSON file(s) as virtual files in the compiler.
- Templates load data with `json()` — no `.typ` data files needed.

### Data to port
- ~10 demons + demon malice pool
- ~4 humans + human malice pool

## Out of scope
- Custom monster creation UI (spec 04)
- Persistence / saving (spec 05)
