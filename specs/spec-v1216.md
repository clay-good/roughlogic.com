# roughlogic.com Specification v1216 -- Beam-Column Nonsway Moment Amplifier B1 (AISC 360 App. 8) (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steel.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1215.md.
>
> **The gap, and the evidence for it.** `steel-h1-interaction` (tools-data.js:1330) states "second-order Mr assumed,"
> and its citation says it "assumes the second-order (P-delta/P-Delta) amplification is already in Mr (Chapter C /
> Appendix 8)." Steel had no moment magnifier, while concrete (`rc-slender-column-magnify`) and wood do. This adds it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive Pr/I/K1L, a bad transverse/method flag, an M1/M2 outside -1..1, or
an unstable member (alpha Pr >= Pe1) returns `{ error }`. Citation discipline (v19/v22): AISC 360-22 Appendix 8.2.1, by
name, `GOVERNANCE.general`. **No copyrighted table is reproduced** -- the equations are closed-form and the loads and
geometry are the user's own inputs.

## 2. The tile

### 2.1 `steel-b1-amplifier` -- Beam-Column Nonsway Moment Amplifier B1 (AISC 360 App. 8)

```
Pe1 = pi^2 E I / (K1 L)^2                     E = 29,000 ksi (nominal EI; DAM uses 0.8 tau_b EI)
Cm  = 0.6 - 0.4 (M1/M2)   (no transverse load)   or   1.0 (transverse load)
alpha = 1.0 (LRFD)  or  1.6 (ASD)
B1  = max(1, Cm / (1 - alpha Pr / Pe1))
```

**Inputs:** `pr_kip`, `i_in4` (in-plane), `lc1_ft` (K1 L in the plane), transverse-load flag, `m1_m2` (-1 single to +1
reverse curvature), design basis (LRFD/ASD).

**Outputs:** `b1`, Pe1, Cm, and the axial ratio alpha Pr/Pe1.

## 3. Worked example

`pr_kip = 400, i_in4 = 272 (W10x49), lc1_ft = 16, transverse_load = yes, method = LRFD`:

```
Pe1 = pi^2 (29000)(272) / (16*12)^2 = 2112 kip
Cm  = 1.0 (transverse load);  alpha = 1.0
B1  = 1.0 / (1 - 400/2112) = 1.0 / 0.8106 = 1.234
```

On the ASD basis (alpha = 1.6) the same member amplifies 1.435. When alpha Pr reaches Pe1 the member is unstable in this
plane and the tile errors.

## 4. Limitations

In-plane (P-delta) nonsway amplification only. Pe1 uses the nominal EI; the direct analysis method reduces it to
0.8 tau_b EI. The sidesway amplifier B2 (P-Delta) and the out-of-plane checks are separate. B1 multiplies the first-order
Mnt to give the Mr the H1.1 interaction needs. A design aid, not a substitute for the engineer of record.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1216` pins B1, Pe1, Cm (transverse and M1/M2 forms), the LRFD/ASD alpha, the >= 1 floor,
  the length trend, the instability error, and the input error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the LRFD example and the ASD cross-check).
- Formula checked against AISC 360-22 Appendix 8.2.1 (Eqs. A-8-3/A-8-4/A-8-5).
