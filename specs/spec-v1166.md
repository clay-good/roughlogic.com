# roughlogic.com Specification v1166 -- Hearing Protector Attenuation (calc-cross.js, Group G, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 83 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-cross.js`** (Group G), no new module, group, or dependency. Inherits spec.md through
> spec-v1165.md.
>
> **The gap.** `noise-dose` computes the shift TWA against the 85 dBA action level and the 90 dBA PEL,
> and stops there. Nothing said what a protector leaves at the ear. A dupe scan for "hearing protection"
> and "NRR" returned zero hits.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown
weighting, method, or dual-protection flag, a non-positive TWA, NRR, or target, or a negative dual bonus
return `{ error }`. Renderer: this module's `_simpleRendererG`. Group G count assertion 36 -> 37;
`check-module-sizes` cap for calc-cross.js raised 50000 -> 56000.

**Source.** OSHA 29 CFR 1910.95 Appendix B (public domain, quoted directly) for the method; NIOSH,
*Criteria for a Recommended Standard: Occupational Noise Exposure* (1998) for the type-specific derating.

## 2. The tile

### 2.1 `hearing-protector-nrr` -- Hearing Protector Attenuation (1910.95 App. B)

```
inputs:  twa_db, weighting (A|C), nrr_db, method, dual_protection, dual_bonus_db, target_db
compute: C-weighted -> attenuation = NRR;  A-weighted -> NRR - 7          [Appendix B]
         osha-50     -> that adjusted value halved                        [field guidance]
         niosh-*     -> labelled NRR x 0.75 / 0.50 / 0.30, no 7 on top    [NIOSH + stated reading]
         exposure at the ear = TWA - effective attenuation (attenuation floored at 0)
         inverse: the NRR that would reach the target by the same method
outputs: appendix_b_attenuation_db, derated_nrr_db, base_attenuation_db, dual_bonus_applied_db,
         effective_attenuation_db, attenuation_floored, protected_twa_db, meets_target, margin_db,
         label_vs_real_db, nrr_needed_db, spectral_adjustment_db, note
```

**The 7 dB step is the one people skip.** Appendix B subtracts the NRR directly from a C-weighted
measurement, but where the measurement is A-weighted -- which is what a dosimeter reports and what everyone
actually has -- it directs that you subtract 7 dB from the NRR first. The cross-check fixture is the same
protector on the same 98 dB shift crediting **22 dB in dBA and 29 dB in dBC**, 76 at the ear against 69,
with nothing but the meter changing.

**Derating is guidance, not Appendix B text, and is labelled as such** in the note, the citation, and the
assumptions. OSHA's field guidance halves the adjusted value; NIOSH cuts the labelled NRR by protector
type. The default example is an NRR 29 foam earplug on a 98 dBA job crediting **8.7 dB** and leaving 89.3
at the ear, where the package number would have suggested 69.

**One interpretation is made and stated rather than buried.** The NIOSH factors are applied to the labelled
NRR *without* also taking OSHA's 7 dB, on the reading that NIOSH's derating is itself the real-world
adjustment rather than an addition to OSHA's. That is a stated reading, not a quoted instruction, and it is
why the two families report different spectral terms.

**The fuzzer caught a wrong assumption during construction**, which is now pinned as a fact: the two
families **cross over**. An Appendix B figure loses a flat 7 dB while a NIOSH figure loses a percentage, so
at NRR 20 the NIOSH earmuff number is the more generous and at NRR 33 it is the less. Neither method
dominates, and the tile says so.

**The inverse is reported and verified.** The NRR that would reach the target by the same method, with the
fuzzer feeding it back in across all five methods and both weightings and asserting it lands exactly on the
target. Where that NRR exceeds anything on the market the tile says the answer is engineering controls,
administrative limits, or dual protection rather than a better earplug.

## 3. Scope

An attenuation estimate, not a hearing conservation program. Not checked: whether the exposure is measured
correctly, which is `noise-dose`; the noise spectrum, since the NRR is a single number standing in for a
curve and low-frequency noise defeats it; fit, which is what derating exists to approximate and what
fit-testing measures directly; wearing time, where removing a protector for a few minutes of a shift costs
more than any derating; protector condition, size, and insertion; and the audiometric testing, training,
and recordkeeping the standard also requires, including the provision that an employee with a significant
threshold shift must have attenuation sufficient to reduce exposure to a TWA of 85 dB. The dual-protection
bonus is an editable input defaulted to the 5 dB commonly applied under OSHA Technical Manual guidance;
NIOSH recommends double protection above a 100 dBA TWA without quantifying the gain.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `noise-dose`, `decibel-converter`,
`heat-stress`, and `niosh-lifting`. Fuzzer pins both fixtures, the 7 dB step in both directions and its
exact size, the OSHA halving working on the adjusted value rather than the label, all three NIOSH factors
under both weightings with the 7 proven not to stack, the within-family orderings and the between-family
crossover in both directions, monotonicity in NRR across five methods, the zero floor on negative
attenuation, the dual bonus at three values and only when worn, the inverse round-trip across all five
methods and both weightings landing exactly on the target, the label-versus-reality gap, an editable
target, and every error seam.
