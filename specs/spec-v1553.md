# roughlogic.com Specification v1553 -- Wind Weibull Distribution and Capacity Factor (`calc-wind.js`, Group A Electrical, wind energy, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-wind.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; wind energy), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Annual energy does not come from average wind speed, it comes from the DISTRIBUTION of wind speeds, and the Weibull distribution is how the industry describes it with two numbers. Using a mean speed instead systematically understates energy, because power is cubic and the windy hours carry most of it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive shape or scale parameter, a non-positive rated power, or a cut-out speed at or below cut-in returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Weibull distribution and energy pattern factor with IEC 61400-12 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`weibull wind distribution`, `capacity factor wind turbine`, `energy pattern factor`, `rayleigh wind speed distribution`, `annual energy production wind`.

## 2. The tile

### 2.1 `weibull-capacity-factor` -- Wind Weibull Distribution and Capacity Factor

```
Weibull pdf     f(v) = (k/c)(v/c)^(k-1) exp( -(v/c)^k )
mean speed      v_mean = c x Gamma(1 + 1/k)
k               shape: 1.5 to 2.5 typical; 2.0 is the Rayleigh special case
c               scale, close to but above the mean speed
energy pattern  E_pattern = mean of v^3 / (mean v)^3; about 1.9 at k = 2
capacity factor annual energy / (rated power x 8,760)
```

The energy pattern factor is the number that makes the point. At k = 2 the mean of the cubes is about 1.9
times the cube of the mean, so an energy estimate built on average wind speed alone is low by nearly half. Every
serious wind calculation is an integral of the power curve against the distribution for exactly this reason, and
the shape parameter controls how pronounced the effect is: a low k means a broad distribution with more very
windy hours and a higher energy pattern factor; a high k means steadier wind and less of the effect.

Capacity factor then puts the result in a comparable form. It is the honest measure of a site and machine
together, and it is what makes a large rotor on a modest tower comparable with a small rotor on a tall one. A
modern onshore machine at a decent site runs 35 to 45%; offshore runs higher. A capacity factor claimed above
about 60% onshore deserves the same scepticism as a power coefficient above Betz.

**Inputs:** Weibull shape and scale parameters (or the mean speed and shape), the turbine power curve or rated power with cut-in, rated, and cut-out speeds, and the availability and loss factors

**Outputs:** the mean wind speed from the distribution, the energy pattern factor, the fraction of hours in each speed band, the annual energy production against an entered power curve, the capacity factor, and the hours below cut-in and above cut-out

## 3. Worked example

A site with Weibull k = 2.0 and c = 18 mph:

```
mean speed = 18 x Gamma(1 + 1/2.0) = 18 x 0.8862 = 15.95 mph
energy pattern factor at k = 2                       ~ 1.91
```

The mean is 16.0 mph, but the energy in the wind is **1.91 times** what that mean alone would suggest. An
estimate built by putting 16.0 mph into the cube law understates the resource by nearly half, and that single
error has sunk more small-wind projects than any equipment problem.

Capacity factor: a 2.5 MW machine producing 8,800 MWh a year runs

```
CF = 8,800,000 / (2,500 x 8,760) = 0.402 = 40.2%
```

which is a good onshore site. The same machine at 5,500 MWh is 25%, which is a marginal one, and the difference
between them is mostly the distribution rather than the hardware.

## 4. Scope and non-goals

A distribution and capacity-factor calculation from Weibull parameters the user supplies. Fitting those
parameters requires a year or more of measured data at or near hub height; parameters taken from a wind atlas or
a nearby station are indicative only and are routinely wrong for a specific site, especially in complex terrain.
It does not perform the power-curve convolution against the distribution unless a power curve is entered, and a
capacity factor computed from rated power alone ignores the machine's actual curve. It does not account for wake
losses within an array, availability, electrical and transformer losses, blade soiling and icing, curtailment for
noise, shadow flicker or wildlife, or high-wind hysteresis at cut-out -- all of which reduce real production
below the gross figure, typically by 10 to 20% combined. A bankable energy assessment to IEC 61400-12 by an
independent assessor, and the manufacturer's warranted power curve, govern.
