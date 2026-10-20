# roughlogic.com Specification v1992 -- Fireplace Clearance to Combustibles and Mantel Projection (IRC R1001.11) (`calc-masonry.js`, Group E Carpentry and Construction, masonry, 1 New Tile)

> **Status: LANDED 2026-10-19 (proposed 2026-10-19). Single-tile spec. As built from the IRC 2024 and 2021 R1001.11 text read on 2026-10-19: this spec merged two exceptions into one trim rule. Exception 3 lets sheathing edges and trim abut the sidewalls and hearth extension 8 in or more from the inside of the firebox lining (12 in for an opening of 6 sq ft or more); Exception 4 keeps mantels and trim on the fireplace front out of the 6 in around the opening, with the 1/8 in per inch projection limit within 12 in. The tile checks them separately and reads 'within 12 inches' as including 12 (a 1.5 in projection passes at 12 in). IRC 2024 also permits noncombustible fill in the framing airspace.** Part of [scope-product-expansion](scope-product-expansion.md). In scope under the
> spec-v106 trades-only charter: Group E, the masonry fireplace bench in `calc-masonry.js` beside
> `hearth-extension-check` ([spec-v1983](spec-v1983.md)), no new dependency and no network call.
>
> **The gap.** The hearth-extension spec names clearance of combustibles around the opening as separate. It is the
> other half of every fireplace final: framing 2 in off the front and sides and 4 in off the back, no trim within 6 in
> of the opening, and a mantel within 12 in of the opening that may project only 1/8 in for each inch it sits away.
> The projection rule is a line a finish carpenter has to compute for every mantel height, and nobody does.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds fuzzer, worked-example registry and the v18/v21 contract apply: a negative distance,
projection or clearance returns `{ error }`. Citation: IRC 2024 R1001.11 and its exception 4 by name (framing
clearances and the mantel and trim rule), values unchanged since the 2012 edition, free at codes.iccsafe.org,
GOVERNANCE.general. Aliases: `mantel clearance above fireplace opening`, `how far above the firebox can the mantel
be`, `1/8 inch per inch mantel projection rule`, `combustible clearance to masonry fireplace 2 inches`, `R1001.11
fireplace clearance`.

## 2. The tile

### 2.1 `fireplace-clearance-check` -- Fireplace Clearance to Combustibles and Mantel Projection (IRC R1001.11)

```
framing           wood beams, joists, studs and other combustibles at least 2 in from the
                  front faces and sides of the masonry fireplace and 4 in from the back
                  face; the air space is not filled except with fireblocking
trim              exposed combustible trim and the edges of sheathing (siding, flooring,
                  drywall) not within 6 in of the fireplace opening (exception 4)
mantel and trim   combustible material within 12 in of the opening may project no more
within 12 in      than 1/8 in for each 1 in of distance from the opening:
                  p_max = d / 8 for 6 in <= d < 12 in; prohibited under 6 in;
                  unlimited by this rule at 12 in or more
distance needed   for a given projection p: d_min = max(6, 8 p) in while 8 p < 12;
                  at 12 in or more the projection rule no longer applies, so a mantel
                  thicker than 1.5 in is placed at 12 in or more
check             each measured clearance and the mantel's distance and projection
                  against the rule
```

The masonry is the firebreak and the code keeps wood off it in two ways. Framing stays an air gap away, 2 in at the
front and sides where the masonry is thickest and 4 in at the back where the firebox is nearest, and the gap stays
empty. Finish materials may touch the masonry face, but not within 6 in of the opening, and within a foot of the
opening they must stay thin: an eighth of an inch of projection per inch of distance, so trim 8 in above the opening
may stand 1 in proud and a mantel shelf 10 in above may stand 1.25 in. At 12 in and beyond the projection rule no
longer applies.

That line is where mantels go wrong. A 1.5 in thick mantel shelf 9 in above the opening is allowed 9 / 8 = 1.125 in and
fails by 3/8 in; raise it to 12 in and it passes; or keep it at 9 in and thin it to 1-1/8 in. The tile reports both
the allowed projection at the measured distance and the distance the measured projection needs.

**Inputs:** the measured framing clearance at the front and sides and at the back, the distance from the opening to
the nearest combustible trim, and for the mantel its distance above (or beside) the opening and its projection from
the masonry face

**Outputs:** pass/fail for the framing clearances and the 6 in trim rule, the allowed mantel projection at its
distance and the distance its projection needs, and the governing sentence

## 3. Worked example

Framing 2 in off the front and sides and 4 in off the back; trim starts 7 in from the opening; a 1.5 in thick mantel
shelf 9 in above the opening:

```
framing  front/sides 2 in >= 2 in  ok;  back 4 in >= 4 in  ok
trim     7 in >= 6 in              ok
mantel   d = 9 in: allowed p = 9 / 8 = 1.125 in; measured 1.5 in   FAIL (0.375 in over)
         for p = 1.5 in: d_min = 8 x 1.5 = 12 in
```

**Raise the mantel to 12 in and the projection rule no longer applies; at 10 in it is allowed 1.25 in.** Trim 5 in
from the opening fails the 6 in rule regardless of thickness.

## 4. Scope and non-goals

A check against the code's distances for a masonry fireplace. It does not address factory-built fireplaces and their
listed clearances (R1004), wood stoves and NFPA 211 clearance reductions, fireplace inserts, the hearth and hearth
extension (`hearth-extension-check`), the chimney (`chimney-termination-height`), or the exception for the 2 in and 4
in framing clearances at the exterior of a chimney. The adopted edition and the AHJ govern; free at
codes.iccsafe.org.
