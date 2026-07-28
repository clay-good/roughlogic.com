# roughlogic.com Specification v1116 -- Roof Drip Edge Rake / Eave Split (calc-finish.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finish.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1115.md.
>
> **The gap, and why it was scoped narrowly.** Discovery batch 7 rated this PARTIAL rather than clear:
> `roofing-squares` already returns `drip_edge_lf` -- but it is a bare passthrough of the user's
> `perimeter_ft`, with no rake/eave split, no slope factor, and no piece count.
> `gutter-downspout-takeoff` covers eave length for gutter only. So the raw quantity exists and the tile
> is deliberately scoped to the part that does not: **the split, the slope factor, and the lap-adjusted
> piece count.** It does not re-emit squares, bundles, or underlayment.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: negative
lengths, no eave and no rake, a non-integer rake count, negative pitch or lap, a lap as long as a stick, or
waste outside 0-50% return `{ error }`. Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `drip-edge-takeoff` -- Roof Drip Edge Rake / Eave Split and Piece Count

```
inputs:  eave_length_ft (plan), rake_run_ft (ONE rake, plan), rake_count,
         pitch_rise_per_12, stock_length_ft (10), lap_in (2), waste_pct (10)
compute: slope_factor = sqrt(1 + (rise/12)^2)
         eave_lf      = eave_length                       horizontal, NO slope factor
         rake_lf      = rake_count x run x slope_factor    runs up the slope
         effective stick = stock - lap/12
         pieces = ceil(LF x (1 + waste) / effective), reported per type and total
outputs: slope_factor, eave_lf, rake_plan_lf, rake_lf, rake_slope_gain_lf, total_lf,
         total_with_waste_lf, effective_piece_ft, pieces, eave_pieces, rake_pieces, note
```

**The one fact the tile exists for.** Rakes run up the slope and eaves do not. A perimeter measurement
treats them alike and therefore under-orders every rake by the slope factor -- 12% at 6:12, 20% at 8:12. In
the pinned example four 14-ft rakes are **62.6 ft of metal against 56 ft of plan run**, 6.6 ft a single
perimeter number silently loses. The fuzzer pins that the eave never moves with pitch while the rake always
does.

**A second reason to split them, in the note.** The profiles differ and install opposite ways relative to
the underlayment -- eave drip goes UNDER so water leaving the shingles is carried past the fascia, rake
drip goes OVER -- and reversing either is a leak. They are also usually separate line items on an order.

**Worked example (pinned).** 80 ft of eave plus four 14-ft rakes at 6:12: slope factor 1.118034, rakes
62.61 ft, total 142.61 ft, 156.87 with waste, **16 sticks** at a 9.833-ft effective length after the 2-in
lap. Cross-check at 0 pitch: factor exactly 1, rakes equal their plan run, zero gain.

## 3. Scope limits

Drip edge at eaves and rakes only. Valley metal, step flashing at walls, and the starter course are
separate items, and hips and ridges carry no drip edge at all -- all stated in the note. The roofing plan
and the manufacturer's installation instructions govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `roofing-squares` and
`step-flashing-count`. Fuzzer pins the slope factor across five pitches with the eave held invariant, the
flat degenerate case, monotonic rake growth with pitch, the lap's effect on both effective length and piece
count, and the eave-only and rake-only configurations.
