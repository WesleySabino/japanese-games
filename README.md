# Japanese Learning Minigames

This project organizes the **34 games** from the [original brainstorm](./planejamento/brainstorm-minijogos-japones.md), preserving the catalogue's IDs and order. Folders follow the format `NN-game-name`, with English names and IDs from `01` to `34`.

**Kana Rain** is already implemented in `01-kana-rain/`. The other 33 games have design documentation and have not been implemented yet. The intended audience is English-speaking learners of Japanese: game names, instructions, explanations, specifications, and design reviews use English. Japanese characters, words, and sentences remain in the learning examples.

[Play Kana Rain](https://kana-rain.nihongogrove.top/) · [How to play](https://kana-rain.nihongogrove.top/about.html)

The game is public and requires no account. Progress stays in the browser on the player's device. Its rain garden fills the screen, with keyboard and touch controls, pronunciation audio, short sessions, mistake review, and offline play after the initial download.

Each game folder contains:

- `SPECIFICATION.md`: a complete English translation of the game's 14 catalogue fields, including examples and caveats, with references to the shared brainstorm guidelines.
- `REVIEW.md`: a design assessment, proposed improvements, a simple scope for the first prototype, features to defer, and observable validation criteria.

The reviews are design proposals. They do not change the brainstorm or apply gameplay changes. Expected benefits need to be tested with players; the proposed criteria are not learning-test results. The original brainstorm is retained in its original language as a historical source; the working game specifications and reviews are in English.

## Numbered catalogue

| ID | Game | Specification | Design review and recommended MVP |
|---|---|---|---|
| 01 | Kana Rain — implemented | [Specification](./01-kana-rain/SPECIFICATION.md) | [Review](./01-kana-rain/REVIEW.md) |
| 02 | Gojūon Board | [Specification](./02-gojuon-board/SPECIFICATION.md) | [Review](./02-gojuon-board/REVIEW.md) |
| 03 | Tricky Twins | [Specification](./03-tricky-twins/SPECIFICATION.md) | [Review](./03-tricky-twins/REVIEW.md) |
| 04 | Kana Snake | [Specification](./04-kana-snake/SPECIFICATION.md) | [Review](./04-kana-snake/REVIEW.md) |
| 05 | Kana Wordle | [Specification](./05-kana-wordle/SPECIFICATION.md) | [Review](./05-kana-wordle/REVIEW.md) |
| 06 | Mark Forge | [Specification](./06-mark-forge/SPECIFICATION.md) | [Review](./06-mark-forge/REVIEW.md) |
| 07 | Mirror Match | [Specification](./07-mirror-match/SPECIFICATION.md) | [Review](./07-mirror-match/REVIEW.md) |
| 08 | Katakana Café | [Specification](./08-katakana-cafe/SPECIFICATION.md) | [Review](./08-katakana-cafe/REVIEW.md) |
| 09 | Sentence Slicer | [Specification](./09-sentence-slicer/SPECIFICATION.md) | [Review](./09-sentence-slicer/REVIEW.md) |
| 10 | Sorting Belt | [Specification](./10-sorting-belt/SPECIFICATION.md) | [Review](./10-sorting-belt/REVIEW.md) |
| 11 | Kana Stack | [Specification](./11-kana-stack/SPECIFICATION.md) | [Review](./11-kana-stack/REVIEW.md) |
| 12 | Shiritori Duel | [Specification](./12-shiritori-duel/SPECIFICATION.md) | [Review](./12-shiritori-duel/REVIEW.md) |
| 13 | Who Am I? | [Specification](./13-who-am-i/SPECIFICATION.md) | [Review](./13-who-am-i/REVIEW.md) |
| 14 | Radical Alchemy | [Specification](./14-radical-alchemy/SPECIFICATION.md) | [Review](./14-radical-alchemy/REVIEW.md) |
| 15 | Kanji Families | [Specification](./15-kanji-families/SPECIFICATION.md) | [Review](./15-kanji-families/REVIEW.md) |
| 16 | Triads | [Specification](./16-triads/SPECIFICATION.md) | [Review](./16-triads/REVIEW.md) |
| 17 | On/Kun Switch | [Specification](./17-on-kun-switch/SPECIFICATION.md) | [Review](./17-on-kun-switch/REVIEW.md) |
| 18 | Kanji Crossroads | [Specification](./18-kanji-crossroads/SPECIFICATION.md) | [Review](./18-kanji-crossroads/REVIEW.md) |
| 19 | Compound Chain | [Specification](./19-compound-chain/SPECIFICATION.md) | [Review](./19-compound-chain/REVIEW.md) |
| 20 | Reading Bingo | [Specification](./20-reading-bingo/SPECIFICATION.md) | [Review](./20-reading-bingo/REVIEW.md) |
| 21 | Sign Reader | [Specification](./21-sign-reader/SPECIFICATION.md) | [Review](./21-sign-reader/REVIEW.md) |
| 22 | Time Keeper | [Specification](./22-time-keeper/SPECIFICATION.md) | [Review](./22-time-keeper/REVIEW.md) |
| 23 | Counter Market | [Specification](./23-counter-market/SPECIFICATION.md) | [Review](./23-counter-market/REVIEW.md) |
| 24 | Particle Ninja | [Specification](./24-particle-ninja/SPECIFICATION.md) | [Review](./24-particle-ninja/REVIEW.md) |
| 25 | Sentence Builder | [Specification](./25-sentence-builder/SPECIFICATION.md) | [Review](./25-sentence-builder/REVIEW.md) |
| 26 | Flash Scene | [Specification](./26-flash-scene/SPECIFICATION.md) | [Review](./26-flash-scene/REVIEW.md) |
| 27 | Follow the Directions | [Specification](./27-follow-the-directions/SPECIFICATION.md) | [Review](./27-follow-the-directions/REVIEW.md) |
| 28 | Form Tracker | [Specification](./28-form-tracker/SPECIFICATION.md) | [Review](./28-form-tracker/REVIEW.md) |
| 29 | Context Detective | [Specification](./29-context-detective/SPECIFICATION.md) | [Review](./29-context-detective/REVIEW.md) |
| 30 | Story Sequencer | [Specification](./30-story-sequencer/SPECIFICATION.md) | [Review](./30-story-sequencer/REVIEW.md) |
| 31 | Text Explorer | [Specification](./31-text-explorer/SPECIFICATION.md) | [Review](./31-text-explorer/REVIEW.md) |
| 32 | Reading Runner | [Specification](./32-reading-runner/SPECIFICATION.md) | [Review](./32-reading-runner/REVIEW.md) |
| 33 | Word Dungeon | [Specification](./33-word-dungeon/SPECIFICATION.md) | [Review](./33-word-dungeon/REVIEW.md) |
| 34 | Kanji Survival + Rematch | [Specification](./34-kanji-survival-rematch/SPECIFICATION.md) | [Review](./34-kanji-survival-rematch/REVIEW.md) |

## Shared proposals for the first prototypes

The brainstorm provides a good foundation of concepts and curriculum. Its main implementation gap is making the player's action, accepted answers, round ending, and recorded evidence unambiguous. Reviewing content and examples takes work even when the interface is simple.

1. **One mechanic and a small content set per prototype.** Use reviewed local sets with answers and alternatives already annotated. Defer unrestricted sentence generation, linguistic analysis at runtime, and imported content.
2. **Accuracy before pressure.** Start without a deadline per answer; introduce time limits or faster movement later. For arcade play, distinguish consequences in the game from evidence of a linguistic error.
3. **Predictable input.** Support touch and keyboard. Where dragging is available, also allow selecting an item and then tapping its destination. Explain the response unit: character, mora, word, or sentence chunk. Do not make IME the only way to answer.
4. **Enough correction to learn.** Display the answer and a short explanation until the player continues. Help and retries should not be recorded as independent successes. Consulting a hint need not cost points or lives.
5. **Explicit alternative answers.** Annotate valid variants per item and remove ambiguous items that the simple validator cannot assess. Do not treat the author's preference as the only correct sentence or reading.
6. **Build the shared core gradually.** Reuse content IDs and a minimal response record: item, facet, game, result, assistance, and reason for failure when known. Response time is optional and should account for input and pauses. Integrate with the learner model without requiring the entire ecosystem to validate the first mechanic.

Sections 0, 2, 3, and 5 of the brainstorm remain the shared reference; they have not been duplicated across 34 documents. The target of at most 30% multiple-choice interactions applies to the ecosystem as a whole, rather than banning a particular game's mechanic. The brainstorm's metrics, schedules, and cost classifications are design targets or estimates, not guarantees.

## Original ecosystem MVP selection

Section 4.4 of the brainstorm selects games **01, 08, 09, 10, 16, 26, 29, and 34**. The numbers above are catalogue IDs, not implementation priorities. Each review also proposes an MVP for its individual game; this does not mean building all 34 games at once.

## Run Kana Rain locally

Use **Node.js 22 or later** and **pnpm 11** (CI pins pnpm 11.25.0). From the project root:

```sh
cd 01-kana-rain
pnpm install --frozen-lockfile
pnpm start
```

Open [local Kana Rain](http://127.0.0.1:4173). The game runs as static HTML, CSS, and JavaScript; the installed packages support development and checks. Execution details and gameplay are in the [Kana Rain README](./01-kana-rain/README.md).

## Checks and release build

Run these commands inside `01-kana-rain/`:

```sh
pnpm test
pnpm exec playwright install chromium
pnpm test:browser
pnpm build
```

The browser installation is needed before the first browser test run. `pnpm build` creates the static release in `01-kana-rain/dist/`; deploy that directory's contents. The build includes the game, art gallery, pronunciation bundle, and public information pages. The catalogue documents, development scripts, tests, and local build outputs remain separate from the live game.

The release URL is [kana-rain.nihongogrove.top](https://kana-rain.nihongogrove.top/). Page titles, descriptions, canonical links, social previews, structured data, `robots.txt`, and `sitemap.xml` use that address. Keep those references consistent if the production address changes.
