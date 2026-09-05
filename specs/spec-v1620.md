# roughlogic.com Specification v1620 -- Tilt-Up Panel Lifting Stress and Insert Layout (`calc-concrete.js`, Group E Carpentry and Construction, concrete, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; concrete placement and tilt-up), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A tilt-up panel is strongest in its final position and weakest during the pick, when it bends under its own weight between the lift inserts. Insert layout is what keeps the bending stress below what green concrete can take, and a panel picked on the wrong pattern cracks before it stands.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive panel dimension, thickness, or concrete strength, or an insert count below one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the self-weight bending and modulus of rupture relations with ACI 551 and the insert manufacturer named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`tilt up panel lift stress`, `insert layout tilt up`, `panel pick bending`, `day of lift concrete strength`, `tilt up suction force`.

## 2. The tile

### 2.1 `tilt-up-lift-stress` -- Tilt-Up Panel Lifting Stress and Insert Layout

```
panel weight     W = area x thickness x 150 pcf
bending          the panel spans between insert rows during the pick; moment from self weight
concrete stress  the modulus of rupture at the DAY OF LIFT strength, not 28 day
                 f_r = 7.5 x sqrt(f'c) for normal weight, with a safety factor applied
insert layout    rows and columns chosen so the moment in each direction stays within capacity
                 more inserts, closer together, means less bending
suction          the panel sticking to the casting slab adds a large initial force
rigging          spreader bars and equalizing rigging distribute the load between inserts
```

The panel is a slab spanning between insert rows and it is being asked to carry its own weight at right angles
to how it will eventually work. Because bending moment grows with the square of the span between rows, moving
from two rows to three does not reduce the moment by a third -- it cuts it by more than half, which is why insert
counts on large panels climb quickly.

The strength that matters is the strength at the DAY OF LIFT, and that is the trap. A mix that reaches 4,000 psi
at 28 days may be at 2,000 psi on day five when the schedule wants the panel up, and the modulus of rupture
scales with the square root of that -- so the panel's capacity on lift day is around 70% of what a 28-day
calculation suggests. Cylinder breaks on the day, not the mix design, are what authorize a pick.

Suction is the other force and it is not small. A panel cast on a slab bonds to it, and breaking that bond adds a
force that can rival the panel weight itself. Bond breaker application is what controls it, and a panel that has
not released cleanly is putting far more than its own weight into the inserts and the crane.

**Inputs:** panel width, height and thickness, concrete unit weight, the day-of-lift compressive strength, the insert rows and columns, the rigging arrangement, and the assumed suction allowance

**Outputs:** the panel weight, the load per insert, the bending moment between insert rows in each direction, the section modulus and resulting stress, the modulus of rupture at the entered day-of-lift strength, the margin, and the insert layout required to bring the stress within capacity

## 3. Worked example

A 8 ft by 24 ft panel, 7 1/4 in thick, at 150 pcf:

```
weight = 8 x 24 x 0.6042 x 150 = 17,400 lb
```

8.7 tons. Picked on two rows of inserts, the panel spans 12 ft between them during the lift; on
three rows it spans 8 ft, and because moment goes as the span squared:

```
two rows: moment proportional to 12^2 = 144
three rows: proportional to 8^2 = 64
reduction = 56%
```

**Adding one row of inserts cuts the bending by 56%**, not by a third.

Now the strength that governs. At 28 days and 4,000 psi the modulus of rupture is
`7.5 x sqrt(4,000)` = 474 psi. On lift day at 2,200 psi it is
`7.5 x sqrt(2,200)` = 352 psi -- **26% lower**, and that
is the number the insert layout has to satisfy.

Suction: a panel with a marginal bond breaker can add a force comparable to its own 8.7 tons, so the
crane and the inserts see well over the calculated load at the moment of release.

## 4. Scope and non-goals

A screening calculation. Tilt-up panel lifting design is performed by a specialty engineer using the insert
manufacturer's software and rated capacities, and it accounts for the panel's actual geometry including openings
(which concentrate stress and often govern), the rigging configuration and its load distribution, dynamic
amplification during the pick, and the panel's behaviour as it rotates from horizontal to vertical -- a sequence
this static check does not model. Insert and rigging capacities are rated products with published safety factors
and must not be back-calculated. Day-of-lift strength must be established by field-cured cylinders representing
the panel, not by the mix design. It does not address bracing after the pick (`tilt-up-brace-load`), the casting
slab, or crane selection. Tilt-up erection is among the most hazardous concrete operations: the specialty
engineer, the insert and brace manufacturers, ACI 551, and OSHA govern.
