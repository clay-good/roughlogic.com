# roughlogic.com Specification v1448 -- Wall and Ceiling Texture Material Takeoff (calc-finish.js, Group E, finish trades, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finish.js`**
> (Group E, finish trades), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog counts drywall sheets, mud, and corner bead but stops before texture, which is the last material ordered and the one most often short. Coverage per bag varies by three times across texture types, so a takeoff done from a remembered number is wrong by whole pallets on a production job.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive area, coverage rate, or bag weight, or a waste factor below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the published dry-mix and ready-mix texture coverage rates by texture type and the mix-water ratios that accompany them, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `texture-material-takeoff` -- Wall and Ceiling Texture Material Takeoff

```
net area      = gross area - openings
bags required = ceil(net area x (1 + waste factor) / coverage per bag)
dry weight    = bags x bag weight
mix water     = bags x water per bag
buckets       = for ready-mix, net area / coverage per container
```

Texture coverage is not one number, and treating it as one is the whole reason this tile exists. A light orange
peel spreads thin and covers a great deal per bag; a heavy knockdown or a splatter-and-trowel covers a fraction of
that; a popcorn ceiling texture is different again because it is applied thick and dry. Between the lightest and
heaviest common textures the coverage ratio is three to one or more, which on a house-sized job is the difference
between eight bags and twenty-five.

Water matters for a reason beyond ordering: mix ratio controls consistency, consistency controls the texture
pattern, and a bag mixed wetter than the last one produces a visibly different wall. Reporting the water with the
bag count is what keeps a two-day job looking like one job.

The waste factor is not padding. Texture is sprayed, so overspray, hopper cleanout, the material left in the hose,
and the inevitable partial bag at the end are real and run 10% to 15%.

**Inputs:** gross area, opening deductions, texture type and its coverage per bag, bag weight, water per bag,
waste factor.

**Outputs:** net area, bags required, total dry weight, total mix water, and pallets or containers.

## 3. Worked example

A 2,400 sq ft ceiling in a knockdown texture covering 225 sq ft per 40 lb bag, 10% waste, mixed at 1.4 gal of
water per bag:

```
bags before waste = 2,400 / 225            = 10.7 -> 11 bags
with 10% waste    = ceil(2,640 / 225)      = 12 bags
dry weight        = 12 x 40                = 480 lb
mix water         = 12 x 1.4               = 16.8 gal
```

Twelve bags and about seventeen gallons of water. Change nothing but the texture: at a heavy splatter covering 120
sq ft per bag the same ceiling takes 22 bags, and at a light orange peel covering 350 it takes 8. That is the
range a single remembered "about ten bags" is trying to cover, and it is why the coverage rate has to come from
the product, not from memory.

## 4. Scope and non-goals

Material quantity only. Coverage rates are manufacturer figures for a specific product applied at a specific
consistency by a specific method, and hand-applied, hopper-sprayed, and pump-sprayed applications of the same
product differ. The tile does not price labor, size the equipment, or address surface preparation and primer,
which determine whether the texture bonds and whether it flashes -- an unprimed or unevenly primed board will show
through any texture. It does not address the finish level of the drywall underneath, which governs how much
texture is needed to hide the joints, or lighting conditions, which is what makes a texture job pass or fail. It
does not address **asbestos in existing textures**, which must be assumed present in pre-1980 popcorn ceilings
until tested and which is a regulated abatement, not a scrape. The product's technical data sheet, and for
existing textures a certified testing laboratory, govern.
