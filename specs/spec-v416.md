# roughlogic.com Specification v416 -- Liquefaction Triggering Screening (Seed-Idriss CSR) (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Third and final tile of the geotechnical settlement/foundation trio (v414 consolidation
> time -> v415 SPT bearing -> v416 liquefaction screening). Saturated loose sand can turn to liquid in an earthquake; this
> tile runs the simplified Seed-Idriss screening -- the seismic demand (cyclic stress ratio) against the soil's resistance
> and the resulting factor of safety.**
> In-scope catalog expansion under the spec-v106 trades-only charter. The simplified procedure compares the earthquake-
> induced cyclic stress ratio to the soil's cyclic resistance. The demand is `CSR = 0.65 * (amax/g) * (sigma_v / sigma'_v) *
> rd`, where `rd` is a depth stress-reduction coefficient; the factor of safety is `FS = (CRR / CSR) * MSF`, with `CRR` the
> cyclic resistance ratio from the `(N1)60` charts and `MSF` the magnitude scaling factor (`1.0` at Mw 7.5). No tile in the
> catalog touches liquefaction. This adds the screening tile to the existing **`calc-geotech.js`** module (Group E); no new
> group, trade, or dependency. Inherits spec.md through spec-v415.md.
>
> **The gap, and the evidence for it.** At `5 m` depth with peak ground acceleration `amax = 0.30g`, total vertical stress
> `2000 psf`, and effective stress `1200 psf`, the stress-reduction coefficient is `rd = 1 - 0.00765*5 = 0.962`, so
> `CSR = 0.65 * 0.30 * (2000/1200) * 0.962 = 0.313`. A loose sand with `CRR = 0.20` (from its `(N1)60`) at `MSF = 1.0`
> (Mw 7.5) has `FS = 0.20/0.313 = 0.64` -- below `1.0`, it liquefies. A denser sand with `CRR = 0.40` gives `FS = 1.28`,
> safe. No tile does this; the catalog had bearing and settlement but no seismic-liquefaction screen.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The peak acceleration ratio
`amax/g`, the cyclic stress and resistance ratios, `rd`, and `MSF` are dimensionless; the total and effective stresses are
pressures (psf); the depth is a length (m, for `rd`). The v18/v21 contract: any non-finite input, or a non-positive
effective stress, or an effective stress exceeding the total, returns `{ error }`; `rd` is computed from depth by the
Liao-Whitman linear form (`1 - 0.00765*z` for `z <= 9.15 m`, `1.174 - 0.0267*z` beyond) and `MSF` defaults to `1.0`
(Mw 7.5), and the tile returns `CSR`, `FS`, and the liquefiable verdict (`FS < 1.0`). Citation discipline (v19/v22):
`GOVERNANCE.general` over the simplified liquefaction procedure by name; `editionNote` names **the Seed-Idriss simplified
method, the demand `CSR = 0.65*(amax/g)*(sigma_v/sigma'_v)*rd`, the Liao-Whitman `rd`, the resistance `CRR` from the
`(N1)60` triggering charts, `MSF` the magnitude scaling factor (`1.0` at Mw 7.5), and `FS = (CRR/CSR)*MSF`**, and states
that **this is a screening tool: `CRR` must come from the SPT/CPT triggering charts, `amax` from a seismic hazard analysis,
and that it is not a substitute for a site-specific liquefaction evaluation by a geotechnical engineer**.

## 2. The tile

### 2.1 `liquefaction-screening` -- Liquefaction Triggering Screening (Seed-Idriss)

```
inputs:
  amax_g        g      peak ground acceleration (fraction of g)
  sigma_v_psf   psf    total vertical stress
  sigma_vp_psf  psf    effective vertical stress
  depth_m       m      depth (for rd)
  crr           -      cyclic resistance ratio (from (N1)60 charts)
  msf           -      magnitude scaling factor (default 1.0, Mw 7.5)

rd  = (depth_m <= 9.15) ? 1 - 0.00765*depth_m : 1.174 - 0.0267*depth_m
CSR = 0.65 * amax_g * (sigma_v_psf / sigma_vp_psf) * rd
FS  = (crr / CSR) * msf
liquefiable = FS < 1.0
```

**Pinned worked example (amax 0.30g, sv 2000, s'v 1200 psf, z 5 m, CRR 0.20, MSF 1.0).** `rd = 0.962`;
`CSR = 0.65*0.30*(2000/1200)*0.962 = 0.313`; `FS = 0.20/0.313 = 0.64` -> **liquefiable**. **Cross-check (denser sand).**
`CRR = 0.40` gives `FS = 1.28` -> not liquefiable. An effective stress above total, or a non-positive effective stress,
takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`, beside `soil-bearing-capacity` /
`spt-bearing-capacity`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the Seed-Idriss
simplified method, `editionNote` naming the `CSR`, `rd`, `MSF`, and `FS` relations and the CRR-from-charts caveat);
`test/fixtures/worked-examples.json` (the liquefiable example + the safe cross-check); `test/fixtures/compute-map.js`
(`liquefaction-screening` -> `computeLiquefactionScreening` in `../../calc-geotech.js`); `scripts/related-tiles.mjs` (->
`spt-bearing-capacity` / `soil-bearing-capacity` / `seismic-design-spectral-acceleration` / `consolidation-time-rate`);
`data/search/aliases.json` ("liquefaction", "cyclic stress ratio", "CSR CRR", "liquefaction screening", "seed idriss",
"factor of safety liquefaction", "soil liquefaction", "seismic soil", "sand liquefaction"); the id appended to the existing
geotech renderers block in `app.js`; the `// dims:` annotation (ratios/factors dimensionless, stresses pressure, depth
length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the `rd` branch, the
FS verdict, and the effective-stress / non-finite error seams. No new module; re-pin `calc-geotech.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the FS verdict, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the CSR / FS / verdict wraps on a phone); render-no-nan + a11y
sweep, output read to the value (amax 0.30, CRR 0.20 -> CSR 0.313, FS 0.64, liquefiable).

## 5. Roadmap position

Closes the geotechnical settlement/foundation trio: v414 times consolidation, v415 the sand bearing, and v416 screens that
sand for seismic liquefaction, chaining from `seismic-design-spectral-acceleration` for the `amax`. A `(N1)60`-to-`CRR`
triggering-curve tile and a post-liquefaction settlement estimate are the deliberate next follow-ons.
