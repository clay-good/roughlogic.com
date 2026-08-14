# roughlogic.com Specification v1335 -- Inclined Plane Push and Hold Force (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, machine elements / mechanisms), no new module or dependency. Inherits spec.md through spec-v1334.md.
>
> **The gap.** The mechanical-advantage bench has the pulley, the rope, the chain hoist, and now the toggle, but not
> the INCLINED PLANE -- the simple machine behind skidding a crate up a loading ramp, sizing a winch pull for a ramp,
> or checking whether a parked load will slide.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive weight, an incline angle outside 0-90 degrees, or a negative friction coefficient returns `{ error }`;
no numeric field is ever `Infinity`. Citation discipline (v19/v22): inclined-plane statics with dry friction and the
angle of repose (standard mechanics; Machinery's Handbook), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `inclined-plane-force` -- Inclined Plane Push and Hold Force

```
F_up   = W (sin theta + mu cos theta)     (push up at steady speed)
normal = W cos theta
net down-slope pull = W (sin theta - mu cos theta)   (> 0 -> slides on its own)
ideal MA = 1 / sin theta = ramp length / rise
self-slide threshold = angle of repose = atan(mu)
```

Along the incline, the push-up force is the weight's own down-slope component `W sin theta` plus dry friction `mu`
times the normal `W cos theta`. The ideal frictionless advantage `1/sin theta` equals the ramp length over its rise,
so a longer, shallower ramp trades travel for force. Whether the load holds by itself is set by the angle of repose
`atan(mu)`: below it the load is self-locking (a push is needed to send it DOWN); above it the load slides and must be
restrained.

**Inputs:** load weight W (lb), incline angle theta (deg), friction coefficient mu.

**Outputs:** force to push up (lb) with the actual vs ideal advantage, the holding/restraint force with the
self-slide verdict, and the normal force.

## 3. Worked example

`W = 1,000 lb`, `theta = 20 deg`, `mu = 0.3`:

```
F_up   = 1000 (sin20 + 0.3 cos20) = 1000 (0.342 + 0.282) = 623.9 lb   (actual advantage 1.60)
normal = 1000 cos20 = 939.7 lb
ideal MA = 1/sin20 = 2.92
repose = atan(0.3) = 16.7 deg  ->  20 deg > 16.7 deg, so it slides; needs 1000(sin20 - 0.3 cos20) = 60.1 lb to hold
```

Frictionless check: with `mu = 0` on a 30-degree ramp the push-up force is `W sin30 = 500 lb` and the ideal MA is
`1/sin30 = 2`.

## 4. Scope and non-goals

A rigid load under uniform dry friction, force applied parallel to the incline. Rolling resistance, tackle reeving
(the pulley and rope MA tiles), tipping, and the higher static/starting friction are separate. A planning aid; the
rigging plan and a competent person govern.
