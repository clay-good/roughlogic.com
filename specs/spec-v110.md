# roughlogic.com Specification v110 -- HVAC Gas-Heat Field Commissioning: Gas-Meter Clocking and Furnace Temperature-Rise Check (calc-hvacservice.js, Group C, 2 New Tiles)

> **Status: LANDED 2026-06-20 (package 0.69.0, catalog 669 -> 676 with spec-v109 / v111).** v110 is an in-scope catalog
> expansion under the spec-v106 charter: two Tier-1 HVAC field-service tiles computed from
> first-principles arithmetic, manufacturer-and-AHJ-governed, with a redo-not-harm failure mode.
> It adds two tiles to the existing **`calc-hvacservice.js`** bench (Group C), changes no existing
> tile's output, and adds no new module, group, or dependency. It inherits everything from spec.md
> through spec-v109.md.
>
> **The gap, and the evidence for it.** The v102 / v104 / v105 build-out gave the HVAC
> field-service bench the refrigerant, electrical, and evacuation / leak-check sides of a service
> call. The **gas-heat** side is missing. A concept-check of the live Group C tiles found no
> gas-meter clocking (the everyday "what is this furnace actually firing at?") and no furnace
> temperature-rise check (the everyday "is my airflow right and am I inside the nameplate rise
> range?"). The catalog has `Combustion Air` and `Commercial Kitchen Hood Exhaust` but neither of
> the two numbers a tech reads at start-up on a gas furnace or boiler. Both are pure arithmetic
> over field readings.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and reviewer-signoff
  apply. `gas-meter-clock` carries a heating rate (`M L^2 T^-3`, i.e. BTU/hr as power) from a
  gas volume (`L^3`), a time (`T`), and a volumetric heating value (`M L^-1 T^-2`, energy per
  volume). `furnace-temp-rise` carries a temperature difference (`T`) and a derived volumetric
  airflow (`L^3 T^-1`). Every bundled constant (the 3600 sec/hr factor, the default 1030 BTU/cf
  natural-gas heating value, the 1.08 sensible-heat air factor at sea level, the default 80
  percent thermal efficiency) is bundled and annotated, and each is an editable field.
- The v18 / v21 tile contract applies. Any non-finite input returns `{ error }`. For
  `gas-meter-clock`: a non-positive seconds-per-revolution, dial size, or heating value returns
  `{ error }`. For `furnace-temp-rise`: a non-positive input rate, efficiency, or a temperature
  rise at or below zero (supply not above return) returns `{ error }`. Neither tile leaks a
  `NaN` / `Infinity`: the only divisions are by a guarded-positive time or temperature rise.
- The v19 / v22 citation discipline applies. Both tiles use **`GOVERNANCE.general`** over public
  first-principles arithmetic. `gas-meter-clock` names the standard utility meter-clocking method
  (the gas utility's actual heating value governs; the default 1030 BTU/cf is editable, and ~2500
  BTU/cf for LP is noted). `furnace-temp-rise` names the sensible-heat relation Qs = 1.08 x CFM x
  delta-T. Neither reproduces a licensed table; the equipment manufacturer's rating plate (input
  rating and the stamped temperature-rise range) and the licensed tech govern.

## 2. The tiles

### 2.1 `gas-meter-clock` -- Gas-Meter Clocking (Actual Firing Rate) (Group C, calc-hvacservice.js)

The start-up input-verification number. With every other gas appliance off, the tech times one
revolution of a known test dial and converts to an actual firing rate, then compares it to the
nameplate input.

```
inputs:
  sec_per_rev          T               seconds for one revolution of the test dial
  dial_size_cf         L^3             test-dial size (cubic feet per revolution, e.g. 0.5 / 1 / 2)
  heating_value_btu_cf M L^-1 T^-2     fuel heating value (default 1030 natural gas; ~2500 LP)
  nameplate_input_btuh M L^2 T^-3      rated input from the plate (optional, for the verdict)

cfh                = (3600 / sec_per_rev) x dial_size_cf
actual_input_btuh  = cfh x heating_value_btu_cf
verdict (if nameplate provided):
  within +/- 5% of nameplate   -> firing on rate
  above                        -> overfired (reduce manifold pressure / check orifice)
  below                        -> underfired (gas pressure, orifice, or meter check)
```

**Pinned worked example.** A 1 cubic-foot test dial, 37 seconds per revolution, 1030 BTU/cf:
`cfh = 3600/37 x 1 = 97.30`, `actual_input = 97.30 x 1030 = 100,219 BTU/hr`. Against a 100,000
BTU/hr nameplate -> within 5 percent -> firing on rate. **Cross-check:** a 2 cubic-foot dial, 45
seconds per revolution, 1000 BTU/cf: `cfh = 3600/45 x 2 = 160`, `actual_input = 160,000 BTU/hr`.
For LP, set heating value to ~2500 BTU/cf. The utility's actual heating value governs the result.

### 2.2 `furnace-temp-rise` -- Furnace Temperature Rise and Derived Airflow (Group C, calc-hvacservice.js)

The airflow-verification number. The tech reads supply and return air temperatures and checks the
rise against the rating-plate range; the tile also derives the airflow from the heat output.

```
inputs:
  return_air_F         T               return-air dry-bulb
  supply_air_F         T               supply-air dry-bulb
  input_btuh           M L^2 T^-3      furnace input (nameplate or clocked from 2.1)
  efficiency_pct       dimensionless   steady-state / thermal efficiency (default 80)
  rise_min_F           T               rating-plate minimum rise (default 40)
  rise_max_F           T               rating-plate maximum rise (default 70)

delta_T_F   = supply_air_F - return_air_F
output_btuh = input_btuh x efficiency_pct/100
cfm         = output_btuh / (1.08 x delta_T_F)
verdict:
  delta_T below rise_min  -> rise low (airflow too high, or underfired)
  delta_T above rise_max  -> rise high (airflow too low; check filter/duct/blower)
  within range            -> rise in range
```

**Pinned worked example.** Return 70 F, supply 120 F, input 100,000 BTU/hr at 80 percent, plate
rise 40 to 70: `delta_T = 50 F` (in range), `output = 80,000 BTU/hr`, `cfm = 80000 / (1.08 x 50)
= 1,481 CFM`. **Cross-check:** the same furnace reading supply 150 F -> `delta_T = 80 F` (above
the 70 max) -> rise high / airflow low, `cfm = 80000 / (1.08 x 80) = 926 CFM`. The 1.08 factor is
sea-level; at altitude the air factor falls and the rating-plate range still governs.

## 3. Concept-check and wiring

Concept-checked against the post-v105 live Group C tiles: the bench holds the refrigerant,
electrical, and evacuation / leak-check sides (`superheat-subcool`, `refrigerant-charge`,
`hvac-equipment-circuit`, `vacuum-decay-test`, `nitrogen-pressure-test`) but no gas-heat start-up
math; `Combustion Air` sizes the opening, it does not clock the meter or check the rise. Both tiles
ship into the existing `calc-hvacservice.js`.

Per-tile wiring (each of the two): a `tools-data.js` row (group `C`; trade `["hvac"]`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (both `GOVERNANCE.general`, with the formula
string and assumptions listing every bundled constant); `test/fixtures/worked-examples.json` (both
pinned examples and cross-checks); `test/fixtures/compute-map.js` (`gas-meter-clock` ->
`computeGasMeterClock`, `furnace-temp-rise` -> `computeFurnaceTempRise`, both in
`../../calc-hvacservice.js`); `scripts/related-tiles.mjs` (`gas-meter-clock` -> `furnace-temp-rise`
/ `combustion-air` / `gas-furnace-altitude-derate` (spec-v111); `furnace-temp-rise` ->
`gas-meter-clock` / `cfm-per-ton` / `total-external-static-pressure`); `data/search/aliases.json`
(`gas-meter-clock`: "clock the meter", "gas meter clocking", "firing rate", "actual input btu",
"check gas input"; `furnace-temp-rise`: "temperature rise", "temp rise", "furnace delta t",
"airflow from rise", "rise range"); the two ids appended to the existing `HVACSERVICE_RENDERERS`
declare in `app.js`; the `// dims:` annotations; the regenerated v14 corpus + tile-index; and a
`test/unit/bounds-fuzzer.test.js` block pinning both worked examples, cross-checks, and every error
seam.

**Module note.** The two tiles land in the existing `calc-hvacservice.js` (the field-service
bench, the natural home for gas-heat start-up). If the addition pushes the module past its
`scripts/check-module-sizes.mjs` cap (raised to 9,000 B at v105), raise it to current + ~20 percent
with a dated comment. The shared `citations.js` registry cap is bumped if needed. It remains
lazy-loaded and absent from the home-view first-paint payload.

## 4. As-landed verification (gate plan)

The standard green bar: `npm run lint` (every gate, including module-size, wiring, sw-precache,
dimensions, corpus, tile-contract, em-dash ban, and `check-readme-counts` re-pinned to the live
total **+2 tiles**, same group / module / sitemap-group counts plus two new tile URLs); `npm test`
(+4 worked-example fixtures and cross-checks; the new spec-v110 bounds-fuzzer block); `npm run
build` (two new tile shells, regenerated sitemap); `npm run data:verify`; the worked-examples
runner; the 320 px shell audit (the firing-rate, delta-T, and CFM lines wrap, not scroll, on a
phone); and the full-catalog render-no-nan Chromium sweep plus the a11y gate, with the rendered
output read to the value (1 cf dial / 37 sec / 1030 -> 100,219 BTU/hr; 70->120 F at 100k/80% ->
50 F rise, 1,481 CFM).

## 5. Roadmap position

v110 opens the gas-heat side of the HVAC field-service bench; with v102 / v104 / v105 it now spans
refrigerant, electrical, evacuation, leak-check, and gas-heat start-up. It pairs with spec-v111's
fuel-gas conversion and altitude-derate tiles (the install-time counterpart to these
commissioning-time tiles) via the `related-tiles` graph. Further bench growth stays
evidence-driven (a named gap a tech hits at start-up).
