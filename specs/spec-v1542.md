# roughlogic.com Specification v1542 -- Rail Head Wear and Condemning Limit (`calc-rail.js`, Group E Carpentry and Construction, railroad track, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rail.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; railroad track and equipment), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Rail wears in two directions at once -- down on the head and sideways on the gauge face -- and it is condemned on whichever reaches its limit first. A gauge-face-worn rail on a curve fails long before a vertically worn rail on tangent, and combining the two is what a rail inspector's gauge is measuring.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive new head height, a measured wear exceeding the head height, or a negative gauge face wear returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the vertical and gauge-face wear criteria with 49 CFR 213 and the track owner instructions named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`rail wear limit`, `gauge face wear rail`, `vertical head wear condemning`, `rail replacement wear gauge`, `combined rail wear criterion`.

## 2. The tile

### 2.1 `rail-wear-condemning-limit` -- Rail Head Wear and Condemning Limit

```
vertical wear    loss of head height from the new-rail section
gauge face wear  loss measured at a defined depth below the top of rail
combined         many railroads condemn on vertical + (gauge face / 2) exceeding a limit
area loss        percent of the head section removed
consequence      gauge widening, wheel climb, and reduced beam strength
```

Vertical wear reduces the rail's section and its bending strength, and it lowers the running surface relative
to the joint bars and the fastenings. Gauge face wear is more consequential on curves: as the high rail's gauge
face wears back, the track gauge widens and the contact geometry between wheel flange and rail changes toward the
angle at which a flange can climb. That is why the combined criterion weights them together rather than treating
either alone.

The measurement is a comparison against the NEW rail section, not against a nominal dimension, so the rail's
original weight and section have to be known -- a 136 lb rail and a 115 lb rail have different head heights and
different limits. Wear rates also differ enormously between the high and low rail of a curve and between curves
and tangent, so a limit reached at one location says nothing about the next.

The field use is a go or no-go with a wear gauge in hand, plus the more useful planning output: at the measured
wear rate, how long until the limit, which is what turns rail replacement from a surprise into a program.

**Inputs:** rail weight and section, new head height, measured vertical wear, measured gauge face wear, the railroad wear limits, and optionally the tonnage since installation for a wear rate

**Outputs:** the vertical and gauge face wear, the combined wear against the entered limit, the percent of head area lost, a keep or condemn verdict, the remaining wear allowance, and the tonnage or time to the limit at a measured wear rate

## 3. Worked example

136 lb rail on the high rail of a curve, measured with a wear gauge: 6/16 in vertical wear and 8/16 in gauge
face wear, against a railroad limit of 12/16 in combined:

```
vertical                = 6/16  = 0.375 in
gauge face              = 8/16  = 0.500 in
combined (V + GF/2)     = 0.375 + 0.250 = 0.625 in = 10/16 in
limit                                    = 12/16 in = 0.750 in
remaining                                = 0.125 in = 2/16 in
```

Inside the limit, with 2/16 in left. Now the planning half: if this curve has worn 10/16 in over 180 MGT, the
wear rate is about 0.0035 in per MGT, and the remaining 0.125 in is roughly

```
0.125 / 0.0035 = 36 MGT
```

Thirty-six million gross tons before this rail is condemned -- on a route handling 30 MGT a year, a little over a
year. That is a budget line and a rail order, not an emergency, and it is visible only because the wear was
measured twice.

## 4. Scope and non-goals

A wear measurement comparison against limits the user supplies. Wear limits are railroad-specific and vary by
rail section, class of track, curvature, and traffic, and the combined-wear formula differs between railroads;
the governing limits are those in the track owner's engineering instructions. It does not evaluate the many other
conditions that condemn rail independently of wear: internal defects found by ultrasonic testing, surface defects
such as shelling, spalling, head checks and squats, corrugation, engine burns, batter at joints, bolt hole
cracks, and broken or defective welds -- most rail is removed for one of these rather than for wear. It does not
measure gauge, which is a separate track geometry parameter with its own FRA limits, and it does not assess the
rail's remaining bending strength or its suitability under a specific axle load. The FRA Track Safety Standards
at 49 CFR 213, the railroad's engineering instructions, and the track owner govern.
