# Frozen runtimes for cached production entry documents

Both supported historical production formats request the stable `assets/game-runtime.js` URL. They have different DOM contracts: the 1.10.1 document predates progress-import controls; the 1.12.x document includes `importBtn` and `applyImportBtn`. The build generates a small DOM-based dispatcher containing both original bundles in separate branches. It never uses `eval` or downloads more code. Only the matching branch executes.

| Frozen public bundle | Release commit | Exact SHA-256 |
|---|---|---|
| `runtime-1.10.1.js` | `4e02aee67272e21111875087e6a7a033fed5e4b7` | `b4403850d0982fcb263784f66bb435983645ee0f52bca516cff15c0223431f69` |
| `runtime-1.12.1.js` | `a3d71ae4d76c1471b478997a93a201d8992eb0c8` | `39b5e1368120b426775cf39a24d8907f29c3c09da952646522a25991c6f1fdef` |

The first bundle is verified against the complete pinned 1.10.1 production fixture. The second is verified against the 1.12.1 published file hashes and Site source commit `57e118d758e168940cc8455705dfe0d9d5aff930`. Git text conversion is disabled so byte hashes remain stable on every operating system. The build verifies both hashes and compiles the dispatcher before packaging.

These are intentionally immutable compatibility assets, not additional maintained implementations. An old installed worker can return old cached HTML when only the HTML download fails; its subsequent runtime request must still find code compatible with that document. Current production HTML embeds its own current code after the complete DOM and never requests the compatibility URL. That also prevents new HTML from receiving an old cached runtime when only a script download fails.

Only the generated stable compatibility URL is distributed. This source directory and provenance document are excluded by the production allowlist. Both bundles contain public game code only, with no learner export or browser profile. Preserve them until support for their cached production documents is deliberately retired and tested. Ordinary source previews continue to load current working-tree modules.
