# roughlogic.com Specification v902 -- Leach-Field / Trench Drainrock Volume (calc-septic.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-septic.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v901.md. Septic sweep, beside `septic-drainfield`.
>
> **The gap, and the evidence for it.** `septic-drainfield` gives the required trench length from the perc rate but nothing
> converts a trench layout into **drainrock volume**. Grep confirmed no leach-field-aggregate tile. The number this
> settles: three 60 ft trenches, 24 in wide with 12 in of stone, is **14.7 cy** (about 20 tons) of washed drainrock -- the
> gravel order for the field.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group B septic
sibling (`septic-drainfield`) and the trench-aggregate pattern (`pipe-bedding-backfill`): the trench length, width, and
stone depth carry `L`, the trench count and waste are dimensionless, the volumes are `L^3`, and the tonnage is `M`. The
v18/v21 contract: a non-finite or non-positive trench count, length, width, or stone depth returns `{ error }`; a
negative waste returns `{ error }`. Citation discipline (v19/v22): the drainrock identity by name (stone = trenches x
length x width x depth / 27; tons = stone x drainrock unit weight), `GOVERNANCE.general`; the note states that the trench
count, width, and stone depth come from the AHJ-approved septic design and perc (the required length is
`septic-drainfield`), that the stone is washed drainrock (about 3/4 to 2.5 in), that the geotextile over the stone is
taken off separately, and that this is distinct from the required-length `septic-drainfield`.

## 2. The tile

### 2.1 `leach-field-aggregate` -- Leach-Field / Trench Drainrock Volume

```
inputs:
  num_trenches    number of trenches (count)
  trench_length_ft trench length (ft)
  trench_width_in  trench width (in, default 24)
  stone_depth_in   stone depth (in, default 12)
  waste_pct        waste allowance (percent, default 10)

stone_cf   = num_trenches * trench_length_ft * (trench_width_in/12) * (stone_depth_in/12)
stone_cy   = stone_cf / 27 * (1 + waste_pct/100)
stone_tons = stone_cy * 1.4
```

**Pinned worked example.** 3 trenches, 60 ft long, 24 in wide, 12 in stone, 10% waste:
`stone = 3*60*2*1 = 360 ft^3`; `cy = 360/27*1.10 = ` **14.7 cy** (13.3 neat); `tons = 14.7*1.4 = ` **20.5 tons**.
Cross-check: a deeper 18 in stone bed is `3*60*2*1.5 = 540 ft^3`, `540/27*1.10 = ` **22 cy** -- the stone depth, set by
the design, drives the order.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing", "construction"]`, inside the `// Group B` septic block beside
`septic-drainfield`) -- the Group B citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`B`); a
`citations.js` entry (stone = trenches x length x width x depth / 27, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the deeper-stone cross-check); `test/fixtures/compute-map.js`
(`leach-field-aggregate` -> `computeLeachFieldAggregate`, module `../../calc-septic.js`); `scripts/related-tiles.mjs`
(-> `septic-drainfield` / `pipe-bedding-backfill` / `french-drain-aggregate`); `data/search/aliases.json` (5
collision-checked aliases: "leach field aggregate", "drainfield gravel", "septic trench stone", "leach field drainrock",
"septic gravel volume"); a hand-written renderer in the `SEPTIC_RENDERERS` map mirroring a simple output renderer
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-septic declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js`
block pinning the stone volumes and tonnage and the error seams (non-positive trenches, length, width, depth; negative
waste). The calc-septic.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,350 -> 1,351.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group B audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(3*60*2*1/27*1.10 -> 14.7 cy).

## 5. Roadmap position

Septic takeoff beside `septic-drainfield` (required length), sharing the trench-aggregate method with
`french-drain-aggregate`, serving the septic installer (plumbing / construction). Stays evidence-driven; the AHJ design
sets the trench dimensions.
