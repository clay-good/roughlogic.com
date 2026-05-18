# Correctness posture (spec-v14)

> Implementation status: Phase A scaffolding landed at v14 open
> (2026-05-18). Phases B-H land incrementally per
> [../specs/spec-v14.md](../specs/spec-v14.md) §16.1.

This document is the contributor reference for the spec-v14
correctness pass. It explains how a calculator becomes
"verified" on the site, what the lints and tests enforce, and
how a new tile lands with the per-tile artifacts the v14 audit
requires.

The site's correctness contract: every calculator returns a
number that lies within the stated tolerance of an independent
published worked example, the dimensions of the inputs and the
output balance, the documented domain edges return finite
sensible values, iterative methods converge, shared
computations agree across tiles, and a credentialed reviewer
has signed off on each group within the quarterly cadence.

See [../specs/spec-v14.md](../specs/spec-v14.md) for the full
spec. This document is the operational summary.

## What "verified" means, per phase

| Phase | What it verifies | Artifact | Lint / test |
| --- | --- | --- | --- |
| A | Every exported calculator function has a corpus row. | `## Function corpus (v14)` table in [derivations.md](derivations.md). | `npm run audit:corpus` (wired into `npm run lint`). |
| B | Each calculator's output for a fixture input is within tolerance of an independent published value. | Per-row fixture in [../test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json). | `test/unit/cross-validation.test.js` + `scripts/check-cross-validation.mjs` (planned). |
| C | The dimensional skeleton of each expression balances input dimensions against output dimension. | `// dims:` annotation in the source. | `scripts/check-dimensions.mjs` (planned). |
| D | Each calculator returns a finite sensible value at every documented domain edge. | Per-row domain band in the corpus. | `scripts/check-bounds.mjs` (planned). |
| E | Iterative / transcendental methods converge to a stable bit pattern. | `test/unit/numerical-stability.test.js` (planned). | `npm test`. |
| F | Tiles that share a computation agree to the floating-point floor; round-trip conversions are identity-preserving. | `test/unit/cross-tile-invariants.test.js` (planned). | `npm test`. |
| G | The formula the calculator implements matches the cited section of the cited source. | A written derivation row in [derivations.md](derivations.md) and a v6 source-stamp recheck in [v6-audit.md](v6-audit.md). | Per-group reviewer (Phase H). |
| H | A credentialed reviewer has signed off on each active group within the prior quarter. | Per-group row in [audit-trail.md](audit-trail.md). | `scripts/check-citation-freshness.mjs` cadence + manual review. |

## The formula corpus (Phase A)

The corpus is the mechanically-extracted index of every
exported calculator function in pure-math.js and the calc-*.js
modules. It is emitted by
[../scripts/build-corpus.mjs](../scripts/build-corpus.mjs)
into the `## Function corpus (v14)` section of
[derivations.md](derivations.md). The script is idempotent.

To regenerate after adding, renaming, or removing a calculator:

```
npm run corpus:build
```

To verify the corpus is current (used by CI and the pre-PR
audit):

```
npm run audit:corpus
```

The Inputs, Output, Expression, Citation, Fixture, and
Tolerance fields are placeholders (`_`) at scaffolding time;
they are filled in per row as Phases B, C, G, and H land for
each group.

### What the corpus excludes

Per spec-v14 §5.3, the corpus does not include:

- Reference-only tiles (lookup tables, e.g. periodic table,
  knot reference, body-condition-score reference). Reference
  tiles use the v6 recheck cadence, not a calculation
  cross-check.
- Composed meta-tiles (Job Estimate Roll-Up, Material Order
  List, Job Pack). Correctness derives from the per-tile
  correctness of the consumed calculators.
- Platform affordances (theme toggle, search, pinning, hash
  routing, service worker). These are not calculators.

The extraction heuristic excludes named-data exports (Example
fixtures, Presets, all-caps constants). A calculator that
ships under a name matching the excluded patterns should be
renamed; the convention is a `compute*` verb prefix.

## Per-tile cross-check (Phase B)

Each corpus row gains a worked-example fixture sourced from a
publication independent of the calculator's primary citation.
The fixture's expected output ships with a tolerance band; the
band is the wider of the published source's rounding, the
first-principles convergence floor, and the empirical bound on
the underlying physics. See spec-v14 §14 for the per-group
default tolerances.

The fixture lives in
[../test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json)
per the spec-v10 §C.1 convention. The fixture name carries the
source short-name and the page or section reference so a
reader can verify the input-and-output pair against the
published page.

## Dimensional-analysis lint (Phase C)

Every calculator function carries a one-line dimension
annotation in a leading comment naming each input's physical
dimension using the SI base-unit short codes and the output's
dimension as a product / ratio expression. The lint reads the
annotations and asserts the expression's left-hand side and
right-hand side have the same dimension. The lint is
conservative; it does not attempt floating-point verification.

The Group G unit converter is the canonical unit-conversion
table; the lint asserts that every conversion coefficient used
in any calc-*.js module is present in the Group G crosswalk to
twelve significant figures.

## Bounds and edge cases (Phase D)

The fuzzer generates inputs at the lower bound, the lower
bound plus and minus epsilon, the midpoint, the upper bound
plus and minus epsilon, and any documented regime transition.
At every generated input the test asserts the output is finite,
the sign matches the row's sign declaration, and the magnitude
is within two orders of magnitude of the published result.

Out-of-domain inputs are expected to throw a named error or
return a documented sentinel. A function that silently clamps
out-of-domain inputs must document the clamp in its row.

## Numerical stability (Phase E)

The iterative and transcendental calculators (Colebrook,
psychrometric inverse, refrigerant P-T interpolation,
simplified Manual J, pump discharge pressure, density altitude
inversion) carry a per-method test that exercises five
representative inputs, a pathological input known to trip
similar implementations, and a NaN-poisoning input. The output
is bit-stable across Node 20, Node 22, and the latest Node LTS
at v14 close; the test fixture pins the IEEE 754 double bit
pattern.

## Cross-tile invariants (Phase F)

Where two or more tiles share a computation (AWG-to-cmils,
CFM-to-m^3/s, NFA hose-friction coefficient, psi-to-feet-of-
head, IRS standard mileage), the invariant test asserts
agreement. Where a conversion has a documented inverse
(AWG-to-mm^2, F-to-C, PSI-to-kPa, HP-to-kW, gallons-to-liters,
feet-to-meters, pound-mass-to-kilogram), the round-trip test
asserts f(g(x)) == x to within 1e-12 absolute for SI-base
conversions and 1e-9 relative for empirical conversions.

Where a calculator's output is monotonic in an input, the test
asserts monotonicity over a sweep. A non-monotonic result for
a monotonic relationship is a transcription error.

## Per-group reviewer signoff (Phase H)

Every active group A through Y carries one signoff row in
[audit-trail.md](audit-trail.md) per quarter. The row names
the reviewer, the credential, the review date, the fixtures
covered, and the next-renewal date (90 days from review per
the v6 cadence). A lapsed signoff (more than 100 days) is a
build warning; a lapse exceeding 180 days fails the audit.

The credentials sought per group:

- Engineering groups (A Electrical, B Plumbing, C HVAC, D
  Restoration, E Construction, F Fire-ground, G Cross-trade,
  J Trucking, K Mechanic, L Agriculture, M Water, N Stage,
  O Kitchen, P Field): PE or equivalent trade certification.
- R Accounting: CPA.
- S Legal: JD.
- T Lab: PhD / MS in the relevant discipline.
- U Veterinary: DVM or RVT / LVT.
- V EMS: RN, MD, or paramedic with current protocol
  familiarity.
- W Pilots: ATP or CFI.
- X Real Estate: licensed broker, appraiser, or lender.
- Y Educators: working classroom teacher or curriculum
  specialist.

The reviewer's name appears in audit-trail.md only with their
explicit consent; anonymous-by-request reviews carry a generic
identifier.

## New-tile flow

When a new tile lands in a future spec:

1. The TOOLS entry, the calc-*.js function, the per-tile meta
   in tile-meta.js, the citation in citations.js, the worked-
   example fixture in
   [../test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json),
   and the derivation row in [derivations.md](derivations.md)
   all land in the same change.
2. `npm run corpus:build` regenerates the corpus skeleton; the
   new row appears in the table.
3. The cross-validation test passes against the fixture.
4. The dimensional-analysis lint passes.
5. The bounds fuzzer passes at the eight documented input
   vectors.
6. The signoff for the tile's group is updated to include the
   new tile in its fixture coverage.

## Tile retirement

When a tile is retired:

1. The TOOLS entry is removed.
2. `npm run corpus:build` regenerates the corpus; the row
   disappears.
3. The fixture is removed.
4. The shell at `dist/tools/<id>/index.html` is no longer
   regenerated.
5. The sitemap regenerates.
6. The CHANGELOG records the retirement and the date.

## What this document does not do

- It does not enumerate every fixture; the fixtures live in
  [../test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json)
  and are walked by the cross-validation lint.
- It does not aggregate a "calculator quality score". Per
  spec-v14 §15 the posture is binary: every tile is correct to
  the stated tolerance against its published source, or it is
  fixed.
- It does not introduce runtime cost. The corpus, the lints,
  and the tests are build-time only; nothing in `dist/` grows.
- It does not change the no-third-party posture, the CSP, or
  the home-view payload budget.

## See also

- [../specs/spec-v14.md](../specs/spec-v14.md) - the spec.
- [derivations.md](derivations.md) - the formula corpus and
  per-tile derivations.
- [v6-audit.md](v6-audit.md) - the quarterly citation recheck
  log (the cadence v14 aligns to).
- [audit-trail.md](audit-trail.md) - the per-group reviewer
  signoff record.
- [contributor-checklist.md](contributor-checklist.md) - the
  PR gate that the corpus check is wired into.
- [launch-checklist.md](launch-checklist.md) - the v0.14
  launch gates.
