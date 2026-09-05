# roughlogic.com Specification v1671 -- Carburizing Case Depth and Time at Temperature (`calc-inspection.js`, Group E Carpentry and Construction, metallurgy, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-inspection.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; heat treatment and metallurgy), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Case depth grows with the square root of time, so doubling the case takes four times as long. It is the relationship that governs every carburizing cycle and it is why a deep case is expensive out of proportion to its depth.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive time, case depth, or diffusion constant returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the square-root diffusion relation for case depth with the applicable heat treatment specification named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`carburizing case depth time`, `case depth square root time`, `carburize cycle time`, `effective case depth 50 hrc`, `diffusion case hardening`.

## 2. The tile

### 2.1 `carburizing-case-depth` -- Carburizing Case Depth and Time at Temperature

```
case depth        d = k x sqrt(time)
k                 a temperature-dependent constant; roughly 0.025 in per sqrt(hour)
                  at 1,700 degF for plain carburizing, rising steeply with temperature
time for a depth  t = (d / k)^2
temperature       raising the temperature raises k substantially, but coarsens grain
effective case    measured to a defined hardness, commonly 50 HRC, not to the surface
total case        the full depth of carbon enrichment, always greater than effective
```

The square-root law is diffusion, and it means the second half of a case costs three times what the first half
did. A 0.040 in case at a given temperature takes four times the time of a 0.020 in case, which is why deep-case
parts are batched separately and why designers who specify a deep case for margin are buying it at a steep
price.

Temperature is the lever, and it has a cost. The diffusion constant rises sharply with temperature so a hotter
cycle is much faster, but it also coarsens the grain, increases distortion, and shortens furnace and fixture
life -- so the choice of carburizing temperature is a trade between cycle time and part quality rather than a
free optimization.

The definition of case depth is where specifications go wrong. Effective case depth is measured to a specified
hardness -- commonly 50 HRC -- on a prepared cross-section with a microhardness traverse, and it is always less
than the total case, which is the full extent of carbon enrichment. A drawing that says "case depth 0.030" without
saying effective or total, and without a hardness criterion, is ambiguous by a factor that matters.

**Inputs:** the target case depth, the carburizing temperature and its diffusion constant, the elapsed time, whether the depth is effective or total, and the hardness criterion for effective case

**Outputs:** the case depth achieved at the entered time, the time required for a target depth, the time for double the depth, the depth at an alternative temperature constant, and the distinction between the entered effective and the implied total case

## 3. Worked example

Carburizing at a temperature where k is about 0.025 in per sqrt(hour), for 8 hours:

```
case depth = 0.025 x sqrt(8) = 0.025 x 2.828 = 0.0707 in
```

About 71 thousandths after 8 hours.

**Now double the case** to 141 thousandths:

```
t = (0.1414 / 0.025)^2 = 32 hours
```

32 hours instead of 8 -- **four times the cycle for twice the case**, and on a batch furnace
that is the difference between two loads a day and one load every day and a half.

The temperature lever: raising the carburizing temperature increases k substantially, so the same
141 thousandth case might be reached in far less time at a higher temperature. The costs are grain
coarsening, more distortion to correct in grinding, and shorter fixture and furnace life -- so it is a trade a
heat treater makes deliberately.

**The specification trap.** "Case depth 0.030 in" is ambiguous. Effective case to 50 HRC and total case are
different numbers on the same part, and the total is always the larger. A supplier quoting to one and a customer
inspecting to the other will disagree on a part that is correct.

## 4. Scope and non-goals

A diffusion-law estimate. The constant k is temperature dependent and also depends on the carburizing method
(gas, vacuum, low-pressure, pack), the carbon potential maintained, and the steel's own composition -- alloying
elements change carbon diffusivity -- so a single constant is a planning approximation and the heat treater's own
process data is the authority. It does not address carbon potential control, which determines the surface carbon
and therefore the achievable hardness, or the quench that follows carburizing and which actually produces the
hardness; a correctly carburized part that is quenched wrongly is soft. It does not address distortion, retained
austenite, grain size, intergranular oxidation, or the tempering that follows. It does not measure case depth,
which requires a sectioned specimen and a microhardness traverse to the specified criterion. The material
specification, the heat treatment specification (such as AMS 2759 or the applicable industry standard), and the
heat treater's qualified process govern.
