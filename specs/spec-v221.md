# roughlogic.com Specification v221 -- PV Annual Energy Yield: Production, Specific Yield, Capacity Factor (calc-solar.js, Group A, 1 New Tile)

> **Status: LANDED (2026-06-30, package 0.87.0; was PROPOSED 2026-06-30). Batch spec-v221..v223 (the PV system-design trio -- the three questions every solar
> designer answers before a quote: how much energy the array makes, how to space the rows so they do not shade each
> other, and how to match the array to the inverter). This spec opens the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the production estimate is the number the solar
> installer puts in front of the customer. Adds one tile to **`calc-solar.js`** (Group A); no new module, group, or
> dependency. Inherits spec.md through spec-v220.md.
>
> **The gap, and the evidence for it.** The catalog sizes the *electrical* side of a PV array thoroughly --
> `pv-string-sizing` (cold-Voc / warm-Vmp MPPT window), `pv-circuit-ampacity` (the 690.8 156% rule),
> `pv-interconnection-busbar` (the 705.12 120% check), `rooftop-temp-adder` (the 310.15 sun adder) -- but it never
> answers the first question a customer asks: how many kilowatt-hours will it make in a year? That is the PVWatts
> energy model: annual energy is the DC nameplate times the site's peak-sun-hours times 365 times a performance ratio
> that rolls up soiling, shading, mismatch, wiring, inverter, and availability losses. From it fall the two benchmarks
> every designer compares systems by -- specific yield (kWh per kW installed) and capacity factor. The catalog can pick
> the conductor for an array but cannot tell the owner what it produces.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The DC nameplate is a
power (`M L^2 T^-3`, kW); the peak-sun-hours is a time (`T`, equivalent full-sun hours per day); the annual energy is an
energy (`M L^2 T^-2`, kWh); the specific yield (kWh per kW) reduces to a time (`T`); the performance ratio and the
capacity factor are `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive DC nameplate or
peak-sun-hours, or a performance ratio outside 0 to 1, returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the energy, specific-yield, and capacity-factor relations by name; `editionNote` names the
**NREL PVWatts** energy model (`E_annual = P_dc * PSH * 365 * PR`) and the standard specific-yield and capacity-factor
definitions, and states that **the peak-sun-hours is the plane-of-array daily irradiation from NREL's NSRDB / PVWatts
for the site, tilt, and azimuth (not a fixed 5), the performance ratio (default 0.77, the PVWatts all-loss default)
varies with climate, soiling, and equipment and is the single biggest lever on the estimate, the first-year figure
degrades roughly half a percent a year, and this is a pre-design estimate, not a bankable production model** -- a
sales-and-sizing number, not a stamped energy report.

## 2. The tile

### 2.1 `pv-energy-yield` -- Annual PV Energy, Specific Yield, and Capacity Factor

```
inputs:
  dc_kw        M L^2 T^-3     array DC nameplate at STC, kW
  psh          T              plane-of-array peak-sun-hours, kWh/m^2/day (equivalent full-sun hours), default 5.0
  perf_ratio   dimensionless  system performance ratio (all losses), 0 to 1, default 0.77 (PVWatts default)

annual_kwh      = dc_kw * psh * 365 * perf_ratio
specific_yield  = annual_kwh / dc_kw                 # kWh per kW installed (kWh/kWp)
capacity_factor = annual_kwh / (dc_kw * 8760)        # average output as a fraction of nameplate
monthly_kwh_avg = annual_kwh / 12
```

**Pinned worked example (8 kW residential, average US site).** An 8 kW DC rooftop array at a site with 5.0 peak-sun-hours
and the PVWatts default performance ratio 0.77: `annual_kwh = 8 * 5.0 * 365 * 0.77 = 11,242 kWh/yr`;
`specific_yield = 11,242 / 8 = 1,405 kWh/kWp`; `capacity_factor = 11,242 / (8 * 8,760) = 11,242 / 70,080 = 0.160 = `
**16.0%**; `monthly_kwh_avg = 11,242 / 12 = 937 kWh/month`. **Cross-check (same array, high-irradiance desert site).**
The same 8 kW array moved to a 6.5 peak-sun-hour desert site, with the performance ratio nudged to 0.75 for the added
heat loss: `annual_kwh = 8 * 6.5 * 365 * 0.75 = 14,235 kWh/yr`; `specific_yield = 14,235 / 8 = 1,779 kWh/kWp`. The same
hardware makes a quarter more energy purely from the resource: peak-sun-hours, not nameplate, is what separates a good
site from an average one, which is exactly why the production estimate has to start from the site's irradiation, not a
rule-of-thumb kWh-per-kW.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["solar","electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the energy / specific-yield / capacity-factor relations, `editionNote` naming the NREL
PVWatts model with the PSH-from-NSRDB / PR-varies / degradation / not-bankable caveats);
`test/fixtures/worked-examples.json` (the average-site example + the desert cross-check); `test/fixtures/compute-map.js`
(`pv-energy-yield` -> `computePvEnergyYield` in `../../calc-solar.js`); `scripts/related-tiles.mjs`
(-> `pv-string-sizing` / `pv-inverter-ratio` / `solar-times`); `data/search/aliases.json` ("pv production",
"solar energy yield", "kwh per year", "pvwatts", "specific yield", "capacity factor", "peak sun hours", "array
production"); the id appended to the existing solar renderers declare in `app.js`; the `// dims:` annotation; regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, DC nameplate
or PSH <= 0, performance ratio out of 0 to 1). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the PR-bounds error path); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the annual / specific-yield / capacity-factor / monthly
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (8 kW / 5.0 PSH / 0.77 -> 11,242 kWh,
1,405 kWh/kWp, 16.0%).

## 5. Roadmap position

Opens the PV system-design batch (v221..v223). Pairs with `pv-string-sizing` (the electrical sizing) as the energy
answer, feeds the customer-facing production number, and sits beside `pv-inverter-ratio` (v223), whose loading ratio
sets part of the performance ratio this tile takes as an input. `pv-row-spacing` (v222) is the layout that keeps the
shading loss inside the performance ratio's budget. A monthly-resolved (twelve-PSH) production profile and a degradation
schedule are deliberate future follow-ons.
