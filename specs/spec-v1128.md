# roughlogic.com Specification v1128 -- Ballnose Feed-Direction Cusp (calc-machining.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-machining.js`** (Group K), no new module, group, or dependency. Inherits spec.md through
> spec-v1127.md.
>
> **The gap, self-declared.** `ballnose-scallop-height`'s note: *"the cusp along the feed direction is the
> separate turning-surface-finish geometry."* It is not the turning geometry -- it is the *same ballnose*
> geometry rotated ninety degrees, and nothing computed it. Found by running the self-declared-gap grep
> over **`citations.js` edition notes** rather than over tile descriptions, which is a richer seam.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
radius, stepover, or feed, a spacing past the cutter diameter, a negative speed, or a non-integer flute
count return `{ error }`. Hand-written renderer, matching this module's convention.

## 2. The tile

### 2.1 `ballnose-feed-cusp` -- Ballnose Feed-Direction Cusp and the Governing Finish

```
inputs:  r_in, stepover_in, feed_per_tooth_in, rpm, flutes
compute: cusp(w) = R - sqrt(R^2 - (w/2)^2)
           across the passes: w = stepover   -> DELEGATED to ballnose-scallop-height
           along the feed:    w = feed/tooth
         governing = max of the two;  they are equal when feed per tooth = stepover
         near the bottom both reduce to w^2 / (8R)
         feedrate = feed/tooth x flutes x rpm
outputs: feed_cusp_in, stepover_cusp_in, governing_cusp_in, feed_governs, governed_by, ratio,
         balanced_feed_in, balanced_stepover_in, feedrate_ipm, approx_feed_cusp_in,
         approx_stepover_cusp_in, note
```

**Only the larger cusp shows up on the part.** That is the reason to compute both together. A machinist
who halves the stepover while leaving a coarse feed has spent cycle time on the cusp that was not
governing, and the reverse mistake is just as common.

**The worked example is lopsided on purpose.** A 1/2-in ballnose at 0.030-in stepover and 0.006-in per
tooth leaves 0.00045041 in across the passes against 0.000018001 in along the feed -- a factor of **25**.
The finish there is entirely a stepover question.

**The balance point is simple.** The two cusps are equal exactly when the feed per tooth equals the
stepover, because the geometry is identical in both directions. The cross-check fixture flips the settings
so the feed governs, and the ratio comes out **4.0004** for a doubled spacing -- the square law, visible.

**A caution stated rather than implied.** When the stepover governs, the feed has *geometric* headroom.
Geometric headroom is not permission: chip load, tool strength, deflection, and the machine's ability to
hold the path at speed are what actually cap the feed and usually bind first. All the tile is entitled to
say is that **finish** is not the reason to keep the feed low, and that is what it says.

## 3. Scope

Theoretical geometric cusps on a flat surface cut at the tool tip. A sloped surface changes both the
effective stepover and the effective cutting radius, and a ballnose at its tip is cutting at zero surface
speed -- its own finish problem. Tool deflection, runout, and servo behavior at direction changes all add
to the real finish. Neither cusp converts to Ra: Ra is an averaged roughness, these are peak-to-valley
geometry.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `ballnose-scallop-height` (which now
links forward), `turning-surface-finish`, `radial-chip-thinning`, and `material-removal-rate`. Fuzzer pins
both fixtures, exact agreement of the delegated stepover cusp across sixteen radius/stepover combinations
**and** that swapping the roles of the two spacings swaps the answers -- proving one shared geometry. It
also pins across twenty spacing pairs that the governing cusp is the max, that the flag agrees, that the
larger spacing always wins, that both cusps stay positive and under the radius, and that the `w^2/(8R)`
form is within 2% and always under-predicts. Plus the exact balance point, the square law, monotonic
reduction with a bigger ball, that speed never touches the geometry, and every error seam.
