# roughlogic.com Specification v1483 -- Vacuum Pump Evacuation (Pump-Down) Time (`calc-millwright.js`, Group G Cross-Trade Utilities, pneumatics, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-millwright.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; millwright, rotating equipment, and pneumatics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Pump-down time is logarithmic, not linear, and that single fact governs every vacuum job. Each decade of pressure costs the same time as the last, so getting from 760 torr to 76 takes as long as getting from 76 to 7.6 -- which is why a system that seemed fast in the first minute takes an hour to reach its setpoint.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive volume, pumping speed, or pressure, or a target pressure at or above the starting pressure returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the exponential pump-down relation and the leak-rate ultimate pressure as standard vacuum practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`vacuum pump down time`, `evacuation time calculator`, `vacuum decades pump`, `pump down refrigeration vacuum`, `ultimate pressure leak rate`.

## 2. The tile

### 2.1 `vacuum-evacuation-time` -- Vacuum Pump Evacuation (Pump-Down) Time

```
evacuation time   t = (V / S) x ln( p1 / p2 )
per decade        t_decade = (V / S) x ln(10) = 2.303 V / S
with leakage      ultimate pressure p_ult = Q_leak / S
effective speed   S_eff = S x conductance correction for the line
```

The volume divided by the pump's speed is a time constant, and the pressure decays exponentially against it.
Every factor-of-ten reduction costs `2.303 V/S`, identically, forever -- so the useful mental model is not
"how long to reach vacuum" but "how many decades away am I, and what does a decade cost."

Two things stop the curve. Leakage sets a floor: once the pump is removing gas exactly as fast as it leaks in,
pressure stops falling, and that ultimate pressure is the leak rate over the pumping speed and has nothing to do
with time. And the connecting line's conductance can dominate at low pressure, so a large pump on a long narrow
hose delivers a fraction of its rated speed at the chamber -- which is why the effective speed, not the badge
speed, belongs in the calculation. On refrigeration work the same arithmetic explains why a system that will not
pull below 500 microns has moisture or a leak, not a slow pump.

**Inputs:** system volume, pump speed at the working pressure, starting and target pressure with their unit, and optionally a leak rate and the connecting line size and length

**Outputs:** the evacuation time, the time per decade, the number of decades to the target, the ultimate pressure achievable against an entered leak rate, and the pressure reached after a stated elapsed time

## 3. Worked example

A 15 cu ft chamber on a 25 cfm pump, from atmosphere (760 torr) to 1 torr:

```
t          = (15 / 25) x ln(760 / 1) = 0.60 x 6.633 = 3.98 minutes
per decade = 2.303 x 15 / 25          = 1.38 minutes
decades    = log10(760/1)                 = 2.88
```

4.0 minutes, and it is spread evenly across 2.88 decades at 1.38 minutes each. Going one decade
further, to 0.1 torr, costs another 1.38 minutes -- the same as the first decade, which took the pressure
from 760 down to 76.

Now leakage. If the system leaks 5 torr-cfm, the ultimate pressure is `5 / 25` = 0.20 torr, and no amount of
additional pumping time reaches 1 torr. A pump-down that flattens out short of target is reporting a leak,
and the flattening pressure says how big it is.

## 4. Scope and non-goals

Ideal isothermal pump-down of a fixed, dry, leak-free volume, with the pump's speed treated as constant. Real
pumps lose speed as pressure falls and the manufacturer's speed curve, not a single number, governs below about
1 torr. The relation says nothing about moisture: water vapor in a system evaporates as pressure drops and holds
the pressure at its vapor pressure until it is gone, which is why a wet refrigeration system takes many times the
calculated time and why heat and a micron gauge, not a stopwatch, decide when it is dry. Outgassing from
elastomers and surfaces dominates in high vacuum and is not modeled. Line conductance is entered rather than
computed. The pump manufacturer's speed curve and, for refrigeration, the equipment manufacturer's evacuation
procedure govern.
