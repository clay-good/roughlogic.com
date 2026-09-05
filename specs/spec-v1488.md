# roughlogic.com Specification v1488 -- Freezer Slab Underfloor Heat and Frost Heave (`calc-refrigeration.js`, Group C HVAC, industrial refrigeration, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigeration.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; industrial and commercial refrigeration), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A freezer floor freezes the ground under it, the ground heaves, and the slab cracks -- a failure that shows up years after construction and costs more to fix than the freezer. Underfloor heat prevents it, and sizing it is a heat-loss calculation with a target temperature that is not comfort, just above freezing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive area, U-factor, or tube output, or a soil target temperature at or below freezing, or a room temperature at or above the soil target returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the steady-state underfloor heat-loss relation as standard cold-storage practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`freezer underfloor heat`, `frost heave freezer slab`, `under slab heating freezer`, `freezer floor glycol grid`, `subfloor heat cold storage`.

## 2. The tile

### 2.1 `freezer-underfloor-heat` -- Freezer Slab Underfloor Heat and Frost Heave

```
heat loss        Q = U A (T_soil_target - T_room)
required output  W = Q / 3.412        (electric grid) or the glycol loop duty
grid spacing     from the target soil temperature and the tube or cable output per foot
target           soil under the slab held around 40 to 55 degF, never below 32
```

The mechanism is simple and slow: a freezer at minus 10 degF pulls heat out of the ground beneath it
continuously, the frost line advances downward over months and years, and when soil moisture in that zone
freezes it expands. The resulting heave is not uniform, so the slab cracks, and by the time it is visible the ice
lens is well established. Underfloor heat holds a thin layer of soil above freezing so the front never starts.

Two sizing facts. The load is small -- a few watts per square foot -- because the insulation above it is doing
the real work, so the answer is a modest system that must run reliably rather than a large one. And the design
is fail-conscious: an electric grid cast in the slab cannot be repaired, so glycol tubing in a sand bed with
accessible headers, or a ventilated air system, is preferred on large boxes precisely because it can be serviced
without demolishing the freezer.

**Inputs:** freezer floor area, room temperature, target soil temperature, the assembly U-factor below the slab, the tube or cable output per foot, and the system type

**Outputs:** the underfloor heat loss in BTU/h and watts, the watts per square foot, the tube or cable length required, the grid spacing, and the annual energy and cost at an entered rate

## 3. Worked example

A 60 by 100 ft freezer (6,000 sq ft) at minus 10 degF, holding the soil at 45 degF, with an assembly
U-factor of 0.045 BTU/h per sq ft per degF below the slab:

```
TD = 45 - (-10)                    = 55 degF
Q  = 0.045 x 6,000 x 55            = 14,850 BTU/h
W  = 14,850 / 3.412                = 4,352 W = 0.73 W per sq ft
```

Under a watt per square foot -- small, continuous, and non-negotiable. With glycol tubing rated 12 BTU/h per ft
at this loop temperature, the grid needs `14,850 / 12` = 1,238 ft of tube, which over 6,000 sq ft is roughly 58
in on center.

At 4,352 W running continuously that is 38,124 kWh a year, about $3,430 at $0.09/kWh. Worth comparing against a
slab replacement, which is the alternative and is not a maintenance item.

## 4. Scope and non-goals

A steady-state heat-loss sizing for underfloor freeze protection. It does not perform a transient
ground-thermal analysis, which is what actually predicts frost front advance and which depends on soil type,
moisture, water table, and the freezer's operating history; a geotechnical assessment governs on any large or
unusual installation. It does not select between electric grid, glycol, and ventilated air systems, evaluate
redundancy and monitoring (a failed underfloor system that goes unnoticed is the failure mode that matters), or
address the slab and insulation design itself. Perimeter effects, where edge losses differ from the field, are
not modeled. Freezers built over a ventilated crawl space or on structural slabs above grade do not need this at
all. The geotechnical report, the structural engineer, and the cold-storage designer govern.
