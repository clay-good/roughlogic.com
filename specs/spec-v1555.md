# roughlogic.com Specification v1555 -- Yaw Misalignment Power Loss (`calc-wind.js`, Group A Electrical, wind energy, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-wind.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; wind energy), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A turbine pointing twelve degrees off the wind loses more than most people guess, because the loss follows the cube of the cosine. It is the cheapest fault to find and one of the most commonly missed, and the arithmetic is one line a technician can run against a nacelle position log.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a yaw error at or beyond ninety degrees, or a negative power returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the cosine-power yaw loss convention with both the squared and cubed forms named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`yaw error power loss`, `yaw misalignment turbine`, `cos cubed yaw loss`, `nacelle direction bias`, `static yaw misalignment`.

## 2. The tile

### 2.1 `yaw-error-loss` -- Yaw Misalignment Power Loss

```
power loss      P / P_0 = cos^3( yaw error )        (commonly used approximation)
some models     cos^2 is used; the true exponent is between 2 and 3 and machine-specific
static error    a miscalibrated wind vane biases yaw ALL the time
annual cost     a persistent few degrees is a permanent few percent of revenue
```

The cube-of-cosine form comes from the rotor seeing only the component of wind along its axis, carried through
the cubic power relation. Small angles cost little -- five degrees is under 2% -- but the loss accelerates, and by
fifteen degrees it is over 3% and by thirty degrees it is 35%.

What makes yaw error expensive is not the magnitude but the persistence. A gust that swings the wind twenty
degrees for a minute costs nothing worth measuring; a wind vane that reads six degrees off, all year, costs a few
percent of annual revenue on every hour the machine runs, silently, with no alarm and no visible symptom. Static
yaw misalignment is routinely found on machines that have been running for years, and correcting it is a
calibration rather than a repair.

The field procedure this supports is comparing nacelle position against the free-stream wind direction over a
period and looking for a persistent bias rather than scatter. Scatter is the controller doing its job; a bias is
money.

**Inputs:** the yaw error angle, the reference power or annual energy, the exponent convention, and optionally the annual hours and energy price

**Outputs:** the power loss fraction and percentage, the retained power, the annual energy and revenue lost at a stated persistent error, the loss under both the squared and cubed conventions, and the error angle corresponding to a stated acceptable loss

## 3. Worked example

A machine running with a persistent 12 degree static yaw error:

```
loss = 1 - cos^3(12 deg) = 1 - 0.9359 = 0.0641 = 6.41%
```

6.4% of output, every hour, all year. On a 2.5 MW machine at a 40% capacity factor that is

```
annual energy  = 2,500 x 8,760 x 0.40      = 8,760 MWh
lost           = 8,760 x 0.0641             = 562 MWh
at $40/MWh                                  = $22,473 per year, per machine
```

On a thirty-turbine farm that is $674,188 a year from a wind vane calibration.

The shape of the curve, so a technician knows what to chase:

```
 5 deg -> 1.14%      10 deg -> 4.49%
15 deg -> 9.88%      20 deg -> 17.02%
30 deg -> 35.05%
```

Under five degrees is not worth chasing; over ten is.

## 4. Scope and non-goals

A simple cosine-power approximation. The true exponent is machine-specific and lies between 2 and 3; real
measured losses often fall closer to the squared form at small angles, so this tile reports both and the cubed
result should be read as the pessimistic bound. It does not account for the increased fatigue loading that yaw
misalignment causes, which on a persistent error can matter more than the energy, or for wind veer and shear
across the rotor which produce an effective misalignment that no yaw correction removes. It does not distinguish
static misalignment from dynamic yaw error and does not evaluate nacelle anemometer or vane transfer functions,
which is what a proper yaw calibration campaign does using a met mast or remote sensing. It does not address
cable twist, yaw drive loading, or yaw system faults. The turbine manufacturer's yaw calibration procedure and
the operator's performance engineer govern.
