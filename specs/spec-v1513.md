# roughlogic.com Specification v1513 -- Vibrating Screen Deck Capacity (`calc-mining.js`, Group E Carpentry and Construction, quarry and aggregate, 1 New Tile)

> **Status: LANDED 2026-09-05. Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mining.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mining, quarry, and drill-and-blast), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A vibrating screen is the usual bottleneck in an aggregate plant and the hardest thing to diagnose, because its capacity is a base rate multiplied by half a dozen correction factors that each look small. Multiply five factors of 0.9 to 1.25 together and the answer moves by more than a factor of two.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive screen area or base capacity, or any correction factor at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the multiplicative screen-capacity factor method as standard aggregate practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`screen deck capacity`, `vibrating screen sizing`, `screen area tph`, `screen efficiency factors`, `screen blinding capacity`.

## 2. The tile

### 2.1 `screen-deck-capacity` -- Vibrating Screen Deck Capacity

```
capacity   TPH = A x C x F x E x D x W x S ...
A          screen area (sq ft)
C          base capacity for the opening size (TPH per sq ft)
F          oversize factor -- feed coarser than the opening helps
E          halfsize factor -- fines pass easily and raise capacity
D          deck position factor (1.0 top, 0.9 second, 0.8 third)
W          wet screening factor; S          slope, open area, shape factors
```

Every factor in the chain is a departure from a reference condition, and the chain is multiplicative, so the
errors compound rather than average. The two that dominate are the halfsize and oversize factors: a feed with
lots of material smaller than half the opening screens far faster than the base rate, and a feed sitting right at
the opening size screens far slower. That is why a screen that is comfortable on one gradation blinds and floods
on another from the same pit.

For field use the important output is not the capacity number, it is the comparison against what the screen is
actually being fed. A deck running above its calculated capacity carries a bed too deep for particles to reach
the wire, and the symptom is oversize in the product with no mechanical fault anywhere -- the screen is working
correctly and is simply out of area. Knowing that stops a crew from chasing stroke, slope, and wire tension for a
problem none of them can fix.

**Inputs:** screen width and length, opening size and the base capacity for it, oversize and halfsize percentages in the feed, deck position, wet or dry screening, and the remaining correction factors

**Outputs:** the screen area, each correction factor and the combined multiplier, the calculated capacity in TPH, the actual feed rate against it as a percent of capacity, and the area required for a target tonnage

## 3. Worked example

An 8 by 20 ft deck (160 sq ft) with a base capacity of 3.5 TPH per sq ft for its opening:

```
oversize F           x 1.1
halfsize E           x 1.15
deck position D      x 0.9
wet screening        x 1.25
efficiency           x 0.95
combined multiplier      = 1.352
capacity = 160 x 3.5 x 1.352 = 757 TPH
```

757 TPH. If the plant is feeding this deck 400 TPH it is at 53% of capacity and the oversize in
the product is an area problem, not a wire problem.

Watch how the factors compound. Drop the halfsize factor from 1.15 to 0.80 -- a feed with far fewer fines,
which is what happens when the crusher upstream is set tighter -- and capacity falls to
527 TPH, a
30% loss from one factor. The screen did not
change; the feed did.

## 4. Scope and non-goals

A capacity estimate using the multiplicative factor method. The base capacity and every factor come from the
screen manufacturer's published tables and differ between manufacturers and between media types; this tile does
not ship them and results are only as good as the values entered. It does not size the drive, select stroke,
speed, or slope, choose screen media, or evaluate blinding and pegging, which are material-property problems
(clay, moisture, flaky particles, near-size material) that no capacity formula predicts. It does not compute
screening efficiency or the recirculating load in a closed circuit, both of which change the tonnage the deck
actually sees. Structural capacity and the deck's rated load are separate limits. The screen manufacturer's
selection data and the plant designer govern.
