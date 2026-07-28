# roughlogic.com Specification v1112 -- Slip-Critical Bolt with Applied Tension (calc-steel.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steel.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1111.md.
>
> **The gap, and the evidence for it.** A self-declared gap, quoted from `steel-bolt-slip-critical`'s own
> note: "the tension-slip interaction (J3.9) and the pretensioning method (turn-of-nut, DTI) are separate."
> That tile returns the UNREDUCED Rn; `steel-bolt-tension-shear` is the strength-level J3.7 ellipse, a
> different limit state. Discovery batch 8 ranked this fourth of fourteen survivors and called it a
> "one-liner on top of an existing tile's math, high real-world hit rate."

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: negative applied
tension returns `{ error }`, and every other guard is inherited by delegation. `GOVERNANCE.structural`.
Renderer: this module's `_simpleRenderer`.

**Delegation, not duplication.** The unreduced resistance comes from calling the landed
`computeSteelBoltSlipCritical`, the same pattern spec-v1020 (pryout) and spec-v1111 (parallel EGC) used, so
the two tiles cannot drift and the base tile's input validation is reused for free.

## 2. The tile

### 2.1 `slip-critical-with-tension` -- Slip-Critical Bolt with Applied Tension (AISC 360 J3.9)

```
inputs:  mu (0.30 A / 0.50 B), tb_kip, applied_tension_kip (Tu, on the connection),
         n (bolts), ns (slip planes), hf, du (1.13)
compute: Rn      = computeSteelBoltSlipCritical(...)          delegated
         clamp   = Du x Tb x nb                                the MEAN installed pretension
         ksc     = max(0, 1 - Tu / clamp)                      Eq. J3-5a
         reduced = ksc x Rn;  LRFD = 1.00 x reduced;  ASD = reduced / 1.50
outputs: unreduced_rn_bolt_kip, clamp_total_kip, ksc, fully_relieved, reduced_rn_bolt_kip,
         lrfd_bolt_kip, asd_bolt_kip, lrfd_total_kip, asd_total_kip,
         unreduced_lrfd_total_kip, loss_pct, note
```

**One detail worth stating.** The denominator uses `Du Tb` -- the MEAN installed pretension, not the
specified minimum. The reduction is measured against the clamping force actually present, which is why Du
appears here as well as in the base resistance. Getting that wrong understates the remaining capacity.

**The floor matters.** Past `Tu = Du Tb nb` the raw factor goes negative; the tile floors ksc at zero and
says plainly that the joint has NO slip resistance left -- the bolts may be intact but the faying surfaces
are free to move.

**Worked example (pinned).** Four bolts, Class A, Tb 28 kip, Tu 30 kip: clamp 126.56 kip, ksc 0.762958,
per-bolt 9.492 to 7.242 kip, connection 37.968 to **28.968 kip LRFD** -- a 23.7% loss. Cross-check: Tu = 0
returns ksc exactly 1 and reproduces the sibling's numbers exactly.

## 3. Scope limits

Slip is a **serviceability** limit. The strength-level shear and bearing check (`bolt-shear-bearing`) and
the J3.7 combined tension-shear rupture check (`steel-bolt-tension-shear`) are separate, and a joint can
pass all three or fail any one independently -- the note says so. **Prying action is not modeled**; it
raises the tension the bolts actually see beyond the applied load and matters most on thin end plates and
tees. Standard holes, inherited from the base resistance. AISC 360 and the engineer of record govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with both bolt siblings. Fuzzer pins the exact
J3-5a factor, cross-implementation agreement with the unreduced sibling at zero tension AND that
`lrfd_total = unreduced x ksc` at five tension levels, exact linearity of ksc (the 50% point), the zero
floor and the beyond-floor clamp, the ASD/1.5 identities, that ksc is independent of mu, and that more
bolts make the same tension cost proportionally less.
