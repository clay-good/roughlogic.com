# roughlogic.com Specification v1294 -- Band Brake / Capstan Torque (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic/machinist), no new module or dependency. Inherits spec.md through spec-v1293.md.
>
> **The gap (a sibling names it).** `disk-clutch-torque` (spec-v1289) names "band brakes are separate," and the
> catalog has no **capstan / band-brake** calc at all. The Eytelwein (belt-friction) relation `T1/T2 = e^(mu theta)`
> is the physics behind a band brake, a rope around a bollard or winch, and a capstan -- the exponential grip that
> lets a small hold force restrain a large load. This adds the band-brake braking torque and the tension ratio.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive slack tension / wrap angle / drum radius, or a negative friction coefficient, returns `{ error }`; no
numeric field is ever `Infinity`. Citation discipline (v19/v22): the Eytelwein / capstan belt-friction relation
`T1 = T2 e^(mu theta)` and the band-brake torque `T = (T1 - T2) r` (Shigley, *Mechanical Engineering Design*, Ch. 16;
capstan equation), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `band-brake-torque` -- Band Brake / Capstan Torque

```
theta_rad = wrap angle in radians
T1 = T2 e^(mu theta_rad)             tight side from slack side (Eytelwein)
T_brake = (T1 - T2) r                braking torque on the drum, r = drum radius
```

`T2` is the slack-side (actuating) tension you apply, `mu` the band-to-drum friction, `theta` the wrap angle, and
`r` the drum radius. The tension ratio `e^(mu theta)` climbs fast with wrap: a 270-degree wrap at mu 0.3 multiplies
the applied tension by 4.1, and a full turn by 6.6 -- the same reason a couple of turns of rope on a bollard hold a
boat. A band brake whose anchored end is the tight side is self-energizing (the drum's rotation tightens it).

**Inputs:** slack-side (actuating) tension T2 (lbf), wrap angle (deg), band-to-drum friction coefficient mu, drum
radius (in).

**Outputs:** tight-side tension T1 (lbf), tension ratio, and braking torque (in-lbf and ft-lbf).

## 3. Worked example

Slack tension 50 lbf, 270-degree wrap, mu 0.3, 6 in drum radius:

```
theta = 270 deg = 4.712 rad,  T1/T2 = e^(0.3 x 4.712) = 4.11
T1 = 50 x 4.11 = 205.6 lbf
T_brake = (205.6 - 50) x 6 = 933 in-lbf = 78 ft-lbf
```

A 50 lbf pull at the lever holds back 933 in-lbf of drum torque -- and wrapping the band another 90 degrees to a full
turn would raise the ratio to 6.6 and the torque with it. That exponential is the whole appeal of a band brake.

## 4. Scope and non-goals

The capstan tension ratio and the resulting band-brake torque; the lever geometry that sets the actuating force,
self-energizing sign, band stress and width, and heat of braking are separate. The friction coefficient is the
user's (band lining on the drum). A design aid; Shigley and the brake maker govern.
