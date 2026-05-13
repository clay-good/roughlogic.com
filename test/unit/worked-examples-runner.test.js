// v10 Phase C migration runner (spec-v10.md §5.1).
//
// Reads test/fixtures/worked-examples.json and, for each fixture whose
// tile_id has a registered compute function in COMPUTE_MAP below,
// dynamically imports the calc module, calls compute(inputs), and
// asserts every declared output matches its `value` within `tolerance`
// (abs or pct). This is the contract the spec promised: a tile cannot
// regress its publisher-known answers without CI failing.
//
// Fixtures whose tile_id is not yet in COMPUTE_MAP are skipped (the
// registry can grow ahead of the runner). The check-worked-examples
// linter still validates the schema for every row.
//
// Adding a new tile to the runner: append to COMPUTE_MAP a row with
// the module path and the named export of the compute function. No
// other change is needed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = resolve(ROOT, "test", "fixtures", "worked-examples.json");

// Tile id -> { module: relative path, fn: exported compute name }.
// Append-only as more compute functions are wired into the runner.
const COMPUTE_MAP = {
  "ohms-law": { module: "../../calc-electrical.js", fn: "computeOhmsLaw" },
  "bridge-formula": { module: "../../calc-trucking.js", fn: "computeBridgeFormula" },
  "wind-chill": { module: "../../calc-cross.js", fn: "computeWindChill" },
  "dim-weight": { module: "../../calc-trucking.js", fn: "computeDIM" },
  "material-cost": { module: "../../calc-cross.js", fn: "computeMaterialCost" },
  "loan-payment": { module: "../../calc-cross.js", fn: "computeLoanPayment" },
  "ramp-slope": { module: "../../calc-cross.js", fn: "computeRampSlope" },
  "haversine": { module: "../../calc-cross.js", fn: "computeHaversineDistance" },
  "freight-density": { module: "../../calc-trucking.js", fn: "computeFreightDensity" },
  "voltage-drop": { module: "../../calc-electrical.js", fn: "computeVoltageDrop" },
  "footing-area": { module: "../../calc-construction.js", fn: "computeFootingArea" },
  "markup": { module: "../../calc-cross.js", fn: "computeMarkup" },
  "mileage-cost": { module: "../../calc-cross.js", fn: "computeMileageCost" },
  "heat-stress": { module: "../../calc-cross.js", fn: "computeHeatStress" },
  "ladder-angle": { module: "../../calc-cross.js", fn: "computeLadderAngle" },
  "beer-lambert": { module: "../../calc-lab.js", fn: "computeBeerLambert" },
  "board-footage": { module: "../../calc-construction.js", fn: "computeBoardFootage" },
  "stairs": { module: "../../calc-construction.js", fn: "computeStairs" },
  "roof-pitch": { module: "../../calc-construction.js", fn: "computeRoofPitch" },
  "rafter": { module: "../../calc-construction.js", fn: "computeRafter" },
  "breaker-sizing": { module: "../../calc-electrical.js", fn: "computeBreakerSize" },
  "overtime": { module: "../../calc-cross.js", fn: "computeOvertime" },
  "upgrade-roi": { module: "../../calc-cross.js", fn: "computeUpgradeROI" },
  "trench-slope": { module: "../../calc-cross.js", fn: "computeTrenchSlope" },
  "rainwater-yield": { module: "../../calc-cross.js", fn: "computeRainwaterYield" },
  "henderson-hasselbalch": { module: "../../calc-lab.js", fn: "computeHendersonHasselbalch" },
  "dilution": { module: "../../calc-cross.js", fn: "computeDilution" },
  "straight-line-depreciation": { module: "../../calc-accounting.js", fn: "computeStraightLine" },
  "breakeven": { module: "../../calc-accounting.js", fn: "computeBreakeven" },
  "cfm-per-ton": { module: "../../calc-hvac.js", fn: "computeCfmPerTon" },
  "concrete": { module: "../../calc-construction.js", fn: "computeConcreteVolume" },
  "time-and-materials": { module: "../../calc-cross.js", fn: "computeTimeAndMaterials" },
  "molecular-weight": { module: "../../calc-lab.js", fn: "computeMolecularWeight" },
  "mass-moles": { module: "../../calc-lab.js", fn: "computeMassMoles" },
  "rcf-rpm": { module: "../../calc-lab.js", fn: "computeRcf" },
  "slope-from-level": { module: "../../calc-cross.js", fn: "computeSlopeFromLevel" },
  "pounds-formula": { module: "../../calc-water.js", fn: "computePoundsFormula" },
  "detention-time": { module: "../../calc-water.js", fn: "computeDetentionTime" },
  "spl-distance": { module: "../../calc-stage.js", fn: "computeSPL" },
  "gpa-rate": { module: "../../calc-agriculture.js", fn: "computeGPA" },
  "motor-fla": { module: "../../calc-electrical.js", fn: "computeMotorFLA" },
  "timber-cruise": { module: "../../calc-agriculture.js", fn: "computeTimberCruise" },
  "neutral-imbalance": { module: "../../calc-stage.js", fn: "computeNeutralImbalance" },
  "filter-loading": { module: "../../calc-water.js", fn: "computeFilterLoading" },
  "arc-flash-screen": { module: "../../calc-electrical.js", fn: "computeArcFlashScreen" },
  "motor-branch-from-nameplate": { module: "../../calc-electrical.js", fn: "computeMotorBranchFromNameplate" },
  "grounding-electrode": { module: "../../calc-electrical.js", fn: "computeGroundingElectrodeResistance" },
  "outdoor-air-ventilation": { module: "../../calc-hvac.js", fn: "computeOutdoorAirVentilation" },
  "scba-cylinder-time": { module: "../../calc-fire.js", fn: "computeScbaCylinderTime" },
  "stopping-sight-distance": { module: "../../calc-trucking.js", fn: "computeStoppingSightDistance" },
  "lightning-countdown": { module: "../../calc-field.js", fn: "computeLightningCountdown" },
  "magnetic-declination": { module: "../../calc-field.js", fn: "computeMagneticDeclination" },
  "thi-livestock": { module: "../../calc-agriculture.js", fn: "computeTHI" },
  "sprayer-calibration": { module: "../../calc-agriculture.js", fn: "computeSprayerCalibration" },
  "sous-vide-pasteurization": { module: "../../calc-kitchen.js", fn: "computeSousVidePasteurization" },
  "svi-sludge-index": { module: "../../calc-water.js", fn: "computeSVI" },
  "noise-dose": { module: "../../calc-cross.js", fn: "computeNoiseDose" },
  "nfpa-1142-water-supply": { module: "../../calc-fire.js", fn: "computeNFPA1142WaterSupply" },
  "excavation-bench-plan": { module: "../../calc-construction.js", fn: "computeExcavationBenchPlan" },
  "disinfection-ct": { module: "../../calc-water.js", fn: "computeDisinfectionCT" },
  "hood-exhaust": { module: "../../calc-hvac.js", fn: "computeHoodExhaust" },
  "recirc-loop-sizing": { module: "../../calc-plumbing.js", fn: "computeRecircLoopSizing" },
  "shr-latent": { module: "../../calc-hvac.js", fn: "computeSHRLatent" },
  "spl-atmospheric": { module: "../../calc-stage.js", fn: "computeSPLAtmospheric" },
  "drying-log": { module: "../../calc-restoration.js", fn: "computeDryingLog" },
  "confined-space-vent": { module: "../../calc-fire.js", fn: "computeConfinedSpaceVent" },
  "drywall": { module: "../../calc-construction.js", fn: "computeDrywall" },
  "asphalt-tonnage": { module: "../../calc-construction.js", fn: "computeAsphaltTonnage" },
  "prop-slip": { module: "../../calc-mechanic.js", fn: "computePropSlip" },
  "fuel-range": { module: "../../calc-mechanic.js", fn: "computeFuelRange" },
  "aggregate": { module: "../../calc-construction.js", fn: "computeAggregate" },
  "bolt-torque": { module: "../../calc-construction.js", fn: "computeBoltTorque" },
  "bend-allowance": { module: "../../calc-construction.js", fn: "computeBendAllowance" },
  "copper-resistance": { module: "../../calc-electrical.js", fn: "computeConductorResistance" },
  "balance-point": { module: "../../calc-hvac.js", fn: "computeBalancePoint" },
  "combustion-air": { module: "../../calc-hvac.js", fn: "computeCombustionAir" },
  "coagulant-dose": { module: "../../calc-water.js", fn: "computeCoagulantDose" },
  "box-fill": { module: "../../calc-electrical.js", fn: "computeBoxFill" },
  "braking-distance": { module: "../../calc-fire.js", fn: "computeBrakingDistance" },
  "bulk-density": { module: "../../calc-agriculture.js", fn: "computeBulkDensity" },
  "bearing-conversion": { module: "../../calc-field.js", fn: "computeBearingConversion" },
  "affinity-laws": { module: "../../calc-hvac.js", fn: "computeAffinityLaws" },
  "drawbar-power": { module: "../../calc-agriculture.js", fn: "computeDrawbarPower" },
  "chamber-turnover": { module: "../../calc-restoration.js", fn: "computeChamberTurnover" },
  "concrete-mix-design": { module: "../../calc-construction.js", fn: "computeConcreteMixDesign" },
  "drying-goal": { module: "../../calc-restoration.js", fn: "computeDryingGoal" },
  "fire-friction": { module: "../../calc-fire.js", fn: "computeFireFriction" },
  "hydrant-flow": { module: "../../calc-fire.js", fn: "computeHydrantFlow" },
  "pdp": { module: "../../calc-fire.js", fn: "computePDP" },
  "excavation": { module: "../../calc-construction.js", fn: "computeExcavationVolume" },
  "evaporative-cooling": { module: "../../calc-hvac.js", fn: "computeEvaporativeCooling" },
  "conduit-fill": { module: "../../calc-electrical.js", fn: "computeConduitFill" },
  "battery-runtime": { module: "../../calc-electrical.js", fn: "computeBatteryRuntime" },
  "loan-amortization": { module: "../../calc-accounting.js", fn: "computeAmortization" },
  "belt-pulley": { module: "../../calc-hvac.js", fn: "computeBeltAndPulley" },
  "cable-bend-radius": { module: "../../calc-electrical.js", fn: "computeBendRadius" },
  "tip-out": { module: "../../calc-cross.js", fn: "computeTipOut" },
  "pipe-volume": { module: "../../calc-plumbing.js", fn: "computePipeVolume" },
  "stormwater-rational": { module: "../../calc-plumbing.js", fn: "computeStormwaterRational" },
  "tankless-gpm": { module: "../../calc-plumbing.js", fn: "computeTanklessGPM" },
  "glycol-mix": { module: "../../calc-plumbing.js", fn: "computeGlycolMix" },
  "pump-sizing": { module: "../../calc-plumbing.js", fn: "computePumpSize" },
  "septic-tank": { module: "../../calc-plumbing.js", fn: "computeSepticTank" },
  "trap-arm": { module: "../../calc-plumbing.js", fn: "computeTrapArm" },
  "pipe-expansion": { module: "../../calc-plumbing.js", fn: "computePipeExpansion" },
  "grease-trap": { module: "../../calc-plumbing.js", fn: "computeGreaseTrap" },
  "aerial-ladder": { module: "../../calc-fire.js", fn: "computeAerialLadderReach" },
  "foam": { module: "../../calc-fire.js", fn: "computeFoam" },
  "sprinkler-density": { module: "../../calc-fire.js", fn: "computeSprinklerDensity" },
  "rope-ma": { module: "../../calc-fire.js", fn: "computeRopeMA" },
  "pulley-ma-gen": { module: "../../calc-cross.js", fn: "computePulleyMA" },
  "paint-coverage": { module: "../../calc-construction.js", fn: "computePaintCoverage" },
  "wind-pressure": { module: "../../calc-construction.js", fn: "computeWindPressure" },
  "snow-load": { module: "../../calc-construction.js", fn: "computeSnowLoad" },
  "three-phase": { module: "../../calc-electrical.js", fn: "computeThreePhase" },
  "slope": { module: "../../calc-plumbing.js", fn: "computeSlope" },
  "square-footage": { module: "../../calc-construction.js", fn: "computeArea" },
  "seer-eer": { module: "../../calc-hvac.js", fn: "computeSeerEer" },
  "pressure-conversion": { module: "../../calc-plumbing.js", fn: "pressureConvert" },
  "geometry": { module: "../../calc-cross.js", fn: "computeGeometry" },
  "hydrostatic-test": { module: "../../calc-plumbing.js", fn: "computeHydrostaticTest" },
  "voltage-imbalance": { module: "../../calc-electrical.js", fn: "computeVoltageImbalance" },
  "tile-count": { module: "../../calc-construction.js", fn: "computeTileCount" },
  "sales-tax": { module: "../../calc-cross.js", fn: "computeSalesTax" },
  "roofing-squares": { module: "../../calc-construction.js", fn: "computeRoofingSquares" },
  "mortar-mix": { module: "../../calc-construction.js", fn: "computeMortarMix" },
  "pf-correction": { module: "../../calc-electrical.js", fn: "computePFCorrection" },
  "joist-deflection": { module: "../../calc-construction.js", fn: "computeJoistDeflection" },
  "cash-conversion-cycle": { module: "../../calc-accounting.js", fn: "computeCashConversionCycle" },
  "anchor-embedment": { module: "../../calc-construction.js", fn: "computeAnchorEmbedment" },
  "inventory-turnover": { module: "../../calc-accounting.js", fn: "computeInventoryTurnover" },
  "rebar": { module: "../../calc-construction.js", fn: "computeRebar" },
  "material-quantity": { module: "../../calc-construction.js", fn: "computeMaterialQuantity" },
  "masonry-count": { module: "../../calc-construction.js", fn: "computeMasonryCount" },
  "demo-debris": { module: "../../calc-construction.js", fn: "computeDemoDebris" },
  "fastener-pullout": { module: "../../calc-construction.js", fn: "computePullout" },
  "egc-sizing": { module: "../../calc-electrical.js", fn: "computeEGCSize" },
  "transformer-sizing": { module: "../../calc-electrical.js", fn: "computeTransformerSize" },
  "static-pressure-piping": { module: "../../calc-plumbing.js", fn: "computeStaticPressureLossPiping" },
  "wire-ampacity": { module: "../../calc-electrical.js", fn: "computeWireAmpacity" },
  "gas-pipe-sizing": { module: "../../calc-plumbing.js", fn: "computeGasPipeSizing" },
  "friction-loss": { module: "../../calc-plumbing.js", fn: "computeFrictionLoss" },
  "superheat-subcool": { module: "../../calc-hvac.js", fn: "computeSuperheatSubcool" },
  "lighting-density": { module: "../../calc-electrical.js", fn: "computeLightingDensity" },
  "lv-dc-drop": { module: "../../calc-electrical.js", fn: "computeLVDCDrop" },
  "approach-delta-t": { module: "../../calc-hvac.js", fn: "computeApproachDeltaT" },
  "outdoor-air-mix": { module: "../../calc-hvac.js", fn: "computeOutdoorAirMix" },
  "manning-slope": { module: "../../calc-plumbing.js", fn: "computeManningSlope" },
  "water-hammer-arrestor": { module: "../../calc-plumbing.js", fn: "computeWaterHammerArrestor" },
  "expansion-tank": { module: "../../calc-plumbing.js", fn: "computeExpansionTank" },
  "septic-drainfield": { module: "../../calc-plumbing.js", fn: "computeSepticDrainfield" },
  "transformer-kva-sizing": { module: "../../calc-electrical.js", fn: "computeTransformerKvaSizing" },
  "service-load-standard": { module: "../../calc-electrical.js", fn: "computeServiceLoadStandard" },
  "gas-leak-rate": { module: "../../calc-plumbing.js", fn: "computeGasLeakRate" },
  "shr": { module: "../../calc-hvac.js", fn: "computeSHR" },
  "equivalent-length": { module: "../../calc-hvac.js", fn: "computeEquivalentLength" },
  "baseboard-output": { module: "../../calc-hvac.js", fn: "computeBaseboardOutput" },
  "water-hammer-surge": { module: "../../calc-plumbing.js", fn: "computeWaterHammerSurge" },
  "backflow-loss": { module: "../../calc-plumbing.js", fn: "computeBackflowLoss" },
  "pipe-expansion-loop": { module: "../../calc-plumbing.js", fn: "computePipeExpansionLoop" },
  "pump-operating-point": { module: "../../calc-plumbing.js", fn: "computePumpOperatingPoint" },
  "recirc-pump-head": { module: "../../calc-plumbing.js", fn: "computeRecircPumpHead" },
  "geothermal-loop": { module: "../../calc-hvac.js", fn: "computeGeothermalLoop" },
  "multi-load-vd": { module: "../../calc-electrical.js", fn: "computeMultiLoadVoltageDrop" },
  "poe-budget": { module: "../../calc-electrical.js", fn: "computePoEBudget" },
  "panel-rebalance": { module: "../../calc-electrical.js", fn: "computePanelRebalance" },
  "short-circuit-pp": { module: "../../calc-electrical.js", fn: "computeShortCircuitPP" },
  "insulation-heat-loss": { module: "../../calc-hvac.js", fn: "computeInsulationHeatLoss" },
  "service-load": { module: "../../calc-electrical.js", fn: "computeServiceLoad" },
  "generator-sizing": { module: "../../calc-electrical.js", fn: "computeGeneratorSize" },
  "pv-string-sizing": { module: "../../calc-electrical.js", fn: "computePVStringSizing" },
  "phase-balance": { module: "../../calc-electrical.js", fn: "computePhaseBalance" },
  "insulation-thickness": { module: "../../calc-hvac.js", fn: "computeInsulationThickness" },
  "psychrometric": { module: "../../calc-restoration.js", fn: "computePsychrometric" },
  "standing-water": { module: "../../calc-restoration.js", fn: "computeStandingWater" },
  "nam-sizing": { module: "../../calc-restoration.js", fn: "computeNAMSizing" },
  "wet-bulb-psychrometer": { module: "../../calc-hvac.js", fn: "computeWetBulbPsychrometer" },
  "pulling-tension": { module: "../../calc-electrical.js", fn: "computePullingTension" },
  "per-diem": { module: "../../calc-cross.js", fn: "computePerDiem" },
  "niosh-lifting": { module: "../../calc-cross.js", fn: "computeNIOSHLifting" },
  "seed-rate": { module: "../../calc-agriculture.js", fn: "computeSeedRate" },
  "fuel-range": { module: "../../calc-mechanic.js", fn: "computeFuelRange" },
  "duct-sizing": { module: "../../calc-hvac.js", fn: "computeDuctSize" },
  "lumber-spans": { module: "../../calc-construction.js", fn: "computeLumberSpan" },
  "beam-loading": { module: "../../calc-construction.js", fn: "computeBeamLoading" },
  "stair-stringer": { module: "../../calc-construction.js", fn: "computeStairStringer" },
  "master-stream": { module: "../../calc-fire.js", fn: "computeMasterStreamReach" },
  "required-fire-flow": { module: "../../calc-fire.js", fn: "computeRequiredFireFlow" },
  "yield-ep": { module: "../../calc-kitchen.js", fn: "computeYieldEP" },
  "cooling-curve": { module: "../../calc-kitchen.js", fn: "computeCoolingCurve" },
  "time-alignment": { module: "../../calc-stage.js", fn: "computeTimeAlignment" },
  "slope-avalanche": { module: "../../calc-field.js", fn: "computeSlopeAvalanche" },
  "statute-of-limitations": { module: "../../calc-legal.js", fn: "computeStatuteOfLimitations" },
  "macrs-depreciation": { module: "../../calc-accounting.js", fn: "computeMacrs" },
  "incoterm-decoder": { module: "../../calc-trucking.js", fn: "computeIncoterm" },
  "reefer-burn": { module: "../../calc-trucking.js", fn: "computeReeferBurn" },
  "brake-pad-life": { module: "../../calc-mechanic.js", fn: "computeBrakePadLife" },
  "weight-balance": { module: "../../calc-mechanic.js", fn: "computeWeightBalance" },
  "pipe-sizing": { module: "../../calc-plumbing.js", fn: "computePipeSizing" },
  "refrigerant-pt": { module: "../../calc-hvac.js", fn: "computeRefrigerantPT" },
  "static-pressure-hvac": { module: "../../calc-hvac.js", fn: "computeStaticPressureHvac" },
  "standpipe-friction": { module: "../../calc-fire.js", fn: "computeStandpipeFriction" },
  "reverse-lay-friction": { module: "../../calc-fire.js", fn: "computeReverseLayFriction" },
  "fall-protection-clearance": { module: "../../calc-cross.js", fn: "computeFallProtectionClearance" },
  "vehicle-load": { module: "../../calc-cross.js", fn: "computeVehicleLoad" },
  "air-movers": { module: "../../calc-restoration.js", fn: "computeAirMovers" },
  "dehumidifier": { module: "../../calc-restoration.js", fn: "computeDehumidifierSize" },
  "bolt-stretch": { module: "../../calc-mechanic.js", fn: "computeBoltStretch" },
  "molarity-dilution": { module: "../../calc-lab.js", fn: "computeDilution" },
  "serial-dilution": { module: "../../calc-lab.js", fn: "computeSerialDilution" },
  "resuspension-volume": { module: "../../calc-lab.js", fn: "computeResuspension" },
  "hemocytometer": { module: "../../calc-lab.js", fn: "computeHemocytometer" },
  "pcr-master-mix": { module: "../../calc-lab.js", fn: "computePcrMix" },
  // v12 Group U starter.
  "vet-weight-based-dose": { module: "../../calc-vet.js", fn: "computeVetDose" },
  "vet-maintenance-fluid": { module: "../../calc-vet.js", fn: "computeMaintenanceFluid" },
  "vet-energy-requirement": { module: "../../calc-vet.js", fn: "computeEnergyRequirement" },
  "vet-bcs-reference": { module: "../../calc-vet.js", fn: "computeBCSReference" },
  "vet-pet-age": { module: "../../calc-vet.js", fn: "computePetAge" },
  "vet-gestation": { module: "../../calc-vet.js", fn: "computeGestation" },
  // v12 Group V starter.
  "glasgow-coma-scale": { module: "../../calc-ems.js", fn: "computeGCS" },
  "parkland-formula": { module: "../../calc-ems.js", fn: "computeParkland" },
  "cincinnati-stroke-scale": { module: "../../calc-ems.js", fn: "computeCPSS" },
  "apgar-score": { module: "../../calc-ems.js", fn: "computeAPGAR" },
  "iv-drip-rate": { module: "../../calc-ems.js", fn: "computeIvDripRate" },
  "o2-cylinder-duration": { module: "../../calc-ems.js", fn: "computeO2CylinderTime" },
  // v12 Group W starter.
  "density-altitude": { module: "../../calc-aviation.js", fn: "computeDensityAltitude" },
  "crosswind-component": { module: "../../calc-aviation.js", fn: "computeCrosswind" },
  "ete-eta": { module: "../../calc-aviation.js", fn: "computeETE" },
  "hypoxia-altitude": { module: "../../calc-aviation.js", fn: "computeHypoxiaAltitude" },
  "pressure-altitude": { module: "../../calc-aviation.js", fn: "computePressureAltitude" },
  "phonetic-alphabet": { module: "../../calc-aviation.js", fn: "computePhoneticAlphabet" },
  // v12 Group X starter.
  "ltv": { module: "../../calc-realestate.js", fn: "computeLTV" },
  "dti": { module: "../../calc-realestate.js", fn: "computeDTI" },
  "piti": { module: "../../calc-realestate.js", fn: "computePITI" },
  "exchange-1031-timeline": { module: "../../calc-realestate.js", fn: "compute1031Timeline" },
  "section-121-exclusion": { module: "../../calc-realestate.js", fn: "computeSection121" },
  "property-tax": { module: "../../calc-realestate.js", fn: "computePropertyTax" },
  "cap-rate-dscr": { module: "../../calc-realestate.js", fn: "computeCapRateDSCR" },
  "cash-on-cash": { module: "../../calc-realestate.js", fn: "computeCashOnCash" },
  "commission-split": { module: "../../calc-realestate.js", fn: "computeCommissionSplit" },
  // v12 Group Y starter.
  "readability": { module: "../../calc-edu.js", fn: "computeReadability" },
  "statistics-quickread": { module: "../../calc-edu.js", fn: "computeStatistics" },
  "quadratic-formula": { module: "../../calc-edu.js", fn: "computeQuadratic" },
  "scientific-notation": { module: "../../calc-edu.js", fn: "computeScientificNotation" },
  "significant-figures": { module: "../../calc-edu.js", fn: "computeSigFigs" },
  "codon-table": { module: "../../calc-edu.js", fn: "computeCodonTable" },
  "base-converter": { module: "../../calc-edu.js", fn: "computeBaseConvert" },
  "mileage-rollup": { module: "../../calc-accounting.js", fn: "computeMileageRollup" },
  "section-179": { module: "../../calc-accounting.js", fn: "computeSection179" },
  "se-tax": { module: "../../calc-accounting.js", fn: "computeSETax" },
  "sales-tax-compound": { module: "../../calc-accounting.js", fn: "computeSalesTaxCompound" },
  "iso-nff": { module: "../../calc-fire.js", fn: "computeIsoNeededFireFlow" },
  "speeds-feeds": { module: "../../calc-construction.js", fn: "computeSpeedsAndFeeds" },
  "weld-usage": { module: "../../calc-construction.js", fn: "computeWeldUsage" },
  "helical-pile": { module: "../../calc-construction.js", fn: "computeHelicalPile" },
  "rebar-schedule": { module: "../../calc-construction.js", fn: "computeRebarSchedule" },
  "hip-valley-rafter": { module: "../../calc-construction.js", fn: "computeHipValleyRafter" },
  "plywood-span": { module: "../../calc-construction.js", fn: "computePlywoodSpan" },
  "crane-lift-quick": { module: "../../calc-construction.js", fn: "computeCraneLiftCheck" },
  "residential-framing": { module: "../../calc-construction.js", fn: "computeResidentialFraming" },
  "utm-conversion": { module: "../../calc-field.js", fn: "computeUTM" },
  "ladder-pipe-reach": { module: "../../calc-fire.js", fn: "computeLadderPipeReach" },
  "formwork-pressure": { module: "../../calc-construction.js", fn: "computeFormworkPressure" },
  "npsh-a": { module: "../../calc-hvac.js", fn: "computeNPSHa" },
  "compare-refrigerants": { module: "../../calc-hvac.js", fn: "computeCompareRefrigerants" },
  "driveshaft-crit": { module: "../../calc-mechanic.js", fn: "computeDriveshaftCritical" },
  "confined-space-purge": { module: "../../calc-fire.js", fn: "computeConfinedSpacePurge" },
  "pacing-distance": { module: "../../calc-field.js", fn: "computePacing" },
  "backcountry-needs": { module: "../../calc-field.js", fn: "computeBackcountryNeeds" },
  "irrigation-uniformity": { module: "../../calc-agriculture.js", fn: "computeUniformity" },
  "truss-capacity": { module: "../../calc-stage.js", fn: "computeTrussCapacity" },
  "pan-conversion": { module: "../../calc-kitchen.js", fn: "computePanConversion" },
  "small-claims-reference": { module: "../../calc-legal.js", fn: "computeSmallClaimsReference" },
  "tenant-notice": { module: "../../calc-legal.js", fn: "computeTenantNotice" },
  "recipe-scale": { module: "../../calc-kitchen.js", fn: "computeRecipeScale" },
  "timesheet": { module: "../../calc-cross.js", fn: "computeTimesheet" },
  "mold": { module: "../../calc-restoration.js", fn: "computeMoldRisk" },
  "cooling-tower": { module: "../../calc-hvac.js", fn: "computeCoolingTower" },
  "air-receiver": { module: "../../calc-hvac.js", fn: "computeAirReceiver" },
  "drying-times": { module: "../../calc-restoration.js", fn: "computeDryingTime" },
  "ppe": { module: "../../calc-restoration.js", fn: "computePPE" },
  "sling-angle": { module: "../../calc-fire.js", fn: "computeSlingAngle" },
  "lab-dilution": { module: "../../calc-water.js", fn: "computeDilution" },
  "pump-eff-w2w": { module: "../../calc-water.js", fn: "computePumpEfficiency" },
  "osha-top10": { module: "../../calc-references.js", fn: "computeOSHATop10" },
  "loto-steps": { module: "../../calc-references.js", fn: "computeLOTO" },
  "defensible-space": { module: "../../calc-references.js", fn: "computeDefensibleSpace" },
  "storm-shelter": { module: "../../calc-references.js", fn: "computeStormShelter" },
  "sales-tax-nexus": { module: "../../calc-references.js", fn: "computeSalesTaxNexus" },
  "triage-quickread": { module: "../../calc-references.js", fn: "computeTriage" },
  "plate-cost": { module: "../../calc-kitchen.js", fn: "computePlateCost" },
  "judgment-interest": { module: "../../calc-legal.js", fn: "computeJudgmentInterest" },
  "court-deadline": { module: "../../calc-legal.js", fn: "computeDeadline" },
  "contractor-vs-employee": { module: "../../calc-legal.js", fn: "computeContractorVsEmployee" },
  "displacement-cr": { module: "../../calc-mechanic.js", fn: "computeDisplacementCR" },
  "tire-gearing": { module: "../../calc-mechanic.js", fn: "computeTireGearing" },
  "gfci-afci-reference": { module: "../../calc-electrical.js", fn: "computeGFCIReference" },
  "backflow": { module: "../../calc-plumbing.js", fn: "computeBackflow" },
  "water-classes": { module: "../../calc-restoration.js", fn: "computeWaterReference" },
  "thermal-delta-t": { module: "../../calc-restoration.js", fn: "computeThermalDeltaTReference" },
  "smoke-reading": { module: "../../calc-fire.js", fn: "computeSmokeReading" },
  "color-codes": { module: "../../calc-references.js", fn: "computeColorCodes" },
  "knot-reference": { module: "../../calc-references.js", fn: "computeKnotReference" },
  "inspection-checklist": { module: "../../calc-references.js", fn: "computeInspectionChecklist" },
  "emergency-contacts": { module: "../../calc-references.js", fn: "computeEmergencyContacts" },
  "tool-maintenance": { module: "../../calc-references.js", fn: "computeToolMaintenance" },
  "hand-signals": { module: "../../calc-references.js", fn: "computeHandSignals" },
  "irs-form-index": { module: "../../calc-references.js", fn: "computeIrsFormIndex" },
  "osha-recordkeeping": { module: "../../calc-references.js", fn: "computeOshaRecordkeeping" },
  "lab-safety-quickread": { module: "../../calc-references.js", fn: "computeLabSafety" },
  "stair-stringer-layout": { module: "../../calc-construction.js", fn: "computeStairStringerV7" },
  "hepa-filter-life": { module: "../../calc-restoration.js", fn: "computeHEPALife" },
  "containment-air-balance": { module: "../../calc-restoration.js", fn: "computeContainmentAirBalance" },
  "generator-motor-starting": { module: "../../calc-electrical.js", fn: "computeGeneratorMotorStarting" },
  "refrigerant-charge": { module: "../../calc-hvac.js", fn: "computeRefrigerantCharge" },
  "refrigerant-charging": { module: "../../calc-hvac.js", fn: "computeRefrigerantCharging" },
  "duct-leakage": { module: "../../calc-hvac.js", fn: "computeDuctLeakage" },
  "duct-friction-static": { module: "../../calc-hvac.js", fn: "computeDuctFrictionStatic" },
  "pallet-loadout": { module: "../../calc-trucking.js", fn: "computePalletLoadout" },
  "hos-math": { module: "../../calc-trucking.js", fn: "computeHOS" },
  "crop-yield": { module: "../../calc-agriculture.js", fn: "computeCropYield" },
  "srt-fm-ratio": { module: "../../calc-water.js", fn: "computeSRTandFM" },
  "dmx-planner": { module: "../../calc-stage.js", fn: "computeDMX" },
  "rigging-check": { module: "../../calc-stage.js", fn: "computeRiggingCheck" },
  "solar-times": { module: "../../calc-field.js", fn: "computeSolarTimes" },
  "wage-hour": { module: "../../calc-legal.js", fn: "computeWageHour" },
  "estimated-tax": { module: "../../calc-accounting.js", fn: "computeEstimatedTax" },
  "payroll-withholding": { module: "../../calc-accounting.js", fn: "computePayrollWithholding" },
  "unit-converter": { module: "../../calc-cross.js", fn: "convertUnit" },
  "manual-j-cooling": { module: "../../calc-hvac.js", fn: "manualJCooling" },
  "manual-j-heating": { module: "../../calc-hvac.js", fn: "manualJHeating" },
  "historical-pricing": { module: "../../calc-historical.js", fn: "computeHistorical" },
  "job-estimate-rollup": { module: "../../calc-meta.js", fn: "computeJobEstimateRollup" },
  "material-order-list": { module: "../../calc-meta.js", fn: "computeMaterialOrderList" },
  "job-pack": { module: "../../calc-meta.js", fn: "computeJobPack" },
  "contract-clause-reference": { module: "../../calc-legal.js", fn: "computeContractClauseReference" },
  "lease-term-reference": { module: "../../calc-legal.js", fn: "computeLeaseTermReference" },
};

function withinTolerance(actual, expected, tol) {
  // String-valued outputs (e.g., table-lookup AWG sizes, recommended pipe
  // trade sizes) compare by strict equality; `tolerance` is ignored. This
  // lets a fixture pin "10" for the EGC table or "0.75" for a Spitzglass
  // gas-pipe lookup without inventing a numeric coercion.
  if (typeof expected === "string") return String(actual) === expected;
  // Booleans coerce to 0/1 so a fixture can declare `value: 1` for a
  // pass-flag and `value: 0` for a fail-flag with abs tolerance 0.
  if (typeof actual === "boolean") actual = actual ? 1 : 0;
  if (typeof actual !== "number" || !Number.isFinite(actual)) return false;
  if (tol.abs !== undefined) {
    return Math.abs(actual - expected) <= tol.abs;
  }
  if (tol.pct !== undefined) {
    const ref = Math.max(Math.abs(expected), 1e-12);
    const diff = Math.abs(actual - expected);
    return (diff / ref) * 100 <= tol.pct;
  }
  return false;
}

let _fixturesPromise = null;
function loadFixtures() {
  if (!_fixturesPromise) {
    _fixturesPromise = readFile(FIXTURE, "utf8").then((s) => JSON.parse(s));
  }
  return _fixturesPromise;
}

test("worked-examples runner has at least one registered tile", () => {
  assert.ok(Object.keys(COMPUTE_MAP).length > 0);
});

test("every fixture for a registered tile passes the runner", async () => {
  const json = await loadFixtures();
  let runCount = 0;
  let skipCount = 0;
  for (const row of json.rows) {
    const reg = COMPUTE_MAP[row.tile_id];
    if (!reg) { skipCount += 1; continue; }
    const mod = await import(reg.module);
    const fn = mod[reg.fn];
    assert.equal(typeof fn, "function", "missing compute export: " + reg.module + " " + reg.fn);
    const out = fn({ ...row.inputs });
    assert.ok(out && typeof out === "object", row.tile_id + ": compute returned non-object");
    assert.ok(!out.error, row.tile_id + ": compute returned error: " + out.error);
    for (const [name, exp] of Object.entries(row.outputs)) {
      assert.ok(name in out, row.tile_id + ": compute output missing key '" + name + "'");
      const ok = withinTolerance(out[name], exp.value, exp.tolerance);
      assert.ok(
        ok,
        row.tile_id + " output '" + name + "': got " + out[name] + ", expected " + exp.value + " ± " + JSON.stringify(exp.tolerance),
      );
    }
    runCount += 1;
  }
  // Sanity: at least one fixture actually ran.
  assert.ok(runCount > 0, "no fixtures matched COMPUTE_MAP; did the registry shrink?");
  // Useful diagnostic.
  console.log("worked-examples runner: ran " + runCount + " / skipped " + skipCount);
});

test("ohms-law happy path: V=120 I=10 -> R=12, P=1200", async () => {
  const mod = await import("../../calc-electrical.js");
  const r = mod.computeOhmsLaw({ V: 120, I: 10, R: null, P: null });
  assert.ok(!r.error);
  assert.ok(withinTolerance(r.R, 12, { pct: 0.5 }));
  assert.ok(withinTolerance(r.P, 1200, { pct: 0.5 }));
});

test("bridge-formula at 80,000 lb interstate cap (5-axle Class 8 example)", async () => {
  const mod = await import("../../calc-trucking.js");
  const r = mod.computeBridgeFormula({
    axle_weights_lb: [12000, 17000, 17000, 17000, 17000],
    axle_spacings_ft: [12, 4, 30, 4],
  });
  assert.ok(!r.error);
  assert.equal(r.total_weight_lb, 80000);
  assert.equal(r.interstate_cap_lb, 80000);
  assert.equal(r.over_interstate, false);
});

test("wind-chill at 10F / 20mph yields ~ -9F", async () => {
  const mod = await import("../../calc-cross.js");
  const r = mod.computeWindChill({ T_F: 10, wind_mph: 20 });
  assert.ok(!r.error);
  // The published NWS calculator returns -9F for these inputs (rounded
  // to the nearest integer); our implementation is the same formula.
  assert.ok(withinTolerance(r.wind_chill_F, -9, { abs: 1 }));
});
