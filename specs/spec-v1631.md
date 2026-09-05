# roughlogic.com Specification v1631 -- Ceiling Plenum Return Path Pressure Drop (`calc-hvacsystems.js`, Group C HVAC, test and balance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; test and balance, controls, and acoustics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A ceiling plenum return has no ductwork and therefore no obvious resistance, so it gets left out of the fan's external static calculation. It is not zero, and on a large floor plate with many obstructions it is enough to make a fan miss its airflow.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive airflow, plenum area, or path length, or a negative pressure component returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the plenum velocity and path resistance screening approach with the adopted mechanical code named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`ceiling plenum return pressure drop`, `plenum return path resistance`, `return air plenum static`, `plenum velocity restriction`, `fan short on airflow return`.

## 2. The tile

### 2.1 `plenum-return-drop` -- Ceiling Plenum Return Path Pressure Drop

```
path resistance   the plenum is a low-velocity duct with obstructions
components        grille or opening loss, travel through the plenum, beams and joists,
                  fire and smoke dampers, cable trays, and the shaft entry
velocity          plenum velocity should stay low, commonly under 300 to 500 fpm at the
                  most restricted section
pressure          typically 0.05 to 0.25 in wc total, but far higher where the path is choked
consequence       an underestimated return path shows up as a fan short on airflow with
                  more static than designed
```

The plenum is a duct whose cross-section is whatever the structure left over, and its restriction is
concentrated at the places where that cross-section pinches: a beam line, a duct crossing the return path, a
bundle of conduit, or the opening into the return shaft. Air does not distribute itself evenly through a
plenum -- it takes the easiest path -- so a return that measures fine near the shaft can be starved at the far
corner of the floor.

The static consequence is what makes it a balancing issue rather than a design curiosity. If the fan's external
static was calculated assuming a negligible return path and the plenum actually costs 0.15 in wc, the fan is
delivering less than design at a higher static than expected, which looks like a supply-side problem and is not.
Measuring the pressure difference between the room and the plenum, and between the plenum and the shaft, is what
localizes it.

The other consequence is pressure relationships. A restricted return path makes the ceiling plenum more negative
relative to the space, which pulls air from wherever it can -- adjacent floors, shafts, and the exterior -- and can
undo the intended pressurization of the space entirely.

**Inputs:** return airflow, the plenum free cross-section at the most restricted point, the path length, the return grille or opening free area, the number and type of obstructions, and the shaft entry size

**Outputs:** the plenum velocity at the restricted section, the estimated pressure drop of each path component, the total return path resistance, the total added to the fan external static, and the plenum free area required to stay below a target velocity

## 3. Worked example

A floor returning 18,000 cfm through a ceiling plenum, with the path pinching to 4 ft wide by 14 in clear
under a beam line:

```
restricted area = 4 x (14/12)      = 4.67 sq ft
velocity        = 18,000 / 4.67    = 3,855 fpm
```

**Nearly 4,000 fpm** under that beam -- an order of magnitude above what a plenum should see, and the pressure
drop across it will be substantial. That single pinch point is the return path.

For a target of 400 fpm the path needs

```
area = 18,000 / 400 = 45 sq ft
```

which at 14 in clear means 39 ft of width -- so the air has to come through many beam bays rather than one, and
the design question is whether the openings and the routing actually let it.

The diagnostic use: a fan measured at 16,500 cfm against an 18,000 design, with 0.30 in wc more total static than
calculated, and a supply side that traverses correctly, is telling you the missing resistance is on the return.
Measuring room-to-plenum and plenum-to-shaft pressure differences finds it, and it is a construction fix -- cut
additional openings through the beam line -- rather than a fan fix.

## 4. Scope and non-goals

A screening estimate. Plenum airflow is genuinely three-dimensional and does not follow a single path, so a
one-dimensional velocity and pressure estimate is indicative only; the value here is in identifying a pinch point
and its magnitude, not in predicting a precise resistance. It does not model the distribution of return airflow
across a floor, which is what determines whether remote areas are served. It does not address the code
requirements that govern ceiling plenums used for return air: the combustibility of materials in the plenum, the
plenum-rated cable requirement, fire and smoke damper locations, and the restrictions on plenum returns in
certain occupancies. It does not evaluate space pressurization or the interaction with smoke control. The adopted
mechanical and fire codes, the design engineer, and the applicable balancing standard govern.
