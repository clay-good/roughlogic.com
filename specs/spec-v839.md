# roughlogic.com Specification v839 -- Pavement Marking Paint and Glass Bead Quantity (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v838.md. Paving sweep (entry 5), beside the asphalt
> tiles.
>
> **The gap, and the evidence for it.** The catalog has architectural `paint-coverage` (wall paint from volume-solids) but
> nothing sizes **pavement marking** paint and the glass beads dropped into it. Grep confirmed no striping tile. The number
> this settles: a mile of 4-in line is **1,760 sf**, which at 320 sf/gal is **5.5 gallons** of paint and, at 6 lb/gal,
> **33 lb** of glass beads -- the order for a striping run, beads included, that wall-paint coverage never touches.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
finish siblings (`paint-coverage`, `coating-coverage-dft`): the stripe length and width carry `L`, the coverage is an
area-per-volume (`L^-1`), the bead rate is a mass-per-volume (`M L^-3`), the stripe area is `L^2`, the paint volume is
`L^3` (gallons), and the bead weight is `M`. The v18/v21 contract: a non-finite or non-positive length, width, coverage,
or bead rate returns `{ error }`. Citation discipline (v19/v22): the marking quantity identity by name (stripe area =
length x width / 12; gallons = area / coverage; beads = gallons x rate), `GOVERNANCE.general`; the note states that the
coverage (sf/gal) follows the specified wet-mil thickness (a waterborne line near 15 mil runs about 320-360 sf/gal), that
the glass-bead drop rate is set by the retroreflectivity spec, and that a skip (dashed) line applies a duty-cycle fraction
of the length.

## 2. The tile

### 2.1 `striping-paint-quantity` -- Pavement Marking Paint and Glass Bead Quantity

```
inputs:
  length_ft             stripe length (ft)
  width_in              stripe width (in, default 4)
  coverage_sf_per_gal   paint coverage (sf/gal, default 320)
  bead_rate_lb_per_gal  glass bead rate (lb/gal, default 6)

stripe_sf = length_ft * width_in / 12
paint_gal = stripe_sf / coverage_sf_per_gal
beads_lb  = paint_gal * bead_rate_lb_per_gal
```

**Pinned worked example.** Length 5,280 ft (1 mile), width 4 in, coverage 320 sf/gal, beads 6 lb/gal:
`area = 5280 * 4 / 12 = ` **1,760 sf**; `paint = 1760 / 320 = ` **5.5 gal**; `beads = 5.5 * 6 = ` **33 lb**. Cross-check:
a wide 6 in edge line is `5280 * 6 / 12 = ` **2,640 sf**, `2640/320 = ` **8.25 gal** and **49.5 lb** of beads -- width
scales the whole order, which is why the wide lines eat the paint truck.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`, inside the `// Group E` construction block near
`paint-coverage`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (gallons = area / coverage; beads = gallons x rate, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the wide-line cross-check); `test/fixtures/compute-map.js`
(`striping-paint-quantity` -> `computeStripingPaintQuantity`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `paint-coverage` / `asphalt-tonnage` / `coating-coverage-dft`);
`data/search/aliases.json` (5 collision-checked aliases: "striping paint quantity", "pavement marking paint", "line
striping gallons", "glass bead quantity", "road stripe paint"); a hand-written renderer in the `CONSTRUCTION_RENDERERS`
map mirroring the `paint-coverage` renderer (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the stripe area, paint gallons, bead weight, and
the error seams (non-positive length, width, coverage, bead rate). The calc-construction.js gzip cap is watched at build.
Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint.
Home tile count 1,287 -> 1,288.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(5280 * 4 / 12 / 320 -> 5.5 gal, 33 lb beads).

## 5. Roadmap position

Fifth paving tile: the striping quantity that follows the overlay, serving the pavement-marking crew (construction /
carpentry). Distinct from the architectural `paint-coverage`. Stays evidence-driven; the marking spec sets the coverage and
bead rate.
