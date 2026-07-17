# roughlogic.com Specification v908 -- Spot Smoke / Heat Detector Count (Smooth Ceiling) (calc-firesprinkler.js, Group F, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-firesprinkler.js`** (Group F),
> no new module, group, or dependency. Inherits spec.md through spec-v907.md. Fire-alarm install-ops sweep, mirroring the
> accepted `sprinkler-head-layout` install-estimate precedent.
>
> **The gap, and the evidence for it.** The catalog lays out sprinkler heads (`sprinkler-head-layout`) but nothing counts
> **spot smoke or heat detectors** on a smooth ceiling. Grep confirmed no detector-count tile. NFPA 72 spaces spot
> detectors on a grid at the listed spacing, with no point more than 0.7 of that spacing from a detector. The number this
> settles: a 60 x 40 ft room at a 30 ft listed spacing takes **4 detectors** (a 2 x 2 grid), with the first detector no
> more than 15 ft off each wall.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the accepted
`sprinkler-head-layout` install-estimate tile: the room length, width, listed spacing, and wall maximum carry `L`, and the
row, column, and detector counts are dimensionless. The v18/v21 contract: a non-finite or non-positive room length,
width, or listed spacing returns `{ error }`. Citation discipline (v19/v22): the NFPA 72 grid identity by name (rows =
ceil(length / spacing); columns = ceil(width / spacing); detectors = rows x columns; wall maximum = spacing / 2),
`GOVERNANCE.general`; the note states that the listed spacing (about 30 ft for spot smoke on a smooth ceiling) comes from
the device listing, that the 0.7-times-spacing rule confirms no point is farther than that from a detector, that the
first detector sits within half the spacing of each wall, that beams, high ceilings, and HVAC reduce the spacing per NFPA
72, and that -- exactly like `sprinkler-head-layout` -- this is an install estimate the stamped fire-alarm plan and the
AHJ plan-review govern.

## 2. The tile

### 2.1 `smoke-detector-spacing-count` -- Spot Smoke / Heat Detector Count (Smooth Ceiling)

```
inputs:
  room_length_ft    room length (ft)
  room_width_ft     room width (ft)
  listed_spacing_ft device listed spacing (ft, default 30)

rows        = ceil(room_length_ft / listed_spacing_ft)
cols        = ceil(room_width_ft / listed_spacing_ft)
detectors   = rows * cols
wall_max_ft = listed_spacing_ft / 2
```

**Pinned worked example.** Room 60 x 40 ft, 30 ft listed spacing:
`rows = ceil(60/30) = 2`, `cols = ceil(40/30) = 2`, `detectors = ` **4** (a 2 x 2 grid; 0.7 x 30 = 21 ft reaches every
corner); `wall max = ` **15 ft**. Cross-check: a large 100 x 80 ft open area is `ceil(100/30) x ceil(80/30) = 4 x 3 = `
**12 detectors** -- the grid grows with the room, and beams or a high ceiling would tighten the spacing and add more.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["fire", "low-voltage"]`, inside the `// Group F` block beside
`sprinkler-head-layout`) -- the Group F citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`F`); a
`citations.js` entry (detectors = ceil(length/spacing) x ceil(width/spacing) [NFPA 72], `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the large-area cross-check); `test/fixtures/compute-map.js`
(`smoke-detector-spacing-count` -> `computeSmokeDetectorSpacingCount`, module `../../calc-firesprinkler.js`);
`scripts/related-tiles.mjs` (-> `sprinkler-head-layout` / `standby-battery-sizing` / `occupant-load`);
`data/search/aliases.json` (5 collision-checked aliases: "smoke detector count", "spot detector spacing", "smoke detector
layout", "heat detector spacing", "nfpa 72 detector count"); a hand-written renderer in the `FIRESPRINKLER_RENDERERS` map
mirroring the `sprinkler-head-layout` renderer (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-firesprinkler declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus
+ tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the rows, columns, detector count, wall maximum,
and the error seams (non-positive length, width, listed spacing). The calc-firesprinkler.js gzip cap is watched at build.
Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint.
Home tile count 1,356 -> 1,357.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group F audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(60/30) * ceil(40/30) -> 4 detectors).

## 5. Roadmap position

Fire-alarm install estimate beside `sprinkler-head-layout`, serving the fire-alarm / low-voltage installer (fire /
low-voltage). Deliberately an estimate; the stamped fire-alarm plan and NFPA 72 govern the final layout. Stays
evidence-driven. Completes the construction-operations campaign at 100 new specs (v809-v908).
