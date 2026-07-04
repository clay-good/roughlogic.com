# roughlogic.com Specification v382 -- Seismic Design Story Drift and Allowable Limit (ASCE 7-22 12.8.6 / 12.12) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, 0.134.0; proposed 2026-07-03). Second tile of the seismic-parameters trio (v381 spectral -> v382 story drift ->
> v383 P-delta). `seismic-base-shear` returns the earthquake force; this tile takes the elastic sway that force produces,
> amplifies it to the real inelastic drift, and checks it against the code limit -- the serviceability half of the
> equivalent-lateral-force procedure the catalog was missing.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A code seismic design is not done when the base shear
> is found; the structure must also sway less than the allowable story drift, or the cladding cracks and the P-delta effect
> runs away. Because the code permits reduced design forces by crediting ductility, the elastic story drift `delta_xe` must
> be amplified: ASCE 7-22 §12.8.6 gives the design story drift `delta_x = Cd * delta_xe / Ie`, and §12.12.1 / Table 12.12-1
> caps it at `Delta_a`, commonly `0.020 * hsx` (2% of story height) for typical risk categories. This adds the story-drift
> tile to the existing **`calc-construction.js`** module (Group E), beside `seismic-base-shear`; no new group, trade, or
> dependency. Inherits spec.md through spec-v381.md.
>
> **The gap, and the evidence for it.** A special moment frame (`Cd = 5.5`, `Ie = 1.0`) with an elastic story drift of
> `delta_xe = 0.5 in` in a `12 ft` (`144 in`) story has a design drift `delta_x = 5.5 * 0.5 / 1.0 = 2.75 in`, against an
> allowable `Delta_a = 0.020 * 144 = 2.88 in` -- it just passes. Let the frame soften so the elastic drift is `0.6 in` and
> `delta_x = 3.30 in > 2.88 in` -- it now fails, and the section must stiffen. No tile does this amplify-and-compare;
> `shearwall-deflection` gives one wood wall's flexibility, not the code drift check on the amplified story sway.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The elastic story drift
`delta_xe` and the story height `hsx` are lengths (in); `Cd` and `Ie` are dimensionless; the design drift `delta_x` and the
allowable `Delta_a` are lengths (in). The v18/v21 contract: any non-finite input, or a non-positive `delta_xe`, `hsx`,
`Cd`, or `Ie`, returns `{ error }`; the allowable-drift coefficient defaults to `0.020` (Risk Category I/II typical) and is
selectable for the `0.015` and `0.010` rows, and the tile returns a pass/fail against `Delta_a` plus the utilization
`delta_x / Delta_a`. Citation discipline (v19/v22): `GOVERNANCE.general` over the ASCE 7 story drift by name; `editionNote`
names **ASCE 7-22 §12.8.6 `delta_x = Cd*delta_xe/Ie`, the §12.12.1 / Table 12.12-1 allowable `Delta_a` (commonly
`0.020*hsx`, with `0.015`/`0.010` rows for other systems/risk categories), `Cd` the Table 12.2-1 deflection amplification
factor, and `delta_xe` the elastic story drift from the strength-level forces**, and states that **this amplifies the
elastic drift to the design (inelastic) drift and checks the allowable limit, that it is a story-by-story check, and that it
is a design aid, not a substitute for the engineer of record**.

## 2. The tile

### 2.1 `seismic-story-drift` -- Seismic Design Story Drift and Allowable Limit (ASCE 7-22)

```
inputs:
  delta_xe_in   in   elastic story drift (from the strength-level analysis)
  cd            -    deflection amplification factor (Table 12.2-1)
  ie            -    seismic importance factor
  hsx_in        in   story height
  drift_ratio   -    allowable drift coefficient (default 0.020)

delta_x = cd * delta_xe_in / ie                 in   (ASCE 12.8-15)
delta_a = drift_ratio * hsx_in                   in   (Table 12.12-1)
ok      = delta_x <= delta_a
util    = delta_x / delta_a
```

**Pinned worked example (Cd 5.5, delta_xe 0.5 in, 144 in story).** `delta_x = 5.5*0.5/1.0 = 2.75 in`;
`Delta_a = 0.020*144 = 2.88 in`; `2.75 <= 2.88` -> **OK** (utilization `0.955`). **Cross-check (a softer frame fails).**
`delta_xe = 0.6 in` gives `delta_x = 3.30 in > 2.88 in` -> **not OK**, stiffen the frame. A non-positive drift, height, `Cd`,
or `Ie` takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, beside `seismic-base-shear`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, ASCE 7-22 §12.8.6 / §12.12, `editionNote` naming
`delta_x = Cd*delta_xe/Ie`, the `Delta_a = 0.020*hsx` limit and the `0.015`/`0.010` rows); `test/fixtures/worked-examples.json`
(the passing example + the failing cross-check); `test/fixtures/compute-map.js` (`seismic-story-drift` ->
`computeSeismicStoryDrift` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `seismic-base-shear` /
`seismic-design-spectral-acceleration` / `seismic-pdelta-stability` / `shearwall-deflection`); `data/search/aliases.json`
("seismic story drift", "story drift limit", "allowable drift", "Cd deflection amplification", "0.020 hsx drift",
"design story drift", "inelastic drift", "asce 12.8.6", "drift check"); the id appended to the existing construction
renderers block in `app.js`; the `// dims:` annotation (drifts/height length, Cd/Ie/ratio dimensionless); regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the pass/fail boundary, and the non-positive /
non-finite error seams. No new module; re-pin `calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the `delta_x` / `Delta_a` / pass pair wraps on a phone);
render-no-nan + a11y sweep, output read to the value (Cd 5.5, 0.5 in, 144 in -> 2.75 in vs 2.88 in, OK).

## 5. Roadmap position

The serviceability check that follows `seismic-base-shear`: v381 gives the spectral accelerations, base shear gives the
force, and this gives the drift. `seismic-pdelta-stability` (v383) reads this same design drift into the stability
coefficient to decide whether P-delta must be included. A Table 12.12-1 risk-category drift-limit selector is the deliberate
next follow-on.
