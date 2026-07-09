# roughlogic.com Specification v492 -- EV DC Fast-Charge Time with CC-CV Taper (calc-solar.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-solar.js`**
> (Group A, the solar / battery / EV-charging bench); no new module, group, or dependency. Inherits spec.md through
> spec-v491.md.
>
> **The gap, and the evidence for it.** `ev-charge-time` (spec-v488) models AC Level 2, where power is constant to the
> target and its own roadmap named "a DC-fast-charge tapering model (a non-constant-power curve above ~80%)" as a
> deliberate follow-on. This is that tile, and it exists because the single most-quoted EV number -- "80% in 20 minutes"
> -- is only the first leg. DC fast charging holds a constant high power (the lesser of the charger and the vehicle's
> acceptance) up to roughly 80% state of charge, then the battery management system tapers the current sharply to
> protect the cells: power falls to roughly half from 80-90% and to roughly a quarter from 90-100%. The result is that
> the last 20% can take as long as the entire fast leg that came before it, which is why fast-charge etiquette is to
> unplug at 80%. A driver who divides the whole energy by the charger's rated power under-predicts a to-full session by
> nearly a factor of two. The tile models the charge as three constant-power bands, sums the time in each, and reports
> both the fast-leg time and the full time so the catch is on the screen.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The usable capacity and the
per-band energies are energies (`M L^2 T^-2`); the charger power, the vehicle acceptance, and the per-band powers are
powers (`M L^2 T^-3`); the state-of-charge percents and the taper fractions are `dimensionless`; the times are `T`. The
v18/v21 contract: any non-finite input, a non-positive usable capacity, a non-positive charger power or vehicle
acceptance, a start state of charge outside 0-100, or a target at or below the start or above 100 returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the fast-charge taper model by name; `editionNote` names the
**DC fast-charge CC-CV taper model (three constant-power bands: 0-80% at full power, 80-90% at ~50%, 90-100% at ~25%)**,
prints `cc_power = min(charger, acceptance)`, the per-band `energy = capacity x band_span / 100`, the per-band
`time = energy / (cc_power x band_fraction)`, and states that **DC fast charging holds constant power only to about 80%
state of charge and then tapers sharply to protect the cells (so the naive energy / rated-power estimate under-predicts
a to-full session roughly two-fold), the 80/90/100 breakpoints and the 1.0/0.5/0.25 fractions are a planning
approximation of a smooth manufacturer charge curve that varies by pack chemistry and temperature, cold cells taper
earlier, and the vehicle's actual charging curve and the station's real delivered power govern** -- a planning estimate,
not the vehicle's charging profile.

## 2. The tile

### 2.1 `ev-dcfc-time` -- Why "80% in 20 Minutes" Is Only the First Leg

```
inputs:
  usable_capacity_kwh   kWh   the vehicle's usable battery capacity
  start_soc_pct         %     the starting state of charge
  target_soc_pct        %     the target state of charge
  charger_power_kw      kW    the DC station's rated output power
  acceptance_kw         kW    the vehicle's peak DC acceptance (the pack limit)

cc_power = min(charger_power, acceptance)                        [kW]   constant-current-region power
bands = [ (0, 80, 1.00), (80, 90, 0.50), (90, 100, 0.25) ]             SOC band -> power fraction
for each band overlapping [start, target]:
  span_pct  = overlap of [start, target] with the band                  [%]
  energy    = usable_capacity x span_pct / 100                          [kWh]
  band_time = energy / (cc_power x fraction)                            [hr]
time_total   = sum of band_time over the covered bands                  [hr]
time_to_80   = time accumulated up to 80% (the fast leg)                [hr]
```

**Pinned worked example (a 60 kWh EV from 10% to 100% on a 150 kW charger, 100 kW acceptance).**
`cc_power = min(150, 100) = 100 kW`. The 10-80% band (70 points) is `60 x 70 / 100 = 42 kWh` at 100 kW =
**25.2 min** -- the "fast leg." The 80-90% band (`6 kWh` at `100 x 0.5 = 50 kW`) adds **7.2 min**, and the 90-100% band
(`6 kWh` at `100 x 0.25 = 25 kW`) adds **14.4 min**, so the last 20% of charge costs **21.6 min** -- essentially the
same as the entire fast leg that filled the first 70%. The full 10-100% session is **46.8 min**.
**Cross-check (the naive estimate misses the taper).** Dividing the whole `60 x 90 / 100 = 54 kWh` by the rated 100 kW
gives **32.4 min** -- 14 minutes short of the real 46.8, because it charges the top 20% at full power the battery will
never accept. The tile returns the constant-current power, the fast-leg time to 80%, the per-band times, and the total,
so the "stop at 80%" decision is quantified.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical", "solar"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 10-100% example + the
naive-underestimate cross-check); `test/fixtures/compute-map.js` (`ev-dcfc-time` -> `computeEvDcfcTime` in
`../../calc-solar.js`); `scripts/related-tiles.mjs` (-> `ev-charge-time` / `ev-charge-cost` / `battery-c-rate`);
`data/search/aliases.json` ("dc fast charge time", "dcfc", "fast charging time", "80 percent charge", "charge taper",
"ccs charging", "how long dc fast charge", "constant current constant voltage"); the id appended to the solar renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the acceptance-limited cc_power (min of charger and acceptance), the monotonic band times (the
top band always slower per kWh than the fast leg), the time_to_80 <= time_total relation, and the error seams (non-
finite, non-positive capacity / charger / acceptance, out-of-range SOC, target <= start). Hand-writes its renderer
(mirroring the calc-solar.js `ev-charge-time` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the per-band time stack wraps on a phone -- comma-space the long tokens); render-no-nan + a11y on
the new tile, output read to the value (the 10-100% example -> 46.8 min, to-80 25.2 min).

## 5. Roadmap position

Completes the EV-charging quartet: `ev-charger-load` (the NEC 625 circuit), `ev-charge-time` (AC Level 2 hours),
`ev-charge-cost` (the meter dollars), and now the DC fast-charge curve with its taper. A temperature-derated taper (an
earlier breakpoint for cold cells), a battery-preconditioning time credit, and a charging-curve-from-power-profile
importer are deliberate future follow-ons. Further Group A growth stays evidence-driven.
