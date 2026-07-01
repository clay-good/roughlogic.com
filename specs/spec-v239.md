# roughlogic.com Specification v239 -- Compressed-Air Leak Load and Cost (Load/Unload Test) (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-06-30, package 0.88.0; was PROPOSED 2026-06-30). Batch spec-v239..v241 (the compressed-air energy trio -- the three levers of the
> plant's most expensive utility: the cost of its leaks, the power to make the air, and the savings from dropping the
> discharge pressure). This spec opens the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the leak survey and its cost are the maintenance
> tech's and energy auditor's first compressed-air job. Adds one tile to **`calc-hvac.js`** (Group C, beside
> `air-receiver`); no new module, group, or dependency. Inherits spec.md through spec-v238.md.
>
> **The gap, and the evidence for it.** Compressed air is the costliest utility in most plants, and leaks are its single
> largest waste -- a well-run system loses under ten percent of its air to leaks, a neglected one twenty to thirty. The
> DOE Compressed Air Challenge gives a field method that needs no flow meter: with production off, time how long the
> compressor runs loaded versus unloaded over several cycles; the loaded fraction of the cycle, times the compressor's
> rated capacity, is the leakage flow. Convert that flow to kilowatts at the system's specific power and to dollars at
> the run hours and the rate, and the leak survey has a price tag that justifies the repair crew. The catalog sizes the
> receiver (`air-receiver`) but has nothing that turns a load/unload stopwatch reading into the annual dollars the leaks
> are costing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The compressor capacity and
the leak flow are a volumetric flow (cfm); the loaded and unloaded times are a time (min); the specific power is a power
per flow (kW per 100 cfm); the leak power is a power (kW); the run hours are a time (h); the annual energy is an energy
(kWh); the rate and the annual cost are currency figures (USD, as the existing economic tiles carry them); the leak
fraction is `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive compressor capacity / specific
power / run hours, a negative loaded or unloaded time, or a zero total cycle time, returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the leak-load relations by name; `editionNote` names the
**US DOE Compressed Air Challenge load/unload leak test** (leak fraction `= t_load / (t_load + t_unload)`, leak flow
`= fraction * compressor cfm`) and the **compressed-air specific-power** convention (18 to 22 kW per 100 cfm at 100 psig
for a rotary-screw system), and states that **the test is run with all production draw off so the only demand is the
leaks, the loaded capacity is the compressor's actual delivered cfm at the operating pressure (not the nameplate), the
specific power is the whole system's wire-to-air figure at its pressure (a higher pressure or an older compressor runs
higher), the run hours are the hours the compressor is energized (leaks blow whenever the system is pressurized), and
this is an estimate from a stopwatch test, not a metered audit** -- a repair-justification number, not a utility bill.

## 2. The tile

### 2.1 `air-leak-cost` -- Compressed-Air Leak Load and Annual Cost

```
inputs:
  compressor_cfm    cfm            compressor delivered capacity at operating pressure, cfm
  load_min          min            loaded time over the test cycles, min
  unload_min        min            unloaded time over the test cycles, min
  specific_power    kW/100cfm      system specific power, kW per 100 cfm (default 22)
  run_hours         h              hours per year the compressor is energized (default 8760)
  rate_kwh          USD/kWh        energy rate, $/kWh

leak_fraction = load_min / (load_min + unload_min)
leak_cfm      = compressor_cfm * leak_fraction
leak_kw       = leak_cfm * specific_power / 100
annual_kwh    = leak_kw * run_hours
annual_cost   = annual_kwh * rate_kwh
```

**Pinned worked example (500 cfm compressor, neglected system).** A 500 cfm compressor that, with production off, runs
3 minutes loaded and 12 minutes unloaded per cycle, at 22 kW per 100 cfm, 8,760 h/yr, $0.10/kWh:
`leak_fraction = 3 / (3 + 12) = 0.20` (20 percent -- a neglected system); `leak_cfm = 500 * 0.20 = 100 cfm`;
`leak_kw = 100 * 22 / 100 = 22 kW`; `annual_kwh = 22 * 8,760 = 192,720 kWh`; `annual_cost = 192,720 * 0.10 = ` **$19,272
per year** blown through the leaks. **Cross-check (after a leak-repair program).** The same compressor retested at
1 minute loaded, 14 unloaded: `leak_fraction = 1 / 15 = 0.067` (6.7 percent -- now a well-maintained system);
`leak_cfm = 33.3 cfm`; `leak_kw = 7.3 kW`; `annual_kwh = 64,240 kWh`; `annual_cost = ` **$6,424 per year**. Tightening
the system from 20 percent leakage to under 7 percent saved about **$12,850 a year** -- from a stopwatch and a repair
kit, which is exactly why the load/unload test is the first thing a compressed-air audit does.

## 3. Wiring

A `tools-data.js` row (group `C`, trade `["hvac"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, the leak-load relations, `editionNote` naming the DOE Compressed Air Challenge load/unload test
and the specific-power convention with the production-off / delivered-cfm / system-specific-power / stopwatch-estimate
caveats); `test/fixtures/worked-examples.json` (the neglected-system example + the post-repair cross-check);
`test/fixtures/compute-map.js` (`air-leak-cost` -> `computeAirLeakCost` in `../../calc-hvac.js`);
`scripts/related-tiles.mjs` (-> `air-receiver` / `compressed-air-power` / `air-pressure-setpoint-savings`);
`data/search/aliases.json` ("compressed air leak", "air leak cost", "leak load", "load unload test", "compressed air
waste", "air leak survey", "leakage percent", "compressed air energy"); the id appended to the existing hvac renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples and error seams (non-finite, capacity / specific power / run hours <= 0, negative time, zero cycle
time). Raise the `calc-hvac.js` size cap or split the module if needed (dated comment). Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the zero-cycle error path); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the leak-fraction / leak-cfm / leak-kW / annual-$ stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (500 cfm / 3-of-15 min -> 100 cfm, $19,272).

## 5. Roadmap position

Opens the compressed-air energy batch (v239..v241). Sits beside `air-receiver` (the storage sizing) and feeds the same
specific-power idea that `compressed-air-power` (v240) derives from first principles; the leaks it prices are the demand
that `air-pressure-setpoint-savings` (v241) further trims by lowering the pressure they blow at. An ultrasonic
leak-tag inventory (summing individually measured leaks) is a deliberate future follow-on.
