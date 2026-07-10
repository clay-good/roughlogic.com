# roughlogic.com Specification v595 -- Search Effort in Searcher-Hours (calc-rescue.js, Group P, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rescue.js`**
> (Group P, the field/SAR bench); no new module, group, or dependency. Inherits spec.md through spec-v594.md.
>
> **The gap, and the evidence for it.** Spec-v540 (`search-track-spacing`) names this tile as a deliberate follow-on:
> "a searcher-hours estimate (area over spacing over speed)." The spacing tile answers *how far apart* the tracks go
> for a target POD; it never answers the question the operations chief asks next -- **how much effort does sweeping
> the segment at that spacing actually cost, and how long will my team be out there?** The arithmetic is the standard
> search-planning effort relation: the total track-line length is the segment area divided by the track spacing
> (`43,560 x acres / spacing_ft`), the effort is that length divided by the searcher's ground speed
> (`searcher-hours = track_ft / (speed_mph x 5,280)`), and the wall-clock time is the effort divided across the team.
> The number every planner underestimates: a modest 160-acre segment at a 40 ft spacing is **33 miles** of track line
> -- 22 searcher-hours at a realistic 1.5 mph brush pace, or about 2.75 clock hours for a team of eight, before
> briefing, travel, and rest. The tile makes the miles visible so segments get sized to the resources, not to hope.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The segment area is
`L^2` (acres), the track spacing `L` (ft), the ground speed `L T^-1` (mph), the searcher count `dimensionless`; the
track-line length is `L` (miles), and the effort and clock time are `T` (hours). The v18/v21 contract: any non-finite
input, a non-positive area, spacing, or speed, or a searcher count below 1 returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.fire` over the search-planning effort relation by name (NSARC / USCG search-planning practice,
matching the `search-track-spacing` sibling); `editionNote` prints `track_ft = 43,560 x area_acres / spacing_ft`,
`searcher_hours = track_ft / (speed_mph x 5,280)`, `team_clock_hr = searcher_hours / searchers`, and states that
**this is the raw grid-walking effort -- briefing, travel to and from the segment, rest breaks, and terrain detours
add on top; the spacing comes from a POD calculation (`search-track-spacing`) and the passes compound via
`search-probability`; the incident commander and search plan govern** -- a planning aid, not a promise of coverage.

## 2. The tile

### 2.1 `searcher-hours` -- Effort and Clock Time to Sweep a Segment

```
inputs:
  area_acres        acres   segment area
  track_spacing_ft  ft      spacing between adjacent tracks (from the POD plan)
  speed_mph         mph     searcher ground speed along the track
  searchers         count   searchers walking simultaneously (>= 1)

track_line_mi     = 43,560 x area_acres / track_spacing_ft / 5,280     [mi]
searcher_hours    = 43,560 x area_acres / track_spacing_ft / (speed_mph x 5,280)   [searcher-hr]
team_clock_hr     = searcher_hours / searchers                          [hr]
```

**Pinned worked example (a 160-acre segment at 40 ft spacing, 1.5 mph, team of eight).**
`track = 43,560 x 160 / 40 = 174,240 ft = ` **33.0 mi** of track line. `effort = 174,240 / (1.5 x 5,280) = `
**22.0 searcher-hours**, and `clock = 22 / 8 = ` **2.75 hours** for the team -- a half-shift for a full team on a
segment that reads "small" on the map. **Cross-check (a small urban-fringe segment).** 40 acres at 50 ft spacing and
2 mph with six searchers: `track = 43,560 x 40 / 50 = 34,848 ft = 6.6 mi`, `effort = 34,848 / 10,560 = ` **3.3
searcher-hours**, `clock = 3.3 / 6 = ` **0.55 hr** (about 33 minutes) -- both confirming the effort scales linearly
with area and inversely with spacing and speed.

## 3. Wiring

A `tools-data.js` row (group `P`, trades `["field", "fire"]`, placed inside the Group P comment block after
`sweat-rate-hydration` -- the `citations.test.js` **Group P audit count bumps 11 -> 12**); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.fire`, `editionNote` per §1); `test/fixtures/worked-examples.json` (both
examples); `test/fixtures/compute-map.js` (`searcher-hours` -> `computeSearcherHours` in `../../calc-rescue.js`);
`scripts/related-tiles.mjs` (-> `search-track-spacing` / `search-probability` / `sweat-rate-hydration`);
`data/search/aliases.json` ("searcher hours", "search effort", "sar segment effort", "search segment time", "track
line miles", plus question rows); the id added to the **literal `RESCUE_RENDERERS` object** and the calc-rescue
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index;
a `bounds-fuzzer.test.js` block pinning both examples, the linear scalings, and the error seams (non-finite,
non-positive area / spacing / speed, searchers < 1). Renderer uses the module's `_mnF` / `_moF` / `_aeF` / `_debF`
aliases (mirroring `search-track-spacing`), computing directly in US units. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block, the Group P audit count bump); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (the 160-acre example
-> 22.0 searcher-hours / 2.75 hr).

## 5. Roadmap position

Completes the segment-planning pair spec-v540 opened: `search-track-spacing` sets the spacing for a POD, this tile
prices that spacing in effort and clock time, and `search-probability` compounds the passes. The v540-named
sweep-width-correction helper (weather/fatigue/speed factors on a raw detection range) remains a deliberate future
follow-on. Further Group P growth stays evidence-driven.
