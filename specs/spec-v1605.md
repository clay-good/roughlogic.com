# roughlogic.com Specification v1605 -- Lift Station Wet-Well Volume and Cycle Time (`calc-water.js`, Group M Water and Wastewater Operations, municipal water, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`**
> (Group M, Water and Wastewater Operations -- the existing category, hub `/groups/water/`; municipal water and collection systems), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A lift station pump that starts too often burns out its motor, and the cycle time is a volume divided by a rate -- with the twist that the worst case is at half the pump's capacity, not at peak inflow. Sizing the wet well on peak flow gets the arithmetic exactly backwards.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pump capacity or active volume, an inflow at or above the pump capacity, or a starts-per-hour limit at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the cycle-time relation and its worst-case-at-half-capacity property as standard lift station practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`lift station cycle time`, `wet well volume sizing`, `pump starts per hour`, `short cycling lift station`, `worst case cycle inflow`.

## 2. The tile

### 2.1 `wet-well-cycle-time` -- Lift Station Wet-Well Volume and Cycle Time

```
fill time     t_fill = V / Q_in
pump-down     t_pump = V / (Q_pump - Q_in)
cycle time    t_cycle = t_fill + t_pump = V x Q_pump / (Q_in x (Q_pump - Q_in))
minimum cycle at Q_in = Q_pump / 2 -- the WORST case, giving t = 4V / Q_pump
required V    V = t_min x Q_pump / 4
starts/hour   motor manufacturers limit starts per hour by horsepower
```

The worst case sits in the middle and that is the whole insight. When inflow is very low the well takes a long
time to fill; when inflow approaches pump capacity the pump runs nearly continuously and rarely cycles. Halfway
between, the fill and the draw-down are both short, and the cycle time reaches its minimum -- so a wet well sized
at peak inflow is sized at the condition where cycling is least of a problem.

The consequence is the clean design rule: the required active volume is the minimum acceptable cycle time times
the pump capacity divided by four. That single relation is what a designer or a troubleshooting operator needs,
and it explains why a station that ran fine at start-up short-cycles as the service area develops and inflow
climbs toward half of pump capacity.

The limit on the other side is the motor's permitted starts per hour, which falls as horsepower rises -- a large
motor may allow only six starts an hour, which sets a ten-minute minimum cycle and therefore a large well.
Alternating pumps and variable speed both change the arithmetic and are the usual answers when the well cannot be
made bigger.

**Inputs:** pump capacity, active (between start and stop levels) volume or the well diameter and level differential, the inflow range, the minimum acceptable cycle time, and the motor starts-per-hour limit

**Outputs:** the fill, pump-down and cycle times at the entered inflow, the worst-case inflow and the minimum cycle time it produces, the active volume required for the entered minimum cycle, the level differential that volume implies, and the starts per hour at the entered inflow

## 3. Worked example

A station with a 250 gpm pump and a 6 ft diameter wet well.

```
worst-case inflow = 250 / 2 = 125 gpm
minimum cycle     = 4 V / 250
```

For a 10 minute minimum cycle (a 6 starts-per-hour motor):

```
V = 10 x 250 / 4 = 625 gallons of ACTIVE volume
```

In a 6 ft well:

```
area = pi/4 x 6^2 = 28.3 sq ft
gal per ft of depth = 28.3 x 7.481 = 212 gal/ft
level differential = 625 / 212 = 2.95 ft
```

**3.0 ft between start and stop.** A station built with a 2 ft differential in this well has
423 gallons of active volume and a worst-case cycle of
`4 x 423 / 250` = 6.8 minutes -- 9 starts an hour at the
worst inflow, which will destroy a large motor.

Check the current condition: at 90 gpm inflow the cycle is
`625 x 250 / (90 x (250 - 90))` = 10.9 minutes -- comfortable, and it
will get worse as inflow rises toward 125 gpm.

## 4. Scope and non-goals

A cycle-time calculation for a single constant-speed pump. It does not address alternating or duty-standby
arrangements, which change the effective starts per pump, or variable-speed operation, which largely eliminates
cycling and introduces its own minimum-speed and solids-handling constraints. It does not size the pump, evaluate
the system head curve, or check the pump's operating point, and it does not address minimum velocity in the force
main to prevent solids deposition (`force-main-detention-septicity` and `sewage-force-main-velocity`), which can
conflict with a long cycle. It does not evaluate detention time in the wet well, which if long enough turns the
station septic and produces odour and corrosion. It does not address the emergency storage and alarm
requirements, which are regulated. The state wastewater design standards, the pump and motor manufacturers'
starts-per-hour limits, and the design engineer govern.
