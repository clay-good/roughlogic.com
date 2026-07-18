# roughlogic.com Specification v930 -- Floor Joist Notching and Boring Limits (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group
> E), no new module, group, or dependency. Inherits spec.md through spec-v929.md. Light-frame field-check sweep, beside
> the accepted `stud-notch-bore-limit` (walls) tile.
>
> **The gap, and the evidence for it.** The catalog now has the wall-stud notch/bore limits (`stud-notch-bore-limit`) but
> not the floor-joist ones. Grep confirmed no joist notch/bore tile. Every trade that runs pipe or duct through a floor
> polices R502.8.1. The number this settles: a 2x10 joist allows a **2.31 in** end notch and a **3.08 in** bored hole per
> IRC R502.8.1.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling wall
tile: the joist depth and all the limit dimensions carry `L`. The v18/v21 contract: a non-finite or non-positive joist
depth returns `{ error }`. Citation discipline (v19/v22): the IRC R502.8.1 limits by name (end notch D/4; notch depth
D/6, length D/3; bore D/3; edge 2 in), `GOVERNANCE.general`; the note states that the fractions apply to the ACTUAL joist
depth (2x10 = 9.25 in, 2x12 = 11.25 in), that notches are not permitted in the middle third of the span, that the hole
edge must be 2 in from the top/bottom and from any other hole or notch, and that ENGINEERED I-joists / LVL / trusses
follow the manufacturer's hole chart only (never field-notch a flange) -- the AHJ-adopted code and any engineering
govern.

## 2. The tile

### 2.1 `joist-notch-bore-limit` -- Floor Joist Notching and Boring Limits (IRC R502.8.1)

```
inputs:
  joist_depth_in   actual dressed joist depth (in, 2x10 = 9.25, 2x12 = 11.25)

end_notch_max_in    = joist_depth_in / 4
notch_depth_max_in  = joist_depth_in / 6
notch_length_max_in = joist_depth_in / 3
bore_dia_max_in     = joist_depth_in / 3
bore_edge_min_in    = 2
```

**Pinned worked example.** 2x10 joist (9.25 in actual):
`end notch = 9.25/4 = ` **2.31 in**; notch `9.25/6 = ` 1.54 in deep x `9.25/3 = ` 3.08 in long; `bore = 9.25/3 = ` **3.08
in** dia; edge min **2 in**. Cross-check: a 2x12 (11.25 in) allows a `11.25/4 = ` **2.81 in** end notch and a `11.25/3 = `
**3.75 in** bore -- the limits scale with the actual depth, and the same hole that clears a 2x12 can be illegal in a 2x10.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry"]`, beside `stud-notch-bore-limit`); a `tile-meta.js` `_TILES`
entry (`E`); a `citations.js` entry (IRC R502.8.1 limits, `GOVERNANCE.general`); `test/fixtures/worked-examples.json`
(the 2x10 example plus the 2x12 cross-check, pinning the end notch and bore); `test/fixtures/compute-map.js`
(`joist-notch-bore-limit` -> `computeJoistNotchBoreLimit`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `stud-notch-bore-limit` / `joist-hanger-count` / `header-sizing`);
`data/search/aliases.json` (5 collision-checked aliases: "joist notching", "joist boring", "drill through joist", "notch
a floor joist", "floor joist hole limit"), then `node scripts/build-alias-shards.mjs`; a `_simpleRenderer` in the
`CONSTRUCTION_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the D/4, D/6, D/3 limits and the 2 in edge across a 2x10 and a
2x12 and the error seams (non-positive depth, non-finite). The calc-construction.js gzip cap and the Group E group shell
are watched at build (raised as needed with a CHANGELOG note). Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,378 -> 1,379.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(9.25/4 -> 2.31 in end notch, 9.25/3 -> 3.08 in bore).

## 5. Roadmap position

Light-frame field-check beside `stud-notch-bore-limit`, serving the carpenter / trades boring joists (carpentry).
Deliberately a prescriptive check; a cantilever, an engineered joist, and the AHJ-adopted code govern. Stays
evidence-driven. Continues the light-frame field-check sweep at 1 new spec (v930).
