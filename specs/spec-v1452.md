# roughlogic.com Specification v1452 -- Conductor Blowout and Horizontal Clearance (`calc-lineworker.js`, Group A Electrical, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Ground clearance is checked straight down. Nothing in the catalog checks sideways. A conductor in wind swings out of the plane of the poles, and the number that matters at a building corner, a pole line crossing, or a right-of-way edge is how far it goes -- which is a function of the wind, the conductor weight, and the sag, and of nothing else.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive conductor diameter, weight per foot, or sag, or a negative wind pressure returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the transverse-swing geometry as standard overhead line practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`conductor blowout`, `wind swing conductor`, `horizontal clearance line`, `conductor side swing`, `blowout clearance`.

## 2. The tile

### 2.1 `conductor-blowout` -- Conductor Blowout and Horizontal Clearance

```
wind load per foot   F_w = p x d / 12          (p in psf, d in inches)
swing angle          theta = atan( F_w / w )
blowout              B = S x sin(theta)
remaining clearance  C = C_still - B
```

A conductor hanging in still air is a plane curve in the vertical plane of the two supports. Add transverse
wind and the whole curve swings about the line between the attachment points like a hinged sheet, through the
angle whose tangent is the wind load per foot over the weight per foot. The conductor does not stretch to do
this; the sag along the swung plane is the same sag, just tilted, so the horizontal displacement at midspan is
the sag times the sine of the swing angle.

Two things fall out of that. The swing angle is independent of span and of tension -- it depends only on the
ratio of wind load to weight -- but the blowout DISTANCE is proportional to sag, so the long, slack spans blow
out the furthest, and they blow out furthest on exactly the hot, sagging days when vertical clearance is also
worst. And a light conductor blows out much further than a heavy one in the same wind, which is why small
distribution conductor near buildings is the recurring problem and not the transmission line overhead.

**Inputs:** conductor diameter, weight per foot, wind pressure (or wind speed converted to pressure), midspan sag at the condition checked, and the still-air horizontal clearance to the object

**Outputs:** the wind load per foot, the swing angle, the midspan blowout distance, the remaining horizontal clearance, and the wind pressure at which the clearance is exhausted

## 3. Worked example

ACSR Drake, 1.108 in diameter, 1.094 lb/ft, at a 12 ft sag, in a 9 psf wind (roughly a 59 mph gust on a
round conductor):

```
F_w   = 9 x 1.108 / 12         = 0.8310 lb/ft
theta = atan(0.8310 / 1.094)   = 37.2 deg
B     = 12 x sin(37.2 deg)     = 7.26 ft
```

The conductor swings 37.2 degrees and moves 7.26 ft sideways. If the still-air clearance to a building corner was
10 ft, 2.74 ft is left. Halve the conductor weight to a light #2 and the same wind swings it to
56.6 degrees and 10.02 ft of blowout, which is how a span that looked fine on a still day ends up
in the tree line.

## 4. Scope and non-goals

Transverse wind only, midspan, one conductor, uniform wind over the whole span. It does not model the
insulator string swing at a suspension structure, which adds to the displacement at the support and is the
governing case for a pole-top pin or post insulator; it does not model differential swing between phases and so
does not answer phase-to-phase clearance under wind, which is the case galloping and non-uniform gusts actually
drive. Gust response and span-length reduction factors are not applied. The NESC clearance rule that applies to
the object in question, the line design, and the utility's construction standard govern.
