# roughlogic.com Specification v1978 -- Kitchen Countertop Receptacles (NEC 210.52(C)) (`calc-electrical.js`, Group A Electrical, 1 New Tile)

> **Status: LANDED 2026-10-19 (proposed 2026-10-19). Single-tile spec. As built: in `calc-electricalfield.js`, where the spec-v1860 split moved the branch-circuit bench, because `calc-electrical.js` is at 96.6% of its cap. Islands and peninsulas are entered as countertop AREAS (sq ft), not a count: an independent review found that NEC 2020 210.52(C)(2) sizes them by area (one outlet for the first 9 sq ft or fraction, one per further 18 sq ft or fraction, one within 2 ft of a peninsula's end); the one-per-island rule this spec described is the 2017 wording.** Part of [scope-product-expansion](scope-product-expansion.md). In scope under the
> spec-v106 trades-only charter: Group A, the NEC branch-circuit bench in `calc-electrical.js`, no new dependency and no
> network call.
>
> **The gap.** `wall-receptacle-count` ([spec-v1977](spec-v1977.md)) counts the 6-foot-rule outlets and says in its own
> non-goals that the kitchen countertop is counted elsewhere. Nothing counted it. The countertop rule has its own reach
> (24 in), its own threshold (12 in of counter), its own break points (a sink or a range), and since the 2023 NEC its
> own treatment of islands and peninsulas -- the change that fails the most 2023-cycle kitchen inspections.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds fuzzer, worked-example registry and the v18/v21 contract apply: an empty list, a
negative length or more than 12 countertop spaces returns `{ error }`. The spaces are a list input under the
`check-list-inputs` gate. Citation: NEC 2023 210.52(C)(1) through (C)(4) by name, free at nfpa.org/freeaccess,
GOVERNANCE.general; the spec-v1968 edition row applies, and the 2023 island change is a candidate first NEC row for
[spec-v1973](spec-v1973.md) once both editions' text are read. Aliases: `countertop receptacle spacing 24 48`, `how many
outlets for kitchen counter`, `210.52(C) countertop`, `island receptacle 2023 nec`, `kitchen counter outlet count`.

## 2. The tile

### 2.1 `countertop-receptacle-count` -- Kitchen Countertop Receptacles (NEC 210.52(C))

```
wall countertop    a receptacle outlet is required for every wall countertop or work
space              surface 12 in or wider (210.52(C)(1))
reach              no point along the wall line is more than 24 in, measured horizontally,
                   from a receptacle in that space; so receptacles are at most 48 in apart
per space          receptacles = ceil(length_in / 48)   for length >= 12 in; else 0
break points       a range, counter-mounted cooking unit, refrigerator or sink divides a
                   countertop into separate spaces (210.52(C)(4)), each counted alone
islands and        2023: a receptacle outlet is not required, but if none is installed,
peninsulas         provisions for one (a box, or a run) are, and any installed receptacle
                   must be on or above the surface (not more than 20 in above) or in a
                   listed countertop assembly; below-counter receptacles no longer count
                   toward the requirement (210.52(C)(2), (C)(3))
room total         sum over the wall spaces; islands and peninsulas reported separately
```

The countertop rule is the 6-foot rule shrunk to the scale of a toaster cord: a 2 ft reach instead of 6, a 12 in
threshold instead of 2 ft, and the same arithmetic. One receptacle covers 48 in of counter when it sits within 24 in
of the end, so a space of L inches needs the ceiling of L / 48. A 100 in run needs three; the common mistake is two at
the thirds, which leaves the last 2 in of counter 26 in from an outlet.

Break points matter more here than on a wall. A sink or a range splits the counter into two spaces that are each
counted, and a 10 in strip of counter between a sink and a wall needs nothing at all because it is under the 12 in
threshold. The tile takes the spaces as divided; a reader who enters one 120 in run that actually has a sink in it gets
a count that is low by one.

The 2023 edition changed the island and peninsula rule from "at least one" to "none required, but provide for one, and
if you install one it goes on or above the surface". The tile reports the island separately with that sentence, and
reports the 2020 area-based count (one for the first 9 sq ft, one per further 18 sq ft) when the reader selects that edition, because this is a
rule whose answer differs across editions and the adopted edition governs.

**Inputs:** the wall countertop spaces as a list of lengths in inches (up to 12), the number of islands and peninsulas,
and the NEC edition (2023 default, 2020)

**Outputs:** receptacles required per space and in total, the spaces under 12 in that need none, the island and
peninsula sentence for the chosen edition, and the maximum allowed spacing reminder

## 3. Worked example

A kitchen with six wall countertop spaces, in inches: 18, 30, 48, 96, 100 and 11, plus one island, under NEC 2023:

```
18 in    ceil(18 / 48)  = 1
30 in    ceil(30 / 48)  = 1
48 in    ceil(48 / 48)  = 1
96 in    ceil(96 / 48)  = 2
100 in   ceil(100 / 48) = 3
11 in    under 12 in    = 0
wall total                8 receptacle outlets
island   2023: none required; provide a box or a run for one; any installed
         receptacle goes on or above the counter, not more than 20 in up
```

**The 100 in run is the trap:** it is 4 in longer than two receptacles can cover, so it needs three, and the 11 in
return beside the refrigerator needs none.

## 4. Scope and non-goals

A count from the code's reach rule, not a layout. It does not place the receptacles, decide which small-appliance
circuit serves which (210.11(C)(1) and 210.52(B)), count the dining room, pantry or breakfast-room receptacles that
share those circuits, apply GFCI (210.8), or treat a wet-bar or laundry countertop. The 2023 provisions for
receptacle assemblies listed for countertops are reported, not designed. The AHJ-adopted NEC edition and the inspector
govern; free at nfpa.org/freeaccess.
