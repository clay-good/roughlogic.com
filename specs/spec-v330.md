# roughlogic.com Specification v330 -- Annual Heating Energy and Fuel Cost from Degree-Days (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.116.0; proposed 2026-07-02). Batch spec-v329..v331 (the building-energy trio -- building UA (v329),
> the annual heating energy from degree-days (this spec), the wall condensation gradient (v331)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: with the whole-building `UA` from v329, the next
> question an auditor or homeowner asks is the annual heating bill -- the degree-day method turns `UA` and the climate's
> heating degree-days into annual energy, fuel, and cost, the estimate that justifies an insulation or air-sealing upgrade.
> The catalog has no degree-day energy tile. Adds one tile to the existing **`calc-hvac.js`** module (Group C); no new
> group, trade, or dependency. Inherits spec.md through spec-v329.md.
>
> **The gap, and the evidence for it.** The degree-day method estimates annual heating energy as
> `Q = 24 x HDD x UA`, where `HDD` is the heating degree-days (base 65 degF) and `UA` the building heat-loss coefficient
> (Btu/h-degF); the fuel is `Q/(efficiency)` and the cost is the fuel times the unit price. For a house with
> `UA = 500 Btu/h-degF` in a 5,000 HDD climate, `Q = 24 x 5,000 x 500 = 60,000,000 Btu = 60 MMBtu`; at an 80% furnace
> efficiency that is `75 MMBtu = 750 therms` of gas, and at $1.20 per therm about $900 a year -- the number an upgrade is
> measured against, and one that scales directly with `UA`, so a 20% envelope improvement is a 20% lower bill. `building-ua`
> gives the `UA`; this tile turns it into the annual energy and cost.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The heat-loss coefficient
`UA` is Btu/h per degF; the heating degree-days `HDD` are degF-days; the annual delivered energy `Q` is an energy (Btu,
reported in MMBtu); the efficiency is a dimensionless fraction; the fuel energy and its unit (therms/gallons/kWh) and the
cost follow. The v18/v21 contract: any non-finite input, or a `UA`, `HDD`, or efficiency at or below zero, returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the degree-day method by name; `editionNote` names
**the degree-day annual energy `Q = 24 x HDD x UA`, the base-65 degF heating degree-day convention, the fuel
`= Q/efficiency`, the unit conversions (1 therm = 100,000 Btu, 1 gal fuel oil ~ 138,500 Btu, 1 kWh = 3,412 Btu), and the
ASHRAE degree-day / RESNET basis**, and states that **this returns a degree-day annual-energy and cost estimate -- it uses
the base-65 degF steady-state degree-day method (a modified/variable-base-degree-day method with the building's actual
balance point is more accurate, and it ignores internal and solar gains that lower the true balance point), takes the `UA`
and local `HDD` as entered, and does not add cooling, latent, or domestic-hot-water energy; and this is an estimate, not a
utility-bill-calibrated model** -- actual consumption depends on occupancy, weather, and gains.

## 2. The tile

### 2.1 `degree-day-energy` -- Annual Heating Energy and Fuel Cost from Degree-Days

```
inputs:
  UA_btuhF   Btu/h-degF   building heat-loss coefficient (from building-ua)
  HDD        degF-days    heating degree-days (base 65 degF)
  eff        -            heating system efficiency (AFUE/COP as Btu-out/Btu-in)
  fuel       -            gas(therm) | oil(gal) | electric(kWh)
  price      $/unit       fuel unit price (optional, for cost)

Q_btu = 24 * HDD * UA_btuhF                       ; delivered heating energy, Btu
fuel_btu = Q_btu / eff                            ; fuel energy, Btu
units = fuel_btu / {therm:1e5, oil:138500, kWh:3412}[fuel]
cost = units * price
```

**Pinned worked example (UA 500, 5,000 HDD, 80% gas furnace, $1.20/therm).** `Q = 24 x 5,000 x 500 = 60,000,000 Btu = 60 MMBtu`;
fuel `= 60/0.80 = 75 MMBtu = 750 therms`; cost `= 750 x $1.20 = $900/year`. **Cross-check (a heat pump at COP 3.0,
electric).** Same `Q = 60 MMBtu`; fuel `= 60/3.0 = 20 MMBtu = 5,861 kWh`; at `$0.15/kWh`, `= $879/year` -- comparable cost
to the gas furnace here, and the comparison a fuel-switching decision turns on (it flips with the local gas and electric
prices). The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac","insulation","energy-audit"]`, matching the energy tiles); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the degree-day method, `editionNote` naming
`Q = 24 HDD UA`, the base-65 convention, the fuel conversions, and the steady-state, no-gains, heating-only caveats);
`test/fixtures/worked-examples.json` (the gas-furnace example + the heat-pump cross-check); `test/fixtures/compute-map.js`
(`degree-day-energy` -> `computeDegreeDayEnergy` in `../../calc-hvac.js`); `scripts/related-tiles.mjs` (-> `building-ua` /
`manual-j-heating` / `heat-pump-seasonal-energy` / `balance-point`); `data/search/aliases.json` ("degree day energy",
"heating degree days", "HDD energy", "annual heating cost", "24 HDD UA", "degree day method", "annual fuel use", "heating
bill estimate", "therms per year"); the id appended to the existing hvac renderers block in `app.js`; the `// dims:`
annotation (`UA` Btu/h-degF, `HDD` degF-days, `Q` energy, `eff` dimensionless, cost currency); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the fuel-unit conversions, the efficiency division, and
the non-positive / non-finite error seams. No new module; re-pin `calc-hvac.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the fuel-conversion assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `Q` MMBtu / fuel units / cost stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (UA 500, 5,000 HDD, 80% -> 750 therms, $900).

## 5. Roadmap position

Middle of the building-energy batch (v329..v331) in `calc-hvac.js`, turning the `UA` into an annual bill. The wall
condensation gradient (v331) follows. A variable-base-degree-day method with the internal-gains balance point, a cooling
degree-day companion, and a payback chain from an upgrade's `UA` reduction are the deliberate next follow-ons once the trio
lands.
