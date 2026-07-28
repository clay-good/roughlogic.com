# roughlogic.com Specification v1156 -- Portable Ladder Setup Geometry (calc-cross.js, Group G, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`**
> (Group G), no new module, group, or dependency. Inherits spec.md through spec-v1155.md.
>
> **The gap.** `ladder-angle` computes the 4:1 setback and stops there; `extension-ladder-overlap` handles
> section overlap. Three other OSHA numbers decide whether a ladder is usable, and one of them has
> arithmetic nobody does.

Repository: github.com/clay-good/roughlogic.com -- US standards only. OSHA is public domain, so the
provisions are quoted.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
length, height, spacing, width, or ratio, or a negative extension, return `{ error }`. Renderer:
`_simpleRendererG`, this module's factory (**not** `_simpleRenderer`).
`check-module-sizes` cap for calc-cross.js raised 45000 -> 50000; Group G exact-count assertion 35 -> 36.

## 2. The tile

### 2.1 `portable-ladder-setup` -- Setup Geometry (OSHA 1926.1053)

```
inputs:  ladder_length_ft, landing_height_ft, extension_above_landing_ft,
         secured_with_grasping_device, rung_spacing_in, clear_width_in, base_ratio
compute: rail per foot of height = sqrt(1 + 1/ratio^2)
         rail needed = (landing height + 3 ft) x that factor
         highest landing served = ladder length / factor - 3 ft
         rungs 10 to 14 in;  clear width >= 11.5 in
outputs: required_extension_ft, extension_ok, extension_by_alternative,
         extension_shortfall_ft, base_setback_ft, rail_used_to_landing_ft,
         rail_used_total_ft, length_ok, length_short_ft, max_landing_served_ft,
         rung_ok, rung_too_close, width_ok, width_shortfall_in, passes, note
```

**A ladder never reaches its label.** The 3-ft extension is a rule everyone knows and almost nobody costs
out: it comes out of the *climbable* length, and so does the setback. At 4:1 every foot of height consumes
**1.0308 ft** of rail, so a **24-ft ladder needs 25.77 ft of rail to serve a 22-ft landing** and simply
does not reach. The highest landing it actually serves is **20.28 ft**. The fuzzer pins that this ceiling
depends only on the ladder and the ratio, not on the landing being attempted.

**The alternative is an alternative, not a waiver.** Where the 3 ft is impossible the ladder must be
secured at its top to a rigid support **and** a grasping device provided -- both. And the fuzzer pins that
it excuses the *extension*, not the *reach*: the rail budget still assumes the full 3 ft.

**Rung spacing is a window.** 10 to 14 in between centrelines -- too close fails as surely as too far,
because what the window protects is a climber's stride. The tile distinguishes the two failures.

## 3. Scope

Not checked: the 4:1 angle itself (`ladder-angle`); duty rating and load; base securing and footing; fixed
ladders and ladders on scaffolds; the stepladder top step; section overlap (`extension-ladder-overlap`),
which reduces usable length further still; electrical clearance and conductive rails near energized lines;
and inspection.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `ladder-angle`,
`extension-ladder-overlap` (which now links forward), `fall-arrest-anchorage`, and `roofing-squares`.
Fuzzer pins both fixtures, all four geometry identities across four landing heights, that the reachable
ceiling does not move with the attempt, the exact just-reaches boundary, that a shallower ratio reaches
higher, the extension alternative rescuing only when claimed and not extending the reach, both ends of the
rung window with the too-close case distinguished, the width seam, and every error seam. Five fixture and
prose values were corrected after the fuzzer caught them -- the geometry was computed in node rather than
by hand the second time.
