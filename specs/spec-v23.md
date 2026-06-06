# roughlogic.com Specification v23 — Catalog Enhancement & Expansion VII (20 Enhancements + 23 New Tiles)

> **Implementation status: CLOSED (opened 2026-06-05; closed 2026-06-06).**
> All 23 new tiles AND all 20 Part I enhancements have landed; package stamps
> **0.23.0**. Progress: **all 23 of 23 new tiles** (catalog 437 → 460) and
> **all 20 of 20 enhancements** (EN.1–EN.20, additive, no existing correct
> output moved without an opt-in, each new zeroable denominator guarded per
> v21 RC-1). The first
> batch (8): A.1 `lux-to-footcandle`, C.1 `duct-velocity-pressure`,
> C.2 `refrigerant-velocity`, F.1 `fire-stream-reaction`,
> F.2 `sprinkler-k-factor`, K.1 `valve-flow-coefficient`,
> T.2 `od600-cell-count`, Y.1 `curve-grade-scaler`. The second batch (15):
> B.1 `trap-seal-loss`, B.2 `water-meter-sizing`, D.1 `drying-chamber-co2`,
> E.1 `wall-bracing-length`, E.2 `deck-ledger-fasteners`,
> J.1 `cargo-securement-wll`, J.2 `fuel-tax-ifta`, K.2 `screw-conveyor`,
> L.1 `pesticide-rei-phi`, M.1 `backflow-test-psi`, T.1 `gel-percent-agarose`,
> V.1 `pediatric-tube-depth`, W.1 `weight-shift-fuel-burn`,
> X.1 `depreciation-recapture`, X.2 `rent-roll-vacancy` — each with the full
> v14 discipline, the v21 contract, and a v22 citation. **Part II (23 new
> tiles) and Part I (20 enhancements) are both complete; v23 is CLOSED and
> the package stamps 0.23.0 per §24(f).** v23 is the value
> pass that follows the v21 hardening register and the v22 citation
> register. It does two things the prior two specs deliberately deferred:
> it **enhances twenty existing tiles** (adding inverse/solve-for modes,
> exposing hardcoded assumptions as inputs, adding cross-check outputs and
> second methods with labeled divergences) and it **adds twenty-three new
> tiles** that a working professional reaches for and the site does not yet
> compute. Because v23 lands after v21 and v22 are green, every enhanced
> path is born into the hardened tile contract and every new tile ships
> with a complete, inline, current, well-wrapped citation from its first
> commit — the v21 and v22 gates are inherited, not reopened. **No new
> groups, no new third-party dependencies, no new licenses, no telemetry,
> no AI, US standards only.** Package stamps **0.23.0** at the close.
>
> **Count.** v23 adds **23 new tiles** across thirteen existing groups.
> Measured against the catalog as it stands when v23 opens — 437 live tiles
> if v20's 55 have not yet landed, 492 if they have — the +23 delta holds
> either way; against the 492 target the catalog reaches **515**.
> Distribution of new tiles: A +1, B +2, C +2, D +1, E +2, F +2, J +2,
> K +2, L +1, M +1, T +2, V +1, W +1, X +2, Y +1. The twenty enhancements
> change no tile id and no group count.
>
> v23 inherits everything from spec.md, spec-v2.md … spec-v22.md. Every
> per-tile structure below is Inputs / Output / Math / Citation / Edge
> cases / Tests per the v9/v12/v15/v16/v17/v20 pattern; every enhancement
> is Tile / Change / Why / Math / Tests. Group-specific disclaimers apply
> unchanged (Group V EMS and the human-pediatric airway tile carry the
> "licensed provider governs — estimate/score only" banner; Group R/S/T
> carry the tax-law / legal-information / bench-science notices; Group W
> carries "POH/AFM and ATC govern"; code-dependent A/B/C/E/F tiles carry
> "AHJ-adopted edition governs").

> Foreword. The audit that produced v21 and v22 also produced a list it had
> nowhere to put: the places an existing tile stops one input short of the
> question the user actually has, and the numbers a tradesperson reaches
> for that the site simply does not have. The fuel-range tile that computes
> range from MPG but won't back-solve the MPG you actually got. The
> cap-rate tile that takes debt service as a given when the user has a loan,
> not a payment. The fireground that gets a needed-fire-flow but not the
> nozzle-reaction force that decides how many hands hold the line. v23 is
> that list, built the way the rest was built: every enhancement is
> surgical and additive, every new tile is one formula, one cross-check,
> one tolerance, one citation to a named US authority. Each was checked
> against all live ids and all 55 v20 drafts before it earned a line here —
> the six candidates that turned out to duplicate an existing tile by
> concept were dropped, not renamed.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example
  registry, and reviewer-signoff apply to every new tile and to every
  enhanced compute path.
- The v18/v21 tile contract (totality, purity, domain honesty,
  unit-toggle consistency, flag-threshold correctness, magnitude safety,
  render faithfulness; no non-finite numeric field, ever) applies to every
  new and changed function from the first commit. Enhancements that add a
  solve-for mode add a guard for the new zeroable denominator the inverse
  introduces (the v21 RC-1 seam) in the same commit.
- The v19/v22 citation discipline (inline, current, linkified, wraps at
  320px, edition-note relevance) applies to every new `citations.js` entry.
  No new tile carries a foreign edition note (the v22 CF-01 class).
- Tile ids below are kebab-case and were checked against all live ids and
  all 55 v20 draft ids; none collide. Letter.number labels are scoped to
  v23.
- Every "current rate / bracket / table value" is user-supplied or a
  declared shard per spec-v12 §H. v23 bundles no paywalled lookup. Where an
  edition/section is uncertain, the citation names the authority **by name**
  and directs the user to confirm the locally adopted edition (v22 §2).

---

# Part I — Enhancements to existing tiles (20)

Each enhancement is additive: it adds an output, an input, a mode, or a
second method to a tile that already ships. None changes a default that
would alter an existing correct output without the user opting in.

## 2. Group A / C — Electrical and HVAC

### EN.1 `seer-eer` — add SEER2/EER2 toggle and annual-cost cross-check
**Change.** Add a SEER↔SEER2 (and EER↔EER2) toggle and an estimated
annual-kWh/$ output from a user-supplied cooling load and electricity rate.
**Why.** The 2023 DOE M1 test procedure renamed and re-scaled the ratings;
a tech reading a 2023+ nameplate against the old conversion is wrong by the
external-static adjustment. **Math.** `SEER2 ≈ SEER × 0.95` (the ~4.5% M1
external-static delta, user-confirmable); `annual_kWh = load_BTU·hours /
(SEER × 1000)`; `$/yr = kWh × rate`. **Citation.** DOE 10 CFR 430 Subpart B
App. M1 by name. **Tests.** Round-trip SEER→SEER2→SEER within tolerance;
annual-cost cross-check fixture.

### EN.2 `superheat-subcool` — add target-superheat charge verdict
**Change.** Add the fixed-orifice target-superheat method (from indoor
wet-bulb and outdoor dry-bulb) and a pass / overcharge / undercharge
verdict against the target. **Why.** The tile computes the measured value
but not the decision the tech is at the unit to make. **Math.**
`target_SH = f(IDB_wb, ODB)` per the manufacturer's charging chart
(user-supplied points); verdict from `measured − target` with a deadband.
**Citation.** ACCA/manufacturer charging-chart method by name; complements
`refrigerant-charge` (a line-set estimate, not a field verification).
**Tests.** Verdict trip-points at the deadband edges (v21 C-5).

### EN.3 `balance-point` — add supplemental-heat (strip-kW) sizing output
**Change.** Add the auxiliary heat required below the balance point in
BTU/hr and electric-strip kW. **Why.** The balance temperature alone
doesn't size the backup; `Q_aux` does. **Math.**
`Q_aux = heat_loss(design) − heat_pump_capacity(design)`;
`kW = Q_aux / 3412`. **Citation.** ACCA Manual J / Manual S basis by name.
**Tests.** `Q_aux = 0` at/above balance point (no negative kW).

## 3. Group B — Plumbing and Gas

### EN.4 `tankless-gpm` — add solve-for-burner-size inverse + season preset
**Change.** Add a solve-for selector across {GPM, burner kBTU, ΔT} and a
summer/winter inlet-temperature preset. **Why.** The install question is
the inverse ("how many kBTU to deliver 5 GPM at a 70°F winter rise?"), at
the worst-case inlet. **Math.** `GPM = kBTU·1000 / (500·ΔT)`, solved for any
one term. **Citation.** First-principles `BTU/hr = 500·GPM·ΔT` (public).
**Tests.** Inverse round-trip; ΔT ≤ 0 → `{ error }` (v21 RC-1).

### EN.5 `water-heater-recovery` — add peak-demand sizing cross-check
**Change.** Add a peak-demand input (fixtures × draw) and flag whether the
first-hour rating meets it. **Why.** Turns a rating calculator into the
sizing decision. **Math.** `meets = first_hour_rating_gph ≥ peak_demand_gph`.
**Citation.** DOE 10 CFR 430 / AHRI 1300 first-hour-rating basis (already
cited). **Tests.** Boundary flag at exactly the rating (C-5).

### EN.6 `glycol-mix` — add burst-vs-freeze toggle and heat-transfer penalty
**Change.** Add a burst-protection / freeze-protection toggle and report
the specific-heat / flow penalty of the chosen mix. **Why.** A higher burst
dilution is allowed and changes the heat-transfer tradeoff the tech is
weighing. **Math.** Concentrate gallons for the selected protection
temperature (curves user-supplied); penalty from the mix's specific-heat
ratio. **Citation.** Glycol-manufacturer freeze/burst and heat-transfer
data by name (user-supplied). **Tests.** Burst mode yields a lower
concentrate than freeze mode at the same temperature.

## 4. Group E — Construction

### EN.7 `snow-load` — add sloped-roof factor and drift surcharge
**Change.** Add the sloped-roof factor Cs (so the output is the actual roof
snow load) and the leeward/windward drift-surcharge height. **Why.** The
balanced flat-roof load `Pf = 0.7·Ce·Ct·Is·Pg` ignores the slope reduction
and the drift that actually governs roof failures. **Math.**
`Ps = Cs·Pf`; drift height per ASCE 7 Ch. 7 (inputs user-supplied, Pg from
the ground-snow map). **Citation.** ASCE 7 Chapter 7 by name. **Tests.**
Cs = 1 at low slope; drift surcharge ≥ 0.

### EN.8 `wind-pressure` — expose Kz, Kzt, Kd, G as editable inputs
**Change.** Expose the exposure/height coefficient Kz, topographic Kzt,
directionality Kd, and gust factor G so the output is the design pressure,
not a sea-level placeholder. **Why.** `q = 0.00256·V²` is only the
reference velocity pressure; the coefficients are what make it a design
number. **Math.** `q = 0.00256·Kz·Kzt·Kd·V²`; `p = q·G·Cp`. **Citation.**
ASCE 7 Chapter 26–27 by name. **Tests.** All factors = 1 reproduces the
current output (backward-compatible default).

### EN.9 `anchor-embedment` — add edge-distance/spacing reduction + cracked toggle
**Change.** Expose edge distance and spacing and a cracked-vs-uncracked
toggle, with a reduced-capacity flag when edge distance is below the
critical value. **Why.** Edge distance and cracked concrete govern real
anchor capacity; bond strength alone overstates it. **Math.** Capacity
reductions per ACI 318 Ch. 17 concepts (factors user-supplied). **Citation.**
ACI 318 Chapter 17 by name. **Tests.** Sub-critical edge distance fires the
flag (C-5).

### EN.10 `footing-area` — add bearing-pressure check + eccentric flag
**Change.** Add the actual bearing pressure vs. allowable as an explicit
pass/fail and flag the non-uniform (eccentric) case when an applied moment
is entered. **Why.** A moment quietly overloads one edge; detention-time-
style "the basic number passed but the real governing check didn't."
**Math.** `q = P/A ± M·c/I`; flag when `q_min < 0` (uplift). **Citation.**
IBC Table 1806.2 presumptive bearing values by name (user-supplied).
**Tests.** Concentric load reproduces the uniform pressure; eccentric load
flags.

## 5. Group F — Fire

### EN.11 `required-fire-flow` — add NFPA/Iowa second method with divergence
**Change.** Add the NFPA 1142 area method and/or the Iowa rate-of-flow
(`V/100` gpm) beside the ISO needed-fire-flow, with the divergence labeled.
**Why.** A fireground officer wants the spread between methods, not one
number — the same exact-vs-rule-of-thumb pattern v20's
`elevation-pressure-loss` uses. **Math.** ISO `NFF = 18·C·F·√A`; Iowa
`Q = V/100`; both shown. **Citation.** ISO Fire Suppression Rating Schedule
+ NFPA 1142 + Iowa State rate-of-flow, all by name. **Tests.** Both methods
finite; divergence reported. (Note: this enhancement lands on the
`computeRequiredFireFlow` solver that v21 DR-05 hardens — the area guard
ships first.)

### EN.12 `master-stream` / `hydrant-flow` — add nozzle-reaction force output
**Change.** Add nozzle reaction force to both tiles. **Why.** The operator
needs the hose/appliance restraint force the stream inputs already imply.
**Math.** Smooth bore `NR = 1.57·d²·NP`; fog `NR = 0.0505·Q·√NP`.
**Citation.** IFSTA Pumping Apparatus Driver/Operator by name. **Tests.**
NR matches the published smooth-bore example.

## 6. Group K / M — Mechanic and Water

### EN.13 `fuel-range` — add solve-for-MPG / solve-for-tank inverse
**Change.** Add a solve-for selector across {range, MPG, tank}. **Why.**
The owner-operator's real question is often the inverse ("380 mi on this
tank — what was my MPG?"). **Math.** `range = tank·MPG`, solved for any one.
**Citation.** First-principles (public). **Tests.** Inverse round-trip;
MPG = 0 / tank = 0 → `{ error }` (RC-1).

### EN.14 `brake-pad-life` — expose wear-rate input + per-axle split
**Change.** Expose the pad-material wear rate as an editable field and add a
front/rear bias input for a per-axle life estimate. **Why.** Shop data
beats a benchmark; front pads do ~70% of the work and wear first.
**Math.** Per-axle life from the KE-per-stop core and the bias fraction.
**Citation.** SAE braking-energy basis (public) + shop wear data
(user-supplied). **Tests.** Bias 50/50 reproduces the single estimate.

### EN.15 `disinfection-ct` — add solve-for-t10 inverse + log/pathogen toggle
**Change.** Add a solve-for-required-t10 inverse and a 2/3/4-log ×
Giardia/virus selector. **Why.** Operators need "what contact time do I
need at this residual?" and the SWTR virus credits differ sharply from
Giardia. **Math.** `CT_req` from the user-supplied CT table for the
selected log/pathogen; `t10 = CT_req / residual`. **Citation.** EPA Surface
Water Treatment Rule CT tables by name (values user-supplied per §H).
**Tests.** Inverse round-trip; pathogen toggle changes CT_req.

### EN.16 `detention-time` — add overflow-rate + weir-loading cross-checks
**Change.** Add surface overflow rate (gpd/ft²) and weir overflow rate
(gpd/ft) from the same basin geometry. **Why.** Detention time alone passes
a clarifier that short-circuits; these are the companion loadings every Ten
States Standards review checks. **Math.** `SOR = Q/A_surface`;
`WOR = Q/L_weir`. **Citation.** Ten States Standards (GLUMRB) clarifier
loading by name. **Tests.** All three loadings finite for the worked basin.

### EN.17 `well-drawdown` — add recovery/transmissivity cross-check
**Change.** Add a recovery-rate input and an optional Jacob/Theis
transmissivity estimate. **Why.** Recovery is the other half of any well
test. **Math.** `T ≈ 264·Q / Δs` per log cycle. **Citation.** USGS aquifer-
test basis by name (already cited). **Tests.** T finite for the worked
drawdown; Δs = 0 → `{ error }`.

## 7. Group L / X — Agriculture and Real Estate

### EN.18 `npk-blend` — add lb/acre, bag-count, and kg/ha toggle
**Change.** Add application weight per acre, total bags/tons for a field
size, and a kg/ha toggle. **Why.** The lb/acre and bag count are what go on
the applicator's work order. **Math.** Arithmetic on the existing blend
result × acres. **Citation.** Land-grant extension fertilizer-blending
(public). **Tests.** Unit-toggle round-trip lb/acre ↔ kg/ha (C-4).

### EN.19 `sprayer-calibration` — add tank-batches and refill-points output
**Change.** Add field acres and tank size to output total spray volume,
tank loads, and acres per tankful. **Why.** The operator needs refill
timing, not just GPA. **Math.** `loads = total_volume / tank_size`;
`acres_per_tank = tank_size / GPA`. **Citation.** 1/128-acre calibration
method (extension, public); complements `tank-mix` without duplicating its
chemistry. **Tests.** Loads round up; GPA = 0 → `{ error }`.

### EN.20 `cap-rate-dscr` — expose loan terms + break-even occupancy
**Change.** Let the user enter loan amount/rate/amortization so debt
service is computed, and add the break-even occupancy ratio. **Why.** Most
buyers have a loan, not a payment, and the break-even occupancy is the one
number a lender and a buyer both check. **Math.** Debt service from the
amortization formula; `breakeven_occ = (OpEx + debt_service) /
potential_gross_income`. **Citation.** Appraisal Institute income-approach /
lender DSCR practice by name; cross-links to v20 `gross-rent-multiplier`.
**Tests.** Debt-service matches the amortization tile; rate = 0 handled.

---

# Part II — New tiles (23)

Each new tile is one formula, one cross-check, one tolerance, one named US
authority, and is born into the v21 contract and v22 citation discipline.

## 8. Group A — Electrical (1 tile → calc-electrical.js)

### A.1 Lux ↔ footcandle and lumen-method illuminance (`lux-to-footcandle`)
**Inputs.** Mode (convert / room illuminance); lux or footcandles; or
lumens, room area (ft²), coefficient of utilization, light-loss factor.
**Output.** The converted illuminance, and (room mode) average maintained
footcandles. **Math.** `fc = lux / 10.764`; lumen method
`fc = (lumens × CU × LLF) / area`. **Citation.** "IES Lighting Handbook
lumen method and the 10.764 lux-per-footcandle conversion (public). Pairs
with the `lighting-density` tile." **Edge cases.** Area ≤ 0 rejected; CU
and LLF in (0, 1]; conversion is exact, the room method is an average not a
point value (noted). **Tests.** Six unit tests; 100 fc = 1076.4 lux.

## 9. Group B — Plumbing and Gas (2 tiles → calc-plumbing.js)

### B.1 Trap-seal protection check (`trap-seal-loss`)
**Inputs.** Fixture-drain diameter (in), developed vent distance (ft), the
code-permitted maximum trap-to-vent distance for that diameter
(user-supplied from the adopted table), trap-seal depth (in; default 2).
**Output.** Within-limit pass/fail, percent of permitted distance used, and
a "self-/induced-siphonage risk" flag when the vent is inadequate.
**Math.** Pass if `developed_distance ≤ table_max`; flag residual seal
below 1 in. No proprietary table reproduced. **Citation.** "Per the adopted
plumbing code's trap-seal-protection and trap-to-vent distance provisions
(IPC §1002 / UPC §1002 by name). Table values user-supplied; the AHJ-adopted
edition governs. Free read-only at codes.iccsafe.org." **Edge cases.**
Trap arm beyond the table maximum flagged; S-traps out of scope.
**Tests.** Six unit tests; 2-in arm, 8-ft permitted, 6 ft used → pass, 75%.

### B.2 Water meter sizing from peak demand (`water-meter-sizing`)
**Inputs.** Peak demand (gpm), available pressure loss across the meter
(psi), the meter class's normal/peak flow ratings and loss curve
(user-supplied for the candidate size). **Output.** Adequate/undersized
verdict, percent of the meter's normal-flow rating used, and the headroom.
**Math.** Pass if `peak ≤ normal_rating` at the available pressure loss; %
of rating used. **Citation.** "Per AWWA M22 (Sizing Water Service Lines and
Meters) and the AWWA C700-series meter standards, by name; meter flow
ranges user-supplied. Free guidance summaries at awwa.org." **Edge cases.**
Demand above the peak rating flagged (next size up); pressure loss must be
the available drop, not the static pressure. **Tests.** Six unit tests.

## 10. Group C — HVAC (2 tiles → calc-hvac.js)

### C.1 Duct velocity pressure (`duct-velocity-pressure`)
**Inputs.** Solve-for (velocity / velocity pressure); VP (in. w.c.) or air
velocity (fpm). **Output.** The solved quantity and the equivalent
friction-rate context note. **Math.** `V = 4005·√VP`; `VP = (V/4005)²`
(sea-level standard air). **Citation.** "ACCA Manual D / ASHRAE
Fundamentals duct-design velocity-pressure relation (public). The 4005
constant is standard-air; altitude/temperature density correction not
applied, noted." **Edge cases.** Negative VP rejected; the constant is
standard density (flagged at altitude). **Tests.** Six unit tests; VP 0.25
→ V ≈ 2002 fpm.

### C.2 Refrigerant line velocity / oil return (`refrigerant-velocity`)
**Inputs.** Mass flow (lb/hr) or capacity + refrigerant, line inside
diameter (in), specific volume at the line condition (user-supplied),
riser/horizontal selector. **Output.** Velocity (fpm) and an oil-return
verdict against the ~500–4000 fpm window (riser minimum higher). **Math.**
`V = (mass_flow × specific_volume) / area`. **Citation.** "Per the ASHRAE
Refrigeration Handbook line-sizing and oil-return guidance, by name;
refrigerant properties user-supplied. Estimate; manufacturer line-sizing
tables govern." **Edge cases.** Below the suction-riser oil-return minimum
flagged; above ~4000 fpm flagged for noise. **Tests.** Six unit tests.

## 11. Group D — Restoration (1 tile → calc-restoration.js)

### D.1 Drying-chamber fresh-air / CO₂ buildup (`drying-chamber-co2`)
**Inputs.** Containment volume (ft³), occupant/equipment CO₂ generation
(cfm or ppm rise), target indoor CO₂ (ppm; default 1000), outdoor CO₂
(ppm; default 420). **Output.** Required fresh-air exchange (cfm) and air
changes per hour, with an "above target — increase fresh air" flag.
**Math.** `Q_fresh = generation / (C_indoor − C_outdoor)`; `ACH = Q·60 / V`.
**Citation.** "Per the ASHRAE 62.1 ventilation-rate mass-balance basis, by
name; complements the `chamber-turnover` tile (which sizes air movers, not
fresh air). IICRC S500 governs the drying plan." **Edge cases.** Indoor ≤
outdoor target rejected (no driving gradient); flags above 1000 ppm.
**Tests.** Six unit tests.

## 12. Group E — Construction (2 tiles → calc-construction.js)

### E.1 Braced-wall-panel length (`wall-bracing-length`)
**Inputs.** Braced-wall-line length (ft), required bracing percent for the
method/SDC/exposure (user-supplied from the IRC table), bracing method.
**Output.** Required braced-panel length (ft), provided vs. required, and a
pass/fail. **Math.** `L_req = bracing% × wall_line_length`. **Citation.**
"Per the IRC §R602.10 wall-bracing provisions, by name; the required
percent is user-supplied from the adopted IRC table. The AHJ-adopted
edition governs. Free read-only at codes.iccsafe.org." **Edge cases.**
Method-specific minimum panel lengths noted; the table percent is the
governing input. **Tests.** Six unit tests.

### E.2 Deck ledger fastener spacing (`deck-ledger-fasteners`)
**Inputs.** Joist span (ft), the IRC ledger-connection on-center spacing
for the fastener/span row (user-supplied), fastener type. **Output.**
On-center spacing, fasteners for the ledger length, and a span/spacing
pass. **Math.** Spacing from the user-supplied table row; count =
`ledger_length / spacing`. **Citation.** "Per the IRC §R507.9 deck ledger
connection provisions, by name; spacing values user-supplied from the
adopted table. AHJ governs. Free at codes.iccsafe.org." **Edge cases.**
Bolt edge-distance and stagger noted; bottom-of-ledger spacing excluded.
**Tests.** Six unit tests.

## 13. Group F — Fire (2 tiles → calc-fire.js)

### F.1 Nozzle / fire-stream reaction force (`fire-stream-reaction`)
**Inputs.** Nozzle type (smooth bore / fog), bore diameter (in) or flow
(gpm), nozzle pressure (psi). **Output.** Nozzle reaction force (lb) and a
staffing note vs. the ~60-lb one-person and ~75-lb hose-team thresholds.
**Math.** Smooth bore `NR = 1.57·d²·NP`; fog `NR = 0.0505·Q·√NP`.
**Citation.** "Per the IFSTA Pumping Apparatus Driver/Operator nozzle-
reaction formulas, by name (public). A dedicated solver across nozzle
types; complements the `master-stream` and `hydrant-flow` reaction
outputs." **Edge cases.** NP ≤ 0 rejected (v21 RC-1); the staffing
thresholds are advisory. **Tests.** Six unit tests.

### F.2 Sprinkler K-factor solver (`sprinkler-k-factor`)
**Inputs.** Solve-for (flow / pressure / K-factor); any two of {Q (gpm),
P (psi), K}. **Output.** The solved quantity. **Math.** `Q = K·√P`, solved
for any one. **Citation.** "Per the NFPA 13 sprinkler discharge relation
Q = K·√P, by name (public). Complements the `sprinkler-density` tile. NFPA
13 governs the design; free read-only at nfpa.org/freeaccess." **Edge
cases.** P ≤ 0 rejected; K is the nominal nameplate K (temperature/orifice
variants noted). **Tests.** Six unit tests; K 5.6 at 7 psi → ≈ 14.8 gpm.

## 14. Group J — Trucking (2 tiles → calc-trucking.js)

### J.1 Cargo securement working-load-limit check (`cargo-securement-wll`)
**Inputs.** Cargo weight (lb), number and type of tiedowns with their WLLs
(user-supplied), cargo length (ft). **Output.** Aggregate WLL, the
½-cargo-weight requirement, pass/fail, and the minimum tiedown count for the
length. **Math.** `Σ WLL ≥ 0.5 × cargo_weight`; count rule one tiedown per
10 ft (and per article). **Citation.** "Per FMCSA 49 CFR 393.100–393.136
cargo securement (the aggregate-WLL and tiedown-count rules), by name. WLLs
user-supplied from the marked hardware. FMCSA enforces. Free at ecfr.gov."
**Edge cases.** Commodity-specific rules (logs, vehicles, coils) out of
scope, flagged; WLL is the marked rating, not breaking strength. **Tests.**
Six unit tests.

### J.2 IFTA per-jurisdiction fuel tax (`fuel-tax-ifta`)
**Inputs.** Per-jurisdiction miles, fleet average MPG, per-jurisdiction tax
rate ($/gal; user-supplied), gallons purchased per jurisdiction.
**Output.** Taxable gallons per jurisdiction, net tax due/credit per
jurisdiction, and the fleet total. **Math.** `taxable_gal = miles / MPG`;
`net = Σ(taxable_gal × rate) − Σ(gallons_purchased × rate)`. **Citation.**
"Per the IFTA Articles of Agreement quarterly-return method, by name;
per-jurisdiction rates change quarterly and are user-supplied per spec-v12
§H. The base jurisdiction's return governs. Free at iftach.org." **Edge
cases.** MPG = 0 rejected; a credit jurisdiction (over-purchased) reported
as a negative net. **Tests.** Six unit tests.

## 15. Group K — Mechanic (2 tiles → calc-mechanic.js)

### K.1 Valve flow coefficient Cv (`valve-flow-coefficient`)
**Inputs.** Solve-for (Cv / flow / ΔP); fluid (liquid / gas), specific
gravity, any two of {Cv, Q, ΔP}. **Output.** The solved quantity.
**Math.** Liquid `Q = Cv·√(ΔP / SG)`, solved for any one (gas form noted as
the compressible variant). **Citation.** "Per the ISA-75.01 / Crane TP-410
control-valve sizing relation Q = Cv·√(ΔP/SG), by name (public liquid
form). The gas/compressible regime uses a different equation, flagged."
**Edge cases.** ΔP ≤ 0 rejected; choked/cavitating flow out of scope,
flagged. **Tests.** Six unit tests.

### K.2 Screw / auger conveyor capacity (`screw-conveyor`)
**Inputs.** Screw diameter (in), shaft diameter (in), pitch (in), RPM,
trough loading fraction. **Output.** Volumetric capacity (ft³/hr) and, with
a bulk density, mass rate (lb/hr or ton/hr). **Math.**
`Q = (π/4)(D² − d²)·pitch·RPM·loading·60`. **Citation.** "Per the CEMA
Screw Conveyor standard (book No. 350) capacity method, by name; loading
fractions per CEMA material classes (user-supplied). Estimate; CEMA and the
manufacturer govern." **Edge cases.** Loading above the CEMA class maximum
flagged; pitch ≠ diameter handled. **Tests.** Six unit tests.

## 16. Group L — Agriculture (1 tile → calc-agriculture.js)

### L.1 Pesticide REI / PHI clock (`pesticide-rei-phi`)
**Inputs.** Application date/time, the product's restricted-entry interval
(hr) and pre-harvest interval (days) from the label (user-supplied).
**Output.** REI-clear timestamp, PHI-clear date, and an "early entry /
early harvest violation" flag against a planned date. **Math.**
`REI_clear = application + REI_hours`; `PHI_clear = application_date +
PHI_days`. **Citation.** "Per the EPA Worker Protection Standard 40 CFR 170
(REI) and the product label's PHI, by name — the label is the law (FIFRA).
REI/PHI values user-supplied from the label. Free at epa.gov and ecfr.gov."
**Edge cases.** Label always governs over any default; time-zone/DST
handled in local time, noted. **Tests.** Six unit tests including a
DST-boundary REI.

## 17. Group M — Water (1 tile → calc-water.js)

### M.1 Backflow assembly test pass criteria (`backflow-test-psi`)
**Inputs.** Assembly type (RP / DC), measured differential across check #1
(psid), RP relief-valve opening point (psid), check #2 tightness (psi).
**Output.** Pass/fail per the assembly type with the governing criterion.
**Math.** RP: relief opens ≥ 2 psid below the #1 check **and** #1 check
≥ 5 psid (tester-procedure thresholds); DC: each check ≥ 1 psid tight.
**Citation.** "Per the USC FCCCHR Manual of Cross-Connection Control and
AWWA C511 field-test procedure, by name; complements the plumbing backflow
tiles. The certified tester and the water purveyor govern." **Edge cases.**
Gauge accuracy and the opening-point definition noted; assembly-specific
procedures govern. **Tests.** Six unit tests at the pass/fail thresholds
(C-5).

## 18. Group T — Bench Science (2 tiles → calc-lab.js)

### T.1 Agarose gel percent (`gel-percent-agarose`)
**Inputs.** Target DNA size range (bp), buffer volume (mL), or a chosen gel
percent. **Output.** Recommended agarose percent for the resolution range
and grams of agarose for the volume. **Math.** Percent→resolution from the
standard map; `grams = percent/100 × volume_mL`. **Citation.** "Per
Sambrook & Russell, Molecular Cloning, gel-electrophoresis resolution
tables, by name; complements the `pcr-master-mix` tile. Lab SOP governs."
**Edge cases.** Very small/large fragments fall outside standard agarose
(PAGE/pulsed-field noted); percent clamped to a sane 0.5–3% band.
**Tests.** Six unit tests; 0.8% for 0.5–10 kb.

### T.2 OD₆₀₀ to cell density (`od600-cell-count`)
**Inputs.** OD₆₀₀ reading, organism conversion factor (cells/mL per OD;
user-supplied), dilution factor. **Output.** Cells/mL of the original
culture and a linear-range validity flag. **Math.**
`cells/mL = OD₆₀₀ × factor × dilution`. **Citation.** "Standard microbiology
spectrophotometry; the OD-to-cells factor is strain- and instrument-
specific and user-supplied. Linear range typically OD < ~0.8 (dilute and
re-read above it), flagged. Lab SOP governs." **Edge cases.** OD above the
linear range flagged; factor must be supplied (no universal constant).
**Tests.** Six unit tests.

## 19. Group V — EMS (1 tile → calc-ems.js)

### V.1 Pediatric ET-tube size and depth (`pediatric-tube-depth`)
Carries the spec-v12 §13 "licensed provider governs — estimate/score only"
banner.
**Inputs.** Age (yr) or a length-based (Broselow) estimate, cuffed/uncuffed
selector. **Output.** ETT internal diameter (mm) and insertion depth at the
lip (cm). **Math.** Uncuffed `ID = age/4 + 4`; cuffed `ID = age/4 + 3.5`;
`depth_cm = ID × 3` (or 3 × tube size). **Citation.** "Per the AHA PALS
age/length-based airway formulas and the Broselow-tape nomogram, by name;
estimate only. Confirm depth by auscultation, capnography, and a chest
film; the EMS medical director and receiving physician govern." **Edge
cases.** Distinct from the veterinary `vet-ett-sizing` tile; neonates fall
outside the age formula (length-based only), flagged; cuffed/uncuffed
changes the constant. **Tests.** Six unit tests; 4-yr uncuffed → ID 5.0 mm,
depth 15 cm.

## 20. Group W — Aviation (1 tile → calc-aviation.js)

### W.1 In-flight CG migration as fuel burns (`weight-shift-fuel-burn`)
Carries the "POH/AFM and ATC govern" notice.
**Inputs.** Zero-fuel weight and moment, fuel loaded (gal) and fuel-tank
arm (in), fuel burn rate (gph), elapsed time or fuel burned. **Output.**
Weight and CG at the entered time, and the time/fuel at which the CG leaves
the forward or aft limit (limits user-supplied from the envelope).
**Math.** `weight(t) = W0 − burned_gal × 6`;
`CG(t) = (moment0 − burned_gal × 6 × fuel_arm) / weight(t)`; solve for the
limit crossing. **Citation.** "Per the FAA Weight & Balance Handbook
(FAA-H-8083-1) moment/arm method, by name; envelope limits user-supplied
from the AFM. Pilot-in-command and the AFM loading graph govern. Free at
faa.gov." **Edge cases.** Assumes a fixed fuel-tank arm (multi-tank
sequencing out of scope, flagged); 6 lb/gal is avgas standard (Jet-A
differs, toggle). Extends v20 `weight-shift-cg` into the time domain.
**Tests.** Six unit tests.

## 21. Group X — Real Estate (2 tiles → calc-realestate.js)

### X.1 Depreciation recapture on sale (`depreciation-recapture`)
**Inputs.** Asset class (§1250 real property / §1245 personal property),
accumulated depreciation ($), total gain ($), ordinary rate (%; user-
supplied), §1250 max rate (25%). **Output.** Recaptured amount, the rate
applied, the recapture tax, and the remaining capital-gain portion.
**Math.** §1245 recapture `= min(gain, accumulated_depreciation)` at the
ordinary rate; §1250 unrecaptured `= min(gain, straight-line depreciation)`
at the 25% max. **Citation.** "Per IRS Pub 544 and IRC §1245 / §1250, by
name; the §1250 unrecaptured-gain 25% maximum rate and §1245 ordinary
recapture. Complements the `macrs-depreciation` and `section-179` tiles.
Tax information, not advice; current IRS rules and a CPA govern. Free at
irs.gov and uscode.house.gov." **Edge cases.** Recapture cannot exceed the
gain (asserted); the 25% figure is a maximum, not a flat rate (noted); state
recapture differs. **Tests.** Eight unit tests including a §1250 sale below
and above the straight-line line.

### X.2 Rent roll to effective gross income (`rent-roll-vacancy`)
**Inputs.** Potential gross rent ($/yr), vacancy rate (%), credit-loss rate
(%), other income ($/yr). **Output.** Vacancy/credit loss ($), effective
gross income ($), and the loss as a percent of potential. **Math.**
`EGI = potential_rent × (1 − vacancy% − credit%) + other_income`.
**Citation.** "Per the Appraisal Institute income-approach EGI definition,
by name (public); feeds the `cap-rate-dscr` tile. Appraiser and lender
govern the underwritten figures." **Edge cases.** Combined vacancy + credit
above 100% rejected; other income is not vacancy-adjusted (noted).
**Tests.** Six unit tests.

## 22. Group Y — Educators (1 tile → calc-edu.js)

### Y.1 Grade-curve scaler (`curve-grade-scaler`)
**Inputs.** Method (flat add / square-root / linear rescale-to-target-mean),
raw score (or class mean), the method parameter (points to add, or target
mean). **Output.** The curved score (and, for the linear method, the slope
and intercept applied). **Math.** Flat `new = raw + k`; square-root
`new = 10·√raw`; linear `new = raw × a + b` solved to hit the target mean.
**Citation.** "Standard psychometric score-scaling methods (public); the
flat, square-root, and linear-rescale curves. Estimate only — the
instructor's gradebook and academic-integrity policy govern final grades."
**Edge cases.** Curved score clamped to [0, 100]; the square-root curve
only raises scores below 100 (noted); negative raw rejected. **Tests.** Six
unit tests; square-root of 49 → 70.

---

## 23. Candidates dropped for concept-overlap (recorded, not renamed)

Per the v20 foreword discipline, candidates that duplicate an existing tile
by concept were dropped rather than relabeled: `pump-affinity-power`
(covered by `affinity-laws`), `nec-conductor-fill-derate` (covered by
`ambient-ampacity-adjust` + `conduit-fill`), `motor-overload-sizing`
(covered by `motor-branch-from-nameplate`), `reaction-time-stopping`
(covered by `braking-distance` + `stopping-sight-distance`),
`vet-blood-volume` (covered by `vet-transfusion`), and `burn-fluid-rate`
(covered by `parkland-formula`).

## 24. Acceptance

v23 is complete when: (a) each of the 20 enhancements lands additively,
changes no existing correct output without an opt-in, and adds a guard for
any new zeroable denominator its inverse mode introduces (v21 RC-1);
(b) each of the 23 new tiles ships with the full v14 discipline
(dimensional annotation, bounds-fuzzer rows, worked-example fixture
cross-checked against its cited source, complete inline `citations.js`
entry with a relevant edition note, `tile-meta.js` entry with related-tiles
and ≥ 3 aliases, and a prerendered shell that passes the 320px audit);
(c) every new and changed function passes the v21 contract sweep (no
non-finite numeric field) and the v22 citation gates; (d) `npm test` and
`npm run lint` are green; (e) the catalog count advances by exactly 23;
(f) package stamps 0.23.0; (g) the v23 stanza in
[../docs/audit-trail.md](../docs/audit-trail.md) records the enhancement
and new-tile counts per group.

## 25. Closing note

v18–v20 hardened the contract, made the citations honest, and added the
next fifty-five. v21–v22 read the whole surface and fixed what the framework
specs had only promised to catch. v23 is the value the audit surfaced on the
way: twenty tiles that now answer the inverse question the user actually
had, and twenty-three numbers a working professional reaches for that the
site finally computes — each born into a hardened contract and an honest
citation, because the order was the point. Make the four-hundredth tile
incapable of lying first; then the five-hundredth is born telling the truth.
