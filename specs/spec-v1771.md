# roughlogic.com Specification v1771 -- Aboveground Tank Bottom CP Anode Layout (`calc-corrosion.js`, Group E Carpentry and Construction, cathodic protection and corrosion control, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-corrosion.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A tank bottom is a large flat plate resting on a pad, and it cannot be inspected without emptying and lifting the tank. Cathodic protection under it must reach the centre, and a perimeter ring -- the cheapest layout -- protects the rim and leaves the middle bare.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive tank diameter, current density, or grid spacing, or a grid spacing at or above the tank diameter returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the bottom-area current relation and ribbon loading convention with API 651 and API 653 named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`tank bottom cathodic protection`, `ast anode grid layout`, `under tank anode ribbon`, `tank bottom current density`, `mmo ribbon grid tank`.

## 2. The tile

### 2.1 `tank-bottom-anode-layout` -- Aboveground Tank Bottom CP Anode Layout

```
bottom area      A = pi x D^2 / 4 for the plate in contact with the pad
current          I = A x current density; the density depends on whether the bottom
                 sits on sand, on an oiled pad, or over a secondary containment liner
grid layout      linear anode ribbon in parallel runs at a chosen spacing; the total
                 ribbon length is the sum of the chords across the circle
ribbon loading   mA per foot of ribbon = total current / ribbon length, checked
                 against the anode's published output rating
ring layout      anodes around the perimeter only; the ribbon loading is acceptable
                 and the CURRENT DISTRIBUTION is not
throw            current from a perimeter ring attenuates toward the centre, and a
                 tank of any size leaves an unprotected middle
liner            a bottom over an impermeable liner is a confined electrolyte and
                 needs a grid; a ring cannot work at all
```

A tank bottom is the least inspectable surface in a facility and the one that leaks into the ground. It cannot
be seen without taking the tank out of service and it fails from the soil side, where nothing is visible even
after the tank is emptied. That is why cathodic protection under a bottom is designed for uniform coverage
rather than for a potential reading at a convenient point -- there is no convenient point, and a criterion met
at the rim says nothing about the centre.

Ribbon loading and current distribution are two independent checks and passing the first is not passing the
second. A perimeter ring on a large tank can be perfectly comfortable in milliamps per foot of anode while
delivering almost nothing to the middle of the plate, because the current has to travel radially through the
pad and attenuates as it goes. The layout that satisfies the anode's rating and the layout that protects the
steel are different layouts, and only one of them is cheap.

A secondary containment liner changes the problem rather than complicating it. An impermeable membrane under
the pad turns the space between the bottom and the liner into a closed electrolyte with no path to remote
earth, so any anode outside that space is electrically irrelevant. The anodes must be inside the containment,
distributed across the area, and that makes a grid the only layout available -- which is best decided before
the tank is built, because retrofitting a grid means lifting the bottom.

**Inputs:** the tank diameter, the current density for the pad and containment condition, the grid spacing or the ring layout, and the anode ribbon's published output rating

**Outputs:** the bottom area, the total current requirement, the ribbon length the grid requires, the ribbon loading in milliamps per foot, the same loading for a perimeter ring, and the distance from a perimeter ring to the tank centre

## 3. Worked example

A 100 ft diameter tank on a sand pad at 1.0 mA per square foot:

```
area = pi x 100^2 / 4 = 7,854 sq ft
I    = 7,854 x 1.0 mA = 7.85 A
```

**A grid of ribbon at 10 ft spacing** runs parallel lines across the circle at offsets of 5, 15, 25, 35, and
45 ft either side of the centreline, with each line a chord of length 2 x sqrt(50^2 - y^2):

```
total ribbon = 793 ft
loading      = 7,854 mA / 793 ft = 9.9 mA per foot
```

**10 mA per foot sits comfortably inside the rating of ordinary mixed-metal-oxide ribbon**, so the grid
passes its anode check with a wide margin.

**Now the perimeter ring, and watch the check that passes.**

```
circumference = pi x 100 = 314 ft
loading       = 7,854 / 314 = 25.0 mA per foot
```

**25 mA per foot also passes.** Judged on ribbon loading alone the ring is a perfectly good design, uses
60 percent less anode than the grid, and costs far less to install.

**And it leaves the middle of the tank 50 ft from the nearest anode.** Current from the ring has to travel
50 ft radially through the pad to reach the centre of the plate, attenuating the whole way, and the centre is
exactly where a bottom is least likely to be reached and least likely to be checked. **Tank bottoms perforate
in the middle**, and a ring is a layout that protects everywhere the problem is not.

**Over a containment liner the ring does not merely underperform -- it does nothing.** The liner closes the
electrolyte, and an anode outside the closed space has no path to the steel at all. **The grid has to be inside
the containment, and it has to be installed when the tank is built**, because the alternative is lifting the
bottom.

## 4. Scope and non-goals

A layout and loading screen. It does not model current distribution, which is the question a perimeter layout actually fails and which requires a resistive-network or finite-element analysis of the pad -- the distance to the centre reported here is a geometric warning, not a computed potential. The current density is entered and varies substantially with the pad material, its moisture and resistivity, whether the bottom is on oiled sand, clean sand, or a liner, and with the condition of any coating on the bottom side. It does not address the design of the anode system's headers, junction boxes, penetrations through the containment, or the reference electrodes permanently installed under the bottom, which are the only means of verifying the system afterwards and which must be placed at the time of construction. It does not evaluate the tank bottom's remaining thickness or its inspection interval, which are governed by API 653, and it takes no position on release prevention, secondary containment design, or the applicable environmental regulations. API 651 for tank bottom cathodic protection, API 653 for inspection, the applicable environmental regulations, and a qualified corrosion engineer govern.
