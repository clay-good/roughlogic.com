# roughlogic.com Specification v889 -- Glass Weight and Suction-Cup Lifter Count (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v888.md. Glazing sweep, beside `glass-weight`.
>
> **The gap, and the evidence for it.** `glass-weight` gives the weight but nothing sizes the **suction-cup lifter** count
> from it. Grep confirmed no glass-lifter tile. The number this settles: a 4 x 8 ft insulated unit with a half-inch of
> total glass weighs **208 lb**, and at a 4:1 safety factor on 150-lb cups that is **6 cups** -- the rigging check before
> anyone lifts a lite.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
glazing sibling (`glass-weight`): the area carries `L^2`, the glass thickness `L`, the density coefficient is a
weight-per-area-per-inch (`M L^-2 T^-2`), the safety factor is dimensionless, the cup working load and glass weight are
forces (`M L T^-2`), and the cup count is dimensionless. The v18/v21 contract: a non-finite or non-positive area, glass
thickness, safety factor, cup working load, or density returns `{ error }`. Citation discipline (v19/v22): the lifter
identity by name (weight = area x thickness x density; cups = ceil(weight x safety factor / cup working load)),
`GOVERNANCE.general`; the note states that soda-lime glass weighs about 13 lb/ft^2 per inch of thickness, that an
insulated unit sums the lite thicknesses, that the safety factor (typically 4:1) and the cup working load come from the
lifter manufacturer (ANSI/ASME), that a competent person and the rated lifter govern the pick, and that this is distinct
from `glass-weight`.

## 2. The tile

### 2.1 `glass-vacuum-lift` -- Glass Weight and Suction-Cup Lifter Count

```
inputs:
  area_sf              lite / unit area (ft^2)
  glass_thickness_in   total glass thickness, all lites (in)
  safety_factor        lifter safety factor (dimensionless, default 4)
  cup_wll_lb           per-cup working load limit (lb, default 150)
  glass_density_psf_in glass weight (lb/ft^2 per in, default 13.0)

weight_lb = area_sf * glass_thickness_in * glass_density_psf_in
cups      = ceil(weight_lb * safety_factor / cup_wll_lb)
```

**Pinned worked example.** Area 32 sf (4 x 8), total glass 0.5 in (a 1 in IGU), safety 4, 150-lb cups, 13.0 lb/ft^2-in:
`weight = 32*0.5*13 = ` **208 lb**; `cups = ceil(208*4/150) = ceil(5.55) = ` **6**. Cross-check: a monolithic 1/4 in lite
of the same size weighs `32*0.25*13 = ` **104 lb** and needs `ceil(104*4/150) = ` **3 cups** -- half the glass, half the
cups.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["glazing", "construction"]`, inside the `// Group E` construction block beside
`glass-weight`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (weight = area x thickness x 13; cups = ceil(weight x SF / cup WLL), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned IGU example plus the monolithic cross-check); `test/fixtures/compute-map.js`
(`glass-vacuum-lift` -> `computeGlassVacuumLift`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `glass-weight` / `rigging-check` / `sling-angle`); `data/search/aliases.json` (5 collision-checked aliases: "glass
vacuum lift", "glass suction cups", "glass lifter count", "glazing lifter cups", "glass weight lifter"); a hand-written
renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `glass-weight` renderer (non-exported, so no DOM-sentinel dims
row), and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the weight and
cup count and the error seams (non-positive area, thickness, safety factor, cup WLL, density). The calc-construction.js
gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded,
absent from home first paint. Home tile count 1,337 -> 1,338.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(32*0.5*13*4/150) -> 6 cups).

## 5. Roadmap position

Glazing rigging check beside `glass-weight` and the `rigging-check` family, serving the glazier (glazing / construction).
Stays evidence-driven; the rated lifter and a competent person govern the pick.
