# roughlogic.com Specification v276 -- Makeup-Air Unit Tempering Load (Sensible, Latent, Total) (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.98.0; proposed 2026-07-02). Batch spec-v275..v277 (the ventilation-and-recovery trio -- recover
> (v275), temper (this spec), modulate (v277)). This tile sizes the heater or cooling coil a makeup-air unit needs to
> temper the outdoor air an exhaust hood or process fan pulls into the building.**
> In-scope catalog expansion under the spec-v106 trades-only charter: HVAC and commercial-kitchen mechanical work already
> size the exhaust airflow (`hood-exhaust`) and the combustion air an appliance needs (`combustion-air`), but nothing sizes
> the makeup-air unit that replaces the exhausted air -- the sensible (and, in a humid climate or a dehumidifying MUA, the
> latent) load to bring that outdoor air to a neutral supply temperature before it dumps into the space. Adds one tile to
> the existing **`calc-hvac.js`** module (Group C); no new group, trade, or dependency. Inherits spec.md through
> spec-v275.md.
>
> **The gap, and the evidence for it.** When a commercial kitchen hood or an industrial process fan exhausts air, code
> (IMC 508) requires a roughly equal makeup-air supply, and that outdoor air must be tempered so it does not dump raw winter
> or summer air into the occupied space. The sensible tempering load is `Q_s = 1.08 * CFM * (T_target - T_oa)`; the latent
> load, when the MUA also conditions humidity, is `Q_l = 0.68 * CFM * (W_target - W_oa)` with the humidity ratios in grains
> of moisture per pound of dry air; and the total is `Q_t = 4.5 * CFM * (h_target - h_oa)` from the enthalpy difference,
> where `4.5 = 60 * 0.075`, `1.08 = 60 * 0.075 * 0.24`, and `0.68 = 60 * 0.075 * (1076/1.0) / 7000` are the standard
> sea-level psychrometric constants. For a 2,000 CFM kitchen makeup-air unit tempering 20 degF outdoor air to a neutral
> 65 degF, the sensible load is `1.08 * 2000 * 45 = 97,200 Btu/h`, and a gas heater at 80% thermal efficiency needs
> `97,200 / 0.80 = 121,500 Btu/h` of input -- the burner size a contractor selects off the exhaust CFM. `hood-exhaust` sets
> the exhaust and makeup CFM; this tile turns that CFM into the heater or coil load.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The makeup airflow `CFM` is a
volumetric flow (ft^3/min); the outdoor and target supply temperatures `T_oa`, `T_target` are temperatures (degF); the
optional humidity ratios `W_oa`, `W_target` are masses of moisture per mass of dry air, entered in grains per pound
(dimensionless mass ratio); the sensible, latent, and total loads `Q_s`, `Q_l`, `Q_t` are powers (Btu/h); the gas input is a
power (Btu/h) from the sensible load divided by the thermal efficiency `eta`. The v18/v21 contract: any non-finite input, a
CFM at or below zero, or a thermal efficiency outside `0 < eta <= 1` returns `{ error }`; the latent term is optional and
defaults to zero when the humidity ratios are omitted (a heating-only MUA). Citation discipline (v19/v22):
`GOVERNANCE.general` over the psychrometric sensible/latent/total heat equations by name; `editionNote` names **the ASHRAE
Fundamentals sensible `Q_s = 1.08 * CFM * dT`, latent `Q_l = 0.68 * CFM * dW(gr/lb)`, and total `Q_t = 4.5 * CFM * dh`
equations with the sea-level constants `1.08`, `0.68`, `4.5`, and the IMC 508 makeup-air-equals-exhaust requirement**, and
states that **this returns the design tempering load at the stated supply target -- it uses sea-level air density (no
altitude derate), assumes the makeup CFM equals the exhaust and is delivered at the target temperature (a neutral, not a
heating, supply unless the target is set above space temperature), and excludes duct and cabinet losses, the fan heat, and
the exhaust-hood capture efficiency; and this is a design aid, not a substitute for the mechanical engineer's stamped
design** -- the mechanical engineer of record's stamped design governs.

## 2. The tile

### 2.1 `mua-tempering-load` -- Makeup-Air Unit Tempering Load (Sensible, Latent, Total)

```
inputs:
  cfm         ft^3/min   makeup airflow (= exhaust, per IMC 508)
  t_oa_F      degF       outdoor air temperature (design condition)
  t_target_F  degF       target supply temperature (neutral, ~65-70 degF)
  eta         -          gas/heater thermal efficiency (0..1, default 0.80)
  w_oa_gr     gr/lb      outdoor humidity ratio (optional, latent)
  w_target_gr gr/lb      target humidity ratio (optional, latent)

dT_F     = t_target_F - t_oa_F                  ; sensible temperature rise, degF
Q_s_btuh = 1.08 * cfm * dT_F                    ; sensible tempering load, Btu/h
Q_l_btuh = 0.68 * cfm * (w_oa_gr - w_target_gr) ; latent load, Btu/h (0 if humidity omitted)
Q_t_btuh = Q_s_btuh + Q_l_btuh                  ; total load, Btu/h
input_btuh = Q_s_btuh / eta                     ; required gas/heater input, Btu/h
```

**Pinned worked example (a 2,000 CFM kitchen MUA, 20 degF to 65 degF, 80% gas, heating-only).** `cfm = 2000`,
`t_oa_F = 20`, `t_target_F = 65`, `eta = 0.80`, humidity omitted: `dT = 65 - 20 = 45 degF`;
`Q_s = 1.08 * 2000 * 45 = 97,200 Btu/h = 97.2 MBH`; `Q_l = 0` (heating-only); `Q_t = 97,200 Btu/h`; required input
`= 97,200 / 0.80 = 121,500 Btu/h = 121.5 MBH` -- the burner the contractor selects, versus the `97.2 MBH` output. **Cross-
check (colder design and a latent term).** Drop the outdoor air to `0 degF` and add dehumidification from
`w_oa = 60 gr/lb` down to `w_target = 50 gr/lb`: `Q_s = 1.08 * 2000 * 65 = 140,400 Btu/h` (scales linearly with the wider
`65 degF` rise); `Q_l = 0.68 * 2000 * (60 - 50) = 13,600 Btu/h`; `Q_t = 140,400 + 13,600 = 154,000 Btu/h` -- the latent term
adds where the sensible-only estimate would under-size a humid-climate coil. The non-finite, `cfm <= 0`, and `eta` out of
`(0,1]` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, matching `hood-exhaust` and `combustion-air`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the ASHRAE sensible/latent/total equations, `editionNote`
naming `Q_s = 1.08 * CFM * dT`, `Q_l = 0.68 * CFM * dW`, `Q_t = 4.5 * CFM * dh`, the IMC 508 makeup requirement, and the
sea-level, neutral-supply, no-duct-loss, design-aid caveats); `test/fixtures/worked-examples.json` (the 2,000 CFM heating-
only example + the colder-with-latent cross-check); `test/fixtures/compute-map.js` (`mua-tempering-load` ->
`computeMuaTemperingLoad` in `../../calc-hvac.js`); `scripts/related-tiles.mjs` (-> `hood-exhaust` / `combustion-air` /
`erv-sensible-recovery` / `manual-j-heating`); `data/search/aliases.json` ("makeup air", "MUA", "makeup air unit",
"kitchen makeup air", "temper outdoor air", "makeup air heater sizing", "hood makeup air", "IMC 508 makeup air", "how big a
makeup air heater"); the id appended to the existing hvac renderers block in `app.js`; the `// dims:` annotation (`cfm`
volumetric flow, temperatures as temperature, humidity ratios dimensionless, loads power, `eta` dimensionless); regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the optional-latent-defaults-to-zero path,
the input-from-efficiency division, and the two error seams (non-finite, `cfm <= 0`, `eta` out of `(0,1]`). No new module;
re-pin `calc-hvac.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the latent-optional assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `Q_s` / `Q_l` / `Q_t` / `input`
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (2,000 CFM 20->65 degF -> 97.2 MBH output,
121.5 MBH input).

## 5. Roadmap position

Middle of the ventilation-and-recovery batch (v275..v277) in `calc-hvac.js`: `erv-sensible-recovery` (v275) recovers,
this tile tempers, and the CO2-setpoint demand-controlled ventilation rate (v277) modulates. An altitude density derate
(the catalog's `gas-altitude-derate` pattern), a heat-recovery credit feeding the MUA from the exhaust it makes up, and a
full psychrometric state point for the supply air are the deliberate next follow-ons once the trio lands.
