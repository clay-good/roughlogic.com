# roughlogic.com Specification v1884 -- Rainwater First-Flush Diversion Volume and Standpipe Length (`calc-reliefwater.js`, Group M Water and Wastewater Operations, emergency water supply, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefwater.js`**
> (Group M Water and Wastewater Operations, hub `/groups/water/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** `rainwater-yield`, `rainwater-catchment-area`, and `cistern-storage-days` size the harvest and the tank. None sizes the diverter that keeps the roof's first, dirtiest water out of the tank -- the component a catchment built in a hurry most often leaves out.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive roof footprint, diversion rate, or pipe diameter returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): Texas Water Development Board, *The Texas Manual on Rainwater Harvesting*, 3rd ed. (2005), Chapter 2, "First-Flush Diverters" (pp. 7-8), named as the method, the local health department (for potable use) and the AHJ named as governing, GOVERNANCE.water.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`first flush diverter size`, `rainwater first flush volume`, `roof washer gallons`, `first flush pipe length`, `rain barrel diverter`.

## 2. The tile

### 2.1 `first-flush-diverter` -- Rainwater First-Flush Diversion Volume and Standpipe Length

```
volume        1 to 2 gal per 100 sq ft of roof FOOTPRINT (horizontal projection)
              minimum rule of thumb: 10 gal per 1,000 sq ft (= the low end)
rain depth    1 gal per 100 sq ft = 231 in^3 / 14,400 in^2 = 0.016 in of rain
standpipe     length per gallon = 231 / (pi/4 x d^2) in
              3 in pipe 32.7 in/gal   4 in pipe 18.4 in/gal   6 in pipe 8.17 in/gal
per gutter    size one diverter per downspout from the footprint that drains to it
```

The first flush is the water that washes the roof, and it carries what accumulated there between rains: dust,
pollen, bird droppings, and in the aftermath of a storm, debris and ash. The TWDB range of one to two gallons per
hundred square feet of footprint is a rule of thumb, and the manual says plainly that no exact calculation exists --
the right volume depends on the number of dry days, the roof surface, tree overhang, and season. The tile shows both
ends of the range and the minimum rule, which coincides with the low end.

Expressing the volume as rain depth shows how little it is and why it still matters. One gallon per hundred square
feet is the first sixtieth of an inch of rain, and two gallons is about a thirtieth. That thin first layer carries a
disproportionate share of the contamination, so diverting it costs almost nothing in yield and removes most of what
would otherwise settle in the tank.

The standpipe is the simplest diverter, and its length is the part people get wrong. A gallon occupies 33 inches of
3-inch pipe but only 8 inches of 6-inch pipe, so a diverter built from whatever pipe is at hand can be too short by a
factor of four. The footprint is measured in plan, not along the slope, and a roof with several downspouts gets a
diverter on each, sized from the area that drains to it.

**Inputs:** the roof footprint draining to the downspout, the diversion rate (1 to 2 gal per 100 sq ft), and the standpipe diameter

**Outputs:** the diversion volume at the chosen rate and across the range, the equivalent rain depth, and the standpipe length in inches and feet

## 3. Worked example

A 1,500 sq ft roof footprint draining to one downspout at a relief clinic:

```
volume   1,500 / 100 x 1 gal = 15 gal     (2 gal rate: 30 gal)
minimum  10 gal per 1,000 sq ft x 1.5 = 15 gal   -- the same number
depth    15 gal diverted = 0.016 in of rain off this roof
6 in     15 x 8.17 = 122.5 in = 10.2 ft
4 in     15 x 18.38 = 275.7 in = 23.0 ft
```

**Fifteen gallons, which is 10.2 ft of 6-inch pipe but 23.0 ft of 4-inch** -- the smaller pipe is impractical to
stand up beside a wall, which is why the manual favours 6 or 8-inch standpipes.

**At the upper rate the same roof diverts 30 gallons: 20.4 ft of 6-inch pipe, or 46.0 ft of 4-inch.** A dusty site,
a long dry spell, or ash on the roof after a fire argues for the upper rate and the larger pipe.

## 4. Scope and non-goals

A sizing aid for a standpipe first-flush diverter using the TWDB rule of thumb. It does not make harvested rainwater potable: that requires filtration and disinfection appropriate to the use, and the local health department's requirements govern potable rainwater systems. It does not size gutters, downspouts, leaf screens, the storage tank (`cistern-storage-days`), or the harvest (`rainwater-yield`), and it does not compute the drain-down time of the diverter's weep hole. Nominal pipe diameter is used, as the manual does; actual inside diameters differ by a few percent. The TWDB manual, the local health department, and the AHJ govern.
