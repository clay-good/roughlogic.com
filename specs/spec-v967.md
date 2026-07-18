# roughlogic.com Specification v967 -- Hull Displacement and Block Coefficient (calc-mechanic.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v966.md. Marine sweep, beside the accepted
> `hull-speed` and `anchor-rode-scope` tiles.
>
> **The gap, and the evidence for it.** The catalog has hull speed, prop slip, and anchor scope, but nothing gives a
> boat's DISPLACEMENT (weight). Grep confirmed no block-coefficient / hull-displacement tile (`displacement-cr` is engine
> cubic-inch displacement). A boatwright / surveyor / rigger sizing ground tackle, a trailer, or a lift needs it. The
> number this settles: a 30 ft waterline hull at Cb 0.5 displaces **17.1 long tons** in seawater.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, mixing feet, pcf, and tons), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive dimension
or water density, or a block coefficient outside (0,1] returns `{ error }`. Citation discipline (v19/v22): the
displacement relation by name (Archimedes / block coefficient), `GOVERNANCE.general`; the note states that Cb runs
~0.35-0.60 by hull form, that seawater is 64.0 lb/ft^3 and fresh 62.4, and that the accurate value comes from the lines
drawing integrated by Simpson's rule -- the naval architect's hydrostatics govern.

## 2. The tile

### 2.1 `hull-displacement` -- Hull Displacement and Block Coefficient

```
inputs:
  lwl_ft             waterline length LWL (ft), default 30
  bwl_ft             waterline beam BWL (ft), default 10
  draft_ft           draft (ft), default 4
  block_coefficient  block coefficient Cb (~0.35-0.60), default 0.5
  water_density_pcf  water density (pcf: 64 sea, 62.4 fresh), default 64

displacement_ft3       = lwl_ft x bwl_ft x draft_ft x block_coefficient
displacement_lb        = displacement_ft3 x water_density_pcf
displacement_long_tons = displacement_lb / 2240
```

**Pinned worked example.** 30 ft LWL, 10 ft beam, 4 ft draft, Cb 0.5, seawater: volume = `30 x 10 x 4 x 0.5 = ` **600
ft^3**, weight = `600 x 64 = ` **38,400 lb**, = `38,400/2,240 = ` **17.14 long tons**. Cross-check: in **fresh water**
(62.4 pcf) the same 600 ft^3 weighs only **37,440 lb** -- so the hull floats a touch deeper to displace the same weight.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["marine", "mechanic"]`, beside `hull-speed`); a `tile-meta.js` `_TILES` entry
(`K`); a `citations.js` entry (Archimedes / block coefficient, `GOVERNANCE.general`); `test/fixtures/worked-
examples.json` (the seawater example plus the fresh-water cross-check, pinning the volume, weight, and long tons);
`test/fixtures/compute-map.js` (`hull-displacement` -> `computeHullDisplacement`, module `../../calc-mechanic.js`);
`scripts/related-tiles.mjs` (-> `hull-speed` / `anchor-rode-scope` / `sacrificial-anode-life`); `data/search/
aliases.json` (5 collision-checked aliases: "hull displacement", "boat displacement", "block coefficient", "displacement
tonnage", "boat weight water"), then `node scripts/build-alias-shards.mjs`; the tile is rendered by the `_simpleRenderer`
factory in the `MECHANIC_RENDERERS` map, and the id added to the calc-mechanic declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js`
block pinning the volume/weight/tons, the fresh-water-lighter and fuller-hull directions, the dimension linearity, and the
error seams. The calc-mechanic.js gzip cap and the Group K group shell are watched at build (cap raised for this tile).
Home tile count 1,415 -> 1,416.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(30/10/4/0.5/64 -> 600 ft^3, 38,400 lb, 17.14 long tons).

## 5. Roadmap position

Marine beside `hull-speed`, serving the boatwright / marine surveyor / rigger (marine / mechanic). Deliberately the
first-order block estimate; the lines drawing (Simpson's rule), the loaded trim, appendages, and the naval architect's
hydrostatics govern the exact displacement. Stays evidence-driven. Continues the marine sweep at 1 new spec (v967).
