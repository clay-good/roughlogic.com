# roughlogic.com Specification v463 -- Engine Fuel Burn from Horsepower (BSFC) (calc-mechanic.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-04). Second tile of the engine/vehicle-systems trio (v462 prop pitch -> v463 engine fuel burn
> -> v464 alternator charging). `fuel-range` converts a fuel quantity to range; this tile computes the instantaneous burn
> rate -- the gallons per hour an engine drinks at a given power output, the number a marine or generator operator watches.**
> In-scope catalog expansion under the spec-v106 trades-only charter. An engine's fuel burn is its power times its
> brake-specific fuel consumption (BSFC), divided by the fuel density: `GPH = HP * BSFC / density_lb_per_gal`. Diesel BSFC
> runs about `0.37 lb/hp-hr` and gasoline about `0.45 to 0.50`, at densities near `7.1` and `6.1 lb/gal`. `fuel-range` works
> from a quantity of fuel, not from the power draw; nothing gives the burn rate. This adds the fuel-burn tile to the existing
> **`calc-mechanic.js`** module (Group K); no new group, trade, or dependency. Inherits spec.md through spec-v462.md.
>
> **The gap, and the evidence for it.** A `300 hp` diesel at that output burns `GPH = 300 * 0.37 / 7.1 = 15.6 gallons per
> hour`; the same `300 hp` from a gasoline engine (`BSFC 0.50`, density `6.1`) burns `300 * 0.50 / 6.1 = 24.6 GPH`, over half
> again as much, because gasoline is both thirstier per horsepower and less dense. No tile does this; an operator estimating
> a genset run or a boat's cruise burn had the range tile but not the rate.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The power is a power (hp); the
BSFC is a mass per energy (lb/hp-hr); the fuel density is a mass per volume (lb/gal); the burn rate is a volumetric flow
(gal/hr). The v18/v21 contract: any non-finite input, or a non-positive power, BSFC, or density, returns `{ error }`; the
tile reports the burn rate and, when a tank size is given, the run time. Citation discipline (v19/v22): `GOVERNANCE.general`
over the BSFC fuel-burn relation by name; `editionNote` names **the relation `GPH = HP * BSFC / density`, typical BSFC
values (`~0.37 lb/hp-hr` diesel, `~0.45 to 0.50` gasoline), fuel densities (`~7.1 lb/gal` diesel, `~6.1` gasoline), and that
BSFC is best at the engine's efficient load band (worse at idle and full throttle)**, and states that **this returns the
fuel burn rate at a given power, that BSFC comes from the engine's fuel map, and that it is a planning aid, not a substitute
for measured fuel-flow data**.

## 2. The tile

### 2.1 `engine-fuel-burn-gph` -- Engine Fuel Burn from Horsepower (BSFC)

```
inputs:
  horsepower     hp        engine power output
  bsfc_lb_hp_hr  lb/hp-hr  brake-specific fuel consumption
  density_lb_gal lb/gal    fuel density (diesel ~7.1, gasoline ~6.1)
  tank_gal       gal       tank size (optional, for run time)

gph      = horsepower * bsfc_lb_hp_hr / density_lb_gal
run_hours = tank_gal / gph
```

**Pinned worked example (300 hp diesel, BSFC 0.37, density 7.1).** `GPH = 300 * 0.37 / 7.1 = 15.6 gal/hr`; on a `200 gal`
tank that is `200 / 15.6 = 12.8 hours` of run time. **Cross-check (gasoline is thirstier).** The same `300 hp` from a
gasoline engine (`BSFC 0.50`, density `6.1`) burns `24.6 GPH` -- `58%` more fuel per hour. A non-positive power, BSFC, or
density takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`, beside `fuel-range` / `hp-from-torque`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the BSFC fuel-burn relation, `editionNote` naming `GPH = HP*BSFC/
density`, the typical BSFC/density values, and the load-band note); `test/fixtures/worked-examples.json` (the diesel example
+ the gasoline cross-check); `test/fixtures/compute-map.js` (`engine-fuel-burn-gph` -> `computeEngineFuelBurnGph` in
`../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `fuel-range` / `prop-pitch-selection` / `hp-from-torque` /
`injector-size`); `data/search/aliases.json` ("fuel burn", "gph", "gallons per hour", "bsfc", "engine fuel consumption",
"diesel gph", "generator fuel burn", "boat fuel burn", "fuel burn rate"); the id appended to the existing mechanic
renderers block in `app.js`; the `// dims:` annotation (hp power, bsfc mass/energy, density mass/volume, gph volumetric
flow); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the run-time output, and
the non-positive / non-finite error seams. No new module; re-pin `calc-mechanic.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the run-time, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the GPH / run-time output wraps on a phone); render-no-nan +
a11y sweep, output read to the value (300 hp diesel -> 15.6 GPH).

## 5. Roadmap position

The middle of the engine/vehicle-systems trio: `prop-pitch-selection` (v462) and `alternator-charging-load` (v464) bracket
it. A part-load BSFC curve and a fuel-cost-per-hour tie-in are the deliberate next follow-ons.
