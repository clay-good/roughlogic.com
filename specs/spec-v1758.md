# roughlogic.com Specification v1758 -- Greenhouse Thermal Screen Heat Saving (`calc-greenhouse.js`, Group C HVAC, greenhouse and controlled-environment agriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-greenhouse.js`**
> (Group C HVAC, hub `/groups/hvac/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A greenhouse loses heat through a very large area of very poor glazing, and a retractable screen pulled at night is the one measure that changes that without rebuilding the house. The saving is a fraction of an envelope loss, and the fraction is large because the envelope is so bad to begin with.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive envelope area, U-factor, temperature difference, or hour count, a UA reduction outside 0 to 1, or a non-positive efficiency or price returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the UA heat-loss relation and published screen reduction ranges with NGMA design practice and the screen manufacturer's data named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`greenhouse energy screen`, `thermal curtain heat saving`, `night curtain greenhouse`, `retractable screen payback`, `greenhouse heat retention screen`.

## 2. The tile

### 2.1 `thermal-screen-energy-saving` -- Greenhouse Thermal Screen Heat Saving

```
envelope         a greenhouse is nearly all glazing: roof slopes, sidewalls, and
                 gable ends, and the roof is the largest piece
base loss        UA = envelope area x U; single poly is near U 1.2, double poly
                 near 0.7, and glass near 1.1 Btu/h-sq ft-degF
screen effect    a deployed screen cuts the whole-house UA by roughly 25 to 50%
                 depending on the fabric and, critically, on how well it seals
night hours      the screen only works when it is closed: heating-season nights
seasonal saving  Btu = (UA_open - UA_closed) x average night dT x night hours
fuel             divide by the heating plant's efficiency before pricing it
payback          installed screen cost / annual fuel saving
light cost       a screen left closed into the morning costs light, and light is
                 the thing the winter house has least of (`shade-cloth-transmission`)
```

A greenhouse is a building with a terrible envelope by design, and that is what makes a screen pay. A house
with an envelope U near 1.2 loses more heat per square foot in an hour than a code wall loses in a day, and
the envelope area is larger than the floor because the roof is sloped and the walls are glazed. Cutting a
third off a very large number is a larger saving than cutting a third off a good building's much smaller one.

The seal decides the result, not the fabric rating. A screen works by trapping a still air layer and by
blocking radiation to the cold sky, and both mechanisms are defeated by a gap. An edge that does not close to
the sidewall, a gap at the gutter, or a bunched section over a crop wire lets warm air convect straight past
the screen, and a well-rated fabric hung with poor edge seals commonly delivers half its published saving. The
fabric is chosen once; the sealing detail is what the installer is being paid for.

The screen has a cost in light and it falls in the season with the least to spare. Every hour the screen stays
closed after sunrise is an hour of a December day's small light budget removed, and December light is already
short of most crop targets (`ppfd-daily-light-integral`). The control sequence that opens the screen on a light
level rather than a clock is the one that keeps the energy saving from being paid for in growth.

**Inputs:** the house dimensions or envelope area, the glazing U-factor, the screen's UA reduction, the heating-season nights and night hours, the average night temperature difference, the heating plant efficiency, the fuel price, and the installed screen cost

**Outputs:** the envelope area and base UA, the UA with the screen deployed, the seasonal heat saved, the fuel saved in therms or equivalent, the annual dollar saving, and the simple payback

## 3. Worked example

The 30 by 96 ft house, single poly at U 1.2:

```
gable ends = 2 x (30 x 12 + 0.5 x 30 x 6) = 900 sq ft
sidewalls  = 2 x 96 x 12                  = 2,304 sq ft
roof       = 2 x 96 x sqrt(15^2 + 6^2)    = 3,102 sq ft
envelope   = 6,306 sq ft
UA         = 6,306 x 1.2 = 7,567 Btu/h-degF
```

**The envelope is 6,306 sq ft against a floor of 2,880 -- 2.19 times the floor area.** That ratio is the reason a
greenhouse heating bill looks nothing like a building's, and the roof alone is 49 percent of it.

**A screen cutting the UA by 35% takes it to 4,919 Btu/h-degF.** Over a heating season of 180 nights at 12 hours
each and an average night difference of 40 degF:

```
saved = (7,567 - 4,919) x 40 x 2,160 = 228,826,864 Btu
      = 228.8 million Btu at the house
fuel  = 228.8 / 0.80 = 286.0 million Btu of gas = 2,860 therms
value = 2,860 x $1.20 = $3,432 per year
```

**$3,432 a year from one house.** At an installed $4.00 per square foot of floor the screen costs $11,520, so the
simple payback is:

```
payback = $11,520 / $3,432 = 3.36 years
```

**Under three and a half years on a fabric that lasts ten or more**, which is why energy screens are standard on
new construction in any cold climate and why they are the first retrofit recommended on an old house.

**The number that does not appear in the payback is the light.** Holding the screen closed two extra hours on a
December morning to protect the saving removes those hours from a daily light integral that is already below
the crop target, and the crop pays for the fuel. **Open on a light level, not on a clock.**

## 4. Scope and non-goals

An energy and payback estimate. The screen's UA reduction is the dominant term and it is entered rather than derived, because the field value depends on the fabric, the edge and gutter seals, the gap at the ends, and how the screen sits over crop wires and hanging baskets -- a well-rated fabric poorly sealed commonly delivers half its published figure, and this cannot detect that. It uses a single average night temperature difference in place of a degree-hour integration and a single deployment schedule in place of a control sequence, so it is a planning figure, not a measured saving. It does not compute the house heating load itself (`building-ua` does that for a building generally), size or select the heating plant, address condensation and drip from the underside of a closed screen, or price the light the crop loses to a screen held closed after sunrise. It takes no position on the screen's fire rating, structural support, or the shading it causes when retracted. NGMA design practice, the screen manufacturer's data, and the greenhouse designer govern.
