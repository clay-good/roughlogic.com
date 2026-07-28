# roughlogic.com Specification v1121 -- Normal Tension for a Suspended Steel Tape (calc-survey.js, Group P, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-survey.js`**
> (Group P), no new module, group, or dependency. Inherits spec.md through spec-v1120.md.
>
> **A dupe check that changed the tile.** The candidate on the ledger was "tape standardization
> correction." It is a **dupe** -- `taping-corrections` already computes temperature, slope, tension, and
> sag with the same defaults I would have used. What it does *not* do, and never mentions, is answer the
> question a crew asks next: what pull makes the corrections unnecessary? That is this tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
span, area, or modulus, or a negative weight or pull, returns `{ error }`. Hand-written renderer, matching
this module's convention (calc-survey.js has no `_simpleRenderer` factory).

## 2. The tile

### 2.1 `taping-normal-tension` -- Normal Tension for a Suspended Steel Tape

```
inputs:  span_ft, tape_weight_plf, tape_area_in2, standard_pull_lb, applied_pull_lb (optional),
         e_psi (29,000,000)
compute: set  (P - P0) L / (A E)  =  w^2 L^3 / (24 P^2)
         with W = w L the length cancels:   P^2 (P - P0) = A E W^2 / 24
         solved by bisection (the left side is strictly increasing above P0)
outputs: normal_tension_lb, span_weight_lb, sag_at_normal_ft, pull_at_normal_ft,
         residual_at_normal_ft, sag_at_applied_ft, pull_at_applied_ft, net_at_applied_ft,
         applied_reads_short, note
```

**The physics, and why the length disappears.** Pulling harder stretches the tape -- a positive correction
growing linearly with P. Letting it hang sags the span -- a negative correction shrinking as 1/P². Exactly
one pull makes them cancel. Substituting the span's total weight `W = w L` removes L from *both* sides, so
normal tension depends on the tape and on how much the suspended span weighs, but not separately on how
long it is.

**The 0.204 in the textbooks is not a coefficient.** Square-rooting the same relation gives
`P = 0.204 W sqrt(A E) / sqrt(P - P0)`, the implicit form every surveying text prints. 0.204 is
`1/sqrt(24)`. The tile solves the cubic directly rather than iterating the implicit form, and the fuzzer
checks the bisection root against `1/Math.sqrt(24)` across 108 tape/span/pull combinations -- against the
algebra, not against a memorized number.

**Worked examples (pinned).** A 100-ft span of 0.02 lb/ft tape, 0.006 sq in in section, standardized at
10 lb, wants **34.444 lb**; the closed form agrees to 14 significant figures and the two corrections cancel
to machine zero. Pull the customary 20 lb instead and the span reads **0.036 ft long**. Halving the span
drops the answer only to 23.325 lb, not to half -- because the relation goes as W², so the pull scales
with roughly the two-thirds power of the span weight.

**Cross-implementation pin.** The sag and tension terms are checked against `computeTapingCorrections` at
four pulls to twelve decimal places, so the two tiles cannot drift.

## 3. Honest limits, in the note

Normal tension can exceed what a crew holds steadily or what the tape is rated for. A tape supported
throughout has no sag to cancel. And cancelling these two corrections does nothing about temperature or
the tape's own standardization error -- both still need the sibling tile, which the note says and links.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `taping-corrections` (which now links
back), `differential-leveling`, `stadia-distance`, and `edm-slope-reduction`. The tools-data row sits in
the Group P "(cont.)" region beside `taping-corrections`, outside the block `citations.test.js` counts, so
no count assertion moves. Fuzzer pins exact cancellation, the closed form and the cubic across 108
combinations, sibling agreement, the sign flip either side of normal tension, the W² scaling, monotonicity
in tape weight, the weightless degenerate case, that an omitted applied pull yields `null` rather than a
fabricated zero, and every error seam.
