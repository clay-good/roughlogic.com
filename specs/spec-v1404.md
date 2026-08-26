# roughlogic.com Specification v1404 -- Tube Bend Wall Thinning, Bend Ratio, and Arc Length (calc-fab.js, Group E, welding and fabrication, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fab.js`**
> (Group E, welding and fabrication), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog has minimum plate bend radius and cable bend radius but nothing for bending tube or pipe, where the governing failure is wall thinning on the outside of the bend. Thinning is a simple geometric consequence of the centerline radius and the tube diameter, and it is what decides whether a bend needs a mandrel and whether the bent tube still meets its pressure rating.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive tube diameter, wall thickness, centerline radius, or bend angle, or a centerline radius at or below half the tube diameter returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the neutral-axis wall-thinning relation for tube bending and the bend-ratio (R/D) and D/t conventions that govern mandrel selection, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `tube-bend-wall-thinning` -- Tube Bend Wall Thinning, Bend Ratio, and Arc Length

```
bend ratio  = centerline radius / outside diameter        "R/D", quoted as 1.5D, 2D, 3D
D/t ratio   = outside diameter / wall thickness
outside wall after bending = original wall x CLR / (CLR + OD/2)
thinning percent           = 1 - CLR / (CLR + OD/2)
arc length  = CLR x bend angle in radians
```

Bending a tube stretches the outside of the bend and compresses the inside. Taking the neutral axis at the
centerline, the outer fiber is stretched in proportion to how far it sits outside that centerline, and the wall
thins by the same proportion -- so thinning depends only on the ratio of the bend radius to the tube radius, not
on the material and not on the bend angle.

Two ratios do the work. **R/D** is how tight the bend is: at 3D the thinning is modest, at 1.5D it is severe, and
below about 2D on thin wall a mandrel and a wiper die are needed to keep the tube from collapsing or wrinkling on
the inside. **D/t** is how thin the tube is relative to its diameter: a high D/t tube is a thin shell and it
buckles rather than bends. Together they are the two axes of every tube-bending capability chart.

The consequence that matters downstream is pressure rating. A pressure calculation done on the nominal wall is
wrong for a bent tube -- the thinned outer wall is the governing section, and on a tight bend it can be a quarter
thinner than what was purchased.

**Inputs:** tube outside diameter, wall thickness, centerline bend radius (or the bend ratio), bend angle.

**Outputs:** bend ratio, D/t ratio, wall thickness at the outside of the bend, thinning percentage, arc length of
the bend, and a mandrel advisory.

## 3. Worked example

A 2.0 in OD tube with a 0.120 in wall, bent 90 degrees on a 3.0 in centerline radius:

```
bend ratio = 3.0 / 2.0                  = 1.5D  (tight)
D/t        = 2.0 / 0.120                = 16.7
wall after = 0.120 x 3.0 / (3.0 + 1.0)  = 0.090 in
thinning   = 25%
arc length = 3.0 x (pi/2)               = 4.71 in
```

A quarter of the wall gone. Open the bend to a 6.0 in radius (3D) and the same tube thins only to 0.1029 in, 14.3%
-- nearly half the thinning, for a bend that takes twice the space. That is the trade on every tube-bending job,
and it is why 3D is the default when the package allows it and 1.5D is a decision, not a habit.

## 4. Scope and non-goals

A geometric first approximation. Real thinning depends on the bending method (rotary draw, compression, roll,
press), on whether a mandrel and wiper are used, on the material's strain behavior, and on the die and pressure-die
setup, and measured thinning on a well-supported rotary-draw bend is usually less than this neutral-axis
prediction while a poorly supported one can be worse. The tile does not predict ovality or wrinkling, which
frequently govern before thinning does, does not select mandrel type or ball count, does not compute springback,
and does not evaluate the bent section against a pressure or structural code -- ASME B31 piping codes have their
own bending and thinning requirements and minimum wall provisions. The bender manufacturer, the applicable piping
code, and a test bend govern.
