// v10 Phase B.1 limitation-banner shared component (spec-v10.md §4.1).
//
// Renders a tile-specific "what this is NOT" banner above the inputs on
// simplified-screening tiles (Manual J, arc-flash incident-energy
// screen, ASHRAE 62.1 outdoor-air ventilation, stair-stringer, slope-
// angle screen, sous-vide pasteurization, septic drainfield, service /
// demand load). The banner is visually distinct from the citation
// footer and the result-area context band, and reuses the existing
// .inline-notice palette (which already adapts to High-Contrast).
//
// The component takes a meta-style options object:
//   {
//     headline:     short string ("Not an IEEE 1584 study")
//     replacement:  what code-compliance actually requires
//     who_governs:  short string identifying the AHJ / licensed pro
//     link:         optional free-access URL to the standard's TOC
//   }
//
// Output DOM (vanilla; no innerHTML; no string interpolation into
// markup):
//
//   <aside class="inline-notice limitation-banner" role="note"
//          aria-label="Tile limitations">
//     <strong class="limitation-headline">Not a Manual J load calculation.</strong>
//     <p class="limitation-replacement">A code-compliant load calc
//        requires ACCA Manual J 8th ed.</p>
//     <p class="limitation-governs">The AHJ governs.</p>
//     <p class="limitation-link"><a href="..." rel="noopener">Free
//        access at acca.org</a></p>
//   </aside>
//
// All text content is set via textContent (never innerHTML). The
// optional link is the only anchor; href is whatever the caller
// supplied verbatim. Spec-v10 §1 forbids any new third-party fetch, so
// the link is informational only -- clicking it leaves the site.

const HEADLINE_MAX = 80;
const REPLACEMENT_MAX = 240;
const GOVERNS_MAX = 120;

function clip(s, max) {
  if (typeof s !== "string") return "";
  s = s.trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

export function renderLimitationBanner(host, opts) {
  if (!host || typeof host !== "object") return null;
  if (!opts || typeof opts !== "object") return null;
  const doc = host.ownerDocument || (typeof document !== "undefined" ? document : null);
  if (!doc) return null;

  const headline = clip(opts.headline, HEADLINE_MAX);
  const replacement = clip(opts.replacement, REPLACEMENT_MAX);
  const governs = clip(opts.who_governs, GOVERNS_MAX);
  if (!headline || !replacement || !governs) return null;

  const aside = doc.createElement("aside");
  aside.className = "inline-notice limitation-banner";
  aside.setAttribute("role", "note");
  aside.setAttribute("aria-label", "Tile limitations");

  const h = doc.createElement("strong");
  h.className = "limitation-headline";
  h.textContent = headline;
  aside.appendChild(h);

  const r = doc.createElement("p");
  r.className = "limitation-replacement";
  r.textContent = replacement;
  aside.appendChild(r);

  const g = doc.createElement("p");
  g.className = "limitation-governs";
  g.textContent = governs;
  aside.appendChild(g);

  if (typeof opts.link === "string" && opts.link.length > 0) {
    const linkP = doc.createElement("p");
    linkP.className = "limitation-link";
    const a = doc.createElement("a");
    // Caller supplies the URL. We do not auto-prepend a scheme; the
    // existing citation convention is bare host+path. Most callers will
    // pass an https:// URL when they want a clickable link; passing a
    // bare host renders as a plain link the browser treats as relative,
    // which is the right safe default if a future href cleanup is run.
    a.href = String(opts.link);
    a.rel = "noopener";
    a.textContent = "Free access: " + clip(opts.link, REPLACEMENT_MAX);
    linkP.appendChild(a);
    aside.appendChild(linkP);
  }

  host.insertBefore(aside, host.firstChild || null);
  return aside;
}

// A small registry of canonical limitation-banner copy for the tiles
// spec-v10 §4.3 names explicitly. Renderers can either pass an `opts`
// object directly or look up the canonical copy by tile id via
// `getLimitationCopy(id)`. Keeping the copy here means a future edit
// (e.g., a Manual J language tweak) is one-file.
const CANONICAL = {
  "cockcroft-gault-crcl": {
    headline: "Not a dosing decision.",
    replacement:
      "Estimated creatinine clearance guides renal dose adjustment; it is not validated in acute kidney injury, pregnancy, or non-steady-state creatinine, and total body weight overestimates in obesity. The prescriber selects the dose for this patient.",
    who_governs: "The treating clinician and pharmacist govern the dose.",
    link: "",
  },
  "winters-expected-pco2": {
    headline: "Not a diagnosis.",
    replacement:
      "Winters' expected pCO2 checks whether respiratory compensation for a metabolic acidosis is appropriate; it applies only to a primary metabolic acidosis and assumes steady state. Interpret with the full blood gas and the clinical picture.",
    who_governs: "The treating clinician governs.",
    link: "",
  },
  "aa-gradient": {
    headline: "Not a diagnosis.",
    replacement:
      "The A-a gradient characterizes oxygenation; the age-expected normal applies to room air and inflates on supplemental oxygen. Interpret with the blood gas, the FiO2, and the clinical picture - it does not by itself diagnose a cause.",
    who_governs: "The treating clinician governs.",
    link: "",
  },
  "fena": {
    headline: "Not a diagnosis.",
    replacement:
      "FENa distinguishes pre-renal from intrinsic causes of oliguric AKI; it is invalid after loop diuretics and the 1-2% band is indeterminate. Interpret in an oliguric-AKI context with the full workup, not in isolation.",
    who_governs: "The treating clinician governs.",
    link: "",
  },
  "vet-body-surface-area": {
    headline: "Not a chemotherapy order.",
    replacement:
      "Body surface area math converts weight to m2 for protocol dosing. The protocol, the agent, and the per-m2 dose come from the oncologist and the current literature; BSA dosing of cytotoxics is debated in small patients. Verify the protocol before drawing.",
    who_governs: "The attending veterinarian (and oncologist) governs the protocol and dose.",
    link: "plumbsveterinarydrugs.com",
  },
  "vet-corrected-reticulocyte": {
    headline: "Not a diagnosis.",
    replacement:
      "The corrected reticulocyte and production index characterize a regenerative response; they do not diagnose its cause. Interpret with the full CBC, the clinical picture, and serial trends; regeneration lags 3-5 days. Reference thresholds are lab-specific.",
    who_governs: "The attending veterinarian and the reporting laboratory govern.",
    link: "asvcp.org",
  },
  "vet-fluid-deficit": {
    headline: "Not a fluid order.",
    replacement:
      "The deficit-plus-maintenance volume is a starting estimate. The fluid type, rate, and additives come from a veterinarian for this patient; cardiac, renal, and pulmonary patients need slower correction. Reassess hydration and body weight frequently.",
    who_governs: "The attending veterinarian governs the fluid plan.",
    link: "aaha.org",
  },
  "vet-anion-gap": {
    headline: "Not a diagnosis.",
    replacement:
      "The anion gap is one input to an acid-base assessment, not a diagnosis. The veterinary convention includes potassium and species ranges differ; hypoalbuminemia lowers the apparent gap. Interpret with a blood gas and the clinical picture.",
    who_governs: "The attending veterinarian governs.",
    link: "",
  },
  "manual-j-cooling": {
    headline: "Not a Manual J load calculation.",
    replacement:
      "A code-compliant load calculation requires ACCA Manual J 8th ed. This tile is a simplified screen.",
    who_governs: "The AHJ and the licensed mechanical designer govern.",
    link: "acca.org",
  },
  "manual-j-heating": {
    headline: "Not a Manual J load calculation.",
    replacement:
      "A code-compliant load calculation requires ACCA Manual J 8th ed. This tile is a simplified screen.",
    who_governs: "The AHJ and the licensed mechanical designer govern.",
    link: "acca.org",
  },
  "arc-flash-screen": {
    headline: "Not an IEEE 1584 study.",
    replacement:
      "A code-compliant arc-flash incident-energy analysis requires an IEEE 1584-2018 study by a qualified engineer with site-specific data.",
    who_governs: "The AHJ and a qualified electrical engineer govern.",
    link: "ieee.org",
  },
  "outdoor-air-mix": {
    headline: "Not an ASHRAE 62.1 design.",
    replacement:
      "A code-compliant ventilation design requires ASHRAE 62.1 with the AHJ-adopted edition's Rp / Ra values for the project occupancy.",
    who_governs: "The AHJ and the design engineer govern.",
    link: "ashrae.org/technical-resources/standards-and-guidelines/read-only-versions-of-ashrae-standards",
  },
  "outdoor-air-ventilation": {
    headline: "Not an ASHRAE 62.1 design.",
    replacement:
      "Rp and Ra are user-supplied. ASHRAE 62.1 Table 6-1 governs the per-occupancy values for the AHJ-adopted edition. The tile does not bundle the table.",
    who_governs: "The AHJ and the design engineer govern.",
    link: "ashrae.org/technical-resources/standards-and-guidelines/read-only-versions-of-ashrae-standards",
  },
  "stair-stringer": {
    headline: "Not a code-compliance check.",
    replacement:
      "Stair geometry limits (max riser, min tread, headroom) come from the AHJ-adopted code edition (IRC, IBC, or local amendment). User-supplied limits.",
    who_governs: "The AHJ governs final stair geometry.",
    link: "codes.iccsafe.org",
  },
  "slope-avalanche": {
    headline: "Not avalanche training.",
    replacement:
      "Slope-angle screening flags terrain in the avalanche-prone band. It does not assess snowpack, wind, recent loading, or any other condition. Training and a qualified guide remain required.",
    who_governs: "The user, with avalanche training and current local conditions, governs.",
    link: "avalanche.org",
  },
  "sous-vide-pasteurization": {
    headline: "Not a HACCP plan.",
    replacement:
      "Pasteurization-time tables come from public food-safety research; a commercial kitchen requires a HACCP plan signed by a qualified processing authority.",
    who_governs: "The local food-safety authority and a qualified processing authority govern.",
    link: "fda.gov/food/retail-food-protection/fda-food-code",
  },
  "septic-drainfield": {
    headline: "Not a code-compliant septic design.",
    replacement:
      "Drainfield sizing requires a state-approved soil evaluation (perc test or other approved method) and a design by a licensed professional.",
    who_governs: "The state primacy agency and a licensed professional govern.",
    link: "epa.gov/septic",
  },
  "service-load": {
    headline: "Not a final service-size determination.",
    replacement:
      "NEC §220 demand factors compute a minimum. The AHJ may require additional capacity for future loads, a different demand method, or the optional method per §220.82.",
    who_governs: "The AHJ governs final service sizing.",
    link: "nfpa.org/freeaccess",
  },

  // v12 Group V (EMS / Pre-hospital): math aids only; the receiving
  // facility's physician and the agency's medical director govern.
  "glasgow-coma-scale": {
    headline: "Not a triage decision.",
    replacement:
      "The Glasgow Coma Scale is a structured score for documenting level of consciousness. Final disposition (e.g., transport destination, airway management, intubation) is governed by the receiving facility and the agency's medical director.",
    who_governs: "The receiving facility physician and the EMS medical director govern.",
    link: "acep.org",
  },
  "parkland-formula": {
    headline: "Not a final burn-resuscitation order.",
    replacement:
      "The Parkland formula is an initial estimate. Actual fluid resuscitation is titrated to urine output and is governed by the receiving burn center. Pediatric, electrical, and inhalation injuries may require modified protocols.",
    who_governs: "The receiving burn center and the EMS medical director govern.",
    link: "ameriburn.org",
  },
  "cincinnati-stroke-scale": {
    headline: "Not a stroke diagnosis.",
    replacement:
      "CPSS is a screening tool. Definitive stroke diagnosis requires CT / MRI imaging and a stroke-team evaluation at the receiving facility. Transport per regional stroke-protocol; note last-known-well time on every patient.",
    who_governs: "The receiving stroke center and the EMS medical director govern.",
    link: "stroke.org",
  },
  "apgar-score": {
    headline: "Not a resuscitation algorithm.",
    replacement:
      "APGAR is a structured score for documenting newborn status at 1 and 5 minutes. Resuscitation itself follows the current Neonatal Resuscitation Program (NRP) algorithm; do not delay airway / breathing / circulation steps to score.",
    who_governs: "The delivering clinician and the receiving facility govern; NRP guidelines set the algorithm.",
    link: "aap.org/nrp",
  },
  "iv-drip-rate": {
    headline: "Not an infusion order.",
    replacement:
      "Drip-rate math is an arithmetic check. The drug, volume, time, and route come from the medical-director-approved protocol or a physician order. Verify the IV-set's drop factor against the actual label before relying on the rate.",
    who_governs: "The EMS medical director governs the protocol; the on-scene paramedic governs the bedside adjustment.",
    link: "naemsp.org",
  },
  "o2-cylinder-duration": {
    headline: "Not a real-time monitor.",
    replacement:
      "Duration math is an estimate from the AARC tank-factor convention. Cylinders should never be drawn to zero; the 'reserve' pressure is what you plan to land at. Verify against the actual cylinder regulator gauge before each transport.",
    who_governs: "The EMS medical director governs flow protocol; the respiratory-therapy team governs in-hospital handoff.",
    link: "aarc.org",
  },
  "pediatric-weight-estimate": {
    headline: "Not a substitute for a scale.",
    replacement:
      "APLS weight estimates are population averages; an individual child may differ substantially. Field-weigh on a calibrated scale at every opportunity. Drug doses derived from this estimate carry the same uncertainty as the weight itself.",
    who_governs: "The EMS medical director governs pediatric dosing protocol; the receiving facility verifies before pharmacy fills.",
    link: "apls.org",
  },
  "pediatric-tube-depth": {
    headline: "Not an airway order.",
    replacement:
      "PALS age-based ETT sizing and depth are starting estimates. Confirm tube size and placement by direct visualization, auscultation, waveform capnography, and a chest film; have the next size up and down ready. Neonates fall outside the age formula - use a length-based (Broselow) estimate.",
    who_governs: "The EMS medical director governs scope; the receiving physician confirms placement.",
    link: "heart.org",
  },
  "shock-index": {
    headline: "Not a diagnosis.",
    replacement:
      "Shock index is a structured early-warning marker. A single elevated value is suggestive, not diagnostic; trend over serial readings, correlate with mental status, skin findings, and capillary refill. Suspected hemorrhagic shock goes to a trauma center per regional protocol.",
    who_governs: "The receiving trauma center and the EMS medical director govern.",
    link: "naemt.org",
  },
  "mean-arterial-pressure": {
    headline: "Not a perfusion guarantee.",
    replacement:
      "Cuff-derived MAP is an estimate; arterial-line MAP differs slightly. A MAP at or above 65 mmHg is the published minimum-perfusion floor but does NOT guarantee end-organ perfusion. Mental status, urine output, lactate, and capillary refill carry the rest of the assessment.",
    who_governs: "The EMS medical director and receiving facility govern.",
    link: "sccm.org",
  },
  "anion-gap": {
    headline: "Not a diagnosis.",
    replacement:
      "The anion gap is a structured arithmetic check on the chemistry panel. An elevated AG narrows the differential (MUDPILES screen) but does not name the cause. Hypoalbuminemia, paraproteinemia, and lab-method artifact all shift the measured value; the Figge correction is a screening adjustment, not a substitute for clinical interpretation.",
    who_governs: "The treating clinician and receiving facility govern.",
    link: "ncbi.nlm.nih.gov",
  },
  "corrected-calcium": {
    headline: "Not a substitute for ionized calcium.",
    replacement:
      "The Payne correction is a screening adjustment. Ionized calcium (the physiologically active fraction) is the gold-standard measurement; symptomatic hypocalcemia or hypercalcemia warrants an ionized-Ca level rather than reliance on the correction. The 0.8-per-1.0 slope is a population average; an individual patient may deviate.",
    who_governs: "The treating clinician and laboratory medicine govern.",
    link: "ncbi.nlm.nih.gov",
  },
  "ideal-body-weight": {
    headline: "A dosing-weight estimate, not a target weight.",
    replacement:
      "Devine IBW, Hume lean body weight, and adjusted body weight are population formulas used to scale drug doses and ventilator tidal volumes; they are not a clinical target weight or a nutrition goal. Devine under-estimates below 60 in and was derived in adults. The right dosing weight (IBW, ABW, AdjBW, or LBW) is drug-specific.",
    who_governs: "The prescribing clinician and pharmacist govern the dosing weight.",
    link: "ncbi.nlm.nih.gov",
  },
  "corrected-qt": {
    headline: "Not an arrhythmia diagnosis.",
    replacement:
      "QTc is a rate-corrected measurement, not a diagnosis. Bazett over-corrects at fast rates and under-corrects at slow rates; Fridericia or Framingham is preferred outside 60-100 bpm. QT measurement is lead- and observer-dependent, and the prolongation thresholds shift with sex, electrolytes, and QT-prolonging drugs.",
    who_governs: "The treating clinician and the 12-lead interpretation govern.",
    link: "ncbi.nlm.nih.gov",
  },
  "cha2ds2-vasc": {
    headline: "Not an anticoagulation decision.",
    replacement:
      "CHA2DS2-VASc is a structured risk-stratification score, not a prescription. The 2019 AHA / ACC / HRS guideline anticoagulation thresholds are the starting point; bleeding risk (HAS-BLED), patient preference, renal function, drug interactions, and shared decision-making determine the actual treatment plan.",
    who_governs: "The treating cardiologist or anticoagulation clinic governs.",
    link: "heart.org",
  },
  "wells-dvt": {
    headline: "Not a DVT diagnosis.",
    replacement:
      "The Wells DVT score is a pretest-probability estimator. A 'likely' score warrants a proximal compression ultrasound; an 'unlikely' score paired with a negative high-sensitivity D-dimer effectively excludes DVT in the validated population. The score does NOT image, does NOT confirm, and does NOT replace clinical judgment.",
    who_governs: "The treating emergency physician or hospitalist governs imaging and disposition.",
    link: "acep.org",
  },
  "wells-pe": {
    headline: "Not a PE diagnosis.",
    replacement:
      "The Wells PE score is a pretest-probability estimator. A 'likely' score in the ED triggers CT pulmonary angiography (or V/Q if contrast is contraindicated); an 'unlikely' score paired with a negative high-sensitivity D-dimer effectively excludes PE in validated populations. The score does NOT image and does NOT replace clinical gestalt.",
    who_governs: "The treating emergency physician governs imaging and disposition.",
    link: "acep.org",
  },
  "perc-rule": {
    headline: "Not a PE rule-out by itself.",
    replacement:
      "PERC negative only rules out PE when the patient is ALREADY in a low pretest probability population (Wells PE < 2 or physician gestalt low). Applying PERC to a moderate / high pretest patient is a misuse of the rule and does NOT exclude PE. PERC positive does not confirm PE; it returns the patient to the standard Wells PE + D-dimer +/- CTPA workup.",
    who_governs: "The treating emergency physician governs pretest assignment and the workup that follows.",
    link: "acep.org",
  },
  "rule-of-9s": {
    headline: "Not a burn-center transfer decision.",
    replacement:
      "Total body surface area is a planning input to fluid resuscitation (Parkland) and to the ABA burn-center-transfer criteria. The two methods here (Rule of 9s and Lund-Browder) are field estimates; in-hospital re-estimation on a clean patient is the gold standard. Do NOT delay transfer to count regions exactly.",
    who_governs: "The receiving burn-center attending governs transfer and the definitive fluid plan.",
    link: "ameriburn.org",
  },
  "pediatric-vitals": {
    headline: "Reference ranges only.",
    replacement:
      "Normal-range bands from the AHA PALS Provider Manual are a starting point, not a clinical threshold. A child outside the published range may be well; a child inside may be in compensated shock. The trend over serial readings, the clinical context, and the receiving facility's protocols govern any disposition.",
    who_governs: "The receiving pediatric facility (and any on-line medical command) governs the clinical action.",
    link: "heart.org",
  },
  "nihss": {
    headline: "Not a stroke diagnosis or tPA decision.",
    replacement:
      "NIHSS is a structured neurologic exam score, not a diagnosis and not an automated tPA / thrombectomy decision. The receiving stroke-center neurologist integrates imaging (non-contrast CT, CTA, perfusion), time from last-known-well, contraindications, and patient / family preferences. Re-score after every intervention; never report from memory.",
    who_governs: "The receiving stroke-center neurologist governs imaging review and tPA / EVT decisions.",
    link: "stroke.nih.gov",
  },
  "start-triage": {
    headline: "Not a clinical disposition.",
    replacement:
      "START and JumpSTART are field-triage algorithms designed for the first three minutes of a multi-casualty incident. The tag is a sorting decision, not a clinical diagnosis or a transport decision. Tags are re-evaluated continuously; a green-tagged patient who deteriorates is re-tagged. Pediatric patients with the JumpSTART branch must be re-checked under standard pediatric protocols once stabilized.",
    who_governs: "The incident commander governs the scene; the receiving facility's physician governs the clinical course.",
    link: "cdc.gov",
  },
  "drug-concentration": {
    headline: "Not a prescription or a route decision.",
    replacement:
      "Volume = dose / concentration is arithmetic. The drug, the dose, the route, the rate, and any compatibility check are clinical decisions made by the medical director, the receiving facility, or the on-line medical command line. Read the label twice; the calculator does not see what is in the vial.",
    who_governs: "The medical director and the receiving facility govern the drug, the dose, and the route.",
    link: "acep.org",
  },

  // v12 Group U (Veterinary): math aids only; the attending
  // veterinarian governs the prescription and the in-clinic plan.
  "vet-weight-based-dose": {
    headline: "Not a prescription.",
    replacement:
      "Weight-based dose math is a draw-volume calculation. The dose and the concentration come from the current formulary (Plumb's, USP, or the FDA-approved label); the dose is selected by a veterinarian for this patient. Verify both numbers before drawing.",
    who_governs: "The attending veterinarian governs the prescription. The RVT / LVT and on-site veterinary team govern the administration.",
    link: "plumbsveterinarydrugs.com",
  },
  "vet-maintenance-fluid": {
    headline: "Not a fluid order.",
    replacement:
      "Maintenance + replacement fluid math is an estimate. Cardiac, renal, hepatic, hypoalbuminemic, and pediatric patients require modified plans. The actual rate is titrated to physical exam, urine output, and serial bloodwork.",
    who_governs: "The attending veterinarian governs the fluid plan; the RVT / LVT governs the in-line rate adjustment.",
    link: "vin.com",
  },
  "vet-energy-requirement": {
    headline: "Not a feeding prescription.",
    replacement:
      "RER / MER is a starting estimate from a published allometric formula. Real caloric needs vary with body condition score, illness, pregnancy / lactation, environmental temperature, and diet digestibility. Reassess at every recheck.",
    who_governs: "The attending veterinarian governs the feeding plan; the owner governs daily portioning.",
    link: "aaha.org",
  },
  "vet-bcs-reference": {
    headline: "Not a clinical assessment.",
    replacement:
      "BCS is a hands-on palpation score, not a visual rating. The bands below help an owner or new tech recognize the descriptions; the actual score requires rib + waist + abdominal-tuck palpation by trained hands.",
    who_governs: "The attending veterinarian and RVT govern the in-clinic score.",
    link: "aaha.org",
  },
  "vet-pet-age": {
    headline: "Not a life-stage care plan.",
    replacement:
      "The human-equivalent age is a communication aid, not a screening algorithm. Senior-care recommendations (bloodwork frequency, dental, mobility) follow the actual chronological age and the patient's clinical findings, not the human-equivalent number.",
    who_governs: "The attending veterinarian governs life-stage care decisions.",
    link: "aaha.org",
  },
  "vet-gestation": {
    headline: "Not a clinical due-date.",
    replacement:
      "Gestation length varies day-to-day; the range is normal. Clinical readiness is assessed by palpation, ultrasound, progesterone testing, and (in some species) milk let-down. Use this date for owner-planning, not to schedule a c-section.",
    who_governs: "The attending veterinarian governs whelping / foaling / calving readiness.",
    link: "vin.com",
  },
  "vet-ett-sizing": {
    headline: "Not a tube selection.",
    replacement:
      "Tube and catheter size depend on the individual patient's anatomy, condition, and the procedure. These bands are starting points; the anesthetist confirms at intubation by checking cuff seal, ventilation pressure, and breath sounds.",
    who_governs: "The attending veterinarian or anesthesia-trained RVT governs the actual selection.",
    link: "acvaa.org",
  },
  "vet-anesthesia-vitals": {
    headline: "Not a real-time monitor.",
    replacement:
      "These are normal-range references. An individual patient may run outside the band and still be doing well, or run within the band and be in trouble. Trend over time and clinical context drive intervention, not any single number.",
    who_governs: "The attending veterinarian governs anesthetic adjustments; the RVT monitors at the table.",
    link: "acvaa.org",
  },
  "vet-asa-classification": {
    headline: "Not an outcome prediction.",
    replacement:
      "ASA Physical Status describes preoperative risk; it does NOT predict outcome. A well-managed ASA IV may recover better than a poorly-managed ASA II. The class informs the anesthetic plan; the plan and the team execute it.",
    who_governs: "The attending veterinarian governs the pre-anesthetic assessment.",
    link: "asahq.org",
  },
  "vet-bloodwork-ranges": {
    headline: "Not a diagnosis.",
    replacement:
      "These are generic adult reference bands. The reporting lab's machine-specific range is the value of record; a value just outside the band is not by itself a diagnosis. Trends, clinical signs, and the veterinarian's interpretation govern.",
    who_governs: "The attending veterinarian governs interpretation and follow-up.",
    link: "merckvetmanual.com",
  },
  "vet-urine-sg": {
    headline: "Not a kidney-disease verdict.",
    replacement:
      "USG must be interpreted with hydration status and a paired chem panel. Isosthenuria in a hydrated patient may be normal post-prandially; isosthenuria in a dehydrated, azotemic patient is a renal-loss flag. The band is a starting point, not a diagnosis.",
    who_governs: "The attending veterinarian governs CKD staging and workup.",
    link: "iris-kidney.com",
  },
  "vet-target-weight-loss": {
    headline: "Not a medical clearance.",
    replacement:
      "A weight-loss plan assumes the patient is otherwise healthy. Comorbidities (cardiac, renal, endocrine, orthopedic) change the safe rate of loss and the appropriate diet. The plan is a starting math; the veterinarian clears the patient and selects the diet.",
    who_governs: "The attending veterinarian governs medical clearance and diet selection.",
    link: "aaha.org",
  },
  "vet-toxicity": {
    headline: "Not a toxicology consult.",
    replacement:
      "These are screening thresholds. Below 'mild signs' is NOT 'safe' (cumulative or concurrent ingestions, individual susceptibility, and species variation all matter). The default posture for any suspected ingestion is to call ASPCA APCC at 888-426-4435 (consult fee applies) or your nearest emergency veterinary hospital.",
    who_governs: "The attending veterinarian governs decontamination and treatment.",
    link: "aspca.org",
  },
  "vet-breed-predispositions": {
    headline: "Not a diagnosis.",
    replacement:
      "Population-level associations only. A predisposition raises the prior probability that a workup considers a condition; it does NOT mean the patient has the condition. Individual history, examination, and (when feasible) genetic testing or registry papers drive the workup. Lists are NOT exhaustive.",
    who_governs: "The attending veterinarian governs the differential and the workup.",
    link: "ofa.org",
  },
  "vet-plasma-css": {
    headline: "Not a dosing recommendation.",
    replacement:
      "Css assumes linear first-order PK, healthy-population clearance, and steady-state attainment after ~4-5 half-lives. Renal or hepatic compromise shifts CL down (and Css up); drugs with nonlinear kinetics violate the underlying identity. The number is a target / cross-check, not a dose.",
    who_governs: "The attending veterinarian or veterinary clinical pharmacologist governs dosing.",
    link: "merckvetmanual.com",
  },
  "vet-vaccine-schedule": {
    headline: "Not a patient-specific vaccine plan.",
    replacement:
      "The AAHA / AAFP guidelines are population-level starting points. Patient age, prior vaccination history, immune status, lifestyle, and product-specific contraindications all modify the individual plan. Rabies interval is fixed by state-AHJ statute, NOT by the guideline; defer to the state department of agriculture / public health.",
    who_governs: "The attending veterinarian governs the patient-specific schedule; state-AHJ governs rabies.",
    link: "aaha.org",
  },
  "vet-heartworm-dose": {
    headline: "Not a prescription.",
    replacement:
      "The labeled weight-band lookup is the FDA-approved dose for a healthy patient with a negative pre-treatment heartworm test. Contraindications (MDR1 mutation in herding breeds for high-dose ivermectin off-label use; concurrent ivermectin sensitivity; age limits; active microfilaremia) are NOT enforced by this tile. A negative antigen / microfilaria test is required BEFORE starting prevention; starting prevention in an unscreened or positive patient can be harmful.",
    who_governs: "The attending veterinarian governs product selection, pre-treatment screening, and contraindications.",
    link: "heartwormsociety.org",
  },
  "vet-crystalloid-plan": {
    headline: "Not a fluid prescription.",
    replacement:
      "This is the consolidated arithmetic over the maintenance basis, the estimated dehydration deficit, and the entered ongoing losses. Cardiac, renal, hepatic, and oncotic-pressure considerations are NOT modeled. The plan assumes balanced isotonic crystalloid (LRS / Plasma-Lyte / Normosol-R); colloid, hypertonic saline, and blood-product accounting are out of scope. Recheck the patient at the cadence the case demands.",
    who_governs: "The attending veterinarian governs fluid choice, rate adjustment, and recheck cadence.",
    link: "acvecc.org",
  },
  "vet-cri": {
    headline: "Not a CRI prescription.",
    replacement:
      "This is the bag-method arithmetic (drug to add, infusion rate, drops/min, mg/hr). No drug list is bundled; the dose range and stock concentration come from the current formulary, and the choice of drug, dose, diluent compatibility, and rate is a clinical decision. Verify the final concentration and pump program before connecting the line.",
    who_governs: "The attending veterinarian governs the drug, dose, and rate; the RVT / LVT governs administration.",
    link: "acvecc.org",
  },
  "vet-transfusion": {
    headline: "Not a transfusion order.",
    replacement:
      "The volume estimate is population arithmetic from species blood volume and the PCV gap; the individual patient's volume status, cardiac reserve, and ongoing losses are NOT modeled. Blood typing and a cross-match are required before transfusion, and the patient must be monitored for a transfusion reaction throughout. The rate and volume are clinical decisions.",
    who_governs: "The attending veterinarian governs product selection, cross-match, rate, and reaction management.",
    link: "acvim.org",
  },
  "equine-weight": {
    headline: "An estimate, not a scale weight.",
    replacement:
      "The Carroll-Huntington tape estimate is a field approximation validated on mature light-breed horses; it is less accurate for ponies, draft breeds, pregnant mares, and animals outside the published girth range. Use a livestock scale where dosing or anesthesia depends on an accurate weight, and let the AAEP body-condition score guide nutrition.",
    who_governs: "The attending veterinarian governs weight-based dosing and the nutrition plan.",
    link: "aaep.org",
  },
};

export function getLimitationCopy(id) {
  if (typeof id !== "string") return null;
  return CANONICAL[id] || null;
}

export function listLimitationCopyIds() {
  return Object.keys(CANONICAL).sort();
}
