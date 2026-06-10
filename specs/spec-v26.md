# roughlogic.com Specification v26 — Trade-Floor Deepening IX: Electrician, Plumber, and Pipefitter (9 New Tiles, No New Group)

> **Implementation status: DRAFT 2026-06-09 (targets package 0.27.0).** v26 is
> a catalog-growth spec in the lineage of v15/v16/v17/v20/v23/v24. It inherits
> everything from spec.md through spec-v25.md and changes none of it.
>
> It adds **9 new tiles across three existing groups** — **A Electrical**,
> **B Plumbing and Gas**, and **G Cross-Trade Utilities** — that finish the
> day-to-day reach-fors of the three trades the catalog was first built for.
> **No new groups, no new third-party dependencies, no new licenses, no
> telemetry, no AI, US standards only.** Every new tile ships with the full
> v14 discipline (dimensional annotation, bounds-fuzzer row, worked-example
> fixture cross-checked against its cited source, a complete inline
> `citations.js` entry with a relevant single-edition note, a `tile-meta.js`
> row with related-tiles and at least three search aliases, and a prerendered
> shell that passes the 320px audit) and is born into the hardened v18/v21
> output contract and the v19/v22 citation discipline from its first commit.
> The package stamps **0.27.0** at the close.
>
> **The thesis.** v24 landed the conduit-bending suite — the single most-
> performed piece of electrician field math — and the rolling offset for the
> pipefitter. v25 finished the surveyor's tailgate calculator. v26 closes the
> three remaining everyday gaps in the *named founding trades*: the
> electrician still cannot size a **feeder for a bank of motors** or the
> **conductors and protection for a transformer** on the site; the plumber
> still cannot blend a **tempering-valve setpoint**, size a **well pressure
> tank**, or read the **velocity** that drives copper erosion; and the
> pipefitter — whose rolling offset shipped but whose *most basic* number did
> not — still cannot compute a **fitting take-out cut length**, lay out a
> **multi-piece miter**, **wrap a template** for an angled cut, or **torque a
> flange**. None of these is exotic. Each is one formula a tradesperson
> already does on paper, a wheel, or a wrap of tape, made exact, cited, and
> shareable.
>
> **Count.** Measured against the live catalog of **531 tiles**, v26 reaches
> **540**. Distribution of new tiles: **A +2, B +3, G +4.**
>
> Every per-tile structure below is Inputs / Output / Math / Citation / Edge
> cases / Tests per the v9/v12/v15/v16/v17/v20/v23/v24/v25 pattern.
> Group-specific disclaimers apply unchanged (the code-dependent A/B tiles
> carry the "AHJ-adopted edition governs" note; the fitter tiles carry the
> "fitting take-out, bolt K-factor, and target preload are product-/spec-
> specific — confirm against your fittings, gasket, and the engineer of
> record" note).

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry,
  and reviewer-signoff apply to every new tile.
- The v18/v21 tile contract (totality, purity, domain honesty, unit-toggle
  consistency, flag-threshold correctness, magnitude safety, render
  faithfulness; no non-finite numeric field, ever) applies to every new
  function from the first commit. Each tile with a back-solve/inverse mode
  guards the new zeroable denominator the inverse introduces (the v21 RC-1
  seam) in the same commit.
- The v19/v22 citation discipline (inline, current, linkified, wraps at
  320px, edition-note relevance) applies to every new `citations.js` entry.
  The NEC articles, the IPC/UPC plumbing provisions, and the ASME/ASPE/AWWA
  references are cited **by name**; where an edition is locally variable the
  note directs the user to confirm the AHJ-adopted edition (v22 §2). No new
  tile carries a foreign edition note (the v22 CF-01 class).
- Tile ids below are kebab-case and were checked against all 531 live ids;
  none collide. Letter.number labels are scoped to v26.
- **No paywalled lookup is bundled.** Fitting take-out/make-up figures, bolt
  nut-factors (K), gasket seating stresses, and target bolt preloads are
  user-supplied (with common public defaults offered as a starting point and
  flagged confirm-against-your-spec, per spec-v12 §H). The fitter geometry
  (miter, wraparound, take-out) is author-original first-principles trig — no
  proprietary chart or app is reproduced (v14 §G first-principles class).
- **The fitter tiles cross-link the existing `rolling-offset`,
  `conduit-offset`, and `pipe-expansion-loop` tiles** so the single-plane
  offset, the rolling offset, and the take-out cut interoperate without a
  second tool. The motor and transformer tiles cross-link `motor-fla`,
  `motor-branch-from-nameplate`, `transformer-kva-sizing`, and
  `copper-resistance`.

---

# Part I — Group A: Electrical (2 tiles → calc-electrical.js)

The catalog sizes a single motor's branch circuit (`motor-branch-from-
nameplate`) and a transformer's kVA (`transformer-kva-sizing`). It does not
size the **feeder that serves several motors at once** or the **conductors
and overcurrent protection a transformer needs on each side**. These two
tiles close the Article 430 / Article 450 gap an industrial or commercial
electrician hits on every panel that feeds more than one motor or steps a
voltage on site.

### A.1 Feeder sizing for multiple motors (`motor-feeder-multiple`)
**Inputs.** A list of motors on one feeder, each with its table full-load
current (FLC, A — from `motor-fla`/NEC Table 430.250) and its branch-circuit
short-circuit/ground-fault device rating (A); optional non-motor continuous
and non-continuous load on the same feeder. **Output.** The minimum feeder
**conductor** ampacity, the maximum feeder **overcurrent device** rating, the
identified "largest motor," and the running total so the user sees which
motor drove the 125% term. **Math.** Feeder conductor per NEC 430.24:
`ampacity ≥ 1.25 × FLC_largest + Σ FLC_other + non-motor load`. Feeder
protection per NEC 430.62: `device ≤ largest_branch_device + Σ FLC_other`
(not rounded up — the next-smaller standard size where the sum is not a
standard rating). **Citation.** "Feeder conductor and feeder overcurrent
sizing for several motors on one feeder, per NEC 430.24 (conductor: 125% of
the largest motor plus 100% of the rest) and NEC 430.62 (protection: the
largest branch device plus the other motors' FLC), by name. The AHJ-adopted
NEC edition governs; table FLC (not nameplate FLA) is used for this sizing
per 430.6(A)." **Edge cases.** An empty motor list → `{ error }`; ties for
"largest" resolve to the one with the largest branch device (the 430.62
intent), noted inline; the 430.62 device is **not** rounded up to the next
standard size (unlike a branch device) — the tile takes the next size *down*
where needed and flags it, never leaking a value above the code maximum.
**Tests.** Six unit tests; three motors (FLC 28, 16, 10 A; largest branch
device 40 A) → conductor `1.25×28 + 16 + 10 = 61 A`, feeder device
`40 + 16 + 10 = 66 → 60 A` next size down; single motor reproduces the
`motor-branch-from-nameplate` 125% conductor (C-4 cross-check); empty list
rejected.

### A.2 Transformer conductor and overcurrent protection (`transformer-conductor-protection`)
**Inputs.** Transformer kVA, primary voltage, secondary voltage, phase
(1Ø/3Ø), and whether primary-only or primary-and-secondary protection is
provided. **Output.** Primary and secondary full-load amps, the maximum
**primary** overcurrent device, the maximum **secondary** overcurrent device
(when provided), and the minimum **secondary conductor** ampacity for the
common 240.21(C) tap lengths. **Math.** `FLA = kVA·1000 / (V)` (1Ø) or
`/(√3·V)` (3Ø); primary/secondary OCPD per NEC 450.3(B) (the 125% / 250% /
167% bands keyed to the rated current and whether secondary protection
exists), with the next-standard-size allowance of 450.3(B) note 1; secondary
conductor per NEC 240.21(C). **Citation.** "Transformer primary/secondary
full-load current and the overcurrent-protection maxima per NEC Table
450.3(B), with the secondary-conductor tap rules of NEC 240.21(C), by name.
A computational aid for the ≤ 1000 V case in 450.3(B); the AHJ-adopted NEC
edition and the design engineer govern. Inrush/point-of-supply coordination
is not modeled." **Edge cases.** A voltage of zero → `{ error }` (RC-1);
the 450.3(B) band boundaries (9 A, current ≥ / < the next-standard threshold)
are exact and labeled so a value sitting on a boundary is not silently moved;
primary-only vs primary-and-secondary changes the permitted percentage and is
a labeled toggle, never silently mixed. **Tests.** Six unit tests; 45 kVA
3Ø 480→208 V → primary FLA 54.1 A, secondary FLA 124.9 A; the 450.3(B)
primary-only 125% maximum reproduces a published example; FLA cross-checks
`transformer-kva-sizing` (C-4).

---

# Part II — Group B: Plumbing and Gas (3 tiles → calc-plumbing.js)

The catalog sizes supply and drain pipe by fixture units (`pipe-sizing`,
`sanitary-dfu`), but three numbers a plumber reaches for daily are missing:
the **blended temperature** out of a mixing/tempering valve, the **drawdown
sizing of a well pressure tank**, and the **velocity** in a line that governs
copper erosion-corrosion. Each is first-principles and cross-links the
existing pipe tiles.

### B.1 Mixing / tempering valve blend temperature (`mixed-water-temp`)
**Inputs.** Mode (find-blend / find-mix-ratio / find-hot-flow). Hot supply
temperature and cold supply temperature; for find-blend the hot and cold
flow rates (gpm); for find-mix-ratio the target delivered temperature.
**Output.** The blended delivery temperature (or the hot:cold flow ratio, or
the hot gpm) and the percent hot, with a scald-risk flag against the common
delivery limits (≤ 120 °F at the fixture, ≤ 110 °F for showers/tub fills per
the ASSE guards). **Math.** Energy balance for mixing two streams of the same
fluid: `T_blend = (Q_h·T_h + Q_c·T_c) / (Q_h + Q_c)`; inverse for the ratio
`Q_h/Q_c = (T_blend − T_c) / (T_h − T_blend)`. **Citation.** "First-principles
mixing energy balance for blending hot and cold potable water; the delivery-
temperature limits follow the ASSE 1017 (master tempering) and ASSE 1016/1070
(point-of-use scald-guard) device standards and the IPC/UPC scald provisions,
by name. The listed mixing valve and the AHJ govern the installed setpoint."
**Edge cases.** `T_h = T_c` with a requested blend between them → that single
temperature (degenerate, flagged), and a target outside `[T_c, T_h]` rejected
as unachievable (not extrapolated); `Q_h + Q_c = 0` → `{ error }` (RC-1); a
delivered temperature above the scald limit fires the flag (C-5), it does not
block the number. **Tests.** Six unit tests; 140 °F hot + 60 °F cold at equal
flow → 100 °F; target 105 °F from 140/60 → 56% hot (ratio 0.5625); a target
above the hot supply rejected.

### B.2 Well pressure-tank drawdown and sizing (`pressure-tank-drawdown`)
**Inputs.** Mode (find-drawdown from a tank / size-the-tank for a target
drawdown). Pump cut-in and cut-out pressures (psi), tank total volume (gal)
or the target drawdown, pump capacity (gpm), and the precharge (defaults to
cut-in − 2 psi, the standard diaphragm-tank rule, flagged). **Output.** The
usable **drawdown** (gal between cut-out and cut-in), the implied **minimum
runtime per cycle** and **cycles per hour** at the pump's gpm, a short-cycle
flag against the 1-minute-minimum-runtime rule, and (size mode) the required
total tank volume. **Math.** Diaphragm-tank drawdown by Boyle's law on
absolute pressures:
`drawdown = V_tank · (P_pre_abs/P_in_abs − P_pre_abs/P_out_abs)`
(with `P_abs = P_gauge + 14.7`, precharge `P_pre ≈ P_in − 2 psi`); runtime
`= drawdown / pump_gpm`; cycles/hr from the duty assumption. Size mode inverts
for `V_tank`. **Citation.** "Pressure-tank drawdown from Boyle's law on the
diaphragm air charge and the anti-short-cycle minimum-runtime rule (≈ 1 min
per cycle), per the published pump/tank engineering practice (Amtrol/WellMate
and the WQA references), by name; first-principles gas law. The pump
manufacturer's minimum runtime and the installed precharge govern."
**Edge cases.** Cut-out ≤ cut-in rejected; a precharge ≥ cut-in pressure
(tank will not draw down) flagged, not a negative drawdown; `pump_gpm = 0` →
the runtime/cycle outputs suppressed with a note rather than a divide-by-zero
(RC-1). **Tests.** Six unit tests; a 44-gal tank at 40/60 psi (38 psi
precharge) → ≈ 9–10 gal drawdown; runtime at 10 gpm ≈ 1 min flags borderline;
size mode round-trips the drawdown (C-4).

### B.3 Pipe velocity and erosion check (`pipe-velocity`)
**Inputs.** Mode (velocity-from-flow / max-flow-for-velocity). Flow rate
(gpm), nominal pipe size and material (copper / CPVC / PEX / steel, for the
actual inside diameter and the velocity ceiling), water service (hot or cold,
which sets the copper ceiling). **Output.** The flow velocity (ft/s), a
within-limit / over-limit verdict against the material erosion-corrosion
ceiling (copper ≈ 5 ft/s hot, 8 ft/s cold), and (max-flow mode) the gpm that
just reaches the ceiling. **Math.** Continuity:
`v (ft/s) = 0.4085 · gpm / d²` with `d` the actual inside diameter (in);
inverse `gpm = v · d² / 0.4085`. **Citation.** "Pipe-flow velocity from
continuity (`v = 0.4085·gpm/d²`) and the copper erosion-corrosion velocity
limits (≈ 5 ft/s hot, 8 ft/s cold) per the Copper Development Association /
ASTM and ASPE plumbing-design guidance, by name; first-principles. Pairs with
`pipe-sizing` (fixture-unit sizing) and `friction-loss`. Actual inside
diameter, not nominal, governs." **Edge cases.** A nominal size with no actual
ID in the bundled public reference → require a user ID; `d = 0` → `{ error }`
(RC-1); the hot/cold ceiling is a labeled toggle so a hot line is never judged
against the cold limit. **Tests.** Six unit tests; 10 gpm in ¾″ Type-L copper
(ID 0.785″) → ≈ 6.6 ft/s, over the 5 ft/s hot ceiling (C-5 flag); max-flow
mode round-trips (C-4); ID = 0 rejected.

---

# Part III — Group G: Cross-Trade — the pipefitter's bench (4 tiles → calc-cross.js)

The rolling offset (v24 G.1) is the only pure pipefitter tile in the catalog,
and it is the *advanced* case. The four numbers below are the *everyday* ones:
the cut length between two fittings, the cuts for a multi-piece miter, the
wraparound markback for an angled cut, and the flange bolt-up torque. All four
carry the "take-out, K-factor, and target preload are product-/spec-specific —
confirm against your fittings, gasket, and the engineer of record" note and
cross-link `rolling-offset`, `conduit-offset`, and `pipe-expansion-loop`.

### G.1 Fitting take-out cut length (`pipe-fitting-takeout`)
**Inputs.** The face-to-face (or center-to-center) dimension the run must
make, the joint type (threaded / socket-weld / butt-weld), the take-out of
the fitting at each end (user-supplied; common 90°/45° ell and tee take-outs
by pipe size offered as flagged defaults), and for threaded joints the thread
**make-up** (engagement) at each end. **Output.** The **cut length** of pipe
to fabricate the run, with the take-out and make-up terms shown so the fitter
sees the deduction. **Math.** Center-to-center to cut length:
`cut = C-to-C − (takeout_A + takeout_B) + (makeup_A + makeup_B)` (threaded
make-up adds back the thread engaged into each fitting; welded joints use the
weld gap, entered as a make-up or zero). **Citation.** "Fitting take-out /
make-up cut-length layout as taught in NCCER Pipefitting and the standard
fitter's references, by name; first-principles. Fitting take-out and thread
make-up are product- and schedule-specific and user-supplied; confirm against
your fittings and the spool drawing." **Edge cases.** A computed cut length
≤ 0 (fittings consume the whole run) flagged as impractical, not leaked
negative; threaded make-up greater than the take-out (over-engagement) flagged;
center-to-center vs face-to-face is a labeled toggle so the two references are
never silently mixed. **Tests.** Six unit tests; 24″ center-to-center between
two 1″ threaded 90° ells (take-out 1.5″ each, make-up ½″ each) →
`24 − 3 + 1 = 22″` cut; a butt-weld pair with a ⅛″ root gap each end;
fittings-consume-run case rejected.

### G.2 Multi-piece miter elbow layout (`pipe-miter-cut`)
**Inputs.** The total turn angle the miter must make (e.g., 90°), the number
of pieces (2 = single cut, 3, 4 …), the pipe outside diameter, and the
centerline radius (or a "cut-to-the-pipe" minimum). **Output.** The **miter
angle** at each cut, the number of welds, the **cutback** (the difference
between the long and short side of each cut), and the developed length of each
gore. **Math.** For an `n`-piece miter turning total angle `A` there are
`n − 1` cuts (welds) and the two end pieces are half-gores; the cut angle at
each weld `θ = A / (2·(n − 1))` measured from square; the cutback
`= OD · tan θ`; the long/short sides reference the centerline radius.
**Citation.** "Multi-piece (lobster-back) miter-elbow geometry — the per-cut
miter angle `A / (2·(n−1))` and the `OD·tan θ` cutback — as taught in NCCER
Pipefitting and the standard fabrication references, by name; first-principles
geometry. The welding procedure, the bevel, and the engineer of record govern
the fabricated fitting." **Edge cases.** `n < 2` rejected; a total angle
outside (0°, 180°) rejected; `θ → 90°` (degenerate flat cut) flagged, the
`tan θ` cutback not leaked as Infinity (RC-1). **Tests.** Six unit tests; a
2-piece 90° miter → one 45° cut; a 3-piece 90° miter → 22.5° at each of two
cuts; a 4-piece 90° → 15° at each of three cuts; 12.75″ OD at 22.5° →
≈ 5.28″ cutback.

### G.3 Pipe wraparound template ordinates (`pipe-template-wrap`)
**Inputs.** Pipe outside diameter (or circumference), the cut angle from
square (degrees), and the number of equal stations to mark around the
circumference (e.g., 8, 12, 16). **Output.** A table of **markback ordinates**
(the longitudinal offset from a reference line at each station), the
circumference, and the maximum ordinate (the difference between the long and
short side of the cut), for wrapping a tape or template and scribing the cut.
**Math.** For a plane cut at angle `α` from square, the longitudinal offset at
circumferential station `φ` is `y(φ) = (OD/2) · tan α · (1 − cos φ)` (the
saddle/ordinate method), with `φ` stepped over `0…360°` in equal stations;
circumference `= π·OD`; max ordinate `= OD · tan α`. **Citation.** "The
pipefitter's wraparound (ordinate) method for marking an angled pipe cut,
`y = (OD/2)·tan α·(1 − cos φ)`, as taught in NCCER Pipefitting and the
standard layout references, by name; first-principles geometry. A layout aid —
the bevel and fit-up govern the finished joint." **Edge cases.** A cut angle
of 0° (square cut) → all ordinates zero with a note; `α → 90°` flagged, the
`tan α` not leaked (RC-1); fewer than 4 stations rejected as too coarse to
scribe. **Tests.** Six unit tests; a square cut → zero ordinates; a 45° cut on
a 6.625″-OD pipe (8 stations) reproduces the ordinate table (max ordinate
6.625″); circumference `π·OD` cross-check.

### G.4 Flange bolt-up torque (`flange-bolt-torque`)
**Inputs.** Bolt nominal diameter (and thread series for the tensile stress
area), bolt count, target bolt preload — entered as a percent of bolt yield or
a target stress (with the bolt grade's yield as a flagged default, e.g., B7),
and the nut factor K (lubricated ≈ 0.16–0.20, dry ≈ 0.20–0.25; user-supplied,
default flagged). **Output.** The **target preload per bolt** (lb), the
**torque** per bolt (ft-lb and N·m), the resulting bolt **stress** (% of
yield), and the recommended **cross / star tightening pattern** order for the
bolt count. **Math.** `F = stress × A_tensile`; short-form torque
`T = K · D · F` (D nominal bolt diameter); the cross pattern is the standard
ASME PCC-1 legacy sequence for the count. **Citation.** "Bolt-preload torque
by the short-form `T = K·D·F` and the cross/star tightening sequence, per
ASME PCC-1 *Guidelines for Pressure Boundary Bolted Flange Joint Assembly* and
the ASME B16.5 flange classes, by name; the nut factor K, gasket seating
stress, and target preload are joint- and lubricant-specific and user-supplied.
A computational aid — the assembly procedure, gasket manufacturer, and the
engineer of record govern the installed torque." **Edge cases.** `D = 0` or a
tensile area ≤ 0 → `{ error }` (RC-1); a target stress above bolt yield flagged
as over-tension, not silently produced; the K range is shown so a dry-vs-lubed
mix-up is visible. **Tests.** Six unit tests; a ¾″ B7 bolt (A_t ≈ 0.334 in²)
at 50% of 105 ksi yield with K = 0.18 → preload ≈ 17,500 lb, torque
≈ `0.18 × 0.75 × 17,500 / 12 ≈ 197 ft-lb`; the 8-bolt cross sequence
(1-5-3-7-2-6-4-8) returned; over-yield target flagged.

---

## 4. Candidates dropped for concept-overlap (recorded, not renamed)

Per the v20/v23/v24/v25 foreword discipline, candidates that duplicate an
existing tile by concept were dropped rather than relabeled:

- `motor-overload-sizing` (NEC 430.32 running overload) — already covered by
  `motor-branch-from-nameplate`, which sizes the 125% branch conductor *and*
  the overload; A.1/A.2 add the **feeder** and **transformer** layers it does
  not.
- `single-plane-pipe-offset` — the conduit single-plane offset is
  `conduit-offset` and the pipe rolling case is `rolling-offset` (roll = 0);
  G.1 is the **take-out cut length**, a different question.
- `water-supply-fixture-units` / `wsfu-demand` — `pipe-sizing` already maps
  supply fixture units to a pipe size (the Hunter-curve demand is internal to
  it); B.1–B.3 add the *blend*, *tank*, and *velocity* questions it does not.
- `pipe-thermal-expansion` — covered by `pipe-expansion` and
  `pipe-expansion-loop`; the fitter tiles cross-link them rather than
  duplicating the loop math.
- `bolt-torque` (generic clamp load) — the generic fastener case is the
  Group E `bolt-torque` tile; G.4 is the **flange-joint** use (bolt count,
  cross sequence, ASME PCC-1 / B16.5 class), cross-linking it.

## 5. Acceptance

v26 is complete when: (a) each of the 9 new tiles ships with the full v14
discipline (dimensional annotation, bounds-fuzzer row, worked-example fixture
cross-checked against its cited source, complete inline `citations.js` entry
with a relevant single-edition note, `tile-meta.js` entry with related-tiles
and ≥ 3 aliases, and a prerendered shell that passes the 320px audit);
(b) every new function passes the v21 contract sweep (no non-finite numeric
field — in particular the feeder-largest, FLA-voltage, tank-pressure,
velocity-diameter, miter-angle, ordinate, and bolt-diameter divisions are
guarded per RC-1/RC-2) and the v22 citation gates; (c) the center-to-center
vs face-to-face, hot vs cold, square vs cut-angle, and primary-only vs
primary-and-secondary toggles are labeled inline (render faithfulness,
v18 §5.4); (d) `npm test` and `npm run lint` are green; (e) the catalog count
advances by exactly 9 (A +2, B +3, G +4; 531 → 540); (f) package stamps
0.27.0; (g) the v26 stanza in [../docs/audit-trail.md](../docs/audit-trail.md)
records the new-tile counts per group and the NEC/IPC/ASME/ASPE/AWWA
authorities cited.

## 6. Closing note

v24 taught the site to bend a stick of conduit; v25 taught it to lay out a
road. v26 finishes the three trades it was named for. The electrician can now
size the feeder for the whole motor bank and the conductors on both sides of a
transformer; the plumber can blend a tempering valve, size a well tank, and
read the velocity that eats copper; and the pipefitter — who got the fancy
rolling offset before the plain cut length — finally has the take-out, the
miter, the wraparound, and the flange torque. Nothing here is rare. That is
the point: a trades-math site built for the electrician, the plumber, and the
pipefitter should answer their *first* questions before their hundredth.
