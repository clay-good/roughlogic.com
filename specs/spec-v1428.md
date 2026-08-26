# roughlogic.com Specification v1428 -- Attached Canopy and Awning Wind Uplift and Snow Load (calc-construction.js, Group E, specialty trades, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, specialty trades), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes wind on a freestanding sign or wall and snow on a roof, but nothing for an attached canopy or awning -- the structure that hangs off a wall over an entrance and is held on by anchors working in tension. On a canopy the governing case is uplift, not gravity, and the anchors are the whole design.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive projection, width, wind speed, or ground snow load, or a net pressure coefficient of zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the attached-canopy net pressure coefficients of ASCE 7 Chapter 29 and the flat-roof snow relation pf = 0.7 Ce Ct Is pg of ASCE 7 Chapter 7, cited by chapter and linked (no ASCE table is reproduced), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `awning-canopy-load` -- Attached Canopy and Awning Wind Uplift and Snow Load

```
canopy area   = projection x width
q             = 0.00256 x V^2 x Kz x Kzt x Kd
wind pressure = q x net pressure coefficient Cn       (uplift is negative, downward positive)
wind force    = wind pressure x canopy area
snow pf       = 0.7 x Ce x Ct x Is x ground snow pg
snow force    = pf x canopy area
governing     = the larger of uplift and gravity, checked separately
```

A canopy is open underneath, so wind acts on **both** faces at once -- pressure on top and suction below, or the
reverse. ASCE 7 handles that with a *net* pressure coefficient rather than the separate external and internal
coefficients used on an enclosed building, and the net coefficients for an attached canopy are substantial in both
directions.

That is what makes a canopy different from a roof. On a roof, gravity is the design case and wind uplift is a
check. On a canopy the uplift case frequently governs outright, and it loads the wall anchors in **tension** and
the connection in **prying** -- the two load directions that masonry and stud walls are worst at, and the two that
get detailed casually because the canopy looks light.

Both cases have to be run, because the two loads come from different weather. The snow case governs the members
and the deflection; the uplift case governs the anchors.

**Inputs:** canopy projection and width, height above grade, basic wind speed, Kz, Kzt, Kd, net pressure
coefficient for uplift and for downward pressure, ground snow load, Ce, Ct, Is.

**Outputs:** canopy area, velocity pressure, uplift and downward wind pressure and total force, flat-roof snow
load and total force, and which case governs.

## 3. Worked example

A 12 ft projection x 20 ft wide attached canopy, basic wind speed 115 mph, Kz 0.98, Kzt 1.0, Kd 0.85, net uplift
coefficient Cn = 1.2; ground snow 30 psf with Ce, Ct, Is all 1.0:

```
area          = 12 x 20                          = 240 sq ft
q             = 0.00256 x 115^2 x 0.98 x 0.85    = 28.2 psf
uplift        = 28.2 x 1.2                       = 33.8 psf -> 8,122 lb up
snow pf       = 0.7 x 30                         = 21.0 psf -> 5,040 lb down
```

Uplift beats snow by 60% and it acts the wrong way -- so the anchors have to hold more than four tons in tension
plus the prying moment, while the canopy's own dead weight (perhaps 800 lb) offsets only a tenth of it. That is
the number that decides whether this canopy is through-bolted with backing plates or lagged into a stud, and it is
the number nobody runs before the second one blows off.

## 4. Scope and non-goals

**Load only. This is not a canopy design.** It does not size members, connections, or anchors, does not compute
the prying and eccentric moment at the wall, and does not check the wall or its backup for the tension it is being
asked to carry -- which on masonry is frequently the actual limit. All of Kz, Kzt, Kd, Cn, Ce, Ct, and Is are ASCE
7 values that depend on exposure, height, topography, building risk category, canopy geometry, and clearance, and
this tile determines none of them; a wrong Cn moves the answer by a factor. Fabric awnings behave differently
again, with their own membrane and frame considerations and their own failure mode. Drifting and sliding snow from
the roof above a canopy can far exceed the flat-roof value and is not modeled. Canopies are permitted structures
in most jurisdictions. ASCE 7, the structural engineer, and the AHJ govern.
