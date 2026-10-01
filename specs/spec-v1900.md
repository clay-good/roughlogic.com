# roughlogic.com Specification v1900 -- US&R Raker Shore Geometry and Wall Force (`calc-usar.js`, Group E Carpentry and Construction, collapse shoring, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-usar.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** A damaged masonry wall is held with rakers, and the design is a small triangle problem with a load taken from the wall's own weight: a tenth of the wall and roof in each raker's tributary width. `tilt-up-brace-load` sizes braces against wind on a panel; no tile gives a raker's length, base distance, axial force, and the upward kick at the wall.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive wall height, insertion height, spacing, or unit weight returns `{ error }`; a raker angle outside 30-75 degrees returns `{ error }`; an insertion height above the wall height returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): FEMA *Structural Collapse Technician* Module 2a (raker systems designed for about 10% of the weight of the wall and roof in their tributary area, 2% minimum), USACE *US&R Shoring Operations Guide* Ed. 5.0 (2021) raker length rules (17 in per ft of insertion height at 45 degrees, 14 in at 60 degrees), raker design loads, and collapse-zone definition, and the USACE *US&R Structures Specialist FOG* (2006) raker rating, cited by figure, named as the method, the US&R Structures Specialist named as governing, GOVERNANCE.structural.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`raker shore length`, `raker shore angle 45 60`, `wall raker force`, `usar raker design`, `brace damaged masonry wall`.

## 2. The tile

### 2.1 `usr-raker-shore` -- US&R Raker Shore Geometry and Wall Force

```
wall weight   W = wall psf x wall height x raker spacing + roof psf x roof
              tributary area (lb)
design force  H = 10% of W at the insertion point (2% minimum where no
              aftershock is expected)
geometry      raker length = h_i / sin(theta)   (rule: 17 in per ft at 45 deg,
              14 in per ft at 60 deg)
              base distance = h_i / tan(theta)
forces        raker axial F = H / cos(theta)
              vertical kick at the wall V = H x tan(theta) (the raker pushes
              the wall plate UP; the connection must resist it)
ratings       SOG 2021: 4,000 lb per single full-height 4x raker, 8,000 lb per
              pair with bracing; FOG 2006: 2,500 lb horizontal per raker.
              Both shown -- the editions differ.
collapse zone 1.25 to 1.5 x the wall height
```

A raker stops a wall from falling outward by pushing back at a point partway up, and the force it has to supply is a
fraction of the wall's weight rather than a wind load. A wall that is still standing is close to plumb, so the force to
hold it is small, but the guides design for a tenth of the wall and roof weight because an aftershock can shake it
further out. The tile computes that weight from the wall's unit weight, height, and the raker spacing, adds the roof
that bears on it, and takes ten percent.

The geometry is a right triangle, and the angle is the designer's main choice. A 45-degree raker has a shorter axial
force but a longer base -- it needs more ground in front of the wall; a 60-degree raker fits a narrow street but carries
a larger axial force and a larger vertical kick. That kick is the part most easily missed: the raker's thrust has an
upward component at the wall plate, and a plate that is only nailed can be pushed up the wall. The guides' length rules
of 17 and 14 inches per foot of insertion height reproduce the trigonometry to within an inch.

The two editions of the guide rate rakers differently, and the tile shows both rather than choosing: the 2021
Shoring Operations Guide gives 4,000 lb for a single full-height raker and 8,000 lb for a braced pair; the 2006 Field
Operations Guide gives 2,500 lb of horizontal capacity per raker. The collapse zone -- the ground the wall would cover
if it fell -- is reported so that the base and the crew stay outside it where possible.

**Inputs:** the wall unit weight (or construction and thickness), the wall height, the raker spacing, the roof tributary area and unit weight, the insertion height, the raker angle, and whether aftershocks are expected

**Outputs:** the tributary wall and roof weight, the design horizontal force, the raker length (trigonometric and by rule), the base distance, the axial force, the vertical kick, the check against both editions' ratings, and the collapse-zone distance

## 3. Worked example

A 12 in unreinforced masonry wall (125 psf) 14 ft tall, rakers at 8 ft centres, carrying an 8 x 10 ft roof area at
15 psf, rakers inserted at 12 ft:

```
W        125 x 14 x 8 + 8 x 10 x 15 = 14,000 + 1,200 = 15,200 lb
H        10% x 15,200 = 1,520 lb
45 deg   length 144 / sin 45 = 203.6 in (rule 17 x 12 = 204 in)
         base 144 in    axial 2,150 lb    kick 1,520 lb
60 deg   length 144 / sin 60 = 166.3 in (rule 14 x 12 = 168 in)
         base 83.1 in   axial 3,040 lb    kick 2,633 lb
zone     1.25 to 1.5 x 14 = 17.5 to 21 ft
```

**At 45 degrees each raker carries 2,150 lb along its length and needs 12 ft of ground in front of the wall.** At 60
degrees the base shrinks to 7 ft, but the axial force rises to 3,040 lb and the kick to 2,633 lb. Both are within the
2021 guide's 4,000 lb single-raker rating; the horizontal 1,520 lb is within the 2006 guide's 2,500 lb.

**The wall's collapse zone reaches 21 ft into the street** -- beyond the 45-degree raker's base, which puts the crew
building it inside the zone for the whole job.

## 4. Scope and non-goals

A geometry and force estimate for solid-sole and flying rakers against the US&R published ratings. It does not design the wall plate, sole, and bottom-restraint connections, the cleats, or the lateral bracing between rakers; check the wall itself for cracking or out-of-plane failure between rakers; evaluate the ground at the sole (`picket-anchor-soil` for picket anchorage); or address tied-back strongbacks and other systems. Unit weights are typical; the actual wall governs. The US&R guides, the US&R Structures Specialist, and the incident's structural engineer govern.
