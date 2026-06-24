# roughlogic.com Specification v140 -- Desiccant Process-Airflow Sizing for Deep and Low-Temperature Drying (calc-restoration.js, Group D, 1 New Tile)

> **Status: LANDED 2026-06-23 (catalog 620, package 0.75.0). Batch spec-v136..v140.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one water-restoration tile sizing a desiccant dehumidifier by process
> airflow, the deep-drying path the catalog's refrigerant sizing never covers. Adds one tile to
> **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits spec.md through
> spec-v139.md.
>
> **The gap, and the evidence for it.** The `dehumidifier` tile sizes refrigerant / LGR units by AHAM
> pints, and the derate tile (v138) shows where they stall: at low chamber temperature and low grains,
> where Class 4 specialty drying (hardwood, plaster, masonry) lives. There desiccant units take over --
> but they are sized differently, by the process airflow needed to carry a target water-removal rate
> across the wheel at the deep grain depression they can hold, from the same psychrometric mass balance
> the `grains-removed` tile uses in reverse. The catalog has no desiccant path, so the specialty job
> the class screen (v139) flags as Class 4 has no sizing tile to land on.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
demand is a water mass-rate (`M/T`, pints/day); the derived removal is `M/T` (lb/hr); the design grain
depression is `dimensionless` (grains per lb dry air); the required and nameplate process airflows are
`L^3/T` (cfm); the unit count is `dimensionless`. The 4.5 lb/hr-per-cfm-per-(lb/lb) factor
(60 min x 0.075 lb/ft^3 standard air density), the 7000 grains/lb, and the 1.043 lb/pint water density
are dimensioned constants drawn from `pure-math.js` convention. The v18/v21 contract: any non-finite
input, a non-positive demand, depression, or nameplate airflow returns `{ error }`; the divisions are
by a guarded-positive depression and nameplate airflow. Citation discipline (v19/v22):
`GOVERNANCE.general` over the psychrometric mass balance and the desiccant process-airflow method, by
name; the **manufacturer's performance map, reactivation exhaust ducting, and chamber conditions
govern** -- this is a sizing screen, and desiccant reactivation air must be ducted outside.

## 2. The tile

### 2.1 `desiccant-airflow-sizing` -- Desiccant Process Airflow for Deep / Low-Temp Drying

```
inputs:
  required_pints_per_day  M/T            water-removal demand (e.g. from evaporation-load)
  design_grain_depression dimensionless  achievable inlet->outlet grains across the wheel (default 60)
  nameplate_process_cfm   L^3/T          process airflow of the candidate desiccant unit (default 2000)

lb_per_hr     = required_pints_per_day x 1.043 / 24
process_cfm   = lb_per_hr x 7000 / (4.5 x design_grain_depression)
units_needed  = ceil(process_cfm / nameplate_process_cfm)
```

**Pinned worked example.** A 300 ppd demand at a deep 60-grain depression, 2000 cfm candidate unit:
`lb/hr = 300 x 1.043 / 24 = 13.04`; `process_cfm = 13.04 x 7000 / (4.5 x 60) = 91,280 / 270 = 338
cfm`; `units = ceil(338/2000) = 1`. Cross-checking the mass balance forward: `4.5 x 338 x (60/7000) =
13.0 lb/hr -> 313 lb/day / 1.043 = 300 ppd`, closing on the demand.
**Cross-check (shallower depression demands more air).** Drop the achievable depression to 30 grains
(a warmer, easier chamber): `process_cfm = 13.04 x 7000 / (4.5 x 30) = 676 cfm`, double the airflow
for the same pints -- the inverse-with-depression behavior that makes desiccant the deep-drying choice.
The performance map governs the achievable depression; reactivation air ducts outside.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration", "hvac"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the psychrometric mass balance and the desiccant
process-airflow method, `editionNote` naming ANSI/IICRC S500, the 4.5 / 7000 / 1.043 constants, and
the reactivation-exhaust caveat, the screen scope); `test/fixtures/worked-examples.json` (example +
cross-check); `test/fixtures/compute-map.js` (`desiccant-airflow-sizing` -> `computeDesiccantAirflow`
in `../../calc-restoration.js`); `scripts/related-tiles.mjs` (-> `dehumidifier` / `grains-removed` /
`evaporation-load`); `data/search/aliases.json` ("desiccant", "process airflow", "specialty drying",
"low temperature drying", "deep drying", "reactivation"); the id appended to the existing
`RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the example, cross-check, and error seams
(non-finite, demand/depression/nameplate <= 0). Raise the `calc-restoration.js` size cap by ~20
percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the lb/hr, cfm, and unit-count
lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (300 ppd / 60 grains /
2000 cfm -> 338 cfm, 1 unit).

## 5. Roadmap position

Closes the batch and the drying family: the class screen (v139) flags Class 4, the derate tile (v138)
shows refrigerant stalling, and this tile sizes the desiccant that finishes the job. Further Group D
growth stays evidence-driven.
