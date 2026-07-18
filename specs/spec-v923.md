# roughlogic.com Specification v923 -- Wall Stud Notching and Boring Limits (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group
> E), no new module, group, or dependency. Inherits spec.md through spec-v922.md. Light-frame field-check sweep, beside
> the accepted `header-sizing` framing tile.
>
> **The gap, and the evidence for it.** The catalog sizes headers and beams but nothing answers the daily "can I drill or
> notch this stud" question. Grep confirmed no notch/bore tile. Every plumber, electrician, and HVAC installer bores
> studs and every framer polices it. The number this settles: a 2x6 bearing stud allows a **1.375 in** notch and a **2.20
> in** single-stud bore per IRC R602.6.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling framing
tile: the stud width and all the limit dimensions carry `L`. The v18/v21 contract: a non-finite or non-positive stud
width returns `{ error }`. Citation discipline (v19/v22): the IRC R602.6 limits by name (notch 25%/40%; bore 40%/60%;
edge 5/8 in), `GOVERNANCE.general`; the note states that the percentages apply to the ACTUAL stud width (2x4 = 3.5 in,
2x6 = 5.5 in), that a bored hole reaches 60% only on a doubled stud (no more than two successive), that the hole edge
must stay at least 5/8 in from the stud edge and out of the same cross section as a notch, and that a plumbing/mechanical
wall, an engineered stud, or a braced/shear wall may be more restrictive -- the AHJ-adopted code and any engineering
govern.

## 2. The tile

### 2.1 `stud-notch-bore-limit` -- Wall Stud Notching and Boring Limits (IRC R602.6)

```
inputs:
  stud_width_in   actual dressed stud width (in, 2x4 = 3.5, 2x6 = 5.5)

notch_max_bearing_in    = 0.25 x stud_width_in
notch_max_nonbearing_in = 0.40 x stud_width_in
bore_single_max_in      = 0.40 x stud_width_in
bore_doubled_max_in     = 0.60 x stud_width_in
edge_min_in             = 0.625   (5/8 in)
```

**Pinned worked example.** 2x6 stud (5.5 in actual):
`notch bearing = 0.25 x 5.5 = ` **1.375 in**; `bore single = 0.40 x 5.5 = ` **2.20 in**; `bore doubled = 0.60 x 5.5 = `
**3.30 in**; edge min **5/8 in**. Cross-check: a 2x4 (3.5 in) nonbearing stud allows a `0.40 x 3.5 = ` **1.40 in** notch
(and only `0.25 x 3.5 = ` 0.875 in in a bearing wall) -- the same hole that is fine in a nonbearing 2x6 can be illegal in
a bearing 2x4.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry"]`, beside `header-sizing`); a `tile-meta.js` `_TILES` entry (`E`);
a `citations.js` entry (IRC R602.6 limits, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the 2x6 example
plus the 2x4 cross-check, pinning the notch and bore limits); `test/fixtures/compute-map.js` (`stud-notch-bore-limit` ->
`computeStudNotchBoreLimit`, module `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `header-sizing` /
`joist-hanger-count` / `sill-plate-anchor-count`); `data/search/aliases.json` (5 collision-checked aliases: "stud
notching", "stud boring", "notch a stud", "drill through stud", "bored hole stud limit"), then
`node scripts/build-alias-shards.mjs`; a `_simpleRenderer` in the `CONSTRUCTION_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the four limits and the 5/8 in edge across a 2x6 and a 2x4 and the error seams (non-positive width, non-finite).
The calc-construction.js gzip cap is watched at build (raised as needed with a CHANGELOG note). Verify at build,
including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,371 -> 1,372.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(0.25 x 5.5 -> 1.375 in notch, 0.40 x 5.5 -> 2.20 in single bore).

## 5. Roadmap position

Light-frame field-check beside `header-sizing`, serving the carpenter / trades boring studs (carpentry). Deliberately a
prescriptive check; a plumbing/mechanical wall, an engineered stud, a braced wall, and the AHJ-adopted code govern. Stays
evidence-driven. Continues the light-frame field-check sweep at 1 new spec (v923).
