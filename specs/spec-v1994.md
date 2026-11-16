# roughlogic.com Specification v1994 -- Wood Stud Wall Takeoff (`calc-construction.js`, Group E Carpentry and Construction, framing, 1 New Tile)

> **Status: LANDED 2026-11-16 (proposed 2026-11-16). Single-tile spec.** In scope under the spec-v106 trades-only
> charter: Group E, beside `metal-stud-takeoff` (light-gauge steel) and `residential-framing` (a whole-house rollup
> from footprint and perimeter), no new dependency and no network call.
>
> **The gap, and the evidence for it.** "How many studs for a 40 ft wall at 16 on center" is the commonest framing
> question there is, and the catalog could not answer it: the agent door routed it to `assembly-r-value` and put the
> 40 ft wall, converted to 480 in, into the stud-depth field (the last wrong binding in
> `test/fixtures/free-text-queries.json`). `metal-stud-takeoff` counts steel studs and track; `residential-framing`
> needs a footprint, joist and rafter spans and a roof pitch before it will count a single wall.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. The tile: `wood-stud-wall-takeoff`

```
field studs    ceil(wall length x 12 / spacing) + 1   (one at each end of the run)
extras         corners x studs per corner + intersections x studs per intersection
               + openings x studs per opening
studs          field studs + extras; to buy = ceil(studs x (1 + waste))
plates         plate LF = wall length x plate courses (1 bottom + 2 top = 3, IRC R602.3.2
               double top plate); plate pieces = ceil(plate LF x (1 + waste) / stock length)
```

The base count is the spaces plus one, the rule every estimating text agrees on. What the texts do NOT agree on is
the allowance at corners and openings (Hicks' Builders' Guide counts doubling at doors and windows separately from
partition angles at 2 studs each; trade calculators use 2 or 3 per corner and 2 or 3 per opening), so each allowance
is an input with a stated default: 2 per corner, 2 per partition intersection, 2 per opening. Two per opening is a
minimum (the king studs, where the opening displaces enough field studs for its jacks and cripples); a narrow window
needs 3 to 4. The plate courses default to 3 for the R602.3.2 double top plate; a single top plate (its exception, or
an interior nonbearing wall under R602.5) enters 2.

**Inputs:** wall length (ft), stud spacing (in, 16 default), corners, studs per corner, partition intersections,
studs per intersection, openings, studs per opening, plate courses, plate stock length (ft, 16 default), waste (%,
10 default). Counts are whole numbers; spacing outside 12-48 in, stock outside 6-24 ft, a non-positive length or a
negative count is refused, and a blank or null input takes its default. As built after review (2026-11-16): the
null-means-default rule, the spacing and stock bounds, the R602.3.2 exception and R602.5 wording, and the
opening-allowance wording.

**Outputs:** field studs, extra studs, total studs, studs to buy with waste, plate LF, plate pieces to buy.

## 2. Worked example

A 40 ft wall at 16 in on center with 2 corners, 1 partition intersection and 2 openings, the default allowances,
3 plate courses in 16 ft stock and 10% waste:

```
field studs   ceil(480 / 16) + 1 = 31
extras        2 x 2 + 1 x 2 + 2 x 2 = 10
studs         41; to buy ceil(41 x 1.10) = 46
plates        40 x 3 = 120 LF; ceil(120 x 1.10 / 16) = 9 pieces
```

The bare question (40 ft at 16 in, nothing else) is 31 studs, 35 to buy (34.1 rounded up), 120 LF of plate in 9 sixteens.

## 3. Scope and non-goals

One straight wall per run (run each wall, or the summed length of walls with the same layout). It does not size
headers (`header-sizing`), check notches and bores (`stud-notch-bore-limit`), count blocking or sheathing, or price
the lumber. Citation: Hicks' Builders' Guide, "Estimating Studding" (public domain), and IRC R602.3.2 by name, free at
codes.iccsafe.org; the plans and the framer's layout govern.
