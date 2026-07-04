# roughlogic.com Specification v386 -- Measured Outside-Air Percent from Mixed-Air Temperatures (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-03, 0.135.0; proposed 2026-07-03). Third and final tile of the HVAC airflow field-methods trio (v384 fan laws -> v385 pitot
> traverse CFM -> v386 measured percent outside air). `outdoor-air-mix` predicts the mixed-air state when you already know
> the outside-air fraction; this tile does the inverse a commissioning tech actually needs -- it backs the outside-air
> percent out of three measured temperatures.**
> In-scope catalog expansion under the spec-v106 trades-only charter. To verify that an economizer or a ventilation damper
> is delivering the design outside air, a tech measures the return-, mixed-, and outdoor-air dry-bulb temperatures and solves
> the mixing balance for the fraction: `%OA = (T_ra - T_ma) / (T_ra - T_oa)`. `outdoor-air-mix` goes the other way (given
> `%OA`, find the mixed state), so the field-verification direction was never covered. This adds the measured-percent tile to
> the existing **`calc-hvacservice.js`** module (Group C); no new group, trade, or dependency. Inherits spec.md through
> spec-v385.md.
>
> **The gap, and the evidence for it.** Return air at `75 deg F`, outdoor air at `40 deg F`, and a measured mixed-air
> temperature of `68 deg F` give `%OA = (75 - 68) / (75 - 40) = 7/35 = 20%`. If the damper opens further and the mixed air
> drops to `63 deg F`, `%OA = (75 - 63)/(75 - 40) = 34.3%`. The temperature spread must be real (a small `T_ra - T_oa` makes
> the reading noisy, which the tile flags). No tile solves this; `outdoor-air-mix` only predicts the mixed state from a known
> fraction, the opposite of what commissioning needs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The three temperatures are
temperatures (deg F, dim T); the outside-air fraction is dimensionless (reported as a percent). The v18/v21 contract: any
non-finite input, or a return-air temperature equal to the outdoor-air temperature (a zero denominator, physically no
usable temperature spread), returns `{ error }`; the tile flags a mixed-air temperature outside the `[T_oa, T_ra]` band
(which would put `%OA` outside `0 to 100%`) as a probe/sensor problem, and warns when `|T_ra - T_oa|` is small enough
(under about `10 deg F`) that the result is unreliable. Citation discipline (v19/v22): `GOVERNANCE.general` over the
mixed-air outside-air-fraction balance by name; `editionNote` names **the sensible mixing balance
`%OA = (T_ra - T_ma)/(T_ra - T_oa)`, the ASHRAE 111 / commissioning temperature-method context, and the caveat that the
CO2-ratio method is preferred when the return-to-outdoor temperature spread is small**, and states that **this returns the
measured outside-air fraction for economizer / ventilation verification, assumes well-mixed air at the sensor and negligible
fan/duct heat gain, and is a field-verification aid, not a substitute for a traverse-based airflow measurement or the
balancing report**.

## 2. The tile

### 2.1 `outside-air-percent-temps` -- Measured Outside-Air Percent from Mixed-Air Temperatures

```
inputs:
  t_ra_f   F   return-air dry-bulb temperature
  t_ma_f   F   mixed-air dry-bulb temperature
  t_oa_f   F   outdoor-air dry-bulb temperature

pct_oa = 100 * (t_ra_f - t_ma_f) / (t_ra_f - t_oa_f)     %
```

**Pinned worked example (RA 75, MA 68, OA 40 deg F).** `%OA = 100*(75 - 68)/(75 - 40) = 100*7/35 = 20.0%`.
**Cross-check (damper opens further).** MA drops to `63 deg F`: `%OA = 100*(75 - 63)/(75 - 40) = 34.3%`. A mixed-air
temperature outside the `40 to 75` band is flagged as a sensor problem rather than returned as a nonsense percent, and a
return-to-outdoor spread under about `10 deg F` returns a reliability warning. The equal-temperature (zero-denominator) and
non-finite seams take the error path.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `outdoor-air-mix` / `gas-meter-clock`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the mixed-air OA-fraction balance, `editionNote` naming
`%OA = (T_ra - T_ma)/(T_ra - T_oa)`, the ASHRAE 111 context, and the small-spread caveat); `test/fixtures/worked-examples.json`
(the 20% example + the 34.3% cross-check); `test/fixtures/compute-map.js` (`outside-air-percent-temps` ->
`computeOutsideAirPercentTemps` in `../../calc-hvacservice.js`); `scripts/related-tiles.mjs` (-> `outdoor-air-mix` /
`pitot-traverse-cfm` / `economizer-savings-hours` / `dcv-co2-ventilation`); `data/search/aliases.json` ("outside air
percent", "percent outside air", "OA fraction temperatures", "mixed air temperature OA", "economizer verification",
"ventilation percent measured", "Tra Tma Toa", "outdoor air percent", "OA damper check"); the id appended to the existing
HVAC-service renderers block in `app.js`; the `// dims:` annotation (temperatures T, percent dimensionless); regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the out-of-band flag, the small-spread warning,
and the zero-denominator / non-finite error seams. No new module; re-pin `calc-hvacservice.js` on the `check:module-sizes`
allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the flag/warning, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the single percent output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (75/68/40 -> 20.0%).

## 5. Roadmap position

Closes the HVAC airflow field-methods trio: v384 predicts a fan's airflow, v385 measures it, and v386 verifies the outside-
air fraction inside it. A CO2-ratio outside-air-percent method for small temperature spreads, and a tie-in to
`dcv-co2-ventilation`, are the deliberate next follow-ons.
