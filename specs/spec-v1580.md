# roughlogic.com Specification v1580 -- Slide Gate Operator Force, Duty Cycle, and Travel (`calc-doorhardware.js`, Group E Carpentry and Construction, door hardware, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-doorhardware.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; door hardware and locksmithing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A slide gate operator is sized on the force to move the gate and on how often it has to do it, and the second one is what burns operators out. Duty cycle is the number nobody checks until the third motor.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive gate weight, length, or operator speed, or a rolling coefficient or duty cycle outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the rolling force and duty cycle relations with UL 325 and ASTM F2200 named as governing entrapment and construction, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`slide gate operator sizing`, `gate duty cycle`, `gate rolling force`, `gate operator cycles per day`, `gate motor overheating`.

## 2. The tile

### 2.1 `gate-operator-duty-cycle` -- Slide Gate Operator Force, Duty Cycle, and Travel

```
rolling force    F = gate weight x rolling coefficient (0.05 to 0.15 for good rollers)
                 plus grade, wind, and any binding
travel time      t = gate length / operator speed
cycles per hour  from traffic count; each open-and-close is one cycle
duty cycle       run time / total time; continuous-duty operators for high traffic
UL 325           entrapment protection is mandatory and is not optional hardware
```

The force calculation is straightforward and usually not the problem: a well-mounted gate on good rollers needs
perhaps a tenth of its weight to move, and operators are generally sized with margin. What kills them is duty.
An operator rated for intermittent duty in a residential application, installed on a commercial site that cycles
it two hundred times a day, overheats and fails -- and gets replaced with the same model, twice, before anyone
computes the duty cycle.

The force term does have two traps. Grade adds the full component of gate weight along the slope, which on a
sloped driveway can exceed the rolling force several times over. And a gate that binds -- a settled post, a
damaged roller, debris in the track -- raises the force without warning, which is why an operator drawing more
current than it used to is reporting a gate problem rather than a motor problem.

Entrapment protection under UL 325 is not part of this arithmetic and is not negotiable. A gate operator is a
machine that can kill a child, and the required sensing devices, the classification of the installation, and the
inherent force limits are safety requirements independent of anything computed here.

**Inputs:** gate weight, rolling resistance coefficient, driveway grade, gate length and operator speed, cycles per hour and per day, wind exposure, and the operator rated force and duty classification

**Outputs:** the rolling force, the added force from grade and wind, the total force against the operator rating, the travel time per cycle, the duty cycle as a percentage, and a flag where the duty exceeds an intermittent-rated operator

## 3. Worked example

A 2,400 lb slide gate on good rollers (0.1 coefficient), 24 ft long, operator moving it at 1 ft/s:

```
rolling force = 2,400 x 0.1 = 240 lb
travel time   = 24 / 1     = 24 s each way, 48 s per cycle
```

240 lb is modest. Now the duty. At 150 cycles a day over a 10 hour operating window:

```
run time  = 150 x 48 s = 7,200 s = 2.0 hours
duty cycle = 2.0 / 10 = 20%
```

**20% duty**, and that is before accounting for the fact that the cycles are not evenly
spread -- a shift change puts twenty cycles in ten minutes. An operator rated for intermittent duty will not
survive this; the application needs a continuous-duty operator, and buying one at the start is cheaper than
buying three of the wrong one.

Add a 5% grade and the force picture changes too: `2,400 x 0.05` = 120 lb of grade component on top of
the 240 lb rolling force, more than doubling the demand.

## 4. Scope and non-goals

A force and duty estimate. It does not select an operator, and manufacturer duty classifications, thermal
ratings, and the way cycles are distributed through the day all matter more than an average duty percentage. It
does not size the gate structure, the rollers, the track, or the posts, and it does not evaluate wind load on the
gate leaf, which for a solid or heavily clad gate can dominate everything else. Most importantly it does not
address entrapment protection: UL 325 classifies the installation, requires primary and secondary entrapment
sensing, and imposes inherent force limits, and ASTM F2200 governs the gate construction itself -- these are
life-safety requirements that a correctly sized operator does not satisfy. Automatic gates have killed children.
UL 325, ASTM F2200, the operator manufacturer's instructions, and the AHJ govern.
