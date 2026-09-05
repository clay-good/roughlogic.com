# roughlogic.com Specification v1628 -- Chiller Staging Point and Part-Load Efficiency (`calc-hvacsystems.js`, Group C HVAC, test and balance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; test and balance, controls, and acoustics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Two chillers running at half load are often more efficient than one at full load, and sometimes far less -- it depends entirely on where each machine's part-load efficiency curve sits. The staging setpoint is where the two options cross, and a plant staged on a fixed percentage is guessing at it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive load or machine capacity, a machine count below one, or a kW/ton value at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the part-load power comparison method with the chiller manufacturer performance data named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`chiller staging point`, `part load efficiency crossover`, `when to stage second chiller`, `kw per ton part load`, `chiller sequencing setpoint`.

## 2. The tile

### 2.1 `chiller-staging-point` -- Chiller Staging Point and Part-Load Efficiency

```
single machine    kW = tons x kW/ton at that percent load
two machines      kW = 2 x (tons/2) x kW/ton at that percent load each
crossover         the load at which the two-machine total first falls below the one-machine
part load         centrifugal machines often improve down to 40 to 60% load, then degrade
                  screw and scroll machines behave differently
auxiliaries       staging a chiller stages its pumps and tower cell too; include them
IPLV              a weighted single number; useful for comparison, not for staging
```

The crossover exists because chiller efficiency is not monotonic in load. Many centrifugal machines are most
efficient somewhere between 40 and 70 percent load, not at 100 -- condenser water is colder at part load and the
lift is lower -- so two machines at 50 percent can beat one at 100. Below their best point efficiency falls off,
and eventually one machine at a moderate load beats two machines running badly.

The auxiliaries are what people leave out and they frequently move the answer. Starting a second chiller starts
its chilled water pump, its condenser water pump, and often a tower cell, and those add tens of kilowatts before
the compressor does anything. On a plant with constant-speed pumps the auxiliary penalty can push the crossover
well above where the compressor curves alone would put it.

The practical output is a staging setpoint expressed in tons or in percent of a single machine, plus a deadband
so the plant does not hunt. A plant staged at a habitual 80 percent that crosses over at 62 percent is running
one machine hard for a large part of the season when two would use less.

**Inputs:** chiller capacity and the kW/ton curve at several part-load points, the number of machines, the auxiliary power per machine started, the plant load range, and the deadband

**Outputs:** the plant power on one machine and on two across the load range, the crossover load in tons and as a percent of one machine, the staging setpoint with the entered deadband, the energy penalty of staging at a stated fixed percentage instead, and the effect of including or excluding auxiliaries

## 3. Worked example

Two 500 ton chillers, with kW/ton at part load of 0.62 at 100%, 0.55 at 75%, 0.52 at 50%, and 0.61 at 30%.
Auxiliaries per machine started: 45 kW.

```
plant at 600 tons, ONE machine at 600 tons -- above capacity, not available
plant at 450 tons, one machine at 90%:  450 x 0.585 + 45  = 308 kW
plant at 450 tons, two at 45% each:     450 x 0.525 + 90  = 326 kW
                                        -> ONE machine wins at 450 tons
plant at 700 tons, one at 100% + ... not available
plant at 620 tons, two at 62% each:     620 x 0.535 + 90  = 422 kW
```

Working down from the top, the crossover on the compressor curves alone sits near 50% of a single machine -- but
adding the 45 kW of auxiliaries moves it up substantially, because the second machine has to save more than 45 kW
of compressor power before it pays for its own pumps.

**A plant staged at a fixed 80% of one machine** would bring the second chiller on at 400 tons, well below the
crossover, and run two machines with two sets of pumps where one machine and one set would use less. Over a
cooling season that is a large number, and it is a setpoint change rather than a capital project.

## 4. Scope and non-goals

A comparison using part-load performance data the user supplies. Chiller kW/ton at part load depends strongly
on condenser water temperature, which itself varies with wet bulb and tower staging, so a single part-load curve
is a simplification -- the real crossover moves through the season. Manufacturer performance data at the actual
entering condenser water temperatures, not a nominal curve or an IPLV figure, is what a staging analysis needs;
IPLV is a single weighted number for comparing machines and is not a staging tool. It does not model the plant's
hydraulics, the minimum flow requirements of each machine, or the low-load limits and surge behaviour that
constrain how lightly a centrifugal can be loaded. It does not address staging delays, run-time equalization,
demand limiting, or the control sequence itself. The chiller manufacturer's performance data, the plant's own
trend data, and the controls engineer govern.
