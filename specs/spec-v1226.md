# roughlogic.com Specification v1226 -- DP (Square-Root) Flow Transmitter 4-20 mA Scaling (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`**
> (Group A), no new module, group, or dependency. Inherits spec.md through spec-v1225.md.
>
> **The gap.** Self-declared: the `loop-signal-scaling` tile is linear and its note says "a square-root-extracted flow
> transmitter (differential-pressure flow) needs the sqrt of the fraction," and its catalog entry adds "a DP
> (square-root-extracted) flow transmitter is different." No DP-flow scaling tile existed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite signal, a zero span (flow_high == flow_low), or a low-flow cutoff outside [0, 100) returns `{ error }`.
Citation discipline (v19/v22): DP flow square-root extraction on a 4-20 mA loop (ISA / instrumentation practice; NAMUR
NE43), by name, `GOVERNANCE.general`. **No copyrighted table is reproduced** -- the primary element's discharge
coefficient is already in the transmitter's calibrated range; this is only the loop linearization.

## 2. The tile

### 2.1 `dp-flow-signal-scaling` -- DP (Square-Root) Flow Transmitter 4-20 mA Scaling

```
fraction     = (signal_ma - 4) / 16                    linear DP fraction of span
flow_percent = sqrt(fraction) x 100                    (0 if fraction <= 0 or below the cutoff)
flow_value   = flow_low + (flow_percent/100)(flow_high - flow_low)
```

**Inputs:** loop signal (mA), flow at 4 mA (usually 0), flow at 20 mA (full scale), low-flow cutoff (% of flow).

**Outputs:** flow percent (and the linear percent for comparison), flow value, NAMUR status.

## 3. Worked example

`signal_ma = 12, flow_low = 0, flow_high = 500, low_flow_cutoff_pct = 0`:

```
fraction = (12 - 4)/16 = 0.5
flow%    = sqrt(0.5) x 100 = 70.71%
value    = 0 + 0.7071 x 500 = 353.55 gpm   (the linear tile would read 250 gpm)
```

8 mA (25% of the signal) is exactly 50% of flow (250 gpm) -- a quarter of the signal is half the flow, the signature of a
DP flow loop.

## 4. Limitations

Loop linearization only: the flow element's discharge coefficient and beta ratio are in the transmitter's calibration. A
smart transmitter that does the square-root extraction internally outputs flow linearly -- use the linear loop-scaling
tile then. The low-flow cutoff rejects the near-zero square-root noise. The transmitter's range, damping, and the flow
element's calibration govern the real reading.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1226` pins flow% = sqrt((mA-4)/16), the vs-linear gap, the 8 mA -> 50% and endpoint
  cases, the concavity (sqrt reading exceeds linear), the low-flow cutoff, the flow_low offset, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the 12 mA example and the 8 mA cross-check).
- Formula checked against DP flow square-root-extraction instrumentation practice (ISA; NAMUR NE43).
