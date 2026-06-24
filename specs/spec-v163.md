# roughlogic.com Specification v163 -- Drainage Invert Elevation, Drop, and Cover (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED 2026-06-23 (catalog 627, package 0.77.0). Batch spec-v157..v163 (plumbing/pipefitting -- steamfitting, pressure
> piping, and pipe support).** In-scope catalog expansion under the spec-v106 trades-only charter: the
> elevation companion to the drainage-slope tiles. Adds one tile to **`calc-plumbing.js`** (Group B); no
> new module, group, or dependency. Inherits spec.md through spec-v162.md.
>
> **The gap, and the evidence for it.** `slope` gives the per-foot pitch and `manning-slope` gives the
> self-cleansing grade, but neither carries the run to its elevations: the plumber laying a building
> sewer or storm drain works in inverts -- the flow-line elevation at each end -- and needs the total fall
> over the run, the downstream invert, and the resulting cover over the pipe to confirm it clears the
> minimum bury and stays under the maximum trench depth. That invert-out and cover check is done on every
> underground run, on a calculator or a scrap of paper, and the catalog has the slope but not the
> elevations the slope produces.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
invert and surface elevations, the total fall, the cover, and the pipe OD are a length (`L`, ft, with the
OD entered in inches and converted); the slope is entered as inches-per-foot or as a percent and is
`dimensionless` once normalized; the run length is `L` (ft). The v18/v21 contract: any non-finite input,
a non-positive run length, or a negative slope returns `{ error }`; cover is reported and flagged but a
negative cover (pipe above grade) is a flag, not an error. Citation discipline (v19/v22):
`GOVERNANCE.general` over the invert/fall/cover relations by name; `editionNote` names **IPC 2021 Section
704** for the drainage slope minimums and states that **the minimum-cover and maximum-depth limits, the
local frost depth, and the live-load bury requirement are set by the adopted code and the engineer/survey
of record** -- the minimum-cover value compared against is user-supplied from the governing requirement.

## 2. The tile

### 2.1 `drainage-invert` -- Invert-Out, Fall, and Cover for a Gravity Run

```
inputs:
  invert_in_ft    L              upstream flow-line (invert) elevation, ft
  slope_in_per_ft dimensionless  slope as in/ft (e.g. 0.25) -- or a percent field, normalized to ft/ft
  run_ft          L              horizontal run length between the two points, ft
  pipe_od_in      L              pipe outside diameter, in
  surface_out_ft  L              finished-grade elevation over the downstream end, ft (optional)
  min_cover_ft    L              required minimum cover from the governing code, ft (optional)

slope_ftft   = slope_in_per_ft / 12                      # if entered as in/ft
total_fall   = slope_ftft x run_ft
invert_out   = invert_in_ft - total_fall
cover_out    = surface_out_ft - (invert_out + pipe_od_in/12)     # when surface given
cover_flag   = cover_out < min_cover_ft                          # under-cover warning
```

**Pinned worked example.** Invert-in 100.00 ft, slope 1/4 in/ft, 80 ft run, 4.5 in OD, downstream surface
102.00 ft, minimum cover 2.0 ft: `slope = 0.25/12 = 0.02083 ft/ft`; `total_fall = 0.02083 x 80 = 1.67
ft`; `invert_out = 100.00 - 1.67 = ` **98.33 ft**; top of pipe `= 98.33 + 0.375 = 98.71 ft`;
`cover_out = 102.00 - 98.71 = 3.29 ft` -- above the 2.0 ft minimum, no flag.
**Cross-check (half the slope, half the fall).** Same run at 1/8 in/ft: `total_fall = 0.01042 x 80 = 0.83
ft`; `invert_out = 99.17 ft`. The fall scales linearly with slope; the cover follows the invert.

## 3. Wiring

A `tools-data.js` row (group `B`, trade `["plumbing"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the invert/fall/cover relations, `editionNote` naming IPC 2021
Section 704 and the cover/depth/frost-govern caveat with the user-supplied minimum-cover note);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`drainage-invert` -> `computeDrainageInvert` in `../../calc-plumbing.js`); `scripts/related-tiles.mjs`
(-> `slope` / `manning-slope` / `trench-slope`); `data/search/aliases.json` ("invert elevation",
"pipe invert", "invert out", "fall", "sewer slope", "pipe cover", "trench depth"); the id appended to the
existing plumbing renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the example, the cross-check, the under-cover flag,
and error seams (non-finite, run <= 0, negative slope). Raise the `calc-plumbing.js` size cap by ~20
percent if needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block, the under-cover flag path); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the fall, invert-out,
and cover lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (100.00 / 0.25 /
80 -> invert-out 98.33 ft, cover 3.29 ft).

## 5. Roadmap position

The elevation companion that turns the slope tiles (`slope`, `manning-slope`) into the field numbers an
underground run is laid to, and pairs with `trench-slope` (the OSHA wall-protection side of the same
trench). Closes the v157..v163 plumbing/pipefitting batch. Further underground-drainage growth
(multi-segment profile, lift-station rim-to-invert) stays evidence-driven.
