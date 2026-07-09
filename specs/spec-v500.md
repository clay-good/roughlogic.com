# roughlogic.com Specification v500 -- Density Altitude and Pressure Altitude (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, "Mechanic -- Auto, Marine, Aviation"); no new module, group, or dependency. Trade `["mechanic"]` -- the
> aviation work lives in Group K beside the existing marine tiles, not a separate trade, so the inclusion gate holds.
> Inherits spec.md through spec-v499.md.
>
> **The gap, and the evidence for it.** Group K covers engine and vehicle math for wrenches and operators, but has no
> tile for the single number that decides whether a small aircraft (or a piston aero engine on a test stand) makes power
> on a hot day: density altitude. `air-density-correction` is an HVAC ACFM/SCFM density factor -- a different quantity
> for a different audience -- and nothing turns field elevation, altimeter setting, and temperature into a performance
> altitude. The catch is that a benign-looking field elevation hides a much higher effective altitude when it is hot:
> lift, engine power, and prop thrust all fall with air density, so a 5,000 ft strip on a 95 F afternoon performs like
> roughly 8,500 ft. The tile computes pressure altitude from the altimeter setting, then applies the FAA temperature
> correction against the ISA lapse to return density altitude -- the number a performance chart is actually entered
> with, and the one that turns "hot and high" from a slogan into feet.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The field elevation, the
pressure altitude, and the density altitude are lengths (`L`, in feet); the outside-air and ISA temperatures carry the
temperature dimension (worked in degrees C after conversion); the altimeter setting is a pressure (in Hg); the empirical
constants (`29.92`, `1000`, `120`, `15`, `2`) are unit-bearing and, following the established convention for the
atmosphere equations, are carried as `dimensionless` with the outputs pinned as `L`. The v18/v21 contract: any non-
finite input, a non-positive altimeter setting, or a temperature below absolute zero returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the density-altitude method by name (FAA AC 00-6 / ICAO Standard
Atmosphere); `editionNote` names the **FAA density-altitude method (ISA lapse correction)**, prints
`PA = elevation + (29.92 - altimeter) x 1000`, `ISA_C = 15 - 2 x (PA / 1000)`, and
`DA = PA + 120 x (OAT_C - ISA_C)`, and states that **density altitude is the pressure altitude corrected for the
temperature departure from standard, hot and high robs lift, engine power, and prop thrust even when the field elevation
looks benign, humidity lowers density further (this dry-air model ignores it, so it slightly under-predicts DA on a
humid day), and the aircraft flight manual performance charts and the pilot in command govern** -- a planning estimate,
not a performance guarantee.

## 2. The tile

### 2.1 `density-altitude` -- Why a 5,000 ft Strip Flies Like 8,500 ft on a Hot Day

```
inputs:
  field_elevation_ft   ft     field or station elevation
  altimeter_in_hg      inHg   altimeter setting (station pressure setting)
  oat_f                F      outside air temperature (degrees F)

oat_c   = (oat_f - 32) x 5 / 9                                  [C]
PA_ft   = field_elevation_ft + (29.92 - altimeter_in_hg) x 1000   [ft]   pressure altitude
ISA_c   = 15 - 2 x (PA_ft / 1000)                              [C]    standard temp at that PA
DA_ft   = PA_ft + 120 x (oat_c - ISA_c)                        [ft]   density altitude
```

**Pinned worked example (a 5,000 ft field, standard 29.92 altimeter, 95 F).** The temperature is `35.0 C`; with a
standard altimeter the pressure altitude equals the field elevation, `5,000 ft`, where the standard temperature is
`ISA = 15 - 2 x 5 = 5 C`. The air is `35 - 5 = 30 C` warmer than standard, so
`DA = 5,000 + 120 x 30 = ` **8,600 ft** -- the strip performs like a field 3,600 ft higher, the margin a pilot must
plan takeoff distance and climb against. **Cross-check (a cold day gives a density altitude below the field).** Hold
the field and altimeter but drop the temperature to `-5 F` (`-20.6 C`): the air is `25.6 C` colder than the `5 C`
standard, so `DA = 5,000 + 120 x (-25.6) = ` **1,928 ft** -- the aircraft performs far better than its field elevation
suggests, the winter bonus. The tile returns the pressure altitude, the standard temperature at that altitude, and the
density altitude.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the hot-day example + the cold-day
cross-check); `test/fixtures/compute-map.js` (`density-altitude` -> `computeDensityAltitude` in
`../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `air-density-correction` / `crosswind-component` /
`aircraft-weight-balance`); `data/search/aliases.json` ("density altitude", "pressure altitude", "hot and high", "da
calculator", "isa deviation", "high altitude takeoff", "field elevation performance", "altimeter setting"); the id
appended to the mechanic renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index;
a `bounds-fuzzer.test.js` block pinning both examples, the ISA lapse (2 C per 1000 ft), the DA-above-PA-when-hot and
DA-below-PA-when-cold sign behavior, and the error seams (non-finite, non-positive altimeter, sub-absolute-zero temp).
Hand-writes its renderer (mirroring the calc-mechanic.js pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the PA / ISA / DA stack wraps on a phone); render-no-nan + a11y on the new tile, output read to
the value (the hot-day example -> 8,600 ft).

## 5. Roadmap position

Opens the aviation corner of Group K that the header already advertises, beside the marine and auto tiles. A takeoff-
and-landing-distance factor (the DA-to-ground-roll multiplier), a true-airspeed-from-DA correction, and a normally-
aspirated power-loss-with-altitude companion are deliberate future follow-ons. Further Group K growth stays evidence-
driven.
