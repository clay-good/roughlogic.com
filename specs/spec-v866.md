# roughlogic.com Specification v866 -- Construction Adhesive Tube Count (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v865.md. Framing sweep, beside `sheathing-takeoff`.
>
> **The gap, and the evidence for it.** Nothing counts **construction adhesive** tubes for a subfloor or panel job, where
> the bead size sets how far a tube goes. Grep confirmed no adhesive-tube tile. The number this settles: a 28 oz tube run
> as a 3/8 in bead covers **38 ft**, so **1,200 LF** of joist tops takes **32 tubes** -- and going to a 1/2 in bead nearly
> doubles that.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the takeoff
pattern: the total bead length carries `L`, the tube volume is `L^3`, the bead diameter is `L`, the bead area is `L^2`,
the length per tube is `L`, and the tube count is dimensionless. The v18/v21 contract: a non-finite or non-positive total
length, tube volume, or bead diameter returns `{ error }`. Citation discipline (v19/v22): the bead-yield identity by name
(bead area = pi/4 x diameter^2; length per tube = tube volume / bead area / 12; tubes = ceil(total / length per tube)),
`GOVERNANCE.general`; the note states that the bead diameter follows the manufacturer's nozzle cut and the spec (subfloor
adhesive is commonly a 3/8 in bead), that a fatter bead or a second bead on wide members uses more, that a 28 fluid-ounce
cartridge is about 50.6 in^3, and that the crew keeps a spare.

## 2. The tile

### 2.1 `construction-adhesive-tubes` -- Construction Adhesive Tube Count

```
inputs:
  total_lf         total bead length (ft)
  tube_volume_in3  cartridge volume (in^3, default 50.6 for a 28-oz tube)
  bead_dia_in      bead diameter (in, default 0.375)

bead_area_in2 = (PI/4) * bead_dia_in^2
lf_per_tube   = tube_volume_in3 / bead_area_in2 / 12
tubes         = ceil(total_lf / lf_per_tube)
```

**Pinned worked example.** Total 1,200 LF, 28-oz tube (50.6 in^3), 3/8 in bead:
`bead area = (PI/4)*0.375^2 = ` **0.1105 in^2**; `lf/tube = 50.6/0.1105/12 = ` **38.2 ft**; `tubes = ceil(1200/38.2) = `
**32**. Cross-check: a 1/2 in bead has `bead area = 0.1963 in^2`, `lf/tube = 50.6/0.1963/12 = ` **21.5 ft**, and the same
1,200 LF takes `ceil(1200/21.5) = ` **56 tubes** -- the bead diameter enters squared, so a step up in bead size dominates.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry", "construction"]`, inside the `// Group E` construction block near
`sheathing-takeoff`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (length per tube = tube volume / (pi/4 dia^2) / 12, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the fatter-bead cross-check); `test/fixtures/compute-map.js`
(`construction-adhesive-tubes` -> `computeConstructionAdhesiveTubes`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `sheathing-takeoff` / `residential-framing` / `sealant-joint-yield`);
`data/search/aliases.json` (5 collision-checked aliases: "construction adhesive tubes", "subfloor adhesive count", "liquid
nails tubes", "adhesive tube coverage", "panel adhesive quantity"); a hand-written renderer in the `CONSTRUCTION_RENDERERS`
map mirroring a simple output renderer (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the bead area, length per tube, tube count, and the
error seams (non-positive total length, tube volume, bead diameter). The calc-construction.js gzip cap is watched at
build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first
paint. Home tile count 1,314 -> 1,315.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(50.6 / ((PI/4)*0.375^2) / 12 -> 38.2 ft/tube, 32 tubes).

## 5. Roadmap position

Framing takeoff beside `sheathing-takeoff`, sharing the bead-volume method with `sealant-joint-yield`, serving the framer
(carpentry / construction). Stays evidence-driven; the spec sets the bead.
