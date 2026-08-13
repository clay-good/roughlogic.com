# roughlogic.com Specification v1327 -- Windrow (Elongated) Stockpile Volume and Tonnage (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, construction/earthwork), no new module or dependency. Inherits spec.md through spec-v1326.md.
>
> **The gap.** `stockpile-volume` gives a free-standing **conical** pile dumped in one spot, but a pile dumped or
> graded **along a line** -- a compost windrow, a DOT salt/sand pile, an aggregate windrow -- is elongated. This adds
> the volume and tonnage of that elongated (windrow) stockpile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive width or density, a negative ridge length, or a repose angle outside 0-90 degrees returns
`{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the triangular-prism-plus-cone
stockpile geometry with the angle-of-repose relation (first-principles), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `windrow-stockpile-volume` -- Windrow (Elongated) Stockpile Volume and Tonnage

```
radius = width/2
height = radius x tan(repose x pi/180)
cross_section = 1/2 x width x height            (triangular)
volume = cross_section x ridge_length + (1/3) pi radius^2 height     (prism + one full cone at the ends)
volume_cy = volume/27,   tons = volume x density/2000
```

The pile is a triangular prism (the straight ridge run) with the two tapered ends together making one full cone. The
material rises to its natural angle of repose, so `height` follows from the width. Setting `ridge_length = 0`
collapses it to the conical `stockpile-volume` pile.

**Inputs:** base width (ft), ridge (straight run) length (ft), angle of repose (deg, default 37), loose bulk density
(pcf, default 100).

**Outputs:** volume (cy and ft^3), tonnage, and pile height.

## 3. Worked example

A 20 ft-wide aggregate windrow at a 37-degree repose, 50 ft of straight ridge, 100 pcf:

```
radius = 10;  height = 10 x tan(37) = 7.54 ft
cross_section = 1/2 x 20 x 7.54 = 75.4 ft^2
volume = 75.4 x 50 + (1/3) pi (10^2)(7.54) = 3,768 + 789 = 4,557 ft^3 = 169 cy = 228 tons
```

The windrow holds 169 cubic yards (228 tons). Drop the ridge to zero and it is the conical pile, 789 ft^3 (29 cy) --
the value the `stockpile-volume` tile returns for the same base and repose.

## 4. Scope and non-goals

An idealized elongated pile: clean repose slopes, a level base, a triangular cross-section (a sharp ridge, not a
bulldozed flat top). A pile dumped in one spot is the `stockpile-volume` tile; a trapezoidal (flat-topped) windrow, a
pile against a wall, and an irregular base are separate. A survey volume governs for payment.
