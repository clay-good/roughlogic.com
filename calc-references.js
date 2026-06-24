// Group H: Knowledge References (utilities 114 through 118).
//
// Reference pages with original plain-English summaries by the project
// author. Code documents (NEC, IPC, IRC, NFPA, etc.) are referenced by
// section number only; no code text is reproduced.

import { DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeOutputLine, attachExampleButton, fmt } from "./ui-fields.js";

// --- Utility 114: Wire / Pipe / Gas Color Codes ---

export const COLOR_CODES = [
  { system: "NEC residential phase (US)", entries: [
    { item: "Phase A (single-phase 120/240)", color: "Black" },
    { item: "Phase B (single-phase 120/240)", color: "Red" },
    { item: "Neutral (grounded)", color: "White or gray" },
    { item: "Equipment grounding conductor", color: "Green or bare" },
    { item: "Phase A (208/480 three-phase)", color: "Brown / orange / yellow per system" },
  ] },
  { system: "IEC industrial (Europe / Australia)", entries: [
    { item: "Line L1 / L2 / L3", color: "Brown / black / gray" },
    { item: "Neutral", color: "Blue" },
    { item: "Protective earth (PE)", color: "Green and yellow" },
  ] },
  { system: "Gas piping (US trade markings)", entries: [
    { item: "Natural gas", color: "Yellow" },
    { item: "Liquefied petroleum (LP)", color: "Yellow with markings" },
    { item: "Medical gas oxygen", color: "Green" },
    { item: "Medical gas vacuum", color: "White" },
  ] },
  { system: "HVAC piping (ASME A13.1)", entries: [
    { item: "Chilled water supply", color: "Green with white letters" },
    { item: "Steam", color: "Yellow with black letters" },
    { item: "Compressed air", color: "Blue with white letters" },
    { item: "Fire suppression water", color: "Red with white letters" },
  ] },
];

// dims: in { args: dimensionless } out: { systems: dimensionless }
// (Pure categorical color-code reference table.)
export function computeColorCodes() { return { systems: COLOR_CODES }; }

export const colorCodesExample = { inputs: {}, expected: { count: COLOR_CODES.length } };

// --- Utility 115: Knot Reference ---

export const KNOT_REFERENCE = [
  { knot: "Bowline", use: "Forming a fixed loop at the end of a line; rescue and rigging.", strength_reduction: "30 to 40 percent of rope tensile strength.", note: "Easy to untie after loading; does not slip if dressed correctly." },
  { knot: "Clove hitch", use: "Securing a line to a post or anchor.", strength_reduction: "40 to 50 percent of rope tensile strength.", note: "Can slip under uneven loading; back up with a half hitch." },
  { knot: "Figure-eight on a bight", use: "Forming a strong, easy-to-inspect loop in the middle or end of a rope.", strength_reduction: "20 to 30 percent of rope tensile strength.", note: "Standard rescue knot; jams less than the figure-eight follow-through." },
  { knot: "Double fisherman", use: "Joining two ropes of similar diameter.", strength_reduction: "20 to 30 percent of rope tensile strength.", note: "Strong and reliable; difficult to untie after heavy loading." },
  { knot: "Munter hitch", use: "Improvised belay or rappel device.", strength_reduction: "Adds friction; not a strength-reducing knot per se.", note: "Twists the rope under load; preferred in emergencies only." },
];

// dims: in { args: dimensionless } out: { knots: dimensionless }
// (Pure categorical knot reference; strength-reduction notes are
//  text excerpts, not measured aggregates.)
export function computeKnotReference() { return { knots: KNOT_REFERENCE }; }

export const knotReferenceExample = { inputs: {}, expected: { count: KNOT_REFERENCE.length } };

// --- Utility 116: Inspection Prep Checklist ---

export const INSPECTION_CHECKLISTS = {
  Electrical: [
    "Service grounding electrode and intersystem bonding terminal installed and visible.",
    "Panel labeling complete; circuit directory legible; AFCI/GFCI breakers correct per occupancy.",
    "All boxes accessible; covers in place at rough; receptacle and switch heights consistent.",
    "Conductor splices in approved boxes; wire connectors rated for material and count.",
    "EGC continuous and bonded at every metallic enclosure.",
  ],
  Plumbing: [
    "DWV pressure or air test held per AHJ duration; gauges visible.",
    "Cleanouts at required intervals and orientations.",
    "Trap arm lengths and venting per the adopted code.",
    "Water supply identified, supported per spans, and protected at penetrations.",
    "Backflow assemblies installed at appropriate hazard level.",
  ],
  HVAC: [
    "Equipment service clearance and access maintained.",
    "Refrigerant line set sealed and supported; condensate properly trapped and routed.",
    "Combustion air, venting, and flue terminations correct.",
    "Duct work sealed and supported; smoke / fire damper locations documented.",
    "Thermostat installed and labeled per zone.",
  ],
  Carpentry: [
    "Framing members per plans; nail / fastener schedules visible.",
    "Bearing walls and connections at headers, posts, and footings.",
    "Wall sheathing and roof sheathing nailing pattern verified.",
    "Fire blocking and draft stops in place.",
    "Stairs, guards, and handrails per the adopted code.",
  ],
};

// dims: in { args: dimensionless } out: { trades: dimensionless }
// (Pure categorical per-trade inspection checklist lookup.)
export function computeInspectionChecklist() { return { trades: INSPECTION_CHECKLISTS }; }

export const inspectionChecklistExample = { inputs: {}, expected: { count: Object.keys(INSPECTION_CHECKLISTS).length } };

// --- Utility 117: Utility Locator and Emergency Contacts ---

export const EMERGENCY_CONTACTS = [
  { number: "811", purpose: "Call before you dig (US one-call utility locator).", note: "Mark all underground utilities at least two business days before any excavation. State call-before-you-dig laws govern." },
  { number: "1-800-222-1222", purpose: "Poison Control (US national hotline).", note: "Available 24 hours; routes to the nearest poison control center." },
  { number: "1-800-321-OSHA (6742)", purpose: "OSHA hotline for workplace safety incidents.", note: "Use to report imminent dangers and serious injuries; recordable injury rules govern." },
  { number: "911", purpose: "Emergency services dispatch (US).", note: "Use for active fires, injuries, and life-safety emergencies." },
  { number: "1-800-424-8802", purpose: "National Response Center (chemical and oil spills).", note: "Federal reporting center for hazardous-substance releases." },
];

// dims: in { args: dimensionless } out: { contacts: dimensionless }
// (Pure categorical universal-emergency-number reference.)
export function computeEmergencyContacts() { return { contacts: EMERGENCY_CONTACTS }; }

export const emergencyContactsExample = { inputs: {}, expected: { count: EMERGENCY_CONTACTS.length } };

// --- Utility 118: Tool Maintenance Intervals ---

export const TOOL_MAINTENANCE = [
  { tool: "Circular saw", interval: "Per use", action: "Check blade for cracks; remove pitch buildup; verify guard returns; replace blade per teeth condition." },
  { tool: "Cordless drill / driver", interval: "Monthly", action: "Inspect chuck for runout; clean vents; rotate batteries to keep cells balanced." },
  { tool: "Hand plane", interval: "Per project", action: "Sharpen iron at 25 to 30 degrees; flatten back; lap sole if it has rocked." },
  { tool: "Pipe wrench", interval: "Quarterly", action: "Clean teeth; oil pivot; check jaw alignment and hook spring." },
  { tool: "Generator", interval: "50 hr or annually", action: "Change oil; replace air and fuel filters; clean spark plug; load test." },
  { tool: "Compressor", interval: "Quarterly", action: "Drain tank; check belt tension; clean intake; verify safety valve." },
  { tool: "Refrigerant gauges", interval: "Annually", action: "Calibrate; replace hoses if cracked; check schraders." },
  { tool: "Multimeter / clamp meter", interval: "Annually", action: "Verify against a known reference; replace fuses; inspect leads." },
];

// dims: in { args: dimensionless } out: { tools: dimensionless }
// (Pure categorical tool-maintenance interval reference.)
export function computeToolMaintenance() { return { tools: TOOL_MAINTENANCE }; }

export const toolMaintenanceExample = { inputs: {}, expected: { count: TOOL_MAINTENANCE.length } };

// --- Renderers ---

function renderSystemList(outputRegion, systems) {
  for (const sys of systems) {
    const h2 = document.createElement("h2");
    h2.textContent = sys.system;
    outputRegion.appendChild(h2);
    const dl = document.createElement("dl");
    for (const e of sys.entries) {
      const dt = document.createElement("dt");
      dt.textContent = e.item;
      dl.appendChild(dt);
      const dd = document.createElement("dd");
      dd.textContent = e.color;
      dl.appendChild(dd);
    }
    outputRegion.appendChild(dl);
  }
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer for the color-codes reference; HTMLElement
//  references are categorical from the dimensional-analysis
//  perspective. Returns void via a `dom_side_effect` sentinel.)
export function renderColorCodes(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Original plain-English summary of widely-used color conventions across NEC, IEC, gas piping, and ASME A13.1. Code documents referenced by name only.";
  renderSystemList(outputRegion, COLOR_CODES);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer for the knot reference; all categorical.)
export function renderKnotReference(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Original plain-English summary of common rigging and rescue knots with typical strength reductions cited from National Fire Academy / public training material.";
  const dl = document.createElement("dl");
  for (const k of KNOT_REFERENCE) {
    const dt = document.createElement("dt");
    dt.textContent = k.knot;
    dl.appendChild(dt);
    const dd = document.createElement("dd");
    const p1 = document.createElement("p"); p1.textContent = "Use: " + k.use; dd.appendChild(p1);
    const p2 = document.createElement("p"); p2.textContent = "Strength reduction: " + k.strength_reduction; dd.appendChild(p2);
    const p3 = document.createElement("p"); p3.textContent = k.note; dd.appendChild(p3);
    dl.appendChild(dd);
  }
  outputRegion.appendChild(dl);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer for the inspection checklist; all categorical.)
export function renderInspectionChecklist(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Original plain-English checklists for rough-in and final inspections, organized by trade. AHJ governs.";
  for (const [trade, items] of Object.entries(INSPECTION_CHECKLISTS)) {
    const h2 = document.createElement("h2");
    h2.textContent = trade;
    outputRegion.appendChild(h2);
    const ul = document.createElement("ul");
    for (const item of items) {
      const li = document.createElement("li");
      li.textContent = item;
      ul.appendChild(li);
    }
    outputRegion.appendChild(ul);
  }
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer for the emergency-contacts reference.)
export function renderEmergencyContacts(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Universal U.S. emergency and locator numbers. No commercial directories.";
  const dl = document.createElement("dl");
  for (const c of EMERGENCY_CONTACTS) {
    const dt = document.createElement("dt");
    dt.textContent = c.number + " - " + c.purpose;
    dl.appendChild(dt);
    const dd = document.createElement("dd");
    dd.textContent = c.note;
    dl.appendChild(dd);
  }
  outputRegion.appendChild(dl);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer for the tool-maintenance reference.)
export function renderToolMaintenance(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Original plain-English maintenance schedule for common trades tools. Manufacturer documentation governs for specific tools.";
  const dl = document.createElement("dl");
  for (const t of TOOL_MAINTENANCE) {
    const dt = document.createElement("dt");
    dt.textContent = t.tool + " (" + t.interval + ")";
    dl.appendChild(dt);
    const dd = document.createElement("dd");
    dd.textContent = t.action;
    dl.appendChild(dd);
  }
  outputRegion.appendChild(dl);
}

// =====================================================================
// v3 utilities (174 through 179). See spec-v3.md section 2.8.
// Original plain-English summaries by the project author.
// =====================================================================

// --- Utility 174: Hand Signal Reference ---

export const HAND_SIGNALS = [
  { domain: "Crane", signal: "Hoist", description: "One arm extended vertically with a small circular motion of the index finger." },
  { domain: "Crane", signal: "Lower", description: "One arm extended downward with the index finger pointing down, moved in a small circle." },
  { domain: "Crane", signal: "Stop", description: "One arm extended horizontally, palm down, swept across the body." },
  { domain: "Crane", signal: "Emergency stop", description: "Both arms extended horizontally, palms down, swept rapidly back and forth." },
  { domain: "Excavator", signal: "Slow / inch", description: "One hand held flat near the shoulder, opposite hand making a slow tapping motion above it." },
  { domain: "Excavator", signal: "All stop", description: "Both arms crossed sharply at the wrists in front of the body." },
  { domain: "Flagger", signal: "Stop", description: "Stop paddle held vertically with the STOP face toward the driver; free hand raised palm out." },
  { domain: "Flagger", signal: "Slow", description: "Slow paddle held vertically; free hand making a downward sweep along the side of the body." },
  { domain: "Aircraft marshalling", signal: "Stop", description: "Both arms crossed above the head, fists closed." },
  { domain: "Aircraft marshalling", signal: "Engine cut", description: "One hand drawn flat across the throat horizontally." },
];

// dims: in { args: dimensionless } out: { signals: dimensionless }
// (Pure categorical hand-signal reference.)
export function computeHandSignals() { return { signals: HAND_SIGNALS }; }
export const handSignalsExample = { inputs: {} };

// --- Utility 175: OSHA Top-10 Citations (most-recently published) ---

export const OSHA_TOP_10 = {
  publication: "OSHA Top 10 Most Frequently Cited Standards (most recent published year). Cited by agency publication; not reproduced.",
  items: [
    { rank: 1, standard: "29 CFR 1926.501", topic: "Fall protection - general requirements (construction)" },
    { rank: 2, standard: "29 CFR 1910.1200", topic: "Hazard communication" },
    { rank: 3, standard: "29 CFR 1926.1053", topic: "Ladders" },
    { rank: 4, standard: "29 CFR 1910.147", topic: "Lockout / tagout (control of hazardous energy)" },
    { rank: 5, standard: "29 CFR 1910.134", topic: "Respiratory protection" },
    { rank: 6, standard: "29 CFR 1926.451", topic: "Scaffolding - general requirements" },
    { rank: 7, standard: "29 CFR 1926.503", topic: "Fall protection - training" },
    { rank: 8, standard: "29 CFR 1910.178", topic: "Powered industrial trucks" },
    { rank: 9, standard: "29 CFR 1910.212", topic: "Machine guarding" },
    { rank: 10, standard: "29 CFR 1910.305", topic: "Electrical wiring methods" },
  ],
};

// dims: in { args: dimensionless } out: { publication: dimensionless, items: dimensionless }
// (Pure categorical OSHA Top-10 citations reference.)
export function computeOSHATop10() { return OSHA_TOP_10; }
export const oshaTop10Example = { inputs: {} };

// --- Utility 176: Lockout / Tagout Steps ---

export const LOTO_STEPS = [
  { step: 1, action: "Notify all affected employees that servicing or maintenance is starting and that the equipment will be locked out." },
  { step: 2, action: "Identify the type and magnitude of energy the equipment uses; understand the hazards (electrical, hydraulic, pneumatic, mechanical, thermal, gravitational, chemical)." },
  { step: 3, action: "Shut the equipment down using the normal stopping procedure." },
  { step: 4, action: "Isolate the equipment from its energy source by operating the energy-isolating device (disconnect, valve, breaker)." },
  { step: 5, action: "Apply a lockout / tagout device on every isolating device. Each authorized employee applies their own lock." },
  { step: 6, action: "Release or restrain stored energy (capacitors, springs, suspended loads, hydraulic accumulators)." },
  { step: 7, action: "Verify isolation: try to start the equipment using the normal operating controls. Then return controls to off." },
  { step: 8, action: "Service or maintain the equipment." },
  { step: 9, action: "Reverse: remove tools, clear personnel, remove locks (each owner removes their own), and restore energy." },
];

// dims: in { args: dimensionless } out: { steps: dimensionless, citation: dimensionless }
// (Pure categorical 29 CFR 1910.147 LOTO step reference.)
export function computeLOTO() { return { steps: LOTO_STEPS, citation: "29 CFR 1910.147 by section number only." }; }
export const lotoExample = { inputs: {} };

// --- Utility 177: Defensible Space Reference ---

export const DEFENSIBLE_SPACE = [
  { zone: "Zone 0 (0-5 ft from structure)", purpose: "Ember-resistant zone.", actions: "No combustible mulch, no wooden fences directly attached, no firewood, no plants except low-growing irrigated groundcover." },
  { zone: "Zone 1 (5-30 ft)", purpose: "Lean, clean, and green.", actions: "Mow grass; remove dead vegetation; space shrubs and trees; trim limbs 6 ft above ground; keep wood piles outside this zone." },
  { zone: "Zone 2 (30-100 ft)", purpose: "Reduced fuel zone.", actions: "Thin trees so canopies do not touch; remove ladder fuels; mow tall grass; keep horizontal spacing between shrub clusters." },
];

// dims: in { args: dimensionless } out: { zones: dimensionless, citation: dimensionless }
// (Pure categorical CALFIRE / NFPA defensible-space zone reference.)
export function computeDefensibleSpace() { return { zones: DEFENSIBLE_SPACE, citation: "CALFIRE / NFPA published guidance by name only." }; }
export const defensibleSpaceExample = { inputs: {} };

// --- Utility 178: Storm Shelter Spec Reference ---

export const STORM_SHELTER = [
  { topic: "Wind design", note: "FEMA P-320 wind speed for residential safe rooms; design event is the worst-case tornado / hurricane wind speed for the region." },
  { topic: "Occupant area", note: "FEMA P-320 published per-occupant area benchmarks for sitting and standing capacity." },
  { topic: "Anchorage", note: "Tie-down to foundation must resist uplift, sliding, and overturning per the published wind load calculation." },
  { topic: "Door and locks", note: "Door system must be tested to the FEMA P-320 missile-impact protocol." },
  { topic: "Ventilation", note: "Provide passive ventilation that resists pressure changes during a tornado or hurricane event." },
];

// dims: in { args: dimensionless } out: { topics: dimensionless, citation: dimensionless }
// (Pure categorical FEMA P-320 storm-shelter spec reference.)
export function computeStormShelter() { return { topics: STORM_SHELTER, citation: "FEMA P-320 by name only. No reproduction of figures or text." }; }
export const stormShelterExample = { inputs: {} };

// --- Utility 179: Field First Aid Triage Quick-Read ---

export const TRIAGE_CATEGORIES = [
  { category: "Immediate (red)", criteria: "Life-threatening injury that needs prompt intervention but the patient is salvageable. Examples: airway compromise, severe bleeding controllable in the field." },
  { category: "Delayed (yellow)", criteria: "Serious but not immediately life-threatening; can wait for transport." },
  { category: "Minor (green)", criteria: "Walking wounded; minor injuries; can self-evacuate." },
  { category: "Expectant / deceased (black)", criteria: "Injuries incompatible with life given current resources, or deceased." },
];

// dims: in { args: dimensionless } out: { categories: dimensionless, notice: dimensionless, citation: dimensionless }
// (Pure categorical START triage-category reference.)
export function computeTriage() {
  return {
    categories: TRIAGE_CATEGORIES,
    notice: "This is not medical advice. Call 911. See sophiewell.com for field-medicine reference.",
    citation: "START triage categories by name only. Original plain-English summary.",
  };
}
export const triageExample = { inputs: {} };

// --- v3 renderers ---

function renderHandSignals(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Original plain-English summary of crane, excavator, flagger, and aircraft marshalling signals; agencies referenced by name only. No image reproduction.";
  let lastDomain = null;
  for (const s of HAND_SIGNALS) {
    if (s.domain !== lastDomain) {
      const h2 = document.createElement("h2"); h2.textContent = s.domain; outputRegion.appendChild(h2);
      lastDomain = s.domain;
    }
    const dl = document.createElement("dl");
    const dt = document.createElement("dt"); dt.textContent = s.signal; dl.appendChild(dt);
    const dd = document.createElement("dd"); dd.textContent = s.description; dl.appendChild(dd);
    outputRegion.appendChild(dl);
  }
}

function renderOSHATop10(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: " + OSHA_TOP_10.publication;
  const dl = document.createElement("dl");
  for (const i of OSHA_TOP_10.items) {
    const dt = document.createElement("dt"); dt.textContent = "#" + i.rank + " - " + i.standard; dl.appendChild(dt);
    const dd = document.createElement("dd"); dd.textContent = i.topic; dl.appendChild(dd);
  }
  outputRegion.appendChild(dl);
}

function renderLOTO(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: 29 CFR 1910.147 by section number only. Original plain-English procedure summary. AHJ and employer LOTO procedure govern.";
  const ol = document.createElement("ol");
  for (const s of LOTO_STEPS) {
    const li = document.createElement("li");
    li.textContent = s.action;
    ol.appendChild(li);
  }
  outputRegion.appendChild(ol);
}

function renderDefensibleSpace(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: CALFIRE / NFPA published guidance by name only. Original plain-English zone-based summary.";
  const dl = document.createElement("dl");
  for (const z of DEFENSIBLE_SPACE) {
    const dt = document.createElement("dt"); dt.textContent = z.zone + " - " + z.purpose; dl.appendChild(dt);
    const dd = document.createElement("dd"); dd.textContent = z.actions; dl.appendChild(dd);
  }
  outputRegion.appendChild(dl);
}

function renderStormShelter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: FEMA P-320 by name only. No reproduction of figures or text.";
  const dl = document.createElement("dl");
  for (const t of STORM_SHELTER) {
    const dt = document.createElement("dt"); dt.textContent = t.topic; dl.appendChild(dt);
    const dd = document.createElement("dd"); dd.textContent = t.note; dl.appendChild(dd);
  }
  outputRegion.appendChild(dl);
}

function renderTriage(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: START triage categories by name only. Original plain-English summary.";
  // Hardened notice (utility 179 spec).
  const noteWrap = document.createElement("div");
  noteWrap.className = "inline-notice";
  noteWrap.textContent = "This is not medical advice. Call 911. See sophiewell.com for field-medicine reference.";
  outputRegion.appendChild(noteWrap);
  const dl = document.createElement("dl");
  for (const c of TRIAGE_CATEGORIES) {
    const dt = document.createElement("dt"); dt.textContent = c.category; dl.appendChild(dt);
    const dd = document.createElement("dd"); dd.textContent = c.criteria; dl.appendChild(dd);
  }
  outputRegion.appendChild(dl);
}

// --- v5 Step 61: utilities 265-268 ---
//
// All content is original plain-English summary by the project author.
// Code documents (29 CFR 1904, IRS form numbers, GHS pictograms) are
// referenced by section / form number / pictogram name only.

// 265: IRS Form Quick-Read Index
// data/summaries/v5-references.json
export const IRS_FORM_INDEX = [
  { form: "1040", title: "U.S. Individual Income Tax Return", purpose: "The main personal income-tax return. Income, deductions, credits, total tax, and balance due / refund. Schedules 1-3 cover other income, additional credits, and other taxes." },
  { form: "Schedule C (1040)", title: "Profit or Loss From Business", purpose: "Sole proprietor or single-member LLC reports business income and expenses. The result flows to Form 1040 Schedule 1 and to Schedule SE." },
  { form: "Schedule SE (1040)", title: "Self-Employment Tax", purpose: "Computes Social Security and Medicare tax on self-employment net earnings. 92.35% adjustment, SS wage-base cap, Additional Medicare 0.9% above the threshold, deductible half." },
  { form: "Schedule E (1040)", title: "Supplemental Income and Loss", purpose: "Rental real estate, royalties, partnerships, S-corporations, estates, trusts, REMICs. Each category has its own part on the form." },
  { form: "Form 4562", title: "Depreciation and Amortization", purpose: "Section 179, bonus depreciation, MACRS, listed-property depreciation. Required when claiming depreciation in the placed-in-service year or for listed property." },
  { form: "Form 941", title: "Employer's Quarterly Federal Tax Return", purpose: "Employer reports federal income tax withheld and employee + employer FICA each quarter. Filed by the last day of the month after each quarter." },
  { form: "Form W-9", title: "Request for Taxpayer Identification Number and Certification", purpose: "U.S. payee gives a TIN to the payer so the payer can issue a 1099. No filing required; the payee returns it to the requester." },
  { form: "Form 1099-NEC", title: "Nonemployee Compensation", purpose: "Payer reports $600+ paid to a non-employee for services. Replaces the 1099-MISC box 7 path retired in 2020. Due Jan 31 to recipient and IRS." },
  { form: "Form 1099-K", title: "Payment Card and Third Party Network Transactions", purpose: "Third-party settlement organization (Venmo / PayPal / Stripe / Square) reports gross payments. The reporting threshold has shifted multiple times; verify the current-year threshold with the IRS." },
];

// dims: in { args: dimensionless } out: { forms: dimensionless }
// (Pure categorical IRS form quick-read index reference.)
export function computeIrsFormIndex() { return { forms: IRS_FORM_INDEX }; }
export const irsFormIndexExample = { inputs: {}, expected: { count: IRS_FORM_INDEX.length } };

// 266: State Sales Tax Nexus Quick-Read (post-Wayfair economic nexus).
// Per-state thresholds. Original plain-English summary; cite each state's
// own published nexus guidance by URL and verified-on date.
// data/legal/sales-tax-nexus.json
// Five "no sales tax" states (AK, DE, MT, NH, OR) are excluded; AK has
// local Alaska Remote Seller Sales Tax Commission rules that some
// localities follow.
export const SALES_TAX_NEXUS = {
  AL: { sales_threshold_usd: 250000, transactions_threshold: null, citation: "Ala. Admin. Code r. 810-6-2-.90.03 (Simplified Sellers Use Tax)", verified_on: "2025-01-15" },
  AK: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "Alaska Remote Seller Sales Tax Commission (locality-driven; no statewide tax)", verified_on: "2025-01-15" },
  AZ: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "Ariz. Rev. Stat. 42-5043 (TPT post-Wayfair)", verified_on: "2025-01-15" },
  AR: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "Ark. Code Ann. 26-52-111", verified_on: "2025-01-15" },
  CA: { sales_threshold_usd: 500000, transactions_threshold: null, citation: "Cal. Rev. & Tax. Code 6203(c); CDTFA guidance", verified_on: "2025-01-15" },
  CO: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "Colo. Rev. Stat. 39-26-102(3)(b) (HB19-1240)", verified_on: "2025-01-15" },
  CT: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "Conn. Gen. Stat. 12-407(a)(15)(A)(xi)", verified_on: "2025-01-15" },
  FL: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "Fla. Stat. 212.0596 (S.B. 50, eff. 2021)", verified_on: "2025-01-15" },
  GA: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "O.C.G.A. 48-8-2(8)(M.1)", verified_on: "2025-01-15" },
  HI: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "Haw. Rev. Stat. 237-2.5 (GET)", verified_on: "2025-01-15" },
  ID: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "Idaho Code 63-3611(2)", verified_on: "2025-01-15" },
  IL: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "35 ILCS 105/2", verified_on: "2025-01-15" },
  IN: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "Ind. Code 6-2.5-2-1(c)", verified_on: "2025-01-15" },
  IA: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "Iowa Code 423.14A", verified_on: "2025-01-15" },
  KS: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "Kan. Stat. Ann. 79-3702(h)(1)(F)", verified_on: "2025-01-15" },
  KY: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "Ky. Rev. Stat. 139.340(2)(g)", verified_on: "2025-01-15" },
  LA: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "La. Rev. Stat. 47:301(4)(m) (Remote Sellers Commission)", verified_on: "2025-01-15" },
  ME: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "Me. Rev. Stat. tit. 36 sec. 1754-B", verified_on: "2025-01-15" },
  MD: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "Md. Code Ann., Tax-Gen. 11-701(b)(2)(iii)", verified_on: "2025-01-15" },
  MA: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "Mass. Gen. Laws ch. 64H sec. 34", verified_on: "2025-01-15" },
  MI: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "Mich. Comp. Laws 205.52b (RAB 2018-16)", verified_on: "2025-01-15" },
  MN: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "Minn. Stat. 297A.66 subd. 4a", verified_on: "2025-01-15" },
  MS: { sales_threshold_usd: 250000, transactions_threshold: null, citation: "Miss. Code Ann. 27-65-9 (Notice 72-19-001)", verified_on: "2025-01-15" },
  MO: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "Mo. Rev. Stat. 144.605(2)(d) (SB 153, eff. 2023)", verified_on: "2025-01-15" },
  NE: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "Neb. Rev. Stat. 77-2701.13", verified_on: "2025-01-15" },
  NV: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "Nev. Admin. Code 372.030", verified_on: "2025-01-15" },
  NJ: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "N.J. Stat. Ann. 54:32B-3.5", verified_on: "2025-01-15" },
  NM: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "N.M. Stat. Ann. 7-9-3.3 (gross receipts)", verified_on: "2025-01-15" },
  NY: { sales_threshold_usd: 500000, transactions_threshold: 100,  citation: "N.Y. Tax Law 1101(b)(8)(iv); TSB-M-19(4)S", verified_on: "2025-01-15" },
  NC: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "N.C. Gen. Stat. 105-164.8(b)(9)", verified_on: "2025-01-15" },
  ND: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "N.D. Cent. Code 57-39.2-02.2", verified_on: "2025-01-15" },
  OH: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "Ohio Rev. Code 5741.01(I)", verified_on: "2025-01-15" },
  OK: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "Okla. Stat. tit. 68 sec. 1392", verified_on: "2025-01-15" },
  PA: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "61 Pa. Code 56.18 (rev. 2019)", verified_on: "2025-01-15" },
  RI: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "R.I. Gen. Laws 44-18.2-3", verified_on: "2025-01-15" },
  SC: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "S.C. Code Ann. 12-36-1340 (Rev. Rul. 18-14)", verified_on: "2025-01-15" },
  SD: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "S.D. Codified Laws 10-64-2 (post-Wayfair home state; transaction threshold removed 2023)", verified_on: "2025-01-15" },
  TN: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "Tenn. Code Ann. 67-6-501(b)(1)", verified_on: "2025-01-15" },
  TX: { sales_threshold_usd: 500000, transactions_threshold: null, citation: "Tex. Tax Code 151.107(a)(8); Comptroller Rule 3.286", verified_on: "2025-01-15" },
  UT: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "Utah Code Ann. 59-12-107(2)(d)", verified_on: "2025-01-15" },
  VT: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "Vt. Stat. Ann. tit. 32 sec. 9701(9)(F)", verified_on: "2025-01-15" },
  VA: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "Va. Code Ann. 58.1-612.1", verified_on: "2025-01-15" },
  WA: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "Wash. Rev. Code 82.08.052", verified_on: "2025-01-15" },
  WV: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "W. Va. Code 11-15A-6b", verified_on: "2025-01-15" },
  WI: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "Wis. Stat. 77.51(13gm)", verified_on: "2025-01-15" },
  WY: { sales_threshold_usd: 100000, transactions_threshold: null, citation: "Wyo. Stat. Ann. 39-15-501 (transaction threshold removed 2024)", verified_on: "2025-01-15" },
  DC: { sales_threshold_usd: 100000, transactions_threshold: 200,  citation: "D.C. Code 47-2002.01(c)", verified_on: "2025-01-15" },
  // States with no general sales tax: DE, MT, NH, OR (no nexus threshold applies).
};

// dims: in { state: dimensionless }
//        out: { state: dimensionless, sales_threshold_usd: dimensionless, transactions_threshold: dimensionless, citation: dimensionless, verified_on: dimensionless }
// (Per-state economic-nexus shard lookup. Sales threshold is a
//  dimensionless dollar reference per the §7.1 monetary
//  convention; transaction-count threshold is a dimensionless
//  integer count; state / citation / date tokens are categorical.)
export function computeSalesTaxNexus({ state = "CA" } = {}) {
  const row = SALES_TAX_NEXUS[state];
  if (!row) return { error: "State " + state + " not bundled." };
  return { state, ...row };
}
export const salesTaxNexusExample = { inputs: { state: "CA" } };

// 267: OSHA Recordkeeping Quick-Read (29 CFR 1904).
export const OSHA_RECORDKEEPING = [
  { topic: "Who must keep records", note: "Employers with more than 10 employees in industries not classified as low-hazard must keep OSHA injury and illness records. 29 CFR 1904.1; 1904.2 lists exempt industries." },
  { topic: "Recordable injury / illness", note: "A work-related injury or illness involving death, days away from work, restricted work or transfer, medical treatment beyond first aid, loss of consciousness, or significant injury / illness diagnosed by a healthcare professional. 29 CFR 1904.7." },
  { topic: "Form 300", note: "Log of Work-Related Injuries and Illnesses. Kept at each establishment; includes the case description, dates, classification (DAFW, restricted, etc.). 29 CFR 1904.29." },
  { topic: "Form 300A", note: "Annual Summary of Work-Related Injuries and Illnesses. Posted in the workplace from February 1 through April 30 each year. 29 CFR 1904.32." },
  { topic: "Form 301", note: "Injury and Illness Incident Report. Completed for each recordable case within 7 calendar days. 29 CFR 1904.29(b)(3)." },
  { topic: "Retention", note: "Forms 300, 300A, and 301 retained for 5 years following the end of the calendar year the records cover. 29 CFR 1904.33." },
  { topic: "Severe injury reporting", note: "Fatality must be reported within 8 hours; in-patient hospitalization, amputation, or loss of an eye within 24 hours. 29 CFR 1904.39." },
];

// dims: in { args: dimensionless } out: { entries: dimensionless }
// (Pure categorical 29 CFR 1904 OSHA recordkeeping reference.)
export function computeOshaRecordkeeping() { return { entries: OSHA_RECORDKEEPING }; }
export const oshaRecordkeepingExample = { inputs: {}, expected: { count: OSHA_RECORDKEEPING.length } };

// 268: Public-Domain Lab Safety Quick-Read.
// GHS pictograms and signal words plus a one-paragraph spill decision tree.
export const GHS_PICTOGRAMS = [
  { name: "Health Hazard",            signal_word: "Danger / Warning", hazards: "Carcinogen, mutagenicity, reproductive toxicity, respiratory sensitizer, target organ toxicity, aspiration toxicity." },
  { name: "Flame",                    signal_word: "Danger / Warning", hazards: "Flammables, self-reactives, pyrophorics, self-heating, emits flammable gas, organic peroxides." },
  { name: "Exclamation Mark",         signal_word: "Warning",          hazards: "Irritant (skin / eye), skin sensitizer, acute toxicity (harmful), narcotic effects, respiratory tract irritant." },
  { name: "Gas Cylinder",             signal_word: "Warning",          hazards: "Gases under pressure (compressed, liquefied, refrigerated, dissolved)." },
  { name: "Corrosion",                signal_word: "Danger",           hazards: "Skin corrosion / burns, eye damage, corrosive to metals." },
  { name: "Exploding Bomb",           signal_word: "Danger",           hazards: "Explosives, self-reactives, organic peroxides." },
  { name: "Flame Over Circle",        signal_word: "Danger",           hazards: "Oxidizers." },
  { name: "Skull and Crossbones",     signal_word: "Danger",           hazards: "Acute toxicity (fatal or toxic)." },
  { name: "Environment (non-mandatory in US)", signal_word: "Warning", hazards: "Hazardous to aquatic environment." },
];

export const SPILL_DECISION_TREE = [
  { step: "Assess", actions: "Stop. Identify the chemical from the SDS. Note quantity, location, ventilation, and people in the area. If unknown agent or quantity exceeds your spill-kit capacity, stop here and call EH&S or 911." },
  { step: "Evacuate", actions: "Alert nearby workers. Restrict access to the spill area. Move uphill / upwind if outdoors; close doors if indoors. Account for everyone in the work area." },
  { step: "Contain", actions: "Within your training and PPE: control the source, dike with absorbent, prevent migration to drains. Use the appropriate spill-kit (acid, base, solvent, mercury) for the agent." },
  { step: "Report", actions: "Document the spill. Notify supervisor and EH&S. Reportable-quantity spills (CERCLA / SARA Title III, state lists) trigger external notification within statutory windows." },
];

// dims: in { args: dimensionless } out: { pictograms: dimensionless, decision_tree: dimensionless }
// (Pure categorical GHS-pictogram and spill-response reference.)
export function computeLabSafety() { return { pictograms: GHS_PICTOGRAMS, decision_tree: SPILL_DECISION_TREE }; }
export const labSafetyExample = { inputs: {}, expected: { picto_count: GHS_PICTOGRAMS.length, tree_steps: SPILL_DECISION_TREE.length } };

// --- v5 Renderers ---

function renderIrsFormIndex(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IRS forms cited by number and published title only. No reproduction of form instructions. See irs.gov for the current edition of each form.";
  const dl = document.createElement("dl");
  for (const f of IRS_FORM_INDEX) {
    const dt = document.createElement("dt"); dt.textContent = f.form + " - " + f.title; dl.appendChild(dt);
    const dd = document.createElement("dd"); dd.textContent = f.purpose; dl.appendChild(dd);
  }
  outputRegion.appendChild(dl);
}

function renderSalesTaxNexus(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per-state department of revenue published nexus guidance. Verified-on date stamped per entry.";
  const intro = document.createElement("p");
  intro.textContent = "Post-Wayfair economic-nexus thresholds. A remote seller crossing the bundled state's sales (or transaction) threshold in the prior or current calendar year generally must register, collect, and remit sales tax in that state. Verify the current threshold with the state department of revenue before relying on this for filing.";
  outputRegion.appendChild(intro);
  const sel = makeSelect("State", "stn-s", Object.keys(SALES_TAX_NEXUS).map((k) => ({ value: k, label: k })));
  inputRegion.appendChild(sel.wrap);
  const out = document.createElement("dl"); outputRegion.appendChild(out);
  function refresh() {
    while (out.firstChild) out.removeChild(out.firstChild);
    const r = computeSalesTaxNexus({ state: sel.select.value });
    if (r.error) { const dt = document.createElement("dt"); dt.textContent = r.error; out.appendChild(dt); return; }
    const rows = [
      ["Sales threshold", "$" + r.sales_threshold_usd.toLocaleString()],
      ["Transactions threshold", r.transactions_threshold == null ? "(none / sales only)" : String(r.transactions_threshold)],
      ["Citation", r.citation],
      ["Verified on", r.verified_on],
    ];
    for (const [k, v] of rows) {
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = v;
      out.appendChild(dt); out.appendChild(dd);
    }
  }
  sel.select.addEventListener("input", refresh);
  refresh();
}

function renderOshaRecordkeeping(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: 29 CFR 1904 by section number only. Original plain-English summary.";
  const dl = document.createElement("dl");
  for (const e of OSHA_RECORDKEEPING) {
    const dt = document.createElement("dt"); dt.textContent = e.topic; dl.appendChild(dt);
    const dd = document.createElement("dd"); dd.textContent = e.note; dl.appendChild(dd);
  }
  outputRegion.appendChild(dl);
}

function renderLabSafety(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: GHS pictograms (UN GHS Rev. 9). OSHA Hazard Communication 29 CFR 1910.1200 by section number only. Original plain-English summaries.";
  // Hardened safety notice per spec-v5.md Step 61.
  const note = document.createElement("div");
  note.className = "inline-notice";
  note.setAttribute("role", "note");
  note.textContent = "If a chemical spill exceeds your lab's spill-kit capacity or involves an unknown agent, stop, evacuate, and call your environmental health and safety office or 911.";
  outputRegion.appendChild(note);
  const h = document.createElement("h2"); h.textContent = "GHS pictograms"; outputRegion.appendChild(h);
  const dl = document.createElement("dl");
  for (const p of GHS_PICTOGRAMS) {
    const dt = document.createElement("dt"); dt.textContent = p.name + " (" + p.signal_word + ")"; dl.appendChild(dt);
    const dd = document.createElement("dd"); dd.textContent = p.hazards; dl.appendChild(dd);
  }
  outputRegion.appendChild(dl);
  const h2 = document.createElement("h2"); h2.textContent = "Spill response decision tree"; outputRegion.appendChild(h2);
  const ol = document.createElement("ol");
  for (const s of SPILL_DECISION_TREE) {
    const li = document.createElement("li");
    const strong = document.createElement("strong"); strong.textContent = s.step + ": ";
    li.appendChild(strong);
    li.appendChild(document.createTextNode(s.actions));
    ol.appendChild(li);
  }
  outputRegion.appendChild(ol);
}

// =====================================================================
// spec-v177 - Group A: NEC Table 300.5 minimum cover-depth reference.
// =====================================================================

// Minimum cover (in) by wiring method (rows) and location (cols), the
// <= 1000 V columns of NEC Table 300.5. "Cover" is measured to the top of
// the raceway/cable. Table footnotes modify specific cells; the AHJ governs.
const _BURIAL_METHODS = [
  "direct burial cable/conductors",
  "RMC or IMC",
  "nonmetallic raceway (PVC etc.)",
  "residential 120V/20A GFCI branch",
  "low-voltage <=30V (irrigation/landscape)",
];
const _BURIAL_LOCATIONS = [
  "general earth",
  "under a building",
  "under 4in concrete in trench",
  "under streets/roads/driveways(public)",
  "one/two-family driveway/parking",
];
// [direct, RMC/IMC, PVC, residential-GFCI, low-voltage] cover in inches.
const _BURIAL_COVER = {
  "general earth": [24, 6, 18, 12, 6],
  "under a building": [0, 0, 0, 0, 0],
  "under 4in concrete in trench": [18, 4, 4, 6, 6],
  "under streets/roads/driveways(public)": [24, 24, 24, 24, 24],
  "one/two-family driveway/parking": [18, 18, 18, 12, 18],
};

// dims: in { wiring_method: dimensionless, location: dimensionless } out: { min_cover_in: L }
export function computeBurialDepth3005({ wiring_method = "direct burial cable/conductors", location = "general earth" } = {}) {
  const mi = _BURIAL_METHODS.indexOf(wiring_method);
  if (mi < 0) return { error: "Wiring method not recognized." };
  const row = _BURIAL_COVER[location];
  if (!row) return { error: "Location not recognized." };
  const min_cover_in = row[mi];
  return {
    min_cover_in,
    wiring_method,
    location,
    note: "NEC Table 300.5 (0-1000 V): cover is measured to the top of the raceway or cable. Under a building, wiring in a raceway is permitted at 0 in cover. The table footnotes (raceways under buildings, in/under concrete, supplemental protection for the residential GFCI branch) modify specific cells; the AHJ governs.",
  };
}
export const burialDepth3005Example = { inputs: { wiring_method: "nonmetallic raceway (PVC etc.)", location: "general earth" } };

function renderBurialDepth3005(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 Table 300.5 (minimum cover requirements, 0 to 1000 volts), by name. Cover is measured to the top of the raceway/cable; the footnotes modify specific cells. The AHJ governs. Free at nfpa.org/freeaccess.";
  const method = makeSelect("Wiring method", "bd-method", _BURIAL_METHODS.map((m) => ({ value: m, label: m })));
  const loc = makeSelect("Location", "bd-loc", _BURIAL_LOCATIONS.map((l) => ({ value: l, label: l })));
  for (const f of [method, loc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { method.select.value = "nonmetallic raceway (PVC etc.)"; loc.select.value = "general earth"; refresh(); });
  const oCover = makeOutputLine(outputRegion, "Minimum cover", "bd-out-cover");
  const oNote = makeOutputLine(outputRegion, "Note", "bd-out-note");
  function refresh() {
    const r = computeBurialDepth3005({ wiring_method: method.select.value, location: loc.select.value });
    if (r.error) { oCover.textContent = r.error; oNote.textContent = ""; return; }
    oCover.textContent = fmt(r.min_cover_in, 0) + " in";
    oNote.textContent = r.note;
  }
  method.select.addEventListener("change", refresh);
  loc.select.addEventListener("change", refresh);
  refresh();
}

// =====================================================================
// spec-v178 - Group A: NEC Chapter 3 raceway/cable support-spacing reference.
// =====================================================================

// Per-method securing rule: box-proximity distance (in) and the maximum
// support interval (ft). RMC and PVC intervals vary by trade size; the
// returned interval is computed from the trade size when given.
const _SUPPORT_METHODS = ["EMT", "RMC/IMC", "PVC (rigid nonmetallic)", "NM cable (Romex)", "MC cable", "AC cable (BX)"];
// RMC Table 344.30(B)(2): max support interval (ft) by trade size (in).
function _rmcInterval(size) {
  if (size <= 0) return 10;            // conservative default when size unknown
  if (size <= 0.75) return 10;
  if (size <= 1) return 12;
  if (size <= 1.5) return 14;
  if (size <= 2.5) return 16;
  return 20;                            // 3 in and larger
}
// PVC Table 352.30: max support interval (ft) by trade size (in).
function _pvcInterval(size) {
  if (size <= 0) return 3;             // conservative default when size unknown
  if (size <= 1) return 3;
  if (size <= 2) return 5;
  if (size <= 3) return 6;
  if (size <= 5) return 7;
  return 8;                            // 6 in and larger
}

// dims: in { wiring_method: dimensionless, trade_size_in: L } out: { secure_within_in: L, max_interval_ft: L }
export function computeSupportSpacing({ wiring_method = "EMT", trade_size_in = 0 } = {}) {
  if (!_SUPPORT_METHODS.includes(wiring_method)) return { error: "Wiring method not recognized." };
  const size = Number(trade_size_in) || 0;
  let secure_within_in, max_interval_ft, size_dependent = false, code;
  switch (wiring_method) {
    case "EMT": secure_within_in = 36; max_interval_ft = 10; code = "358.30"; break;
    case "RMC/IMC": secure_within_in = 36; max_interval_ft = _rmcInterval(size); size_dependent = true; code = "344.30"; break;
    case "PVC (rigid nonmetallic)": secure_within_in = 36; max_interval_ft = _pvcInterval(size); size_dependent = true; code = "352.30"; break;
    case "NM cable (Romex)": secure_within_in = 12; max_interval_ft = 4.5; code = "334.30"; break;
    case "MC cable": secure_within_in = 12; max_interval_ft = 6; code = "330.30"; break;
    case "AC cable (BX)": secure_within_in = 12; max_interval_ft = 4.5; code = "320.30"; break;
  }
  return {
    secure_within_in,
    max_interval_ft,
    size_dependent,
    code,
    note: "NEC " + code + ": secure within " + secure_within_in + " in of each box/fitting and support at least every " + max_interval_ft + " ft." + (size_dependent ? " RMC and PVC intervals vary with trade size (larger conduit spans farther; the size-specific tables govern)." : "") + " Some methods have securing exceptions (EMT/NM fishing in finished walls, MC at terminations). The AHJ governs.",
  };
}
export const supportSpacingExample = { inputs: { wiring_method: "EMT", trade_size_in: 0 } };

function renderSupportSpacing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 Chapter 3 securing-and-supporting sections (320.30, 330.30, 334.30, 344.30, 352.30, 358.30), by name. RMC/PVC maximum intervals vary with trade size (the size-specific tables govern). The AHJ governs. Free at nfpa.org/freeaccess.";
  const method = makeSelect("Wiring method", "ss-method", _SUPPORT_METHODS.map((m) => ({ value: m, label: m })));
  const size = makeNumber("Trade size (in, for RMC/PVC)", "ss-size", { step: "any", min: "0" });
  for (const f of [method, size]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { method.select.value = "EMT"; size.input.value = ""; refresh(); });
  const oSecure = makeOutputLine(outputRegion, "Secure within (of each box)", "ss-out-secure");
  const oInterval = makeOutputLine(outputRegion, "Maximum support interval", "ss-out-interval");
  const oNote = makeOutputLine(outputRegion, "Note", "ss-out-note");
  function refresh() {
    const r = computeSupportSpacing({ wiring_method: method.select.value, trade_size_in: Number(size.input.value) || 0 });
    if (r.error) { oSecure.textContent = r.error; oInterval.textContent = ""; oNote.textContent = ""; return; }
    oSecure.textContent = fmt(r.secure_within_in, 0) + " in";
    oInterval.textContent = fmt(r.max_interval_ft, 1) + " ft" + (r.size_dependent ? " (at this trade size)" : "");
    oNote.textContent = r.note;
  }
  method.select.addEventListener("change", refresh);
  size.input.addEventListener("input", refresh);
  refresh();
}

export const REFERENCE_RENDERERS = {
  "color-codes": renderColorCodes,
  "knot-reference": renderKnotReference,
  "inspection-checklist": renderInspectionChecklist,
  "emergency-contacts": renderEmergencyContacts,
  "tool-maintenance": renderToolMaintenance,
  // v3
  "hand-signals": renderHandSignals,
  "osha-top10": renderOSHATop10,
  "loto-steps": renderLOTO,
  "defensible-space": renderDefensibleSpace,
  "storm-shelter": renderStormShelter,
  "triage-quickread": renderTriage,
  // v5
  "irs-form-index": renderIrsFormIndex,
  "sales-tax-nexus": renderSalesTaxNexus,
  "osha-recordkeeping": renderOshaRecordkeeping,
  "lab-safety-quickread": renderLabSafety,
  // spec-v177/v178 electrician reference lookups
  "burial-depth-300-5": renderBurialDepth3005,
  "support-spacing": renderSupportSpacing,
};
