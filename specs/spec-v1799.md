# roughlogic.com Specification v1799 -- Landfill Working Face Cell and Lift Volume (`calc-waste.js`, Group M Water and Wastewater Operations, solid waste and landfill operations, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-waste.js`**
> (Group M Water and Wastewater Operations, hub `/groups/water/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A day's waste becomes a cell of known volume advancing across a working face of chosen width, and the width decides how much surface has to be covered that night. Narrowing the face costs nothing and cuts the cover, the leachate, and the litter together.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive tonnage, density, face width, lift height, or cover depth, a face slope at or below zero, or a layer thickness above the lift height returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the working face geometry and published lift and compaction pass practice with the operating permit and approved fill plan named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`landfill working face size`, `daily cell volume lift`, `face advance rate landfill`, `lift thickness compaction passes`, `working face width cover area`.

## 2. The tile

### 2.1 `working-face-cell-lift` -- Landfill Working Face Cell and Lift Volume

```
daily volume     cy = tons / in-place density in tons per cubic yard
                 (`landfill-airspace-density`)
advance          the face moves forward by volume / (face width x lift height)
lift             the vertical thickness of a working layer, commonly 8 to 12 ft,
                 built up from compacted layers of about 2 ft
passes           3 to 5 passes of a steel-wheel compactor per layer is the usual
                 practice; passes are what buy density
exposed surface  the cell's top plus its sloped face:
                 top = width x advance; face = width x lift x sqrt(1 + slope^2)
cover            exposed surface x cover depth (`daily-cover-volume`)
the lever        a NARROWER face advances further for the same volume, which leaves
                 the same top area but far less sloped face to cover
```

The working face is the only part of a landfill exposed to the weather, and nearly every daily nuisance a site
has is proportional to its area. Cover soil, leachate generation, litter, odour, vector attraction, and bird
activity all scale with how much of the fill is open, so the face size is a single decision that moves all of
them at once. Sites that keep a tight face are not being fastidious; they are managing six line items with one
control.

The arithmetic of narrowing a face is better than it first appears and it is worth seeing why. Halving the
width doubles the daily advance, so the top area -- width times advance -- is unchanged. What changes is the
sloped face, which is width times the slope length and falls in direct proportion. The saving is entirely on
the face, and it is free.

Against that, a face has to be wide enough to work. Trucks need room to tip, the compactor needs room to make
its passes without interfering, and a face too narrow for the traffic produces queueing, unsafe manoeuvring,
and -- because the compactor cannot get its passes in -- worse density, which costs airspace that dwarfs the
cover saving. The optimum is the narrowest face that the day's truck count and the compactor can actually
work.

**Inputs:** the daily tonnage and in-place density, the working face width, the lift height, the face slope, the cover depth, the compacted layer thickness, and the passes per layer

**Outputs:** the daily cell volume, the face advance per day, the sloped face length, the exposed top and face areas, the total exposed surface, the cover volume and its ratio to the waste, the number of compacted layers and total passes, and the same figures at a narrower face

## 3. Worked example

A site placing 800 tons a day at 1,200 lb per cubic yard, on a 100 ft wide face in 10 ft lifts at
3:1:

```
daily volume = 800 / 0.60 = 1,333 cy = 36,000 cu ft
advance      = 36,000 / (100 x 10) = 36 ft per day
slope length = 10 x sqrt(1 + 3^2) = 31.6 ft
top area     = 100 x 36 = 3,600 sq ft
face area    = 100 x 31.6 = 3,162 sq ft
exposed      = 6,762 sq ft
cover        = 6,762 x 0.50 / 27 = 125 cy, or 9.4% of the waste volume
```

**36 ft of advance a day and 125 cy of cover to close it up.**

**Now halve the face width and watch which term moves:**

```
advance   = 36,000 / (50 x 10) = 72 ft per day
top area  = 50 x 72 = 3,600 sq ft   (UNCHANGED)
face area = 50 x 31.6 = 1,581 sq ft
exposed   = 5,181 sq ft
cover     = 96 cy
```

**The top area did not move at all**, because halving the width doubled the advance exactly. **All of the saving
came off the sloped face**, which fell from 3,162 to 1,581 sq ft -- and the cover with it, from 125 to
96 cy, **a 23 percent reduction for a decision that costs nothing.**

**And the same 23 percent comes off everything else the exposed surface drives** -- leachate
(`leachate-water-balance`), litter, odour, and birds all scale with the same area.

**The limit is whether the face can still be worked.** The lift is built in 5 compacted layers of 2 ft at
4 passes each -- **20 compactor passes over every part of the cell** -- and a face too narrow for the
trucks and the machine to share means the passes do not happen. **Density lost to a crowded face costs far
more airspace than the cover ever saves** (`landfill-airspace-density`), so the right face is the narrowest one
the day's traffic can actually work, not the narrowest one the arithmetic allows.

## 4. Scope and non-goals

A geometry and quantity calculation for daily operations. It assumes a regular advancing cell of uniform width and lift on a plane face, which no real working face is -- terrain, cell geometry, the approach road, weather, and the day's traffic all distort it, and the figures are a planning basis rather than a survey. In-place density is entered and is itself an operating result (`landfill-airspace-density`). It does not determine the right face width, which is a traffic and safety judgement about how many vehicles must tip at once, how the compactor and the dozer share the space, and how the face is approached, and a face sized from the cover arithmetic alone will be unworkable. It does not address slope stability of the working face or the lift, which governs how steep a face may be and which is a geotechnical question, nor the placement sequence, the wind direction and litter control, or the scavenging and salvage controls the permit may require. It does not compute the cover soil requirement across the whole site (`daily-cover-volume`) or address intermediate cover on inactive areas. The operating permit and approved fill plan, the site's own density and survey records, and the site engineer govern.
