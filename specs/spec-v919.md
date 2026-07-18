# roughlogic.com Specification v919 -- Brick Veneer Weep-Hole Count (calc-masonry.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-masonry.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v918.md. Masonry-veneer detailing sweep, beside the
> accepted `brick-veneer-anchor-spacing` tile.
>
> **The gap, and the evidence for it.** The catalog counts veneer ANCHORS (`brick-veneer-anchor-spacing`) but nothing
> counts the **weep holes** that drain the air space. Grep confirmed no weep tile. Every veneer wall needs weeps at each
> flashing line and they get missed or mis-spaced. The number this settles: a 30 ft wall at a 33 in spacing takes **12
> weeps** per flashing line.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling
brick-veneer tile: the wall length and spacing carry `L`, and the flashing lines and weep counts are dimensionless. The
v18/v21 contract: a non-finite or non-positive wall length, spacing, or flashing-line count returns `{ error }`. Citation
discipline (v19/v22): the weep-spacing rule by name (weeps per line = ceil(length / spacing) + 1; total = per-line x
lines), `GOVERNANCE.general`; the note states that IRC R703.8.6 and TMS 402 cap the spacing at 33 in on center (24 in a
common tighter spec), at least 3/16 in in diameter, immediately above the flashing, that the count is per through-wall
flashing line (the base course plus every shelf angle and lintel), and that the weeps must sit on the flashing over a
clear, mortar-free air space -- the AHJ-adopted code and the wall flashing detail govern.

## 2. The tile

### 2.1 `brick-veneer-weep-count` -- Brick Veneer Weep-Hole Count (IRC R703.8.6)

```
inputs:
  wall_length_ft   wall / flashing length (ft)
  max_spacing_in   maximum weep spacing (in, code cap 33, default 33)
  flashing_lines   number of through-wall flashing lines (default 1)

weeps_per_line = ceil(wall_length_ft x 12 / max_spacing_in) + 1
total_weeps    = weeps_per_line x round(flashing_lines)
```

**Pinned worked example.** 30 ft wall, 33 in spacing, 1 flashing line:
`weeps = ceil(30 x 12 / 33) + 1 = ceil(10.9) + 1 = 11 + 1 = ` **12 per line** (= 12 total). Cross-check: a 50 ft wall at
a tighter 24 in spacing over 2 flashing lines (base + a lintel) is `ceil(600/24) + 1 = 26` per line, `x 2 = ` **52 total**
-- both a tighter spacing and each added flashing line raise the count.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["masonry", "construction"]`, beside `brick-veneer-anchor-spacing`); a
`tile-meta.js` `_TILES` entry (`E`); a `citations.js` entry (weep-spacing rule, IRC R703.8.6, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the single-line example plus the tighter-spacing two-line cross-check, pinning the
per-line and total weeps); `test/fixtures/compute-map.js` (`brick-veneer-weep-count` -> `computeBrickVeneerWeepCount`,
module `../../calc-masonry.js`); `scripts/related-tiles.mjs` (-> `brick-veneer-anchor-spacing` / `masonry-coursing` /
`masonry-wall-weight`); `data/search/aliases.json` (5 collision-checked aliases: "weep hole count", "brick weep holes",
"veneer weep count", "weep spacing", "weephole count"), then `node scripts/build-alias-shards.mjs`; a `_simpleRenderer`
in the `MASONRY_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-masonry declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the per-line and total counts across the two cases and the
error seams (non-positive length / spacing / lines, non-finite). The calc-masonry.js gzip cap is watched at build.
Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint.
Home tile count 1,367 -> 1,368.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(360/33) + 1 -> 12 weeps per line).

## 5. Roadmap position

Masonry-veneer detailing beside `brick-veneer-anchor-spacing`, serving the mason / GC (masonry / construction).
Deliberately a count; the AHJ-adopted code and the wall flashing detail govern the placement and type. Stays
evidence-driven. Continues the masonry-veneer detailing sweep at 1 new spec (v919).
