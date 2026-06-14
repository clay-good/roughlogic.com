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
//   a11y_verified_on     date    - ISO date of last axe-core sweep.
//
// The full TOOLS-derived id+group list lives in `_TILES` below; the
// per-tile flags live in the small set tables above the loop. A future
// tile's meta is one new id/group row in `_TILES` plus, optionally, a
// SIMPLIFIED / FIELD_METER entry.

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
  "apgar-score",
  "iv-drip-rate",
  "o2-cylinder-duration",
  "pediatric-weight-estimate",
  "shock-index",
  "mean-arterial-pressure",
  "anion-gap",
  "corrected-calcium",
  "cha2ds2-vasc",
  "wells-dvt",
  "wells-pe",
  "perc-rule",
  "rule-of-9s",
  "pediatric-vitals",
  "nihss",
  "start-triage",
  "pediatric-tube-depth",
  "drug-concentration",
  "ideal-body-weight",
  "corrected-qt",
  // v12 Group U (Veterinary): every tile carries the veterinarian-
  // governs limitation banner per spec-v12 §5.
  "vet-weight-based-dose",
  "vet-maintenance-fluid",
  "vet-energy-requirement",
  "vet-bcs-reference",
  "vet-pet-age",
  "vet-gestation",
  "vet-ett-sizing",
  "vet-anesthesia-vitals",
  "vet-asa-classification",
  "vet-bloodwork-ranges",
  "vet-urine-sg",
  "vet-target-weight-loss",
  "vet-toxicity",
  "vet-breed-predispositions",
  "vet-plasma-css",
  "vet-vaccine-schedule",
  "vet-heartworm-dose",
  "vet-crystalloid-plan",
  "vet-cri",
  "vet-transfusion",
  "equine-weight",
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

// Every tile id + its group. Source of truth: TOOLS in app.js.
// Lint check-tile-meta.mjs verifies this stays in sync.
const _TILES = [
  ["isa-temp-correction", "W"],
  ["weight-shift-cg", "W"],
  ["landing-takeoff-da-correction", "W"],
  ["final-grade-needed", "Y"],
  ["category-weighted-grade", "Y"],
  ["two-sample-t-test", "Y"],
  ["gross-rent-multiplier", "X"],
  ["pmi-cancellation-date", "X"],
  ["seller-net-sheet", "X"],
  ["cockcroft-gault-crcl", "V"],
  ["winters-expected-pco2", "V"],
  ["aa-gradient", "V"],
  ["fena", "V"],
  ["vet-body-surface-area", "U"],
  ["vet-corrected-reticulocyte", "U"],
  ["vet-fluid-deficit", "U"],
  ["vet-anion-gap", "U"],
  ["primer-tm", "T"],
  ["cfu-plate-count", "T"],
  ["federal-post-judgment-interest", "S"],
  ["lease-rent-proration", "S"],
  ["declining-balance-depreciation", "R"],
  ["markup-vs-margin", "R"],
  ["employer-payroll-tax", "R"],
  ["search-probability", "P"],
  ["brine-cure", "O"], ["bakers-percentage", "O"],
  ["power-distro", "N"],
  ["weir-flow", "M"],
  ["langelier-index", "M"],
  ["chemical-feed-pump", "M"],
  ["growing-degree-days", "L"],
  ["pearson-square-ration", "L"],
  ["livestock-water-requirement", "L"],
  ["two-stroke-mix", "L"],
  ["hp-from-torque", "K"],
  ["volumetric-efficiency", "K"],
  ["gear-mph-rpm", "K"],
  ["cutting-speed-rpm", "K"],
  ["drill-point-depth", "K"],
  ["cost-per-mile", "J"],
  ["deadhead-percent", "J"],
  ["axle-load-distribution", "J"],
  ["elevation-pressure-loss", "F"],
  ["water-supply-duration", "F"],
  ["point-load-bearing", "E"],
  ["column-buckling-wood", "E"],
  ["beam-reactions", "E"],
  ["grains-removed", "D"],
  ["evaporation-load", "D"],
  ["economizer-savings-hours", "C"],
  ["pipe-heat-loss-radial", "C"],
  ["fan-motor-bhp", "C"],
  ["thermal-expansion-volume", "B"],
  ["vent-sizing-stack", "B"],
  ["gas-pipe-pressure-drop", "B"],
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
  ["pv-interconnection-busbar", "A"], ["off-grid-battery", "A"],
  ["voltage-drop-reactance", "A"], ["power-triangle", "A"], ["ev-charger-load", "A"],
  ["ambient-ampacity-adjust", "A"], ["service-load-optional", "A"],
  ["lux-to-footcandle", "A"],
  ["parallel-conductor-derate", "A"], ["neutral-current-3ph", "A"], ["motor-vd-starting", "A"],
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
  ["water-heater-recovery", "B"], ["wh-expansion-tank", "B"],
  ["sanitary-dfu", "B"], ["trap-primer", "B"], ["backflow-sizing", "B"],

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
  ["chiller-tons", "C"], ["hx-lmtd-ntu", "C"], ["air-changes-hour", "C"],
  ["boiler-pipe-sizing", "C"], ["compressor-short-cycle", "C"],
  ["humidifier-capacity", "C"], ["filter-pressure-drop", "C"],
  ["duct-velocity-pressure", "C"], ["refrigerant-velocity", "C"],

  ["psychrometric", "D"], ["drying-goal", "D"], ["dehumidifier", "D"],
  ["air-movers", "D"], ["water-classes", "D"], ["drying-times", "D"],
  ["mold", "D"], ["ppe", "D"], ["mold-remediation-level", "D"], ["mold-conditions", "D"],
  ["antimicrobial-dilution", "D"], ["air-sample-volume", "D"],
  ["moisture-dry-goal", "D"], ["flood-cut-quantity", "D"], ["standing-water", "D"],
  ["nam-sizing", "D"], ["hepa-filter-life", "D"], ["thermal-delta-t", "D"],
  ["containment-air-balance", "D"], ["chamber-turnover", "D"],
  ["drying-log", "D"], ["equipment-power-draw", "D"],

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
  ["header-sizing", "E"], ["deck-beam-post", "E"],

  ["fire-friction", "F"], ["pdp", "F"], ["hydrant-flow", "F"],
  ["required-fire-flow", "F"], ["master-stream", "F"], ["aerial-ladder", "F"],
  ["foam", "F"], ["smoke-reading", "F"], ["reverse-lay-friction", "F"],
  ["sprinkler-density", "F"], ["standpipe-friction", "F"], ["ladder-pipe-reach", "F"],
  ["braking-distance", "F"], ["confined-space-purge", "F"], ["rope-ma", "F"],
  ["sling-angle", "F"], ["iso-nff", "F"],
  ["scba-cylinder-time", "F"], ["nfpa-1142-water-supply", "F"],
  ["confined-space-vent", "F"],
  ["standpipe-pdp", "F"], ["smoke-ejector-cfm", "F"],
  ["fire-stream-reaction", "F"], ["sprinkler-k-factor", "F"],

  ["unit-converter", "G"], ["material-cost", "G"], ["markup", "G"],
  ["time-and-materials", "G"], ["sales-tax", "G"], ["tip-out", "G"],
  ["loan-payment", "G"], ["upgrade-roi", "G"], ["mileage-cost", "G"],
  ["overtime", "G"], ["per-diem", "G"], ["geometry", "G"],
  ["dilution", "G"], ["slope-from-level", "G"], ["haversine", "G"],
  ["trench-slope", "G"], ["niosh-lifting", "G"], ["heat-stress", "G"],
  ["wind-chill", "G"], ["ladder-angle", "G"], ["pulley-ma-gen", "G"],
  ["ramp-slope", "G"], ["rainwater-yield", "G"], ["timesheet", "G"],
  ["fall-protection-clearance", "G"], ["vehicle-load", "G"], ["noise-dose", "G"],
  ["pump-tdh", "G"], ["hydraulic-cylinder", "G"], ["vbelt-drive", "G"], ["gear-cascade", "G"],

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
  ["valve-flow-coefficient", "K"],

  ["gpa-rate", "L"], ["timber-cruise", "L"], ["seed-rate", "L"],
  ["drawbar-power", "L"], ["irrigation-uniformity", "L"], ["bulk-density", "L"],
  ["crop-yield", "L"], ["thi-livestock", "L"], ["sprayer-calibration", "L"],
  ["irrigation-requirement", "L"], ["cattle-stocking-rate", "L"],
  ["grain-bin-capacity", "L"], ["npk-blend", "L"], ["tank-mix", "L"],

  ["pounds-formula", "M"], ["filter-loading", "M"], ["detention-time", "M"],
  ["lab-dilution", "M"], ["pump-eff-w2w", "M"], ["srt-fm-ratio", "M"],
  ["coagulant-dose", "M"], ["svi-sludge-index", "M"],
  ["disinfection-ct", "M"],
  ["pool-turnover", "M"], ["well-drawdown", "M"],
  ["cooling-water-makeup", "M"], ["chlorine-decay", "M"],

  ["truss-capacity", "N"], ["time-alignment", "N"], ["dmx-planner", "N"],
  ["neutral-imbalance", "N"], ["spl-distance", "N"], ["rigging-check", "N"],
  ["spl-atmospheric", "N"],

  ["recipe-scale", "O"], ["yield-ep", "O"], ["cooling-curve", "O"],
  ["plate-cost", "O"], ["pan-conversion", "O"], ["sous-vide-pasteurization", "O"],

  ["pacing-distance", "P"], ["bearing-conversion", "P"], ["slope-avalanche", "P"],
  ["backcountry-needs", "P"], ["utm-conversion", "P"], ["solar-times", "P"],
  ["lightning-countdown", "P"], ["magnetic-declination", "P"],
  // spec-v24 conduit-bending / audio + spec-v25 surveying additions.
  ["conduit-offset", "A"], ["conduit-saddle", "A"], ["conduit-90-stub", "A"],
  ["weld-heat-input", "E"], ["metal-weight", "E"], ["layout-squaring", "E"],
  ["horizontal-curve", "E"], ["vertical-curve", "E"], ["earthwork-end-area", "E"], ["slope-stake-cut-fill", "E"],
  ["rolling-offset", "G"],
  ["speaker-impedance", "N"], ["decibel-converter", "N"], ["amp-power-spl", "N"], ["lighting-beam", "N"],
  ["area-by-coordinates", "P"], ["traverse-closure", "P"], ["hiking-time", "P"],

  ["historical-pricing", "Q"],

  ["straight-line-depreciation", "R"], ["macrs-depreciation", "R"], ["section-179", "R"],
  ["se-tax", "R"], ["estimated-tax", "R"], ["payroll-withholding", "R"],
  ["loan-amortization", "R"], ["breakeven", "R"], ["sales-tax-compound", "R"],
  ["inventory-turnover", "R"], ["cash-conversion-cycle", "R"], ["mileage-rollup", "R"],
  ["home-office", "R"],

  ["judgment-interest", "S"], ["court-deadline", "S"], ["statute-of-limitations", "S"],
  ["small-claims-reference", "S"], ["tenant-notice", "S"], ["wage-hour", "S"],
  ["contractor-vs-employee", "S"], ["contract-clause-reference", "S"], ["lease-term-reference", "S"],
  ["wage-garnishment", "S"],

  ["molarity-dilution", "T"], ["serial-dilution", "T"], ["molecular-weight", "T"],
  ["mass-moles", "T"], ["rcf-rpm", "T"], ["resuspension-volume", "T"],
  ["pcr-master-mix", "T"], ["beer-lambert", "T"], ["henderson-hasselbalch", "T"],
  ["hemocytometer", "T"], ["od600-cell-count", "T"],

  // v12 Group U: Veterinary.
  ["vet-weight-based-dose", "U"], ["vet-maintenance-fluid", "U"], ["vet-energy-requirement", "U"],
  ["vet-bcs-reference", "U"], ["vet-pet-age", "U"], ["vet-gestation", "U"],
  ["vet-ett-sizing", "U"], ["vet-anesthesia-vitals", "U"], ["vet-asa-classification", "U"],
  ["vet-bloodwork-ranges", "U"], ["vet-urine-sg", "U"], ["vet-target-weight-loss", "U"],
  ["vet-toxicity", "U"], ["vet-breed-predispositions", "U"], ["vet-plasma-css", "U"],
  ["vet-vaccine-schedule", "U"], ["vet-heartworm-dose", "U"], ["vet-crystalloid-plan", "U"],
  ["vet-cri", "U"], ["vet-transfusion", "U"], ["equine-weight", "U"],

  // v12 Group V: EMS / Pre-hospital.
  ["glasgow-coma-scale", "V"], ["parkland-formula", "V"], ["cincinnati-stroke-scale", "V"],
  ["apgar-score", "V"], ["iv-drip-rate", "V"], ["o2-cylinder-duration", "V"],
  ["pediatric-weight-estimate", "V"], ["shock-index", "V"], ["mean-arterial-pressure", "V"],
  ["anion-gap", "V"], ["corrected-calcium", "V"], ["cha2ds2-vasc", "V"],
  ["wells-dvt", "V"], ["wells-pe", "V"], ["perc-rule", "V"],
  ["rule-of-9s", "V"], ["pediatric-vitals", "V"], ["nihss", "V"],
  ["start-triage", "V"], ["drug-concentration", "V"],
  ["ideal-body-weight", "V"], ["corrected-qt", "V"],

  // v12 Group W: Pilots / Aviation.
  ["density-altitude", "W"], ["crosswind-component", "W"], ["ete-eta", "W"],
  ["hypoxia-altitude", "W"], ["pressure-altitude", "W"], ["phonetic-alphabet", "W"],
  ["fuel-planning", "W"], ["wind-triangle", "W"], ["top-of-descent", "W"],
  ["weather-phrasing", "W"], ["transponder-codes", "W"], ["standard-turn-rate", "W"],
  ["true-airspeed", "W"], ["sectional-symbols", "W"], ["aircraft-category", "W"],
  ["magnetic-variation", "W"], ["metar-decoder", "W"], ["taf-decoder", "W"],
  ["holding-fuel", "W"],

  // v12 Group X: Real Estate.
  ["ltv", "X"], ["dti", "X"], ["piti", "X"],
  ["exchange-1031-timeline", "X"], ["section-121-exclusion", "X"], ["property-tax", "X"],
  ["cap-rate-dscr", "X"], ["cash-on-cash", "X"], ["commission-split", "X"],
  ["amortization-schedule", "X"], ["cost-of-waiting", "X"], ["closing-costs", "X"],
  ["rental-worksheet", "X"],
  ["loan-limits", "X"], ["hud-fmr", "X"],
  ["mortgage-point-breakeven", "X"], ["per-diem-interest", "X"], ["mortgage-reserves", "X"],
  ["rent-vs-buy", "X"],

  // v12 Group Y: Educators / K-12.
  ["readability", "Y"],
  ["statistics-quickread", "Y"],
  ["quadratic-formula", "Y"],
  ["scientific-notation", "Y"],
  ["significant-figures", "Y"],
  ["codon-table", "Y"],
  ["base-converter", "Y"],
  ["gpa-calculator", "Y"],
  ["confidence-interval", "Y"],
  ["linear-system-2x2", "Y"],
  ["lexile-band", "Y"],
  ["standards-based-grade", "Y"],
  ["bell-curve-zscore", "Y"],
  ["alternate-readability", "Y"],
  ["periodic-element", "Y"], ["pearson-correlation", "Y"],
  ["chi-square-gof", "Y"], ["linear-regression", "Y"],
  ["curve-grade-scaler", "Y"],

  // v23 Part II batch 2 (15 new tiles)
  ["trap-seal-loss", "B"], ["water-meter-sizing", "B"],
  ["drying-chamber-co2", "D"],
  ["wall-bracing-length", "E"], ["deck-ledger-fasteners", "E"],
  ["cargo-securement-wll", "J"], ["fuel-tax-ifta", "J"],
  ["screw-conveyor", "K"],
  ["pesticide-rei-phi", "L"],
  ["backflow-test-psi", "M"],
  ["gel-percent-agarose", "T"],
  ["pediatric-tube-depth", "V"],
  ["weight-shift-fuel-burn", "W"],
  ["depreciation-recapture", "X"], ["rent-roll-vacancy", "X"],

  // v26 electrician / plumber / pipefitter (Groups A, B, G)
  ["motor-feeder-multiple", "A"], ["transformer-conductor-protection", "A"],
  ["mixed-water-temp", "B"], ["pressure-tank-drawdown", "B"], ["pipe-velocity", "B"],
  ["wsfu-demand", "B"], ["supply-pressure-budget", "B"],
  ["roof-drain-sizing", "B"], ["sump-basin-sizing", "B"],
  ["gas-appliance-demand", "B"], ["tpr-discharge", "B"],
  ["pipe-support-spacing", "B"], ["softener-sizing", "B"],
  ["pipe-fitting-takeout", "G"], ["pipe-miter-cut", "G"],
  ["pipe-template-wrap", "G"], ["flange-bolt-torque", "G"],

  // v27 welding bench (E), sheet-metal bench (C), rigger's bench (G)
  ["fillet-weld-strength", "E"], ["round-to-rect-duct", "C"], ["center-of-gravity-2point", "G"],
  ["bolt-circle", "G"],
  ["decimal-to-fraction", "G"],
  ["sine-bar", "G"],
  ["thread-pitch", "G"],

  // v40 machine-shop & fab bench (new calc-shop.js module; mixed group letters K/G/E)
  ["machining-time", "K"], ["material-removal-rate", "K"], ["turning-surface-finish", "K"],
  ["taper-calc", "K"], ["dividing-head", "K"],
  ["thread-measure-wire", "G"], ["punch-force", "G"],
  ["press-brake-tonnage", "E"], ["weld-duty-cycle", "E"], ["carbon-equivalent", "E"],

  // v41 machine-shop & fab bench batch 2 (calc-shop.js; natural group letters K/G)
  ["tap-drill-size", "K"], ["rolled-blank", "G"],

  // v54 compound miter for crown molding (calc-shop.js; Group E carpentry)
  ["compound-miter", "E"],

  // v43 cross-trade tank gauging (calc-cross.js)
  ["tank-volume", "G"], ["linear-interpolation", "G"],

  // v44 cross-trade circular-arc layout (calc-layout.js)
  ["circular-arc", "G"],

  // v47 cross-trade circle-from-3-points layout (calc-layout.js)
  ["circle-from-3-points", "G"],

  // v55 cross-trade regular-polygon miter & layout (calc-layout.js)
  ["polygon-miter", "G"],

  // v57 cross-trade equal-spacing layout (calc-layout.js)
  ["equal-spacing", "G"],

  // v28 low-voltage / data / security cabling (Group A pending Group-Z signoff)
  ["fiber-loss-budget", "A"], ["cable-tray-fill", "A"], ["cctv-storage", "A"],
  ["speaker-70v-line", "A"], ["standby-battery-sizing", "A"], ["coax-rg-loss", "A"],

  // v29 pipe / raceway field-layout bench (deepens Groups B, A, G)
  ["pipe-cold-spring", "B"], ["raceway-expansion-fitting", "A"], ["pipe-spacing-rack", "G"],

  // v30 metal / air / refrigerant bench (deepens Groups E, C)
  ["groove-weld-strength", "E"], ["duct-static-pressure-total", "C"], ["compression-ratio-refrig", "C"],

  // v65 Group Z (Rigging and Heavy Lift)
  ["cg-load-share", "Z"], ["crane-net-capacity", "Z"], ["crane-ground-bearing", "Z"],
  ["sling-d-d-efficiency", "Z"], ["wind-on-load", "Z"], ["tagline-force", "Z"], ["tandem-lift-share", "Z"],
];


export const TILE_META = {};
for (const [id, group] of _TILES) {
  TILE_META[id] = {
    id,
    group,
    simplified: SIMPLIFIED.has(id),
    requires_field_meter: FIELD_METER.has(id),
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
