# roughlogic.com Specification v1481 -- Refrigerated and Desiccant Air Dryer Sizing (`calc-millwright.js`, Group G Cross-Trade Utilities, pneumatics, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-millwright.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; millwright, rotating equipment, and pneumatics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A refrigerated dryer's catalog number is stated at one set of conditions -- 100 psig inlet, 100 degF inlet air, 100 degF ambient -- and a plant almost never sits at all three. The correction factors are multiplicative, they can easily take a 200 scfm dryer below 150, and a dryer selected on its badge number is the reason water comes out of the drops.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive rated or actual flow, or any correction factor at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the multiplicative correction-factor method for dryer selection as standard compressed-air practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`air dryer sizing`, `refrigerated dryer correction`, `desiccant dryer purge`, `compressed air dew point`, `dryer capacity derate`.

## 2. The tile

### 2.1 `air-dryer-sizing` -- Refrigerated and Desiccant Air Dryer Sizing

```
corrected capacity   Q_corr = Q_rated x C_temp x C_press x C_ambient
required rating      Q_req = Q_actual / (C_temp x C_press x C_ambient)
pressure dew point   the dryer's rating class; desiccant for below freezing
desiccant purge      regenerative dryers consume 10 to 18% of throughput
```

Every correction runs the same way: hotter inlet air carries far more water and derates the dryer, lower
pressure means more actual volume per unit mass and derates it, and a hotter ambient hurts the condenser and
derates it again. Because they multiply, three individually modest factors compound -- 0.80 times 1.10 times
0.95 is 0.836, so a nominally adequate dryer is 16% short.

The choice between refrigerated and desiccant is a dew point decision, not a capacity one. A refrigerated dryer
holds roughly a 35 to 40 degF pressure dew point and cannot go below freezing without icing; anything running
outdoors, feeding an unheated line, or supplying instrument or breathing air needs desiccant. The cost of
desiccant is the purge: a heatless regenerative dryer diverts 15% or so of its own throughput to regenerate the
offline tower, and that purge is real compressor capacity that must be added to the compressor sizing, not
subtracted from the dryer's.

**Inputs:** actual air flow, inlet air temperature, operating pressure, ambient temperature, the manufacturer correction factors for each, the dryer type, and the purge rate for a regenerative dryer

**Outputs:** the combined correction factor, the corrected capacity of a candidate dryer, the required rated capacity for the actual flow, the purge consumption and total compressor load for a desiccant unit, and the resulting pressure dew point class

## 3. Worked example

A system moving 200 scfm, with correction factors of 0.8 for a hot inlet, 1.1 for pressure, and 0.95 for a
warm equipment room:

```
combined factor = 0.8 x 1.1 x 0.95 = 0.8360
Q_req = 200 / 0.8360 = 239.2 scfm rated
```

A 200 scfm nameplate dryer would deliver only `200 x 0.8360` = 167.2 scfm here and pass wet air
downstream. The correct selection is the next size above 239 scfm.

If the application needs a low dew point and a heatless desiccant unit is selected instead, add the purge: at
15% the compressor must supply `200 / (1 - 0.15)` = 235.3 scfm to deliver 200 scfm to the plant, which is
35.3 scfm of compressor capacity that exists only to dry air.

## 4. Scope and non-goals

Capacity correction and purge accounting from manufacturer factors the user supplies. It does not ship
correction tables -- those are per-model manufacturer data and differ substantially between refrigerated
designs -- and it does not compute the moisture load from first principles, which needs the inlet air's actual
humidity. It does not size filtration, which must precede a desiccant dryer or the desiccant is destroyed by
oil, does not size the drains, and does not evaluate the pressure drop the dryer and filters add (routinely 3
to 8 psid, which is real compressor energy). Cycling and variable-speed refrigerated dryers behave differently at
part load than the fixed-capacity assumption here. Compressor sizing is `air-compressor-cfm-sizing`. The dryer
manufacturer's performance data and correction factors govern.
