# roughlogic.com Specification v1897 -- Collapsed or Damaged Floor Load for Shoring (`calc-usar.js`, Group E Carpentry and Construction, collapse shoring, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-usar.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** Every emergency shore starts from the same question: how many pounds per square foot is sitting on the damaged floor above -- its own weight, the rubble piled on it, and the rescuers who will work under it. The US&R guides publish the unit weights; `demo-debris` converts debris to haul tonnage, and no tile turns a slab, a rubble depth, and a tributary area into a load per shore.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a negative slab thickness, rubble depth, or load component, or a non-positive tributary area or post count, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): USACE *US&R Shoring Operations Guide*, Ed. 5.0 (October 2021), "Design Dead Loads for Building Materials" and "Rescue Live Loads", and the USACE *US&R Structures Specialist Field Operations Guide* (5th ed., 2006) weight tables, cited by figure (not reproduced as pages), named as the method, the US&R Structures Specialist named as governing, GOVERNANCE.structural.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`collapse debris load psf`, `rubble weight on floor`, `emergency shoring load estimate`, `usar floor load`, `load per shore collapsed building`.

## 2. The tile

### 2.1 `collapse-floor-load` -- Collapsed or Damaged Floor Load for Shoring

```
floor self-weight   concrete slab 150 pcf = 12.5 psf per inch of thickness
                    wood floor 10-25 psf (25 with 1.5 in concrete fill)
                    steel deck with concrete fill 50-70 psf
                    8 in precast hollow plank 60 psf
rubble              concrete and masonry rubble 10 psf per inch of depth
contents            normal home or office furniture 10 psf (more for storage)
                    interior wood and metal stud walls 10-15 psf per floor
rescuers            10-15 psf (four 250 lb rescuers in 100 sq ft = 10 psf)
total w             sum of the above, psf
per shore           w x tributary area (sq ft);  per post = per shore / posts
```

A shore holds up whatever is above it, and after a collapse that is more than the floor. The US&R guides publish the
weights a structures specialist needs to add it up in the field: the floor's own weight by construction type, rubble
at ten pounds per square foot for every inch of depth, furniture and partitions, and the rescuers who will work in the
space. Rubble is the component that grows fastest -- a foot and a half of it weighs more than two six-inch slabs -- and
the one most often underestimated because it is judged by eye.

Multiplying by the tributary area -- the floor area each shore supports, half the span to each neighbour in each
direction -- gives the load per shore, and dividing by the number of posts in the shore gives the load per post. That
is the number `usr-vertical-shore-capacity` checks against a post's capacity at its height, and the pair of tiles is
the whole of a first-pass vertical shore design.

Where more than one collapsed floor bears on the shore, each floor's load is added; the tile accepts several floors.
The rescuer allowance is a live load and belongs in every calculation, because the shore exists so that people can
work beneath it.

**Inputs:** the floor construction and thickness (or an entered self-weight), the rubble depth, the contents and partition allowances, the rescuer allowance, the number of floors bearing, the tributary area, and the posts per shore

**Outputs:** each load component in psf, the total psf, the load per shore, and the load per post

## 3. Worked example

A 6 in concrete slab carrying 18 in of masonry rubble, with a 15 psf rescuer allowance, shored with 3-post shores at
8 ft centres and a 4 ft tributary width:

```
slab      6 x 12.5 = 75 psf
rubble    18 x 10  = 180 psf
rescuers           15 psf
total              270 psf
per shore 270 x (8 x 4) = 8,640 lb
per post  8,640 / 3 = 2,880 lb
```

**2,880 lb per post** -- within the 5,000 lb capacity of a 4x4 post in a 10 ft shore (`usr-vertical-shore-capacity`).
The rubble is two-thirds of the load.

**An 8 in slab under 36 in of rubble, with furniture and 15 psf rescuers:**

```
100 + 360 + 10 + 15 = 485 psf
```

**Almost 500 psf -- about twice a typical heavy-storage design live load of 250 psf, and ten times an office floor's
50** -- and the reason debris is removed from above before shores are relied on for long.

## 4. Scope and non-goals

A field load estimate from published US&R unit weights. It does not assess the condition or remaining capacity of the damaged floor, punching shear at columns, the path of the shore load to the floor or ground below, or dynamic effects from aftershocks, falling debris, or equipment. Unit weights are typical values; wet materials, storage occupancies, and heavy equipment can be much heavier, and a measured weight governs. It does not size posts (`usr-vertical-shore-capacity`), cribbing (`usr-crib-capacity`), or rakers (`usr-raker-shore`). The US&R Structures Specialist and the incident's structural engineer govern.
