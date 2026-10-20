# roughlogic.com Specification v1987 -- Tile Layout: Centering and Balanced Cuts (`calc-finish.js`, Group E Carpentry and Construction, tile, 1 New Tile)

> **Status: LANDED 2026-10-19 (proposed 2026-10-19). Single-tile spec. As built: this spec's start-full cut formula counts one joint too few. With joints between tiles and between the last full tile and its cut (not at the wall), the cut is run - n x tile - n x joint: 10.75 in for the 132 in example (not 10.875) and 3.75 in at 150 in (not 3.94). The centered formulas and figures are as written.** Part of [scope-product-expansion](scope-product-expansion.md). In scope under the
> spec-v106 trades-only charter: Group E, the tile bench in `calc-finish.js` beside `tile-count` and
> `thinset-coverage`, no new dependency and no network call.
>
> **The gap.** `tile-count` counts the tiles and the grout. It does not say where the first one goes, and that is the
> decision a setter makes on their knees before the first trowel: start full at a wall and take one cut at the far
> wall, or center the room and take two equal cuts. Centered on a tile or centered on a joint gives different cut
> widths, and one of the two usually leaves a sliver. The arithmetic is modular and nobody does it twice.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds fuzzer, worked-example registry and the v18/v21 contract apply: a non-positive run
or tile size, a negative joint, or a tile larger than the run returns `{ error }`. Citation: first-principles layout
arithmetic, with the TCNA Handbook and ANSI A108.02 named for the practice of avoiding cuts narrower than half a
tile, GOVERNANCE.general. Aliases: `tile layout where to start`, `center tile or center grout line`, `avoid sliver cuts
tile`, `tile cut width at the wall`, `balanced tile layout calculator`.

## 2. The tile

### 2.1 `tile-layout-cut-balance` -- Tile Layout: Centering and Balanced Cuts

```
pitch            P = tile + joint, the repeat along the run
start full       full tiles n = floor((run + joint) / P); one cut at the far wall of
                 width c = run - n x P + joint (0 when the run is an exact multiple)
tile-centered    an odd number k of full tiles centered on the room centerline; the two
                 end cuts are each c = (run - (k x tile + (k - 1) x joint)) / 2 - joint
joint-centered   an even number k of full tiles centered on a grout joint; same formula
k                the largest odd (or even) k whose end cuts are non-negative; if an end
                 cut would equal or exceed a full tile, k steps up by two
sliver           a cut under half a tile (or under 2 in, whichever is larger); the tile
                 reports which layout avoids one, and that shifting the start by half a
                 tile swaps the two centered layouts
both axes        run twice, once per room dimension
```

Any layout along one run has the same number of tiles give or take one; what differs is how the remainder is split.
Starting full at one wall puts the whole remainder at the far wall as one cut, which is fastest and looks worst when
the cut is small. Centering splits it into two equal cuts, and whether the center falls on a tile or on a joint
changes those cuts by half a tile: the two centered layouts always differ by exactly half a tile in cut width, so when one
of them is a sliver the other is at least a quarter tile wider than it. The tile reports all three and names
the one without a sliver.

A 132 in run of 12 in tile at a 1/8 in joint is the usual case. Starting full gives ten tiles and a 10.9 in cut at the
far wall, acceptable. Centered on a tile gives nine full and two 11.4 in cuts, the best-looking answer. Centered on a
joint gives ten full and two 5.3 in cuts, under half a tile, the one to avoid. At 150 in with a 3/16 in joint the
joint-centered layout leaves 1.8 in slivers at both walls, and the tile-centered one 7.9 in cuts; the half-tile shift
is the whole difference.

**Inputs:** the run (wall to wall) in inches, the tile size along the run, the grout joint width, and the minimum
acceptable cut (default half a tile)

**Outputs:** for each of the three layouts the full-tile count, the cut width(s) and their fraction of a tile; which
layouts leave a sliver; the recommended layout and the distance from the wall to the first full tile's edge

## 3. Worked example

Run 132 in, 12 in tile, 1/8 in joint, minimum cut half a tile (6 in):

```
P              = 12.125 in
start full     n = floor(132.125 / 12.125) = 10 full; cut = 132 - 121.25 + 0.125 = 10.875 in (91%)
tile-centered  k = 9; occupied 9 x 12 + 8 x 0.125 = 109.0; cuts = (132 - 109) / 2 - 0.125 = 11.375 in (95%)
joint-centered k = 10; occupied 121.25; cuts = (132 - 121.25) / 2 - 0.125 = 5.3125 in (44%)  sliver
recommended    tile-centered: first full tile edge at 11.375 + 0.125 = 11.5 in from the wall
```

**At 150 in and a 3/16 in joint:** start full 12 full + 3.94 in cut; tile-centered 11 full + two 7.875 in cuts (66%);
joint-centered 12 full + two 1.78 in cuts (15%, sliver). At 97 in of 6 in tile at 1/8 in: tile-centered 15 full +
two 2.5 in cuts (42%, sliver by the half-tile rule), joint-centered 14 full + two 5.56 in cuts (93%).

## 4. Scope and non-goals

A one-axis layout for a rectangular run. It does not handle diagonal, herringbone, offset (running-bond) or
multi-size patterns, out-of-square rooms (`layout-squaring`), doorways and transitions, the second axis beyond running
it twice, or the count and waste (`tile-count`). Lippage and flatness are `tile-flatness-lippage-check`
([spec-v1988](spec-v1988.md)). The installer's eye and the room's focal wall govern the final choice.
