# roughlogic.com Specification v1300 -- Slider-Crank Piston Position (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic), no new module or dependency. Inherits spec.md through spec-v1299.md.
>
> **The gap.** The engine bench has `mean-piston-speed` (average) and `dynamic-compression-ratio`, but nothing for
> the **instantaneous piston position** at a crank angle -- the slider-crank geometry an engine builder needs to
> degree a cam, set port timing, or check piston-to-valve clearance. Because the connecting rod swings, the piston is
> NOT at mid-stroke at 90 degrees; this tile gives the true position and shows how far the rod angularity shifts it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive stroke, a rod length not greater than the crank radius (stroke/2), or a crank angle outside 0-360
degrees returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the exact
slider-crank piston displacement `x = r + L - (r cos(theta) + sqrt(L^2 - r^2 sin^2(theta)))` (Machinery's Handbook;
standard kinematics), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `slider-crank-piston-position` -- Slider-Crank Piston Position from Crank Angle

```
r = stroke / 2                          crank radius
x = r + L - (r cos(theta) + sqrt(L^2 - r^2 sin^2(theta)))     piston distance below TDC
simple = r (1 - cos(theta))             pure-sinusoid position (infinite rod)
rod angularity shift = x - simple
```

At top dead center (theta 0) x = 0; at bottom dead center (theta 180) x = stroke. The connecting rod's swing makes
the piston move faster on the way down from TDC, so at 90 degrees it is already PAST mid-stroke -- the shorter the
rod (small rod/stroke ratio), the bigger the effect.

**Inputs:** stroke (in), connecting-rod length center-to-center (in), crank angle after TDC (deg).

**Outputs:** piston position below TDC (in), position as a percent of stroke, the rod-angularity shift from the
simple sinusoid (in), and the rod/stroke ratio.

## 3. Worked example

A small-block with a 3.48 in stroke and a 5.7 in rod, at 90 degrees after TDC:

```
r = 1.74,  L = 5.7,  rod/stroke = 1.64
x = 1.74 + 5.7 - (1.74 cos90 + sqrt(5.7^2 - 1.74^2 sin^2 90)) = 7.44 - 5.428 = 2.012 in below TDC
simple = 1.74 (1 - cos90) = 1.740 in
```

The piston is 2.012 in down -- 57.8% of the stroke, not 50% -- because the rod angularity pushes it 0.272 in past
where a pure sinusoid would put it. Degreeing a cam or checking valve clearance on the 1.74 in figure would be off
by more than a quarter inch.

## 4. Scope and non-goals

The exact piston displacement of a centered (non-offset) slider-crank; piston velocity and acceleration, a wrist-pin
offset, rod stretch, and the gas/inertia loads are separate. Feed the position into a deck-clearance or
piston-to-valve check. A design aid; Machinery's Handbook and the engine builder govern.
