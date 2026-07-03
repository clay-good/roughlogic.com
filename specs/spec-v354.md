# roughlogic.com Specification v354 -- Pool Heater Sizing and Heat-Up Time (calc-treatment.js, Group M, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.124.0). Batch spec-v353..v355 (the pool-and-water chemistry trio -- chlorine dose
> (v353), the pool heater sizing (this spec), breakpoint chlorination (v355)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog doses pool chemistry but has no tile for
> pool heating -- the BTUs and the hours to raise a pool of a given volume by a target temperature, the sizing a pool builder
> or service tech does when specifying a gas heater or heat pump. Adds one tile to the existing **`calc-treatment.js`**
> module (Group M); no new group, trade, or dependency. Inherits spec.md through spec-v353.md.
>
> **The gap, and the evidence for it.** Heating water is `Q = gallons x 8.34 x dT` Btu (the `8.34` being pounds per gallon,
> water's specific heat 1.0), and the heat-up time is that energy divided by the heater's delivered output,
> `hours = Q/(output x efficiency)`. For a 20,000 gal pool raised 10 degF, `Q = 20,000 x 8.34 x 10 = 1,668,000 Btu`; a
> 400,000 Btu/h heater at 80% efficiency delivers 320,000 Btu/h, so the heat-up takes `1,668,000/320,000 = 5.2 hours` (plus
> the standing surface loss the heater must also overcome). This is the number that decides whether a heater is big enough to
> warm a pool overnight, and one no chemistry tile provides. The dosing tiles balance the water; this tile warms it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The pool volume is a volume
(gal); the temperature rise `dT` is a temperature (degF); the energy `Q` is an energy (Btu); the heater output is a power
(Btu/h); the efficiency is a dimensionless fraction; the heat-up time is a time (h). The v18/v21 contract: any non-finite
input, or a volume, `dT`, or heater output at or below zero, returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the water-heating relation by name; `editionNote` names **the heating energy
`Q = gallons x 8.34 x dT`, the heat-up time `hours = Q/(output x efficiency)`, the standing surface heat-loss rule of thumb
(~a 1 to 1.5 Btu/h per ft^2 per degF of temperature difference, higher with wind and no cover), and the ASHRAE/pool-industry
basis**, and states that **this returns the heat-up energy and time for the water mass -- it accounts only for the water's
sensible heat (add the surface heat loss, which a solar cover cuts by ~50 to 70%, to hold temperature and to size for a
windy site), uses the entered heater output and efficiency (a heat pump's COP replaces the combustion efficiency), and does
not size the gas line or the electrical circuit; and this is a sizing aid** -- the manufacturer's rating and the site
conditions govern.

## 2. The tile

### 2.1 `pool-heater-btu` -- Pool Heater Sizing and Heat-Up Time

```
inputs:
  gallons    gal      pool volume
  dT_F       degF     temperature rise
  output     Btu/h    heater output (or heat-pump Btu/h)
  eff        -        efficiency (0.80 gas; use COP-equivalent for heat pump)

Q_btu = gallons * 8.34 * dT_F                      ; heat-up energy, Btu
delivered = output * eff                            ; delivered heat, Btu/h
hours = Q_btu / delivered                           ; heat-up time, h
```

**Pinned worked example (a 20,000 gal pool, +10 degF, 400,000 Btu/h gas at 80%).** `Q = 20,000 x 8.34 x 10 = 1,668,000 Btu`;
delivered `= 400,000 x 0.80 = 320,000 Btu/h`; `hours = 1,668,000/320,000 = 5.2 h`. **Cross-check (a smaller 150,000 Btu/h
heat pump).** Same pool and rise, `hours = 1,668,000/(150,000 x 1.0) = 11.1 h` -- more than double the time, the trade a
heat pump's efficiency (and lower operating cost) makes against its slower heat-up, and the reason a heat pump is left on to
hold temperature rather than for a fast warm-up. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["pool-service","water-operations"]`, matching the pool tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the water-heating relation, `editionNote` naming
`Q = gallons x 8.34 x dT`, `hours = Q/(output x eff)`, the surface-loss rule of thumb, and the sensible-only, add-surface-
loss, not-gas-line caveats); `test/fixtures/worked-examples.json` (the gas example + the heat-pump cross-check);
`test/fixtures/compute-map.js` (`pool-heater-btu` -> `computePoolHeaterBtu` in `../../calc-treatment.js`);
`scripts/related-tiles.mjs` (-> `pool-turnover` / `pool-chlorine-dose` / `water-heater-recovery` / `gas-appliance-demand`);
`data/search/aliases.json` ("pool heater size", "pool heat up time", "BTU to heat pool", "pool heater sizing", "heat pump
pool", "pool warming time", "gallons 8.34 delta T", "pool heater BTU", "spa heater size"); the id appended to the existing
treatment renderers block in `app.js`; the `// dims:` annotation (`gallons` volume, `dT` temperature, `Q` energy, `output`
power, `eff` dimensionless, hours time); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the energy and time relations, and the non-positive / non-finite error seams. No new module; re-pin
`calc-treatment.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the energy/time assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `Q` / delivered / hours stack wraps
on a phone); render-no-nan + a11y sweep, output read to the value (20,000 gal +10 degF, 400k gas -> 5.2 h).

## 5. Roadmap position

Middle of the pool-and-water chemistry batch (v353..v355) in `calc-treatment.js`, adding heater sizing to the dosing tiles.
Breakpoint chlorination (v355) follows. A surface-heat-loss term (with a solar-cover factor), a heat-pump COP-vs-air-
temperature curve, and an annual heating-cost estimate are the deliberate next follow-ons once the trio lands.
