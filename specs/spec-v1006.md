# roughlogic.com Specification v1006 -- Single-Point Thread Cutting Depth (calc-machining.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`** (Group
> K), no new module, group, or dependency. Inherits spec.md through spec-v1005.md. Beside `cutting-speed-rpm`; distinct
> from `thread-pitch` (pitch only), `tap-drill-size` (internal tap), and `thread-measure-wire` (measuring).
>
> **The gap, and the evidence for it.** The catalog has thread pitch, tap drill, and three-wire measurement, but
> nothing gives the single-point CUTTING DEPTH and compound infeed for turning an external thread on a lathe. Grep + the
> alias index confirmed no thread-cutting-depth tile. The number this settles: a 1/2-13 thread is cut **0.0472 in**
> deep, **0.0542 in** on the compound.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, inches from a per-inch count), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input or non-positive TPI
returns `{ error }`. Citation discipline (v19/v22): the single-point 60-degree UN external thread depth and 29.5-degree
compound infeed by name (Machinery's Handbook threading practice), `GOVERNANCE.general`; the note explains the 0.6134 x
pitch external thread height, the 29.5-degree compound method, and that the thread standard, tool geometry, and a thread
gauge (or the three-wire method) govern the finished part.

## 2. The tile

### 2.1 `thread-single-depth` -- Single-Point Thread Cutting Depth

```
inputs:
  tpi   threads per inch, default 13

pitch_in           = 1 / tpi
single_depth_in    = 0.6134 x pitch_in                       [60-degree UN external thread height]
compound_infeed_in = single_depth_in / cos(29.5 degrees)
```

**Pinned worked example.** 1/2-13 thread: `pitch = 1/13 = 0.0769 in`; `radial depth = 0.6134 x 0.0769 = ` **0.0472 in**;
`compound infeed = 0.0472 / cos(29.5) = ` **0.0542 in**. Cross-check: a coarser 3/4-10 thread: `pitch = 0.100 in`;
`depth = 0.6134 x 0.100 = ` **0.0613 in**.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic", "machinist"]`, beside `cutting-speed-rpm`); a `tile-meta.js`
`_TILES` entry (`K`); a `citations.js` entry (Machinery's Handbook threading, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 1/2-13 base plus the 3/4-10 cross-check, pinning the depth and compound
infeed); `test/fixtures/compute-map.js` (`thread-single-depth` -> `computeThreadSingleDepth`, module
`../../calc-machining.js`); `scripts/related-tiles.mjs` (-> `thread-pitch` / `tap-drill-size` / `cutting-speed-rpm`);
`data/search/aliases.json` (5 collision-checked aliases: "thread depth", "single point thread", "thread cutting depth",
"compound infeed", "60 degree thread depth"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the
`MACHINING_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-machining declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the compound-exceeds-radial and 1/TPI-scaling
relations, and the error seams. The calc-machining.js gzip cap and the Group K group shell are watched at build (cap
raised for this tile). Home tile count 1,454 -> 1,455.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(1/2-13 -> 0.0472 in depth, 0.0542 in compound).

## 5. Roadmap position

Lathe threading beside `cutting-speed-rpm`, serving the machinist (mechanic, machinist). Deliberately the setup depth;
the thread standard (UN/UNJ/metric), the tool geometry, and a thread gauge or the three-wire method govern the finished
part. Stays evidence-driven. Continues the machining sweep at 1 new spec (v1006).
