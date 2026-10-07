# Design Review — 14. Radical Alchemy

The recommendations below are proposals, separate from the [translated original specification](./SPECIFICATION.md), drawn from the [brainstorm](../brainstorm-minijogos-japones.md). Design review recommendations remain unapplied.

## Assessment

Assembling pieces can make the structure of difficult characters visible. It belongs in prototyping after the reading core, as the roadmap suggests. Before implementation, "combining components" needs to become a verifiable rule for position, form, and permitted recipes. Low rendering cost does not imply low editorial cost. The proposed pedagogical benefits need to be tested.

## Strengths and gaps

Short missions give manipulation a purpose, and the word shown after discovery keeps the kanji from being entirely isolated. The planned distinction between mnemonic and etymology is a valuable safeguard.

However, the proposal mixes a classification radical, a visual component, and a component serving a semantic or phonetic function. Calling all pieces "radicals" and saying they all carry meaning can create a false rule. Adding ingredients also does not specify arrangement: left/right, top/bottom, and positional forms matter to the composition represented. "Does not exist" and "is not in this phase's bank" are different situations. Vague missions admit several kanji, and a generated mnemonic should not historically explain a formation merely because it sounds plausible. The word chosen in the 明 example also requires care so that the word's displayed reading is not mechanically attributed to the pieces.

## Priority improvements

1. Use "components" in instructions and maintain a curated recipe per target: pieces, variants, and visual arrangement. Components whose function is unknown to the game receive no invented explanation.
2. Limit each mission to an explicit target and a few relevant pieces. A combination outside the recipes is described as unavailable; the game does not claim it does not exist in the language.
3. Present the composition as a memory aid, followed by a real word with its own reading. Mnemonics receive the "memory aid" label and editorial review; phonetic inferences are reserved for verified content.

## Recommended MVP

Ten to fifteen reviewed recipes, with two pieces and fixed positions indicated in the target. Each session contains five missions. The player taps a piece and then a slot; on the keyboard, they navigate focus and confirm with Enter. Dragging is optional. A round ends when the target is assembled or the solution is requested. An error highlights the slot to revise without destroying ingredients. Help shows one correct piece and records assistance. After completion, display the kanji, highlighted component, frequent word, reading, and gloss; a short later reassembly tests recognition without the completed image. The session ends after five targets or a voluntary exit, preserving confirmed answers.

## Defer

Free-form cauldron, persistent inventory, grimoire, three-piece chains, and automatic mnemonics. First validate understanding of the composition.

## Validation criteria

- Every recipe matches the displayed form and has reviewed components and positions.
- No message presents a mnemonic as etymology or bank coverage as a linguistic rule.
- A target can be assembled through touch and keyboard, with simple slot correction.
- Check whether, in a different presentation, the player identifies the components and reads the associated word without relying on the visual recipe.
