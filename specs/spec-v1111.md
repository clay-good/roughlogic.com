# roughlogic.com Specification v1111 -- EGC for Parallel Raceways (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-electrical.js`** (Group A), no new module, group, or dependency. Inherits spec.md through
> spec-v1110.md.
>
> **The gap, and the evidence for it.** `egc-upsize-proportional` implements 250.122**(B)** and its note
> says so; `egc-sizing` returns the Table 250.122 size from an OCPD; `parallel-conductor-derate` handles
> paralleled ampacity but no EGC. The string "250.122(F)" appears nowhere in the repo. Discovery batches 6
> and 7 both landed on it, batch 7 calling it "the genuinely missing full-size EGC in EACH raceway rule."

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-positive
OCPD, a raceway count below 2 or non-integer, an unknown material, or an OCPD past the bundled table return
`{ error }`. `GOVERNANCE.electrical`. Renderer: hand-written non-exported (module convention).

**No NEC table is duplicated.** The Table 250.122 lookup is delegated to the landed `computeEGCSize`, the
same reuse pattern spec-v1020's pryout tile used against the tension-breakout tile. This tile contributes
only the parallel rule.

## 2. The tile

### 2.1 `egc-parallel-raceways` -- EGC for Parallel Raceways (NEC 250.122(F))

```
inputs:  ocpd_A, raceway_count (>= 2), material (copper | aluminum)
compute: egc_per_raceway = computeEGCSize(FULL ocpd_A, material)     <- the rule
         total_egc_count = raceway_count
         divided_ocpd    = ocpd_A / raceway_count                    <- the mistake
         undersized_awg  = computeEGCSize(divided_ocpd, material)    shown for contrast
outputs: egc_per_raceway_awg, total_egc_count, divided_ocpd_A, undersized_awg,
         same_either_way, ocpd_A, note
```

**The tile shows the wrong answer on purpose.** The mistake is sizing the EGC from the divided per-raceway
current, because that is how the ungrounded conductors work. It is wrong: a 400 A feeder in two raceways
takes **two #3 copper EGCs**, not the #6 that 200 A would give. The reason, stated in the note, is fault
current -- a ground fault in one raceway returns through *that* raceway's EGC alone, not through all of
them sharing the job, so each must carry the full available fault current until the device opens.

**And it says when the mistake would not show.** At 60 A in two raceways both methods give #10, so the
error is invisible at low ratings. The tile reports `same_either_way` rather than letting a user conclude
the divided method is safe in general -- a fixture pins that case.

**Worked example (pinned).** 400 A, 2 raceways, copper: #3 in each, 2 runs, versus #6 by the divided
method. Verified against the published worked example of this rule.

## 3. Edition sensitivity, stated prominently

This is the **2023-and-earlier** rule. The **2026 NEC revises 250.122(F)** so the EGC in each raceway need
not be larger than the largest ungrounded conductor in that raceway -- a real change in the answer. Both
the note and the citation say to check which edition the jurisdiction has adopted. 250.122(B) proportional
upsizing and the 250.122(A) never-larger-than-the-circuit-conductors limit still apply and are named.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `egc-sizing` and
`egc-upsize-proportional`. Fuzzer pins cross-implementation agreement with the landed sizer across four
rating/material pairs, that the per-raceway size is INDEPENDENT of the raceway count while the count is
not, that the divided current gets worse with more raceways, the copper-vs-aluminum difference, the
`same_either_way` low-rating case, and that an out-of-table rating errors rather than guessing.
