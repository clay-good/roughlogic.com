# roughlogic.com Specification v1903 -- Relief Supply Pallet Floor Load (`calc-usar.js`, Group G Cross-Trade Utilities, collapse shoring, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-usar.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** Relief supplies land in gyms, church halls, and offices that were never designed as warehouses, and a pallet of bottled water weighs more than a ton on a 40 by 48 inch footprint. The warehouse tiles size racks and trailers; no tile compares the floor pressure of stacked pallets with the floor's design live load.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pallet weight, footprint dimension, stack tier count, or design live load returns `{ error }`; a coverage fraction outside 0-1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the design live load is a USER INPUT taken from the building's drawings or, where unknown, from the occupancy's uniform live load in ASCE 7 Table 4.3-1 / IBC Table 1607.1, cited by number and not reproduced; the arithmetic named as statics; a structural engineer named as governing, GOVERNANCE.structural.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pallet floor load psf`, `bottled water pallet weight floor`, `relief supply storage floor capacity`, `gym floor pallet load`, `how many pallets can the floor hold`.

## 2. The tile

### 2.1 `relief-storage-floor-load` -- Relief Supply Pallet Floor Load

```
footprint psf   pallet gross weight x tiers / footprint area
                (40 x 48 in = 13.33 sq ft)
area average    footprint psf x coverage fraction (pallet area / floor area,
                aisles included)
compare         area average against the floor's design live load (entered);
                footprint psf is a local concentration and is compared too
pallets allowed floor area x design live load / (pallet weight x tiers)
                -- an upper bound, before aisles and concentration
```

A floor's design live load is a uniform pressure spread over the whole bay, and stacked pallets are neither uniform nor
spread. The tile reports two numbers because both matter: the average over the floor, which is the number comparable to
the design load, and the pressure directly under a stack, which is what a thin slab or a wood floor feels locally.
Bottled water is the heaviest thing a relief operation usually stores -- about a ton a pallet -- and double-stacking it
doubles the local pressure without changing the footprint.

The design live load is the building's, not the tile's. A gym floor, an office, a church hall, and a school corridor
were designed for different loads, and the governing number is on the structural drawings. Where the drawings are not
available, the occupancy's code live load is the starting point, and the tile names the table it comes from without
reproducing it. Every such use is a screen: storage in a space not designed for it is exactly the change of use a
structural engineer should review.

Aisles lower the average and are not optional -- forklifts and pallet jacks need them -- so the coverage fraction is part
of the input rather than an afterthought. The allowed-pallet count is reported as an upper bound for a quick sense of
scale.

**Inputs:** the pallet gross weight, the footprint dimensions, the tiers stacked, the coverage fraction, the floor area, and the floor's design live load

**Outputs:** the pressure under a stack, the area-average pressure, the ratio of each to the design live load, and the upper-bound pallet count for the floor

## 3. Worked example

Pallets of bottled water at 2,300 lb, double-stacked, covering 60% of a gym floor designed for 100 psf:

```
footprint  2,300 x 2 / 13.33 = 345 psf
average    345 x 0.60 = 207 psf
ratio      207 / 100 = 2.07 -> over the design load by more than double
```

**The floor is carrying twice its design load on average and 3.5 times it under each stack.** Single-stacking halves
both, to 104 psf average, still just over.

**The same pallets single-stacked at 40% coverage:**

```
2,300 / 13.33 x 0.40 = 69 psf average -> 0.69 of 100 psf
```

**Within the design load** -- which is why relief staging usually means fewer, lower stacks with wide aisles, and why the
structural drawings are worth finding before the first truck arrives.

## 4. Scope and non-goals

A floor-pressure screen for palletised storage. It does not determine the floor's actual capacity, which depends on the framing, span, and condition, and it does not check concentrated loads from forklift wheels, rack posts, or pallet jacks, punching shear, slab-on-grade subgrade capacity, or damage from the disaster itself. The design live load must come from the building's documents or a qualified person; the ASCE 7 and IBC tables are cited by number only. It does not size racks (`rack-upright-capacity-derate`) or trailers. A structural engineer and the building official govern.
