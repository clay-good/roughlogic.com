# roughlogic.com Specification v851 -- Galvanized Duct Sheet-Metal Weight Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v850.md. HVAC sheet-metal sweep, beside
> `bend-allowance` and `metal-weight`.
>
> **The gap, and the evidence for it.** The catalog weighs plate and shapes (`metal-weight`) but nothing gives **duct
> sheet-metal weight** from the perimeter, run, and gauge -- the number that sizes the coil order and the hangers. Grep
> confirmed no duct-weight / duct-metal tile. The number this settles: a 24 x 12 in rectangular run, 100 ft long in 24-gauge
> galvanized, is about **798 lb** of metal once the SMACNA seam-and-reinforcement allowance is counted -- and a heavier
> 20-gauge run of the same duct is over **1,140 lb**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
sheet-metal siblings (`bend-allowance`, `metal-weight`): the width, height, and length carry `L`, the sheet weight is a
mass-per-area `M L^-2` (lb/ft^2 by gauge), the seam factor is dimensionless, the perimeter is `L`, the area is `L^2`, and
the weight is `M`. The v18/v21 contract: a non-finite or non-positive width, height, length, sheet weight, or seam factor
returns `{ error }`. Citation discipline (v19/v22): the duct-weight identity by name (perimeter = 2 x (width + height);
weight = perimeter x length x sheet weight x seam factor), `GOVERNANCE.general`; the note states that the per-gauge sheet
weight is a user-entered value from the metal (about 0.906 lb/ft^2 for 26-gauge, 1.156 for 24-gauge, 1.656 for 20-gauge
galvanized -- no copyrighted table reproduced), that the seam factor (about 1.15) covers seams, laps, and reinforcement per
SMACNA, and that fittings are taken off separately.

## 2. The tile

### 2.1 `duct-metal-weight` -- Galvanized Duct Sheet-Metal Weight Takeoff

```
inputs:
  width_in     duct width (in)
  height_in    duct height (in)
  length_ft    run length (ft)
  lb_per_sf    sheet weight for the gauge (lb/ft^2, default 1.156)
  seam_factor  seam / reinforcement allowance (dimensionless, default 1.15)

perimeter_ft = 2 * (width_in + height_in) / 12
area_sf      = perimeter_ft * length_ft
weight_lb    = area_sf * lb_per_sf * seam_factor
```

**Pinned worked example.** Width 24 in, height 12 in, length 100 ft, 24-gauge (1.156 lb/ft^2), seam 1.15:
`perimeter = 2*(24+12)/12 = ` **6 ft**; `area = 6*100 = 600 sf`; `weight = 600*1.156*1.15 = ` **797.6 lb**. Cross-check:
the same run in 20-gauge (1.656 lb/ft^2) weighs `600*1.656*1.15 = ` **1,142.6 lb** -- the gauge is the lever, which is why
the spec's gauge schedule drives the coil order.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["sheet-metal", "hvac"]`, inside the `// Group E` construction block near
`bend-allowance`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (weight = perimeter x length x sheet weight x seam factor, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the heavier-gauge cross-check); `test/fixtures/compute-map.js`
(`duct-metal-weight` -> `computeDuctMetalWeight`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `metal-weight` / `bend-allowance` / `duct-wrap-takeoff`); `data/search/aliases.json` (5 collision-checked aliases:
"duct metal weight", "sheet metal duct takeoff", "galvanized duct weight", "duct gauge weight", "ductwork pounds"); a
hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `metal-weight` renderer (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning
the perimeter, area, weight, and the error seams (non-positive width, height, length, sheet weight, seam factor). The
calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,299 -> 1,300.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(2*(24+12)/12 * 100 * 1.156 * 1.15 -> 797.6 lb).

## 5. Roadmap position

Opens the HVAC sheet-metal ops vein beside `bend-allowance` and `metal-weight`, serving the sheet-metal worker
(sheet-metal / hvac), and pairs with the coming `duct-wrap-takeoff` and `duct-hanger-load`. Home tile count crosses 1,300.
Stays evidence-driven; the spec's gauge schedule governs.
