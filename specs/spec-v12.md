# roughlogic.com Specification v12 - Profession Expansion, UI/UX Hardening, and Data-Refresh Automation

> **Implementation status (drafted 2026-05-12): proposed.** v12 is the
> largest expansion since v5 by tile count and the first since v9 by
> spec scope. It introduces five new groups (U Veterinary, V EMS /
> Pre-hospital, W Pilots / Aviation, X Real Estate, Y Educators) for
> roughly ninety new tiles, formalizes the UI/UX mobile-responsive
> audit that Phase F captures, defines the wiring-correctness gate
> that Phase G locks in (closing the class of bug that hid
> v5-platform.js from the production build for the entire v5 release
> window), and lays out the tiered automated data-refresh that Phase H
> wires into `.github/workflows/`. Every constraint from spec.md
> through spec-v11.md continues unchanged. No new third-party
> dependencies, no new licenses, no new storage keys, no telemetry,
> no AI. The site remains a 100 percent client-side static bundle.

> Foreword, in the voice of a maintainer reading a Cloudflare
> dashboard six months into hosting and noticing that 642 humans have
> visited the site since the day it shipped, 82 of them yesterday,
> none of them paying anything, none of them tracked, and all of
> them looking for a deterministic answer to a question their job
> demands.
>
> The site set out to be the calm, fast, ad-free, account-free,
> ever-free reference for the trades. v1 through v11 built and
> hardened the trades core. v12 is the next obvious move: the
> professions adjacent to the trades whose practitioners ask the
> same shape of question and currently rely on either a paid app
> the agency phone blocks or a half-broken government site that
> takes six clicks to surface a number that fits in one line. The
> test for whether a profession belongs on this site is the same
> test that picked the v1 trades: is the work fundamentally "do
> math over public data, then defer to the human who governs the
> decision"? If yes, the profession fits. If the work involves
> anything subjective, anything that needs context the user has
> but the formula does not, or anything that is genuinely advice
> rather than reference, the profession does not fit and the site
> is the wrong tool.
>
> By that test the five professions in this spec fit. The vet tech
> who needs a dose in mg/kg, the paramedic who needs the Parkland
> formula, the GA pilot who needs density altitude, the broker who
> needs the 1031 timeline, the high-school teacher who needs a
> Flesch-Kincaid score - each of them is currently paying
> twenty-nine dollars a year, fighting a captcha, or asking a
> colleague to read a number off the back of a card. The math is
> the same math it has always been. The data is the same data the
> federal government already publishes. The contribution of this
> site is putting them together with no friction and no fee.
>
> v12 also captures three operational debts that v11 left visible.
> First, the per-tile mobile-responsive audit that the catalog has
> grown past without a formal sweep (the reported bug is the
> reference block overflowing the viewport on a 375 px iPhone SE
> because `grid-template-columns: max-content 1fr` plus a
> `white-space: nowrap` dt and a long URL in the dd does not
> shrink). Second, the wiring-correctness gate (the v5-platform.js
> miss caught 2026-05-12 was discoverable in any release window
> if the build had walked the dependency graph; v12 promotes that
> walk to a lint). Third, the data-refresh cadence (the existing
> monthly job is the right floor, but state-keyed shards need
> weekly and the v9 commodity series want at least weekly so a
> reader-of-the-site-in-2030 does not see a 30-day-old fuel
> number). v12 wires the tiered cadence into the workflow.
>
> Build it the way the rest of the site was built. One tile, one
> calculation, one citation, one copy. Then get out of the
> professional's way, and make sure the citation is still right
> ten years from now.

This document is the v12 spec. It inherits everything from spec.md,
spec-v2.md, spec-v3.md, spec-v4.md, spec-v5.md, spec-v6.md, spec-v7.md,
spec-v8.md, spec-v9.md, spec-v10.md, and spec-v11.md. Where v12
expands a prior-spec exclusion (specifically the "live drug-dosing or
clinical decision support" carve-out in spec.md / spec-v9 §11), v12
records the override and the rationale in §13 below. Every other
constraint from every earlier spec remains in force.

Repository: github.com/clay-good/roughlogic.com

US standards only. Assume all visitors are in the United States. The
US-only posture is reaffirmed here (see §2 below); an international
expansion is its own future spec and is explicitly out of scope.

## 1. Inheritance

Every constraint from prior specs continues without exception. v12
adds five new groups (U, V, W, X, Y), roughly ninety new tiles, three
new data folders (`data/vet/`, `data/ems/`, `data/aviation/`; the
existing `data/legal/` and `data/accounting/` cover Group X needs and
the existing `data/lab/` covers most Group Y needs), one new
`data/edu/` shard for readability bands, no new licenses, no new
third-party dependencies, no new storage keys, and no new state
mechanism. URL hash remains the only state channel. CSP remains
`default-src 'self'; connect-src 'self'; worker-src 'self'`.

The hard limits still bind:

- 100 percent client-side, single-page static, Cloudflare Pages, no
  server, no account, no telemetry, no AI, no API key, no third-party
  fetch beyond same-origin static assets.
- No localStorage / sessionStorage / cookies / IndexedDB beyond
  `rl-theme`. URL hash is the only state mechanism (`rl-bigbuttons`
  retired in v11).
- CSP `default-src 'self'`, `connect-src 'self'`, `worker-src 'self'`.
- WCAG 2.2 AA, 48 px touch targets, voice input, single h1,
  High-Contrast theme (Big Buttons retired in v11; browser zoom
  covers the use case).
- No emojis, no em-dashes, no decorative icons.
- Home-view payload budget under 100 KB after gzip (currently at
  48,850 B = 47.7 percent of cap; JS sub-budget the tightest at
  95.5 percent of its 40 KB sub-cap).
- Public changelog, semver, no flags, 90-day deprecation.
- "AHJ governs" posture on every code-derived tile; "professional
  governs" posture on every profession-derived tile added in v12
  (veterinarian, paramedic / EMS medical director, pilot-in-command,
  licensed real-estate agent / broker, classroom teacher).

## 2. The US-only decision

The question: should v12 expand to international standards (NEC
equivalents in IEC 60364, the metric equivalents of NFPA flow math,
international building codes, etc.) or stay US-only?

The answer: **stay US-only for now.** Three reasons:

- **Recheck burden.** A US shard recheck against eCFR or the
  Federal Register is one lookup per quarter against a single
  agency website. An international shard recheck multiplies by the
  number of jurisdictions covered. v6 fixed the per-shard
  `verified_on` discipline (spec-v6 §6) and v8 fixed the per-shard
  edition / asOf discipline (spec-v8 §3); both depend on a
  countable jurisdiction set. International adds 195 sovereign
  jurisdictions, ~50 EU member-state subdivisions, and an
  unbounded long tail of state and provincial codes; the recheck
  cadence would dominate the maintenance budget.
- **AHJ unification.** The US "Authority Having Jurisdiction"
  framing is a single concept across NEC, IPC, IBC, IMC, IFC, NFPA,
  ACI, AWC, ASHRAE, etc. International codes use different
  enforcement vocabularies (notified bodies, CE marking, BSI, JIS,
  EN harmonized standards). A single tile cannot say "AHJ governs"
  internationally without becoming misleading.
- **Audience.** Cloudflare metrics for the 7 days ending 2026-05-12
  show 642 unique visitors since launch (2026-05-05), 82 unique
  yesterday. The traffic shape is dominated by US-based requests
  on US-relevant tiles (NEC ampacity, IPC pipe sizing, NFPA
  fire-flow). The marginal user gained by adding international
  coverage is small; the marginal maintenance per added user is
  large.

International is a separate future spec when (a) US coverage is
saturated, (b) at least one international maintainer is on the
project, and (c) the international recheck cadence is funded by a
named contributor. None of these is true today.

## 3. Hard limits unchanged

Every spec-level hard limit from prior specs continues unchanged.
The most-frequently-asked-about limits, restated for the v12
contributor:

- No paid tier, no donation prompts, no Patreon, no "support us"
  banner. The site is free forever.
- No accounts, no email capture, no notification permissions.
- No advertising, no tracking pixel, no analytics SDK. Cloudflare
  edge metrics (zero-cookie, aggregated) are the only visibility
  into traffic.
- No A/B testing, ever (spec.md prohibits forever).
- No LLM, AI, generative, or probabilistic anything anywhere on
  the runtime path. v12 calculators are pure functions over
  public data and the user's inputs.
- No live data fetches. The build pipeline refreshes shards on a
  tiered cadence (see Phase H); the runtime reads from the
  bundled snapshot.

## 4. Motivation

The catalog at v11 close (302 tiles) covers the construction,
mechanical, fire-service, agriculture, water, stage, kitchen,
field, accounting, legal, and lab professions to a depth where a
working practitioner can answer a meaningful question in five
seconds. The gap is the professions whose questions are
structurally identical (math over public data, AHJ governs the
decision) but whose tiles do not yet exist.

The five v12 professions, each with a one-line case for inclusion:

- **Veterinary.** Vet techs and DVMs currently rely on Plumb's
  Veterinary Drug Handbook (paywalled), Merck Veterinary Manual
  (paywalled), or laminated pocket cards. The math (dose = mg/kg
  * weight; fluid rate = (mL/kg/hr) * weight; RER = 70 *
  BW_kg^0.75) is public. The species defaults (AAHA / AAFP body
  condition scoring, AAHA canine and feline life-stage guidelines)
  are publicly published.
- **EMS / Pre-hospital.** Paramedics and EMTs work with locked-down
  agency phones; protocol-agnostic math aids (Parkland, GCS, APGAR,
  Cincinnati FAST, START, JumpSTART, drug-concentration math) are
  the daily case. CDC Field Triage Guidelines for Injured Patients
  (2021) is public domain.
- **Pilots / Aviation.** General-aviation pilots fly with iPad
  apps (ForeFlight, Garmin Pilot) that cost $99 to $300/yr; the
  underlying math (density altitude, true airspeed, crosswind
  component, magnetic variation, METAR decoding) is FAA-public.
  The site already carries a few aviation tiles in Group K; v12
  promotes them to a proper Group W and adds the rest.
- **Real Estate.** Brokers, appraisers, and buyer-side professionals
  use a thicket of paid spreadsheets and lender calculators. The
  math (PITI, DTI, LTV, cap rate, DSCR, Section 121 exclusion,
  1031 timeline) is public. The data (FHFA conforming loan limits,
  HUD Fair Market Rents, federal flood-zone determinations) is
  federal and free.
- **Educators.** Public-school teachers, homeschool parents, and
  curious students rely on a long tail of single-purpose free
  sites of varying quality. The math (Flesch-Kincaid, SMOG,
  Coleman-Liau, GPA, weighted-average, statistical-basics) is
  public-domain.

v12 ships these as five new groups on the same single-page
home-view scroll, with the same search-bar filter, the same
citation footer, the same URL-hash round-trip, the same payload
budget, and the same "the professional governs" posture as
every prior group.

## 5. Phase A - Group U: Veterinary

Roughly 18 new tiles. All defer to "the veterinarian governs."
None of these tiles substitute for an in-person exam, a current
drug formulary, or a board-certified specialist consult. Each
carries the spec-v10 §B.1 limitation banner where applicable.

### U.1 Species-aware weight-based dose

**Inputs.** Drug name (free text; the tile does not bundle a drug
list, the user types the drug they have on hand). Patient weight
(lb or kg, with unit toggle). Dose (mg/kg). Concentration of stock
(mg/mL).

**Output.** Total dose in mg, total volume in mL. Range check
against a user-supplied min/max if entered. The tile prints a
prominent "Verify against your current drug formulary; the
veterinarian governs" banner.

**Math.** First-principles arithmetic. `total_mg = dose_mg_per_kg
* weight_kg`; `volume_mL = total_mg / concentration_mg_per_mL`.

**Citation.** "Math is dose * weight / concentration. No drug
table is bundled; the user supplies dose and concentration from
the current formulary (Plumb's Veterinary Drug Handbook 10th ed.,
USP Compendium, or FDA-approved labeling). Veterinarian governs."

**Edge cases.** Weight below 0.05 kg (50 g) or above 1000 kg
flagged as outside typical small-animal and large-animal ranges.
Concentration of 0 rejected. Dose > 1000 mg/kg flagged as
implausible.

**Tests.** Ten unit tests including a 5 mg/kg dose to a 20 kg dog
with a 50 mg/mL stock returning 2.0 mL.

### U.2 Maintenance fluid rate

**Inputs.** Patient weight (kg). Species selector (dog, cat,
horse, cow, exotic). Optional: dehydration percent (0 to 15,
default 0). Optional: ongoing losses (mL/hr).

**Output.** Maintenance fluid rate (mL/hr). Replacement-fluid
volume over the chosen rehydration window (default 24 hr) in mL.
Total infusion rate (mL/hr) combining maintenance + replacement
+ losses. Drops/min for a 60 gtt/mL pediatric set and a 10 gtt/mL
adult set.

**Math.** Public veterinary formulae (Hall and Plumb): for dogs
and cats, `maintenance_mL_per_hr = (weight_kg * 60) / 24` (Holliday-
Segar adapted to small animals). For large animals (horse, cow),
50 mL/kg/day is the common starting point.

**Citation.** "Per the Holliday-Segar maintenance formula
adapted for veterinary use (DiBartola, Fluid, Electrolyte, and
Acid-Base Disorders in Small Animal Practice, 4th ed.).
Veterinarian governs adjustments for cardiac, renal, or hepatic
disease."

**Edge cases.** Dehydration > 15 percent flagged as severe; needs
ICU-level monitoring. Negative weights rejected.

**Tests.** Eight unit tests covering dog / cat / horse at low,
mid, and high weight ranges.

### U.3 Resting energy requirement (RER) and metabolic energy

**Inputs.** Species (dog, cat). Weight (kg). Life stage / activity
factor (sedentary / active / weight-loss / growth / lactation),
which sets a multiplier per the AAHA published table.

**Output.** RER (kcal/day). MER (kcal/day). Cups of a representative
diet (input: kcal/cup, user-supplied).

**Math.** Public: `RER_kcal_per_day = 70 * weight_kg^0.75`. MER =
RER * activity factor (AAHA-published factor table).

**Citation.** "Per the AAHA-AAFP Life Stage Guidelines (2010
canine, 2021 feline updates). Activity factors per AAHA published
range. Veterinarian governs in chronic disease states."

**Edge cases.** Weight under 0.5 kg or above 100 kg flagged.

**Tests.** Eight unit tests.

### U.4 Endotracheal tube and IV catheter sizing

**Inputs.** Species. Weight (kg). Optional: breed-size category
(toy / small / medium / large / giant for dogs).

**Output.** Recommended ETT internal diameter (mm) and length (cm)
from the bundled species-and-weight table (public veterinary
anesthesia references). Recommended IV catheter gauge from the
bundled species table.

**Math.** Bounded lookup against species-and-weight bands.

**Citation.** "Per Plumb's and BSAVA Manual of Canine and Feline
Anaesthesia and Analgesia (3rd ed.) reference tables, summarized
by gauge category. Veterinarian and licensed RVT govern final
selection."

**Edge cases.** Birds, reptiles, exotic mammals flagged as
"consult species-specific reference; this tile covers dogs, cats,
horses, and cattle only."

**Tests.** Eight unit tests across species.

### U.5 Toxicity dose-by-weight (chocolate, xylitol, raisin, lily, ethylene glycol)

**Inputs.** Toxin (chocolate / xylitol / raisin-grape /
ethylene-glycol). For chocolate: type (white / milk / dark /
baking / cocoa powder), grams ingested. For xylitol: grams. For
raisin-grape: grams. For ethylene-glycol: mL of antifreeze. Pet
weight (kg).

**Output.** Toxic-dose threshold (mg/kg or g/kg) per the bundled
ASPCA Animal Poison Control Center published thresholds. Whether
the ingested amount exceeds the toxic dose. "Call ASPCA APCC at
888-426-4435 (consult fee applies)" banner on every result.

**Math.** Threshold comparison. Theobromine content per chocolate
type from a public veterinary toxicology reference.

**Citation.** "Toxic doses per ASPCA Animal Poison Control Center
published thresholds and Plumb's Veterinary Drug Handbook 10th ed.
This tile is a screening estimate; in any suspected ingestion call
ASPCA APCC at 888-426-4435 or your nearest emergency veterinary
hospital."

**Edge cases.** Always flag the case as "call APCC even if below
threshold" if the user-entered amount is non-zero and the species
is at risk. Default to overcaution.

**Tests.** Ten unit tests.

### U.6 Body condition score reference

**Inputs.** Species (dog, cat).

**Output.** The full 1-9 BCS scale (1 emaciated, 9 grossly obese)
with the AAHA-published verbal anchors per score, side-by-side.
Carries a "Use a hands-on rib-and-waist palpation" reminder.

**Math.** Reference render; no calculation.

**Citation.** "Per the AAHA-AAFP body-condition-scoring guideline.
Veterinarian and RVT govern the in-clinic scoring."

**Edge cases.** None (reference page).

**Tests.** Smoke test that the score list renders 9 rows.

### U.7 Pet age in human-equivalent years

**Inputs.** Species (dog, cat). Pet age (years). For dogs: weight
band (small <22 lb / medium 22-50 lb / large 51-100 lb / giant
>100 lb).

**Output.** Human-equivalent age per the AAHA Life Stage table.

**Math.** Table-lookup.

**Citation.** "Per the AAHA Canine Life Stage Guidelines (2019)
and AAHA-AAFP Feline Life Stage Guidelines (2021). Veterinarian
governs life-stage care planning."

**Edge cases.** Age > 25 years flagged.

**Tests.** Six unit tests.

### U.8 through U.18

The remainder of Group U follows the same pattern:

- **U.8** Vaccine schedule reference (AAHA core / non-core for dogs;
  AAFP core / non-core for cats; rabies state-law overlay).
- **U.9** Heartworm preventive dose (ivermectin / milbemycin / selamectin
  by weight bands per FDA-approved labeling, public).
- **U.10** Bloodwork normal-range reference (CBC and chemistry, by
  species; ranges from public IDEXX / Antech reference ranges
  with attribution).
- **U.11** Urine specific gravity bands (species-specific normal,
  isosthenuric, hypersthenuric).
- **U.12** Anesthesia-monitoring vitals (HR / RR / MAP / SpO2 /
  ETCO2 normal ranges by species).
- **U.13** Common breed predispositions reference (sighthounds and
  MDR1, brachycephalic airway, large-breed GDV, etc.; cites the
  AKC and CHIC databases).
- **U.14** Reverse RER calculator (target weight loss from current
  weight and target weight, calorie deficit per published
  guideline).
- **U.15** Pregnancy-stage gestation calculator (dog 63 +/- 1 day,
  cat 65 +/- 2, horse 340, cow 283).
- **U.16** Plasma drug concentration steady-state (pharmacokinetic
  math: `Css = (Dose * F) / (CL * tau)`, where F is bioavailability
  fraction, CL is clearance, tau is dosing interval).
- **U.17** Crystalloid replacement plan (combines U.2 with a per-loss
  worksheet: vomiting / diarrhea / blood loss / surgical loss).
- **U.18** ASA classification reference (I to V plus E, public AVMA).

Each tile follows the U.1-U.7 pattern: inputs, math citation, edge
cases, ten or more unit tests, and the "veterinarian governs" notice.

Approx 22 KB of new module code (gzipped), shipping in
`calc-vet.js`.

## 6. Phase B - Group V: EMS / Pre-hospital

Roughly 20 new tiles. All defer to "the EMS medical director and
the receiving facility's physician govern." None of these tiles
substitute for an online medical command line or for the receiving
facility's protocols. Each carries the spec-v10 §B.1 limitation
banner.

### V.1 Glasgow Coma Scale

**Inputs.** Eye-opening (1-4), verbal response (1-5 adult / 1-5
pediatric), motor response (1-6).

**Output.** Total GCS score (3 to 15). Severity band (mild 13-15 /
moderate 9-12 / severe 3-8). Pediatric-modifier note when the
caller indicates the patient is under 5.

**Math.** Sum.

**Citation.** "Per Teasdale and Jennett, Lancet 1974, as adopted
in ACEP / ACS Committee on Trauma / NAEMT references. The
receiving facility's neurosurgeon governs final disposition."

**Edge cases.** Component out of range rejected.

**Tests.** Ten unit tests including the canonical
"intubated patient: T modifier, score not interpretable" guard.

### V.2 Parkland formula (burn fluid resuscitation)

**Inputs.** Patient weight (kg). Total body surface area burned
(percent, from Rule of 9s or Lund-Browder estimate input). Hours
since burn (default 0 for time-of-injury).

**Output.** Total 24-hour fluid volume in mL (`4 * weight_kg *
TBSA`). First-8-hour volume (half of total). Hourly rate for
hours 0-8 and hours 8-24. Drops/min on a macro and pediatric drip
set.

**Math.** Parkland: `total_mL = 4 * weight_kg * TBSA_percent`.
Half in first 8 hours.

**Citation.** "Per Baxter, Charles, 'Fluid Volume and Electrolyte
Changes in the Early Post-burn Period,' Clinics in Plastic Surgery
1974. Adopted by the American Burn Association and ATLS. Receiving
burn-center physician governs."

**Edge cases.** TBSA > 90 percent flagged as "outside formula
validity; consult burn center immediately."

**Tests.** Ten unit tests including the canonical 70 kg adult /
30 percent TBSA / 8400 mL / 4200 mL first 8 hr.

### V.3 Rule of 9s and Lund-Browder TBSA

**Inputs.** Patient age band (adult / child 1-5 / infant).
Per-region burn-depth selection (head front / head back / each
arm / each leg / torso front / torso back / perineum).

**Output.** Total body-surface-area percent. Side-by-side display
of Rule of 9s (adult and child) and Lund-Browder (age-banded).

**Math.** Sum of selected regions per the bundled adult Rule of 9s
and the bundled Lund-Browder tables (both public).

**Citation.** "Rule of 9s per Pulaski and Tennison (1947).
Lund-Browder chart per Lund and Browder, Annals of Surgery (1944).
Both adopted by the ABA."

**Edge cases.** Regions checked > 100 percent flagged.

**Tests.** Eight unit tests.

### V.4 APGAR score

**Inputs.** Appearance, pulse, grimace, activity, respiration
(each 0-2).

**Output.** Total score 0-10. Band (severely depressed 0-3 /
moderately depressed 4-6 / vigorous 7-10).

**Math.** Sum.

**Citation.** "Per Apgar, Virginia, 'A Proposal for a New Method
of Evaluation of the Newborn Infant,' Anesthesia & Analgesia 1953.
AAP / ACOG governs."

**Edge cases.** Score recorded at 1 min and 5 min; tile reminds
the user.

**Tests.** Six unit tests.

### V.5 Cincinnati Prehospital Stroke Scale

**Inputs.** Facial droop (normal / abnormal). Arm drift (normal /
abnormal). Speech (normal / abnormal).

**Output.** Number of abnormal findings. Probability band per the
public NIHSS / CPSS validation literature.

**Math.** Sum of abnormal.

**Citation.** "Per Kothari et al., Annals of Emergency Medicine
1999. CDC public materials. Receiving stroke-center physician
governs."

**Edge cases.** None.

**Tests.** Six unit tests.

### V.6 START and JumpSTART mass-casualty triage

**Inputs.** START (adult): walking, respiratory rate, perfusion,
mental status. JumpSTART (peds): same plus pediatric-specific
breathing checks.

**Output.** Tag color (red / yellow / green / black) with the
decision path traced inline.

**Math.** Decision-tree path through public CDC algorithm.

**Citation.** "Per START (Newport Beach Fire Department, 1983)
and JumpSTART (Romig, 1995). CDC Field Triage Guidelines for
Injured Patients (2021), public domain. Incident commander
governs."

**Edge cases.** None.

**Tests.** Ten unit tests covering each terminal tag.

### V.7 Pediatric weight estimation

**Inputs.** Age (years) or length (cm).

**Output.** Estimated weight (kg) via the bundled APLS formula
(age * 3 + 7 for < 12 mo; (2 * age) + 8 for 1-10 yr) and via the
length-based Broselow-style estimate. Two estimates side by side
with a "field-weigh if possible" reminder.

**Math.** Public APLS formulas; length-band lookup against the
public color-zone weight bands (the formulas, not the licensed
tape).

**Citation.** "APLS formulas per Advanced Paediatric Life Support
(4th ed.). Length-band weight estimation per the underlying
50th-percentile WHO growth data; the licensed Broselow tape is
not reproduced."

**Edge cases.** Age > 12 yr flagged as "use adult dosing."

**Tests.** Eight unit tests.

### V.8 IV drip rate

**Inputs.** Volume to infuse (mL). Time (min or hr, with unit
toggle). Drop factor (gtt/mL: 10 macro / 15 macro / 20 macro / 60
mini).

**Output.** Drops per minute. Hourly rate (mL/hr). Total volume.

**Math.** `gtts_per_min = (volume_mL * gtt_per_mL) / time_min`.

**Citation.** "First-principles arithmetic over the drop-factor
specified on the IV-set label. Nurse / paramedic governs the rate
adjustment at bedside."

**Edge cases.** Time < 1 min rejected. Drop factor outside (10,
60) rejected.

**Tests.** Eight unit tests.

### V.9 Drug concentration to volume

**Inputs.** Ordered dose (mg). Stock concentration (mg/mL).
Optional: total weight (kg) and per-kg dose (mg/kg) to derive
the ordered dose.

**Output.** Volume to draw (mL). Total mg ordered.

**Math.** `volume_mL = dose_mg / concentration_mg_per_mL`.

**Citation.** "First-principles arithmetic. Medical director and
the receiving facility govern the drug, dose, and route."

**Edge cases.** Concentration of 0 rejected. Volume > 50 mL
flagged as "verify; very large volume."

**Tests.** Eight unit tests.

### V.10 O2 cylinder duration

**Inputs.** Cylinder size (D, E, M, G, H, with bundled volumes:
D=350 L, E=625 L, M=3000 L, G=5300 L, H=6900 L). Starting
pressure (psi, default 2000). Reserve pressure (psi, default
500). Flow rate (L/min).

**Output.** Time to reserve pressure (min:sec). Time to empty (warn
"do not plan to empty").

**Math.** Public cylinder constants and the standard formula:
`duration_min = ((pressure_psi - reserve_psi) * tank_factor) /
flow_lpm`, where `tank_factor` is the cylinder-volume divided by
service pressure constant (D = 0.16, E = 0.28, M = 1.56, G = 2.41,
H = 3.14).

**Citation.** "Tank-factor table per AARC Clinical Practice
Guidelines and standard EMS reference. Manufacturer cylinder
rating governs absolute volume."

**Edge cases.** Pressure > 2200 psi rejected (over-pressure).
Flow > 25 L/min flagged.

**Tests.** Eight unit tests including the canonical D-cylinder /
2000 psi / 4 L/min / ~74 min.

### V.11 through V.20

- **V.11** Shock index (HR / SBP).
- **V.12** Mean arterial pressure (MAP = (SBP + 2*DBP) / 3).
- **V.13** Anion gap.
- **V.14** Corrected calcium (for albumin).
- **V.15** Pediatric vital signs reference (ranges by age, AHA-public).
- **V.16** CHA2DS2-VASc score (atrial fibrillation stroke risk;
  public AHA scoring).
- **V.17** Wells DVT score (public).
- **V.18** Wells PE score (public).
- **V.19** PERC rule (public).
- **V.20** NIH Stroke Scale (NIHSS) calculator (public,
  fifteen-item).

Approx 25 KB of new module code (gzipped), shipping in `calc-ems.js`.

## 7. Phase C - Group W: Pilots / Aviation

Roughly 18 new tiles. The existing `weight-balance` in calc-mechanic.js
moves under Group W (the spec-v4 placement under Group K is the
historical accident; v4 spec-§K listed it as "Auto / Marine /
Aviation" because aviation was three tiles; v12 promotes aviation to
its own group). The move is rendered as a v12 deprecation: the URL
hash `#weight-balance` continues to route to the same renderer; the
home-view tile moves from Group K to Group W.

### W.1 Density altitude

**Inputs.** Pressure altitude (ft, from altimeter setting and field
elevation), OAT (F or C).

**Output.** Density altitude (ft). Performance impact band (sea
level / +2k / +4k / +6k / >+8k with rule-of-thumb takeoff distance
multipliers).

**Math.** `DA = PA + (120 * (OAT_C - ISA_temp_C))`, ISA temp per
standard atmosphere.

**Citation.** "Per FAA Pilot's Handbook of Aeronautical Knowledge
(FAA-H-8083-25C) Chapter 4. PIC governs final go/no-go."

**Edge cases.** OAT below -50 C or above 60 C flagged.

**Tests.** Eight unit tests.

### W.2 True airspeed from CAS and altitude

**Inputs.** Calibrated airspeed (kt). Pressure altitude (ft). OAT
(C).

**Output.** TAS (kt). Mach number (where relevant).

**Math.** Standard E6B identity: `TAS = CAS * sqrt(rho_sl / rho)`
with the standard-atmosphere correction.

**Citation.** "Per FAA Pilot's Handbook of Aeronautical Knowledge.
Aircraft manufacturer's POH governs."

**Edge cases.** Altitude > 60,000 ft flagged.

**Tests.** Eight unit tests.

### W.3 Crosswind / headwind component

**Inputs.** Runway heading (deg). Wind direction (deg from). Wind
speed (kt).

**Output.** Headwind component (kt). Crosswind component (kt).
Demonstrated-crosswind comparison (user enters aircraft demo
crosswind).

**Math.** `headwind = ws * cos(wd - rh)`; `crosswind = ws * sin(wd
- rh)`.

**Citation.** "Pure geometry. POH demonstrated-crosswind value is
not a limitation but an aircraft-specific tested value; PIC
governs."

**Edge cases.** Wind > 60 kt flagged.

**Tests.** Eight unit tests.

### W.4 Magnetic variation wrapper

**Inputs.** Latitude, longitude, date.

**Output.** Magnetic variation (deg east / west). True heading to
magnetic heading. Magnetic heading to true.

**Math.** Wrapper over the existing v9 §F.1 WMM2025 implementation
in `calc-field.js`.

**Citation.** "Per NOAA / NCEI World Magnetic Model 2025 (WMM2025);
valid 2025-01-01 to 2029-12-31. PIC must cross-check against the
sectional chart for the planned route."

**Edge cases.** Date outside model validity flagged.

**Tests.** Reuses the v9 §F.1 test bundle.

### W.5 METAR decoder

**Inputs.** METAR string.

**Output.** Decoded fields: station, time, wind, visibility, sky
condition, temp/dewpoint, altimeter, remarks. Side by side with
the raw string.

**Math.** Parser over the public METAR encoding (FAA / NWS / WMO).

**Citation.** "Per FAA Aviation Weather Services (AC 00-45H Change
2) and NWS METAR Format. PIC governs."

**Edge cases.** Malformed strings flagged with the parser's first
failure position.

**Tests.** Twelve unit tests including the canonical KJFK,
TAF-with-PROB, and SPECI examples.

### W.6 TAF decoder

Same shape as METAR. Twelve unit tests.

### W.7 Hypoxia altitude warning reference

**Inputs.** Cruise altitude (ft).

**Output.** Regulatory band: <12,500 (no O2 required), 12,500-14,000
(O2 for crew after 30 min per 14 CFR 91.211(a)(1)), 14,000-15,000
(O2 for crew at all times per 91.211(a)(2)), >15,000 (O2 for all
occupants per 91.211(a)(3)).

**Math.** Threshold lookup.

**Citation.** "Per 14 CFR 91.211. Free at ecfr.gov."

**Edge cases.** Altitude > 50,000 ft flagged.

**Tests.** Six unit tests.

### W.8 Fuel consumption planning

**Inputs.** Fuel burn (gph). Flight time (hr:min). Reserve (min,
default 45 day VFR / 30 night IFR per 91.151 / 91.167).

**Output.** Fuel required (gal). Weight of fuel (lb at 6.0 lb/gal
for avgas, 6.7 for jet-A; user selects type). Comparison to
aircraft fuel capacity (user enters).

**Math.** Arithmetic.

**Citation.** "Per 14 CFR 91.151 (day VFR), 91.167 (IFR). PIC
governs flight planning."

**Edge cases.** Reserve below regulatory minimum flagged.

**Tests.** Eight unit tests.

### W.9 ETA and ETE

**Inputs.** Distance (nm). Groundspeed (kt). Optional departure
time (local).

**Output.** ETE (hr:min). ETA (local) when departure time supplied.

**Math.** `time_hr = distance_nm / GS_kt`.

**Citation.** "First-principles arithmetic."

**Edge cases.** GS < 30 kt flagged.

**Tests.** Six unit tests.

### W.10 Wind triangle / wind correction angle

**Inputs.** True course (deg). True airspeed (kt). Wind direction /
wind speed (deg / kt).

**Output.** Wind correction angle (deg). Ground speed (kt). True
heading (deg).

**Math.** Public E6B vector identities.

**Citation.** "Pure geometry."

**Edge cases.** WCA > 30 deg flagged as "verify; large WCA."

**Tests.** Eight unit tests.

### W.11 through W.18

- **W.11** Pressure altitude (from altimeter + field elevation).
- **W.12** ICAO phonetic alphabet reference.
- **W.13** Aviation weather phrasing reference (TAF abbreviations,
  cloud cover codes, RVR ranges).
- **W.14** Transponder code reference (squawk 1200 VFR / 7500 hijack
  / 7600 lost comm / 7700 emergency).
- **W.15** Standard turn rate / rate of climb / rate of descent.
- **W.16** Top-of-descent (TOD) planning (3 to 1 rule).
- **W.17** Sectional-chart symbology reference.
- **W.18** Aircraft category and class reference (per 14 CFR 1.1).

Approx 18 KB of new module code (gzipped), shipping in `calc-aviation.js`.

## 8. Phase D - Group X: Real Estate

Roughly 15 new tiles. The existing `loan-payment` in calc-cross.js
remains in Group G (it is a general-purpose financial tool); the
real-estate-specific tiles live in Group X.

### X.1 PITI

**Inputs.** Principal (loan amount), rate (APR), term (yr), annual
property tax (or mill rate + assessed value), annual insurance
premium, monthly HOA, monthly PMI (or LTV-derived).

**Output.** Monthly P&I, monthly tax, monthly insurance, monthly
HOA, monthly PMI, total PITI(+HOA). Annual sum. Debt-to-income
suggestion line.

**Math.** Standard amortization plus simple division for the T+I+HOA
components. Reuses the v2 `loan-payment` helper.

**Citation.** "Standard mortgage math. Lender governs final
underwriting."

**Edge cases.** Rate > 20 percent flagged. Term outside (5, 50) yr
flagged.

**Tests.** Ten unit tests.

### X.2 Full amortization schedule

Inputs same as X.1. Output: monthly row table (period / payment /
principal / interest / balance). Print-table CSS already exists
(v5 utility 270). Reuses the v5 CSV export for download.

**Tests.** Twelve unit tests; cross-checks principal+interest sum to
total against the loan-payment unit.

### X.3 DTI

**Inputs.** Monthly gross income. Existing monthly debts.
Proposed PITI (or computed from X.1).

**Output.** Front-end DTI (PITI / income). Back-end DTI ((PITI +
debts) / income). Bands per the FNMA / FHLMC published guidelines
(conventional <= 36 / 43, FHA <= 31 / 43, VA <= 41).

**Math.** Ratio.

**Citation.** "Per FNMA Single-Family Selling Guide and FHA
Handbook 4000.1. Lender governs final underwriting."

**Edge cases.** Income of 0 rejected.

**Tests.** Six unit tests.

### X.4 LTV

**Inputs.** Loan amount, appraised value or purchase price.

**Output.** LTV percent. CLTV (combined LTV) when a second loan
amount is supplied. PMI-required flag (LTV > 80 percent).

**Math.** Ratio.

**Citation.** "Standard underwriting ratio."

**Tests.** Four unit tests.

### X.5 Cap rate and DSCR

**Inputs.** NOI (annual). Property value or purchase price. Annual
debt service (for DSCR).

**Output.** Cap rate (NOI / value). DSCR (NOI / debt service).
Bands (cap rate < 4 / 4-6 / 6-8 / >8; DSCR < 1.0 / 1.0-1.25 /
1.25-1.5 / >1.5).

**Math.** Ratios.

**Citation.** "Standard CRE underwriting ratios. Appraiser and
lender govern final value."

**Tests.** Six unit tests.

### X.6 1031 exchange timeline

**Inputs.** Relinquished-property sale-close date (ISO).

**Output.** 45-day identification deadline (sale + 45 calendar
days). 180-day exchange-close deadline. Each rendered with the
day-of-week and a federal-holiday rollover flag (per the existing
v5 `court-deadline` helper).

**Math.** Calendar arithmetic. Reuses the v5 court-deadline
helper.

**Citation.** "Per 26 USC 1031(a)(3) and Treas. Reg. 1.1031(k)-1.
Section 1031 exchange. Qualified intermediary required;
attorney and tax professional govern."

**Edge cases.** Sale date in the future flagged.

**Tests.** Eight unit tests.

### X.7 Section 121 home-sale exclusion

**Inputs.** Filing status (single / MFJ). Purchase price + capital
improvements (basis). Sale price. Selling costs (commission,
title, prep).

**Output.** Realized gain. Exclusion ($250k single, $500k MFJ).
Taxable gain. "Two-of-five years" eligibility reminder.

**Math.** `gain = sale - selling_costs - basis - improvements`.
`taxable = max(0, gain - exclusion)`.

**Citation.** "Per IRC 121. Free at uscode.house.gov. CPA governs
final return."

**Edge cases.** Negative basis rejected.

**Tests.** Eight unit tests.

### X.8 FHA / VA / conforming loan limits by county

**Inputs.** State (FIPS or postal). County (FIPS).

**Output.** Current-year conforming loan limit (FHFA published),
FHA limit (HUD published), VA limit (no cap since 2020 for
full-entitlement; the tile says so).

**Math.** Table lookup against the bundled `data/realestate/loan-
limits.json` shard (refreshed annually per Phase H).

**Citation.** "Per FHFA Conforming Loan Limit Values (annual) and
HUD FHA Mortgage Limits. Free at fhfa.gov and entp.hud.gov."

**Edge cases.** Unknown county returns "consult lender."

**Tests.** Eight unit tests against three sample counties.

### X.9 Property tax estimator

**Inputs.** Assessed value. Mill rate (1 mill = $1 per $1000 of
assessed value) or effective tax rate. Optional homestead
exemption.

**Output.** Annual property tax. Monthly accrual (tax / 12).

**Math.** `tax = (assessed - exemption) * mill_rate / 1000`.

**Citation.** "Mill rate is set by the local taxing authority;
assessor governs the assessed value."

**Tests.** Six unit tests.

### X.10 through X.15

- **X.10** HUD Fair Market Rents lookup (HUD-published, annual).
- **X.11** Cash-on-cash return.
- **X.12** Rental income / expense worksheet (Schedule E shape).
- **X.13** Cost of waiting (mortgage at today's rate vs +1 percent).
- **X.14** Commission split (gross, brokerage split, agent split,
  any 100-percent-cap brokerage fee).
- **X.15** Closing-cost estimator (typical line items by region;
  the closing-disclosure form template is public per the CFPB).

Approx 12 KB of new module code (gzipped), shipping in
`calc-realestate.js`.

## 9. Phase E - Group Y: Educators / K-12

Roughly 15 new tiles. Pure-public-math tiles only; nothing that
substitutes for a teacher's professional judgment about a student.

### Y.1 Flesch-Kincaid Grade Level

**Inputs.** Text (textarea, up to 50,000 characters).

**Output.** Flesch-Kincaid Grade Level. Flesch Reading Ease. Total
words, sentences, syllables, words-per-sentence,
syllables-per-word.

**Math.** Public: `FKGL = 0.39 * (words/sentences) + 11.8 *
(syllables/words) - 15.59`. Syllable count via the deterministic
public algorithm (vowel-cluster count with adjustments for silent
-e, -le, -es).

**Citation.** "Per Kincaid et al., 'Derivation of New Readability
Formulas,' Naval Technical Training Command (1975), public-domain
federal publication."

**Edge cases.** Text shorter than 50 words flagged as "unreliable."

**Tests.** Ten unit tests against worked examples from the
public-domain paper.

### Y.2 SMOG, Coleman-Liau, Gunning Fog

Inputs and tile shape per Y.1, computing the alternate readability
formulas. Each formula is public.

### Y.3 Lexile band by grade reference

**Inputs.** Grade level (K-12).

**Output.** Lexile target range for the grade per the public
Common Core / state-DOE published bands. (The MetaMetrics-derived
Lexile measure itself is licensed; the grade-to-band mapping is
public from state DOE bulletins.)

**Citation.** "Lexile is a registered trademark of MetaMetrics. The
grade-band targets here are summarized from publicly published
state-department-of-education guidance. Teacher governs final
text selection."

**Tests.** Smoke test.

### Y.4 GPA calculator (weighted and unweighted)

**Inputs.** Up to 30 course rows: course name, letter grade (A, A-,
B+, ..., F), credit hours, weighted (honors / AP / IB +0.5 or +1.0).

**Output.** Unweighted GPA. Weighted GPA. Total credits.

**Math.** Standard letter-to-point conversion; weighted average.

**Citation.** "Standard US 4.0 / 5.0 scale. School registrar
governs final transcript."

**Tests.** Eight unit tests.

### Y.5 Statistics quick-read

**Inputs.** Number list (comma-separated, up to 1000 values).

**Output.** Mean, median, mode, range, variance, standard deviation
(sample and population), min, max, count.

**Math.** Standard.

**Citation.** "Standard descriptive statistics."

**Tests.** Ten unit tests.

### Y.6 Confidence interval (Wald, exact)

**Inputs.** Sample size. Sample proportion or sample mean. Sample
SD (for mean). Confidence level (90, 95, 99).

**Output.** Margin of error. Lower bound. Upper bound.

**Math.** Standard Wald CI plus Clopper-Pearson exact for small n.

**Citation.** "Wald CI for large n; Clopper-Pearson exact for
small n. Standard inferential statistics."

**Tests.** Eight unit tests.

### Y.7 Quadratic formula and discriminant

Inputs: a, b, c. Output: real or complex roots, discriminant
sign, vertex of the parabola.

### Y.8 System of two linear equations

Inputs: a1 x + b1 y = c1; a2 x + b2 y = c2. Output: (x, y) or
"no solution" / "infinite solutions."

### Y.9 Significant figures helper

Inputs: number, number of sig figs to round to. Output: rounded
value. Companion: count of sig figs in an input number.

### Y.10 Scientific notation

Convert decimal to scientific notation and back.

### Y.11 Codon table reference

DNA / RNA codon to amino acid. Reverse (amino acid to all valid
codons).

### Y.12 Periodic table reference (extension)

Builds on the existing Group T atomic-weight shard. Adds
electronegativity, electron configuration, common oxidation
states, and group-and-period coordinates.

### Y.13 Standards-based grade calculator

Inputs: standards-mastery levels (1-4) per standard. Output:
weighted overall mastery.

### Y.14 Bell-curve grade-to-percent

Inputs: raw score, mean, SD. Output: z-score, percentile.

### Y.15 Number-base converter

Bin / oct / dec / hex inter-conversion with arbitrary bases.

Approx 14 KB of new module code (gzipped), shipping in `calc-edu.js`.

## 10. Phase F - UI/UX audit and mobile-responsive hardening

### F.1 Reported bug: reference block overflows on mobile

The `.v6-reference-block` in `styles.css` uses
`grid-template-columns: max-content 1fr` on the dt+dd list with
`white-space: nowrap` on dt. On a 375 px viewport, the long dt
label "Edition selector / disclosure" plus a long dd value (a
codes.iccsafe.org URL, an NFPA TOC URL, or a CFR section path)
exceeds the viewport. The grid does not collapse because
`max-content` does not shrink below intrinsic min-width. The fix
is a single-column layout at mobile breakpoint plus
`overflow-wrap: anywhere` on the dd values.

**Tile, file, fix.** `.v6-reference-block .v6-reference-list`,
`.v6-reference-block .v6-assumption-list`,
`.v6-reference-block .v6-assumption-note` in `styles.css`. At
the existing `@media (max-width: 760px)` breakpoint, override
`grid-template-columns: 1fr` and `white-space: normal` on the
dt and dd; add `overflow-wrap: anywhere` and
`word-break: break-word` on the dd. Add a manual visual check
at 320 / 375 / 414 / 760 px viewport widths.

### F.2 Per-tile mobile-responsive sweep

The catalog grew from 64 tiles at v3 to 302 tiles at v11 close
plus the ~90 added in v12 (target ~395 tiles). The mobile-render
audit was last done formally at the v3 launch. v12 schedules a
per-group sweep at the 320 px viewport (iPhone SE 1st gen, the
smallest still-supported iPhone) with the following invariants:

- No horizontal scroll on the home view at any width >= 320 px.
- No horizontal scroll on any tile view at any width >= 320 px.
- Every interactive element meets the 48 px touch-target floor
  (already enforced; spec.md §11).
- Every long string (URLs in citation footers, multi-clause source
  stamps, hyphenated tile names) wraps cleanly. Add
  `overflow-wrap: anywhere` to the citation, the data-source stamp,
  the limitation banner, and the reference block.
- Input fields use `inputmode` attributes appropriate to their
  type (numeric, decimal, tel) so the soft keyboard surfaces the
  right pad.
- Print view tested at A4 / Letter; multi-page tables paginate
  cleanly (the existing v5 print-table CSS handles this; the
  sweep verifies it on every new v12 tile).

### F.3 Per-tile module-load smoke test

Open-and-render at the test runner: load each tile by ID, fire
the example-button click, assert the output region is non-empty
within 500 ms. The test is parameterized over the live TOOLS
array (the same parse pattern as v10 §E.3 used for the a11y
loop). A new tile is automatically covered without a test edit.

### F.4 Voice-input round-trip per tile

For each tile with at least one numeric input, simulate a voice-
input value being set on the field and assert the compute fires
on `input` event (not requiring a keystroke). Covers the
spec.md §11 voice-input invariant.

### F.5 High-contrast theme per-tile

axe-core under the High-Contrast theme over every tile_id. The
spec-v10 §E.3 a11y loop already covers default + light + dark +
HC; v12 confirms zero new violations after the Group U / V / W /
X / Y additions.

## 11. Phase G - Module-wiring audit

### G.1 The v5-platform.js miss as the prototype

On 2026-05-12 the build was missing `v5-platform.js` from the
`FILES` array in `scripts/build.mjs`. The file is imported by
`calc-accounting.js`, `calc-legal.js`, and `calc-lab.js` and was
listed in `sw.js`'s `SHELL_ASSETS`, but the build copy never
included it. A fresh Cloudflare Pages deploy with no
service-worker cache would have 404'd every v5 accounting /
legal / lab tile. The bug shipped for the entire v5 release
window. The fix landed in commit `47d90df` and added a build-time
guard.

### G.2 The wiring-correctness lint, generalized

Add `scripts/check-wiring.mjs`. The script:

- Reads every top-level `*.js` file in the repo root.
- Parses `import` statements (ES module form: `import { ... }
  from "./<path>.js"`). Resolves each path against the repo root.
- Builds the import graph.
- Verifies every import target is present in `scripts/build.mjs`
  FILES, in `sw.js` SHELL_ASSETS, and on disk.
- Verifies every export named in the importing file matches an
  export from the imported file.
- Verifies every dynamic import path in app.js (the `TOOL_MODULES`
  map) resolves to a file in FILES and SHELL_ASSETS and to a
  named export on the target module.

The script fails CI on any missing entry. The 2026-05-12 build
guard is a subset of this lint; G.2 replaces it.

### G.3 The dist/-vs-runtime cross-check

After `npm run build` completes, walk `dist/` and assert every
file referenced from any shipped HTML / JS / CSS / shard is
present. A non-existent reference produces a CI failure with
the path of the dangling reference. This catches the inverse
class of bug (file in build but no longer referenced) by
producing a warning rather than a failure.

### G.4 The renderer-export cross-check

For each tile_id in TOOLS, assert there is a renderer function
exported under the name the TOOL_MODULES map expects. Today
this is enforced indirectly by the renderer-wiring tests under
test/unit/v8-renderer-wiring*.test.js; G.4 promotes it to a
build-time assertion so a renamed export is caught at lint, not
at run-the-tile.

## 12. Phase H - Automated data refresh (tiered cadence)

### H.1 Cadence tiers

Today: a single monthly GitHub Actions job (`data-refresh.yml`,
runs `0 12 1 * *` UTC on the 1st of each month) calls
`scripts/build-data.mjs` and opens a PR if shards changed.

v12 introduces a tiered cadence:

- **Daily** (`0 12 * * *`): nothing is on this tier today, but
  the workflow exists and the lane is reserved for future
  high-frequency series (the BLS PPI commodity series in
  `data/historical/commodities/` updates monthly; a daily run
  is wasted there. Reserved.)
- **Weekly** (`0 12 * * 1`, Mondays at 12:00 UTC): state-keyed
  shards under `data/legal/` and `data/accounting/`. These can
  drift mid-quarter when a state legislature publishes a new
  bill or the IRS revises a publication. Weekly captures the
  delta promptly.
- **Monthly** (existing, `0 12 1 * *`): everything else.
- **Quarterly** (manual `workflow_dispatch` only): state-by-state
  recheck per the spec-v6 §6 cadence, executed by the maintainer.
- **Annual** (manual `workflow_dispatch`): code-edition rollover
  per spec-v10 §F.1 runbook.

### H.2 Per-shard cadence stamp

Each `manifest.json` carries a new `refresh_cadence` field with
one of `daily`, `weekly`, `monthly`, `quarterly`, `annual`,
`event-driven`. The freshness lint (`scripts/check-citation-
freshness.mjs`) reads the cadence and warns when the `asOf`
field is older than 2x the cadence interval.

### H.3 Per-source provenance log

`scripts/sources.md` already records the canonical source for
each shard. v12 extends each entry with a `last_diff` line
that the CI job populates after each refresh. The line records
the date and a one-sentence summary of what changed (or "no
change" if the SHA-256 matched). The `.github/workflows/data-
refresh-weekly.yml` and `.github/workflows/data-refresh.yml`
(monthly) jobs both append to this log.

### H.4 No live runtime fetches

The tiered refresh is build-time only. The runtime continues
to read from the bundled snapshot. The user reading the site
in 2030 will see data that was current as of the last build,
clearly stamped by the `data-stamp.js` source-stamp pattern
that has been in place since v2.

### H.5 Failure handling

A failed refresh job (e.g., the upstream source 5xx's, the
parse fails, the integrity hash drifts unexpectedly) does NOT
auto-merge a broken PR. The job:

1. Re-runs the parser; if still failing, files a GitHub issue
   tagged `data-refresh-failure` with the raw upstream response
   attached.
2. Does not produce a PR. The existing data ships unchanged
   until a maintainer triages the issue.

This is a defensive posture: a freshness signal that is wrong
is worse than one that is slightly stale.

## 13. Out of scope (with explicit overrides of prior-spec exclusions)

### 13.1 Overrides

v12 overrides the following prior-spec exclusions and records
the rationale here. Any future spec proposing to re-exclude
these must explicitly cite this section.

- **spec.md / spec-v9 §11: "Live drug-dosing or clinical decision
  support. Reserved for the separate clinical-utility site."**
  Overridden for the bounded Group U (veterinary, math aids
  with prominent "veterinarian governs" banner) and Group V
  (EMS / pre-hospital, math aids with prominent "medical director
  and receiving facility govern" banner). Rationale: the
  exclusion was paternalistic toward the user. Vet techs and
  paramedics already do this math by hand; a calm, deterministic,
  open-source calculator with prominent professional-governs
  framing is strictly less error-prone than a paper card or a
  $99/year proprietary app. The "AHJ governs" posture maps
  cleanly to "veterinarian governs" / "medical director governs"
  with no loss of safety. Each Group U / V tile that touches drug
  dosing carries the spec-v10 §B.1 limitation banner with the
  professional-governs notice, the relevant standard's free-access
  URL, and a reminder to verify against the current formulary or
  protocol.

### 13.2 Still out of scope

- HazMat reference content beyond what is already covered.
  Reserved for the future hazmat-reference site per spec-v9 §11.
- Telemetry of any kind.
- Personalization, accounts, A/B testing, feature flags.
- LLM, AI, generative, probabilistic anything.
- Live runtime data fetches (the Phase H refresh is build-time).
- International standards (see §2 above).
- Anything that requires a user account, login, or external API
  call.

## 14. Build, test, deployment

### 14.1 Phase order

v12 is a large spec; the phases ship as independent minor releases:

1. **Phase F (UI/UX mobile-responsive hardening)** ships first as
   v0.10.x. F.1 is a small CSS change; F.2 is a per-tile sweep
   that runs against the existing catalog. No new tiles depend
   on F.1; landing it first means every Group U / V / W / X / Y
   tile inherits the fix.
2. **Phase G (wiring audit)** ships second as v0.10.x. G.2 is
   ~200 lines of script; G.3 + G.4 are CI-time assertions. No
   new tiles depend on G; landing it second means every later
   phase ships against the new gate.
3. **Phase H (automated data refresh)** ships third as v0.10.x.
   H.1 adds the weekly workflow; H.2 extends the manifest schema;
   H.3 extends `scripts/sources.md`. No new tiles depend on H;
   landing it third means every later phase ships against the
   new cadence.
4. **Phase C (Group W: Pilots / Aviation)** ships fourth as
   v0.11.0. Builds on existing v4 / v9 aviation tiles; relocates
   `weight-balance` from Group K to Group W; adds W.1-W.18.
5. **Phase D (Group X: Real Estate)** ships fifth as v0.11.0.
   Reuses the v2 `loan-payment` helper and the v5
   `court-deadline` helper; relatively small new code surface.
6. **Phase E (Group Y: Educators)** ships sixth as v0.11.0. Most
   tiles are pure-math; the readability shards are
   ~3 KB combined.
7. **Phase B (Group V: EMS / Pre-hospital)** ships seventh as
   v0.12.0. The most safety-critical group; warrants its own
   release window for review by an EMS-aware reviewer (added
   to `docs/audit-trail.md` per spec-v10 §I.3).
8. **Phase A (Group U: Veterinary)** ships eighth as v0.12.0.
   The most field-driven group; ships alongside V so they share
   the v0.12.0 review window.

### 14.2 Per-phase test requirements

Same as prior-spec discipline:

- Ten or more unit tests per tile, including one worked example
  from a primary public source named in the test fixture.
- Renderer-wiring test per tile asserting the user-visible
  source-stamp string contains the standard's edition / year /
  free-access URL.
- For tiles with bundled data: a manifest with `edition` and / or
  `asOf` and the new v12 §H.2 `refresh_cadence` field.
- Lint additions to `scripts/check-manifests.mjs` for any new
  manifests.
- Playwright a11y test per the spec-v10 §E.3 parameterized loop
  (already covers every tile_id; no new test file needed).
- Playwright e2e per the spec-v10 §E.1 print loop and §E.2 CSV
  loop where applicable.
- Mobile-responsive smoke test per F.2 at 320 / 375 / 414 px
  viewports.

### 14.3 Payload budget

The home-view payload budget remains 100 KB after gzip. v12 adds
zero runtime payload to the home view (every new module is
dynamic-imported on first tool open). The aliases.json shard
gains entries for the v12 tile vocabulary (veterinary terms,
EMS protocols, aviation jargon, real-estate acronyms, school-
math terms) and remains capped at 5 KB gzipped per spec-v10 §13.3.

Per-module gzipped caps for the new modules:

- `calc-vet.js`: 22 KB cap (covers ~18 tiles plus the bundled
  toxicity-threshold and tube-sizing tables).
- `calc-ems.js`: 25 KB cap (covers ~20 tiles plus the bundled
  pediatric vital-signs ranges and the START / JumpSTART
  decision trees).
- `calc-aviation.js`: 18 KB cap (covers ~18 tiles; the METAR /
  TAF decoder is the largest piece at ~6 KB).
- `calc-realestate.js`: 12 KB cap (covers ~15 tiles, mostly
  wrappers over the existing financial helpers).
- `calc-edu.js`: 14 KB cap (covers ~15 tiles; the readability
  formulas are small).

### 14.4 Documentation

v12 adds these new docs:

- `docs/profession-overrides.md` (new) documents the §13.1
  override of the spec.md / spec-v9 §11 clinical-utility
  carve-out, the rationale, the bounded scope (math aids with
  professional-governs banner), and the audit posture.
- `docs/mobile-responsive.md` (new) is the per-tile mobile
  sweep checklist from Phase F.2.

v12 updates these existing docs:

- `README.md`: tile count, group enumeration, and Documentation
  list (the v12 docs added).
- `docs/data-sources.md`: rows for the new data/vet/, data/ems/,
  data/aviation/, data/realestate/, data/edu/ shards.
- `docs/derivations.md`: derivation entries for the Group U / V /
  W / X / Y tiles that are first-principles math.
- `docs/citation-discipline.md`: source-stamp strings for every
  new tile.
- `docs/v6-audit.md`: per-group rows for Groups U / V / W / X / Y
  with citation completeness.
- `docs/threat-model.md`: confirms no new attack surface; the
  Phase G wiring lint reduces deployment-time gap risk.
- `docs/accessibility.md`: confirms 48 px touch targets and voice
  input on the new multi-row inputs.
- `docs/launch-checklist.md`: v12-specific gates per §15 below.
- `docs/performance.md`: per-module budgets from §14.3.
- `CHANGELOG.md`: one stanza per phase as it ships.

## 15. Launch checklist (v12-specific)

In addition to the prior-spec gates:

1. Every Phase A through Y tile passes its unit tests.
2. Every Phase A through Y tile renders without console error in
   Chrome, Safari, Firefox, and Mobile Safari.
3. axe-core reports zero violations on every new tile across
   default / light / dark / high-contrast themes.
4. Every new tile passes the F.2 mobile-responsive sweep at
   320 / 375 / 414 / 760 px viewports.
5. The G.2 wiring lint passes (no missing import, no missing
   export, no missing dist/ entry).
6. The H.1 weekly data-refresh workflow runs cleanly against a
   smoke-test shard.
7. The home-view payload budget audit (`npm run check:home-
   payload`) passes after every phase ships.
8. `npm run audit` passes including the v8 manifest checks, the
   v10 citation lints, and the new v12 G.2 wiring lint.
9. The CHANGELOG carries a stanza for each phase that links to
   the source-of-truth standard for every tile.
10. The `docs/audit-trail.md` records the external review for
    Group U (vet) and Group V (EMS) before those phases ship.

## 16. Operations and ongoing maintenance

The recheck cadence per spec-v8 §10 and spec-v10 §F carries
forward. v12 adds:

- **AAHA / AAFP guidelines** (Group U): re-issued at irregular
  intervals; quarterly recheck for currency.
- **CDC Field Triage Guidelines** (Group V): re-issued every ~5
  years (current 2021 edition). Annual recheck.
- **AHA / NIH stroke scales** (Group V): stable; biennial recheck.
- **FAA AC 00-45 (Aviation Weather Services)** (Group W): updated
  every few years; annual recheck.
- **14 CFR Part 91** (Group W): amended at irregular intervals;
  Federal Register watch.
- **FHFA / HUD loan limits** (Group X): annual rollover each
  November.
- **HUD Fair Market Rents** (Group X): annual rollover each
  October.
- **IRS publications referenced** (Group X / R extension): annual
  rollover each January.
- **State DOE Lexile-band bulletins** (Group Y): per-state
  cadence; annual recheck.

Each recheck is tracked in `scripts/sources.md` with the date and
reviewer per spec-v6 §6.

## 17. Closing note

v11 made the site smaller. v12 makes the site broader. Both are
the same project: a calm, fast, ad-free, account-free, ever-free
reference for the trades and the professions adjacent to them.
None of the tiles in this spec is novel research. Every formula
is in a textbook, a federal regulation, or a NIST / NOAA / USDA /
USEPA / FAA / CDC / IRS / HUD / FHFA publication available
without payment or account. The contribution of this site is not
the formula. It is the calm, fast, ad-free, account-free, ever-
free presentation of the formula at the moment a working
professional needs the answer.

Build it the way the rest was built. One tile, one calculation,
one citation, one copy. Then get out of the user's way, and make
sure the citation is still right ten years from now.

The site is a public utility. Public utilities outlive the people
who build them. v12 is the work that broadens that utility to the
next set of professionals whose questions the site can answer in
five seconds at no cost.
