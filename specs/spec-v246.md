# roughlogic.com Specification v246 -- Concrete Surface Evaporation Rate and Plastic-Shrinkage Risk (ACI 305) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-02, package 0.90.0; was PROPOSED 2026-07-01). Batch spec-v245..v247 (the cast-in-place placing-and-curing trio -- shore load,
> evaporation rate, and strength gain). This spec continues the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: reading the evaporation rate off the day's weather
> before the pour is the concrete finisher's go / no-go on plastic-shrinkage precautions, and it is a single ACI 305
> equation. Adds one tile to **`calc-construction.js`** (Group E); no new module, group, or dependency. Inherits spec.md
> through spec-v245.md.
>
> **The gap, and the evidence for it.** Fresh concrete cracks at the surface when water evaporates faster than bleed
> water rises to replace it, and ACI 305 (Hot Weather Concreting) puts the threshold at an evaporation rate of about
> 0.2 lb/ft^2/hr -- above it, take active precautions (fogging, windscreens, evaporation retarder, cover) or the slab
> plastic-shrinkage cracks before it sets. The rate is not the air temperature alone: it is the difference between the
> vapor coming off the warm concrete and the vapor the air can hold, multiplied by the wind, so a 90 F day at 40 percent
> humidity with a 15 mph wind evaporates several times faster than a calm humid one at the same temperature. The catalog
> sizes the mix (`concrete-mix-design`) and places the joints (`control-joint-spacing`) but has nothing that turns the
> four numbers on a weather app into the evaporation rate and the plastic-shrinkage go / no-go the finisher needs at the
> truck.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The air and concrete
temperatures are temperatures (F, converted to C internally, dimension T); the relative humidity is `dimensionless`
(percent); the wind speed is a velocity (mph, converted to km/h internally); the evaporation rate is a mass flux per area
(lb/ft^2/hr, with a kg/m^2/hr cross-report). The v18/v21 contract: any non-finite input, a relative humidity outside 0 to
100, a negative wind speed, or a temperature below absolute zero, returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the evaporation relation by name; `editionNote` names the **ACI 305 (Hot Weather Concreting)
nomograph and the Menzel/NRMCA evaporation equation** it is fit to, `E [kg/m^2/hr] = 5 x [(Tc + 18)^2.5 - (RH/100) x
(Ta + 18)^2.5] x (V + 4) x 10^-6` with Tc and Ta in C and V in km/h (the tile converts from F and mph and cross-reports
lb/ft^2/hr at 1 kg/m^2/hr = 0.2048 lb/ft^2/hr), states the **0.2 lb/ft^2/hr (about 1.0 kg/m^2/hr) precaution threshold
and the lower 0.1 lb/ft^2/hr caution for low-bleed mixes (low water-cement ratio, silica fume, or high-early cements)**,
and states that **the concrete temperature (not the air) drives the vapor term, a low-bleed mix cracks below the nominal
threshold, the equation estimates a rate under the day's conditions and does not by itself certify the cure, and curing
still follows ACI 308** -- a field screen, not a curing specification.

## 2. The tile

### 2.1 `concrete-evaporation-rate` -- Surface Evaporation Rate and Plastic-Shrinkage Risk

```
inputs:
  air_temp_f      F         ambient air temperature, F
  concrete_temp_f F         fresh concrete temperature, F (default = air temp)
  rh_pct          %         relative humidity, percent
  wind_mph        mph       wind speed at ~1.5 ft above the surface, mph

Tc = (concrete_temp_f - 32) / 1.8
Ta = (air_temp_f - 32) / 1.8
V  = wind_mph * 1.609
E_metric = 5 * ((Tc + 18)^2.5 - (rh_pct/100) * (Ta + 18)^2.5) * (V + 4) * 1e-6   [kg/m^2/hr]
E_us     = E_metric * 0.2048                                                     [lb/ft^2/hr]
flag     = E_us >= 0.2 ? "precautions" : E_us >= 0.1 ? "caution" : "ok"
```

**Pinned worked example (hot, dry, breezy pour).** Air 90 F, concrete 90 F, 40 percent RH, 15 mph wind:
`Tc = Ta = 32.2 C`; `(32.2 + 18)^2.5 = 50.2^2.5 = 17,850`; vapor term `= 17,850 - 0.40 x 17,850 = 10,710`;
`V = 24.1 km/h`, `(V + 4) = 28.1`; `E_metric = 5 x 10,710 x 28.1 x 1e-6 = 1.51 kg/m^2/hr`;
`E_us = 1.51 x 0.2048 = ` **0.31 lb/ft^2/hr** -- above the 0.2 threshold, so **take plastic-shrinkage precautions**
(fog the air, set windscreens, spray evaporation retarder, cover as soon as finishing allows). **Cross-check (mild
morning pour).** Air 70 F, concrete 70 F, 70 percent RH, 10 mph wind: `(21.1 + 18)^2.5 = 39.1^2.5 = 9,560`; vapor term
`= 9,560 x (1 - 0.70) = 2,868`; `V = 16.1 km/h`, `(V + 4) = 20.1`; `E_metric = 5 x 2,868 x 20.1 x 1e-6 = 0.29 kg/m^2/hr`;
`E_us = ` **0.059 lb/ft^2/hr** -- well below the threshold, **no special precautions**. Same two slabs, same concrete: a
twenty-degree, thirty-point-humidity, five-mph swing takes the surface from safe to cracking, which is why the finisher
reads this at the truck, not from the calendar.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["concrete","construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the evaporation relation, `editionNote` naming ACI 305 and the Menzel/NRMCA equation with
the concrete-temperature-drives / low-bleed / not-a-cure / ACI 308 caveats); `test/fixtures/worked-examples.json` (the
hot example + the mild cross-check); `test/fixtures/compute-map.js` (`concrete-evaporation-rate` ->
`computeConcreteEvaporationRate` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `concrete-mix-design` /
`control-joint-spacing` / `concrete-strength-gain`); `data/search/aliases.json` ("evaporation rate", "plastic shrinkage",
"hot weather concrete", "ACI 305", "concrete cracking wind", "evaporation retarder", "fogging concrete", "surface
crazing"); the id appended to the existing construction renderers declare in `app.js`; the `// dims:` annotation;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite,
RH outside 0 to 100, negative wind, sub-absolute-zero temperature). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the RH-out-of-range and negative-wind error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the vapor-term / metric-rate / US-rate
/ flag stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (90 F / 40 percent / 15 mph ->
0.31 lb/ft^2/hr, precautions).

## 5. Roadmap position

Continues the cast-in-place placing-and-curing batch (v245..v247). Sits between `shore-post-load` (v245), which holds the
form up during the pour, and `concrete-strength-gain` (v247), which tracks the cure that begins the moment this
evaporation screen passes. Complements `control-joint-spacing` (both address concrete cracking, one plastic and one
drying) and `concrete-mix-design`. A bleed-rate estimate and an ACI 308 curing-duration helper (days to a target
maturity) are deliberate future follow-ons.
