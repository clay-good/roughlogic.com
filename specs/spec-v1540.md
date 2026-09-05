# roughlogic.com Specification v1540 -- Railroad Degree of Curve, Radius, and Middle Ordinate (`calc-rail.js`, Group E Carpentry and Construction, railroad track, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rail.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; railroad track and equipment), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Railroads describe curves by degree, highways by radius, and the conversion between them trips up everyone who works across both. Degree of curve also carries the chord definition, which is not the same as the arc definition a highway engineer means, and the difference matters on sharp curves.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive degree of curve or radius, or a chord length at or beyond twice the radius returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the chord and arc definitions of degree of curve and the 62 ft chord field rule, with 49 CFR 213 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`degree of curve radius`, `railroad curve conversion`, `middle ordinate 62 foot chord`, `chord definition curve`, `string lining curve rail`.

## 2. The tile

### 2.1 `degree-of-curve` -- Railroad Degree of Curve, Radius, and Middle Ordinate

```
chord definition   D = 2 arcsin( 50 / R ) in degrees; R = 50 / sin(D/2)
arc definition     R = 5,729.58 / D
middle ordinate    M = R (1 - cos(D_total/2)); the string-lining measurement
degree from field  measure the middle ordinate of a 62 ft chord: D ~ M in inches
```

A one degree curve is the curve that turns one degree over a hundred-foot chord, and the useful field
consequence is the 62 ft chord rule: the middle ordinate of a 62 ft chord, measured in inches, is very nearly the
degree of curve. That is a measurement a track inspector can make with a string and a rule, standing on the
track, with no instrument -- which is exactly the kind of thing this catalog should carry.

The chord-versus-arc distinction is small on flat curves and grows as they sharpen. At one degree the two
definitions differ by well under a foot of radius; at ten degrees the gap is meaningful, and a radius handed
between a railroad and a highway designer without stating the definition can be wrong by enough to matter at a
grade crossing or a clearance check.

Middle ordinate is the other everyday number, because string-lining a curve to find where it needs to move is
still done with a chord and a ruler on a great deal of track.

**Inputs:** degree of curve or radius, the definition (chord or arc), the chord length for a middle-ordinate calculation, and the total central angle for curve length

**Outputs:** the radius by both the chord and arc definitions with the difference between them, the degree of curve from a radius, the middle ordinate for a stated chord, the degree implied by a measured 62 ft middle ordinate, and the curve length for a stated central angle

## 3. Worked example

A 4 degree curve:

```
arc definition   R = 5,729.58 / 4        = 1432.4 ft
chord definition R = 50 / sin(4/2 deg)     = 1432.7 ft
difference                             = 0.3 ft
```

About a foot and a half apart at 4 degrees -- small. At 12 degrees the same comparison gives
477.5 ft against 478.3 ft, a 0.9 ft
difference, which is no longer negligible for a clearance or a turnout layout.

The field check, on a 62 ft chord:

```
M = R (1 - cos(theta/2)) with the 62 ft chord -> about 4.0 in
```

Roughly 4 inches of middle ordinate for a 4 degree curve, which is the string-and-rule rule of thumb.
A track inspector measuring 6 in on a 62 ft chord is standing in about a 6 degree curve, and can pair that with
`track-superelevation` to check the speed on the spot.

## 4. Scope and non-goals

Geometric conversion between the degree and radius descriptions of a circular curve, and the chord
middle-ordinate relation. It does not evaluate whether a curve is correctly aligned, which is what string-lining
is actually for and which requires a series of ordinates along the curve rather than one, and it does not compute
the throws needed to correct alignment. It does not address spirals, compound or reverse curves, or the
alignment tolerances in the FRA track safety standards, which are separate limits by class of track. It does not
handle vertical curves. Highway curve layout and stationing are `horizontal-curve` and `spiral-curve`. The FRA
Track Safety Standards at 49 CFR 213, the railroad's engineering instructions, and the track owner govern.
