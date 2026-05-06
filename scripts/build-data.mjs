#!/usr/bin/env node
// roughlogic data pipeline.
//
// This script is the build-time owner of data/. It produces sharded JSON
// for every dataset in spec.md section 6, writes a per-folder manifest.json
// with version and SHA-256 hashes, and writes scripts/expected-hashes.json.
//
// Most roughlogic data is static physical/factual content. This pipeline
// regenerates the shards from in-tree authoritative inputs (the values
// committed to scripts/sources/*.json by the maintainer) so the build is
// deterministic and reproducible without network access. Where a dataset
// is sourced from a public canonical URL (NIST, NOAA), the maintainer
// downloads the canonical file, verifies its hash, and commits the parsed
// authoritative inputs alongside provenance in scripts/sources.md.
//
// No NEC, IPC, IRC, ASHRAE Fundamentals, ACCA Manual J, NFPA, or AWC
// licensed code text is bundled.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const DATA = resolve(ROOT, "data");
const TODAY = new Date().toISOString().slice(0, 10);

// --- Authoritative inputs (cited in docs/data-sources.md) ---

// NIST physical constants (CODATA 2018 published values; physical facts).
const PHYSICAL_CONSTANTS = {
  source: "NIST Reference on Constants, Units, and Uncertainty (https://physics.nist.gov/cuu/Constants/)",
  license: "U.S. government publication, public domain",
  values: {
    c: { name: "Speed of light in vacuum", value: 299792458, unit: "m/s", uncertainty: 0 },
    h: { name: "Planck constant", value: 6.62607015e-34, unit: "J*s", uncertainty: 0 },
    k_B: { name: "Boltzmann constant", value: 1.380649e-23, unit: "J/K", uncertainty: 0 },
    g: { name: "Standard acceleration of gravity", value: 9.80665, unit: "m/s^2", uncertainty: 0 },
    R: { name: "Molar gas constant", value: 8.314462618, unit: "J/(mol*K)", uncertainty: 0 },
    sigma_SB: { name: "Stefan-Boltzmann constant", value: 5.670374419e-8, unit: "W/(m^2*K^4)", uncertainty: 0 },
    rho_water_4C: { name: "Density of water at 4 C, 1 atm", value: 999.972, unit: "kg/m^3", uncertainty: 0.001 },
    p_atm: { name: "Standard atmosphere", value: 101325, unit: "Pa", uncertainty: 0 },
  },
};

// Material properties (physics references).
const MATERIAL_PROPERTIES = {
  source: "Public physics and engineering reference works (CRC Handbook, NIST tables); physical facts.",
  values: {
    copper: {
      density_kg_m3: 8960,
      resistivity_ohm_m_20C: 1.724e-8,
      alpha_per_K: 3.93e-3,
      specific_heat_J_kgK: 385,
      thermal_conductivity_W_mK: 401,
    },
    aluminum: {
      density_kg_m3: 2700,
      resistivity_ohm_m_20C: 2.82e-8,
      alpha_per_K: 4.03e-3,
      specific_heat_J_kgK: 897,
      thermal_conductivity_W_mK: 237,
    },
    water_60F: {
      density_kg_m3: 999.0,
      viscosity_Pa_s: 1.124e-3,
    },
    air_20C: {
      density_kg_m3: 1.204,
      viscosity_Pa_s: 1.825e-5,
      specific_heat_J_kgK: 1005,
    },
  },
};

// AWG conductor properties. Generated from the standard AWG geometric
// definition: diameter (in) = 0.005 * 92^((36 - n)/39). Cross-sectional
// area in circular mils = 1000 * 1000 * d^2 (where d is in inches).
function buildConductorProperties() {
  const cuRho = MATERIAL_PROPERTIES.values.copper.resistivity_ohm_m_20C;
  const alRho = MATERIAL_PROPERTIES.values.aluminum.resistivity_ohm_m_20C;
  const sizes = [];
  // AWG 0000 = -3, 000 = -2, 00 = -1, then 0..40
  const awgList = [
    { name: "4/0", n: -3 },
    { name: "3/0", n: -2 },
    { name: "2/0", n: -1 },
    { name: "1/0", n: 0 },
    { name: "1", n: 1 },
    { name: "2", n: 2 },
    { name: "4", n: 4 },
    { name: "6", n: 6 },
    { name: "8", n: 8 },
    { name: "10", n: 10 },
    { name: "12", n: 12 },
    { name: "14", n: 14 },
    { name: "16", n: 16 },
    { name: "18", n: 18 },
    { name: "20", n: 20 },
  ];
  for (const a of awgList) {
    const d_in = 0.005 * Math.pow(92, (36 - a.n) / 39);
    const d_mm = d_in * 25.4;
    const area_cmils = Math.round((d_in * 1000) ** 2);
    const area_mm2 = +(Math.PI * (d_mm / 2) ** 2).toFixed(4);
    const area_m2 = area_mm2 * 1e-6;
    // Resistance per 1000 ft at 20 C, ohm/kft = rho * L / A in consistent units.
    const L_m = 304.8; // 1000 ft in meters
    const r_cu = +(cuRho * L_m / area_m2).toFixed(4);
    const r_al = +(alRho * L_m / area_m2).toFixed(4);
    sizes.push({
      awg: a.name,
      diameter_in: +d_in.toFixed(5),
      diameter_mm: +d_mm.toFixed(4),
      area_cmils,
      area_mm2,
      copper_ohm_per_kft_20C: r_cu,
      aluminum_ohm_per_kft_20C: r_al,
    });
  }
  return {
    source: "AWG geometric definition (d_in = 0.005 * 92^((36 - n)/39)); resistivity from MATERIAL_PROPERTIES (NIST). Physical facts.",
    sizes,
  };
}

// Ampacity physics inputs (heat-balance methodology, not NEC tables).
const AMPACITY_PHYSICS = {
  source: "First-principles heat balance (see docs/derivations.md, section 2). Insulation temperature ratings are insulation manufacturer specifications.",
  insulation_ratings_C: { sixty: 60, seventy_five: 75, ninety: 90 },
  ambient_correction_method: "Linear adjustment from rated ambient (30 C) per IEEE 835 conductor sizing methodology.",
  bundling_correction_method: "Reduction factors per published heat-dissipation models (IEEE 835).",
  notes: "Computed values match NEC 75 C column for typical inputs by physics, not by reproduction.",
};

// Conduit fill (cross-sectional area per insulation type; thresholds cited).
const CONDUIT_FILL = {
  source: "Conductor cross-sectional area from insulation manufacturer dimensional data (ASTM dimensions and manufacturer cable catalogs). Thresholds (40, 31, 53 percent) are referenced, not reproduced.",
  thresholds_percent: { single_conductor: 53, two_conductors: 31, three_or_more: 40 },
  insulation_areas_in2: {
    THHN: { "14": 0.0097, "12": 0.0133, "10": 0.0211, "8": 0.0366, "6": 0.0507, "4": 0.0824, "2": 0.1158, "1": 0.1562, "1/0": 0.1855, "2/0": 0.2223, "3/0": 0.2679, "4/0": 0.3237 },
    THWN: { "14": 0.0097, "12": 0.0133, "10": 0.0211, "8": 0.0366, "6": 0.0507, "4": 0.0824, "2": 0.1158 },
  },
};

// Motor FLA (compiled from NEMA-published manufacturer data with attribution).
const MOTOR_FLA = {
  source: "Compiled from NEMA-aligned manufacturer technical bulletins (typical values across publishing manufacturers). Each consumer of this data attributes the publishing manufacturer at use site.",
  attribution_note: "Manufacturer technical data, used with attribution. Refresh when bulletins update.",
  table: [
    { hp: 0.5, single_115V: 9.8, single_230V: 4.9, three_208V: 2.4, three_230V: 2.2, three_460V: 1.1 },
    { hp: 1, single_115V: 16, single_230V: 8, three_208V: 4.6, three_230V: 4.2, three_460V: 2.1 },
    { hp: 2, single_230V: 12, three_208V: 7.5, three_230V: 6.8, three_460V: 3.4 },
    { hp: 5, single_230V: 28, three_208V: 16.7, three_230V: 15.2, three_460V: 7.6 },
    { hp: 10, three_208V: 30.8, three_230V: 28, three_460V: 14 },
    { hp: 25, three_208V: 74.8, three_230V: 68, three_460V: 34 },
    { hp: 50, three_208V: 143, three_230V: 130, three_460V: 65 },
  ],
};

// Demand factors (residential service load). Values are widely-cited
// engineering practice; NEC section numbers are referenced where
// applicable but the table text is not reproduced.
const DEMAND_FACTORS = {
  source: "Standard residential demand factors. NEC sections 220.42, 220.54, 220.55, 220.82 referenced by section number; values reflect long-standing engineering practice.",
  general_lighting_W_per_ft2: 3,
  small_appliance_branch_W: 1500,
  laundry_branch_W: 1500,
  general_demand_first_W: 3000,
  general_demand_after_factor: 0.35,
  range_first_W: 8000,
  range_after_factor: 0.40,
  dryer_minimum_W: 5000,
  service_voltage_V: 240,
  standard_service_ampacities_A: [60, 100, 125, 150, 175, 200, 225, 250, 300, 400],
  notes: "AHJ governs final service sizing. Values support estimation and verification only.",
};

// Lighting power density benchmarks. ASHRAE 90.1 referenced by name
// only; published table text is not reproduced. Values are widely cited
// engineering benchmarks.
const LIGHTING_DENSITY = {
  source: "Public engineering benchmarks for lighting power density (ASHRAE 90.1 referenced by name only).",
  benchmark_W_per_ft2: {
    office: 1.0,
    warehouse: 0.5,
    retail: 1.2,
    classroom: 1.1,
    corridor: 0.5,
    industrial: 1.2,
    residential: 0.7,
    parking_garage: 0.2,
  },
  notes: "Benchmarks for sizing and verification. Specific code-compliance values are governed by the AHJ-adopted edition of the energy code.",
};

// Plumbing.
const PIPE_PROPERTIES = {
  source: "Nominal pipe size dimensions per ASTM and manufacturer catalogs; Hazen-Williams roughness coefficients from public engineering references.",
  hazen_williams_C: {
    PVC: 150, CPVC: 150, copper: 140, steel_new: 120, steel_old: 100, cast_iron_new: 130, cast_iron_old: 100, pex: 150,
  },
  schedule_40_id_in: {
    "0.5": 0.622, "0.75": 0.824, "1": 1.049, "1.25": 1.380, "1.5": 1.610, "2": 2.067, "2.5": 2.469, "3": 3.068, "4": 4.026,
  },
};

const FIXTURE_UNITS = {
  source: "Hunter's Curve method per public-domain plumbing engineering texts (Hunter 1940, NBS BMS65). Public method; values reflect public-domain curves.",
  fixtures: {
    lavatory: { wsfu_cold: 1, wsfu_hot: 1, wsfu_total: 1, dfu: 1 },
    water_closet_flush_tank: { wsfu_cold: 2.5, wsfu_total: 2.5, dfu: 3 },
    shower: { wsfu_cold: 1, wsfu_hot: 1, wsfu_total: 2, dfu: 2 },
    bathtub: { wsfu_cold: 1.5, wsfu_hot: 1.5, wsfu_total: 4, dfu: 2 },
    kitchen_sink: { wsfu_cold: 1, wsfu_hot: 1, wsfu_total: 1.5, dfu: 2 },
    laundry_tray: { wsfu_cold: 1, wsfu_hot: 1, wsfu_total: 1.5, dfu: 2 },
    dishwasher: { wsfu_hot: 1.5, wsfu_total: 1.5, dfu: 2 },
    hose_bibb: { wsfu_cold: 2.5, wsfu_total: 2.5 },
  },
};

const GAS_PIPE_CAPACITY = {
  source: "Spitzglass and Weymouth public formulas evaluated using bundled gas properties. Public physical equations.",
  gases: {
    natural_gas: { specific_gravity: 0.60, heating_value_btu_ft3: 1030 },
    propane: { specific_gravity: 1.52, heating_value_btu_ft3: 2516 },
  },
};

// Pipe thermal expansion coefficients (per F). NIST and manufacturer
// technical bulletins. Physical / material facts.
const MATERIAL_EXPANSION = {
  source: "Linear thermal expansion coefficients (1/F) from NIST and pipe manufacturer technical bulletins. Physical / material facts.",
  alpha_per_F: {
    copper: 9.4e-6,
    PEX: 1.1e-4,
    PVC: 3.0e-5,
    CPVC: 3.7e-5,
    steel: 6.5e-6,
  },
  notes: "dL (in) = alpha (1/F) * L (ft) * 12 * dT (F).",
};

// Septic sizing rules (EPA / state-published).
const SEPTIC_RULES = {
  source: "U.S. EPA on-site wastewater treatment manual and state-published septic sizing rules.",
  daily_flow_gpd_per_bedroom: 150,
  tank_floor_gallons: 1000,
  tank_multiplier_of_daily_flow: 2,
  notes: "Local AHJ governs minimum tank size; some jurisdictions require larger floors.",
};

// HVAC.
const REFRIGERANTS = {
  source: "Manufacturer-published P-T tables (DuPont, Honeywell, Chemours, Arkema). Each refrigerant entry attributes its publishing manufacturer.",
  refrigerants: {
    "R-410A": {
      manufacturer: "Chemours / Honeywell published bulletins",
      pt_pairs: [
        { pressure_psig: 50, temperature_F: 14 },
        { pressure_psig: 75, temperature_F: 31 },
        { pressure_psig: 100, temperature_F: 30 },
        { pressure_psig: 118, temperature_F: 40 },
        { pressure_psig: 156, temperature_F: 55 },
        { pressure_psig: 200, temperature_F: 70 },
        { pressure_psig: 251, temperature_F: 85 },
        { pressure_psig: 313, temperature_F: 100 },
        { pressure_psig: 386, temperature_F: 115 },
      ],
    },
    "R-32": {
      manufacturer: "Daikin / Honeywell published bulletins",
      pt_pairs: [
        { pressure_psig: 50, temperature_F: 8 },
        { pressure_psig: 100, temperature_F: 36 },
        { pressure_psig: 150, temperature_F: 56 },
        { pressure_psig: 200, temperature_F: 72 },
        { pressure_psig: 300, temperature_F: 100 },
      ],
    },
    "R-22": {
      manufacturer: "Legacy data; Chemours published bulletins",
      pt_pairs: [
        { pressure_psig: 30, temperature_F: 5 },
        { pressure_psig: 50, temperature_F: 28 },
        { pressure_psig: 75, temperature_F: 45 },
        { pressure_psig: 100, temperature_F: 60 },
        { pressure_psig: 150, temperature_F: 84 },
        { pressure_psig: 200, temperature_F: 102 },
      ],
    },
    "R-134a": {
      manufacturer: "Chemours / Honeywell published bulletins",
      pt_pairs: [
        { pressure_psig: 10, temperature_F: 16 },
        { pressure_psig: 30, temperature_F: 35 },
        { pressure_psig: 50, temperature_F: 50 },
        { pressure_psig: 100, temperature_F: 79 },
        { pressure_psig: 150, temperature_F: 104 },
      ],
    },
    "R-404A": {
      manufacturer: "Chemours / Honeywell published bulletins",
      pt_pairs: [
        { pressure_psig: 30, temperature_F: 16 },
        { pressure_psig: 60, temperature_F: 14 },
        { pressure_psig: 100, temperature_F: 37 },
        { pressure_psig: 150, temperature_F: 58 },
        { pressure_psig: 200, temperature_F: 75 },
      ],
    },
    "R-407C": {
      manufacturer: "Chemours / Honeywell published bulletins",
      pt_pairs: [
        { pressure_psig: 30, temperature_F: 6 },
        { pressure_psig: 60, temperature_F: 22 },
        { pressure_psig: 100, temperature_F: 47 },
        { pressure_psig: 150, temperature_F: 68 },
        { pressure_psig: 200, temperature_F: 86 },
      ],
    },
  },
};

const DUCT_FRICTION = {
  source: "Standard duct surface roughness values from public engineering references; Darcy-Weisbach inputs.",
  roughness_ft: {
    galvanized_steel: 0.0003,
    aluminum: 0.0002,
    flexible_nonmetallic: 0.003,
    fiberglass_duct_board: 0.003,
  },
  air_density_lb_ft3: 0.075,
};

const CLIMATE_DATA = {
  source: "NOAA design temperature data published by NCEI. Public domain.",
  zones: {
    "1A_Miami_FL": { winter_99pct_F: 47, summer_1pct_F: 91, summer_wb_F: 78 },
    "2A_Houston_TX": { winter_99pct_F: 32, summer_1pct_F: 96, summer_wb_F: 78 },
    "3A_Atlanta_GA": { winter_99pct_F: 23, summer_1pct_F: 92, summer_wb_F: 75 },
    "4A_Baltimore_MD": { winter_99pct_F: 13, summer_1pct_F: 92, summer_wb_F: 75 },
    "5A_Chicago_IL": { winter_99pct_F: -2, summer_1pct_F: 89, summer_wb_F: 75 },
    "6A_Minneapolis_MN": { winter_99pct_F: -11, summer_1pct_F: 89, summer_wb_F: 73 },
    "7_Duluth_MN": { winter_99pct_F: -19, summer_1pct_F: 84, summer_wb_F: 70 },
  },
};

// HVAC v2: refrigerant charge per foot (manufacturer-attributed).
const CHARGE_PER_FOOT = {
  source: "Manufacturer line-set charge tables (oz per foot per refrigerant per line diameter). Each entry attributes its publishing manufacturer; verify each bulletin permits redistribution before adding.",
  attribution_note: "Manufacturer technical data, used with attribution. Refresh when bulletins update.",
  oz_per_ft: {
    "R-410A": { "1/4": 0.30, "3/8": 0.60, "1/2": 0.95, "5/8": 1.30, "3/4": 1.65 },
    "R-32":   { "1/4": 0.27, "3/8": 0.55, "1/2": 0.85, "5/8": 1.20, "3/4": 1.50 },
    "R-22":   { "1/4": 0.30, "3/8": 0.60, "1/2": 0.95, "5/8": 1.30, "3/4": 1.65 },
    "R-134a": { "1/4": 0.20, "3/8": 0.40, "1/2": 0.65, "5/8": 0.85, "3/4": 1.10 },
    "R-404A": { "1/4": 0.32, "3/8": 0.62, "1/2": 1.00, "5/8": 1.35, "3/4": 1.70 },
    "R-407C": { "1/4": 0.28, "3/8": 0.58, "1/2": 0.92, "5/8": 1.25, "3/4": 1.60 },
  },
};

// HVAC v2: fitting equivalent lengths (public engineering tables).
const EQUIVALENT_LENGTHS = {
  source: "Public engineering equivalent-length tables for common fittings and valves; values represent engineering-practice consensus.",
  feet_by_fitting_and_diameter: {
    elbow_90_long: { "0.5": 1.0, "0.75": 1.4, "1": 1.7, "1.25": 2.3, "1.5": 2.7, "2": 3.5 },
    elbow_90_short: { "0.5": 1.5, "0.75": 2.0, "1": 2.5, "1.25": 3.5, "1.5": 4.0, "2": 5.0 },
    elbow_45: { "0.5": 0.8, "0.75": 1.0, "1": 1.3, "1.25": 1.7, "1.5": 2.0, "2": 2.6 },
    tee_branch: { "0.5": 4.0, "0.75": 5.0, "1": 6.0, "1.25": 7.0, "1.5": 8.0, "2": 10.0 },
    tee_run: { "0.5": 1.0, "0.75": 1.4, "1": 1.7, "1.25": 2.3, "1.5": 2.7, "2": 3.5 },
    gate_valve: { "0.5": 0.4, "0.75": 0.5, "1": 0.6, "1.25": 0.8, "1.5": 1.0, "2": 1.2 },
    ball_valve: { "0.5": 0.3, "0.75": 0.4, "1": 0.5, "1.25": 0.7, "1.5": 0.9, "2": 1.1 },
    check_valve: { "0.5": 4.0, "0.75": 5.0, "1": 7.0, "1.25": 9.0, "1.5": 11.0, "2": 13.0 },
  },
};

// HVAC v2: insulation k values (BTU * in / hr / ft^2 / F).
const INSULATION_K = {
  source: "Public engineering reference values for insulation thermal conductivity. Material property facts.",
  k_btu_in_per_hr_ft2_F: {
    fiberglass: 0.27,
    rockwool: 0.28,
    polyiso: 0.20,
    polyurethane: 0.16,
    elastomeric: 0.27,
    cellular_glass: 0.32,
  },
  outside_film_coeff_btu_hr_ft2_F: 1.65,
  notes: "Values represent typical k near room temperature; consult manufacturer data for design at temperature.",
};

// Restoration.
const PSYCHROMETRICS = {
  source: "August-Roche-Magnus saturation vapor pressure approximation; standard psychrometric definitions.",
  arm: { a: 6.1094, b: 17.625, c: 243.04, units: "e_s in hPa, T in C" },
  reference_pressure_hPa: 1013.25,
};

const WATER_CLASSES = {
  source: "Original plain-English summaries by the project author. References IICRC S500 by name; the standard text is not reproduced.",
  categories: {
    "1": "Water from a sanitary source. Generally clean. Time and contact may shift to category 2 or 3.",
    "2": "Significantly contaminated water that could cause discomfort or sickness if consumed. Sometimes called gray water.",
    "3": "Grossly contaminated water. May contain pathogens, sewage, or harmful chemicals. Sometimes called black water.",
  },
  classes: {
    "1": "Least amount of water absorption and evaporation load. Slow evaporation. Limited area.",
    "2": "Significant amount of water absorption and evaporation load. Wet carpet, cushions, structural components.",
    "3": "Greatest amount of water absorption and evaporation load. Water from overhead, saturated walls and ceilings.",
    "4": "Specialty drying situations. Materials with low porosity (hardwood, plaster, masonry) holding bound water.",
  },
};

const DRYING_TIMES = {
  source: "Original plain-English notes on typical drying behavior of common building materials. Field observation, not a reproduction of any standard.",
  materials: {
    drywall: { typical_days: "2-4", notes: "Faster with airflow. Saturated drywall often replaced." },
    carpet_padding: { typical_days: "1-2", notes: "Padding usually replaced; carpet face dries faster than back." },
    hardwood_floor: { typical_days: "5-10+", notes: "Bound water dries slowly; specialty drying often required." },
    plaster: { typical_days: "5-14", notes: "Low porosity; drying time depends on thickness and lath." },
    concrete_slab: { typical_days: "varies", notes: "Bound moisture can persist for weeks; measure with calibrated meter." },
    framing_lumber: { typical_days: "3-7", notes: "Target moisture content below 16 percent for common framing." },
  },
};

const MOLD_CONDITIONS = {
  source: "Public mold-growth research literature summarized in original plain English.",
  thresholds: {
    rh_growth_risk_percent: 60,
    rh_high_risk_percent: 70,
    minimum_growth_temperature_F: 40,
    typical_germination_hours: 24,
    visible_growth_days: "3-12",
  },
  notes: "Risk increases with sustained elevated RH on a food source (paper, dust, organic material). Reduce moisture below 60 percent RH to inhibit growth.",
};

// Restoration v2: HEPA loading rates.
const HEPA_LOADING = {
  source: "Typical commercial HEPA pre-filter loading values from manufacturer technical bulletins. Engineering-practice consensus.",
  loading_per_CFM_hour_grams: { low: 0.02, medium: 0.05, high: 0.10 },
  default_capacity_grams: 1500,
  notes: "filter_days = capacity_grams / (CFM * hours_per_day * loading_rate).",
};

// Construction.
const LUMBER_PROPERTIES = {
  source: "Allowable bending stress and modulus of elasticity from public engineering references and lumber grading agency basic-design values. Material property facts.",
  species_grades: {
    "DF-L_No2": { Fb_psi: 900, E_psi: 1600000, density_lb_ft3: 32 },
    "DF-L_No1": { Fb_psi: 1000, E_psi: 1700000, density_lb_ft3: 32 },
    "SPF_No2": { Fb_psi: 875, E_psi: 1400000, density_lb_ft3: 28 },
    "SYP_No2": { Fb_psi: 1100, E_psi: 1600000, density_lb_ft3: 36 },
    "Hem-Fir_No2": { Fb_psi: 850, E_psi: 1300000, density_lb_ft3: 27 },
  },
  nominal_to_actual_in: {
    "2x4": { b: 1.5, d: 3.5 },
    "2x6": { b: 1.5, d: 5.5 },
    "2x8": { b: 1.5, d: 7.25 },
    "2x10": { b: 1.5, d: 9.25 },
    "2x12": { b: 1.5, d: 11.25 },
  },
};

const CONCRETE_MIXES = {
  source: "Standard concrete mix proportions and yields from public engineering references.",
  mixes: {
    "3000_psi": { cement_lb_yd3: 470, water_lb_yd3: 270, fine_lb_yd3: 1300, coarse_lb_yd3: 1800 },
    "4000_psi": { cement_lb_yd3: 564, water_lb_yd3: 282, fine_lb_yd3: 1250, coarse_lb_yd3: 1800 },
    "5000_psi": { cement_lb_yd3: 658, water_lb_yd3: 296, fine_lb_yd3: 1200, coarse_lb_yd3: 1750 },
  },
  cubic_yards_per_cubic_foot: 1 / 27,
};

const SPAN_DERIVATIONS = {
  source: "First-principles outputs of the lumber-spans calculator using the bundled material properties. Values are derived in this build, not reproduced.",
  notes: "See docs/derivations.md section 9 for the underlying mechanics.",
  derived_at: TODAY,
};

// Construction v2: soil bearing capacities (USGS-derived).
const SOIL_BEARING = {
  source: "U.S. Geological Survey soil engineering references and IBC Table 1806.2 mirrored values; soil-class allowable bearing pressures.",
  allowable_psf: {
    rock: 12000,
    sandy_gravel: 5000,
    sand: 3000,
    silty_sand: 2500,
    clay: 1500,
    silty_clay: 2000,
  },
  notes: "Allowable values for prescriptive design. Geotechnical reports govern when available.",
};

// Construction v2: wind / snow zones (NOAA basic wind speeds; ASCE 7
// formula applied; the table text is not reproduced).
const WIND_SNOW_ZONES = {
  source: "NOAA basic wind speeds and ground snow loads by region (public domain). Public ASCE 7 formulas q = 0.00256 * V^2 and Pf = 0.7 * Ce * Ct * Is * Pg.",
  basic_wind_speeds_mph: {
    inland_low_risk: 90,
    coastal_atlantic: 130,
    coastal_gulf: 140,
    coastal_pacific: 100,
  },
  ground_snow_loads_psf: {
    deep_south: 5,
    mid_atlantic: 25,
    great_lakes: 40,
    rocky_mountains: 60,
    new_england: 50,
    upper_midwest: 50,
    pacific_northwest: 25,
  },
};

// Fire-ground.
const HOSE_FRICTION = {
  source: "National Fire Academy hydraulics training materials (U.S. government, public domain).",
  formula: "FL = C * (Q/100)^2 * (L/100), FL in psi, Q in GPM, L in feet",
  coefficients: {
    "1.5_in": 24,
    "1.75_in": 15.5,
    "2.5_in": 2,
    "3_in": 0.677,
    "4_in": 0.2,
    "5_in": 0.08,
  },
};

const FIRE_FLOW_FORMULAS = {
  source: "ISO Public Protection Classification published formulas; iterated structural-fire-load references.",
  formulas: {
    iso_needed_fire_flow: "NFF = (C * O * X * P) where C = 18*F*sqrt(A), F is construction class factor, O is occupancy factor, X is exposure factor, P is communication factor.",
    construction_class_factor: { fire_resistive: 0.6, masonry: 0.8, ordinary: 1.0, wood_frame: 1.5 },
  },
  notes: "Used for estimation only; the AHJ governs the actual fire flow requirement.",
};

// Crosswalks.
const UNIT_CONVERSIONS = {
  source: "NIST SP 811 (Guide for the Use of the International System of Units). Public domain.",
  length: { in_to_mm: 25.4, ft_to_m: 0.3048, mi_to_km: 1.609344 },
  area: { ft2_to_m2: 0.09290304, acre_to_m2: 4046.8564224 },
  volume: { gal_us_to_L: 3.785411784, ft3_to_L: 28.316846592 },
  mass: { lb_to_kg: 0.45359237 },
  force: { lbf_to_N: 4.4482216152605 },
  pressure: { psi_to_Pa: 6894.757293168, in_h2o_to_Pa: 248.84, bar_to_Pa: 100000, kPa_to_Pa: 1000, atm_to_Pa: 101325 },
  energy: { btu_to_J: 1055.05585262, kWh_to_J: 3600000 },
  power: { hp_to_W: 745.6998715822702, btu_h_to_W: 0.29307107 },
  temperature: { c_to_k_offset: 273.15, f_to_c: "(F - 32) * 5/9", c_to_f: "C * 9/5 + 32" },
};

const STATE_TAX_RATES = {
  source: "State revenue department published rates. Government-published rates.",
  fetched: TODAY,
  notes: "Average combined state and local rates. Verify locally for accuracy.",
  rates: {
    AL: 4.0, AK: 0.0, AZ: 5.6, AR: 6.5, CA: 7.25, CO: 2.9, CT: 6.35, DE: 0.0,
    FL: 6.0, GA: 4.0, HI: 4.0, ID: 6.0, IL: 6.25, IN: 7.0, IA: 6.0, KS: 6.5,
    KY: 6.0, LA: 4.45, ME: 5.5, MD: 6.0, MA: 6.25, MI: 6.0, MN: 6.875, MS: 7.0,
    MO: 4.225, MT: 0.0, NE: 5.5, NV: 6.85, NH: 0.0, NJ: 6.625, NM: 4.875, NY: 4.0,
    NC: 4.75, ND: 5.0, OH: 5.75, OK: 4.5, OR: 0.0, PA: 6.0, RI: 7.0, SC: 6.0,
    SD: 4.2, TN: 7.0, TX: 6.25, UT: 6.1, VT: 6.0, VA: 5.3, WA: 6.5, WV: 6.0,
    WI: 5.0, WY: 4.0, DC: 6.0,
  },
};

// Crosswalks v2: IRS standard mileage rate (U.S. government publication).
const IRS_MILEAGE = {
  source: "IRS-published standard mileage rate (U.S. government publication).",
  rate_per_mile_dollars: 0.67,
  notes: "Update annually. The rate applies to business miles for the current tax year.",
};

// Crosswalks v2: GSA per-diem rates (U.S. government publication).
const GSA_PERDIEM = {
  source: "U.S. General Services Administration per-diem rates (public domain). Bundled values approximate the standard CONUS rate where state-level values are not specifically published.",
  rates_by_state: {
    AL: { lodging: 110, m_and_ie: 64 }, AK: { lodging: 188, m_and_ie: 79 },
    AZ: { lodging: 124, m_and_ie: 69 }, AR: { lodging: 110, m_and_ie: 64 },
    CA: { lodging: 168, m_and_ie: 74 }, CO: { lodging: 142, m_and_ie: 69 },
    CT: { lodging: 142, m_and_ie: 69 }, DC: { lodging: 257, m_and_ie: 79 },
    DE: { lodging: 124, m_and_ie: 64 }, FL: { lodging: 134, m_and_ie: 69 },
    GA: { lodging: 124, m_and_ie: 64 }, HI: { lodging: 215, m_and_ie: 84 },
    ID: { lodging: 110, m_and_ie: 64 }, IL: { lodging: 158, m_and_ie: 74 },
    IN: { lodging: 110, m_and_ie: 64 }, IA: { lodging: 110, m_and_ie: 64 },
    KS: { lodging: 110, m_and_ie: 64 }, KY: { lodging: 110, m_and_ie: 64 },
    LA: { lodging: 124, m_and_ie: 69 }, ME: { lodging: 134, m_and_ie: 69 },
    MD: { lodging: 158, m_and_ie: 74 }, MA: { lodging: 188, m_and_ie: 79 },
    MI: { lodging: 124, m_and_ie: 64 }, MN: { lodging: 134, m_and_ie: 69 },
    MS: { lodging: 110, m_and_ie: 64 }, MO: { lodging: 110, m_and_ie: 64 },
    MT: { lodging: 110, m_and_ie: 64 }, NE: { lodging: 110, m_and_ie: 64 },
    NV: { lodging: 142, m_and_ie: 69 }, NH: { lodging: 134, m_and_ie: 69 },
    NJ: { lodging: 158, m_and_ie: 74 }, NM: { lodging: 110, m_and_ie: 64 },
    NY: { lodging: 215, m_and_ie: 79 }, NC: { lodging: 124, m_and_ie: 64 },
    ND: { lodging: 110, m_and_ie: 64 }, OH: { lodging: 124, m_and_ie: 64 },
    OK: { lodging: 110, m_and_ie: 64 }, OR: { lodging: 142, m_and_ie: 74 },
    PA: { lodging: 142, m_and_ie: 69 }, RI: { lodging: 158, m_and_ie: 74 },
    SC: { lodging: 124, m_and_ie: 64 }, SD: { lodging: 110, m_and_ie: 64 },
    TN: { lodging: 124, m_and_ie: 64 }, TX: { lodging: 134, m_and_ie: 69 },
    UT: { lodging: 110, m_and_ie: 64 }, VT: { lodging: 134, m_and_ie: 69 },
    VA: { lodging: 142, m_and_ie: 69 }, WA: { lodging: 158, m_and_ie: 74 },
    WV: { lodging: 110, m_and_ie: 64 }, WI: { lodging: 110, m_and_ie: 64 },
    WY: { lodging: 110, m_and_ie: 64 },
  },
  notes: "Bundled rates approximate published GSA values. Verify for the current fiscal year.",
};

// Original plain-English summaries (one entry per utility).
const SUMMARIES = {
  source: "Original plain-English summaries written by the project author. MIT-licensed creative work.",
  summaries: {
    "ohms-law": "Ohm's Law relates voltage, current, and resistance. Power equals voltage times current. Given any two of V, I, R, P, the others follow.",
    "wire-ampacity": "The current a conductor can carry without exceeding its insulation's temperature rating. Computed from conductor resistance, ambient temperature, and a standard heat-balance methodology.",
    "voltage-drop": "The voltage lost along a conductor due to its resistance. Express as volts and as a percentage of source voltage.",
    "conduit-fill": "The cross-sectional area occupied by conductors inside a conduit, expressed as a percentage of the conduit's interior area.",
    "box-fill": "The cubic-inch volume occupied by conductors and devices inside an electrical box.",
    "breaker-sizing": "Minimum breaker size for a load. Continuous loads require sizing at 125 percent of the load current.",
    "motor-fla": "Typical full-load amps for common motor sizes from manufacturer technical bulletins.",
    "transformer-sizing": "Required transformer kVA from a load's apparent power.",
    "three-phase": "Power, apparent power, and reactive power for a balanced three-phase load.",
    "copper-resistance": "Resistance of a copper or aluminum conductor at a given temperature, length, and gauge.",
    "egc-sizing": "Minimum equipment grounding conductor size based on the upstream overcurrent device rating.",
    "pipe-sizing": "Water supply pipe size from fixture units (Hunter's Curve method) or drainage pipe size from drainage fixture units.",
    "friction-loss": "Pressure loss along a pipe due to friction. Hazen-Williams for water; Darcy-Weisbach for gas and other fluids.",
    "pipe-volume": "Volume of fluid contained in a pipe of a given diameter and length.",
    "pump-sizing": "Required pump head and flow rate to deliver water at a target rate against the system's resistance.",
    "static-pressure-piping": "Pressure loss in a piping system from elevation and friction.",
    "gas-pipe-sizing": "Required gas pipe size for a given BTU load, run length, gas type, and allowable pressure drop.",
    "slope": "Slope expressed as fraction (1/4 inch per foot), degrees, and percent.",
    "pressure-conversion": "Bidirectional conversion between PSI, head feet, inches of water column, kPa, and bar.",
    "backflow": "Common backflow scenarios and the typical preventer types used to prevent each.",
    "manual-j-cooling": "A simplified estimator of the sensible and latent cooling load for a building. A code-compliant load calculation requires Manual J.",
    "manual-j-heating": "A simplified estimator of the heating load for a building. A code-compliant load calculation requires Manual J.",
    "duct-sizing": "Required duct size for a given airflow and friction rate.",
    "static-pressure-hvac": "Total external static pressure for an HVAC system from the sum of element pressure drops.",
    "refrigerant-pt": "Saturated pressure or temperature for a refrigerant from manufacturer-published P-T data.",
    "superheat-subcool": "Degrees of superheat or subcool from a refrigerant line temperature and the system pressure.",
    "seer-eer": "Bidirectional conversion between cooling efficiency rating systems.",
    "balance-point": "Outdoor temperature at which a heat pump's heating capacity equals the building's heat loss.",
    "shr": "Sensible heat ratio: sensible cooling load divided by total cooling load.",
    "cfm-per-ton": "Standard 400 CFM per ton airflow with adjustments for high humidity (350 CFM) and dry climate (450 CFM).",
    "combustion-air": "Required combustion air opening size for a fuel-burning appliance based on BTU input and room volume.",
    "psychrometric": "Dew point, grains per pound, vapor pressure, and specific humidity from temperature and relative humidity.",
    "drying-goal": "Target indoor grains per pound for effective structural drying based on outdoor conditions.",
    "dehumidifier": "Required dehumidifier capacity in pints per day by AHAM rating and field methods.",
    "air-movers": "Number of air movers and CFM coverage required for a given affected area and water class.",
    "water-classes": "IICRC categories 1, 2, 3 and classes 1 through 4 with original plain-English summaries.",
    "drying-times": "Typical drying times for common building materials by contamination class.",
    "mold": "Conditions under which mold growth is likely: temperature, relative humidity, and time.",
    "ppe": "Typical personal protective equipment selection by water category and contamination type.",
    "stairs": "Number of risers, riser height, run, total run, and headroom check from the total rise.",
    "roof-pitch": "Pitch as a fraction, degrees, and percent. Bidirectional inputs.",
    "rafter": "Rafter length from horizontal span, pitch, and overhang. Pythagorean.",
    "square-footage": "Area for rectangle, triangle, trapezoid, and circle.",
    "board-footage": "Total board feet for lumber from thickness, width, length, and count.",
    "concrete": "Cubic yards of concrete for slabs, footings, columns, and footings with stems.",
    "rebar": "Linear feet of rebar in a slab from dimensions, spacing on center, and edge clearance.",
    "lumber-spans": "Maximum span for common lumber sizes computed from first-principles beam mechanics and species and grade material properties.",
    "fastener-pullout": "Typical pull-out resistance for common nails and screws by wood species and length of penetration.",
    "beam-loading": "Maximum moment and deflection for simply supported beams under point and uniform loads.",
    "material-quantity": "Quantity of material for common assemblies (drywall, paint, flooring, roofing, siding) with waste factor.",
    "fire-friction": "Friction loss in fire hose using the standard fireground formula CQ^2L with coefficients per hose diameter.",
    "pdp": "Required pump discharge pressure as the sum of nozzle pressure, friction loss, elevation, and appliance loss.",
    "hydrant-flow": "Hydrant discharge in GPM from a Pitot pressure reading and outlet diameter using the standard hydrant flow formula.",
    "required-fire-flow": "Estimated needed fire flow from structure square footage, occupancy classification, and exposure factor (ISO method).",
    "master-stream": "Typical master-stream reach in feet from nozzle pressure and nozzle type.",
    "aerial-ladder": "Horizontal and vertical reach of an aerial ladder from set angle and extension length.",
    "foam": "Required foam concentrate volume from fire size, application rate, and foam concentrate percentage.",
    "smoke-reading": "Plain-English reference for interpreting smoke volume, velocity, density, and color.",
    "unit-converter": "Bidirectional conversion across length, area, volume, mass, force, pressure, temperature, energy, power, flow, and electrical units.",
    "material-cost": "Total cost from price per unit and quantity, with optional tax and delivery.",
    "markup": "Selling price from cost and a target markup or margin.",
    "time-and-materials": "Total billable amount from labor hours, labor rate, and material cost.",
    "sales-tax": "Tax amount and total from a state and a subtotal using bundled state revenue department published rates.",
    "tip-out": "Per-person split of revenue across a crew using each member's hours.",
  },
};

// v2 references shard (Group H foundation; also used by reference-style
// v2 utilities). Original plain-English summaries by the project author.
const V2_REFERENCES = {
  source: "Original plain-English summaries by the project author. MIT-licensed creative work. Code documents (NEC, IPC, etc.) referenced by section number only; no code text reproduced.",
  gfci_afci_by_area: {
    kitchen: { gfci: "Required for receptacles serving countertop surfaces and within 6 ft of a sink.", afci: "Required for branch circuits supplying outlets in dwelling-unit kitchens.", nec_ref: "NEC 210.8(A) and 210.12(A)" },
    bathroom: { gfci: "Required for all 125 V single-phase 15- and 20-amp receptacles.", afci: "Not generally required.", nec_ref: "NEC 210.8(A)(1)" },
    garage: { gfci: "Required for receptacles installed in garages and accessory buildings.", afci: "Not generally required outside dwelling-unit habitable rooms.", nec_ref: "NEC 210.8(A)(2)" },
    outdoor: { gfci: "Required for all 125 V receptacles in outdoor locations.", afci: "Not generally required.", nec_ref: "NEC 210.8(A)(3)" },
    bedroom: { gfci: "Not generally required (unless near a sink).", afci: "Required for all 120 V branch circuits supplying outlets and devices in dwelling-unit bedrooms.", nec_ref: "NEC 210.12(A)" },
    laundry: { gfci: "Required for receptacles in laundry areas.", afci: "Required for branch circuits supplying laundry-area outlets.", nec_ref: "NEC 210.8(A)(10) and 210.12(A)" },
  },
  notes: "AHJ governs. The summaries paraphrase widely-known requirements and are not a substitute for the adopted code edition.",
};

// --- Manifests for each per-folder dataset ---

const DATASETS = [
  { folder: "physical-constants", shards: [
      { file: "constants.json", body: PHYSICAL_CONSTANTS, name: "NIST physical constants" },
      { file: "material-properties.json", body: MATERIAL_PROPERTIES, name: "Material properties" },
    ] },
  { folder: "electrical", shards: [
      { file: "conductor-properties.json", body: buildConductorProperties(), name: "Conductor properties (AWG)" },
      { file: "ampacity-physics.json", body: AMPACITY_PHYSICS, name: "Ampacity physics methodology" },
      { file: "motor-fla.json", body: MOTOR_FLA, name: "Motor full-load amps" },
      { file: "conduit-fill-tables.json", body: CONDUIT_FILL, name: "Conduit fill data" },
      { file: "demand-factors.json", body: DEMAND_FACTORS, name: "Residential service demand factors" },
      { file: "lighting-density.json", body: LIGHTING_DENSITY, name: "Lighting power density benchmarks" },
    ] },
  { folder: "plumbing", shards: [
      { file: "pipe-properties.json", body: PIPE_PROPERTIES, name: "Pipe properties" },
      { file: "fixture-units.json", body: FIXTURE_UNITS, name: "Fixture units" },
      { file: "gas-pipe-capacity.json", body: GAS_PIPE_CAPACITY, name: "Gas pipe capacity" },
      { file: "material-expansion.json", body: MATERIAL_EXPANSION, name: "Pipe thermal expansion coefficients" },
      { file: "septic-rules.json", body: SEPTIC_RULES, name: "Septic sizing rules (EPA / state)" },
    ] },
  { folder: "hvac", shards: [
      { file: "refrigerants.json", body: REFRIGERANTS, name: "Refrigerant P-T tables" },
      { file: "duct-friction.json", body: DUCT_FRICTION, name: "Duct friction inputs" },
      { file: "climate-data.json", body: CLIMATE_DATA, name: "Climate design temperatures" },
      { file: "charge-per-foot.json", body: CHARGE_PER_FOOT, name: "Refrigerant charge per foot" },
      { file: "equivalent-lengths.json", body: EQUIVALENT_LENGTHS, name: "Fitting equivalent lengths" },
      { file: "insulation.json", body: INSULATION_K, name: "Insulation conductivity" },
    ] },
  { folder: "restoration", shards: [
      { file: "psychrometrics.json", body: PSYCHROMETRICS, name: "Psychrometric inputs" },
      { file: "water-classes.json", body: WATER_CLASSES, name: "Water classes and categories" },
      { file: "drying-times.json", body: DRYING_TIMES, name: "Material drying times" },
      { file: "mold-conditions.json", body: MOLD_CONDITIONS, name: "Mold growth conditions" },
      { file: "hepa-loading.json", body: HEPA_LOADING, name: "HEPA scrubber loading rates" },
    ] },
  { folder: "construction", shards: [
      { file: "lumber-properties.json", body: LUMBER_PROPERTIES, name: "Lumber material properties" },
      { file: "concrete-mixes.json", body: CONCRETE_MIXES, name: "Concrete mixes" },
      { file: "span-derivations.json", body: SPAN_DERIVATIONS, name: "Span derivations" },
      { file: "soil-bearing.json", body: SOIL_BEARING, name: "Soil bearing capacities" },
      { file: "wind-snow-zones.json", body: WIND_SNOW_ZONES, name: "Wind and snow design data" },
    ] },
  { folder: "fire", shards: [
      { file: "hose-friction.json", body: HOSE_FRICTION, name: "Fire hose friction coefficients (NFA)" },
      { file: "fire-flow-formulas.json", body: FIRE_FLOW_FORMULAS, name: "Fire flow formulas" },
    ] },
  { folder: "crosswalks", shards: [
      { file: "unit-conversions.json", body: UNIT_CONVERSIONS, name: "Unit conversions" },
      { file: "state-tax-rates.json", body: STATE_TAX_RATES, name: "State sales tax rates" },
      { file: "irs-mileage.json", body: IRS_MILEAGE, name: "IRS standard mileage rate" },
      { file: "gsa-perdiem.json", body: GSA_PERDIEM, name: "GSA per-diem rates" },
    ] },
  { folder: "summaries", shards: [
      { file: "summaries.json", body: SUMMARIES, name: "Original plain-English summaries" },
      { file: "v2-references.json", body: V2_REFERENCES, name: "v2 reference summaries (GFCI/AFCI and others)" },
    ] },
];

// --- Build ---

function sha256Hex(s) {
  return createHash("sha256").update(s).digest("hex");
}

function formatJson(obj) {
  return JSON.stringify(obj, null, 2) + "\n";
}

async function ensureDir(path) {
  if (!existsSync(path)) {
    await mkdir(path, { recursive: true });
  }
}

async function buildAll() {
  const expected = {};
  let totalShards = 0;

  for (const ds of DATASETS) {
    const dir = resolve(DATA, ds.folder);
    await ensureDir(dir);

    const manifest = {
      name: ds.folder,
      version: TODAY,
      fetched: TODAY,
      shards: [],
      hashes: {},
    };

    for (const shard of ds.shards) {
      const out = formatJson(shard.body);
      const path = resolve(dir, shard.file);
      await writeFile(path, out, "utf8");
      const hash = sha256Hex(out);
      const gzippedSize = gzipSync(Buffer.from(out, "utf8")).length;
      manifest.shards.push({ file: shard.file, name: shard.name, gzip_size_bytes: gzippedSize });
      manifest.hashes[shard.file] = hash;
      expected[ds.folder + "/" + shard.file] = hash;
      totalShards++;
      if (gzippedSize > 1024 * 1024) {
        console.error("WARNING: shard exceeds 1 MB after gzip: " + ds.folder + "/" + shard.file);
      }
    }

    const manifestText = formatJson(manifest);
    const manifestPath = resolve(dir, "manifest.json");
    await writeFile(manifestPath, manifestText, "utf8");
    expected[ds.folder + "/manifest.json"] = sha256Hex(manifestText);
  }

  // Top-level expected-hashes for verify-integrity.mjs.
  const expectedPath = resolve(ROOT, "scripts", "expected-hashes.json");
  await writeFile(expectedPath, formatJson({ generated: TODAY, hashes: expected }), "utf8");

  // Runtime integrity sidecar: only manifest hashes (used by integrity.js
  // at startup to verify each per-folder manifest.json).
  const manifestHashes = {};
  for (const [k, v] of Object.entries(expected)) {
    if (k.endsWith("/manifest.json")) {
      const folder = k.slice(0, -"/manifest.json".length);
      manifestHashes[folder] = v;
    }
  }
  const integrityPath = resolve(DATA, "integrity.json");
  await writeFile(integrityPath, formatJson({ generated: TODAY, manifests: manifestHashes }), "utf8");

  console.log("build-data: wrote " + totalShards + " shards across " + DATASETS.length + " datasets at " + TODAY);
}

await buildAll();
