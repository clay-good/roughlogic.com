# roughlogic.com Specification v1750 -- Greenhouse Natural Ventilation Vent Area (`calc-greenhouse.js`, Group L Agriculture and Forestry, greenhouse and controlled-environment agriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-greenhouse.js`**
> (Group L Agriculture and Forestry, hub `/groups/agriculture/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A greenhouse with roof and side vents is cooled by buoyancy and wind, not by a fan curve, and the vent area that delivers the airflow is a fraction of the floor area rather than a duct size. The rule of thumb is stated as a percentage and the airflow it actually buys depends on the temperature difference and the height between the openings.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive floor area, vent area, or house dimension, a ridge at or below the gutter, or a non-positive temperature difference returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the vent-area percentage rule and the buoyancy relation with NGMA greenhouse design practice and ASABE standards named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`greenhouse roof vent area`, `natural ventilation greenhouse`, `gutter to ridge vent sizing`, `passive greenhouse cooling`, `vent area percent of floor`.

## 2. The tile

### 2.1 `greenhouse-vent-area` -- Greenhouse Natural Ventilation Vent Area

```
vent area rule   roof vent area is commonly 15 to 20% of the floor area, with side
                 vents of roughly equal area as the inlet
effective area   two openings in series: A_eff = 1 / sqrt(1/A_in^2 + 1/A_out^2)
buoyancy flow    Q = Cd x A_eff x sqrt(2 g dH dT / T_abs), Cd about 0.6
dH               the vertical distance between the inlet and the outlet, gutter
                 to ridge, NOT the height of the house
dT               the inside-to-outside temperature difference the vents are asked
                 to hold, in degrees Rankine as an absolute ratio
wind             above roughly 2 mph the wind term dominates buoyancy entirely and
                 the stack calculation becomes the still-air floor, not the design
air change       the useful check is house volume per minute; about one air change
                 per minute is the summer target for a crop house
```

A vent area is a percentage in the catalogs and an airflow in the house, and the
two are joined by a square root that makes the percentage much less powerful than it looks. Airflow rises
with the square root of the temperature difference, so a vent set that moves a given airflow at a 5 degF
difference moves less than half of it at 1 degF -- and 1 degF is the difference a grower actually wants to
hold on a mild bright morning. That is the honest limit of natural ventilation: it works hardest exactly when
the house is already too hot, and it is weakest when the margin is thin.

The height between the openings does the work that the area cannot. Buoyancy flow scales with the square root
of the vertical separation between inlet and outlet, which is why a gutter-connected house with roof vents at
the ridge and side vents at the gutter ventilates far better than a hoop house whose only openings are roll-up
sides at the same elevation. Two equal openings at the same height have no stack term at all, and everything
they move is wind.

The series relation is the part most often got wrong. Two openings in series do not add; the effective area is
the reciprocal-square combination, so a roof vent paired with an equal side vent gives about 71 percent of one
opening's area, not 200 percent. Doubling only the roof vent while leaving the inlet alone buys very little,
because the smaller opening governs -- the same reason an undersized return starves an oversized supply.

**Inputs:** the floor area, the roof and side vent areas or the vent percentage, the gutter and ridge heights, the design inside-to-outside temperature difference, and the discharge coefficient

**Outputs:** the vent area in square feet and as a percentage of floor area, the effective series area, the buoyancy airflow in cfm, the air changes per minute for the house volume, and the airflow at a smaller temperature difference

## 3. Worked example

A gutter-connected house 30 ft wide and 96 ft long, gutter at 12 ft and ridge at 18 ft:

```
floor area   = 30 x 96 = 2,880 sq ft
roof vents   = 18% x 2,880 = 518.4 sq ft
side vents   = 518.4 sq ft (equal area, at the gutter)
A_eff        = 1 / sqrt(1/518.4^2 + 1/518.4^2) = 366.6 sq ft
dH           = 18 - 12 = 6 ft
Q            = 0.6 x 366.6 x sqrt(2 x 32.2 x 6 x 5 / 540)
             = 416.0 cu ft/s = 24,961 cfm
```

**518 sq ft of roof vent and 518 sq ft of side vent give an effective 367 sq ft, not 1,037.**
That is the series relation, and it is the single most common error in a vent schedule: the two openings
combine to about 71 percent of one of them, so enlarging the roof vent alone while leaving the side inlet
fixed moves the answer very little.

**The airflow falls short of the one-air-change-per-minute summer target, and by a knowable margin.** The house
volume at an average height of 15 ft is 43,200 cu ft, so 24,961 cfm is 0.58 air changes per minute -- about
58 percent of the target on still air alone. For comparison, the fan-and-pad rule of 8 cfm per square foot of
floor would call for 23,040 cfm, which this house beats. Both rules survive side by side because neither is
reached on a still day and the wind makes up the difference on most others.

**And here is the square root doing its damage.** Hold the same vents open on a mild morning where the house is
only 1 degF above outside, and the buoyancy airflow falls to 11,163 cfm -- 45 percent of the design figure, from a
temperature difference that is 20 percent of design. Natural ventilation is weakest when the margin is thinnest,
and that is a property of the physics rather than a defect in the vents.

**Above about 2 mph the wind term takes over.** The stack calculation is then a floor rather than a prediction,
and it is the right number to design to only because it is the one the house is guaranteed on a still day.

## 4. Scope and non-goals

A sizing and airflow estimate for natural ventilation. It does not compute the wind-driven component, which dominates on most days and which depends on the house orientation, the surrounding screens and buildings, and the vent geometry in ways a single coefficient cannot carry. It does not size insect screening, whose pressure drop can cut the effective area by half or more and which must be accounted for separately by the screen manufacturer's data. It does not compute the resulting house temperature, which depends on the solar load and the crop's transpiration (`greenhouse-transpiration-water`), nor does it design a fan-and-pad system (`fan-pad-evaporative-cooling`). It takes no position on structural loads on the vent hardware or the controls that stage the vents. NGMA design practice, the ASABE standards where they apply, the vent and screen manufacturer's data, and the greenhouse designer govern.
