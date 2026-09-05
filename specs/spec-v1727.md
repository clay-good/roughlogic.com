# roughlogic.com Specification v1727 -- Downwind Ground-Level Concentration Screen (Gaussian) (`calc-airquality.js`, Group G Cross-Trade Utilities, air quality, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-airquality.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; air quality and environmental), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A screening estimate of downwind concentration puts an emission rate over a wind speed and a plume cross-section, and the plume's spread grows with distance and with atmospheric instability. It is the arithmetic behind every dispersion model and it is worth understanding before trusting one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive emission rate, wind speed, or dispersion coefficient, or a downwind distance at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Gaussian plume relation and Pasquill-Gifford stability classes by name, with EPA approved models named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`gaussian plume screening`, `downwind concentration estimate`, `pasquill gifford stability`, `sigma y sigma z dispersion`, `ground level concentration stack`.

## 2. The tile

### 2.1 `gaussian-dispersion-screen` -- Downwind Ground-Level Concentration Screen (Gaussian)

```
centreline ground  C = Q / (pi u sigma_y sigma_z) x exp( -H^2 / (2 sigma_z^2) )
                   for a ground-level receptor under an elevated plume
Q                  emission rate; u the wind speed at stack height
sigma_y, sigma_z   horizontal and vertical dispersion coefficients, functions of
                   downwind distance and stability class
stability          A (very unstable) through F (very stable); Pasquill-Gifford classes
H                  effective stack height (`plume-rise-briggs`)
maximum            occurs at a distance where the plume has spread enough to reach the
                   ground but not yet dispersed; not at the stack and not far away
```

The structure of the relation explains the shape of a plume's ground-level impact. Close to the stack the
plume is narrow but has not reached the ground, so concentration is near zero; far away it has reached the ground
but is thoroughly diluted, so concentration is again low. In between is a maximum, and its location depends on
effective height and stability -- which is why a receptor at the fence line may see less than one half a mile
away, and why "further is always better" is wrong.

Stability class is the variable that swings the answer most. Unstable daytime conditions mix a plume rapidly and
bring it to ground close in at moderate concentrations; stable nocturnal conditions keep it coherent for miles
and can produce high concentrations at a distant receptor. So the worst case is not a single condition, and a
screening run has to sweep stability and wind speed together.

The exponential in effective height is why plume rise matters so much. Ground-level concentration falls very
steeply with effective height, so the hundred feet of rise from `plume-rise-briggs` can be worth an order of
magnitude in ground concentration -- and an estimate that assumes ground-level release from an elevated stack is
not conservative, it is wrong by that factor.

None of this is a regulatory analysis. It is the shape of the problem, useful for understanding and for
sanity-checking a model's output rather than for a permit.

**Inputs:** the emission rate, the effective stack height, the wind speed at stack height, the stability class, the downwind distance, and the dispersion coefficients for that distance and class

**Outputs:** the dispersion coefficients at the entered distance and stability, the centreline ground-level concentration, the distance at which the maximum occurs, the maximum concentration, and the concentration at an alternative stability class for comparison

## 3. Worked example

A source emitting 10 g/s from an effective height of 220 ft (67 m), wind 4 m/s, at 1 km downwind.

Under neutral (class D) conditions at 1 km, the Pasquill-Gifford coefficients give sigma_y and sigma_z of roughly
70 m and 32 m:

```
C = Q / (pi u sigma_y sigma_z) x exp( -H^2 / (2 sigma_z^2) )
  = 10 / (pi x 4 x 70 x 32) x exp( -67^2 / (2 x 32^2) )
  = 10 / 28,150 x exp(-2.19)
  = 3.55e-4 x 0.112 = 4.0e-5 g/m3 = 40 micrograms per cubic metre
```

**Now change the stability to F (very stable), where the plume stays coherent.** Sigma_z at 1 km falls to
perhaps 14 m:

```
exp( -67^2 / (2 x 14^2) ) = exp(-11.4) = 1.1e-5
```

Essentially nothing at the ground at 1 km -- the plume is still aloft. But at 5 km, where sigma_z has grown
enough for the plume to reach the ground while remaining narrow, the stable case produces a HIGHER concentration
than the neutral case did at 1 km.

**That is the shape worth carrying**: the maximum is not at the fence line and not at the horizon, and its
location moves with stability. A receptor screened at one distance under one condition has not been screened.

**And the height exponential.** Halve the effective height to 33 m and the exponential term becomes
`exp(-33^2/(2x32^2))` = 0.58 instead of 0.112 -- **five times the concentration**, from effective height alone.
Which is why `plume-rise-briggs` matters as much as the emission rate does.

## 4. Scope and non-goals

A screening relation, not a dispersion analysis. The Gaussian plume equation assumes flat terrain, steady
uniform wind, constant emission, no chemical transformation or deposition, and reflection at the ground -- none of
which holds exactly, and several of which fail badly in real terrain or in calm conditions. Pasquill-Gifford
dispersion coefficients are empirical curve fits from specific field experiments over particular surfaces and
distances, and extrapolating them is not defensible. For any regulatory purpose -- permit applications, ambient
standard demonstrations, increment consumption, or risk assessment -- an EPA-approved model such as AERMOD with
processed meteorological data, terrain, building downwash, and the applicable modelling protocol is required, and
its results govern. This tile is for understanding the shape of the problem and sanity-checking a model, not for
demonstrating compliance. EPA's Guideline on Air Quality Models and the permitting authority govern.
