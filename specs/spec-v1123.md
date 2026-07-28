# roughlogic.com Specification v1123 -- T-Beam Flexural Capacity (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-concrete.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1122.md.
>
> **The gap, self-declared and now closed.** `rc-beam-flexure`'s note lists what it does not do:
> *"compression reinforcement, T-beam flange action, minimum steel (§9.6.1.2), and shear."* Three of the
> four now have tiles -- `rc-beam-doubly-reinforced`, `concrete-beam-min-flexural-steel`,
> `rc-beam-shear`. **T-beam flange action was the last one open.** `t-beam-effective-flange-width`
> computes the width and stops there.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-positive
material or section inputs, an effective depth not exceeding the flange, an override below the web width,
a missing span with no override, or a neutral axis at or below the tension steel return `{ error }`.
Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `rc-tbeam-flexure` -- T-Beam Flexural Capacity (ACI 318-19)

```
inputs:  fc_psi, fy_psi, as_in2, bw_in, hf_in, d_in, ln_in, sw_in, beam_type,
         be_override_in (0 = compute), mu_kipft
compute: be from 6.3.2, DELEGATED to computeTBeamEffectiveFlangeWidth
         trial a = As fy / (0.85 f'c be)
           a <= hf  ->  rectangular of width be, Mn = As fy (d - a/2)
           a >  hf  ->  Asf = 0.85 f'c (be - bw) hf / fy,  Asw = As - Asf,
                        a = Asw fy / (0.85 f'c bw)
                        Mn = Asf fy (d - hf/2) + Asw fy (d - a/2)
         c = a/beta1;  eps_t = 0.003 (d - c)/c;  phi per 21.2.2
outputs: be_in, be_source, be_governs, a_trial_in, t_action, a_in, c_in, beta1, asf_in2,
         asw_in2, flange_fraction, eps_ty, tc_limit, eps_t, tension_controlled,
         compression_controlled, phi, mn_kipft, phi_mn_kipft, util, note
```

**Which behavior applies is the whole question.** For most positive-moment T-beams the compression block
stays entirely inside the slab, and then the section is simply a wide rectangle -- **the web width does
not enter the flexural answer at all**, which surprises people who assume a T-beam needs T-beam math. The
fuzzer pins that identity bit-for-bit against `computeRcBeamFlexure` across fifteen combinations; if the
two ever diverge, one of them is wrong.

**When it is a true T, the shortcut is unconservative.** Treating the example section as a plain 36-in
rectangle returns 881.6 kip-ft against the correct 872.9 -- about 1% high, because the rectangle credits
the overhang compression at too deep a centroid. Small, but in the wrong direction, and the fuzzer asserts
the sign of that error rather than just its size.

**The φ limit is the 2019 one.** Tension-controlled at `eps_ty + 0.003`, not the fixed 0.005 of ACI
318-14. They coincide only near Grade 60; the fuzzer sweeps Grades 40 through 100 and explicitly asserts
that Grade 100 does **not** land on 0.005. This is the exact class of bug the 2026-07-23 concrete audit
found elsewhere in this module, so it is pinned rather than assumed.

**A guard I wrote and then removed.** The first draft errored when `Asw` came out non-positive. Reaching
the T branch requires `As fy > 0.85 f'c be hf`, which already exceeds the `0.85 f'c (be - bw) hf` that
`Asf` represents -- so the branch is unreachable. It is replaced by the failure that *can* happen, a
neutral axis at or below the steel, and the fuzzer sweeps five steel areas confirming `Asw` stays positive.

## 3. The scope limit that matters most

**Positive moment only.** Over a support the slab is in tension, the flange contributes nothing, and the
section reverts to a rectangle of the **web** width. Using this tile there overstates capacity badly, so
the note and the citation both say so in capitals.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `t-beam-effective-flange-width`,
`rc-beam-flexure` (which now links forward), `rc-beam-doubly-reinforced`, and
`concrete-beam-min-flexural-steel`. Fuzzer pins the rectangular identity, exact agreement of the
delegated effective width across six interior/edge cases, override equivalence, the unconservative
direction of the rectangle shortcut, steel conservation in the T split, monotonicity of capacity in As,
the strain and beta1 relations, the Grade-40-through-100 phi sweep, and every error seam.
