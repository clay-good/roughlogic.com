# roughlogic.com Specification v1117 -- Valley Flashing Takeoff (calc-finish.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finish.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1116.md.
>
> **The gap, and the evidence for it.** `step-flashing-count` is roof-to-WALL sidewall flashing;
> `ice-barrier-coverage` does eaves and its own note calls valley coverage "a separate manual add";
> `hip-valley-rafter` gives the framing length but no metal, pieces, or area. Aliases for "valley" all
> route to the framing tile. Discovery batch 7: CLEAR.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-positive
run / pitch / width / stock, a valley count below 1 or non-integer, a lap as long as a stick, or waste
outside 0-50% return `{ error }`. Renderer: this module's `_simpleRenderer`.

**A deliberate non-import.** The valley multiplier is the same geometry `computeHipValleyRafter` uses, but
`calc-finish.js` does not import from `calc-construction.js` and this tile does not introduce that runtime
coupling -- the one-line multiplier is computed inline. Instead the **bounds fuzzer imports both** and pins
that they agree exactly at six pitches. Equivalence is proven without a dependency.

## 2. The tile

### 2.1 `valley-flashing-takeoff` -- Valley Flashing Takeoff (Metal, Pieces, Ice Barrier)

```
inputs:  valley_run_ft (plan run of ONE valley), valley_count, pitch_rise_per_12,
         metal_width_in (24), stock_length_ft (10), lap_in (6), waste_pct (10)
compute: valley_multiplier = sqrt(pitch^2 + 288)/12      the 17-inch rule
         common_multiplier = sqrt(pitch^2 + 144)/12      shown for contrast
         valley_length = run x valley_multiplier;  total = count x length
         pieces = ceil(total x (1 + waste) / (stock - lap/12))
         metal_area = total x width/12;  ice-barrier allowance mirrors it
outputs: valley_multiplier, common_multiplier, valley_length_ft, total_valley_lf,
         total_with_waste_lf, effective_piece_ft, pieces, metal_area_sf, ice_barrier_sf, note
```

**The geometry, and why 288.** A valley travels diagonally in plan AND rises at the same time, so the
radical carries two 12s squared where a common rafter carries one. That makes it the longest run on the
roof for its plan dimension: at 6:12 a 12-ft plan run is **exactly 18 ft** of valley (the multiplier is
exactly 1.5, since sqrt(324) = 18) against 13.42 ft of common rafter. Ordering valley metal off the plan
dimension comes up badly short.

**The geometric floor.** As pitch approaches zero the multiplier approaches sqrt(288)/12 = **sqrt(2)** --
the plan diagonal of a square corner, which a valley can never go below. The cross-check fixture and the
fuzzer both pin that limit.

**Worked example (pinned).** Two valleys, 12-ft runs, 6:12, 24-in metal, 6-in lap, 10% waste: 36 ft total,
39.6 with waste, **5 pieces** at a 9.5-ft effective length, 72 sq ft of metal.

## 3. Scope limits, in the note

OPEN (exposed-metal) valley assumed -- a closed-cut or woven valley uses shingles and this does not apply,
and hips take no valley metal. The generous lap is called out with its reason: a valley concentrates two
planes' water into one channel, so a short lap there is the leak that finds it, and the metal runs from the
eave UP. Valley ice barrier is reported as an allowance at the metal width precisely because the eave
ice-barrier tile excludes it. The roofing plan and manufacturer instructions govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `hip-valley-rafter`,
`step-flashing-count`, and `drip-edge-takeoff`. Fuzzer pins the exact 1.5 multiplier at 6:12, agreement
with the framing sibling at six pitches, that a valley always exceeds the common rafter, the sqrt(2) floor,
monotonicity in pitch, linearity in run/count/width, and the error seams.
