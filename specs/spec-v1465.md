# roughlogic.com Specification v1465 -- Distribution Feeder I2R Loss and Loss Factor (`calc-lineworker.js`, Group A Electrical, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Feeder losses are not average current squared times resistance, because losses go as the square of a current that varies all day. The bridge is the loss factor, an empirical function of load factor, and skipping it overstates annual loss energy by a wide margin.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive current, resistance, or length, or a load factor outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the loss-factor approximation and the I2R loss relation as standard distribution practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`feeder loss load factor`, `loss factor distribution`, `i2r annual loss`, `feeder loss energy`, `peak loss to annual energy`.

## 2. The tile

### 2.1 `feeder-loss-load-factor` -- Distribution Feeder I2R Loss and Loss Factor

```
peak loss      P_peak = 3 I_peak^2 R_total          (three-phase, R_total = r x L)
load factor    LF = average demand / peak demand
loss factor    LsF = 0.3 LF + 0.7 LF^2                (the standard approximation)
annual loss    E = P_peak x LsF x 8,760 h
```

Because loss is quadratic in current, the average of the square is not the square of the average, and the ratio
between them is the loss factor. It is bounded by `LF^2` at one end and `LF` at the other -- a perfectly flat load
loses at `LF`, a load that is either at peak or off loses at `LF^2` -- and the 0.3/0.7 blend is the long-standing
utility approximation between them.

The practical consequence is that a feeder with a poor load factor loses much less energy than its peak loss
suggests. That cuts both ways: it means loss savings from reconductoring or capacitor placement are smaller than
a peak-based estimate, and it means the economic case for either has to be built on the loss factor, not the
peak.

**Inputs:** peak current per phase, conductor resistance per unit length, feeder length, load factor, and optionally an energy cost

**Outputs:** the total resistance, peak loss in kW, the loss factor, annual loss energy in kWh, the annual cost at the entered energy price, and the loss as a percent of energy delivered

## 3. Worked example

A three-phase feeder, 4.2 miles of conductor at 0.29 ohms per mile, peaking at 180 A per phase, load factor
0.55:

```
R_total = 0.29 x 4.2 = 1.218 ohms
P_peak  = 3 x 180^2 x 1.218 / 1000 = 118.39 kW
LsF     = 0.3(0.55) + 0.7(0.55)^2 = 0.165 + 0.212 = 0.377
E       = 118.39 x 0.377 x 8,760 = 390,725 kWh/yr
```

390,725 kWh a year. Had the loss been taken at peak for all 8,760 hours it would read 1,037,093 kWh --
2.7 times too high. Using `LF` alone instead of the loss factor gives 570,401 kWh, still
46% high. At $0.09/kWh the real figure is $35,165 a year of copper losses on one feeder.

## 4. Scope and non-goals

Conductor I2R loss on one balanced three-phase feeder with the load treated as concentrated at the end. A real
feeder has load distributed along it, which for a uniformly distributed load makes the effective loss about a
third of the concentrated value -- a large correction this tile does not apply, so read it as an upper bound
unless the load genuinely is at the end. It does not include transformer core and copper losses, which on a
distribution system are usually the larger share of total losses, nor neutral, secondary, or service losses.
The 0.3/0.7 loss-factor coefficients are a widely used approximation, not a measurement, and utilities carry
their own. The utility's loss study and metered load data govern.
