# spec-v1973.md -- When your state's edition would change the answer

> **Status: LANDED 2026-10-20 (proposed 2026-10-19). Platform spec, no tile added. As built: seven rows, not eight: `hood-exhaust` is left out because its IMC rates did not change between 2021 and 2027 (only the sections moved), and a row there would tell a reader the answer changed when it did not. The rows ship as a small module, `edition-sensitivity.js`, rather than a `docs/` file plus a data shard on the legal manifest, which keeps the monthly data refresh untouched; the lint (`check-edition-sensitivity`) holds the same rules. Until spec-v1974's state rows exist, the trigger is a per-tile "Working under an older edition?" selector, as this spec allows; no NEC row is asserted. Part of [scope-product-expansion](scope-product-expansion.md). Roadmap pillar 1 of [spec-v106](spec-v106.md) section 7, second half: "flags when the answer would differ across editions". [spec-v1968](spec-v1968.md) built the first half and listed this as its v2.** Catalog stays at **2,267**.

## What it does for you

spec-v1968 tells an electrician in Georgia that Georgia enforces NEC 2023 and that the calculator follows NEC 2023. It cannot yet say the one thing that matters when the two differ: whether this calculator's answer would change. After this spec, a calculator whose rule changed between editions says so, in one sentence, only when your state enforces an edition on the other side of the change:

> Your state enforces NEC 2020. This calculator follows NEC 2023, and the rule it applies changed in 2023: the EV charger load is taken at 7,200 VA or the nameplate, whichever is larger (220.57). Under 2020 the nameplate alone applied. Confirm with the inspector.

A calculator whose rule did not change says nothing new. A calculator with no sensitivity row recorded says nothing new either, because an absent row is not evidence of an unchanged rule and the page must not imply it is.

## Why the rows are hard, and how the project already has some

Telling someone a rule changed when it did not is as bad as missing a change. Every row therefore needs the two editions' text read side by side, which the I-code refresh of 2026-10-17 did for the IRC, IBC, IPC, IMC, IFGC and IECC. That reading put `code_edition` inputs on tiles where the answer really differs, and those are the first rows, already verified:

| Tile | Code | What changed |
|---|---|---|
| `allowable-area` | IBC 2021 -> 2027 | Table 506.3.3 footnote a (interpolation) deleted |
| `smoke-alarm-placement` | IRC 2021 -> 2024 | Cooking-appliance clearance: 20/10/6 ft by sensing type became 10 ft any type, 6 ft exception |
| `roof-drain-sizing` | IPC 2021 -> 2027 | Horizontal storm-drain tables per material (1106.2.3.1) |
| `grease-trap` | IPC 2021 -> 2027 | New grease-storage sizing by meals (1003.3.7 to 1003.3.11) |
| `hood-exhaust` | IMC 2021 -> 2027 | 507.5 split into 507.2.10 and 507.3.4; light-duty row moved |
| `lighting-density`, `blower-door-ach50`, `duct-leakage-cfm25` | IECC 2021 -> 2024 | LPD values; air-leakage limits by climate zone; duct-leakage limits by return count |

For the NEC, no row is asserted here. The spec names candidate tiles to research (the EV charger tiles for 220.57 and 625.42, the GFCI reference for 210.8, the service-conductor tiles for 310.12) and requires each row to quote both editions' text before it ships.

## Rules

- **One file, one row per (tile, code).** `docs/edition-sensitivity.json`: `{ id, code, from_edition, to_edition, section, changed: "one sentence", older_rule: "one sentence", verified_on, verified_by, sources: [two citations, one per edition] }`. The two source citations are mandatory and must name the edition each was read in.
- **Shown only when it applies.** The sentence appears when the reader's state (from spec-v1968's picker) enforces an edition on the far side of `from_edition`/`to_edition` from the edition the tile follows. For codes spec-v1968 does not yet cover (everything but the NEC) the sentence appears when the reader picks an edition from a small per-code "I am working under" selector on that tile, which [spec-v1974](spec-v1974.md) replaces with the state picker when its rows exist.
- **Never a computed alternative.** The sentence says the rule changed and what the older rule was; it does not run the older rule. Tiles that already carry a `code_edition` input run it, and their sentence points at that input instead.
- **Caps.** `changed` and `older_rule` are each under the 140-character data-prose cap; the sentence is built from them, the state, and the editions.
- **Expiry.** A row whose `to_edition` is no longer the tile's cited edition (the tile moved on) fails lint until it is updated or retired, so a row cannot describe a change the tile no longer straddles.

## How it is built

| Piece | Role |
|---|---|
| `docs/edition-sensitivity.json` | The rows, maintainer-verified. |
| `data/legal/edition-sensitivity.json` | The shipped shard, written by `build-data.mjs`, on the legal manifest, hash and integrity chain like `code-adoption.json`. |
| `code-adoption.js` | After resolving the enforced edition, looks up the row and appends the sentence. For non-NEC codes, draws the per-code selector until spec-v1974 lands. |
| `scripts/check-edition-sensitivity.mjs` | Lint: every row names a live tile; both editions are years; both sources present; the tile's citation names `to_edition`; prose caps; `verified_on` not in the future and a signer beside it. |

## Proof

- Each lint rule seeded red in `edition-sensitivity.test.js`.
- A rendering test: Georgia (2023) on an NEC-2023 tile with a 2020->2023 row prints nothing; a state on 2020 prints the sentence; a state with no row drafted prints nothing; a conflicting-source state (MD, NV) prints nothing.
- The eight verified I-code rows above are the fixture; a ninth row without two sources is refused.

## Not in v1

- Rows for NEC tiles: research first, as above. The spec ships with the I-code rows the code already proves.
- City amendments (Chicago's conduit rule, NYC's). Those are jurisdiction rows for spec-v1974's v2, not edition rows.
