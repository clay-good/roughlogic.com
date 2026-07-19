# roughlogic.com Specification v994 -- Pre-Harvest Corn Yield (Yield Component Method) (calc-agriculture.js, Group L, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`** (Group
> L), no new module, group, or dependency. Inherits spec.md through spec-v993.md. Beside `crop-yield` (post-harvest)
> and the grain tiles.
>
> **The gap, and the evidence for it.** `crop-yield` computes the measured, moisture-corrected yield AFTER harvest, but
> nothing gives the in-season, weeks-before-harvest estimate. Grep confirmed no yield-component / ear-count tile. The
> number this settles: 32 ears per 1/1000 acre with 560 kernels each is about **199 bu/acre**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, bu/acre from counts), bounds-fuzzer, worked-example
registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input or a non-positive ear count, kernel
rows, kernels per row, or kernel factor returns `{ error }`. Citation discipline (v19/v22): the yield component
(ear-count) method by name (Purdue / Iowa State Extension), `GOVERNANCE.general`; the note explains the 1/1000-acre ear
count (17.5 ft of 30-in row), the kernel factor (~90, 75-80 big kernels, 95-100 small), and that the harvested,
moisture-corrected yield (`crop-yield`) is the real number and the combine and scale govern.

## 2. The tile

### 2.1 `corn-yield-estimate` -- Pre-Harvest Corn Yield (Yield Component Method)

```
inputs:
  ears_per_thousandth_acre  ears counted in 1/1000 acre (17.5 ft of 30-in row), default 32
  kernel_rows_around        kernel rows around the ear, default 16
  kernels_per_row           kernels per row, default 35
  kernel_factor             thousands of kernels per 56-lb bushel (~90), default 90

kernels_per_ear   = kernel_rows_around x kernels_per_row
bushels_per_acre  = ears_per_thousandth_acre x kernels_per_ear / kernel_factor
```

**Pinned worked example.** 32 ears, 16 rows x 35 kernels, factor 90: `kernels/ear = 16 x 35 = 560`; `bu/ac = 32 x 560
/ 90 = ` **199 bu/acre**. Cross-check: a thinner stand, 28 ears, 16 x 30 kernels: `kernels/ear = 480`; `bu/ac = 28 x
480 / 90 = ` **149 bu/acre**.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`, beside `cattle-heart-girth-weight`); a `tile-meta.js`
`_TILES` entry (`L`); a `citations.js` entry (Purdue / Iowa State yield component method, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the base plus the thinner-stand cross-check, pinning kernels/ear and bu/acre);
`test/fixtures/compute-map.js` (`corn-yield-estimate` -> `computeCornYieldEstimate`, module
`../../calc-agriculture.js`); `scripts/related-tiles.mjs` (-> `crop-yield` / `grain-bin-capacity` /
`grain-shrink-moisture`); `data/search/aliases.json` (5 collision-checked aliases: "corn yield", "yield estimate",
"ear count", "corn yield estimate", "bushels per acre"), then `node scripts/build-alias-shards.mjs`; the tile is
rendered by the `_r` factory in the `AGRICULTURE_RENDERERS` map, and the id added to the calc-agriculture declare list
in `app.js`; the `// dims:` annotation directly above the compute; the Group L citation-coverage audit count bumped;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the
kernel-factor / ear-count directions, and the error seams. The calc-agriculture.js gzip cap and the Group L group shell
are watched at build (cap raised for the ag discovery batch). Home tile count 1,442 -> 1,443.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group L count bump);
`npm run build`; `node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs`
post-build; `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(32 ears x 560 / 90 -> 199 bu/acre).

## 5. Roadmap position

Agronomy beside `crop-yield`, serving the corn grower / agronomist (agriculture). Deliberately the pre-harvest
estimate; the actual harvested, moisture-corrected yield (`crop-yield`) is the real number, and the combine yield
monitor and the grain scale govern. Stays evidence-driven. Continues the agriculture sweep at 1 new spec (v994).
