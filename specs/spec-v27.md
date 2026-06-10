# roughlogic.com Specification v27 — Trade-Floor Deepening X: Welding, Sheet-Metal / Refrigeration, and Rigging (6 New Tiles, No New Group)

> **As-landed note (2026-06-09):** landed as **3 net-new tiles + 3 additive
> enhancements**, not 6 new tiles. A concept-overlap audit (not run when the
> draft was written) found that C.1 `duct-sizing-friction`, C.3
> `superheat-subcooling`, and G.1 `sling-load-tension` each duplicate an
> existing tile (`duct-sizing`, `superheat-subcool`, `sling-angle`
> respectively) by concept. Per the v20/v23/v24 dropped-not-renamed
> discipline, the three were dropped and their genuinely net-new deltas
> (trunk/branch velocity ceiling; TXV/EEV target-subcool verdict; D/d
> efficiency + min rated capacity + sub-30-degree hazard) landed as additive,
> backward-compatible enhancements to the existing tiles. The net-new tiles
> are E.1 `fillet-weld-strength`, C.2 `round-to-rect-duct`, and G.2
> `center-of-gravity-2point`. Catalog 540 -> 543. See docs/audit-trail.md.
>
> **Implementation status: DRAFT 2026-06-09 (targets package 0.28.0).** v27 is
> a catalog-growth spec in the lineage of v15/v16/v17/v20/v23/v24/v25/v26. It
> inherits everything from spec.md through spec-v26.md and changes none of it.
>
> It adds **6 new tiles across three existing groups** — **E Carpentry and
> Construction** (the welding/metal bench), **C HVAC** (the sheet-metal and
> refrigeration bench), and **G Cross-Trade Utilities** (the rigger's bench) —
> deepening the *adjacent main trades* the catalog already touches but does
> not yet finish. **No new groups, no new third-party dependencies, no new
> licenses, no telemetry, no AI, US standards only.** Every new tile ships
> with the full v14 discipline (dimensional annotation, bounds-fuzzer row,
> worked-example fixture cross-checked against its cited source, a complete
> inline `citations.js` entry with a relevant single-edition note, a
> `tile-meta.js` row with related-tiles and at least three search aliases, and
> a prerendered shell that passes the 320px audit) and is born into the
> hardened v18/v21 output contract and the v19/v22 citation discipline from
> its first commit. The package stamps **0.28.0** at the close.
>
> **The thesis.** v24 added welding *heat input* (the inspector's number) and
> metal *weight*; the catalog still cannot tell a welder whether a **fillet
> weld is strong enough** for the load — the most basic design question in the
> fab shop. The HVAC group sizes loads, chillers, and air changes but cannot
> **size a duct** by the equal-friction method, **convert round to
> rectangular**, or read **superheat / subcooling** at the gauges — the three
> numbers a sheet-metal installer and a service tech reach for every day.
> And the rigger — whose loads ride the crane the carpenter's `crane-lift-
> quick` already plans — still cannot compute **sling leg tension** by angle
> or **find the center of gravity** with two scales. Six numbers, three
> benches, all first-principles or named-code.
>
> **Count.** Measured against the live catalog of **540 tiles** (assuming v26
> lands first; **531** if it does not — the +6 delta holds either way), v27
> reaches **546**. Distribution of new tiles: **E +1, C +3, G +2.**
>
> Every per-tile structure below is Inputs / Output / Math / Citation / Edge
> cases / Tests per the v9/v12/v15/v16/v17/v20/v23/v24/v25/v26 pattern.
> Group-specific disclaimers apply unchanged (the weld and rigging tiles carry
> the "design of record / qualified procedure / rated capacity governs — field
> aid only" note; the refrigeration tile carries the "manufacturer's charging
> spec governs" note).

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
  AWS D1.1, AISC 360, ASHRAE Fundamentals, ACCA Manual D, SMACNA, ASME B30.9,
  and OSHA 1926.251 are cited **by name**; the AHJ-/spec-adopted edition note
  applies where it varies (v22 §2).
- Tile ids below are kebab-case and were checked against all 540 (and the 531
  pre-v26) live ids; none collide. Letter.number labels are scoped to v27.
- **No paywalled lookup is bundled.** Electrode allowable stresses, refrigerant
  saturation temperatures (read off the tech's gauge P-T scale), sling rated
  capacities, and D/d efficiencies are user-supplied (with common public
  defaults flagged), per spec-v12 §H. The weld, duct, and rigging geometry is
  author-original first-principles math (v14 §G first-principles class).
- **The new tiles cross-link the existing ones:** `fillet-weld-strength` ↔
  `weld-heat-input`, `weld-usage`, `metal-weight`, `bolt-torque`;
  `duct-sizing-friction` / `round-to-rect-duct` ↔ `air-changes-hour`,
  `static-pressure-piping`; `superheat-subcooling` ↔ the Group C charging /
  delta-T tiles; `sling-load-tension` / `center-of-gravity-2point` ↔
  `crane-lift-quick`, `pulley-ma-gen`, `vehicle-load`.

---

# Part I — Group E: the welding / fabrication bench (1 tile → calc-construction.js)

### E.1 Fillet weld strength and size (`fillet-weld-strength`)
**Inputs.** Mode (capacity-from-size / size-from-load). Fillet leg size (in),
total effective weld length (in), electrode classification (E60/E70/E80 — sets
the tensile strength, E70 default), the connected base-metal thickness (for
the AISC minimum/maximum fillet-size check), and the applied load (for the
size-from-load inverse). **Output.** The effective **throat**, the allowable
(ASD) or design (LRFD) **shear strength per inch**, the total weld **capacity**
(lb), a utilization ratio if a load is entered, and the AISC **minimum and
maximum** fillet size for the joint with a within-range flag. **Math.** Throat
`a = 0.707 · leg` (equal-leg); ASD allowable shear stress `= 0.30 · F_Exx`,
LRFD `φR_n = 0.75 · 0.60 · F_Exx · a · L`; minimum fillet size from AISC Table
J2.4 (by thinner part), maximum per J2.2b (`t − 1/16″` for `t ≥ ¼″`); inverse
solves the leg for a target load. **Citation.** "Fillet-weld effective throat
(`0.707·leg`) and shear strength (allowable `0.30·F_Exx`; LRFD
`0.75·0.60·F_Exx`) per AWS D1.1 *Structural Welding Code — Steel* and AISC 360
§J2, by name, with the minimum/maximum fillet sizes of AISC Table J2.4 and
§J2.2b. The qualified WPS, the weld inspector, and the engineer of record
govern; base-metal and matching-filler checks are the engineer's." **Edge
cases.** A leg or length ≤ 0 rejected (RC-1); a fillet smaller than the AISC
minimum or larger than the maximum fires the flag (C-5), it does not block the
strength number; the ASD/LRFD method is a labeled toggle so the two safety
bases are never mixed. **Tests.** Six unit tests; a ¼″ E70 fillet → throat
0.177″, ASD `0.30×70 = 21 ksi`, capacity per inch `21,000×0.177 ≈ 3,710 lb/in`;
a 6″ weld → ≈ 22.3 kip; size-from-load round-trip (C-4); a 1/8″ fillet on a ¾″
plate flagged below the J2.4 minimum.

---

# Part II — Group C: the sheet-metal and refrigeration bench (3 tiles → calc-hvac.js)

### C.1 Duct sizing by equal friction (`duct-sizing-friction`)
**Inputs.** Airflow (CFM), the design friction rate (in. wc per 100 ft;
default 0.08–0.10, the ACCA Manual D residential band, flagged), and an
optional duct material (galvanized default; flex/duct-board roughness note).
**Output.** The required **round** duct diameter (in), the resulting
**velocity** (fpm) with a trunk/branch ceiling flag (≤ 900 fpm trunk, ≤ 600
fpm branch residential), and the **equivalent rectangular** options at common
heights. **Math.** From the friction-rate / flow relation (the Darcy form
underlying the ASHRAE friction chart), solve the round diameter for the given
CFM and friction rate; velocity `= CFM / (π/4 · (D/12)²)`; equivalent
rectangular via the C.2 `D_e` relation. **Citation.** "Equal-friction duct
sizing — round diameter for a target friction rate and the resulting velocity
— per ACCA Manual D and the ASHRAE *Fundamentals* duct-design chapter and
SMACNA, by name; first-principles. The Manual-D design of record and the
installed system's measured static pressure govern." **Edge cases.** CFM ≤ 0
or friction rate ≤ 0 → `{ error }` (RC-1); a velocity over the trunk/branch
ceiling fires the flag (C-5); the friction-rate default is shown, not silently
applied. **Tests.** Six unit tests; 600 CFM at 0.08 in./100 ft → ≈ 10″ round
at ≈ 1,100 fpm (flag over branch ceiling); 100 CFM → ≈ 6″ round; velocity
cross-check (C-4).

### C.2 Round-to-rectangular duct equivalent (`round-to-rect-duct`)
**Inputs.** Mode (round→rect / rect→round). A round diameter, or a rectangular
duct's two sides; for round→rect a chosen height (or width) to solve the other
side. **Output.** The **equivalent diameter** `D_e`, the matching rectangular
dimension, and the **aspect ratio** with a flag above 4:1 (the sheet-metal
practical limit). **Math.** ASHRAE equal-friction equivalent diameter
`D_e = 1.30 · (a·b)^0.625 / (a + b)^0.250`; round→rect solves the unknown side
for a target `D_e`. **Citation.** "The ASHRAE equal-friction circular
equivalent of a rectangular duct,
`D_e = 1.30·(a·b)^0.625/(a+b)^0.250`, per ASHRAE *Fundamentals* (duct design)
and SMACNA, by name; first-principles. An equal-friction equivalence, not an
equal-velocity one — noted inline. The fabrication drawing governs."
**Edge cases.** A side or diameter ≤ 0 → `{ error }` (RC-1); an aspect ratio
above 4:1 fires the flag (C-5), it does not block the number; the
round→rect solve rejects a chosen side that makes the other non-positive.
**Tests.** Six unit tests; a 14″×8″ rect → `D_e ≈ 11.6″`; round→rect from a
12″ round at 8″ height → ≈ 13.3″ width; aspect-ratio flag at 20″×4″.

### C.3 Superheat and subcooling charge check (`superheat-subcooling`)
**Inputs.** Metering device (fixed orifice/piston → superheat method; TXV/EEV
→ subcooling method). For superheat: measured suction-line temperature and the
evaporator **saturation temperature** (read from the gauge's P-T scale) and a
target superheat (user-supplied, or the manufacturer/charging-chart value).
For subcooling: measured liquid-line temperature, the condenser **saturation
temperature**, and a target subcooling (default band 8–14 °F, flagged).
**Output.** The **actual superheat** (`T_suction − T_evap_sat`) and/or
**actual subcooling** (`T_cond_sat − T_liquid`), the deviation from target,
and an **add / recover / correct** verdict against the ±3 °F window.
**Math.** `SH = T_suction − T_sat,evap`; `SC = T_sat,cond − T_liquid`; verdict
from the signed deviation (`actual < target` → add for SC / recover for SH,
and the inverse), with the ±3 °F correct band. **Citation.** "Superheat
(`suction − evaporator saturation`) and subcooling (`condenser saturation −
liquid`) and the charge verdict per the ACCA / manufacturer charging practice
and the energy-code refrigerant-charge procedure (e.g., California Title-24
RA3), by name; first-principles temperature differences. Saturation
temperatures are read from the gauge P-T scale (refrigerant-specific) and
entered by the tech; the manufacturer's charging chart and the metering device
govern which method applies." **Edge cases.** A negative computed superheat
(suction below saturation — flooding/liquid floodback) flagged, not hidden; a
negative subcooling (no liquid seal) flagged; the metering-device toggle locks
the method so a fixed-orifice system is never charged by subcooling. No
non-finite output (pure subtractions). **Tests.** Six unit tests; suction
52 °F over a 40 °F evaporator saturation → 12 °F superheat; liquid 95 °F under
a 105 °F condenser saturation → 10 °F subcooling; an actual 5 °F under a 10 °F
SC target → "add refrigerant"; a negative superheat flags floodback.

---

# Part III — Group G: the rigger's bench (2 tiles → calc-cross.js)

### G.1 Sling leg tension by angle (`sling-load-tension`)
**Inputs.** Total load weight (lb), number of legs sharing the load (2; 3–4
with the conservative note), the sling **angle from horizontal** (or the
horizontal/vertical leg dimensions), and an optional D/d ratio (sling diameter
over the pin/load radius it bends around) for the bend-efficiency reduction.
**Output.** The **tension per leg**, the **load (angle) factor**, the required
**minimum sling rated capacity**, and the D/d efficiency-adjusted capacity if
a ratio is entered. **Math.** Per-leg tension
`= (W / n) · (1 / sin θ)` (θ from horizontal), equivalently `= (W/n)·(L/H)`
with L the sling length and H the vertical height; load factor `= 1/sin θ`;
D/d efficiency from the standard reduction curve (user-supplied or the common
table). **Citation.** "Sling leg tension by the angle (load) factor
`1/sin θ` and the D/d bend-efficiency reduction, per ASME B30.9 *Slings* and
OSHA 1926.251 and the standard rigging references (e.g., the Crosby /
ITI rigging handbooks), by name; first-principles statics. A computational
aid — the sling's rated capacity tag, the hitch, and the qualified rigger
govern; angles below 30° from horizontal are flagged as hazardous."
**Edge cases.** An angle ≤ 0 → `{ error }` (RC-1, the `1/sin θ` blows up); an
angle below 30° from horizontal fires the hazard flag (C-5); for 3+ legs the
tile notes that capacity is conventionally taken from 2 legs (the load may not
share equally) and does not silently divide by the full count. **Tests.** Six
unit tests; 2,000 lb on two legs at 60° → `1,000 × 1/sin60 ≈ 1,155 lb` per
leg; at 45° → ≈ 1,414 lb; at 30° → 2,000 lb per leg (flagged); a sub-30°
angle flagged.

### G.2 Center of gravity from two scales (`center-of-gravity-2point`)
**Inputs.** Mode (two-scale-weigh / pick-point-from-CG). The two scale (or
pick-point) readings and the distance between the two points; for the inverse,
the total weight, the CG location, and the two pick points. **Output.** The
**total weight** (sum of the two readings), the **CG distance** from each
reference point, the **percent of load** carried at each point, and (inverse)
the reading each pick point would see. **Math.** `W = S1 + S2`; CG distance
from point 1 `= (S2 · L) / (S1 + S2)` (moment balance); percent at each point
`= S_i / W`. **Citation.** "Center of gravity from a two-point weigh by moment
balance (`x̄ = S₂·L / (S₁+S₂)`), per the standard rigging practice in the
ASME B30.9 / ITI rigging references, by name; first-principles statics. A
field aid — the lift plan, the rated rigging, and the qualified rigger /
lift director govern." **Edge cases.** A total weight of zero → `{ error }`
(RC-1); a CG computed outside the span between the two points (a reading sign
error or an off-span load) flagged as out-of-range, not silently returned; the
distance `L ≤ 0` rejected. **Tests.** Six unit tests; readings 3,000 and 1,000
lb over 10 ft → 4,000 lb total, CG 2.5 ft from the 3,000-lb end (75% / 25%
split); inverse round-trip (C-4); zero total rejected.

---

## 4. Candidates dropped for concept-overlap (recorded, not renamed)

Per the v20/v23/v24/v25/v26 foreword discipline, candidates that duplicate an
existing tile by concept were dropped rather than relabeled:

- `weld-deposition-rate` / `weld-rod-usage` — covered by `weld-usage`
  (Welding Rod and Wire Usage); E.1 adds only the *strength/size* gap.
- `weld-heat-input` — already shipped (v24 E.1); `fillet-weld-strength`
  cross-links it.
- `duct-velocity` (velocity-only) — folded into `duct-sizing-friction`, which
  reports velocity as an output rather than a separate tile.
- `chiller-tonnage` / `delta-t` charging — the Group C delta-T and chiller
  tiles already exist; C.3 is the *refrigerant-side* superheat/subcooling
  check, a different measurement.
- `crane-lift-quick` — already shipped (Group E); the rigging tiles cross-link
  it rather than duplicating the lift-plan quick-math.
- `pulley-ma` — the mechanical-advantage case is `pulley-ma-gen`; G.1 is sling
  *tension by angle*, not a block-and-tackle ratio.

## 5. Acceptance

v27 is complete when: (a) each of the 6 new tiles ships with the full v14
discipline (dimensional annotation, bounds-fuzzer row, worked-example fixture
cross-checked against its cited source, complete inline `citations.js` entry
with a relevant single-edition note, `tile-meta.js` entry with related-tiles
and ≥ 3 aliases, and a prerendered shell that passes the 320px audit);
(b) every new function passes the v21 contract sweep (no non-finite numeric
field — in particular the throat/length, friction-rate, `(a+b)` equivalent-
diameter, `sin θ` sling, and `(S₁+S₂)` CG divisions are guarded per
RC-1/RC-2) and the v22 citation gates; (c) the ASD/LRFD, round/rect,
metering-device, and weigh/inverse toggles are labeled inline (render
faithfulness, v18 §5.4); (d) `npm test` and `npm run lint` are green;
(e) the catalog count advances by exactly 6 (E +1, C +3, G +2; 540 → 546);
(f) package stamps 0.28.0; (g) the v27 stanza in
[../docs/audit-trail.md](../docs/audit-trail.md) records the new-tile counts
per group and the AWS/AISC/ASHRAE/ACCA/SMACNA/ASME-B30.9/OSHA authorities
cited.

## 6. Closing note

v24 added the welder's heat input and the metal's weight; v27 lets the welder
ask whether the weld will hold. v26 finished the plumber's bench; v27 finishes
the sheet-metal installer's (size the duct, square it to a rectangle) and the
service tech's (read the charge at the gauges). And the rigger, whose load the
carpenter could already plan onto a crane, can now find the tension in every
leg and the center of gravity under the hook. Three adjacent trades the site
already half-served, each carried one bench further.
