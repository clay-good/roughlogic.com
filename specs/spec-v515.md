# roughlogic.com Specification v515 -- SAE J1349 Dyno Correction Factor (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, "Mechanic -- Auto, Marine, Aviation"); no new module, group, or dependency. Trade `["mechanic"]`. Inherits
> spec.md through spec-v514.md.
>
> **The gap, and the evidence for it.** `trap-speed-horsepower` estimates power but applies no atmospheric correction,
> so two dyno pulls on different days are not comparable. SAE J1349 fixes that by correcting observed power to a standard
> day (25 C, 99 kPa dry), and the catch is in the word **dry**: you must subtract the water-vapor pressure from the
> barometric pressure before applying the factor, because humid air makes less power and the correction has to know it.
> Two more traps: the factor is only valid in a temperature and pressure window (about 15 to 35 C, 900 to 1050 mbar)
> outside which it distorts, and the older STD (SAE J607) correction runs about 4% higher than J1349, so a shop quoting
> "STD" numbers cannot be compared to a "SAE" number without matching the basis. The tile takes the observed power, the
> dry barometric pressure, the air temperature, and the humidity, and returns the correction factor and the corrected
> power on the SAE basis -- the number that makes two pulls comparable.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The observed and corrected
power are powers (`M L^2 T^-3`, in hp); the barometric and vapor pressures are pressures (`M L^-1 T^-2`, in mbar); the
air temperature carries the temperature dimension (worked in degrees C); the relative humidity and the correction factor
are `dimensionless`; the constants (`1.18`, `990`, `298`, `0.18`, `273`) are unit-bearing and carried as `dimensionless`
per the empirical-relation convention. The v18/v21 contract: any non-finite input, a non-positive observed power, a non-
positive barometric pressure, a temperature at or below absolute zero, or a humidity outside `0-100` returns
`{ error }`; a temperature or pressure outside the J1349 validity window is computed but flagged. Citation discipline
(v19/v22): `GOVERNANCE.general` over the correction relation by name (SAE J1349; STD per SAE J607); `editionNote` names
the **SAE J1349 dyno correction factor**, prints `P_dry = P_baro - vapor_pressure(temp, RH)`,
`CF = 1.18 x (990 / P_dry_mbar) x sqrt((temp_C + 273) / 298) - 0.18`, and `corrected = observed x CF`, and states that
**the pressure used must be the dry pressure with water-vapor pressure removed (humid air makes less power), the factor
is valid only about 15 to 35 C and 900 to 1050 mbar, the older STD (J607) basis runs about 4% higher so it cannot be
compared to a J1349 number, and the dyno, correction basis, and test procedure govern** -- a comparison aid, not a
certified rating.

## 2. The tile

### 2.1 `dyno-correction-sae` -- The Dry-Pressure Correction That Makes Two Pulls Comparable

```
inputs:
  observed_hp        hp    the power the dyno measured
  baro_mbar          mbar  observed barometric (absolute) pressure
  air_temp_c         C     inlet air temperature
  humidity_pct       %     relative humidity (to subtract vapor pressure)

vapor_mbar = saturation_vapor_pressure(air_temp_c) x humidity_pct / 100     [mbar]
P_dry      = baro_mbar - vapor_mbar                                          [mbar]
CF         = 1.18 x (990 / P_dry) x sqrt((air_temp_c + 273) / 298) - 0.18    [-]
corrected  = observed_hp x CF                                                [hp]
```

**Pinned worked example (400 hp observed, 980 mbar dry, 30 C).** With the dry pressure at 980 mbar,
`CF = 1.18 x (990 / 980) x sqrt((30 + 273) / 298) - 0.18 = 1.18 x 1.0102 x 1.0084 - 0.18 = ` **1.0220**, so the
corrected power is `400 x 1.0220 = ` **408.8 hp** -- the air was slightly worse than standard, so the pull is scaled up
about 2.2% to the standard day. **Cross-check (a hot, low-pressure day corrects harder).** Take a pull at 970 mbar dry
and 35 C: `CF = 1.18 x (990/970) x sqrt(308/298) - 0.18 = 1.18 x 1.0206 x 1.0166 - 0.18 = ` **1.0444** -- a 4.4%
correction, because the hotter, thinner air cost more power that the standard day gives back. The tile returns the dry
pressure, the correction factor, and the corrected power.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 30 C example + the hot-thin
cross-check); `test/fixtures/compute-map.js` (`dyno-correction-sae` -> `computeDynoCorrectionSae` in
`../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `trap-speed-horsepower` / `turbo-pressure-ratio` /
`air-density-correction`); `data/search/aliases.json` ("dyno correction factor", "sae j1349", "corrected horsepower",
"std vs sae power", "dry air pressure", "atmospheric correction", "humidity power correction", "dyno standard day");
the id appended to the mechanic renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the dry-pressure subtraction, the validity-window
flag, the correction rising as air worsens, and the error seams (non-finite, non-positive power / pressure, sub-
absolute-zero temp, humidity out of range). Hand-writes its renderer (mirroring the calc-mechanic.js
`trap-speed-horsepower` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the dry-pressure / CF / corrected stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 30 C example -> CF 1.0220, 408.8 hp).

## 5. Roadmap position

Adds the atmospheric correction that `trap-speed-horsepower` lacks and pairs with `turbo-pressure-ratio` (the
forced-induction side). A STD-to-SAE basis converter (the ~4% shift) and a correction-factor-limit warning for
out-of-window conditions are deliberate future follow-ons. Further Group K growth stays evidence-driven.
