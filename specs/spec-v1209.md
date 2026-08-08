# roughlogic.com Specification v1209 -- Diluted Weld Deposit Composition (calc-fab.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fab.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1208.md.
>
> **The gap, and the evidence for it.** The `weld-dilution` tile (spec-v356) computes the base-metal share of a deposit
> and its own note names the gap: "This is the cross-sectional area ratio; it does not itself compute the diluted alloy
> composition (that needs each metal's chemistry)." No tile computed that composition.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a dilution outside 0-100%, or a base/filler content outside 0-100% returns
`{ error }`. A content of 0% is VALID (an element absent from the base or filler). Citation discipline (v19/v22): the
welding-metallurgy dilution mixing rule as compiled in AWS references, by name, `GOVERNANCE.general`. **No copyrighted
table is reproduced** -- the mixing rule is closed-form and the chemistries are the user's own MTR/cert values.

## 2. The tile

### 2.1 `weld-deposit-composition` -- Diluted Weld Deposit Composition

```
D                      = dilution_pct / 100                dilution fraction (from the weld-dilution tile)
base_contribution%     = D * base%
filler_contribution%   = (1 - D) * filler%
deposit%               = base_contribution% + filler_contribution%
shift_from_filler%     = deposit% - filler%
```

**Inputs:** `dilution_pct` (0-100, from the weld-dilution tile), the element content in the base metal `base_pct`
(0-100), and the element content in the filler `filler_pct` (0-100).

**Outputs:** the as-deposited element content `deposit_pct`, the base/filler contribution split, and the shift from the
filler nominal.

## 3. Worked example

`dilution_pct = 30, base_pct = 0 (Cr in carbon steel), filler_pct = 23 (Cr in 309L)`:

```
deposit% = 0.30 * 0 + 0.70 * 23 = 16.1% Cr
shift    = 16.1 - 23 = -6.9%   (below the ~18% a 304-equivalent surface needs)
```

That is why a stainless overlay uses an over-alloyed filler (309 for a 304-equivalent first layer) and a low-dilution
first pass, or a second layer. Carbon can go the other way: base 0.25% C, filler 0.08% C, 35% dilution gives
0.35 * 0.25 + 0.65 * 0.08 = 0.14% C in the deposit, a carbon pickup above the filler nominal.

## 4. Limitations

One alloy element, one pass, well-mixed pool. It does not predict microstructure, ferrite number, or hardness -- a
Schaeffler or WRC-1992 diagram uses these compositions for that. A process aid; the WPS, the filler certs, and the
base-metal MTR govern.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1209` pins the mixing rule, the D=0 (pure filler) and D=100 (pure base) endpoints, the
  contribution split summing to the deposit, the carbon-pickup case, monotonicity in dilution, and the error seams
  (including that 0% content is valid).
- Two worked-example rows in `test/fixtures/worked-examples.json` (the 309L Cr overlay and the carbon-pickup check).
- Formula checked against the standard welding-metallurgy dilution mixing rule (AWS).
