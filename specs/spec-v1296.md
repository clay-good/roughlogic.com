# roughlogic.com Specification v1296 -- Helical Torsion Spring Rate and Torque (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic/machinist), no new module or dependency. Inherits spec.md through spec-v1295.md.
>
> **The gap.** The spring family covers the compression coil (`helical-spring-rate`, `spring-wire-stress`,
> `spring-natural-frequency`) but not the **torsion spring** -- the one that counterbalances a garage door, snaps a
> clothespin, or returns a hinge. A torsion spring loads its wire in BENDING, not torsion, so it has its own rate
> equation. This adds the rate, the torque at a given angular deflection, and the bending stress.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive wire diameter / mean coil diameter / active coils, a mean coil not larger than the wire, a negative
deflection, or an unknown material returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the helical torsion-spring rate `k' = d^4 E / (10.8 D Na)` and the Wahl bending correction (Shigley,
*Mechanical Engineering Design*, Ch. 10; Machinery's Handbook), by name, `GOVERNANCE.general`. Adds a Young's-modulus
field to the existing `SPRING_MATERIALS` map (additive; the other spring tiles read only G and gamma).

## 2. The tile

### 2.1 `torsion-spring-rate` -- Helical Torsion Spring Rate, Torque, and Stress

```
k' = d^4 E / (10.8 D Na)               rate, in-lbf per revolution (Young's modulus E, active coils Na)
T  = k' x (deflection_deg / 360)       torque at the angular deflection
C  = D/d,  Kb = (4C^2 - C - 1)/(4C(C - 1))     Wahl bending factor for round wire
sigma = Kb x 32 T / (pi d^3)           max bending stress in the wire
```

A torsion spring winds its coil tighter, loading the wire in bending, so its rate uses `E` (not the shear modulus
`G` of a compression spring). The rate is a torque per turn; wind it a fraction of a turn for a hinge, several turns
for a garage-door counterbalance.

**Inputs:** wire diameter d (in), mean coil diameter D (in), active coils Na, wind-up deflection (degrees), wire
material.

**Outputs:** rate (in-lbf per turn and per degree), torque at the deflection (in-lbf), and the max bending stress
(psi) with the spring index and Wahl factor.

## 3. Worked example

0.1875 in music-wire, 1.5 in mean coil, 30 active coils, wound 90 degrees:

```
k' = 0.1875^4 x 29.5e6 / (10.8 x 1.5 x 30) = 75.0 in-lbf per turn (0.208 in-lbf/deg)
T  = 75.0 x 90/360 = 18.8 in-lbf
C  = 8,  Kb = 1.10,  sigma = 1.10 x 32 x 18.8 / (pi x 0.1875^3) = 32,000 psi
```

The spring pushes back with 18.8 in-lbf at a quarter turn and stiffens linearly with wind-up: a full turn (four times
the 90-degree deflection) gives four times the torque and stress, 75 in-lbf and 128 ksi. That is why torsion springs
are wound only as far as the material's high bending allowable permits.

## 4. Scope and non-goals

The rate, torque, and bending stress of a round-wire helical torsion spring; the reduction in coil diameter as it
winds (which slightly raises the rate and can bind on the arbor), end-arm bending, and fatigue life are separate.
Compare the stress to the material's allowable bending stress (often 0.7-0.9 Sut for torsion springs). A design aid;
Machinery's Handbook / Shigley and the spring maker govern.
