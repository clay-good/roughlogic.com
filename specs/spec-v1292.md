# roughlogic.com Specification v1292 -- Vehicle Road-Load Power (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic/auto), no new module or dependency. Inherits spec.md through spec-v1291.md.
>
> **The gap (the sibling names it).** `aerodynamic-drag-force` (spec-v1291) computes only the aero term and its note
> says "rolling resistance, driveline loss, grade... are separate parts of the road load." This builds the full
> **road load**: aero drag + rolling resistance + grade, and the tractive power to hold a steady speed -- the calc
> that sizes an engine or motor and drives EV range and fuel economy. It delegates the aero term to the drag tile so
> the two never drift.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive speed / weight / frontal area / drag coefficient / air density, or a negative rolling-resistance
coefficient, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the vehicle
road-load equation (aerodynamic drag + rolling resistance + grade; SAE J2263 / J1263 road-load), by name,
`GOVERNANCE.general`. The aero term is delegated to `computeAerodynamicDragForce`.

## 2. The tile

### 2.1 `vehicle-road-load-power` -- Vehicle Road-Load Force and Power

```
F_aero  = 1/2 rho V^2 Cd A                 (from aerodynamic-drag-force)
F_roll  = Crr W                            rolling resistance, Crr ~ 0.010-0.015 on pavement
F_grade = W sin(atan(grade%/100))          grade (gravity) load
F_total = F_aero + F_roll + F_grade
P = F_total V                              tractive power (hp / kW)
```

`W` is the vehicle weight, `Crr` the rolling-resistance coefficient, and `grade%` the road grade (rise/run x 100).
Rolling resistance is nearly constant with speed; aero grows with the square and its power with the cube; grade adds
a fixed pull equal to the weight times the slope. The tile reports the three-way force breakdown so you can see which
dominates.

**Inputs:** speed V (mph), vehicle weight W (lb), frontal area A (ft^2), drag coefficient Cd, rolling-resistance
coefficient Crr, grade (%), air density (lb/ft^3, default 0.0765).

**Outputs:** total tractive force (lbf), tractive power (hp and kW), and the aero / rolling / grade force breakdown.

## 3. Worked example

A 3,500 lb car at 70 mph, frontal area 24 ft^2, Cd 0.30, Crr 0.012, on the level:

```
F_aero = 90.2 lbf,  F_roll = 0.012 x 3500 = 42.0 lbf,  F_grade = 0
F_total = 132.2 lbf,  P = 132.2 x 102.7 / 550 = 24.7 hp
```

The aero term matches `aerodynamic-drag-force` exactly. Put the same car on a 5% grade and the grade load alone is
0.05 x 3500 = 175 lbf, so the total jumps to 307 lbf and 57 hp -- the climb, not the wind, now sets the power. That
breakdown is the whole point of the tile.

## 4. Scope and non-goals

Steady-speed road load and the tractive power at the wheels; acceleration (inertia), driveline efficiency, headwind,
and air-density change with altitude/temperature are separate (multiply by 1/eta for engine power, add the
mass x acceleration term for launch). The drag coefficient, frontal area, and rolling-resistance coefficient are the
user's. A planning estimate; the manufacturer's road-load coastdown data governs.
