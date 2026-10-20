# roughlogic.com Specification v1989 -- Shower Pan Mortar Bed: Pre-Slope Thickness and Volume (`calc-finish.js`, Group E Carpentry and Construction, tile, 1 New Tile)

> **Status: LANDED 2026-10-19 (proposed 2026-10-19). Single-tile spec. As built, from the IPC 2027 text read on 2026-10-19: the shower sections are now 421 (421.5.2, liners pitched 1/4 in per 12 in toward the drain, 2 in above the finished threshold; 417.5.2 in IPC 2021), and IPC sets no 1/2 in per ft maximum, so the tile errors only under 1/4 in per ft and reports the steepest facet. The bed is modeled with a LEVEL perimeter, the usual screeding method, rather than this spec's max(|dx|, |dy|) surface, which screeds each wall at a different height: the average is (drain + 2 x rim) / 3, 1.167 in for the 5 by 3 ft example (not 1.100) and 1.75 in for the 6 by 4 ft one (not 1.524).** Part of [scope-product-expansion](scope-product-expansion.md). In scope under the
> spec-v106 trades-only charter: Group E, the tile bench in `calc-finish.js`, with `shower-compartment-check` in the
> plumbing module as the code-size sibling, no new dependency and no network call.
>
> **The gap.** A mortar shower pan is screeded from the drain to the walls at the code's quarter inch per foot, which
> makes it thicker at every wall than at the drain by a quarter inch per foot of distance. The volume of deck mud
> that takes is the thing a setter guesses and comes back for more of; the thickness at the far corner is the thing
> that decides whether the curb and the liner work. Nothing computed either.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds fuzzer, worked-example registry and the v18/v21 contract apply: a non-positive pan
dimension or bag yield, a drain outside the pan, a thickness at the drain under 1/2 in, or a slope outside 1/4 to
1/2 in per ft returns `{ error }`. Citation: IPC 2027 417.5.2 (the floor slopes not less than 1/4 nor more than 1/2
in per ft toward the drain; unchanged from 2021) by name, free at codes.iccsafe.org, and the TCNA Handbook method B415
named for the pre-slope under a pan liner, GOVERNANCE.general. Aliases: `shower pan mortar volume`, `pre slope deck
mud how many bags`, `shower floor slope 1/4 inch per foot thickness at wall`, `mud bed thickness shower pan`, `dry
pack for a shower pan`.

## 2. The tile

### 2.1 `shower-pan-mortar-bed` -- Shower Pan Mortar Bed: Pre-Slope Thickness and Volume

```
thickness at a   t(x, y) = t_drain + s x d(x, y), where s is the slope (in per ft) and d
point            is the distance from the drain measured straight toward the nearest
                 wall direction: d = max(|x - x_d|, |y - y_d|) in feet, because a mud
                 bed is screeded as planes from the drain to each wall
at a wall        thickest at the farthest wall: t_max = t_drain + s x d_max
average          the mean of t over the pan, integrated in closed form per rectangle
                 (the tile sums over the four rectangles the drain divides the pan into)
volume           V = L x W x t_avg / 12, cu ft
bags             ceil(V / yield per bag), yield from the bag (a 60 lb sand-mix or deck
                 mud bag is about 0.45 cu ft; entered)
two beds         a traditional pan has a pre-slope under the liner and a top bed over it;
                 the tile runs one bed per call, and the top bed's thickness at the drain
                 is its own input
```

The pan is a shallow pyramid with the drain at the apex, and its volume is its footprint times its average thickness.
At the code's minimum slope a pan 2.5 ft from drain to wall is 5/8 in thicker at the wall than at the drain; a 6 by 4
ft pan with an offset drain is over an inch thicker in the far corner. The average thickness is what the bags are
bought by, and because the surface is planar from the drain outward, the average is found exactly for each of the
four rectangles the drain's position cuts the pan into.

The thickness at the farthest wall is the second answer, and often the more important one: it sets where the liner
turns up, how tall the curb must be above the finished floor, and whether the bed is going to be too thick to cure
well without a second lift.

**Inputs:** the pan length and width, the drain position from one corner, the bed thickness at the drain, the slope
(1/4 in per ft default), and the bag yield

**Outputs:** the thickness at the farthest wall and at each wall's midpoint, the average thickness, the volume in
cubic feet, the bag count, and a note on the second bed

## 3. Worked example

A 5 by 3 ft pan with the drain centered, 3/4 in of mud at the drain, 1/4 in per ft, 0.45 cu ft per bag:

```
farthest wall   d_max = 2.5 ft; t_max = 0.75 + 0.25 x 2.5 = 1.375 in
side walls      d = 1.5 ft; t = 1.125 in
average         t_avg = 1.100 in
volume          V = 5 x 3 x 1.100 / 12 = 1.375 cu ft
bags            ceil(1.375 / 0.45) = 4 bags (3.06)
```

**A 6 by 4 ft pan with the drain 1.5 ft from the short wall and 2 ft from the long wall, 1 in at the drain:** t_max =
1 + 0.25 x 4.5 = 2.125 in at the far short wall, average 1.524 in, V = 3.048 cu ft, 7 bags (6.77).

## 4. Scope and non-goals

A volume and thickness for one screeded bed. It does not design the pan (liner, weep holes, curb, blocking), check the
compartment size (`shower-compartment-check`), size the drain, address bonded-waterproofing systems that use one bed,
linear drains that slope one way (enter the drain at a wall and read the one-way answer), or tile and thinset over
the bed (`thinset-coverage`). The adopted plumbing code, the TCNA method chosen and the installer govern; free at
codes.iccsafe.org.
