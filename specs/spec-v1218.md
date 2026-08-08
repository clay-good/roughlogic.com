# roughlogic.com Specification v1218 -- Swept-Path Width (Turn Lane Occupancy) (calc-trucking.js, Group J, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`** (Group J),
> no new module, group, or dependency. Inherits spec.md through spec-v1217.md.
>
> **The gap, and the evidence for it.** `computeTruckOffTracking` note: "the trailer swept-path width (add the vehicle
> width) are separate," and the `truck-off-tracking` catalog entry repeats "swept-path width are separate." No tile
> computed it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive R/L1/width, a negative L2/swing-out, or a turn radius not exceeding
the effective wheelbase returns `{ error }`. Citation discipline (v19/v22): the AASHTO Green Book swept-path relation, by
name, `GOVERNANCE.trucking`. **No copyrighted table is reproduced** -- the geometric relation is public and the design
vehicle's dimensions are the user's own inputs.

## 2. The tile

### 2.1 `truck-swept-path-width` -- Swept-Path Width (Turn Lane Occupancy)

```
OT  = R - sqrt(R^2 - sum(L_i^2))          low-speed off-tracking (same as truck-off-tracking)
SPW = vehicle_width + OT + front_swingout
```

**Inputs:** turn radius R, tractor wheelbase, trailer kingpin-to-axle (0 if single unit), vehicle width (default 8.5
ft), and optional front swing-out (default 0, from the turning template).

**Outputs:** `swept_path_width_ft`, `off_tracking_ft`, `effective_wheelbase_ft`.

## 3. Worked example

`turn_radius_ft = 50, wheelbase1_ft = 20, wheelbase2_ft = 40, vehicle_width_ft = 8.5`:

```
OT  = 50 - sqrt(2500 - (400 + 1600)) = 50 - sqrt(500) = 27.639 ft
SPW = 8.5 + 27.639 = 36.139 ft
```

A single unit (wheelbase 20, no trailer) on the same turn sweeps only 8.5 + 4.174 = 12.674 ft -- why a long combination
governs the turn-lane width.

## 4. Limitations

Steady-state low-speed value. The front swing-out (outer front corner reaching outboard of the front wheel path) is
added only when entered, from the design vehicle's turning template. High-speed off-tracking (the rear swinging outward
at speed) is a separate analysis. A design aid; the design vehicle and the roadway agency govern.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1218` pins SPW = W + OT (+ swing-out), the off-tracking identity with the
  truck-off-tracking tile, the width/combination monotonicity, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the tractor-trailer example and the single-unit
  cross-check).
- Formula checked against the AASHTO Green Book (swept path = off-tracking + vehicle width).
