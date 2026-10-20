# spec-v1976.md -- Search in Spanish

> **Status: LANDED 2026-10-20 (proposed 2026-10-19), mechanism only; Spanish rows await review. Platform spec, no tile added. Built: diacritic folding in the tokenizer (which until now dropped accented letters entirely), the Spanish unit spellings, a `calibre 12` rewrite, the `es` alias kind gated on `reviewed_by` in `check-alias-targets`, and a 40-row machine draft in `docs/aliases-es-draft.json`. Not done, by this spec's own rule: no row is shipped until a Spanish-speaking tradesperson or the maintainer reviews it, so the 20 Spanish questions with numbers cannot fill fields yet; `search-es.test.js` already holds every shipped `es` row to ranking its tile first, so reviewed rows are tested the moment they land. Part of [scope-product-expansion](scope-product-expansion.md). In scope under the spec-v106 trades-only charter: the same US tradesperson, the same calculators, one more language in the search box.** Catalog stays at **2,267**.

## What it does for you

Type `caida de voltaje 120v 150 pies calibre 12 20 amperios` and the one-box opens Voltage Drop with 150 ft, 12 AWG and 20 A filled in. Type `cuantas yardas de concreto` and Concrete Volume is the first result. The calculator itself, its labels and its answer stay in English; the search learns the Spanish names of the calculators and the Spanish spellings of the units.

## Why

Of the 12,121,000 people employed in US construction in 2025, 35.4 percent are Hispanic or Latino (BLS Current Population Survey, annual averages, table 18). Many work in English all day and still think of the thing they need in Spanish. The site's search is the only surface that has to understand a reader's first words; everything after it is numbers.

## Rules

- **Aliases, not translation.** Each tile gets Spanish alias rows in the existing master `data/search/aliases.json`, `kind: "es"`, flowing through the same per-group shards, the same ranker, the same `check-alias-targets` rule. Nothing in the catalog, the tiles or the MCP server changes.
- **Diacritics fold.** The ranker's tokenizer folds the accented vowels, the tilde n and the diaeresis u to their base letters before matching, in both the alias and the query, so `caida` with and without its accent, and `CAIDA`, meet. Folding is one function in search-discovery.js with a test; English behaviour is unchanged because English tokens have nothing to fold.
- **Units in Spanish.** field-units.js gains spellings: `pie`/`pies` -> ft, `pulg`/`pulgada`/`pulgadas` -> in, `libra`/`libras` -> lb, `galon`/`galones` -> gal, `amperio`/`amperios` -> A, `voltio`/`voltios` -> V, `vatio`/`vatios` -> W, `calibre` -> AWG, `metro`/`metros` refused as today (no metric default). The quantity extractor is otherwise untouched.
- **Drafted, then reviewed, then shipped.** Machine-drafted rows live in `docs/aliases-es-draft.json` and are not shipped. A row moves to the master only after a Spanish-speaking tradesperson or the maintainer marks it reviewed; the master row carries `reviewed_by`. The draft file is not a runtime surface and the lint says so.
- **Coverage order.** Tier-1 groups first (A, B, C, E: 1,269 tiles), at least one Spanish name alias and one question form per tile; then D, F, G, J, K, L, M.
- **No ranking regression.** Every English ground truth (`asked-phrasing`, aliases, names, ids) must hold its rate; a Spanish row that steals an English query's first place is a defect in that row.

## How it is built

| Piece | Change |
|---|---|
| `search-discovery.js` | `foldDiacritics` in the tokenizer. |
| `field-units.js` | The Spanish unit spellings above, canonical tokens unchanged. |
| `data/search/aliases.json` | Rows with `kind: "es"` and `reviewed_by`. |
| `docs/aliases-es-draft.json` | The unreviewed queue. |
| `test/unit/asked-phrasing-es.test.js` | For every shipped `es` row, the target ranks first; for 20 hand-written Spanish questions with numbers, the right fields fill. |
| `scripts/check-alias-targets.mjs` | A `kind: "es"` row without `reviewed_by` fails. |

## Proof

- Diacritic folding has a table test (12 words, accented and plain, same tokens).
- The Spanish unit table is tested through `extractQuantities`: `150 pies` -> 150 ft, `12 pulgadas` -> 12 in, `3 metros` -> refused.
- All four English ranking ground truths are re-run in CI with the Spanish rows present and must match their recorded rates exactly.
- A seeded `es` row pointing at the wrong tile turns `check-alias-targets` red when its term is a tile's Spanish name recorded in another row.

## Not in v1

- Spanish labels, outputs, notes or static pages. The Spanish reader gets the English page, found faster.
- Portuguese or any other language; the same mechanism would carry it.
