# roughlogic.com Specification v966 -- Roof Step-Flashing Piece Count (calc-finish.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finish.js`** (Group E), no
> new module, group, or dependency. Inherits spec.md through spec-v965.md. Roofing takeoff sweep, beside the accepted
> `roofing-squares` and `shingle-nails` tiles.
>
> **The gap, and the evidence for it.** The catalog has roof area, shingle nails, drip edge, and underlayment takeoffs,
> but nothing counts STEP flashing at a roof-to-wall intersection. Grep confirmed no step-flashing tile. Every roofer
> orders it by the piece on every sidewall and chimney. The number this settles: a 20 ft sloped run at a 5 in exposure
> takes **49 pieces**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, a count from feet and inches), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive wall run
or shingle exposure, or a negative waste returns `{ error }`. Citation discipline (v19/v22): the step-flashing
piece-count takeoff by name, `GOVERNANCE.general`; the note states that there is one piece per shingle course (plus one
to start), that step flashing is woven course-by-course and must NOT be a single continuous strip, and that IRC
R905.2.8.3 and the shingle / flashing manufacturer's details govern the install.

## 2. The tile

### 2.1 `step-flashing-count` -- Roof Step-Flashing Piece Count

```
inputs:
  wall_run_ft         sloped wall / chimney sidewall run (ft), default 20
  shingle_exposure_in shingle exposure (in, ~5), default 5
  waste_pct           waste (percent), default 5

step_flashing_pieces = ceil(wall_run_ft x 12 / shingle_exposure_in) + 1
order_pieces         = ceil(step_flashing_pieces x (1 + waste_pct/100))
```

**Pinned worked example.** 20 ft sloped run, 5 in exposure, 5% waste: `pieces = ceil(240/5) + 1 = 48 + 1 = ` **49**,
order = `ceil(49 x 1.05) = ` **52**. Cross-check: a coarser **7.5 in** exposure over a 16 ft run needs fewer courses,
`ceil(192/7.5) + 1 = 26 + 1 = ` **27** pieces.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["roofing", "carpentry"]`, beside `cement-board-takeoff`); a `tile-meta.js`
`_TILES` entry (`E`); a `citations.js` entry (step-flashing takeoff, `GOVERNANCE.general`); `test/fixtures/worked-
examples.json` (the base example plus the coarser-exposure cross-check, pinning the piece and order counts);
`test/fixtures/compute-map.js` (`step-flashing-count` -> `computeStepFlashingCount`, module `../../calc-finish.js`);
`scripts/related-tiles.mjs` (-> `roofing-squares` / `shingle-nails` / `gutter-downspout-takeoff`); `data/search/
aliases.json` (5 collision-checked aliases: "step flashing", "step flashing count", "wall flashing pieces", "roof to
wall flashing", "chimney step flashing"), then `node scripts/build-alias-shards.mjs`; the tile is rendered by the
`_simpleRenderer` factory in the `FINISH_RENDERERS` map, and the id added to the calc-finish declare list in `app.js`;
the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-
fuzzer.test.js` block pinning the count, the coarser-exposure and longer-run directions, the ceil on partial courses, the
zero-waste order, and the error seams. The calc-finish.js gzip cap and the Group E group shell are watched at build. Home
tile count 1,414 -> 1,415.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(20 ft / 5 in / 5% -> 49 pieces, order 52).

## 5. Roadmap position

Roofing takeoff beside `roofing-squares`, serving the roofer / carpenter (roofing / carpentry). Deliberately the piece
count; the shingle exposure, the flashing size, and IRC R905.2.8.3 and the manufacturer's flashing details govern the
install. Stays evidence-driven. Continues the roofing takeoff sweep at 1 new spec (v966).
