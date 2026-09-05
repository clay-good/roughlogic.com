# roughlogic.com Specification v1652 -- Hoistway Pressurization and Smoke Venting (`calc-elevator.js`, Group E Carpentry and Construction, elevator, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elevator.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; elevator and escalator), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A hoistway is a chimney running the height of a building, and what it does with smoke is a code question that has changed direction over the years -- from venting smoke out to keeping it out with pressurization. Which requirement applies decides whether a shaft needs an opening at the top or a fan.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive hoistway area or height, or a pressure difference at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the venting and pressurization approaches with NFPA 92 and the adopted building code named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`hoistway venting requirement`, `elevator shaft pressurization`, `smoke control hoistway`, `elevator lobby pressurization`, `hoistway vent area`.

## 2. The tile

### 2.1 `hoistway-venting` -- Hoistway Pressurization and Smoke Venting

```
historic venting   an opening at the top of the hoistway, sized as a fraction of the
                   hoistway plan area, to release smoke and hot gases
current practice   many codes now require hoistway PRESSURIZATION instead, or permit it
                   as an alternative, and prohibit unsealed vents for energy reasons
pressurization     supply air to hold the shaft positive to the floors, within a band
                   that still allows doors to operate
door force         the pressure difference must not exceed the door opening force limit
stack effect       the shaft's own stack effect (`stack-effect-npp`) adds to or opposes
                   the fan, and varies with season
```

The two approaches solve the same problem in opposite directions and the code has moved. Venting accepts that
smoke enters the shaft and gives it somewhere to go; pressurization supplies air to the shaft to keep smoke out
in the first place. Energy codes disliked permanent open vents at the top of every hoistway, and smoke control
practice preferred keeping the shaft clean, so pressurization became the common answer -- but which is required
depends entirely on the adopted code and the AHJ, and buildings exist with both.

The constraint that bounds pressurization is the door. Too little pressure and smoke migrates in; too much and
the pressure difference across the hoistway doors and the stairwell doors makes them hard to open, which fails
the egress force limits. That band is narrow, and it is narrower in tall buildings where the shaft's own stack
effect adds a season-dependent pressure the fan has to work with rather than against.

The interaction with the elevator itself matters too. Elevators used for occupant evacuation or firefighter
operations have additional requirements, and the pressurization system's behaviour when a door opens -- when the
shaft suddenly has a large leak -- is what a commissioning test has to demonstrate.

**Inputs:** hoistway plan area, number of floors and height, the applicable code requirement (vent or pressurize), the target pressure difference, the door area and permitted opening force, and the leakage area of the shaft

**Outputs:** the vent area required under a venting requirement, the airflow required to hold a target pressure difference against the entered leakage, the pressure difference against the door force limit, the door opening force at that pressure, and the stack effect contribution at design winter and summer conditions

## 3. Worked example

A hoistway 10 ft by 9 ft serving 22 floors.

Under a historic venting requirement the vent area is a fraction of the hoistway plan area:

```
plan area = 90 sq ft
vent at 3.5% = 3.2 sq ft
```

Under a pressurization approach instead, the shaft is held positive to the floors and the constraint is the door:

```
a 36 in by 84 in hoistway door = 21 sq ft
at 0.10 in wc pressure difference: force = 21 x 0.10 x 5.2 = 10.9 lbf added to the door
```

That is tolerable. At 0.25 in wc it becomes `21 x 0.25 x 5.2` = {21*0.25*5.2:.1f} lbf added, which on top of the
door's own operating force approaches and can exceed the egress limits -- so the pressurization band has a
ceiling set by the doors, not by the smoke control objective.

**And the stack effect underneath it.** From `stack-effect-npp`, a 220 ft shaft at 70 degF inside and 10 degF
outside develops on the order of 0.4 in wc top to bottom on its own -- larger than the pressurization band. The
fan is not working against a still shaft; it is working with a large seasonal pressure that reverses between
summer and winter, and a system commissioned in one season can behave quite differently in the other.

## 4. Scope and non-goals

A screening discussion with supporting arithmetic. Whether a hoistway must be vented, may be pressurized, or
requires neither is set by the adopted building and fire codes and by the AHJ, and the requirements have changed
between code editions in ways that make older buildings and newer ones different -- the adopted edition governs
and this tile does not determine it. It does not design a smoke control system: pressurization design requires
leakage areas for the shaft and the building, the stack effect and wind effects across the seasons, the behaviour
with doors open, the interaction with stairwell pressurization and with the building's HVAC, and a commissioning
test to demonstrate performance. It does not address elevators used for occupant evacuation or firefighter
operations, which carry additional requirements. Smoke control is a life-safety system: the adopted building and
fire codes, NFPA 92, ASME A17.1 where elevator operation is affected, a smoke control engineer, and the AHJ
govern.
