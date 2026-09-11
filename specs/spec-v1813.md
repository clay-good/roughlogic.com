# roughlogic.com Specification v1813 -- Storage Position Count and Cube Utilisation (`calc-warehouse.js`, Group J Trucking and Logistics, warehouse racking and material handling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-warehouse.js`**
> (Group J Trucking and Logistics, hub `/groups/trucking/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A warehouse is bought and heated by the cubic foot and stores product in a fraction of it. Cube utilisation is routinely under a quarter, and the largest single consumer is not the racking or the roof space -- it is the aisle floor.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive building dimension, clear height, module pitch, bay count, level count, or pallet dimension, or an aisle width at or above the module pitch returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the cube utilisation definition and the module layout convention with the applicable fire protection requirements and the building drawings named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`warehouse cube utilization`, `pallet positions per square foot`, `storage density warehouse`, `aisle share of floor area`, `clear height utilization`.

## 2. The tile

### 2.1 `warehouse-cube-utilization` -- Storage Position Count and Cube Utilisation

```
building cube    floor area x clear height, the volume that was paid for
positions        rack rows x bays per row x levels x pallets per bay level
pallet cube      the pallet's footprint x its loaded height, in cubic feet
occupied cube    positions x pallet cube
cube utilisation occupied / building cube; 15 to 30% is the ordinary range and
                 people are surprised by it every time
floor density    positions per square foot of building
where it goes    aisle floor area is usually the largest single consumer
                 (`stacking-aisle-width`), then the vertical gap between a
                 pallet's top and the next beam, then the space above the top
                 load, then honeycombing -- empty slots in an assigned lane
what it is not   a target; a warehouse optimised purely for cube is slow
```

Cube utilisation is the metric that exposes how much of a warehouse is circulation rather than storage.
Every module of racking has an aisle beside it and the aisle occupies more floor than the two rack rows it
serves, so before a single pallet is counted more than half the floor is committed to getting to it. That is
not waste; it is what makes the storage reachable, and it is why the number is as low as it is.

The vertical losses are smaller individually and they add up. A pallet's load is shorter than the beam pitch
above it because the pitch must clear the load with room for the forks; the top load sits below the sprinklers
with the clearance the fire protection requires; and the floor level wastes whatever is below the first beam.
None of these is large and there are several of them at every level of every bay.

Honeycombing is the one that varies with operations rather than with geometry, and it is the one a facility can
actually change. A lane assigned to a single item is fully occupied only when the item is at full stock, and
partial lanes are empty positions that cannot be used for anything else. Random or mixed slotting fills them
and costs travel; dedicated slotting is fast and honeycombs. That trade, not the racking, is where a running
warehouse gains or loses cube.

**Inputs:** the building footprint and clear height, the module pitch and aisle width, the rack row depth, the bays per row, the levels and pallets per bay level, and the pallet footprint and loaded height

**Outputs:** the building cube, the rack rows and aisles the width supports, the floor area taken by aisles and by racking, the pallet position count, the occupied cube, the cube utilisation, and the positions per square foot

## 3. Worked example

A 300 by 400 ft building with 32 ft clear, laid out on reach-truck modules:

```
building     = 120,000 sq ft x 32 ft = 3,840,000 cu ft
modules      = 17 across the 300 ft width, giving 34 rack rows
aisle floor  = 17 x 9.75 ft x 360 ft = 59,670 sq ft
rack floor   = 34 x 3.5 ft x 360 ft = 42,840 sq ft
```

**The aisles take 50% of the floor and the racking 36%.** Before a pallet is stored, more of the
building is aisle than is rack.

```
positions = 34 rows x 40 bays x 6 levels x 2 pallets = 16,320
pallet cube = 48 x 40 x 50 / 1,728 = 55.56 cu ft
occupied  = 16,320 x 55.56 = 906,667 cu ft
cube utilisation = 906,667 / 3,840,000 = 23.6%
floor density    = 16,320 / 120,000 = 0.136 pallets per sq ft
```

**24% cube utilisation.** The building was bought, roofed, heated, lit, and sprinklered by the cubic foot,
and product occupies 24% of it. **That is a normal figure, not a failing one**, and it is worth knowing before
anyone proposes a target.

**The vertical losses are the smaller half and they are unavoidable.** A 50 in load in a 58 in beam pitch
leaves 8 in of clearance at every level -- **14% of the vertical pitch**, needed for the forks and
for the load to enter cleanly. Multiply that by 6 levels and it is a fixed tax on the whole cube.

**And the piece the racking cannot fix is honeycombing.** A lane assigned to one item is full only when that
item is at full stock; every partial lane is an empty position no other item may use. **Dedicated slotting is
fast and honeycombs; random slotting fills the cube and costs travel** (`order-pick-labor-standard`). The
racking sets the ceiling on cube utilisation and the slotting policy decides how close a running warehouse
gets to it.

## 4. Scope and non-goals

A layout and density calculation. It idealises a building as uniform modules of racking and aisle and ignores everything a real warehouse also contains: cross aisles, receiving and shipping staging, dock apron depth, offices, battery charging, columns and their clearances, sprinkler risers and fire access, and the aisle at each wall. On a real floor plate those can take a fifth of the area before storage begins, so the position count here is an upper bound. It does not check the levels against the building: the top load's clearance to sprinklers and the storage height limits that trigger in-rack protection are fire protection requirements (`rack-flue-space`), and clear height is not usable height. It does not model honeycombing, which depends on the slotting policy and the inventory profile rather than on geometry, or evaluate throughput, which frequently argues against maximum density. It does not size racking (`pallet-rack-beam-capacity`), select trucks, or address seismic or floor loading limits. The applicable fire protection requirements, the building's own drawings, and the warehouse designer govern.
