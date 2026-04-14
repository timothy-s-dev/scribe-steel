# Spec 05: Persistence Layer (Future)

## Goal
Let users save and load custom data (monsters, encounters, other template configs) across sessions.

## Dependencies
- Needed by spec 04 (custom monsters)
- Useful for spec 03 (saving encounter configurations)

## Options to evaluate

### Option A: Browser localStorage / IndexedDB
- **Pro**: No auth, no backend, works offline, simplest to implement.
- **Con**: Per-device only, no sharing, storage limits (~5-10MB), lost on cache clear.
- **Good for**: MVP / "good enough" persistence.

### Option B: Google Drive API
- **Pro**: Cloud sync, user owns their data, sharing possible, generous storage.
- **Con**: OAuth setup, Google Cloud project needed, API complexity, requires being online.
- **Good for**: Long-term solution, especially if users want cross-device access.

### Option C: Local file system (File System Access API)
- **Pro**: User controls files, no cloud dependency, works with version control.
- **Con**: Limited browser support (Chromium only), permission prompts on each session.
- **Good for**: Power users who want to manage files directly.

### Option D: Export/Import JSON files
- **Pro**: Universal, simple, user-controlled.
- **Con**: Manual workflow, no auto-save.
- **Good for**: Supplement to any other option.

## Recommendation
Start with **Option A (IndexedDB)** for immediate persistence + **Option D (export/import)** as a safety net. Evaluate Google Drive later based on user demand. The data layer from spec 01 should define a clean serialization format (JSON) that all persistence backends can use.

## Key design considerations
- Data format versioning (migrations when schema changes).
- Conflict resolution if combining local + cloud.
- Import validation (reject malformed data gracefully).
