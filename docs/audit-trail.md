# Audit trail

> Implementation status: introduced by spec-v10 §I.3.

Every external review or audit performed on the site is recorded
below with date, reviewer, scope, and outcome. The audit trail is
**append-only and public**. It is not a substitute for the
authority having jurisdiction; it is evidence that the site takes
its "AHJ-governs" promise seriously enough to invite outside
review.

## 2026-06-09 - spec-v27 welding / sheet-metal / rigging deepening + concept-overlap reconciliation (internal)

- **Scope**: spec-v27 (welding/metal bench, sheet-metal/refrigeration bench,
  rigger's bench). **3 net-new tiles + 3 additive enhancements**, not the 6
  new tiles the draft proposed. Catalog **540 -> 543**; package **0.27.0 ->
  0.28.0**.
- **Concept-overlap reconciliation (recorded, not papered over)**: the v27
  draft id-checked all six proposed ids against the live catalog but did not
  concept-check them. Three of the six duplicate an existing tile by concept
  and were **dropped-not-renamed** per the v20/v23/v24 discipline (the same
  honesty rule the v24 stanza applied to the fabricated Group K count):
  - C.1 `duct-sizing-friction` duplicates the existing **`duct-sizing`**,
    which already solves the round diameter for a target friction rate (full
    Colebrook), reports velocity, the equivalent rectangular, and the ACCA
    Manual D friction bands. Its only net-new delta - the trunk/branch
    velocity ceiling flag (<= 900 / <= 600 fpm) - landed as an additive
    enhancement to `duct-sizing`.
  - C.3 `superheat-subcooling` duplicates the existing **`superheat-subcool`**,
    which already computes superheat and subcool and (v23 EN.2) a fixed-orifice
    target-superheat charge verdict. Its net-new delta - a TXV/EEV
    target-subcooling charge verdict - landed as an additive enhancement to
    `superheat-subcool`.
  - G.1 `sling-load-tension` duplicates the existing **`sling-angle`** (Group
    F), which already returns per-leg tension by configuration and angle for
    more hitches than the draft. Its net-new deltas - the D/d bend-efficiency
    de-rate, the minimum rated-capacity output, and the sub-30-degree hazard
    flag - landed as an additive enhancement to `sling-angle`.
  Fabricating three near-duplicate tiles to hit the draft's "+6" would violate
  the no-concept-overlap rule. The landed v27 delta is **3 net-new tiles + 3
  enhancements** (540 -> 543).
- **New tiles by group**:
  - **E (Carpentry/Construction) +1**: `fillet-weld-strength` (effective
    throat 0.707*leg, ASD 0.30*F_Exx / LRFD 0.75*0.60*F_Exx shear capacity,
    utilization, and the AISC Table J2.4 / §J2.2b min/max fillet size; AWS
    D1.1 / AISC 360 §J2, by name).
  - **C (HVAC) +1**: `round-to-rect-duct` (ASHRAE equal-friction equivalent
    diameter D_e = 1.30*(a*b)^0.625/(a+b)^0.250, both directions, with a 4:1
    aspect-ratio flag; ASHRAE Fundamentals / SMACNA, by name).
  - **G (Cross-Trade, rigger's bench) +1**: `center-of-gravity-2point` (total
    weight, CG distance, and load split from a two-point weigh by moment
    balance; ASME B30.9 / ITI rigging, by name).
- **Enhancements (additive, backward-compatible defaults)**: `duct-sizing`
  gains the trunk/branch velocity ceiling flag (no input change; new output
  fields); `superheat-subcool` gains the optional TXV/EEV target-subcooling
  verdict (no target -> prior output unchanged); `sling-angle` gains the
  optional D/d bend efficiency, the minimum rated-capacity output, and the
  sub-30-degree hazard flag (no rated capacity / D/d -> prior output
  unchanged).
- **Discipline**: every new tile ships the v14 set; the new divisor seams
  (throat/length, equivalent-diameter (a+b), CG (S1+S2)) are guarded per
  RC-1/RC-2. The three enhanced functions keep their existing bounds-fuzzer
  and worked-example coverage and pass with the new fields added.
  `npm run lint`, `npm test` (5,466 unit tests), the worked-examples runner
  (548 fixtures), the 320px shell audit (543 tile shells), and the axe-core
  a11y scan over the new and enhanced tiles are all green.

## 2026-06-09 - spec-v26 electrician / plumber / pipefitter deepening (internal)

- **Scope**: spec-v26 closes the everyday gaps in the three founding trades.
  **9 new tiles** with full v14 discipline, no new group, no new dependencies.
  Catalog **531 -> 540**; package **0.26.0 -> 0.27.0**.
- **New tiles by group**:
  - **A (Electrical) +2**: `motor-feeder-multiple` (feeder conductor per NEC
    430.24 and feeder OCPD per NEC 430.62 for several motors on one feeder;
    the 430.62 device is a maximum taken to the next standard size down) and
    `transformer-conductor-protection` (primary/secondary FLA, the NEC Table
    450.3(B) overcurrent bands with Note 1, and the 240.21(C) secondary
    conductor minimum). Authorities: NEC 430.24 / 430.62 / 430.6(A) /
    450.3(B) / 240.21(C), by name; AHJ-adopted edition governs.
  - **B (Plumbing/Gas) +3**: `mixed-water-temp` (mixing/tempering-valve energy
    balance with the ASSE 1017 / 1016 / 1070 scald limits), `pressure-tank-
    drawdown` (Boyle's-law diaphragm-tank drawdown + anti-short-cycle runtime;
    Amtrol/WellMate/WQA practice), and `pipe-velocity` (continuity
    v = 0.4085*gpm/d^2 + the CDA/ASPE copper erosion-corrosion ceilings).
    First-principles; IPC/UPC and ASSE/ASPE cited by name.
  - **G (Cross-Trade, the pipefitter's bench) +4**: `pipe-fitting-takeout`
    (center-to-center / face-to-face cut length), `pipe-miter-cut`
    (lobster-back per-cut angle A/(2(n-1)) + OD*tan(theta) cutback),
    `pipe-template-wrap` (wraparound ordinates y = (OD/2)*tan(alpha)*(1-cos
    phi)), and `flange-bolt-torque` (short-form T = K*D*F + the ASME PCC-1
    cross sequence). Author-original first-principles trig; NCCER Pipefitting
    and ASME PCC-1 / B16.5 cited by name; take-out / K-factor / preload are
    user-supplied and flagged confirm-against-your-spec.
- **Discipline**: every new tile ships the v14 set (dims annotation,
  bounds-fuzzer row, worked-example fixture cross-checked against its cited
  source, complete inline `citations.js` entry, `tile-meta.js` row, app.js
  wiring, prerendered shell passing the 320px audit) and is born into the
  v18/v21 output contract and the v19/v22 citation discipline. The divisor
  seams (feeder-largest sum, FLA voltage, mix flow sum, tank absolute
  pressure, velocity diameter, miter angle, ordinate, bolt diameter) are
  guarded per RC-1/RC-2. `npm run lint`, `npm test`, the worked-examples
  runner (545 fixtures), and the 320px shell audit (540 tile shells) are all
  green.

## 2026-06-09 - spec-v24 + spec-v25 trade-floor deepening and surveying (internal)

- **Scope**: spec-v24 (conduit-bending suite, welding/metal/layout, rolling
  offset, audio electronics) and spec-v25 (land-surveying and civil layout)
  landed together. **16 new tiles** with full v14 discipline plus **3
  additive enhancements**. Catalog **515 -> 531**; package **0.24.2 ->
  0.26.0**.
- **New tiles by group**:
  - **A (Electrical) +3**: `conduit-offset`, `conduit-saddle`,
    `conduit-90-stub` — the daily field bending math (cosecant offset
    multiplier, three-/four-point saddle marks, 90-deg stub deduct and
    segmented bends). First-principles trig; bender deduct/shoe figures are
    user-supplied and flagged confirm-against-your-tool.
  - **E (Carpentry/Construction) +7**: `weld-heat-input` (AWS D1.1 / ASME
    BPVC IX), `metal-weight` (volume x density, nominal alloy table),
    `layout-squaring` (3-4-5), plus the spec-v25 civil set `horizontal-curve`
    and `vertical-curve` (AASHTO Green Book / FM 5-233), `earthwork-end-area`
    (FHWA / FM 5-233), `slope-stake-cut-fill` (FM 5-233).
  - **G (Cross-Trade) +1**: `rolling-offset` (Pythagorean true offset +
    cosecant travel; NCCER pipefitting).
  - **N (Stage/Live) +3**: `speaker-impedance`, `decibel-converter`,
    `amp-power-spl` (Ohm's-law networks + ANSI S1.1 decibel basis).
  - **P (Field/SAR) +2**: `area-by-coordinates` (shoelace) and
    `traverse-closure` (latitude/departure misclosure + Compass/Bowditch
    adjustment); FM 5-233, public-domain.
- **Enhancements (additive, backward-compatible defaults)**: `tire-gearing`
  gains the speedometer/odometer-error output (EN.1); `spl-distance` gains
  incoherent N-source summation, +3 dB per doubling, N=1 reproduces the
  prior output exactly (EN.2); `bend-allowance` exposes the bend deduction
  BD = 2*OSSB - BA beside the existing flat-pattern length (EN.3).
- **Count reconciliation (recorded, not papered over)**: the spec-v24
  summary line stated a 12-tile delta with an "A +3, E +3, G +1, K +2,
  N +3" distribution, but the spec body (sections 3-6) specifies only the
  10 tiles above — there is **no Group K new-tile section anywhere in the
  body**, only the EN.1 `tire-gearing` enhancement. Fabricating two uncited
  Group K tiles to hit the number would violate the correctness discipline
  (every tile must carry a real named authority, a cross-checked worked
  example, and a guarded contract). The landed v24 delta is therefore **10
  new tiles + 3 enhancements** (515 -> 525); v25 adds **6** (525 -> 531).
  The spec headers are amended to the as-landed counts.
- **Discipline**: every new tile ships the v14 set (dims annotation,
  bounds-fuzzer row, worked-example fixture cross-checked against its cited
  source, complete inline `citations.js` entry, `tile-meta.js` row, app.js
  wiring, prerendered shell passing the 320px audit) and is born into the
  v18/v21 output contract (the tile-contract sweep reports 0 Tier-1 / 0
  Tier-2 across 536 swept tiles) and the v19/v22 citation discipline. The
  divisor seams (angle->0 cosecant, zero travel speed, zero radius/length,
  zero perimeter/misclosure) are guarded per RC-1/RC-2. `npm run lint`,
  `npm test` (5,449 unit tests), the worked-examples runner (536 fixtures),
  and the 320px shell audit (557 shells) are all green.

## 2026-06-08 - spec-v17 Allied-Profession Deepening CLOSED (internal)

- **Scope**: the bookkeeping close of spec-v17 (Part III of III). Every
  genuinely-new v17 tile and tile-output had already landed under earlier
  patch stamps (Groups L / Y / U / V / W / X / R / S, catalog **417 → 437**
  with full v14 discipline); this entry resolves the spec's stale
  "OPEN, stamps 0.17.0" banner. No new tiles, no correct output changed.
  The close rides **0.24.2** (v18–v23 stamped past 0.17.0 out of spec
  order; re-stamping would be a semver regression).
- **§Z.5 state-keyed shards (audited)**: two of the five drafted shards
  already exist and are wired (R.4 SE wage base →
  `data/accounting/se-tax-parameters.json`; sales/use-rate reference →
  `data/crosswalks/state-tax-rates.json`), and the L.1 ET reference is the
  `irrigation-requirement` tile's user-supplied ET0 + inline FAO 56 Kc
  values. The two genuinely-new 50-state **legal** datasets (S.1
  garnishment maxima, S.3 prejudgment-interest rates) carry per-row
  real-world consequence and a per-state freshness cadence, so per the v16
  deferred-external-dataset precedent (C.2 / B.7) they land as their own
  reviewed change. Neither tile is blocked: `wage-garnishment` computes the
  federal CCPA Title III cap with an optional stricter state-cap percent,
  and `judgment-interest` accepts the statutory rate as an input.
- **§Z.6 reviewer signoffs (sought, not obtained)**: the v17 expansion
  solicits a reviewer-of-record per group and the signoffs gate only the
  "audited" label, not the close. Roster sought: a US-licensed DVM (U), a
  paramedic/EMT-P with QA experience (V), an ATP-rated pilot or CFI-I (W),
  a real-estate broker with CCIM-equivalent (X), a public-school or
  community-college quantitative-courseware educator (Y), a US-licensed CPA
  (R), a civil-practice attorney (S), a published bench scientist (T), and
  a USDA NRCS TSP or Cooperative Extension agronomist (L). These remain
  open and tracked under "Reviewers we want" below.
- **Verification**: no code change, so `npm test` (5,428), `npm run lint`
  (all gates), `npm run build`, `npm run data:verify`, and
  `npm run check:shell-mobile` (541/541) stay green.

## 2026-06-08 - spec-v18 §5.4 render layer + spec-v19 coverage gate CLOSED (internal)

- **Scope**: closes the two remaining drafted spec surfaces — spec-v18 §5.4
  (the render-assertion layer) and spec-v19 (Citation Integrity Sweep,
  whose substance landed via spec-v22 on 2026-06-05). No new tiles, no
  correct output changed. Package **0.24.2**.
- **v18 §5.4 (render leak)**: `test/integration/render-no-nan.test.js`
  asserts, at the real-Chromium layer, that no renderer paints `NaN`,
  `Infinity`, `$NaN`, or `undefined` into the user-visible output — for
  every one of the **515** tiles, in both the finite-result ("Test with
  example") and empty-first-render states. Result: **515 / 515 pass, 0
  leaks**. Runs in the existing `test:e2e` job (no workflow edit). v18 is
  now fully CLOSED.
- **v19 §2.1/§2.2/§4.1 (coverage gate graduation)**:
  `check-citation-coverage.mjs` graduated warn → **fail-on-missing** — a
  tile without a citation entry, an orphan entry, a missing required field
  (`formula`/`edition`/`freeAccess`/`governance`), or a raw `http(s)://`
  scheme in a field now hard-fails the lint. Coverage is **515 / 515** with
  all four required fields present (gate graduated at its floor). Pinned by
  `test/unit/v19-citation-coverage.test.js` (3 tests). The §3.3 ledger,
  §4.1/§4.4 link/constant hygiene, §4.2 320px wrapping, and §4.3 prose
  gates all landed earlier via spec-v22; v19 is now fully CLOSED.
- **Verification**: `npm test` unit suite green, `npm run lint`
  (all gates green incl. the graduated coverage gate), `npm run build`,
  `npm run data:verify`, the full Playwright `test:e2e` suite, and
  `npm run check:shell-mobile` all green.

## 2026-06-06 - spec-v18 §7 tile-contract Tier-2 campaign CLOSED (internal)

- **Scope**: the standing spec-v18 §7 per-module hardening campaign.
  Drives the Tier-2 contract backlog (a perturbed numeric input that leaks
  a non-finite *output* field) from **837 to 0** across all 18 calculator
  modules. No new tiles, no correct output changed. Package **0.24.1**.
- **Method**: the `check-tile-contract` sweep drives every numeric input
  slot of every registered compute function to `0 / -1 / NaN / Infinity`
  and flags any non-finite output field. 821 of 837 entries were
  `NaN`/`Infinity` inputs, fixed with a generic non-exported per-module
  `_finiteGuard(arguments[0])` returning `{ error }`; 16 were zeroed
  denominators, fixed per the v21 RC-1 (required input -> `{ error }`) /
  RC-2 (infinite field -> `null`, finite fields preserved) seams.
- **Verification**: `test/fixtures/contract-baseline.json` rewritten to
  **0** (gate now hard-fails on any new leak); a named regression test
  (`test/unit/v18-section7-hardening.test.js`) pins one case per fix class;
  npm test **5,425** unit tests green; npm run lint all gates green;
  npm run check:shell-mobile 541/541 clean.
- **Disposition**: §7 closed; the §5.4 jsdom render-assertion layer is the
  only drafted v18 surface still open.

## 2026-06-06 - spec-v20 catalog expansion (55 new tiles, internal)

- **Scope**: spec-v20 Catalog Expansion VI. 55 new tiles across 19
  groups, landed after the v21 hardening register and v22 citation
  register (out of spec order). Catalog **460 -> 515**; package **0.24.0**.
- **Per-group additions**: A +3, B +3, C +3, D +2, E +3, F +2, J +3,
  K +3, L +3, M +3, N +1, O +1, P +1, R +3, S +2, T +2, U +4, V +4,
  W +3, X +3, Y +3. The four Group U and four Group V tiles carry the
  spec-v12 section 13 limitation banner.
- **Method**: every tile born into the v21 tile contract (no non-finite
  numeric field under input perturbation; 837-entry leak baseline held)
  and the v22 citation discipline (inline, current, named US authority).
  npm test 5,421 unit tests green; npm run lint all gates green;
  worked-example fixtures cross-checked against the cited source.
- **Finding (self-audit)**: spec section 21 X.2 (`pmi-cancellation-date`)
  listed example PMI months "~70/~82"; correct standard amortization of
  $250k at 6.5% over 360 months reaches 80% LTV at month 146 and 78% at
  month 156. Implemented the correct amortization; the spec status block
  records the correction.
- **Disposition**: the per-group tile counts in the table below were
  refreshed to current values (they had drifted since v15).

## How to append a row

When an external review completes:

1. Add a new section header under the appropriate year.
2. Record:
   - **Date**: ISO 8601 (YYYY-MM-DD).
   - **Reviewer**: name, role, organization.
   - **Scope**: which subsystems were reviewed (citations,
     accessibility, security / threat model, data-pipeline,
     specific groups of tiles).
   - **Method**: what the reviewer actually did (live testing,
     code read, axe-core run, threat-model walkthrough).
   - **Findings**: numbered list. Use plain language. Cite the
     specific tile, file, or line where applicable.
   - **Disposition**: per-finding, what was done. "Fixed in
     commit ABC", "Documented as known limitation in X", "No
     change; finding is informational."
3. Do not delete or revise prior entries. If a finding turns out
   to be incorrect, note that in a follow-up entry rather than
   editing the original.

## Cadence

- **Annual minimum** per spec-v10 §14: commission at least one
  outside review per year and append the result.
- **Per major or minor release**: a self-audit is implicit in
  the per-release ritual ([maintainer-quickstart.md](maintainer-quickstart.md));
  it is not recorded here. This document is for outside
  reviewers only.
- **Ad hoc**: any review commissioned in response to a specific
  incident (citation challenge, accessibility complaint,
  security report) is recorded here regardless of cadence.

## What an outside review covers

Suggested review tracks. A single reviewer may cover one track or
several depending on scope.

- **Citation track**: spot-check N tiles' source-stamp strings
  against the cited edition/section. Verify free-access URLs
  resolve. Verify that the prior-edition row in
  [citation-discipline.md](citation-discipline.md) matches the
  AHJ-most-common edition for at least one US state.
- **Accessibility track**: axe-core in every theme (default /
  light / dark / high-contrast; Big Buttons retired in spec-v11).
  Keyboard-only navigation through every tile. Screen-reader
  walkthrough on a representative subset.
- **Security track**: threat-model walkthrough against
  [threat-model.md](threat-model.md). Verify CSP headers in
  `_headers`. Verify the absence of outbound network calls in
  the runtime bundle.
- **Data-pipeline track**: `npm run data:verify` on a clean
  clone. Spot-check N shards against their canonical sources.
  Verify the per-state coverage matrix matches the manifest.
- **Math-derivation track**: spot-check derivations in
  [derivations.md](derivations.md) against published worked
  examples. Verify worked-example fixtures in
  [../test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json)
  (the spec-v10 Phase C.1 registry; coverage enforced by
  `scripts/check-worked-examples.mjs` in `npm run lint`) match
  the publisher's example to the declared tolerance.

## Reviewers we want

The site is a public utility. Reviewers from any of the
following categories are welcome:

- Working tradespeople in any of the represented trades.
- Code officials and AHJ representatives.
- Accessibility specialists with WCAG 2.2 AA experience.
- Security researchers with a focus on web app threat models.
- Engineering educators using public worked examples.
- Independent open-source community reviewers.
- **Working DVMs and RVT / LVTs** (Group U, spec-v12 §5) for the
  veterinary math-aid review track. Plumb's / AAHA / AAFP
  familiarity preferred.
- **Practicing paramedics and EMS medical directors** (Group V,
  spec-v12 §6) for the field-protocol math-aid review track.
  PALS / ATLS / NRP familiarity preferred.
- **Current general-aviation pilots and CFIs** (Group W,
  spec-v12 §7) for the preflight / weather / performance review
  track. POH-to-AC 00-45 familiarity preferred.
- **Licensed real-estate brokers, appraisers, and lenders**
  (Group X, spec-v12 §8) for the financing-math review track.
  Familiarity with FHFA / HUD / VA underwriting preferred.
- **Practicing classroom teachers and curriculum specialists**
  (Group Y, spec-v12 §9) for the readability / grading-math
  review track. Familiarity with state Lexile-band bulletins
  preferred.

A reviewer's name appears in this document only with their
explicit consent. Anonymous-by-request reviews are recorded with
a generic identifier (e.g., "Reviewer A, WCAG specialist").

---

## 2026

_No external reviews on file yet. This document was introduced by
spec-v10 §I.3 in the v0.10 release cycle. Solicit the first
review during the v0.11 release window._

### 2026-06-06 — spec-v23 CLOSED: 20 enhancements landed; package 0.23.0 (maintainer)

- **Reviewer**: Maintainer (additive build-out against the inherited v21
  contract and v22 citation discipline).
- **Scope**: spec-v23 Part I — the 20 enhancements to existing tiles. Each
  is additive (adds an input, output, mode, or second method), changes no
  existing correct output without the user opting in, and adds a guard for
  any new zeroable denominator its inverse introduces (v21 RC-1). With this
  batch **Part I (20) and Part II (23 new tiles) are both complete and v23
  CLOSES**; the package stamps **0.23.0** per §24(f).
- **Enhancements landed** (per group): A/C +3 EN.1 `seer-eer`
  (SEER2/EER2 + annual-kWh/$ cross-check), EN.2 `superheat-subcool`
  (fixed-orifice target-superheat charge verdict), EN.3 `balance-point`
  (supplemental strip-kW sizing); B +3 EN.4 `tankless-gpm`
  (solve-for {GPM, kBTU, ΔT} + worst-case inlet), EN.5
  `water-heater-recovery` (peak-demand sizing flag), EN.6 `glycol-mix`
  (burst-vs-freeze toggle + heat-transfer penalty); E +4 EN.7 `snow-load`
  (sloped-roof Cs + drift surcharge), EN.8 `wind-pressure` (Kz/Kzt/Kd/G
  exposed), EN.9 `anchor-embedment` (cracked toggle + edge-distance flag),
  EN.10 `footing-area` (eccentric bearing-pressure check); F +2 EN.11
  `required-fire-flow` (Iowa V/100 second method with divergence), EN.12
  `master-stream` / `hydrant-flow` (nozzle-reaction force); K/M +2 EN.13
  `fuel-range` (solve-for-MPG / -tank inverse), EN.14 `brake-pad-life`
  (wear-rate input + per-axle split); M +3 EN.15 `disinfection-ct`
  (required-t10 inverse + log selector), EN.16 `detention-time` (SOR + WOR
  loadings), EN.17 `well-drawdown` (Cooper-Jacob T + recovery); L +2 EN.18
  `npk-blend` (lb/acre, bag-count, kg/ha), EN.19 `sprayer-calibration`
  (tank-batches + refill points); X +1 EN.20 `cap-rate-dscr` (loan-derived
  debt service + break-even occupancy).
- **Gate results**: `npm run lint` green; `npm run test:unit` **5,078 pass /
  0 fail** (+20 enhancement tests in
  [../test/unit/calc-v23-enhancements.test.js](../test/unit/calc-v23-enhancements.test.js));
  the tile-contract sweep **improved** — the new RC-1 guards cleared 3
  prior Tier-2 leaks (**baseline 840 → 837**, ratchet tightened); corpus,
  dimensions, citation, and bounds gates all green.
- **Status**: spec-v23 **CLOSED**; catalog **460**; package **0.23.0**.

### 2026-06-06 — spec-v23 enhancement & expansion VII: second new-tile batch (maintainer)

- **Reviewer**: Maintainer (build-out against the v21 contract and v22
  citation discipline, which v23 inherits).
- **Scope**: spec-v23 Part II new tiles. This batch lands the **remaining 15
  of the 23** new tiles, completing Part II (8 + 15 = 23). Catalog
  **445 -> 460**. Each is born into the v21 tile contract (no non-finite
  numeric field; every inverse/echoed input is range-guarded so the fuzzer
  `Infinity`/`NaN` probes return `{ error }`) and the v22 citation
  discipline (inline, current, linkified, single-edition note, named US
  authority).
- **New tiles landed** (per group): B +2 `trap-seal-loss` (IPC/UPC §1002
  trap-to-vent), `water-meter-sizing` (AWWA M22); D +1 `drying-chamber-co2`
  (ASHRAE 62.1 mass balance); E +2 `wall-bracing-length` (IRC R602.10),
  `deck-ledger-fasteners` (IRC R507.9); J +2 `cargo-securement-wll`
  (FMCSA 49 CFR 393), `fuel-tax-ifta` (IFTA Articles of Agreement);
  K +1 `screw-conveyor` (CEMA Book No. 350); L +1 `pesticide-rei-phi`
  (EPA WPS 40 CFR 170 + label); M +1 `backflow-test-psi` (USC FCCCHR /
  AWWA C511); T +1 `gel-percent-agarose` (Sambrook & Russell); V +1
  `pediatric-tube-depth` (AHA PALS, carries the licensed-provider banner);
  W +1 `weight-shift-fuel-burn` (FAA-H-8083-1, extends `weight-shift-cg`
  into the time domain); X +2 `depreciation-recapture` (IRS Pub 544 /
  IRC §1245 / §1250), `rent-roll-vacancy` (Appraisal Institute EGI).
- **Discipline per tile**: TOOLS row, renderer (the additive
  `_v23SimpleRenderer` factory, non-exported so it stays out of the
  dimensional-analysis corpus) + RENDERERS registration, `citations.js`
  entry, `tile-meta.js` id/group row (V.1 also joins the SIMPLIFIED set
  with canonical limitation-banner copy), `related-tiles.mjs` edge set,
  ≥ 3 `aliases.json` rows, `compute-map.js` wiring, a worked-example
  fixture cross-checked against the cited source, a bounds-fuzzer row, a
  `docs/derivations.md` corpus row, a prerendered shell, and dedicated unit
  tests ([../test/unit/calc-v23.test.js](../test/unit/calc-v23.test.js)).
- **Gate results**: `npm run lint` green; `npm run test:unit` 5,058 pass /
  0 fail; tile-contract sweep **465 tiles, 0 Tier-1 crashers, 840 Tier-2
  baseline unchanged**; worked-example runner 465/465; bounds-fuzzer
  764/764 corpus functions covered.
- **Status**: spec-v23 Part II (the 23 new tiles) is **complete**; spec-v23
  stays **OPEN** (the 20 Part I enhancements remain); package stays
  **0.22.0** until v23 closes per its §24(f).

### 2026-06-06 — spec-v23 enhancement & expansion VII: first new-tile batch (maintainer)

- **Reviewer**: Maintainer (build-out against the v21 contract and v22
  citation discipline, which v23 inherits).
- **Scope**: spec-v23 Part II new tiles. This batch lands **8 of the 23**
  new tiles, each born into the v21 tile contract (no non-finite numeric
  field; the fuzzer's `Infinity` probe drove a finite-guard fix on the
  lumen-method denominator) and the v22 citation discipline (inline,
  current, linkified, single-edition note, named US authority).
- **New tiles landed** (per group): A +1 `lux-to-footcandle` (IES lumen
  method + exact 10.764 lux/fc identity); C +2 `duct-velocity-pressure`
  (ACCA Manual D / ASHRAE `V = 4005*sqrt(VP)`), `refrigerant-velocity`
  (ASHRAE Refrigeration Handbook line velocity + oil-return verdict);
  F +2 `fire-stream-reaction` (IFSTA smooth/fog nozzle reaction),
  `sprinkler-k-factor` (NFPA 13 `Q = K*sqrt(P)` three-way solver);
  K +1 `valve-flow-coefficient` (ISA-75.01 / Crane TP-410 `Q = Cv*sqrt(dP/SG)`);
  T +1 `od600-cell-count` (spectrophotometry, user-supplied factor);
  Y +1 `curve-grade-scaler` (flat / square-root / linear-rescale, clamped).
- **Discipline per tile**: TOOLS row, renderer + RENDERERS registration,
  `citations.js` entry, `tile-meta.js` id/group row, `related-tiles.mjs`
  edge set, ≥ 3 `aliases.json` rows, `compute-map.js` wiring, a
  worked-example fixture cross-checked against the cited source, a
  bounds-fuzzer row, a `docs/derivations.md` corpus row, a prerendered
  shell (320px-audited), and dedicated unit tests
  ([../test/unit/calc-v23.test.js](../test/unit/calc-v23.test.js), 21 tests).
- **Gate results**: `npm run lint` green; `npm run test:unit` 5,027 pass /
  0 fail; `npm run data:verify` ok; tile-contract sweep **450 tiles, 0
  Tier-1 crashers, 840 Tier-2 baseline unchanged**; the 320px prerendered-
  shell audit passes on all 8 new shells and their SPA views.
- **Status**: spec-v23 stays **OPEN** (15 new tiles + 20 enhancements
  remain); package stays **0.22.0** until v23 closes per its §24(f).

### 2026-06-05 — spec-v22 citation integrity II: concrete findings register (maintainer self-audit)

- **Reviewer**: Maintainer (manual read of all 437 reference blocks, the
  `scripts/sources-cycle.json` cycle table, and the linkifier).
- **Scope**: The four ways the citation promise quietly breaks — a foreign
  edition note, a dead or un-clickable link, a 320px overflow, and prose that
  drifts from the house numeric convention — across `citations.js` and the
  freshness machinery.
- **Method**: red-then-green regression per fix in
  [../test/unit/v22-citation-integrity.test.js](../test/unit/v22-citation-integrity.test.js)
  (8 tests); five citation gates extended and re-run.
- **Findings** (per category, per spec-v22 §7):
  1. **CF-01 (8 → 12 cross-contaminated edition notes, S1).** Eight
     non-electrical tiles (`noise-dose`, `svi-sludge-index`,
     `sprayer-calibration`, `thi-livestock`, `lightning-countdown`,
     `excavation-bench-plan`, `nfpa-1142-water-supply`, `scba-cylinder-time`)
     displayed `NEC_DISCLOSURE` as their edition note. The new edition-note
     relevance gate caught **four more** electrical-group tiles wearing the NEC
     ampacity note for a quantity they do not compute (`off-grid-battery`,
     `power-triangle`, `arc-flash-screen`, `short-circuit-pp` — IEEE / NFPA 70E
     / Bussmann sources), exactly the "catch the whole class" behavior §1
     promised.
  2. **CF-02 (4 stale cycle rows) / CF-03 (freshness blind spot, S1).** NEC,
     ASHRAE 62.1/62.2/90.1, and the AASHTO Green Book had passed their
     `next_expected` dates unflagged.
  3. **CF-05 / CF-06 (2 dead/non-durable links, S2).** `movable-type.co.uk`
     (un-linkifiable foreign ccTLD) and `convertit.com` (non-durable AMS-55
     host).
  4. **CF-08 (7+ overflowing URLs, S1 on a phone).** Long single-token URLs.
  5. **CF-09 (13 spelled-out prose instances, S3).** `<number> percent` and
     `rate per mile in dollars`.
  6. **CF-07 / CF-10: re-confirmed CLEAN** (no raw URL schemes, no smart-quote
     or marketing-adjective artifacts).
- **Disposition**:
  1. All 12 CF-01 tiles given domain-appropriate single-edition / disclosure
     notes (OSHA, WEF, EPA-label, USDA, NOAA, NFPA-1142, IEEE, NFPA 70E). The
     relevance gate (`check-citation-coverage.mjs`) fails on recurrence.
  2. NEC cycle row advanced to the published 2026 edition (disclosed-lag;
     `NEC_DISCLOSURE` names 2026, bundled values still 2023). ASHRAE and AASHTO
     rows re-stamped `last_verified: 2026-06-05` ("verified, monitoring"). The
     freshness gate now fails on a passed date with no re-stamp (CF-03) and on
     any tracked source missing a ledger row (CF-02). The §5 ledger
     [citation-freshness-ledger.md](citation-freshness-ledger.md) lists all 13
     tracked sources; CF-04 (ICC 2021-vs-2024) recorded as disclosed-lag.
  3. CF-05/CF-06 links reworded to `nist.gov` / `dlmf.nist.gov`; a link-hygiene
     check (foreign-ccTLD + defunct-host denylist) guards recurrence.
  4. CF-08 worst URLs shortened to bare host + prose; the
     `.citation-link { overflow-wrap: anywhere }` 320px guard confirmed and
     covered by the full-catalog `check-shell-mobile` audit (463/463 clean).
  5. CF-09 prose reworded to `%` / `(USD)`; a guarding regex lives in the
     citation coverage gate (the v22 §6 ngram gate is fingerprint-based and
     skips in the public repo, so the live check runs where citations.js is
     already loaded). Package stamps **0.22.0**.

### 2026-06-05 — spec-v21 public-surface hardening II: concrete defect register (maintainer self-audit)

- **Reviewer**: Maintainer (structured adversarial stress-read of all 23
  solver modules + manual fix review).
- **Scope**: Every public solver, read the way an adversary would: a zero
  into every denominator, a negative into every square root, a 31st into
  every payment date, a non-numeric into every field the renderer coerces
  with `Number(x) || 0`. Per spec-v21 §4 the verdict was: the catalog is
  **mostly sound** — six modules came back fully clean (`calc-electrical`,
  `calc-hvac`, `calc-mechanic`, `calc-kitchen`, `calc-references`,
  `calc-agriculture`), the dosing unit-toggles are arithmetically correct,
  and `computeDeadline` (the hardest calendar logic) is correct — and the
  defects that exist cluster on two seams: **RC-1** (a renderer-coerced
  `0`/negative pushed into a solver with no domain guard) and **RC-2** (a
  solver that emits `±Infinity`/`NaN` and relies on a renderer guard to hide
  it).
- **Method**: red-then-green regression per fix in
  [../test/unit/v21-defect-register.test.js](../test/unit/v21-defect-register.test.js)
  (29 tests, each naming its v18 D-class and contract clause); the
  `check-tile-contract` sweep confirms no new leak.
- **Findings** (per-module counts per spec-v21 §4): 9 S1 (a bad number could
  reach the user), 6 S2 (non-finite emitted but renderer-suppressed), 7 S3
  (weak validation, finite result), 4 latent/edge, 1 calendar (RC-3), 1
  accuracy flag. Distribution: `pure-math` DR-01/02; `calc-construction`
  DR-03/04; `calc-fire` DR-05/06/07/08; `calc-plumbing` DR-09;
  `calc-accounting` DR-10/11; `calc-realestate` DR-12; `calc-legal` DR-13;
  `calc-ems` DR-14; `calc-vet` DR-15; `calc-lab` DR-16; `calc-water`
  DR-17/18; `calc-aviation` DR-19; `calc-edu` DR-20/21/22; `calc-cross`
  DR-23/24; `calc-historical` DR-25; `calc-trucking` DR-26; `calc-field`
  DR-27; `calc-restoration` DR-28; `calc-stage` AF-01.
- **Disposition**:
  1. All 28 `DR-NN` fixed; each is a domain/finiteness guard returning
     `{error}` (RC-1) or a `null`-plus-flag representation of the degenerate
     case (RC-2), never `±Infinity`/`NaN` in a numeric field. No correct
     output changed — all 442 worked-example fixtures still pass.
  2. **DR-13** (judgment-interest Actual/365 across a leap year) resolved by
     declaring the **Actual/365-Fixed** basis explicitly in the
     `day_count_basis` output and the inline notice, per spec-v21 §6(b); the
     math (already 365-fixed) is unchanged, the convention is now disclosed.
  3. **AF-01** (`_v9_atmosphericAbsorption` humidity term) confirmed against
     ANSI S1.26: the prior `h = h_r·(p_sat/p_a)·(p_r/p_a)·100` carried an
     extra `(p_r/p_a)` factor versus the canonical `h = h_r·(p_sat/p_a)·100`.
     Removed; the factor is unity at sea level (`p_a = p_r`) so every
     existing fixture is unchanged, and the correction only affects
     non-sea-level ambient pressure.
  4. The Tier-2 contract backlog dropped **889 → 840** as the RC-1/RC-2
     fixes closed leaks; `contract-baseline.json` was rewritten to lock the
     gain. The global graduation to fail-on-any-non-finite over the
     remaining 840 entries continues as the standing spec-v18 §7 per-module
     campaign (the gate already fails on any *new* leak). Package stamps
     **0.21.0**.

### 2026-06-05 — spec-v18 hardening pass 1: tile-contract sweep (maintainer self-audit)

- **Reviewer**: Maintainer (automated `check-tile-contract` sweep + manual fix review).
- **Scope**: The spec-v18 §2 output contract over all 442 registered
  compute functions (the `worked-examples.json` fixtures), driving each
  finite-numeric input slot to `0 / -1 / NaN / Infinity` and asserting the
  result is all-finite-or-`{error}`, pure, and non-mutating, with hangs and
  OOMs caught by running the sweep under a worker heap cap + timeout.
- **Method**: `node scripts/check-tile-contract.mjs` (worker-isolated),
  red-then-green regression test per fix in
  [../test/unit/tile-contract.test.js](../test/unit/tile-contract.test.js).
- **Findings**: 7 Tier-1 crashers (a perturbed input that hung, exhausted
  memory, or threw rather than returning `{error}`) and a Tier-2 backlog of
  889 perturbed-input non-finite *output* leaks across the catalog.
  1. `upgrade-roi` (`computeUpgradeROI`): `years = Infinity` looped the NPV
     accumulation forever. calc-cross.js.
  2. `loan-amortization` (`computeAmortization`): `term_months = Infinity`
     built an unbounded schedule array (OOM). calc-accounting.js.
  3. `macrs` (`computeMacrs`): `year_of_interest = NaN` indexed the schedule
     with `NaN`, throwing on `.year` of `undefined`. calc-accounting.js.
  4. `serial-dilution` (`computeSerialDilution`): `number_of_steps = Infinity`
     built an unbounded tube array (OOM). calc-lab.js.
  5. `hip-valley-rafter` (`computeHipValleyRafter`): `run_ft = Infinity` (or a
     non-positive jack spacing) looped the jack-rafter generator forever.
     calc-construction.js.
  6. `court-deadline` (`computeDeadline`): `days = Infinity` threw "Invalid
     time value" on the calendar path and looped on the court-day path.
     calc-legal.js.
  7. `solar-times` (`computeSolarTimes`): `tz_offset_hours = Infinity` spun
     the 1440-minute wrap loop forever. calc-field.js.
- **Disposition**:
  1. All 7 Tier-1 crashers fixed (finite-input guards / sane magnitude
     caps); Tier-1 backlog is now **0** and gated by `check-tile-contract`
     plus the `tile-contract.test.js` regression suite.
  2. The 889-entry Tier-2 backlog is grandfathered in
     [../test/fixtures/contract-baseline.json](../test/fixtures/contract-baseline.json);
     the gate fails on any *new* leak and the baseline is tightened
     module-by-module per spec-v18 §7.
  3. Separately, `check-shell-mobile` (promoted to a standing gate) caught
     the client-rendered changelog overflowing 320 px on long file-path /
     URL tokens; fixed with `overflow-wrap` on `#changelog-content`.

### Open solicitations for v0.11 / v0.12 (spec-v12 §15 gate 10)

Per spec-v12 §15 gate 10 the following external reviews are
solicited for the v0.11 / v0.12 release window. Both belong to
the spec-v12 §13.1 clinical-utility override scope, and the
override renewal clause in [profession-overrides.md](profession-overrides.md)
gates on these reviews landing.

- **Group U (Veterinary).** Sought reviewer: a working DVM or RVT
  with current Plumb's / AAHA / AAFP familiarity. Scope: the
  eighteen U.* tiles in [../calc-vet.js](../calc-vet.js), the
  professional-governs limitation banners, and the worked-example
  fixtures (RER, fluid maintenance, toxicity thresholds in
  particular).
- **Group V (EMS / Pre-hospital).** Sought reviewer: a current
  paramedic or EMS medical director with PALS / ATLS protocol
  familiarity. Scope: the twenty V.* tiles in
  [../calc-ems.js](../calc-ems.js), the receiving-facility
  governance verbiage, and the worked-example fixtures (Parkland,
  GCS, NIHSS, START / JumpSTART in particular).

Append the review under a new dated heading per the template
below when the signoff arrives.

### Open solicitations for v0.14 (spec-v14 §12 per-group signoff)

Per spec-v14 §12 the v0.14 close-out adds one signoff row per
active group A through Y (24 rows total). The v12 solicitations
above for Group U (Veterinary) and Group V (EMS) are the seed.
The remaining 22 group solicitations are appended here as they
are opened; each signoff is renewed on the v6 quarterly cadence
(90 days from review date) per spec-v14 §12.3 and §18.3.

The credential sought per group (spec-v14 §12.1):

- Group A Electrical, B Plumbing, C HVAC, D Restoration,
  E Construction, F Fire-ground, G Cross-trade, J Trucking,
  K Mechanic, L Agriculture, M Water, N Stage, O Kitchen,
  P Field: PE or equivalent trade certification.
- Group R Accounting: CPA.
- Group S Legal: JD.
- Group T Lab: PhD / MS in the relevant discipline.
- Group U Veterinary: DVM or RVT / LVT (v12 §13.1 override
  scope).
- Group V EMS: RN, MD, or paramedic with current protocol
  familiarity (v12 §13.1 override scope).
- Group W Pilots: ATP or CFI.
- Group X Real Estate: licensed broker, appraiser, or lender.
- Group Y Educators: working classroom teacher or curriculum
  specialist.
- Group H References and Group Q Historical: no signoff
  required (reference tiles use the v6 source-stamp recheck
  cadence; see [v6-audit.md](v6-audit.md)).

The signoff scope per group is the per-tile derivation rows in
[derivations.md](derivations.md), the worked-example fixtures
in [../test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json),
the per-group citations in [../citations.js](../citations.js),
and the per-tile dimension annotations in the source. See
[correctness.md](correctness.md) §"Per-group reviewer signoff"
for the operational summary.

### Per-group signoff status (v0.14)

The table below records the spec-v14 §12 signoff state per active
catalog group. Status values: **open** (no reviewer engaged yet),
**under-review** (reviewer engaged; signoff pending), **signed-off**
(signoff appended below under a YYYY-MM-DD section heading),
**renewal-due** (signoff older than the v6 quarterly cadence;
90-day window per §12.3 / §18.3). Groups H References and Q
Historical are **exempt** per spec-v14 §12.1 paragraph 2 (reference
tiles use the v6 source-stamp recheck cadence in
[v6-audit.md](v6-audit.md)).

This table is the structured state-machine the spec-v14 §12 / §18.3
quarterly-renewal lint reads. A row whose status remains **open**
past the v0.14 release does not block the release per spec-v14 §12,
but the v0.14 release announcement cannot carry the "audited" label
until every non-exempt row reaches **signed-off**.

| Group | Letter | Credential sought | Status | Last review | Next renewal | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Electrical | A | PE or equivalent trade certification | open | — | — | 44 tiles in [../calc-electrical.js](../calc-electrical.js); NEC 2023 primary source. |
| Plumbing | B | PE or equivalent trade certification | open | — | — | 38 tiles in [../calc-plumbing.js](../calc-plumbing.js); IPC 2021 primary source. |
| HVAC | C | PE or equivalent trade certification | open | — | — | 45 tiles in [../calc-hvac.js](../calc-hvac.js); ACCA Manual J / D + ASHRAE Fundamentals primary sources. |
| Restoration | D | PE or equivalent IICRC certification | open | — | — | 19 tiles in [../calc-restoration.js](../calc-restoration.js); IICRC S500 primary source. |
| Construction | E | PE or equivalent trade certification | open | — | — | 48 tiles in [../calc-construction.js](../calc-construction.js); IRC / IBC 2021 + ASCE 7 + AWC NDS primary sources. |
| Fire-ground | F | PE or fire-officer / instructor certification | open | — | — | 26 tiles in [../calc-fire.js](../calc-fire.js); NFPA 13 / 14 / 54 / 1142 / 1962 / 1981 + ISO PPC primary sources. |
| Cross-trade | G | PE or equivalent trade certification | open | — | — | 31 tiles in [../calc-cross.js](../calc-cross.js); NIST + NIOSH + OSHA primary sources. |
| References | H | (exempt per §12.1) | exempt | — | — | 15 reference tiles; v6 source-stamp recheck cadence applies. |
| Trucking | J | PE or equivalent trade certification (CDL instructor acceptable) | open | — | — | 13 tiles in [../calc-trucking.js](../calc-trucking.js); FMCSA primary source. |
| Mechanic | K | PE or ASE master certification | open | — | — | 13 tiles in [../calc-mechanic.js](../calc-mechanic.js). |
| Agriculture | L | PE or USDA NRCS technical service provider | open | — | — | 18 tiles in [../calc-agriculture.js](../calc-agriculture.js); USDA NRCS + FAO 56 + ASABE D497 primary sources. |
| Water | M | PE or AWWA grade-4 operator | open | — | — | 17 tiles in [../calc-water.js](../calc-water.js); AWWA primary source. |
| Stage | N | PE or IATSE / ESTA technical director | open | — | — | 8 tiles in [../calc-stage.js](../calc-stage.js); ESTA / ANSI E1.X primary sources. |
| Kitchen | O | PE or ServSafe / FDA-Food-Code-trained chef | open | — | — | 7 tiles in [../calc-kitchen.js](../calc-kitchen.js); FDA Food Code primary source. |
| Field | P | PE or equivalent trade certification | open | — | — | 9 tiles in [../calc-field.js](../calc-field.js). |
| Historical | Q | (exempt per §12.1) | exempt | — | — | 1 reference tile; v6 source-stamp recheck cadence applies. |
| Accounting | R | CPA | open | — | — | 16 tiles in [../calc-accounting.js](../calc-accounting.js); IRS + AICPA primary sources. |
| Legal | S | JD | open | — | — | 12 tiles in [../calc-legal.js](../calc-legal.js); FRCP + state-keyed shards primary sources. |
| Lab | T | PhD / MS in the relevant discipline | open | — | — | 14 tiles in [../calc-lab.js](../calc-lab.js); CRC Handbook + Numerical Recipes primary sources. |
| Veterinary | U | DVM or RVT / LVT (v12 §13.1 override scope) | open | — | — | 25 tiles in [../calc-vet.js](../calc-vet.js); Plumb's + AAHA + AAFP primary sources. v12 solicitation seed (see above). |
| EMS | V | RN, MD, or paramedic with current protocol familiarity (v12 §13.1 override scope) | open | — | — | 27 tiles in [../calc-ems.js](../calc-ems.js); AHA / ACLS + NIH + ACEP primary sources. v12 solicitation seed (see above). |
| Aviation | W | ATP or CFI | open | — | — | 23 tiles in [../calc-aviation.js](../calc-aviation.js); FAA H-8083 + 14 CFR primary sources. |
| Real Estate | X | Licensed broker, appraiser, or lender | open | — | — | 24 tiles in [../calc-realestate.js](../calc-realestate.js); FNMA / FHFA / HUD / CFPB primary sources. |
| Educators | Y | Working classroom teacher or curriculum specialist | open | — | — | 22 tiles in [../calc-edu.js](../calc-edu.js); OpenIntro Stats + NIST + IUPAC primary sources. |

Counts: 24 active groups (22 non-exempt; 2 exempt H / Q). At
2026-05-22: 0 signed-off, 22 open, 2 exempt.

---

## Template

When appending, copy the block below and fill in the fields.

```markdown
### YYYY-MM-DD — Short scope title

- **Reviewer**: Name (role, organization).
- **Scope**: e.g., "Citation track on Group A (Electrical) tiles 1–25."
- **Method**: e.g., "Live spot-check against NEC 2023 free-access TOC."
- **Findings**:
  1. Description. Reference: file:line or tile id.
  2. Description.
- **Disposition**:
  1. Fixed in commit ABC123 (link).
  2. Documented as known limitation in CHANGELOG.md / docs/legal.md (cite the actual file the maintainer used).
- **Reviewer comment** (optional, in their words).
```

## See also

- [../specs/spec-v10.md](../specs/spec-v10.md) §I.3 — the spec.
- [maintainer-quickstart.md](maintainer-quickstart.md) — the
  per-release self-audit ritual.
- [contributor-checklist.md](contributor-checklist.md) — the PR
  gate.
