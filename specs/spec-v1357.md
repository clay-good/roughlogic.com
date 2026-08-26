# roughlogic.com Specification v1357 -- Dough Ball Weight from Thickness Factor (calc-kitchen.js, Group O, kitchen and food service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, kitchen and food service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group O has baker's percentage and desired dough temperature, but neither answers the question a pizza or pan-bread operation asks every day: what should this dough ball weigh for this pan size. The answer is an area-scaling problem -- dough weight tracks pan area, not diameter -- and scaling a 12 in recipe to a 16 in pan by eye gets it wrong by a third.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive pan dimension, thickness factor, or scaling ratio, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the thickness-factor method (dough ounces per square inch of pan area) used in commercial pizza and pan-bread production, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `dough-ball-scaling` -- Dough Ball Weight from Thickness Factor

```
round pan:      area = pi x (diameter / 2)^2
rectangular:    area = length x width
dough weight (oz) = thickness factor x area
scaled weight     = known weight x (new area / known area)
```

The thickness factor is dough ounces per square inch of pan, and it is the recipe's real constant. Once a shop
knows that its crust is right at a thickness factor of 0.10, every pan size in the house is one multiplication
away. Thin crust runs roughly 0.075 to 0.090, a standard hand-tossed 0.095 to 0.11, and a thick or pan style
0.12 and up.

The reason to compute rather than eyeball is that area goes as the *square* of the diameter. A 16 in pizza is not
a third bigger than a 12 in -- it is 78% bigger, and a dough ball scaled by diameter comes out visibly thin. The
tile's second output does exactly that conversion from a known-good ball weight.

**Inputs:** pan shape and dimensions (diameter, or length and width), thickness factor; or a known dough weight
and its pan size to scale from.

**Outputs:** pan area (sq in), required dough ball weight (oz), and the scaled weight when a reference ball is
given.

## 3. Worked example

A shop whose 16 in pie is right at a thickness factor of 0.10:

```
16 in: area = pi x 8^2  = 201.1 sq in -> 20.1 oz
14 in: area = pi x 7^2  = 153.9 sq in -> 15.4 oz
12 in: area = pi x 6^2  = 113.1 sq in -> 11.3 oz
18 in: area = pi x 9^2  = 254.5 sq in -> 25.4 oz
```

Scaling by diameter instead would have put the 12 in ball at 20.1 x (12/16) = 15.1 oz, a third heavy, and the 18
in at 22.6 oz, a tenth light. The whole ladder above comes from one measured ball and one division.

## 4. Scope and non-goals

Thickness factor is a shop constant, not a published one -- derive it from a dough ball the kitchen already likes
rather than from a benchmark. The tile assumes the dough is pressed to the full pan and does not account for a
raised rim, a docked versus undocked crust, par-baked shells, or the different behavior of a high-hydration dough
in a deep pan. It does not adjust for oven load or bake time. The recipe, the oven, and the person eating it
govern.
