# roughlogic.com Specification v1210 -- Column Alignment-Chart Stiffness Ratio G from Member Sizes (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steel.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1209.md.
>
> **The gap, and the evidence for it.** The `steel-effective-length-k` tile (spec-v315) takes the joint stiffness ratios
> `ga`/`gb` as required inputs and validates them, and its own note names the gap: "enter G (or 10 pinned / 1 fixed) --
> it does not compute G from member sizes." No tile computed G. This is the same needed-input pattern as spec-v1207/1208
> combined with the explicit sibling-gap of spec-v1209.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), an unknown far-end condition, a member with an I but no length, or a joint with no
columns or no girders returns `{ error }`. Citation discipline (v19/v22): the alignment-chart stiffness ratio and the
girder far-end modifiers as compiled in AISC 360 Commentary Appendix 7 / Salmon & Johnson, by name, `GOVERNANCE.general`.
**No copyrighted table is reproduced** -- the stiffness ratio is closed-form and the member I and L are the user's data.

## 2. The tile

### 2.1 `steel-column-stiffness-ratio-g` -- Column Alignment-Chart Stiffness Ratio G (from member EI/L)

```
G = sum(EI/L)_columns / sum(EI/L)_girders             E cancels (same steel), so:
G = sum(I/L)_columns / (m * sum(I/L)_girders)
m = girder far-end modifier:
    rigid both ends                     1.0
    braced (inhibited),  far pinned     1.5
    braced (inhibited),  far fixed      2.0
    moment (uninhibited), far pinned    0.5
    moment (uninhibited), far fixed     0.67
```

**Inputs:** the strong-axis moment of inertia Ix (in^4) and length (ft) of up to two columns and up to two girders at the
joint (a length of 0 skips a member), and the girder far-end condition.

**Outputs:** the stiffness ratio `g_ratio`, the column and girder stiffness sums, and the girder modifier used.

## 3. Worked example

`ic1=ic2=800 in^4, lc1=lc2=12 ft; ig1=ig2=1200 in^4, lg1=lg2=24 ft; rigid`:

```
column sum = 800/12 + 800/12 = 133.33 in^4/ft
girder sum = (1200/24 + 1200/24) x 1.0 = 100 in^4/ft
G          = 133.33 / 100 = 1.33
```

Feed G = 1.33 as GA (or GB) into `steel-effective-length-k`. A moment-frame far-pinned girder (x0.5) halves the girder
stiffness to 50 and doubles G to 2.67.

## 4. Limitations

Strong-axis buckling, all-steel frame (E cancels). The chart's idealizing assumptions apply (elastic, all columns
buckling simultaneously); it does not apply the inelastic tau_b stiffness reduction. A joint with no restraining girders
is a pin (use G = 10) or a fixed base (G = 1) in the K tile. A design aid, not a substitute for the engineer of record.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1210` pins the ratio, the far-end modifier scaling (x0.5 doubles G, x2.0 halves it),
  member skipping via a 0 length, the feed into the K tile, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the rigid example and the modifier cross-check).
- Formula checked against the standard alignment-chart stiffness ratio and girder far-end modifiers (AISC 360 Commentary
  Appendix 7 / Salmon & Johnson).
