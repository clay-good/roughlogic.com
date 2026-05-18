// spec-v13 Phase E per-tile related-tiles registry (build-time only).
//
// Originally lived alongside TILE_META in [../tile-meta.js](../tile-meta.js)
// as a const exported through each row's `related` field. The SPA never
// reads TILE_META; the only consumer of the related-tiles map is
// [./build-shells.mjs](./build-shells.mjs), which emits the "Related
// tiles" block on each per-tile shell. Moving the registry out of the
// runtime surface (a) stops tile-meta.js from growing toward its
// module-size cap as the editorial map fills in, and (b) frees the SPA
// service-worker precache from carrying ~10 KB of build-time-only data
// the runtime never executes.
//
// Each entry is an array of 3-6 tile ids in the order they should appear
// on the shell. Every entry is validated by
// [./check-related-tiles.mjs](./check-related-tiles.mjs): each id must
// exist in TOOLS, no entry may include the tile itself, no duplicates,
// and the length must be <= 6 per spec-v13 §9.1.
//
// Tiles outside the curated set use the build-shells.mjs fallback ("the
// first 5 other tiles in the same group, by TOOLS order"). Populating
// the long tail is contributor editorial work; the registry's natural
// growth model is "add an entry when a tile's reference graph implies a
// clear cross-reference and no other tile in the same group is a
// better match".

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

export { RELATED };
