# roughlogic.com Specification v1037 -- Hydraulic Line Fluid Velocity (calc-mechanic.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-mechanic.js`** (Group K), no new module, group, or dependency. Inherits spec.md through
> spec-v1036.md.
>
> **The gap, and the evidence for it.** The hydraulics bench is power, flow, torque, and force --
> `hydraulic-pump-horsepower`, `hydraulic-pump-flow`, `hydraulic-drive-flow-limit`,
> `hydraulic-motor-torque-speed`, `hydraulic-cylinder` -- and none returns a velocity. `pipe-velocity` is
> the closest analogue but its ceiling table is potable copper/steel erosion-corrosion, a different
> criterion with different numbers. Discovery batch 4: "Build it; reuse the pattern, not the tile."
> **Alias caution honored:** "suction line velocity" already redirects to `refrigerant-velocity`, so this
> tile's aliases are all explicitly hydraulic.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: unknown line
type, non-positive flow or diameter, or a negative override return `{ error }`. Renderer: this module's
`_simpleRenderer`.

## 2. The tile

### 2.1 `hydraulic-line-velocity` -- Hydraulic Line Fluid Velocity and Minimum ID

```
inputs:  flow_gpm, inside_dia_in (true ID), line_type (pressure | return | suction),
         max_velocity_override_fps (0 = line-type default)
compute: A = pi/4 d^2
         V = (231 / (60 x 12)) x Q / A          the constant is DERIVED, = 0.3208333...
         ceiling = override, else the line-type band max
         min_dia = sqrt(4 x (K Q / ceiling) / pi)     smallest ID that meets the ceiling
         max_flow = ceiling x A / K                   most this line can carry
outputs: band_label, band_min_fps, band_max_fps, area_in2, velocity_fps, over, under,
         min_dia_in, max_flow_gpm, note
```

**The constant is derived, not recalled.** `231 / (60 * 12)` is written that way in the source: 231 cubic
inches per gallon, 60 seconds per minute, 12 inches per foot. Anyone reading the code can check it without
trusting a remembered 0.3208.

## 3. The disagreement, handled the same way as spec-v1029 and spec-v1032

Published velocity bands are conventions and they do not agree. One widely used set gives suction 2-4,
return 4-13, pressure 7-18 ft/s; another gives suction 2-4, return 10-15, medium pressure 15-20, and high
pressure 20-25. Both were web-verified 2026-07-27. The tile seeds the **more conservative** set by line
type, exposes the ceiling as an editable override, and names BOTH sets in the citation and the note, so a
user working to a manufacturer's or employer's standard can match it exactly rather than argue with the
tile. Only the suction band (2-4) is common to both sources, and the note explains why that one is the
strict one: too fast and the pump cavitates.

**Worked example (pinned).** 20 gpm through a 0.625-in ID pressure line: A = 0.30680 in^2, V = 20.92 ft/s
-- OVER the 18 ft/s ceiling -- minimum ID 0.674 in, and the line as built tops out at 17.2 gpm.

## 4. Scope limits

Velocity only. Pressure drop, heat rejection, and the hose's pressure rating are separate criteria, and the
hose manufacturer's data governs. Enter the true hose ID, not the dash size or the OD -- the field label and
note both say so.

## 5. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `hydraulic-pump-flow`. Fuzzer pins the
worked example, the derived constant against an independent 231/720 computation, the exact
velocity-area-flow round trip (feeding `min_dia_in` back in lands exactly on the ceiling; feeding
`max_flow_gpm` back in does too), all three band defaults, the override path, exact inverse-square scaling
in diameter, and error seams.
