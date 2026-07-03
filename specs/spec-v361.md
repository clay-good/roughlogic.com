# roughlogic.com Specification v361 -- Thin-Wall Pressure Vessel Hoop and Longitudinal Stress (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v359..v361 (the mechanics-of-materials-2 trio -- shaft torsion
> (v359), restrained thermal stress (v360), thin-wall hoop stress (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `pipe-pressure-rating` gives the ASME B31.1 code
> allowable pressure and wall for pipe, but the underlying membrane stresses -- the hoop and longitudinal stress in the wall
> of any thin-wall cylinder (a tank, a receiver, an accumulator, a boiler shell) under internal pressure -- have no general
> tile. The hoop stress is twice the longitudinal, the reason cylinders split along their length. Adds one tile to the
> existing **`calc-construction.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through
> spec-v360.md.
>
> **The gap, and the evidence for it.** For a thin-wall cylinder (`D/t > ~20`) the membrane stresses from internal pressure
> `P` are the hoop (circumferential) `sigma_h = P D/(2 t)` and the longitudinal (axial) `sigma_l = P D/(4 t)` -- the hoop
> exactly twice the longitudinal, which is why a pressurized cylinder fails by a long axial split, not a circumferential
> one. For a 12 in diameter tank with a 0.25 in wall at 150 psi, `sigma_h = 150 x 12/(2 x 0.25) = 3,600 psi` and
> `sigma_l = 1,800 psi`, and the `D/t = 48` confirms the thin-wall assumption. Compared to an allowable stress, these size
> the wall or rate the vessel. `pipe-pressure-rating` applies the piping code with its joint and temperature factors; this
> tile gives the raw membrane stresses for a general vessel.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The internal pressure `P`,
the allowable stress, and the hoop and longitudinal stresses are stresses (psi); the diameter `D` and wall thickness `t`
are lengths (in); the `D/t` ratio is dimensionless. The v18/v21 contract: any non-finite input, or a pressure, diameter,
or thickness at or below zero, returns `{ error }`; a `D/t` below ~20 is flagged as outside the thin-wall assumption
(thick-wall Lame stresses apply). Citation discipline (v19/v22): `GOVERNANCE.general` over the thin-wall membrane-stress
relations by name; `editionNote` names **the thin-wall hoop `sigma_h = P D/(2 t)` and longitudinal `sigma_l = P D/(4 t)`
(hoop = 2 x longitudinal), the `D/t > 20` thin-wall validity, and that `D` is the mean (or inner) diameter, from the
standard pressure-vessel references**, and states that **this returns the membrane hoop and longitudinal stresses of a
thin-wall cylinder under internal pressure -- it is the thin-wall approximation (a `D/t < 20` vessel needs the thick-wall
Lame equations), gives the membrane (not the discontinuity/bending) stresses away from heads and nozzles, and does not
apply the ASME BPVC/B31 code allowable, joint efficiency, or corrosion allowance (`pipe-pressure-rating` does that for
pipe); and this is a mechanics aid, not a code-stamped vessel rating** -- the ASME Boiler and Pressure Vessel Code and the
engineer of record govern.

## 2. The tile

### 2.1 `hoop-stress-thin-wall` -- Thin-Wall Pressure Vessel Hoop and Longitudinal Stress

```
inputs:
  P_psi     psi   internal pressure
  D_in      in    cylinder diameter (mean/inner)
  t_in      in    wall thickness
  S_allow   psi   allowable stress (optional, for check)

sigma_h = P_psi * D_in / (2 * t_in)                ; hoop stress, psi
sigma_l = P_psi * D_in / (4 * t_in)                ; longitudinal stress, psi
Dt = D_in / t_in                                    ; thin-wall check (>20 valid)
DCR = sigma_h / S_allow                             ; demand/capacity (if S given)
```

**Pinned worked example (a 12 in tank, 0.25 in wall, 150 psi).** `sigma_h = 150 x 12/(2 x 0.25) = 3,600 psi`;
`sigma_l = 150 x 12/(4 x 0.25) = 1,800 psi` (half the hoop); `D/t = 48` (thin-wall valid). Against a 15,000 psi allowable,
`DCR = 3,600/15,000 = 0.24`. **Cross-check (a smaller, thicker high-pressure receiver).** `D = 10 in`, `t = 0.5 in`,
`P = 200 psi`: `sigma_h = 200 x 10/(2 x 0.5) = 2,000 psi`, `sigma_l = 1,000 psi`, `D/t = 20` -- right at the thin-wall
boundary, so the tile flags that a thick-wall check is advisable, the transition where the simple `PD/2t` starts to under-
report the inner-surface stress. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding","pipefitting","construction"]`, matching the mechanics tiles); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the thin-wall membrane relations,
`editionNote` naming `sigma_h = P D/(2 t)`, `sigma_l = P D/(4 t)`, the `D/t > 20` validity, and the membrane-only,
not-code-allowable caveats); `test/fixtures/worked-examples.json` (the tank example + the thin-wall-boundary cross-check);
`test/fixtures/compute-map.js` (`hoop-stress-thin-wall` -> `computeHoopStressThinWall` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `pipe-pressure-rating` / `tank-volume` / `metal-weight` / `combined-stress-axial-bending`);
`data/search/aliases.json` ("hoop stress", "thin wall pressure vessel", "circumferential stress", "longitudinal stress",
"PD over 2t", "cylinder stress pressure", "tank wall stress", "pressure vessel stress", "membrane stress"); the id appended
to the existing construction renderers block in `app.js`; the `// dims:` annotation (`P`/`S`/stresses stress, `D`/`t`
length, `D/t`/`DCR` dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the hoop = 2 x longitudinal identity, the `D/t > 20` flag, and the non-positive / non-finite error seams. No new
module; re-pin `calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the hoop-twice-longitudinal assertion); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `sigma_h` / `sigma_l` / `D/t`
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (12 in, 0.25 in, 150 psi -> 3,600 / 1,800
psi).

## 5. Roadmap position

Closes the mechanics-of-materials-2 batch (v359..v361) in `calc-construction.js`: shaft torsion, restrained thermal stress,
and thin-wall hoop stress now round out the stress toolkit beside the beam, section, and combined-stress tiles. The thick-
wall Lame stresses for `D/t < 20`, a spherical-vessel (`PD/4t` both ways) variant, and a combined pressure-plus-axial (von
Mises) vessel check are the deliberate next follow-ons once the trio lands.
