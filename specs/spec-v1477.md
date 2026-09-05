# roughlogic.com Specification v1477 -- Single-Plane Field Balance Trial Weight (`calc-millwright.js`, Group G Cross-Trade Utilities, millwrighting, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-millwright.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; millwright, rotating equipment, and pneumatics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Field balancing a fan or a rotor without a balancing machine is a vector problem: one baseline reading, one trial-weight reading, and the difference tells you how much weight to add and where. It is done with a phasor sketch on the back of a work order, and it is arithmetic a tile does exactly.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a negative amplitude, a non-positive trial weight, or an effect vector of zero magnitude (the trial weight changed nothing) returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the single-plane trial-weight vector method as standard field-balancing practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`single plane balance`, `trial weight balancing`, `field balance fan`, `vector balancing calculation`, `influence coefficient balance`.

## 2. The tile

### 2.1 `single-plane-field-balance` -- Single-Plane Field Balance Trial Weight

```
original      O = amplitude and phase, no weight
trial         T = amplitude and phase, trial weight W_t at angle theta_t
effect        E = T - O          (vector subtraction)
correction    W_c = W_t x |O| / |E|
angle         move the trial weight by the angle from E to -O
```

The trial weight is not a guess at the correction, it is a probe: it tells you how the rotor responds to a
known weight at a known place. The effect vector `E` is that response, and once you have it the correction is
pure proportion -- scale the trial weight by the ratio of the original vibration to the response, and rotate it
so its effect points opposite the original.

Two rules keep it out of trouble. Size the trial weight to change the reading noticeably, by roughly 30% in
amplitude or 30 degrees in phase; too small and `E` is buried in measurement noise, too large and the machine may
be unsafe to run. And the trial weight comes OFF when the correction goes on, unless the correction is computed
as an adjustment to it -- leaving both on is the most common way a first balance attempt makes things worse.

**Inputs:** original amplitude and phase, trial weight mass and angular position, the amplitude and phase with the trial weight installed, and the direction convention for angles

**Outputs:** the effect vector magnitude and angle, the correction weight, the angle to place it, the influence coefficient for reuse on the same machine, and the predicted residual if the correction is applied

## 3. Worked example

A fan reading 6.2 mils at 45 degrees. A 10 g trial weight at 0 degrees changes the reading to
3.8 mils at 160 degrees:

```
O  = 6.2 < 45 deg   = +4.384 +4.384j
T  = 3.8 < 160 deg  = -3.571 +1.300j
E  = T - O          = -7.955 -3.084j = 8.53 < 201.2 deg
W_c = 10 x 6.2 / 8.53  = 7.27 g
angle: rotate E to oppose O -> move the weight 23.8 deg
```

Install 7.27 g at 23.8 degrees, remove the trial weight, and the predicted residual is near zero. Note that
the trial weight changed both amplitude AND phase substantially -- amplitude fell from 6.2 to 3.8 and phase
swung 115 degrees -- which is exactly the strong response that makes the arithmetic trustworthy. A trial that
barely moved the needle would make `E` small, the ratio large, and the answer unreliable.

## 4. Scope and non-goals

One correction plane, one speed, a rotor whose unbalance is genuinely single-plane (a narrow disc, an
overhung fan wheel). A long rotor has couple unbalance that single-plane balancing cannot fix and can make
worse; that needs a two-plane solution with cross-effects. The method assumes linearity -- that response is
proportional to weight -- which fails near a critical speed or when the machine has significant nonlinearity
from looseness. Balancing a machine whose vibration is NOT unbalance is the usual wasted afternoon: confirm 1x
dominance with radial phase steady across the bearing before adding weight, and rule out misalignment,
looseness, a bent shaft, resonance, and a cracked rotor first. Balance quality grade and permissible residual
are `rotor-balance-grade`. The machine manufacturer's balance requirements and a qualified analyst govern.
