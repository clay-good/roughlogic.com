# roughlogic.com Specification v1354 -- Fryer Oil Turnover, Life, and Annual Cost (calc-kitchen.js, Group O, kitchen and food service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, kitchen and food service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Frying oil is the largest consumable line in most kitchens after protein, and nothing in the catalog touches it. The number that governs oil life is not time on the fryer but turnover -- how fast the vat's whole charge is replaced by top-off oil -- and the arithmetic that turns product volume into a turnover rate and an annual dollar figure exists nowhere in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive vat capacity, daily product weight, absorption fraction, or oil price, or an absorption fraction outside 0-1, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the oil-absorption and turnover-rate practice used in commercial frying, and the total polar materials (TPM) discard threshold as adopted by state food codes, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `fryer-oil-turnover` -- Fryer Oil Turnover, Life, and Annual Cost

```
daily oil loss  = daily product weight x absorption fraction
turnover days   = vat capacity / daily oil loss
annual oil      = daily oil loss x operating days
annual cost     = annual oil x price per pound
```

Fried product carries oil out of the vat -- roughly 8% of its weight for a naked product, 10% to 15% for a
breaded or battered one. That loss is replaced with fresh oil, and the *turnover rate* is how many days it takes
for the replacement to equal the vat's whole charge. Turnover is the single best predictor of oil life, and it
runs opposite to intuition: a busy fryer with a three-day turnover holds better oil than a slow one with a
fifteen-day turnover, because the busy fryer is constantly diluting its own degradation products with fresh oil.
A slow fryer degrades on the clock whether or not anything is cooked in it.

The annual figure is the one that justifies a filter machine. A vat that turns over every three days is buying
its own capacity a hundred times a year.

**Inputs:** vat oil capacity (lb), daily product weight fried (lb), oil absorption fraction, operating days per
year, oil price per pound.

**Outputs:** daily oil loss (lb/day), turnover in days, annual oil consumption (lb/yr) and cost, with the
absorption fraction that produced them.

## 3. Worked example

A 50 lb vat, 120 lb/day of breaded product at 12% oil pickup, 360 operating days, oil at $1.10/lb:

```
daily loss    = 120 x 0.12       = 14.4 lb/day
turnover      = 50 / 14.4        = 3.5 days
annual oil    = 14.4 x 360       = 5,184 lb/yr
annual cost   = 5,184 x 1.10     = $5,702/yr
```

A 3.5-day turnover is healthy; oil in that vat is being replaced faster than it can polymerize, and with daily
filtration it will run well past two weeks before the polar-materials reading approaches the discard threshold.
Contrast a slow station: the same 50 lb vat frying 30 lb/day turns over in 13.9 days, and that oil will be dark
and smoking long before it has been fully replaced once.

## 4. Scope and non-goals

A planning and cost tile, not a discard decision. Oil is discarded on measured quality -- total polar materials,
free fatty acids, color, smoke point -- not on a computed turnover. Most states that regulate frying oil set the
TPM discard limit at 24% or 25%; check the adopted state food code, because the threshold and whether it is
mandatory both vary. Absorption fraction is a benchmark that depends on product, batter, temperature, and basket
loading; measure it on the actual menu item to make the annual figure real. The oil supplier, the fryer
manufacturer, and the health inspector govern.
