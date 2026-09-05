# roughlogic.com Specification v1564 -- Laundry Water, Sewer, and Energy Cost per Pound (`calc-steamplant.js`, Group G Cross-Trade Utilities, commercial laundry, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steamplant.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; steam plant and commercial laundry), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Cost per pound is the number that decides whether to wash in house or send it out, and it has four parts that people count unevenly. Water and sewer are usually counted; the energy to heat the water and evaporate it in the dryer usually is not, and it is the largest share.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive poundage, water use per pound, or efficiency, or a negative rate returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the component cost build-up with the 1,200 BTU per pound evaporation figure as standard laundry practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`laundry cost per pound`, `cost per hundredweight laundry`, `opl operating cost`, `laundry water sewer energy cost`, `in house versus outsource laundry`.

## 2. The tile

### 2.1 `laundry-cost-per-pound` -- Laundry Water, Sewer, and Energy Cost per Pound

```
water          gal/lb x (water rate + sewer rate)
hot water       gal/lb x hot fraction x 8.34 x dT / efficiency x fuel cost
drying          lb water evaporated x ~1,200 BTU/lb / dryer efficiency x fuel cost
chemistry       cost per hundredweight from the supplier
labor           the largest single line in most on-premise laundries
total           dollars per pound, or per hundredweight
```

The two energy lines are where the money hides. Heating water from 60 to 140 degF costs about 667 BTU per
gallon before boiler losses, and at 1.8 gallons per pound that is well over a thousand BTU per pound of linen
before anything is dried. Drying then costs roughly 1,200 BTU for every pound of water carried into the dryer,
and how much water that is depends entirely on the extraction G-force -- which is why extraction is the single
highest-leverage equipment decision in a laundry.

Labor usually exceeds all of it. In most on-premise laundries labor is half or more of the cost per pound, which
means throughput improvements that reduce handling (`laundry-washer-turns`) move the number more than any
utility rate negotiation. A cost-per-pound calculation that omits labor produces a figure that makes in-house
laundry look far cheaper than outsourcing, and that is the error that gets made.

Water and sewer deserve one caution: sewer is often billed on water consumed and is frequently the larger of the
two rates, so a reuse or ozone system saves on both lines at once.

**Inputs:** pounds processed, gallons per pound, water and sewer rates, incoming and wash temperatures, hot water fraction and heater efficiency, fuel cost, retained moisture after extraction, dryer efficiency, chemical cost per hundredweight, and labor hours and rate

**Outputs:** the cost per pound and per hundredweight broken out by water, sewer, hot water energy, drying energy, chemistry, and labor; the total daily and annual cost; and the saving from a stated improvement in extraction or turns

## 3. Worked example

A plant processing 4,000 lb a day at 1.8 gal/lb, water $0.006/gal and sewer $0.008/gal:

```
water + sewer = 1.8 x ($0.006 + $0.008) = $0.0252 per lb
```

Now the energy nobody counts. Heating 60% of that water from 60 to 140 degF at 80% efficiency, gas at $9 per
MMBTU:

```
BTU/lb = 1.8 x 0.60 x 8.34 x 80 / 0.80 = 901 BTU per lb
cost                                        = $0.0081 per lb
```

And drying, at 45% retained moisture after extraction and 70% dryer efficiency:

```
water to evaporate = 0.45 lb per lb of linen
BTU/lb             = 0.45 x 1,200 / 0.70 = 771 BTU per lb
cost                                      = $0.0069 per lb
```

Utilities total $0.0402 per lb, of which
**37% is energy** and only
63% is the water and sewer bill people look at.

Improve extraction so retained moisture falls from 45% to 35% and the drying line drops to
$0.0054 per lb -- $1,851 a year at 4,000 lb a day, 300 days.

## 4. Scope and non-goals

A cost model from rates and factors the user supplies. It is only as good as the inputs, and two of them --
gallons per pound and retained moisture after extraction -- vary widely with the equipment, the wash formula, and
the classification of goods, and should be measured rather than assumed. It does not include equipment
depreciation, maintenance, water treatment, or the cost of linen replacement driven by wash severity, which on a
healthcare account can exceed the utility cost. It does not evaluate water reuse, ozone, or heat recovery
systems, and it does not address the compliance costs of healthcare or food-service laundry. Comparisons with
commercial laundry service pricing must account for what that price includes, which is usually linen, delivery,
and loss replacement. The utility tariffs, the chemical supplier, and the equipment manufacturer's data
govern.
