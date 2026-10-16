# Japanese Learning Games

This repository holds **Kana Rain**, a short-session arcade game for reading hiragana and katakana. It is the only game in active development.

[Play Kana Rain](https://kana-rain.nihongogrove.top/) · [How to play](https://kana-rain.nihongogrove.top/about.html)

The game is public and requires no account. Progress stays in the browser on the player's device. The rain garden fills the screen. The game supports keyboard and touch controls, pronunciation audio, short sessions and mistake review, and it plays offline after the first download.

## Scope since 2026-10-15

The project was reduced to two parts: the [nihongogrove.top](https://nihongogrove.top/) site, which includes Japanese Core, and this game. The rest of the earlier catalogue was moved out of this repository and remains in the git history. That covers Gojūon Board (02), the 32 documented game concepts (03–34), the Curriculum Atlas and the `planejamento/` folder. New games can return later as separate decisions.

The parts of that material, and of the earlier research, that help with game design live in [docs/didatica/](docs/didatica/README.md). They cover what the research says about learning kana, feedback, evidence and transfer, plus the design rules shared by the first prototypes.

## Layout

| Path | Contents |
|---|---|
| `01-kana-rain/` | Game source, tests, assets and build. See its [README](01-kana-rain/README.md). |
| `docs/design/kana-rain/` | Concept art and infographics. |
| `docs/history/kana-rain/` | Earlier specifications, reviews and the original prototype, kept as non-executable history. |
| `docs/didatica/` | Research-based notes for designing learning games. |
| `.github/workflows/kana-rain.yml` | CI: unit tests, browser tests and the static build. |

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
