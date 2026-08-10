# roughlogic.com Specification v1291 -- Aerodynamic Drag Force and Power (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic/auto), no new module or dependency. Inherits spec.md through spec-v1290.md.
>
> **The gap.** The catalog has Stokes creeping-flow settling (`particle-settling-velocity`) but no **bluff-body
> aerodynamic drag** -- the `F = 1/2 rho V^2 Cd A` every auto, truck, and aero calc rests on. It is the reason a
> vehicle needs so much more power at highway speed (drag power grows with the cube of speed), and it sizes the
> engine load to hold a cruise. This adds the drag force and the power to overcome it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive speed / frontal area / drag coefficient / air density returns `{ error }`; no numeric field is ever
`Infinity`. Citation discipline (v19/v22): the drag equation `F = 1/2 rho V^2 Cd A` and the drag power `P = F V`
(standard fluid mechanics; SAE road-load), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `aerodynamic-drag-force` -- Aerodynamic Drag Force and Power

```
rho_mass = rho_weight / g            (g = 32.174 ft/s^2)
V_fps = V_mph x 1.46667
F = 1/2 rho_mass V_fps^2 Cd A         drag force (lbf), A the frontal area
P = F V_fps                           power to overcome drag (ft-lbf/s -> hp / kW)
```

`Cd` is the shape drag coefficient (a modern car ~0.30, a pickup ~0.45, a semi tractor-trailer ~0.6-0.8, a
motorcycle+rider ~0.6, a flat plate ~1.28, a sphere ~0.47, a streamlined body ~0.04). Because `P` grows with the
cube of speed, the power to push through the air at 80 mph is about 1.5x that at 70.

**Inputs:** speed V (mph), frontal area A (ft^2), drag coefficient Cd, air density (lb/ft^3, default 0.0765
sea-level standard).

**Outputs:** drag force (lbf), drag power (hp and kW), and the dynamic pressure (lb/ft^2).

## 3. Worked example

A car at 70 mph, frontal area 24 ft^2, Cd 0.30, standard air:

```
rho_mass = 0.0765/32.174 = 0.002378 slug/ft^3,  V = 70 x 1.46667 = 102.7 ft/s
F = 0.5 x 0.002378 x 102.7^2 x 0.30 x 24 = 90.2 lbf
P = 90.2 x 102.7 / 550 = 16.8 hp = 12.6 kW
```

That 16.8 hp is just the aero drag -- add rolling resistance and driveline losses for the total road load. Speed up
to 80 mph and the drag power jumps to 25.1 hp, the cube-law penalty (80/70)^3 = 1.49 that makes high-speed cruising
so thirsty.

## 4. Scope and non-goals

The aerodynamic drag force and the power to overcome it for a bluff body in steady air; rolling resistance,
driveline loss, grade, headwind, lift, and compressibility (high subsonic) are separate. The drag coefficient and
frontal area are the user's (from the vehicle or a wind-tunnel value). A planning estimate; the manufacturer's
road-load data governs.
