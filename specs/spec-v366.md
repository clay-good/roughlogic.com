# roughlogic.com Specification v366 -- Lighting Illuminance Uniformity Ratio (calc-elecdesign.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v365..v367 (the lighting-design trio -- light-loss factor
> (v365), the illuminance uniformity ratio (this spec), the egress-lighting check (v367)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `lumen-method` gives an average maintained footcandle
> level, but a space with the right average can still fail if the light is patchy -- bright under fixtures, dark between.
> The uniformity ratio (average-to-minimum and maximum-to-minimum) from a grid of readings is the acceptance metric IES sets
> for tasks and sports, and the catalog has no tile for it (the irrigation-uniformity tile is for sprinklers). Adds one tile
> to the existing **`calc-elecdesign.js`** module (Group A); no new group, trade, or dependency. Inherits spec.md through
> spec-v365.md.
>
> **The gap, and the evidence for it.** From a grid of illuminance readings, the uniformity is expressed as the
> average-to-minimum ratio `avg/min` and the maximum-to-minimum ratio `max/min`. For readings of 50, 45, 60, 55, and 40
> footcandles, `avg = 50`, `min = 40`, `max = 60`, so `avg/min = 1.25` and `max/min = 1.50` -- comfortably inside a typical
> office limit (`avg/min <= 1.5` to 3:1 depending on the task). Sports and roadway lighting set tighter ratios; a failing
> uniformity means the layout is too sparse or the spacing-to-mounting-height ratio too high, even when the average is on
> target. `lumen-method` sets the average; this tile grades the evenness.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The grid readings, their
average, minimum, and maximum are illuminances (footcandles or lux, consistent); the uniformity ratios are dimensionless.
The v18/v21 contract: any non-finite input, an empty reading set, or a minimum reading at or below zero (a dark point makes
the ratio infinite) returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the uniformity-ratio
definitions by name; `editionNote` names **the uniformity ratios average-to-minimum `avg/min` and maximum-to-minimum
`max/min`, the alternative minimum-to-average uniformity `U = min/avg`, the reading grid on the work plane, and the IES
recommended ratios by application (general interior often `<= 3:1` max/min, sports/roadway tighter)**, and states that
**this returns the uniformity ratios from the entered readings -- it computes the statistics of the grid as given (a
representative, adequately dense grid is the user's responsibility), reports the ratios against an optional target, and does
not itself design the layout or set the application's required ratio; and this is a verification aid** -- the IES
recommended practice for the application governs.

## 2. The tile

### 2.1 `lighting-uniformity-ratio` -- Lighting Illuminance Uniformity Ratio

```
inputs:
  readings[]   fc/lux   grid of illuminance readings
  target_avgmin -       optional target avg/min
  target_maxmin -       optional target max/min

avg = mean(readings) ; min = min(readings) ; max = max(readings)
avg_min = avg / min                               ; average-to-minimum ratio
max_min = max / min                               ; maximum-to-minimum ratio
U0 = min / avg                                     ; minimum-to-average uniformity
pass = (avg_min <= target_avgmin) AND (max_min <= target_maxmin)   (if targets given)
```

**Pinned worked example (readings 50, 45, 60, 55, 40 fc).** `avg = 50`, `min = 40`, `max = 60`;
`avg/min = 50/40 = 1.25`, `max/min = 60/40 = 1.50`, `U0 = min/avg = 0.80`. Against a 3:1 max/min office target, it passes
easily. **Cross-check (a patchy layout, readings 70, 20, 65, 25, 30 fc).** `avg = 42`, `min = 20`, `max = 70`;
`avg/min = 2.1`, `max/min = 3.5` -- the same rough average but a `3.5:1` max/min that fails a 3:1 target, the dark-between-
fixtures problem an average never reveals and only the ratio catches. The non-finite, empty-set, and `min <= 0` error paths
bracket the result.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, matching `lumen-method`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the uniformity definitions, `editionNote` naming `avg/min`, `max/min`,
`U = min/avg`, the reading grid, the IES application ratios, and the representative-grid, not-a-layout-design caveats);
`test/fixtures/worked-examples.json` (the uniform example + the patchy cross-check); `test/fixtures/compute-map.js`
(`lighting-uniformity-ratio` -> `computeLightingUniformityRatio` in `../../calc-elecdesign.js`);
`scripts/related-tiles.mjs` (-> `lumen-method` / `point-illuminance` / `lighting-light-loss-factor` /
`egress-lighting-check`); `data/search/aliases.json` ("lighting uniformity", "uniformity ratio", "avg min ratio",
"max min ratio", "illuminance uniformity", "footcandle uniformity", "lighting evenness", "U0 uniformity", "uniformity
lighting design"); the id appended to the existing elecdesign renderers block in `app.js`; the `// dims:` annotation
(readings/avg/min/max illuminance, ratios dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the ratio statistics, the target pass/fail, and the empty-set / `min <= 0` / non-finite error
seams. No new module; re-pin `calc-elecdesign.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the ratio assertions); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `avg/min` / `max/min` / `U0` stack wraps on a
phone); render-no-nan + a11y sweep, output read to the value (50/45/60/55/40 -> avg/min 1.25, max/min 1.5).

## 5. Roadmap position

Middle of the lighting-design batch (v365..v367) in `calc-elecdesign.js`, grading the evenness the lumen-method average
misses. The egress check (v367) follows. An IES application-target library, a spacing-to-mounting-height ratio guide, and a
point-by-point grid generator from `point-illuminance` are the deliberate next follow-ons once the trio lands.
