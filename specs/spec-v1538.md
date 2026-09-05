# roughlogic.com Specification v1538 -- Well Decline Curve and Remaining Reserves (`calc-oilgas.js`, Group E Carpentry and Construction, oil and gas production, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-oilgas.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; oil, gas, and pipeline), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A producing well's rate falls on a curve, and fitting that curve is how remaining reserves and economic life get estimated. Exponential decline is the arithmetic a pumper or a small operator can actually do, and it is the one that says when a well stops paying.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive initial rate, decline constant, or economic rate, or an economic rate at or above the initial rate returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the exponential decline relations and the nominal-versus-effective distinction, with SPE-PRMS named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`decline curve analysis`, `exponential decline reserves`, `well economic life`, `eur estimate decline`, `effective annual decline rate`.

## 2. The tile

### 2.1 `well-decline-reserves` -- Well Decline Curve and Remaining Reserves

```
exponential rate   q(t) = q_i x exp(-D t)
cumulative         N_p = (q_i - q) / D
economic life      t = ln( q_i / q_economic ) / D
effective decline  D_eff = 1 - exp(-D)      (the annual percentage people quote)
hyperbolic         q(t) = q_i / (1 + b D_i t)^(1/b); shale wells need b, not exponential
```

Exponential decline says the rate falls by the same PERCENTAGE each year, which makes the cumulative a simple
difference of rates over the decline constant. Two forms of the same number circulate and get confused: the
nominal decline `D` that goes in the exponent, and the effective annual decline `1 - exp(-D)` that people quote
as "a 25% decline." For small declines they are close; for steep ones they diverge badly, and mixing them up
overstates or understates reserves directly.

The practical output is economic life. A well is abandoned when its rate no longer covers lease operating
expense, and solving the curve for that rate gives a date -- which is what plugging liability, equipment
redeployment, and the decision to work a well over all hang on.

The important caveat is that exponential is the wrong model for an unconventional well. Shale wells decline
hyperbolically, very steeply at first and then flattening, and forcing an exponential fit on early data
dramatically understates reserves while forcing a hyperbolic fit with a high `b` far into the future
overstates them. The tile fits exponential and says so.

**Inputs:** initial rate, the nominal or effective decline rate, the economic limit rate, and optionally two rate-and-date pairs to fit the decline from

**Outputs:** the nominal and effective decline rates, the rate at any future date, the cumulative production to a stated rate or date, the remaining reserves to the economic limit, and the economic life in years

## 3. Worked example

A well at 420 bbl/day declining at a nominal 0.28 per year, with an economic limit of 15 bbl/day:

```
effective annual decline = 1 - exp(-0.28) = 0.244 = 24.4% per year
economic life = ln(420 / 15) / 0.28 = 3.332 / 0.28 = 11.9 years
remaining reserves = (420 - 15) / 0.28 x 365 = 527,946 bbl
```

11.9 years of life and about 528 thousand barrels remaining.

The nominal-versus-effective trap in numbers: this well declines 24.4% effective, not 28%.
Someone told "28% decline" who used 0.28 as an effective rate would compute a nominal of
`-ln(1 - 0.28)` = 0.329 and get an economic life of
10.1 years and reserves of
450 thousand barrels -- 15% low. On a
package of wells that error is material.

## 4. Scope and non-goals

Exponential (constant-percentage) decline only. It is the wrong model for unconventional and hydraulically
fractured wells, which decline hyperbolically and whose early-time data fitted exponentially will badly
understate ultimate recovery; those need a hyperbolic or modified-hyperbolic fit with a terminal decline, and
choosing `b` is where most of the uncertainty in a shale reserve estimate lives. It assumes the well produces
against unchanged conditions: an artificial-lift change, a workover, a choke change, offset frac interference, or
a shut-in period all break the fit, and a curve fitted through such an event is meaningless. It does not account
for operating cost, price, working and royalty interests, or taxes, so the economic limit rate must be supplied
rather than derived. It is not a reserves report: SEC and SPE-PRMS reserve definitions carry evidentiary
requirements this does not meet. The operator's reservoir engineer and a qualified reserves evaluator govern.
