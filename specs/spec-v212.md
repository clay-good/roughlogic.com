# roughlogic.com Specification v212 -- CMU Grout Volume (Partial and Full Grout) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-06-29, package 0.84.0; was PROPOSED 2026-06-26). Batch spec-v212..v214 (masonry and finish -- the gaps the catalog's
> two-tile masonry shelf left: grouted-cell volume, modular coursing, wallcovering rolls).**
> In-scope catalog expansion under the spec-v106 trades-only charter: reinforced CMU is laid and grouted by
> masons. Adds one tile to **`calc-construction.js`** (Group E); no new module, group, or dependency.
> Inherits spec.md through spec-v211.md.
>
> **The gap, and the evidence for it.** The catalog counts the units (`masonry-count`) and bags the mortar
> (`mortar-mix`), but a reinforced CMU wall has a third material neither one touches: the grout poured into
> the reinforced cells. It is the order a mason places by the cubic yard, and it is what fills the vertical
> cores at the rebar spacing plus the continuous bond-beam course. The catalog can lay the block and butter
> the joints but cannot tell the mason how much grout to order -- the missing third of a structural masonry
> takeoff.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The wall length
and height are a length (`L`, ft); the core spacing is a length (`L`, in); the grouted-core cross-section and
the bond-beam cross-section are `L^2` (in^2); the grout volume is `L^3` reported in ft^3 and cubic yards; the
core count is `dimensionless`. The cross-section areas are inputs (from the block manufacturer's data; a
standard 8 in unit's grouted core is roughly 24 in^2, a bond-beam course roughly 30 in^2), because they vary
by block. The v18/v21 contract: any non-finite input, or a non-positive length, height, spacing, or area,
returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the core-count and grout-volume
relations by name; `editionNote` names **TMS 602 / ACI 530.1 (Specification for Masonry Structures)** and the
**NCMA TEK** grout references and states that **the grouted-cell spacing and the cross-section areas come from
the structural drawings and the unit data (user-supplied here), grout is ordered with a waste and pump
allowance on top, and the engineer of record governs the reinforcement** -- a material takeoff, not a
structural design.

## 2. The tile

### 2.1 `cmu-grout-volume` -- Grout Volume for Reinforced CMU

```
inputs:
  wall_len_ft     L     wall length, ft
  wall_ht_ft      L     wall height, ft
  core_spacing_in L     grouted vertical-core spacing on center, in
  core_area_in2   L^2   grouted core cross-section, in^2  (~24 for an 8 in unit)
  bond_area_in2   L^2   bond-beam course cross-section, in^2 (0 for none; ~30 typical)

cores       = floor(wall_len_ft x 12 / core_spacing_in) + 1   # both ends grouted
vert_ft3    = cores x wall_ht_ft x (core_area_in2 / 144)
bond_ft3    = wall_len_ft x (bond_area_in2 / 144)             # one continuous top course
total_ft3   = vert_ft3 + bond_ft3
total_yd3   = total_ft3 / 27
```

**Pinned worked example (partial grout, 24 in on center).** A 20 ft x 8 ft wall, cores grouted 24 in on
center, 24 in^2 cores, a 30 in^2 bond beam: `cores = floor(240 / 24) + 1 = 11`; `vert = 11 x 8 x 24/144 =
14.67 ft^3`; `bond = 20 x 30/144 = 4.17 ft^3`; `total = 18.83 ft^3 = ` **0.70 yd^3**.
**Cross-check (full grout, every cell).** Same wall with every core grouted (16 in on center for a standard
unit): `cores = floor(240 / 16) + 1 = 16`; `vert = 16 x 8 x 24/144 = 21.33 ft^3`; `+ bond 4.17 = 25.5 ft^3 = `
**0.94 yd^3**. Going from 24 in on center to fully grouted adds about a third of a cubic yard on this one wall
-- the spacing is the order's biggest lever.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["masonry","carpentry"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the core-count and grout-volume relations, `editionNote` naming
TMS 602 / ACI 530.1 and NCMA TEK and the EOR-governs caveat); `test/fixtures/worked-examples.json` (partial
example + full-grout cross-check); `test/fixtures/compute-map.js` (`cmu-grout-volume` ->
`computeCmuGroutVolume` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `masonry-count` /
`mortar-mix` / `rebar-schedule`); `data/search/aliases.json` ("grout volume", "cmu grout", "block fill",
"grouted cells", "masonry grout", "cells grouted"); the id appended to the existing construction renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples and error seams (non-finite, length/height/spacing/area <= 0). Raise the
`calc-construction.js` size cap by ~20 percent if needed (dated comment). Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block, the no-bond-beam path); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the vert / bond / total
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (20x8, 24 in oc -> 0.70 yd^3).

## 5. Roadmap position

Completes the structural-CMU takeoff trio (`masonry-count` units, `mortar-mix` joints, this for grout) and
pairs with `rebar-schedule` for the steel in the grouted cells. A grout-bag-yield converter (bags per yd^3
for a given product) is a deliberate future follow-on, flagged because bag yields are product-specific.
