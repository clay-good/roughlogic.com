# roughlogic.com Specification v1982 -- Safety Glazing Hazardous Location Check (IRC R308.4) (`calc-construction.js`, Group E Carpentry and Construction, glazing, 1 New Tile)

> **Status: LANDED 2026-10-19 (proposed 2026-10-19). Single-tile spec. As built from the IRC 2024 text read on 2026-10-19: glazing is Section R324 in IRC 2024 (R308 in 2021, same criteria, also read), so the tile cites R324.4.1 through R324.4.7. The text corrects this spec's table in three places: R324.4.7 is under 36 in above the landing (not 60); R324.4.2 condition 2 is glazing on a wall less than 180 degrees from the door within 24 in of the HINGE side of an in-swinging door (there is no latch-side exception); and the R324.4.2 exceptions are decorative glazing, an intervening barrier, a closet or storage area 3 ft deep or less, and the fixed panel of a patio door. The IBC stair selector was not built: the tile is residential only.** Part of [scope-product-expansion](scope-product-expansion.md). In scope under the
> spec-v106 trades-only charter: Group E, the IRC code-check bench in `calc-construction.js` beside `stair-code-check`,
> `guard-handrail-check` and `egress-window-check`, no new dependency and no network call.
>
> **The gap.** The glazing bench computes glass weight, wind load, U-factor and sealant yield, and nothing answers the
> question that decides whether a lite is annealed or tempered: is this a hazardous location? The seven subsections of
> R308.4 are a decision table of distances and areas (24 in, 60 in, 9 sq ft, 18 in, 36 in) that a glazier, a window
> installer and a home inspector each work through by hand, and a miss means a replaced lite or a failed final.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds fuzzer, worked-example registry and the v18/v21 contract apply: a negative height,
distance or area, a top edge below the bottom edge, or an unknown location type returns `{ error }`. Citation: IRC
2024 R308.4.1 through R308.4.7 by name (the numeric criteria are unchanged from the 2021 edition and match IBC 2406.4),
free at codes.iccsafe.org, GOVERNANCE.general; the [spec-v1975](spec-v1975.md) chapter link applies. Aliases:
`does this window need tempered glass`, `safety glazing hazardous location`, `R308.4 tempered glass rule`, `glass
within 24 inches of a door`, `tempered glass near tub or shower 60 inches`.

## 2. The tile

### 2.1 `safety-glazing-check` -- Safety Glazing Hazardous Location Check (IRC R308.4)

```
R308.4.1 doors        any fixed or operable panel of a swinging, sliding or bifold door is
                      hazardous; exception for an opening a 3 in sphere cannot pass
R308.4.2 near doors   hazardous when the nearest vertical edge is within a 24 in arc of
                      either edge of the door in its closed position AND the bottom edge
                      is under 60 in above the walking surface; exceptions for an
                      intervening wall or permanent barrier, for access to a closet 3 ft
                      or less deep, and for glazing in the wall on the latch side
                      perpendicular to the door in a dwelling
R308.4.3 windows      hazardous only when ALL FOUR hold: an individual pane over 9 sq ft;
                      bottom edge under 18 in above the floor; top edge over 36 in above
                      the floor; a walking surface within 36 in horizontally of the glass;
                      exception for a horizontal rail 34 to 38 in above the walking surface
R308.4.4 guards       glazing in a guard or railing is hazardous regardless of size or height
R308.4.5 wet areas    glazing in a wall, enclosure or fence containing or facing a tub,
                      shower, hot tub, spa, sauna, steam room or pool is hazardous when its
                      bottom edge is under 60 in above any standing or walking surface;
                      exception when more than 60 in horizontally from the water's edge
R308.4.6 stairs       hazardous when the bottom edge is under 36 in above the adjacent
                      walking surface of a stair, landing or ramp (the IRC figure; the IBC
                      uses 60 in); exception when 36 in or more horizontally from it
R308.4.7 bottom       hazardous when under 60 in above the bottom landing and within a
landing               60 in horizontal arc of less than 180 degrees from the bottom tread
                      nosing; exception for a compliant guard more than 18 in from the glass
```

The code is a list of places where a person is likely to fall into glass, each described by a distance. The tile asks
which place the glazing is in and the two or three distances that subsection turns on, and answers hazardous or not
with the subsection that decided it. Where a subsection has an exception the reader can assert, the tile asks for it
as a yes/no and reports which exception cleared the lite.

The window subsection is the one that is almost always misapplied. Four conditions must all hold -- the pane over 9
sq ft, the bottom under 18 in, the top over 36 in, and a walking surface within 36 in -- and a 12 sq ft picture window
whose sill is 20 in off the floor is not hazardous by this subsection no matter how large it is. The wet-area
subsection runs the other way: a 1 sq ft lite in a shower wall is hazardous if its bottom is under 60 in.

The stair figure differs between the residential and building codes (36 in in the IRC, 60 in in the IBC), so the tile
carries a code selector for that subsection alone and says which it applied.

**Inputs:** the location type (door panel, near a door, window, guard, wet area, beside a stair or ramp, bottom
landing), the pane's exposed area, its bottom and top edge heights above the floor or walking surface, the horizontal
distance to the door edge, walking surface, water's edge or nosing as the subsection needs, and the applicable
exception assertions

**Outputs:** hazardous or not, the subsection that governs, the condition that decided it (or the exception that
cleared it), and the manufacturer's-designation reminder of R308.1

## 3. Worked example

A fixed window pane: exposed area 12 sq ft, bottom edge 12 in above the floor, top edge 70 in, a hallway floor 24 in
from the glass, no rail:

```
area       12 sq ft > 9     yes
bottom     12 in < 18       yes
top        70 in > 36       yes
walking    24 in <= 36      yes
R308.4.3   all four hold    HAZARDOUS: safety glazing required
```

**The same pane at 8 sq ft is not hazardous by R308.4.3** (the area condition fails and all four must hold). A
shower-wall lite with its bottom edge 24 in above the shower floor, 30 in from the water's edge, is hazardous under
R308.4.5 (under 60 in and within 60 in horizontally), and would be cleared at 61 in horizontally.

## 4. Scope and non-goals

A screen against the code's decision table, not a code-official determination. It does not select the glazing
category (CPSC 16 CFR 1201 Category I or II, R308.3), size the glass for wind (`glass-thickness-wind`), address
skylights (R308.6), louvered windows, glass block or decorative glazing beyond the exception flag, or the IBC's
additional locations. The adopted edition and the AHJ govern; free at codes.iccsafe.org.
