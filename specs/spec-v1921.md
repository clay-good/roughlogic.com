# roughlogic.com Specification v1921 -- Storm Safe Room Occupant Capacity (`calc-relief.js`, Group E Carpentry and Construction, storm refuge, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-relief.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** A tornado safe room packs people at 5 square feet each and a hurricane safe room gives them 20, because one storm lasts minutes and the other a day. FEMA P-361 publishes the densities, the gross-to-usable reductions, and the wheelchair-space rule, and its own worked example shows how they combine. The catalog has no safe room or storm shelter tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive floor area returns `{ error }`; a reduction outside the published set (or an entered usable area above the gross) returns `{ error }`; a residential safe room above 16 occupants returns a routing note to the community criteria; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): FEMA P-361, *Safe Rooms for Tornadoes and Hurricanes*, 4th ed. (December 2024), Part B, Section B5.2.1 -- Table B5-1 (community tornado), Table B5-2 (community hurricane), Table B5-3 (residential), the one-wheelchair-space-per-200-occupants rule, and the usable floor area methods -- with ICC 500 Sections 502 and 503 cited by number, named as the method, the AHJ and the safe room designer named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`tornado shelter capacity`, `safe room square feet per person`, `fema p-361 occupant density`, `hurricane shelter capacity`, `storm shelter how many people`.

## 2. The tile

### 2.1 `safe-room-capacity` -- Storm Safe Room Occupant Capacity

```
community tornado     standing or seated 5, wheelchair 10, bed or stretcher 30
(Table B5-1)          sq ft per occupant; at least 1 wheelchair space per 200
                      occupants or portion thereof
community hurricane   standing or seated 20, wheelchair 20, bed or stretcher 40
(Table B5-2)          restrooms may NOT count toward usable area
residential (<= 16)   tornado: one- and two-family 3, other residential 5
(Table B5-3)          hurricane: one- and two-family 7, other residential 10
usable area           method 1 (percent of gross): reduce by at least 50%
                      (concentrated furnishings or fixed seating), 35%
                      (unconcentrated, no fixed seating), 15% (open plan)
                      method 2: gross minus walls, columns, fixed equipment
capacity              the largest occupant count whose required area fits in
                      the usable area, with the wheelchair spaces included
```

Occupant density is set by how long people will be inside. A tornado passes in minutes, so a community safe room may
pack people standing at five square feet each; a hurricane lasts a day or more, so the same room holds a quarter as many
at twenty square feet. Residential safe rooms serving a dwelling are tighter still, and the tile routes a residential
room above sixteen occupants to the community criteria, as the standard does.

Usable area is less than the footprint. FEMA gives two methods: a percentage reduction by furnishing type for early
planning, and a subtraction of walls, columns, and fixed equipment once the plan is drawn. Hurricane safe rooms may not
count restrooms at all; tornado safe rooms may count restroom area outside the stalls under conditions the tile names.

The wheelchair rule couples the count to itself: every 200 occupants require a wheelchair space at twice the area, so
adding people adds wheelchair spaces. The tile solves for the largest total that fits, which reproduces FEMA's own
example -- a 4,800 square foot classroom holds 960 standing occupants at 5 square feet, and 955 once five wheelchair spaces
are included.

**Inputs:** the safe room type (community or residential; tornado or hurricane; one- and two-family or other residential), the gross floor area, the usable-area method and furnishing type (or the usable area directly), and optionally the bed or stretcher spaces needed

**Outputs:** the usable area, the required area per occupant type, the maximum occupant capacity including the required wheelchair spaces, and the notes on restroom area and the residential limit

## 3. Worked example

**FEMA's example:** a 4,800 sq ft classroom used as a community tornado safe room (usable area taken as the net area):

```
5 sq ft each          4,800 / 5 = 960
with wheelchairs      950 standing (4,750 sq ft) + 5 wheelchair (50 sq ft)
                      = 955 occupants in 4,800 sq ft   (P-361: 955)
```

**A 6,000 sq ft gross multipurpose room, unconcentrated furnishings, as a community safe room:**

```
usable      6,000 x (1 - 0.35) = 3,900 sq ft
tornado     772 standing + 4 wheelchair = 776 occupants
hurricane   194 + 1 wheelchair = 195 occupants
```

**776 people for a tornado, 195 for a hurricane** -- the same room, a factor of four apart, because of how long each storm
keeps people inside.

## 4. Scope and non-goals

A capacity calculation from FEMA P-361's occupant densities and usable-area methods. It does not design the safe room's structure for the ICC 500 design wind speeds and debris impact, address siting, egress, ventilation, sanitation, lighting, or the travel-time limits for reaching a safe room, or determine whether a space qualifies as a safe room at all. Code occupant loads for normal use still apply and must be posted alongside the safe room capacity. It is not a congregate shelter standard (`shelter-capacity-sanitation`). FEMA P-361, ICC 500, the designer, and the AHJ govern.
