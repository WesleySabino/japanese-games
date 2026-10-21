# Kana Rain

This repository holds **Kana Rain**, a short-session arcade game for reading hiragana and katakana.

[Play Kana Rain](https://kana-rain.nihongogrove.top/) · [How to play](https://kana-rain.nihongogrove.top/about.html)

The game is public and requires no account. Progress stays in the browser on the player's device. The rain garden fills the screen. The game supports keyboard and touch controls, pronunciation audio, short sessions and mistake review, and it plays offline after the first download.

## Layout

| Path | Contents |
|---|---|
| `01-kana-rain/` | Game source, tests, assets, public pages and build. |
| `.github/workflows/kana-rain.yml` | CI: unit tests, browser tests and the static build. |

## Documentation

| Document | Purpose |
|---|---|
| [Game README](01-kana-rain/README.md) | Setup, controls and current player experience. |
| [Specification](01-kana-rain/SPECIFICATION.md) | Functional contract and saved-progress behavior. |
| [New-kana rules](01-kana-rain/NOVELTY_BALANCE.md) | Admission, recovery and progression policy. |
| [Development](01-kana-rain/DEVELOPMENT.md) | Architecture, validation, asset preparation and release invariants. |
| [Learning design](01-kana-rain/LEARNING_DESIGN.md) | Evidence, assistance, cognitive load and research limits. |
| [Changelog](01-kana-rain/CHANGELOG.md) | Released changes. |

Retired prototypes, presentations and imported research copies remain recoverable from Git history. The current artwork masters, audio sources, licenses, provenance and save-migration fixtures stay with the game because they support development and compatible releases.

## Run Kana Rain locally

Use **Node.js 22 or later** and **pnpm 11** (CI pins pnpm 11.25.0). From the project root:

```sh
cd 01-kana-rain
pnpm install --frozen-lockfile
pnpm start
```

Open [local Kana Rain](http://127.0.0.1:4173). The game runs as static HTML, CSS and JavaScript; the installed packages only support development and checks. The [Kana Rain README](./01-kana-rain/README.md) explains how to run it and how it plays.

## Checks and release build

Run these commands inside `01-kana-rain/`:

```sh
pnpm test
pnpm exec playwright install chromium
pnpm test:browser
pnpm build
```

Install the browser before the first browser test run. `pnpm build` creates the static release in `01-kana-rain/dist/`; deploy that directory's contents. The build includes the game, the art gallery, the pronunciation bundle and the public information pages. Development scripts, tests and local build outputs stay out of the live game.

The release URL is [kana-rain.nihongogrove.top](https://kana-rain.nihongogrove.top/). Page titles, descriptions, canonical links, social previews, structured data, `robots.txt` and `sitemap.xml` all use that address. Keep those references consistent if the production address changes.
