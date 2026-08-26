# roughlogic.com Specification v1353 -- Refrigerated Thawing Time (calc-kitchen.js, Group O, kitchen and food service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, kitchen and food service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog has no thawing tile. Thawing is where the FDA Food Code is strictest and where kitchens most often fall out of compliance, because a 20 lb turkey moved from the freezer on Friday for a Sunday service does not thaw in time and ends up on a counter. The conduction estimate and the Food Code's four permitted methods belong in one place.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive dimension, density, latent heat, surface coefficient, or conductivity, or an ambient temperature at or below the thawing point, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): Plank's equation run in the thawing direction with unfrozen product properties, and FDA Food Code 3-501.13 for the permitted thawing methods, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `thaw-time` -- Refrigerated Thawing Time

```
t = (rho x Lf / (Ta - Tf)) x (P a / h + R a^2 / k_unfrozen)
```

Thawing is Plank's equation run the other way: the same latent heat, the same two resistances, but the driving
temperature difference is now the cooler *above* the thaw point instead of the freezer below it, and the internal
conduction happens through the *thawed* outer layer, whose conductivity is roughly a third of frozen product's.
Both changes push the same direction. A 40 F cooler gives a driving difference near 10 F where a -10 F freezer
gave 38 F, so thawing takes several times longer than freezing did -- which is exactly the fact kitchens get wrong.

The tile reports the estimate against the FDA Food Code's four permitted methods so the number lands with its
rule: under refrigeration at 41 F or below; submerged under running water at 70 F or below with the product
reaching 41 F or below within four hours; in a microwave immediately followed by cooking; or as part of the
cooking process itself. Countertop thawing is not on the list.

**Inputs:** characteristic dimension a (ft), shape, density (lb/ft3), latent heat (BTU/lb), thaw point (F),
cooler air temperature (F), surface coefficient h (BTU/hr-ft2-F), unfrozen conductivity k (BTU/hr-ft-F).

**Outputs:** thawing time in hours and days, the surface and internal terms separately, and the Food Code method
statement.

## 3. Worked example

A 12 lb turkey treated as a sphere of 0.7 ft equivalent diameter, `rho = 64 lb/ft3`, `Lf = 106 BTU/lb`, thaw
point 28 F, walk-in cooler at 38 F, `h = 2.0`, unfrozen `k = 0.28`:

```
driving term = 64 x 106 / (38 - 28)        = 6,784 / 10 = 678.4
surface      = (1/6) x 0.7 / 2.0           = 0.05833
internal     = (1/24) x 0.7^2 / 0.28       = 0.07292
t            = 678.4 x 0.13125             = 89.0 hr = 3.7 days
```

Cross-check against the USDA rule of thumb -- roughly 24 hours of refrigerator thawing per 4 to 5 pounds -- which
puts a 12 lb bird at 2.5 to 3 days. The conduction estimate lands a little longer, which is the safe direction.
Note that the internal term now *exceeds* the surface term, the reverse of the frozen slab: in thawing, thickness
usually controls, and blowing more air at a frozen turkey does very little.

## 4. Scope and non-goals

An estimate for planning a production schedule, not a food-safety determination. It assumes the product starts at
its thaw point rather than deeply frozen, so a product pulled at -10 F takes longer than this. It does not model
the running-water method, microwave thawing, or thaw-and-cook, and it does not track the surface temperature the
Food Code actually regulates -- a large product can have an outer inch sitting above 41 F for hours while the
center is still frozen. The FDA Food Code as adopted by the state, and the health inspector, govern.
