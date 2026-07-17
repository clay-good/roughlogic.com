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
    "awg-wire-geometry",
    "breaker-sizing", "motor-fla", "transformer-sizing", "three-phase",
    "copper-resistance", "egc-sizing",
    // v2
    "service-load", "generator-sizing",
    "voltage-imbalance", "gfci-afci-reference", "lighting-density",
    // v3
    "pulling-tension", "cable-reel-capacity", "wire-pulling-lubricant", "branch-circuit-wire-footage", "cable-bend-radius", "pf-correction", "phase-balance",
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
    // spec-v121..v128 fault / raceway / grounding / three-phase
    "conductor-short-circuit-withstand", "conduit-thermal-expansion", "conduit-expansion-max-run",
    "egc-upsize-proportional", "delta-wye-line-phase",
    // spec-v165/v170/v174/v176 electrician batch
    "buck-boost-sizing", "wireway-fill", "rooftop-temp-adder", "working-space-110-26",
    // spec-v179/v185/v186 electrician second-pass batch
    "motor-branch-protection", "bends-between-pulls", "shock-approach-boundary",
    "conduit-jam-ratio",
    // spec-v471..v473 energy-economics batch
    "motor-efficiency-upgrade-savings", "transformer-loading-efficiency", "economic-conductor-sizing",
    // spec-v487 generator fuel runtime and backup duration
    "generator-fuel-runtime",
    // spec-v494 transformer voltage regulation from %R and %X
    "transformer-voltage-regulation",
    "transformer-turns-ratio",
    // spec-v495 capacitor discharge time and bleed resistor
    "capacitor-discharge-time",
    // spec-v496 asymmetrical and peak fault current from X/R
    "asymmetrical-fault-xr",
    // spec-v518 battery room hydrogen ventilation (IEEE 1635)
    "battery-hydrogen-vent", "battery-vent-max-current",
    // spec-v520 transformer inrush coordination point
    "transformer-inrush-point",
    // spec-v562
    "termination-temp-ampacity",
  ]);
  // spec-v129 cap-relief split: the cohesive spec-v121..v124 motor bench
  // (motor-synchronous-speed-slip, motor-shaft-torque, motor-operating-cost,
  // multi-motor-feeder) relocated out of calc-electrical.js (which the
  // v121..v128 batch had pushed to 100.1% of cap -- the tightest renderer
  // module) into calc-motor.js. All four keep group "A" (group letter
  // independent of module, the v79/v88/v101 precedent); ids, citations,
  // examples, and behavior unchanged.
  declare("./calc-motor.js", "MOTOR_RENDERERS", [
    "motor-synchronous-speed-slip", "motor-pole-identification", "motor-shaft-torque", "motor-operating-cost", "motor-run-hours-for-budget",
    "multi-motor-feeder",
    // spec-v278 NEC 430.32 running overload
    "motor-overload-sizing",
    // spec-v499 motor locked-rotor kVA from code letter (NEC 430.7(B))
    "motor-locked-rotor-kva", "motor-max-hp-for-starting-current",
    // spec-v521 motor short-circuit contribution (first cycle)
    "motor-fault-contribution",
    // spec-v522 reduced-voltage starter current and torque
    "reduced-voltage-starter",
    // spec-v557
    "vfd-reflected-wave",
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
    // spec-v182 electrician second-pass batch
    "pv-circuit-ampacity",
    // spec-v221..v223 PV system-design batch
    "pv-energy-yield", "pv-array-sizing", "pv-row-spacing", "pv-row-shade-angle", "pv-inverter-ratio",
    "pv-cell-temperature-power", "pv-max-ambient-for-power", "pv-performance-ratio", "pv-string-fusing",
    // spec-v236..v238 grid-tied battery-economics batch
    "battery-tou-arbitrage", "battery-peak-shaving", "battery-c-rate",
    // spec-v488 EV charge time (AC Level 2)
    "ev-charge-time",
    // spec-v489 EV charge cost at the meter
    "ev-charge-cost",
    // spec-v492 EV DC fast-charge time with CC-CV taper
    "ev-dcfc-time",
    // spec-v559
    "solar-egc-690-45",
    "shadow-length",
  ]);
  // spec-v79 cap-relief split: the cohesive spec-v20 §A advanced-analysis trio
  // (parallel-conductor-derate, neutral-current-3ph, motor-vd-starting)
  // relocated out of calc-electrical.js (which had reached 95.1% of cap -- the
  // tightest remaining calc module) into calc-powerquality.js. All three keep
  // group: "A" (group letter independent of module, the v72/v78 precedent).
  declare("./calc-powerquality.js", "POWERQUALITY_RENDERERS", [
    "parallel-conductor-derate", "neutral-current-3ph", "motor-vd-starting",
    // spec-v172 electrician batch
    "motor-unbalance-derate",
    // spec-v183/v184 electrician second-pass batch
    "transformer-k-factor", "motor-capacitor-max",
    // spec-v523 harmonic parallel-resonance order
    "harmonic-resonance", "capacitor-bank-for-resonance-order",
    // spec-v524 total demand distortion limit check (IEEE 519)
    "tdd-ieee-519",
  ]);
  // spec-v26 feeder + transformer-conductor overcurrent bench (group A;
  // relocated from calc-electrical.js at spec-v72 to relieve that module's
  // gzip cap -- it had reached 96.7%; a tile's group letter is independent of
  // its module, the v28/v36/v39/v70/v71 precedent).
  declare("./calc-feeder.js", "FEEDER_RENDERERS", [
    "motor-feeder-multiple", "transformer-conductor-protection",
    "feeder-tap-rule",
    // spec-v280 NEC 210.20/215.3 continuous-load OCPD
    "continuous-load-ocpd",
    // spec-v493 NEC 445.13 generator output conductor at 115%
    "generator-conductor-445",
    // spec-v519 NEC 220.87 existing-facility load by peak demand
    "existing-load-220-87",
    // spec-v561
    "ev-load-management-ems",
    "ev-charger-throttle",
  ]);
  // spec-v28 low-voltage / data / security cabling (own module; registered
  // under Group A pending the Group-Z maintainer signoff, per the spec's
  // documented fallback).
  declare("./calc-lowvoltage.js", "LOWVOLTAGE_RENDERERS", [
    "fiber-loss-budget", "fiber-max-length", "cable-tray-fill", "cctv-storage", "cctv-retention-days",
    "speaker-70v-line", "standby-battery-sizing", "standby-battery-runtime", "coax-rg-loss",
    "camera-lens-fov", "camera-max-distance-for-ppf", "ceiling-speaker-coverage", "ceiling-speaker-coverage-angle", "structured-cabling-channel", "lv-cable-pull-footage",
  ]);
  // spec-v29 pipe / raceway field-layout bench (deepens Groups B, A, G per
  // the spec-v28 §7 roadmap; lives in its own module because calc-electrical
  // and calc-plumbing are at their size caps).
  declare("./calc-pipefit.js", "PIPEFIT_RENDERERS", [
    "pipe-cold-spring", "raceway-expansion-fitting", "pipe-spacing-rack",
    // spec-v157..v162 steamfitting / pressure-piping / pipe-support bench.
    "flash-steam-pct", "steam-pipe-velocity", "steam-pipe-capacity", "steam-trap-sizing",
    "boiler-horsepower",
    "pipe-pressure-rating", "pipe-filled-support-load", "hanger-rod-sizing",
    // spec-v200..v203 condensate return + fabrication/process layout tiles.
    "condensate-return-sizing", "branch-saddle-cutback", "reducer-offset",
    "flange-rating",
    // spec-v204..v205 process-piping branch reinforcement + expansion guide spacing.
    "branch-reinforcement", "expansion-guide-spacing",
    // spec-v588 steam orifice / PRV capacity (Napier)
    "steam-prv-napier", "steam-prv-area-for-capacity",
  ]);
  // spec-v30 metal / air / refrigerant bench (deepens Groups E, C per the
  // spec-v28 §7 roadmap; own module since calc-construction and calc-hvac are
  // at their size caps).
  declare("./calc-metalair.js", "METALAIR_RENDERERS", [
    "groove-weld-strength", "groove-weld-length-for-load", "duct-static-pressure-total", "compression-ratio-refrig",
  ]);
  declare("./calc-plumbing.js", "PLUMBING_RENDERERS", [
    "pipe-sizing", "friction-loss", "pipe-volume", "pump-sizing",
    "static-pressure-piping", "slope",
    "pressure-conversion", "backflow",
    // v2
    "water-hammer-arrestor", "recirc-pump-head", "trap-arm",
    "pipe-expansion", "tankless-gpm",
    // v3
    "stormwater-rational", "stormwater-max-drainage-area", "manning-slope", "manning-pipe-capacity", "hydrostatic-test", "grease-trap", "grease-interceptor-flow-capacity",
    "stormwater-detention-volume",
    "glycol-mix", "expansion-tank", "backflow-loss",
    "hydronic-fill-pressure", "solder-joint-quantity", "pipe-insulation-takeoff", "heat-trace-sizing",
    // v7
    "water-hammer-surge", "pump-operating-point",
    "pipe-expansion-loop",
    // v9
    "recirc-loop-sizing",
    // v16
    "water-heater-recovery", "water-heater-input", "wh-expansion-tank", "sanitary-dfu", "trap-primer",
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
    // spec-v163 drainage invert-out, fall, and cover for a gravity run.
    "drainage-invert",
    // spec-v199 hydronic radiant floor loop sizing.
    "radiant-loop-sizing",
    // spec-v302..v304 site-hydraulics depth batch.
    "time-of-concentration", "orifice-flow", "orifice-diameter-for-flow", "tank-drain-time", "channel-froude-number",
    "channel-normal-depth", "hydraulic-jump", "specific-energy",
    "velocity-head", "flow-continuity", "bernoulli-head",
    "thrust-block-sizing", "thrust-block-max-pressure",
  ]);
  // spec-v86 cap-relief split: the cohesive onsite-wastewater / septic bench
  // (the v2 septic-tank, the v7 septic-drainfield, and the v83 pressure-
  // distribution trio) relocated out of calc-plumbing.js (which had reached
  // 98.9% of cap -- the tightest remaining calc module) into calc-septic.js.
  // All five keep group: "B" (group letter independent of module, the
  // v42/v70..v82 precedent).
  declare("./calc-septic.js", "SEPTIC_RENDERERS", [
    // v2 / v7
    "septic-tank", "septic-drainfield", "septic-drainfield-capacity",
    // v83 onsite-septic pressure distribution
    "septic-dose-tank", "septic-pumpout-interval", "septic-tank-for-interval", "septic-lpp-orifice", "septic-lpp-squirt-head",
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
    // spec-v167/v168/v169 electrician dwelling demand-factor trio
    "range-demand-220-55", "dryer-demand-220-54", "neutral-demand-220-61",
    // spec-v180/v181 electrician second-pass batch
    "commercial-lighting-load", "noncoincident-load",
    // spec-v230..v232 electrical energy-cost-savings batch
    "vfd-energy-savings", "lighting-retrofit-savings", "power-factor-billing-savings",
    // spec-v279 NEC 310.12 dwelling service conductor
    "service-conductor-sizing",
  ]);
  // spec-v73 cap-relief split: the two spec-v62 storm-drainage tiles relocated
  // out of calc-plumbing.js (which had reached 96.2% of cap -- the tightest
  // remaining calc module) into calc-drainage.js. They keep group: "B" (group
  // letter independent of module, the v42/v70/v71/v72 precedent).
  declare("./calc-drainage.js", "DRAINAGE_RENDERERS", [
    "roof-drain-sizing", "sump-basin-sizing",
    // spec-v426..v427 drainage
    "overflow-scupper-sizing", "scupper-width-for-flow", "sewage-force-main-velocity",
  ]);
  // spec-v42 cap-relief split: the three fuel-gas tiles relocated out of
  // calc-plumbing.js (which had reached 98.9% of cap) into calc-gas.js. They
  // keep group: "B" (group letter independent of module, the v36/v39 precedent).
  declare("./calc-gas.js", "GAS_RENDERERS", [
    "gas-pipe-sizing", "gas-leak-rate", "gas-leak-hole-diameter", "gas-pipe-pressure-drop", "gas-pipe-max-flow",
    // spec-v111 high-altitude derate and NG/LP fuel conversion (same module).
    "gas-altitude-derate", "gas-fuel-conversion",
    // spec-v206 medical-gas system demand and diversity (NFPA 99).
    "medgas-demand",
  ]);
  declare("./calc-hvac.js", "HVAC_RENDERERS", [
    "manual-j-cooling", "manual-j-heating", "duct-sizing",
    "static-pressure-hvac",
    "seer-eer", "balance-point", "shr", "cfm-per-ton", "combustion-air", "combustion-air-max-input",
    // v2
    "approach-delta-t",
    "outdoor-air-mix", "equivalent-length", "wet-bulb-psychrometer",
    "insulation-thickness", "evaporative-cooling", "evaporative-cooler-effectiveness",
    // v3
    "affinity-laws", "belt-pulley", "air-receiver", "geothermal-loop",
    "baseboard-output", "baseboard-length-for-load", "npsh-a",
    // v7
    "duct-friction-static", "cooling-tower",
    "insulation-heat-loss",
    // v8
    "duct-leakage",
    // v9
    "outdoor-air-ventilation", "hood-exhaust", "shr-latent",
    // v20
    "economizer-savings-hours", "pipe-heat-loss-radial", "insulation-thickness-for-heat-loss", "fan-motor-bhp", "fan-motor-max-airflow",
    // v27 round-to-rectangular duct equivalent
    "round-to-rect-duct",
    // v99 building-envelope insulation
    "assembly-r-value", "blown-insulation-coverage",
    // spec-v233..v235 heat-pump heating-mode batch
    "heat-pump-seasonal-energy", "dual-fuel-balance-point", "heat-pump-cold-capacity",
    // spec-v239..v241 compressed-air energy batch
    "air-leak-cost", "compressed-air-power", "air-pressure-setpoint-savings",
    // spec-v275..v277 ventilation-and-recovery batch
    "erv-sensible-recovery", "mua-tempering-load", "dcv-co2-ventilation",
    // spec-v305..v307 pump-and-fluid fundamentals batch
    "reynolds-number-pipe", "hydronic-gpm-deltat", "pump-specific-speed", "pump-suction-specific-speed",
    // spec-v329..v331 building-energy batch
    "building-ua", "degree-day-energy", "wall-condensation-gradient",
    "duct-heat-gain", "grille-face-velocity", "air-density-correction",
    "adpi-diffuser-selection", "vibration-isolation", "isolator-deflection",
    "moist-air-enthalpy", "drybulb-from-enthalpy", "cooling-coil-total-load", "coil-bypass-factor",
    "fan-affinity-laws", "colebrook-friction-factor", "manual-d-friction-rate",
    // spec-v441..v443 energy-recovery / hydronic / economizer
    "erv-total-enthalpy-recovery", "radiant-floor-output", "economizer-enthalpy-changeover",
    // spec-v478 hydronic snowmelt sizing (the v199 radiant follow-on).
    "snowmelt-load",
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
    "refrigerant-pt", "superheat-subcool", "compare-refrigerants", "refrigerant-charge", "refrigerant-lineset-charge-adjust",
    // v7
    "refrigerant-charging",
    // spec-v320..v322 refrigeration-cycle batch
    "refrigerant-mass-flow", "refrigeration-cop", "condenser-heat-rejection", "condenser-cop-for-heat-rejection",
    // spec-v432..v434 walk-in refrigeration
    "walk-in-cooler-load", "product-pull-down-load", "product-pull-down-time", "evaporator-td-dtd",
    // spec-v586 liquid-line subcooling / flash gas
    "flash-gas-subcool", "compressor-displacement",
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
    // spec-v227..v229 cooling-load-components batch
    "window-solar-heat-gain", "internal-heat-gains", "envelope-conduction-load",
    // spec-v409..v410 HVAC duct-design
    "coil-face-velocity", "coil-face-area", "vav-box-airflow",
    // spec-v587 anti-short-cycle buffer tank
    "hydronic-buffer-tank",
    // spec-v623 buffer tank with distribution-loop credit
    "buffer-tank-loop-credit",
  ]);
  // spec-v74 cap-relief split: the two spec-v23 velocity tiles relocated out of
  // calc-hvac.js (which had reached 95.9% of cap -- the tightest remaining calc
  // module) into calc-velocity.js. They keep group: "C" (group letter
  // independent of module, the v42/v70/v71/v72/v73 precedent).
  declare("./calc-velocity.js", "VELOCITY_RENDERERS", [
    "duct-velocity-pressure", "refrigerant-velocity", "refrigerant-line-size", "pitot-traverse-cfm",
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
    // spec-v136..v140 on-arrival water-loss bench.
    "flood-cut-takeoff", "ceiling-water-load", "dehumidifier-derate",
    "class-of-loss-screen", "desiccant-airflow-sizing",
    // spec-v189..v198 water-damage restoration second/third pass.
    "drying-balance", "bound-water", "disinfectant-dwell",
    "carpet-restore-replace", "category-deterioration", "hydroxyl-sizing",
    "cavity-drying-system", "dry-time-projection",
    // spec-v141 + v146..v148 + v152..v154 fire & smoke restoration batch.
    "equipment-heat-load", "char-depth-capacity", "soot-cleaning-takeoff",
    "ozone-shock-treatment", "smoke-residue-method", "thermal-fog-deodorization",
    "contents-packout-inventory",
    // spec-v143 / v150 / v155 / v156 restoration novelty batch (condensation,
    // spore clearance ratio, hardwood mat sizing, mold cleaning labor).
    "surface-condensation-risk", "spore-io-ratio", "hardwood-floor-drying-mat",
    "mold-cleaning-labor",
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
    "concrete", "shotcrete-rebound-quantity", "rebar", "lumber-spans", "fastener-pullout",
    "beam-loading", "material-quantity",
    // v2
    "stair-stringer", "joist-deflection", "footing-area", "tile-count",
    "paint-coverage", "excavation", "masonry-count", "wind-pressure", "wind-speed-from-velocity-pressure",
    "snow-load", "anchor-embedment",
    // v3
    "drywall", "roofing-squares", "asphalt-tonnage", "asphalt-paving-speed", "asphalt-tack-coat-quantity", "aggregate", "stockpile-volume", "mortar-mix",
    "concrete-mix-design", "bolt-torque", "bend-allowance", "speeds-feeds",
    "intermittent-fillet-weld", "multi-bend-flat-pattern",
    "powered-attic-ventilator",
    "weld-usage", "demo-debris", "formwork-pressure", "concrete-pour-rate",
    // v7
    "stair-stringer-layout", "hip-valley-rafter", "rebar-schedule", "welded-wire-mesh",
    "plywood-span", "helical-pile", "helical-pile-torque", "crane-lift-quick",
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
    // spec-v481 stair geometry code check (IBC 1011 / IRC R311).
    "stair-code-check",
    // spec-v212..v214 masonry grout / coursing and wallcovering takeoffs.
    "cmu-grout-volume", "annular-grout-volume", "masonry-coursing", "wallpaper-rolls",
    // spec-v215..v217 roofing material-takeoff batch.
    "ice-barrier-coverage", "metal-roof-panels", "ridge-cap-fasteners",
    // spec-v224..v226 ASCE 7 structural design-loads batch.
    "rain-load-ponding", "asce7-load-combinations", "seismic-base-shear",
    // spec-v477 ELF vertical distribution (the v226/v383 follow-on).
    "seismic-vertical-distribution",
    // spec-v480 ELF overturning moment (the v477 §12.8.5 follow-on).
    "seismic-overturning-moment",
    // spec-v242..v244 IBC/IPC occupancy trio.
    "occupant-load", "egress-capacity", "plumbing-fixture-count",
    // spec-v245..v247 cast-in-place placing-and-curing trio.
    "shore-post-load", "scaffold-mudsill-bearing", "scaffold-leg-load", "scaffold-takeoff", "asphalt-spread-rate", "pavement-milling-production", "striping-paint-quantity", "concrete-vibrator-spacing", "formwork-tie-load", "mass-concrete-temp-rise", "concrete-washout-volume", "shingle-nails", "duct-metal-weight", "duct-bank-concrete", "duct-wrap-takeoff", "duct-hanger-load", "roof-underlayment-rolls", "membrane-roof-takeoff", "tapered-roof-insulation", "sheathing-takeoff", "construction-adhesive-tubes", "sill-plate-anchor-count", "metal-stud-takeoff", "suspended-ceiling-grid", "masonry-control-joint-layout", "dumpster-count", "sealant-joint-yield", "self-leveler-bags", "concrete-evaporation-rate", "concrete-strength-gain",
    // spec-v476 maturity method (the v247 follow-on).
    "concrete-maturity",
    // spec-v430..v431 concrete field-work (v429 cut as dupe)
    "rebar-weight-takeoff", "ready-mix-concrete-order", "concrete-yield", "water-cement-ratio",
    // spec-v803 ASCE 7 live load reduction
    "asce-live-load-reduction",
    // spec-v439..v440 finish-carpentry takeoff (v438 cut as dupe)
    "insulation-batt-coverage", "trim-linear-footage",
    "glulam-volume-factor",
    // spec-v251..v253 IBC plan-review trio.
    "allowable-area", "egress-travel-distance", "exterior-opening-protection",
    // spec-v263..v265 NDS sawn-lumber design trio.
    "wood-beam-bending", "wood-beam-shear", "wood-bolt-connection",
    // spec-v290..v292 NDS wood-member depth batch.
    "wood-bearing-perpendicular", "wood-tension-member", "wood-combined-bending-axial",
    // spec-v296..v298 ASCE 7 wind-and-snow load depth batch.
    "wind-cc-pressure", "snow-drift-load", "wind-mwfrs-pressure",
    // spec-v468..v470 ASCE 7 snow provisions batch.
    "rain-on-snow-surcharge", "sliding-snow-load", "minimum-roof-snow",
    // spec-v474 ADA ramp layout
    "ada-ramp-slope",
    // spec-v332..v334 wood-fastener withdrawal batch.
    "wood-nail-withdrawal", "wood-lag-withdrawal", "wood-screw-withdrawal",
    "cantilever-beam", "section-properties", "combined-stress-axial-bending",
    "shaft-torsion", "shaft-diameter-for-torsion", "thermal-stress-restrained", "thermal-stress-max-deltat", "hoop-stress-thin-wall", "hoop-stress-mawp",
    "seismic-design-spectral-acceleration", "seismic-story-drift", "seismic-pdelta-stability",
    // spec-v546
    "wind-solid-sign",
    // spec-v553
    "snow-unbalanced-gable",
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
    "attic-ventilation", "gutter-downspout", "deck-board-takeoff", "glass-weight",
  ]);
  // spec-v101 new electrician design/layout bench; relieves the standing
  // calc-electrical.js cap watch. Both tiles keep group "A".
  declare("./calc-elecdesign.js", "ELECDESIGN_RENDERERS", [
    "pull-box-sizing", "lumen-method",
    // spec-v175 electrician batch
    "point-illuminance", "luminaire-height-for-illuminance", "point-method-required-candela",
    "lighting-light-loss-factor", "lighting-uniformity-ratio", "egress-lighting-check",
    // spec-v525 neutral grounding resistor sizing (IEEE 142)
    "neutral-grounding-resistor",
    // spec-v558
    "step-touch-voltage",
    "ground-potential-rise", "max-grid-resistance-for-touch", "rolling-sphere-protection",
    // spec-v560
    "sccr-combination",
  ]);
  // spec-v102 new HVAC field-service bench; relieves the standing
  // calc-hvac.js cap watch. Both tiles keep group "C".
  declare("./calc-hvacservice.js", "HVACSERVICE_RENDERERS", [
    "condensate-drain", "recovery-cylinder", "outside-air-percent-temps",
    // spec-v104 electrical-side field-service diagnostics (same module).
    "hvac-equipment-circuit", "run-capacitor-microfarad",
    // spec-v105 evacuation/leak-check field diagnostics (same module).
    "vacuum-decay-test", "nitrogen-pressure-test",
    // spec-v110 gas-heat start-up diagnostics (same module).
    "gas-meter-clock", "gas-meter-clock-target", "furnace-temp-rise", "furnace-airflow-to-rise",
    // spec-v218..v220 residential air-tightness and ventilation batch.
    "blower-door-ach50", "ashrae-622-ventilation", "infiltration-load",
    // spec-v461 residential duct leakage
    "duct-leakage-cfm25",
    // spec-v583 combustion excess air
    "excess-air-o2",
    // spec-v584 air-free CO correction
    "co-air-free",
    // spec-v622 draft-hood dilution ratio
    "draft-hood-dilution",
    // spec-v585 theoretical chimney draft
    "chimney-draft", "chimney-height-for-draft",
    // spec-v594 flue-gas combustion efficiency (stack loss)
    "flue-gas-combustion-eff",
    "combustion-lambda",
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
    "curve-deflection-stakeout",
    "superelevation", "superelevation-safe-curve-speed", "vertical-curve-sight-distance", "horizontal-sightline-offset",
    "sag-vertical-curve", "sag-vertical-curve-comfort",
  ]);
  // spec-v254..v256 AISC 360 steel-member trio + spec-v266..v268 steel-connection
  // trio: a new lazy Group E cluster (the steel-member companion to the wood-framing
  // and steel-weld tiles). All six KEEP group "E" (module independent of group letter).
  declare("./calc-steel.js", "STEEL_RENDERERS", [
    "steel-beam-flexure", "required-section-modulus", "steel-beam-shear", "steel-column-capacity",
    "bolt-group-eccentric", "bolt-shear-bearing", "column-base-plate",
    // spec-v281..v283 members-and-connections depth batch
    "steel-beam-ltb", "steel-block-shear", "steel-tension-member",
    // spec-v293..v295 connection/detailing depth batch
    "steel-web-local-strength", "steel-bolt-slip-critical", "steel-fillet-weld-size",
    // spec-v314..v316 beam-column-and-connection depth batch
    "steel-h1-interaction", "steel-effective-length-k", "steel-bolt-tension-shear",
    // spec-v411..v413 composite-beam trio
    "shear-stud-strength", "composite-beam-flexure", "steel-camber", "steel-inertia-for-deflection",
    // spec-v547
    "steel-floor-vibration",
    // spec-v555
    "steel-panel-zone-shear",
    "steel-doubler-plate",
    // spec-v618
    "steel-panel-zone-axial",
  ]);
  // spec-v257..v259 ACI 318-19 reinforced-concrete member trio: a new lazy
  // Group E cluster, the RC companion to calc-steel.js one material over.
  // All three KEEP group "E" (module independent of group letter).
  declare("./calc-concrete.js", "CONCRETE_RENDERERS", [
    "rc-beam-flexure", "rc-beam-shear", "rc-development-length",
    "concrete-torsion-threshold",
    // spec-v284..v286 member depth batch
    "rc-column-axial", "rc-column-steel-for-load", "rc-punching-shear", "rc-hook-development",
    // spec-v299..v301 depth-2 batch
    "rc-slab-min-thickness", "rc-slab-max-span-for-thickness", "rc-doubly-reinforced", "rc-shear-friction",
    "concrete-elastic-modulus", "concrete-strength-from-modulus", "concrete-modulus-of-rupture", "concrete-strength-from-rupture", "concrete-cracking-moment", "concrete-depth-for-cracking-moment", "concrete-shrinkage-temperature-steel",
    "t-beam-effective-flange-width", "concrete-beam-min-flexural-steel", "concrete-crack-control-spacing",
    // spec-v490 concrete bearing strength (ACI 318-19 §22.8)
    "concrete-bearing-strength",
    // spec-v491 rebar compression development length (ACI 318-19 §25.4.9)
    "rc-compression-dev-length",
    // spec-v497 long-term deflection multiplier (ACI 318-19 §24.2.4.1)
    "concrete-longterm-defl",
    // spec-v548
    "concrete-anchor-breakout",
    "concrete-anchor-pullout",
    // spec-v617
    "concrete-anchor-blowout",
    // spec-v552
    "rc-slender-column-magnify",
    // spec-v556
    "concrete-corbel-bracket",
    // spec-v793 fresh (batch) concrete temperature (ACI 305.1)
    "fresh-concrete-temp",
  ]);
  // spec-v260..v262 geotechnical foundation-and-earth-retaining trio: a new
  // lazy Group E cluster, where the steel / RC member load path meets the
  // ground. All three KEEP group "E" (module independent of group letter).
  declare("./calc-geotech.js", "GEOTECH_RENDERERS", [
    "soil-bearing-capacity", "lateral-earth-pressure", "at-rest-earth-pressure", "submerged-earth-pressure", "sloped-backfill-earth-pressure", "coulomb-earth-pressure", "retaining-wall-stability",
    // spec-v287..v289 foundation depth batch
    "soil-settlement-elastic", "elastic-settlement-allowable-pressure", "pile-axial-capacity", "pile-length-for-capacity", "slope-stability-infinite", "slope-failure-depth-for-fs", "slope-stability-seepage",
    // spec-v308..v310 geotechnical depth-2 batch
    "soil-consolidation-settlement", "settlement-limit-load", "footing-eccentric-pressure", "boussinesq-surcharge-wall",
    // spec-v414..v416 settlement/foundation trio
    "consolidation-time-rate", "consolidation-degree", "spt-bearing-capacity", "spt-required-n60", "liquefaction-screening",
    // spec-v498 pile group efficiency (Converse-Labarre)
    "pile-group-efficiency", "pile-group-spacing-for-efficiency",
  ]);
  // spec-v269..v271 TMS 402-16 reinforced-masonry member trio: a new lazy
  // Group E cluster, the masonry counterpart to the steel / RC member benches;
  // masonry's first structural (not takeoff) tiles. All three KEEP group "E".
  declare("./calc-masonry.js", "MASONRY_RENDERERS", [
    "cmu-wall-flexure", "cmu-shear-wall", "cmu-wall-axial",
    "masonry-wall-weight", "brick-veneer-anchor-spacing", "masonry-lintel-loading",
    "masonry-anchor-bolt", "masonry-anchor-embedment", "masonry-prism-fm",
  ]);
  // spec-v272..v274 SDPWS wood lateral-force-resisting-system trio: a new
  // lazy Group E cluster closing the load path from seismic-base-shear /
  // wind-pressure into the wood diaphragm, shear wall, and drift. All three
  // KEEP group "E" (module independent of group letter).
  declare("./calc-lateral.js", "LATERAL_RENDERERS", [
    "diaphragm-shear", "shearwall-overturning", "shearwall-deflection",
    // spec-v549
    "diaphragm-collector-force",
  ]);
  // spec-v70 cap-relief split: the spec-v67 earthwork / excavation bench
  // moved out of calc-construction.js (it sat at 97.6% of its size cap) into
  // its own module. All five tiles KEEP group "E" (the module is independent
  // of the group letter, per the v28/v30/v36/v39 precedent); no tile or output
  // changed.
  declare("./calc-earthwork.js", "EARTHWORK_RENDERERS", [
    "soil-swell-shrink", "haul-cycle-production", "loader-production", "dozer-production", "compaction-roller-production", "ripper-production", "rusle-soil-loss", "riprap-d50", "riprap-tonnage", "silt-fence-drainage", "check-dam-spacing", "sediment-basin-volume", "erosion-blanket-coverage", "hydroseed-mix", "rock-construction-entrance", "dewatering-rate",
    "spoil-setback", "pipe-bedding-backfill", "pipe-flotation", "restrained-pipe-length", "hdd-pullback", "dust-control-water", "haul-road-resistance", "dump-truck-loads", "unit-cost-earthwork", "soil-stabilization-quantity", "flexible-pipe-deflection",
    // spec-v326..v328 soil characterization / QC batch
    "relative-compaction", "water-for-compaction", "soil-phase-relations", "atterberg-indices", "fineness-modulus",
  ]);
  declare("./calc-fire.js", "FIRE_RENDERERS", [
    "fire-friction", "pdp", "hydrant-flow", "required-fire-flow",
    "master-stream", "aerial-ladder", "foam", "foam-max-coverage-area", "smoke-reading",
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
    "smooth-bore-flow", "smooth-bore-diameter-for-flow",
    "hydrant-available-flow",
    // spec-v577
    "nfa-fireground-flow",
    "iowa-rate-of-flow",
    "relay-pump-distance",
    "draft-lift-max",
    "vacuum-lift-reading",
    "tanker-shuttle-flow",
    "tanker-shuttle-cycle",
    "tanker-fleet-size",
    "foam-eductor-limit",
  ]);
  // spec-v82 cap-relief split: the spec-v3 technical-rescue bench moved out
  // of calc-fire.js (it sat at 94.9% of its size cap) into its own module.
  // All three tiles KEEP group "F" (the module is independent of the group
  // letter, per the v28/v30/v36/v39/v70..v81 precedent); no tile or output
  // changed.
  declare("./calc-rescue.js", "RESCUE_RENDERERS", [
    "confined-space-purge", "rope-ma", "sling-angle",
    // spec-v540
    "search-track-spacing",
    // spec-v541
    "sweat-rate-hydration",
    // spec-v595
    "searcher-hours",
    // spec-v614
    "sweep-width-correction",
    // spec-v779
    "fall-arrest-clearance",
  ]);
  // spec-v248..v250 fire-sprinkler system-design trio: a new lazy Group F
  // cluster split off beside calc-fire.js exactly as calc-rescue.js was (the
  // fire module sits near its size cap). All three KEEP group "F" (module
  // independent of group letter, per the v28/v30/v36/v39/v70..v82 precedent).
  declare("./calc-firesprinkler.js", "FIRESPRINKLER_RENDERERS", [
    "fire-pump-curve", "sprinkler-system-demand", "sprinkler-protection-area-for-supply", "sprinkler-head-layout",
    "sprinkler-pressure-demand",
  ]);
  declare("./calc-references.js", "REFERENCE_RENDERERS", [
    "color-codes", "knot-reference", "inspection-checklist",
    "emergency-contacts", "tool-maintenance",
    // v3
    "hand-signals", "osha-top10", "loto-steps", "defensible-space",
    "storm-shelter", "triage-quickread",
    // v5 Step 61
    "irs-form-index", "sales-tax-nexus", "osha-recordkeeping", "lab-safety-quickread",
    // spec-v177/v178 electrician reference lookups
    "burial-depth-300-5", "support-spacing",
    // spec-v187 swimming-pool equipotential bonding
    "pool-bonding-680-26",
  ]);
  declare("./calc-cross.js", "CROSS_RENDERERS", [
    "unit-converter", "material-cost", "markup", "time-and-materials",
    "sales-tax", "tip-out",
    // v2
    "loan-payment", "upgrade-roi", "mileage-cost", "overtime", "per-diem",
    "geometry", "dilution", "slope-from-level", "haversine",
    // v3 (meta-utilities 170 and 172 are registered separately below; the rest live here)
    "trench-slope", "niosh-lifting", "heat-stress", "wind-chill", "wind-chill-wind-speed", "ladder-angle",
    "pulley-ma-gen", "ramp-slope", "rainwater-yield", "rainwater-catchment-area", "timesheet", "vehicle-load",
    // v7
    "fall-protection-clearance",
    // v9
    "noise-dose",
    // v15
    "pump-tdh", "hydraulic-cylinder", "vbelt-drive", "belt-hp-transmitted", "gear-cascade",
    // v24 rolling offset
    "rolling-offset",
    // v43 tank gauging
    "tank-volume",
    // v53 linear interpolation
    "linear-interpolation",
    // spec-v450 cross-connection air gap
    "cross-connection-air-gap",
    // spec-v503 bolt proof, yield, and tensile load (SAE J429)
    "bolt-proof-load",
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
    // v129..v134 metal-trades batch: weld estimating + plate forming (group E), shrink fit (group G)
    "weld-metal-volume", "wire-feed-deposition", "wire-feed-speed-for-deposition", "weld-transverse-shrinkage",
    "weld-group-eccentric", "min-bend-radius", "shrink-fit",
    "weld-dilution", "weld-passes-arc-time", "weld-travel-speed",
    // spec-v802 coil / roll stock length (group E)
    "coil-length",
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
    "circular-arc", "circular-arc-rise-from-radius",
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
    "machining-time", "material-removal-rate", "turning-surface-finish", "feed-for-surface-finish",
    "taper-calc", "taper-diameter", "tailstock-setover", "dividing-head",
    // Group G (cross-trade)
    "thread-measure-wire", "thread-pitch-dia-from-wires", "punch-force", "punch-capacity",
    // Group E (welding / sheet-metal)
    "press-brake-tonnage", "press-brake-max-thickness", "weld-duty-cycle", "carbon-equivalent",
    // spec-v41 batch 2: Group K + Group G
    "tap-drill-size", "rolled-blank",
    // spec-v54: Group E carpentry compound miter
    "compound-miter",
    // spec-v399..v400 fabrication shop-math
    "tolerance-stack-rss", "cone-flat-pattern",
    // spec-v511 interference press-fit pressure and holding force
    "press-fit-pressure", "press-fit-interference-for-force",
    // spec-v512 roller chain length in pitches (ANSI B29.1)
    "roller-chain-length",
    // spec-v801 sprocket pitch diameter (ANSI B29.1)
    "sprocket-pitch-diameter",
  ]);
  // v4 Group J: Trucking and Logistics.
  declare("./calc-trucking.js", "TRUCKING_RENDERERS", [
    "dim-weight", "freight-density", "pallet-loadout",
    "hos-math", "bridge-formula", "bridge-formula-min-spacing", "reefer-burn", "incoterm-decoder",
    // v9
    "stopping-sight-distance", "ssd-design-speed", "truck-off-tracking",
    // v23
    "cargo-securement-wll", "fuel-tax-ifta",
  
    // v20
    "cost-per-mile", "deadhead-percent", "axle-load-distribution",
    // v91 owner-operator load economics
    "load-profitability", "fuel-surcharge", "maintenance-reserve",
    // spec-v115 weight compliance: GCWR combination + tire load-rating checks.
    "gcwr-check", "tire-load-check",
    // spec-v423..v425 trucking business
    "detention-demurrage-billing", "driver-pay-cpm-vs-percentage", "invoice-factoring-cost",
    // spec-v486 trailer tongue weight and sway check
    "trailer-tongue-weight",
    // spec-v508 diesel exhaust fluid (DEF) consumption and range
    "def-consumption",
  ]);
  // v4 Group K: Mechanic - Auto, Marine, Aviation.
  declare("./calc-mechanic.js", "MECHANIC_RENDERERS", [
    "prop-slip", "displacement-cr", "chamber-cc-for-cr", "bolt-stretch",
    "driveshaft-crit", "driveshaft-max-length", "fuel-range", "tire-gearing", "brake-pad-life",
    "tire-contact-patch",
    // v23
    "valve-flow-coefficient", "screw-conveyor", "screw-conveyor-rpm",
    "helical-spring-rate",

    // v20
    "hp-from-torque", "volumetric-efficiency", "gear-mph-rpm",
    // v100 auto-body 2K paint mix
    "paint-mix-ratio",
    // spec-v396..v398 fluid-power / cooling trio
    "hydraulic-pump-horsepower", "hydraulic-drive-flow-limit", "hydraulic-motor-torque-speed", "hydraulic-pump-flow", "cooling-system-flow",
    // spec-v462..v464 marine/engine/electrical mechanic trio
    "prop-pitch-selection", "engine-fuel-burn-gph", "alternator-charging-load",
    // spec-v485 torque wrench extension / crowfoot correction
    "torque-adapter-correction",
    // spec-v323..v325 engine-build performance batch
    "injector-size", "injector-max-hp", "mean-piston-speed", "max-rpm-from-piston-speed", "trap-speed-horsepower", "et-horsepower",
    // spec-v500 density altitude and pressure altitude
    "density-altitude",
    // spec-v501 crosswind and headwind component
    "crosswind-component",
    // spec-v502 displacement hull speed and speed/length ratio
    "hull-speed", "waterline-for-hull-speed",
    // spec-v505 anchor rode scope and swing radius
    "anchor-rode-scope",
    // spec-v506 turbocharger pressure ratio and charge-air temp
    "turbo-pressure-ratio", "turbo-max-boost-for-charge-temp",
    // spec-v507 Crouch planing-speed estimate
    "crouch-planing-speed", "crouch-hp-for-speed",
    // spec-v510 wheel offset and backspacing
    "wheel-offset-backspacing",
    // spec-v514 brake pedal ratio and line pressure
    "brake-pedal-hydraulic",
    // spec-v515 SAE J1349 dyno correction factor
    "dyno-correction-sae",
    // spec-v516 aircraft weight and balance (CG envelope)
    "aircraft-weight-balance",
    // spec-v517 ABYC E-11 marine DC wire sizing
    "abyc-dc-wire",
    "reserve-capacity-amp-hours",
    "sacrificial-anode-life",
    "engine-bmep",
    "glidepath-descent-rate",
    "turn-radius-bank",
    "climb-gradient-roc",
  ]);
  // spec-v76 cap-relief split: the cohesive machining bench (cutting-speed-rpm,
  // drill-point-depth) relocated out of calc-mechanic.js (which had reached
  // 95.6% of cap -- the tightest remaining calc module) into calc-machining.js.
  // They keep group: "K" (group letter independent of module, the v42/v70..v75
  // precedent).
  declare("./calc-machining.js", "MACHINING_RENDERERS", [
    // v31, v34
    "cutting-speed-rpm", "cutting-diameter-for-rpm", "drill-point-depth", "drill-point-angle-from-length",
    // v100 cutting-fluid concentration
    "cutting-fluid-concentration",
    // v135 cutting power and spindle torque from MRR
    "spindle-power-torque", "spindle-max-mrr",
    // spec-v317..v319 machining depth batch
    "radial-chip-thinning", "boring-bar-deflection", "boring-bar-max-overhang", "ballnose-scallop-height",
    // spec-v401 spur gear tooth geometry
    "spur-gear-geometry", "gear-identification", "gear-chordal-thickness",
    // spec-v504 rolling-bearing L10 rating life (ISO 281)
    "bearing-l10-life", "bearing-max-load",
    // spec-v509 countersink diameter and cutting depth
    "countersink-depth", "countersink-diameter-from-depth",
    // spec-v513 shaft key and keyseat size (ANSI B17.1)
    "keyseat-key-size",
  ]);
  // v4 Group L: Agriculture and Forestry.
  declare("./calc-agriculture.js", "AGRICULTURE_RENDERERS", [
    "gpa-rate", "timber-cruise", "seed-rate", "drawbar-power", "drawbar-pull",
    "irrigation-uniformity", "bulk-density", "crop-yield",
    // v9
    "thi-livestock", "sprayer-calibration",
    // v17
    "irrigation-requirement", "cattle-stocking-rate", "grain-bin-capacity", "grain-bin-height-for-capacity", "bunker-silo-capacity", "feed-conversion-ratio",
    "grain-shrink-moisture", "livestock-dry-matter-intake", "manure-application-rate",
    "npk-blend", "tank-mix",
    // v23
    "pesticide-rei-phi",
  
    // v20
    "growing-degree-days", "pearson-square-ration", "livestock-water-requirement",
    // spec-v417..v419 landscape/agriculture
    "mulch-topsoil-volume", "grain-drying-energy", "manure-nutrient-application",
    // spec-v568
    "center-pivot-runtime",
    "pivot-application-rate",
    "pivot-timer-depth",
    // spec-v569
    "grain-aeration-airflow",
    // spec-v582
    "manure-storage-volume",
    "manure-cover-savings",
    // v35
    "two-stroke-mix", "two-stroke-mix-ratio-check",
    // v84 sprayer nozzle / drift / field capacity
    "nozzle-flow-pressure", "spray-drift-buffer", "sprayer-field-capacity",
    // spec-v118 hay dry-matter and safe-storage weight.
    "hay-dry-matter",
    // spec-v207..v211 landscape irrigation and planting install cluster.
    "sprinkler-precip-rate", "sprinkler-gpm-for-precip", "irrigation-zone-runtime", "drip-zone-flow",
    "plant-spacing-count", "sod-takeoff",
  ]);
  // v87 cap-relief split: the v68 tree-care / arborist-rigging bench moved out
  // of calc-agriculture.js (95.1% of cap) into calc-arborist.js. All five KEEP
  // group "L" (a tile's group letter is independent of its module, the
  // v42/v70..v86 precedent); ids, citations, examples, and behavior unchanged.
  declare("./calc-arborist.js", "ARBORIST_RENDERERS", [
    "log-limb-weight", "tree-rigging-shock", "felling-notch-hinge",
    "porta-wrap-friction", "chipper-debris",
    // spec-v563
    "basal-area-prism",
    // spec-v564
    "reineke-sdi",
    // spec-v619
    "thinning-target-tpa",
    // spec-v598
    "quadratic-mean-diameter",
    // spec-v565
    "trunk-decay-strength", "trunk-min-shell-thickness",
    "tree-open-cavity",
    // spec-v566
    "tree-protection-zone",
    "tree-crz-encroachment",
    // spec-v567
    "crown-pruning-dose",
    "tree-height-clinometer", "firewood-cord",
  ]);
  // v4 Group M: Water and Wastewater Operations.
  declare("./calc-water.js", "WATER_RENDERERS", [
    "pounds-formula", "filter-loading", "filter-area-for-loading", "detention-time", "detention-basin-volume",
    "lab-dilution", "pump-eff-w2w", "srt-fm-ratio",
    // v8
    "coagulant-dose",
    // v9
    "svi-sludge-index", "disinfection-ct",
    // v16
    "pool-turnover", "well-drawdown", "well-max-yield", "cooling-water-makeup", "chlorine-decay", "chlorine-decay-constant",
    // v23
    "backflow-test-psi",
    // spec-v116 disinfection: chlorine demand/breakpoint + UV dose.
    "chlorine-demand", "uv-dose", "uv-required-exposure",
    // spec-v570
    "population-equivalent",
    // spec-v571
    "ras-flow-rate",
    // spec-v600
    "ras-svi-settleability",
    // spec-v572
    "was-srt-control",
    // spec-v574
    "aeration-oxygen-demand",
  ]);
  // spec-v75 cap-relief split: the cohesive spec-v20 Phase M bench (weir-flow,
  // langelier-index, chemical-feed-pump) relocated out of calc-water.js (which had
  // reached 95.8% of cap -- the tightest remaining calc module) into
  // calc-treatment.js. They keep group: "M" (group letter independent of module,
  // the v42/v70..v74 precedent).
  declare("./calc-treatment.js", "TREATMENT_RENDERERS", [
    "weir-flow", "weir-head-from-flow", "langelier-index", "chemical-feed-pump",
    "clarifier-surface-loading", "clarifier-area-for-loading", "bod-tss-loading-removal", "tds-from-conductivity", "conductivity-from-tds",
    // spec-v573
    "digester-vs-loading",
    // spec-v620
    "va-alkalinity-ratio",
    // spec-v596
    "digester-gas-production",
    // spec-v575
    "flocculation-g-value",
    "flocculator-paddle-power",
    // spec-v621
    "tapered-flocculation-g",
    // spec-v576
    "chlorine-cylinder-withdrawal",
    // v93 pool and spa chemical balance
    "pool-volume",
    "pool-alkalinity-adjust", "pool-cya-dose", "pool-salt-dose",
    "pool-chlorine-dose", "pool-heater-btu", "pool-heater-size", "breakpoint-chlorination",
  ]);
  // v4 Group N: Stage and Live Production.
  declare("./calc-stage.js", "STAGE_RENDERERS", [
    "truss-capacity", "time-alignment", "dmx-planner",
    "neutral-imbalance", "spl-distance", "spl-distance-for-level", "rigging-check",
    // v9
    "spl-atmospheric",
  
    // v20
    "power-distro",
    // v24 audio electronics
    "speaker-impedance", "decibel-converter", "amp-power-spl", "lighting-beam", "lighting-throw-for-pool", "winch-fleet-angle",
    // v92 LED video wall + projection
    "led-video-wall", "projector-brightness", "projector-max-screen-size",
    // v120 room acoustics
    "room-acoustics", "room-absorption-target",
    // spec-v542
    "counterweight-arbor-load",
    // spec-v543
    "led-tape-run", "led-tape-max-run",
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
    // spec-v537
    "menu-engineering",
    // spec-v538
    "kitchen-sanitizer-ppm",
    // spec-v539
    "drink-abv-dilution",
    "overrun-percent",
    "draft-beer-line-balance",
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
    // spec-v311..v313 field-surveying depth batch
    "differential-leveling", "level-loop-adjustment", "stadia-distance", "taping-corrections",
    "cogo-forward-point", "edm-slope-reduction", "leveling-curvature-refraction", "grid-to-ground", "cogo-inverse-locate",
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
    "labor-burden-rate", "equipment-hourly-rate", "overhead-recovery-rate",
    "wip-percent-complete", "change-order-markup", "retainage-tracker",
    "surety-bond-premium", "workers-comp-emr-premium", "prevailing-wage-fringe",
    // spec-v529 economic order quantity (Wilson EOQ)
    "eoq-order-quantity",
    // spec-v530 reorder point and safety stock (service-level model)
    "reorder-point",
    // spec-v531 units-of-production depreciation
    "units-of-production-depr",
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
    // spec-v531
    "molarity-from-stock",
    // spec-v533
    "nucleic-acid-a260",
    // spec-v534
    "ligation-molar-ratio",
    // spec-v535
    "doubling-time", "growth-projected-count",
    // spec-v536
    "michaelis-menten",
    "substrate-for-velocity",
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
    "debt-yield", "break-even-occupancy", "max-offer-70-rule",
    "fix-flip-profit", "brrrr-refi", "rental-total-return",
    // spec-v526 net effective rent (lease concessions)
    "net-effective-rent", "required-face-rent",
    // spec-v527 rentable/usable load factor (BOMA)
    "commercial-load-factor",
    // spec-v528 blended mortgage rate (two loans)
    "blended-mortgage-rate",
    "floor-area-ratio",
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
    "sample-size-for-margin",
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
    "sling-d-d-efficiency", "wind-on-load", "max-wind-speed-for-lift", "tagline-force", "tandem-lift-share",
    // v66 hardware and below-the-hook
    "shackle-eyebolt-wll", "spreader-beam", "spreader-beam-min-height", "forklift-capacity-derate",
    "roller-jack-force", "chain-lever-hoist", "block-redirect-load", "block-redirect-max-angle",
    // spec-v117 multi-leg sling load per leg + wire-rope strength estimate.
    "multi-leg-sling", "wire-rope-strength", "wire-rope-diameter-for-wll",
    // spec-v484 spanned cable sag and tension
    "spanline-sag-tension", "spanline-sag-for-tension",
    // spec-v544
    "bridle-leg-tension",
    // spec-v545
    "winch-drum-line-pull",
    // spec-v550
    "crane-outrigger-reaction",
    // spec-v554
    "lifting-lug-design",
    // spec-v615
    "three-point-bridle",
    // spec-v616
    "beam-clamp-side-pull",
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
// spec-v107: groups S (Legal), U (Veterinary), V (EMS), W (Aviation) retired.
// Gaps in the letter sequence are expected and allowed (spec-v106 §5).
const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "T", "X", "Y", "Z"];

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
  T: "Bench Science and Laboratory Math",
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
const NOTICE_HISTORICAL = "Reference only. Prices change; ask your supplier for a current quote.";
const NOTICE_TAX_LAW = "Estimate only. Tax law changes. Confirm with the current IRS publication or a licensed CPA before filing.";
const NOTICE_LEGAL = "This is legal information, not legal advice. Statutes and court rules change. Verify with current state code and a licensed attorney before relying on this for a filing or a deadline.";
const NOTICE_LAB = "Verify protocol against your lab's SOP before pipetting. A miscalculated dilution can ruin a run or a sample.";
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
const HOME_DESC = "Rough Logic";
const HOME_TITLE = "Rough Logic";
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
  else if (tool.group === "T") notice.textContent = NOTICE_LAB;
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
  sourcesNote.textContent = "Every formula is drawn from published standards and engineering references.";
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
  // Row shape matches the shard ({ term, target }) so the rows feed
  // rankTools directly. Reassigned (not mutated) on load so the ranker's
  // per-array caches never go stale.
  let aliasRows = [];
  let aliasLoaded = false;
  async function ensureAliases() {
    if (aliasLoaded) return;
    aliasLoaded = true;
    try {
      const r = await fetch("data/search/aliases.json", { credentials: "omit" });
      if (!r.ok) return;
      const json = await r.json();
      if (!json || !Array.isArray(json.aliases)) return;
      const rows = [];
      for (const row of json.aliases) {
        if (!row || typeof row.term !== "string" || typeof row.target !== "string") continue;
        if (!nameToId.has(row.target) && !TOOLS.some((t) => t.id === row.target)) continue;
        rows.push({ term: row.term.toLowerCase(), target: row.target });
      }
      aliasRows = rows;
      // Refresh the open dropdown so just-loaded aliases become searchable.
      if (document.activeElement === input) render(input.value);
    } catch { /* alias autocomplete is opt-in; failure is a no-op */ }
  }

  // The spec-v589 pure ranking layer (normalizeQuery / rankTools) loads
  // lazily alongside ensureTools so the bare home view never pulls it.
  let discovery = null;
  let discoveryLoading = false;
  function ensureDiscovery() {
    if (discovery || discoveryLoading) return;
    discoveryLoading = true;
    import("./search-discovery.js").then((mod) => {
      discovery = mod;
      if (document.activeElement === input) render(input.value);
    }).catch(() => { discoveryLoading = false; });
  }

  // spec-v591 slot tables: tile id -> { slots: [{ param, units }] }.
  // Lazy-loaded with the aliases on first search interaction; failure is
  // a no-op (picks navigate to the bare tile hash, exactly as before).
  let slotsByTile = null;
  let slotsLoading = false;
  function ensureSlots() {
    if (slotsByTile || slotsLoading) return;
    slotsLoading = true;
    fetch("data/search/slots.json", { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json || !Array.isArray(json.tiles)) return;
        slotsByTile = new Map();
        for (const row of json.tiles) {
          if (row && typeof row.tile === "string" && Array.isArray(row.slots)) {
            slotsByTile.set(row.tile, row);
          }
        }
      })
      .catch(() => { /* prefill is opt-in; failure is a no-op */ });
  }

  // Prefill hash for a picked tile: numbers-with-units in the typed query
  // map onto the tile's hash-state params (spec-v591). Keys come only
  // from the static shard; values are parser-canonical decimal strings.
  function prefillHash(tool, typed) {
    if (!discovery || !slotsByTile || !typed) return tool.id;
    const row = slotsByTile.get(tool.id);
    if (!row) return tool.id;
    const params = discovery.mapSlots(discovery.extractQuantities(typed), row);
    if (!params) return tool.id;
    return tool.id + "?v=1&" + new URLSearchParams(params).toString();
  }

  // spec-v592 live answer preview. The map is a lazy shard; the compute
  // is the same lazily-imported module export the tile itself calls. Any
  // failure renders nothing: the preview only ever adds to a result row.
  let previewMap = null;
  let previewLoading = false;
  function ensurePreview() {
    if (previewMap || previewLoading) return;
    previewLoading = true;
    fetch("data/search/preview-map.json", { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (json && json.tiles) previewMap = json.tiles; })
      .catch(() => { /* preview is opt-in; failure is a no-op */ });
  }
  let previewTimer = 0;
  let previewSeq = 0;
  function schedulePreview(topTool, typed, rowEl) {
    if (!previewMap || !discovery || !slotsByTile) return;
    const entry = previewMap[topTool.id];
    const slotRow = slotsByTile.get(topTool.id);
    if (!entry || !slotRow) return;
    const mapped = discovery.mapSlots(discovery.extractQuantities(typed), slotRow);
    if (!mapped) return;
    const seq = ++previewSeq;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      import(entry.module).then((mod) => {
        if (seq !== previewSeq || !rowEl.isConnected) return;
        const fn = mod[entry.fn];
        if (typeof fn !== "function") return;
        const args = { ...entry.defaults };
        for (const [param, argName] of Object.entries(entry.args)) {
          if (param in mapped) args[argName] = Number(mapped[param]);
        }
        let result;
        try { result = fn(args); } catch { return; }
        if (!result || typeof result !== "object" || result.error) return;
        const parts = [];
        for (const h of entry.headline) {
          const v = Number(result[h.key]);
          if (!Number.isFinite(v)) return;
          parts.push(h.label + " " + v.toFixed(h.decimals) + (h.unit ? " " + h.unit : ""));
        }
        const span = document.createElement("span");
        span.className = "sr-preview";
        span.textContent = parts.join(" / ");
        rowEl.appendChild(span);
      }).catch(() => { /* preview only ever adds */ });
    }, 150);
  }

  // Rank tiles for a query. Preferred path (spec-v589): stopword-stripped
  // token ranking via search-discovery.js rankTools. Fallback (module not
  // yet loaded, or the query normalizes to nothing, e.g. a bare "how"):
  // the original substring pass over name, then description, then alias
  // terms. Empty query lists the catalog A-Z.
  // Ranked-result metadata for the most recent searchTools call that went
  // through rankTools; null when the substring fallback answered. Feeds
  // the spec-v592 did-you-mean row and the answer preview.
  let lastRanked = null;
  function searchTools(query) {
    if (!searchReady) return [];
    lastRanked = null;
    const q = (query || "").trim().toLowerCase();
    if (!q) return ALL;
    if (discovery) {
      const { tokens } = discovery.normalizeQuery(q);
      if (tokens.length) {
        const ranked = discovery.rankTools(tokens, TOOLS, aliasRows, { limit: 12 });
        if (ranked.length) {
          lastRanked = { rows: ranked, tokens };
          return ranked.map((r) => r.tool);
        }
      }
    }
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
    for (const al of aliasRows) {
      if (al.term.includes(q)) add(TOOLS.find((t) => t.id === al.target));
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
    const typed = input.value;
    input.value = "";
    matches = [];
    clearChildren(list);
    setExpanded(false);
    setActive(-1);
    input.blur();
    navigateTo(prefillHash(tool, typed));
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
      // spec-v592 no-match fallback: a dead end becomes a fork in the
      // road -- route home to the browse-by-trade index.
      const browse = document.createElement("li");
      browse.className = "search-empty search-browse";
      browse.setAttribute("role", "presentation");
      const link = document.createElement("a");
      link.href = "#home";
      link.textContent = "Browse all " + GROUPS.length + " trades";
      link.addEventListener("mousedown", (e) => {
        e.preventDefault();
        input.value = "";
        setExpanded(false);
        input.blur();
        navigateTo("home");
        const nav = document.querySelector(".home-trades");
        if (nav) nav.scrollIntoView({ block: "start" });
      });
      browse.appendChild(link);
      list.appendChild(browse);
      setExpanded(true);
      setActive(-1);
      return;
    }
    // spec-v592 did-you-mean: when the top match needed the typo pass,
    // say what the results actually match so the vocabulary is learned.
    // (Top-result, not all-results: a generic token like "fill" always
    // matches some tile exactly, so an every-match condition never fires.)
    if (lastRanked && lastRanked.rows[0].viaTypo) {
      const fixes = lastRanked.rows[0].typoFixes || {};
      const corrected = lastRanked.tokens.map((t) => fixes[t] || t).join(" ");
      const note = document.createElement("li");
      note.className = "search-empty search-didyoumean";
      note.setAttribute("role", "presentation");
      note.textContent = "showing matches for \"" + corrected + "\"";
      list.appendChild(note);
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
      // spec-v592: computed answer preview on the top-ranked row when the
      // typed numbers map onto the tile's slots.
      if (i === 0 && lastRanked) schedulePreview(tool, query, item);
    });
    setExpanded(true);
    setActive(0);
  }

  function loadAndRender() {
    ensureDiscovery();
    ensureSlots();
    ensurePreview();
    ensureTools().then(() => { initSearchData(); ensureAliases(); render(input.value); });
  }
  input.addEventListener("focus", loadAndRender);
  input.addEventListener("input", loadAndRender);

  // spec-v592 placeholder rotation: one example QUESTION per day of month
  // (deterministic, no timers, nothing for prefers-reduced-motion to
  // object to). The shipped index.html placeholder is the static
  // fallback; the .hero-label accessible name is unchanged.
  const QUESTION_PLACEHOLDERS = [
    "how many yards of concrete for a 10x12 slab",
    "what size wire for 50 amps at 120 ft",
    "voltage drop 120v 150 ft 20 amps",
    "how many squares on a roof",
    "what gauge wire for a 30 amp breaker",
    "cfm for a 12 inch round duct",
    "how much can the crane pick after deductions",
    "friction loss 200 ft of hose at 150 gpm",
  ];
  input.placeholder = QUESTION_PLACEHOLDERS[(new Date().getDate() - 1) % QUESTION_PLACEHOLDERS.length];

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
