# roughlogic.com Specification v1118 -- V-Belt Force-Deflection Tensioning (calc-mechanic.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K), no new module, group, or dependency. Inherits spec.md through spec-v1117.md.
>
> **The gap.** The catalog has three belt tiles and none of them tells you how to set the tension.
> `belt-pulley` gives length and speed, `vbelt-drive` sizes the sheaves and belt count, and
> `belt-hp-transmitted` computes power **from tensions you already know**. Nothing produces those
> tensions from something a tech can measure in the field. Aliases for "belt tension" route to the
> power tile. Discovery batch 7: CLEAR.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-positive
center distance or diameters, a small sheave larger than the large one, a center distance too small to
leave a straight span, a negative force, a missing or inverted recommended range, a new-belt factor outside
1.0-2.0, or a non-integer belt count return `{ error }`. Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `belt-deflection-tension` -- V-Belt Force-Deflection Tensioning

```
inputs:  center_distance_in, large_sheave_dia_in, small_sheave_dia_in, measured_force_lb,
         rec_min_force_lb, rec_max_force_lb, belt_condition (used|new), new_belt_factor (1.3),
         belt_count
compute: span t   = sqrt(C^2 - ((D - d)/2)^2)            external tangent, plane geometry
         deflect  = t / 64                               1/64 in per inch of span
         tension  = 16 x F                               see below
         target   = maker's range x (new ? factor : 1)
         wrap     = 180 - 2 asin((D - d)/(2C))  deg      on the small sheave
         load     = 2 T n sin(wrap/2)                    static side load into the shafts
outputs: span_in, deflection_in, deflection_64ths, static_tension_lb, target_min_force_lb,
         target_max_force_lb, target_tension_min_lb, target_tension_max_lb, wrap_angle_deg,
         shaft_load_lb, pct_of_min, under, over, status, note
```

**Why one deflection rule fits every drive.** A force at the midspan is resisted by the two half-spans
pulling back, so for a shallow deflection `F = 4 T x deflection / t`. Substitute the rule's own
`deflection = t/64` and the span cancels **completely**: `T = 16 F`. That is the entire reason a single
"1/64 inch per inch" instruction works on a 6-inch drive and a 60-inch drive alike, and it means the
measured force is not an index into a table -- it *is* the tension, times sixteen. The tile derives this
rather than looking it up.

**Two pinned examples.** Greenheck FA/127-11 states that a 32-inch span wants a 1/2-inch deflection; a
32-inch center on 12- and 4-inch sheaves spans 31.749 in, and 31.749/64 = 0.496 in reproduces it. The
tensioning literature's other stock pair -- "160 lb of belt tension and 10 lb of perpendicular force gives
a deflection of the span divided by 64" -- falls out of the equal-sheave case, where the span degenerates
to the center distance, wrap is exactly 180 degrees, and 16 x 10 = 160.

**What is NOT built in.** The recommended min/max force is proprietary manufacturer table data indexed by
belt section, small-sheave diameter, and speed. It is an **input**. The tile says so in the note and the
citation, and refuses to run without it. The 1.3 new-belt run-in allowance is the commonly published
figure across Carlisle, Gates, TB Wood's, and Bestorq, and is editable for the same reason.

**The message the outputs carry.** Over-tension is the failure mode techs do not expect, because it feels
like caution. Only the tight-slack *difference* transmits power, so extra tension adds no capacity -- it
adds shaft side load, and `bearing-l10-life` (linked) shows that life falls as the cube of it. The tile
reports that load in pounds next to the verdict so the cost is visible.

## 3. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `vbelt-drive`, `belt-hp-transmitted`,
`belt-pulley`, and `bearing-l10-life`. Fuzzer pins `T = 16F` across five center distances and four forces,
the equal-sheave 180-degree case, that the new-belt factor moves the target and never the measurement,
the four verdict seams at the exact range endpoints, linearity in belt count and force, monotonicity of
span and wrap in center distance, and every error seam. `check-module-sizes` cap for calc-mechanic.js
raised 66000 -> 72000.
