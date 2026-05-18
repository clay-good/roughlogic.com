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
  "drug-concentration",
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
  ["vet-bcs-reference", "U"], ["vet-pet-age", "U"], ["vet-gestation", "U"],
  ["vet-ett-sizing", "U"], ["vet-anesthesia-vitals", "U"], ["vet-asa-classification", "U"],
  ["vet-bloodwork-ranges", "U"], ["vet-urine-sg", "U"], ["vet-target-weight-loss", "U"],
  ["vet-toxicity", "U"], ["vet-breed-predispositions", "U"], ["vet-plasma-css", "U"],
  ["vet-vaccine-schedule", "U"], ["vet-heartworm-dose", "U"], ["vet-crystalloid-plan", "U"],

  // v12 Group V: EMS / Pre-hospital.
  ["glasgow-coma-scale", "V"], ["parkland-formula", "V"], ["cincinnati-stroke-scale", "V"],
  ["apgar-score", "V"], ["iv-drip-rate", "V"], ["o2-cylinder-duration", "V"],
  ["pediatric-weight-estimate", "V"], ["shock-index", "V"], ["mean-arterial-pressure", "V"],
  ["anion-gap", "V"], ["corrected-calcium", "V"], ["cha2ds2-vasc", "V"],
  ["wells-dvt", "V"], ["wells-pe", "V"], ["perc-rule", "V"],
  ["rule-of-9s", "V"], ["pediatric-vitals", "V"], ["nihss", "V"],
  ["start-triage", "V"], ["drug-concentration", "V"],

  // v12 Group W: Pilots / Aviation.
  ["density-altitude", "W"], ["crosswind-component", "W"], ["ete-eta", "W"],
  ["hypoxia-altitude", "W"], ["pressure-altitude", "W"], ["phonetic-alphabet", "W"],
  ["fuel-planning", "W"], ["wind-triangle", "W"], ["top-of-descent", "W"],
  ["weather-phrasing", "W"], ["transponder-codes", "W"], ["standard-turn-rate", "W"],
  ["true-airspeed", "W"], ["sectional-symbols", "W"], ["aircraft-category", "W"],
  ["magnetic-variation", "W"], ["metar-decoder", "W"], ["taf-decoder", "W"],

  // v12 Group X: Real Estate.
  ["ltv", "X"], ["dti", "X"], ["piti", "X"],
  ["exchange-1031-timeline", "X"], ["section-121-exclusion", "X"], ["property-tax", "X"],
  ["cap-rate-dscr", "X"], ["cash-on-cash", "X"], ["commission-split", "X"],
  ["amortization-schedule", "X"], ["cost-of-waiting", "X"], ["closing-costs", "X"],
  ["rental-worksheet", "X"],
  ["loan-limits", "X"], ["hud-fmr", "X"],

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
  ["periodic-element", "Y"],
];

// spec-v13 Phase E (related-tiles registry, partial). The `related` field
// on each TILE_META row drives the spec-v13 §5.2 "Related tiles" block on
// each per-tile shell and the §9.1 internal link graph. When `related` is
// empty (the default), build-shells.mjs falls back to "first 5 other tiles
// in the same group" by TOOLS order; when populated, the curated set wins.
// The full §9 buildout is a contributor task; the seed below covers the
// strongest semantic edges that already recur across the codebase (the
// citation cross-refs, the worked-example narratives, the unit-test
// fixture neighbors).
//
// Each entry is an array of 3-6 tile ids in the order they should appear
// on the shell. Every entry is validated by scripts/check-tile-meta.mjs:
// each id must exist in TOOLS, no entry may include the tile itself, and
// the length must be <= 6.
const RELATED = {
  // Group A: Electrical core loop. ohms-law is the gateway tile; the
  // surrounding tiles are the most-frequent "I came here for X, what's
  // next?" landing points across the v0.1.0 unit-test fixtures and the
  // spec.md §10 worked examples.
  "ohms-law": ["voltage-drop", "wire-ampacity", "three-phase", "copper-resistance"],
  "wire-ampacity": ["ohms-law", "voltage-drop", "conduit-fill", "breaker-sizing", "motor-fla"],
  "voltage-drop": ["ohms-law", "wire-ampacity", "copper-resistance", "three-phase"],
  "conduit-fill": ["box-fill", "wire-ampacity", "cable-bend-radius"],
  "breaker-sizing": ["wire-ampacity", "motor-fla", "service-load"],
  "motor-fla": ["wire-ampacity", "breaker-sizing", "three-phase", "voltage-imbalance"],

  // Group B: Plumbing core loop. The hydraulics ladder runs
  // pipe-sizing -> friction-loss -> pump-sizing -> npsh-a; the spec.md
  // worked example walks that exact sequence.
  "pipe-sizing": ["friction-loss", "pump-sizing", "pipe-volume"],
  "friction-loss": ["pipe-sizing", "pump-sizing", "static-pressure-piping", "hydrant-flow"],
  "pump-sizing": ["friction-loss", "pipe-sizing", "npsh-a", "pump-operating-point"],
  "pipe-volume": ["pipe-sizing", "friction-loss"],

  // Group C: HVAC. Manual J is the most-asked entry point; duct-sizing and
  // refrigerant-pt are the second-tier landings. The spec-v3 §HVAC notes
  // record the worker boundary between manual-j-cooling and duct-sizing.
  "manual-j-cooling": ["manual-j-heating", "duct-sizing", "shr", "cfm-per-ton"],
  "manual-j-heating": ["manual-j-cooling", "baseboard-output", "balance-point"],
  "duct-sizing": ["static-pressure-hvac", "equivalent-length", "cfm-per-ton", "manual-j-cooling"],
  "refrigerant-pt": ["superheat-subcool", "refrigerant-charge", "compare-refrigerants"],
  "superheat-subcool": ["refrigerant-pt", "refrigerant-charge", "approach-delta-t"],

  // Group D: Restoration. psychrometric -> drying-goal -> dehumidifier ->
  // air-movers is the canonical workflow the spec.md restoration
  // narrative walks; mold and water-classes are the most-asked sidebars.
  "psychrometric": ["drying-goal", "wet-bulb-psychrometer", "dehumidifier"],
  "drying-goal": ["psychrometric", "dehumidifier", "air-movers", "drying-times"],
  "dehumidifier": ["psychrometric", "drying-goal", "air-movers", "nam-sizing"],

  // Group F: Fire-ground. The pump-pressure ladder is fire-friction ->
  // pdp -> hydrant-flow -> required-fire-flow; the v6 §F worked examples
  // walk that sequence and the fixtures in calc-fire.test.js record it.
  "fire-friction": ["pdp", "hydrant-flow", "required-fire-flow", "reverse-lay-friction"],
  "pdp": ["fire-friction", "hydrant-flow", "required-fire-flow", "master-stream"],
  "hydrant-flow": ["required-fire-flow", "fire-friction", "pdp"],
  "required-fire-flow": ["hydrant-flow", "fire-friction", "iso-nff", "sprinkler-density"],
  "master-stream": ["fire-friction", "pdp", "ladder-pipe-reach"],
  "foam": ["fire-friction", "pdp"],
  "rope-ma": ["pulley-ma-gen", "sling-angle"],

  // Group E: Construction. The framing ladder runs rafter ->
  // roof-pitch -> hip-valley-rafter and the concrete ladder runs
  // concrete -> rebar -> footing-area; the spec.md §E narrative walks
  // both and the calc-construction.test.js fixtures record them.
  "concrete": ["rebar", "footing-area", "concrete-mix-design", "aggregate"],
  "rebar": ["concrete", "rebar-schedule", "footing-area"],
  "rafter": ["roof-pitch", "hip-valley-rafter", "lumber-spans"],
  "roof-pitch": ["rafter", "roofing-squares", "snow-load"],
  "stairs": ["stair-stringer", "stair-stringer-layout", "rafter"],
  "stair-stringer": ["stairs", "stair-stringer-layout", "joist-deflection"],
  "beam-loading": ["lumber-spans", "joist-deflection", "snow-load"],
  "lumber-spans": ["beam-loading", "joist-deflection", "rafter", "plywood-span"],
  "footing-area": ["concrete", "anchor-embedment", "helical-pile"],
  "snow-load": ["wind-pressure", "roof-pitch", "rafter"],
  "wind-pressure": ["snow-load", "anchor-embedment"],

  // Group G: Cross-trade. unit-converter is the gateway; the geometry
  // / haversine / slope cluster supports the field tiles in Group P;
  // the cost cluster (material-cost, markup, time-and-materials,
  // loan-payment) supports estimating workflows.
  "unit-converter": ["geometry", "slope-from-level", "haversine"],
  "material-cost": ["markup", "time-and-materials", "sales-tax", "upgrade-roi"],
  "markup": ["material-cost", "time-and-materials", "tip-out"],
  "time-and-materials": ["material-cost", "markup", "overtime", "per-diem"],
  "loan-payment": ["upgrade-roi", "mileage-cost"],
  "niosh-lifting": ["heat-stress", "fall-protection-clearance", "noise-dose"],
  "heat-stress": ["niosh-lifting", "wind-chill", "noise-dose"],
  "haversine": ["geometry", "unit-converter", "trench-slope"],
  "ladder-angle": ["fall-protection-clearance", "sling-angle"],
  "pulley-ma-gen": ["rope-ma", "sling-angle"],

  // Group J: Trucking. dim-weight, freight-density, pallet-loadout are
  // the freight-quoting trio; hos-math + bridge-formula are the DOT
  // compliance trio; stopping-sight-distance bridges to braking.
  "dim-weight": ["freight-density", "pallet-loadout"],
  "freight-density": ["dim-weight", "pallet-loadout"],
  "pallet-loadout": ["dim-weight", "freight-density"],
  "hos-math": ["bridge-formula", "stopping-sight-distance"],
  "bridge-formula": ["hos-math", "stopping-sight-distance"],

  // Group K: Mechanic. weight-balance + prop-slip for marine /
  // aviation; displacement-cr + driveshaft-crit + fuel-range for auto.
  "weight-balance": ["fuel-range", "prop-slip"],
  "prop-slip": ["weight-balance", "displacement-cr"],
  "displacement-cr": ["bolt-stretch", "driveshaft-crit"],
  "fuel-range": ["weight-balance", "mileage-cost"],

  // Group L: Agriculture. gpa-rate -> sprayer-calibration -> seed-rate
  // is the field-prep workflow; thi-livestock + crop-yield support the
  // animal / harvest narratives.
  "gpa-rate": ["sprayer-calibration", "seed-rate", "irrigation-uniformity"],
  "sprayer-calibration": ["gpa-rate", "seed-rate"],
  "seed-rate": ["gpa-rate", "sprayer-calibration", "crop-yield"],
  "irrigation-uniformity": ["gpa-rate", "bulk-density"],

  // Group M: Water and Wastewater. pounds-formula -> detention-time ->
  // disinfection-ct is the canonical chlorination workflow; the v6 §M
  // worked examples walk it.
  "pounds-formula": ["detention-time", "disinfection-ct", "coagulant-dose"],
  "detention-time": ["pounds-formula", "disinfection-ct", "filter-loading"],
  "disinfection-ct": ["detention-time", "pounds-formula", "coagulant-dose"],
  "coagulant-dose": ["pounds-formula", "disinfection-ct"],
  "filter-loading": ["detention-time", "pump-eff-w2w"],

  // Group U / V: Vet + EMS. The most-asked cross-references in the
  // worked-example fixtures.
  "vet-weight-based-dose": ["vet-maintenance-fluid", "vet-energy-requirement", "vet-toxicity"],
  "vet-maintenance-fluid": ["vet-weight-based-dose", "vet-crystalloid-plan", "vet-energy-requirement"],
  "parkland-formula": ["rule-of-9s", "iv-drip-rate"],
  "glasgow-coma-scale": ["nihss", "cincinnati-stroke-scale"],
  "rule-of-9s": ["parkland-formula", "iv-drip-rate"],

  // Group W / X / Y: Aviation, Real Estate, Educators.
  "density-altitude": ["pressure-altitude", "true-airspeed", "hypoxia-altitude"],
  "true-airspeed": ["density-altitude", "pressure-altitude", "wind-triangle"],
  "wind-triangle": ["crosswind-component", "true-airspeed", "ete-eta"],
  "piti": ["ltv", "dti", "amortization-schedule"],
  "ltv": ["piti", "dti", "loan-limits"],
  "dti": ["piti", "ltv"],
  "amortization-schedule": ["piti", "loan-payment"],
  "readability": ["alternate-readability", "lexile-band"],
  "gpa-calculator": ["standards-based-grade", "bell-curve-zscore"],

  // Group H: References. Cross-cutting reference tiles that pair with
  // a specific calculator group (color-codes pairs with electrical;
  // knot-reference pairs with rope-ma; loto-steps pairs with the
  // electrical service-load and the OSHA references).
  "color-codes": ["knot-reference", "hand-signals", "inspection-checklist"],
  "knot-reference": ["rope-ma", "sling-angle", "hand-signals"],
  "loto-steps": ["service-load", "osha-top10", "inspection-checklist"],
  "osha-top10": ["loto-steps", "osha-recordkeeping", "niosh-lifting"],
  "osha-recordkeeping": ["osha-top10", "loto-steps"],
  "irs-form-index": ["sales-tax-nexus", "se-tax", "estimated-tax"],
  "sales-tax-nexus": ["sales-tax-compound", "sales-tax", "irs-form-index"],
  "lab-safety-quickread": ["molarity-dilution", "serial-dilution", "ppe"],
  "triage-quickread": ["start-triage", "glasgow-coma-scale", "parkland-formula"],

  // Group N: Stage and Live Production. The audio cluster
  // (spl-distance, spl-atmospheric, time-alignment) pairs with the
  // rigging cluster (truss-capacity, rigging-check) via dmx-planner.
  "truss-capacity": ["rigging-check", "sling-angle", "beam-loading"],
  "rigging-check": ["truss-capacity", "sling-angle", "rope-ma"],
  "spl-distance": ["spl-atmospheric", "time-alignment"],
  "spl-atmospheric": ["spl-distance", "time-alignment"],
  "time-alignment": ["spl-distance", "spl-atmospheric"],
  "dmx-planner": ["neutral-imbalance", "spl-distance"],

  // Group O: Kitchen and Food Service. recipe-scale -> yield-ep ->
  // plate-cost is the costing workflow; cooling-curve + sous-vide-
  // pasteurization are the food-safety pair.
  "recipe-scale": ["yield-ep", "plate-cost", "pan-conversion"],
  "yield-ep": ["recipe-scale", "plate-cost"],
  "plate-cost": ["recipe-scale", "yield-ep", "markup"],
  "pan-conversion": ["recipe-scale", "yield-ep"],
  "cooling-curve": ["sous-vide-pasteurization"],
  "sous-vide-pasteurization": ["cooling-curve"],

  // Group P: Field / Backcountry / SAR. pacing-distance + utm-
  // conversion + haversine are the navigation trio; bearing-conversion
  // + magnetic-declination handle compass work; lightning-countdown +
  // slope-avalanche handle the field-safety reference.
  "pacing-distance": ["utm-conversion", "haversine", "bearing-conversion"],
  "utm-conversion": ["pacing-distance", "haversine", "bearing-conversion"],
  "bearing-conversion": ["magnetic-declination", "pacing-distance", "utm-conversion"],
  "magnetic-declination": ["bearing-conversion", "solar-times"],
  "slope-avalanche": ["snow-load", "backcountry-needs"],
  "lightning-countdown": ["solar-times", "backcountry-needs"],
  "solar-times": ["magnetic-declination", "lightning-countdown"],
  "backcountry-needs": ["slope-avalanche", "lightning-countdown", "pacing-distance"],

  // Group R: Accounting / Tax / Small-Business. The depreciation
  // ladder (straight-line, MACRS, section-179) is one cluster; the
  // tax-prep ladder (se-tax, estimated-tax, payroll-withholding) is
  // another; the cash-flow trio (breakeven, inventory-turnover,
  // cash-conversion-cycle) is the third.
  "straight-line-depreciation": ["macrs-depreciation", "section-179"],
  "macrs-depreciation": ["straight-line-depreciation", "section-179"],
  "section-179": ["macrs-depreciation", "straight-line-depreciation"],
  "se-tax": ["estimated-tax", "payroll-withholding", "irs-form-index"],
  "estimated-tax": ["se-tax", "payroll-withholding"],
  "payroll-withholding": ["se-tax", "estimated-tax"],
  "loan-amortization": ["amortization-schedule", "loan-payment", "breakeven"],
  "breakeven": ["loan-amortization", "inventory-turnover", "markup"],
  "inventory-turnover": ["cash-conversion-cycle", "breakeven"],
  "cash-conversion-cycle": ["inventory-turnover", "breakeven"],
  "sales-tax-compound": ["sales-tax-nexus", "sales-tax"],
  "mileage-rollup": ["mileage-cost", "fuel-range"],

  // Group S: Legal Plain-English. court-deadline + statute-of-
  // limitations + small-claims are the procedural trio; tenant-notice
  // + lease-term-reference + wage-hour pair the landlord-tenant and
  // employment references; contractor-vs-employee pairs with the
  // Group R payroll cluster.
  "court-deadline": ["statute-of-limitations", "small-claims-reference"],
  "statute-of-limitations": ["court-deadline", "small-claims-reference"],
  "small-claims-reference": ["court-deadline", "statute-of-limitations"],
  "tenant-notice": ["lease-term-reference", "wage-hour"],
  "lease-term-reference": ["tenant-notice", "contract-clause-reference"],
  "wage-hour": ["contractor-vs-employee", "payroll-withholding", "tenant-notice"],
  "contractor-vs-employee": ["wage-hour", "payroll-withholding", "se-tax"],
  "contract-clause-reference": ["lease-term-reference", "tenant-notice"],
  "judgment-interest": ["statute-of-limitations", "loan-amortization"],

  // Group T: Bench Science. molarity-dilution -> serial-dilution ->
  // resuspension-volume is the wet-lab workflow; molecular-weight +
  // mass-moles + beer-lambert are the quantitation cluster; rcf-rpm +
  // hemocytometer are the bench-instrument pair.
  "molarity-dilution": ["serial-dilution", "resuspension-volume", "mass-moles"],
  "serial-dilution": ["molarity-dilution", "resuspension-volume"],
  "resuspension-volume": ["molarity-dilution", "serial-dilution"],
  "molecular-weight": ["mass-moles", "molarity-dilution"],
  "mass-moles": ["molecular-weight", "molarity-dilution"],
  "beer-lambert": ["henderson-hasselbalch", "molecular-weight"],
  "henderson-hasselbalch": ["beer-lambert", "molarity-dilution"],
  "rcf-rpm": ["hemocytometer", "resuspension-volume"],
  "hemocytometer": ["rcf-rpm", "molarity-dilution"],
  "pcr-master-mix": ["molarity-dilution", "serial-dilution"],

  // Group U: Veterinary (fill-in beyond the prior seed). The dose
  // ladder is vet-weight-based-dose -> vet-toxicity -> vet-
  // heartworm-dose; the anesthesia cluster is vet-asa-classification
  // -> vet-anesthesia-vitals -> vet-ett-sizing.
  "vet-energy-requirement": ["vet-weight-based-dose", "vet-maintenance-fluid", "vet-target-weight-loss"],
  "vet-bcs-reference": ["vet-target-weight-loss", "vet-energy-requirement"],
  "vet-target-weight-loss": ["vet-bcs-reference", "vet-energy-requirement"],
  "vet-toxicity": ["vet-weight-based-dose", "vet-maintenance-fluid"],
  "vet-ett-sizing": ["vet-anesthesia-vitals", "vet-asa-classification"],
  "vet-anesthesia-vitals": ["vet-ett-sizing", "vet-asa-classification"],
  "vet-asa-classification": ["vet-anesthesia-vitals", "vet-ett-sizing"],
  "vet-crystalloid-plan": ["vet-maintenance-fluid", "vet-weight-based-dose"],
  "vet-heartworm-dose": ["vet-weight-based-dose", "vet-vaccine-schedule"],
  "vet-vaccine-schedule": ["vet-pet-age", "vet-heartworm-dose"],
  "vet-pet-age": ["vet-bcs-reference", "vet-vaccine-schedule"],
  "vet-bloodwork-ranges": ["vet-urine-sg", "vet-plasma-css"],

  // Group V: EMS (fill-in). The cardiac-risk trio (cha2ds2-vasc,
  // wells-dvt, wells-pe) pair through perc-rule; the pediatric cluster
  // (pediatric-vitals, pediatric-weight-estimate, apgar-score) pair
  // through iv-drip-rate; shock-index + mean-arterial-pressure +
  // anion-gap are the bedside-math trio.
  "shock-index": ["mean-arterial-pressure", "anion-gap"],
  "mean-arterial-pressure": ["shock-index", "anion-gap"],
  "anion-gap": ["mean-arterial-pressure", "corrected-calcium"],
  "corrected-calcium": ["anion-gap"],
  "cha2ds2-vasc": ["wells-dvt", "wells-pe", "perc-rule"],
  "wells-dvt": ["wells-pe", "perc-rule", "cha2ds2-vasc"],
  "wells-pe": ["wells-dvt", "perc-rule", "cha2ds2-vasc"],
  "perc-rule": ["wells-pe", "wells-dvt"],
  "pediatric-vitals": ["pediatric-weight-estimate", "apgar-score"],
  "pediatric-weight-estimate": ["pediatric-vitals", "drug-concentration"],
  "apgar-score": ["pediatric-vitals", "pediatric-weight-estimate"],
  "iv-drip-rate": ["drug-concentration", "o2-cylinder-duration"],
  "drug-concentration": ["iv-drip-rate", "pediatric-weight-estimate"],
  "o2-cylinder-duration": ["iv-drip-rate", "scba-cylinder-time"],
  "start-triage": ["triage-quickread", "glasgow-coma-scale"],
  "nihss": ["cincinnati-stroke-scale", "glasgow-coma-scale"],
  "cincinnati-stroke-scale": ["nihss", "glasgow-coma-scale"],

  // Group W: Aviation (fill-in). The weather cluster (metar-decoder,
  // taf-decoder, weather-phrasing) pairs through hypoxia-altitude and
  // pressure-altitude; the cross-country planning cluster (fuel-
  // planning, ete-eta, top-of-descent) pairs through wind-triangle.
  "pressure-altitude": ["density-altitude", "true-airspeed", "hypoxia-altitude"],
  "crosswind-component": ["wind-triangle", "true-airspeed"],
  "hypoxia-altitude": ["density-altitude", "pressure-altitude"],
  "metar-decoder": ["taf-decoder", "weather-phrasing"],
  "taf-decoder": ["metar-decoder", "weather-phrasing"],
  "weather-phrasing": ["metar-decoder", "taf-decoder"],
  "fuel-planning": ["ete-eta", "top-of-descent", "wind-triangle"],
  "ete-eta": ["fuel-planning", "wind-triangle", "top-of-descent"],
  "top-of-descent": ["ete-eta", "fuel-planning", "standard-turn-rate"],
  "magnetic-variation": ["bearing-conversion", "wind-triangle"],
  "phonetic-alphabet": ["transponder-codes", "weather-phrasing"],
  "transponder-codes": ["phonetic-alphabet", "weather-phrasing"],
  "standard-turn-rate": ["top-of-descent", "wind-triangle"],
  "aircraft-category": ["sectional-symbols", "transponder-codes"],
  "sectional-symbols": ["aircraft-category", "metar-decoder"],

  // Group X: Real Estate (fill-in). The investment trio (cap-rate-dscr,
  // cash-on-cash, rental-worksheet) pair through closing-costs;
  // exchange-1031-timeline + section-121-exclusion pair the tax-aware
  // moves; property-tax + loan-limits + hud-fmr round out the data-
  // driven references.
  "cap-rate-dscr": ["cash-on-cash", "rental-worksheet", "amortization-schedule"],
  "cash-on-cash": ["cap-rate-dscr", "rental-worksheet"],
  "rental-worksheet": ["cap-rate-dscr", "cash-on-cash", "hud-fmr"],
  "exchange-1031-timeline": ["section-121-exclusion", "cap-rate-dscr"],
  "section-121-exclusion": ["exchange-1031-timeline", "property-tax"],
  "property-tax": ["piti", "ltv"],
  "closing-costs": ["piti", "amortization-schedule"],
  "commission-split": ["closing-costs", "rental-worksheet"],
  "cost-of-waiting": ["piti", "amortization-schedule"],
  "loan-limits": ["ltv", "piti", "hud-fmr"],
  "hud-fmr": ["rental-worksheet", "property-tax", "loan-limits"],

  // Group Y: Educators (fill-in). The readability cluster pairs with
  // lexile-band; the math-class cluster (quadratic-formula, linear-
  // system-2x2, scientific-notation, significant-figures) pairs
  // through the numeric helpers; statistics-quickread + confidence-
  // interval + bell-curve-zscore are the stats trio.
  "alternate-readability": ["readability", "lexile-band"],
  "lexile-band": ["readability", "alternate-readability"],
  "standards-based-grade": ["gpa-calculator", "bell-curve-zscore"],
  "bell-curve-zscore": ["confidence-interval", "statistics-quickread", "standards-based-grade"],
  "confidence-interval": ["bell-curve-zscore", "statistics-quickread"],
  "statistics-quickread": ["confidence-interval", "bell-curve-zscore"],
  "quadratic-formula": ["linear-system-2x2", "scientific-notation"],
  "linear-system-2x2": ["quadratic-formula", "scientific-notation"],
  "scientific-notation": ["significant-figures", "linear-system-2x2"],
  "significant-figures": ["scientific-notation", "base-converter"],
  "base-converter": ["scientific-notation", "significant-figures"],
  "codon-table": ["periodic-element", "molecular-weight"],
  "periodic-element": ["codon-table", "molecular-weight"],
};

export const TILE_META = {};
for (const [id, group] of _TILES) {
  TILE_META[id] = {
    id,
    group,
    simplified: SIMPLIFIED.has(id),
    requires_field_meter: FIELD_METER.has(id),
    a11y_verified_on: A11Y,
    related: RELATED[id] || [],
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
