# roughlogic.com Specification v1183 -- Ramp Cross Slope, Width, and Edge Protection (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 100 of the +100 campaign -- the target.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1182.md.
>
> **The gap is self-declared.** `ada-ramp-slope` lays out the running slope, the runs, and the landing
> count, and says in its own scope note that width and handrail details are governed elsewhere. These are
> the four rules on the same ramp that get built wrong after the layout is right.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown edge
protection, handrail, or direction flag, a non-positive slope ratio, width, landing dimension, or run
width, or a negative handrail intrusion return `{ error }`. Renderer: this module's `_simpleRenderer`.

**Source.** 2010 ADA Standards for Accessible Design, 405.3, 405.5, 405.7.2, 405.7.3, 405.7.4, and 405.9.
A US federal standard in the public domain, quoted directly.

## 2. The tile

### 2.1 `ramp-detail-check` -- Ramp Cross Slope, Width, and Edge Protection (405)

```
inputs:  cross_slope_ratio, clear_width_in, handrails, handrail_intrusion_in,
         landing_length_in, landing_width_in, run_width_in, changes_direction, edge_protection
compute: cross slope no steeper than 1:48
         effective width = clear width less the handrail intrusion, where rails are provided
         landing: 60 in long; as wide as the widest run, or 60 x 60 at a change in direction
         edge protection: extended floor or a curb or barrier -- a handrail is neither
outputs: cross_slope_ok, cross_slope_pct, effective_width_in, width_ok, width_deficit_in,
         handrails_cost_compliance, width_needed_between_rails_in, required_landing_length_in,
         required_landing_width_in, landing_length_ok, landing_width_ok, two deficits,
         landing_ok, turn_drives_width, edge_ok, passes, note
```

**The cross slope is flatter than drainage practice.** 1:48 is about 2%, so the ramp that sheds water
beautifully is the one that fails -- and it fails after the concrete is down.

**The handrails take the width.** Clear width is measured *between* the handrails, so the default example's
36-in ramp with rails taking 6 in leaves **30 in**: the ramp is wide enough and the rails are what fail it.
The tile names the fix -- a **42-in** slab -- and flags `handrails_cost_compliance` only when the run was
wide enough on its own, so an already-narrow ramp is not blamed on the rails.

**A change in direction drives the landing width.** 60 x 60 at a turn means that on a typical 36-in run the
*turn* rather than the run sets the width, and a switchback needs a wider footprint than anyone drew. The
fuzzer pins all five combinations of turning and run width.

**A handrail is not edge protection**, because the hazard is at the wheel and not at the hand. Both listed
forms -- the surface extended 12 in beyond the handrail, or a curb or barrier stopping a 4-in sphere within
4 in of the surface -- satisfy it, and nothing else does.

## 3. Scope

A ramp detail screen, not a ramp design. Not checked: the running slope, the number of runs, the 30 in
maximum rise per run, and total length, which are `ada-ramp-slope`; handrail height, grip, clearance, and
extensions, which are `handrail-geometry`; the surface, changes in level, and openings; doors opening onto
landings and the maneuvering clearance they need, which routinely conflicts with the 60 in landing;
drainage; curb ramps, which are section 406; and state and local accessibility law.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `ada-ramp-slope`, `handrail-geometry`,
`accessible-route-width`, and `floor-level-change`. The tools-data row sits inside the parsed Group E
block, which has no exact count assertion. Fuzzer pins both fixtures, the cross-slope seam with the percent
conversion, the between-handrails width at four combinations with the run width needed reported, the
intrusion ignored entirely without handrails, the cost-of-handrails flag firing only in its own case, all
five turning-landing combinations, landing length and width failing independently with exact deficits, both
forms of edge protection satisfying it and none failing, that every check fails independently, and every
error seam.
