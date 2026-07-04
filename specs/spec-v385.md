# roughlogic.com Specification v385 -- Pitot Traverse Airflow (Velocity Pressure to CFM) (calc-velocity.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Second tile of the HVAC airflow field-methods trio (v384 fan laws -> v385 pitot traverse
> CFM -> v386 measured percent outside air). `duct-velocity-pressure` converts a single velocity-pressure reading to a
> velocity; this tile takes the averaged reading from a duct traverse, multiplies by the duct area, and returns the airflow
> a technician is actually measuring -- the CFM that a balance report lives on.**
> In-scope catalog expansion under the spec-v106 trades-only charter. To measure airflow in a duct you traverse it with a
> Pitot tube on a log-Tchebycheff grid, convert each velocity pressure to a velocity with `V = 4005 * sqrt(VP)` (standard
> air), average the velocities, and multiply by the duct cross-sectional area: `CFM = V_avg * A`. `duct-velocity-pressure`
> stops at the single-point velocity; it never carries the duct area into an airflow. This adds the traverse-to-CFM tile to
> the existing **`calc-velocity.js`** module (Group C), beside `duct-velocity-pressure`; no new group, trade, or dependency.
> Inherits spec.md through spec-v384.md.
>
> **The gap, and the evidence for it.** A rectangular duct `24 in` by `12 in` (`A = 2.0 ft^2`) with a traverse-average
> velocity pressure of `0.15 in wc` reads `V = 4005 * sqrt(0.15) = 1551 fpm`, so `CFM = 1551 * 2.0 = 3102 CFM`. A lighter
> `0.05 in wc` average gives `V = 896 fpm` and `1792 CFM`. No tile does this last step; a tech had to convert the velocity
> in one place and multiply by area in his head. The `editionNote` carries the traverse caveat -- average the individual
> point velocities, not the velocity pressures, because velocity goes with the square root.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The average velocity pressure
is a pressure (in wc); the duct width and height are lengths (in); the velocity is a speed (fpm); the airflow is a
volumetric flow (CFM). The v18/v21 contract: any non-finite input, or a non-positive velocity pressure, width, or height,
returns `{ error }`; the `4005` constant is standard air (`70 deg F`, `29.92 in Hg`, `0.075 lb/ft^3`) and the `editionNote`
flags that a density-corrected `V = 1096 * sqrt(VP/rho)` is used off-standard. Citation discipline (v19/v22):
`GOVERNANCE.general` over the Pitot velocity-pressure-to-airflow method by name; `editionNote` names **the standard-air
relation `V = 4005 * sqrt(VP)` fpm (`VP` in in wc), the duct traverse `CFM = V_avg * A`, the log-Tchebycheff / equal-area
traverse point layout (ASHRAE 111 / AMCA 203), and the caveat that the correct average is of the point velocities (not the
velocity pressures)**, and states that **this returns the measured duct airflow from a traverse-average velocity pressure,
uses standard air (density-correct off-standard), and is a field-measurement aid, not a substitute for a calibrated
flow hood or a proper multi-point traverse**.

## 2. The tile

### 2.1 `pitot-traverse-cfm` -- Pitot Traverse Airflow (Velocity Pressure to CFM)

```
inputs:
  vp_avg_inwc  in wc  traverse-average velocity pressure
  w_in         in     duct width
  h_in         in     duct height

v_fpm  = 4005 * sqrt(vp_avg_inwc)     fpm
area   = (w_in * h_in) / 144          ft^2
cfm    = v_fpm * area                  CFM
```

**Pinned worked example (0.15 in wc, 24 in x 12 in duct).** `V = 4005*sqrt(0.15) = 1551 fpm`; `A = 24*12/144 = 2.0 ft^2`;
`CFM = 1551*2.0 = 3102 CFM`. **Cross-check (a lighter traverse).** `0.05 in wc` in the same duct gives `V = 896 fpm` and
`CFM = 1792` -- the square-root relation, so a third the velocity pressure is not a third the flow. A non-positive velocity
pressure or duct dimension takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `duct-velocity-pressure`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the Pitot traverse method, `editionNote` naming `V = 4005*sqrt(VP)`,
`CFM = V_avg*A`, the log-Tchebycheff layout, and the average-the-velocities caveat); `test/fixtures/worked-examples.json`
(the traverse example + the lighter cross-check); `test/fixtures/compute-map.js` (`pitot-traverse-cfm` ->
`computePitotTraverseCfm` in `../../calc-velocity.js`); `scripts/related-tiles.mjs` (-> `duct-velocity-pressure` /
`fan-affinity-laws` / `duct-sizing` / `grille-face-velocity`); `data/search/aliases.json` ("pitot traverse", "duct traverse
cfm", "velocity pressure to cfm", "4005 sqrt vp", "airflow traverse", "log tchebycheff", "measure duct airflow", "pitot
tube cfm", "duct velocity traverse"); the id appended to the existing velocity renderers block in `app.js`; the `// dims:`
annotation (VP pressure, dims length, velocity speed, CFM flow); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the square-root relation, and the non-positive / non-finite error
seams. No new module; re-pin `calc-velocity.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the `V` / area / CFM output wraps on a phone); render-no-nan +
a11y sweep, output read to the value (0.15 in wc, 24x12 -> 1551 fpm, 3102 CFM).

## 5. Roadmap position

The measurement in the middle of the trio: `fan-affinity-laws` (v384) predicts the airflow a speed change produces, this
tile measures the airflow actually delivered, and `outside-air-percent-temps` (v386) checks how much of it is outside air. A
round-duct diameter input and a full multi-point traverse-averaging entry are the deliberate next follow-ons.
