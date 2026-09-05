# roughlogic.com Specification v1590 -- Constant-Pressure Well VFD Setpoint and Flow (`calc-water.js`, Group M Water and Wastewater Operations, water well, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`**
> (Group M, Water and Wastewater Operations -- the existing category, hub `/groups/water/`; water well and pump service), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A constant-pressure well system holds discharge pressure by varying pump speed, and whether it can hold it at a given flow depends on where the affinity-law curve sits against the system curve. Setting one up without that check produces a system that drops pressure exactly when several fixtures open.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive setpoint pressure, static head, or rated speed, or a minimum speed above the rated speed returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the affinity laws with the static-head exception as standard pump practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`constant pressure well vfd`, `variable speed well pump setpoint`, `affinity laws static head`, `minimum speed pump vfd`, `well pump drive sizing`.

## 2. The tile

### 2.1 `constant-pressure-vfd` -- Constant-Pressure Well VFD Setpoint and Flow

```
affinity laws    Q2/Q1 = N2/N1;  H2/H1 = (N2/N1)^2;  P2/P1 = (N2/N1)^3
static head       does NOT scale with speed -- it is the floor the pump must always beat
minimum speed     the speed at which shutoff head just equals the setpoint plus static
                  below it the pump cannot make pressure at any flow
setpoint          discharge pressure held constant across the flow range
drawdown effect   pumping level falls with flow, raising static head as demand rises
```

The trap is that head scales with the square of speed but STATIC head does not scale at all. A pump lifting 180
feet before it makes any pressure has to overcome that 180 feet at every speed, so as the drive slows the pump's
head falls quadratically toward a floor it cannot go below -- and there is a minimum speed below which the pump
produces no flow at all against the system. A constant-pressure system that hunts or drops out at low demand is
usually running into that floor rather than failing.

Drawdown makes it worse in the direction people do not expect. As flow increases the pumping level in the well
falls, so static head RISES exactly when the pump is being asked for more flow -- the system curve steepens with
demand. A drive sized on static head at the static water level will be short at the drawn-down level.

The energy case is genuine but it is smaller than the cube law suggests for the same reason. Cube-law savings
apply to the friction portion of the head; the static portion does not go away, so a well with a high lift and
modest friction saves far less by slowing down than a flat closed loop does.

**Inputs:** pressure setpoint, static lift at the static and drawn-down levels, friction head at the design flow, pump curve at rated speed, rated speed, and the flow range to be covered

**Outputs:** the total head required at each flow in the range, the speed required at each, the minimum speed at which the setpoint can be held, the flow at which the drive reaches full speed, and the power at each speed against the cube law with the static head excluded

## 3. Worked example

A submersible holding 50 psi (115 ft) at the tank, with 180 ft of static lift at the static level and 25 ft of
friction at 20 gpm:

```
head required at 20 gpm = 180 + 25 + 115 = 320 ft
head required at  5 gpm = 180 +  2 + 115 = 297 ft   (friction nearly vanishes)
```

The head barely falls as flow drops, because static and setpoint dominate and only the 25 ft of friction is
speed-sensitive. If the pump makes 320 ft at 3,450 rpm, the speed needed at 5 gpm is roughly

```
N = 3,450 x sqrt(297 / 320) = 3,324 rpm
```

**Only 4% slower** for a 75% reduction in flow. The cube law would suggest large savings; the actual power saving
is small, because the pump is doing lifting work rather than friction work.

Now the drawdown. If pumping 20 gpm draws the level down another 40 ft, head at 20 gpm becomes 360 ft, and a
pump curve that tops out at 340 ft cannot hold the setpoint at that flow at ANY speed -- the system loses pressure
when demand is highest, which is exactly the complaint that gets reported.

## 4. Scope and non-goals

An affinity-law screen against a pump curve the user supplies. The affinity laws hold along lines of constant
efficiency and become progressively less accurate as speed is reduced far below rated; manufacturers publish
variable-speed curves that supersede them. It does not select a pump or a drive, evaluate motor cooling at
reduced speed (a submersible relies on flow past the motor for cooling and has a minimum flow requirement that
low-speed operation can violate), or address minimum flow for thrust bearing loading. It does not model the well
itself: drawdown at flow comes from a step test (`step-drawdown-efficiency`) and the pumping level, not the
static level, sets the real static head. It does not address pressure tank sizing, cycling, or the surge and
water hammer that fast drive response can cause. The pump and drive manufacturers' data, the state well code, and
a licensed pump installer govern.
