# roughlogic.com Specification v1739 -- Well Point Dewatering Spacing and Flow (`calc-drainage.js`, Group M Water and Wastewater Operations, groundwater, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-drainage.js`**
> (Group M, Water and Wastewater Operations -- the existing category, hub `/groups/water/`; groundwater and stormwater), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Dewatering an excavation with well points means drawing the water table below the bottom, and how many points at what spacing comes from the flow the excavation intercepts. Too few and the excavation floods; too many and the job costs more than it needs to.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive excavation dimension, drawdown, or aquifer conductivity, or a required lift exceeding the practical suction limit for a single stage returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the suction lift limit and cone overlap concepts with OSHA 1926 Subpart P and the geotechnical engineer named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`well point dewatering spacing`, `dewatering system design`, `suction lift well point`, `multi stage well points`, `excavation boiling heave`.

## 2. The tile

### 2.1 `well-point-spacing` -- Well Point Dewatering Spacing and Flow

```
flow to the excavation  from the aquifer properties, the drawdown required, and the
                        excavation geometry; a flow net or an equivalent-well analysis
drawdown required       to a stated depth below the excavation subgrade, commonly 2 to 5 ft
per-point capacity      limited by the suction lift of the header system, commonly
                        15 to 18 ft of practical lift per stage
spacing                 the points must overlap their cones of depression so the water
                        table between them is drawn down too
stages                  deeper excavations need multiple stages of well points
consequence             inadequate dewatering causes boiling, heave, and slope failure
```

The suction lift limit is what forces staging and it is the same physical limit as any suction pump: a
well-point header cannot lift water more than the atmosphere will push it, and practically that is fifteen to
eighteen feet per stage. So a deep excavation is dewatered in stages, each stage installed on a bench as the
excavation deepens, and a plan that shows a single row of well points around a twenty-five foot excavation has
not accounted for it.

Spacing has to produce overlapping cones of depression. Each point draws down a cone around itself, and the water
table between two points is drawn down only where those cones overlap -- so points spaced too far apart leave a
mound of water between them that seeps into the excavation. The required spacing tightens in low-permeability
soil, because the cones are steeper and narrower, which is the opposite of the intuition that less water means
fewer points.

The consequences of inadequate dewatering are structural rather than merely inconvenient. Water flowing upward
into an excavation bottom reduces the effective stress in the soil, and past a critical gradient the soil boils
and loses all strength; an excavation in a confined aquifer can heave bodily if the pressure beneath the bottom
is not relieved. Both are failure modes that appear suddenly.

And the discharge is regulated: dewatering water carries sediment and sometimes contamination, and it needs
treatment and a permit.

**Inputs:** the excavation dimensions and depth, the water table elevation, the required drawdown below subgrade, the aquifer hydraulic conductivity, the well point capacity, and the practical suction lift

**Outputs:** the total flow to be removed, the number of well points at the entered capacity, the spacing around the excavation perimeter, the number of stages the required drawdown demands, the drawdown at the midpoint between points, and a flag where a single stage cannot reach the required depth

## 3. Worked example

An excavation 100 by 60 ft to 22 ft deep, water table at 6 ft, requiring drawdown to 3 ft below subgrade --
so to 25 ft.

```
total drawdown required = 25 - 6 = 19 ft
practical suction lift per stage = 15 to 18 ft
```

**19 ft exceeds a single stage.** This excavation needs two stages of well points: a first stage at the original
grade drawing the water table down 15 ft or so, and a second stage installed on a bench once the excavation is
deep enough to place it. A plan showing one ring of points at the top has not accounted for the suction limit and
will not reach subgrade.

**Spacing.** The points must be close enough that their cones of depression overlap, or the water table between
them stays high and seeps into the cut. In a clean sand the cones are wide and points can be far apart; in a silty
sand the cones are narrow and steep and the points must be closer -- **which is the opposite of the intuition
that less permeable soil needs less dewatering**.

**The failure modes if it is inadequate:**

```
boiling  -- upward seepage reduces effective stress until the bottom soil loses strength
heave    -- pressure in a confined layer below the bottom lifts the excavation bodily
slope failure -- seepage on the face reduces stability
```

All three appear suddenly, and all three are excavation collapse mechanisms with workers in the hole.

**And the discharge.** Dewatering water carries sediment and sometimes contamination, and discharging it needs
treatment and a permit -- which is a schedule item, because obtaining one takes longer than mobilizing the
pumps.

## 4. Scope and non-goals

A screening framework. Dewatering system design requires a geotechnical investigation and a groundwater
analysis: the flow to an excavation depends on the aquifer's properties, its boundaries, whether it is confined or
unconfined, and the excavation's geometry, and it is estimated by flow net, equivalent-well, or numerical methods
rather than by a simple relation. It does not size the system, select between well points, deep wells, eductors,
or cutoff methods, or evaluate whether dewatering is appropriate at all -- lowering the water table can cause
settlement of adjacent structures, and cutoff with a barrier is sometimes the required answer. It does not
evaluate excavation stability, boiling, or heave, which are geotechnical analyses. It does not address the
discharge permitting, sediment control, and treatment that dewatering water requires. Excavation collapse kills
workers: the geotechnical investigation, a qualified geotechnical engineer, OSHA 1926 Subpart P, and the
discharge permit govern.
