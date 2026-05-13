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
// the link is informational only — clicking it leaves the site.

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
};

export function getLimitationCopy(id) {
  if (typeof id !== "string") return null;
  return CANONICAL[id] || null;
}

export function listLimitationCopyIds() {
  return Object.keys(CANONICAL).sort();
}
