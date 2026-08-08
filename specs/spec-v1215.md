# roughlogic.com Specification v1215 -- LTB Moment-Gradient Factor Cb (AISC 360 Eq. F1-1) (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steel.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1214.md.
>
> **The gap, and the evidence for it.** `computeSteelBeamLtb` destructures `cb` as a hand-entered input defaulting to
> 1.0 (`calc-steel.js:410`), guards `if (!(cb > 0)) return { error: "Cb must be positive (1.0 is conservative)." }`, and
> its note and citation both say "Cb must match the moment diagram (1.0 is conservative)." No tile computed Cb.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive Mmax, or a quarter-point moment exceeding Mmax returns
`{ error }`. Citation discipline (v19/v22): AISC 360-22 Eq. F1-1, by name, `GOVERNANCE.general`. **No copyrighted table
is reproduced** -- the equation is closed-form and the four segment moments are the user's own analysis results.

## 2. The tile

### 2.1 `steel-cb` -- LTB Moment-Gradient Factor Cb (AISC 360 Eq. F1-1)

```
Cb = 12.5 Mmax / (2.5 Mmax + 3 MA + 4 MB + 3 MC)      (Rm = 1, doubly symmetric)
```

Mmax, MA, MB, MC are the absolute moments at the maximum and at the quarter, mid, and three-quarter points of the
unbraced segment.

**Inputs:** `mmax`, `ma`, `mb`, `mc` (kip-ft).

**Outputs:** `cb`.

## 3. Worked example

`mmax = 100, ma = 75, mb = 100, mc = 75` (a simple-span uniformly loaded beam braced only at its ends, where
MA = MC = 0.75 Mmax and MB = Mmax):

```
Cb = 12.5(100) / (2.5(100) + 3(75) + 4(100) + 3(75)) = 1250 / 1100 = 1.136
```

the classic ~1.14. Uniform moment (all four equal) gives Cb = 12.5/12.5 = 1.0. Feed Cb into `steel-beam-ltb`; it
multiplies the inelastic and elastic LTB moment (capped at Mp).

## 4. Limitations

Doubly symmetric members (Rm = 1). Take Cb = 1.0 for a cantilever with a free unbraced end, and recompute for each
unbraced segment (Cb changes between brace points). Because Mmax is the segment maximum, Cb is always at least 1.0 here.
A design aid, not a substitute for the engineer of record.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1215` pins Eq. F1-1, the uniform-moment baseline (1.0), the scale invariance, the
  Cb >= 1 bound, the absolute-value handling, the feed into the beam-LTB tile, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the UDL simple-beam example and the uniform-moment
  cross-check).
- Formula checked against AISC 360-22 Eq. F1-1.
