# roughlogic.com Specification v789 -- Deck Board and Fastener Takeoff (calc-finish.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finish.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v788.md. Explore sweep #21 (entry 4).
>
> **The gap, and the evidence for it.** Every deck builder does a surface takeoff before ordering -- boards, lineal feet,
> joists, and fasteners -- and no tile does it (the framing tiles size structure, not the deck surface). The board count
> across the width is `ceil((width_in + gap) / (board face + gap))`, the gap falling between boards, not after the last.
> The number this settles: a **12 x 16 ft** deck of **5.5"** boards at a **0.25"** gap needs **26 boards**, **458 lineal
> feet** at 10% waste, **13 joists**, and **676 deck screws**. Grep confirmed no deck-board / decking / deck-screw tile
> exists (the `joist` hits are structural deflection and framing tiles).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
takeoff siblings (`fence-estimate`, `residential-framing`, `attic-ventilation`): the deck dimensions, board face, gap,
and joist spacing carry `L`, the waste is dimensionless, the lineal feet carry `L`, and the board / joist / screw counts
are dimensionless. The v18/v21 contract: a non-finite input (via `_finiteGuard`), a non-positive width, length, board
face, or joist spacing, or a negative gap or waste returns `{ error }`. Citation discipline (v19/v22): first-principles
deck-surface takeoff by name (the same take-off basis as `fence-estimate`), `GOVERNANCE.general` matching the siblings;
the note states the gap-between-boards convention, that butt joints must land on a joist and are staggered, the joist
count formula, the two-screws-per-board-per-joist fastener rule, and that it sizes the surface only -- not the joists,
beam, posts, or footings.

## 2. The tile

### 2.1 `deck-board-takeoff` -- Deck Board and Fastener Takeoff

```
inputs:
  deck_width_ft         width across the boards (ft)
  deck_length_ft        board run length (ft)
  board_face_width_in   board face width (in, 5.5 for 5/4x6 or 2x6)
  gap_in                gap between boards (in)
  joist_spacing_in      joist spacing on center (in)
  waste_pct             waste (%)

boards    = ceil((deck_width_ft x 12 + gap_in) / (board_face_width_in + gap_in))
lineal_ft = boards x deck_length_ft x (1 + waste_pct/100)
joists    = ceil(deck_length_ft x 12 / joist_spacing_in) + 1
screws    = boards x joists x 2
```

**Pinned worked example.** 12 x 16 ft deck, 5.5" boards, 0.25" gap, 16" OC, 10% waste: `boards = ceil((144 + 0.25)/5.75)
= ceil(25.08) = ` **26**; `lineal = 26 x 16 x 1.10 = ` **457.6 ft**; `joists = ceil(16x12/16) + 1 = 12 + 1 = ` **13**;
`screws = 26 x 13 x 2 = ` **676**. Waste scales the lineal feet only; a narrower board raises the board count.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry"]`) beside `gutter-downspout` (Group E rows are spec-interleaved
and carry an explicit `group:` field, so the group-shell count stays consistent); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (first-principles takeoff, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned
example, four pinned outputs); `test/fixtures/compute-map.js` (`deck-board-takeoff` -> `computeDeckBoardTakeoff`);
`scripts/related-tiles.mjs` (-> `residential-framing` / `joist-deflection` / `fence-estimate`); `data/search/aliases.json`
(5 collision-checked aliases: "how many deck boards do i need", "deck screw count", "deck material takeoff", ...); the
calc-finish `FINISH_RENDERERS` map entry via the `_simpleRenderer` factory (non-exported, so no DOM-sentinel row) and the
id added to the calc-finish declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the counts, the waste scaling, the
narrower-board board count, and the error seams. The calc-finish.js gzip cap is unchanged (the addition fits under the
current cap). Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,237
-> 1,238.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (12 x 16 ft -> 26 boards, 458 lf, 13 joists, 676
screws).

## 5. Roadmap position

Adds the deck-surface takeoff every deck builder orders from to the finish / carpentry bench, beside the fence and
framing takeoffs. Continues Explore sweep #21 (shadow-length queued next). A deck-footing / post-spacing tile and a
hidden-clip fastener variant are the natural next deck additions; they stay evidence-driven.
