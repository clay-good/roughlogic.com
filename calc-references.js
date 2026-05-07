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

export function renderColorCodes(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Original plain-English summary of widely-used color conventions across NEC, IEC, gas piping, and ASME A13.1. Code documents referenced by name only.";
  renderSystemList(outputRegion, COLOR_CODES);
}

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

export function computeLOTO() { return { steps: LOTO_STEPS, citation: "29 CFR 1910.147 by section number only." }; }
export const lotoExample = { inputs: {} };

// --- Utility 177: Defensible Space Reference ---

export const DEFENSIBLE_SPACE = [
  { zone: "Zone 0 (0-5 ft from structure)", purpose: "Ember-resistant zone.", actions: "No combustible mulch, no wooden fences directly attached, no firewood, no plants except low-growing irrigated groundcover." },
  { zone: "Zone 1 (5-30 ft)", purpose: "Lean, clean, and green.", actions: "Mow grass; remove dead vegetation; space shrubs and trees; trim limbs 6 ft above ground; keep wood piles outside this zone." },
  { zone: "Zone 2 (30-100 ft)", purpose: "Reduced fuel zone.", actions: "Thin trees so canopies do not touch; remove ladder fuels; mow tall grass; keep horizontal spacing between shrub clusters." },
];

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

export function computeStormShelter() { return { topics: STORM_SHELTER, citation: "FEMA P-320 by name only. No reproduction of figures or text." }; }
export const stormShelterExample = { inputs: {} };

// --- Utility 179: Field First Aid Triage Quick-Read ---

export const TRIAGE_CATEGORIES = [
  { category: "Immediate (red)", criteria: "Life-threatening injury that needs prompt intervention but the patient is salvageable. Examples: airway compromise, severe bleeding controllable in the field." },
  { category: "Delayed (yellow)", criteria: "Serious but not immediately life-threatening; can wait for transport." },
  { category: "Minor (green)", criteria: "Walking wounded; minor injuries; can self-evacuate." },
  { category: "Expectant / deceased (black)", criteria: "Injuries incompatible with life given current resources, or deceased." },
];

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
};
