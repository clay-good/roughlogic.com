# roughlogic.com Specification v614 -- Sweep Width Correction for Weather, Speed, and Fatigue (calc-rescue.js, Group P, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rescue.js`**
> (Group P, the field/SAR bench); no new module, group, or dependency. Inherits spec.md through spec-v613.md.
>
> **The gap, and the evidence for it.** Spec-v540 (`search-track-spacing`) names this tile as a deliberate follow-on:
> "a sweep-width-correction helper (applying weather/fatigue/speed factors to a raw detection range)," and spec-v595
> repeats the naming. The spacing tile *requires* a corrected sweep width as its `W` input -- its own citation warns
> that "the sweep width must first be corrected for weather, fatigue, terrain, and speed (the raw detection range
> overstates it)" -- but the catalog offers nothing that performs the correction. The relation is the standard
> SAR-planning one (IAMSAR Manual Vol. II / US National SAR Supplement practice): the effective sweep width is the
> uncorrected table or experiment width multiplied by the published correction factors,
> `W = Wu x f_weather x f_speed x f_fatigue`. The number every planner underestimates: a 120 ft raw detection width
> in rain with a crew past a long operational period (weather 0.5, fatigue 0.9) is a **54 ft** effective sweep width
> -- the conditions took 55% of the coverage off before the first track was walked. The tile makes the haircut
> visible so the track spacing gets planned against the width the searchers actually have.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The uncorrected and
corrected sweep widths are `L` (ft); the weather, speed, and fatigue correction factors and the combined factor are
`dimensionless`; the reduction is a percentage (`dimensionless`). The v18/v21 contract: any non-finite input, a
non-positive uncorrected width, a weather or fatigue factor outside `(0, 1]`, or a speed factor outside `(0, 1.5]`
returns `{ error }` (weather and fatigue only degrade detection; the speed factor is normally at or below 1 --
searching faster than the reference speed degrades detection -- with modest credit above 1 allowed for a slow,
deliberate pace). Citation discipline (v19/v22): `GOVERNANCE.fire` over the sweep-width correction relation by name
(IAMSAR Manual Vol. II / US National SAR Supplement practice, matching the `search-track-spacing` sibling);
`editionNote` prints `W = Wu x f_weather x f_speed x f_fatigue` and states that **the uncorrected width comes from
published sweep-width tables or a detection-range experiment (the raw distance at which searchers spot the target
class), the factors come from the published correction tables for the conditions, and the corrected width is the
`W` that `search-track-spacing` expects; the incident commander and search plan govern** -- a planning aid, not a
promise of detection.

## 2. The tile

### 2.1 `sweep-width-correction` -- Effective Sweep Width From a Raw Detection Width

```
inputs:
  uncorrected_width_ft  ft   raw (table / experiment) sweep width for the target class
  weather_factor        -    weather / visibility correction, in (0, 1]  (1 = clear)
  speed_factor          -    speed correction, in (0, 1.5]               (1 = at reference pace)
  fatigue_factor        -    crew fatigue correction, in (0, 1]          (1 = fresh, 0.9 typical fatigued)

total_factor        = weather_factor x speed_factor x fatigue_factor      [-]
corrected_width_ft  = uncorrected_width_ft x total_factor                 [ft]
reduction_pct       = (1 - total_factor) x 100                            [%]
```

**Pinned worked example (rain, a tired crew).** A 120 ft raw detection width, weather 0.5, speed 1.0, fatigue 0.9:
`total = 0.5 x 1.0 x 0.9 = ` **0.45**, `W = 120 x 0.45 = ` **54 ft**, `reduction = ` **55%** -- the conditions cut
the coverage by more than half before spacing is even chosen. **Cross-check (good visibility, fatigue only).**
A 250 ft raw width, weather 0.9, speed 1.0, fatigue 0.9: `total = 0.81`, `W = ` **202.5 ft**, `reduction = ` **19%**
-- even "good" conditions with a crew past a long operational period take about a fifth off, confirming the product
form (each factor scales the width linearly and independently).

## 3. Wiring

A `tools-data.js` row (group `P`, trades `["field", "fire"]`, placed inside the Group P comment block after
`searcher-hours` -- the `citations.test.js` **Group P audit count bumps 12 -> 13**); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.fire`, `editionNote` per §1); `test/fixtures/worked-examples.json` (both
examples); `test/fixtures/compute-map.js` (`sweep-width-correction` -> `computeSweepWidthCorrection` in
`../../calc-rescue.js`); `scripts/related-tiles.mjs` (-> `search-track-spacing` / `searcher-hours` /
`search-probability`); `data/search/aliases.json` ("sweep width correction", "corrected sweep width", "effective
sweep width", "weather correction factor", "detection range correction", plus question rows); the id added to the
**literal `RESCUE_RENDERERS` object** and the calc-rescue declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the per-factor linear scaling, the identity case (all factors 1), and the error seams (non-finite,
non-positive width, factors out of band). Renderer uses the module's `_mnF` / `_moF` / `_aeF` / `_debF` aliases
(mirroring `searcher-hours`), computing directly in US units; the speed and fatigue fields default to 1.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block, the Group P audit count bump); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (the 120 ft example
-> 54 ft / 55% reduction).

## 5. Roadmap position

Closes the input-side gap spec-v540 opened and spec-v595 re-named: this tile produces the corrected `W`,
`search-track-spacing` turns it into a spacing for a POD, `searcher-hours` prices that spacing in effort, and
`search-probability` compounds the passes -- the segment-planning chain is now end-to-end. No further
sweep-width follow-on is named; further Group P growth stays evidence-driven.
