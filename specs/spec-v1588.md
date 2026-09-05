# roughlogic.com Specification v1588 -- Step-Drawdown Test Well Efficiency (`calc-water.js`, Group M Water and Wastewater Operations, water well, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`**
> (Group M, Water and Wastewater Operations -- the existing category, hub `/groups/water/`; water well and pump service), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Drawdown in a pumping well has two parts: the aquifer's own loss, which nobody can change, and the well's loss at its screen and gravel pack, which fouling and poor development make worse. A step test separates them, and that separation is what says whether a well needs rehabilitation or a new pump.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: fewer than two steps, a non-positive flow or drawdown, or a fitted loss coefficient below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Jacob step-drawdown well loss relation as standard water well practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`step drawdown test`, `well efficiency calculation`, `well loss coefficient`, `aquifer loss versus well loss`, `specific capacity degradation`.

## 2. The tile

### 2.1 `step-drawdown-efficiency` -- Step-Drawdown Test Well Efficiency

```
total drawdown   s = B Q + C Q^2
BQ               aquifer (formation) loss -- linear in flow
CQ^2             well loss at the screen and pack -- quadratic in flow
well efficiency  E = BQ / (BQ + CQ^2) x 100%
step test        pump at 3 or more increasing rates, record stabilized drawdown at each
                 plot s/Q against Q: the intercept is B, the slope is C
```

The quadratic term is turbulent loss at the entrance to the well, and it is the part that degrades. A newly
developed well has a small C; an incrusted screen, a plugged gravel pack, or a well that was never properly
developed has a large one -- and because the term is quadratic, its share of the drawdown grows fast as the pump
rate goes up. That is why a fouling well looks fine at low rates and collapses at high ones.

Separating the two changes the decision entirely. If drawdown is dominated by BQ, the aquifer is what it is and
the answer is a lower rate, a deeper setting, or another well; no amount of acidizing or brushing will help. If
CQ^2 dominates, the well is fouled and rehabilitation will recover most of the loss. Those are very different
expenditures, and a total-drawdown number cannot tell them apart.

Well efficiency computed at the OPERATING rate is the headline. A well at 80% or better is healthy; below about
60% at its design rate it is a rehabilitation candidate, and the trend of efficiency over years is a better
maintenance signal than any single reading.

**Inputs:** the flow rate and stabilized drawdown for each step, the static water level, the operating rate, and optionally a previous test for a trend

**Outputs:** the fitted aquifer and well loss coefficients, the drawdown split at the operating rate, the well efficiency, the specific capacity at each step, a rehabilitation flag below an entered efficiency threshold, and the efficiency change against a previous test

## 3. Worked example

A three-step test on a municipal well:

```
step 1:  300 gpm, drawdown 12.0 ft   s/Q = 0.0400
step 2:  600 gpm, drawdown 28.0 ft   s/Q = 0.0467
step 3:  900 gpm, drawdown 48.0 ft   s/Q = 0.0533
```

Plotting s/Q against Q gives an intercept B = 0.0333 ft per gpm and a slope C = 0.0000222 ft per gpm squared.

At the 900 gpm operating rate:

```
aquifer loss  BQ   = 0.0333 x 900        = 30.0 ft
well loss     CQ^2 = 0.0000222 x 810,000 = 18.0 ft
total                                     = 48.0 ft
efficiency    = 30.0 / 48.0               = 62.5%
```

**62.5%** -- eighteen feet of the forty-eight is the well fighting itself, and that eighteen feet is recoverable.
At 300 gpm the same well runs `10.0 / 12.0` = 83% efficient, which is why a light-duty test would have found
nothing wrong.

If a test five years ago gave 84% at the same 900 gpm, the well has lost 21 points and the screen is incrusting.
That trend, not the absolute number, is the maintenance trigger.

## 4. Scope and non-goals

A curve fit to step-test data the user supplies. It requires each step to reach a stabilized drawdown, which in
a slow-responding aquifer takes longer than most field tests allow -- steps cut short give a fitted C that is too
large and an efficiency that is too low. It assumes the steps are performed in immediate succession with proper
accounting for residual drawdown from prior steps, which the simple fit above does not correct for. It does not
determine aquifer properties, which is `pump-test-transmissivity` and requires a constant-rate test with
observation wells. It does not diagnose the cause of well loss -- incrustation, biofouling, sand pumping, screen
damage, and inadequate original development all look the same in the arithmetic and are distinguished by video
survey and water chemistry. It does not design a rehabilitation, and aggressive chemical or mechanical treatment
can destroy a screen. The state well code, a licensed well driller or hydrogeologist, and the water system's
operator govern.
