# roughlogic.com Specification v1428 -- Freestanding Sign Wind Load, Base Shear, and Overturning (calc-construction.js, Group E, specialty trades, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, specialty trades), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes wind loads on roofs, walls, and PV arrays but not on a sign, which is the most common freestanding wind-loaded structure a contractor builds and the one most often built without a calculation. A sign is nearly pure sail area on a pole, so the base moment is large and the foundation is the whole job.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive sign area, wind speed, height, or force coefficient, or a velocity-pressure or gust factor at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the ASCE 7 velocity-pressure relation q = 0.00256 V^2 Kz Kzt Kd and the solid-freestanding-sign force coefficients of ASCE 7 Chapter 29, cited by chapter and linked (no ASCE table is reproduced), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `freestanding-sign-wind` -- Freestanding Sign Wind Load, Base Shear, and Overturning

```
q       = 0.00256 x V^2 x Kz x Kzt x Kd        (psf, V in mph)
force   = q x G x Cf x sign area
base shear   = force
base moment  = force x height to the centroid of the sign face
```

A sign has no shape to shed wind and no interior to relieve pressure -- the force coefficient for a solid
freestanding sign is well above 1.0 and depends on the aspect ratio and on how far the sign sits above the ground,
because a sign held clear of grade sees flow under it as well as over. ASCE 7 Chapter 29 tabulates those
coefficients and this tile takes one as an input rather than reproducing the table.

The base moment is where sign design lives. Force acts at the centroid of the face, which on a pole sign is high,
so the moment at the base is force times a long lever arm -- and it is the moment, not the shear, that sizes the
pole, the base plate, the anchor bolts, and the drilled pier. A sign whose face is doubled in area *and* raised
does not double the foundation; it can easily triple it.

**Inputs:** sign face width and height, height to the centroid, basic wind speed, velocity-pressure exposure
coefficient Kz, topographic factor Kzt, directionality factor Kd, gust-effect factor G, and the force coefficient
Cf.

**Outputs:** velocity pressure, design wind force, base shear, base overturning moment, and the pressure in psf
across the face.

## 3. Worked example

A 6 ft x 10 ft sign face (60 sq ft) with its centroid 14 ft above grade, basic wind speed 115 mph, Kz 0.98,
Kzt 1.0, Kd 0.85, G 0.85, Cf 1.35:

```
q           = 0.00256 x 115^2 x 0.98 x 1.0 x 0.85 = 28.2 psf
force       = 28.2 x 0.85 x 1.35 x 60             = 1,942 lb
base shear  = 1,942 lb
base moment = 1,942 x 14                          = 27,184 ft-lb
```

Twenty-seven thousand foot-pounds at the base of a single pole. That is the number that sizes everything below
it, and it is far more foundation than the sign's 400 lb dead weight would ever suggest. Raise the same sign so
the centroid sits at 20 ft and the moment goes to 38,834 ft-lb -- a 43% increase in foundation demand from moving
the sign up six feet, with no change to the sign itself.

## 4. Scope and non-goals

**A load calculation, not a design.** It computes the demand and stops: it does not size the pole, the base plate,
the anchor bolts, the weld, or the foundation, and it does not check the sign face, its attachment, or the
deflection. Kz, Kzt, Kd, G, and Cf are all ASCE 7 values that depend on exposure category, site topography,
building classification, and the sign's own geometry and clearance above grade -- entering a wrong one moves the
answer by a large factor, and this tile does not determine any of them. Signs are permitted structures in nearly
every jurisdiction and structural sign design is stamped engineering. ASCE 7, the structural engineer, and the AHJ
govern.
