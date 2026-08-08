# roughlogic.com Specification v1219 -- Worm and Worm-Wheel Geometry (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group K), no new module, group, or dependency. Inherits spec.md through spec-v1218.md.
>
> **The gap.** A family-completion tile: the Group K gear suite has six spur-gear tiles (spur-gear-geometry,
> gear-identification, gear-chordal-thickness, gear-undercut-backlash, gear-tooth-bending-stress,
> gear-dynamic-tooth-stress) but no worm-gear tile -- the right-angle, high-ratio, often self-locking pair. A
> spur-gear warning in calc-cross.js even points to it ("use a worm or multi-stage train"). No worm-gear tile existed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), or a non-positive axial pitch, worm starts, worm pitch diameter, or wheel tooth
count returns `{ error }`. Citation discipline (v19/v22): worm-gearing geometry as compiled in Machinery's Handbook /
AGMA, by name, `GOVERNANCE.general`. **No copyrighted table is reproduced** -- the relations are first-principles gear
geometry and the dimensions are the user's own.

## 2. The tile

### 2.1 `worm-gear-geometry` -- Worm and Worm-Wheel Geometry

```
lead            = axial_pitch x starts
lead_angle      = atan(lead / (pi x worm_pitch_dia))
gear_ratio      = wheel_teeth / worm_starts
wheel_pitch_dia = wheel_teeth x axial_pitch / pi
center_distance = (worm_pitch_dia + wheel_pitch_dia) / 2
self-locking    when the lead angle is small (below ~5 deg, friction dependent)
```

**Inputs:** worm axial pitch (in), worm starts (threads, 1-4), worm pitch diameter (in), worm-wheel teeth.

**Outputs:** lead, lead angle, gear ratio, wheel pitch diameter, center distance, self-locking flag.

## 3. Worked example

`axial_pitch_in = 0.5, worm_starts = 1, worm_pitch_dia_in = 2, wheel_teeth = 40`:

```
lead        = 0.5 x 1 = 0.5 in
lead angle  = atan(0.5 / (pi x 2)) = 4.55 deg   (self-locking)
ratio       = 40 / 1 = 40 : 1
wheel dia   = 40 x 0.5 / pi = 6.366 in
center dist = (2 + 6.366) / 2 = 4.183 in
```

A 4-start worm on the same wheel gives a 2.0 in lead, a 17.66 deg lead angle (back-drivable), and a 10:1 ratio.

## 4. Limitations

Geometry only. The load rating, efficiency, and heat depend on the material pair and lubrication and are not computed.
Self-locking below ~5 deg is a friction-dependent rule of thumb, not a guarantee (vibration can defeat it). A shop aid;
the gear drawing and the AGMA / Machinery's Handbook data govern.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1219` pins the lead, lead angle, ratio, wheel sizing, center distance, the
  self-locking flag (single-start vs multi-start), the start/diameter trends, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the single-start self-locking example and the
  4-start back-drivable cross-check).
- Formula checked against Machinery's Handbook worm-gearing relations.
