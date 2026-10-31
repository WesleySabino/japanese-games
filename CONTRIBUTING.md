# Contributing to Japanese Games

Everyone is welcome to contribute, whether you code, test, study Japanese, write
documentation, or work on accessibility, sound, or art. You can also fork the
project and build your own version under the [MIT License](LICENSE).

## Start here

- [Report a bug](https://github.com/WesleySabino/japanese-games/issues/new?template=bug_report.yml)
  with steps to reproduce it and the affected game.
- [Propose a game or feature](https://github.com/WesleySabino/japanese-games/issues/new?template=game_proposal.yml)
  to discuss the idea before investing in a large implementation.
- Small fixes and documentation improvements can go straight to a pull request.

Keep discussion respectful and constructive. Harassment, personal attacks, and
sharing someone else's private information are not acceptable.

## Set up Kana Rain

Use Git, Node.js 22 or later, and pnpm 11 (CI uses 11.25.0):

```sh
git clone https://github.com/YOUR-USERNAME/japanese-games.git
cd japanese-games
git switch -c your-change
cd 01-kana-rain
pnpm install --frozen-lockfile
pnpm start
```

Fork the repository first and replace `YOUR-USERNAME` with your GitHub handle.
Open http://127.0.0.1:4173/. Source code, tests, artwork masters, and audio notices
live in `01-kana-rain/`. See its [development guide](01-kana-rain/DEVELOPMENT.md)
and [test guide](01-kana-rain/TESTING.md) for the game's contracts and focused checks.

## Submit a change

1. Make a focused change on your branch and update the relevant documentation.
2. For code changes, run `pnpm test` and `pnpm build` from `01-kana-rain/`.
   For UI or browser behavior, also install Chromium with
   `pnpm exec playwright install chromium` and run the appropriate browser tests.
   Explain what you checked; documentation-only changes do not need gameplay tests.
3. Commit the intended files, push your branch to your fork, and open a pull
   request against `WesleySabino/japanese-games:main`.
4. Describe the problem, the resulting behavior, and the checks you ran. Include
   screenshots for visible changes, using synthetic progress and disposable profiles.

Preserve existing player progress, saved-data compatibility, offline support,
keyboard/touch controls, and accessibility. Add a meaningful regression test when
fixing a bug. Keep generated builds, dependencies, personal exports, credentials,
and test artifacts out of commits. A pull request is reviewed before inclusion;
opening one does not guarantee it will be merged.

To keep your personal email out of new commits, configure Git with the no-reply
address shown in your own GitHub email settings. Review `git diff --staged` before
pushing. Public issues, pull requests, commit messages, and screenshots must not
contain credentials, private emails, local user paths, or personal learning exports.

## Add another game

This repository can hold multiple Japanese-learning games. Keep each game in its
own numbered directory, following `01-kana-rain/`, for example `02-your-game/`.
Discuss a new game through an issue and include:

- The gameplay idea and the Japanese skill it practices.
- A README with local setup, controls, build commands, and test instructions.
- Its own source, tests, and clearly documented assets and their provenance.
- Independent dependency/build configuration when needed. Add shared code only
  when multiple games actually use it.

Update the root games table and add CI appropriate to the new game. The current
Pages workflow publishes Kana Rain only; publishing another game or changing an
official address needs a separate, reviewed hosting change. A fork's deployment
should use its own domain and analytics configuration.

## License your contribution

Original contributions are submitted under the repository's MIT License unless
an asset has a separately documented license. You must have the right to submit
the material. Keep existing copyright, license, and provenance notices; document
the source and compatible license of any third-party asset or dependency.
The pronunciation recordings and menu music retain their existing CC0-1.0 terms.
See [third-party and asset notices](THIRD_PARTY_NOTICES.md).
