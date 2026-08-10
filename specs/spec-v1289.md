# roughlogic.com Specification v1289 -- Disk Clutch / Brake Torque (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group K, mechanic/machinist), no new module or dependency. Inherits spec.md through spec-v1288.md.
>
> **The gap.** The power-transmission bench has belts (`belt-hp-transmitted`, `vbelt-drive`), gears, and now the
> power screw -- but nothing for the **friction torque a disk clutch or plate brake transmits** from its clamping
> force, a core Shigley Ch. 16 result used to size every automotive and machine clutch and disk brake. This adds it,
> both the uniform-wear (design) and uniform-pressure (new-facing) models.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive clamp force / friction / outer radius / friction-surface count, an inner radius not less than the
outer, or a non-finite result returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the disk-clutch friction torque under the uniform-wear and uniform-pressure assumptions (Shigley,
*Mechanical Engineering Design*, Ch. 16 -- clutches and brakes), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `disk-clutch-torque` -- Disk Clutch / Brake Friction Torque

```
Uniform wear:      T = F mu N (ro + ri) / 2                 (p max at the inner radius)
Uniform pressure:  T = (2/3) F mu N (ro^3 - ri^3)/(ro^2 - ri^2)
Max contact pressure (uniform wear):  p_max = F / (2 pi ri (ro - ri))
```

`F` is the axial clamping force, `mu` the facing friction coefficient, `ro`/`ri` the outer/inner friction radii, and
`N` the number of friction interfaces (a single-plate clutch has 2 faces, N = 2). Uniform wear is the design
standard because a worn facing wears fastest where pressure x velocity is highest, driving p x r to a constant; it
gives the lower, conservative torque. Uniform pressure applies to a fresh, rigid facing.

**Inputs:** clamp force F (lbf), friction coefficient mu, outer radius ro (in), inner radius ri (in), friction
surfaces N.

**Outputs:** transmitted torque (in-lbf) under uniform wear and under uniform pressure, and the max contact pressure.

## 3. Worked example

1,000 lbf clamp, mu 0.3, ro 3 in, ri 2 in, single friction face (N = 1):

```
Uniform wear:     T = 1000 x 0.3 x 1 x (3 + 2)/2 = 750 in-lbf
Uniform pressure: T = (2/3) x 1000 x 0.3 x 1 x (27 - 8)/(9 - 4) = 760 in-lbf
p_max = 1000 / (2 pi x 2 x 1) = 79.6 psi
```

The two models agree within about 1% here and converge as the friction ring narrows; uniform wear (750) is the value
you design to. A real single-plate automotive clutch clamps both faces (N = 2), doubling the torque to 1,500 in-lbf.

## 4. Scope and non-goals

The static friction torque a disk clutch or plate (disk) brake can transmit before slipping; the actuating force F
is an input (from the spring or hydraulic cylinder). Heat/energy of engagement, facing wear life, cone and drum
(band) brakes, and dynamic/self-energizing effects are separate. A design aid; Shigley and the facing maker govern.
