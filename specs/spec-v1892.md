# roughlogic.com Specification v1892 -- 120/240 V Generator Leg Balance (`calc-reliefpower.js`, Group A Electrical, emergency and temporary power, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefpower.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** A portable generator's wattage is split across two 120 V legs, and each leg has its own limit. A generator carrying two-thirds of its rated watts can still trip a leg breaker because everything was plugged into one side. `power-distro` assumes balanced legs; no tile adds up each leg of a 120/240 V source against its per-leg rating.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive generator rating returns `{ error }`; a negative load current returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): WINCO, *Portable Generator Load Balancing Guide* (L-1008), named as the method (a 240 V ampere loads both legs; a 120 V ampere loads one), NEC 445 and 590 cited by number for generator and temporary-installation requirements, the generator manufacturer's per-leg rating named as governing, GOVERNANCE.electrical.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`generator load balancing`, `balance generator legs`, `portable generator 120 240 split`, `generator neutral current`, `spider box leg load`.

## 2. The tile

### 2.1 `split-phase-leg-balance` -- 120/240 V Generator Leg Balance

```
leg rating     per-leg amperes = rated watts / 240 V (the data sheet may state it)
leg load       L1 A = sum of 240 V loads + sum of 120 V loads on L1
               L2 A = sum of 240 V loads + sum of 120 V loads on L2
neutral        |sum 120 V on L1 - sum 120 V on L2| (240 V loads carry none)
check          each leg against its per-leg rating, independently of the total
balanced       each leg = 240 V loads + (all 120 V loads) / 2
```

A 120/240 V generator is two 120 V sources sharing a neutral, and its rated wattage assumes both are loaded equally.
A 240 V load -- a well pump, a water heater, a dryer -- draws the same current on both legs. A 120 V load draws only on the
leg it is plugged into. So the total wattage says little about whether a leg is overloaded, and the leg that trips
first is the one with the refrigerator, the sump pump, and the microwave all on its side of the panel.

The tile adds each leg separately and compares it with the per-leg rating, which is half the generator's wattage at
120 V, or equivalently the rated watts divided by 240. It reports the neutral current, which is the difference between
the two legs' 120 V loads, and the balanced split that would put equal current on both legs. The practical fix is
usually one or two plugs moved from one side to the other.

The same arithmetic applies to a spider box or a temporary distribution panel fed from a 120/240 V source. The tile
treats loads as their running amperes; a motor's starting current is a separate check against the generator's surge
rating (`generator-motor-starting`).

**Inputs:** the generator rated watts (or per-leg amperes), the 240 V loads in amperes, and each 120 V load in amperes with the leg it is on

**Outputs:** each leg's amperes and percentage of its rating, the neutral current, the total watts and percentage of rating, the balanced per-leg current, and a flag when a leg is over its rating while the total is not

## 3. Worked example

A 10,800 W portable generator (45 A per leg at 240 V) after a storm: a 240 V well pump at 10 A; on L1 a refrigerator
(6 A), sump pump (8 A), and microwave (12 A); on L2 a freezer (5 A), lights (3 A), and a furnace blower (7 A):

```
L1        10 + 6 + 8 + 12 = 36 A   (80% of 45 A)
L2        10 + 5 + 3 + 7  = 25 A   (56%)
neutral   |26 - 15| = 11 A
total     10 x 240 + (26 + 15) x 120 = 7,320 W   (68% of 10,800 W)
balanced  10 + 41 / 2 = 30.5 A per leg
```

**The generator is at 68% of its wattage, but L1 is at 80%** -- the level most manufacturers treat as the continuous
limit, with a microwave cycle or a pump start away from the breaker. Moving the microwave to L2 puts the legs at 24 A
and 37 A; moving the sump pump instead gives 28 A and 33 A, **within 2.5 A of the balanced 30.5 A.**

## 4. Scope and non-goals

A running-load balance check for a single-phase 120/240 V source. It does not address three-phase sources (`neutral-imbalance`), motor starting and surge (`generator-motor-starting`), conductor sizing or voltage drop (`voltage-drop`, `generator-conductor-445`), GFCI protection and grounding of portable generators under OSHA 1926.404 and NEC 590, or connection to a building, which requires a transfer switch or interlock to prevent backfeed onto utility lines. Load currents are nameplate or measured running values. The generator manufacturer's ratings, the NEC as adopted, and the AHJ govern.
