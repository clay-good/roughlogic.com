# roughlogic.com Specification v1103 -- Formwork Stud / Wale Maximum Spacing (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1102.md.
>
> **The gap, and the evidence for it.** A self-declared gap: `formwork-tie-load`'s own note says "Wales
> and studs are sized separately," and a grep for `wale` returns nothing else in the repo.
> `formwork-pressure` gives the load and `shore-post-load` handles the vertical side; the member between
> the sheathing and the ties had no check. Discovery batch 1 flagged it as the real remainder after
> confirming tie spacing itself was a dupe.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: any
non-positive input returns `{ error }`. Renderer: `_simpleRenderer`.

## 2. The tile

### 2.1 `formwork-member-spacing` -- Formwork Stud / Wale Maximum Spacing

```
inputs:  pressure_psf (chain from formwork-pressure), tributary_in (spacing of what it supports),
         width_b_in / depth_d_in (DRESSED), fb_psi / fv_psi / e_psi (duration-adjusted),
         deflection_denominator (360)
compute: w = pressure x tributary / 144                     lb/in
         S = b d^2 / 6;  I = b d^3 / 12;  A = b d
         bending     L = sqrt(10 Fb S / w)                  from M = w L^2 / 10
         shear       L = (2/3 Fv b d) / (0.6 w)             from V = 0.6 w L
         deflection  L = cbrt(145 E I / (w x denominator))  from D = w L^4 / (145 EI) <= L/k
         max_spacing = MIN of the three
outputs: w_lb_per_in, w_plf, section_modulus_in3, moment_inertia_in4, area_in2, shear_capacity_lb,
         span_bending_in, span_shear_in, span_deflection_in, max_spacing_in, governing, note
```

**The three coefficients are derived, not formwork folklore.** For a uniformly loaded continuous beam on
three or more equal spans, the interior-support moment is exactly `wL^2/10`, the reaction there is exactly
`0.6wL`, and the end-span deflection is `0.0069 wL^4/EI` -- whose reciprocal, 144.9, is the familiar 145.
The spec records this because the numbers look like fudge factors and are not; anyone can check them
against a continuous-beam table.

**Worked example (pinned), and why it is the one chosen.** A 2x4 stud (1.5 x 3.5 dressed) under 600 psf at
12-in tributary, Fb 1,000, Fv 180, E 1.6e6, L/360: bending allows 24.75 in, deflection allows 41.03 in, and
**shear allows only 21.0 in -- shear governs.** That is the point of the tile: short, deep formwork members
are shear-controlled, and a user who sizes by bending alone over-spans by 18%.

## 3. Scope limits

Three-or-more-span condition only; two spans or a single simple span carry higher moments and are NOT this
case (stated in the note). Dressed dimensions and duration-adjusted allowables are the user's
responsibility, and both the field labels and the note say so -- unadjusted table values under-report the
spacing. Bending, shear, and deflection only: bearing at the supports, lateral bracing, and the ties
themselves are separate (`formwork-tie-load`). **ACI 347 and the engineer of record govern -- a formwork
failure is a collapse, not a redo**, and the note says that in those words.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `formwork-tie-load`. Fuzzer pins the
worked example and its governing mode, each of the three span formulas inverted independently (feeding the
returned span back through M = wL^2/10 reproduces Fb x S exactly, and likewise for shear and deflection),
the section-property identities, the exact inverse-sqrt scaling of the bending span with load, and error
seams.
