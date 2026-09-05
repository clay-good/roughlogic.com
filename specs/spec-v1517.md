# roughlogic.com Specification v1517 -- Underground Face Airflow and Velocity (`calc-mining.js`, Group E Carpentry and Construction, underground, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mining.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mining, quarry, and drill-and-blast), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An underground heading is a dead end, and the only thing that clears blasting fumes, diesel exhaust, and dust out of it is the air a fan pushes to the face through tubing. The quantity is set by the largest of several requirements, and the one that governs is not always the obvious one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive heading width, height, airflow, or tubing efficiency, or a tubing efficiency above one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the face-velocity and diesel-dilution criteria with MSHA and the mine ventilation plan named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`mine face ventilation`, `heading airflow tubing`, `auxiliary ventilation face velocity`, `diesel ventilation underground`, `blast fume ventilation heading`.

## 2. The tile

### 2.1 `mine-face-ventilation` -- Underground Face Airflow and Velocity

```
face velocity     v = Q / A          (heading cross-section)
diesel requirement Q >= diesel ventilation rate x equipment in the heading
dust and fume     minimum velocity to sweep the face, commonly 60 fpm or higher
tubing delivery   Q_face = Q_fan x efficiency   (leakage over the tubing run)
duct end setback  the tubing end must reach within a few diameters of the face
```

Four requirements compete and the largest wins: enough velocity to sweep the face, enough volume to dilute
diesel exhaust for every machine working there, enough to clear blast fumes in the required re-entry time, and
enough to control dust and any gas the strata make. Diesel dilution is very often the governing one, because the
required air per unit of diesel power is large and it is additive across machines.

The number that gets missed is tubing leakage. A long run of ventilation tubing with bad couplings delivers a
fraction of what the fan moves, and the crew at the face experiences the delivered flow, not the fan's rating.
Measuring at the face rather than at the fan is the field discipline this tile is meant to support, and the gap
between the two is the maintenance finding.

The tubing end setback matters as much as the quantity. Air discharged too far back does not reach the face at
all -- it short-circuits and returns along the heading, leaving a dead zone exactly where people work.

**Inputs:** heading width and height, fan airflow, tubing efficiency or the measured flow at the face, the diesel equipment in the heading with its ventilation requirement, and the required minimum face velocity

**Outputs:** the heading cross-sectional area, the face velocity at the delivered flow, the flow required by each criterion, the governing requirement, the delivered-versus-fan flow gap, and the maximum diesel equipment the delivered air supports

## 3. Worked example

A 18 by 14 ft heading, fan rated 25,000 cfm, tubing delivering 70% to the face:

```
area          = 18 x 14          = 252 sq ft
delivered     = 25,000 x 0.70    = 17,500 cfm
face velocity = 17,500 / 252     = 69 fpm
```

69 fpm at the face, against a 60 fpm sweep minimum -- adequate on velocity. But check diesel: a loader
and a haul truck requiring 10,000 cfm each need 20,000 cfm, and the heading is delivering 17,500. **Diesel
governs and the heading is short**, even though the velocity check passed.

The tubing gap is the fixable part: 25,000 cfm at the fan and 17,500 at the face means 7,500 cfm is being lost to
leaks. Bringing tubing efficiency to 90% delivers 22,500 cfm and clears the diesel requirement with no new fan
and no new tubing -- just couplings and repairs. That is a maintenance job that a measurement at the face
identifies and a measurement at the fan never will.

## 4. Scope and non-goals

A comparison of delivered airflow against requirements the user supplies. It does not calculate tubing
leakage, pressure loss, or fan selection, and it does not determine the required diesel ventilation rate, which
is set by regulation per unit of engine power and differs between MSHA metal/nonmetal, MSHA coal, and other
jurisdictions. It does not evaluate methane or other strata gas, which in gassy mines governs everything and
carries its own statutory limits and monitoring; it does not evaluate radon, silica, or diesel particulate
matter exposure, which are health standards with their own sampling requirements. It does not compute blast
re-entry time, which is `blast-fume-clearance-time`. Underground ventilation is a regulated, engineered system:
the mine ventilation plan, the ventilation engineer, and MSHA govern.
