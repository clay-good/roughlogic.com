# roughlogic.com Specification v1744 -- Mass Haul Balance, Free Haul, and Overhaul (`calc-survey.js`, Group E Carpentry and Construction, mapping, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-survey.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mapping, drone, and earthwork), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Earthwork is paid for twice when it is hauled further than the contract's free haul distance, and the mass haul diagram is what shows where that happens. It is a running sum of cut and fill, and its shape tells a contractor where the dirt should go.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive station interval or free haul distance, or a shrink or swell factor at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the mass haul diagram method and the free haul and overhaul conventions with the contract documents named as governing measurement, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`mass haul diagram overhaul`, `free haul distance earthwork`, `balance point mass haul`, `station yards overhaul`, `borrow and waste decision`.

## 2. The tile

### 2.1 `mass-haul-overhaul` -- Mass Haul Balance, Free Haul, and Overhaul

```
mass ordinate     the cumulative algebraic sum of cut (positive) and fill (negative)
                  along the alignment, corrected for shrink and swell
balance points    where the mass haul curve crosses the base line; cut equals fill
                  between two crossings
haul direction    a rising curve means material moves forward; a falling curve backward
free haul         the distance included in the excavation price; a horizontal line of
                  that length on the diagram
overhaul          the volume-distance beyond free haul, paid separately in station-yards
borrow and waste  where the curve shows a persistent surplus or deficit, importing or
                  exporting is cheaper than hauling it
```

The diagram works because a horizontal line drawn across the curve intersects it at two points, and the volume
between those points is exactly balanced -- cut equals fill -- while the horizontal distance is the haul. So the
free haul distance drawn as a horizontal chord shows immediately what balances within the free haul and what has
to be hauled beyond it, and the area between the curve and that chord is the overhaul quantity.

The shrink and swell correction has to be applied before the curve is drawn or the balance points are wrong.
Excavated material occupies a different volume in the fill than it did in the cut -- most soils shrink when
compacted, rock swells -- so a cut volume and a fill volume in their own units do not balance even when the
diagram says they do. Correcting cut to compacted volume is what makes the ordinate meaningful.

The decision the diagram supports is where to borrow and where to waste. A long stretch of surplus cut can be
hauled forward to a deficit, or it can be wasted locally and the deficit filled from borrow -- and beyond some
haul distance the second is cheaper. The diagram makes that distance visible as a horizontal chord, and the
economic haul distance is where the cost of hauling equals the cost of borrow plus waste.

**Inputs:** the cut and fill volumes by station, the shrink and swell factors, the free haul distance, the overhaul unit price, the borrow and waste unit prices, and the alignment stationing

**Outputs:** the corrected volumes, the mass ordinate at each station, the balance points, the volume within free haul, the overhaul in station-yards and its cost, the economic haul distance, and the borrow and waste quantities that beat hauling

## 3. Worked example

An alignment with a cut section followed by a fill section. Cut volumes are corrected for shrinkage before the
ordinate is accumulated:

```
cut 12,000 cy at a 0.90 shrinkage factor -> 10,800 cy of compacted fill equivalent
fill required 10,800 cy                   -> the sections balance
```

The mass ordinate rises through the cut to a maximum of 10,800 and falls back to zero at the end of the fill.
**The two points where the curve crosses zero are the balance points**, and the horizontal distance between them
is the haul.

Draw the free haul distance -- say 1,000 ft -- as a horizontal chord across the curve:

```
volume above the chord = the material hauled FURTHER than free haul
overhaul = that volume x its average haul distance beyond 1,000 ft, in station-yards
```

If 4,200 cy is hauled an average of 600 ft beyond the free haul:

```
overhaul = 4,200 cy x 6 stations = 25,200 station-yards
at $0.60 per station-yard = $15,120
```

**The borrow-and-waste alternative.** If borrow costs $8/cy delivered and waste costs $3/cy to place locally,
that same 4,200 cy costs `4,200 x 11` = $46,200 to borrow and waste -- so hauling wins here.

Reverse the numbers: at $1.80 per station-yard the overhaul is $45,360 and the two are level. **The economic haul
distance** is where the two costs cross, and beyond it a contractor should waste and borrow rather than haul --
which is a decision the diagram makes visible and a spreadsheet of volumes does not.

The shrinkage correction is not optional: applying it after drawing the curve moves every balance point and
changes the answer.

## 4. Scope and non-goals

A quantity and cost calculation. Shrinkage and swell factors vary with the material, its moisture, and the
compaction specified, and they should come from the geotechnical investigation and from the specification rather
than from a table -- an error in the factor moves every balance point. It does not compute earthwork volumes,
which come from cross-sections or from a surface-to-surface comparison, and it does not address the accuracy of
those volumes. It does not address the contract's own definitions of free haul, overhaul, borrow, and waste,
which vary between agencies and which govern how the work is measured and paid -- the contract documents are the
authority. It does not address haul road conditions, equipment cycle times, or the production planning that
determines whether a theoretically economic haul is achievable, or the environmental and permitting constraints
on borrow and waste sites. The contract documents, the agency's earthwork specification, and the geotechnical
report govern.
