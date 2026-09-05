# roughlogic.com Specification v1680 -- Gored Elbow Segment Angles and Development (`calc-metalair.js`, Group E Carpentry and Construction, sheet metal, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-metalair.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; sheet metal and architectural metal), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A gored elbow is built from flat rings cut at an angle, and the angle depends on how many gores share the turn. The end gores cut at half the angle of the middle ones, which is the detail that gets missed and produces an elbow that does not land square.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a gore count below two, a turn angle at or below zero or at or beyond 180 degrees, or a non-positive radius returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the gored elbow turn distribution with SMACNA duct construction standards named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`gored elbow layout`, `segmented elbow angles`, `pipe lobster back elbow`, `elbow gore cut angle`, `five piece elbow layout`.

## 2. The tile

### 2.1 `gored-elbow-angles` -- Gored Elbow Segment Angles and Development

```
total turn        the elbow angle, commonly 90 degrees
gore count        n pieces, giving n-1 joints
middle gore angle each middle gore turns the total divided by (n - 1)
end gore angle    HALF a middle gore, because it turns only once
cut angle         each seam is cut at half the turn it makes, from the perpendicular
throat and heel   the cut produces a short throat and a long heel on each gore
radius            the centreline radius sets the gore lengths
```

The end-gore rule is the whole trick. A five-piece elbow has four joints, and if every joint turns the same
amount then the turn per joint is the total over four -- but the two end pieces each connect to straight duct at
one end and turn only at the other, so they turn half as much as the middle pieces. Cutting all five gores the
same produces an elbow that turns the right total and does not present square faces at its ends, which shows up
as a fitting that will not mate.

The cut angle at each seam is half the turn that seam makes, measured from the perpendicular, because each of the
two gores meeting at that seam contributes half the turn. So on a 90 degree five-piece elbow the middle seams each
turn 22.5 degrees and are cut at 11.25 degrees on each side.

Gore count is a trade between smoothness and labour. More gores approximate a smooth radius more closely, which
lowers pressure loss and looks better, and each one is another two cuts and another seam. Three-piece elbows are
common in small sizes and five-piece in larger duct where the loss matters.

**Inputs:** the total turn angle, the number of gores, the duct or pipe diameter, the centreline radius, and the seam allowance

**Outputs:** the turn angle of each middle and end gore, the cut angle at each seam, the throat and heel lengths of each gore, the developed length of each gore, and the material required for the elbow

## 3. Worked example

A 5-piece 90 degree elbow:

```
joints        = 5 - 1 = 4
middle gores  = 5 - 2 = 3
```

The turn is shared so that each end gore turns half of what a middle gore does. With 3 middle gores turning a
full share and 2 end gores turning half a share each:

```
total shares  = 3 + 2 x 0.5 = 4
middle gore turn = 90 / 4 = 22.50 degrees
end gore turn    = 11.25 degrees
```

**Each middle gore turns 22.5 degrees and each end gore 11.2 degrees.** Cutting all
five the same at `90/5` = 18.0 degrees each would total 90 degrees of turn and leave both ends
cut at an angle instead of square -- so the elbow would not mate with straight duct.

The seam cuts: each seam is cut at half the turn it makes, from the perpendicular. The middle seams turn
22.5 degrees, so each gore is cut at 11.25 degrees on that side.

Gore count trade: a three-piece 90 gives `45.0` degree middle turns -- a coarser approximation to the
radius, more pressure loss, and half the seams. Seven pieces gives 15.0 degree turns, smoother and
more work.

## 4. Scope and non-goals

A layout calculation for a uniform gored elbow. It develops the cut angles and does not include seam
allowances, laps, or the edge preparation the seam type requires. It assumes a constant cross-section through the
turn and equal gore lengths at the centreline; elbows with varying cross-section, mitred rectangular elbows, and
elbows with turning vanes follow different rules. It does not evaluate the pressure loss of the resulting elbow,
which depends on the radius ratio and the number of gores, or select a radius, which is a design decision
balancing loss against space. It does not address duct construction requirements -- gauge, reinforcement, and
seam type by pressure class -- or the reinforcement a large gored elbow requires at its seams. SMACNA duct
construction standards and the project specification govern.
