# roughlogic.com Specification v1699 -- Stump Grinding Volume and Chip Yield (`calc-arborist.js`, Group L Agriculture and Forestry, arboriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`**
> (Group L, Agriculture and Forestry -- the existing category, hub `/groups/agriculture/`; arboriculture and landscape), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Stump grinding produces far more chip than the stump appeared to contain, because the grind extends beyond the stump into the root flare and the chips swell. Estimating the spoil is what decides whether it is backfilled, hauled, or spread -- and how many truckloads.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive stump diameter or grind depth, or a swell factor below one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ground volume and swell estimate with ANSI Z133 and the state one-call statute named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`stump grinding chip volume`, `stump grind spoil`, `grinding depth stump`, `chip swell backfill`, `replant after stump grinding`.

## 2. The tile

### 2.1 `stump-grinding-volume` -- Stump Grinding Volume and Chip Yield

```
grind volume     the stump plus the root flare and buttress roots, to the specified depth
                  the ground area is wider than the visible stump
chip swell       ground material occupies 1.5 to 2 times its in-place volume
backfill         the hole is usually backfilled with its own chips, which settle
                  substantially and need topping later
excess           what will not fit back in the hole; hauled or spread
replanting       chips are high in carbon and tie up nitrogen; a new tree should not be
                  planted into a chip-filled hole without soil replacement
depth            specified by the objective: 6 to 8 in for turf, deeper for replanting
                  or for construction
```

The ground area is wider than the stump because a stump's root flare spreads well beyond its visible diameter,
and the grinder has to take that too or the remaining flare heaves the turf and sprouts. So the volume is
computed on the ground diameter rather than the stump diameter, and that difference alone can double the estimate.

Swell then compounds it. Ground wood is fluffy and mixed with soil, and it occupies well over its in-place volume
-- so the pile beside the hole is much larger than the hole, and the standard practice of backfilling with the
chips leaves excess even after settlement.

The settlement is a callback if it is not anticipated. Chips backfilled into a hole compact and decompose over
the following months and the ground sinks, so a job finished flush is a depression by the next season. Mounding
the backfill deliberately, or returning to top it, is the difference between a finished job and a complaint.

The replanting caution is worth stating because it is a common and expensive mistake. Wood chips have a very high
carbon-to-nitrogen ratio, and as they decompose they immobilize soil nitrogen -- so a tree planted directly into
a chip-filled stump hole is planted into a nitrogen sink and struggles. Replanting requires the chips to be
removed and the hole filled with soil.

**Inputs:** the stump diameter and the ground diameter including the flare, the grind depth, the swell factor, the number of stumps, and whether the site will be replanted or turfed

**Outputs:** the ground volume in place, the chip volume after swell, the volume that fits back in the hole, the excess to haul or spread, the settlement allowance for backfill, and the total across a stated stump count

## 3. Worked example

A 24 in stump ground to 12 in deep. But the grind has to take the root flare, so the ground diameter
is more like 36 in:

```
in-place volume, at the stump diameter = pi/4 x (2.0)^2 x 1.0 = 3.14 cu ft
in-place volume, at the ground diameter = pi/4 x (3.0)^2 x 1.0 = 7.07 cu ft
```

**2.2 times the volume**, from taking the flare that has to be taken -- and estimating
on the visible stump diameter understates the job by that factor.

Now swell at 1.8:

```
chip volume = 7.07 x 1.8 = 12.72 cu ft
```

The hole holds 7.07 cu ft, so
5.65 cu ft is left over per stump. On a job with twenty stumps
that is 4.2 cu yd of excess -- a trailer load, which
either goes somewhere on site or gets hauled.

**Settlement**: chips backfilled flush will sink over the following months as they compact and decompose.
Mounding the backfill or returning to top it is what avoids the callback.

**And if anything is being replanted here**, the chips have to come out. Their carbon-to-nitrogen ratio ties up
soil nitrogen as they decompose, and a tree planted into a chip-filled hole is planted into a nitrogen deficit.

## 4. Scope and non-goals

A volume estimate using a swell factor the user supplies. Swell varies with species, moisture, soil content in
the grindings, and the grinder, and the ground diameter depends on the root flare, which must be observed rather
than assumed. It does not address utility locating, which is required before grinding -- stump grinders reach
below grade and strike gas, electric, and irrigation lines regularly -- or the flying debris and property damage
that grinding produces, which is why shields and clearance are part of the operation. It does not address the
disposal or use of the chips, which may be regulated where the stump came from a diseased or pest-infested tree
subject to a quarantine. It does not address the root system remaining beyond the grind, which continues to decay
and which matters for anything built over it. The state one-call statute, the ANSI Z133 safety requirements for
arboricultural operations, and any applicable pest quarantine govern.
