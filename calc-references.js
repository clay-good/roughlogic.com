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

export const REFERENCE_RENDERERS = {
  "color-codes": renderColorCodes,
  "knot-reference": renderKnotReference,
  "inspection-checklist": renderInspectionChecklist,
  "emergency-contacts": renderEmergencyContacts,
  "tool-maintenance": renderToolMaintenance,
};
