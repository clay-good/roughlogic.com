# roughlogic.com Specification v381 -- Design Spectral Response Accelerations SDS / SD1 (ASCE 7-22 11.4) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of a seismic-parameters trio (v381 spectral SDS/SD1 -> v382 story drift ->
> v383 P-delta stability) that brackets the existing `seismic-base-shear`. That tile takes `SDS` and `SD1` as given inputs
> "from the USGS maps"; this tile derives them from the mapped `Ss`, `S1`, and the site coefficients -- the upstream step it
> assumes.**
> In-scope catalog expansion under the spec-v106 trades-only charter. `seismic-base-shear` starts from the design spectral
> accelerations `SDS` and `SD1`, but those are not what a designer reads off the USGS Seismic Design Maps -- the maps give
> the risk-targeted `Ss` and `S1`, which must be adjusted for the site class through `Fa` and `Fv` and scaled by two-thirds.
> ASCE 7-22 §11.4.4: `SMS = Fa * Ss`, `SM1 = Fv * S1`; §11.4.5: `SDS = (2/3) * SMS`, `SD1 = (2/3) * SM1`. This adds the
> spectral-parameter tile to the existing **`calc-construction.js`** module (Group E), beside `seismic-base-shear`; no new
> group, trade, or dependency. Inherits spec.md through spec-v380.md.
>
> **The gap, and the evidence for it.** For `Ss = 1.0g`, `S1 = 0.4g` on Site Class D with `Fa = 1.1` and `Fv = 1.6`
> (ASCE 7-22 Tables 11.4-1 and 11.4-2), the maximum-considered values are `SMS = 1.1 * 1.0 = 1.10g` and
> `SM1 = 1.6 * 0.4 = 0.64g`, and the design values are `SDS = (2/3) * 1.10 = 0.733g` and `SD1 = (2/3) * 0.64 = 0.427g` --
> exactly the `SDS`/`SD1` that `seismic-base-shear` then divides by `R/Ie`. No tile computes them; a designer had to do the
> site-coefficient adjustment by hand before the base-shear tile could run.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The mapped accelerations
`Ss`, `S1` and the site coefficients `Fa`, `Fv` are dimensionless (expressed as fractions of `g`); the outputs
`SMS`, `SM1`, `SDS`, `SD1` are dimensionless. The v18/v21 contract: any non-finite input, or a negative acceleration or
non-positive site coefficient, returns `{ error }`; `Fa` and `Fv` are read from the site-class tables by the user (Site
Class F and certain high-acceleration cells require a site-specific ground-motion study, which the `editionNote` flags).
Citation discipline (v19/v22): `GOVERNANCE.general` over the ASCE 7 design spectral accelerations by name; `editionNote`
names **ASCE 7-22 §11.4.4 `SMS = Fa*Ss`, `SM1 = Fv*S1` and §11.4.5 `SDS = (2/3)SMS`, `SD1 = (2/3)SM1`, `Ss`/`S1` the mapped
risk-targeted MCER accelerations, and `Fa`/`Fv` the site coefficients from Tables 11.4-1/11.4-2 by site class**, and states
that **this returns the design spectral accelerations that feed the equivalent-lateral-force base shear, that `Fa`/`Fv` must
be taken from the site-class tables (Site Class F and some high-`Ss` cells require a site-specific study), and that it is a
design aid, not a substitute for the USGS Seismic Design Maps or the engineer of record**.

## 2. The tile

### 2.1 `seismic-design-spectral-acceleration` -- Design Spectral Response Accelerations SDS / SD1 (ASCE 7-22)

```
inputs:
  ss   -   mapped MCER short-period spectral acceleration (fraction of g)
  s1   -   mapped MCER 1-second spectral acceleration (fraction of g)
  fa   -   short-period site coefficient (Table 11.4-1, by site class)
  fv   -   1-second site coefficient  (Table 11.4-2, by site class)

sms = fa * ss;   sm1 = fv * s1                 (MCER, site-adjusted)
sds = (2/3) * sms;   sd1 = (2/3) * sm1          (design)
```

**Pinned worked example (Ss 1.0, S1 0.4, Site Class D, Fa 1.1, Fv 1.6).** `SMS = 1.10g`, `SM1 = 0.64g`;
`SDS = (2/3)(1.10) = 0.733g`, `SD1 = (2/3)(0.64) = 0.427g`. **Cross-check (feeds base shear).** Those `SDS`/`SD1` are the
exact inputs `seismic-base-shear` consumes, so the two tiles now chain end to end. A negative acceleration or a non-positive
site coefficient takes the error path; the non-finite seam is covered too.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, beside `seismic-base-shear`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, ASCE 7-22 §11.4, `editionNote` naming the `SMS`/`SM1`/`SDS`/
`SD1` relations, the `Ss`/`S1` mapped values, the `Fa`/`Fv` tables, and the site-specific-study caveat);
`test/fixtures/worked-examples.json` (the Site-Class-D example, pinning `SDS` and `SD1`); `test/fixtures/compute-map.js`
(`seismic-design-spectral-acceleration` -> `computeSeismicDesignSpectralAcceleration` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `seismic-base-shear` / `seismic-story-drift` / `wind-mwfrs-pressure` / `snow-load`);
`data/search/aliases.json` ("design spectral acceleration", "SDS SD1", "sds sd1 calculator", "Fa Fv site coefficient",
"seismic site class", "MCER spectral acceleration", "asce 11.4", "two thirds Fa Ss", "SMS SM1"); the id appended to the
existing construction renderers block in `app.js`; the `// dims:` annotation (all dimensionless); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the example, the two-thirds scaling, and the negative / non-positive /
non-finite error seams. No new module; re-pin `calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+1 fixture, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the four-parameter output wraps on a phone); render-no-nan +
a11y sweep, output read to the value (Ss 1.0 / S1 0.4 / Fa 1.1 / Fv 1.6 -> SDS 0.733, SD1 0.427).

## 5. Roadmap position

The upstream of `seismic-base-shear`: with this tile the equivalent-lateral-force procedure runs from the mapped `Ss`/`S1`
end to end. `seismic-story-drift` (v382) checks the resulting sway against the code limit, and `seismic-pdelta-stability`
(v383) checks whether that drift triggers a P-delta redesign. A site-class `Fa`/`Fv` table lookup and a full design-response-
spectrum plot are the deliberate next follow-ons.
