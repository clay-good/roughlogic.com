# roughlogic.com Specification v406 -- BOD/TSS Mass Loading and Percent Removal (calc-treatment.js, Group M, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.142.0; proposed 2026-07-03). Second tile of the water/wastewater-operations trio (v405 clarifier loading -> v406
> BOD/TSS mass loading -> v407 TDS from conductivity). `srt-fm-ratio` measures the food-to-microorganism ratio against the
> MLSS mass; this tile computes the raw mass loading and treatment efficiency an NPDES report is built on -- pounds per day
> in, pounds per day out, and percent removal.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A wastewater plant lives on the mass-balance pound
> formula: `lb/day = MGD * mg/L * 8.34`, where `8.34` is pounds per gallon of water. Applied to the influent and effluent
> BOD or TSS it gives the loading treated and the removal efficiency `(in - out) / in` -- the numbers on every discharge
> monitoring report. `srt-fm-ratio` uses the mass formula for the F/M ratio but never reports the process loading or removal.
> This adds the mass-loading tile to the existing **`calc-treatment.js`** module (Group M); no new group, trade, or
> dependency. Inherits spec.md through spec-v405.md.
>
> **The gap, and the evidence for it.** A `1.0 MGD` plant with `200 mg/L` influent BOD carries a load of
> `1.0 * 200 * 8.34 = 1,668 lb/day`; at `20 mg/L` effluent the discharge is `1.0 * 20 * 8.34 = 167 lb/day`, a removal of
> `(200 - 20)/200 = 90.0%`. Those three numbers -- influent load, effluent load, percent removal -- are the core of an NPDES
> compliance report. No tile does this; the catalog had the F/M ratio but not the plant loading or efficiency.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The flow is a volumetric flow
(MGD); the influent and effluent concentrations are concentrations (mg/L); the loads are mass rates (lb/day); the removal is
dimensionless (percent). The v18/v21 contract: any non-finite input, or a non-positive flow or a negative concentration,
returns `{ error }`; the effluent concentration may exceed the influent (a negative removal, an upset), which the tile
reports signed rather than clamping, and it returns the influent load, effluent load, load removed, and percent removal.
Citation discipline (v19/v22): `GOVERNANCE.general` over the wastewater mass-loading formula by name; `editionNote` names
**the Standard Methods / EPA NPDES pound formula `lb/day = MGD * mg/L * 8.34`, the `8.34 lb/gal` factor, and the removal
efficiency `(influent - effluent) / influent`**, and states that **this returns the mass loading and treatment efficiency
for BOD, TSS, or any concentration-based parameter, that flow and composite-sample concentrations must be representative,
and that it is an operations/reporting aid, not a substitute for certified lab analysis or the discharge permit**.

## 2. The tile

### 2.1 `bod-tss-loading-removal` -- BOD/TSS Mass Loading and Percent Removal

```
inputs:
  flow_mgd      MGD    plant flow
  influent_mgl  mg/L   influent concentration (BOD or TSS)
  effluent_mgl  mg/L   effluent concentration

influent_lb_day = flow_mgd * influent_mgl * 8.34
effluent_lb_day = flow_mgd * effluent_mgl * 8.34
removed_lb_day  = influent_lb_day - effluent_lb_day
removal_pct     = (influent_mgl - effluent_mgl) / influent_mgl * 100
```

**Pinned worked example (1.0 MGD, 200 mg/L in, 20 mg/L out).** influent `1,668 lb/day`; effluent `167 lb/day`;
removed `1,501 lb/day`; removal `90.0%`. **Cross-check (a bigger plant).** At `4.0 MGD` and the same concentrations the
influent load is `6,672 lb/day` while the removal percent stays `90.0%` -- load scales with flow, efficiency does not. An
effluent above influent returns a negative removal (an upset) rather than an error; the non-positive-flow and non-finite
seams take the error path.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water"]`, beside `srt-fm-ratio` / `clarifier-surface-loading`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the NPDES pound formula, `editionNote` naming
`lb/day = MGD*mg/L*8.34`, the 8.34 factor, and the removal-efficiency relation); `test/fixtures/worked-examples.json` (the
removal example + the scaled-flow cross-check); `test/fixtures/compute-map.js` (`bod-tss-loading-removal` ->
`computeBodTssLoadingRemoval` in `../../calc-treatment.js`); `scripts/related-tiles.mjs` (-> `srt-fm-ratio` /
`clarifier-surface-loading` / `chemical-feed-pump` / `coagulant-dose`); `data/search/aliases.json` ("bod loading", "tss
loading", "pounds per day formula", "8.34 loading", "percent removal", "mass loading wastewater", "npdes loading", "bod
removal efficiency", "lb/day mgd mg/l"); the id appended to the existing treatment renderers block in `app.js`; the
`// dims:` annotation (flow volumetric flow, concentrations concentration, loads mass rate, removal dimensionless);
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the signed negative-removal
case, and the non-positive / non-finite error seams. No new module; re-pin `calc-treatment.js` on the `check:module-sizes`
allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the negative-removal case, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the loads / removal set wraps on a phone);
render-no-nan + a11y sweep, output read to the value (1.0 MGD, 200/20 mg/L -> 1668/167 lb/day, 90.0%).

## 5. Roadmap position

The middle of the water/wastewater-operations trio: it quantifies the load the clarifier of `clarifier-surface-loading`
(v405) settles, and `tds-from-conductivity` (v407) adds a field water-quality read. A digester volatile-solids-loading tile
using the same pound formula is the deliberate next follow-on.
