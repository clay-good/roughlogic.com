# roughlogic.com Specification v21 — Public-Surface Hardening II (Concrete Defect Register)

> **Implementation status: OPEN (opened 2026-06-05).** v21 is the
> findings-and-fix register that closes the loop opened by spec-v18. v18
> wrote the tile contract (§2 of spec-v18: totality, purity, domain
> honesty, unit-toggle consistency, flag-threshold correctness, magnitude
> safety, render faithfulness) and stood up the stress harness; v21 is the
> result of actually running a structured stress-read across the entire
> public solver surface and **enumerating every concrete defect it
> found**, each with its defect class, location, symptom, prescribed fix,
> and the red-then-green regression test that lands with it. v21 ships
> **no new tiles** and changes **no correct output**. Every constraint from
> spec.md through spec-v20.md continues unchanged: no new groups, no new
> third-party dependencies, no new licenses, no new storage keys, no
> telemetry, no AI, no phone-home, US standards only. Package stamps
> **0.21.0** at the close of v21.
>
> v21 inherits everything from spec.md, spec-v2.md … spec-v20.md. It does
> not redefine the contract — it consumes it. Where v18 says "the harness
> asserts C-1 over a structured input sweep," v21 says "here are the
> twenty-six places the sweep found a leak, and here is the patch for each."

> Foreword. A framework spec is a promise; a defect register is the
> receipt. v18 promised that every tile is a contract and that the test
> suite would enforce it. v21 is what you get when you sit down and read
> all twenty-three solver modules the way an adversary would — feeding a
> zero into every denominator, a negative into every square root, a 31st
> into every payment date, and an empty cell into every field a renderer
> coerces with `Number(x) || 0`. The reassuring news, written down so it is
> not forgotten: the catalog is **mostly sound**. Six modules came back
> clean. The defects that exist are not scattered randomly — they cluster
> on two seams, and naming those seams is more valuable than any single
> patch. v21 names them, lists every instance, and fixes each one without
> touching a single number that was already right.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Two systemic root causes (the seams, not the symptoms)

The stress-read found that almost every contract violation traces to one
of two patterns. Fixing the pattern matters more than fixing the
instance, so v21 names both and then enumerates every instance under §3.

**RC-1 — The `Number(x) || 0` boundary that pushes zero/negative into a
solver that assumes positive.** The shared render path coerces empty or
malformed numeric fields to `0` before calling the solver (and preserves a
typed negative). Solvers that compute `sqrt(area)`, `1/load`, `1/I`, or a
section modulus from a depth then receive a value their math is not
defined for, and emit `NaN`/`Infinity` into a numeric output field. The
defect is not the coercion — it is the **missing domain guard inside the
pure solver** (a C-3 / D-1 violation). The fix is always the same shape:
an explicit positivity/finiteness guard at the top of the solver that
returns `{ error }`, exactly as the well-written siblings already do (the
canonical example: `computeIsoNeededFireFlow` guards `area_ft2 > 0` while
its older sibling `computeRequiredFireFlow` does not — see DR-07).

**RC-2 — The renderer-guarded `±Infinity`/`NaN` numeric field.** Several
solvers deliberately emit `Infinity` or `NaN` in a numeric field
(`srt_days: Infinity` on zero outflow, `t: Infinity` on a perfect
regression fit) and rely on a `Number.isFinite()` check **in the
renderer** to suppress it. The user never sees the bad value, so these are
invisible today — but they are still C-1 violations: the *pure solver*
contract is "all numeric fields finite, or `{ error }`." A direct caller
(the corpus harness, the clipboard export, a future re-use of the
function) gets the non-finite value. The fix is to represent the
degenerate case as `null` plus an explanatory flag, never as `±Infinity`,
and let presentation decide how to show "n/a."

These two seams account for twenty-three of the twenty-six defects below.
The remaining three are a calendar month-end overflow (RC-3, the D-5
family v18 anticipated), a silent large-input truncation, and an
over-eager whole-tile error that discards otherwise-valid outputs.

## 2. How to read the register

Each defect is `DR-NN`, tagged with its v18 defect class (D-1…D-10) and
the contract clause it violates (C-1…C-7), located by module and function
(line numbers are indicative at v21 open and the implementer confirms the
current line before patching — the function name is the stable anchor).
Each carries a one-line **symptom** (the input that produces the bad
output), a one-line **fix**, and the **regression test** that reproduces
the defect red before the fix turns it green, per the global goal-driven
discipline. Severity: **S1** a non-finite or wrong value can reach the
user; **S2** a non-finite value is emitted by the solver but currently
suppressed by a renderer guard (RC-2); **S3** weak validation or a
non-physical-but-finite result, no user-visible bad number today.

## 3. The defect register

### 3.1 Numerical core — `pure-math.js`

The statistical core (`erf`, `normCdf`, `gammaln`, `gammainc`, `chi2Cdf`,
`_betacf`, `betainc`, `tcdf`) was verified against independent
high-precision references across tails, high-df regimes, and branch
boundaries. It is **numerically sound for every in-domain input**:
continued fractions converge, branch splits are correct, `erf` holds its
documented 1.5e-7 bound, and `betainc`/`tcdf` symmetry holds. Two latent
boundary defects at the domain edges:

- **DR-01 — `gammainc` at `+Infinity` → `NaN`** (D-7 / C-1, S2). The
  continued-fraction prefactor `exp(-x + a·ln(x) − gammaln(a))` evaluates
  `exp(-Infinity + Infinity) = NaN`, so `gammainc(a, Infinity)` returns
  `NaN` and `chi2Cdf(Infinity, df)` returns `NaN` instead of `1`. Not
  reachable through the v17 statistics tiles (callers pass only finite
  positive arguments), hence S2. *Fix:* early return `1` for
  `x === Infinity`, beside the existing `x === 0` guard. *Test:*
  `chi2Cdf(Infinity, 5) === 1` and `gammainc(2, Infinity) === 1`.
- **DR-02 — `gammaln` at a negative non-integer → `NaN`** (D-7 / C-1, S3).
  The reflection branch takes `log(π / sin(πx))`, which is the log of a
  negative when `sin(πx) < 0` (`gammaln(-0.5)` returns `NaN`; true value
  ≈ 1.2655). `gammaln` is exported and documented `x > 0`, and no in-repo
  caller passes a negative, so this is a latent edge only. *Fix:* take the
  magnitude — `log(π / |sin(πx)|) − gammaln(1 − x)`. *Test:*
  `gammaln(-0.5)` within tolerance of `0.5·ln(π) − ...` reference.

### 3.2 Trades core — construction, fire

`calc-electrical.js` and `calc-hvac.js` were stress-read on their
numerically interesting solvers (the two-of-four Ohm's-law solver, Peukert
runtime, NEMA imbalance interpolation, LMTD/NTU, Colebrook duct bisection,
psychrometrics, affinity laws) and are **CLEAN** — denominators guarded,
bisections monotone, no non-finite leak. `calc-plumbing.js` is effectively
clean (one S3 note below). The defects cluster in structural and fire:

- **DR-03 — `computeLumberSpan` zero load → `Infinity` span**
  (`calc-construction.js`, D-1 / C-1, S1). With `total_load_psf = 0`
  (the renderer's `Number(x) || 0` on an empty field), both the bending
  span `sqrt(8·Fb·S / 0)` and the deflection span `cbrt(… / 0)` go to
  `Infinity`, so `allowable_span_ft`, `by_bending_ft`, `by_deflection_ft`,
  and `deflection_ratio` render as "Infinity ft." RC-1. *Fix:* guard
  `total_load_psf > 0` → `{ error: "Total load must be positive." }`.
  *Test:* `computeLumberSpan({ total_load_psf: 0, … })` returns `{ error }`.
- **DR-04 — `computeBeamLoading` zero depth / zero E → `Infinity`
  deflection** (`calc-construction.js`, D-1 / C-1, S1). With `d_in = 0`
  the moment of inertia `I = 0` and the deflection `5wL⁴/(384·E·I)` is
  `Infinity`; `E_psi = 0` is the same. RC-1. *Fix:* guard
  `b_in > 0 && d_in > 0 && E_psi > 0`. *Test:* depth `0` → `{ error }`.
- **DR-05 — `computeRequiredFireFlow` negative area → `NaN` flow**
  (`calc-fire.js`, D-1 / C-1, S1). `C = 18·F·sqrt(structure_area_ft2)`
  with a typed negative area yields `sqrt(negative) = NaN` in
  `needed_fire_flow_gpm` and `base_C_gpm`. This is a **guard-omission
  regression** relative to the sibling `computeIsoNeededFireFlow`, which
  correctly guards `area_ft2 > 0`. RC-1. *Fix:* guard
  `structure_area_ft2 > 0`. *Test:* negative area → `{ error }`; parity
  test asserting both fire-flow solvers guard identically.
- **DR-06 — `computeMasterStreamReach` negative pressure → `NaN` reach**
  (`calc-fire.js`, D-1 / C-1, S1). A negative `nozzle_pressure_psi` makes
  `sqrt(negative) = NaN` in `typical_reach_ft`, and the `NaN` propagates
  into `computeLadderPipeReach`, which multiplies it. RC-1. *Fix:* guard
  `nozzle_pressure_psi >= 0` in both solvers. *Test:* negative pressure →
  `{ error }`; assert no `NaN` reaches `computeLadderPipeReach`.
- **DR-07 — `computeFoam` accepts negative inputs → negative gallons**
  (`calc-fire.js`, D-2 / C-3, S3). No validation: negative
  `fire_area_ft2`, `application_rate`, `foam_percentage`, or
  `duration_min` flow straight to finite-but-negative gallons. *Fix:*
  guard area/rate `> 0`, percentage/duration `>= 0`. *Test:* negative
  area → `{ error }`.
- **DR-08 — `computeAerialLadderReach` accepts negative extension**
  (`calc-fire.js`, D-2 / C-3, S3). Negative `extension_ft` → negative
  reach. *Fix:* guard `extension_ft >= 0`. (Same fix pattern applies to
  the unguarded-but-finite `computePDP` / `computeReverseLayFriction`
  inputs — fold into one validation pass.)
- **DR-09 — `computeStaticPressureLossPiping` accepts non-positive
  density** (`calc-plumbing.js`, D-2 / C-3, S3). A user-supplied
  `fluid_density_lb_ft3 <= 0` yields a non-physical (negative or zero)
  pressure, still finite. *Fix:* guard `fluid_density_lb_ft3 > 0`.

### 3.3 Finance and calendar — accounting, real estate, legal

This is the D-5 surface v18 flagged. The day-count engines were
stress-read across month ends, year ends, leap days, and federal holidays.
`computeDeadline` (FRCP 6(a) trigger-day exclusion, court-day skip, and
weekend/holiday roll-forward, including July-4-plus-weekend chains) is
**verified correct** — a notable clean result on the hardest calendar
logic in the catalog. The defects:

- **DR-10 — `computeAmortization` month-end payment-day drift**
  (`calc-accounting.js`, D-5 / C-1, S1). A `first_payment_date` on the
  31st (e.g. `2025-01-31`) passes the raw `getUTCDate()` into `Date.UTC`
  for each subsequent month; February has no 31st, so the date **silently
  rolls forward** (`2025-01-31 → 2025-03-03 → 2025-04-03 …`), skipping
  February entirely and permanently shifting every later payment day. Any
  month-end input landing on a shorter month exhibits it (Aug 31 → Oct 1).
  RC-3. *Fix:* clamp the rolled day to the target month's last day
  (`Math.min(originalDay, daysInMonth(year, month))`) instead of
  overflowing through `Date.UTC`. *Test:* a date matrix asserting the
  Jan-31 schedule keeps the last-day-of-month convention through Feb and
  the 30-day months.
- **DR-11 — `computeInventoryTurnover` zero COGS → `Infinity` DSI**
  (`calc-accounting.js`, D-7 / C-1, S1). `cogs = 0` passes the
  `cogs >= 0` guard, so `turnover = 0` and `dsi = period_days / 0 =
  Infinity`, rendered as "Infinity days." RC-2-adjacent. *Fix:* guard
  `turnover > 0` and return `dsi: null` ("n/a") when COGS is zero, the
  null pattern the module already uses elsewhere. *Test:* `cogs: 0` →
  `dsi === null`.
- **DR-12 — `computePerDiemInterest` 30/360 month-end → `$0`**
  (`calc-realestate.js`, D-5 / C-1, S1). With `day_count: "thirty360"`
  and a close on the 31st, `days_to_eom = max(0, 30 − 31 + 1) = 0`, so
  prepaid interest is `$0`; the 30/360 convention treats the 31st as day
  30 and the funded day should still accrue one day. *Fix:* cap the day at
  30 before the subtraction (`d = min(day, 30); days_to_eom = 30 − d + 1`).
  *Test:* a 31st-of-month close → 1 inclusive day, not 0.
- **DR-13 — `computeJudgmentInterest` Actual/365 across a leap year**
  (`calc-legal.js`, D-5 / C-8, S3, convention-dependent). Simple interest
  divides by a hardcoded `365`; a span crossing a leap year counts 366
  actual days, so `$10,000 @ 10%` over `2024-01-01 → 2025-01-01` returns
  `$1,002.74` rather than `$1,000.00` (a 0.27% overstatement that grows
  with principal, rate, and duration). *Fix:* either divide by the actual
  days-in-year per accrual span (Actual/Actual) **or**, if Actual/365-Fixed
  is the intended statutory basis, state it explicitly in the citation —
  several state statutes do fix a 365-day year, so this is resolved by
  confirming the basis, not by blindly switching. *Test:* a leap-span
  fixture pinned to whichever basis the citation declares.

### 3.4 Allied health — EMS, vet, lab

The highest-weight surface (a dropped factor here is a dosing error) was
stress-read hardest on unit toggles. The reassuring headline: the mg/mcg,
per-min/per-hr, kg/lb, and gtt-set paths are **all arithmetically sound** —
no dropped-factor dosing error exists. The IV-drip `×60`, the 10-gtt
`/6` and 60-gtt `×1` divisors, and the `toKg` converter all check out.
Three concrete defects, all dose/fluid/volume-relevant:

- **DR-14 — `computeDrugConcentration` zero ordered dose → confident
  "draw 0 mL"** (`calc-ems.js`, D-2 / C-3, S1). A guard `dose_mg < 0`
  lets `dose_mg = 0` flow through to `volume_mL = 0`, presenting "draw
  0 mL" as a valid answer for a zeroed order rather than prompting. *Fix:*
  reject `dose_mg <= 0` ("Ordered dose must be positive."). *Test:*
  ordered dose `0` → `{ error }`.
- **DR-15 — `computeMaintenanceFluid` `Number(x) || 0` zeros replacement
  fluid** (`calc-vet.js`, D-2 / C-3, S1). `dehydration_percent` and the
  ongoing-loss field are coerced `Number(x) || 0`, so a garbled entry
  (`"5o"`, `"1OO"`) becomes `0` silently and a patient needing replacement
  fluid gets a maintenance-only rate with no error — under-resuscitation
  presented as a clean number. *Fix:* validate each with
  `Number.isFinite` and return `{ error }` on a non-finite present value,
  distinguishing absent (defaulted) from present-but-invalid (errored),
  per D-2. *Test:* non-numeric dehydration string → `{ error }`.
- **DR-16 — `computeDilution` (lab) `v1 > v2` → negative diluent volume**
  (`calc-lab.js`, D-3 / C-1, S1). `diluent_volume = v2 − v1` goes negative
  when starting volume exceeds target (a concentration step, not a
  dilution), presenting a negative "volume to add." *Fix:* flag when
  `v2 < v1` ("target volume is less than starting volume; this is a
  concentration step"). *Test:* `v1 = 10, v2 = 5` → flagged, no negative
  field.

### 3.5 The remainder — water, aviation, education, cross, historical, trucking, field, restoration, stage

`calc-mechanic.js`, `calc-kitchen.js`, `calc-references.js`, and
`calc-agriculture.js` are **CLEAN** on the contract classes (THI unit
paths, crop-yield divisions, Scribner interpolation, tire-gearing NaN
guards all verified safe for reachable inputs). The rest:

- **DR-17 — `computeSRTandFM` zero outflow → `srt_days: Infinity`**
  (`calc-water.js`, D-1 / C-1, S2). `total_out === 0` (no wasting, no
  effluent solids) emits `srt_days: Infinity`; the renderer guards with
  `Number.isFinite`, so it is suppressed today. RC-2. *Fix:* return
  `srt_days: null` with a "no waste/effluent solids" flag. *Test:*
  `total_out: 0` → `srt_days === null`.
- **DR-18 — `computeDilution` (water) single-mode no-op / negative
  bypass** (`calc-water.js`, D-7 / C-3, S2). When all four of c1/v1/c2/v2
  are positive (`known === 4`), no solve branch fires and the function
  returns the raw inputs as if solved; and because `known` counts only
  values `> 0` while the solve branches test `=== 0`, a negative input is
  neither counted nor matched, leaving a stale field. *Fix:* identify the
  single non-positive field, solve for exactly that one, and reject
  negatives. *Test:* all-positive input → explicit `{ error }`; a single
  blank field → that field solved.
- **DR-19 — `computeStandardTurn` whole-tile error on `TAS > 600`**
  (`calc-aviation.js`, D-4 / C-7, S1). A `TAS > 600` guard returns
  `{ error }` for the *entire* tile, discarding otherwise-valid
  turn-radius and climb outputs the user did supply. *Fix:* skip (or flag)
  only the TAS-derived outputs, returning the valid ones, rather than
  failing the whole call. *Test:* `TAS = 700` with valid turn inputs →
  turn outputs present, TAS output flagged.
- **DR-20 — `computeLinearRegression` perfect fit → `t: ±Infinity`**
  (`calc-edu.js`, D-1 / C-1, S2). An exact fit sets the t-statistic to
  `±Infinity` in a numeric field; the renderer guards it. RC-2. *Fix:*
  represent the exact-fit case as `t: null` plus a "perfect fit" flag.
  *Test:* a colinear dataset → `t === null`.
- **DR-21 — `computePearson` `r² ≥ 1` → `t: ±Infinity`** (`calc-edu.js`,
  D-1 / C-1, S2). Same non-finite leak as DR-20. *Fix:* `t: null` + flag.
  *Test:* perfectly correlated series → `t === null`.
- **DR-22 — `computeBaseConvert` silent truncation above 2⁵³**
  (`calc-edu.js`, D-6 / C-6, S1). `parseInt(v, fromBase)` truncates values
  beyond `2⁵³`, returning a rounded `decimal_value` and a wrong
  `converted` string with no error (the citation even admits "safe up to
  2⁵³−1"). *Fix:* reject or flag when the round-trip
  `parsed.toString(fromBase)` does not match the input. *Test:* a
  64-bit-wide binary string → flagged, not silently wrong.
- **DR-23 — `computeTimeAndMaterials` no coercion → `NaN` fields, never
  `{ error }`** (`calc-cross.js`, D-2 / C-1, S1). The solver does its own
  arithmetic on raw arguments with no `Number()` coercion and no error
  branch; a non-numeric argument makes every field `NaN` and the function
  **never returns `{ error }`** — a direct C-1 violation for any caller
  that does not pre-coerce. *Fix:* coerce inputs and validate
  non-negative, returning `{ error }` otherwise. *Test:*
  `computeTimeAndMaterials({ hours: undefined, … })` → `{ error }`.
- **DR-24 — `computeMaterialCost` accepts negative tax/fee**
  (`calc-cross.js`, D-2 / C-3, S3). `tax_rate_percent` and `delivery_fee`
  are unvalidated; a negative makes total drop below subtotal. *Fix:*
  validate both `>= 0`. *Test:* negative fee → `{ error }`.
- **DR-25 — `computePercentileBands` non-finite latest → `latest: NaN`
  and mislabeled placement** (`calc-historical.js`, D-1 / C-1, S1). The
  quantile set is filtered to finite values, but the latest point's value
  is not re-checked; a malformed shard row with a `null`/`""` final value
  makes `v = NaN`, so every `v <= pXX` comparison is false, `placement`
  silently becomes `"high"`, and `latest: NaN` is returned. *Fix:* after
  computing `v`, guard `Number.isFinite(v)` → `{ error: "Latest data
  point is non-numeric." }`. *Test:* shard with a non-numeric final value
  → `{ error }`.
- **DR-26 — `computeBridgeFormula` uncoerced array → `NaN` in violation
  string** (`calc-trucking.js`, D-2 / C-1, S2). The per-axle and tandem
  checks read raw `axle_weights_lb[i]` (and sum them) without the
  `Number()` coercion the `total` uses, so a numeric-string element makes
  `group_weight` `NaN` and `Math.round(group_weight)` emit `NaN` into the
  `bridge_violations` string. The renderer pre-coerces, hence S2. *Fix:*
  coerce the weights array once at entry and use the coerced copy
  throughout. *Test:* a weights array with a string element → finite
  numeric output.
- **DR-27 — `computeSolarTimes` daylight minutes can go negative**
  (`calc-field.js`, D-1 / C-1, S2). Sunrise and sunset minutes are wrapped
  only at format time, so a date/latitude near the day-length boundary can
  yield `sunset − sunrise < 0` and a negative "Daylight … min." *Fix:*
  modulo-wrap the difference:
  `((sunset − sunrise) % 1440 + 1440) % 1440`. *Test:* a boundary
  date/lat → non-negative daylight minutes.
- **DR-28 — `computeDryingLog` `slope === -0` edge** (`calc-restoration.js`,
  D-1 / C-1, S3, low confidence). A `-0` regression slope can make
  `t_target = -Infinity` before the `Math.max(0, …)` clamp; the clamp
  appears to saturate it to `0`, so this is flagged for confirmation
  rather than asserted. *Fix:* add an explicit `Number.isFinite(t_target)`
  guard before the projection is used. *Test:* a flat-then-dipping series
  → finite `days_to_target`.

### 3.6 One accuracy flag (not a contract defect)

- **AF-01 — `_v9_atmosphericAbsorption` humidity term** (`calc-stage.js`).
  The absorption helper carries an extra `(p_r / p_a)` factor versus the
  canonical ANSI S1.26 form `h = h_r · (p_sat / p_a) · 100`, which
  over-weights humidity. Output stays finite, so this is a *correctness*
  question, not a contract violation. v21 flags it for author review and a
  re-derivation against ANSI S1.26; if confirmed wrong, it lands as its own
  red-then-green fix with the source page cited per the spec-v18 §7(c)
  fixture rule.

## 4. Module verdict summary

| Module | Verdict | Defects |
|--------|---------|---------|
| `pure-math.js` | sound core, 2 latent edges | DR-01, DR-02 |
| `calc-electrical.js` | CLEAN | — |
| `calc-hvac.js` | CLEAN | — |
| `calc-plumbing.js` | effectively clean | DR-09 (S3) |
| `calc-construction.js` | 2 S1 | DR-03, DR-04 |
| `calc-fire.js` | 2 S1 + 2 S3 | DR-05, DR-06, DR-07, DR-08 |
| `calc-accounting.js` | 2 S1 | DR-10, DR-11 |
| `calc-realestate.js` | 1 S1 | DR-12 |
| `calc-legal.js` | 1 convention-dependent | DR-13 |
| `calc-ems.js` | 1 S1 | DR-14 |
| `calc-vet.js` | 1 S1 | DR-15 |
| `calc-lab.js` | 1 S1 | DR-16 |
| `calc-water.js` | 2 S2 | DR-17, DR-18 |
| `calc-aviation.js` | 1 S1 | DR-19 |
| `calc-edu.js` | 1 S1 + 2 S2 | DR-20, DR-21, DR-22 |
| `calc-cross.js` | 1 S1 + 1 S3 | DR-23, DR-24 |
| `calc-historical.js` | 1 S1 | DR-25 |
| `calc-trucking.js` | 1 S2 | DR-26 |
| `calc-field.js` | 1 S2 | DR-27 |
| `calc-restoration.js` | 1 S3 | DR-28 |
| `calc-mechanic.js` | CLEAN | — |
| `calc-kitchen.js` | CLEAN | — |
| `calc-references.js` | CLEAN | — |
| `calc-agriculture.js` | CLEAN | — |
| `calc-stage.js` | clean on contract; 1 accuracy flag | AF-01 |

Twenty-eight items: nine S1 (a bad number can reach the user), six S2
(non-finite emitted by the solver, suppressed by a renderer guard), seven
S3 (weak validation, finite result), four latent/edge, one calendar, one
accuracy flag. Six modules fully clean.

## 5. Harness extension (closing the seams, not just the holes)

v21 patches each instance above, but the durable value is preventing the
seams from reopening. The v18 §5 stress harness is extended so RC-1 and
RC-2 are caught structurally, not tile-by-tile:

**5.1 RC-2 sweep — no non-finite numeric field, ever.** The §5.1 contract
sweep already feeds every corpus function the bounds/zero/negative/NaN
vectors. v21 makes the assertion total: a numeric field that is
`Infinity`, `-Infinity`, or `NaN` is a **failure**, even when a renderer
would suppress it. This turns every S2 above into a standing red until it
is fixed at the solver, and prevents the next `srt_days: Infinity` from
being written.

**5.2 RC-1 sweep — every renderer-coerced field has a solver guard.** For
every solver reachable from a renderer that uses `Number(x) || 0`, the
sweep drives that field to `0` and to a small negative and asserts the
solver returns `{ error }` (not a finite fabricated value, not a
non-finite one) wherever the math is undefined there. The
`computeRequiredFireFlow`/`computeIsoNeededFireFlow` parity (DR-05) becomes
a general assertion: sibling solvers computing the same quantity guard
identically.

**5.3 Calendar matrix promotion.** The D-5 date matrix (month ends, year
ends, leap days, federal holidays) is extended to cover the
payment-schedule generators (DR-10) and the 30/360 month-end case
(DR-12), and asserted against `computeDeadline` (which passes) so the
regression bar is the known-good engine.

No new runtime dependency; the harness stays `node --test`, consistent
with spec-v13 and spec-v18 §5.5.

## 6. Acceptance

v21 is complete when: (a) every `DR-NN` above lands with a red-then-green
regression test naming its D-class and contract clause, and the fix
changes no correct output (verified against the unchanged-fixture set);
(b) DR-13 and AF-01 are resolved by confirming the intended
basis/derivation against the cited source, with the citation updated if
the math changes, per spec-v18 §7(c); (c) the §5.1/§5.2 sweeps graduate to
fail-on-any-non-finite and fail-on-missing-guard per the v14 §16 ratchet,
turning the six S2 defects into standing reds until closed; (d) `npm test`
and `npm run lint` are green; (e) the catalog count is unchanged at its
v20 base; (f) package stamps 0.21.0; (g) the v21 stanza in
[../docs/audit-trail.md](../docs/audit-trail.md) records the per-module
defect counts in §4 and the disposition of DR-13/AF-01.

## 7. Out of scope for v21

- New tiles and tile enhancements (those are v23).
- Citation content, currency, and wrapping (those are v22; v21 fixes only
  the C-7 *rendering* of a non-finite value, never the citation text).
- The DR-13 statutory-basis question and the AF-01 humidity-term
  derivation are *resolved* in v21 but not *re-litigated* — v21 confirms
  the basis and patches to match; it does not survey state-by-state
  prejudgment-interest law (that stays user-supplied per spec-v12 §H).
- Any relaxation of an existing gate. v21 only tightens.

## 8. Closing note

v18 said every tile is a contract and promised the suite would enforce it.
v21 is the audit that read all twenty-three modules and found that the
promise was already mostly kept — six modules clean, the dosing toggles
sound, the hardest calendar logic correct — and that the gaps that remain
sit on two nameable seams. Naming the seam is the fix that lasts: once the
harness fails on any non-finite numeric field and on any renderer-coerced
field without a solver guard, the four hundred and thirty-seventh tile and
the four hundred and ninety-second cannot reopen the holes this register
closes. Nine bad numbers that could reach a user, gone; six that never
could but violated the contract anyway, gone; one reputation, intact.
