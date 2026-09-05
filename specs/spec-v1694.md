# roughlogic.com Specification v1694 -- Demolition Debris Volume to Tonnage and Containers (`calc-demo.js`, Group D Water Damage and Mold Restoration, abatement, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-demo.js`**
> (Group D, Water Damage and Mold Restoration -- the existing category, hub `/groups/restoration/`; abatement and demolition), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Demolition debris is estimated in cubic yards and hauled by the ton, and the conversion depends entirely on what the building was made of. A wood-frame house and a masonry building of the same volume differ by a factor of three in tonnage, and the container count differs with them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive volume or density, or a swell factor below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the swell and density conversion with the pre-demolition survey and the applicable disposal regulations named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`demolition debris tonnage`, `c and d debris cubic yards to tons`, `dumpster count demolition`, `debris swell factor`, `construction waste density`.

## 2. The tile

### 2.1 `demolition-debris-tonnage` -- Demolition Debris Volume to Tonnage and Containers

```
in-place volume    from the building dimensions and construction
swell              debris occupies more volume than in place; 25 to 60% is ordinary
                   and higher for material that cannot be broken down
density            wood debris roughly 300 to 500 lb/cu yd loose;
                   mixed C and D 350 to 600; concrete and masonry 1,800 to 2,400
tonnage            loose volume x density
containers         by VOLUME for light debris and by WEIGHT for masonry -- the two
                   governing limits swap depending on the material
diversion          separated streams (metal, concrete, wood, gypsum) have their own
                   densities and their own markets
```

The governing constraint swaps with the material and that is the practical point. A container filled with wood
framing reaches its volume limit long before its weight rating -- so light debris is a volume problem and the
answer is more containers or a compactor. A container filled with concrete reaches its weight rating when it is
barely a third full, so masonry is a weight problem and filling it by eye overloads the truck. A contractor using
the same container count logic for both gets one of them badly wrong.

Swell is what makes the volume larger than the building. Material that was tightly assembled comes apart into
pieces that do not repack, and the less it can be broken down the more it swells -- ductwork, cabinetry, and
roofing swell far more than concrete does. A per-container estimate built on in-place volume understates the
haul.

Separation changes the arithmetic and usually the cost. Concrete, metal, and clean wood have markets or lower
disposal rates, and a separated job produces several streams with different densities and different container
requirements rather than one mixed stream at the highest disposal rate -- which is where diversion requirements
and cost savings coincide.

**Inputs:** the in-place volume by material type, the swell factor for each, the loose density for each, the container volume and weight rating, and whether the streams are separated

**Outputs:** the loose volume after swell for each material, the tonnage for each, the container count by volume and by weight with the governing limit identified for each stream, the total containers, and the tonnage and container count if the streams are separated

## 3. Worked example

A demolition producing 1,800 cu ft of wood-frame debris and 400 cu ft of concrete, with a 40 percent swell on
the wood and 25 percent on the concrete:

```
wood     1,800 cu ft x 1.40 = 2,520 cu ft = 93.3 cu yd
         at 400 lb/cu yd       = 18.7 tons
concrete 400 x 1.25            = 500 cu ft = 18.5 cu yd
         at 2,100 lb/cu yd     = 19.4 tons
```

**Now the container check**, using 30 cu yd containers with a 10 ton limit:

```
wood:     93.3 cu yd / 30 = 3.1 containers by VOLUME
          18.7 tons / 10   = 1.87 containers by weight
          -> VOLUME governs; 4 containers, each far under its weight limit

concrete: 18.5 cu yd / 30  = 0.62 containers by volume
          19.4 tons / 10  = 1.94 containers by weight
          -> WEIGHT governs; the container is full at 9.5 cu yd, a third of its volume
```

**Same containers, opposite constraints.** A crew filling the concrete container to the top by eye puts roughly
32 tons in a 10 ton box -- an overload discovered at the scale, or on the road.

Separating the streams is what makes both work, and it is usually cheaper than mixed disposal besides.

## 4. Scope and non-goals

A volume and weight estimate using swell factors and densities the user supplies. Both vary widely with the
construction, the demolition method, and how much the material is broken down, and a project's own measured
figures from early loads are far better than table values. It does not address waste characterization: buildings
of any age may contain asbestos, lead, PCBs, mercury, and other regulated materials, and a pre-demolition survey
is required before demolition in most jurisdictions -- debris containing regulated material is not C and D waste
and cannot be handled as it is. It does not address the container weight limits imposed by the hauler and by road
weight regulations, which govern independently of the container's rating, or the disposal facility's acceptance
criteria and rates. It does not address diversion requirements or documentation. The pre-demolition survey, the
applicable federal and state regulations, the hauler's limits, and the disposal facility govern.
