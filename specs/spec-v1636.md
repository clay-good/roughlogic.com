# roughlogic.com Specification v1636 -- Rooftop Equipment Wind Uplift and Anchorage (`calc-hvacsystems.js`, Group C HVAC, test and balance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; test and balance, controls, and acoustics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A rooftop unit is a large flat object in the wind, and the uplift on it is resisted by its attachment to the curb and the curb's attachment to the structure. Units get set on curbs and screwed down by habit, and the habit is not a calculation.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive equipment area, height, or uplift pressure, or a fastener count below one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): ASCE 7 rooftop equipment wind provisions by name with the structural engineer named as governing anchorage, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`rooftop unit wind uplift`, `curb attachment fasteners`, `rtu anchorage wind`, `rooftop equipment overturning`, `asce 7 rooftop equipment`.

## 2. The tile

### 2.1 `rooftop-curb-uplift` -- Rooftop Equipment Wind Uplift and Anchorage

```
uplift force     F = projected area x net uplift pressure (ASCE 7 components and cladding)
                 rooftop equipment has its own provisions; corner and edge zones are worse
net resisting    F_net = uplift - equipment weight
overturning      lateral wind produces a moment the curb attachment must resist
fastener demand  F_net / number of fasteners, plus the overturning couple
curb to deck     the curb's own attachment to the structure is a separate check
seismic          in high seismic areas the lateral seismic demand may govern over wind
```

The equipment's weight helps and is usually not enough. A rooftop unit's projected plan area is large, uplift
pressures on a roof near an edge or a corner are much higher than in the field of the roof, and the net uplift
after subtracting the weight can still be thousands of pounds -- distributed among however many fasteners
someone put in.

The overturning moment is the part that gets omitted entirely. Lateral wind on the unit's side profile acts at
its centroid, well above the curb, and produces a couple that adds tension to the windward fasteners beyond the
net uplift. On a tall unit that couple can exceed the direct uplift, which is why a tall narrow unit is harder to
anchor than a low wide one of the same weight.

The two-part load path is the other thing to check. Fastening the unit to the curb is one connection; fastening
the curb to the roof structure is another, and the second is invisible once the roofing is done. A unit
adequately screwed to a curb that is only nailed to a wood deck has a load path that fails at the deck, and roof
inspections after wind events find exactly that.

**Inputs:** unit plan dimensions and height, unit weight, the design uplift and lateral pressures for the roof zone, the fastener count and pattern, the fastener rated capacity, and the curb-to-deck attachment

**Outputs:** the uplift force, the net uplift after equipment weight, the lateral force and overturning moment, the tension demand on the windward fasteners including the couple, the demand per fastener against its rating, and the fastener count required

## 3. Worked example

An 8 ft by 5 ft rooftop unit weighing 1,400 lb, 4 ft tall, in a roof zone with a net uplift of
28 psf and a lateral pressure of 22 psf:

```
plan area      = 8 x 5          = 40 sq ft
uplift force   = 40 x 28        = 1,120 lb
net uplift     = 1,120 - 1,400    = -280 lb
```

**-280 lb still trying to lift it** after its own weight is counted.

Now the overturning. Lateral force on the 8 ft by 4 ft side profile:

```
lateral = 8 x 4 x 22 = 704 lb, acting about 2 ft above the curb
moment  = 704 x 2    = 1,408 ft-lb
```

Resolved across the 5 ft width, that couple adds `1,408 / 5` = 282 lb of tension to the windward side, on top of
its share of the -280 lb net uplift.

With eight fasteners, four of them windward:

```
per windward fastener = -35 + 282/4 = 36 lb
```

About 36 lb each in tension -- which a properly selected fastener into steel deck handles and
a roofing screw into a wood nailer may not.

And the second connection: whatever holds the CURB to the structure has to carry the whole -280 lb. That is
the one nobody looks at.

## 4. Scope and non-goals

A screening calculation using design pressures the user supplies. Wind pressures on rooftop equipment come from
ASCE 7's provisions for rooftop structures and equipment, which differ from the roof cladding pressures and which
depend on the equipment's size relative to the building, its height above the roof, and its location -- corner and
edge zones carry substantially higher pressures and the tile does not determine the zone. It does not design the
attachment: fastener selection, edge distances, the curb's own structural capacity, and the curb-to-deck
connection into steel, wood, or concrete deck are all engineering matters with their own capacities and failure
modes. It does not evaluate the seismic demand, which in high seismic regions governs and follows ASCE 7 Chapter
13, and it does not address vibration isolation, which interacts with anchorage. It does not address the roofing
system's own uplift resistance around the curb. ASCE 7, the adopted building code, the equipment and curb
manufacturers, and a structural engineer govern.
