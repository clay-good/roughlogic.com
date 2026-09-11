# roughlogic.com Specification v1812 -- Right-Angle Stacking Aisle Width for a Lift Truck (`calc-warehouse.js`, Group J Trucking and Logistics, warehouse racking and material handling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-warehouse.js`**
> (Group J Trucking and Logistics, hub `/groups/trucking/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** The aisle a warehouse needs is set by the truck's turning geometry plus the load it is carrying, and the choice of truck decides how much of the building is aisle rather than rack. Between a counterbalanced truck and a turret truck the difference is most of a warehouse.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive turning radius, load length, or rack depth, a negative clearance, or a building width narrower than one module returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the right-angle stacking aisle convention with the truck manufacturer's published dimensions named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`right angle stacking aisle`, `lift truck aisle width`, `vna very narrow aisle`, `reach truck aisle requirement`, `warehouse aisle rack ratio`.

## 2. The tile

### 2.1 `stacking-aisle-width` -- Right-Angle Stacking Aisle Width for a Lift Truck

```
right-angle      the aisle a truck needs to turn 90 degrees from the aisle and
stacking aisle   deposit a load square into the rack
the components   outside turning radius + load length along the forks + the
                 distance from the load face to the truck's turning centre +
                 an operating clearance, commonly 6 to 12 in
counterbalanced  carries the load ahead of the front axle, so the whole load length
                 is outside the wheelbase; the widest aisle of the three
reach truck      the forks reach out from a straddle, so the load sits much closer
                 to the turning centre; a narrower aisle
turret / VNA     the mast rotates instead of the truck, so the aisle only has to
                 pass the load; the narrowest, and it needs wire or rail guidance
module pitch     two rack rows back to back plus one aisle -- the repeating unit
                 whose width divides into the building
the trade        a narrower aisle needs a more expensive truck, guidance, a flatter
                 floor, and it slows every put-away and retrieval
```

Aisle width is the single largest determinant of how much of a building is storage, because the aisle repeats.
Every module across a warehouse is two rack rows and one aisle, so a foot saved on the aisle is a foot saved
on every module across the whole floor plate. That is why aisle width decisions dominate warehouse layout
economics and why truck selection is a building decision rather than an equipment decision.

The three truck types differ in where the load sits relative to the turning centre, and that is the whole
explanation. A counterbalanced truck holds its load out in front, so the load's length adds directly to the
swing. A reach truck brings it back between the straddles. A turret truck does not turn the load at all -- the
head rotates and the truck stays in line -- so the aisle only needs to pass the load width plus clearance.

Narrow aisles are bought with constraints, and they compound. A turret truck needs wire or rail guidance, a
superflat floor tolerance that a standard slab will not meet, and more careful rack alignment; it is slower
into and out of the aisle; and because only one truck can occupy an aisle, the aisle count sets how many
trucks can work at once. A building that saves thirty percent of its floor to storage can lose more than that
in throughput if the aisle count was not checked against the order profile.

**Inputs:** the truck outside turning radius, the distance from the load face to the turning centre, the load length along the forks, the operating clearance, the rack row depth, and the building width available

**Outputs:** the right-angle stacking aisle for each truck type, the module pitch of two rack rows plus an aisle, the number of modules that fit the building width, and the additional rack rows a narrower aisle provides

## 3. Worked example

A 48 in deep load, 6 in clearance, on rack rows 42 in deep:

```
counterbalanced: 78 + 48 + 14 + 6 = 146 in (12.2 ft)
reach truck:     55 + 48 + 8 + 6 = 117 in (9.8 ft)
turret / VNA:    48 + 12 = 60 in (5.0 ft)
```

**Now repeat them across the building.** Each module is two rack rows back to back plus one aisle:

```
counterbalanced: 2 x 42 + 146 = 230 in -> 15 modules in 300 ft
reach truck:     2 x 42 + 117 = 201 in -> 17 modules
turret / VNA:    2 x 42 + 60 = 144 in -> 25 modules
```

**15 modules against 25 -- the turret truck fits 67 percent more rack rows into the same building.**
That is 20 additional rack rows on this floor plate, from a truck choice, with no change to the building,
the racks, or the pallet.

**The reach truck takes 13 percent of that improvement** at a fraction of the constraint -- no guidance, an
ordinary floor tolerance, and it still works outside the aisle.

**The constraints are what the narrow aisle actually costs.** Wire or rail guidance, a superflat floor
specification an ordinary slab will not meet, tighter rack alignment, slower aisle entry and exit, and **one
truck per aisle** -- so with 25 aisles the building can work at most 25 trucks at once, against 15 aisles that
are wide enough to pass in. **A layout that maximises storage can be short of throughput**, and the order
profile is what decides which matters.

## 4. Scope and non-goals

A geometry calculation from manufacturer's figures. The outside turning radius and the load-face-to-turning-centre distance are published by the truck manufacturer for a specific model, mast, and attachment, and they vary considerably within a class; the figures used here are representative only. The right-angle stacking aisle a manufacturer publishes is a theoretical minimum achieved by a skilled operator with no margin, and practical aisles add clearance beyond it -- operator skill, load overhang, damaged pallets, and traffic all consume the difference, and an aisle laid out at the theoretical minimum will damage rack. It does not address the load's width, which matters for a side-shifting or turret truck, attachments such as clamps and rotators that change the geometry entirely, or the cross aisles, staging, and transfer areas a layout also needs. It does not evaluate throughput, which depends on travel distance, lift heights, and the order profile, and which frequently argues the opposite way from storage density. It does not address floor flatness tolerances, guidance systems, rack protection, or the aisle lighting and egress requirements. The truck manufacturer's published dimensions, the applicable floor flatness and fire protection requirements, and the warehouse designer govern.
