# roughlogic.com Specification v1297 -- Thick-Wall Cylinder Stress (Lame) (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group K, machinist/fabrication), no new module or dependency. Inherits spec.md through spec-v1296.md.
>
> **The gap (the sibling names the boundary).** `hoop-stress-thin-wall` gives `sigma = P D/(2t)` and states it is
> "valid for D/t >= 20." Below that -- a hydraulic-cylinder tube, a thick pipe, a gun barrel -- the wall is thick,
> the stress is not uniform through it, and the thin-wall formula under-predicts the peak, which sits at the BORE.
> This adds the **Lame** thick-wall equations that give the real stress distribution.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive pressure / inner radius / wall thickness, or an outer radius not greater than the inner, returns
`{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the Lame thick-wall cylinder
equations for internal pressure (Shigley, *Mechanical Engineering Design*; Roark's Formulas for Stress and Strain),
by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `thick-wall-cylinder-stress` -- Thick-Wall Cylinder Stress (Lame)

```
ro = ri + t
sigma_hoop(bore)   = P (ro^2 + ri^2)/(ro^2 - ri^2)      max tangential (at the inner radius)
sigma_hoop(outer)  = 2 P ri^2/(ro^2 - ri^2)
sigma_radial(bore) = -P                                  (compressive, equals the pressure)
sigma_long(closed) = P ri^2/(ro^2 - ri^2)                capped ends
```

Internal pressure only. The hoop (tangential) stress is largest at the bore and falls toward the outer wall, so a
thick cylinder yields from the inside out. The thin-wall estimate `P D/(2t)` is shown alongside; for `D/t` under 20
it runs low, which is why a high-pressure tube must use Lame.

**Inputs:** internal pressure P (psi), inner radius ri (in), wall thickness t (in).

**Outputs:** hoop stress at the bore and outer wall (psi), radial stress at the bore, longitudinal stress
(closed ends), the D/t ratio, and the thin-wall estimate for comparison.

## 3. Worked example

A hydraulic cylinder tube, 4 in bore (ri 2 in), 0.5 in wall, 3,000 psi:

```
ro = 2.5,  ro^2 - ri^2 = 2.25
sigma_hoop(bore)  = 3000 (6.25 + 4)/2.25 = 13,667 psi
sigma_hoop(outer) = 2 x 3000 x 4/2.25    = 10,667 psi
sigma_long        = 3000 x 4/2.25        =  5,333 psi,  sigma_radial(bore) = -3,000 psi
```

The D/t is 8 -- well into thick-wall territory -- so the thin-wall `P D/(2t) = 12,000 psi` runs about 14% below the
true 13,667 psi bore stress. Designing that tube on the thin-wall number would leave the bore under-stressed on
paper and over-stressed in fact.

## 4. Scope and non-goals

The static Lame stresses for a single-material cylinder under internal pressure; external pressure, interference
(press) fit (`press-fit-pressure`), compound/autofrettaged tubes, end-cap details, and buckling are separate. Use a
safety factor against the material yield with a suitable failure theory. A design aid; Shigley / Roark and the
engineer of record govern.
