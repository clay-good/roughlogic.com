# roughlogic.com Specification v233 -- Heat-Pump Seasonal Heating Energy and Cost vs Gas and Resistance (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-06-30). Batch spec-v233..v235 (the heat-pump heating-mode trio -- the electrification
> questions the trade fields every day: what a heat pump costs to run for a season, when a dual-fuel system should hand
> off to gas, and whether the heat pump keeps up in the cold). This spec opens the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the seasonal operating cost is what the HVAC tech
> puts in front of a homeowner weighing a heat pump against their furnace. Adds one tile to **`calc-hvac.js`** (Group C,
> beside `balance-point` and `seer-eer`); no new module, group, or dependency. Inherits spec.md through spec-v232.md.
>
> **The gap, and the evidence for it.** The catalog has the thermal balance point (`balance-point`) and the SEER/EER
> rating conversion (`seer-eer`), but nothing that answers the question driving every electrification job: what does the
> heat pump cost to run over a heating season, and how does that compare to the gas furnace or the electric strips it
> replaces? The answer is the seasonal heating load divided by the HSPF (the season's Btu delivered per watt-hour drawn),
> priced at the electric rate, set beside the same load delivered by a 95 percent furnace at the gas rate and by
> resistance heat at a COP of one. Those three numbers are the whole electrification decision, and the catalog computes
> none of them. It can convert a SEER to an EER but cannot tell a homeowner whether the heat pump saves money over their
> furnace.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The seasonal heating load
is an energy (MMBtu, millions of Btu); the electric energy is an energy (kWh); the gas use is an energy (therms); the
HSPF is a Btu-per-watt-hour efficiency; the AFUE is a `dimensionless` fraction; the rates and the dollar costs are
currency figures (USD, as the existing economic tiles carry them). The unit bridges 1 MMBtu = 293.07 kWh, 3,412 Btu/kWh
(resistance, COP 1), and 100,000 Btu/therm are carried as named constants. The v18/v21 contract: any non-finite input, a
non-positive seasonal load / HSPF, an AFUE outside 0 (exclusive) to 1, or a negative rate, returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the seasonal-energy relations by name; `editionNote` names the
**AHRI 210/240 HSPF** definition (season Btu delivered per Wh input) and the standard **fuel-cost comparison** (gas
therms = load / AFUE, resistance at COP 1), and states that **the HSPF is the rated regional value (Region IV; a colder
region delivers less, and the field seasonal COP depends on the actual climate and controls), the seasonal heating load
comes from a Manual J plus degree-days or metered history, the gas comparison uses the delivered efficiency AFUE not the
steady-state efficiency, and this is an operating-cost estimate, not a metered bill** -- a comparison aid, not a
guaranteed savings.

## 2. The tile

### 2.1 `heat-pump-seasonal-energy` -- Seasonal Heating Energy and Cost, Heat Pump vs Gas vs Resistance

```
inputs:
  seasonal_load_mmbtu  MMBtu     seasonal heating load delivered to the house, MMBtu
  hspf                 Btu/Wh    heat-pump rated HSPF (AHRI 210/240)
  rate_kwh             USD/kWh   electric rate, $/kWh
  afue                 fraction  comparison furnace AFUE, 0-1 (default 0.95)
  rate_therm           USD/therm gas rate, $/therm (default 0 -> skip the gas comparison)

hp_kwh          = seasonal_load_mmbtu * 1000 / hspf            # 1 MMBtu = 1000 kBtu; HSPF is Btu/Wh = kBtu/kWh
hp_cost         = hp_kwh * rate_kwh
resistance_kwh  = seasonal_load_mmbtu * 1e6 / 3412            # COP 1
resistance_cost = resistance_kwh * rate_kwh
gas_therms      = rate_therm > 0 ? seasonal_load_mmbtu * 10 / afue : null   # 10 therms per MMBtu delivered / AFUE
gas_cost        = rate_therm > 0 ? gas_therms * rate_therm : null
```

**Pinned worked example (60 MMBtu season, HSPF 9).** A house with a 60 MMBtu seasonal heating load, a HSPF 9.0 heat pump,
$0.15/kWh electricity, compared against a 95 percent furnace at $1.50/therm: `hp_kwh = 60 * 1000 / 9.0 = 6,667 kWh`;
`hp_cost = 6,667 * 0.15 = $1,000`; `resistance_kwh = 60,000,000 / 3,412 = 17,585 kWh`;
`resistance_cost = 17,585 * 0.15 = $2,638`; `gas_therms = 60 * 10 / 0.95 = 631.6 therms`;
`gas_cost = 631.6 * 1.50 = $947`. The heat pump at **$1,000** beats resistance heat ($2,638) by more than half and runs
within a few dollars of the gas furnace ($947) -- the electrification case in three numbers. **Cross-check (cheap gas,
expensive power).** The same house where power is $0.24/kWh and gas is $0.90/therm: `hp_cost = 6,667 * 0.24 = $1,600`;
`gas_cost = 631.6 * 0.90 = $568`. Now the furnace wins nearly three to one -- which is exactly why the answer is a
calculation from the local rates, not a slogan, and why the same heat pump is a bargain in one utility territory and a
premium in another.

## 3. Wiring

A `tools-data.js` row (group `C`, trade `["hvac"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, the seasonal-energy relations, `editionNote` naming AHRI 210/240 HSPF and the fuel-cost
comparison with the rated-region / Manual-J-load / delivered-AFUE / not-a-bill caveats);
`test/fixtures/worked-examples.json` (the HSPF-9 example + the cheap-gas cross-check); `test/fixtures/compute-map.js`
(`heat-pump-seasonal-energy` -> `computeHeatPumpSeasonalEnergy` in `../../calc-hvac.js`); `scripts/related-tiles.mjs`
(-> `balance-point` / `dual-fuel-balance-point` / `heat-pump-cold-capacity`); `data/search/aliases.json` ("heat pump
cost", "hspf", "heat pump vs gas", "seasonal heating cost", "heat pump operating cost", "electrification cost",
"resistance heat cost", "heat pump savings"); the id appended to the existing hvac renderers declare in `app.js`; the
`// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and
error seams (non-finite, load / HSPF <= 0, AFUE out of 0 to 1, negative rate, the gas-skip path). Raise the
`calc-hvac.js` size cap or split the module if needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the gas-skip path); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the hp-kWh / hp-$ / resistance-$ / gas-$ stack wraps on a
phone); render-no-nan + a11y sweep, output read to the value (60 MMBtu / HSPF 9 -> 6,667 kWh, $1,000).

## 5. Roadmap position

Opens the heat-pump heating-mode batch (v233..v235). Sits beside `balance-point` (the thermal balance temperature) and
`seer-eer`, and feeds the fuel comparison that `dual-fuel-balance-point` (v234) turns into a switchover temperature;
`heat-pump-cold-capacity` (v235) checks whether the unit meets the design load the seasonal energy assumes it carries. A
monthly degree-day resolution and a demand-charge / time-of-use electric mode are deliberate future follow-ons.
