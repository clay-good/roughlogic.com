# roughlogic.com Specification v383 -- Seismic P-Delta Stability Coefficient (ASCE 7-22 12.8.7) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Third and final tile of the seismic-parameters trio (v381 spectral -> v382 story drift ->
> v383 P-delta). It reads the design story drift `seismic-story-drift` produces and decides whether the gravity-on-sway
> P-delta effect can be ignored, must be amplified, or makes the structure unstable.**
> In-scope catalog expansion under the spec-v106 trades-only charter. When a building sways under earthquake, the gravity
> load above a story acts through that sway and adds moment -- the P-delta effect. ASCE 7-22 §12.8.7 measures it with the
> stability coefficient `theta = Px * Delta * Ie / (Vx * hsx * Cd)`: if `theta <= 0.10` P-delta may be neglected; if
> `0.10 < theta <= theta_max` the drifts and forces are multiplied by `1/(1 - theta)`; and if `theta > theta_max` the
> structure is potentially unstable and must be redesigned, where `theta_max = 0.5 / (beta * Cd) <= 0.25`. This adds the
> stability-coefficient tile to the existing **`calc-construction.js`** module (Group E), beside `seismic-base-shear`; no new
> group, trade, or dependency. Inherits spec.md through spec-v382.md.
>
> **The gap, and the evidence for it.** With `Px = 400 kip` of gravity above the story, a design drift `Delta = 2.75 in`
> (from `seismic-story-drift`), `Ie = 1.0`, a story shear `Vx = 80 kip`, `hsx = 144 in`, and `Cd = 5.5`,
> `theta = 400 * 2.75 * 1.0 / (80 * 144 * 5.5) = 0.017`, well below `0.10` -- P-delta is negligible. A soft, heavily-loaded
> story (`Px = 1000 kip`, `Delta = 5.0 in`, `Vx = 40 kip`, `hsx = 120 in`) gives `theta = 0.189`, above
> `theta_max = 0.5/(1.0*5.5) = 0.091` -- potentially unstable, redesign. No tile computes this; the catalog had base shear
> and (with v382) drift, but never the stability check that decides whether the design is safe against P-delta collapse.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The gravity load `Px` and the
story shear `Vx` are forces (kip); the design drift `Delta` and the story height `hsx` are lengths (in); `Ie`, `Cd`, and
`beta` are dimensionless; the stability coefficient `theta` and its limit `theta_max` are dimensionless. The v18/v21
contract: any non-finite input, or a non-positive `Vx`, `hsx`, `Cd`, or `beta`, returns `{ error }`; `beta` (shear
demand/capacity ratio) defaults to `1.0` when unknown (the conservative choice), and the tile returns `theta`, `theta_max`,
the three-way verdict (neglect / amplify by `1/(1-theta)` / redesign), and the amplifier when it applies. Citation
discipline (v19/v22): `GOVERNANCE.general` over the ASCE 7 stability coefficient by name; `editionNote` names **ASCE 7-22
§12.8.7 `theta = Px*Delta*Ie/(Vx*hsx*Cd)`, the `theta <= 0.10` neglect threshold, the `theta_max = 0.5/(beta*Cd) <= 0.25`
cap, and the `1/(1-theta)` amplification when `0.10 < theta <= theta_max`**, and states that **this returns the P-delta
stability coefficient and its verdict, that `Delta` is the design story drift (from `seismic-story-drift`), that `beta = 1.0`
is the conservative default, and that it is a design aid, not a substitute for the engineer of record**.

## 2. The tile

### 2.1 `seismic-pdelta-stability` -- Seismic P-Delta Stability Coefficient (ASCE 7-22)

```
inputs:
  px_kip     kip   total gravity design load at and above the story
  delta_in   in    design story drift (from seismic-story-drift)
  ie         -     seismic importance factor
  vx_kip     kip   seismic story shear between levels x and x-1
  hsx_in     in    story height
  cd         -     deflection amplification factor
  beta       -     shear demand/capacity ratio (default 1.0)

theta     = px_kip * delta_in * ie / (vx_kip * hsx_in * cd)
theta_max = min(0.5 / (beta * cd), 0.25)
verdict   = theta <= 0.10           -> neglect P-delta
            0.10 < theta <= theta_max -> amplify forces/drifts by 1/(1 - theta)
            theta > theta_max        -> potentially unstable, redesign
```

**Pinned worked example (Px 400 kip, Delta 2.75 in, Vx 80 kip, 144 in, Cd 5.5).**
`theta = 400*2.75*1.0/(80*144*5.5) = 0.017`; `theta_max = 0.5/(1.0*5.5) = 0.091`; `0.017 <= 0.10` -> **neglect P-delta**.
**Cross-check (a soft story is unstable).** `Px 1000 kip`, `Delta 5.0 in`, `Vx 40 kip`, `hsx 120 in`, `Cd 5.5`:
`theta = 0.189 > theta_max 0.091` -> **potentially unstable, redesign**. A mid-range `theta = 0.15` would instead return the
`1/(1-0.15) = 1.18` amplifier. A non-positive `Vx`, `hsx`, `Cd`, or `beta` takes the error path; the non-finite seam is
covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, beside `seismic-story-drift`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, ASCE 7-22 §12.8.7, `editionNote` naming the `theta` relation,
the `0.10` threshold, `theta_max = 0.5/(beta*Cd) <= 0.25`, and the `1/(1-theta)` amplifier); `test/fixtures/worked-examples.json`
(the neglect example + the unstable cross-check); `test/fixtures/compute-map.js` (`seismic-pdelta-stability` ->
`computeSeismicPdeltaStability` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `seismic-story-drift` /
`seismic-base-shear` / `seismic-design-spectral-acceleration` / `shearwall-overturning`); `data/search/aliases.json`
("p-delta stability", "stability coefficient theta", "p delta seismic", "theta max asce", "secondary moment seismic",
"12.8.7 stability", "p-delta amplification", "story stability", "theta 0.10"); the id appended to the existing construction
renderers block in `app.js`; the `// dims:` annotation (Px/Vx force, Delta/hsx length, rest dimensionless); regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the three-way verdict boundaries, the amplifier,
and the non-positive / non-finite error seams. No new module; re-pin `calc-construction.js` on the `check:module-sizes`
allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the three-way verdict, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `theta` / `theta_max` / verdict wraps on a
phone); render-no-nan + a11y sweep, output read to the value (Px 400, Delta 2.75, Vx 80 -> theta 0.017, neglect).

## 5. Roadmap position

Closes the seismic-parameters trio: v381 spectral accelerations, v382 story drift, v383 the P-delta stability that drift
triggers. Together with `seismic-base-shear` the equivalent-lateral-force procedure now runs from mapped `Ss`/`S1` through
force, drift, and stability. A vertical force-distribution tile (`Fx = Cvx*V`, §12.8.3) that supplies the per-story `Vx` is
the deliberate next follow-on.
