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
    "service-load", "generator-sizing",
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
    "voltage-drop-reactance", "power-triangle",
    "ambient-ampacity-adjust", "service-load-optional",
    // v23
    "lux-to-footcandle",
    // spec-v109 service grounding, bonding, and inverse voltage-drop sizing.
    "grounding-electrode-conductor", "bonding-jumper", "min-conductor-for-vd",
  ]);
  // spec-v88 cap-relief split: the cohesive solar-PV / battery-storage /
  // EV-charging electrification bench moved out of calc-electrical.js (which
  // had reached 94.7% of cap -- the tightest renderer module) into
  // calc-solar.js. All five KEEP group "A" (a tile's group letter is
  // independent of its module, the v42/v70..v87 precedent); ids, citations,
  // examples, and behavior unchanged.
  declare("./calc-solar.js", "SOLAR_RENDERERS", [
    // v2
    "pv-string-sizing", "battery-runtime",
    // v15
    "pv-interconnection-busbar", "off-grid-battery", "ev-charger-load",
  ]);
  // spec-v79 cap-relief split: the cohesive spec-v20 §A advanced-analysis trio
  // (parallel-conductor-derate, neutral-current-3ph, motor-vd-starting)
  // relocated out of calc-electrical.js (which had reached 95.1% of cap -- the
  // tightest remaining calc module) into calc-powerquality.js. All three keep
  // group: "A" (group letter independent of module, the v72/v78 precedent).
  declare("./calc-powerquality.js", "POWERQUALITY_RENDERERS", [
    "parallel-conductor-derate", "neutral-current-3ph", "motor-vd-starting",
  ]);
  // spec-v26 feeder + transformer-conductor overcurrent bench (group A;
  // relocated from calc-electrical.js at spec-v72 to relieve that module's
  // gzip cap -- it had reached 96.7%; a tile's group letter is independent of
  // its module, the v28/v36/v39/v70/v71 precedent).
  declare("./calc-feeder.js", "FEEDER_RENDERERS", [
    "motor-feeder-multiple", "transformer-conductor-protection",
  ]);
  // spec-v28 low-voltage / data / security cabling (own module; registered
  // under Group A pending the Group-Z maintainer signoff, per the spec's
  // documented fallback).
  declare("./calc-lowvoltage.js", "LOWVOLTAGE_RENDERERS", [
    "fiber-loss-budget", "cable-tray-fill", "cctv-storage",
    "speaker-70v-line", "standby-battery-sizing", "coax-rg-loss",
  ]);
  // spec-v29 pipe / raceway field-layout bench (deepens Groups B, A, G per
  // the spec-v28 §7 roadmap; lives in its own module because calc-electrical
  // and calc-plumbing are at their size caps).
  declare("./calc-pipefit.js", "PIPEFIT_RENDERERS", [
    "pipe-cold-spring", "raceway-expansion-fitting", "pipe-spacing-rack",
  ]);
  // spec-v30 metal / air / refrigerant bench (deepens Groups E, C per the
  // spec-v28 §7 roadmap; own module since calc-construction and calc-hvac are
  // at their size caps).
  declare("./calc-metalair.js", "METALAIR_RENDERERS", [
    "groove-weld-strength", "duct-static-pressure-total", "compression-ratio-refrig",
  ]);
  declare("./calc-plumbing.js", "PLUMBING_RENDERERS", [
    "pipe-sizing", "friction-loss", "pipe-volume", "pump-sizing",
    "static-pressure-piping", "slope",
    "pressure-conversion", "backflow",
    // v2
    "water-hammer-arrestor", "recirc-pump-head", "trap-arm",
    "pipe-expansion", "tankless-gpm",
    // v3
    "stormwater-rational", "manning-slope", "hydrostatic-test", "grease-trap",
    "glycol-mix", "expansion-tank", "backflow-loss",
    // v7
    "water-hammer-surge", "pump-operating-point",
    "pipe-expansion-loop",
    // v9
    "recirc-loop-sizing",
    // v16
    "water-heater-recovery", "wh-expansion-tank", "sanitary-dfu", "trap-primer",
    "backflow-sizing",
    // v23
    "trap-seal-loss", "water-meter-sizing",
    // v20
    "thermal-expansion-volume", "vent-sizing-stack",
    // v26 mixing valve, well tank, pipe velocity
    "mixed-water-temp", "pressure-tank-drawdown", "pipe-velocity",
    // v61
    "wsfu-demand", "supply-pressure-budget",
    // spec-v112 storage water-heater sizing (first-hour rating vs peak demand).
    "water-heater-storage-sizing",
  ]);
  // spec-v86 cap-relief split: the cohesive onsite-wastewater / septic bench
  // (the v2 septic-tank, the v7 septic-drainfield, and the v83 pressure-
  // distribution trio) relocated out of calc-plumbing.js (which had reached
  // 98.9% of cap -- the tightest remaining calc module) into calc-septic.js.
  // All five keep group: "B" (group letter independent of module, the
  // v42/v70..v82 precedent).
  declare("./calc-septic.js", "SEPTIC_RENDERERS", [
    // v2 / v7
    "septic-tank", "septic-drainfield",
    // v83 onsite-septic pressure distribution
    "septic-dose-tank", "septic-pumpout-interval", "septic-lpp-orifice",
  ]);
  // spec-v78 cap-relief split: the cohesive spec-v63 + spec-v64 service bench
  // (gas-appliance-demand, tpr-discharge, pipe-support-spacing, softener-sizing)
  // relocated out of calc-plumbing.js (which had reached 95.2% of cap -- the
  // tightest remaining calc module) into calc-service.js. All four keep
  // group: "B" (group letter independent of module, the v42/v70..v77 precedent).
  declare("./calc-service.js", "SERVICE_RENDERERS", [
    // v63
    "gas-appliance-demand", "tpr-discharge",
    // v64
    "pipe-support-spacing", "softener-sizing",
  ]);
  // spec-v73 cap-relief split: the two spec-v62 storm-drainage tiles relocated
  // out of calc-plumbing.js (which had reached 96.2% of cap -- the tightest
  // remaining calc module) into calc-drainage.js. They keep group: "B" (group
  // letter independent of module, the v42/v70/v71/v72 precedent).
  declare("./calc-drainage.js", "DRAINAGE_RENDERERS", [
    "roof-drain-sizing", "sump-basin-sizing",
  ]);
  // spec-v42 cap-relief split: the three fuel-gas tiles relocated out of
  // calc-plumbing.js (which had reached 98.9% of cap) into calc-gas.js. They
  // keep group: "B" (group letter independent of module, the v36/v39 precedent).
  declare("./calc-gas.js", "GAS_RENDERERS", [
    "gas-pipe-sizing", "gas-leak-rate", "gas-pipe-pressure-drop",
    // spec-v111 high-altitude derate and NG/LP fuel conversion (same module).
    "gas-altitude-derate", "gas-fuel-conversion",
  ]);
  declare("./calc-hvac.js", "HVAC_RENDERERS", [
    "manual-j-cooling", "manual-j-heating", "duct-sizing",
    "static-pressure-hvac",
    "seer-eer", "balance-point", "shr", "cfm-per-ton", "combustion-air",
    // v2
    "approach-delta-t",
    "outdoor-air-mix", "equivalent-length", "wet-bulb-psychrometer",
    "insulation-thickness", "evaporative-cooling",
    // v3
    "affinity-laws", "belt-pulley", "air-receiver", "geothermal-loop",
    "baseboard-output", "npsh-a",
    // v7
    "duct-friction-static", "cooling-tower",
    "insulation-heat-loss",
    // v8
    "duct-leakage",
    // v9
    "outdoor-air-ventilation", "hood-exhaust", "shr-latent",
    // v20
    "economizer-savings-hours", "pipe-heat-loss-radial", "fan-motor-bhp",
    // v27 round-to-rectangular duct equivalent
    "round-to-rect-duct",
    // v99 building-envelope insulation
    "assembly-r-value", "blown-insulation-coverage",
  ]);
  // spec-v89 cap-relief split: the cohesive refrigerant-circuit bench (the v2
  // refrigerant-pt P-T lookup, superheat-subcool diagnostic, compare-refrigerants,
  // and refrigerant-charge line-set estimator, plus the v7 refrigerant-charging
  // suction/liquid diagnostic) relocated out of calc-hvac.js (which had reached
  // 94.3% of cap -- the tightest remaining renderer module) into
  // calc-refrigerant.js. All five keep group: "C" (group letter independent of
  // module, the v42/v70..v88 precedent); ids, citations, examples, dimensional
  // annotations, and behavior unchanged.
  declare("./calc-refrigerant.js", "REFRIGERANT_RENDERERS", [
    // v2
    "refrigerant-pt", "superheat-subcool", "compare-refrigerants", "refrigerant-charge",
    // v7
    "refrigerant-charging",
  ]);
  // spec-v81 cap-relief split: the cohesive spec-v16 "Group C expansion" batch
  // (seven first-principles HVAC engineering tiles) relocated out of calc-hvac.js
  // (which had reached 94.9% of cap -- the tightest remaining calc module) into
  // calc-hvacsystems.js. They keep group: "C" (group letter independent of
  // module, the v42/v70..v80 precedent).
  declare("./calc-hvacsystems.js", "HVACSYSTEMS_RENDERERS", [
    "chiller-tons", "hx-lmtd-ntu", "air-changes-hour",
    "boiler-pipe-sizing", "compressor-short-cycle", "humidifier-capacity",
    "filter-pressure-drop",
  ]);
  // spec-v74 cap-relief split: the two spec-v23 velocity tiles relocated out of
  // calc-hvac.js (which had reached 95.9% of cap -- the tightest remaining calc
  // module) into calc-velocity.js. They keep group: "C" (group letter
  // independent of module, the v42/v70/v71/v72/v73 precedent).
  declare("./calc-velocity.js", "VELOCITY_RENDERERS", [
    "duct-velocity-pressure", "refrigerant-velocity",
  ]);
  declare("./calc-restoration.js", "RESTORATION_RENDERERS", [
    "psychrometric", "drying-goal", "dehumidifier", "air-movers",
    "water-classes", "drying-times", "mold", "ppe",
    // v58
    "mold-remediation-level", "mold-conditions",
    // v59
    "antimicrobial-dilution", "air-sample-volume",
    // v2
    "standing-water", "nam-sizing", "hepa-filter-life", "thermal-delta-t",
    // v3
    "containment-air-balance", "chamber-turnover",
    // v9
    "drying-log",
    // v16
    "equipment-power-draw",
    // v23
    "drying-chamber-co2",
  
    // v20
    "grains-removed", "evaporation-load",
    // spec-v119 equilibrium moisture content of wood (USDA FPL sorption).
    "wood-emc",
  ]);
  // spec-v77 cap-relief split: the cohesive demolition / abatement bench
  // (moisture-dry-goal, flood-cut-quantity, abatement-containment) relocated out
  // of calc-restoration.js (which had reached 95.2% of cap -- tied for the
  // tightest remaining calc module) into calc-demo.js. All three keep
  // group: "D" (group letter independent of module, the v42/v70..v76 precedent).
  declare("./calc-demo.js", "DEMO_RENDERERS", [
    // v60
    "moisture-dry-goal", "flood-cut-quantity",
    // v69 asbestos / lead abatement containment take-off
    "abatement-containment",
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
    // v23
    "wall-bracing-length", "deck-ledger-fasteners",
  
    // v20
    "point-load-bearing", "column-buckling-wood", "beam-reactions",
    // v24 welding/metal/layout
    "weld-heat-input", "metal-weight", "layout-squaring",
    // v27 fillet weld strength
    "fillet-weld-strength",
    // v69 surface prep and coatings
    "coating-coverage-dft", "abrasive-blast",
    // v94 fencing + v96 concrete joints / rebar lap splices
    "fence-estimate", "post-hole-concrete",
    "control-joint-spacing", "rebar-lap-splice",
    // spec-v113 guard and handrail code check (IRC R312 / R311.7.8).
    "guard-handrail-check",
  ]);
  // spec-v95 new finish-and-site-carpentry take-off module (the home named
  // in the spec-v94 module note); relieves the calc-construction.js cap watch.
  // All tiles keep group "E" (module independent of group letter).
  declare("./calc-finish.js", "FINISH_RENDERERS", [
    // v95 interior finish
    "thinset-coverage", "flooring-takeoff",
    // v97 hardscape
    "paver-patio", "retaining-wall-block",
    // v98 roofing trim-out
    "attic-ventilation", "gutter-downspout",
  ]);
  // spec-v101 new electrician design/layout bench; relieves the standing
  // calc-electrical.js cap watch. Both tiles keep group "A".
  declare("./calc-elecdesign.js", "ELECDESIGN_RENDERERS", [
    "pull-box-sizing", "lumen-method",
  ]);
  // spec-v102 new HVAC field-service bench; relieves the standing
  // calc-hvac.js cap watch. Both tiles keep group "C".
  declare("./calc-hvacservice.js", "HVACSERVICE_RENDERERS", [
    "condensate-drain", "recovery-cylinder",
    // spec-v104 electrical-side field-service diagnostics (same module).
    "hvac-equipment-circuit", "run-capacitor-microfarad",
    // spec-v105 evacuation/leak-check field diagnostics (same module).
    "vacuum-decay-test", "nitrogen-pressure-test",
    // spec-v110 gas-heat start-up diagnostics (same module).
    "gas-meter-clock", "furnace-temp-rise",
  ]);
  // spec-v103 new pipe/well disinfection bench; relieves the standing
  // calc-plumbing.js cap watch. Both tiles keep group "B".
  declare("./calc-disinfect.js", "DISINFECT_RENDERERS", [
    "main-disinfection-chlorine", "well-shock-chlorination",
  ]);
  // spec-v80 cap-relief split: the spec-v25 site-civil / roadway-geometry
  // quartet moved out of calc-construction.js (it sat at 95.0% of its size
  // cap, the tightest remaining calculator module) into its own module. All
  // four tiles KEEP group "E" (the module is independent of the group letter,
  // per the v28/v30/v36/v39/v70..v79 precedent); no tile or output changed.
  declare("./calc-civil.js", "CIVIL_RENDERERS", [
    "horizontal-curve", "vertical-curve", "earthwork-end-area", "slope-stake-cut-fill",
  ]);
  // spec-v70 cap-relief split: the spec-v67 earthwork / excavation bench
  // moved out of calc-construction.js (it sat at 97.6% of its size cap) into
  // its own module. All five tiles KEEP group "E" (the module is independent
  // of the group letter, per the v28/v30/v36/v39 precedent); no tile or output
  // changed.
  declare("./calc-earthwork.js", "EARTHWORK_RENDERERS", [
    "soil-swell-shrink", "haul-cycle-production", "dewatering-rate",
    "spoil-setback", "pipe-bedding-backfill",
  ]);
  declare("./calc-fire.js", "FIRE_RENDERERS", [
    "fire-friction", "pdp", "hydrant-flow", "required-fire-flow",
    "master-stream", "aerial-ladder", "foam", "smoke-reading",
    // v2
    "reverse-lay-friction", "sprinkler-density", "standpipe-friction",
    "ladder-pipe-reach", "braking-distance",
    // v7
    "iso-nff",
    // v9
    "scba-cylinder-time",
    "nfpa-1142-water-supply",
    "confined-space-vent",
    // v15
    "standpipe-pdp", "smoke-ejector-cfm",
    // v23
    "fire-stream-reaction", "sprinkler-k-factor",
  
    // v20
    "elevation-pressure-loss", "water-supply-duration",
    // spec-v114 smooth-bore nozzle flow (gpm = 29.7 d^2 sqrt(NP)).
    "smooth-bore-flow",
  ]);
  // spec-v82 cap-relief split: the spec-v3 technical-rescue bench moved out
  // of calc-fire.js (it sat at 94.9% of its size cap) into its own module.
  // All three tiles KEEP group "F" (the module is independent of the group
  // letter, per the v28/v30/v36/v39/v70..v81 precedent); no tile or output
  // changed.
  declare("./calc-rescue.js", "RESCUE_RENDERERS", [
    "confined-space-purge", "rope-ma", "sling-angle",
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
    // v24 rolling offset
    "rolling-offset",
    // v43 tank gauging
    "tank-volume",
    // v53 linear interpolation
    "linear-interpolation",
  ]);
  // Group G (cont.): the pipe & conduit fabrication bench, split out of
  // calc-cross.js into calc-fab.js (spec-v36) once calc-cross hit its cap.
  // Still Group G tiles (the conduit suite is group A); only the module changed.
  declare("./calc-fab.js", "FAB_RENDERERS", [
    // v26 pipefitter's bench
    "pipe-fitting-takeout", "pipe-miter-cut", "pipe-template-wrap", "flange-bolt-torque",
    // v39 conduit-bending suite (group A; relocated from calc-electrical.js)
    "conduit-offset", "conduit-saddle", "conduit-90-stub",
    // v85 welding gas / cutting / consumable cost (group E)
    "shielding-gas-runtime", "oxyfuel-cutting-gas", "weld-preheat-fuel", "weld-cost-per-foot",
  ]);
  // Group G (cont.): the layout & shop-geometry bench, split out of
  // calc-fab.js into calc-layout.js (spec-v56) once calc-fab hit 96% of its
  // cap. Still Group G tiles; only the module changed, no output changed.
  declare("./calc-layout.js", "LAYOUT_RENDERERS", [
    // v27 rigger's bench: center of gravity from two scales
    "center-of-gravity-2point",
    // v32 bolt-circle hole layout
    "bolt-circle",
    // v33 decimal-to-fraction tape math
    "decimal-to-fraction",
    // v37 sine-bar angle setup
    "sine-bar",
    // v38 thread pitch / lead
    "thread-pitch",
    // v44 circular-arc layout from chord & rise
    "circular-arc",
    // v47 circle through three points
    "circle-from-3-points",
    // v55 regular polygon miter & layout
    "polygon-miter",
    // v57 equal spacing layout
    "equal-spacing",
  ]);
  // spec-v40 Machine Shop & Fabrication bench: a new module with ten
  // first-principles machinist / fabricator / welder tiles. Each keeps its
  // natural group letter (K, G, or E) while living in calc-shop.js behind
  // SHOP_RENDERERS (group letter independent of module, the v28/v36 precedent).
  declare("./calc-shop.js", "SHOP_RENDERERS", [
    // Group K (machinist)
    "machining-time", "material-removal-rate", "turning-surface-finish",
    "taper-calc", "dividing-head",
    // Group G (cross-trade)
    "thread-measure-wire", "punch-force",
    // Group E (welding / sheet-metal)
    "press-brake-tonnage", "weld-duty-cycle", "carbon-equivalent",
    // spec-v41 batch 2: Group K + Group G
    "tap-drill-size", "rolled-blank",
    // spec-v54: Group E carpentry compound miter
    "compound-miter",
  ]);
  // v4 Group J: Trucking and Logistics.
  declare("./calc-trucking.js", "TRUCKING_RENDERERS", [
    "dim-weight", "freight-density", "pallet-loadout",
    "hos-math", "bridge-formula", "reefer-burn", "incoterm-decoder",
    // v9
    "stopping-sight-distance",
    // v23
    "cargo-securement-wll", "fuel-tax-ifta",
  
    // v20
    "cost-per-mile", "deadhead-percent", "axle-load-distribution",
    // v91 owner-operator load economics
    "load-profitability", "fuel-surcharge", "maintenance-reserve",
    // spec-v115 weight compliance: GCWR combination + tire load-rating checks.
    "gcwr-check", "tire-load-check",
  ]);
  // v4 Group K: Mechanic - Auto, Marine, Aviation.
  declare("./calc-mechanic.js", "MECHANIC_RENDERERS", [
    "weight-balance", "prop-slip", "displacement-cr", "bolt-stretch",
    "driveshaft-crit", "fuel-range", "tire-gearing", "brake-pad-life",
    // v23
    "valve-flow-coefficient", "screw-conveyor",
  
    // v20
    "hp-from-torque", "volumetric-efficiency", "gear-mph-rpm",
    // v100 auto-body 2K paint mix
    "paint-mix-ratio",
  ]);
  // spec-v76 cap-relief split: the cohesive machining bench (cutting-speed-rpm,
  // drill-point-depth) relocated out of calc-mechanic.js (which had reached
  // 95.6% of cap -- the tightest remaining calc module) into calc-machining.js.
  // They keep group: "K" (group letter independent of module, the v42/v70..v75
  // precedent).
  declare("./calc-machining.js", "MACHINING_RENDERERS", [
    // v31, v34
    "cutting-speed-rpm", "drill-point-depth",
    // v100 cutting-fluid concentration
    "cutting-fluid-concentration",
  ]);
  // v4 Group L: Agriculture and Forestry.
  declare("./calc-agriculture.js", "AGRICULTURE_RENDERERS", [
    "gpa-rate", "timber-cruise", "seed-rate", "drawbar-power",
    "irrigation-uniformity", "bulk-density", "crop-yield",
    // v9
    "thi-livestock", "sprayer-calibration",
    // v17
    "irrigation-requirement", "cattle-stocking-rate", "grain-bin-capacity",
    "npk-blend", "tank-mix",
    // v23
    "pesticide-rei-phi",
  
    // v20
    "growing-degree-days", "pearson-square-ration", "livestock-water-requirement",
    // v35
    "two-stroke-mix",
    // v84 sprayer nozzle / drift / field capacity
    "nozzle-flow-pressure", "spray-drift-buffer", "sprayer-field-capacity",
    // spec-v118 hay dry-matter and safe-storage weight.
    "hay-dry-matter",
  ]);
  // v87 cap-relief split: the v68 tree-care / arborist-rigging bench moved out
  // of calc-agriculture.js (95.1% of cap) into calc-arborist.js. All five KEEP
  // group "L" (a tile's group letter is independent of its module, the
  // v42/v70..v86 precedent); ids, citations, examples, and behavior unchanged.
  declare("./calc-arborist.js", "ARBORIST_RENDERERS", [
    "log-limb-weight", "tree-rigging-shock", "felling-notch-hinge",
    "porta-wrap-friction", "chipper-debris",
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
    // v23
    "backflow-test-psi",
    // spec-v116 disinfection: chlorine demand/breakpoint + UV dose.
    "chlorine-demand", "uv-dose",
  ]);
  // spec-v75 cap-relief split: the cohesive spec-v20 Phase M bench (weir-flow,
  // langelier-index, chemical-feed-pump) relocated out of calc-water.js (which had
  // reached 95.8% of cap -- the tightest remaining calc module) into
  // calc-treatment.js. They keep group: "M" (group letter independent of module,
  // the v42/v70..v74 precedent).
  declare("./calc-treatment.js", "TREATMENT_RENDERERS", [
    "weir-flow", "langelier-index", "chemical-feed-pump",
    // v93 pool and spa chemical balance
    "pool-alkalinity-adjust", "pool-cya-dose", "pool-salt-dose",
  ]);
  // v4 Group N: Stage and Live Production.
  declare("./calc-stage.js", "STAGE_RENDERERS", [
    "truss-capacity", "time-alignment", "dmx-planner",
    "neutral-imbalance", "spl-distance", "rigging-check",
    // v9
    "spl-atmospheric",
  
    // v20
    "power-distro",
    // v24 audio electronics
    "speaker-impedance", "decibel-converter", "amp-power-spl", "lighting-beam",
    // v92 LED video wall + projection
    "led-video-wall", "projector-brightness",
    // v120 room acoustics
    "room-acoustics",
  ]);
  // v4 Group O: Kitchen and Food Service.
  declare("./calc-kitchen.js", "KITCHEN_RENDERERS", [
    "recipe-scale", "yield-ep", "cooling-curve",
    "plate-cost", "pan-conversion",
    // v9
    "sous-vide-pasteurization",
  
    // v20
    "brine-cure", "bakers-percentage",
    // v90 food-service cost control
    "food-cost-percentage", "prime-cost", "pour-cost",
  ]);
  // v4 Group P: Field, Backcountry, and SAR.
  declare("./calc-field.js", "FIELD_RENDERERS", [
    "pacing-distance", "bearing-conversion", "slope-avalanche",
    "backcountry-needs", "utm-conversion", "solar-times",
    // v9
    "lightning-countdown", "magnetic-declination",
  
    // v20
    "search-probability",
    // v52
    "hiking-time",
  ]);
  // spec-v71 cap-relief split: the two v25 surveying coordinate/traverse
  // tiles moved out of calc-field.js (it sat at 96.8% of its size cap) into
  // their own module. Both tiles KEEP group "P" (the module is independent
  // of the group letter, per the v28/v30/v36/v39/v70 precedent); no tile or
  // output changed.
  declare("./calc-survey.js", "SURVEY_RENDERERS", [
    "area-by-coordinates", "traverse-closure",
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
    "home-office",
  
    // v20
    "declining-balance-depreciation", "markup-vs-margin", "employer-payroll-tax",
  ]);
  // v5 Group S: Legal Plain-English and Statutory Math (utilities 246-254).
  declare("./calc-legal.js", "LEGAL_RENDERERS", [
    "judgment-interest", "court-deadline", "statute-of-limitations",
    "small-claims-reference", "tenant-notice", "wage-hour",
    "contractor-vs-employee", "contract-clause-reference", "lease-term-reference",
    "wage-garnishment",
  
    // v20
    "federal-post-judgment-interest", "lease-rent-proration",
  ]);
  // v5 Group T: Bench Science and Laboratory Math (utilities 255-264).
  declare("./calc-lab.js", "LAB_RENDERERS", [
    "molarity-dilution", "serial-dilution", "molecular-weight", "mass-moles",
    "rcf-rpm", "resuspension-volume", "pcr-master-mix", "beer-lambert",
    "henderson-hasselbalch", "hemocytometer",
    // v23
    "od600-cell-count", "gel-percent-agarose",
  
    // v20
    "primer-tm", "cfu-plate-count",
  ]);
  // v12 Group U: Veterinary (spec-v12.md §5).
  declare("./calc-vet.js", "VET_RENDERERS", [
    "vet-weight-based-dose", "vet-maintenance-fluid", "vet-energy-requirement",
    "vet-bcs-reference", "vet-pet-age", "vet-gestation",
    "vet-ett-sizing", "vet-anesthesia-vitals", "vet-asa-classification",
    "vet-bloodwork-ranges", "vet-urine-sg", "vet-target-weight-loss",
    "vet-toxicity", "vet-breed-predispositions", "vet-plasma-css",
    "vet-vaccine-schedule", "vet-heartworm-dose", "vet-crystalloid-plan",
    // v17
    "vet-cri", "vet-transfusion", "equine-weight",
  
    // v20
    "vet-body-surface-area", "vet-corrected-reticulocyte", "vet-fluid-deficit", "vet-anion-gap",
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
    // v17
    "ideal-body-weight", "corrected-qt",
    // v23
    "pediatric-tube-depth",
  
    // v20
    "cockcroft-gault-crcl", "winters-expected-pco2", "aa-gradient", "fena",
  ]);
  // v12 Group W: Pilots / Aviation (spec-v12.md §7).
  declare("./calc-aviation.js", "AVIATION_RENDERERS", [
    "density-altitude", "crosswind-component", "ete-eta",
    "hypoxia-altitude", "pressure-altitude", "phonetic-alphabet",
    "fuel-planning", "wind-triangle", "top-of-descent",
    "weather-phrasing", "transponder-codes", "standard-turn-rate",
    "true-airspeed", "sectional-symbols", "aircraft-category",
    "magnetic-variation", "metar-decoder", "taf-decoder",
    // v17
    "holding-fuel",
    // v23
    "weight-shift-fuel-burn",
  
    // v20
    "isa-temp-correction", "weight-shift-cg", "landing-takeoff-da-correction",
  ]);
  // v12 Group X: Real Estate (spec-v12.md §8).
  declare("./calc-realestate.js", "REALESTATE_RENDERERS", [
    "ltv", "dti", "piti",
    "exchange-1031-timeline", "section-121-exclusion", "property-tax",
    "cap-rate-dscr", "cash-on-cash", "commission-split",
    "amortization-schedule", "cost-of-waiting", "closing-costs",
    "rental-worksheet",
    "loan-limits", "hud-fmr",
    // v17
    "mortgage-point-breakeven", "per-diem-interest", "mortgage-reserves",
    "rent-vs-buy",
    // v23
    "depreciation-recapture", "rent-roll-vacancy",
  
    // v20
    "gross-rent-multiplier", "pmi-cancellation-date", "seller-net-sheet",
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
    "chi-square-gof",
    "linear-regression",
    // v23
    "curve-grade-scaler",
  
    // v20
    "final-grade-needed", "category-weighted-grade", "two-sample-t-test",
  ]);
  // Group Z (Rigging and Heavy Lift): the lift-planning core (spec-v65), a
  // new module behind RIGGING_RENDERERS. All seven carry GOVERNANCE.rigging.
  declare("./calc-rigging.js", "RIGGING_RENDERERS", [
    "cg-load-share", "crane-net-capacity", "crane-ground-bearing",
    "sling-d-d-efficiency", "wind-on-load", "tagline-force", "tandem-lift-share",
    // v66 hardware and below-the-hook
    "shackle-eyebolt-wll", "spreader-beam", "forklift-capacity-derate",
    "roller-jack-force", "chain-lever-hoist", "block-redirect-load",
    // spec-v117 multi-leg sling load per leg + wire-rope strength estimate.
    "multi-leg-sling", "wire-rope-strength",
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
const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

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
  Z: "Rigging and Heavy Lift",
};

// Tool registry. Order matches spec.md section 12.
// Each entry: id (kebab-case route), name, group, trades, desc.
// spec-v17 §H.2: the TOOLS metadata registry (~30 KB gzipped) lives in
// tools-data.js and is lazy-loaded so the bare home view excludes it.
// The home #tools view is static HTML; TOOLS is needed only to route a
// tile hash, render a tool view, or power search -- all on interaction
// or a deep-link, never at home first paint. ensureTools() mirrors the
// ensureAliases() lazy pattern used by the search dropdown.
let TOOLS = null;
let _toolsPromise = null;
function ensureTools() {
  if (TOOLS) return Promise.resolve(TOOLS);
  if (!_toolsPromise) {
    _toolsPromise = import("./tools-data.js").then((m) => { TOOLS = m.TOOLS; return TOOLS; });
  }
  return _toolsPromise;
}
const EMPTY_IDS = [];

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
  bindSearch();
  bindShortcuts();
  bindBrand();
  window.addEventListener("hashchange", route);
  route();
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

// Single routing entry for boot, hashchange, and navigateTo. A home /
// empty / legacy-bundle hash routes synchronously without the TOOLS list
// (the #tools view is static HTML). A tile hash lazy-loads TOOLS first,
// then parses and applies the route so renderToolView / updateHeadForTool
// have the registry available.
function route() {
  const hash = window.location.hash || "";
  const raw = hash.replace(/^#/, "");
  if (!raw || raw === "home" || raw.startsWith("b=")) {
    state.route = parseHashRoute(hash, EMPTY_IDS).route;
    applyRoute();
    return;
  }
  ensureTools().then(() => {
    state.route = parseHashRoute(hash, TOOLS.map((t) => t.id)).route;
    applyRoute();
  });
}

function applyRoute() {
  // A navigation dismisses the keyboard-shortcut modal. The overlay is a
  // role="dialog" aria-modal="true" with a focus trap; it must not persist
  // over a view it no longer matches. Every navigation path (G-leader
  // shortcut, hashchange/back-forward, navigateTo) funnels through here, so
  // this is the single point that covers them all. No-op when none is open.
  closeShortcutOverlay(false);
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
const HOME_DESC = "600+ deterministic field-math tools for electricians, plumbers, HVAC, restoration, carpentry, and fire-ground engineering. Everything runs in your browser. No signup, no tracking, no AI.";
const HOME_TITLE = "Free Trade Calculators - 600+ Field-Math Tools, No Signup · Rough Logic";
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
    route();
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

  // The TOOLS registry is lazy-loaded; these indexes are built on first
  // interaction (focus / keystroke), behind ensureTools(), so the bare
  // home view never pulls tools-data.js.
  let nameToId = new Map();
  let ALL = [];
  let searchReady = false;
  function initSearchData() {
    if (searchReady) return;
    nameToId = new Map(TOOLS.map((t) => [t.name.toLowerCase(), t.id]));
    ALL = TOOLS.slice().sort((a, b) => a.name.localeCompare(b.name));
    searchReady = true;
  }
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
    if (!searchReady) return [];
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

  function loadAndRender() {
    ensureTools().then(() => { initSearchData(); ensureAliases(); render(input.value); });
  }
  input.addEventListener("focus", loadAndRender);
  input.addEventListener("input", loadAndRender);

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
      // No rendered matches: fall back to an exact tool-name match (once
      // the lazy registry has loaded; ensureTools fires on focus).
      if (searchReady) {
        const id = nameToId.get((input.value || "").trim().toLowerCase());
        if (id) { e.preventDefault(); pick(TOOLS.find((t) => t.id === id)); }
      }
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

// The element focus came from when the overlay opened, restored on close.
let shortcutTrigger = null;

function toggleShortcutOverlay() {
  const existing = document.getElementById("shortcut-overlay");
  if (existing) {
    closeShortcutOverlay();
    return;
  }
  // Remember what had focus so it can be restored on close (WCAG 2.4.3).
  shortcutTrigger = document.activeElement;
  const overlay = document.createElement("div");
  overlay.id = "shortcut-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Keyboard shortcuts");
  // Focus trap: a modal dialog must keep Tab within itself (ARIA APG); the
  // previous overlay let Tab fall through to the page behind it.
  overlay.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const focusables = overlay.querySelectorAll(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  // Scrim is a theme-neutral dim; the panel carries the theme colors so the
  // overlay is legible in both dark (default) and light. The prior inline
  // light-only colors (white bg, no text color) rendered white-on-white and
  // unreadable in the dark theme.
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);padding:24px;overflow:auto;z-index:50;";

  const inner = document.createElement("div");
  inner.style.cssText = "max-width:640px;margin:0 auto;background:var(--bg-secondary);color:var(--fg);border:1px solid var(--border);border-radius:8px;padding:24px;";
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

function closeShortcutOverlay(restoreFocus = true) {
  const overlay = document.getElementById("shortcut-overlay");
  if (overlay) overlay.remove();
  // Restore focus to whatever opened the overlay (WCAG 2.4.3 Focus Order);
  // the previous version dropped focus to <body> on close. A close caused by
  // a navigation (a G-leader shortcut or back/forward, via applyRoute) passes
  // restoreFocus=false: the pre-overlay element belongs to the view we just
  // left, so the new view should receive focus naturally instead.
  if (restoreFocus && shortcutTrigger && typeof shortcutTrigger.focus === "function") {
    shortcutTrigger.focus();
  }
  shortcutTrigger = null;
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
