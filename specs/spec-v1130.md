# roughlogic.com Specification v1130 -- Guard Post Load and Base Connection (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1129.md.
>
> **The gap, self-declared.** `guard-handrail-check` does the dimensions and ends: *"the assembly must
> also carry a 200 lb load and the AHJ..."* -- naming the load check and not doing it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
height, spacing, concentrated load, post dimension, or lever arm, or a negative uniform load or allowable
stress return `{ error }`. Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `guard-post-load` -- Guard Post Load and Base Connection

```
inputs:  post_height_in, post_spacing_ft, concentrated_lb (200), uniform_plf (50),
         post_b_in, post_d_in (ACTUAL), allowable_fb_psi (0 = skip), connection_lever_in
compute: uniform at post = 50 x spacing;  governing = max(200, that)   NOT concurrent
         moment = governing x height
         S = b d^2 / 6;  required Fb = moment / S
         connection couple = moment / lever arm;  multiplier = height / lever arm
outputs: uniform_at_post_lb, governing_load_lb, concentrated_governs, moment_inlb,
         moment_ftlb, section_modulus_in3, required_fb_psi, post_ok, post_utilization,
         connection_force_lb, force_multiplier, note
```

**The 200 lb is not automatically the governing load.** The 50 plf uniform case delivers `50 x spacing`
to each post, so the crossover sits at exactly **4 ft**. At the common 6-ft spacing it is **300 lb**, half
again the number most people design to. The fuzzer pins both sides of that seam and the tie at 4 ft.

**The post is almost never what fails.** 300 lb at 36 in is 10,800 in-lb, which a 3.5 x 3.5 post carries
at about 1,511 psi. The base connection has to resolve *the same moment* across maybe 4 in of fastener
spacing -- **2,700 lb per side, nine times the applied load**. The lever arm collapsed from 36 in to 4 in
and multiplied the force by exactly that ratio. That is why residential deck guards fail at the rim joist
rather than at the post, why lag screws into rim end grain are not an acceptable detail, and why tested
details use through-bolts with washers plus blocking or a proprietary hold-down.

The fuzzer pins `multiplier = height / lever` across 48 height/lever/spacing combinations, and that the
connection force is never *less* than the applied load -- the tile's whole message, stated as an invariant.

**The commercial case is worse.** The cross-check fixture runs a 42-in guard at 8-ft spacing: 400 lb,
16,800 in-lb, and **4,200 lb** per side at a 10.5x multiplier. Raising the guard and widening the spacing
both attack the connection.

## 3. What is an input, and what is not checked

The allowable bending stress is an **input** -- it depends on species, grade, and the NDS adjustment
factors, none of which are shipped. Notching a post to clear a rim removes section exactly where the
moment peaks, so the note says to enter the notched dimensions.

One post, one direction, bending only. The code applies the load in **any** direction, so the modeled case
may not be the worst. Not checked: post shear and bearing, fastener withdrawal and shear, rim or blocking
tension, the load path into the framing and diaphragm, deflection, fatigue. The separate 50 lb load on
intermediate rails, balusters, and infill (IBC 1607.8.1.1 / 1607.8.1.2) is named but not checked.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `guard-handrail-check`,
`baluster-picket-count`, `deck-board-takeoff`, and `wood-beam-bending`. Fuzzer pins both fixtures, the
4-ft crossover including the tie, the lever-arm identity across 48 combinations, the connection-force
invariant, the depth-squared and width-linear scaling of required stress, that omitting the allowable
yields `null` rather than a verdict, that the allowable never touches the geometry, and every error seam.
A dead `for` loop left in the test during drafting was removed.
