# roughlogic.com Specification v1977 -- Required Wall Receptacles by the 6-Foot Rule (NEC 210.52(A)) (`calc-electrical.js`, Group A Electrical, 1 New Tile)

> **Status: LANDED 2026-10-19 (proposed 2026-10-19). Single-tile spec. As built: in `calc-electricalfield.js`, where the spec-v1860 split moved the branch-circuit bench, because `calc-electrical.js` is at 96.6% of its cap.** Part of [scope-product-expansion](scope-product-expansion.md). In scope under the
> spec-v106 trades-only charter: Group A, the NEC branch-circuit bench in `calc-electrical.js`, no new dependency and no
> network call.
>
> **The gap.** The catalog sizes the branch circuit, the conductor, the box and the breaker, and carries a GFCI/AFCI
> reference, but nothing counts the receptacles a room must have. The 6-foot rule of 210.52(A)(1) is the first thing a
> residential rough-in is checked against and the most misread rule in Article 210: it is a 6 ft reach, not a 6 ft
> spacing, and a single wall of 14 ft needs two outlets while 24 ft needs the same two.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds fuzzer, worked-example registry and the v18/v21 contract apply: an empty wall list,
a negative length, or more than 12 wall spaces returns `{ error }`. The wall spaces are a list input (the
`check-list-inputs` behavioural gate applies: perturbing any one length must move the count or the coverage figure).
Citation: NEC 2023 210.52(A)(1) through (A)(4) by name, free at nfpa.org/freeaccess, GOVERNANCE.general; the
spec-v1968 "Your state's edition" row applies since the citation names the NEC. Aliases: `receptacle spacing 6 ft 12
ft`, `how many outlets does a bedroom need`, `210.52 wall space receptacles`, `receptacle count for a room`, `outlet
every 12 feet rule`.

## 2. The tile

### 2.1 `wall-receptacle-count` -- Required Wall Receptacles by the 6-Foot Rule (NEC 210.52(A))

```
wall space        any unbroken run of wall 2 ft or wider along the floor line, measured
                  around corners, not broken by a doorway, fireplace or fixed cabinet;
                  the width of a fixed panel in an exterior wall counts, a sliding panel
                  does not; a fixed room divider (bar counter, railing) counts (210.52(A)(2))
rule              no point along the floor line of any wall space is more than 6 ft,
                  measured horizontally, from a receptacle outlet (210.52(A)(1))
per wall space    receptacles = ceil(length_ft / 12): the first within 6 ft of one end
                  covers 12 ft; each further receptacle covers another 12 ft
under 2 ft        no receptacle required (the space is not a "wall space")
room total        sum over the wall spaces entered
coverage          12 ft x receptacles - length: the slack the installer can spend
                  moving outlets toward where furniture goes
does not count    a countertop receptacle required by 210.52(C) (210.52(A)(4)); a
                  receptacle more than 5.5 ft above the floor (210.52 general)
```

The rule is a reach, and the count follows from it: one receptacle placed 6 ft from a corner covers the 12 ft of wall
centred on it, so a wall of L feet needs the ceiling of L / 12 receptacles. A 3 ft wall between two doors needs one; a
14 ft wall needs two; a 24 ft wall still needs two, placed at 6 ft and 18 ft. The misreading that costs rough-ins is
treating 6 ft as the spacing and installing twice as many, which passes inspection and wastes an hour per room, or
treating 12 ft as a reach and installing half as many, which fails.

Only unbroken wall space counts, and the break points are listed by the code: doorways and similar openings,
fireplaces and fixed cabinets. A wall interrupted by a door is two wall spaces, each counted on its own, and a space
narrower than 2 ft needs nothing. The tile takes the wall spaces as the reader has already divided them; it does not
divide a wall at a door it cannot see.

Hallways 10 ft or longer (210.52(H)) and foyers over 60 sq ft (210.52(I)) carry their own single-receptacle rules and
are entered as their own spaces with a type flag; kitchens, bathrooms, garages, laundry and outdoor locations have
their own required outlets under 210.52(C) through (G), which this tile does not count.

**Inputs:** the wall spaces of the room as a list of lengths in feet (up to 12), and whether the room is a hallway or
foyer rather than a habitable room

**Outputs:** the receptacles required per wall space and in total, the slack per wall space, the spaces too narrow to
need one, and the reminder that countertop and dedicated outlets are counted elsewhere

## 3. Worked example

A bedroom with five wall spaces: 14 ft, 9 ft, 3 ft (between the closet and the door), 1.5 ft (a return beside the
window) and 22 ft (two walls around a corner, unbroken):

```
14 ft   ceil(14 / 12) = 2    slack 10 ft
9 ft    ceil(9 / 12)  = 1    slack 3 ft
3 ft    ceil(3 / 12)  = 1    slack 9 ft
1.5 ft  under 2 ft    = 0    not a wall space
22 ft   ceil(22 / 12) = 2    slack 2 ft
total                   6 receptacle outlets
```

**The 22 ft run is the one to watch:** two receptacles cover it only if neither is more than 6 ft from its end, which
leaves 2 ft of slack in total. The 14 ft wall's two receptacles can be moved 10 ft between them to land behind the
bed.

## 4. Scope and non-goals

A count from the code's reach rule, not a layout. It does not place the outlets, count the kitchen countertop,
bathroom, garage, laundry, outdoor or HVAC outlets (210.52(C) through (G) and 210.63), apply the 2023 island and
peninsula provisions, decide what is a "similar opening", or size the circuits that serve the outlets
(`branch-circuit-wire-footage` and `breaker-sizing` do that). The AHJ-adopted NEC edition and the inspector govern;
free at nfpa.org/freeaccess.
