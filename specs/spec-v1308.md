# roughlogic.com Specification v1308 -- Terminal Velocity (Aerodynamic Drag) (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic/rigging/fire), no new module or dependency. Inherits spec.md through spec-v1307.md.
>
> **The gap.** `free-fall-drop` gives the no-drag impact speed (which keeps growing with height), and
> `aerodynamic-drag-force` gives the drag at a speed, but nothing computes the **terminal velocity** where the two
> balance -- the speed a falling object actually stops accelerating at. It caps the free-fall number for a light or
> bluff object (a dropped sheet of plywood, a person, hail) and is the honest speed for a long fall.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive weight / frontal area / drag coefficient / air density returns `{ error }`; no numeric field is ever
`Infinity`. Citation discipline (v19/v22): the terminal-velocity balance `W = 1/2 rho V^2 Cd A` solved for V
(standard fluid mechanics), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `terminal-velocity` -- Terminal Velocity from Weight, Area, and Drag

```
rho_mass = rho_weight / g               (g = 32.174 ft/s^2)
V_t = sqrt( 2 W / (rho_mass Cd A) )     speed where drag equals weight (ft/s)
```

At terminal velocity the aerodynamic drag `1/2 rho V^2 Cd A` exactly balances the weight `W`, so the object stops
accelerating. Heavy, compact, slick objects (small `A`, small `Cd`, big `W`) fall fast; light, bluff ones settle
slowly. This is the ceiling that `free-fall-drop` (no drag) ignores.

**Inputs:** object weight W (lb), frontal area A (ft^2), drag coefficient Cd, air density (lb/ft^3, default 0.0765).

**Outputs:** terminal velocity (ft/s and mph).

## 3. Worked example

A skydiver, weight 180 lb, frontal area 7 ft^2, Cd 0.7, standard air:

```
rho_mass = 0.0765 / 32.174 = 0.002378 slug/ft^3
V_t = sqrt( 2 x 180 / (0.002378 x 0.7 x 7) ) = 175.8 ft/s = 120 mph
```

That 120 mph is the familiar belly-to-earth skydiver terminal velocity. A compact 5 lb tool (A 0.1 ft^2, Cd 1.0)
terminals near 140 mph -- so over a short jobsite drop it is still accelerating and `free-fall-drop` is right, but a
sheet of plywood or a person tops out and falls no faster no matter the height.

## 4. Scope and non-goals

The steady terminal velocity for a constant drag coefficient in still air; the distance and time to REACH terminal
(an exponential approach), tumbling or orientation changes that alter Cd and A, compressibility, and altitude density
change are separate. Pair with `free-fall-drop` (no-drag speed) and `aerodynamic-drag-force`. A planning estimate;
field conditions govern.
