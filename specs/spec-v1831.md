# roughlogic.com Specification v1831 -- Cantilever Sheet Pile Wall Penetration Depth (`calc-marine.js`, Group E Carpentry and Construction, marine construction and dredging, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-marine.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A cantilever sheet pile wall is held up entirely by the soil it is driven into, so the embedment is comparable to the height retained. The pile is close to twice as long as the wall it makes, and that is the number estimators get wrong.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive retained height, unit weight, or yield strength, a friction angle at or below zero or at or above 45 degrees, or an increase factor below 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Rankine earth pressure coefficients and the simplified net-pressure cantilever solution with a site-specific geotechnical investigation and the applicable design code named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`cantilever sheet pile embedment`, `sheet pile penetration depth`, `rankine active passive sheet pile`, `sheet pile section modulus`, `bulkhead wall design granular soil`.

## 2. The tile

### 2.1 `sheet-pile-penetration` -- Cantilever Sheet Pile Wall Penetration Depth

```
earth pressures  Rankine: Ka = tan^2(45 - phi/2), Kp = tan^2(45 + phi/2)
active force     Pa = 0.5 Ka gamma H^2, acting at H/3 above the dredge line
net passive      below the dredge line the wall mobilises (Kp - Ka) gamma per foot
                 of depth on the net-pressure simplification
theoretical      moments about the toe balance:
depth            0.5 (Kp - Ka) gamma D^2 x D/3 = Pa (D + H/3)
design depth     the simplified solution is increased by 20 to 40%, which is the
                 conventional allowance for the approximation
total length     H + D; for ordinary granular soil it approaches twice H
maximum moment   at the depth below the dredge line where net shear is zero
section modulus  S = M / allowable bending stress, per foot of wall
what governs     often DEFLECTION at the top rather than bending stress, and this
                 relation does not compute it
```

A cantilever wall has no anchor and no strut, so every bit of the retained load is carried by rotating against
the soil below the excavation. That is why the embedment has to be so deep: the passive resistance available
per foot of depth is modest, and it has to develop enough moment about the toe to balance a force applied well
above it. The result surprises people the first time -- a twelve foot wall is a twenty-something foot pile.

The twenty to forty percent increase on the theoretical depth is not a safety factor in the usual sense. The
net-pressure simplification assumes a rotation point and an idealised pressure distribution that the real wall
does not exactly produce, and the increase is the conventional correction for that idealisation. It is
applied on top of, not instead of, the factors of safety in the pressure coefficients or the load and
resistance factors of a modern design.

Deflection is frequently the criterion that governs and it is the one this arithmetic does not give. A
cantilever wall is a flexible structure and the top can move inches while the section is comfortably within
its bending capacity, which is acceptable for a temporary cofferdam and unacceptable beside a road or a
building. Where deflection governs, the answer is a heavier section, a deeper embedment, or an anchor -- and the
anchor turns it into a different structure with a different analysis.

**Inputs:** the retained height, the soil friction angle and unit weight, the water and surcharge conditions, the increase factor on the theoretical depth, and the steel yield strength

**Outputs:** the active and passive pressure coefficients, the active force and its lever arm, the theoretical embedment, the design embedment and total pile length, the depth to maximum moment, the maximum moment, and the section modulus required per foot of wall

## 3. Worked example

A 12 ft retained height in granular soil at phi = 32 degrees and 120 pcf, drained, no surcharge:

```
Ka = tan^2(45 - 16) = 0.3073      Kp = tan^2(45 + 16) = 3.2546
Pa = 0.5 x 0.3073 x 120 x 12^2 = 2,655 lb per foot of wall
     acting 4.0 ft above the dredge line
```

Balancing moments about the toe:

```
0.5 x (3.2546 - 0.3073) x 120 x D^2 x D/3 = 2,655 x (D + 4.0)
D (theoretical) = 8.19 ft
D (design, +30%) = 10.64 ft
total pile length = 12 + 10.64 = 22.6 ft
```

**A 12 ft wall needs a 23 ft pile.** The embedment is 0.89 times the retained height, so **47% of the
steel bought is below the excavation and never seen.** That ratio is the single most common estimating error
on a cantilever bulkhead.

**The moment peaks below the dredge line, not at it:**

```
depth to zero shear: z = sqrt(2,655 / 177) = 3.87 ft below the dredge line
M_max = 17,476 ft-lb per foot of wall
S required = 17,476 x 12 / 30,000 = 7.0 in^3 per foot
```

**7.0 in^3 per foot is a light section** -- most PZ and PMA sheet piling exceeds it comfortably -- which is
the usual finding on a cantilever wall of this height. **The steel is not working hard; the soil is.**

**And that is why bending stress is often the wrong criterion.** A cantilever wall this flexible can move
inches at the top while the section sits well inside its capacity. **For a temporary cofferdam that is fine;
beside a road or a building it is not**, and where deflection governs the answer is a heavier section, deeper
embedment, or an anchor -- and an anchor makes it a different structure with a different analysis entirely.

## 4. Scope and non-goals

A simplified screening calculation for a specific and narrow case: a cantilever wall in uniform drained granular soil with no water table difference, no surcharge, no cohesion, and no slope. Every one of those conditions changes the analysis materially, and a water table difference across the wall commonly dominates everything else -- unbalanced water pressure is frequently the largest load on a bulkhead and is not in this relation at all. The net-pressure method with a percentage increase is a textbook approximation; modern practice uses a full pressure distribution, appropriate factors under the governing code, and for anything but the simplest wall a numerical soil-structure analysis. It does not compute deflection, which frequently governs. It does not address anchored or braced walls, cohesive soils and their short-term and long-term conditions, layered profiles, seepage and piping below the toe, global stability, or the driveability of the section in the ground present. It does not address corrosion allowance, interlock strength, or the effect of driving on adjacent structures. A site-specific geotechnical investigation, the applicable design code, and a licensed geotechnical or structural engineer govern.
