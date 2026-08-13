# roughlogic.com Specification v1306 -- Projectile Range and Height (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic/fire/agriculture), no new module or dependency. Inherits spec.md through spec-v1305.md.
>
> **The gap.** The catalog has `fire-stream-reaction` (the nozzle reaction force) but nothing for the **trajectory**
> a stream, spray, or thrown object actually follows -- the reach of a fire hose or monitor, the throw of an
> irrigation sprinkler, the landing point of material off a conveyor. This adds the classic projectile range, height,
> and flight time from launch speed and angle.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive launch speed, or a launch angle outside 0-90 degrees returns `{ error }`; no numeric field is ever
`Infinity`. Citation discipline (v19/v22): the level-ground projectile relations `R = v^2 sin(2 theta)/g`,
`H = v^2 sin^2(theta)/(2g)`, `t = 2 v sin(theta)/g` (standard kinematics), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `projectile-range` -- Projectile Range, Height, and Flight Time

```
R = v^2 sin(2 theta) / g               horizontal range on level ground
H = v^2 sin^2(theta) / (2g)            maximum height
t = 2 v sin(theta) / g                 time of flight (g = 32.174 ft/s^2)
```

`v` is the launch speed and `theta` the launch angle above horizontal. The range peaks at 45 degrees; any two
complementary angles (say 30 and 60 degrees) give the same range but different heights and hang times. Air
resistance is neglected, so a real water stream or light object falls short of these numbers -- they are the
still-air upper bound.

**Inputs:** launch speed v (ft/s), launch angle theta (deg).

**Outputs:** horizontal range (ft), maximum height (ft), and time of flight (s).

## 3. Worked example

A fire-hose stream leaving the nozzle at 80 ft/s at 45 degrees:

```
R = 80^2 sin(90) / 32.174 = 198.9 ft
H = 80^2 sin^2(45) / (2 x 32.174) = 49.7 ft,  t = 2 x 80 sin(45) / 32.174 = 3.52 s
```

The stream reaches about 199 ft out and 50 ft up in still air. Drop the angle to 30 degrees and the range falls to
172 ft with a lower 25 ft arc; raise it to 60 degrees for the same 172 ft range but a 75 ft arc and a longer hang --
the trade a nozzle operator or a sprinkler layout makes between reach, height, and coverage.

## 4. Scope and non-goals

The still-air, level-ground trajectory of a point projectile; air resistance (which shortens a real water stream or
light object substantially), a launch height above the landing plane, wind, and stream break-up are separate. Use it
for reach and clearance estimates, not for a ballistic or aerodynamic calculation. A planning estimate; field
conditions govern.
