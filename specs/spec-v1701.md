# roughlogic.com Specification v1701 -- Pool Cover Evaporation and Heat Loss Savings (`calc-water.js`, Group M Water and Wastewater Operations, pool service, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`**
> (Group M, Water and Wastewater Operations -- the existing category, hub `/groups/water/`; pool and spa service), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Most of a heated pool's energy leaves as evaporation from the surface, and a cover stops most of it. The saving is a latent-heat calculation and it is large enough that a cover is usually the highest-return item a pool owner can buy.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pool area or evaporation rate, or a cover effectiveness or hours-covered fraction outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the latent heat evaporation relation with ASTM F1346 named for safety covers, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pool cover energy savings`, `pool evaporation heat loss`, `pool blanket payback`, `evaporation rate pool`, `pool water loss cover`.

## 2. The tile

### 2.1 `pool-cover-savings` -- Pool Cover Evaporation and Heat Loss Savings

```
evaporation loss   the dominant loss on a heated outdoor pool -- commonly 70% of the total
latent heat        about 1,046 BTU per pound of water evaporated
evaporation rate   depends on water and air temperature, humidity, and wind
                   wind is the strongest variable; a sheltered pool loses far less
cover reduction    a cover reduces evaporation by 90 to 95% while in place
saving             evaporation reduction x latent heat x hours covered
other losses       radiation, convection, and conduction continue but are much smaller
water              a cover also saves the make-up water and the chemicals in it
```

Evaporation dominates because it is a latent process: every pound of water that leaves takes over a thousand
BTU with it, so a pool losing a quarter inch of water a day is losing an enormous amount of heat regardless of
the air temperature. That is why an uncovered heated pool in mild weather still costs a great deal to heat, and
why the intuition that a warm night should be cheap is wrong.

Wind is the variable that moves it most. Evaporation scales with the vapour pressure difference and with air
movement over the surface, so a sheltered pool and an exposed one at the same temperature lose very different
amounts -- and a windbreak is a real energy measure rather than a comfort one.

The cover works by stopping the mass transfer, which stops the latent loss almost entirely while it is on. The
saving is therefore proportional to the hours covered, and a cover used only on cold nights captures much less
than one used whenever the pool is not in use. That is an operational number rather than a product one, and it is
where the difference between a manual cover and an automatic one shows up: automatic covers get used.

The water and chemical saving rides along and is not trivial -- evaporated water is replaced with fresh water that
has to be balanced and sanitized.

**Inputs:** pool surface area, the evaporation rate in inches per day, the cover effectiveness, the fraction of hours covered, the heater efficiency and fuel cost, and the water and chemical cost

**Outputs:** the daily water evaporated in gallons and pounds, the heat that evaporation carries away, the saving from the cover at the entered effectiveness and hours covered, the annual energy and cost saved, and the water and chemical saving

## 3. Worked example

An 800 sq ft pool evaporating 0.25 in per day:

```
water evaporated = 800 x 0.25/12 = 16.7 cu ft = 125 gallons/day
                 = 1040 lb/day
heat lost        = 1040 x 1,046 = 1.09 MMBTU/day
```

**1.09 MMBTU a day** to evaporation alone -- and that is on a pool losing only a quarter inch.

A cover at 90 percent effectiveness, on for 16 hours a day:

```
saving = 1.09 x 0.90 x (16/24) = 0.65 MMBTU/day
```

At 82 percent heater efficiency and $12 per MMBTU over a 180 day season:

```
0.65 / 0.82 x 12 x 180 = $1,719 per season
```

**$1,719**, which pays for most covers in one season and every cover in
two.

Plus the water: `125 x 0.90 x (16/24) x 180` = 13,466 gallons a season not
evaporated, and not replaced, and not chemically balanced.

The hours-covered term is the one the owner controls. The same cover used only overnight on cold nights captures
a fraction of this, which is the practical argument for an automatic cover over a manual one.

## 4. Scope and non-goals

An energy calculation using an evaporation rate the user supplies. Evaporation rate is not a constant: it
depends on water and air temperature, relative humidity, and especially wind speed, and it varies through the day
and the season. A measured rate from the pool's own make-up water consumption is far better than a table value,
and it automatically accounts for the site. It does not model evaporation from first principles, address the
other heat losses (radiation, convection, conduction to ground), or size a heater. It does not address the
safety requirements for pool covers, which are separate: a solar or thermal blanket is not a safety cover and
does not prevent drowning, and safety covers are a different product with their own standards. It does not
address the effect of a cover on sanitizer demand and water chemistry, which changes when a pool is covered.
The cover and heater manufacturers' data, ASTM F1346 for safety covers, and the applicable pool code govern.
