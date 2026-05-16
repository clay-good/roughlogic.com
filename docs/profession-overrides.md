# Profession Overrides (spec-v12 §13.1)

This document records the v12 override of the spec.md / spec-v9 §11 carve-out for "live drug-dosing or clinical decision support" and lays out the bounded scope under which Group U (Veterinary) and Group V (EMS / Pre-hospital) ship in v12. Any future spec proposing to re-exclude these groups must explicitly cite this document and the §13.1 rationale.

## 1. The exclusion that v12 overrides

spec.md §11 (carried into spec-v9 §11) reserved "live drug-dosing or clinical decision support" for a separate clinical-utility site:

> Live drug-dosing or clinical decision support, formal medical reference content, and other regulated clinical-utility material. Reserved for the separate clinical-utility site.

The exclusion was correct for the v1-v11 catalog. v12 changes one thing: it adds two professions (veterinary and EMS / pre-hospital) whose practitioners already do the same math by hand, on paper cards, in licensed apps, or on locked-down agency phones - none of which is calmer, freer, or more deterministic than a same-origin, no-account, no-telemetry calculator with prominent professional-governs framing.

## 2. The override

For the bounded Group U (Veterinary) and Group V (EMS / Pre-hospital) catalog defined in spec-v12 §5 and §6, the §11 exclusion is overridden. Every tile in these two groups:

- Is a math aid over public formulas, public-domain instruments, or public reference tables. No proprietary drug labels, no licensed dosing tables, no licensed scoring instruments (the licensed Broselow tape is explicitly **not** bundled; only the underlying APLS formulas and 50th-percentile WHO weight-by-length data are referenced).
- Cites the canonical public-domain source: AAHA / AAFP guideline, FDA-approved labeling via DailyMed, ASPCA APCC published thresholds, CDC Field Triage Guidelines, AHA PALS reference table, NIH NINDS instrument, etc.
- Renders the spec-v10 §B.1 limitation banner naming what the tile is NOT (a prescription, a fluid order, a diagnosis, a tPA decision, a transfer decision, a clinical disposition).
- Names the governing professional in the limitation banner and in the GOVERNANCE.veterinary / GOVERNANCE.ems_prehospital citation variant: the attending veterinarian for Group U; the medical director and the receiving facility for Group V; the incident commander on scene for mass-casualty triage; the receiving stroke-center neurologist for NIHSS; etc.
- Reuses the existing v6 audit posture: edition + asOf + free-access URL + governance variant in every citation.

## 3. What this is NOT

The override does **not** authorize:

- Live drug labels (the v12 §U.1 dose tile does not bundle a drug list; the user enters the drug name, dose, and concentration from the current formulary).
- Patient-specific prescribing (the §U.8 vaccine-schedule tile renders the AAHA / AAFP core / non-core split, not a per-patient vaccine plan).
- Diagnosis (the §V.17 / V.18 / V.19 Wells DVT / Wells PE / PERC tiles are pretest-probability estimators; they do not image, do not confirm, and do not replace clinical judgment - the limitation banner says so).
- A clinical-utility site replacement (the spec-v9 §11 reservation of a separate clinical-utility site stands; v12 only opens the bounded math-aid surface).

If a future tile would require any of the above, the override does not cover it. A separate spec proposing to extend the override must (a) cite this document, (b) name the new bounded surface and the new public-domain source, and (c) preserve the limitation-banner + governance-variant discipline.

## 4. Bounded scope inventory

The override applies to the eighteen Group U tiles enumerated in spec-v12 §5 (U.1-U.18; first-principles dose math + public reference tables + species-aware fluid math + AAHA / AAFP guideline reference) and the twenty Group V tiles enumerated in spec-v12 §6 (V.1-V.20; GCS, Parkland, CPSS, APGAR, IV drip, O2 cylinder, peds weight, shock index, MAP, anion gap, corrected calcium, CHA2DS2-VASc, Wells DVT, Wells PE, PERC, Rule of 9s / Lund-Browder, pediatric vitals, NIHSS, START / JumpSTART, drug concentration to volume). Each tile carries a CANONICAL limitation-banner entry in [limitation-banner.js](../limitation-banner.js) naming what the tile is NOT and who governs.

## 5. Why the override does not change the threat model

The v10 §B.1 limitation banner is a stronger safety affordance than the spec.md §11 exclusion was. The exclusion said "we will not ship this class of tile." The banner says "here is the tile; here is what it is not; here is who governs; here is the canonical free-access source if you want to verify." A paramedic on a locked-down agency phone reading the Parkland formula off a paper card is exactly the use case the bundled calculator improves on; the paper card carries no banner, no edition, no free-access pointer, and no citation. The site does.

The override therefore does not relax any of the v10 §B-§H invariants: same-origin static bundle, no telemetry, no account, no AI, no live runtime data fetch, no licensed-text reproduction. It only adds the per-tile limitation-banner + governance-variant discipline that v10 §B.1 already requires across every audited tile in every other group.

## 6. Audit posture

The two groups are reviewed per spec-v10 §I.3 (audit-trail discipline):

- Group U (Veterinary): the spec-v12 §14.1 phase order requires an external veterinary-aware reviewer signoff before each release window in which Group U ships. The signoff is recorded in [audit-trail.md](audit-trail.md) with the reviewer's name, role, and date.
- Group V (EMS / Pre-hospital): identical posture with an EMS-aware reviewer (paramedic, EMS medical director, or emergency physician).

Both groups ship under the spec-v12 §14.2 per-tile test discipline (ten or more unit tests per tile, including one worked example from a primary public source). The v10 §C end-to-end runner exercises the worked example for every tile in every release.

## 7. Renewal

This override is reviewed at every major release window (spec rev). If at any point the v10 §B.1 limitation-banner discipline is weakened, or the spec-v12 §5 / §6 bounded scope is exceeded, the override lapses and the affected tiles return to the spec.md §11 exclusion. A future spec that proposes to extend the override (a new profession in the same shape, for example) must cite this document by section and preserve the same posture.
