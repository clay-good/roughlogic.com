# roughlogic.com Specification v14 - Calculation Correctness, End to End

> **Implementation status (drafted 2026-05-18, status: drafted, not
> yet landed).** v14 is a correctness spec. It does not add tiles,
> does not add groups, does not add runtime features, does not
> change the discoverability surface introduced in v13, and does
> not change the no-telemetry / no-third-party posture established
> in spec.md and refined through spec-v13.md. v14 addresses one
> question that every prior spec has answered locally and never
> answered globally: for the 385 tiles in the catalog, across the
> ~25 calc-*.js modules and the shared pure-math.js library, is
> every formula transcribed correctly, every constant cited
> correctly, every unit converted correctly, every edge case
> handled, every result within the tolerance the source allows,
> and every output reproducible bit-for-bit on every modern
> browser. The site has been audited for citation freshness
> (v6), for surface discipline (v11), for breadth (v12), and for
> discoverability (v13). v14 is the audit pass that closes the
> correctness loop, end to end, with a written record of every
> formula in the catalog, a cross-check against an independent
> published worked example for each one, a dimensional-analysis
> lint that fails the build on a unit mismatch, a bounds-and-
> edge-case fuzzer that proves the calculators do not return NaN
> / Infinity / nonsense on plausible inputs, and a per-group
> reviewer signoff entered into [docs/audit-trail.md](../docs/audit-trail.md).
> Every prior-spec constraint continues unchanged.

> Foreword, in the voice of a maintainer who has shipped 385
> tiles across thirteen specs, who has 3,435 unit tests passing
> on every build, who reads the source-stamp citation block on
> every tile and trusts it, and who one afternoon at 2 PM
> reaches for the voltage-drop calculator on the site they wrote
> themselves to size a 60 amp feeder, runs the numbers, gets
> 2.7 percent, double-checks against a hand calculation, gets
> 2.6 percent, double-checks against the calculator on the
> Mike Holt forum, gets 2.65 percent, and stops cold to ask
> the question that should have been asked thirteen specs ago:
> which of the three is right.
>
> The site's posture, from spec.md section 1 forward, has been
> that the math is correct because the math is derived from
> first principles over public physics and public-domain data,
> and that the tests prove it. The tests do prove the math the
> tests describe. The tests do not prove the math the tests do
> not describe, and across 385 tiles and ~330 calculator
> functions in the catalog, the unit-test coverage is
> representative, not exhaustive. The first-principles
> verification suite cross-checks copper resistance, NEC 75 C
> ampacity, Hazen-Williams worked example, refrigerant P-T at
> table points, lumber spans, NFA hose friction, and hydrant
> flow. That is seven cross-checks. There are 385 tiles.
>
> v6 set the citation-freshness discipline. v6 said: every
> reference value carries a source-stamp with publisher, edition,
> section, and verified-on date. That discipline is in force,
> and the citations are honest. What v6 did not say, and what
> no later spec has said, is: every calculator's output, given
> a representative input, lies within a stated tolerance of the
> published worked example the citation references. The
> citation says "NFPA 1962 section 13.2"; the calculator
> implements CQ^2L with NFA coefficients; the test asserts the
> calculator's output for one input matches one published value.
> The unstated assumption is that the formula was transcribed
> correctly, the coefficients were transcribed correctly, the
> units were converted correctly, and the test fixture itself
> matches the published source. Across 385 tiles, that
> assumption needs evidence.
>
> v14 is the evidence. One tile, one formula, one independent
> published worked example, one cross-check, one tolerance
> band, one reviewer signoff per group. The work is not
> glamorous. It is the work that lets the next professional
> who types "hazen williams 4 inch ductile iron 200 gpm" into
> the search bar and lands on the site by way of v13's
> shells and then runs the calculator, trust the answer
> without having to repeat it on a hand calculator or a
> competing site or a desk reference.
>
> Build it the way the rest was built. One tile, one
> derivation, one cross-check, one tolerance, one signoff.
> Then get out of the way and let the calculator return the
> number the professional came for.

This document is the v14 spec. It inherits everything from
spec.md, spec-v2.md, spec-v3.md, spec-v4.md, spec-v5.md,
spec-v6.md, spec-v7.md, spec-v8.md, spec-v9.md, spec-v10.md,
spec-v11.md, spec-v12.md, and spec-v13.md. Where v14 expands
the test surface, adds a lint, or adds a documentation row,
the addition is bounded by the existing hard limits (100
percent client-side, no third-party fetch at runtime, CSP
`default-src 'self'`, no telemetry, no account, no fee, no
new runtime dependencies). Every other constraint from every
earlier spec remains in force.

Repository: github.com/clay-good/roughlogic.com

US standards only. Assume all visitors are in the United
States. v14 does not change the audience posture.

## 1. Inheritance

Every constraint from prior specs continues without
exception. v14 adds:

- A repository-wide formula corpus: one row per calculator
  function, in [docs/derivations.md](../docs/derivations.md),
  carrying the function's name, the calc-*.js module it lives
  in, the closed-form expression it implements, the units of
  every input and output, the citation that authorizes the
  expression, and the worked-example fixture that proves the
  transcription is correct.
- A per-tile cross-check unit test that compares the
  calculator's output for the worked-example input against an
  independent published value (a textbook problem, a code-
  body example, a manufacturer-published reference table, or
  a NIST-traceable hand calculation) and asserts the result
  lies within the tolerance band the source allows. The
  tolerance band is stated per row.
- A dimensional-analysis lint, `scripts/check-dimensions.mjs`,
  that reads the per-function dimension annotation in
  pure-math.js and the calc-*.js modules, and fails the
  build on a unit-system mismatch between an input and the
  expression it feeds.
- A bounds-and-edge-case fuzzer, `scripts/check-bounds.mjs`,
  that generates inputs at the documented domain edges (zero,
  the minimum, the maximum, the unit-boundary, the physical-
  limit) for every calculator and asserts no NaN, no
  Infinity, no negative-where-positive-required, no quiet
  fall-through-to-the-wrong-branch.
- A numerical-stability test, `test/unit/numerical-stability.test.js`,
  that exercises every iterative or transcendental calculator
  (Colebrook, psychrometrics, Manual J Web Worker, Hazen-
  Williams inverse, refrigerant P-T interpolation, NPSHa
  vapor-pressure lookup) at the input regions where rounding
  error or branch selection has historically tripped similar
  implementations.
- A per-group reviewer signoff row in
  [docs/audit-trail.md](../docs/audit-trail.md), one per
  active group A through Y, recording the reviewer name,
  the review date, the test fixture covered, and the date
  the next renewal is due. The signoff cadence aligns with
  the v6 section 6 quarterly recheck.

The hard limits still bind:

- 100 percent client-side, single-page static, Cloudflare
  Pages, no server, no account, no telemetry, no AI, no API
  key, no third-party fetch beyond same-origin static
  assets.
- No localStorage / sessionStorage / cookies / IndexedDB
  beyond `rl-theme`. URL hash is the only state mechanism
  for the SPA; shells are read-only.
- CSP `default-src 'self'`, `connect-src 'self'`,
  `worker-src 'self'`.
- WCAG 2.2 AA, 48 px touch targets, voice input, single h1
  per view.
- No emojis, no em-dashes, no decorative icons. v14
  inherits the character-set discipline.
- Home-view payload budget under 100 KB after gzip.
- Public changelog, semver, no flags, 90-day deprecation.
- AHJ governs / professional governs posture preserved on
  every tile and every shell.

## 2. The correctness problem, stated precisely

The site is, by design, a calculator. The unit of value is
the answer it returns for a professional's input. The
calculators are correct, in the sense that they implement
the formulas the citation block authorizes; the unit tests
prove the implementation matches the formula; the first-
principles verification suite cross-checks seven canonical
results against published reference values. None of those
three artifacts is a substitute for a per-tile, end-to-end
cross-check against an independent published worked example.

The gaps that v14 closes:

- **Transcription gap.** The formula in the calc-*.js
  module is transcribed from a textbook, a code body, or a
  derivation in [docs/derivations.md](../docs/derivations.md).
  A transcription error (a swapped coefficient, a missing
  factor of two, a degree-to-radian conversion that was
  always on the input and is now on the output) is not
  caught by a unit test whose expected value was computed
  from the same transcribed formula. The cross-check has to
  use an independently-derived value, not a value the same
  author computed from the same source.
- **Unit gap.** A calculator that accepts gallons-per-minute
  and meters-of-head silently disagrees with a calculator
  that accepts cubic-feet-per-second and feet-of-head, even
  when both compute the same physical quantity. The
  calc-*.js modules carry unit conventions per group; a
  cross-group composition (the Job Estimate Roll-Up; the
  Field Notes scratchpad) that consumes one calculator's
  output as another's input can introduce a unit mismatch
  that is not caught by either tile's tests. v14 adds the
  dimensional-analysis lint to catch this class.
- **Edge-case gap.** A calculator that asserts a sensible
  result for representative inputs may silently produce NaN
  / Infinity / a wrong-branch result at the domain edges
  (zero, the maximum, the saturation point, the regime
  transition). Professionals do not always type
  representative inputs. The bounds fuzzer catches the
  class.
- **Numerical-stability gap.** Iterative methods (Colebrook
  for Darcy-Weisbach, psychrometric inverse for dew point,
  Newton's method for the equation of state in refrigerant
  P-T) converge on most inputs and diverge or oscillate on
  a few. The numerical-stability tests prove the converging
  branch is hit on every input the calculator advertises.
- **Cross-tile-invariant gap.** Compose-equivalent tiles
  (the Group G unit converter and the Group C duct sizer
  both convert CFM to m^3/s; the Group A wire ampacity and
  the Group A voltage drop both consume AWG; the Group F
  hose friction and the Group F pump discharge pressure
  both use NFA coefficients) must agree on the shared
  computation to within the floating-point rounding
  tolerance. The cross-tile-invariant tests prove the
  agreement.
- **Reviewer-signoff gap.** The v10 section I.3 audit trail
  records reviewer signoffs for catalog groups. The v14
  expansion adds a row for each active group A through Y,
  with the reviewer name, the review date, and the fixture
  covered. The signoff is renewed on the v6 quarterly
  cadence; the [docs/profession-overrides.md](../docs/profession-overrides.md)
  pattern records the renewal clause.

v14 does not change the calculator output for any tile that
is already correct. v14 may change the calculator output for
a tile that is incorrect; every such change ships with a
CHANGELOG entry that names the tile, the prior output, the
corrected output, and the published source the correction
references. Per the v10 section F change-log discipline the
correction is dated, attributed, and recorded.

## 3. Hard limits unchanged

Every spec-level hard limit from prior specs continues
unchanged. The limits most likely to be tested by the v14
work are restated:

- No new third-party dependencies. The cross-check tests
  use Node's built-in test runner; the lints are plain
  ESM scripts. No symbolic-math library, no CAS, no
  third-party assertion framework.
- No runtime change to any calc-*.js module unless a
  cross-check fails and a transcription error is the
  cause. Optimization, refactoring, and "clean-up" passes
  are out of scope for v14; v14 is an audit pass.
- No new storage keys, no new fetch origins. The audit
  artifacts are static files in the repository.
- No new spec-v13 shell content. v14 does not change
  shell HTML, JSON-LD, sitemap, or canonical posture.

## 4. Motivation

Three motivations, each independently sufficient:

- **The professional's question is "is this answer right".**
  A site that returns a number a professional will use to
  size a feeder, set a pump pressure, dose a drug, or load
  a truck owes the professional an answer that has been
  cross-checked against an independent source. The site's
  posture (spec.md section 1: "a calm, fast, ad-free,
  account-free, ever-free reference for the trades and the
  professions adjacent to them") is the posture of a
  public utility, and a public utility is held to a
  correctness standard, not to a "the unit tests pass"
  standard.
- **The catalog has grown faster than the verification
  surface.** v1 shipped 64 tiles with a first-principles
  verification suite that cross-checked seven canonical
  results. v12 shipped 385 tiles with the same seven
  cross-checks. The scaling between catalog growth and
  verification coverage has been linear in catalog size
  and constant in verification, which is not a scaling. v14
  restores linearity: one cross-check per tile.
- **v13 made the site discoverable.** v13's shells put
  the catalog in front of a professional who has never
  heard of the site, by way of a search query. That
  professional has no prior trust in the site, no prior
  word-of-mouth recommendation, no founding-circle
  context. The first calculation that professional runs
  has to be right. v14 is the work that makes the first
  calculation right.

## 5. Phase A - Catalog the formula corpus

### 5.1 Per-function row

For every exported function in pure-math.js and every
calculator function in the calc-*.js modules, the audit
pass adds one row to [docs/derivations.md](../docs/derivations.md)
under a new section "Function corpus (v14)". The row
carries:

- **Function name** (the exported symbol).
- **Module** (the source file).
- **Inputs**: each input's name, unit, and admissible
  domain (e.g., `length_m: meters, > 0; awg: AWG string,
  in {18..4/0}`).
- **Output**: the returned quantity's name and unit.
- **Expression**: the closed-form expression the function
  implements, in plain ASCII. Greek letters spelled out
  (alpha, rho). No LaTeX, no MathML, no rendering surface.
- **Citation**: the source-stamp string from
  [../citations.js](../citations.js), or a derivation row
  in derivations.md if the function is a derived
  combination of cited primitives.
- **Worked-example fixture**: the input vector and the
  expected output, sourced from an independent published
  worked example. The fixture also lives in
  [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json)
  per the v10 section C convention.
- **Tolerance**: the absolute or relative tolerance the
  cross-check uses. The tolerance is justified per row
  (e.g., "5 percent: the published table is rounded to
  three significant figures and the calculator returns
  five").

### 5.2 Corpus tooling

The corpus rows are emitted by `scripts/build-corpus.mjs`,
a new build-time-only script. The script reads the
calc-*.js modules, extracts every exported function name,
walks each function's parameter list and JSDoc-style
comment block, and writes the rows to
docs/derivations.md under the "Function corpus (v14)"
heading. The script is idempotent: running it twice
produces the same output bytes. The script is wired into
`npm run lint` so the corpus stays in sync with the
calculator modules.

The corpus is a documentation artifact, not a runtime
artifact. The calc-*.js modules continue to be the source
of truth for the executable code; the corpus is a
mechanically-extracted index.

### 5.3 What the corpus does not do

The corpus does not include:

- Reference-only tiles (e.g., the Y.12 periodic table, the
  H.5 knot reference, the U.6 body condition score
  reference). Reference tiles ship a lookup table, not a
  formula, and the cross-check for a reference tile is
  the v6 source-stamp recheck, not a calculation cross-
  check.
- Composed meta-tiles (Job Estimate Roll-Up, Material
  Order List, Job Pack). These consume per-tile outputs
  and aggregate them; their correctness derives from the
  per-tile correctness. The cross-check is "the
  aggregation arithmetic is correct" and is a single test
  per meta-tile.
- The platform affordances (theme toggle, search,
  pinning, hash routing, service worker). These are not
  calculators; they are tested by their own test files.

## 6. Phase B - Cross-validation against published worked examples

### 6.1 One independent fixture per calculator

For every calculator function in the corpus, a new test
in `test/unit/cross-validation.test.js` calls the
function with the corpus fixture's input vector and
asserts the output is within the corpus row's tolerance
of the published expected value.

The published source is named in the fixture. The source
is one of:

- A code-body worked example (NEC handbook, IPC handbook,
  ASHRAE handbook).
- A textbook (Cameron Hydraulic Data, Marks' Standard
  Handbook, the IFSTA Pumping Apparatus textbook).
- A manufacturer-published reference table (Mike Holt's
  NEC question book, the IICRC S500 reference card).
- A government-published value (NIST CODATA, USGS, FRED).
- A hand calculation traceable to a NIST-published
  constant.

The fixture name on disk includes the source short-name
and the page or section reference, so a reader of
test/fixtures/worked-examples.json can verify the input-
and-output pair against the published page.

### 6.2 Sources are independent of the calculator's primary citation

The cross-check is meaningful only if the published
worked example is independently derived from the
calculator's primary citation. A cross-check against the
same handbook's worked example for a formula whose
coefficients were transcribed from the same handbook
proves only that the transcription is internally
consistent, not that the formula's transcription is
correct. The fixture's source is therefore selected to
be one independent step away: if the calculator cites
NFPA 1962, the cross-check uses an IFSTA worked
example; if the calculator cites IRS 2024 mileage, the
cross-check uses a published year-over-year reconciliation
in a CPA-trade-press article (a Journal of Accountancy
piece, a tax-software vendor's release notes); if the
calculator cites NIST CODATA, the cross-check uses a
textbook problem that quotes the same constant from a
prior NIST edition (the constant has been stable for the
relevant figures).

### 6.3 Tolerance bands

The tolerance per row is the wider of:

- The published source's stated rounding (e.g., a code-
  body table rounded to three significant figures
  permits a 0.5 percent tolerance on the third figure).
- The first-principles convergence tolerance of the
  underlying physics (e.g., Hazen-Williams is empirically
  valid to ~25 percent against measured pipe data; the
  cross-check tolerance is 25 percent against any
  published value).
- The numerical-stability floor of the underlying method
  (e.g., Colebrook converges to a fixed point within
  1e-9 in IEEE 754 double; the cross-check tolerance is
  1e-6 against a Moody-chart value, since the chart is
  the source of the loss).

The tolerance is stated per row in
docs/derivations.md and per fixture in
test/fixtures/worked-examples.json. A cross-check that
requires a wider tolerance than the floor is permitted
but the row carries a justification note.

### 6.4 Cross-check coverage gate

`scripts/check-cross-validation.mjs` walks the corpus
and the worked-examples fixture, and fails the build on:

- A corpus row that has no fixture.
- A fixture that has no corpus row.
- A corpus row whose tolerance is wider than the
  per-group ceiling (Group A through G: 5 percent; Group
  J through V: 10 percent; Group W: 5 percent; Group X
  and Y: 10 percent) without a justification note.
- A test that does not call the function the row names.

The lint is wired into `npm run lint`.

## 7. Phase C - Dimensional analysis lint

### 7.1 Per-function dimension annotation

Every calculator function in pure-math.js and the
calc-*.js modules carries a one-line dimension
annotation in a leading comment:

```
// dims: in { length_m: L, current_A: I, ambient_C: T }
//        out: voltage_drop_V: V
```

The annotation names each input's physical dimension
using the SI base-unit short codes (L, M, T, I, theta-as-
T, N, J). Derived dimensions are written as products and
ratios in plain ASCII (`L^2 / T` for area-per-time).
Dimensionless inputs use the literal token `dimensionless`.

### 7.2 Dimensional-analysis lint

`scripts/check-dimensions.mjs` reads the annotations,
walks the expression in the corpus row, and asserts the
expression's left-hand side and right-hand side have the
same dimension. The lint is conservative: it does not
attempt to verify floating-point math; it verifies that
the dimensional skeleton of the expression matches the
declared output dimension.

The lint catches:

- A coefficient with a non-dimensionless unit applied to
  a dimensionless input.
- An input declared in feet that is multiplied by a
  coefficient calibrated in meters.
- An output declared in PSI that is computed from a
  feet-of-head term without an explicit conversion
  coefficient.

The lint is wired into `npm run lint`.

### 7.3 Unit-conversion crosswalk

The Group G unit converter (utility 59) is the canonical
unit-conversion table. The lint asserts that every unit-
conversion coefficient used in any calc-*.js module is
present in the Group G crosswalk, with the same value to
twelve significant figures. This catches the case where
a local calculator transcribed a feet-per-meter constant
with a typo while the Group G table is correct.

## 8. Phase D - Bounds and edge cases

### 8.1 Documented domain per function

Every corpus row names the input domain. The bounds
fuzzer generates inputs at:

- The lower bound (zero, the minimum admissible value).
- The lower bound minus epsilon (to assert the function
  rejects out-of-domain input, not returns a wrong
  value).
- The lower bound plus epsilon (to assert the function
  returns a sensible value at the regime edge).
- The midpoint of the domain.
- The upper bound minus epsilon.
- The upper bound (the maximum admissible value).
- The upper bound plus epsilon (to assert the function
  rejects).
- Any documented regime transition (e.g., laminar-to-
  turbulent in Darcy-Weisbach; saturation pressure in
  refrigerant P-T; the high-altitude regime in density
  altitude).

### 8.2 Sensible-result assertion

At every generated input, the test asserts:

- The output is a finite number (not NaN, not Infinity).
- The output's sign matches the corpus row's sign
  declaration.
- The output's magnitude is within the corpus row's
  magnitude band (a sanity check; the magnitude band
  is two orders of magnitude wider than the published
  result, so a one-decimal-place typo in a coefficient
  is caught).

### 8.3 Rejection-path coverage

The lint asserts that every documented out-of-domain
input throws a named error or returns a documented
sentinel. The site's convention is to throw with a
message naming the violated bound (e.g., "Invalid AWG:
40"). A function that silently clamps out-of-domain
inputs is permitted only when the clamp is documented
in the row.

### 8.4 The bounds fuzzer

`scripts/check-bounds.mjs` walks the corpus and emits
one Node-built-in test per row that exercises the eight
input vectors. The lint is wired into `npm test`.

## 9. Phase E - Numerical stability

### 9.1 Iterative methods

The site uses iterative methods in:

- Darcy-Weisbach friction-factor solution via Colebrook
  iteration (pure-math.js).
- Psychrometric inverse for dew point given dry-bulb +
  RH (pure-math.js).
- Refrigerant P-T linear interpolation (pure-math.js;
  the interpolation is linear, but the table-edge
  selection is a branch).
- Simplified Manual J load Web Worker iteration over
  zone temperatures (manual-j-worker.js).
- Group F pump discharge pressure with elevation loop
  (calc-fire.js).
- Group W density altitude inversion (calc-aviation.js).

For each, the numerical-stability test exercises:

- Convergence at five representative inputs across the
  domain. The iteration's residual is asserted under
  1e-9 within the documented iteration cap.
- A pathological input known to cause divergence in
  similar implementations (e.g., relative roughness
  approaching zero in Colebrook; saturation in
  psychrometrics; the Mach-1 region in density
  altitude). The test asserts the implementation
  handles the case (converges, returns a documented
  sentinel, or throws a named error; the test
  documents which).
- A NaN-poisoning input (NaN passed in for an optional
  parameter). The test asserts the function either
  rejects the input or returns NaN consistently (does
  not silently propagate a NaN into a downstream tile).

### 9.2 Floating-point invariants

The numerical-stability test asserts:

- The output is bit-stable across Node 20, Node 22, and
  the latest Node LTS at v14 close. The test fixture
  pins the IEEE 754 double bit pattern of the output;
  any drift between Node versions surfaces as a test
  failure.
- The output is deterministic: calling the function
  twice with the same input returns the same bit
  pattern. (This is the trivial case for pure functions;
  the test exists to catch a future refactor that
  introduces a Math.random or a Date.now into a
  calculator.)

### 9.3 Order of operations

For expressions with multiple terms, the test asserts
the output is invariant under associative reordering
within the floating-point tolerance. Where reordering
changes the output, the row carries a note naming the
preferred order and the reason (e.g., "Kahan summation
order: term order matters to the seventh figure; the
implementation uses the published handbook's order").

## 10. Phase F - Cross-tile invariants

### 10.1 Shared computations

Where two or more tiles share a computation, the
invariant tests assert agreement. The catalog includes:

- AWG-to-cmils: Group A wire ampacity, Group A voltage
  drop, Group A conductor resistance, Group A motor
  FLA. All four use the same awgAreaCmils primitive
  from pure-math.js; the invariant asserts the
  primitive's result is identical at every AWG.
- CFM-to-m^3/s: Group C duct sizing, Group G unit
  converter, Group D containment air balance. All use
  the same coefficient; the invariant asserts.
- NFA hose-friction coefficient: Group F hose friction,
  Group F pump discharge pressure, Group F standpipe
  friction. All use the same per-diameter coefficient
  table from data/fire/; the invariant asserts.
- Psi-to-feet-of-head water: Group B static pressure,
  Group C NPSHa, Group L irrigation. All use the same
  conversion (1 psi = 2.31 ft of head for water at 60 F);
  the invariant asserts.
- IRS standard mileage: Group P per-diem, Group R
  accounting mileage, Group J trucking owner-operator
  expense. All use the same bundled IRS rate per the v6
  source-stamp; the invariant asserts.

### 10.2 Round-trip identities

For every conversion that has a documented inverse, the
round-trip test asserts f(g(x)) == x to within the
floating-point tolerance:

- AWG-to-mm^2 and back.
- F-to-C and back.
- PSI-to-kPa and back.
- HP-to-kW and back.
- gallons-to-liters and back.
- feet-to-meters and back.
- pound-mass-to-kilogram and back.

The round-trip residual is asserted under 1e-12 absolute
for SI-base conversions and under 1e-9 relative for
empirical conversions (Hazen-Williams, refrigerant P-T,
Manual J).

### 10.3 Monotonicity

Where the calculator's output is monotonic in an input
(voltage drop is monotonic in length, conductor
resistance is monotonic in temperature, hose friction
is monotonic in flow), the test asserts monotonicity
over a sweep. A non-monotonic result for a monotonic
relationship is a transcription error.

## 11. Phase G - Citation-to-formula round-trip

### 11.1 The citation is the contract

The v6 section 3 reference block carries the publisher,
the edition, the section, and the verified-on date for
every tile. v14 asserts that the formula the calculator
implements matches the published expression at the cited
section. The assertion is a written row in
docs/derivations.md, not a programmatic check; the row
is reviewed by the per-group reviewer (Phase H) and
signed off.

### 11.2 Reverse citation index

`scripts/check-citation-coverage.mjs` (an extension of
the existing `check-citation-freshness.mjs`) builds the
inverse map: for every cited section in citations.js,
list every tile that cites it. A section that no tile
cites is removed (the v6 close-out already does this; v14
re-asserts on every build). A tile whose cited section
has been deprecated or superseded triggers a v6 recheck
log entry per docs/v6-audit.md.

### 11.3 Edition rollovers

When a published source ships a new edition (e.g., NEC
2026 lands; ASHRAE 62.1-2024 lands), the v6 quarterly
recheck records the change. v14 asserts that for every
formula whose primary citation is the rolled edition,
the cross-check fixture is updated to the new edition's
worked example, or the row is annotated with the reason
the old fixture remains correct (the formula is
unchanged across editions; the only diff is a clarifying
note).

## 12. Phase H - Per-group reviewer signoff

### 12.1 Signoff row per group

For each active group A through Y, the v14 close-out
appends one row to [docs/audit-trail.md](../docs/audit-trail.md)
recording:

- The group letter and name.
- The reviewer's name and credential (PE for the
  engineering groups, RN / MD / paramedic for V EMS,
  ATP / CFI for W Pilots, CPA for R Accounting, JD for
  S Legal, vet for U Veterinary, teacher for Y Educators).
- The review date.
- The fixture(s) the reviewer cross-checked.
- The next-renewal date (v6 quarterly cadence: 90 days
  from review).
- Any open items the review surfaced (each item gets a
  CHANGELOG entry as it is addressed).

### 12.2 The review the reviewer performs

The reviewer reads:

- The tile list for the group (from the TOOLS array in
  app.js).
- The corpus rows for the group (from docs/derivations.md).
- The worked-example fixtures for the group (from
  test/fixtures/worked-examples.json).
- The citations for the group (from citations.js).

The reviewer signs off when each tile's formula matches
the cited expression at the cited section, each fixture's
expected value matches an independent published source,
and each tolerance is justified.

The reviewer's signoff is recorded in
docs/audit-trail.md per the v10 section I.3 pattern. The
[docs/profession-overrides.md](../docs/profession-overrides.md)
clause that lapsed reviews lapse the override continues
in force for any tile whose override depends on the
review.

### 12.3 Signoff-renewal cadence

Every group's signoff is renewed quarterly. The renewal
is a re-read of the same materials; if no change has
landed in the quarter the renewal is a one-line "no
change observed" entry. If a change has landed the
renewal cross-checks the change.

## 13. Phase I - Documentation reconciliation

### 13.1 docs/derivations.md per-tile coverage

Every tile in the TOOLS array has a derivation row in
docs/derivations.md that names the formula, the
citation, and the worked-example fixture. The reverse
index in `scripts/check-discoverability.mjs` is extended
to assert the coverage. A tile without a derivation row
fails the build.

Reference tiles (the lookup-table tiles per section 5.3)
get a row that names the table source and the recheck
cadence, not a formula. The row's "fixture" is the
table-edition recheck row in docs/v6-audit.md.

### 13.2 docs/correctness.md (new)

A new document, docs/correctness.md, records the v14
posture: the per-tile cross-check, the dimensional-
analysis lint, the bounds fuzzer, the numerical-stability
tests, the cross-tile invariants, and the per-group
signoff. The document is a contributor reference; it
explains how a new tile lands with a corpus row, a
fixture, and a signoff renewal.

### 13.3 docs/audit-trail.md extension

The audit-trail document already records reviewer
signoffs for catalog groups U Veterinary and V EMS per
spec-v12 section 13.1. v14 extends the record to every
active group. The schema is unchanged; the row count
grows from two to twenty-four.

### 13.4 docs/launch-checklist.md v14 section

A new "v0.14 (spec-v14 correctness)" section in
docs/launch-checklist.md records the v14 launch gates
per section 17 below.

### 13.5 README.md update

The README adds a "Correctness posture" subsection
naming the corpus, the cross-check, the lints, and the
signoff cadence. The subsection cross-references
docs/correctness.md.

## 14. Tolerance posture

### 14.1 Default tolerance per group

The default cross-check tolerance per group, used when a
fixture does not state its own:

- Group A Electrical: 5 percent. The underlying physics
  is exact; the published code-body tables are rounded.
- Group B Plumbing: 25 percent against any Hazen-
  Williams value (the formula is empirical to that
  band). 1 percent for Darcy-Weisbach with stated
  roughness.
- Group C HVAC: 5 percent for psychrometrics and duct
  sizing; 10 percent for simplified Manual J (the
  estimator is calibrated against ACCA Manual J 8th
  for typical envelopes and carries a stated 10 percent
  band).
- Group D Restoration: 10 percent against IICRC S500
  field-method values; 5 percent against psychrometric
  primitives.
- Group E Construction: 1 percent for geometry; 20
  percent for lumber spans against published-equivalent
  values (the published tables include strength-class
  factors the first-principles result does not).
- Group F Fire-ground: 5 percent against NFA worked
  examples.
- Group G Cross-trade: 1e-9 relative for unit
  conversions; 0.01 percent for the loan-payment and
  ROI calculators.
- Group H References: not applicable; reference tiles
  use the v6 recheck cadence.
- Group J Trucking: 5 percent against FMCSA / FBF
  worked examples.
- Group K Mechanic: 5 percent against the textbook
  worked examples for aircraft weight and balance,
  bolt stretch, gearing.
- Group L Agriculture: 10 percent against extension-
  service worked examples.
- Group M Water-and-wastewater: 5 percent against
  standard-handbook values for the pounds formula,
  detention time, SRT.
- Group N Stage: 5 percent for truss capacity (per
  manufacturer datasheet); 0.1 dB SPL for distance-
  attenuation.
- Group O Kitchen: 1 percent for recipe scaling and
  yield; 0.5 degree F for FDA cooling-curve checkpoints.
- Group P Field: 1 percent for haversine; 5 percent for
  pacing and slope; 0.1 degree for magnetic-declination
  WMM lookup.
- Group Q Historical: not applicable; reference shards.
- Group R Accounting: 1 cent absolute for currency
  outputs, 0.01 percent for rate-based outputs.
- Group S Legal: not applicable; statutory plain-English
  tiles, no numerical cross-check needed.
- Group T Lab: 5 percent against handbook worked
  examples for dilutions, Beer-Lambert, pH.
- Group U Veterinary: 5 percent against AAHA / Plumb's
  Veterinary Drug Handbook published doses (subject to
  the species-override clause).
- Group V EMS: 5 percent against AHA / ACLS protocol
  worked examples (subject to the medical-director
  override clause).
- Group W Pilots: 5 percent against the AFM / POH
  worked example for representative aircraft; 0.1 degree
  for density-altitude inversion.
- Group X Real Estate: 1 cent absolute for currency;
  0.01 percent for rate-based outputs.
- Group Y Educators: 5 percent against published
  textbook problems.

### 14.2 Wider-than-default justifications

A fixture that requires a wider tolerance than the group
default carries a justification note in the corpus row.
The note names the reason (the source's stated
rounding, the empirical bound, the published table's
significant-figure floor). The lint
(scripts/check-cross-validation.mjs) reads the note and
allows the wider tolerance only when the note is
present.

### 14.3 The "match-to-the-last-digit" floor

For tiles whose primary citation is a NIST-traceable
constant (CODATA, NIST SP 811, the molar gas constant,
the Boltzmann constant, c), the cross-check fixture
matches the published value to the published number of
significant figures. The tolerance is "match exactly at
the published precision".

## 15. Out of scope

Each item is noted with the reason it stays out.

- **Symbolic-math libraries / CAS**: not used. The
  dimensional-analysis lint is a string-based comparison
  against per-function annotations, not a symbolic
  computation. A CAS dependency would violate the no-
  third-party posture and is not necessary for the
  audit.
- **Property-based testing frameworks** (fast-check,
  jsverify): not adopted. The bounds fuzzer is a
  deterministic enumeration of named input vectors per
  corpus row; the value is in the per-row review, not
  in random exploration.
- **A statistical model of "calculator quality"**: not
  built. The site's posture is binary: every tile is
  correct to the stated tolerance against its published
  source, or it is fixed. There is no scoring,
  averaging, or aggregating.
- **A formal-verification pass over the calc-*.js
  modules**: not done. Formal verification of
  floating-point arithmetic is open research; the v14
  posture is "an independent published worked example,
  cross-checked at one input, with a per-group
  reviewer signoff", which is the standard practice in
  the trades and the engineering professions.
- **A unit-test-coverage percentage target**: not
  adopted. The v14 coverage is "one cross-check fixture
  per calculator function", which is a count, not a
  percentage. A coverage target would invite
  meaningless-test growth.
- **A continuous-correctness service / webhook**: not
  built. The v14 cross-checks are static fixtures in
  the repository, run by the existing test runner.
  Continuous-correctness against a live external source
  would violate the no-third-party-fetch posture.
- **Multi-language documentation of the corpus**: not
  adopted. The corpus is in English per the US-only
  audience posture.
- **A change-impact analysis tool for cross-tile
  invariants**: not built. The cross-tile invariants
  run on every test invocation; a change that breaks an
  invariant fails the test.
- **Retroactive recompute of every calculator's
  historical output**: not done. The audit cross-checks
  current outputs against current sources. Historical
  outputs are recorded only in the git history.

## 16. Build, test, deployment

### 16.1 Phase order

The phases ship in this order, gated as in v10 section F
and v12 section 14.1:

1. **Phase A (formula corpus)** lands first. The corpus
   rows in docs/derivations.md are emitted by
   scripts/build-corpus.mjs; the lint asserts
   one row per function.
2. **Phase B (cross-validation tests)** lands next: one
   test per corpus row in test/unit/cross-validation.test.js
   against a fixture in test/fixtures/worked-examples.json.
3. **Phase C (dimensional-analysis lint)** lands after
   the corpus is stable.
4. **Phase D (bounds fuzzer)** lands after the corpus
   and the per-function domain annotations are in
   place.
5. **Phase E (numerical-stability tests)** lands per
   iterative method.
6. **Phase F (cross-tile invariants)** lands last among
   the test phases.
7. **Phase G (citation-to-formula round-trip)** is a
   review pass on the docs and is performed
   incrementally with Phases A through F.
8. **Phase H (per-group reviewer signoff)** is the
   close-out: one signoff row per group in
   docs/audit-trail.md.
9. **Phase I (documentation reconciliation)** lands
   throughout and is finalized at close.

### 16.2 Per-phase test requirements

- Phase A: a lint that asserts every exported
  calculator function has a corpus row.
- Phase B: a test per corpus row; the test fails if
  the calculator's output is outside the row's
  tolerance.
- Phase C: a lint that asserts every annotation is
  parseable and every expression's dimensions balance.
- Phase D: a lint-driven test per row that exercises
  the eight bound vectors.
- Phase E: a test per iterative method that covers
  convergence, pathology, and bit-stability.
- Phase F: an invariant test per shared computation
  and per round-trip pair.
- Phase G: a recorded review note per group.
- Phase H: a row per group in docs/audit-trail.md.
- Phase I: documentation rows per section 13.

### 16.3 Payload budgets

v14 does not change the home-view payload, the per-
tile shell payload, the group shell payload, the
sitemap size, or the data-shard size. The corpus rows
add documentation bytes (under 250 KB to docs/derivations.md
at the v12 catalog count); the test fixtures add
under 50 KB to test/fixtures/worked-examples.json.
Tests are not shipped to the runtime; the
test/ directory is excluded from dist/ per the existing
build pipeline.

### 16.4 npm scripts

v14 adds the following scripts to package.json:

- `audit:corpus`: runs scripts/build-corpus.mjs and
  fails on a docs/derivations.md diff (the corpus
  should already be regenerated).
- `audit:dimensions`: runs scripts/check-dimensions.mjs.
- `audit:bounds`: runs scripts/check-bounds.mjs.
- `audit:cross-validation`: runs the
  test/unit/cross-validation.test.js subset.
- `audit:numerical`: runs the
  test/unit/numerical-stability.test.js subset.
- `audit:invariants`: runs the
  test/unit/cross-tile-invariants.test.js subset.

All six are wired into the existing `npm run audit`
gate, so the pre-PR audit covers the new ground.

## 17. Launch checklist (v14-specific)

In addition to the prior-spec gates:

1. Every exported calculator function in pure-math.js
   and the calc-*.js modules has a corpus row in
   docs/derivations.md.
2. Every corpus row has a worked-example fixture in
   test/fixtures/worked-examples.json and a passing
   cross-validation test.
3. Every fixture is sourced from a published worked
   example, named in the fixture, independent of the
   calculator's primary citation.
4. Every calculator function has a dimension
   annotation that parses and balances.
5. Every calculator function passes the bounds fuzzer
   at the eight documented input vectors.
6. Every iterative method passes the numerical-
   stability tests.
7. Every shared computation passes the cross-tile
   invariant tests.
8. Every active group A through Y has a reviewer
   signoff row in docs/audit-trail.md with a date
   within the prior quarter and a next-renewal date.
9. docs/correctness.md exists and is current.
10. docs/derivations.md has one row per tile in the
    TOOLS array; the build asserts coverage.
11. CHANGELOG carries one stanza per phase as it ships,
    with a per-tile correction row for any tile whose
    output changed during the audit.

## 18. Operations and ongoing maintenance

### 18.1 New tile flow

When a new tile lands in a future spec:

1. The TOOLS entry, the calc-*.js function, the
   per-tile meta in tile-meta.js, the citation in
   citations.js, the worked-example fixture in
   test/fixtures/worked-examples.json, and the
   derivation row in docs/derivations.md all land in
   the same change.
2. The cross-validation test passes against the
   fixture before the change is merged.
3. The dimensional-analysis lint passes.
4. The bounds fuzzer passes at the eight input
   vectors.
5. The signoff for the tile's group is updated to
   include the new tile in its fixture coverage; the
   signoff date is updated.
6. The spec-v13 shell regenerates automatically per
   the v13 build pipeline.

### 18.2 Tile retirement

When a tile is retired in a future spec:

1. The TOOLS entry is removed.
2. The corpus row in docs/derivations.md is removed.
3. The fixture in test/fixtures/worked-examples.json
   is removed.
4. The shell at dist/tools/<id>/index.html is no
   longer regenerated.
5. The sitemap regenerates.
6. The CHANGELOG records the retirement and the date.

### 18.3 Quarterly signoff renewal

Per Phase H, every group's reviewer signoff is renewed
quarterly. The renewal is a one-row append to
docs/audit-trail.md. A lapsed signoff (more than 100
days since the prior signoff date) triggers a build
warning, not a build failure; a signoff lapse
exceeding 180 days fails the audit.

### 18.4 Source-edition rollover

When a published source ships a new edition, the v6
recheck records the change. v14 asserts the cross-
check fixture is updated to the new edition's worked
example, or the row carries a "no change" annotation.
The audit-trail records the rollover and the next-
recheck date.

## 19. Closing note

v11 made the site smaller. v12 made the site broader.
v13 made the site findable. v14 makes the site right.

The site's contract with the professional is that the
answer it returns is the answer the source authorizes.
v14 is the work that proves the contract, end to end,
across the full catalog, with an independent published
cross-check for every function, a dimensional-analysis
lint, a bounds fuzzer, a numerical-stability test, a
cross-tile invariant test, and a per-group reviewer
signoff. The work is durable: it regenerates on every
build, it adds zero runtime cost, it adds no new third-
party dependency, and it does not change the site's
posture toward the visitor.

Build it the way the rest was built. One tile, one
formula, one derivation, one fixture, one cross-check,
one tolerance, one signoff. Then get out of the way
and let the calculator return the answer the
professional came for, and let the professional trust
the answer because the audit is in the repository and
the reviewer is named.

The site is a public utility. Public utilities are
findable, and the numbers they return are right. v13
made this one findable; v14 is the work that makes the
numbers right, with the receipts.
