// roughlogic application entry.
// Vanilla ES module. No dependencies. No innerHTML. No eval. No Function constructor.

// Calculator modules and their support libs are loaded on demand. Per
// spec section 11.1, the home view stays well under 100 KB by importing
// only what the home view needs (this module + integrity.js). Calculator
// renderers, hash-state, data-stamp, and pure-math come in dynamically
// when the user opens a tool.
import { verifyManifestIntegrity } from "./integrity.js";
import { parseHashRoute } from "./routing.js";

// Recents (utility 120) was removed in v11; see specs/spec-v11.md.

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
    // v9
    "arc-flash-screen",
    "motor-branch-from-nameplate",
    "grounding-electrode",
    // v15
    "pv-interconnection-busbar", "off-grid-battery",
    "voltage-drop-reactance", "power-triangle", "ev-charger-load",
    "ambient-ampacity-adjust", "service-load-optional",
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
    // v9
    "recirc-loop-sizing",
    // v16
    "water-heater-recovery", "wh-expansion-tank", "sanitary-dfu", "trap-primer",
    "backflow-sizing",
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
    // v9
    "outdoor-air-ventilation", "hood-exhaust", "shr-latent",
    // v16
    "chiller-tons", "hx-lmtd-ntu", "air-changes-hour",
    "boiler-pipe-sizing", "compressor-short-cycle", "humidifier-capacity",
    "filter-pressure-drop",
  ]);
  declare("./calc-restoration.js", "RESTORATION_RENDERERS", [
    "psychrometric", "drying-goal", "dehumidifier", "air-movers",
    "water-classes", "drying-times", "mold", "ppe",
    // v2
    "standing-water", "nam-sizing", "hepa-filter-life", "thermal-delta-t",
    // v3
    "containment-air-balance", "chamber-turnover",
    // v9
    "drying-log",
    // v16
    "equipment-power-draw",
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
    // v9
    "excavation-bench-plan",
    // v15
    "header-sizing", "deck-beam-post",
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
    // v9
    "scba-cylinder-time",
    "nfpa-1142-water-supply",
    "confined-space-vent",
    // v15
    "standpipe-pdp", "smoke-ejector-cfm",
  ]);
  declare("./calc-references.js", "REFERENCE_RENDERERS", [
    "color-codes", "knot-reference", "inspection-checklist",
    "emergency-contacts", "tool-maintenance",
    // v3
    "hand-signals", "osha-top10", "loto-steps", "defensible-space",
    "storm-shelter", "triage-quickread",
    // v5 Step 61
    "irs-form-index", "sales-tax-nexus", "osha-recordkeeping", "lab-safety-quickread",
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
    // v9
    "noise-dose",
    // v15
    "pump-tdh", "hydraulic-cylinder", "vbelt-drive", "gear-cascade",
  ]);
  // v4 Group J: Trucking and Logistics.
  declare("./calc-trucking.js", "TRUCKING_RENDERERS", [
    "dim-weight", "freight-density", "pallet-loadout",
    "hos-math", "bridge-formula", "reefer-burn", "incoterm-decoder",
    // v9
    "stopping-sight-distance",
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
    // v9
    "thi-livestock", "sprayer-calibration",
    // v17
    "irrigation-requirement", "cattle-stocking-rate", "grain-bin-capacity",
  ]);
  // v4 Group M: Water and Wastewater Operations.
  declare("./calc-water.js", "WATER_RENDERERS", [
    "pounds-formula", "filter-loading", "detention-time",
    "lab-dilution", "pump-eff-w2w", "srt-fm-ratio",
    // v8
    "coagulant-dose",
    // v9
    "svi-sludge-index", "disinfection-ct",
    // v16
    "pool-turnover", "well-drawdown", "cooling-water-makeup", "chlorine-decay",
  ]);
  // v4 Group N: Stage and Live Production.
  declare("./calc-stage.js", "STAGE_RENDERERS", [
    "truss-capacity", "time-alignment", "dmx-planner",
    "neutral-imbalance", "spl-distance", "rigging-check",
    // v9
    "spl-atmospheric",
  ]);
  // v4 Group O: Kitchen and Food Service.
  declare("./calc-kitchen.js", "KITCHEN_RENDERERS", [
    "recipe-scale", "yield-ep", "cooling-curve",
    "plate-cost", "pan-conversion",
    // v9
    "sous-vide-pasteurization",
  ]);
  // v4 Group P: Field, Backcountry, and SAR.
  declare("./calc-field.js", "FIELD_RENDERERS", [
    "pacing-distance", "bearing-conversion", "slope-avalanche",
    "backcountry-needs", "utm-conversion", "solar-times",
    // v9
    "lightning-countdown", "magnetic-declination",
  ]);
  // v4 Group Q: Historical Reference Data (utility 233).
  declare("./calc-historical.js", "HISTORICAL_RENDERERS", [
    "historical-pricing",
  ]);
  // v5 Group R: Accounting, Tax, and Small-Business (utilities 234-245).
  declare("./calc-accounting.js", "ACCOUNTING_RENDERERS", [
    "straight-line-depreciation", "macrs-depreciation", "section-179",
    "se-tax", "estimated-tax", "payroll-withholding",
    "loan-amortization", "breakeven", "sales-tax-compound",
    "inventory-turnover", "cash-conversion-cycle", "mileage-rollup",
  ]);
  // v5 Group S: Legal Plain-English and Statutory Math (utilities 246-254).
  declare("./calc-legal.js", "LEGAL_RENDERERS", [
    "judgment-interest", "court-deadline", "statute-of-limitations",
    "small-claims-reference", "tenant-notice", "wage-hour",
    "contractor-vs-employee", "contract-clause-reference", "lease-term-reference",
  ]);
  // v5 Group T: Bench Science and Laboratory Math (utilities 255-264).
  declare("./calc-lab.js", "LAB_RENDERERS", [
    "molarity-dilution", "serial-dilution", "molecular-weight", "mass-moles",
    "rcf-rpm", "resuspension-volume", "pcr-master-mix", "beer-lambert",
    "henderson-hasselbalch", "hemocytometer",
  ]);
  // v12 Group U: Veterinary (spec-v12.md §5).
  declare("./calc-vet.js", "VET_RENDERERS", [
    "vet-weight-based-dose", "vet-maintenance-fluid", "vet-energy-requirement",
    "vet-bcs-reference", "vet-pet-age", "vet-gestation",
    "vet-ett-sizing", "vet-anesthesia-vitals", "vet-asa-classification",
    "vet-bloodwork-ranges", "vet-urine-sg", "vet-target-weight-loss",
    "vet-toxicity", "vet-breed-predispositions", "vet-plasma-css",
    "vet-vaccine-schedule", "vet-heartworm-dose", "vet-crystalloid-plan",
  ]);
  // v12 Group V: EMS / Pre-hospital (spec-v12.md §6).
  declare("./calc-ems.js", "EMS_RENDERERS", [
    "glasgow-coma-scale", "parkland-formula", "cincinnati-stroke-scale",
    "apgar-score", "iv-drip-rate", "o2-cylinder-duration",
    "pediatric-weight-estimate", "shock-index", "mean-arterial-pressure",
    "anion-gap", "corrected-calcium", "cha2ds2-vasc",
    "wells-dvt", "wells-pe", "perc-rule",
    "rule-of-9s", "pediatric-vitals", "nihss",
    "start-triage", "drug-concentration",
  ]);
  // v12 Group W: Pilots / Aviation (spec-v12.md §7).
  declare("./calc-aviation.js", "AVIATION_RENDERERS", [
    "density-altitude", "crosswind-component", "ete-eta",
    "hypoxia-altitude", "pressure-altitude", "phonetic-alphabet",
    "fuel-planning", "wind-triangle", "top-of-descent",
    "weather-phrasing", "transponder-codes", "standard-turn-rate",
    "true-airspeed", "sectional-symbols", "aircraft-category",
    "magnetic-variation", "metar-decoder", "taf-decoder",
  ]);
  // v12 Group X: Real Estate (spec-v12.md §8).
  declare("./calc-realestate.js", "REALESTATE_RENDERERS", [
    "ltv", "dti", "piti",
    "exchange-1031-timeline", "section-121-exclusion", "property-tax",
    "cap-rate-dscr", "cash-on-cash", "commission-split",
    "amortization-schedule", "cost-of-waiting", "closing-costs",
    "rental-worksheet",
    "loan-limits", "hud-fmr",
  ]);
  // v12 Group Y: Educators / K-12 (spec-v12.md §9).
  declare("./calc-edu.js", "EDU_RENDERERS", [
    "readability",
    "statistics-quickread",
    "quadratic-formula",
    "scientific-notation",
    "significant-figures",
    "codon-table",
    "base-converter",
    "gpa-calculator",
    "confidence-interval",
    "linear-system-2x2",
    "lexile-band",
    "standards-based-grade",
    "bell-curve-zscore",
    "alternate-readability",
    "periodic-element",
    // v17
    "pearson-correlation",
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
  // v12 Group X: real-estate data shards (FHFA / HUD / VA, FY2026 cycle).
  "loan-limits": { folder: "realestate", shard: "loan-limits.json", label: "FHFA + HUD FHA loan limits, 2026 cycle (federal-published)" },
  "hud-fmr": { folder: "realestate", shard: "hud-fmr.json", label: "HUD Fair Market Rents, FY2026 (federal-published)" },
};

const TRADES = ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire", "trucking", "mechanic", "agriculture", "water", "stage", "kitchen", "field", "reference", "accounting", "small-business", "tax", "legal", "lab", "compliance"];
const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y"];

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
  R: "Accounting, Tax, and Small-Business",
  S: "Legal Plain-English and Statutory Math",
  T: "Bench Science and Laboratory Math",
  U: "Veterinary",
  V: "EMS and Pre-hospital",
  W: "Pilots and General Aviation",
  X: "Real Estate",
  Y: "Educators and K-12",
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
  // v9 Group A extensions.
  { id: "arc-flash-screen", name: "Arc-Flash Incident-Energy Screen (Lee 1982)", group: "A", trades: ["electrical"], desc: "Simplified pre-IEEE-1584 incident-energy estimate and PPE band. Screen only; not an IEEE 1584 study." },
  { id: "motor-branch-from-nameplate", name: "Motor Branch-Circuit from Nameplate", group: "A", trades: ["electrical"], desc: "Compute full-load current from HP / V / eta / PF; flag the design value as the larger of computed vs nameplate; 125% branch-conductor + overload sizing." },
  { id: "grounding-electrode", name: "Grounding Electrode Resistance (Dwight / IEEE 142)", group: "A", trades: ["electrical"], desc: "Driven rod / ring / plate / Ufer resistance to earth from soil resistivity, with the 25-ohm NEC advisory and a supplemental-electrode count." },
  { id: "pv-interconnection-busbar", name: "PV Interconnection 120% Busbar Rule", group: "A", trades: ["electrical"], desc: "Load-side PV breaker check against the NEC 705.12 busbar limit (120% opposite-end allowance / 100% otherwise), with the supply-side 705.11 alternative." },
  { id: "off-grid-battery", name: "Off-Grid Battery Bank Sizing", group: "A", trades: ["electrical"], desc: "Required nameplate capacity (Wh and Ah) from daily load, days of autonomy, depth-of-discharge, and round-trip efficiency, per IEEE 1013 / 1561." },
  { id: "voltage-drop-reactance", name: "Voltage Drop With Reactance", group: "A", trades: ["electrical"], desc: "Single- or three-phase voltage drop using NEC Chapter 9 Table 9 R and X per 1000 ft and the load power factor, with the 3% / 5% advisory band." },
  { id: "power-triangle", name: "Power Triangle Solver (kW / kVA / kVAR / PF)", group: "A", trades: ["electrical"], desc: "Solve the full AC power triangle from any two of real power, apparent power, reactive power, power factor, or phase angle, with a phasor diagram." },
  { id: "ev-charger-load", name: "EV Charger Continuous Load and Panel Impact", group: "A", trades: ["electrical"], desc: "Continuous-load circuit ampacity (125% per NEC 625.41/625.42), breaker, conductor, new panel total, and headroom for an EVSE." },
  { id: "ambient-ampacity-adjust", name: "Conductor Ambient and Fill Ampacity Adjustment", group: "A", trades: ["electrical"], desc: "Adjusted ampacity after the NEC 310.15(B)(1) ambient-temperature and 310.15(C)(1) more-than-three-conductors correction factors." },
  { id: "service-load-optional", name: "Service Load Calculation (NEC 220.82 Optional Method)", group: "A", trades: ["electrical"], desc: "Optional-method dwelling demand (first 10 kVA at 100% + remainder at 40% + larger HVAC), compared to the standard 220.42 method." },

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
  { id: "recirc-loop-sizing", name: "Hot Water Recirc Loop Sizing (ASPE)", group: "B", trades: ["plumbing"], desc: "Per ASPE Data Book Vol. 4 Ch. 6: derives heat-loss rate, required GPM from set-point delta, friction head via Hazen-Williams, and recommended pump size from loop length / pipe size / insulation / temperatures. ASHRAE 90.1-2022 §7.4.4 governs recirc control." },
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
  // v16 Group B expansion
  { id: "water-heater-recovery", name: "Water Heater Recovery Rate", group: "B", trades: ["plumbing"], desc: "Recovery gph and AHRI first-hour rating from input rating, efficiency, and temperature rise. gph = input BTU/hr x efficiency / (8.33 x delta-T). Per DOE 10 CFR 430 / AHRI 1300." },
  { id: "wh-expansion-tank", name: "Water Heater Thermal Expansion Tank", group: "B", trades: ["plumbing"], desc: "Potable closed-system expansion volume and required tank size from heater capacity, temperatures, and incoming pressure. Per ASPE PEDH Ch. 6 / ASME B40.1 steam tables; IPC 604.8 PRV note." },
  { id: "sanitary-dfu", name: "Sanitary Drain DFU Sizing", group: "B", trades: ["plumbing"], desc: "Total drainage fixture units from a fixture list and the minimum pipe size for a horizontal branch, vertical stack, or building drain. Per IPC 2021 §710 with Table 709.1 DFU values." },
  { id: "trap-primer", name: "Trap Primer Sizing", group: "B", trades: ["plumbing"], desc: "Primer / distribution-unit count, annual water use, and an IPC 1002.4 occupied-space compliance check for floor-drain trap seals. Manufacturer flow rates govern." },
  { id: "backflow-sizing", name: "Backflow Assembly Sizing Screen", group: "B", trades: ["plumbing"], desc: "Hazard-driven assembly selection (RP required for any high / health hazard per IPC 312), head loss at design flow from the bundled assembly curves, the pressure remaining downstream, and the EPA 40 CFR 141.85 / AWWA M14 annual-test reminder." },

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
  // v9 Group C extensions.
  { id: "outdoor-air-ventilation", name: "ASHRAE 62.1 Outdoor-Air Ventilation", group: "C", trades: ["hvac"], desc: "Breathing-zone and zone outdoor airflow per ASHRAE 62.1 §6.2.2.1. User supplies Rp / Ra from the AHJ-adopted edition; the tile does not bundle Table 6-1." },
  { id: "hood-exhaust", name: "Commercial Kitchen Hood Exhaust (IMC 507)", group: "C", trades: ["hvac"], desc: "Type I (grease) and Type II (vapor-only) commercial-kitchen hood exhaust airflow per IMC 2021 §507.13 / §507.20 duty multipliers. Makeup air, duct area, grease-duct slope reminder. NFPA 96 governs grease-handling exhaust system design." },
  { id: "shr-latent", name: "Sensible Heat Ratio / Latent Split (ASHRAE)", group: "C", trades: ["hvac"], desc: "Field tile: given total cooling Btu/hr, return-air dry / wet-bulb, supply dry-bulb, CFM, and altitude, returns sensible / latent split (1.08 / 4840 coefficients with altitude correction), SHR, and return / supply humidity ratios (grains/lb). Companion to the shr tile which takes both Q values directly. Per ASHRAE Fundamentals 2021 Ch. 1 / Ch. 18." },
  // v7 Group C extensions (utilities 242-245).
  { id: "duct-friction-static", name: "Duct Friction Loss and Static Pressure", group: "C", trades: ["hvac"], desc: "Darcy-Weisbach with Swamee-Jain Colebrook; round or rectangular; fitting losses from a C_o library; total external static." },
  { id: "refrigerant-charging", name: "Refrigerant Superheat / Subcooling (psig-psia toggle)", group: "C", trades: ["hvac"], desc: "Saturation T from bundled P-T tables (R-410A / R-32 / R-454B / R-22 / R-134a); per-input psig vs psia toggle; in-range / low / high flags." },
  { id: "cooling-tower", name: "Cooling Tower Approach and Range", group: "C", trades: ["hvac"], desc: "Range, approach, heat rejection (gpm × 500 × range BTU/hr), and fan kW per ton against typical 5-10 °F approach / 8-12 °F range targets." },
  { id: "insulation-heat-loss", name: "Pipe Insulation Heat Loss (bare vs insulated)", group: "C", trades: ["hvac"], desc: "Cylindrical conduction + convection + radiation; effectiveness % vs bare; six insulation k-values with manufacturer attribution." },

  // v16 Group C extensions (first-principles mechanical batch).
  { id: "chiller-tons", name: "Chiller Tonnage (Delta-T and GPM)", group: "C", trades: ["hvac"], desc: "Cooling capacity (tons, BTU/hr, kW) from chilled-water flow and the entering/leaving temperature split; required flow at a nameplate tonnage; water and 30/50% propylene-glycol factors. Q = GPM × 500 × delta-T (water); fluid factors per ASHRAE Fundamentals 2021 Ch. 31." },
  { id: "hx-lmtd-ntu", name: "Heat Exchanger LMTD and Effectiveness-NTU", group: "C", trades: ["hvac"], desc: "Log-mean temperature difference, heat duty, required UA, effectiveness, NTU, and capacity-rate ratio for counter-flow or parallel-flow from four temperatures and the two flows. Per the TEMA standards and standard heat-transfer texts." },
  { id: "air-changes-hour", name: "Air Changes per Hour (ACH)", group: "C", trades: ["hvac"], desc: "ACH = CFM × 60 / volume, net delivered ACH and pressurization airflow from unequal supply/return, and a comparison against ASHRAE 62.1 / 170 occupancy targets (residential to operating room)." },
  { id: "boiler-pipe-sizing", name: "Boiler Distribution Pipe Sizing", group: "C", trades: ["hvac", "plumbing"], desc: "Hydronic GPM = Q / (500 × delta-T), the smallest copper / steel / PEX size at or below the velocity ceiling, velocity, Hazen-Williams head loss per 100 ft, and pump head at the run length. Per ASHRAE Systems and Equipment 2020 Ch. 13." },
  { id: "compressor-short-cycle", name: "Compressor Short-Cycle Protection", group: "C", trades: ["hvac"], desc: "Estimated cycles per hour from the ASHRAE/AHRI part-load cycling parabola, on/off time, and the minimum oil-return runtime and pressure-equalization delay by system type, flagging oversized single-stage short-cycling. Per Copeland AE Bulletin 17-1226." },
  { id: "humidifier-capacity", name: "Humidifier Capacity (RH Target)", group: "C", trades: ["hvac"], desc: "Moisture addition (lb/hr, gal/day) and latent load from supply CFM and the entering-to-target RH rise, with altitude-corrected humidity ratios. Per ASHRAE Fundamentals 2021 Ch. 1 psychrometrics." },
  { id: "filter-pressure-drop", name: "Filter Pressure Drop and Fan-Energy Penalty", group: "C", trades: ["hvac"], desc: "Clean and change-out pressure drop by MERV / HEPA class (velocity-scaled, user-overridable cut-sheet defaults), the fan power at each via brake-HP, and the annual fan energy and loading penalty over a clean filter. Per ASHRAE 52.2-2017 and first-principles fan power." },

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
  { id: "drying-log", name: "Drying Log (IICRC S500 Boundary Test)", group: "D", trades: ["restoration"], desc: "Multi-row drying log: ambient / chamber paired daily readings, per-day boundary-humidity pass (chamber GPP must trend below ambient GPP), chamber GPP trend slope (GPP/day), and dry-down completion estimate. Up to 14 readings. Per IICRC S500-2021." },
  { id: "equipment-power-draw", name: "Equipment Power Draw vs Circuit Capacity", group: "D", trades: ["restoration", "electrical"], desc: "Total continuous amperage from LGR dehumidifier / air-mover / HEPA-scrubber / heat-dryer counts (representative nameplate defaults), the NEC 210.20(A) 80%-continuous limit per breaker, and the number of 15 / 20 / 30 A circuits required, flagging any single unit too large for its own circuit. Per NEC 2023." },

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
  // v9 Group E extensions.
  { id: "excavation-bench-plan", name: "Excavation Slope and Bench-Step Plan", group: "E", trades: ["carpentry"], desc: "OSHA Appendix B slope ratios A 0.75:1 / B 1:1 / C 1.5:1 turned into spoil volume (yd^3), surface footprint, and bench-step layout. Competent person on-site governs the final plan." },
  // v15 Group E close (carpentry / structural).
  { id: "header-sizing", name: "Window / Door Header Sizing (IRC R602.7)", group: "E", trades: ["carpentry"], desc: "Smallest built-up dimension-lumber header (double / triple 2x6-2x12) from tributary load, span, snow, and species, with the AWC NDS bending / L-360 deflection check and IRC R602.7.5 jack-stud count." },
  { id: "deck-beam-post", name: "Deck Beam and Post Sizing (IRC R507)", group: "E", trades: ["carpentry"], desc: "Deck beam ply and size, post size (4x4 / 6x6) from an NDS column check, footing size from soil bearing, and the IRC R507.9.1.3 ledger fastener spacing." },
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
  // v9 Group F extensions.
  { id: "scba-cylinder-time", name: "SCBA Cylinder Work Time", group: "F", trades: ["fire"], desc: "Time to low-air alarm and to empty from rated scf, current pressure, alarm pressure, and consumption rate. NFPA 1981 governs cylinder ratings; exit at the alarm, not at empty." },
  { id: "nfpa-1142-water-supply", name: "NFPA 1142 Rural Water Supply", group: "F", trades: ["fire"], desc: "Minimum on-site water supply Q = (V * occupancy * construction) / 5 per NFPA 1142 §5, with 1.5x exposure and 0.5x sprinkler multipliers; recommended tanker trip count." },
  { id: "confined-space-vent", name: "Confined-Space Pre-Entry Ventilation (OSHA 1910.146)", group: "F", trades: ["fire", "restoration", "plumbing"], desc: "L x W x H volume, contaminant-driven target ACH (combustible / O2-deficient / H2S / CO / general), minutes-to-purge and steady-state ACH, plus the 1910.146(d)(5) 4-gas-meter reminder. Companion to the v3 confined-space-purge tile." },
  // v15 Group F close (fire-ground engineering).
  { id: "standpipe-pdp", name: "Standpipe Pump Discharge Pressure (NFPA 14)", group: "F", trades: ["fire"], desc: "Required pump discharge pressure = nozzle pressure + supply-hose friction (NFA CQ^2L) + appliance loss + elevation (0.434 psi/ft), with a high-rise flag. SOP and incident command govern." },
  { id: "smoke-ejector-cfm", name: "Smoke Ejector / Ventilation CFM (NFPA 1500)", group: "F", trades: ["fire", "restoration"], desc: "Required CFM for a target air-change rate, fans needed, time to one air change, and the exhaust-to-entry opening ratio for negative-pressure ventilation. SOP and incident command govern." },

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
  // v9 Group G extensions.
  { id: "noise-dose", name: "OSHA 1910.95 Noise Dose and TWA", group: "G", trades: ["carpentry", "fire", "restoration", "hvac", "electrical"], desc: "Multi-row workshift dose with the OSHA 5 dB exchange formula, 8-hr TWA, and pass / fail against the 85 dBA action level and 90 dBA PEL." },
  { id: "vehicle-load", name: "Vehicle Load Distribution", group: "G", trades: ["carpentry", "fire"], desc: "Front and rear axle weights with GVWR / GAWR flags." },
  // v15 Group G extensions (cross-trade mechanical / hydraulic).
  { id: "pump-tdh", name: "Pump Total Dynamic Head (TDH)", group: "G", trades: ["plumbing", "hvac", "fire"], desc: "Total dynamic head from static lift, static discharge, and Hazen-Williams suction / discharge / fittings friction, with a pump-curve operating point." },
  { id: "hydraulic-cylinder", name: "Hydraulic Cylinder Force and Speed", group: "G", trades: ["mechanic", "carpentry"], desc: "Cylinder force, extend / retract speed, oil per stroke, and cycle time from bore, rod, pressure, and pump flow (NFPA T2.13.7)." },
  { id: "vbelt-drive", name: "V-Belt Sheave and Drive Sizing", group: "G", trades: ["mechanic", "hvac"], desc: "Speed ratio, driven pitch diameter, belt length, service-factor design HP, and a belt-count planning estimate (ANSI/RMA IP-20 / IP-22)." },
  { id: "gear-cascade", name: "Gear Ratio and RPM Cascade", group: "G", trades: ["mechanic"], desc: "Per-stage and overall ratio, output RPM, and output torque across up to four gear stages with a per-stage efficiency." },

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
  // v9 Group J extensions.
  { id: "stopping-sight-distance", name: "Stopping Sight Distance (AASHTO)", group: "J", trades: ["trucking"], desc: "AASHTO Green Book SSD = perception-reaction + braking distance from speed, friction, and grade. State DOT design tables round these numbers." },

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
  // v9 Group L extensions.
  { id: "thi-livestock", name: "Temperature-Humidity Index (Livestock)", group: "L", trades: ["agriculture"], desc: "USDA-ARS THI from temperature and RH, with species-specific heat-stress band (dairy / beef / hog / poultry / horse) and a recommended cooling intervention." },
  { id: "sprayer-calibration", name: "Sprayer 1/128-Acre Calibration", group: "L", trades: ["agriculture"], desc: "USDA Extension 1/128-acre method: boom width determines travel distance, ounces collected per nozzle equals GPA, speed adjustment closes to a target rate." },
  { id: "irrigation-requirement", name: "Irrigation Requirement (ET-based, acre-feet)", group: "L", trades: ["agriculture"], desc: "Crop ET demand (Kc x ET0 x days), net and gross irrigation depth after rainfall and application efficiency, and total acre-feet / gallons over the field. Per FAO Irrigation and Drainage Paper 56 and the USDA NRCS Irrigation Guide; reference ET0 from your local station." },
  { id: "cattle-stocking-rate", name: "Cattle Stocking Rate (AUM)", group: "L", trades: ["agriculture"], desc: "Available forage (production x area x utilization), animal-unit-months of carrying capacity, head supported, and grazing days for a herd, by animal class. Per the USDA NRCS National Range and Pasture Handbook Ch. 6." },
  { id: "grain-bin-capacity", name: "Grain Bin Capacity (Bushels)", group: "L", trades: ["agriculture"], desc: "Cylinder plus cone volume of a round bin in cubic feet and bushels (ft^3 x 0.8036), and weight by grain test weight (corn / wheat / soybeans / oats). Bin geometry first-principles; USDA FGIS test-weight standards." },

  // Group M: Water and Wastewater Operations (v4)
  { id: "pounds-formula", name: "Pounds Formula", group: "M", trades: ["water"], desc: "lb/day = MGD * mg/L * 8.34, with adjusted product feed at the chemical's purity." },
  { id: "filter-loading", name: "Filter Loading Rate and Backwash", group: "M", trades: ["water"], desc: "Loading rate, backwash flow, and rapid-sand vs high-rate category." },
  { id: "detention-time", name: "Detention Time", group: "M", trades: ["water"], desc: "Detention time = volume / flow in min, hr, days; pass/fail vs target." },
  { id: "lab-dilution", name: "Lab Dilution and Serial Dilution", group: "M", trades: ["water"], desc: "C1V1 = C2V2 missing-side solve; serial dilution series with per-step concentrations." },
  { id: "pump-eff-w2w", name: "Pump Wire-to-Water Efficiency", group: "M", trades: ["water", "plumbing"], desc: "Water HP, brake HP estimate, and wire-to-water % with good/ok/degraded category." },
  { id: "srt-fm-ratio", name: "SRT and F/M Ratio", group: "M", trades: ["water"], desc: "Solids retention time and food-to-microorganism ratio with conventional-activated-sludge check." },
  // v8 Phase E.5 (utility 257).
  { id: "coagulant-dose", name: "Coagulant Dose from Jar Test", group: "M", trades: ["water"], desc: "Pure equivalent + product feed (lb/day, gal/day) for alum, ferric chloride, or PAC at the jar-test optimal dose." },
  // v9 Group M extensions.
  { id: "svi-sludge-index", name: "Sludge Volume Index (SVI)", group: "M", trades: ["water"], desc: "SVI = SV30 * 1000 / MLSS in mL/g, with operator-typical operational bands (typical / pin floc / filamentous / bulking). Companion to the srt-fm-ratio tile." },
  { id: "disinfection-ct", name: "Disinfection CT (USEPA SWTR)", group: "M", trades: ["water"], desc: "CT achieved (C * t10) compared to USEPA SWTR Guidance Manual required CT for 3-log Giardia inactivation by temperature and pH. Bundled <= 0.4 mg/L free-chlorine table; state primacy agency table governs final compliance." },

  // v16 Group M extensions (first-principles small-system-operator batch).
  { id: "pool-turnover", name: "Pool Turnover Rate and Chlorine Demand", group: "M", trades: ["water"], desc: "Required pump flow from pool volume and turnover target, plus the chlorine product to dose a free-chlorine target (cal-hypo / trichlor / liquid bleach). Per the NSPF CPO Handbook and ANSI/APSP/ICC 11." },
  { id: "well-drawdown", name: "Well Drawdown and Specific Capacity", group: "M", trades: ["water"], desc: "Drawdown, specific capacity (GPM per ft), and recommended pump-setting depth, with a marginal-well flag below 0.5 GPM/ft. Per AWWA A100 and USGS OFR 02-197." },
  { id: "cooling-water-makeup", name: "Cooling Water Makeup (Cycles of Concentration)", group: "M", trades: ["water", "hvac"], desc: "Evaporation, blowdown, drift, and total makeup flow from recirculation, range, and cycles of concentration, with scaling and drift flags. Per CTI and ASHRAE Systems and Equipment 2020 Ch. 40." },
  { id: "chlorine-decay", name: "Chlorine Residual Decay (First-Order)", group: "M", trades: ["water"], desc: "First-order residual C(t) = C0 x exp(-k t), time to a target residual, and an optional booster distance. Per EPA 815-R-02-020 and AWWA M14; 40 CFR 141.74 governs the extremity residual." },

  // Group N: Stage and Live Production (v4)
  { id: "truss-capacity", name: "Truss Point Load and Span Capacity", group: "N", trades: ["stage", "carpentry"], desc: "UDL capacity from manufacturer curves; reactions, equivalent-UDL safety factor, pass/fail." },
  { id: "time-alignment", name: "Audio Speaker Time Alignment", group: "N", trades: ["stage"], desc: "Required delay-tower delay (ms) from speed-of-sound formula; Haas-window offset." },
  { id: "dmx-planner", name: "DMX-512 Address and Universe Planner", group: "N", trades: ["stage"], desc: "Per-fixture channel ranges, universe utilization, conflict and overflow detection." },
  { id: "neutral-imbalance", name: "Three-Phase Neutral Imbalance and Distro", group: "N", trades: ["stage", "electrical"], desc: "Neutral current estimate, imbalance percent, harmonic-load warning." },
  { id: "spl-distance", name: "SPL and Inverse Square Law", group: "N", trades: ["stage"], desc: "L2 = L1 - 20 log10(d2/d1) with free-field / hemispherical / indoor mode adjustment." },
  { id: "rigging-check", name: "Rigging Capacity Quick Check", group: "N", trades: ["stage", "fire"], desc: "WLL at angle for shackles / slings / span sets / hoists with safety factor and pass/fail." },
  { id: "spl-atmospheric", name: "SPL with Atmospheric Absorption (ANSI S1.26)", group: "N", trades: ["stage"], desc: "Far-field SPL with per-octave-band atmospheric absorption (alpha dB/m) per ANSI S1.26-2014 (R2019). Octave breakdown 125 Hz to 8 kHz; companion to the v1 spl-distance tile (inverse-square only)." },

  // Group O: Kitchen and Food Service (v4)
  { id: "recipe-scale", name: "Recipe Scaling", group: "O", trades: ["kitchen"], desc: "Scaled rows preserving units; converts to grams via USDA reference weights when scaling produces awkward numbers." },
  { id: "yield-ep", name: "Yield Percentage and Edible Portion", group: "O", trades: ["kitchen"], desc: "Yield %, EP weight, and EP cost per lb from AP weight, trim, and cooking loss." },
  { id: "cooling-curve", name: "Food Safety Cooling Curve", group: "O", trades: ["kitchen"], desc: "Estimated 135->70 F and 70->41 F cooling time with FDA Food Code 2022 pass/fail." },
  { id: "plate-cost", name: "Plate Cost and Menu Pricing", group: "O", trades: ["kitchen"], desc: "Plate cost, suggested menu price at target food-cost %, contribution margin, sanity flag." },
  { id: "pan-conversion", name: "Steam Table and Pan Conversion", group: "O", trades: ["kitchen"], desc: "Pan capacity in qt, count of pans needed, servings per pan, cooling-depth warning." },
  // v9 Group O extensions.
  { id: "sous-vide-pasteurization", name: "Sous-Vide Pasteurization Time", group: "O", trades: ["kitchen"], desc: "Come-up + hold time from thickness, bath temp, and food category (poultry / pork / beef / fish / egg). FDA Annex 6 6.5-log Salmonella reduction. Simplified screen; not a HACCP plan." },

  // Group P: Field, Backcountry, and SAR (v4)
  { id: "pacing-distance", name: "Pacing and Distance", group: "P", trades: ["field", "fire"], desc: "Distance from pace count with terrain correction; reference table per stride length." },
  { id: "bearing-conversion", name: "Magnetic Declination and Bearing Conversion", group: "P", trades: ["field"], desc: "Magnetic-to-true and true-to-magnetic with east-is-least / west-is-best memo." },
  { id: "slope-avalanche", name: "Slope Angle and Avalanche Risk Window", group: "P", trades: ["field"], desc: "Slope angle, slope %, and 30-45 deg avalanche start-zone flag." },
  { id: "backcountry-needs", name: "Backcountry Water and Caloric Requirement", group: "P", trades: ["field"], desc: "Water (L) and kcal per person per day with trip totals." },
  { id: "utm-conversion", name: "UTM and Lat-Lon Conversion", group: "P", trades: ["field"], desc: "Krueger / USGS deterministic forward and inverse formulas (WGS84)." },
  { id: "solar-times", name: "Sunrise, Sunset, and Civil Twilight", group: "P", trades: ["field"], desc: "NOAA solar-position algorithm: sunrise, sunset, civil / nautical / astronomical twilight, daylight minutes." },
  // v9 Group P extensions.
  { id: "lightning-countdown", name: "Lightning 30-30 Rule Countdown", group: "P", trades: ["field"], desc: "NWS 30-30 rule: seconds between flash and thunder -> distance in miles and seek-shelter advisory. Sound speed ~1125 ft/s." },
  { id: "magnetic-declination", name: "Magnetic Declination (WMM2025)", group: "P", trades: ["field"], desc: "Local magnetic declination, inclination, field intensity, and annual change from latitude, longitude, date, and (optional) altitude. NOAA NCEI World Magnetic Model 2025; valid 2025-2030. Bearing-correction helper built in." },

  // Group Q: Historical Reference Data (v4)
  { id: "historical-pricing", name: "Historical Pricing Context", group: "Q", trades: ["reference"], desc: "Bundled monthly history per commodity (BLS PPI / EIA / USDA NASS / FRED) with 25 / 50 / 75 / 90 percentile bands over a user-selected lookback. Reference only; no live fetch." },

  // Group R: Accounting, Tax, and Small-Business (v5)
  { id: "straight-line-depreciation", name: "Straight-Line Depreciation", group: "R", trades: ["accounting", "small-business", "tax"], desc: "Annual depreciation, accumulated through year, and book value from cost / salvage / life. IRS Pub 946 Chapter 1 by name." },
  { id: "macrs-depreciation", name: "MACRS Depreciation", group: "R", trades: ["accounting", "small-business", "tax"], desc: "Per-year MACRS depreciation, accumulated, and book value by class life and convention. IRS Pub 946 Tables A-1." },
  { id: "section-179", name: "Section 179 and Bonus Depreciation", group: "R", trades: ["accounting", "small-business", "tax"], desc: "Allowable Section 179 (cap, phase-out, taxable-income limit), bonus depreciation, and remaining basis to MACRS." },
  { id: "se-tax", name: "Self-Employment Tax (Schedule SE)", group: "R", trades: ["accounting", "small-business", "tax"], desc: "92.35% net-earnings adjustment, Social Security cap, Additional Medicare 0.9%, deductible half." },
  { id: "estimated-tax", name: "Quarterly Estimated Tax", group: "R", trades: ["accounting", "small-business", "tax"], desc: "Safe-harbor required annual payment, per-quarter installment, and IRS 1040-ES due dates." },
  { id: "payroll-withholding", name: "Payroll Tax Withholding (Simplified)", group: "R", trades: ["accounting", "small-business", "tax"], desc: "Federal income tax (Pub 15-T percentage method), employee FICA, Additional Medicare. Single-filer brackets bundled." },
  { id: "loan-amortization", name: "Loan Amortization Schedule", group: "R", trades: ["accounting", "small-business"], desc: "Month-by-month principal / interest / balance with optional extra-principal payment, total interest, payoff month." },
  { id: "breakeven", name: "Breakeven and Contribution Margin", group: "R", trades: ["accounting", "small-business"], desc: "Breakeven units, breakeven revenue, contribution margin per unit, CM ratio, margin of safety." },
  { id: "sales-tax-compound", name: "Sales Tax Compounding and Reverse", group: "R", trades: ["accounting", "small-business"], desc: "Pre-tax / post-tax / tax with combined state + local rate. Reverse from a receipt total." },
  { id: "inventory-turnover", name: "Inventory Turnover and DSI", group: "R", trades: ["accounting", "small-business"], desc: "Turnover ratio, days sales of inventory, comparison against bundled industry median (Census ARTS / SBA)." },
  { id: "cash-conversion-cycle", name: "Cash Conversion Cycle", group: "R", trades: ["accounting", "small-business"], desc: "CCC = DIO + DSO - DPO with per-component contribution." },
  { id: "mileage-rollup", name: "Mileage Log Roll-Up", group: "R", trades: ["accounting", "small-business", "tax"], desc: "Total business miles, deductible at the published IRS standard rate, optional odometer cross-check." },

  // Group S: Legal Plain-English and Statutory Math (v5)
  { id: "judgment-interest", name: "Statutory Judgment Interest", group: "S", trades: ["legal", "small-business"], desc: "Interest accrued on a money judgment per state rule (simple or compound). Optional partial payments under the U.S. Rule (interest first, then principal)." },
  { id: "court-deadline", name: "Court-Day and Calendar-Day Deadline", group: "S", trades: ["legal"], desc: "Compute a deadline N days from a trigger date. Calendar or court days. Federal weekend / holiday rollover per Fed. R. Civ. P. 6(a)." },
  { id: "statute-of-limitations", name: "Statute of Limitations Quick-Read", group: "S", trades: ["legal", "small-business"], desc: "Plain-English statute of limitations by state and claim type. Citation to the state code section. Original summary." },
  { id: "small-claims-reference", name: "Small Claims Court Reference", group: "S", trades: ["legal", "small-business"], desc: "Jurisdictional dollar maximum, filing-fee range, and whether attorneys are permitted, by state. Original summary." },
  { id: "tenant-notice", name: "Tenant Notice and Cure-Period", group: "S", trades: ["legal"], desc: "Statutory notice period and cure-period rule by state and notice type. Self-help eviction warning." },
  { id: "wage-hour", name: "Wage and Hour (FLSA, Tipped, State Min)", group: "S", trades: ["legal", "small-business"], desc: "Regular pay, overtime at 1.5x, FLSA tip-credit makeup, higher of state and federal minimum wage." },
  { id: "contractor-vs-employee", name: "Contractor vs. Employee", group: "S", trades: ["legal", "small-business"], desc: "Deterministic categorical result for the IRS 20-factor test or the ABC test, from a checklist." },
  { id: "contract-clause-reference", name: "Plain-English Contract Clause Reference", group: "S", trades: ["legal", "small-business"], desc: "Original plain-English summary of common boilerplate clauses (indemnity, LoL, arbitration, force majeure, etc.). What it does, what to look for." },
  { id: "lease-term-reference", name: "Plain-English Lease Term Reference", group: "S", trades: ["legal", "small-business"], desc: "Original plain-English summary of common lease terms (rent, security deposit, CAM, holdover, etc.). What it does, what to look for." },

  // Group T: Bench Science and Laboratory Math (v5)
  { id: "molarity-dilution", name: "Molarity and Dilution (C1V1=C2V2)", group: "T", trades: ["lab"], desc: "Solve for the missing fourth from any three of stock concentration, stock volume, final concentration, final volume." },
  { id: "serial-dilution", name: "Serial Dilution Planner", group: "T", trades: ["lab"], desc: "Per-tube transfer volume, per-tube diluent volume, and resulting concentration at each step." },
  { id: "molecular-weight", name: "Molecular Weight from Formula", group: "T", trades: ["lab"], desc: "Client-side parser handling parentheses and subscripts. IUPAC standard atomic weights bundled." },
  { id: "mass-moles", name: "Mass-to-Moles and Moles-to-Mass", group: "T", trades: ["lab"], desc: "Solve for the missing third from mass, moles, and molecular weight." },
  { id: "rcf-rpm", name: "Centrifuge RPM and RCF", group: "T", trades: ["lab"], desc: "RCF (g) = 1.118e-5 * r(cm) * RPM^2. Both directions. Bundled rotor radii." },
  { id: "resuspension-volume", name: "Resuspension Volume", group: "T", trades: ["lab"], desc: "Diluent volume to add given lyophilized mass and target concentration." },
  { id: "pcr-master-mix", name: "PCR Master Mix", group: "T", trades: ["lab"], desc: "Per-component master-mix volume for N reactions with a pipetting fudge factor." },
  { id: "beer-lambert", name: "Beer-Lambert Concentration", group: "T", trades: ["lab"], desc: "Concentration from absorbance, path length, and molar extinction coefficient." },
  { id: "henderson-hasselbalch", name: "Henderson-Hasselbalch Buffer", group: "T", trades: ["lab"], desc: "Conjugate-base / acid ratio and moles for a target pH. Bundled pKa for common laboratory buffers." },
  { id: "hemocytometer", name: "Hemocytometer Cell Count", group: "T", trades: ["lab"], desc: "Cells per mL from squares counted; optional trypan blue viability percent." },

  // v12 Group U: Veterinary. Math aids only; the attending
  // veterinarian governs. Every tile renders the §B.1 limitation
  // banner.
  { id: "vet-weight-based-dose", name: "Vet Weight-Based Dose", group: "U", trades: ["veterinary"], desc: "Total mg and draw-volume from a user-supplied mg/kg dose and stock concentration. No drug list bundled; dose and concentration come from the current formulary." },
  { id: "vet-maintenance-fluid", name: "Vet Maintenance Fluid Rate", group: "U", trades: ["veterinary"], desc: "Maintenance + replacement + ongoing-loss infusion rate for dog / cat / horse / cow per the Holliday-Segar small-animal adaptation. Drops/min on 60 and 10 gtt/mL sets." },
  { id: "vet-energy-requirement", name: "Vet RER / MER (Caloric Need)", group: "U", trades: ["veterinary"], desc: "Resting (RER = 70 * weight_kg^0.75) and maintenance (MER = RER * activity factor) energy requirement per AAHA / AAFP life-stage guidelines. Cups/day if diet kcal/cup is supplied." },
  { id: "vet-bcs-reference", name: "Vet Body Condition Score Reference (1-9)", group: "U", trades: ["veterinary"], desc: "Per-band verbal anchors for the AAHA / WSAVA / AAFP 1-9 BCS scale. Dog and cat scales side-by-side." },
  { id: "vet-pet-age", name: "Vet Pet Age to Human-Equivalent", group: "U", trades: ["veterinary"], desc: "AAHA / AAFP piecewise scheme (15 in year 1, 24 by year 2, then +size-band factor per year). Replaces the incorrect '7 human years per dog year' shortcut." },
  { id: "vet-gestation", name: "Vet Pregnancy Gestation", group: "U", trades: ["veterinary"], desc: "Estimated due date and likely range from a breeding date. Dog 63, cat 65, horse 340, cow 283 days (mean with species range)." },
  { id: "vet-ett-sizing", name: "Vet ETT and IV Catheter Sizing", group: "U", trades: ["veterinary"], desc: "Species + weight banded ETT internal diameter (mm), tube length (cm), and IV catheter gauge per BSAVA / Plumb's anesthesia reference tables." },
  { id: "vet-anesthesia-vitals", name: "Vet Anesthesia Monitoring Vitals", group: "U", trades: ["veterinary"], desc: "Normal-range reference for HR / RR / MAP / SpO2 / ETCO2 under inhalant anesthesia by species (dog / cat / horse / cow)." },
  { id: "vet-asa-classification", name: "Vet ASA Physical Status (I-V)", group: "U", trades: ["veterinary"], desc: "ASA Physical Status classification (I-V plus E emergency modifier) with descriptions; risk-stratified anesthetic planning aid." },
  { id: "vet-bloodwork-ranges", name: "Vet Bloodwork Reference Ranges", group: "U", trades: ["veterinary"], desc: "Typical adult CBC and chemistry reference bands for dog / cat / horse / cow per IDEXX, Antech, VetScan, and the Merck Veterinary Manual. Reporting lab range is the value of record." },
  { id: "vet-urine-sg", name: "Vet Urine Specific Gravity Bands", group: "U", trades: ["veterinary"], desc: "Hyposthenuric / isosthenuric / minimally concentrated / well concentrated USG bands by species per Stockham + Scott and IRIS guidelines. Diagnostic-flag aid only; veterinarian governs interpretation." },
  { id: "vet-target-weight-loss", name: "Vet Target Weight-Loss Plan (Reverse RER)", group: "U", trades: ["veterinary"], desc: "Target-RER caloric plan and expected weeks-to-goal at 1 / 1.5 / 2% per-week loss rates per AAHA Weight Management Guidelines. Feeds the RER for the TARGET weight, not the current." },
  { id: "vet-toxicity", name: "Vet Toxicity Dose-by-Weight (Chocolate / Xylitol / Raisin / Antifreeze)", group: "U", trades: ["veterinary"], desc: "Screening estimator over the ASPCA APCC published toxic-dose thresholds. Theobromine per chocolate type, xylitol bands (hypoglycemia / hepatic), raisin-grape AKI flag, ethylene-glycol LD50 by species. Always-call-APCC banner." },
  { id: "vet-breed-predispositions", name: "Vet Breed Predispositions Reference", group: "U", trades: ["veterinary"], desc: "Filterable list of breed-specific predispositions per AKC CHF, OFA CHIC, AAHA, and standard veterinary internal medicine references. Population-level associations only; individual patient governs the workup." },
  { id: "vet-plasma-css", name: "Vet Steady-State Plasma Concentration (Css)", group: "U", trades: ["veterinary"], desc: "Css = (Dose * F) / (CL * tau) per Riviere + Papich. Convert per-kg clearance and weight to patient CL; output in ug/mL. Standard clinical-pharmacokinetics identity." },
  { id: "vet-vaccine-schedule", name: "Vet Vaccine Schedule Reference (AAHA Dog / AAFP Cat)", group: "U", trades: ["veterinary"], desc: "AAHA Canine Vaccination Guidelines (2022) core / non-core and AAFP Feline Vaccination Advisory Panel Report (2020) core / non-core. Rabies interval is governed by state-AHJ statute, NOT by the guideline; overlay reminds." },
  { id: "vet-heartworm-dose", name: "Vet Heartworm Preventive Dose (FDA Weight-Band Lookup)", group: "U", trades: ["veterinary"], desc: "Bounded lookup against the FDA-labeled weight bands for the three common monthly preventives: ivermectin (Heartgard Plus), milbemycin (Interceptor Plus), selamectin (Revolution). Pre-treatment negative test required; veterinarian governs contraindications." },
  { id: "vet-crystalloid-plan", name: "Vet Crystalloid Replacement Plan (Maintenance + Losses)", group: "U", trades: ["veterinary"], desc: "Consolidated mL/hr plan from maintenance basis + estimated dehydration deficit + itemized ongoing losses (vomiting / diarrhea / blood / surgical). Drops/min for 10 gtt/mL macro and 60 gtt/mL pediatric drip sets. Per DiBartola." },

  // v12 Group V: EMS / Pre-hospital. Math aids only; medical
  // director and receiving facility govern. Every tile renders the
  // §B.1 limitation banner.
  { id: "glasgow-coma-scale", name: "Glasgow Coma Scale (GCS)", group: "V", trades: ["fire", "ems"], desc: "Sum of eye / verbal / motor responses (3 to 15) with mild / moderate / severe band. Intubated path records V as T." },
  { id: "parkland-formula", name: "Parkland Burn-Fluid Formula", group: "V", trades: ["fire", "ems"], desc: "24-hour LR volume = 4 mL/kg/%TBSA; first 8 / next 16 split. Hours-since-burn adjusts current rate." },
  { id: "cincinnati-stroke-scale", name: "Cincinnati Prehospital Stroke Scale", group: "V", trades: ["fire", "ems"], desc: "Three binary findings (facial droop / arm drift / abnormal speech) with screening interpretation." },
  { id: "apgar-score", name: "APGAR Newborn Score", group: "V", trades: ["fire", "ems"], desc: "5-component newborn score (0-10) at 1 and 5 minutes per Apgar (1953). Band + suggested action." },
  { id: "iv-drip-rate", name: "IV Drip Rate", group: "V", trades: ["fire", "ems"], desc: "gtts/min from volume, time, and IV-set drop factor (10 / 15 / 20 macro; 60 micro). Hourly rate cross-check." },
  { id: "o2-cylinder-duration", name: "O2 Cylinder Duration", group: "V", trades: ["fire", "ems"], desc: "Time to reserve / empty for D / E / M / G / H cylinders at the entered pressure and flow. AARC tank factors." },
  { id: "pediatric-weight-estimate", name: "Pediatric Weight Estimate (APLS)", group: "V", trades: ["fire", "ems"], desc: "Weight estimate from age in months or years via the APLS published formulas. Field aid when a scale is not available." },
  { id: "shock-index", name: "Shock Index (HR / SBP)", group: "V", trades: ["fire", "ems"], desc: "Allgower shock index with field early-warning bands. >1.0 suggests occult hemorrhagic shock; trend over serial readings." },
  { id: "mean-arterial-pressure", name: "Mean Arterial Pressure (MAP)", group: "V", trades: ["fire", "ems"], desc: "Cuff-derived MAP = (SBP + 2*DBP)/3. Pulse pressure cross-check. >=65 mmHg minimum-perfusion floor per Surviving Sepsis / ATLS." },
  { id: "anion-gap", name: "Anion Gap (with K and Albumin variants)", group: "V", trades: ["fire", "ems"], desc: "AG = Na - (Cl + HCO3). Optional K-included and Figge albumin-corrected variants. Bands flag high-AG metabolic acidosis." },
  { id: "corrected-calcium", name: "Corrected Calcium (Payne)", group: "V", trades: ["fire", "ems"], desc: "Total Ca adjusted for albumin per Payne 1973: Ca + 0.8 * (4.0 - albumin). Screening only; ionized Ca is the gold standard." },
  { id: "cha2ds2-vasc", name: "CHA2DS2-VASc (AF Stroke Risk)", group: "V", trades: ["fire", "ems"], desc: "Lip 2010 atrial-fibrillation stroke-risk score (0-9). 2019 AHA / ACC / HRS anticoagulation thresholds by sex." },
  { id: "wells-dvt", name: "Wells DVT Score", group: "V", trades: ["fire", "ems"], desc: "Wells (1997) DVT criteria with the 2003 modification. Two-band (likely / unlikely) and three-band (low / moderate / high) pretest probability." },
  { id: "wells-pe", name: "Wells PE Score", group: "V", trades: ["fire", "ems"], desc: "Wells (2000) pulmonary embolism criteria. Two-band cutpoint at 4.5 (likely / unlikely) and three-band low / moderate / high per modern ACEP and ESC PE guidelines." },
  { id: "perc-rule", name: "PERC Rule (PE Rule-Out Criteria)", group: "V", trades: ["fire", "ems"], desc: "Kline (2004) eight criteria. PERC negative (all 8 met) rules out PE without D-dimer in a low-pretest-probability population only; not for moderate / high risk." },
  { id: "rule-of-9s", name: "Rule of 9s / Lund-Browder TBSA", group: "V", trades: ["fire", "ems"], desc: "Total body surface area burned by region selection. Rule of 9s (Pulaski & Tennison 1947) adult; Lund-Browder (1944) age-banded. Major-burn (>= 20%) ABA threshold." },
  { id: "pediatric-vitals", name: "Pediatric Vital Signs Reference (PALS)", group: "V", trades: ["fire", "ems"], desc: "HR / RR / SBP normal ranges by age band per AHA PALS Provider Manual (2020). PALS hypotensive-SBP cutoff included." },
  { id: "nihss", name: "NIH Stroke Scale (NIHSS)", group: "V", trades: ["fire", "ems"], desc: "Fifteen-item arithmetic sum (0-42) per Brott (1989). AHA / ASA severity bands. Stroke-center neurologist governs tPA / EVT." },
  { id: "start-triage", name: "START / JumpSTART Mass-Casualty Triage", group: "V", trades: ["fire", "ems"], desc: "Four-color triage tag (green / yellow / red / black) via the START (Newport Beach FD 1983) adult decision tree and the JumpSTART (Romig 1995) pediatric branch. Incident commander governs the final tag." },
  { id: "drug-concentration", name: "Drug Concentration to Volume", group: "V", trades: ["fire", "ems"], desc: "Volume = dose / concentration. Optional mg/kg + weight derives the ordered dose. Large-volume and tuberculin-syringe flags surface verification reminders." },

  // v12 Group W: Pilots / General Aviation.
  { id: "density-altitude", name: "Density Altitude", group: "W", trades: ["aviation", "field"], desc: "Density altitude from pressure altitude and OAT. Performance-band hint per FAA Koch chart. PIC governs go/no-go." },
  { id: "crosswind-component", name: "Crosswind / Headwind Component", group: "W", trades: ["aviation"], desc: "Decomposes wind into headwind / crosswind components relative to a runway heading. Demonstrated-crosswind comparison from the POH." },
  { id: "ete-eta", name: "ETE / ETA from Distance and Groundspeed", group: "W", trades: ["aviation", "trucking", "marine"], desc: "Time-en-route and local arrival time from distance and groundspeed. Pure arithmetic." },
  { id: "hypoxia-altitude", name: "Supplemental-Oxygen Altitude (14 CFR §91.211)", group: "W", trades: ["aviation"], desc: "Cabin-altitude regulatory bands: <12,500 (no O2), 12,500-14,000 (crew O2 after 30 min), 14,000-15,000 (crew O2 always), >15,000 (all occupants)." },
  { id: "pressure-altitude", name: "Pressure Altitude from Altimeter Setting", group: "W", trades: ["aviation"], desc: "PA = field elevation + 1000 * (29.92 - altimeter inHg). The kneeboard shortcut: every 0.01 inHg below standard adds 10 ft." },
  { id: "phonetic-alphabet", name: "ICAO Phonetic Alphabet", group: "W", trades: ["aviation", "fire", "reference"], desc: "A-Z reference plus a translator: type a tail number or callsign and see it spelled phonetically." },
  { id: "fuel-planning", name: "Fuel Planning (Trip + Reserve)", group: "W", trades: ["aviation"], desc: "Required fuel = (flight_time + reserve) * burn. Weight at 6.0 lb/gal avgas / 6.7 lb/gal jet-A. Reserve bands per 14 CFR 91.151 / 91.167; tank-capacity check flags refuel stops." },
  { id: "wind-triangle", name: "Wind Triangle / Wind Correction Angle", group: "W", trades: ["aviation"], desc: "Cruise wind triangle: WCA = asin(crosswind/TAS), true heading, ground speed. The E6B identity behind every cross-country plan." },
  { id: "top-of-descent", name: "Top-of-Descent (3-to-1 Rule)", group: "W", trades: ["aviation"], desc: "Distance and rate to plan a descent. 3 nm per 1000 ft to lose; descent rate = GS * 5.556 fpm. Pilot rule of thumb." },
  { id: "weather-phrasing", name: "METAR / TAF Weather Phrasing Reference", group: "W", trades: ["aviation"], desc: "Cloud-cover codes, intensity prefixes, descriptor codes, weather phenomena, and RVR encoding per FAA AC 00-45H and NWS Instruction 10-813. The kneeboard-card decoder." },
  { id: "transponder-codes", name: "Transponder Code Reference (Squawks)", group: "W", trades: ["aviation"], desc: "Reserved codes 1200 VFR / 7500 hijack / 7600 lost comm / 7700 emergency per AIM §4-1-20 and §6-2-2. Octal-validity check on user-entered codes." },
  { id: "standard-turn-rate", name: "Standard Turn Rate / Climb / Descent Rate", group: "W", trades: ["aviation"], desc: "Std rate turn (3 deg/sec); bank rule of thumb (TAS/10)+7 and the exact bank from g and angular rate; time to turn through; climb/descent fpm from GS and gradient." },
  { id: "true-airspeed", name: "True Airspeed from CAS / PA / OAT", group: "W", trades: ["aviation"], desc: "TAS = CAS / sqrt(rho/rho_sl). Density ratio from the ISA model via density altitude. Returns Mach number too. POH performance section governs." },
  { id: "sectional-symbols", name: "Sectional Chart Symbology Reference", group: "W", trades: ["aviation"], desc: "FAA sectional / TAC chart legend reference per the Aeronautical Chart User's Guide. Categories: airports, airspace, special-use airspace, obstructions, navigation. Pilot kneeboard aid." },
  { id: "aircraft-category", name: "Aircraft Category and Class (14 CFR 1.1)", group: "W", trades: ["aviation"], desc: "Pilot-certification categories (ASEL / AMEL / rotorcraft / etc.) and airworthiness categories (normal / utility / acrobatic / commuter / transport / LSA / etc.) per 14 CFR §1.1." },
  { id: "magnetic-variation", name: "Magnetic Variation (TVMDC)", group: "W", trades: ["aviation"], desc: "Convert between True and Magnetic heading using a chart-read magnetic variation (deg E / W). 'East is least; West is best' for True -> Magnetic, per FAA PHAK Chapter 16." },
  { id: "metar-decoder", name: "METAR Decoder", group: "W", trades: ["aviation"], desc: "Decode a METAR / SPECI observation: station, time, wind, visibility, weather, sky condition, T / Td, altimeter, remarks. Per FAA AC 00-45H Change 2 and NWS FMH-1." },
  { id: "taf-decoder", name: "TAF Decoder", group: "W", trades: ["aviation"], desc: "Decode a Terminal Aerodrome Forecast (TAF): validity period, prevailing forecast, FM / BECMG / TEMPO / PROBxx groups. Per FAA AC 00-45H Change 2 and WMO Manual on Codes." },

  // v12 Group X: Real Estate.
  { id: "ltv", name: "Loan-to-Value (LTV)", group: "X", trades: ["real-estate", "small-business"], desc: "LTV percent and PMI-required flag from loan amount and appraised / purchase value. Bands per FNMA conforming convention." },
  { id: "dti", name: "Debt-to-Income (DTI)", group: "X", trades: ["real-estate", "small-business"], desc: "Front-end and back-end DTI vs FNMA / FHA / VA underwriting thresholds." },
  { id: "piti", name: "PITI Mortgage Payment", group: "X", trades: ["real-estate", "small-business"], desc: "Monthly P+I+T+I from principal, APR, term, and annual tax / insurance line items. Adds monthly HOA and PMI pass-through." },
  { id: "exchange-1031-timeline", name: "IRC §1031 Exchange Timeline", group: "X", trades: ["real-estate", "tax"], desc: "45-day identification and 180-day acquisition deadlines from the relinquished-property sale-close date. Flags the April-15 / 180-day interaction." },
  { id: "section-121-exclusion", name: "Home-Sale Capital-Gains Exclusion (§121)", group: "X", trades: ["real-estate", "tax"], desc: "Realized gain, $250k / $500k IRC §121 exclusion, and taxable gain. Two-of-five-year and non-qualified-use flags." },
  { id: "property-tax", name: "Property Tax Estimator", group: "X", trades: ["real-estate", "small-business"], desc: "Annual and monthly property tax from assessed value, mill rate, and optional homestead exemption. Effective-rate cross-check." },
  { id: "cap-rate-dscr", name: "Cap Rate and DSCR", group: "X", trades: ["real-estate", "small-business"], desc: "NOI / value and NOI / annual debt service with common-practice bands. CRE underwriting ratio cross-check." },
  { id: "cash-on-cash", name: "Cash-on-Cash Return", group: "X", trades: ["real-estate", "small-business"], desc: "Annual pre-tax cash flow / cash invested with bands and payback-period years. Common rental and flipping check." },
  { id: "commission-split", name: "Commission Split", group: "X", trades: ["real-estate", "small-business"], desc: "Three-stage flow from sale price through total commission, side share, brokerage split, and flat fees to agent net." },
  { id: "amortization-schedule", name: "Full Amortization Schedule", group: "X", trades: ["real-estate", "small-business"], desc: "Period-by-period payment / principal / interest / balance from loan amount, rate, and term. Optional extra-principal accelerates payoff. Reports total interest, total paid, months saved, and three sample rows." },
  { id: "cost-of-waiting", name: "Cost of Waiting (Rate-Rise Scenario)", group: "X", trades: ["real-estate", "small-business"], desc: "Side-by-side P&I and lifetime interest at today's rate vs a user-supplied future rate. Same loan, same term; no forecasting. A what-if, not a recommendation." },
  { id: "closing-costs", name: "Closing-Cost Estimator (CFPB Line Items)", group: "X", trades: ["real-estate", "small-business"], desc: "Estimated low / mid / high totals over the CFPB Closing Disclosure line items (origination, appraisal, title, recording, transfer tax, prepaids, escrow). The Loan Estimate from the lender is the value of record." },
  { id: "rental-worksheet", name: "Rental Income / Expense Worksheet (Schedule E)", group: "X", trades: ["real-estate", "small-business"], desc: "IRS Schedule E (Form 1040) Part I worksheet. Gross rent, vacancy loss, EGI, 15 expense line items, NOI, taxable income (NOI - depreciation), cap rate, cash-on-cash, expense ratio. CPA governs final return." },
  { id: "loan-limits", name: "FHFA / FHA / VA Loan Limits by County", group: "X", trades: ["real-estate", "small-business"], desc: "2026 conforming one-unit loan limit (FHFA), FHA single-family limit (HUD), and VA full-entitlement note. Bundled high-cost county lookup; unknown counties fall back to the baseline." },
  { id: "hud-fmr", name: "HUD Fair Market Rents", group: "X", trades: ["real-estate", "small-business"], desc: "FY2026 HUD Fair Market Rents (0BR / 1BR / 2BR / 3BR / 4BR) for representative HUD FMR Areas. 40th-percentile recent-mover rent per HUD PD&R." },

  // v12 Group Y: Educators / K-12. Pure-public-math tiles only.
  { id: "readability", name: "Readability Scores (Flesch-Kincaid)", group: "Y", trades: ["education", "reference"], desc: "Flesch-Kincaid Grade Level and Flesch Reading Ease for any text. Word / sentence / syllable counts. Public-domain federal formula." },
  { id: "statistics-quickread", name: "Statistics Quick-Read", group: "Y", trades: ["education", "reference", "lab"], desc: "Mean, median, mode, range, variance, and standard deviation (sample and population) for a list of numbers." },
  { id: "quadratic-formula", name: "Quadratic Formula and Discriminant", group: "Y", trades: ["education"], desc: "Real or complex roots, discriminant sign, and vertex of the parabola for ax^2 + bx + c = 0." },
  { id: "scientific-notation", name: "Scientific Notation and Significant Figures", group: "Y", trades: ["education", "lab", "reference"], desc: "Convert any number to m * 10^n form; count significant figures from the input string." },
  { id: "significant-figures", name: "Significant Figures (count + round)", group: "Y", trades: ["education", "lab", "reference"], desc: "Count sig figs in a number; round to a target N. Leading zeros not significant; trailing zeros after a decimal ARE." },
  { id: "codon-table", name: "Genetic Codon Table (DNA / RNA)", group: "Y", trades: ["education", "lab"], desc: "Translate an in-frame DNA or RNA sequence to amino acids using the standard genetic code." },
  { id: "base-converter", name: "Number Base Converter (2-36)", group: "Y", trades: ["education", "reference"], desc: "Convert between any two integer bases from 2 to 36. Shows decimal / binary / octal / hex side-by-side." },
  { id: "gpa-calculator", name: "GPA Calculator (Weighted + Unweighted)", group: "Y", trades: ["education"], desc: "Standard US 4.0 / 5.0 GPA. One course per line: letter, credits, optional honors / AP track. Bonus +0.5 honors / +1.0 AP on passing grades." },
  { id: "confidence-interval", name: "Confidence Interval (Proportion or Mean)", group: "Y", trades: ["education", "lab"], desc: "Wald z-interval for a sample proportion or a sample mean. Flags small-n cases where Wilson / Clopper-Pearson or a t-interval is more appropriate." },
  { id: "linear-system-2x2", name: "System of Two Linear Equations", group: "Y", trades: ["education"], desc: "Solve a1*x + b1*y = c1; a2*x + b2*y = c2 via Cramer's rule. Reports unique / infinite / no-solution; shows the determinant." },
  { id: "lexile-band", name: "Lexile Band by Grade (CCSS Stretch)", group: "Y", trades: ["education"], desc: "Grade-to-Lexile target ranges (K to 12) summarized from publicly published state-DOE bulletins implementing the CCSS Appendix A stretch alignment. Teacher governs text selection; Lexile is a MetaMetrics trademark." },
  { id: "standards-based-grade", name: "Standards-Based Grade (Mastery 1-4)", group: "Y", trades: ["education"], desc: "Weighted overall mastery from per-standard levels (1-4) and optional major / supporting / additional priority. Letter equivalent per AAS / NWEA conversion; school registrar governs the transcript grade." },
  { id: "bell-curve-zscore", name: "Bell Curve / z-Score and Percentile", group: "Y", trades: ["education"], desc: "z = (x - mu) / sigma; percentile from the standard normal CDF (Abramowitz + Stegun 26.2.17); curve letter band per the 68-95-99.7 rule. Teacher governs whether a normative curve is appropriate." },
  { id: "alternate-readability", name: "Alternate Readability Formulas (SMOG / Coleman-Liau / Gunning Fog / ARI)", group: "Y", trades: ["education"], desc: "Four additional reading-grade formulas beyond Flesch-Kincaid: SMOG (McLaughlin 1969), Coleman-Liau (1975), Gunning Fog (1952), and ARI (Smith + Senter 1967). Same text input as Y.1." },
  { id: "periodic-element", name: "Periodic Element Reference (Electronegativity / Configuration / Oxidation)", group: "Y", trades: ["education", "lab"], desc: "Per-element lookup of period / group / block / Pauling electronegativity / electron configuration / common oxidation states. Covers H through Kr plus Ag / I / Au / Hg / Pb. By atomic number, symbol, or name." },
  { id: "pearson-correlation", name: "Pearson Correlation (r, R^2, significance)", group: "Y", trades: ["education", "lab"], desc: "Pearson r and R^2 for paired x / y series, with the t-test (t = r sqrt(n-2) / sqrt(1-r^2), n-2 df) and the two-tailed p-value from the Student-t CDF. Per OpenIntro Statistics Ch. 8." },

  // Group H extensions (v5 Step 61): knowledge references for v5 audiences.
  { id: "irs-form-index", name: "IRS Form Quick-Read Index", group: "H", trades: ["reference", "tax", "small-business"], desc: "What each commonly used IRS form is for, in one paragraph each. 1040, Schedule C / SE / E, Form 4562, 941, W-9, 1099-NEC, 1099-K." },
  { id: "sales-tax-nexus", name: "State Sales Tax Nexus Quick-Read", group: "H", trades: ["reference", "legal", "small-business"], desc: "Post-Wayfair economic-nexus thresholds by state with citation and verified-on date. Reference only; verify with the state DOR before relying on for filing." },
  { id: "osha-recordkeeping", name: "OSHA Recordkeeping Quick-Read", group: "H", trades: ["reference", "compliance"], desc: "29 CFR 1904: who must keep records, recordable definition, Forms 300 / 300A / 301, posting period, retention, severe-injury reporting." },
  { id: "lab-safety-quickread", name: "Lab Safety Quick-Read (GHS + Spill)", group: "H", trades: ["reference", "lab"], desc: "GHS pictograms with signal words and hazards. One-paragraph spill-response decision tree (assess / evacuate / contain / report)." },
];

const FIRE_GROUND_TRADE = "fire";

// Inline notices.
const NOTICE_DEFAULT = "This is a math aid for verification. Local codes, manufacturer specifications, and the authority having jurisdiction govern all installations and inspections.";
const NOTICE_FIRE = "This is a math aid for verification. Departmental SOPs and incident command govern all fireground operations.";
const NOTICE_HISTORICAL = "Reference only. Bundled at build time. Ask your supplier for a current quote.";
const NOTICE_TAX_LAW = "Estimate only. Tax law changes. Confirm with the current IRS publication or a licensed CPA before filing.";
const NOTICE_LEGAL = "This is legal information, not legal advice. Statutes and court rules change. Verify with current state code and a licensed attorney before relying on this for a filing or a deadline.";
const NOTICE_LAB = "Verify protocol against your lab's SOP before pipetting. A miscalculated dilution can ruin a run or a sample.";
const NOTICE_VETERINARY = "Math aid for the veterinary team. The attending veterinarian governs the prescription, fluid plan, and feeding plan; the RVT / LVT governs administration. Verify against the current drug formulary and the in-clinic findings.";
const NOTICE_EMS = "Math aid for the field provider. The receiving facility's physician governs disposition; the EMS medical director governs scope of practice; the agency protocol governs the call. This tile does not substitute for online medical command.";
const NOTICE_AVIATION = "Math aid for flight planning. Pilot-in-command and the airplane flight manual or POH govern. Verify against the AFM loading graph, performance chart, or current weather brief.";
const NOTICE_REAL_ESTATE = "Estimate only. Lender governs final underwriting and rate / fee disclosure; appraiser governs the value of record. State law and the agency's program guidelines may impose stricter limits than the published thresholds.";
const NOTICE_EDUCATION = "Estimate only. The classroom teacher governs final text selection, grade placement, and assessment decisions. Readability formulas and similar metrics have known edge-case noise.";

// Leader-key shortcut targets.
const SHORTCUTS = {
  h: { type: "home" },
  s: { type: "focus", target: "#search-input" },
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
// The home view is a static hero (elevator pitch + one search combobox);
// there is no live-filtered grid, so the only state is the route.
const state = {
  route: { view: "home", id: null, params: {} },
};

// Boot.
document.addEventListener("DOMContentLoaded", boot);

function boot() {
  parseHash();
  bindSearch();
  bindShortcuts();
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
  state.route = result.route;
}

function onHashChange() {
  parseHash();
  applyRoute();
}

function applyRoute() {
  const home = document.getElementById("tools");
  const view = document.getElementById("view-region");
  if (state.route.view === "tool") {
    home.hidden = true;
    view.hidden = false;
    renderToolView(state.route.id, state.route.params);
    updateHeadForTool(state.route.id);
  } else {
    home.hidden = false;
    view.hidden = true;
    clearChildren(view);
    updateHeadForHome();
  }
}

// spec-v13 §5.5: SPA sets <title>, meta description, and
// <link rel="canonical"> to match the per-tile shell at /tools/<id>/
// when a tile opens; reverts to home values on return.
const HOME_DESC = "400 deterministic field-math tools for electricians, plumbers, HVAC, restoration, carpentry, and fire-ground engineering. Everything runs in your browser. No signup, no tracking, no AI.";
const HOME_TITLE = "Free Trade Calculators - 400 Field-Math Tools, No Signup · Rough Logic";
// Production origin for the canonical link. The SPA must emit an ABSOLUTE
// canonical (matching the prerendered /tools/<id>/ and /groups/<slug>/
// shells) or Lighthouse SEO flags it ("Is not an absolute URL"); a relative
// "/tools/<id>/" scored the home + SPA tile URLs at SEO 0.92.
const SITE_ORIGIN = "https://roughlogic.com";

function setHeadLink(rel, href) {
  let el = document.querySelector('link[rel="' + rel + '"]');
  if (!el) { el = document.createElement("link"); el.setAttribute("rel", rel); document.head.appendChild(el); }
  el.setAttribute("href", href);
}
function setHeadMeta(name, content) {
  let el = document.querySelector('meta[name="' + name + '"]');
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function updateHeadForTool(id) {
  const tool = TOOLS.find((t) => t.id === id);
  if (!tool) return updateHeadForHome();
  document.title = tool.name + " - Rough Logic";
  setHeadMeta("description", tool.desc);
  setHeadLink("canonical", SITE_ORIGIN + "/tools/" + id + "/");
}
function updateHeadForHome() {
  document.title = HOME_TITLE;
  setHeadMeta("description", HOME_DESC);
  setHeadLink("canonical", SITE_ORIGIN + "/");
}

function navigateTo(hash) {
  if (window.location.hash !== "#" + hash) {
    window.history.replaceState(null, "", "#" + hash);
    parseHash();
    applyRoute();
  }
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
  // v5 Step 61 per-id overrides for Group H references that span trades.
  if (tool.id === "sales-tax-nexus") notice.textContent = NOTICE_LEGAL;
  else if (tool.id === "irs-form-index") notice.textContent = NOTICE_TAX_LAW;
  else if (tool.group === "Q") notice.textContent = NOTICE_HISTORICAL;
  else if (tool.group === "R") notice.textContent = NOTICE_TAX_LAW;
  else if (tool.group === "S") notice.textContent = NOTICE_LEGAL;
  else if (tool.group === "T") notice.textContent = NOTICE_LAB;
  else if (tool.group === "U") notice.textContent = NOTICE_VETERINARY;
  else if (tool.group === "V") notice.textContent = NOTICE_EMS;
  else if (tool.group === "W") notice.textContent = NOTICE_AVIATION;
  else if (tool.group === "X") notice.textContent = NOTICE_REAL_ESTATE;
  else if (tool.group === "Y") notice.textContent = NOTICE_EDUCATION;
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
          cb.copyText(text, copyBtn);
        } catch {
          // Fallback: leave the text on the page in a focusable element.
        }
      });
      block.appendChild(copyBtn);
    }
  }).catch(() => { /* citation block is opt-in per tile; missing map is fine */ });

  const ds = TOOL_DATA_SOURCES[id];

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

// --- Home search (combobox) ---
//
// One search bar. Type free text to filter the catalog, or focus the empty
// field to browse every tool. Matches render in a results dropdown that
// routes to the tile on click / Enter / arrow-select. Industry-term aliases
// (data/search/aliases.json) lazy-load on first focus so a free-text term
// resolves to its target tile; the SW pre-caches the file so the fetch is
// local after first install.

function bindSearch() {
  const input = document.getElementById("search-input");
  const list = document.getElementById("search-results");
  if (!input || !list) return;

  const nameToId = new Map(TOOLS.map((t) => [t.name.toLowerCase(), t.id]));
  const ALL = TOOLS.slice().sort((a, b) => a.name.localeCompare(b.name));
  let matches = [];
  let activeIndex = -1;

  // Alias terms map a free-text phrase to a tile id; loaded lazily.
  const aliasTerms = [];
  let aliasLoaded = false;
  async function ensureAliases() {
    if (aliasLoaded) return;
    aliasLoaded = true;
    try {
      const r = await fetch("data/search/aliases.json", { credentials: "omit" });
      if (!r.ok) return;
      const json = await r.json();
      if (!json || !Array.isArray(json.aliases)) return;
      for (const row of json.aliases) {
        if (!row || typeof row.term !== "string" || typeof row.target !== "string") continue;
        if (!nameToId.has(row.target) && !TOOLS.some((t) => t.id === row.target)) continue;
        aliasTerms.push({ term: row.term.toLowerCase(), id: row.target });
      }
      // Refresh the open dropdown so just-loaded aliases become searchable.
      if (document.activeElement === input) render(input.value);
    } catch { /* alias autocomplete is opt-in; failure is a no-op */ }
  }

  // Rank tiles for a query: name-prefix, then name-substring, then
  // description, then alias-term match. Empty query lists the catalog A-Z.
  function searchTools(query) {
    const q = (query || "").trim().toLowerCase();
    if (!q) return ALL;
    const seen = new Set();
    const out = [];
    const add = (t) => { if (t && !seen.has(t.id)) { seen.add(t.id); out.push(t); } };
    const named = ALL.filter((t) => t.name.toLowerCase().includes(q));
    named.sort((a, b) => {
      const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return ap - bp || a.name.localeCompare(b.name);
    });
    named.forEach(add);
    ALL.filter((t) => t.desc.toLowerCase().includes(q)).forEach(add);
    for (const al of aliasTerms) {
      if (al.term.includes(q)) add(TOOLS.find((t) => t.id === al.id));
    }
    return out.slice(0, 12);
  }

  function setExpanded(open) {
    input.setAttribute("aria-expanded", open ? "true" : "false");
    list.hidden = !open;
  }

  function setActive(idx) {
    const items = list.querySelectorAll(".search-result");
    items.forEach((node, i) => {
      const on = i === idx;
      node.classList.toggle("is-active", on);
      node.setAttribute("aria-selected", on ? "true" : "false");
      if (on) { input.setAttribute("aria-activedescendant", node.id); node.scrollIntoView({ block: "nearest" }); }
    });
    if (idx === -1) input.removeAttribute("aria-activedescendant");
    activeIndex = idx;
  }

  function pick(tool) {
    if (!tool) return;
    input.value = "";
    matches = [];
    clearChildren(list);
    setExpanded(false);
    setActive(-1);
    input.blur();
    navigateTo(tool.id);
  }

  function render(query) {
    clearChildren(list);
    matches = searchTools(query);
    if (matches.length === 0) {
      const empty = document.createElement("li");
      empty.className = "search-empty";
      empty.setAttribute("role", "presentation");
      empty.textContent = "No match yet. Try a trade, a unit, or a tool name (e.g. \"voltage drop\", \"duct\", \"mileage\").";
      list.appendChild(empty);
      setExpanded(true);
      setActive(-1);
      return;
    }
    matches.forEach((tool, i) => {
      const item = document.createElement("li");
      item.className = "search-result";
      item.setAttribute("role", "option");
      item.id = "search-result-" + i;
      item.setAttribute("aria-selected", "false");
      const name = document.createElement("span");
      name.className = "sr-name";
      name.textContent = tool.name;
      const group = document.createElement("span");
      group.className = "sr-group";
      group.textContent = GROUP_NAMES[tool.group] || tool.group;
      item.appendChild(name);
      item.appendChild(group);
      // mousedown so the route fires before the input-blur close handler.
      item.addEventListener("mousedown", (e) => { e.preventDefault(); pick(tool); });
      item.addEventListener("mouseenter", () => setActive(i));
      list.appendChild(item);
    });
    setExpanded(true);
    setActive(0);
  }

  input.addEventListener("focus", () => { ensureAliases(); render(input.value); });
  input.addEventListener("input", () => { ensureAliases(); render(input.value); });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      if (!matches.length) return;
      setActive((activeIndex + 1) % matches.length);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      if (!matches.length) return;
      setActive((activeIndex - 1 + matches.length) % matches.length);
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && matches[activeIndex]) { e.preventDefault(); pick(matches[activeIndex]); return; }
      if (matches[0]) { e.preventDefault(); pick(matches[0]); return; }
      // No rendered matches: fall back to an exact tool-name match.
      const id = nameToId.get((input.value || "").trim().toLowerCase());
      if (id) { e.preventDefault(); pick(TOOLS.find((t) => t.id === id)); }
    } else if (e.key === "Escape") {
      if (input.value || !list.hidden) {
        input.value = "";
        matches = [];
        clearChildren(list);
        setExpanded(false);
        setActive(-1);
        e.preventDefault();
      }
    }
  });

  // Close the dropdown when a click lands outside the search.
  document.addEventListener("click", (e) => {
    if (e.target === input || list.contains(e.target)) return;
    setExpanded(false);
    setActive(-1);
  });
}

// Full-catalog picker. Fills the home-view <select> with one <optgroup> per
// trade (GROUP_NAMES order) and routes to the chosen tile on `change`,
// mirroring the hero search's navigateTo routing. The browse-by-list
// companion to free-text search.
// --- Keyboard: leader-key shortcuts ---

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
}

function runShortcut(action) {
  if (action.type === "home") {
    navigateTo("");
  } else if (action.type === "route") {
    navigateTo(action.id);
  } else if (action.type === "focus") {
    const el = document.querySelector(action.target);
    if (el) el.focus();
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

// --- Helpers ---

function clearChildren(el) {
  while (el && el.firstChild) el.removeChild(el.firstChild);
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
