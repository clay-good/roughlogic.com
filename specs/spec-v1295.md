# roughlogic.com Specification v1295 -- Centrifugal Force of a Rotating Mass (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic/machinist), no new module or dependency. Inherits spec.md through spec-v1294.md.
>
> **The gap.** `flywheel-energy` stores rotational kinetic energy, but nothing computes the **centrifugal force** a
> rotating mass throws outward -- the force that bursts a grinding wheel, shakes an unbalanced rotor, and stresses a
> flywheel rim. `F = (W/g) omega^2 r` is the most basic rotating-machinery number a millwright, machinist, or
> balancer needs. This adds it, with the g-multiple and the rim speed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive weight / radius / speed returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the centrifugal (centripetal) force `F = m omega^2 r = (W/g) omega^2 r` and rim speed `v = omega r`
(standard dynamics; Machinery's Handbook), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `centrifugal-force` -- Centrifugal Force of a Rotating Mass

```
omega = 2 pi N / 60             rad/s from rpm N
F = (W / g) omega^2 r           centrifugal force (lbf), g = 32.174 ft/s^2, r in ft
a_g = omega^2 r / g             acceleration in multiples of gravity
v = omega r                     rim (tangential) speed
```

The force climbs with the SQUARE of speed, so doubling the rpm quadruples the force -- which is why a small
imbalance is harmless at idle and violent at speed, and why a chipped grinding wheel that is safe by hand can
explode at operating rpm. The g-multiple shows how many times its own weight the part is throwing outward.

**Inputs:** mass weight W (lb), radius to the mass center r (in), rotational speed (rpm).

**Outputs:** centrifugal force (lbf), acceleration (g), and rim speed (ft/s and ft/min).

## 3. Worked example

A 2 lb mass at a 6 in radius spinning at 1,800 rpm:

```
omega = 2 pi x 1800 / 60 = 188.5 rad/s,  r = 0.5 ft
F = (2/32.174) x 188.5^2 x 0.5 = 1,104 lbf
a_g = 188.5^2 x 0.5 / 32.174 = 552 g,  v = 188.5 x 0.5 = 94.2 ft/s (5,655 ft/min)
```

A 2 lb part throws 1,104 lbf -- 552 times its own weight -- at 1,800 rpm, and four times that at 3,600. That is the
reason rotating equipment must be balanced and grinding wheels are speed-rated.

## 4. Scope and non-goals

The centrifugal force of a concentrated mass at a radius; the burst stress of a rim or disk, bearing reaction from
an imbalance couple, and the critical (whirl) speed are separate (`driveshaft-crit`, the gear/shaft stress tiles).
For a distributed rotor use the mass and the radius of its center of gravity. A design aid; Machinery's Handbook and
the equipment maker govern.
