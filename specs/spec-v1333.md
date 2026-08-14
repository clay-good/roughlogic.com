# roughlogic.com Specification v1333 -- Scotch-Yoke Simple Harmonic Motion (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, machine elements / mechanisms), no new module or dependency. Inherits spec.md through spec-v1332.md.
>
> **The gap.** The `slider-crank-piston-position` tile's note calls out "the pure-sinusoid position r(1 - cos theta)"
> as the thing rod obliquity makes the piston deviate from, and lists "piston velocity and acceleration" as separate.
> A scotch yoke IS that pure mechanism, and this tile supplies exactly those velocity and acceleration numbers.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive crank radius or speed, or an angle outside 0-360 degrees, returns `{ error }`; no numeric field is ever
`Infinity`. Citation discipline (v19/v22): the scotch-yoke simple harmonic motion (standard mechanism kinematics;
Machinery's Handbook), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `scotch-yoke-motion` -- Scotch-Yoke Simple Harmonic Motion

```
omega = 2 pi N / 60
x = r (1 - cos theta)         (displacement from one end)
v = r omega sin theta         (peak r*omega at mid-stroke, theta 90/270)
a = r omega^2 cos theta       (peak r*omega^2 at the ends, theta 0/180)
stroke = 2 r
```

A scotch yoke -- a crank pin riding in a slotted yoke -- converts steady rotation into **exact** simple harmonic
motion with no connecting rod, so there is no rod-angularity shift and the motion is symmetric about mid-stroke (the
slider is exactly at mid-stroke at 90 degrees, unlike the slider-crank). The speed peaks at mid-stroke and the
acceleration peaks at each **end**; the end acceleration times the reciprocating mass is the inertia force the frame
and bearings carry, and it grows with the **square** of the rpm.

**Inputs:** crank radius r (in, half the stroke), crank speed N (rpm), crank angle theta (deg).

**Outputs:** stroke (in), peak velocity (ft/s and in/s), peak acceleration (g and in/s^2), and the instantaneous
position / velocity / acceleration at the given angle.

## 3. Worked example

`r = 2 in`, `N = 300 rpm`, `theta = 45 deg`:

```
omega = 2 pi (300)/60 = 31.416 rad/s
stroke = 4 in
peak v = r*omega = 62.83 in/s = 5.236 ft/s   (at mid-stroke)
peak a = r*omega^2 = 1973.9 in/s^2 = 5.113 g (at the ends)
at 45 deg:  x = 2(1 - cos45) = 0.586 in,  v = 2*omega*sin45 = 44.43 in/s,  a = 2*omega^2*cos45 = 3.615 g
```

End/mid-stroke identities: at `theta = 0` the velocity is zero and the acceleration is at its peak; at `theta = 90`
the position is exactly `r` (mid-stroke), the velocity is at its peak, and the acceleration is zero. Doubling the rpm
quadruples the peak acceleration.

## 4. Scope and non-goals

An ideal rigid scotch yoke (exact SHM). The `slider-crank-piston-position` tile is the connecting-rod case (with
obliquity); friction, the yoke side thrust, clearance, and the driven-load force are separate. A design aid;
Machinery's Handbook and the machine builder govern.
