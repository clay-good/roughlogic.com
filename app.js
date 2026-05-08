// roughlogic application entry.
// Vanilla ES module. No dependencies. No innerHTML. No eval. No Function constructor.

// Calculator modules and their support libs are loaded on demand. Per
// spec section 11.1, the home view stays well under 100 KB by importing
// only what the home view needs (this module + integrity.js). Calculator
// renderers, hash-state, data-stamp, and pure-math come in dynamically
// when the user opens a tool.
import { verifyManifestIntegrity } from "./integrity.js";
import { parseHashRoute, toolMatches } from "./routing.js";

const RECENTS_CAP = 10;
function pushRecent(list, id) {
  const without = list.filter((x) => x !== id);
  without.unshift(id);
  return without.slice(0, RECENTS_CAP);
}

const TOOL_MODULES = (() => {
  const map = {};
  const declare = (path, exportName, ids) => { for (const id of ids) map[id] = { path, exportName }; };
  declare("./calc-electrical.js", "ELECTRICAL_RENDERERS", [
    "ohms-law", "wire-ampacity", "voltage-drop", "conduit-fill", "box-fill",
    "breaker-sizing", "motor-fla", "transformer-sizing", "three-phase",
    "copper-resistance", "egc-sizing",
    // v2
    "service-load", "generator-sizing", "pv-string-sizing", "battery-runtime",
    "voltage-imbalance", "gfci-afci-reference", "lighting-density",
    // v3
    "pulling-tension", "cable-bend-radius", "pf-correction", "phase-balance",
    "multi-load-vd", "lv-dc-drop", "poe-budget",
    // v7
    "transformer-kva-sizing", "short-circuit-pp", "generator-motor-starting",
    "service-load-standard",
    // v8
    "panel-rebalance",
  ]);
  declare("./calc-plumbing.js", "PLUMBING_RENDERERS", [
    "pipe-sizing", "friction-loss", "pipe-volume", "pump-sizing",
    "static-pressure-piping", "gas-pipe-sizing", "slope",
    "pressure-conversion", "backflow",
    // v2
    "water-hammer-arrestor", "recirc-pump-head", "septic-tank", "trap-arm",
    "pipe-expansion", "tankless-gpm", "gas-leak-rate",
    // v3
    "stormwater-rational", "manning-slope", "hydrostatic-test", "grease-trap",
    "glycol-mix", "expansion-tank", "backflow-loss",
    // v7
    "water-hammer-surge", "pump-operating-point", "septic-drainfield",
    "pipe-expansion-loop",
  ]);
  declare("./calc-hvac.js", "HVAC_RENDERERS", [
    "manual-j-cooling", "manual-j-heating", "duct-sizing",
    "static-pressure-hvac", "refrigerant-pt", "superheat-subcool",
    "seer-eer", "balance-point", "shr", "cfm-per-ton", "combustion-air",
    // v2
    "compare-refrigerants", "refrigerant-charge", "approach-delta-t",
    "outdoor-air-mix", "equivalent-length", "wet-bulb-psychrometer",
    "insulation-thickness", "evaporative-cooling",
    // v3
    "affinity-laws", "belt-pulley", "air-receiver", "geothermal-loop",
    "baseboard-output", "npsh-a",
    // v7
    "duct-friction-static", "refrigerant-charging", "cooling-tower",
    "insulation-heat-loss",
    // v8
    "duct-leakage",
  ]);
  declare("./calc-restoration.js", "RESTORATION_RENDERERS", [
    "psychrometric", "drying-goal", "dehumidifier", "air-movers",
    "water-classes", "drying-times", "mold", "ppe",
    // v2
    "standing-water", "nam-sizing", "hepa-filter-life", "thermal-delta-t",
    // v3
    "containment-air-balance", "chamber-turnover",
  ]);
  declare("./calc-construction.js", "CONSTRUCTION_RENDERERS", [
    "stairs", "roof-pitch", "rafter", "square-footage", "board-footage",
    "concrete", "rebar", "lumber-spans", "fastener-pullout",
    "beam-loading", "material-quantity",
    // v2
    "stair-stringer", "joist-deflection", "footing-area", "tile-count",
    "paint-coverage", "excavation", "masonry-count", "wind-pressure",
    "snow-load", "anchor-embedment",
    // v3
    "drywall", "roofing-squares", "asphalt-tonnage", "aggregate", "mortar-mix",
    "concrete-mix-design", "bolt-torque", "bend-allowance", "speeds-feeds",
    "weld-usage", "demo-debris", "formwork-pressure",
    // v7
    "stair-stringer-layout", "hip-valley-rafter", "rebar-schedule",
    "plywood-span", "helical-pile", "crane-lift-quick",
    // v8
    "residential-framing",
  ]);
  declare("./calc-fire.js", "FIRE_RENDERERS", [
    "fire-friction", "pdp", "hydrant-flow", "required-fire-flow",
    "master-stream", "aerial-ladder", "foam", "smoke-reading",
    // v2
    "reverse-lay-friction", "sprinkler-density", "standpipe-friction",
    "ladder-pipe-reach", "braking-distance",
    // v3
    "confined-space-purge", "rope-ma", "sling-angle",
    // v7
    "iso-nff",
  ]);
  declare("./calc-references.js", "REFERENCE_RENDERERS", [
    "color-codes", "knot-reference", "inspection-checklist",
    "emergency-contacts", "tool-maintenance",
    // v3
    "hand-signals", "osha-top10", "loto-steps", "defensible-space",
    "storm-shelter", "triage-quickread",
  ]);
  declare("./calc-cross.js", "CROSS_RENDERERS", [
    "unit-converter", "material-cost", "markup", "time-and-materials",
    "sales-tax", "tip-out",
    // v2
    "loan-payment", "upgrade-roi", "mileage-cost", "overtime", "per-diem",
    "geometry", "dilution", "slope-from-level", "haversine",
    // v3 (meta-utilities 170 and 172 are registered separately below; the rest live here)
    "trench-slope", "niosh-lifting", "heat-stress", "wind-chill", "ladder-angle",
    "pulley-ma-gen", "ramp-slope", "rainwater-yield", "timesheet", "vehicle-load",
    // v7
    "fall-protection-clearance",
  ]);
  // v3 meta-utilities. They roll up existing session state rather than
  // running their own compute. Lives in calc-meta.js so app.js does not
  // self-import.
  declare("./calc-meta.js", "META_RENDERERS", [
    "job-estimate-rollup",
    "material-order-list",
    "job-pack",
  ]);
  // v4 Group J: Trucking and Logistics.
  declare("./calc-trucking.js", "TRUCKING_RENDERERS", [
    "dim-weight", "freight-density", "pallet-loadout",
    "hos-math", "bridge-formula", "reefer-burn", "incoterm-decoder",
  ]);
  // v4 Group K: Mechanic - Auto, Marine, Aviation.
  declare("./calc-mechanic.js", "MECHANIC_RENDERERS", [
    "weight-balance", "prop-slip", "displacement-cr", "bolt-stretch",
    "driveshaft-crit", "fuel-range", "tire-gearing", "brake-pad-life",
  ]);
  // v4 Group L: Agriculture and Forestry.
  declare("./calc-agriculture.js", "AGRICULTURE_RENDERERS", [
    "gpa-rate", "timber-cruise", "seed-rate", "drawbar-power",
    "irrigation-uniformity", "bulk-density", "crop-yield",
  ]);
  // v4 Group M: Water and Wastewater Operations.
  declare("./calc-water.js", "WATER_RENDERERS", [
    "pounds-formula", "filter-loading", "detention-time",
    "lab-dilution", "pump-eff-w2w", "srt-fm-ratio",
    // v8
    "coagulant-dose",
  ]);
  // v4 Group N: Stage and Live Production.
  declare("./calc-stage.js", "STAGE_RENDERERS", [
    "truss-capacity", "time-alignment", "dmx-planner",
    "neutral-imbalance", "spl-distance", "rigging-check",
  ]);
  // v4 Group O: Kitchen and Food Service.
  declare("./calc-kitchen.js", "KITCHEN_RENDERERS", [
    "recipe-scale", "yield-ep", "cooling-curve",
    "plate-cost", "pan-conversion",
  ]);
  // v4 Group P: Field, Backcountry, and SAR.
  declare("./calc-field.js", "FIELD_RENDERERS", [
    "pacing-distance", "bearing-conversion", "slope-avalanche",
    "backcountry-needs", "utm-conversion", "solar-times",
  ]);
  // v4 Group Q: Historical Reference Data (utility 233).
  declare("./calc-historical.js", "HISTORICAL_RENDERERS", [
    "historical-pricing",
  ]);
  return map;
})();

const moduleCache = new Map();
async function loadRenderer(toolId) {
  const meta = TOOL_MODULES[toolId];
  if (!meta) return null;
  let promise = moduleCache.get(meta.path);
  if (!promise) {
    promise = import(meta.path);
    moduleCache.set(meta.path, promise);
  }
  const mod = await promise;
  const set = mod[meta.exportName];
  return set ? set[toolId] || null : null;
}

let supportLibsPromise = null;
function loadSupportLibs() {
  if (!supportLibsPromise) {
    supportLibsPromise = Promise.all([
      import("./hash-state.js"),
      import("./data-stamp.js"),
      import("./clipboard.js"),
      import("./ui-validity.js"),
    ]).then(([hs, ds, cb, uv]) => ({ ...hs, ...ds, ...cb, ...uv }));
  }
  return supportLibsPromise;
}

// Reference-style tools that should display "Source: <dataset>, version X,
// fetched Y." per spec section 11.7. First-principles calculators cite
// physics inline and are not listed here.
const TOOL_DATA_SOURCES = {
  "motor-fla": { folder: "electrical", shard: "motor-fla.json", label: "Motor full-load amps (manufacturer-attributed)" },
  "conduit-fill": { folder: "electrical", shard: "conduit-fill-tables.json", label: "Conductor cross-sectional areas" },
  "egc-sizing": { folder: "electrical", shard: "ampacity-physics.json", label: "EGC reference (impedance considerations)" },
  "pipe-sizing": { folder: "plumbing", shard: "fixture-units.json", label: "Hunter's Curve fixture units" },
  "gas-pipe-sizing": { folder: "plumbing", shard: "gas-pipe-capacity.json", label: "Gas pipe capacity (Spitzglass)" },
  "refrigerant-pt": { folder: "hvac", shard: "refrigerants.json", label: "Refrigerant P-T tables" },
  "superheat-subcool": { folder: "hvac", shard: "refrigerants.json", label: "Refrigerant P-T tables" },
  "manual-j-cooling": { folder: "hvac", shard: "climate-data.json", label: "NOAA climate design temperatures" },
  "manual-j-heating": { folder: "hvac", shard: "climate-data.json", label: "NOAA climate design temperatures" },
  "water-classes": { folder: "restoration", shard: "water-classes.json", label: "Water classes and categories (original summaries)" },
  "drying-times": { folder: "restoration", shard: "drying-times.json", label: "Material drying times (original notes)" },
  "mold": { folder: "restoration", shard: "mold-conditions.json", label: "Mold growth conditions" },
  "ppe": { folder: "restoration", shard: "water-classes.json", label: "PPE selection (OSHA / IICRC referenced)" },
  "lumber-spans": { folder: "construction", shard: "lumber-properties.json", label: "Lumber material properties" },
  "fastener-pullout": { folder: "construction", shard: "lumber-properties.json", label: "Wood specific gravity" },
  "fire-friction": { folder: "fire", shard: "hose-friction.json", label: "Fire hose friction (NFA)" },
  "required-fire-flow": { folder: "fire", shard: "fire-flow-formulas.json", label: "ISO needed-fire-flow formulas" },
  "sales-tax": { folder: "crosswalks", shard: "state-tax-rates.json", label: "State sales tax rates" },
  "unit-converter": { folder: "crosswalks", shard: "unit-conversions.json", label: "NIST SP 811 unit factors" },
  "backflow": { folder: "summaries", shard: "summaries.json", label: "Backflow scenarios (original summaries)" },
  "smoke-reading": { folder: "summaries", shard: "summaries.json", label: "Smoke reading reference (original summaries)" },
  // v2
  "gfci-afci-reference": { folder: "summaries", shard: "v2-references.json", label: "GFCI/AFCI requirements (original summaries; NEC by section only)" },
  "lighting-density": { folder: "electrical", shard: "lighting-density.json", label: "Lighting power density benchmarks" },
  "water-hammer-arrestor": { folder: "summaries", shard: "v2-references.json", label: "Water hammer arrestor sizing (PDI WH-201 method)" },
  "trap-arm": { folder: "summaries", shard: "v2-references.json", label: "Trap arm length (engineering practice)" },
  "gas-leak-rate": { folder: "plumbing", shard: "gas-pipe-capacity.json", label: "Gas properties for orifice leak estimation" },
  "compare-refrigerants": { folder: "hvac", shard: "refrigerants.json", label: "Refrigerant P-T tables (manufacturer-attributed)" },
  "refrigerant-charge": { folder: "hvac", shard: "charge-per-foot.json", label: "Refrigerant charge per foot (manufacturer-attributed)" },
  "equivalent-length": { folder: "hvac", shard: "equivalent-lengths.json", label: "Fitting equivalent lengths" },
  "insulation-thickness": { folder: "hvac", shard: "insulation.json", label: "Insulation conductivity references" },
  "thermal-delta-t": { folder: "summaries", shard: "v2-references.json", label: "Thermal imager delta-T reference (original summaries)" },
  "footing-area": { folder: "construction", shard: "soil-bearing.json", label: "Soil bearing capacities (USGS-derived)" },
  "wind-pressure": { folder: "construction", shard: "wind-snow-zones.json", label: "Wind / snow design data (NOAA / public ASCE 7 formula)" },
  "snow-load": { folder: "construction", shard: "wind-snow-zones.json", label: "Wind / snow design data (NOAA / public ASCE 7 formula)" },
  "mileage-cost": { folder: "crosswalks", shard: "irs-mileage.json", label: "IRS standard mileage rate" },
  "per-diem": { folder: "crosswalks", shard: "gsa-perdiem.json", label: "GSA per-diem rates" },
  "color-codes": { folder: "summaries", shard: "v2-references.json", label: "Color codes reference (original summaries)" },
  "knot-reference": { folder: "summaries", shard: "v2-references.json", label: "Knot reference (original summaries; NFA training)" },
  "inspection-checklist": { folder: "summaries", shard: "v2-references.json", label: "Inspection prep checklist (original summaries)" },
  "emergency-contacts": { folder: "summaries", shard: "v2-references.json", label: "Utility locator and emergency contacts (US)" },
  "tool-maintenance": { folder: "summaries", shard: "v2-references.json", label: "Tool maintenance intervals (original summaries)" },
  // v3
  "cable-bend-radius": { folder: "electrical", shard: "cable-bend-radius.json", label: "Cable bend radius (manufacturer-attributed)" },
  "poe-budget": { folder: "electrical", shard: "poe-classes.json", label: "PoE class budgets (IEEE 802.3, manufacturer cable resistance)" },
  "stormwater-rational": { folder: "plumbing", shard: "runoff-coefficients.json", label: "Runoff coefficients (public engineering practice)" },
  "manning-slope": { folder: "plumbing", shard: "manning-roughness.json", label: "Manning roughness coefficients" },
  "glycol-mix": { folder: "plumbing", shard: "glycol-curves.json", label: "Glycol freeze-point curves (manufacturer-attributed)" },
  "backflow-loss": { folder: "plumbing", shard: "backflow-curves.json", label: "Backflow preventer pressure-loss curves (manufacturer-attributed)" },
  "geothermal-loop": { folder: "hvac", shard: "geothermal-soil.json", label: "Geothermal loop BTU per linear foot (DOE technical reports)" },
  "baseboard-output": { folder: "hvac", shard: "baseboard-output.json", label: "Hydronic baseboard BTU/ft (manufacturer-attributed)" },
  "concrete-mix-design": { folder: "construction", shard: "aci-211-curves.json", label: "ACI 211 mix-design curve points (cited by name only)" },
  "bolt-torque": { folder: "construction", shard: "bolt-grades.json", label: "Bolt grade proof loads (ASTM/SAE benchmarks; cited by name only)" },
  "speeds-feeds": { folder: "construction", shard: "sfm-table.json", label: "SFM and chipload table (engineering practice)" },
  "weld-usage": { folder: "construction", shard: "aws-deposition.json", label: "AWS deposition efficiencies (cited by name only)" },
  "trench-slope": { folder: "crosswalks", shard: "osha-trench.json", label: "OSHA trench sloping (29 CFR 1926 Subpart P)" },
  "niosh-lifting": { folder: "crosswalks", shard: "niosh-coupling.json", label: "NIOSH 1991 Lifting Equation" },
  "heat-stress": { folder: "crosswalks", shard: "heat-cold-stress.json", label: "Heat / cold stress (NWS / OSHA)" },
  "wind-chill": { folder: "crosswalks", shard: "heat-cold-stress.json", label: "Heat / cold stress (NWS / OSHA)" },
  // v4 trucking
  "dim-weight": { folder: "trucking", shard: "dim-divisors.json", label: "Carrier DIM divisors (cited by carrier name only)" },
  "reefer-burn": { folder: "trucking", shard: "reefer-burn.json", label: "Reefer GPH benchmarks (manufacturer-attributed)" },
  // v3 references (data-driven from v3-references shard)
  "hand-signals": { folder: "summaries", shard: "v3-references.json", label: "Hand signal reference (original summaries)" },
  "osha-top10": { folder: "summaries", shard: "v3-references.json", label: "OSHA top-10 most-cited standards" },
  "loto-steps": { folder: "summaries", shard: "v3-references.json", label: "Lockout/tagout procedure (original summaries; 29 CFR 1910.147 by section)" },
  "defensible-space": { folder: "summaries", shard: "v3-references.json", label: "Defensible space reference (CALFIRE/NFPA by name only)" },
  "storm-shelter": { folder: "summaries", shard: "v3-references.json", label: "FEMA P-320 storm shelter reference (by name only)" },
  "triage-quickread": { folder: "summaries", shard: "v3-references.json", label: "Field first aid triage quick-read (original summaries)" },
  // v7 Group A extensions (utilities 234-237).
  "short-circuit-pp": { folder: "electrical", shard: "conductor-c-values.json", label: "Conductor C-values for the Bussmann point-to-point method" },
  "generator-motor-starting": { folder: "electrical", shard: "nema-mg1-code-letters.json", label: "NEMA MG-1 starting kVA per HP by code letter" },
  "service-load-standard": { folder: "electrical", shard: "dwelling-demand.json", label: "Dwelling demand-factor parameters (NEC 220.42 / 220.53 / 220.54 / 220.55)" },
  // v7 Group B extensions (utilities 238-241).
  "water-hammer-surge": { folder: "plumbing", shard: "pipe-elastic-properties.json", label: "Pipe elastic properties for the Joukowsky water-hammer formula" },
  "pump-operating-point": { folder: "plumbing", shard: "pump-curves.json", label: "Pump curves (manufacturer-attributed where redistributable)" },
  "pipe-expansion-loop": { folder: "plumbing", shard: "thermal-expansion-coefficients.json", label: "Pipe thermal-expansion coefficients and guided-cantilever stress allowables" },
  // v7 Group C extensions (utilities 242-245).
  "duct-friction-static": { folder: "hvac", shard: "duct-roughness.json", label: "Duct absolute roughness and fitting C_o values (ASHRAE Fundamentals duct-design)" },
  "refrigerant-charging": { folder: "hvac", shard: "refrigerant-pt-tables.json", label: "Manufacturer-attributed P-T tables (R-410A / R-32 / R-454B / R-22 / R-134a)" },
  "insulation-heat-loss": { folder: "hvac", shard: "insulation-k-values.json", label: "Insulation thermal conductivity (manufacturer-attributed)" },
  // v7 Group E extensions (utilities 246-251).
  "rebar-schedule": { folder: "construction", shard: "rebar-unit-weights.json", label: "Rebar unit weights and bar diameters (ACI/CRSI by name only)" },
  "plywood-span": { folder: "construction", shard: "apa-span-ratings.json", label: "APA span-rating tables (cited by APA name only)" },
  "helical-pile": { folder: "construction", shard: "helical-pile-kt.json", label: "Helical-pile Kt benchmarks (manufacturer-attributed)" },
  // v7 Group F + G extensions (utilities 252-253).
  "iso-nff": { folder: "fire", shard: "iso-nff.json", label: "ISO Public Protection Classification F factors and Oi multipliers" },
  "fall-protection-clearance": { folder: "crosswalks", shard: "fall-protection-benchmarks.json", label: "Connector free-fall and decel benchmarks (manufacturer-attributed)" },
  // v4 Group Q: historical pricing context. The runtime-loaded per-commodity
  // shard rewrites this label with the commodity-specific source line; the
  // manifest folder reference stamps the bundled-on date for the dataset as
  // a whole.
  "historical-pricing": { folder: "historical", shard: "manifest.json", label: "Historical commodity pricing (BLS PPI / EIA / USDA NASS / FRED)" },
};

const TRADES = ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire", "trucking", "mechanic", "agriculture", "water", "stage", "kitchen", "field", "reference"];
const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "O", "P", "Q"];

// Display names for each group used as section headers on the home page.
const GROUP_NAMES = {
  A: "Electrical",
  B: "Plumbing and Gas",
  C: "HVAC",
  D: "Water Damage and Mold Restoration",
  E: "Carpentry and Construction",
  F: "Fire-Ground Engineering",
  G: "Cross-Trade Utilities",
  H: "Knowledge References",
  J: "Trucking and Logistics",
  K: "Mechanic - Auto, Marine, Aviation",
  L: "Agriculture and Forestry",
  M: "Water and Wastewater Operations",
  N: "Stage and Live Production",
  O: "Kitchen and Food Service",
  P: "Field, Backcountry, and SAR",
  Q: "Historical Reference Data",
};

// Tool registry. Order matches spec.md section 12.
// Each entry: id (kebab-case route), name, group, trades, desc.
const TOOLS = [
  // Group A: Electrical
  { id: "ohms-law", name: "Ohm's Law", group: "A", trades: ["electrical"], desc: "Compute V, I, R, or P from any two known values." },
  { id: "wire-ampacity", name: "Wire Ampacity", group: "A", trades: ["electrical"], desc: "Ampacity by gauge, conductor material, insulation rating, ambient." },
  { id: "voltage-drop", name: "Voltage Drop", group: "A", trades: ["electrical"], desc: "Single-phase or three-phase voltage drop over length." },
  { id: "conduit-fill", name: "Conduit Fill", group: "A", trades: ["electrical"], desc: "Percent fill by conduit type and conductor count." },
  { id: "box-fill", name: "Box Fill", group: "A", trades: ["electrical"], desc: "Cubic-inch fill by box volume and conductor count." },
  { id: "breaker-sizing", name: "Breaker Sizing", group: "A", trades: ["electrical"], desc: "Continuous-load 125 percent rule." },
  { id: "motor-fla", name: "Motor Full Load Amps", group: "A", trades: ["electrical"], desc: "Typical FLA by horsepower, voltage, and phase." },
  { id: "transformer-sizing", name: "Transformer Sizing", group: "A", trades: ["electrical"], desc: "Required kVA from load and voltages." },
  { id: "three-phase", name: "Three-Phase Power", group: "A", trades: ["electrical"], desc: "kW, kVA, and kVAR from line values and power factor." },
  { id: "copper-resistance", name: "Conductor Resistance at Temperature", group: "A", trades: ["electrical"], desc: "Resistance of copper or aluminum at temperature." },
  { id: "egc-sizing", name: "Equipment Grounding Conductor Sizing", group: "A", trades: ["electrical"], desc: "Minimum EGC size from overcurrent device rating." },
  { id: "service-load", name: "Service Load Calculation (Residential)", group: "A", trades: ["electrical"], desc: "Standard demand factors over lighting, appliances, range, dryer, HVAC; output minimum service ampacity." },
  { id: "generator-sizing", name: "Generator Sizing", group: "A", trades: ["electrical"], desc: "Continuous and surge wattage from running totals and the largest motor's starting draw." },
  { id: "pv-string-sizing", name: "Solar PV String Sizing", group: "A", trades: ["electrical"], desc: "Cold-Voc max series and warm-Vmp min series for an inverter MPPT window." },
  { id: "battery-runtime", name: "Battery Runtime", group: "A", trades: ["electrical"], desc: "Hours of runtime from Ah, voltage, depth of discharge, and load (optional Peukert)." },
  { id: "voltage-imbalance", name: "Voltage Imbalance", group: "A", trades: ["electrical"], desc: "Three-phase percent imbalance and motor derate factor." },
  { id: "gfci-afci-reference", name: "GFCI / AFCI Requirements Reference", group: "A", trades: ["electrical"], desc: "Plain-English summary of GFCI and AFCI requirements by occupancy area." },
  { id: "lighting-density", name: "Lighting Power Density", group: "A", trades: ["electrical"], desc: "Target watts from area and occupancy class using public engineering benchmarks." },
  { id: "pulling-tension", name: "Conductor Pulling Tension", group: "A", trades: ["electrical"], desc: "Capstan-equation pulling tension and sidewall pressure across bends." },
  { id: "cable-bend-radius", name: "Cable Bend Radius Minimum", group: "A", trades: ["electrical"], desc: "Minimum inside bend radius as a multiple of cable OD per manufacturer bulletins." },
  { id: "pf-correction", name: "Power Factor Correction Capacitor", group: "A", trades: ["electrical"], desc: "Required kVAR and capacitance to raise existing PF to target." },
  { id: "phase-balance", name: "Phase Balance Across Panels", group: "A", trades: ["electrical"], desc: "Per-phase totals, imbalance percent, and a greedy swap list to rebalance." },
  { id: "multi-load-vd", name: "Branch Voltage Drop With Multiple Loads", group: "A", trades: ["electrical"], desc: "Cumulative voltage at each tap along a run with multiple loads." },
  { id: "lv-dc-drop", name: "Low-Voltage DC Drop", group: "A", trades: ["electrical"], desc: "DC voltage drop and percent at 12 / 24 / 48 V with application-tolerance flags." },
  { id: "poe-budget", name: "PoE Budget and Run Distance", group: "A", trades: ["electrical"], desc: "Power available at PD over Cat5e/6/6A given PoE class and run length." },
  // v7 Group A extensions (utilities 234-237).
  { id: "transformer-kva-sizing", name: "Transformer kVA Sizing and FLA", group: "A", trades: ["electrical"], desc: "Total connected kVA + ANSI/IEEE step-series recommendation + primary / secondary FLA." },
  { id: "short-circuit-pp", name: "Short-Circuit Current at Panel (Point-to-Point)", group: "A", trades: ["electrical"], desc: "I_sca at transformer secondary, M-factor, and let-through fault current via the Bussmann point-to-point method." },
  { id: "generator-motor-starting", name: "Generator Sizing for Motor Starting", group: "A", trades: ["electrical"], desc: "Required generator kW / kVA from running load and motor-starting kVA at the 30% voltage-dip criterion." },
  { id: "service-load-standard", name: "Service Entrance Demand Load (Standard Method)", group: "A", trades: ["electrical"], desc: "NEC Article 220 Standard Method demand-factor walk; recommended service ampacity from the standard ladder." },
  // v8 Phase E.1 (utility 254).
  { id: "panel-rebalance", name: "Panel Loading and Phase Rebalance", group: "A", trades: ["electrical"], desc: "Per-phase totals, percent imbalance, and a swap suggestion to minimize neutral current. Companion to voltage-imbalance." },

  // Group B: Plumbing and Gas
  { id: "pipe-sizing", name: "Pipe Sizing", group: "B", trades: ["plumbing"], desc: "Water supply by fixture units; drainage by DFU." },
  { id: "friction-loss", name: "Friction Loss", group: "B", trades: ["plumbing"], desc: "Hazen-Williams for water; Darcy-Weisbach for gas." },
  { id: "pipe-volume", name: "Pipe Volume", group: "B", trades: ["plumbing"], desc: "Gallons per foot by diameter." },
  { id: "pump-sizing", name: "Pump Sizing", group: "B", trades: ["plumbing"], desc: "Required head and flow." },
  { id: "static-pressure-piping", name: "Static Pressure Loss in Piping", group: "B", trades: ["plumbing"], desc: "Static pressure loss along a pipe run." },
  { id: "gas-pipe-sizing", name: "Gas Pipe Sizing", group: "B", trades: ["plumbing"], desc: "BTU capacity by pipe size, length, gas type." },
  { id: "slope", name: "Drainage Slope", group: "B", trades: ["plumbing"], desc: "1/4 inch per foot rule and variants." },
  { id: "pressure-conversion", name: "Pressure Conversion", group: "B", trades: ["plumbing"], desc: "PSI, head feet, inches of water column, kPa, bar." },
  { id: "backflow", name: "Backflow Reference", group: "B", trades: ["plumbing"], desc: "Common backflow scenarios and preventer types." },
  { id: "water-hammer-arrestor", name: "Water Hammer Arrestor Sizing", group: "B", trades: ["plumbing"], desc: "PDI WH-201 designation from total fixture units." },
  { id: "recirc-pump-head", name: "Hot Water Recirc Pump Head", group: "B", trades: ["plumbing"], desc: "Pump head from pipe length, fittings, target flow." },
  { id: "septic-tank", name: "Septic Tank Sizing", group: "B", trades: ["plumbing"], desc: "Minimum tank gallons from bedrooms or daily flow." },
  { id: "trap-arm", name: "Trap Arm Length", group: "B", trades: ["plumbing"], desc: "Maximum trap arm length by pipe diameter and slope." },
  { id: "pipe-expansion", name: "Pipe Thermal Expansion", group: "B", trades: ["plumbing", "hvac"], desc: "Linear expansion (in) for copper, PEX, PVC, CPVC, steel." },
  { id: "tankless-gpm", name: "Tankless Water Heater GPM", group: "B", trades: ["plumbing"], desc: "Achievable flow from burner kBTU and inlet/outlet temperatures." },
  { id: "gas-leak-rate", name: "Gas Leak Rate (Orifice)", group: "B", trades: ["plumbing"], desc: "Estimated leak rate from orifice diameter and upstream pressure." },
  { id: "stormwater-rational", name: "Stormwater Rational Method", group: "B", trades: ["plumbing"], desc: "Q = C * i * A peak runoff in cfs and gpm with bundled C values." },
  { id: "manning-slope", name: "Manning's Equation Drainage Slope", group: "B", trades: ["plumbing"], desc: "Self-cleansing slope and slope to carry target flow at half-full." },
  { id: "hydrostatic-test", name: "Hydrostatic Test Pressure and Hold", group: "B", trades: ["plumbing"], desc: "Test pressure (1.5x water / 1.25x gas) and recommended hold time." },
  { id: "grease-trap", name: "Grease Trap Sizing", group: "B", trades: ["plumbing"], desc: "Volume from peak flow, retention, and loading factor; PDI G101 cited." },
  { id: "glycol-mix", name: "Glycol Freeze Protection Mix", group: "B", trades: ["plumbing", "hvac"], desc: "Glycol percent and concentrate gallons from manufacturer freeze-point curves." },
  { id: "expansion-tank", name: "Hydronic Expansion Tank", group: "B", trades: ["plumbing", "hvac"], desc: "Required diaphragm tank volume from system volume, fill, and relief pressures." },
  { id: "backflow-loss", name: "Backflow Preventer Pressure Loss", group: "B", trades: ["plumbing"], desc: "Pressure loss interpolated from manufacturer-published curves." },
  // v7 Group B extensions (utilities 238-241).
  { id: "water-hammer-surge", name: "Water Hammer Pressure Surge (Joukowsky)", group: "B", trades: ["plumbing"], desc: "Wave celerity from pipe-fluid coupling, pressure surge dP = rho × a × dV, and rapid-closure flag against 2L/a." },
  { id: "pump-operating-point", name: "Pump Operating Point", group: "B", trades: ["plumbing"], desc: "Intersection of bundled pump curve with H_sys = H_static + k Q^2; SVG plot + numeric table at sample flows." },
  { id: "septic-drainfield", name: "Septic Drainfield Trench Length", group: "B", trades: ["plumbing"], desc: "Required absorption area and trench linear feet from design daily flow and the application rate set by your local code." },
  { id: "pipe-expansion-loop", name: "Pipe Thermal Expansion and Loop Sizing", group: "B", trades: ["plumbing"], desc: "Linear expansion plus the guided-cantilever expansion-loop leg L_loop = sqrt(3 × E × D × dL / S_a)." },

  // Group C: HVAC
  { id: "manual-j-cooling", name: "Manual J Cooling Load (Simplified)", group: "C", trades: ["hvac"], desc: "Simplified sensible and latent cooling load estimate." },
  { id: "manual-j-heating", name: "Manual J Heating Load (Simplified)", group: "C", trades: ["hvac"], desc: "Simplified heating load estimate." },
  { id: "duct-sizing", name: "Duct Sizing", group: "C", trades: ["hvac"], desc: "Round and rectangular duct size from CFM and friction rate." },
  { id: "static-pressure-hvac", name: "Static Pressure", group: "C", trades: ["hvac"], desc: "Total external static pressure from duct elements." },
  { id: "refrigerant-pt", name: "Refrigerant P-T Chart", group: "C", trades: ["hvac"], desc: "Pressure-temperature for common refrigerants." },
  { id: "superheat-subcool", name: "Superheat and Subcool", group: "C", trades: ["hvac"], desc: "Superheat or subcool from line temperature and pressure." },
  { id: "seer-eer", name: "SEER and EER Conversion", group: "C", trades: ["hvac"], desc: "Bidirectional rating conversion." },
  { id: "balance-point", name: "Heat Pump Balance Point", group: "C", trades: ["hvac"], desc: "Balance temperature from heating capacity and heat loss." },
  { id: "shr", name: "Sensible Heat Ratio", group: "C", trades: ["hvac"], desc: "SHR from total and sensible cooling loads." },
  { id: "cfm-per-ton", name: "CFM per Ton", group: "C", trades: ["hvac"], desc: "Standard 400 CFM per ton with humidity adjustments." },
  { id: "combustion-air", name: "Combustion Air", group: "C", trades: ["hvac"], desc: "Required combustion air opening from BTU input and room volume." },
  { id: "compare-refrigerants", name: "Compare Two Refrigerants", group: "C", trades: ["hvac"], desc: "Side-by-side P-T at a chosen pressure or temperature with manufacturer attribution." },
  { id: "refrigerant-charge", name: "Refrigerant Charge Weighing", group: "C", trades: ["hvac"], desc: "Charge in oz from line-set length, diameter, and refrigerant." },
  { id: "approach-delta-t", name: "Approach and Delta-T Diagnostics", group: "C", trades: ["hvac"], desc: "Condenser approach and supply/return delta-T with band labels." },
  { id: "outdoor-air-mix", name: "Outdoor Air Mix", group: "C", trades: ["hvac"], desc: "Mixed dry-bulb and humidity ratio from RA/OA states and OA fraction." },
  { id: "equivalent-length", name: "Equivalent Length of Fittings", group: "C", trades: ["hvac", "plumbing"], desc: "Total equivalent feet from fitting type and diameter counts." },
  { id: "wet-bulb-psychrometer", name: "Wet-Bulb Sling Psychrometer", group: "C", trades: ["hvac", "restoration"], desc: "RH, dew point, and GPP from dry-bulb and wet-bulb." },
  { id: "insulation-thickness", name: "Pipe Insulation Thickness", group: "C", trades: ["hvac", "plumbing"], desc: "Required thickness from cylindrical conduction at a target surface temp." },
  { id: "evaporative-cooling", name: "Latent Heat Evaporative Cooling", group: "C", trades: ["hvac", "restoration"], desc: "Cooling effect from evaporation rate and h_fg." },
  { id: "affinity-laws", name: "Fan Affinity Laws", group: "C", trades: ["hvac"], desc: "Q ~ N, P ~ N^2, kW ~ N^3 across RPM, CFM, SP, and kW changes." },
  { id: "belt-pulley", name: "Belt Length and Pulley Speed", group: "C", trades: ["hvac"], desc: "V-belt length, driven RPM, and belt speed from pulley diameters and centers." },
  { id: "air-receiver", name: "Compressed Air Receiver Sizing", group: "C", trades: ["hvac"], desc: "Required receiver gallons from tool CFM-at-duty-cycle list and pump." },
  { id: "geothermal-loop", name: "Geothermal Loop Length", group: "C", trades: ["hvac"], desc: "Estimated loop length from design BTU and BTU-per-foot benchmarks (simplified)." },
  { id: "baseboard-output", name: "Hydronic Baseboard Output", group: "C", trades: ["hvac"], desc: "BTU/hr from manufacturer-attributed BTU/ft tables interpolated by water temp." },
  { id: "npsh-a", name: "Pump NPSH Available", group: "C", trades: ["hvac", "plumbing"], desc: "Atmospheric, vapor, static, and friction heads to NPSHa with cavitation flag." },
  // v8 Phase E.3 (utility 255).
  { id: "duct-leakage", name: "Duct Leakage Test-and-Balance", group: "C", trades: ["hvac"], desc: "SMACNA leakage class from measured-vs-design CFM at test pressure; pass/fail against the design class." },
  // v7 Group C extensions (utilities 242-245).
  { id: "duct-friction-static", name: "Duct Friction Loss and Static Pressure", group: "C", trades: ["hvac"], desc: "Darcy-Weisbach with Swamee-Jain Colebrook; round or rectangular; fitting losses from a C_o library; total external static." },
  { id: "refrigerant-charging", name: "Refrigerant Superheat / Subcooling (psig-psia toggle)", group: "C", trades: ["hvac"], desc: "Saturation T from bundled P-T tables (R-410A / R-32 / R-454B / R-22 / R-134a); per-input psig vs psia toggle; in-range / low / high flags." },
  { id: "cooling-tower", name: "Cooling Tower Approach and Range", group: "C", trades: ["hvac"], desc: "Range, approach, heat rejection (gpm × 500 × range BTU/hr), and fan kW per ton against typical 5-10 °F approach / 8-12 °F range targets." },
  { id: "insulation-heat-loss", name: "Pipe Insulation Heat Loss (bare vs insulated)", group: "C", trades: ["hvac"], desc: "Cylindrical conduction + convection + radiation; effectiveness % vs bare; six insulation k-values with manufacturer attribution." },

  // Group D: Restoration
  { id: "psychrometric", name: "Psychrometric Calculator", group: "D", trades: ["restoration", "hvac"], desc: "Dew point, GPP, vapor pressure from temperature and RH." },
  { id: "drying-goal", name: "Drying Goal", group: "D", trades: ["restoration"], desc: "Target indoor GPP based on outdoor conditions." },
  { id: "dehumidifier", name: "Dehumidifier Sizing", group: "D", trades: ["restoration"], desc: "Required pints per day by AHAM and field methods." },
  { id: "air-movers", name: "Air Mover Placement", group: "D", trades: ["restoration"], desc: "Number and CFM coverage by water class." },
  { id: "water-classes", name: "Water Loss Class and Category", group: "D", trades: ["restoration"], desc: "Plain-English categories 1, 2, 3 and classes 1 to 4." },
  { id: "drying-times", name: "Material Drying Times", group: "D", trades: ["restoration"], desc: "Typical drying times by material and contamination." },
  { id: "mold", name: "Mold Growth Conditions", group: "D", trades: ["restoration"], desc: "Risk by temperature, RH, and time." },
  { id: "ppe", name: "PPE Selection", group: "D", trades: ["restoration"], desc: "Typical PPE by water category and contamination type." },
  { id: "standing-water", name: "Standing Water Volume", group: "D", trades: ["restoration"], desc: "Gallons, ft^3, and weight from affected area and depth." },
  { id: "nam-sizing", name: "Negative Air Machine Sizing", group: "D", trades: ["restoration"], desc: "Required CFM and unit count from room volume and target ACH." },
  { id: "hepa-filter-life", name: "HEPA Scrubber Filter Life", group: "D", trades: ["restoration"], desc: "Estimated filter days from CFM, runtime, and particulate category." },
  { id: "thermal-delta-t", name: "Thermal Imager Delta-T Reference", group: "D", trades: ["restoration", "electrical"], desc: "Typical surface-temperature differentials for moisture, insulation, and electrical hotspots." },
  { id: "containment-air-balance", name: "Containment Air Balance", group: "D", trades: ["restoration"], desc: "Required net negative CFM via Q = 2610 * A * sqrt(delta_P) and recommended NAM count." },
  { id: "chamber-turnover", name: "Drying Chamber Air Turnover", group: "D", trades: ["restoration"], desc: "Actual ACH from air-mover and dehu CFM and gap to target ACH." },

  // Group E: Carpentry and Construction
  { id: "stairs", name: "Stair Calculator", group: "E", trades: ["carpentry"], desc: "Risers, runs, and headroom from total rise." },
  { id: "roof-pitch", name: "Roof Pitch", group: "E", trades: ["carpentry"], desc: "Pitch as fraction, degrees, and percent." },
  { id: "rafter", name: "Rafter Length", group: "E", trades: ["carpentry"], desc: "Rafter length from span, pitch, overhang." },
  { id: "square-footage", name: "Square Footage", group: "E", trades: ["carpentry"], desc: "Area for rectangle, triangle, trapezoid, circle." },
  { id: "board-footage", name: "Lumber Board Footage", group: "E", trades: ["carpentry"], desc: "Total board feet from thickness, width, length, count." },
  { id: "concrete", name: "Concrete Volume", group: "E", trades: ["carpentry"], desc: "Cubic yards for slab, footing, column, footing-with-stem." },
  { id: "rebar", name: "Rebar Spacing and Quantity", group: "E", trades: ["carpentry"], desc: "Linear feet of rebar from slab dimensions and spacing." },
  { id: "lumber-spans", name: "Lumber Spans", group: "E", trades: ["carpentry"], desc: "Maximum span from species, grade, size, load." },
  { id: "fastener-pullout", name: "Nail and Screw Pull-Out", group: "E", trades: ["carpentry"], desc: "Typical pull-out resistance by fastener and species." },
  { id: "beam-loading", name: "Beam Loading", group: "E", trades: ["carpentry"], desc: "Moment and deflection for simply supported beams." },
  { id: "material-quantity", name: "Material Quantity", group: "E", trades: ["carpentry"], desc: "Quantity for common assemblies with waste factor." },
  { id: "stair-stringer", name: "Stair Stringer Length", group: "E", trades: ["carpentry"], desc: "Diagonal stringer length and 2x12 board feet from rise and run." },
  { id: "joist-deflection", name: "Joist Mid-Span Deflection", group: "E", trades: ["carpentry"], desc: "Mid-span deflection with L/360 and L/240 checks." },
  { id: "footing-area", name: "Footing Area for Soil Bearing", group: "E", trades: ["carpentry"], desc: "Required footing area and side dimension by soil class." },
  { id: "tile-count", name: "Tile Count and Grout Volume", group: "E", trades: ["carpentry"], desc: "Tile count with waste and grout cubic-inch estimate." },
  { id: "paint-coverage", name: "Paint Coverage", group: "E", trades: ["carpentry"], desc: "Gallons per coat by surface porosity and coats." },
  { id: "excavation", name: "Excavation Volume", group: "E", trades: ["carpentry"], desc: "Cubic yards of soil for a sloped excavation." },
  { id: "masonry-count", name: "Brick and CMU Count", group: "E", trades: ["carpentry"], desc: "Unit count from wall area, unit size, and mortar joint." },
  { id: "wind-pressure", name: "Wind Velocity Pressure", group: "E", trades: ["carpentry"], desc: "q = 0.00256 * V^2 with windward and leeward Cp." },
  { id: "snow-load", name: "Flat-Roof Snow Load", group: "E", trades: ["carpentry"], desc: "Pf = 0.7 * Ce * Ct * Is * Pg per public ASCE 7." },
  { id: "anchor-embedment", name: "Anchor Bolt Embedment", group: "E", trades: ["carpentry"], desc: "Required embedment depth from public bond strength formula." },
  { id: "drywall", name: "Drywall Sheet Count and Mud", group: "E", trades: ["carpentry"], desc: "Sheets, mud gallons, tape lf, and screws from wall and ceiling area." },
  { id: "roofing-squares", name: "Roofing Squares and Bundles", group: "E", trades: ["carpentry"], desc: "Squares, bundles per shingle product, underlayment rolls, drip edge." },
  { id: "asphalt-tonnage", name: "Asphalt Tonnage", group: "E", trades: ["carpentry"], desc: "Tons of mix and truck loads at typical 20 tons per haul." },
  { id: "aggregate", name: "Aggregate / Gravel Cubic Yards", group: "E", trades: ["carpentry"], desc: "Cubic yards and tons from area, depth, and material density." },
  { id: "mortar-mix", name: "Mortar Mix and Yield", group: "E", trades: ["carpentry"], desc: "Bags of mortar mix from brick / CMU count and joint thickness." },
  { id: "concrete-mix-design", name: "Concrete Mix Design (Simplified)", group: "E", trades: ["carpentry"], desc: "Water-to-cement ratio interpolated from ACI 211-style curves; cement, coarse, fine aggregate per cubic yard." },
  { id: "bolt-torque", name: "Bolt Torque to Clamp Load", group: "E", trades: ["carpentry"], desc: "Short-form torque T = K * D * F with grade proof loads." },
  { id: "bend-allowance", name: "Sheet Metal Bend Allowance", group: "E", trades: ["carpentry"], desc: "Bend allowance and flat blank length from K-factor and angle." },
  { id: "speeds-feeds", name: "Shop Speeds and Feeds", group: "E", trades: ["carpentry"], desc: "Spindle RPM and feed rate from SFM and chipload by tool / material." },
  { id: "weld-usage", name: "Welding Rod and Wire Usage", group: "E", trades: ["carpentry"], desc: "Deposit weight, consumable weight, time, and shielding gas by process." },
  { id: "demo-debris", name: "Demolition Debris Weight", group: "E", trades: ["carpentry", "restoration"], desc: "Tons of debris and recommended dumpster size by structure type." },
  { id: "formwork-pressure", name: "Formwork Pressure", group: "E", trades: ["carpentry"], desc: "Lateral form pressure (ACI 347 short form) capped at wet head." },
  // v8 Phase E.4 (utility 256).
  { id: "residential-framing", name: "Residential Framing Package", group: "E", trades: ["carpentry"], desc: "Stud + plate + joist + rafter rollup with board-feet totals from footprint, perimeter, wall height, joist span, rafter span, and pitch." },
  // v7 Group E extensions (utilities 246-251).
  { id: "stair-stringer-layout", name: "Stair Stringer Layout (with code check)", group: "E", trades: ["carpentry"], desc: "Riser count, exact rise, total run, stringer hypotenuse, throat depth, and pass/fail against your AHJ's max rise / min tread." },
  { id: "hip-valley-rafter", name: "Hip / Valley / Jack Rafter Schedule", group: "E", trades: ["carpentry"], desc: "Common-rafter and hip multipliers, jack-rafter shortening per OC, irregular-hip second pitch handling. Framing-square method." },
  { id: "rebar-schedule", name: "Rebar Bend and Weight Schedule", group: "E", trades: ["carpentry"], desc: "Cut length with bend allowance and total weight by bar size from the bundled #3-#11 unit weights." },
  { id: "plywood-span", name: "Plywood and OSB Sheathing Span Rating", group: "E", trades: ["carpentry"], desc: "Allowable spacing / live load / total load from APA span-rating tables; pass/fail against user-supplied design loads." },
  { id: "helical-pile", name: "Helical Pile Torque-to-Capacity", group: "E", trades: ["carpentry"], desc: "Ultimate axial capacity from torque × Kt and allowable from factor of safety. Engineer of record governs." },
  { id: "crane-lift-quick", name: "Crane Lift Plan Quick-Math", group: "E", trades: ["carpentry"], desc: "Gross load, sling tension, percent of chart, and 75 / 90 percent flag. The crane manufacturer's load chart governs." },

  // Group F: Fire-Ground Engineering
  { id: "fire-friction", name: "Fire Hose Friction Loss", group: "F", trades: ["fire"], desc: "CQ^2L formula by hose diameter, length, GPM." },
  { id: "pdp", name: "Pump Discharge Pressure", group: "F", trades: ["fire"], desc: "Required PDP from nozzle, friction, elevation." },
  { id: "hydrant-flow", name: "Hydrant Flow", group: "F", trades: ["fire"], desc: "GPM from Pitot pressure and outlet diameter." },
  { id: "required-fire-flow", name: "Required Fire Flow", group: "F", trades: ["fire"], desc: "ISO method from square footage and exposure." },
  { id: "master-stream", name: "Master Stream Reach", group: "F", trades: ["fire"], desc: "Reach from nozzle pressure and type." },
  { id: "aerial-ladder", name: "Aerial Ladder Reach", group: "F", trades: ["fire"], desc: "Horizontal and vertical reach from angle and extension." },
  { id: "foam", name: "Foam Concentrate", group: "F", trades: ["fire"], desc: "Required foam volume by class and application rate." },
  { id: "smoke-reading", name: "Smoke Reading Reference", group: "F", trades: ["fire"], desc: "Volume, velocity, density, and color interpretation." },
  { id: "reverse-lay-friction", name: "Reverse-Lay Friction Loss", group: "F", trades: ["fire"], desc: "Single-pump and tandem (parallel) supply friction loss." },
  { id: "sprinkler-density", name: "Sprinkler GPM Density", group: "F", trades: ["fire"], desc: "Total gpm from area of operation and density (gpm/ft^2)." },
  { id: "standpipe-friction", name: "Standpipe Friction Loss", group: "F", trades: ["fire"], desc: "Riser elevation plus per-outlet friction." },
  { id: "ladder-pipe-reach", name: "Ladder Pipe Reach", group: "F", trades: ["fire"], desc: "Aerial geometry combined with master-stream forward reach." },
  { id: "braking-distance", name: "Vehicle Braking Distance", group: "F", trades: ["fire"], desc: "Stopping distance from speed, friction, grade, reaction time." },
  { id: "confined-space-purge", name: "Confined Space Air Change Time", group: "F", trades: ["fire", "restoration"], desc: "Minutes to reach target air changes from blower CFM." },
  { id: "rope-ma", name: "Rope Rescue Mechanical Advantage", group: "F", trades: ["fire"], desc: "Theoretical and actual MA across rig types with pulley losses." },
  { id: "sling-angle", name: "Sling Angle Load Multiplier", group: "F", trades: ["fire", "carpentry"], desc: "Tension per leg from load, configuration, and included angle." },
  // v7 Group F extension (utility 252).
  { id: "iso-nff", name: "ISO Needed Fire Flow", group: "F", trades: ["fire"], desc: "NFF = Ci × Oi × (1 + X + P) per the ISO Public Protection Classification; Ci = 18 × F × sqrt(A) by construction class. Rounded to 250 gpm; capped at 12 000 gpm." },

  // Group G: Cross-Trade
  { id: "unit-converter", name: "Unit Converter", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Length, area, volume, mass, force, pressure, temperature, energy, power, flow, electrical." },
  { id: "material-cost", name: "Material Cost Estimator", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Total cost from price per unit and quantity." },
  { id: "markup", name: "Markup and Margin", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Selling price from cost and target." },
  { id: "time-and-materials", name: "Time and Materials", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Total billable from hours, rate, and material cost." },
  { id: "sales-tax", name: "Sales Tax", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Tax and total by state." },
  { id: "tip-out", name: "Tip Out", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Per-person split for crews." },
  { id: "loan-payment", name: "Loan Payment", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Monthly payment, total interest, and 12-month amortization." },
  { id: "upgrade-roi", name: "Upgrade ROI / Payback", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Simple payback and 10-year NPV at user-supplied discount rate." },
  { id: "mileage-cost", name: "Mileage and Fuel Cost", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Gallons, fuel cost, and IRS reimbursement from miles and MPG." },
  { id: "overtime", name: "Overtime Hours", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Regular, overtime, and double-time pay breakdown." },
  { id: "per-diem", name: "Per-Diem (GSA)", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Federal per-diem lodging or M&IE rate by state." },
  { id: "geometry", name: "Geometry Pack", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Circle, ellipse (Ramanujan), hexagon, sphere." },
  { id: "dilution", name: "Dilution / Mixing Ratio", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Concentrate volume and diluent volume from target strength." },
  { id: "slope-from-level", name: "Slope from Digital Level", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Bidirectional between degrees, percent, and inches per foot." },
  { id: "haversine", name: "GPS Distance (Haversine)", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Great-circle distance and initial bearing between two coordinates." },
  { id: "trench-slope", name: "OSHA Trench Sloping", group: "G", trades: ["plumbing", "carpentry", "fire"], desc: "Maximum slope ratio per soil class A/B/C and benching geometry." },
  { id: "niosh-lifting", name: "NIOSH Lifting Equation", group: "G", trades: ["restoration", "carpentry", "fire"], desc: "RWL and Lifting Index per the public NIOSH 1991 multipliers." },
  { id: "heat-stress", name: "Heat Stress (WBGT and Heat Index)", group: "G", trades: ["restoration", "carpentry", "fire", "hvac"], desc: "Heat index, WBGT estimate, and OSHA-style work / rest cycle." },
  { id: "wind-chill", name: "Wind Chill Exposure", group: "G", trades: ["restoration", "carpentry", "fire"], desc: "NWS 2001 wind chill formula and frostbite-time exposure curves." },
  { id: "ladder-angle", name: "Ladder Placement Angle", group: "G", trades: ["electrical", "plumbing", "carpentry", "fire", "restoration"], desc: "Base distance for the 4:1 rule and pass/fail at 75.5 deg." },
  { id: "pulley-ma-gen", name: "Pulley System Mechanical Advantage", group: "G", trades: ["fire", "carpentry"], desc: "Theoretical and actual MA across fixed/movable/block-and-tackle rigs." },
  { id: "ramp-slope", name: "Ramp Slope (ADA)", group: "G", trades: ["carpentry"], desc: "Slope ratio, percent, and pass/fail against 1:12 maximum." },
  { id: "rainwater-yield", name: "Rainwater Harvesting Yield", group: "G", trades: ["plumbing"], desc: "Annual gallons from catchment area, rainfall, and collection efficiency." },
  { id: "timesheet", name: "Daily Multi-Job Timesheet", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Hours per job with overtime split, gross pay, and reimbursable miles." },
  { id: "fall-protection-clearance", name: "Fall Protection Clearance", group: "G", trades: ["carpentry", "fire", "restoration"], desc: "Required clearance below anchor = free-fall + decel + worker height + harness stretch + safety factor; pass/fail vs actual clearance to next lower level." },
  { id: "vehicle-load", name: "Vehicle Load Distribution", group: "G", trades: ["carpentry", "fire"], desc: "Front and rear axle weights with GVWR / GAWR flags." },
  { id: "job-estimate-rollup", name: "Job Estimate Roll-Up", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Compose the outputs of every calculator visited this session into one printable estimate sheet." },
  { id: "material-order-list", name: "Material Order List", group: "G", trades: ["carpentry", "plumbing"], desc: "Aggregate quantity outputs across the session's quantity-producing utilities." },
  { id: "job-pack", name: "Job Pack", group: "G", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Compose recents + bundled inputs into a single printable job sheet with crew, date, and address fields." },

  // Group H: Knowledge References (v2)
  { id: "color-codes", name: "Wire / Pipe / Gas Color Codes", group: "H", trades: ["electrical", "plumbing", "hvac"], desc: "NEC, IEC, gas piping, and ASME A13.1 conventions in plain English." },
  { id: "knot-reference", name: "Knot Reference", group: "H", trades: ["fire", "carpentry"], desc: "Common rigging and rescue knots with typical strength reduction." },
  { id: "inspection-checklist", name: "Inspection Prep Checklist", group: "H", trades: ["electrical", "plumbing", "hvac", "carpentry"], desc: "Per-trade rough-in and final inspection checklists." },
  { id: "emergency-contacts", name: "Utility Locator and Emergency Contacts", group: "H", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "811, poison control, OSHA, NRC, and 911 - universal US numbers." },
  { id: "tool-maintenance", name: "Tool Maintenance Intervals", group: "H", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Maintenance schedule for common trades tools." },
  { id: "hand-signals", name: "Hand Signal Reference", group: "H", trades: ["fire", "carpentry"], desc: "Crane, excavator, flagger, and aircraft marshalling signals." },
  { id: "osha-top10", name: "OSHA Top-10 Citations", group: "H", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Most-recently published OSHA top-10 most-cited standards." },
  { id: "loto-steps", name: "Lockout / Tagout Steps", group: "H", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Step-by-step LOTO procedure (29 CFR 1910.147 cited by section)." },
  { id: "defensible-space", name: "Defensible Space Reference", group: "H", trades: ["fire", "restoration"], desc: "Zone-based defensible space practice (CALFIRE / NFPA by name only)." },
  { id: "storm-shelter", name: "Storm Shelter Spec Reference", group: "H", trades: ["carpentry"], desc: "FEMA P-320 published guidance for residential storm shelters (by name only)." },
  { id: "triage-quickread", name: "Field First Aid Triage Quick-Read", group: "H", trades: ["fire", "restoration"], desc: "START triage categories. Not medical advice; call 911." },

  // Group J: Trucking and Logistics (v4)
  { id: "dim-weight", name: "Dimensional Weight (DIM)", group: "J", trades: ["trucking"], desc: "DIM and billable weight from L*W*H and carrier divisor." },
  { id: "freight-density", name: "Freight Density and NMFC Class", group: "J", trades: ["trucking"], desc: "Density (lb/ft^3) and NMFTA density-class bracket from handling unit." },
  { id: "pallet-loadout", name: "Pallet Cube and Trailer Loadout", group: "J", trades: ["trucking"], desc: "Pallets per trailer by floor area and weight, cube fill, cube-out vs weigh-out." },
  { id: "hos-math", name: "Hours of Service Math", group: "J", trades: ["trucking"], desc: "FMCSA 49 CFR 395 drive time, 14-hour window, 70/8 cap, and 30-min break." },
  { id: "bridge-formula", name: "Federal Bridge Formula and Axle Weights", group: "J", trades: ["trucking"], desc: "Per-axle, tandem, and bridge-formula limits from axle weights and spacings." },
  { id: "reefer-burn", name: "Reefer Fuel Burn and Run Time", group: "J", trades: ["trucking"], desc: "Estimated run time and fuel burned from manufacturer GPH benchmarks." },
  { id: "incoterm-decoder", name: "Incoterms 2020 Decoder", group: "J", trades: ["trucking"], desc: "Plain-English summary of who pays freight, who carries risk, and who clears customs." },

  // Group K: Mechanic - Auto, Marine, Aviation (v4)
  { id: "weight-balance", name: "Aircraft Weight and Balance", group: "K", trades: ["mechanic"], desc: "Total weight, total moment, CG, and pass/fail against AFM CG and gross limits." },
  { id: "prop-slip", name: "Marine Prop Slip", group: "K", trades: ["mechanic"], desc: "Theoretical speed, slip percent, and planing vs displacement category from RPM, gear, pitch, and GPS speed." },
  { id: "displacement-cr", name: "Engine Displacement and Compression Ratio", group: "K", trades: ["mechanic"], desc: "Cubic inches / liters and static CR from bore, stroke, chamber, gasket, deck, and dome volumes." },
  { id: "bolt-stretch", name: "Bolt Stretch and Clamp Load", group: "K", trades: ["mechanic", "carpentry"], desc: "Clamp load from F = (stretch * area * E) / grip; cross-check torque." },
  { id: "driveshaft-crit", name: "Driveshaft Critical Speed", group: "K", trades: ["mechanic"], desc: "Euler-Bernoulli first-mode critical RPM with safety-factor recommendation." },
  { id: "fuel-range", name: "Fuel Energy and Range", group: "K", trades: ["mechanic", "trucking"], desc: "BTU and kWh from tank and LHV; range from tank * mpg * load factor." },
  { id: "tire-gearing", name: "Tire Size and Effective Gear Ratio", group: "K", trades: ["mechanic"], desc: "rev/mi for old vs new tires, effective ratio, cruise speed, recommended axle ratio." },
  { id: "brake-pad-life", name: "Brake Pad Lifespan and Heat Capacity", group: "K", trades: ["mechanic"], desc: "KE per stop, rotor temp rise, wear per stop, estimated pad life by material." },

  // Group L: Agriculture and Forestry (v4)
  { id: "gpa-rate", name: "Chemical Application Rate (GPA)", group: "L", trades: ["agriculture"], desc: "GPA = (5940 * GPM) / (speed * spacing) and inverse for target GPA." },
  { id: "timber-cruise", name: "Timber Cruise (Doyle / Scribner / International 1/4)", group: "L", trades: ["agriculture"], desc: "Board feet per log by Doyle, Scribner public-domain table, or International 1/4." },
  { id: "seed-rate", name: "Planting Density and Seed Rate", group: "L", trades: ["agriculture"], desc: "Seeds and pounds per acre from row spacing, target population, germination, and seed price." },
  { id: "drawbar-power", name: "Tractor Drawbar Power", group: "L", trades: ["agriculture"], desc: "Drawbar HP = (pull * speed) / 375; PTO HP estimate from public benchmark." },
  { id: "irrigation-uniformity", name: "Irrigation Sprinkler Uniformity", group: "L", trades: ["agriculture"], desc: "Christiansen CU and Distribution Uniformity from catch-can readings; pass/fail at 85% and 75%." },
  { id: "bulk-density", name: "Soil Bulk Density and Compaction", group: "L", trades: ["agriculture"], desc: "Bulk density, total porosity, and compaction flag against texture-class threshold." },
  { id: "crop-yield", name: "Crop Yield and Harvest Loss", group: "L", trades: ["agriculture"], desc: "Yield bu/acre adjusted to standard moisture, plus optional ground-loss percent." },

  // Group M: Water and Wastewater Operations (v4)
  { id: "pounds-formula", name: "Pounds Formula", group: "M", trades: ["water"], desc: "lb/day = MGD * mg/L * 8.34, with adjusted product feed at the chemical's purity." },
  { id: "filter-loading", name: "Filter Loading Rate and Backwash", group: "M", trades: ["water"], desc: "Loading rate, backwash flow, and rapid-sand vs high-rate category." },
  { id: "detention-time", name: "Detention Time", group: "M", trades: ["water"], desc: "Detention time = volume / flow in min, hr, days; pass/fail vs target." },
  { id: "lab-dilution", name: "Lab Dilution and Serial Dilution", group: "M", trades: ["water"], desc: "C1V1 = C2V2 missing-side solve; serial dilution series with per-step concentrations." },
  { id: "pump-eff-w2w", name: "Pump Wire-to-Water Efficiency", group: "M", trades: ["water", "plumbing"], desc: "Water HP, brake HP estimate, and wire-to-water % with good/ok/degraded category." },
  { id: "srt-fm-ratio", name: "SRT and F/M Ratio", group: "M", trades: ["water"], desc: "Solids retention time and food-to-microorganism ratio with conventional-activated-sludge check." },
  // v8 Phase E.5 (utility 257).
  { id: "coagulant-dose", name: "Coagulant Dose from Jar Test", group: "M", trades: ["water"], desc: "Pure equivalent + product feed (lb/day, gal/day) for alum, ferric chloride, or PAC at the jar-test optimal dose." },

  // Group N: Stage and Live Production (v4)
  { id: "truss-capacity", name: "Truss Point Load and Span Capacity", group: "N", trades: ["stage", "carpentry"], desc: "UDL capacity from manufacturer curves; reactions, equivalent-UDL safety factor, pass/fail." },
  { id: "time-alignment", name: "Audio Speaker Time Alignment", group: "N", trades: ["stage"], desc: "Required delay-tower delay (ms) from speed-of-sound formula; Haas-window offset." },
  { id: "dmx-planner", name: "DMX-512 Address and Universe Planner", group: "N", trades: ["stage"], desc: "Per-fixture channel ranges, universe utilization, conflict and overflow detection." },
  { id: "neutral-imbalance", name: "Three-Phase Neutral Imbalance and Distro", group: "N", trades: ["stage", "electrical"], desc: "Neutral current estimate, imbalance percent, harmonic-load warning." },
  { id: "spl-distance", name: "SPL and Inverse Square Law", group: "N", trades: ["stage"], desc: "L2 = L1 - 20 log10(d2/d1) with free-field / hemispherical / indoor mode adjustment." },
  { id: "rigging-check", name: "Rigging Capacity Quick Check", group: "N", trades: ["stage", "fire"], desc: "WLL at angle for shackles / slings / span sets / hoists with safety factor and pass/fail." },

  // Group O: Kitchen and Food Service (v4)
  { id: "recipe-scale", name: "Recipe Scaling", group: "O", trades: ["kitchen"], desc: "Scaled rows preserving units; converts to grams via USDA reference weights when scaling produces awkward numbers." },
  { id: "yield-ep", name: "Yield Percentage and Edible Portion", group: "O", trades: ["kitchen"], desc: "Yield %, EP weight, and EP cost per lb from AP weight, trim, and cooking loss." },
  { id: "cooling-curve", name: "Food Safety Cooling Curve", group: "O", trades: ["kitchen"], desc: "Estimated 135->70 F and 70->41 F cooling time with FDA Food Code 2022 pass/fail." },
  { id: "plate-cost", name: "Plate Cost and Menu Pricing", group: "O", trades: ["kitchen"], desc: "Plate cost, suggested menu price at target food-cost %, contribution margin, sanity flag." },
  { id: "pan-conversion", name: "Steam Table and Pan Conversion", group: "O", trades: ["kitchen"], desc: "Pan capacity in qt, count of pans needed, servings per pan, cooling-depth warning." },

  // Group P: Field, Backcountry, and SAR (v4)
  { id: "pacing-distance", name: "Pacing and Distance", group: "P", trades: ["field", "fire"], desc: "Distance from pace count with terrain correction; reference table per stride length." },
  { id: "bearing-conversion", name: "Magnetic Declination and Bearing Conversion", group: "P", trades: ["field"], desc: "Magnetic-to-true and true-to-magnetic with east-is-least / west-is-best memo." },
  { id: "slope-avalanche", name: "Slope Angle and Avalanche Risk Window", group: "P", trades: ["field"], desc: "Slope angle, slope %, and 30-45 deg avalanche start-zone flag." },
  { id: "backcountry-needs", name: "Backcountry Water and Caloric Requirement", group: "P", trades: ["field"], desc: "Water (L) and kcal per person per day with trip totals." },
  { id: "utm-conversion", name: "UTM and Lat-Lon Conversion", group: "P", trades: ["field"], desc: "Krueger / USGS deterministic forward and inverse formulas (WGS84)." },
  { id: "solar-times", name: "Sunrise, Sunset, and Civil Twilight", group: "P", trades: ["field"], desc: "NOAA solar-position algorithm: sunrise, sunset, civil / nautical / astronomical twilight, daylight minutes." },

  // Group Q: Historical Reference Data (v4)
  { id: "historical-pricing", name: "Historical Pricing Context", group: "Q", trades: ["reference"], desc: "Bundled monthly history per commodity (BLS PPI / EIA / USDA NASS / FRED) with 25 / 50 / 75 / 90 percentile bands over a user-selected lookback. Reference only; no live fetch." },
];

const FIRE_GROUND_TRADE = "fire";

// Inline notices.
const NOTICE_DEFAULT = "This is a math aid for verification. Local codes, manufacturer specifications, and the authority having jurisdiction govern all installations and inspections.";
const NOTICE_FIRE = "This is a math aid for verification. Departmental SOPs and incident command govern all fireground operations.";
const NOTICE_HISTORICAL = "Reference only. Bundled at build time. Ask your supplier for a current quote.";

// Leader-key shortcut targets.
const SHORTCUTS = {
  h: { type: "home" },
  s: { type: "focus", target: "#search-input" },
  p: { type: "pinned" },
  u: { type: "route", id: "unit-converter" },
  o: { type: "route", id: "ohms-law" },
  w: { type: "route", id: "wire-ampacity" },
  v: { type: "route", id: "voltage-drop" },
  f: { type: "route", id: "friction-loss" },
  d: { type: "route", id: "duct-sizing" },
  r: { type: "route", id: "refrigerant-pt" },
  l: { type: "route", id: "lumber-spans" },
  c: { type: "route", id: "concrete" },
  t: { type: "route", id: "static-pressure-hvac" },
};

// State.
//
// trade/group filters are not in the DOM (only the search bar is). The
// filtering happens through `state.query` against tool name and desc.
// `routing.toolMatches` defaults the trade/group filters to "all" when
// the corresponding fields are absent, so we omit them from state.
const state = {
  query: "",
  pinned: [],
  recents: [],
  route: { view: "home", id: null, params: {} },
};

// Boot.
document.addEventListener("DOMContentLoaded", boot);

function boot() {
  parseHash();
  renderHome();
  bindSearch();
  bindShortcuts();
  bindClearPins();
  bindBrand();
  window.addEventListener("hashchange", onHashChange);
  applyRoute();
  registerServiceWorker();
  verifyManifestIntegrity();
}

// The brand link in the header has `href="#"` so right-click + "Open in
// new tab" still works. The default click behavior (scroll to top, then
// route home via hashchange) is not what the user wants; intercept and
// route home directly.
function bindBrand() {
  const brand = document.querySelector(".brand");
  if (!brand) return;
  brand.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    navigateTo("");
  });
}

function bindClearPins() {
  const btn = document.getElementById("clear-pins");
  if (btn) {
    btn.addEventListener("click", () => {
      state.pinned = [];
      updatePinnedHash();
      renderHome();
    });
  }
  const rbtn = document.getElementById("clear-recents");
  if (rbtn) {
    rbtn.addEventListener("click", () => {
      state.recents = [];
      updatePinnedHash();
      renderHome();
    });
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const proto = window.location.protocol;
  const host = window.location.hostname;
  const ok = proto === "https:" || host === "localhost" || host === "127.0.0.1";
  if (!ok) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

// --- Routing ---

function parseHash() {
  const result = parseHashRoute(window.location.hash || "", TOOLS.map((t) => t.id));
  if (result.pinned) state.pinned = result.pinned;
  if (result.recents) state.recents = result.recents;
  if (result.bundle) {
    // Defer to async decode; do not block parseHash.
    import("./bundle.js").then((mod) => {
      const decoded = mod.decodeBundle(result.bundle);
      if (decoded.error) return;
      const sanitized = mod.sanitizeBundle(decoded, new Set(TOOLS.map((t) => t.id)));
      state.pinned = sanitized.pinned;
      state.recents = sanitized.recents;
      state.bundleInputs = sanitized.inputs;
      // Replace the bundle hash with the resolved p=...&r=... form.
      updatePinnedHash();
      renderHome();
    }).catch(() => {});
  }
  state.route = result.route;
}

function onHashChange() {
  parseHash();
  applyRoute();
}

function applyRoute() {
  const home = document.getElementById("tools");
  const pinnedRegion = document.getElementById("pinned-region");
  const recentsRegion = document.getElementById("recents-region");
  const view = document.getElementById("view-region");
  if (state.route.view === "tool") {
    home.hidden = true;
    if (pinnedRegion) pinnedRegion.hidden = true;
    if (recentsRegion) recentsRegion.hidden = true;
    view.hidden = false;
    state.recents = pushRecent(state.recents, state.route.id);
    const fromBundle = (state.bundleInputs && state.bundleInputs[state.route.id]) || null;
    const params = fromBundle ? { ...fromBundle, ...state.route.params } : state.route.params;
    renderToolView(state.route.id, params);
  } else {
    home.hidden = false;
    view.hidden = true;
    clearChildren(view);
    renderHome();
    updatePinnedHash();
  }
}

function navigateTo(hash) {
  if (window.location.hash !== "#" + hash) {
    window.history.replaceState(null, "", "#" + hash);
    parseHash();
    applyRoute();
  }
}

// --- Home view (tile grid) ---

function renderHome() {
  // Recents region (above pinned).
  const recentsRegion = document.getElementById("recents-region");
  const recentsGrid = document.getElementById("recents-grid");
  if (recentsGrid && recentsRegion) {
    clearChildren(recentsGrid);
    if (state.recents.length > 0) {
      recentsRegion.hidden = false;
      for (const id of state.recents) {
        const tool = TOOLS.find((t) => t.id === id);
        if (tool) recentsGrid.appendChild(buildTile(tool));
      }
    } else {
      recentsRegion.hidden = true;
    }
  }
  // Pinned region.
  const pinnedRegion = document.getElementById("pinned-region");
  const pinnedGrid = document.getElementById("pinned-grid");
  if (pinnedGrid && pinnedRegion) {
    clearChildren(pinnedGrid);
    if (state.pinned.length > 0) {
      pinnedRegion.hidden = false;
      for (const id of state.pinned) {
        const tool = TOOLS.find((t) => t.id === id);
        if (tool) pinnedGrid.appendChild(buildTile(tool));
      }
    } else {
      pinnedRegion.hidden = true;
    }
  }

  // Tools sections - one block per group, each with its own header.
  // Tiles are filtered inline by the live search query; empty groups are
  // hidden so the layout stays tight while typing.
  const sections = document.getElementById("tools-sections");
  const empty = document.getElementById("empty-state");
  if (!sections) return;
  clearChildren(sections);
  let totalVisible = 0;
  for (const group of GROUPS) {
    const groupTools = TOOLS.filter((t) => t.group === group && matchesFilters(t));
    if (groupTools.length === 0) continue;
    totalVisible += groupTools.length;
    sections.appendChild(buildGroupSection(group, groupTools));
  }
  if (empty) empty.hidden = totalVisible > 0;
}

function buildGroupSection(group, tools) {
  const section = document.createElement("section");
  section.className = "tools-section";
  section.dataset.group = group;

  const header = document.createElement("div");
  header.className = "tools-section-header";

  const label = document.createElement("h2");
  label.className = "tools-section-label";
  label.textContent = GROUP_NAMES[group] || group;
  header.appendChild(label);

  const count = document.createElement("span");
  count.className = "tools-section-count";
  count.textContent = String(tools.length);
  header.appendChild(count);

  section.appendChild(header);

  const ul = document.createElement("ul");
  ul.className = "tile-grid";
  ul.setAttribute("role", "list");
  for (const tool of tools) ul.appendChild(buildTile(tool));
  section.appendChild(ul);

  return section;
}

// Encode current pinned state into the URL hash. Only called when the user
// is on the home view; tool routes keep their own #tool?params hash.
function updatePinnedHash() {
  if (state.route.view !== "home") return;
  const parts = [];
  if (state.pinned.length > 0) parts.push("p=" + state.pinned.join(","));
  if (state.recents.length > 0) parts.push("r=" + state.recents.join(","));
  const hash = parts.join("&");
  if (window.location.hash !== "#" + hash && window.location.hash !== (hash ? "#" + hash : "")) {
    window.history.replaceState(null, "", hash ? "#" + hash : window.location.pathname + window.location.search);
  }
}

function matchesFilters(tool) {
  return toolMatches(tool, { query: state.query });
}


function buildTile(tool) {
  const li = document.createElement("li");
  li.className = "tile";
  li.dataset.tool = tool.id;
  li.dataset.trades = tool.trades.join(" ");
  li.dataset.group = tool.group;
  li.tabIndex = -1;
  // Card-link pattern: clicking anywhere on the tile (except on the Pin
  // button or the explicit "Open tool" link, which both have their own
  // handlers) navigates to the tool view. Modifier-key clicks open the
  // tool in a new tab so power users can multi-pop without losing place.
  li.addEventListener("click", (e) => {
    if (e.defaultPrevented) return;
    const target = e.target;
    if (target.closest(".tile-pin") || target.closest(".tile-link")) return;
    const url = "#" + tool.id;
    if (e.metaKey || e.ctrlKey) {
      window.open(window.location.pathname + url, "_blank", "noopener");
      return;
    }
    if (e.shiftKey || e.button === 1) return;
    navigateTo(tool.id);
  });

  const h2 = document.createElement("h2");
  h2.className = "tile-title";
  h2.textContent = tool.name;
  li.appendChild(h2);

  const desc = document.createElement("p");
  desc.className = "tile-desc";
  desc.textContent = tool.desc;
  li.appendChild(desc);

  const tags = document.createElement("div");
  tags.className = "tile-tags";
  const groupTag = document.createElement("span");
  groupTag.className = "tag";
  groupTag.textContent = GROUP_NAMES[tool.group] || tool.group;
  tags.appendChild(groupTag);
  for (const t of tool.trades) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = capitalize(t);
    tags.appendChild(tag);
  }
  li.appendChild(tags);

  const actions = document.createElement("div");
  actions.className = "tile-actions";

  const a = document.createElement("a");
  a.className = "tile-link";
  a.href = "#" + tool.id;
  a.textContent = "Open tool";
  actions.appendChild(a);

  const pinBtn = document.createElement("button");
  pinBtn.type = "button";
  pinBtn.className = "tile-pin";
  const isPinned = state.pinned.includes(tool.id);
  pinBtn.textContent = isPinned ? "Unpin" : "Pin";
  pinBtn.setAttribute("aria-pressed", isPinned ? "true" : "false");
  pinBtn.addEventListener("click", () => {
    if (state.pinned.includes(tool.id)) {
      state.pinned = state.pinned.filter((p) => p !== tool.id);
    } else {
      state.pinned.push(tool.id);
    }
    updatePinnedHash();
    renderHome();
  });
  actions.appendChild(pinBtn);

  li.appendChild(actions);
  return li;
}

// --- Tool view shell ---

function renderToolView(id, params) {
  const tool = TOOLS.find((t) => t.id === id);
  const view = document.getElementById("view-region");
  clearChildren(view);
  if (!tool) {
    const p = document.createElement("p");
    p.textContent = "Tool not found.";
    view.appendChild(p);
    return;
  }

  const headerRow = document.createElement("div");
  headerRow.className = "view-header-row";

  const back = document.createElement("a");
  back.className = "back-link";
  back.href = "#";
  back.textContent = "Back to tools";
  // Prevent the default browser scroll-to-top jump that `href="#"`
  // triggers before the hashchange handler routes home.
  back.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("");
  });
  headerRow.appendChild(back);

  const pinBtn = document.createElement("button");
  pinBtn.type = "button";
  pinBtn.className = "view-pin";
  const refreshPinLabel = () => {
    const on = state.pinned.includes(id);
    pinBtn.textContent = on ? "Unpin from home" : "Pin to home";
    pinBtn.setAttribute("aria-pressed", on ? "true" : "false");
  };
  refreshPinLabel();
  pinBtn.addEventListener("click", () => {
    if (state.pinned.includes(id)) state.pinned = state.pinned.filter((p) => p !== id);
    else state.pinned.push(id);
    refreshPinLabel();
    // Pin state from a tool view is preserved in memory; it surfaces as a
    // Pinned section the next time the user lands on home. Per spec section
    // 11.5, that home view is bookmarkable via #p=... once visited.
  });
  headerRow.appendChild(pinBtn);

  // Copy share link (utility 124).
  const shareBtn = document.createElement("button");
  shareBtn.type = "button";
  shareBtn.className = "view-share";
  shareBtn.textContent = "Copy share link";
  shareBtn.addEventListener("click", () => {
    import("./clipboard.js").then((m) => m.copyText(window.location.href)).catch(() => {});
  });
  headerRow.appendChild(shareBtn);

  // Bundle actions (utility 121).
  const bundleCopyBtn = document.createElement("button");
  bundleCopyBtn.type = "button";
  bundleCopyBtn.className = "view-bundle-copy";
  bundleCopyBtn.textContent = "Copy bundle URL";
  bundleCopyBtn.addEventListener("click", () => {
    Promise.all([import("./bundle.js"), import("./clipboard.js")]).then(([bm, cm]) => {
      const merged = mergeBundleInputs(inputRegion, id);
      const hash = bm.encodeBundleHash({ pinned: state.pinned, recents: state.recents, inputs: merged });
      const url = window.location.origin + window.location.pathname + window.location.search + "#" + hash;
      cm.copyText(url);
    }).catch(() => {});
  });
  headerRow.appendChild(bundleCopyBtn);

  const bundleDownloadBtn = document.createElement("button");
  bundleDownloadBtn.type = "button";
  bundleDownloadBtn.className = "view-bundle-download";
  bundleDownloadBtn.textContent = "Download bundle";
  bundleDownloadBtn.addEventListener("click", () => {
    import("./bundle.js").then((bm) => {
      const merged = mergeBundleInputs(inputRegion, id);
      const json = bm.encodeBundle({ pinned: state.pinned, recents: state.recents, inputs: merged });
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "roughlogic-bundle.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }).catch(() => {});
  });
  headerRow.appendChild(bundleDownloadBtn);

  const bundleLoadLabel = document.createElement("label");
  bundleLoadLabel.className = "view-bundle-load";
  bundleLoadLabel.textContent = "Load bundle ";
  const bundleLoadInput = document.createElement("input");
  bundleLoadInput.type = "file";
  bundleLoadInput.accept = "application/json";
  bundleLoadInput.style.fontSize = "12px";
  bundleLoadInput.addEventListener("change", () => {
    const file = bundleLoadInput.files && bundleLoadInput.files[0];
    if (!file) return;
    file.text().then((text) => import("./bundle.js").then((bm) => {
      const decoded = bm.decodeBundle(text);
      if (decoded.error) return;
      const sanitized = bm.sanitizeBundle(decoded, new Set(TOOLS.map((t) => t.id)));
      state.pinned = sanitized.pinned;
      state.recents = sanitized.recents;
      state.bundleInputs = sanitized.inputs;
      navigateTo("");
    })).catch(() => {});
  });
  bundleLoadLabel.appendChild(bundleLoadInput);
  headerRow.appendChild(bundleLoadLabel);

  // Print this calculator (utility 122).
  const printBtn = document.createElement("button");
  printBtn.type = "button";
  printBtn.className = "view-print";
  printBtn.textContent = "Print this calculator";
  printBtn.addEventListener("click", () => { try { window.print(); } catch {} });
  headerRow.appendChild(printBtn);

  view.appendChild(headerRow);

  const h1 = document.createElement("h1");
  h1.className = "view-title";
  h1.textContent = tool.name;
  view.appendChild(h1);

  const lead = document.createElement("p");
  lead.className = "view-desc";
  lead.textContent = tool.desc;
  view.appendChild(lead);

  const notice = document.createElement("div");
  notice.className = "inline-notice";
  notice.setAttribute("role", "note");
  if (tool.group === "Q") notice.textContent = NOTICE_HISTORICAL;
  else if (tool.trades.includes(FIRE_GROUND_TRADE)) notice.textContent = NOTICE_FIRE;
  else notice.textContent = NOTICE_DEFAULT;
  view.appendChild(notice);

  const citation = document.createElement("p");
  citation.className = "citation";
  view.appendChild(citation);

  const inputRegion = document.createElement("section");
  inputRegion.className = "input-region";
  inputRegion.setAttribute("aria-label", "Inputs");
  view.appendChild(inputRegion);

  const outputRegion = document.createElement("section");
  outputRegion.className = "output-region";
  outputRegion.setAttribute("aria-live", "polite");
  outputRegion.setAttribute("aria-label", "Output");
  view.appendChild(outputRegion);

  const sources = document.createElement("section");
  sources.className = "sources-region";
  sources.setAttribute("aria-label", "Sources");
  const sourcesNote = document.createElement("p");
  sourcesNote.className = "citation";
  sourcesNote.textContent = "Sources and derivation notes are linked from docs/derivations.md and docs/data-sources.md.";
  sources.appendChild(sourcesNote);
  view.appendChild(sources);

  // v6 §3 / §7: lazy-load the structured citation map. When the tile id has
  // a structured CITATIONS entry, mount the six-line reference block under
  // the sources region and add a "Copy answer with full reference block"
  // button that emits the §3 plain-text format. Tiles not yet audited
  // continue to render the legacy inline citation only.
  import("./citations.js").then((cit) => {
    const block = cit.renderCitationBlock(sources, id);
    if (block) {
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "view-copy-reference";
      copyBtn.textContent = "Copy answer with full reference block";
      copyBtn.addEventListener("click", async () => {
        const answerSummary = (outputRegion.textContent || "").trim().replace(/\s+/g, " ");
        const text = cit.buildAnswerWithReference(tool.name, answerSummary, id);
        try {
          const cb = await import("./clipboard.js");
          cb.copyText(text);
        } catch {
          // Fallback: leave the text on the page in a focusable element.
        }
      });
      block.appendChild(copyBtn);
    }
  }).catch(() => { /* citation block is opt-in per tile; missing map is fine */ });

  const ds = TOOL_DATA_SOURCES[id];

  // Field Notes scratchpad (v3 utility 185). 280-character textarea bound
  // to the URL hash key `k=...`. Mounts before the lazy renderer so the
  // user can start jotting while the calculator loads.
  mountScratchpad(view, params);

  // Lazy-load the calculator module + support libs.
  loadRenderer(id).then(async (renderer) => {
    if (!renderer) {
      const placeholder = document.createElement("p");
      placeholder.textContent = "This calculator is not available.";
      inputRegion.appendChild(placeholder);
      return;
    }
    const libs = await loadSupportLibs();
    // Crash-Safe Resume (v3 utility 187). Wrap each renderer body in a
    // try/catch boundary. On uncaught error, log the tool id + input
    // snapshot and render a small recovery panel without clearing the URL
    // hash so the user can reload or paste the URL into a new tab.
    try {
      renderer(inputRegion, outputRegion, citation, params || {});
      libs.applyHashState(inputRegion, params || {});
      libs.wireHashState(inputRegion, id);
      if (params && params.example === "1") {
        const exBtn = inputRegion.querySelector("button");
        if (exBtn && /example/i.test(exBtn.textContent || "")) exBtn.click();
      }
      if (ds) libs.stampDataSource(sources, ds);
      libs.addCopyAllButton(outputRegion, { title: tool.name });
      libs.wireValidity(inputRegion, outputRegion);
    } catch (err) {
      console.error("[crash-safe] calculator threw", { tool: id, params, error: err });
      mountCrashPanel(view, id);
    }
  }).catch((err) => {
    const placeholder = document.createElement("p");
    placeholder.textContent = "Failed to load calculator: " + (err && err.message ? err.message : "unknown error");
    inputRegion.appendChild(placeholder);
  });

  // Apply any preloaded params (visible to calculator implementations later).
  view.dataset.params = JSON.stringify(params || {});

  // Move focus for screen reader and keyboard users.
  h1.tabIndex = -1;
  h1.focus({ preventScroll: false });
}

// --- Filters ---
//
// The trade/group filter button rows were removed from index.html; the
// header search bar is now the only filter. Tool matching defers to
// `routing.toolMatches`, which still supports trade/group filters when
// supplied (covered by routing.test.js).

function bindSearch() {
  const input = document.getElementById("search-input");
  if (!input) return;
  // Populate the datalist with every tool name so the browser's native
  // suggestions menu (list="tool-suggestions") autocompletes against
  // real tools. Picking a suggestion that exactly matches a tool name
  // routes the user straight to that tool view.
  const dl = document.getElementById("tool-suggestions");
  if (dl) {
    clearChildren(dl);
    for (const t of TOOLS) {
      const opt = document.createElement("option");
      opt.value = t.name;
      dl.appendChild(opt);
    }
  }
  const nameToId = new Map(TOOLS.map((t) => [t.name.toLowerCase(), t.id]));
  let timer = 0;
  input.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const raw = (input.value || "").trim();
      // If the typed value exactly matches a tool name (e.g. the user
      // picked from the datalist), navigate to that tool and clear the
      // search query so the home grid is not still filtered when they
      // come back.
      const exactId = nameToId.get(raw.toLowerCase());
      if (exactId) {
        input.value = "";
        state.query = "";
        navigateTo(exactId);
        return;
      }
      state.query = input.value || "";
      // If the user is in a tool view and starts typing, route them
      // back to home so the live-filtered grid is what they see. Empty
      // queries do not auto-navigate (typing into the field then
      // clearing it should not yank the user out of a calculator).
      if (state.route.view !== "home" && state.query.trim().length > 0) {
        navigateTo("");
      } else {
        renderHome();
      }
    }, 50);
  });
}

// --- Keyboard: leader-key shortcuts and tile arrow nav ---

function bindShortcuts() {
  let leaderArmed = false;
  let leaderTimer = 0;

  document.addEventListener("keydown", (e) => {
    // ? overlay.
    if (e.key === "?" && !isTextInputTarget(e.target)) {
      e.preventDefault();
      toggleShortcutOverlay();
      return;
    }
    // Esc closes overlay or returns home.
    if (e.key === "Escape") {
      const overlay = document.getElementById("shortcut-overlay");
      if (overlay) {
        e.preventDefault();
        closeShortcutOverlay();
        return;
      }
    }
    if (isTextInputTarget(e.target)) return;

    // Leader key: G, then a single letter within 1.5 seconds.
    if (!leaderArmed && (e.key === "g" || e.key === "G")) {
      leaderArmed = true;
      window.clearTimeout(leaderTimer);
      leaderTimer = window.setTimeout(() => { leaderArmed = false; }, 1500);
      return;
    }
    if (leaderArmed) {
      leaderArmed = false;
      window.clearTimeout(leaderTimer);
      const k = e.key.toLowerCase();
      const action = SHORTCUTS[k];
      if (!action) return;
      e.preventDefault();
      runShortcut(action);
    }
  });

  // Tile grid arrow keys. The v2 home renders multiple <ul class="tile-grid">
  // blocks (one per group section) inside #tools-sections. Wire on the
  // container so arrow navigation works across every section in document
  // order. Falls back to #tile-grid for any future reversion.
  const sections = document.getElementById("tools-sections") || document.getElementById("tile-grid");
  if (sections) {
    sections.addEventListener("keydown", (e) => {
      if (!e.target.classList || !e.target.classList.contains("tile-link")) return;
      const links = Array.from(sections.querySelectorAll(".tile-link"));
      const idx = links.indexOf(e.target);
      if (idx < 0) return;
      const cols = currentColumnCount();
      let next = idx;
      if (e.key === "ArrowRight") next = idx + 1;
      else if (e.key === "ArrowLeft") next = idx - 1;
      else if (e.key === "ArrowDown") next = idx + cols;
      else if (e.key === "ArrowUp") next = idx - cols;
      else return;
      if (next < 0 || next >= links.length) return;
      e.preventDefault();
      links[next].focus();
    });
  }
}

function runShortcut(action) {
  if (action.type === "home") {
    navigateTo("");
  } else if (action.type === "route") {
    navigateTo(action.id);
  } else if (action.type === "focus") {
    const el = document.querySelector(action.target);
    if (el) el.focus();
  } else if (action.type === "pinned") {
    if (state.pinned.length > 0) {
      navigateTo("p=" + state.pinned.join(","));
    }
  }
}

function toggleShortcutOverlay() {
  const existing = document.getElementById("shortcut-overlay");
  if (existing) {
    closeShortcutOverlay();
    return;
  }
  const overlay = document.createElement("div");
  overlay.id = "shortcut-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "Keyboard shortcuts");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(255,255,255,0.97);padding:24px;overflow:auto;z-index:50;";

  const inner = document.createElement("div");
  inner.style.cssText = "max-width:640px;margin:0 auto;border:1px solid #DDDDDD;padding:24px;";
  const h = document.createElement("h2");
  h.textContent = "Keyboard shortcuts";
  inner.appendChild(h);

  const list = document.createElement("ul");
  const entries = [
    ["G H", "Home"],
    ["G S", "Search"],
    ["G P", "Pinned"],
    ["G U", "Unit Converter"],
    ["G O", "Ohm's Law"],
    ["G W", "Wire Ampacity"],
    ["G V", "Voltage Drop"],
    ["G F", "Friction Loss"],
    ["G D", "Duct Sizing"],
    ["G R", "Refrigerant P-T"],
    ["G L", "Lumber Spans"],
    ["G C", "Concrete Volume"],
    ["G T", "Static Pressure"],
    ["?", "Toggle this overlay"],
    ["Esc", "Close overlay"],
  ];
  for (const [k, v] of entries) {
    const li = document.createElement("li");
    const code = document.createElement("code");
    code.textContent = k;
    li.appendChild(code);
    li.appendChild(document.createTextNode("  " + v));
    list.appendChild(li);
  }
  inner.appendChild(list);

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Close";
  close.addEventListener("click", closeShortcutOverlay);
  inner.appendChild(close);

  overlay.appendChild(inner);
  document.body.appendChild(overlay);
  close.focus();
}

function closeShortcutOverlay() {
  const overlay = document.getElementById("shortcut-overlay");
  if (overlay) overlay.remove();
}

function isTextInputTarget(el) {
  if (!el) return false;
  const tag = (el.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el.isContentEditable) return true;
  return false;
}

function currentColumnCount() {
  const w = window.innerWidth || 0;
  if (w >= 900) return 3;
  if (w >= 600) return 2;
  return 1;
}

// --- Helpers ---

function clearChildren(el) {
  while (el && el.firstChild) el.removeChild(el.firstChild);
}

// Collect a {key: value} map from an input region; used by bundle export.
function collectBundleInputs(inputRegion, toolId) {
  const out = {};
  const inputs = inputRegion.querySelectorAll("input, select");
  for (const el of inputs) {
    if (!el.id) continue;
    // Skip the file input used by the Load bundle affordance.
    if (el.type === "file") continue;
    if (el.type === "checkbox") out[el.id] = el.checked ? "1" : "";
    else out[el.id] = el.value || "";
  }
  return { [toolId]: out };
}

// Merge the current tool's live input map on top of any previously
// captured bundle inputs (from a loaded bundle or from earlier tool
// visits this session). Per spec-v2 section 1, a bundle encodes
// inputs for multiple calculators, not just the active one.
function mergeBundleInputs(inputRegion, toolId) {
  const current = collectBundleInputs(inputRegion, toolId);
  const carried = state.bundleInputs && typeof state.bundleInputs === "object" ? state.bundleInputs : {};
  const merged = { ...carried, ...current };
  // Persist the merged map so the next tool view's bundle action sees it.
  state.bundleInputs = merged;
  return merged;
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============================================================
// v3 utility 185: Field Notes scratchpad.
// 280-character textarea bound to the URL hash key `k=...`. Notes never
// leave the page; closing the tab without bookmarking discards them.
// ============================================================
function mountScratchpad(view, params) {
  const wrap = document.createElement("section");
  wrap.className = "scratchpad-region";
  wrap.setAttribute("aria-label", "Field notes");
  const label = document.createElement("label");
  label.htmlFor = "scratchpad";
  label.textContent = "Field notes (URL-only, 280 chars):";
  const ta = document.createElement("textarea");
  ta.id = "scratchpad";
  ta.maxLength = 280;
  ta.rows = 2;
  ta.className = "scratchpad-input";
  ta.placeholder = "Notes...";
  ta.value = (params && typeof params.k === "string") ? params.k : "";
  const note = document.createElement("p");
  note.className = "scratchpad-note";
  note.textContent = "Notes are stored in the URL only. Closing the tab without bookmarking discards them.";
  wrap.appendChild(label);
  wrap.appendChild(ta);
  wrap.appendChild(note);
  view.appendChild(wrap);

  // Sync to the URL hash. We append `&k=<encoded>` to the existing tool
  // hash without disturbing other params. Debounced so typing is cheap.
  let timer = 0;
  ta.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const hash = window.location.hash || "";
      // Strip any existing k= param.
      const idx = hash.indexOf("?");
      let route = idx >= 0 ? hash.slice(0, idx) : hash;
      let qs = idx >= 0 ? hash.slice(idx + 1) : "";
      const parts = qs.split("&").filter((p) => p && !p.startsWith("k="));
      const v = ta.value;
      if (v) parts.push("k=" + encodeURIComponent(v));
      const newHash = route + (parts.length ? "?" + parts.join("&") : "");
      // Use replaceState so the back button is not polluted by every keystroke.
      try {
        window.history.replaceState(null, "", newHash);
      } catch (e) { /* no-op */ }
    }, 200);
  });
}

// ============================================================
// v3 utility 187: Crash-Safe Resume.
// Renders a small recovery panel after a renderer throws. Does NOT
// clear the URL hash so the user can reload or paste the URL into a
// new tab to recover state.
// ============================================================
function mountCrashPanel(view, toolId) {
  const panel = document.createElement("div");
  panel.className = "inline-notice crash-panel";
  panel.setAttribute("role", "alert");
  const h = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = "This calculator crashed.";
  h.appendChild(strong);
  panel.appendChild(h);
  const body = document.createElement("p");
  body.textContent = "Reload to retry, or paste your URL into a new tab to recover state. The URL is preserved.";
  panel.appendChild(body);
  // Insert near the top of the view, just under the citation if it exists.
  const after = view.querySelector(".citation") || view.firstChild;
  if (after && after.nextSibling) view.insertBefore(panel, after.nextSibling);
  else view.appendChild(panel);
}
