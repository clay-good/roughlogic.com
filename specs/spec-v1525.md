# roughlogic.com Specification v1525 -- Gas Pipeline Flow (Weymouth and Panhandle) (`calc-oilgas.js`, Group B Plumbing and Gas, pipelining, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-oilgas.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; oil, gas, and pipeline), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** How much gas a line will move is a flow equation, and which one to use depends on the pipe. Weymouth for short, small, high-pressure lines; Panhandle for long large-diameter transmission. Using the wrong one on the wrong line is off by a large and predictable margin.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive diameter, length, temperature, specific gravity, or compressibility, or an outlet pressure at or above the inlet pressure returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Weymouth and Panhandle A flow equations by name with their applicability ranges, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`gas pipeline flow`, `weymouth equation`, `panhandle equation gas`, `pipeline capacity mmscfd`, `gas line pressure drop flow`.

## 2. The tile

### 2.1 `gas-pipeline-flow` -- Gas Pipeline Flow (Weymouth and Panhandle)

```
Weymouth      Q = 433.5 (T_b/P_b) [(P1^2 - P2^2) / (G T L Z)]^0.5 d^2.667
Panhandle A   Q = 435.87 (T_b/P_b)^1.0788 [(P1^2 - P2^2)/(G^0.8539 T L Z)]^0.5394 d^2.6182 E
choose        Weymouth: short, small diameter, high friction, rough pipe
              Panhandle A: long transmission, larger diameter, higher flow
efficiency E  0.88 to 0.95 typical for a clean line; falls with liquids or dirt
```

Both equations say the same physical thing -- flow is driven by the difference of the SQUARES of the pressures,
not by the pressure difference -- and that squared form is the part worth carrying in the field. Dropping outlet
pressure from 600 to 500 psig on an 850 psig line buys much more additional flow than dropping it from 300 to 200
would, because what matters is `P1^2 - P2^2`.

Diameter dominates everything else. Flow goes as roughly `d^2.6` to `d^2.67`, so going from a 12 in to a 16 in
line at the same pressures more than doubles capacity, while doubling the length only reduces flow by about 30%.
That exponent is why looping a line -- laying a parallel segment -- is such an effective way to add capacity, and
why a small restriction anywhere in a run costs more than intuition suggests.

Efficiency is where a real line differs from a calculated one. A factor of 0.92 is a clean dry line; liquid
holdup, internal corrosion product, or a partially closed valve show up here and are the usual reason measured
flow falls short of predicted.

**Inputs:** pipe inside diameter, segment length, inlet and outlet pressure, gas specific gravity, flowing temperature, compressibility factor, pipeline efficiency, and the equation to use

**Outputs:** the flow rate by the selected equation in MSCFD and MMSCFD, the flow by the alternative equation for comparison, the outlet pressure at a stated flow, the diameter needed for a target flow, and the capacity gain from looping a stated fraction of the segment

## 3. Worked example

A 16 in transmission line, 42 miles, 850 psig inlet and 600 psig outlet, 0.60 gravity gas at
60 degF, efficiency 0.92, Panhandle A:

```
P1^2 - P2^2 = 850^2 - 600^2 = 722,500 - 360,000 = 362,500
```

That squared-difference term is the driver. Now change one thing: raise the outlet to 700 psig and it becomes
232,500, a 36% reduction in the driving term for only a 100 psi
change -- so capacity falls by roughly 21% on the Panhandle
exponent.

Diameter, by contrast: the same duty in a 20 in line has capacity `(20/16)^2.6182` = 1.79 times
this one, a 79% increase for a 25% diameter change. That exponent is why capacity
problems are solved with pipe rather than with compression whenever the route allows.

## 4. Scope and non-goals

Steady-state, isothermal, single-phase dry gas flow in a horizontal line. It does not handle two-phase flow,
liquid holdup, or condensate, which change the answer completely and which are common on gathering systems; it
does not account for elevation change, which matters on any line with significant relief; and it does not model
transient behaviour, line pack, or compressor station performance. The compressibility factor must be evaluated
at the flowing conditions and a value of 1.0 will overstate capacity at transmission pressures. Pipeline
efficiency is an empirical fudge that absorbs everything the equation does not model, and a value taken from a
table rather than from measured performance is a guess. It does not check MAOP (`pipeline-mao-barlow`), which
constrains the inlet pressure independently. The operator's hydraulic model, 49 CFR 192, and a qualified pipeline
engineer govern.
