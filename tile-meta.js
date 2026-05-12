// v10 Phase B.2 per-tile meta object (spec-v10.md §4.2).
//
// v10 Phase E.4 (spec-v10.md §7.4) extends each entry with an
// `a11y_verified_on` ISO date. The check-tile-meta.mjs lint warns
// (does not fail) when the verification is more than 180 days old;
// the contributor reruns axe-core and bumps the date.
//
// Per spec-v10 §4.2 each entry carries:
//   id                   string  - tile id (matches TOOLS[].id)
//   group                string  - group letter (matches TOOLS[].group)
//   simplified           bool    - simplified-screening tool that
//                                  renders the limitation banner
//                                  (drives v10 §B.3 wiring).
//   requires_field_meter bool    - the answer needs an actual meter
//                                  reading rather than a calculation.
//   companion_tiles      array   - mirrors data/search/companions.json
//                                  (subset; canonical list is the
//                                  shard).
//   a11y_verified_on     date    - ISO date of last axe-core sweep.
//
// The full TOOLS-derived id+group list lives in `_TILES` below; the
// per-tile flags and companion overrides live in the small set tables
// above the loop. A future tile's meta is one new id/group row in
// `_TILES` plus, optionally, a SIMPLIFIED / FIELD_METER / COMPANIONS
// entry.

const A11Y = "2026-05-10";

// Tiles that render the spec-v10 §B.3 limitation banner above the
// inputs. Every entry here MUST have canonical copy in
// limitation-banner.js (the lint enforces this).
const SIMPLIFIED = new Set([
  "manual-j-cooling",
  "manual-j-heating",
  "outdoor-air-mix",
  "outdoor-air-ventilation",
  "service-load",
  "septic-drainfield",
  "stair-stringer",
  "slope-avalanche",
  "arc-flash-screen",
  "sous-vide-pasteurization",
  // v12 Group V (EMS / Pre-hospital): every tile carries the
  // medical-director-governs limitation banner per spec-v12 §6.
  "glasgow-coma-scale",
  "parkland-formula",
  "cincinnati-stroke-scale",
  // v12 Group U (Veterinary): every tile carries the veterinarian-
  // governs limitation banner per spec-v12 §5.
  "vet-weight-based-dose",
  "vet-maintenance-fluid",
  "vet-energy-requirement",
]);

// Tiles whose answer is the meter reading, not the calculation. The
// calculator is a sanity envelope; the field instrument is the verdict.
const FIELD_METER = new Set([
  "refrigerant-pt",
  "superheat-subcool",
  "refrigerant-charging",
  "hos-math",
  "cooling-curve",
  "duct-leakage",
  "drying-goal",
  "drying-times",
  "hydrant-flow",
  "smoke-reading",
]);

// Per-tile companion list. Mirrors data/search/companions.json; the
// shard is the runtime source of truth, this map is the build-time
// fallback. Only override here when the meta companion list should be
// different from the JSON (e.g., a curated subset). The lint warns on
// drift so this stays in sync.
const COMPANIONS = {
  "manual-j-cooling": ["cfm-per-ton", "duct-sizing", "outdoor-air-mix"],
  "manual-j-heating": ["cfm-per-ton", "duct-sizing", "insulation-heat-loss"],
  "outdoor-air-mix": ["manual-j-cooling", "manual-j-heating", "psychrometric"],
  "service-load": ["service-load-standard", "breaker-sizing", "panel-rebalance"],
  "septic-tank": ["septic-drainfield"],
  "septic-drainfield": ["septic-tank"],
  "stair-stringer": ["stair-stringer-layout"],
  "slope-avalanche": ["wind-chill"],
  "magnetic-declination": ["bearing-conversion", "utm-conversion", "solar-times"],
  "bearing-conversion": ["magnetic-declination"],
  "refrigerant-pt": ["superheat-subcool", "refrigerant-charging"],
  "superheat-subcool": ["refrigerant-pt", "refrigerant-charging"],
  "hos-math": ["bridge-formula"],
  "wire-ampacity": ["voltage-drop", "conduit-fill", "breaker-sizing"],
  "voltage-drop": ["wire-ampacity", "lv-dc-drop", "multi-load-vd"],
  "conduit-fill": ["wire-ampacity", "voltage-drop", "egc-sizing"],
  "breaker-sizing": ["wire-ampacity", "service-load", "egc-sizing"],
  "egc-sizing": ["wire-ampacity", "breaker-sizing", "conduit-fill"],
  "motor-fla": ["generator-motor-starting", "wire-ampacity", "voltage-drop"],
  "transformer-sizing": ["transformer-kva-sizing", "short-circuit-pp", "wire-ampacity"],
  "transformer-kva-sizing": ["transformer-sizing", "short-circuit-pp", "service-load"],
  "three-phase": ["voltage-imbalance", "pf-correction", "transformer-kva-sizing"],
  "service-load-standard": ["service-load", "breaker-sizing", "transformer-kva-sizing"],
  "panel-rebalance": ["service-load", "phase-balance", "voltage-imbalance"],
  "pipe-sizing": ["friction-loss", "pipe-volume", "pump-sizing"],
  "friction-loss": ["pipe-sizing", "pump-sizing", "manning-slope"],
  "pump-sizing": ["friction-loss", "pump-operating-point", "static-pressure-piping"],
  "gas-pipe-sizing": ["pipe-sizing", "gas-leak-rate"],
  "duct-sizing": ["static-pressure-hvac", "duct-friction-static", "cfm-per-ton"],
  "cfm-per-ton": ["manual-j-cooling", "duct-sizing"],
  "psychrometric": ["manual-j-cooling", "outdoor-air-mix", "evaporative-cooling"],
  "concrete": ["footing-area", "material-quantity"],
  "footing-area": ["concrete", "excavation"],
  "drywall": ["material-quantity", "paint-coverage"],
  "bridge-formula": ["dim-weight", "hos-math"],
  "dim-weight": ["bridge-formula"],
  "wind-chill": ["heat-stress"],
  "heat-stress": ["wind-chill"],
  "trench-slope": ["excavation"],
  "fall-protection-clearance": ["ladder-pipe-reach"],
  "material-cost": ["material-quantity", "material-order-list"],
  "color-codes": ["knot-reference"],
  "knot-reference": ["color-codes"],
  "tile-count": ["material-quantity"],
  "paint-coverage": ["material-quantity"],
  "material-quantity": ["material-cost", "material-order-list"],
  "excavation": ["trench-slope", "footing-area"],
};

// Every tile id + its group. Source of truth: TOOLS in app.js.
// Lint check-tile-meta.mjs verifies this stays in sync.
const _TILES = [
  ["ohms-law", "A"], ["wire-ampacity", "A"], ["voltage-drop", "A"],
  ["conduit-fill", "A"], ["box-fill", "A"], ["breaker-sizing", "A"],
  ["motor-fla", "A"], ["transformer-sizing", "A"], ["three-phase", "A"],
  ["copper-resistance", "A"], ["egc-sizing", "A"], ["service-load", "A"],
  ["generator-sizing", "A"], ["pv-string-sizing", "A"], ["battery-runtime", "A"],
  ["voltage-imbalance", "A"], ["gfci-afci-reference", "A"], ["lighting-density", "A"],
  ["pulling-tension", "A"], ["cable-bend-radius", "A"], ["pf-correction", "A"],
  ["phase-balance", "A"], ["multi-load-vd", "A"], ["lv-dc-drop", "A"],
  ["poe-budget", "A"], ["transformer-kva-sizing", "A"], ["short-circuit-pp", "A"],
  ["generator-motor-starting", "A"], ["service-load-standard", "A"], ["panel-rebalance", "A"],
  ["arc-flash-screen", "A"], ["motor-branch-from-nameplate", "A"],
  ["grounding-electrode", "A"],
  ["outdoor-air-ventilation", "C"], ["hood-exhaust", "C"],
  ["shr-latent", "C"],

  ["pipe-sizing", "B"], ["friction-loss", "B"], ["pipe-volume", "B"],
  ["pump-sizing", "B"], ["static-pressure-piping", "B"], ["gas-pipe-sizing", "B"],
  ["slope", "B"], ["pressure-conversion", "B"], ["backflow", "B"],
  ["water-hammer-arrestor", "B"], ["recirc-pump-head", "B"], ["septic-tank", "B"],
  ["recirc-loop-sizing", "B"],
  ["trap-arm", "B"], ["pipe-expansion", "B"], ["tankless-gpm", "B"],
  ["gas-leak-rate", "B"], ["stormwater-rational", "B"], ["manning-slope", "B"],
  ["hydrostatic-test", "B"], ["grease-trap", "B"], ["glycol-mix", "B"],
  ["expansion-tank", "B"], ["backflow-loss", "B"], ["water-hammer-surge", "B"],
  ["pump-operating-point", "B"], ["septic-drainfield", "B"], ["pipe-expansion-loop", "B"],

  ["manual-j-cooling", "C"], ["manual-j-heating", "C"], ["duct-sizing", "C"],
  ["static-pressure-hvac", "C"], ["refrigerant-pt", "C"], ["superheat-subcool", "C"],
  ["seer-eer", "C"], ["balance-point", "C"], ["shr", "C"],
  ["cfm-per-ton", "C"], ["combustion-air", "C"], ["compare-refrigerants", "C"],
  ["refrigerant-charge", "C"], ["approach-delta-t", "C"], ["outdoor-air-mix", "C"],
  ["equivalent-length", "C"], ["wet-bulb-psychrometer", "C"], ["insulation-thickness", "C"],
  ["evaporative-cooling", "C"], ["affinity-laws", "C"], ["belt-pulley", "C"],
  ["air-receiver", "C"], ["geothermal-loop", "C"], ["baseboard-output", "C"],
  ["npsh-a", "C"], ["duct-leakage", "C"], ["duct-friction-static", "C"],
  ["refrigerant-charging", "C"], ["cooling-tower", "C"], ["insulation-heat-loss", "C"],

  ["psychrometric", "D"], ["drying-goal", "D"], ["dehumidifier", "D"],
  ["air-movers", "D"], ["water-classes", "D"], ["drying-times", "D"],
  ["mold", "D"], ["ppe", "D"], ["standing-water", "D"],
  ["nam-sizing", "D"], ["hepa-filter-life", "D"], ["thermal-delta-t", "D"],
  ["containment-air-balance", "D"], ["chamber-turnover", "D"],
  ["drying-log", "D"],

  ["stairs", "E"], ["roof-pitch", "E"], ["rafter", "E"],
  ["square-footage", "E"], ["board-footage", "E"], ["concrete", "E"],
  ["rebar", "E"], ["lumber-spans", "E"], ["fastener-pullout", "E"],
  ["beam-loading", "E"], ["material-quantity", "E"], ["stair-stringer", "E"],
  ["joist-deflection", "E"], ["footing-area", "E"], ["tile-count", "E"],
  ["paint-coverage", "E"], ["excavation", "E"], ["masonry-count", "E"],
  ["wind-pressure", "E"], ["snow-load", "E"], ["anchor-embedment", "E"],
  ["drywall", "E"], ["roofing-squares", "E"], ["asphalt-tonnage", "E"],
  ["aggregate", "E"], ["mortar-mix", "E"], ["concrete-mix-design", "E"],
  ["bolt-torque", "E"], ["bend-allowance", "E"], ["speeds-feeds", "E"],
  ["weld-usage", "E"], ["demo-debris", "E"], ["formwork-pressure", "E"],
  ["residential-framing", "E"], ["stair-stringer-layout", "E"],
  ["hip-valley-rafter", "E"], ["rebar-schedule", "E"], ["plywood-span", "E"],
  ["helical-pile", "E"], ["crane-lift-quick", "E"],
  ["excavation-bench-plan", "E"],

  ["fire-friction", "F"], ["pdp", "F"], ["hydrant-flow", "F"],
  ["required-fire-flow", "F"], ["master-stream", "F"], ["aerial-ladder", "F"],
  ["foam", "F"], ["smoke-reading", "F"], ["reverse-lay-friction", "F"],
  ["sprinkler-density", "F"], ["standpipe-friction", "F"], ["ladder-pipe-reach", "F"],
  ["braking-distance", "F"], ["confined-space-purge", "F"], ["rope-ma", "F"],
  ["sling-angle", "F"], ["iso-nff", "F"],
  ["scba-cylinder-time", "F"], ["nfpa-1142-water-supply", "F"],
  ["confined-space-vent", "F"],

  ["unit-converter", "G"], ["material-cost", "G"], ["markup", "G"],
  ["time-and-materials", "G"], ["sales-tax", "G"], ["tip-out", "G"],
  ["loan-payment", "G"], ["upgrade-roi", "G"], ["mileage-cost", "G"],
  ["overtime", "G"], ["per-diem", "G"], ["geometry", "G"],
  ["dilution", "G"], ["slope-from-level", "G"], ["haversine", "G"],
  ["trench-slope", "G"], ["niosh-lifting", "G"], ["heat-stress", "G"],
  ["wind-chill", "G"], ["ladder-angle", "G"], ["pulley-ma-gen", "G"],
  ["ramp-slope", "G"], ["rainwater-yield", "G"], ["timesheet", "G"],
  ["fall-protection-clearance", "G"], ["vehicle-load", "G"], ["noise-dose", "G"],
  ["job-estimate-rollup", "G"], ["material-order-list", "G"], ["job-pack", "G"],

  ["color-codes", "H"], ["knot-reference", "H"], ["inspection-checklist", "H"],
  ["emergency-contacts", "H"], ["tool-maintenance", "H"], ["hand-signals", "H"],
  ["osha-top10", "H"], ["loto-steps", "H"], ["defensible-space", "H"],
  ["storm-shelter", "H"], ["triage-quickread", "H"], ["irs-form-index", "H"],
  ["sales-tax-nexus", "H"], ["osha-recordkeeping", "H"], ["lab-safety-quickread", "H"],

  ["dim-weight", "J"], ["freight-density", "J"], ["pallet-loadout", "J"],
  ["hos-math", "J"], ["bridge-formula", "J"], ["reefer-burn", "J"],
  ["incoterm-decoder", "J"], ["stopping-sight-distance", "J"],

  ["weight-balance", "K"], ["prop-slip", "K"], ["displacement-cr", "K"],
  ["bolt-stretch", "K"], ["driveshaft-crit", "K"], ["fuel-range", "K"],
  ["tire-gearing", "K"], ["brake-pad-life", "K"],

  ["gpa-rate", "L"], ["timber-cruise", "L"], ["seed-rate", "L"],
  ["drawbar-power", "L"], ["irrigation-uniformity", "L"], ["bulk-density", "L"],
  ["crop-yield", "L"], ["thi-livestock", "L"], ["sprayer-calibration", "L"],

  ["pounds-formula", "M"], ["filter-loading", "M"], ["detention-time", "M"],
  ["lab-dilution", "M"], ["pump-eff-w2w", "M"], ["srt-fm-ratio", "M"],
  ["coagulant-dose", "M"], ["svi-sludge-index", "M"],
  ["disinfection-ct", "M"],

  ["truss-capacity", "N"], ["time-alignment", "N"], ["dmx-planner", "N"],
  ["neutral-imbalance", "N"], ["spl-distance", "N"], ["rigging-check", "N"],
  ["spl-atmospheric", "N"],

  ["recipe-scale", "O"], ["yield-ep", "O"], ["cooling-curve", "O"],
  ["plate-cost", "O"], ["pan-conversion", "O"], ["sous-vide-pasteurization", "O"],

  ["pacing-distance", "P"], ["bearing-conversion", "P"], ["slope-avalanche", "P"],
  ["backcountry-needs", "P"], ["utm-conversion", "P"], ["solar-times", "P"],
  ["lightning-countdown", "P"], ["magnetic-declination", "P"],

  ["historical-pricing", "Q"],

  ["straight-line-depreciation", "R"], ["macrs-depreciation", "R"], ["section-179", "R"],
  ["se-tax", "R"], ["estimated-tax", "R"], ["payroll-withholding", "R"],
  ["loan-amortization", "R"], ["breakeven", "R"], ["sales-tax-compound", "R"],
  ["inventory-turnover", "R"], ["cash-conversion-cycle", "R"], ["mileage-rollup", "R"],

  ["judgment-interest", "S"], ["court-deadline", "S"], ["statute-of-limitations", "S"],
  ["small-claims-reference", "S"], ["tenant-notice", "S"], ["wage-hour", "S"],
  ["contractor-vs-employee", "S"], ["contract-clause-reference", "S"], ["lease-term-reference", "S"],

  ["molarity-dilution", "T"], ["serial-dilution", "T"], ["molecular-weight", "T"],
  ["mass-moles", "T"], ["rcf-rpm", "T"], ["resuspension-volume", "T"],
  ["pcr-master-mix", "T"], ["beer-lambert", "T"], ["henderson-hasselbalch", "T"],
  ["hemocytometer", "T"],

  // v12 Group U: Veterinary.
  ["vet-weight-based-dose", "U"], ["vet-maintenance-fluid", "U"], ["vet-energy-requirement", "U"],

  // v12 Group V: EMS / Pre-hospital.
  ["glasgow-coma-scale", "V"], ["parkland-formula", "V"], ["cincinnati-stroke-scale", "V"],

  // v12 Group W: Pilots / Aviation.
  ["density-altitude", "W"], ["crosswind-component", "W"], ["ete-eta", "W"],

  // v12 Group X: Real Estate.
  ["ltv", "X"], ["dti", "X"], ["piti", "X"],

  // v12 Group Y: Educators / K-12.
  ["readability", "Y"],
  ["statistics-quickread", "Y"],
  ["quadratic-formula", "Y"],
  ["scientific-notation", "Y"],
];

export const TILE_META = {};
for (const [id, group] of _TILES) {
  TILE_META[id] = {
    id,
    group,
    simplified: SIMPLIFIED.has(id),
    requires_field_meter: FIELD_METER.has(id),
    companion_tiles: COMPANIONS[id] || [],
    a11y_verified_on: A11Y,
  };
}

export function getTileMeta(id) {
  if (typeof id !== "string") return null;
  return TILE_META[id] || null;
}

export function listSimplifiedTiles() {
  return Object.keys(TILE_META)
    .filter((id) => TILE_META[id].simplified)
    .sort();
}

export function listFieldMeterTiles() {
  return Object.keys(TILE_META)
    .filter((id) => TILE_META[id].requires_field_meter)
    .sort();
}
