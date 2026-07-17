# roughlogic.com Specification v883 -- Lap / Panel Siding Squares and Linear Footage (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v882.md. Exterior sweep, beside `metal-roof-panels`
> and `fence-estimate`.
>
> **The gap, and the evidence for it.** Nothing takes off **siding** -- the net wall squares after openings and the linear
> feet of lap siding at a given exposure. Grep confirmed no siding-takeoff tile. The number this settles: 2,000 sf of wall
> less 200 sf of openings at 12% waste is **20.2 squares**, and at a 4 in exposure that is about **5,400 LF** of lap board
> -- and a wider reveal cuts the linear footage.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
exterior siblings (`metal-roof-panels`, `fence-estimate`): the wall and opening areas carry `L^2`, the waste is
dimensionless, the exposure carries `L`, the net area is `L^2`, the squares are dimensionless, and the linear feet is `L`.
The v18/v21 contract: a non-finite or non-positive wall area or exposure returns `{ error }`; a negative opening area or
waste, or an opening area exceeding the wall, returns `{ error }`. Citation discipline (v19/v22): the siding takeoff
identity by name (net = wall - openings; squares = net x (1 + waste) / 100; linear = net / exposure),
`GOVERNANCE.general`; the note states that a square is 100 sf, that the lap-siding linear footage follows the exposure
(the reveal to the weather), that starter strip, outside and inside corners, J-channel, and trim are taken off separately,
and that this is distinct from `fence-estimate` and `metal-roof-panels`.

## 2. The tile

### 2.1 `siding-takeoff` -- Lap / Panel Siding Squares and Linear Footage

```
inputs:
  wall_area_sf    gross wall area (ft^2)
  opening_area_sf openings to deduct (ft^2, default 0)
  waste_pct       waste allowance (percent, default 12)
  exposure_in     lap exposure / reveal (in, default 4)

net_area_sf = wall_area_sf - opening_area_sf
squares     = net_area_sf * (1 + waste_pct/100) / 100
linear_ft   = net_area_sf / (exposure_in/12)
```

**Pinned worked example.** Wall 2,000 sf, openings 200 sf, 12% waste, 4 in exposure:
`net = 2000 - 200 = 1,800 sf`; `squares = 1800*1.12/100 = ` **20.16**; `linear = 1800/(4/12) = ` **5,400 LF**. Cross-check:
a wider 6 in exposure is `1800/0.5 = ` **3,600 LF** at the same 20.16 squares -- the exposure sets the board footage, the
area sets the squares.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry", "construction"]`, inside the `// Group E` construction block near
`fence-estimate`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (squares = net(1+waste)/100; linear = net/exposure, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the wider-exposure cross-check); `test/fixtures/compute-map.js`
(`siding-takeoff` -> `computeSidingTakeoff`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `metal-roof-panels` / `fence-estimate` / `housewrap-rolls`); `data/search/aliases.json` (5 collision-checked aliases:
"siding takeoff", "lap siding squares", "siding linear feet", "siding squares estimate", "panel siding quantity"); a
hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `metal-roof-panels` renderer (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning
the net area, squares, linear feet, and the error seams (non-positive wall area or exposure; negative openings or waste;
openings exceeding wall). The calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells`
and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,331 -> 1,332.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(1800*1.12/100 -> 20.16 squares, 5,400 LF).

## 5. Roadmap position

Exterior takeoff beside `metal-roof-panels` and `fence-estimate`, serving the siding installer (carpentry / construction).
Stays evidence-driven; the exposure and trim schedule govern.
