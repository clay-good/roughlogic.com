# roughlogic.com Specification v1737 -- Aquifer Pump Test Transmissivity (Cooper-Jacob) (`calc-drainage.js`, Group M Water and Wastewater Operations, groundwater, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-drainage.js`**
> (Group M, Water and Wastewater Operations -- the existing category, hub `/groups/water/`; groundwater and stormwater), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An aquifer's transmissivity comes from a constant-rate pump test, and the Cooper-Jacob method extracts it from the slope of drawdown against the logarithm of time. It is the measurement that says what a well field can sustain, and it needs an observation well rather than the pumping well.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pumping rate or drawdown per log cycle, or fewer than three data points on the straight-line portion returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Cooper-Jacob straight-line method by name with its late-time validity condition, and a qualified hydrogeologist named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`cooper jacob transmissivity`, `aquifer pump test analysis`, `drawdown per log cycle`, `storativity from pump test`, `recovery test transmissivity`.

## 2. The tile

### 2.1 `pump-test-transmissivity` -- Aquifer Pump Test Transmissivity (Cooper-Jacob)

```
Cooper-Jacob      s = (264 Q / T) log10( 0.3 T t / (r^2 S) )
transmissivity    T = 264 Q / delta-s      (delta-s the drawdown per log cycle of time)
storativity       from the intercept where the straight line crosses zero drawdown
units             Q in gpm, s in feet, T in gpd/ft
validity          the approximation requires u small: late time, small radius, or both
observation well  the pumping well's own drawdown includes well loss and does not give
                  a clean storativity
recovery          the recovery curve after shutdown is an independent estimate
```

The method's elegance is that transmissivity comes from a SLOPE rather than from an absolute value, so it is
insensitive to the datum and to any constant error in the measurements. Plot drawdown against the logarithm of
time, fit a straight line to the late-time data, and read the drawdown per log cycle -- transmissivity follows
from that alone.

The observation well requirement is what distinguishes a transmissivity test from a well test. Drawdown in the
pumping well includes well loss -- the turbulent head loss at the screen, which is `step-drawdown-efficiency` --
and that loss is not aquifer behaviour. A transmissivity from the pumping well's own drawdown is contaminated by
it, and storativity from a pumping well is essentially meaningless. One or more observation wells at known
distances are what make the test an aquifer test.

The validity condition matters because Cooper-Jacob is a late-time approximation to the full Theis solution.
Early data plots on a curve, not a line, and fitting a line through it gives a wrong transmissivity -- so the
analysis uses the straight portion, and identifying where the data becomes straight is part of the interpretation
rather than a formality.

The recovery test is the check that costs nothing. After the pump stops, residual drawdown plotted against the
ratio of elapsed times gives an independent transmissivity, and agreement between the drawdown and recovery
estimates is good evidence that the test was sound.

**Inputs:** the constant pumping rate, the drawdown and elapsed time data from each observation well, the distance to each observation well, the aquifer thickness, and the recovery data

**Outputs:** the drawdown per log cycle from the fitted straight line, the transmissivity, the storativity from the intercept, the hydraulic conductivity for the entered aquifer thickness, the transmissivity from the recovery data for comparison, and a validity flag where the fitted portion is too early

## 3. Worked example

A constant-rate test at 250 gpm, with an observation well showing 8.4 ft of drawdown per log cycle of time
on the straight-line portion:

```
T = 264 x 250 / 8.4 = 66,000 / 8.4 = 7,857 gpd/ft
```

For a 60 ft thick aquifer:

```
K = 7,857 / 60 = 131 gpd/sq ft
```

**The slope is what matters, not the absolute drawdown.** A datum error, a barometric shift, or a constant
measurement offset moves the whole curve up or down and leaves the slope -- and therefore the transmissivity --
unchanged. That is why the method is robust.

**The observation well is what makes it an aquifer test.** Drawdown in the PUMPING well includes well loss --
turbulent head loss at the screen, which is `step-drawdown-efficiency` and is a property of the well rather than
of the aquifer. A transmissivity computed from pumping-well drawdown is too low by whatever that loss was, and a
storativity from it is meaningless.

**Fit the straight portion only.** Early data curves, because the Cooper-Jacob approximation is a late-time
simplification of the Theis solution. A line fitted through the early curve gives a steeper slope and a lower
transmissivity, and identifying where the data straightens is the interpretive step.

**The free check**: after the pump stops, plot residual drawdown against the ratio of total elapsed time to time
since shutdown. That recovery curve gives an independent transmissivity, and agreement between the two is the best
evidence the test was sound.

## 4. Scope and non-goals

A Cooper-Jacob analysis. The method assumes a confined, homogeneous, isotropic aquifer of infinite extent, a
fully penetrating well, constant discharge, and negligible well storage -- and real aquifers violate several of
these. Boundaries appear as slope changes on the plot, leakage flattens it, partial penetration and unconfined
conditions require corrections, and interpreting those departures is where aquifer test analysis actually lives.
The approximation is valid only at late time and the straight-line portion must be identified correctly. It does
not design a test, determine the pumping rate or duration, or address the observation well placement that
determines whether the test can resolve anything. It does not evaluate sustainable yield, which depends on
recharge and on the whole aquifer system rather than on a short test. State well and water rights regulations
apply to both testing and withdrawal. A qualified hydrogeologist and the state water resources agency govern.
