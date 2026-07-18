# roughlogic.com Specification v922 -- Masonry Horizontal Joint-Reinforcement Takeoff (calc-masonry.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-masonry.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v921.md. Masonry material-takeoff sweep, beside the
> accepted `brick-veneer-weep-count` and `masonry-coursing` tiles.
>
> **The gap, and the evidence for it.** The catalog counts masonry units, grout, veneer anchors, and weeps but nothing
> counts the **bed-joint wire**. Grep confirmed no joint-reinforcement tile. Nearly every CMU wall carries ladder or
> truss wire at a code-set spacing. The number this settles: a 40 x 12 ft wall at a 16 in spacing takes 9 reinforced
> courses and **36 pieces** of 10 ft wire.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling masonry
tiles: the wall length, height, spacing, and piece length carry `L`, and the course and piece counts are dimensionless.
The v18/v21 contract: a non-finite or non-positive wall length, height, spacing, or piece length returns `{ error }`.
Citation discipline (v19/v22): the joint-reinforcement takeoff by name (courses = ceil(height / spacing); pieces per
course = ceil(length / piece); total = courses x pieces), `GOVERNANCE.general`; the note states that IRC R606.12.2 and
TMS 402 cap the vertical spacing at 16 in (every other 8 in course), that some specs tighten it or add wire at bond
beams and openings, that the wire (about 10 ft lengths) laps at least 6 in and the lap is not added into the count, and
that the required spacing, lap, and extra wire at openings come from the structural spec and the adopted code.

## 2. The tile

### 2.1 `masonry-joint-reinforcement` -- Masonry Horizontal Joint-Reinforcement Takeoff (IRC R606.12.2)

```
inputs:
  wall_length_ft       wall length (ft)
  wall_height_ft       wall height (ft)
  vertical_spacing_in  vertical spacing (in, code cap 16, default 16)
  piece_length_ft      wire piece length (ft, default 10)

reinforced_courses = ceil(wall_height_ft x 12 / vertical_spacing_in)
pieces_per_course  = ceil(wall_length_ft / piece_length_ft)
total_pieces       = reinforced_courses x pieces_per_course
```

**Pinned worked example.** 40 x 12 ft CMU wall, 16 in vertical spacing, 10 ft pieces:
`courses = ceil(12 x 12 / 16) = ceil(9) = 9`; `pieces per course = ceil(40/10) = 4`; `total = ` **36 pieces**.
Cross-check: a 30 x 10 ft wall is `ceil(120/16) = 8` courses x `ceil(30/10) = 3` = **24 pieces** -- the count scales
with the height over the spacing and the length over the piece.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["masonry", "construction"]`, beside `brick-veneer-weep-count`); a
`tile-meta.js` `_TILES` entry (`E`); a `citations.js` entry (joint-reinforcement takeoff, IRC R606.12.2,
`GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the 40 x 12 example plus the 30 x 10 cross-check, pinning
the courses and total pieces); `test/fixtures/compute-map.js` (`masonry-joint-reinforcement` ->
`computeMasonryJointReinforcement`, module `../../calc-masonry.js`); `scripts/related-tiles.mjs` (-> `masonry-coursing` /
`masonry-count` / `cmu-grout-volume`); `data/search/aliases.json` (5 collision-checked aliases: "joint reinforcement",
"ladder wire", "truss wire masonry", "bed joint reinforcement", "masonry wire count"), then
`node scripts/build-alias-shards.mjs`; a `_simpleRenderer` in the `MASONRY_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-masonry declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the
courses, pieces per course, and total across the two cases and the error seams (non-positive length / height / spacing /
piece, non-finite). The calc-masonry.js gzip cap is watched at build. Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,370 -> 1,371.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(144/16) x ceil(40/10) -> 36 pieces).

## 5. Roadmap position

Masonry material takeoff beside `brick-veneer-weep-count`, serving the mason / GC (masonry / construction). Deliberately
a material count; the structural spec and the adopted code govern the spacing, the lap, and the extra wire at openings.
Stays evidence-driven. Continues the masonry takeoff sweep at 1 new spec (v922).
