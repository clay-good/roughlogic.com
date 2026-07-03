# roughlogic.com Specification v349 -- Air Density Correction for Altitude and Temperature (ACFM/SCFM) (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.122.0). Batch spec-v347..v349 (the duct-and-airflow trio -- duct heat gain
> (v347), grille face velocity (v348), the air-density correction (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: nearly every HVAC airflow relation uses the sea-level
> `1.08` sensible constant and standard air density, but at altitude or high temperature the air is thinner, so a fan's
> mass flow, a coil's capacity, and a manometer's reading all change by the density ratio. The catalog has no density-
> correction tile. Adds one tile to the existing **`calc-hvac.js`** module (Group C); no new group, trade, or dependency.
> Inherits spec.md through spec-v348.md.
>
> **The gap, and the evidence for it.** The air-density ratio relative to standard (70 degF, sea level) is the product of an
> altitude factor and a temperature factor: `DF = (1 - 6.73e-6 x elev)^5.258 x (530/(460 + T_F))`. Standard (actual) CFM
> and mass-basis standard CFM relate by `SCFM = ACFM x DF`, the sensible constant scales to `1.08 x DF`, and a fan's rated
> sea-level static pressure delivers only `rated x DF` at altitude. At 5,000 ft and 70 degF, `DF = 0.835`, so a fan moving
> 1,000 ACFM moves only `835 SCFM` of mass, a coil rated at sea level loses ~16% of its sensible capacity, and a gas
> furnace derates -- the corrections a Denver or Salt Lake HVAC tech applies to every load and airflow number a sea-level
> table gives. This tile computes the density factor and applies it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The elevation is a length
(ft); the temperature is a temperature (degF); the density factor is dimensionless; the actual and standard airflows are
volumetric flows (cfm); the corrected sensible constant and fan static pressure follow. The v18/v21 contract: any non-finite
input, or a temperature at or below absolute zero (`460 + T <= 0`), returns `{ error }`; a negative elevation (below sea
level) is allowed. Citation discipline (v19/v22): `GOVERNANCE.general` over the air-density-ratio relations by name;
`editionNote` names **the density factor `DF = (1 - 6.73e-6 x elev)^5.258 x (530/(460 + T_F))`, the mass relation
`SCFM = ACFM x DF`, the corrected sensible constant `1.08 x DF`, and the fan static `rated x DF`, from the ASHRAE
Fundamentals air-property basis**, and states that **this returns the density factor and its corrections -- it uses the
standard-atmosphere altitude model and dry-air temperature factor (humidity has a small further effect), applies to fan
airflow, sensible capacity, and static pressure, and does not itself derate a specific gas appliance (use the appliance's
altitude-derate rating, `gas-altitude-derate`) or correct the combustion air; and this is an engineering aid** -- the
equipment's altitude-rated data govern.

## 2. The tile

### 2.1 `air-density-correction` -- Air Density Correction for Altitude and Temperature

```
inputs:
  elev_ft   ft     site elevation
  T_F       degF   air temperature (default 70)
  acfm      cfm    actual airflow (optional, to get SCFM)
  rated_sp  in-wc  sea-level rated fan static (optional, to correct)

alt_factor = (1 - 6.73e-6 * elev_ft)^5.258
temp_factor = 530 / (460 + T_F)
DF = alt_factor * temp_factor                      ; density factor vs standard air
SCFM = acfm * DF                                   ; mass-basis standard CFM
const_corr = 1.08 * DF                             ; corrected sensible constant
sp_corr = rated_sp * DF                            ; delivered static at altitude
```

**Pinned worked example (5,000 ft, 70 degF, 1,000 ACFM fan).** `alt_factor = (1 - 6.73e-6 x 5,000)^5.258 = 0.835`,
`temp_factor = 530/530 = 1.0`, `DF = 0.835`; `SCFM = 1,000 x 0.835 = 835`; corrected sensible constant `= 1.08 x 0.835 = 0.90`;
a fan rated 0.5 in-wc at sea level delivers `0.5 x 0.835 = 0.42 in-wc`. **Cross-check (hot rooftop air at 120 degF, sea
level).** `alt_factor = 1.0`, `temp_factor = 530/580 = 0.914`, `DF = 0.914` -- the hot air is 9% thinner, so a rooftop unit's
mass flow and capacity drop even at sea level, the reason summer rooftop performance lags the rating. The non-finite and
below-absolute-zero error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, matching the airflow tiles); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the air-density-ratio relations, `editionNote` naming
`DF = (1 - 6.73e-6 elev)^5.258 x (530/(460 + T))`, `SCFM = ACFM x DF`, `1.08 x DF`, the fan-static correction, and the
dry-air, use-appliance-rating caveats); `test/fixtures/worked-examples.json` (the altitude example + the hot-air cross-
check); `test/fixtures/compute-map.js` (`air-density-correction` -> `computeAirDensityCorrection` in `../../calc-hvac.js`);
`scripts/related-tiles.mjs` (-> `gas-altitude-derate` / `duct-heat-gain` / `fan-motor-bhp` / `manual-j-cooling`);
`data/search/aliases.json` ("air density correction", "ACFM SCFM", "altitude derate airflow", "density factor air",
"standard cubic feet per minute", "fan altitude correction", "air density ratio", "high altitude HVAC", "temperature air
density"); the id appended to the existing hvac renderers block in `app.js`; the `// dims:` annotation (`elev` length, `T`
temperature, `DF` dimensionless, airflows volumetric flow, `sp` pressure); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the altitude and temperature factors, the SCFM/constant/static
corrections, and the below-absolute-zero / non-finite error seams. No new module; re-pin `calc-hvac.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the DF and correction assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `DF` / `SCFM` / corrected values
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (5,000 ft, 70 degF -> DF 0.835, 835 SCFM).

## 5. Roadmap position

Closes the duct-and-airflow batch (v347..v349) in `calc-hvac.js`: duct heat gain, grille face velocity, and the density
correction now complete the airflow toolkit beside the duct-sizing and load tiles. A humidity (moist-air) density term, an
appliance-specific altitude derate chain into `gas-altitude-derate`, and a wet-coil sensible-capacity correction are the
deliberate next follow-ons once the trio lands. With this batch the HVAC airflow cluster spans sizing, pressure, thermal
loss, terminals, and density.
