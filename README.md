# Scribe Steel

A GM toolkit for [Draw Steel](https://mcdmproductions.com/draw-steel) that lets you build, edit, and export game documents — rendered with [Typst](https://typst.app/) directly in the browser.

**Live site:** [scribesteel.com](https://scribesteel.com)

## Document Types

- **Monster Cards** — 3x5 index cards with creature stats
- **Encounter Sheets** — one-page GM reference for running combats
- **Monster Groups** — manage collections of creatures
- **Letters & Notes** — handwritten-style props for players
- **Lore Books** — in-world document summaries

## Tech Stack

- React 19, TypeScript, Vite
- [Typst](https://typst.app/) (in-browser document rendering via WASM)
- Tailwind CSS 4
- Google OAuth + Drive (`drive.file` scope) for cloud storage
- Firebase Hosting
- Sentry for error monitoring

## Getting Started

See [CONTRIBUTING.md](CONTRIBUTING.md) for local development setup.

## License

[MIT](LICENSE)
