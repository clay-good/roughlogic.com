# roughlogic.com Specification v1980 -- Concentric Conduit Bend Radii and Lengths (`calc-fab.js`, Group A Electrical, 1 New Tile)

> **Status: PROPOSED 2026-10-19. Single-tile spec.** Part of [scope-product-expansion](scope-product-expansion.md). In scope under the
> spec-v106 trades-only charter: Group A, the conduit-bending bench in `calc-fab.js`, no new dependency and no
> network call. Companion to `conduit-segment-bend` ([spec-v1979](spec-v1979.md)).
>
> **The gap.** A rack of parallel conduits turning the same corner is bent concentrically: each conduit on its own
> radius, each radius one conduit outside the last, so the rack stays flat and evenly spaced through the turn. The
> radius, developed length and extra material per conduit are arithmetic the segment-bend tile stops one step short
> of.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds fuzzer, worked-example registry and the v18/v21 contract apply: a non-positive
inside radius or outside diameter, a negative gap, an angle outside (0, 180], or fewer than 2 or more than 12 conduits
returns `{ error }`. Citation: circular-arc geometry, first principles, with the outside diameter taken from the
raceway's listing or NEC 2023 Chapter 9 Table 4 (entered, not reproduced), GOVERNANCE.general. Aliases: `concentric
bends conduit`, `parallel conduit bend radius`, `bending a rack of conduits around a corner`, `concentric 90 radius
each conduit`, `extra length for outer conduit in a concentric bend`.

## 2. The tile

### 2.1 `conduit-concentric-bend` -- Concentric Conduit Bend Radii and Lengths

```
pitch           p = OD + gap, the centerline-to-centerline spacing of the rack
radius i        R_i = R_1 + (i - 1) x p, i = 1 the inside conduit
developed       DL_i = R_i x theta x pi / 180
extra length    DL_i - DL_1: what the outer conduit needs beyond the inner one
shot layout     with the same number of shots n on every conduit, each conduit's mark
                spacing is DL_i / n; the shots line up on radial lines, which is what
                keeps the rack flat (conduit-segment-bend lays out any one of them)
tangent         the straight runs into and out of the bend are the same length for every
                conduit; only the arc differs
```

Concentric bending works because all the conduits share one center. Each conduit's radius is the inside conduit's
plus one pitch per position, and the developed length grows with the radius, so the outer conduit in a four-conduit
rack of 1 in EMT at a 12 in inside radius needs about 8 in more through a 90 than the inner one. Cut all four to the
same length and the outer ones come up short at the far end.

The usual field method is to bend every conduit with the same number of shots and the same degrees per shot, spacing
the marks by each conduit's own DL / n. The shots then fall on the same radial lines and the rack reads as one sweep.
The tile reports each conduit's radius, developed length and extra length so the reader can mark all of them from one
table.

**Inputs:** the inside conduit's centerline radius, the conduit outside diameter, the gap between conduits, the bend
angle, and the number of conduits

**Outputs:** per conduit the radius, developed length, mark spacing at the chosen shot count, and extra length over the
inside conduit; the rack's total width through the bend

## 3. Worked example

Four 1 in EMT (OD 1.163 in) at a 0.5 in gap, inside radius 12 in, 90 degree bend:

```
pitch      = 1.163 + 0.5 = 1.663 in
conduit 1  R = 12.000 in   DL = 18.85 in   extra 0
conduit 2  R = 13.663 in   DL = 21.46 in   extra 2.61 in
conduit 3  R = 15.326 in   DL = 24.07 in   extra 5.22 in
conduit 4  R = 16.989 in   DL = 26.69 in   extra 7.84 in
rack width = 3 x 1.663 + 1.163 = 6.15 in through the bend
```

**At nine shots the mark spacings are 2.09, 2.38, 2.67 and 2.97 in**, and the outermost conduit needs 7.84 in more
stock than the innermost for this one corner.

## 4. Scope and non-goals

A layout aid. It does not account for bender take-up or springback, check the inside radius against NEC Chapter 9
Table 2 (enter it on `conduit-segment-bend`), handle a rack that changes pitch, model offsets or saddles in a rack
(each is its own tile for one conduit), or size the rack supports. The raceway listing and the NEC as adopted govern;
free at nfpa.org/freeaccess.
