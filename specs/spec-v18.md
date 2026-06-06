# roughlogic.com Specification v18 — Public-Surface Hardening (Stress-Test and Fix)

> **Implementation status: OPEN (opened 2026-06-05).** v18 is the first
> of a three-spec set (v18 hardening, v19 citation integrity, v20 catalog
> expansion) authored together. v18 ships **no new tiles** and changes
> **no correct output**. It is a defect-removal pass over every
> public-facing tool, function, and render path the site already exposes.
> Every constraint from spec.md through spec-v17.md continues unchanged:
> no new groups, no new third-party dependencies, no new licenses, no new
> storage keys, no telemetry, no AI, no phone-home, US standards only. The
> package version stays 0.16.0 (or whatever v17 has stamped) while v18 is
> open and stamps **0.18.0** at the close of v18.
>
> v18 inherits everything from spec.md, spec-v2.md … spec-v17.md. Where a
> prior spec already mandates a gate (the v14 §8.4 bounds-fuzzer, the v10
> §5 worked-example registry, the v13 §G shell audit), v18 does not
> replace it — it raises it to a stricter invariant and closes the
> escape hatches that let a malformed result reach the user.
>
> **Landed (2026-06-05): hardening pass 1 — the contract harness and the
> crasher sweep.** The two §6 gates are built and wired: `check-tile-contract.mjs`
> (the §5.1/§5.2 contract sweep over all 442 registered compute functions,
> run inside a worker with a heap cap and a wall-clock timeout so a
> regression that reintroduces an unbounded loop/allocation surfaces as a
> gate failure rather than an infinite CI hang — added to `npm run lint`)
> and `check-shell-mobile.mjs` (promoted from the temporary auditor to a
> standing CI gate per §4). The sweep found and the pass removed **seven
> Tier-1 crashers** — inputs that hung, exhausted memory, or threw instead
> of returning `{error}`: `upgrade-roi`, `loan-amortization`,
> `serial-dilution`, `hip-valley-rafter` (unbounded loop/array on a
> non-finite count), `macrs`, `court-deadline` (a `NaN`/`Infinity` index
> threw), and `solar-times` (a non-finite tz offset spun the minute-wrap
> loop). Each landed with a red-then-green regression test in
> `test/unit/tile-contract.test.js`. The COMPUTE_MAP registry was extracted
> to a shared `test/fixtures/compute-map.js` so the runner and the contract
> sweep share one source of truth. `check-shell-mobile` also caught a
> genuine page-level horizontal-scroll defect (the client-rendered
> changelog overflowed 320px on long file-path/URL tokens), now fixed.
> Per §6 the contract gate enters service in the **ratchet posture**: its
> **Tier-1 (crasher) backlog is 0 and hard-fails**, while the lower-severity
> **Tier-2 perturbed-input non-finite-leak backlog (889 entries) is
> grandfathered** in `test/fixtures/contract-baseline.json` and shrinks
> module-by-module per §7 (the gate fails on any new leak). Package stamps
> **0.18.0**. Remaining: the per-module Tier-2 sweep (§7) and the §5.4
> jsdom render assertions.

> Foreword, in the voice of a maintainer who has watched the catalog grow
> from a dozen tiles to four hundred and thirty-seven and knows exactly
> what happens to a calculator the day it returns `NaN` to a working
> professional who trusted it. The paramedic at 3 AM does not file a bug
> report. The realtor in the parking lot does not email support — there is
> no support, by design. They close the tab, they do the arithmetic on
> paper, and they never come back. A wrong answer is worse than a paywall,
> because a paywall is honest about what it is. v18 is the spec that says:
> before we add the fifty-first new tile, we make the four hundred and
> thirty-seventh existing one incapable of lying. Every tile is a contract.
> v18 writes the contract down and makes the test suite enforce it.

Repository: github.com/clay-good/roughlogic.com

US standards only.

## 1. Scope

v18 covers the **entire public surface** — everything a user can reach,
type into, or copy out of:

1. **Every exported `compute*` / solver function** in `pure-math.js` and
   all twenty-two `calc-*.js` modules (calc-accounting.js through
   calc-water.js). These are the functions the function corpus
   (`docs/derivations.md` `## Function corpus (v14)`) already enumerates.
2. **Every renderer** that turns a function result into DOM (the
   `*_RENDERERS` maps and the shared render path in `app.js`).
3. **The shared input layer** — `ui-fields.js`, `ui-validity.js`,
   numeric parsing, unit toggles, CSV/series paste, and hash-state
   round-tripping (`hash-state.js`).
4. **The output/clipboard layer** — `clipboard.js`, `cost-output.js`,
   and `citations.js`'s `buildAnswerWithReference` plain-text export.
5. **The prerendered static shells** at `dist/tools/<id>/` and
   `dist/groups/<slug>/` — a separate, zero-JS rendering surface with no
   runtime guard until v18 wires one (see §6).

v18 does **not** touch business logic that is already correct. The test
in §3.4 is the discriminator: a change is in scope only if it removes a
way the tool can produce a wrong, non-finite, or misleading result, or a
way a correct result can fail to render.

## 2. The tile contract (universal output invariants)

Every public solver function MUST satisfy the following invariants for
**all** inputs, not merely the inputs its worked example exercises. These
are the acceptance criteria the §5 stress harness asserts.

**C-1 Totality.** The function returns either (a) a result object whose
every numeric field is a finite `Number` (never `NaN`, `Infinity`,
`-Infinity`, `null`, or `undefined`), or (b) an `{ error: string }`
object with a human-readable, non-empty message. It never throws. It
never returns a partially-populated object that mixes a real field with a
`NaN` field.

**C-2 Purity.** The function is referentially transparent: identical
inputs yield identical outputs, and it mutates no module-level state, no
shared lookup table, and no argument object. Calling it twice in a row,
or interleaved with other tiles, never changes a result.

**C-3 Domain honesty.** Inputs outside the function's valid mathematical
domain (zero denominator, `sqrt`/`log` of a non-positive, an empty or
length-1 series where ≥2 is required, a non-numeric where a number is
required) return `{ error }`, not a silent `NaN` or a fabricated zero.

**C-4 Unit-toggle consistency.** Where a tile offers a unit toggle
(in/cm, °F/°C, gph/lb·hr⁻¹, mg/mcg, M/F, GPM/MGD, lb/kg), the same
physical input expressed in either unit produces the same physical
output within the tile's declared tolerance. The toggle changes
presentation and parsing, never the underlying physics.

**C-5 Flag-threshold correctness.** Every edge-case / bounds flag fires
at exactly the documented value with the documented inclusivity. A flag
that should fire "above 60 min" fires at 60.0001 and not at 60.0; a flag
that should fire "at or below 35%" fires at 35.0. Off-by-one and
inclusive/exclusive confusion is a defect.

**C-6 Magnitude safety.** Inputs at the documented bounds and one order
of magnitude beyond them do not overflow, lose all precision, or produce
a non-finite intermediate. kcmil conductor sizes, million-bushel bins,
1000-row series, and 30-year amortizations all stay finite and
representable.

**C-7 Render faithfulness.** A finite result object renders without
producing `"NaN"`, `"undefined"`, `"Infinity"`, `"$NaN"`, or an empty
value cell in the DOM; an `{ error }` result renders the message, not a
blank tile or a thrown exception in the console.

## 3. Defect taxonomy (what the sweep hunts)

The per-module sweep (§7) classifies and fixes the following ten defect
classes. Each fix lands with a regression test that reproduces the defect
first (red), then passes (green), per the global CLAUDE.md goal-driven
discipline.

**D-1 Non-finite leakage.** A division by a user-zeroable denominator, a
`Math.sqrt`/`Math.log`/`Math.pow` with a domain-invalid argument, or a
`0/0` that reaches an output field. *Fix:* guard the denominator/domain
and return `{ error }` or a defined boundary value per C-1/C-3.

**D-2 Missing or weak input validation.** A `Number(x) || 0` that
silently turns a typo into a zero and computes a confident wrong answer;
a negative dimension, count, or rate accepted where only positives are
physical; an empty series accepted. *Fix:* validate at the boundary,
distinguishing "absent/optional" (defaulted) from "present but invalid"
(errored).

**D-3 Unit-toggle / conversion error.** A conversion factor applied once
too many or too few times; an in↔cm or °F↔°C path that diverges from its
sibling; a mg/mcg or per-min/per-hr dose toggle that drops a factor of
60 or 1000. *Fix:* single source of truth for each conversion; a C-4
round-trip test pairing both unit paths.

**D-4 Boundary-flag error.** A threshold flag using `>` where it should
use `>=`, or comparing against the wrong constant. *Fix:* assert the
exact trip point per C-5.

**D-5 Calendar / day-count error.** Off-by-one in inclusive-day
proration, an FRCP/closing day-count that miscounts the trigger day or a
weekend/holiday rollover, a leap-year February, a 30/360 vs Actual/365
divergence. *Fix:* a date-arithmetic test matrix crossing month ends,
year ends, leap days, and federal holidays.

**D-6 Order-of-magnitude / overflow.** Loss of precision or a non-finite
intermediate at large inputs (Welch df with huge n, amortization with a
360-month exponent, a `pow(1+r, n)` that overflows). *Fix:* reorder the
arithmetic for numerical stability; bound-check inputs at the documented
ceiling.

**D-7 Silent error swallowing.** A `try/catch` that returns a partial
object; an early `return {}` that renders as a blank tile; a lookup miss
that returns `undefined` instead of `{ error }`. *Fix:* make every
non-success path an explicit `{ error }`.

**D-8 Rounding / precision-masking.** Display rounding applied before a
comparison so a sign error hides; a tolerance looser than the source
justifies; a fixture rounded so coarsely it would pass a wrong
implementation. *Fix:* round only at presentation; tighten tolerances to
the v14 §14.1 per-group ceilings; re-derive any suspect fixture from its
cited source.

**D-9 Mutation / shared-state.** A module-level array or object that a
function sorts, pushes to, or reassigns in place, so a second call sees
the first call's residue. *Fix:* clone-on-read or build fresh per call;
a C-2 double-invocation test.

**D-10 Locale / parse fragility.** A numeric field that rejects
`"1,500"` or `"$1,500"` or `" 12 "` when a real user would type it, or
that silently parses `"12ft"` as `12` and loses the intent. *Fix:*
normalize input parsing in the shared `ui-fields.js` layer with a tested
grammar; reject ambiguous input rather than guess.

## 4. In-flight working-tree changes folded into v18

At v18 open the working tree carries uncommitted edits to
`calc-realestate.js`, `citations.js`, and
`test/unit/calc-realestate.test.js`, plus a new untracked
`scripts/_shell-mobile-audit.mjs`. v18 adopts these explicitly:

- The `calc-realestate.js` / test edits are evaluated against the §2
  contract and the §3 taxonomy before they land; if they are an in-progress
  v17 tile, they complete under v17's gates and v18 simply inherits the
  hardened result. Nothing in v18 reverts them.
- `scripts/_shell-mobile-audit.mjs` (the temporary 320px page-level
  horizontal-scroll auditor) is **promoted** from a temporary script to a
  wired gate per §6. A horizontal-scrolling shell is a C-7 render defect
  on the most important viewport the site has (a phone in a parking lot),
  so it belongs in the standing gate set, not in a one-off.

## 5. Stress harness (how the contract is enforced)

v18 extends the existing v14 §8.4 bounds-fuzzer (`test/unit/bounds-fuzzer.test.js`)
from "every corpus function is exercised by eight vectors" to "every
corpus function is asserted against the §2 contract over a structured
input sweep." Concretely:

**5.1 Contract assertions.** For every corpus function, the harness
asserts C-1, C-2, and C-3 automatically: it feeds (a) the worked-example
inputs, (b) each input driven to its documented lower and upper bound,
(c) each input driven one order of magnitude past each bound, (d) a zero
in every numerically-sensitive slot, (e) a negative in every slot, (f) a
`NaN`/`Infinity`/`""`/`"abc"` in every slot, and (g) the all-defaults
vector. Every returned object is checked: all numeric fields finite, or a
non-empty `{ error }`. No throw escapes.

**5.2 Purity assertion.** Each function is invoked twice per vector with
a deep-frozen input; the two results must deep-equal and the input must
be unmodified (catches D-9).

**5.3 Targeted invariant tests.** C-4 (unit round-trip), C-5 (flag trip
points), and D-5 (calendar matrix) are asserted per tile in the relevant
`calc-*.test.js`, since they require tile-specific knowledge the generic
sweep cannot synthesize. Each new tile contract test names the defect
class it guards.

**5.4 Render assertions.** A jsdom-level render test feeds each renderer
(a) a finite result and (b) an `{ error }` result and asserts the DOM
contains no `NaN`/`undefined`/`Infinity`/`$NaN` text and no thrown
exception (C-7). This reuses the existing renderer-wiring test
infrastructure (`test/unit/v8-renderer-wiring*.test.js`).

**5.5 No new runtime dependency.** The harness is `node --test` only,
consistent with spec-v13's deterministic-build limit. The 320px shell
audit (§6) already depends on the existing Playwright/Chromium dev
dependency; it adds none.

## 6. New and promoted gates

v18 adds the following to `npm run lint` / the CI gate set, each
graduating to fail-on-missing per the v14 §16 ratchet convention once
the sweep brings the catalog to 100% clean:

- **`check-tile-contract.mjs`** (new) — asserts the §5.1/§5.2 contract
  sweep ran and passed for every corpus function; fails on any
  non-finite leak, throw, or impurity. Companion to the existing
  `check-bounds.mjs` (which only asserts *coverage*, not the contract).
- **`check-shell-mobile.mjs`** (the promoted `_shell-mobile-audit.mjs`,
  renamed and de-temporary'd) — fails if any `dist/tools/<id>/`,
  `dist/groups/<slug>/`, `changelog.html`, or `/` shell horizontally
  scrolls at a 320px viewport. Wired after `build-shells.mjs` in the
  build/audit chain.

Both gates start in **report-only** mode for one commit (to surface the
full backlog), then graduate to **fail** once the backlog is cleared,
matching how every prior v14 gate graduated.

## 7. Per-module sweep order and acceptance

The sweep proceeds one module at a time, in descending order of public
traffic and surface area, so the highest-impact defects clear first.
Each module's sweep is its own commit (or small commit series) and lands
green before the next begins:

1. `pure-math.js` (shared; every statistical tile depends on it —
   `erf`, `gammainc`, `betainc`, `tcdf`, `chi2Cdf` get the C-6 numerical
   stress first).
2. The high-traffic trades core: `calc-electrical.js`,
   `calc-hvac.js`, `calc-plumbing.js`, `calc-construction.js`,
   `calc-fire.js`.
3. The finance/calendar surface most prone to D-5/D-8:
   `calc-realestate.js`, `calc-accounting.js`, `calc-legal.js`.
4. The allied-health surface where a wrong number carries the most
   weight: `calc-ems.js`, `calc-vet.js`, `calc-lab.js`.
5. The remainder: `calc-aviation.js`, `calc-edu.js`,
   `calc-agriculture.js`, `calc-water.js`, `calc-restoration.js`,
   `calc-trucking.js`, `calc-mechanic.js`, `calc-field.js`,
   `calc-stage.js`, `calc-kitchen.js`, `calc-cross.js`,
   `calc-references.js`, `calc-historical.js`.

**Acceptance per module:** (a) every corpus function in the module
passes the §5 contract sweep; (b) any defect found lands with a
red-then-green regression test naming its D-class; (c) no worked-example
fixture changes unless the fixture was itself wrong, in which case the
commit message cites the source page the corrected value comes from; (d)
`npm test` and `npm run lint` are green; (e) no correct output value
changed (verified by the unchanged-fixture set).

**Acceptance for v18 overall:** all twenty-two modules plus `pure-math.js`
pass; `check-tile-contract.mjs` and `check-shell-mobile.mjs` are green
and graduated to fail-on-missing; the catalog is unchanged at its v17
count; package stamps 0.18.0; the v18 stanza in
[../docs/audit-trail.md](../docs/audit-trail.md) records the defect count
found and fixed per module.

## 8. Explicitly out of scope for v18

- New tiles (those are v20).
- Citation content, freshness, and wrapping (those are v19; v18 fixes
  only the C-7 *rendering* of citations — overflow, `NaN` in an
  assumption value — not the citation text itself).
- Visual redesign, new CSS, new UI affordances. v18 changes behavior
  only where behavior was wrong.
- Any relaxation of an existing gate. v18 only tightens.

## 9. Closing note

A calculator earns trust one correct answer at a time and loses it with
one wrong one. The site has four hundred and thirty-seven tiles and one
reputation. v18 spends a full spec doing nothing a user will see —
because the thing a user must never see is a wrong number — and then gets
out of the way so v19 can make every citation honest and v20 can add the
next fifty-five. One contract, one sweep, one regression test per defect,
no output changed that was already right.
