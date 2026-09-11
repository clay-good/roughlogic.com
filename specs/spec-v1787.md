# roughlogic.com Specification v1787 -- Mash Tun Capacity and Grain Bed Depth (`calc-brewing.js`, Group O Kitchen and Food Service, commercial brewing and distilling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-brewing.js`**
> (Group O Kitchen and Food Service, hub `/groups/kitchen/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A mash tun's useful capacity is not its volume, it is the grain bed depth the lauter needs. Too shallow and the bed channels; too deep and it compacts and sets -- and the depth limit is what caps the strongest beer a brewhouse can make.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive tun diameter, grain weight, thickness, or depth limit, or a computed bed depth above the tun's own depth returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the mash volume per pound convention and the working grain bed depth range with the vessel manufacturer's data and the brewery's own lauter records named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`mash tun capacity`, `grain bed depth lauter`, `lauter tun sizing brewing`, `maximum grain bill tun`, `mash volume per pound`.

## 2. The tile

### 2.1 `mash-tun-grain-bed` -- Mash Tun Capacity and Grain Bed Depth

```
bed area         pi x D^2 / 4 for a round tun
mash volume      water + grain displacement; grain displaces roughly 0.08 gal per
                 pound, and water is thickness R (qt/lb) x pounds / 4
volume per lb    R/4 + 0.08 gal, the figure that converts a grain bill straight to
                 a mash volume
bed depth        mash volume in cu ft / bed area; 12 to 18 in is the usual working
                 window and some lauter designs prefer narrower
too shallow      the bed does not filter; the runoff channels and turbidity and
                 efficiency both suffer
too deep         the bed compacts under its own head, the runoff slows, and it can
                 set completely
max grain        G_max = (area x max depth) x 7.48 / (R/4 + 0.08)
consequence      G_max caps the original gravity the brewhouse can reach at a given
                 batch size (`brewhouse-efficiency`)
```

A lauter tun is a filter and its bed is the filter medium, which is why depth rather than volume is the
controlled dimension. The grain husks form the matrix that clarifies the runoff, and that matrix needs enough
depth to work and not so much that its own weight closes it. A tun that is wide and shallow and a tun that is
narrow and deep can hold the same mash and lauter completely differently.

Diameter is the expensive dimension and depth is the cheap one, which is unfortunate because diameter is what
the brewery actually needs. Bed depth falls as the square of diameter for a fixed grist, so a modest increase
in tun width buys a large increase in the grain bill it can accept -- and it is also the dimension that cannot
be changed after the vessel is bought.

That is how a brewhouse discovers its maximum gravity. The batch size is fixed by the fermenters, the tun
diameter is fixed by what was installed, and between them they fix the largest grain bill that will lauter --
which fixes the strongest beer the brewery can make in one brew. Beyond that point the options are a partigyle,
a second mash, or sugar in the kettle, and all three are process changes rather than recipe changes.

**Inputs:** the tun diameter or bed area, the grain weight, the mash thickness, the grain displacement per pound, the maximum working bed depth, and the batch volume and brewhouse efficiency for the gravity limit

**Outputs:** the bed area, the mash volume in gallons and cubic feet, the grain bed depth, whether it falls in the working window, the maximum grain bill at the depth limit, the original gravity that grain bill would reach, and the bed depth in a tun of a different diameter

## 3. Worked example

A 6 ft diameter tun with the 542 lb grist at 1.25 qt per pound:

```
bed area    = pi x 6^2 / 4 = 28.27 sq ft
mash volume = 542 x (1.25/4 + 0.08) = 212.7 gal = 28.44 cu ft
bed depth   = 28.44 / 28.27 = 1.006 ft = 12.1 in
```

**12.1 in sits at the shallow end of the 12 to 18 in window** -- workable, and close enough to the floor that
a thinner mash or a smaller grist on this tun would start to channel.

**The depth limit is what caps the brewhouse:**

```
at 18 in:  volume = 28.27 x 18/12 = 42.41 cu ft = 317.3 gal
          G_max  = 317.3 / (1.25/4 + 0.08) = 808 lb
```

**808 lb of grain is everything this tun will lauter**, and at 310 gal and 78% efficiency that is:

```
OG = 808 x 37 x 0.78 / 310 = 75.3 points -> 1.075
```

**1.075 is the strongest beer this brewhouse makes in one mash.** Not a recipe decision, not an
efficiency decision -- **a vessel decision made when the tun was bought**, and the only ways past it are a
partigyle, a second mash into the same kettle, or kettle sugar.

**Diameter is the lever and it is quadratic.** Put the identical mash in an 8 ft tun:

```
area = 50.27 sq ft    depth = 6.8 in
```

**6.8 in instead of 12.1 -- a 33 percent wider tun nearly halves the bed depth**, because area goes as the
square of diameter. At the same 18 in limit that tun would accept
1437 lb of grain, **78 percent more than the 6 ft vessel.** The dimension that decides
a brewhouse's ceiling is the one that cannot be changed afterwards.

## 4. Scope and non-goals

A geometry and capacity screen. The working bed depth window is a practice range and the right value depends on the lauter design -- a false bottom, a rake-equipped lauter tun, and a mash filter all behave differently, and a mash filter is not depth-limited at all. Grain displacement is entered as a constant and varies with the grist and the crush. It does not model lautering: runoff rate, differential pressure across the bed, raking, channelling, and the point at which a bed sets depend on the crush, the husk content, the presence of adjuncts or rice hulls, the sparge rate, and the wort viscosity, and none of that is geometry. It does not compute efficiency (`brewhouse-efficiency`), the water volumes (`sparge-water-volume`), or the strike temperature (`mash-strike-water`), and it does not check the tun's total volume against the mash plus the sparge liquor standing above the bed, which is a separate freeboard question. It takes no position on partigyle, double mashing, or kettle sugar as routes past the limit. The vessel manufacturer's data, the brewery's own lauter records, and the brewer govern.
