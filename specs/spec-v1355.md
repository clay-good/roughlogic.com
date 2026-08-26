# roughlogic.com Specification v1355 -- Keg Yield, Pours, and Cost per Ounce (calc-kitchen.js, Group O, kitchen and food service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, kitchen and food service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group O prices a drink and computes a pour cost, but nothing turns a keg into the number of servings it actually yields. The gap between the theoretical yield and the real one is foam and line loss, and it is the difference between a 20% pour cost and a 28% one. No tile computes it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive keg volume, serving size, keg cost, or menu price, or a loss fraction outside 0-1, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the standard US keg volumes (half barrel 15.5 gal, quarter 7.75 gal, sixth barrel 5.16 gal, full barrel 31 gal) and the draft-yield loss practice, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `keg-yield` -- Keg Yield, Pours, and Cost per Ounce

```
gross ounces = keg gallons x 128
net ounces   = gross ounces x (1 - loss fraction)
servings     = net ounces / serving ounces
cost/serving = keg cost / servings
pour cost %  = cost per serving / menu price x 100
```

A half barrel is 15.5 gallons, which is 1,984 fluid ounces, which on paper is 124 sixteen-ounce pints. Nobody
gets 124. Foam at the tap, the first pull of a new keg, line cleaning, the heel left in the keg, and the head on
every glass take 10% to 20% off the top, and a poorly balanced system takes more. The whole point of the tile is
that the *net* number, not the gross one, is what the pour cost has to be computed against -- pricing off 124
pints when the bar pours 105 understates the cost by 18%.

The catalog's existing pour-cost tile prices a drink from a known cost per ounce. This one produces that cost per
ounce from the keg, and it is the missing first step.

**Inputs:** keg size (half barrel, quarter, sixth barrel, full barrel, or a custom gallon figure), serving size
(oz), loss fraction, keg cost, menu price per serving.

**Outputs:** gross and net ounces, servings per keg, cost per serving, and pour cost percentage.

## 3. Worked example

A $150 half barrel poured as 16 oz pints with a 15% loss fraction, sold at $7:

```
gross    = 15.5 x 128         = 1,984 oz
net      = 1,984 x 0.85       = 1,686 oz
servings = 1,686 / 16         = 105.4 pints
cost     = 150 / 105.4        = $1.42 per pint
pour cost= 1.42 / 7.00        = 20.3%
```

Now tighten the system. Cutting the loss from 15% to 8% yields 114.1 pints, drops the cost to $1.31, and moves
the pour cost to 18.8% -- $11 of margin per keg, from balancing the draft lines rather than raising the price.
The catalog's draft beer line balancing tile is where that work happens.

## 4. Scope and non-goals

Yield arithmetic, not a beverage-control system. Loss fraction is an operating measurement, not a constant --
measure it by counting rung sales against kegs tapped over a month. The tile does not model shrinkage from
comps, spillage, or theft, does not compute CO2 cost (that is its own tile), and takes no position on serving
size, which in many states is regulated for "pint" labeling. The distributor's invoice and the state alcoholic
beverage authority govern.
