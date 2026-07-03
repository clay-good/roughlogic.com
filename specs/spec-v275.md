# roughlogic.com Specification v275 -- Energy/Heat Recovery Ventilator Sensible Effectiveness and Recovered Load (ASHRAE 84 / AHRI 1060) (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v275..v277 (the ventilation-and-recovery trio -- how a
> mechanical ventilation system moves the code-required outdoor air without paying the full load to condition it: the
> ERV/HRV that pre-tempers incoming outdoor air off the leaving exhaust (this spec), the makeup-air unit that heats the
> outdoor air an exhaust hood pulls in (v276), and the demand-controlled ventilation rate a CO2 setpoint actually calls for
> (v277). Recover / temper / modulate -- the three ways the trade meets a ventilation requirement without oversizing the
> equipment behind it.)**
> In-scope catalog expansion under the spec-v106 trades-only charter: HVAC is a core mechanical trade, and the catalog
> already sizes the outdoor-air fraction (`outdoor-air-mix`, `outdoor-air-ventilation`), the residential ventilation rate
> (`ashrae-622-ventilation`), and the infiltration load (`infiltration-load`), but nothing computes what an energy- or
> heat-recovery ventilator gives back -- the load the wheel or core recovers from the exhaust stream before the outdoor air
> reaches the coil. Adds one tile to the existing **`calc-hvac.js`** module (Group C); no new group, trade, or dependency.
> Inherits spec.md through spec-v274.md.
>
> **The gap, and the evidence for it.** A balanced ERV/HRV passes equal supply (outdoor) and exhaust (return) airflows past
> a heat-exchange core rated for a sensible effectiveness `epsilon_s` -- the fraction of the available temperature
> difference it transfers. The outdoor air enters the building not at the outdoor temperature `T_oa` but at
> `T_leaving = T_oa + epsilon_s (T_ra - T_oa)`, where `T_ra` is the return (exhaust) air temperature, and the sensible load
> the core recovers -- the load the heating or cooling plant no longer has to serve -- is
> `Q_s = 1.08 * CFM * epsilon_s * (T_ra - T_oa)`, with `1.08 = 60 min/h * 0.075 lb/ft^3 * 0.24 Btu/lb-degF`, the standard
> sea-level sensible-heat constant the catalog already uses in `internal-heat-gains` and `envelope-conduction-load`. For a
> 200 CFM balanced ERV at a rated 75% sensible effectiveness on a 10 degF winter design day with 70 degF return air, the
> core pre-warms the outdoor air from 10 degF to 55 degF and recovers `1.08 * 200 * 0.75 * 60 = 9,720 Btu/h` -- 75% of the
> `12,960 Btu/h` it would otherwise cost to bring that outdoor air to room temperature, the number a designer subtracts from
> the ventilation load before selecting the equipment. `outdoor-air-ventilation` and `ashrae-622-ventilation` set the CFM;
> this tile turns that CFM into the load the recovery core takes off the plant.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The ventilation airflow `CFM`
is a volumetric flow (ft^3/min); the outdoor, return, and leaving air temperatures `T_oa`, `T_ra`, `T_leaving` are
temperatures (degF); the rated sensible effectiveness `epsilon_s` is a dimensionless fraction (0 to 1); the recovered
sensible load `Q_s` is a power (Btu/h). The v18/v21 contract: any non-finite input, a CFM at or below zero, an effectiveness
outside `0 <= epsilon_s <= 1`, or equal outdoor and return temperatures where no recovery is possible (the result is simply
zero and is reported, not an error) is handled; a non-finite value, `CFM <= 0`, or `epsilon_s < 0` / `epsilon_s > 1` returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the recovery-effectiveness definition by name;
`editionNote` names **the ASHRAE Standard 84 / AHRI Standard 1060 sensible-effectiveness definition
`epsilon_s = (T_leaving - T_oa) / (T_ra - T_oa)` and the recovered sensible load `Q_s = 1.08 * CFM * epsilon_s * (T_ra - T_oa)`
with the sea-level sensible constant `1.08 = 60 * 0.075 * 0.24`**, and states that **this returns the sensible recovery only
-- it assumes balanced (equal supply and exhaust) airflow, uses the manufacturer's rated effectiveness at the AHRI test
condition rather than the part-load or frosting-derated value, and excludes latent (total-enthalpy) recovery, the
exhaust-fan and defrost energy, and the pressure-drop penalty; total-enthalpy recovery from the moisture difference is the
deliberate follow-on; and this is a design aid, not a substitute for the manufacturer's certified performance data** -- the
equipment manufacturer's AHRI-certified rating governs.

## 2. The tile

### 2.1 `erv-sensible-recovery` -- ERV/HRV Sensible Effectiveness and Recovered Load

```
inputs:
  cfm        ft^3/min   balanced ventilation airflow (supply = exhaust)
  t_oa_F     degF       outdoor air temperature (design condition)
  t_ra_F     degF       return/exhaust air temperature (indoor)
  eps_s      -          rated sensible effectiveness (0..1)

dT_F      = t_ra_F - t_oa_F                     ; available temperature difference, degF
t_leave_F = t_oa_F + eps_s * dT_F               ; outdoor air temp leaving the core, degF
Q_s_btuh  = 1.08 * cfm * eps_s * dT_F           ; recovered sensible load, Btu/h
Q_noerv   = 1.08 * cfm * dT_F                   ; load to condition OA with no recovery, Btu/h
Q_resid   = Q_noerv - Q_s_btuh                  ; residual OA load left for the plant, Btu/h
```

**Pinned worked example (a 200 CFM balanced ERV at 75% sensible effectiveness, 10 degF design day).** `cfm = 200`,
`t_oa_F = 10`, `t_ra_F = 70`, `eps_s = 0.75`: `dT = 70 - 10 = 60 degF`; `t_leave = 10 + 0.75 * 60 = 55 degF` (the outdoor
air reaches the coil pre-warmed to 55 degF instead of 10 degF); `Q_s = 1.08 * 200 * 0.75 * 60 = 9,720 Btu/h`. Cross-check by
the leaving-temperature form: `Q = 1.08 * 200 * (55 - 10) = 1.08 * 200 * 45 = 9,720 Btu/h`, identical. The no-recovery load
is `Q_noerv = 1.08 * 200 * 60 = 12,960 Btu/h`, so the residual the heating plant still serves is
`12,960 - 9,720 = 3,240 Btu/h = 1.08 * 200 * 15` (the leftover `70 - 55 = 15 degF`) -- the recovery cuts the ventilation
heating load to a quarter. **Cross-check (a summer cooling day: swap the sign of the difference).** `t_oa_F = 95`,
`t_ra_F = 75`, `eps_s = 0.75`, `cfm = 200`: `dT = 75 - 95 = -20 degF`; `t_leave = 95 + 0.75 * (-20) = 80 degF` (the core
pre-cools the 95 degF outdoor air to 80 degF); `Q_s = 1.08 * 200 * 0.75 * (-20) = -3,240 Btu/h`, the sign carrying the
direction of transfer -- the plant is relieved of `3,240 Btu/h` of sensible cooling. The non-finite, `cfm <= 0`,
`eps_s < 0`, and `eps_s > 1` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, matching the ventilation and load tiles); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the ASHRAE 84 / AHRI 1060 effectiveness definition, `editionNote`
naming `epsilon_s = (T_leaving - T_oa)/(T_ra - T_oa)` and `Q_s = 1.08 * CFM * epsilon_s * dT`, and the balanced-flow,
rated-effectiveness, sensible-only, no-defrost/pressure-drop, and design-aid caveats); `test/fixtures/worked-examples.json`
(the 200 CFM winter example + the summer cooling cross-check); `test/fixtures/compute-map.js` (`erv-sensible-recovery` ->
`computeErvSensibleRecovery` in `../../calc-hvac.js`); `scripts/related-tiles.mjs` (-> `outdoor-air-ventilation` /
`ashrae-622-ventilation` / `infiltration-load` / `mua-tempering-load`); `data/search/aliases.json` ("ERV", "HRV", "energy
recovery ventilator", "heat recovery ventilator", "recovery effectiveness", "sensible recovery", "ventilation heat
recovery", "how much does an ERV save", "pre-temper outdoor air"); the id appended to the existing hvac renderers block in
`app.js`; the `// dims:` annotation (`cfm` volumetric flow, temperatures as temperature, `eps_s` dimensionless, `Q_s`
power); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the leaving-temperature
cross-form, the sign carry on cooling, and the three error seams (non-finite, `cfm <= 0`, `eps_s` out of `[0,1]`). No new
module; `calc-hvac.js` already on the `check:module-sizes` allowlist (re-pin its size). Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the three error paths, the leaving-temperature cross-form assertion); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `dT` / `t_leave` /
`Q_s` / `Q_resid` stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (200 CFM at 75% on a 10 degF
day -> 55 degF leaving, 9,720 Btu/h recovered).

## 5. Roadmap position

Opens the ventilation-and-recovery batch (v275..v277) in `calc-hvac.js`: the outdoor air the code demands
(`outdoor-air-ventilation`, `ashrae-622-ventilation`) now has a recovery credit. The makeup-air unit that tempers the
outdoor air an exhaust hood pulls in is v276; the CO2-setpoint demand-controlled ventilation rate is v277. Total-enthalpy
(latent) recovery from the moisture difference, part-load and frosting derates, and the exhaust-fan/pressure-drop energy
penalty are the deliberate next follow-ons once the trio lands.
