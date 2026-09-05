# roughlogic.com Specification v1480 -- Air Compressor CFM and Duty Sizing From Tool Demand (`calc-millwright.js`, Group G Cross-Trade Utilities, pneumatics, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-millwright.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; millwright, rotating equipment, and pneumatics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Compressor sizing from the sum of tool nameplate ratings buys a machine two or three times too big, and sizing from the largest tool buys one that cannot keep up. The real number is demand weighted by duty cycle, plus a leak allowance nobody budgets and every shop has.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: an empty tool list, a non-positive tool CFM or quantity, a duty cycle outside zero to one, or a negative leak or growth allowance returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the duty-weighted demand method with a leak allowance as standard compressed-air practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`air compressor sizing`, `cfm demand tools`, `compressor duty cycle sizing`, `shop air demand`, `compressor horsepower cfm`.

## 2. The tile

### 2.1 `air-compressor-cfm-sizing` -- Air Compressor CFM and Duty Sizing From Tool Demand

```
average demand   Q_avg = sum( qty x cfm_tool x duty_cycle )
with leaks       Q_leak = Q_avg x (1 + leak_allowance)
with growth      Q_design = Q_leak x (1 + future_allowance)
motor power      hp ~ Q_design / 4     (two-stage, 100 psig, rule of thumb)
```

A tool's rated CFM is its consumption while the trigger is down, and almost nothing runs at 100% duty. An
impact wrench on an assembly line might see 50%; a blow gun sees 10%. Weighting each tool by its realistic duty
and summing is what produces a compressor that neither short-cycles nor starves, and the receiver
(`receiver-pump-up-time`) is what absorbs the difference between average demand and instantaneous peaks.

The leak allowance is the honest part. A typical industrial system leaks 10 to 20% of its output and a neglected
one leaks 30% or more, so a compressor sized with no leak budget is undersized on the day it is installed. The
tile carries it explicitly rather than burying it, because a leak allowance you can see is a leak allowance you
might fix -- and `air-leak-cost` puts a dollar figure on it.

**Inputs:** each tool with its quantity, rated CFM at working pressure, and duty cycle; the leak allowance, the future growth allowance, and the system pressure

**Outputs:** the connected (all-tools-at-once) demand, the duty-weighted average demand, demand with leaks, the design CFM, the approximate motor horsepower, and the peak-to-average ratio that sizes the receiver

## 3. Worked example

A shop with 2 impact wrenches at 5 cfm and 50% duty, one orbital sander at
12 cfm and 70% duty, and a blow gun at 3 cfm and 10% duty. Leak allowance
15%, growth 20%:

```
impact wrench    2 x   5.0 x 0.50 =  5.00 cfm
orbital sander   1 x  12.0 x 0.70 =  8.40 cfm
blow gun         1 x   3.0 x 0.10 =  0.30 cfm
average demand                     = 13.70 cfm
with 15% leaks                      = 15.75 cfm
with 20% growth                     = 18.91 cfm
motor                              ~ 4.7 hp -> a 5 hp two-stage unit
```

Connected load, every tool wide open at once, is 25 cfm -- sizing to that buys a
6 hp machine, 1.3 times what the shop needs, which then short-cycles and
wears itself out. Sizing to the single largest tool buys 3 hp and starves whenever two things run.

## 4. Scope and non-goals

A demand estimate for sizing, at one system pressure. Tool CFM ratings are at a stated pressure and fall off
sharply below it, so a rating taken at 90 psig does not apply to a system running at 80. The tile does not size
the receiver (`receiver-pump-up-time`), the piping (`compressed-air-pressure-drop`), the dryer
(`air-dryer-sizing`), or the filtration, and it does not account for altitude, which reduces a compressor's mass
flow directly. The `cfm/4` horsepower figure is a two-stage 100 psig rule of thumb and is not a substitute for a
manufacturer's performance curve; single-stage, rotary screw, and variable-speed machines all differ. Duty cycles
entered from habit rather than observation are the largest source of error, and a data-logged demand profile
beats this estimate outright. The compressor manufacturer's performance data governs.
