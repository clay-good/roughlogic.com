# roughlogic.com Specification v1364 -- Line Array Vertical Coverage and Splay (calc-stage.js, Group N, stage and live production, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`**
> (Group N, stage and live production), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group N has SPL at distance, atmospheric absorption, and amplifier power, but nothing that answers the first question of a line array design: from this trim height, what vertical angle has to be covered, and what average splay across the boxes does that take. The catalog has no array-geometry tile at all.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive trim height, throw distance, or box count, an ear height at or above the trim height, or a near throw greater than the far throw, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the line-array coverage geometry and the inverse-square level taper it has to compensate (standard live-sound practice), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `line-array-splay` -- Line Array Vertical Coverage and Splay

```
dh          = trim height - ear height
angle_near  = atan(dh / near throw)          (below horizontal)
angle_far   = atan(dh / far throw)
coverage    = angle_near - angle_far
avg splay   = coverage / number of boxes
level taper = 20 log10(far throw / near throw)
```

An array hung at a trim height has to cover the angle between the down-tilt to the first row and the down-tilt to
the last. That angle is fixed by geometry, not by the boxes, and it is the number the rig has to produce. Divide
it by the number of cabinets and you get the average splay -- the design starting point that a manufacturer's
prediction software then refines.

The level-taper line is why the splays are never actually equal. The last row is much farther than the first, so
it is much quieter by inverse square, and the array makes that up by aiming more of its energy at the far seats:
tight splays at the top of the array where the boxes throw long, opening up toward the bottom where the boxes
cover the near rows. The taper figure tells you how much level the splay pattern is being asked to recover.

**Inputs:** trim height (ft, to the top of the array), listener ear height (ft), near throw (ft), far throw (ft),
number of cabinets.

**Outputs:** down-tilt to the near and far rows (deg), total vertical coverage (deg), average splay per box (deg),
and the near-to-far level taper (dB).

## 3. Worked example

An array trimmed at 26 ft over a seated audience (ear height 4 ft), first row at 25 ft and last row at 150 ft,
twelve cabinets:

```
dh          = 26 - 4                = 22 ft
angle_near  = atan(22/25)           = 41.35 deg down
angle_far   = atan(22/150)          = 8.34 deg down
coverage    = 41.35 - 8.34          = 33.0 deg
avg splay   = 33.0 / 12             = 2.75 deg
level taper = 20 log10(150/25)      = 15.6 dB
```

Nearly 16 dB of taper across 33 degrees is a lot of asymmetry to build in: the top boxes will end up near the
array's minimum splay while the bottom ones open to five or six degrees. If the coverage were shallower -- a
higher trim, or a shorter room -- the same twelve boxes would splay more evenly.

## 4. Scope and non-goals

Geometry only. This tile does not predict SPL, frequency response, or the array's actual directivity, does not
model the curvature limits or minimum and maximum splay angles of any particular cabinet, and does not check the
rigging (the catalog's rigging tiles do that). Real designs are finished in the manufacturer's prediction software
against the manufacturer's measured data, and a flown array is an engineered lift. A planning aid; the loudspeaker
manufacturer, the rigging plot, and the venue govern.
