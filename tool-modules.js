// tool-modules.js -- the tile-id -> renderer-module registry.
//
// Spec-v10 SS H.1 / H.2 named "TOOLS-extraction into its own lazy-loaded
// shard" as the preferred remediation for home-view JS growth, and every
// cap bump since has been recorded as an interim accommodation for it.
// This is that shard.
//
// Every tile costs this table one id string, so it grew with the catalog
// while app.js carried it inline -- 24.4 KB gzipped, 46% of the entire
// home-view JS sub-budget, for a table the home view never reads. Nothing
// here is needed until a reader opens a calculator, and app.js now imports
// it lazily from loadRenderer(), which was already async.
//
// The declare() call shape below is load-bearing: scripts/check-wiring.mjs,
// scripts/check-dist.mjs, scripts/build-renderer-map.mjs, and
// scripts/check-renderer-schema.mjs all parse these calls as TEXT rather
// than importing this module. Keep the literal form -- module path first,
// renderer export name second, then the array of tile ids -- and do not
// compute any of the three. (This comment deliberately does not spell the
// call out as an example: check-wiring's regex would read the example as a
// real declaration and fail on the imaginary module it names.)

export const TOOL_MODULES = (() => {
  const map = {};
  const declare = (path, exportName, ids) => { for (const id of ids) map[id] = { path, exportName }; };
  declare("./calc-electrical.js", "ELECTRICAL_RENDERERS", [
    "ohms-law", "wire-ampacity", "voltage-drop", "mwbc-voltage-drop", "egc-parallel-raceways", "conduit-fill", "box-fill",
    "awg-wire-geometry",
    "breaker-sizing", "motor-fla", "transformer-sizing", "three-phase",
    "copper-resistance", "egc-sizing",
    // v2
    "service-load", "generator-sizing",
    "voltage-imbalance", "gfci-afci-reference", "lighting-density",
    // v3
    "pulling-tension", "cable-reel-capacity", "wire-pulling-lubricant", "branch-circuit-wire-footage", "microinverter-branch-count", "welder-arc-circuit-conductor", "welder-resistance-circuit-conductor", "battery-inverter-dc-conductor", "pv-ac-output-circuit", "soil-resistivity-wenner", "cable-bend-radius", "pf-correction", "phase-balance",
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
    "max-circuit-length-for-vd",
    "open-delta-transformer",
    "conduit-nipple-60-fill",
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
    "rotary-phase-converter-sizing",
    "motor-acceleration-time",
    "motor-rms-hp",
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
    "dc-shunt-sizing",
    // v15
    "pv-interconnection-busbar", "off-grid-battery", "ev-charger-load",
    // spec-v182 electrician second-pass batch
    "pv-circuit-ampacity",
    // spec-v221..v223 PV system-design batch
    "pv-energy-yield", "pv-array-sizing", "pv-row-spacing", "pv-row-shade-angle", "pv-inverter-ratio", "pv-rail-clamp-takeoff", "pv-ballast-weight",
    "pv-cell-temperature-power", "pv-max-ambient-for-power", "pv-performance-ratio", "pv-string-fusing",
    // spec-v236..v238 grid-tied battery-economics batch
    "battery-tou-arbitrage", "battery-peak-shaving", "battery-c-rate",
    // spec-v488 EV charge time (AC Level 2)
    "ev-charge-time",
    "ev-range-per-hour",
    "battery-series-parallel",
    "bifacial-pv-gain",
    // spec-v489 EV charge cost at the meter
    "ev-charge-cost",
    // spec-v492 EV DC fast-charge time with CC-CV taper
    "ev-dcfc-time",
    // spec-v559
    "solar-egc-690-45",
    "shadow-length", "solar-altitude-angle", "solar-azimuth-angle",
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
    "rlc-reactance-resonance",
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
    "fiber-loss-budget", "fiber-max-length", "wireless-fspl", "fresnel-zone-clearance", "wireless-link-budget", "cable-tray-fill", "cctv-storage", "cctv-retention-days",
    "speaker-70v-line", "standby-battery-sizing", "standby-battery-runtime", "coax-rg-loss",
    "camera-lens-fov", "camera-max-distance-for-ppf", "ceiling-speaker-coverage", "ceiling-speaker-coverage-angle", "structured-cabling-channel", "lv-cable-pull-footage", "cable-support-jhook", "access-control-power-supply", "fire-alarm-nac-voltage-drop",
    "loop-signal-scaling", "dp-flow-signal-scaling",
    "rtd-resistance-to-temp",
    "pulse-flowmeter-k-factor",
    "loop-voltage-budget",
    "thermistor-beta-temp", "thermistor-steinhart-hart",
    "dp-level-hydrostatic",
    "pid-tuning-ziegler-nichols",
  ]);
  // spec-v29 pipe / raceway field-layout bench (deepens Groups B, A, G per
  // the spec-v28 §7 roadmap; lives in its own module because calc-electrical
  // and calc-plumbing are at their size caps).
  declare("./calc-pipefit.js", "PIPEFIT_RENDERERS", [
    "pipe-cold-spring", "raceway-expansion-fitting", "pipe-spacing-rack",
    // spec-v157..v162 steamfitting / pressure-piping / pipe-support bench.
    "flash-steam-pct", "steam-pipe-velocity", "steam-pipe-capacity", "steam-trap-sizing",
    "steam-boiler-blowdown",
    "boiler-horsepower",
    "radiator-edr-output",
    "pipe-pressure-rating", "asme-shell-thickness", "asme-head-thickness", "pipe-filled-support-load", "hanger-rod-sizing",
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
    "duct-transition-length",
    "duct-static-regain",
  ]);
  declare("./calc-plumbing.js", "PLUMBING_RENDERERS", [
    "pipe-sizing", "friction-loss", "pipe-volume", "pump-sizing",
    "static-pressure-piping", "slope",
    "pressure-conversion", "backflow",
    // v2
    "water-hammer-arrestor", "recirc-pump-head", "trap-arm",
    "pipe-expansion", "tankless-gpm",
    // v3
    "stormwater-rational", "stormwater-max-drainage-area", // spec-v1011 partial-flow depth of a circular gravity pipe
    "hydrostatic-test", "grease-trap", "grease-interceptor-flow-capacity",
    "stormwater-detention-volume",
    "glycol-mix", "expansion-tank", "backflow-loss", "hydronic-fill-pressure", // v7
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
    "channel-normal-depth", "trapezoidal-channel-flow", "fixture-clearance-check", "shower-compartment-check", "accessible-toilet-compartment", "vent-terminal-check", "aav-install-check", "grab-bar-layout", "cleanout-layout", "water-service-pressure-check", "hydraulic-jump", "specific-energy",
    "velocity-head", "flow-continuity", "bernoulli-head",
    "thrust-block-sizing", "thrust-block-max-pressure",
  ]);
  declare("./calc-plumbingtakeoff.js", "PLUMBINGTAKEOFF_RENDERERS", [
    // spec-v1028 cap-relief split out of calc-plumbing.js: the takeoff /
    // materials bench (what you buy and install).
    "solder-joint-quantity", "pipe-insulation-takeoff", "heat-trace-sizing", "pipe-purge-volume",
    "hydronic-system-volume", "pex-homerun-takeoff", "solar-thermal-collector",
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
    "leach-field-aggregate",
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
    "insulation-resistance-pi",
  ]);
  // spec-v73 cap-relief split: the two spec-v62 storm-drainage tiles relocated
  // out of calc-plumbing.js (which had reached 96.2% of cap -- the tightest
  // remaining calc module) into calc-drainage.js. They keep group: "B" (group
  // letter independent of module, the v42/v70/v71/v72 precedent).
  declare("./calc-drainage.js", "DRAINAGE_RENDERERS", [
    "roof-drain-sizing", "sump-basin-sizing",
    // spec-v426..v427 drainage
    "overflow-scupper-sizing", "scupper-width-for-flow", "sewage-force-main-velocity",
    "drywell-infiltration",
      // spec-v1036 cap-relief move from calc-plumbing.js (shared MANNING_ROUGHNESS)
    "manning-slope", "manning-pipe-capacity", "pipe-partial-flow-depth", "tr55-time-of-concentration", "composite-curve-number", "curve-number-runoff", "tr55-graphical-peak-discharge", "tr55-detention-storage", "culvert-inlet-control", "box-culvert-inlet-control", "culvert-outlet-control", "box-culvert-outlet-control", "culvert-headwater", "box-culvert-headwater",
  ]);
  // spec-v42 cap-relief split: the three fuel-gas tiles relocated out of
  // calc-plumbing.js (which had reached 98.9% of cap) into calc-gas.js. They
  // keep group: "B" (group letter independent of module, the v36/v39 precedent).
  declare("./calc-gas.js", "GAS_RENDERERS", [
    "gas-pipe-sizing", "gas-leak-rate", "gas-leak-hole-diameter", "gas-pipe-pressure-drop", "gas-pipe-max-flow",
    // spec-v111 high-altitude derate and NG/LP fuel conversion (same module).
    "gas-altitude-derate", "gas-fuel-conversion",
    "wobbe-index", "gas-appliance-connection",
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
    "insulation-thickness", "pipe-insulation-for-condensation", "economic-insulation-thickness", "evaporative-cooling", "evaporative-cooler-effectiveness", "indirect-evaporative-cooling",
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
    "round-to-rect-duct", "flat-oval-duct", "fixed-orifice-target-superheat",
    // v99 building-envelope insulation
    "assembly-r-value", "blown-insulation-coverage",
    // spec-v233..v235 heat-pump heating-mode batch
    "heat-pump-seasonal-energy", "dual-fuel-balance-point", "heat-pump-cold-capacity",
    // spec-v239..v241 compressed-air energy batch
    "air-leak-cost", "compressed-air-power", "compressed-air-pressure-drop", "air-pressure-setpoint-savings",
    // spec-v275..v277 ventilation-and-recovery batch
    "erv-sensible-recovery", "mua-tempering-load", "dcv-co2-ventilation",
    // spec-v305..v307 pump-and-fluid fundamentals batch
    "reynolds-number-pipe", "hydronic-gpm-deltat", "pump-specific-speed", "pump-suction-specific-speed",
    // spec-v329..v331 building-energy batch
    "building-ua", "degree-day-energy", "wall-condensation-gradient",
    "duct-heat-gain", "grille-face-velocity", "air-density-correction",
    "adpi-diffuser-selection", "vibration-isolation", "isolator-deflection",
    "moist-air-enthalpy", "drybulb-from-enthalpy", "cooling-coil-total-load", "coil-bypass-factor",
    "fan-affinity-laws", "fan-sheave-for-target-cfm", "colebrook-friction-factor", "manual-d-friction-rate",
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
    // trade expansion v1413-v1419
    "txv-capacity-check",
    "defrost-cycle-sizing",
    "refrigerant-leak-rate",
    "refrigerant-recovery-time",
    "head-pressure-control",
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
    "compressor-volumetric-efficiency",
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
    "window-solar-heat-gain",
    // spec-v1012 overhang shade line / direct-beam sunlit fraction
    "window-overhang-shade",
    "internal-heat-gains", "envelope-conduction-load",
    // spec-v409..v410 HVAC duct-design
    "coil-face-velocity", "coil-face-area", "vav-box-airflow",
    // spec-v587 anti-short-cycle buffer tank
    "hydronic-buffer-tank",
    "outdoor-reset-ratio",
    "hydronic-injection-mixing",
    "valve-authority",
    // spec-v623 buffer tank with distribution-loop credit
    "buffer-tank-loop-credit",
  ]);
  // spec-v74 cap-relief split: the two spec-v23 velocity tiles relocated out of
  // calc-hvac.js (which had reached 95.9% of cap -- the tightest remaining calc
  // module) into calc-velocity.js. They keep group: "C" (group letter
  // independent of module, the v42/v70/v71/v72/v73 precedent).
  declare("./calc-velocity.js", "VELOCITY_RENDERERS", [
    "duct-velocity-pressure", "refrigerant-velocity", "refrigerant-line-size", "pitot-traverse-cfm", "pitot-traverse-average", "dp-flow-meter", "gas-dp-flow-meter", "orifice-pressure-loss",
  ]);
  declare("./calc-restoration.js", "RESTORATION_RENDERERS", [
    // trade expansion v1445-v1448
    "water-extraction-rate",
    "sewage-loss-disposal",
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
    // trade expansion v1425-v1434
    "elevator-handling-capacity",
    "glass-thickness-wind",
    "awning-canopy-load",
    "garage-door-torsion-spring",
    "window-film-shgc",
    "igu-u-factor",
    "escalator-capacity",
    "stairs", "roof-pitch", "rafter", "square-footage", "board-footage",
    "concrete", "shotcrete-rebound-quantity", "rebar", "lumber-spans", "fastener-pullout",
    "beam-loading", "material-quantity",
    // v2
    "stair-stringer", "joist-deflection", "footing-area", "tile-count",
    "paint-coverage", "excavation", "masonry-count", "wind-pressure", "wind-speed-from-velocity-pressure",
    "snow-load", "anchor-embedment",
    // v3
    "corner-bead-takeoff", "drywall", "roofing-squares", "asphalt-tonnage", "asphalt-paving-speed", "asphalt-tack-coat-quantity", "chip-seal-mcleod", "aggregate", "stockpile-volume", "windrow-stockpile-volume", "flat-top-stockpile-volume", "mortar-mix",
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
    "header-sizing", "deck-beam-post", "stud-notch-bore-limit", "joist-notch-bore-limit", "joist-cantilever-check",
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
    "guard-handrail-check", "guard-post-load", "egress-window-check", "landing-check", "door-maneuvering-clearance", "dryer-duct-length", "smoke-alarm-placement", "co-alarm-placement", "egress-window-well", "scaffold-guardrail-check", "excavation-protection-trigger", "scaffold-platform-check", "temporary-stairway-check", "flammable-cabinet-storage", "material-stacking-limits",
    // spec-v481 stair geometry code check (IBC 1011 / IRC R311).
    "stair-code-check",
    // spec-v212..v214 masonry grout / coursing and wallcovering takeoffs.
    "cmu-grout-volume", "annular-grout-volume", "masonry-coursing", "wallpaper-rolls",
    // spec-v215..v217 roofing material-takeoff batch.
    "ice-barrier-coverage", "metal-roof-panels", "ridge-cap-fasteners",
    // spec-v224..v226 ASCE 7 structural design-loads batch.
    "rain-load-ponding", "asce7-load-combinations", "seismic-approximate-period", "seismic-base-shear",
    // spec-v477 ELF vertical distribution (the v226/v383 follow-on).
    "seismic-vertical-distribution",
    // spec-v480 ELF overturning moment (the v477 §12.8.5 follow-on).
    "seismic-overturning-moment", "seismic-overturning-stability",
    // spec-v242..v244 IBC/IPC occupancy trio.
    "occupant-load", "egress-capacity", "plumbing-fixture-count",
    // spec-v245..v247 cast-in-place placing-and-curing trio.
    "shore-post-load", "scaffold-mudsill-bearing", "scaffold-leg-load", "scaffold-takeoff", "asphalt-spread-rate", "pavement-milling-production", "striping-paint-quantity", "concrete-vibrator-spacing", "formwork-tie-load", "formwork-member-spacing", "mass-concrete-temp-rise", "concrete-washout-volume", "shingle-nails", "duct-metal-weight", "duct-bank-concrete", "duct-wrap-takeoff", "duct-hanger-load", "roof-underlayment-rolls", "membrane-roof-takeoff", "membrane-fastener-takeoff", "roof-ballast-weight", "tapered-roof-insulation", "sheathing-takeoff", "construction-adhesive-tubes", "sill-plate-anchor-count", "metal-stud-takeoff", "suspended-ceiling-grid", "masonry-control-joint-layout", "dumpster-count", "sealant-joint-yield", "self-leveler-bags", "carpet-takeoff", "carpet-seam-layout", "sfrm-takeoff", "spray-foam-board-feet", "metal-deck-takeoff", "rebar-tie-wire", "anchor-epoxy-volume", "baseplate-grout-volume", "baluster-picket-count", "traffic-taper-length", "advance-warning-sign-spacing", "siding-takeoff", "siding-course-layout", "stucco-coverage", "vapor-barrier-rolls", "concrete-sawcut-footage", "foundation-waterproofing-takeoff", "drainage-board-takeoff", "joist-hanger-count", "drywall-fastener-takeoff", "glass-vacuum-lift", "polymeric-sand-bags", "rigid-foam-board-count", "roof-insulation-fasteners", "housewrap-rolls", "chain-link-fence-takeoff", "curb-gutter-volume", "rebar-chair-count", "concrete-evaporation-rate", "concrete-strength-gain",
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
    "wood-beam-bending", "wood-beam-shear", "wood-beam-compression-notch", "wood-bolt-connection",
    // spec-v290..v292 NDS wood-member depth batch.
    "wood-bearing-perpendicular", "wood-tension-member", "wood-combined-bending-axial",
    // spec-v296..v298 ASCE 7 wind-and-snow load depth batch.
    "wind-cc-pressure", "snow-drift-load", "wind-mwfrs-pressure", "wind-gust-effect-factor", "wind-velocity-pressure-exposure-coefficient",
    // spec-v468..v470 ASCE 7 snow provisions batch.
    "rain-on-snow-surcharge", "sliding-snow-load", "snow-guard-layout", "minimum-roof-snow",
    // spec-v474 ADA ramp layout
    "ada-ramp-slope",
    "accessible-parking-count",
    "sign-character-height",
    "reach-range",
    "protruding-object-check",
    "accessible-route-width",
    "door-clear-width",
    "floor-level-change",
    "turning-clear-floor-space",
    "handrail-geometry",
    "knee-toe-clearance",
    "flood-opening-area",
    "ada-stair-check",
    "tactile-sign-mounting",
    "drinking-fountain-check",
    "accessible-shower-check",
    "substantial-improvement-check",
    "accessible-parking-geometry",
    "water-closet-location",
    "lavatory-tub-clearance",
    "ramp-detail-check",
    // trade expansion v1411
    "curtain-wall-mullion-deflection",
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
    // trade expansion v1445-v1448
    "spray-tip-selection",
    "texture-material-takeoff",
    // v95 interior finish
    "thinset-coverage", "flooring-takeoff",
    // v97 hardscape
    "paver-patio", "retaining-wall-block", "srw-geogrid-spacing",
    // v98 roofing trim-out
    "attic-ventilation", "crawl-space-ventilation", "soffit-ridge-vent-count", "gutter-downspout", "gutter-downspout-takeoff", "deck-board-takeoff", "rough-opening-size", "closet-shelf-takeoff", "countertop-overhang-support", "cabinet-linear-feet", "drip-edge-takeoff", "valley-flashing-takeoff", "glass-weight",
    "cement-board-takeoff",
    "step-flashing-count",
  ]);
  // spec-v101 new electrician design/layout bench; relieves the standing
  // calc-electrical.js cap watch. Both tiles keep group "A".
  declare("./calc-elecdesign.js", "ELECDESIGN_RENDERERS", [
    // trade expansion v1420-v1422
    "grounding-grid-conductor",
    "selective-coordination-screen",
    "fuse-let-through",
    "pull-box-sizing", "lumen-method",
    "room-cavity-ratio",
    "luminaire-spacing-mh-ratio",
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
    "condensate-drain", "condensate-overflow-pan", "condensate-trap-depth", "recovery-cylinder",
    // trade expansion v1413-v1419
    "damper-authority",
    "chilled-water-delta-t", "outside-air-percent-temps",
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
    "oil-burner-firing-rate",
    "flue-gas-dew-point",
    "condensing-flue-condensate",
  ]);
  // spec-v103 new pipe/well disinfection bench; relieves the standing
  // calc-plumbing.js cap watch. Both tiles keep group "B".
  declare("./calc-disinfect.js", "DISINFECT_RENDERERS", [
    "main-disinfection-chlorine", "well-shock-chlorination",
  ]);
  // spec-v1539..v1545: the railroad track and equipment bench, a trade the
  // catalog served with zero tiles. All seven keep group "E".
  declare("./calc-rail.js", "RAIL_RENDERERS", [
    "track-superelevation", "degree-of-curve", "cwr-neutral-temperature",
    "rail-wear-condemning-limit", "track-warp-fra-class",
    "ballast-section-volume", "turnout-frog-lead",
  ]);
  // spec-v1648..v1658: the elevator and escalator equipment bench. The catalog
  // had two elevator tiles, both about traffic handling. All eleven keep
  // group "E".
  declare("./calc-elevator.js", "ELEVATOR_RENDERERS", [
    "traction-roping-ratio", "counterweight-balance", "rope-safety-factor",
    "buffer-stroke-speed", "hoistway-venting", "machine-room-heat",
    "hydraulic-jack-pressure", "step-chain-tension", "door-closing-energy",
    "governor-tripping-speed", "guide-rail-bracket-span",
  ]);
  // spec-v1571..v1581: the door hardware and locksmithing bench. Nine keep
  // group "E"; electric-lock-power-budget and maglock-holding-leverage keep
  // group "A".
  declare("./calc-doorhardware.js", "DOORHARDWARE_RENDERERS", [
    "door-closer-opening-force", "lock-backset-strike-layout", "panic-hardware-force",
    "electric-lock-power-budget", "maglock-holding-leverage",
    "master-key-bitting-capacity", "key-cut-macs-check", "door-undercut-transfer-air",
    "fire-door-clearance", "gate-operator-duty-cycle", "revolving-door-throughput",
  ]);
  // spec-v80 cap-relief split: the spec-v25 site-civil / roadway-geometry
  // quartet moved out of calc-construction.js (it sat at 95.0% of its size
  // cap, the tightest remaining calculator module) into its own module. All
  // four tiles KEEP group "E" (the module is independent of the group letter,
  // per the v28/v30/v36/v39/v70..v79 precedent); no tile or output changed.
  declare("./calc-civil.js", "CIVIL_RENDERERS", [
    "horizontal-curve", "spiral-curve", "compound-curve", "reverse-curve", "vertical-curve", "earthwork-end-area", "slope-stake-cut-fill",
    "curve-deflection-stakeout",
    "superelevation", "superelevation-safe-curve-speed", "vertical-curve-sight-distance", "horizontal-sightline-offset",
    "sag-vertical-curve", "sag-vertical-curve-comfort",
  ]);
  // spec-v254..v256 AISC 360 steel-member trio + spec-v266..v268 steel-connection
  // trio: a new lazy Group E cluster (the steel-member companion to the wood-framing
  // and steel-weld tiles). All six KEEP group "E" (module independent of group letter).
  declare("./calc-steel.js", "STEEL_RENDERERS", [
    "steel-beam-flexure", "required-section-modulus", "shear-flow-connector-spacing", "steel-beam-shear", "steel-column-capacity",
    "bolt-group-eccentric", "bolt-shear-bearing", "column-base-plate",
    // spec-v281..v283 members-and-connections depth batch
    "steel-beam-ltb", "steel-cb", "steel-block-shear", "steel-tension-member", "staggered-net-width",
    // spec-v293..v295 connection/detailing depth batch
    "steel-web-local-strength", "steel-bolt-slip-critical", "slip-critical-with-tension", "steel-fillet-weld-size",
    // spec-v314..v316 beam-column-and-connection depth batch
    "steel-h1-interaction", "steel-b1-amplifier", "steel-b2-amplifier", "steel-effective-length-k", "steel-column-stiffness-ratio-g", "steel-tau-b-stiffness-reduction", "steel-bolt-tension-shear",
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
    "rc-beam-flexure", "rc-tbeam-flexure", "rc-beam-shear", "rc-development-length",
    "concrete-torsion-threshold",
    // spec-v284..v286 member depth batch
    "rc-column-axial", "rc-column-steel-for-load", "rc-punching-shear", "rc-hook-development",
    // spec-v1008 one-way shear without stirrups (ACI 318-19 22.5.5.1 detailed method)
    "rc-one-way-shear",
    // spec-v1009 minimum stirrups + the 22.5.1.2 section-size ceiling
    "rc-min-shear-reinforcement",
    // spec-v299..v301 depth-2 batch
    "rc-slab-min-thickness", "rc-slab-max-span-for-thickness", "rc-doubly-reinforced", "rc-shear-friction",
    "concrete-elastic-modulus", "concrete-strength-from-modulus", "concrete-modulus-of-rupture", "concrete-strength-from-rupture", "concrete-cracking-moment", "concrete-depth-for-cracking-moment", "concrete-shrinkage-temperature-steel",
    "t-beam-effective-flange-width", "concrete-beam-min-flexural-steel", "concrete-crack-control-spacing",
    // spec-v490 concrete bearing strength (ACI 318-19 §22.8)
    "concrete-bearing-strength",
    // spec-v491 rebar compression development length (ACI 318-19 §25.4.9)
    "rc-compression-dev-length",
    // spec-v497 long-term deflection multiplier (ACI 318-19 §24.2.4.1)
    "concrete-effective-inertia", "concrete-longterm-defl", "concrete-immediate-deflection", "concrete-cracked-inertia-doubly", "concrete-cracked-inertia-tee",
    // spec-v548
    "concrete-anchor-breakout",
    "concrete-anchor-pullout",
    // spec-v617
    "concrete-anchor-shear-breakout",
    "concrete-anchor-pryout",
    "concrete-anchor-steel-strength",
    "concrete-anchor-interaction",
    "concrete-anchor-blowout",
    // spec-v552
    "rc-slender-column-magnify",
    // spec-v556
    "concrete-corbel-bracket",
    // spec-v793 fresh (batch) concrete temperature (ACI 305.1)
    "fresh-concrete-temp",
    // spec-v918 curing compound coverage (ASTM C309)
    "curing-compound-coverage",
    "concrete-premix-bags",
    "concrete-isolation-joint",
    "concrete-stair-volume",
    "slab-dowel-schedule",
  ]);
  // spec-v260..v262 geotechnical foundation-and-earth-retaining trio: a new
  // lazy Group E cluster, where the steel / RC member load path meets the
  // ground. All three KEEP group "E" (module independent of group letter).
  declare("./calc-geotech.js", "GEOTECH_RENDERERS", [
    "soil-bearing-capacity", "lateral-earth-pressure", "at-rest-earth-pressure", "submerged-earth-pressure", "sloped-backfill-earth-pressure", "coulomb-earth-pressure", "seismic-earth-pressure", "cohesive-earth-pressure", "pole-embedment-depth", "retaining-wall-stability",
    // spec-v287..v289 foundation depth batch
    "soil-settlement-elastic", "elastic-settlement-allowable-pressure", "pile-axial-capacity", "pile-length-for-capacity", "slope-stability-infinite", "slope-failure-depth-for-fs", "slope-stability-seepage",
    "frost-depth-berggren",
    // spec-v308..v310 geotechnical depth-2 batch
    "soil-consolidation-settlement", "overconsolidated-settlement", "secondary-compression-settlement", "settlement-limit-load", "footing-eccentric-pressure", "boussinesq-surcharge-wall",
    // spec-v414..v416 settlement/foundation trio
    "consolidation-time-rate", "consolidation-degree", "coefficient-of-consolidation", "spt-bearing-capacity", "spt-required-n60", "liquefaction-screening",
    // spec-v1013 Terzaghi total/effective vertical stress profile
    "soil-vertical-effective-stress",
    // spec-v498 pile group efficiency (Converse-Labarre)
    "pile-group-efficiency", "pile-group-spacing-for-efficiency",
  ]);
  // spec-v269..v271 TMS 402-16 reinforced-masonry member trio: a new lazy
  // Group E cluster, the masonry counterpart to the steel / RC member benches;
  // masonry's first structural (not takeoff) tiles. All three KEEP group "E".
  declare("./calc-masonry.js", "MASONRY_RENDERERS", [
    "cmu-wall-flexure", "cmu-shear-wall", "cmu-wall-axial",
    "masonry-wall-weight", "brick-veneer-anchor-spacing", "brick-veneer-weep-count", "masonry-joint-reinforcement", "masonry-lintel-loading", "masonry-lintel-bearing", "fireplace-flue-area", "masonry-limited-access-zone",
    "masonry-anchor-bolt", "masonry-anchor-embedment", "masonry-anchor-shear", "masonry-prism-fm",
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
    "relative-compaction",
    // spec-v1014 relative density (density index) for cohesionless soil
    "soil-relative-density",
    "water-for-compaction", "soil-phase-relations", "soil-permeability", "atterberg-indices", "soil-activity", "fineness-modulus", "fine-aggregate-grading", "soil-gradation-coefficients",
  ]);
  declare("./calc-fire.js", "FIRE_RENDERERS", [
    "fire-friction", "pdp", "hydrant-flow", "required-fire-flow",
    // trade expansion v1386-v1393
    "ppv-fan-sizing",
    "hose-lay-section-count",
    "fdc-supply-check",
    "radiant-exposure-separation",
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
    "foam-eductor-limit", "extinguisher-coverage",
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
    "fall-arrest-clearance", "fall-arrest-anchorage",
  ]);
  // spec-v248..v250 fire-sprinkler system-design trio: a new lazy Group F
  // cluster split off beside calc-fire.js exactly as calc-rescue.js was (the
  // fire module sits near its size cap). All three KEEP group "F" (module
  // independent of group letter, per the v28/v30/v36/v39/v70..v82 precedent).
  declare("./calc-firesprinkler.js", "FIRESPRINKLER_RENDERERS", [
    "fire-pump-curve", "sprinkler-system-demand", "sprinkler-protection-area-for-supply", "sprinkler-head-layout", "smoke-detector-spacing-count", "drypipe-air-compressor", "jockey-pump-sizing",
    "sprinkler-pressure-demand",
    // trade expansion v1386-v1393
    "stairwell-pressurization",
    "fire-tank-sizing",
    "sprinkler-obstruction",
    "hydrant-spacing-count",
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
    "trench-slope", "niosh-lifting", "heat-stress", "wind-chill", "wind-chill-wind-speed", "ladder-angle", "extension-ladder-overlap", "portable-ladder-setup", "swing-fall-geometry",
    "pulley-ma-gen", "ramp-slope", "rainwater-yield", "rainwater-catchment-area", "timesheet", "vehicle-load",
    // v7
    "fall-protection-clearance",
    // v9
    "noise-dose",
    "hearing-protector-nrr",
    "silica-table-1",
    "lifeline-tension", "radiant-heat-exchange",
    // v15
    "pump-tdh", "hydraulic-cylinder", "vbelt-drive", "belt-center-distance", "belt-hp-transmitted", "gear-cascade",
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
    "bend-springback",
    "weld-dilution", "weld-deposit-composition", "weld-passes-arc-time", "weld-travel-speed",
    // spec-v802 coil / roll stock length (group E)
    "coil-length",
    // spec-v909 bar / tube stock cut list yield (group E)
    "barstock-cutlist", "bar-nesting", "sheet-metal-gauge",
    // trade expansion v1402-v1412
    "tube-bend-wall-thinning",
    "weld-cooling-rate-t85",
    "interpass-temperature-control",
    // spec-v912 dished tank / vessel head volume (group E)
    "vessel-head-volume",
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
    "circular-arc", "circular-arc-rise-from-radius", "circular-segment-area", "triangle-sas", "triangle-sss", "triangle-asa",
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
    // trade expansion v1432
    "dust-collection-duct",
    // trade expansion v1435-v1444
    "pneumatic-cylinder-scfm",
    "bucket-elevator-capacity",
    "cyclone-separator-sizing",
    "gas-strut-force",
    "spray-booth-airflow",
    "powder-coating-coverage",
    "plating-tank-current",
    "heat-treat-soak-time",
    "quench-severity",
    "belt-conveyor-tension-power",
    // Group K (machinist)
    "machining-time", "material-removal-rate", "turning-surface-finish", "feed-for-surface-finish",
    "taper-calc", "taper-diameter", "dovetail-over-pins", "tailstock-setover", "dividing-head",
    // Group G (cross-trade)
    "thread-measure-wire", "thread-pitch-dia-from-wires", "punch-force", "punch-capacity",
    // Group E (welding / sheet-metal)
    "press-brake-tonnage", "press-brake-max-thickness", "weld-duty-cycle", "carbon-equivalent",
    // spec-v41 batch 2: Group K + Group G
    "tap-drill-size", "rolled-blank",
    // spec-v54: Group E carpentry compound miter
    "compound-miter",
    // spec-v399..v400 fabrication shop-math
    "tolerance-stack-rss", "cone-flat-pattern", "frustum-volume", "regular-polygon", "ellipse-area-perimeter", "spherical-cap-volume", "parabolic-segment", "pyramid-frustum-volume", "torus-volume", "ellipsoid-volume", "annulus-area", "circular-sector", "paraboloid-volume", "cylindrical-wedge-volume", "barrel-volume", "tank-volume-dished-heads", "spherical-zone-volume", "oval-tank-volume", "cone-bottom-tank-volume", "tapered-tank-volume",
    // trade expansion v1406-v1409
    "rotor-balance-grade",
    "bearing-regrease",
    "plasma-cut-speed",
    "hydraulic-reservoir-cooler",
    // spec-v511 interference press-fit pressure and holding force
    "press-fit-pressure", "press-fit-interference-for-force",
    // spec-v512 roller chain length in pitches (ANSI B29.1)
    "roller-chain-length",
    // spec-v801 sprocket pitch diameter (ANSI B29.1)
    "sprocket-pitch-diameter", "cylinder-storage-separation",
  ]);
  // v4 Group J: Trucking and Logistics.
  declare("./calc-trucking.js", "TRUCKING_RENDERERS", [
    "dim-weight", "freight-density", "pallet-loadout",
    "hos-math", "bridge-formula", "bridge-formula-min-spacing", "reefer-burn", "incoterm-decoder",
    // v9
    "stopping-sight-distance", "ssd-design-speed", "truck-off-tracking", "truck-swept-path-width",
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
    // spec-v913 static rollover threshold
    "static-rollover-threshold", "truck-startability", "hydroplaning-speed",
    // trade expansion v1377-v1385
    "tiedown-count",
    "kingpin-to-axle",
    "safe-descent-speed",
    "air-brake-pushrod-stroke",
    "oversize-permit-screen",
    "hazmat-placard-threshold",
    "idle-fuel-cost",
    "flatbed-tarp-size",
    "deck-point-load-dunnage",
  ]);
  // v4 Group K: Mechanic - Auto, Marine, Aviation.
  declare("./calc-mechanic.js", "MECHANIC_RENDERERS", [
    // trade expansion v1433
    "carburetor-altitude-jetting",
    "prop-slip", "displacement-cr", "dynamic-compression-ratio", "chamber-cc-for-cr", "bolt-stretch",
    "driveshaft-crit", "driveshaft-max-length", "fuel-range", "tire-gearing", "brake-pad-life",
    "ujoint-operating-angle",
    "tire-contact-patch",
    // v23
    "valve-flow-coefficient", "screw-conveyor", "screw-conveyor-rpm",
    "helical-spring-rate", "spring-natural-frequency",
    // spec-v1010 Wahl wire stress + solid height + buckling
    "spring-wire-stress",
    "gear-tooth-bending-stress", "gear-dynamic-tooth-stress", "gear-contact-stress", "aerodynamic-drag-force", "vehicle-road-load-power", "planetary-gear-ratio", "band-brake-torque", "centrifugal-force", "torsion-spring-rate", "universal-joint-speed", "slider-crank-piston-position", "scotch-yoke-motion", "toggle-mechanism-force", "inclined-plane-force", "wedge-force", "impact-load-factor", "hydraulic-accumulator-volume", "projectile-range", "free-fall-drop", "terminal-velocity",

    // v20
    "hp-from-torque", "volumetric-efficiency", "gear-mph-rpm",
    // v100 auto-body 2K paint mix
    "paint-mix-ratio",
    // spec-v396..v398 fluid-power / cooling trio
    "hydraulic-pump-horsepower", "hydraulic-drive-flow-limit", "hydraulic-motor-torque-speed", "hydraulic-pump-flow", "hydraulic-line-velocity", "injector-flow-at-pressure", "belt-deflection-tension", "cooling-system-flow",
    // spec-v462..v464 marine/engine/electrical mechanic trio
    "prop-pitch-selection", "engine-fuel-burn-gph", "alternator-charging-load",
    // spec-v485 torque wrench extension / crowfoot correction
    "torque-adapter-correction",
    // spec-v323..v325 engine-build performance batch
    "injector-size", "injector-max-hp", "mean-piston-speed", "max-rpm-from-piston-speed", "trap-speed-horsepower", "et-horsepower",
    // spec-v500 density altitude and pressure altitude
    "density-altitude", "true-airspeed",
    // spec-v501 crosswind and headwind component
    "crosswind-component",
    // spec-v502 displacement hull speed and speed/length ratio
    "hull-speed", "waterline-for-hull-speed",
    "hull-displacement",
    "sailboat-performance-ratios",
    "flywheel-energy",
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
    "cutting-speed-rpm", "thread-single-depth", "acme-thread-depth", "stub-acme-thread-depth", "cutting-diameter-for-rpm", "drill-point-depth", "drill-point-angle-from-length",
    // spec-v910 knurling blank diameter for clean tracking
    "knurl-blank-diameter",
    // spec-v911 grinding wheel surface speed and max safe RPM
    "grinding-wheel-rpm",
    // spec-v917 reaming prebore (drill) allowance
    "reaming-drill-allowance",
    // trade expansion v1402-v1412
    "drill-feed-thrust",
    "band-saw-blade-pitch",
    "counterbore-depth",
    "taylor-tool-life",
    // v100 cutting-fluid concentration
    "cutting-fluid-concentration",
    // v135 cutting power and spindle torque from MRR
    "spindle-power-torque", "spindle-max-mrr",
    // spec-v317..v319 machining depth batch
    "radial-chip-thinning", "boring-bar-deflection", "boring-bar-max-overhang", "ballnose-scallop-height", "ballnose-feed-cusp",
    // spec-v401 spur gear tooth geometry
    "spur-gear-geometry", "worm-gear-geometry", "gear-undercut-backlash", "gear-identification", "gear-chordal-thickness",
    // spec-v504 rolling-bearing L10 rating life (ISO 281)
    "bearing-l10-life", "bearing-max-load", "bearing-equivalent-load", "fatigue-safety-factor", "endurance-limit-marin", "power-screw-torque", "disk-clutch-torque", "euler-johnson-column", "thick-wall-cylinder-stress", "rack-and-pinion", "plain-bearing-pressure-pv", "flange-coupling-torque",
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
    "irrigation-requirement", "mad-irrigation-trigger", "fertigation-injection-rate", "cattle-heart-girth-weight", "corn-yield-estimate", "dressing-percentage", "cattle-stocking-rate", "grain-bin-capacity", "grain-bin-height-for-capacity", "bunker-silo-capacity", "feed-conversion-ratio",
    "grain-shrink-moisture", "livestock-dry-matter-intake", "manure-application-rate",
    "npk-blend", "tank-mix",
    // v23
    "pesticide-rei-phi",
  
    // v20
    "growing-degree-days", "pearson-square-ration", "livestock-water-requirement", "reference-et0",
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
    // spec-v914 tractor ballast for a target weight-to-power ratio
    "tractor-ballast",
    "anhydrous-ammonia-rate",
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
    "tree-open-cavity", "tree-appraisal-ctla",
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
    "ro-recovery-concentration",
    "iron-manganese-chlorine-dose",
    "cistern-storage-days",
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
    "chlorine-demand", "dechlorination-dose", "float-method-flow", "fluoride-feed-dose", "two-source-blend", "uv-dose", "uv-required-exposure",
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
    "weir-flow", "cipolletti-weir", "sluice-gate-flow", "broad-crested-weir", "weir-head-from-flow", "langelier-index", "chemical-feed-pump",
    "clarifier-surface-loading", "clarifier-area-for-loading", "bod-tss-loading-removal", "design-flow-peaking", "tds-from-conductivity", "conductivity-from-tds",
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
    "pool-volume", "pool-tile-coping-perimeter", "pool-interior-finish-volume",
    "oil-water-separator-sizing", "particle-settling-velocity",
    "pool-alkalinity-adjust", "pool-cya-dose", "pool-salt-dose",
    "pool-calcium-hardness-dose",
    "pool-chlorine-dose", "pool-heater-btu", "pool-heater-size", "breakpoint-chlorination",
  ]);
  // v4 Group N: Stage and Live Production.
  declare("./calc-stage.js", "STAGE_RENDERERS", [
    "truss-capacity", "time-alignment", "dmx-planner",
    "neutral-imbalance", "spl-distance", "spl-distance-for-level", "acoustic-gain-pag-nag", "rigging-check",
    // trade expansion v1364-v1376
    "line-array-splay",
    "delay-tower-alignment",
    "cardioid-sub-array",
    "driver-spacing-lobing",
    "wireless-intermod",
    "rf-antenna-cable-loss",
    "chain-hoist-lift-time",
    "gobo-image-size",
    "mired-gel-shift",
    "haze-machine-sizing",
    "stage-deck-live-load",
    "video-wall-data-rate",
    "outdoor-stage-wind",
    // v9
    "spl-atmospheric",
  
    // v20
    "power-distro",
    // v24 audio electronics
    "speaker-impedance", "decibel-converter", "amp-power-spl", "lighting-beam", "lighting-throw-for-pool", "winch-fleet-angle",
    // v92 LED video wall + projection
    "led-video-wall", "projector-brightness", "projector-max-screen-size",
    // v120 room acoustics
    "room-acoustics", "eyring-reverberation", "partition-mass-law-tl", "speed-of-sound-air", "room-absorption-target",
    // spec-v542
    "counterweight-arbor-load",
    // spec-v543
    "led-tape-run", "led-tape-max-run",
  ]);
  // v4 Group O: Kitchen and Food Service.
  declare("./calc-kitchen.js", "KITCHEN_RENDERERS", [
    "recipe-scale", "yield-ep", "as-purchased-quantity", "cooling-curve",
    // trade expansion v1350-v1363
    "ice-machine-sizing",
    "warewasher-hot-water",
    "freezing-time-plank",
    "thaw-time",
    "fryer-oil-turnover",
    "keg-yield",
    "beverage-co2-duration",
    "dough-ball-scaling",
    "fermentation-time-q10",
    "covers-per-labor-hour",
    "par-level-order",
    "tphc-window",
    "steam-kettle-heatup",
    "hot-holding-energy",
    "plate-cost", "pan-conversion",
    // v9
    "sous-vide-pasteurization",
  
    // v20
    "brine-cure", "bakers-percentage", "dough-water-temperature",
    // v90 food-service cost control
    "food-cost-percentage", "prime-cost", "pour-cost",
    // spec-v537
    "menu-engineering",
    // spec-v538
    "kitchen-sanitizer-ppm",
    // spec-v539
    "drink-abv-dilution",
    "abv-from-gravity",
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
    // trade expansion v1394-v1401
    "map-scale-conversion",
    "contour-slope",
    "helicopter-lz-sizing",
    "litter-carry-team",
  ]);
  // spec-v71 cap-relief split: the two v25 surveying coordinate/traverse
  // tiles moved out of calc-field.js (it sat at 96.8% of its size cap) into
  // their own module. Both tiles KEEP group "P" (the module is independent
  // of the group letter, per the v28/v30/v36/v39/v70 precedent); no tile or
  // output changed.
  declare("./calc-survey.js", "SURVEY_RENDERERS", [
    "area-by-coordinates", "traverse-closure",
    // trade expansion v1394-v1401
    "three-point-resection",
    "slope-staking",
    "grade-rod-cut-fill",
    // spec-v311..v313 field-surveying depth batch
    "differential-leveling", "level-loop-adjustment", "stadia-distance", "taping-corrections", "taping-normal-tension", "azimuth-bearing-conversion",
    "cogo-forward-point", "distance-distance-intersection", "edm-slope-reduction", "leveling-curvature-refraction", "grid-to-ground", "cogo-inverse-locate",
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
    "declining-balance-depreciation", "sum-of-years-digits-depreciation", "future-value-of-annuity", "effective-annual-rate", "markup-vs-margin", "employer-payroll-tax",
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
    "molarity-dilution", "serial-dilution", "molecular-weight", "mass-moles", "ideal-gas-law", "van-der-waals", "arrhenius-equation", "clausius-clapeyron", "osmolarity", "nernst-equation",
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
    "final-grade-needed", "category-weighted-grade", "two-sample-t-test", "paired-t-test", "one-sample-t-test", "one-way-anova", "chi-square-independence", "spearman-rank-correlation", "two-proportion-z-test",
  ]);
  // Group Z (Rigging and Heavy Lift): the lift-planning core (spec-v65), a
  // new module behind RIGGING_RENDERERS. All seven carry GOVERNANCE.rigging.
  declare("./calc-rigging.js", "RIGGING_RENDERERS", [
    "cg-load-share", "crane-net-capacity", "crane-ground-bearing", "crane-power-line-clearance",
    "sling-d-d-efficiency", "wind-on-load", "max-wind-speed-for-lift", "tagline-force", "tandem-lift-share",
    // v66 hardware and below-the-hook
    "shackle-eyebolt-wll", "spreader-beam", "spreader-beam-min-height", "forklift-capacity-derate",
    "roller-jack-force", "chain-lever-hoist", "block-redirect-load", "block-redirect-max-angle", "reeving-parts-of-line", "guy-wire-tension",
    // spec-v117 multi-leg sling load per leg + wire-rope strength estimate.
    "multi-leg-sling", "wire-rope-strength", "wire-rope-diameter-for-wll", "wire-rope-stretch",
    // spec-v484 spanned cable sag and tension
    "spanline-sag-tension", "spanline-sag-for-tension",
    // spec-v544
    "bridle-leg-tension",
    // spec-v545
    "winch-drum-line-pull",
    // spec-v550
    "crane-outrigger-reaction",
    "crane-load-radius-boom",
    // spec-v554
    "lifting-lug-design",
    // spec-v615
    "three-point-bridle",
    // spec-v616
    "beam-clamp-side-pull",
    "wire-rope-clips",
  ]);
  return map;
})();
