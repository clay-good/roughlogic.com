# roughlogic.com Specification v1271 -- Discrete-Particle Settling Velocity (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-08-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`**
> (Group M, water and wastewater operations), no new module or dependency. Inherits spec.md through spec-v1270.md.
>
> **The gap (sibling names it).** Stokes' law is embedded inside the `oil-water-separator-sizing` tile as the RISE
> velocity of a floating oil droplet (SG < 1), and that tile explicitly forbids a denser-than-water particle. Nothing
> computed the SETTLING velocity of a dense grit, sand, or floc particle -- the workhorse of grit-chamber and Type I
> sedimentation-basin design. This adds it, with the particle-Reynolds regime check the separator tile lacks.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive diameter, a specific gravity at or below 1 (a lighter particle floats -- see `oil-water-separator-sizing`),
or a water temperature outside the liquid range (32-212 F) returns `{ error }`. Citation discipline (v19/v22):
Stokes' law, first-principles (Davis & Cornwell, *Introduction to Environmental Engineering*), `GOVERNANCE.water`.
Computed in SI.

## 2. The tile

### 2.1 `particle-settling-velocity` -- Discrete-Particle Settling Velocity (Stokes' Law)

```
Vs = g (rho_p - rho_w) d^2 / (18 mu)          (m/s; reported in mm/s and ft/min)
Re = rho_w Vs d / mu                           (particle Reynolds number)
mu = 2.414e-5 x 10^(247.8/(T_K - 140))         (water dynamic viscosity, Vogel correlation, N s/m^2)
rho_w = 999.84 + 0.0275 T_C - 0.00545 T_C^2    (water density, table fit, kg/m^3, 0-40 C)
rho_p = SG_p x 1000 kg/m^3;  d = diameter / 1000
```

Stokes' law assumes creeping (laminar) flow and holds only for **Re below about 1**; above that the drag rises
faster than Stokes predicts, so the tile reports Re and flags the regime (Stokes / transition / Newton).

**Inputs:** particle diameter (mm), particle specific gravity (> 1), water temperature (F, default 68).

**Outputs:** settling velocity (mm/s and ft/min), particle Reynolds number, flow-regime flag.

## 3. Worked example

0.05 mm silt grain, SG 2.65, 68 F (20 C) water:

```
mu = 2.414e-5 x 10^(247.8/(293.15 - 140)) = 1.0019e-3 N s/m^2   (matches the standard 1.002e-3 table value)
rho_w = 998.21 kg/m^3;  rho_p = 2650 kg/m^3;  d = 5e-5 m
Vs = 9.81 x (2650 - 998.21) x (5e-5)^2 / (18 x 1.0019e-3) = 2.246e-3 m/s = 2.246 mm/s = 0.442 ft/min
Re = 998.21 x 2.246e-3 x 5e-5 / 1.0019e-3 = 0.112   ->  Stokes regime valid
```

Cross-check: a 0.5 mm sand grain (10x the diameter) settles 100x faster (d^2) and reaches Re ~ 112 -- outside the
Stokes regime, so the tile flags it (the true velocity is lower; the transition/Newton law applies). Colder, more
viscous water settles the same grain more slowly (39 F -> 1.45 mm/s).

## 4. Scope and non-goals

A discrete (Type I) settling screen for a single spherical particle in still water. Flocculent settling (which
accelerates as particles coalesce), hindered and compression settling at high solids, non-spherical particle shape,
and basin short-circuiting are all separate. The overflow rate of an ideal clarifier equals this critical settling
velocity, but basin sizing, weir loading, and the removal of a particle-size distribution are the engineer's.
Distinct from the rising-oil-droplet `oil-water-separator-sizing` (SG < 1). A first-principles estimate; the
engineer of record governs the unit.
