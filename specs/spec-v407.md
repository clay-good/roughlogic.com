# roughlogic.com Specification v407 -- Total Dissolved Solids from Conductivity (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Third and final tile of the water/wastewater-operations trio (v405 clarifier loading ->
> v406 BOD/TSS mass loading -> v407 TDS from conductivity). `langelier-index` needs total dissolved solids as an input but
> never derives it; this tile estimates TDS from an electrical-conductivity meter reading, the field measurement an operator
> actually takes.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Total dissolved solids is slow to measure by
> evaporation but fast to estimate from electrical conductivity, which a handheld meter reads in seconds:
> `TDS (mg/L) = k * EC (uS/cm)`, where the correlation factor `k` runs about `0.55` to `0.75` depending on the ionic makeup
> (a common default is `0.65`). `langelier-index` consumes TDS; nothing produces it from conductivity. This adds the
> conversion tile to the existing **`calc-treatment.js`** module (Group M); no new group, trade, or dependency. Inherits
> spec.md through spec-v406.md.
>
> **The gap, and the evidence for it.** A conductivity reading of `1000 uS/cm` at a mid-range factor `k = 0.65` estimates
> `TDS = 0.65 * 1000 = 650 mg/L`. The factor matters: at `k = 0.55` the same reading gives `550 mg/L` and at `0.75` it gives
> `750 mg/L`, so the tile reports the band, not a false-precision single number. No tile does this; `langelier-index` asked
> for a TDS the operator had to look up or evaporate for.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The conductivity is an
electrical conductivity (uS/cm, handled dimensionlessly per the v14 convention); the correlation factor is dimensionless;
the total dissolved solids is a concentration (mg/L). The v18/v21 contract: any non-finite input, or a non-positive
conductivity or a factor outside `0.4 to 0.9`, returns `{ error }`; the factor defaults to `0.65`, and the tile reports the
TDS at the chosen factor plus the `0.55 to 0.75` band for context. Citation discipline (v19/v22): `GOVERNANCE.general` over
the conductivity-TDS correlation by name; `editionNote` names **Standard Methods 2510, the linear correlation
`TDS (mg/L) = k * EC (uS/cm)`, the typical factor range `0.55 to 0.75` (about `0.65` default, higher for waters dominated by
sulfate/chloride), and the caveat that the factor is water-specific and the correlation is approximate at high ionic
strength**, and states that **this returns an estimated TDS from a field conductivity reading, that a gravimetric TDS
(evaporation) is the reference method, and that it is a field-screening aid, not a substitute for a laboratory measurement**.

## 2. The tile

### 2.1 `tds-from-conductivity` -- Total Dissolved Solids from Conductivity

```
inputs:
  conductivity_us_cm   uS/cm   measured electrical conductivity (25 C)
  k_factor             -       TDS/EC correlation factor (default 0.65)

tds_mgl = k_factor * conductivity_us_cm
```

**Pinned worked example (1000 uS/cm, k 0.65).** `TDS = 0.65 * 1000 = 650 mg/L`. **Cross-check (the factor sets the band).**
The same `1000 uS/cm` gives `550 mg/L` at `k = 0.55` and `750 mg/L` at `k = 0.75` -- a `+/-15%` spread that the tile reports
so the number is not read as exact. A non-positive conductivity or an out-of-range factor takes the error path; the
non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water"]`, beside `langelier-index` / `softener-sizing`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, Standard Methods 2510, `editionNote` naming `TDS = k * EC`,
the `0.55-0.75` factor range, and the gravimetric-reference caveat); `test/fixtures/worked-examples.json` (the default-factor
example + the factor-band cross-check); `test/fixtures/compute-map.js` (`tds-from-conductivity` ->
`computeTdsFromConductivity` in `../../calc-treatment.js`); `scripts/related-tiles.mjs` (-> `langelier-index` /
`softener-sizing` / `bod-tss-loading-removal` / `coagulant-dose`); `data/search/aliases.json` ("tds from conductivity",
"conductivity to tds", "ec to tds", "total dissolved solids conductivity", "tds meter factor", "specific conductance tds",
"microsiemens tds", "standard methods 2510", "tds estimate"); the id appended to the existing treatment renderers block in
`app.js`; the `// dims:` annotation (conductivity/factor dimensionless, TDS concentration); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the example, the factor band, and the non-positive / out-of-range /
non-finite error seams. No new module; re-pin `calc-treatment.js` on the `check:module-sizes` allowlist. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the TDS / band output wraps on a phone); render-no-nan + a11y
sweep, output read to the value (1000 uS/cm, k 0.65 -> 650 mg/L).

## 5. Roadmap position

Closes the water/wastewater-operations trio: v405 loads the basin, v406 the mass, and v407 reads a field water-quality
parameter that feeds `langelier-index`. A salinity/TDS-to-density and a chloride-from-conductivity companion are the
deliberate next follow-ons.
