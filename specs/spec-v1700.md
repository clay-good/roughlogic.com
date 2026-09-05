# roughlogic.com Specification v1700 -- Soil Volume Required for a Target Canopy (`calc-arborist.js`, Group L Agriculture and Forestry, arboriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`**
> (Group L, Agriculture and Forestry -- the existing category, hub `/groups/agriculture/`; arboriculture and landscape), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An urban tree grows to the size its soil volume supports and no further, and most street tree pits provide a fraction of what the intended canopy needs. It is the single best predictor of whether a tree will reach its design size, and it is a multiplication done at design time or not at all.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive canopy diameter, soil volume ratio, or pit dimension returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the canopy-to-soil-volume ratio convention as standard urban forestry practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`soil volume for tree canopy`, `urban tree soil requirement`, `street tree pit size`, `cubic feet soil per canopy`, `structural soil volume`.

## 2. The tile

### 2.1 `soil-volume-for-canopy` -- Soil Volume Required for a Target Canopy

```
soil volume       commonly 1.5 to 2 cu ft of soil per square foot of intended canopy
                  projection; some guidance goes higher for large species
canopy projection the area the mature crown will cover
required volume   V = canopy area x the volume ratio
tree pit          a 5 by 5 ft pit at 3 ft depth is 75 cu ft -- enough for a canopy of
                  roughly 40 to 50 sq ft, which is a very small tree
solutions         connected trenches, structural soil, suspended pavement, and shared
                  root zones between trees
compaction        soil compacted for paving support is not soil the roots can use
```

The ratio makes the problem visible immediately, and the answer is almost always that the pit is too small. A
standard tree pit provides tens of cubic feet; a tree with a 25 foot canopy needs many hundreds. That gap is why
street trees in small pits reach a fraction of their species size, decline in their second decade, and get
replaced on a cycle -- the tree is not failing, it is doing exactly what its root volume permits.

The compaction point is what makes the number smaller than it looks. Soil under and beside pavement is compacted
to support the pavement, and compacted soil is not available to roots regardless of its volume. So the usable
volume is the volume of soil at a density roots can penetrate, which in a typical streetscape is only the pit
itself unless something has been done about it.

The solutions all address the same thing: getting more usable soil to the tree without compromising the pavement.
Connected trenches link pits so trees share a larger volume, structural soils carry load through a stone matrix
while leaving voids for roots, and suspended pavement systems carry the paving on a structure so the soil beneath
stays uncompacted. They differ in cost and in performance, and choosing between them is a design decision this
number frames.

**Inputs:** the intended mature canopy diameter, the soil volume ratio, the available pit or trench dimensions and depth, the usable (uncompacted) fraction, and whether trees share a root zone

**Outputs:** the canopy projection area, the soil volume required at the entered ratio, the volume the entered pit provides, the shortfall, the canopy the available soil actually supports, and the shared volume available when a stated number of trees are connected

## 3. Worked example

A tree intended to reach a 25 ft canopy, at 2.0 cu ft of soil per square foot of canopy:

```
canopy area     = pi/4 x 25^2 = 491 sq ft
soil required   = 491 x 2.0 = 982 cu ft
```

**982 cubic feet.** Now the pit it is going into -- 5 ft by 5 ft, 3 ft deep:

```
pit volume = 5 x 5 x 3 = 75 cu ft
```

Seventy-five against 982. **The pit provides 8 percent of what the intended canopy needs**,
and the canopy that 75 cu ft actually supports is

```
75 / 2.0 = 38 sq ft -> a crown about 7 ft across
```

A 7 ft tree, not a 25 ft one. The tree is not going to fail; it is going to
be small, and then it will decline in its second decade when it has exhausted what the pit offers.

**Connecting the pits** is the cheapest fix. Ten trees sharing a continuous trench of the same cross-section have
`10 x 75` = 750 cu ft between them, and while that is still short of 9,817 for ten full canopies, it is an
order of magnitude better than ten isolated pits and it is mostly a matter of not building a wall between them.

And the compaction caveat: soil compacted to support paving is not soil roots will enter. The usable volume is
what stays at a density roots can penetrate, which is why structural soil and suspended pavement systems exist.

## 4. Scope and non-goals

A volume requirement estimate using a ratio the user supplies. Soil volume guidance varies between sources and
by species, climate, soil type, and irrigation -- a well-irrigated tree in good soil needs less volume than a dry
one in poor soil for the same canopy -- and the ratios in use range widely. It does not address soil quality,
drainage, or the compaction that determines whether nominal volume is usable volume; a large volume of compacted
or poorly drained soil supports less growth than a smaller volume of good soil. It does not design the soil
system, evaluate structural soil or suspended pavement products, or address the load-bearing requirements the
paving imposes. It does not address species selection, which should match the volume available rather than the
volume being sized to an aspirational species. It does not address irrigation, which for the first years after
planting determines survival. Urban forestry guidance, the project's landscape architect and soil scientist, and
the pavement designer govern.
