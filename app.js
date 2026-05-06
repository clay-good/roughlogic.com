// roughlogic application entry.
// Vanilla ES module. No dependencies. No innerHTML. No eval. No Function constructor.

// Calculator modules and their support libs are loaded on demand. Per
// spec section 11.1, the home view stays well under 100 KB by importing
// only what the home view needs (this module + integrity.js). Calculator
// renderers, hash-state, data-stamp, and pure-math come in dynamically
// when the user opens a tool.
import { verifyManifestIntegrity } from "./integrity.js";
import { parseHashRoute, toolMatches } from "./routing.js";

const RECENTS_CAP = 10;
function pushRecent(list, id) {
  const without = list.filter((x) => x !== id);
  without.unshift(id);
  return without.slice(0, RECENTS_CAP);
}

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
  ]);
  declare("./calc-plumbing.js", "PLUMBING_RENDERERS", [
    "pipe-sizing", "friction-loss", "pipe-volume", "pump-sizing",
    "static-pressure-piping", "gas-pipe-sizing", "slope",
    "pressure-conversion", "backflow",
    // v2
    "water-hammer-arrestor", "recirc-pump-head", "septic-tank", "trap-arm",
    "pipe-expansion", "tankless-gpm", "gas-leak-rate",
  ]);
  declare("./calc-hvac.js", "HVAC_RENDERERS", [
    "manual-j-cooling", "manual-j-heating", "duct-sizing",
    "static-pressure-hvac", "refrigerant-pt", "superheat-subcool",
    "seer-eer", "balance-point", "shr", "cfm-per-ton", "combustion-air",
    // v2
    "compare-refrigerants", "refrigerant-charge", "approach-delta-t",
    "outdoor-air-mix", "equivalent-length", "wet-bulb-psychrometer",
    "insulation-thickness", "evaporative-cooling",
  ]);
  declare("./calc-restoration.js", "RESTORATION_RENDERERS", [
    "psychrometric", "drying-goal", "dehumidifier", "air-movers",
    "water-classes", "drying-times", "mold", "ppe",
    // v2
    "standing-water", "nam-sizing", "hepa-filter-life", "thermal-delta-t",
  ]);
  declare("./calc-construction.js", "CONSTRUCTION_RENDERERS", [
    "stairs", "roof-pitch", "rafter", "square-footage", "board-footage",
    "concrete", "rebar", "lumber-spans", "fastener-pullout",
    "beam-loading", "material-quantity",
    // v2
    "stair-stringer", "joist-deflection", "footing-area", "tile-count",
    "paint-coverage", "excavation", "masonry-count", "wind-pressure",
    "snow-load", "anchor-embedment",
  ]);
  declare("./calc-fire.js", "FIRE_RENDERERS", [
    "fire-friction", "pdp", "hydrant-flow", "required-fire-flow",
    "master-stream", "aerial-ladder", "foam", "smoke-reading",
    // v2
    "reverse-lay-friction", "sprinkler-density", "standpipe-friction",
    "ladder-pipe-reach", "braking-distance",
  ]);
  declare("./calc-references.js", "REFERENCE_RENDERERS", [
    "color-codes", "knot-reference", "inspection-checklist",
    "emergency-contacts", "tool-maintenance",
  ]);
  declare("./calc-cross.js", "CROSS_RENDERERS", [
    "unit-converter", "material-cost", "markup", "time-and-materials",
    "sales-tax", "tip-out",
    // v2
    "loan-payment", "upgrade-roi", "mileage-cost", "overtime", "per-diem",
    "geometry", "dilution", "slope-from-level", "haversine",
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
};

const TRADES = ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"];
const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H"];

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
  { id: "septic-tank", name: "Septic Tank Sizing", group: "B", trades: ["plumbing"], desc: "Minimum tank gallons from bedrooms or daily flow." },
  { id: "trap-arm", name: "Trap Arm Length", group: "B", trades: ["plumbing"], desc: "Maximum trap arm length by pipe diameter and slope." },
  { id: "pipe-expansion", name: "Pipe Thermal Expansion", group: "B", trades: ["plumbing", "hvac"], desc: "Linear expansion (in) for copper, PEX, PVC, CPVC, steel." },
  { id: "tankless-gpm", name: "Tankless Water Heater GPM", group: "B", trades: ["plumbing"], desc: "Achievable flow from burner kBTU and inlet/outlet temperatures." },
  { id: "gas-leak-rate", name: "Gas Leak Rate (Orifice)", group: "B", trades: ["plumbing"], desc: "Estimated leak rate from orifice diameter and upstream pressure." },

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

  // Group H: Knowledge References (v2)
  { id: "color-codes", name: "Wire / Pipe / Gas Color Codes", group: "H", trades: ["electrical", "plumbing", "hvac"], desc: "NEC, IEC, gas piping, and ASME A13.1 conventions in plain English." },
  { id: "knot-reference", name: "Knot Reference", group: "H", trades: ["fire", "carpentry"], desc: "Common rigging and rescue knots with typical strength reduction." },
  { id: "inspection-checklist", name: "Inspection Prep Checklist", group: "H", trades: ["electrical", "plumbing", "hvac", "carpentry"], desc: "Per-trade rough-in and final inspection checklists." },
  { id: "emergency-contacts", name: "Utility Locator and Emergency Contacts", group: "H", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "811, poison control, OSHA, NRC, and 911 - universal US numbers." },
  { id: "tool-maintenance", name: "Tool Maintenance Intervals", group: "H", trades: ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire"], desc: "Maintenance schedule for common trades tools." },
];

const FIRE_GROUND_TRADE = "fire";

// Inline notices.
const NOTICE_DEFAULT = "This is a math aid for verification. Local codes, manufacturer specifications, and the authority having jurisdiction govern all installations and inspections.";
const NOTICE_FIRE = "This is a math aid for verification. Departmental SOPs and incident command govern all fireground operations.";

// Leader-key shortcut targets.
const SHORTCUTS = {
  h: { type: "home" },
  s: { type: "focus", target: "#search-input" },
  p: { type: "pinned" },
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
// trade/group filters are not in the DOM (only the search bar is). The
// filtering happens through `state.query` against tool name and desc.
// `routing.toolMatches` defaults the trade/group filters to "all" when
// the corresponding fields are absent, so we omit them from state.
const state = {
  query: "",
  pinned: [],
  recents: [],
  route: { view: "home", id: null, params: {} },
};

// Boot.
document.addEventListener("DOMContentLoaded", boot);

function boot() {
  parseHash();
  renderHome();
  bindSearch();
  bindShortcuts();
  bindClearPins();
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

function bindClearPins() {
  const btn = document.getElementById("clear-pins");
  if (btn) {
    btn.addEventListener("click", () => {
      state.pinned = [];
      updatePinnedHash();
      renderHome();
    });
  }
  const rbtn = document.getElementById("clear-recents");
  if (rbtn) {
    rbtn.addEventListener("click", () => {
      state.recents = [];
      updatePinnedHash();
      renderHome();
    });
  }
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
  if (result.pinned) state.pinned = result.pinned;
  if (result.recents) state.recents = result.recents;
  if (result.bundle) {
    // Defer to async decode; do not block parseHash.
    import("./bundle.js").then((mod) => {
      const decoded = mod.decodeBundle(result.bundle);
      if (decoded.error) return;
      const sanitized = mod.sanitizeBundle(decoded, new Set(TOOLS.map((t) => t.id)));
      state.pinned = sanitized.pinned;
      state.recents = sanitized.recents;
      state.bundleInputs = sanitized.inputs;
      // Replace the bundle hash with the resolved p=...&r=... form.
      updatePinnedHash();
      renderHome();
    }).catch(() => {});
  }
  state.route = result.route;
}

function onHashChange() {
  parseHash();
  applyRoute();
}

function applyRoute() {
  const home = document.getElementById("tools");
  const pinnedRegion = document.getElementById("pinned-region");
  const recentsRegion = document.getElementById("recents-region");
  const view = document.getElementById("view-region");
  if (state.route.view === "tool") {
    home.hidden = true;
    if (pinnedRegion) pinnedRegion.hidden = true;
    if (recentsRegion) recentsRegion.hidden = true;
    view.hidden = false;
    state.recents = pushRecent(state.recents, state.route.id);
    const fromBundle = (state.bundleInputs && state.bundleInputs[state.route.id]) || null;
    const params = fromBundle ? { ...fromBundle, ...state.route.params } : state.route.params;
    renderToolView(state.route.id, params);
  } else {
    home.hidden = false;
    view.hidden = true;
    clearChildren(view);
    renderHome();
    updatePinnedHash();
  }
}

function navigateTo(hash) {
  if (window.location.hash !== "#" + hash) {
    window.history.replaceState(null, "", "#" + hash);
    parseHash();
    applyRoute();
  }
}

// --- Home view (tile grid) ---

function renderHome() {
  // Recents region (above pinned).
  const recentsRegion = document.getElementById("recents-region");
  const recentsGrid = document.getElementById("recents-grid");
  if (recentsGrid && recentsRegion) {
    clearChildren(recentsGrid);
    if (state.recents.length > 0) {
      recentsRegion.hidden = false;
      for (const id of state.recents) {
        const tool = TOOLS.find((t) => t.id === id);
        if (tool) recentsGrid.appendChild(buildTile(tool));
      }
    } else {
      recentsRegion.hidden = true;
    }
  }
  // Pinned region.
  const pinnedRegion = document.getElementById("pinned-region");
  const pinnedGrid = document.getElementById("pinned-grid");
  if (pinnedGrid && pinnedRegion) {
    clearChildren(pinnedGrid);
    if (state.pinned.length > 0) {
      pinnedRegion.hidden = false;
      for (const id of state.pinned) {
        const tool = TOOLS.find((t) => t.id === id);
        if (tool) pinnedGrid.appendChild(buildTile(tool));
      }
    } else {
      pinnedRegion.hidden = true;
    }
  }

  // Tools sections - one block per group, each with its own header.
  // Tiles are filtered inline by the live search query; empty groups are
  // hidden so the layout stays tight while typing.
  const sections = document.getElementById("tools-sections");
  const empty = document.getElementById("empty-state");
  if (!sections) return;
  clearChildren(sections);
  let totalVisible = 0;
  for (const group of GROUPS) {
    const groupTools = TOOLS.filter((t) => t.group === group && matchesFilters(t));
    if (groupTools.length === 0) continue;
    totalVisible += groupTools.length;
    sections.appendChild(buildGroupSection(group, groupTools));
  }
  if (empty) empty.hidden = totalVisible > 0;
}

function buildGroupSection(group, tools) {
  const section = document.createElement("section");
  section.className = "tools-section";
  section.dataset.group = group;

  const header = document.createElement("div");
  header.className = "tools-section-header";

  const label = document.createElement("h2");
  label.className = "tools-section-label";
  label.textContent = "Group " + group + " - " + (GROUP_NAMES[group] || group);
  header.appendChild(label);

  const count = document.createElement("span");
  count.className = "tools-section-count";
  count.textContent = String(tools.length);
  header.appendChild(count);

  section.appendChild(header);

  const ul = document.createElement("ul");
  ul.className = "tile-grid";
  ul.setAttribute("role", "list");
  for (const tool of tools) ul.appendChild(buildTile(tool));
  section.appendChild(ul);

  return section;
}

// Encode current pinned state into the URL hash. Only called when the user
// is on the home view; tool routes keep their own #tool?params hash.
function updatePinnedHash() {
  if (state.route.view !== "home") return;
  const parts = [];
  if (state.pinned.length > 0) parts.push("p=" + state.pinned.join(","));
  if (state.recents.length > 0) parts.push("r=" + state.recents.join(","));
  const hash = parts.join("&");
  if (window.location.hash !== "#" + hash && window.location.hash !== (hash ? "#" + hash : "")) {
    window.history.replaceState(null, "", hash ? "#" + hash : window.location.pathname + window.location.search);
  }
}

function matchesFilters(tool) {
  return toolMatches(tool, { query: state.query });
}


function buildTile(tool) {
  const li = document.createElement("li");
  li.className = "tile";
  li.dataset.tool = tool.id;
  li.dataset.trades = tool.trades.join(" ");
  li.dataset.group = tool.group;
  li.tabIndex = -1;
  // Card-link pattern: clicking anywhere on the tile (except on the Pin
  // button or the explicit "Open tool" link, which both have their own
  // handlers) navigates to the tool view. Modifier-key clicks open the
  // tool in a new tab so power users can multi-pop without losing place.
  li.addEventListener("click", (e) => {
    if (e.defaultPrevented) return;
    const target = e.target;
    if (target.closest(".tile-pin") || target.closest(".tile-link")) return;
    const url = "#" + tool.id;
    if (e.metaKey || e.ctrlKey) {
      window.open(window.location.pathname + url, "_blank", "noopener");
      return;
    }
    if (e.shiftKey || e.button === 1) return;
    navigateTo(tool.id);
  });

  const h2 = document.createElement("h2");
  h2.className = "tile-title";
  h2.textContent = tool.name;
  li.appendChild(h2);

  const desc = document.createElement("p");
  desc.className = "tile-desc";
  desc.textContent = tool.desc;
  li.appendChild(desc);

  const tags = document.createElement("div");
  tags.className = "tile-tags";
  const groupTag = document.createElement("span");
  groupTag.className = "tag";
  groupTag.textContent = "Group " + tool.group;
  tags.appendChild(groupTag);
  for (const t of tool.trades) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = capitalize(t);
    tags.appendChild(tag);
  }
  li.appendChild(tags);

  const actions = document.createElement("div");
  actions.className = "tile-actions";

  const a = document.createElement("a");
  a.className = "tile-link";
  a.href = "#" + tool.id;
  a.textContent = "Open tool";
  actions.appendChild(a);

  const pinBtn = document.createElement("button");
  pinBtn.type = "button";
  pinBtn.className = "tile-pin";
  const isPinned = state.pinned.includes(tool.id);
  pinBtn.textContent = isPinned ? "Unpin" : "Pin";
  pinBtn.setAttribute("aria-pressed", isPinned ? "true" : "false");
  pinBtn.addEventListener("click", () => {
    if (state.pinned.includes(tool.id)) {
      state.pinned = state.pinned.filter((p) => p !== tool.id);
    } else {
      state.pinned.push(tool.id);
    }
    updatePinnedHash();
    renderHome();
  });
  actions.appendChild(pinBtn);

  li.appendChild(actions);
  return li;
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

  const pinBtn = document.createElement("button");
  pinBtn.type = "button";
  pinBtn.className = "view-pin";
  const refreshPinLabel = () => {
    const on = state.pinned.includes(id);
    pinBtn.textContent = on ? "Unpin from home" : "Pin to home";
    pinBtn.setAttribute("aria-pressed", on ? "true" : "false");
  };
  refreshPinLabel();
  pinBtn.addEventListener("click", () => {
    if (state.pinned.includes(id)) state.pinned = state.pinned.filter((p) => p !== id);
    else state.pinned.push(id);
    refreshPinLabel();
    // Pin state from a tool view is preserved in memory; it surfaces as a
    // Pinned section the next time the user lands on home. Per spec section
    // 11.5, that home view is bookmarkable via #p=... once visited.
  });
  headerRow.appendChild(pinBtn);

  // Copy share link (utility 124).
  const shareBtn = document.createElement("button");
  shareBtn.type = "button";
  shareBtn.className = "view-share";
  shareBtn.textContent = "Copy share link";
  shareBtn.addEventListener("click", () => {
    import("./clipboard.js").then((m) => m.copyText(window.location.href)).catch(() => {});
  });
  headerRow.appendChild(shareBtn);

  // Bundle actions (utility 121).
  const bundleCopyBtn = document.createElement("button");
  bundleCopyBtn.type = "button";
  bundleCopyBtn.className = "view-bundle-copy";
  bundleCopyBtn.textContent = "Copy bundle URL";
  bundleCopyBtn.addEventListener("click", () => {
    Promise.all([import("./bundle.js"), import("./clipboard.js")]).then(([bm, cm]) => {
      const merged = mergeBundleInputs(inputRegion, id);
      const hash = bm.encodeBundleHash({ pinned: state.pinned, recents: state.recents, inputs: merged });
      const url = window.location.origin + window.location.pathname + window.location.search + "#" + hash;
      cm.copyText(url);
    }).catch(() => {});
  });
  headerRow.appendChild(bundleCopyBtn);

  const bundleDownloadBtn = document.createElement("button");
  bundleDownloadBtn.type = "button";
  bundleDownloadBtn.className = "view-bundle-download";
  bundleDownloadBtn.textContent = "Download bundle";
  bundleDownloadBtn.addEventListener("click", () => {
    import("./bundle.js").then((bm) => {
      const merged = mergeBundleInputs(inputRegion, id);
      const json = bm.encodeBundle({ pinned: state.pinned, recents: state.recents, inputs: merged });
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "roughlogic-bundle.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }).catch(() => {});
  });
  headerRow.appendChild(bundleDownloadBtn);

  const bundleLoadLabel = document.createElement("label");
  bundleLoadLabel.className = "view-bundle-load";
  bundleLoadLabel.textContent = "Load bundle ";
  const bundleLoadInput = document.createElement("input");
  bundleLoadInput.type = "file";
  bundleLoadInput.accept = "application/json";
  bundleLoadInput.style.fontSize = "12px";
  bundleLoadInput.addEventListener("change", () => {
    const file = bundleLoadInput.files && bundleLoadInput.files[0];
    if (!file) return;
    file.text().then((text) => import("./bundle.js").then((bm) => {
      const decoded = bm.decodeBundle(text);
      if (decoded.error) return;
      const sanitized = bm.sanitizeBundle(decoded, new Set(TOOLS.map((t) => t.id)));
      state.pinned = sanitized.pinned;
      state.recents = sanitized.recents;
      state.bundleInputs = sanitized.inputs;
      navigateTo("");
    })).catch(() => {});
  });
  bundleLoadLabel.appendChild(bundleLoadInput);
  headerRow.appendChild(bundleLoadLabel);

  // Print this calculator (utility 122).
  const printBtn = document.createElement("button");
  printBtn.type = "button";
  printBtn.className = "view-print";
  printBtn.textContent = "Print this calculator";
  printBtn.addEventListener("click", () => { try { window.print(); } catch {} });
  headerRow.appendChild(printBtn);

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
  notice.textContent = tool.trades.includes(FIRE_GROUND_TRADE) ? NOTICE_FIRE : NOTICE_DEFAULT;
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
    renderer(inputRegion, outputRegion, citation, params || {});
    // Apply preloaded URL params to inputs and start syncing input state
    // to the URL hash so the calculator is bookmarkable (spec 11.5).
    libs.applyHashState(inputRegion, params || {});
    libs.wireHashState(inputRegion, id);
    // example=1 deep-link (utility 124): click the renderer's example
    // button after the renderer has run.
    if (params && params.example === "1") {
      const exBtn = inputRegion.querySelector("button");
      if (exBtn && /example/i.test(exBtn.textContent || "")) exBtn.click();
    }
    if (ds) libs.stampDataSource(sources, ds);
    // "Copy all" button per spec 11.3, generic across all calculators.
    libs.addCopyAllButton(outputRegion, { title: tool.name });
    // Per spec 11.2: when an input violates its HTML5 constraints, the
    // output is struck through and a plain-text reason is rendered in the
    // field; cleared once every input is valid.
    libs.wireValidity(inputRegion, outputRegion);
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

// --- Filters ---
//
// The trade/group filter button rows were removed from index.html; the
// header search bar is now the only filter. Tool matching defers to
// `routing.toolMatches`, which still supports trade/group filters when
// supplied (covered by routing.test.js).

function bindSearch() {
  const input = document.getElementById("search-input");
  if (!input) return;
  let timer = 0;
  input.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      state.query = input.value || "";
      // If the user is in a tool view and starts typing, route them
      // back to home so the live-filtered grid is what they see. Empty
      // queries do not auto-navigate (typing into the field then
      // clearing it should not yank the user out of a calculator).
      if (state.route.view !== "home" && state.query.trim().length > 0) {
        navigateTo("");
      } else {
        renderHome();
      }
    }, 50);
  });
}

// --- Keyboard: leader-key shortcuts and tile arrow nav ---

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

  // Tile grid arrow keys. The v2 home renders multiple <ul class="tile-grid">
  // blocks (one per group section) inside #tools-sections. Wire on the
  // container so arrow navigation works across every section in document
  // order. Falls back to #tile-grid for any future reversion.
  const sections = document.getElementById("tools-sections") || document.getElementById("tile-grid");
  if (sections) {
    sections.addEventListener("keydown", (e) => {
      if (!e.target.classList || !e.target.classList.contains("tile-link")) return;
      const links = Array.from(sections.querySelectorAll(".tile-link"));
      const idx = links.indexOf(e.target);
      if (idx < 0) return;
      const cols = currentColumnCount();
      let next = idx;
      if (e.key === "ArrowRight") next = idx + 1;
      else if (e.key === "ArrowLeft") next = idx - 1;
      else if (e.key === "ArrowDown") next = idx + cols;
      else if (e.key === "ArrowUp") next = idx - cols;
      else return;
      if (next < 0 || next >= links.length) return;
      e.preventDefault();
      links[next].focus();
    });
  }
}

function runShortcut(action) {
  if (action.type === "home") {
    navigateTo("");
  } else if (action.type === "route") {
    navigateTo(action.id);
  } else if (action.type === "focus") {
    const el = document.querySelector(action.target);
    if (el) el.focus();
  } else if (action.type === "pinned") {
    if (state.pinned.length > 0) {
      navigateTo("p=" + state.pinned.join(","));
    }
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
    ["G P", "Pinned"],
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

function currentColumnCount() {
  const w = window.innerWidth || 0;
  if (w >= 900) return 3;
  if (w >= 600) return 2;
  return 1;
}

// --- Helpers ---

function clearChildren(el) {
  while (el && el.firstChild) el.removeChild(el.firstChild);
}

// Collect a {key: value} map from an input region; used by bundle export.
function collectBundleInputs(inputRegion, toolId) {
  const out = {};
  const inputs = inputRegion.querySelectorAll("input, select");
  for (const el of inputs) {
    if (!el.id) continue;
    // Skip the file input used by the Load bundle affordance.
    if (el.type === "file") continue;
    if (el.type === "checkbox") out[el.id] = el.checked ? "1" : "";
    else out[el.id] = el.value || "";
  }
  return { [toolId]: out };
}

// Merge the current tool's live input map on top of any previously
// captured bundle inputs (from a loaded bundle or from earlier tool
// visits this session). Per spec-v2 section 1, a bundle encodes
// inputs for multiple calculators, not just the active one.
function mergeBundleInputs(inputRegion, toolId) {
  const current = collectBundleInputs(inputRegion, toolId);
  const carried = state.bundleInputs && typeof state.bundleInputs === "object" ? state.bundleInputs : {};
  const merged = { ...carried, ...current };
  // Persist the merged map so the next tool view's bundle action sees it.
  state.bundleInputs = merged;
  return merged;
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
