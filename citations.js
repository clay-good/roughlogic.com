// v6 structured citation data model (spec-v6.md §3 / §7).
//
// Per-tile citation objects with the six §3 fields. The reference-block
// renderer below turns one of these into the DOM block that mounts beneath
// the result on every audited tile. The build-time citation-string lint
// scans calc-*.js for inline "per <Source>" strings; the v6 audit moves
// those strings into this map one trade group at a time, so an audit edits
// one place and the source-of-truth is data, not view code.
//
// Schema:
//
//   {
//     formula:        string  // "Ampacity from NEC 310.16, 75°C column."
//     edition:        string  // "NEC 2023 (NFPA 70)."
//     freeAccess:     string  // "Free read-only access at nfpa.org/freeaccess."
//     governance:     string  // governance notice from spec-v6.md §2.5
//     editionNote:    string  // edition selector / disclosure
//     assumptions:    Array<{ name: string, value: string, source?: string }>
//   }
//
// Tiles not yet audited are absent from CITATIONS. The renderer no-ops on
// missing entries so audit PRs ship one group at a time without breaking
// the rest of the catalog.

// Governance notice variants from spec-v6.md §2.5. Imported by audit PRs
// so the wording is centralized; an inspector reading the page sees the
// same phrasing regardless of which calc module owns the tile.
export const GOVERNANCE = {
  general:        "Estimate. AHJ and licensed professional govern.",
  electrical:     "Estimate. AHJ and licensed electrician govern. Verify against the NEC edition adopted in your jurisdiction.",
  plumbing:       "Estimate. AHJ and licensed plumber / gas fitter govern. Verify against the IPC / IFGC edition adopted in your jurisdiction.",
  structural:     "Estimate. AHJ and licensed structural engineer govern.",
  mechanical:     "Estimate. AHJ and licensed mechanical contractor govern. ACCA Manual J / D / S supersede rules of thumb.",
  fire:           "Estimate. AHJ and licensed fire protection engineer govern.",
  pesticide:      "Read and follow the product label. The label is the law (FIFRA).",
  trucking:       "Math aid for personal verification. The ELD on the truck and the carrier tariff are the legal record. State limits may be lower than federal.",
  aviation:       "Pilot-in-command and the airplane flight manual govern. Verify against the AFM loading graph or table.",
  marine:         "Vessel master governs. Verify against the stability letter and USCG-approved loading manual.",
  food:           "The thermometer on the food is the verdict. Local health department governs.",
  water:          "Estimate. Operator of record and primacy agency govern.",
  rigging:        "Estimate. Head rigger and manufacturer working-load-limit charts govern. Inspect every piece of hardware before the show.",
  field:          "Geometry is not forecasting. Avalanche advisory and incident commander govern.",
  reference:      "Reference only. Bundled at build time. Confirm against the publishing agency before relying on a number.",
  engineer_of_record: "Estimate. Engineer of record governs the design and acceptance. Verify against the project structural drawings and the manufacturer's published capacity / chart.",
  worker_safety:  "Math aid for personal verification. Stop work and consult the qualified person on site if any number does not match the field condition.",
  tax:            "Estimate only. Tax law changes. Confirm with the current IRS publication or a licensed CPA before filing.",
  small_business: "Estimate. Verify before sending to your bookkeeper, banker, or CPA.",
  legal:          "This is legal information, not legal advice. Statutes and court rules change. Verify with current state code and a licensed attorney before relying on this for a filing or a deadline.",
  lab:            "Verify protocol against your lab's SOP before pipetting. A miscalculated dilution can ruin a run or a sample.",
  education:      "Estimate only. Readability formulas and similar metrics are derived from a representative population and have known edge-case noise. The classroom teacher governs final text selection, grade placement, and assessment decisions.",
  real_estate:    "Estimate. Lender governs final underwriting and rate / fee disclosure. Appraiser governs the appraised value. State law and the agency's program guidelines may impose stricter limits than the published thresholds.",
  ems_prehospital: "Math aid for the field provider. The receiving facility's physician governs disposition; the EMS medical director governs scope of practice; the agency protocol governs the call. This tile does not substitute for online medical command, a thorough patient assessment, or current ALS / BLS protocols.",
  veterinary:     "Math aid for the veterinary team. The attending veterinarian governs the prescription, fluid plan, and feeding plan. The RVT / LVT governs administration. This tile does not substitute for an in-person exam, a current drug formulary, or veterinary professional judgment.",
};

const NEC_2023 = "NEC 2023 (NFPA 70)."; // current published edition
const NEC_FREE = "Free read-only access at nfpa.org/freeaccess.";
const NEC_DISCLOSURE = "Editions available: bundled values follow NEC 2023. Jurisdictions on NEC 2017 / 2020 use slightly different ambient corrections and ampacity ranges; verify the edition adopted by your AHJ.";

// Carpentry / construction common phrasing (Group E audit, priority 5).
const IRC_2021 = "IRC 2021 (International Residential Code).";
const IBC_2021 = "IBC 2021 (International Building Code).";
const ASCE_7 = "ASCE 7-22 (Minimum Design Loads for Buildings and Other Structures).";
const AWC_NDS = "AWC NDS-2018 (National Design Specification for Wood Construction).";
const IRC_DISCLOSURE = "Editions available: bundled values follow IRC 2021. Jurisdictions on IRC 2018 / 2024 differ at the margins; verify the edition adopted by your AHJ.";
const IBC_DISCLOSURE = "Editions available: bundled values follow IBC 2021 and ASCE 7-22 referenced formulas. Older IBC editions reference ASCE 7-16 / 7-10; verify the edition adopted by your AHJ.";

// HVAC common phrasing (Group C audit, priority 4 per spec §6).
const ASHRAE_62_1 = "ASHRAE 62.1-2022 (Ventilation for Acceptable Indoor Air Quality).";
const ASHRAE_FREE = "Free read-only access at ashrae.org/technical-resources/standards-and-guidelines/read-only-versions-of-ashrae-standards.";
const ACCA_J = "ACCA Manual J, 8th edition.";
const ACCA_DISCLOSURE = "Editions available: ACCA Manual J 8th ed. is the current published edition. The simplified estimator on this tile is not a code-compliant load calculation; ACCA Manual J supersedes any rule of thumb the tile applies.";
const IMC_2021 = "IMC 2021 (International Mechanical Code).";

// Plumbing / gas common phrasing (Group B audit, priority 2 per spec §6).
const IPC_2021 = "IPC 2021 (International Plumbing Code).";
const IFGC_2021 = "IFGC 2021 (International Fuel Gas Code) / NFPA 54.";
const ICC_FREE = "Free read-only access at codes.iccsafe.org.";
const NFPA54_FREE = "Free read-only access at nfpa.org/freeaccess.";
const IPC_DISCLOSURE = "Editions available: bundled values follow IPC 2021. Jurisdictions on IPC 2018 / 2024 differ in fixture-unit values and vent-sizing tables; verify the edition adopted by your AHJ. UPC-jurisdictions (CA, IN, MA, NV, parts of NJ) use the Uniform Plumbing Code instead.";
const IFGC_DISCLOSURE = "Editions available: bundled values follow IFGC 2021 / NFPA 54-2021. Jurisdictions on earlier editions of either document differ at the margins; verify the edition adopted by your AHJ.";

// Group A — Electrical. Priority-1 audit per spec-v6.md §6.
// Citations cite NEC by section number and edition only; no NEC table text
// is reproduced. Numeric assumption lists name every constant the tile
// applies that the user does not enter (ambient, termination temperature,
// conductor count, fill-table column, voltage tolerance, etc.).
export const CITATIONS = {
  "ohms-law": {
    formula: "Ohm's Law: V = I * R; P = V * I. Derived identities for the missing two from any pair.",
    edition: "Classical electromagnetism; physical fact. Identities verified against IEEE 141 (Red Book).",
    freeAccess: "No code citation required (physical fact). Reference texts free at archive.org and university OCW.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (physics).",
    assumptions: [
      { name: "DC or RMS AC", value: "values are DC or RMS-equivalent AC", source: "convention" },
    ],
  },
  "wire-ampacity": {
    formula: "Ampacity selection from NEC 310.16 (0–2000 V), 75°C termination column by default; ambient correction per NEC 310.15(B)(1) and adjustment for >3 CCCs per NEC 310.15(C)(1).",
    edition: NEC_2023,
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Termination temperature", value: "75°C", source: "NEC 110.14(C) default for the typical residential / light-commercial install" },
      { name: "Ambient temperature", value: "30°C unless user supplies", source: "NEC 310.15(B)(1) base table" },
      { name: "Current-carrying conductors per raceway", value: "≤ 3 unless user supplies", source: "NEC 310.15(C)(1) base case" },
    ],
  },
  "voltage-drop": {
    formula: "VD = 2 * I * R * L for single-phase; VD = √3 * I * R * L for three-phase. R from NEC Chapter 9 Table 8 (DC ohm/kFT) with temperature correction; reactance per IEEE 141 for long runs.",
    edition: NEC_2023 + " Chapter 9 Tables 8 and 9; IEEE 141 by name.",
    freeAccess: NEC_FREE + " IEEE 141 is licensed; principles free at university OCW and IEEE-USA outreach.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Conductor temperature", value: "75°C unless user supplies", source: "NEC 310.15(B)(1)" },
      { name: "Power factor", value: "0.85 for AC unless user supplies", source: "engineering practice for general lighting / receptacle loads" },
      { name: "Voltage-drop target", value: "3% branch + 5% feeder = 5% total", source: "NEC informational notes 210.19(A)(1) FPN 4 / 215.2(A)(1) FPN 2" },
    ],
  },
  "conduit-fill": {
    formula: "Conductor cross-sectional area sum / interior conduit area, compared to NEC Chapter 9 Table 1 fill limits (53% / 31% / 40% for 1, 2, ≥ 3 conductors).",
    edition: NEC_2023 + " Chapter 9 Tables 1, 4, 5.",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Conductor area data", value: "NEC Chapter 9 Table 5 (THHN/THWN-2)", source: "NEC 2023" },
      { name: "Conduit area data", value: "NEC Chapter 9 Table 4", source: "NEC 2023 trade-size internal areas" },
    ],
  },
  "box-fill": {
    formula: "Sum of conductor, device-yoke, clamp, and grounding allowances per NEC 314.16(B), volumes from 314.16(B)(1) keyed to the largest conductor in the box.",
    edition: NEC_2023 + " Section 314.16.",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Volume allowance per conductor", value: "from NEC Table 314.16(B), keyed to the largest conductor entering", source: "NEC 2023" },
      { name: "Yoke allowance", value: "2 × largest-conductor allowance per yoke", source: "NEC 314.16(B)(4)" },
    ],
  },
  "breaker-sizing": {
    formula: "OCP = 125% × continuous load + 100% × non-continuous load (NEC 210.19(A) / 215.2(A)(1) / 215.3); next-standard-size rule per NEC 240.4(B); standard sizes per NEC 240.6(A).",
    edition: NEC_2023,
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Standard breaker sizes", value: "NEC 240.6(A) ladder", source: "NEC 2023" },
      { name: "Continuous-load definition", value: "load ≥ 3 hours", source: "NEC 100" },
    ],
  },
  "motor-fla": {
    formula: "FLA from manufacturer technical bulletins (in lieu of NEC 430.247–430.250 nameplate-equivalent tables).",
    edition: NEC_2023 + " Section 430.6 (FLC); manufacturer specs as of build date.",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Service factor", value: "1.0 unless nameplate states otherwise", source: "NEMA MG 1 by name" },
    ],
  },
  "transformer-sizing": {
    formula: "kVA = √3 × V_LL × I (three-phase) / V × I (single-phase); over-current protection per NEC 450.3.",
    edition: NEC_2023 + " Section 450.3, Table 450.3(B).",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Voltage-tolerance band", value: "ANSI C84.1 ±5%", source: "ANSI C84.1 by name" },
    ],
  },
  "three-phase": {
    formula: "S = √3 × V_LL × I (apparent VA); P = S × pf (real W); Q = S × sin(acos(pf)) (reactive VAR).",
    edition: "Classical AC power theory; IEEE 141 (Red Book) by name.",
    freeAccess: "IEEE-USA outreach materials free; IEEE 141 itself is licensed.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (physics).",
    assumptions: [
      { name: "Balanced load", value: "true unless user supplies imbalance", source: "calculation convention" },
    ],
  },
  "copper-resistance": {
    formula: "R(T) = R(20°C) × (1 + α × (T − 20°C)); α copper = 3.93 × 10⁻³ /K; α aluminum = 4.03 × 10⁻³ /K.",
    edition: "CRC Handbook material properties; NIST temperature-coefficient values.",
    freeAccess: "NIST data free at nist.gov; CRC Handbook by name.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (material properties).",
    assumptions: [
      { name: "Conductor purity", value: "annealed copper / 1350-H19 aluminum", source: "ASTM B3 / B231 by name" },
    ],
  },
  "egc-sizing": {
    formula: "EGC size from NEC Table 250.122, keyed to the upstream OCP rating; min size driven by OCP, parallel runs sized per NEC 250.122(F).",
    edition: NEC_2023 + " Section 250.122 and Table 250.122.",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Conductor material", value: "user-selectable; copper default", source: "NEC 250.122 row selection" },
    ],
  },
  "service-load": {
    formula: "Standard method per NEC 220.42 (general lighting demand factors) and 220.82 (optional dwelling-service); appliance loads per NEC 220.53.",
    edition: NEC_2023 + " Article 220.",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Voltage", value: "240 V single-phase split for dwelling unless user supplies", source: "ANSI C84.1 nominal" },
      { name: "Demand factor for first 3 kVA general lighting", value: "100% (per NEC 220.42)", source: "NEC 2023" },
    ],
  },
  "generator-sizing": {
    formula: "Required kW = max(starting kVA / surge factor, sum of running loads / efficiency); largest-motor LRA contribution per NEC 430.251(B).",
    edition: NEC_2023 + " Article 700 / 701 / 702; NEMA MG 1 by name.",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Surge tolerance", value: "30% voltage dip on starting (engineering practice)", source: "NEMA MG 1 by name" },
    ],
  },
  "pv-string-sizing": {
    formula: "Vmax = Voc(STC) × temperature correction at record-low ambient (NEC 690.7); current sizing 125% × Isc per NEC 690.8(A); OCP per NEC 690.9.",
    edition: NEC_2023 + " Article 690.",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Temperature-coefficient default", value: "−0.30%/°C unless user supplies", source: "module datasheet typical" },
      { name: "Inverter-input window", value: "user-supplied from listing", source: "UL 1741 listing" },
    ],
  },
  "battery-runtime": {
    formula: "Runtime = (battery_Wh × inverter_efficiency × depth_of_discharge) / load_W. Coulombic adjustments via Peukert exponent for lead-acid only.",
    edition: "Battery-chemistry physical facts; manufacturer datasheets by name.",
    freeAccess: "Datasheets free on each manufacturer site.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (chemistry / manufacturer data).",
    assumptions: [
      { name: "Inverter efficiency", value: "90% unless user supplies", source: "engineering practice" },
      { name: "DoD limit", value: "80% LFP / 50% lead-acid unless user supplies", source: "manufacturer typical" },
    ],
  },
  "voltage-imbalance": {
    formula: "% imbalance = max deviation from average / average × 100; NEMA MG 1 derate curve applied at > 1%.",
    edition: "NEMA MG 1 by name.",
    freeAccess: "NEMA standards licensed; principles free in IEEE-USA outreach.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (manufacturer / standards-body convention).",
    assumptions: [
      { name: "Trip threshold", value: "> 5% halts the motor (engineering practice)", source: "NEMA MG 1 by name" },
    ],
  },
  "gfci-afci-reference": {
    formula: "(reference page; no compute) GFCI required locations per NEC 210.8; AFCI required locations per NEC 210.12.",
    edition: NEC_2023 + " Sections 210.8 and 210.12.",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [],
  },
  "lighting-density": {
    formula: "Total lighting power = area × W/ft² benchmark; benchmarks compared to NEC 220.12 unit loads and IECC C405 / ASHRAE 90.1 LPDs.",
    edition: NEC_2023 + " Section 220.12; IECC 2021 Table C405; ASHRAE 90.1-2022 by name.",
    freeAccess: NEC_FREE + " IECC free read-only at codes.iccsafe.org. ASHRAE 90.1 read-only at ashrae.org.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Benchmark vintage", value: "IECC 2021 / ASHRAE 90.1-2022 LPDs", source: "data/electrical/lighting-density.json" },
    ],
  },
  "pulling-tension": {
    formula: "Capstan equation T_out = T_in × exp(μ × θ) accumulated per bend; sidewall pressure T/R per bend; flagged against 5000 lb head-end / 1000 lb-per-ft sidewall thresholds.",
    edition: "Manufacturer pull-tension guides (Southwire, Encore Wire) by name.",
    freeAccess: "Free at southwire.com and encorewire.com technical bulletins.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (manufacturer convention).",
    assumptions: [
      { name: "Coefficient of friction", value: "0.5 unlubricated / 0.2 lubricated unless user supplies", source: "manufacturer pull-tension guide typical" },
    ],
  },
  "cable-bend-radius": {
    formula: "Min bend radius = multiplier × cable OD; multipliers per cable type (THHN/XHHW 8x, MC 7x, control 6x, coax 10x, fiber 20x).",
    edition: "Manufacturer minimums (Southwire, AFC, Belden, Corning); NEC 300.34 by name.",
    freeAccess: NEC_FREE + " Manufacturer guides free at each manufacturer site.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Multiplier table", value: "data/electrical/cable-bend-radius.json", source: "manufacturer-attributed per row" },
    ],
  },
  "pf-correction": {
    formula: "kVAR = kW × (tan(acos(pf₁)) − tan(acos(pf₂))); μF from Q = V² × 2π f × C at 60 Hz with three-phase Y per-leg form.",
    edition: "Classical AC theory; IEEE 141 by name.",
    freeAccess: "Principles free at IEEE-USA outreach.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (physics).",
    assumptions: [
      { name: "Frequency", value: "60 Hz", source: "ANSI C84.1" },
    ],
  },
  "phase-balance": {
    formula: "Per-phase totals; imbalance % over average; greedy heaviest-to-lightest swap suggestion to minimize neutral current.",
    edition: "Engineering practice; NEC Article 220 by name.",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [],
  },
  "multi-load-vd": {
    formula: "Cumulative I × R per ordered segment; single-phase round-trip; allows mixed loads along one circuit.",
    edition: NEC_2023 + " Chapter 9 Tables 8 / 9; IEEE 141 by name.",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Round-trip factor", value: "2× one-way length", source: "single-phase return path" },
    ],
  },
  "lv-dc-drop": {
    formula: "VD = 2 × I × R × L for 12 / 24 / 48 V DC systems with copper resistance per NEC Chapter 9 Table 8.",
    edition: NEC_2023 + " Chapter 9 Table 8 (used as a copper-resistance reference, not as a low-voltage code).",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Application tolerance", value: "LED 3% / marine 10% / RV 5% / audio 2%", source: "engineering practice by application" },
    ],
  },
  "poe-budget": {
    formula: "I = pse_W / V_source; loop resistance R = R_per_100m × (L / 100m) × (1 + α × (T − 20°C)); P_loss = I² × R; PD power = pse_W − P_loss; flagged against IEEE 802.3 class minimums.",
    edition: "IEEE 802.3bt-2018 by name; manufacturer category cable resistance (Belden / CommScope) attributed in shard.",
    freeAccess: "IEEE 802.3 free at standards.ieee.org/getieee802. Cable specs free at each manufacturer site.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (IEEE 802.3bt-2018 PoE class definitions).",
    assumptions: [
      { name: "Copper temperature coefficient", value: "α = 3.93 × 10⁻³ /K at 20°C", source: "NIST" },
      { name: "Class minimum PD power", value: "af 12.95 W / at 25.5 W / bt3 51 W / bt4 71.3 W", source: "IEEE 802.3bt-2018" },
    ],
  },

  // --- v7 Group A extensions (utilities 234 through 237) ---

  "transformer-kva-sizing": {
    formula: "Total connected kVA = Σ load_i; required kVA = connected × (1 + reserve%). Recommended size from the ANSI/IEEE C57 standard step series (15 / 30 / 45 / 75 / 112.5 / 150 / 225 / 300 / 500 / 750 / 1000). FLA = kVA × 1000 / (V × √phases).",
    edition: "ANSI/IEEE C57 standard kVA step series by name; " + NEC_2023 + " Article 450 (Transformers).",
    freeAccess: NEC_FREE + " ANSI/IEEE C57 licensed; step-series values free in carrier engineering literature.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE + " Step series stable across NEC editions (ANSI/IEEE C57 governs the manufacturer step ladder).",
    assumptions: [
      { name: "Default future-growth reserve", value: "25% unless user supplies", source: "engineering practice for general-purpose service transformers" },
      { name: "Three-phase factor", value: "√3 ≈ 1.732", source: "physical fact" },
    ],
  },
  "short-circuit-pp": {
    formula: "I_sca_secondary = (kVA × 1000) / (V × √phases × Z%/100). f = (√3 × L × I_sca) / (n × C × V) for three-phase (use 2 instead of √3 for single-phase). M = 1 / (1 + f). I_sca_panel = I_sca_secondary × M.",
    edition: "Bussmann Point-to-Point Method (Eaton/Bussmann SPD electrical-safety publication) by name. C-values from Eaton/Bussmann published table.",
    freeAccess: "Bussmann SPD documents free at eaton.com/bussmann-spd. " + NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE + " Point-to-point C-values are stable across editions; verify the Eaton/Bussmann SPD table currency for the conductor class in use.",
    assumptions: [
      { name: "C-value table", value: "data/electrical/conductor-c-values.json keyed to conductor class / size / raceway", source: "Eaton/Bussmann SPD" },
      { name: "Three-phase factor", value: "√3 (use 2 for single-phase)", source: "Bussmann SPD" },
    ],
  },
  "generator-motor-starting": {
    formula: "Steady kW = Σ running_kW + non_motor_kW. Worst starting kVA = max over motors of starting_kVA(motor); starting_kVA = HP × code_kVA_per_HP from the NEMA MG-1 code letter, OR LRA × V × √phases / 1000 if the user supplies LRA. Required gen kVA = worst_starting_kVA / dip_factor (0.30 default per the 30% voltage-dip criterion). Required kW = max(steady, required_starting_kVA × 0.8).",
    edition: "NEMA MG-1 (Motors and Generators) by name; engineering-practice 30% voltage-dip criterion for transient motor starts.",
    freeAccess: "NEMA MG-1 licensed; code-letter principles free in published power-engineering texts.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (NEMA MG-1 code-letter table; quarterly recheck).",
    assumptions: [
      { name: "Code-letter table", value: "data/electrical/nema-mg1-code-letters.json keyed to A through V (lower bound of each range)", source: "NEMA MG-1" },
      { name: "Default dip factor", value: "0.30 (30% voltage-dip criterion)", source: "engineering practice" },
      { name: "Frequent-start derate", value: "occasional 1.0 / frequent 1.15 / continuous 1.30", source: "manufacturer typical" },
    ],
  },
  // --- v7 Group B extensions (utilities 238 through 241) ---

  "water-hammer-surge": {
    formula: "Joukowsky surge: a = sqrt(K/rho) / sqrt(1 + (K × D)/(E × t)); dP = rho × a × dV. Reflection time = 2L/a; rapid closure when t_close < 2L/a.",
    edition: "Joukowsky (1898) classical-fluids result by name; ASCE Manual of Practice 49 by name; manufacturer pipe-elastic-property values from data/plumbing/pipe-elastic-properties.json.",
    freeAccess: "Joukowsky derivation free in published fluid-mechanics texts. ASCE MOP-49 licensed.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (physics + manufacturer pipe properties).",
    assumptions: [
      { name: "Water bulk modulus K", value: "2.19 GPa ≈ 317 800 psi at 60 °F", source: "NIST" },
      { name: "Water density rho", value: "1.940 slug/ft³", source: "physical fact at 60 °F" },
      { name: "Schedule 40 D / t table", value: "data/plumbing/pipe-elastic-properties.json + SCH40_DIMS_IN", source: "engineering reference" },
    ],
  },
  "pump-operating-point": {
    formula: "Operating point at the intersection of the bundled pump curve H_p(Q) (linearly interpolated polyline) and the system curve H_sys = H_static + k × Q². Solved by binary search on Q in [0, Q_max].",
    edition: "Hydraulic Institute by name; manufacturer pump curves attributed per entry in data/plumbing/pump-curves.json.",
    freeAccess: "HI standards licensed; manufacturer technical bulletins free at each manufacturer site.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (manufacturer-attributed curves; quarterly recheck per spec-v7 §8 cadence). Ship only curves cleared for redistribution.",
    assumptions: [
      { name: "System curve form", value: "H_sys = H_static + k × Q² (turbulent / fully-rough flow)", source: "Hazen-Williams and Darcy-Weisbach Q² scaling" },
      { name: "Curve interpolation", value: "linear between published points (no quadratic / cubic fit)", source: "engineering practice" },
    ],
  },
  "septic-drainfield": {
    formula: "Required absorption area = design_daily_flow_gpd / application_rate_gpd_per_ft². Trench feet = required_area / trench_width_ft.",
    edition: "U.S. EPA Onsite Wastewater Treatment Systems Manual (EPA/625/R-00/008) by name; per-state and per-county application rates set by local code (not bundled).",
    freeAccess: "Free at epa.gov/septic. State application-rate tables free on each state department of health / DEQ site.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (EPA OWTS Manual + AHJ-supplied application rate). State and county codes set the application rate; enter the value from your local code.",
    assumptions: [
      { name: "Application rate", value: "user-supplied from local code (this tool deliberately does not bundle a per-state shard)", source: "local AHJ" },
    ],
  },
  "pipe-expansion-loop": {
    formula: "Linear expansion: dL = alpha × L × dT (alpha in 1/°F). Guided-cantilever expansion loop leg: L_loop = sqrt(3 × E × D × |dL| / S_a) where E is Young's modulus (psi), D is pipe OD (in), S_a is the allowable stress (psi).",
    edition: "ASME B31.1 / B31.9 (Power and Building Services Piping) guided-cantilever method by name. Per-material alpha / E / S_a from data/plumbing/thermal-expansion-coefficients.json.",
    freeAccess: "ASME B31 series licensed; principles free in published piping-engineering texts and at most pipe-manufacturer technical pages.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (ASME B31 series + manufacturer alpha values; annual recheck).",
    assumptions: [
      { name: "Coefficient table", value: "data/plumbing/thermal-expansion-coefficients.json keyed to material", source: "NIST + manufacturer technical bulletins" },
      { name: "Allowable stress S_a", value: "engineering-practice values per material (e.g., copper 5800 psi, steel A53-B 12500 psi, PEX 1500 psi)", source: "ASME B31 + manufacturer typical" },
    ],
  },

  // --- v7 utility 252: ISO Needed Fire Flow ---

  "iso-nff": {
    formula: "NFF = Ci × Oi × (1 + X + P) where Ci = 18 × F × sqrt(A_eff). F per construction class (Frame 1.5 / Joisted masonry 1.0 / Noncombustible and Masonry-noncombustible 0.8 / Modified-FR and Fire-resistive 0.6). A_eff = footprint × min(stories, 3) for non-fire-resistive; footprint × 1 for fire-resistive. X = exposure factor by distance band (0.05-0.25). P = communication factor. Output rounded to 250 gpm; floor 500, cap 12 000 gpm.",
    edition: "ISO Public Protection Classification (PPC) Schedule by name. Cited by name only; the schedule's commentary is not reproduced.",
    freeAccess: "ISO PPC Schedule licensed; class-factor table free in published fire-protection texts and at most state insurance department outreach.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (ISO PPC Schedule).",
    assumptions: [
      { name: "Construction-class F table", value: "1=1.5 / 2=1.0 / 3=4=0.8 / 5=6=0.6", source: "ISO PPC" },
      { name: "Cap on Ci", value: "8000 gpm before X / P / Oi factors", source: "ISO PPC engineering practice" },
      { name: "Round increment / floor / cap", value: "250 gpm / 500 gpm / 12 000 gpm", source: "ISO PPC" },
    ],
  },

  // --- v7 utility 253: Fall Protection Clearance ---

  "fall-protection-clearance": {
    formula: "Required clearance = free-fall + decel + worker_height + harness_stretch + safety_factor. Compared against the user-entered actual clearance below the anchor. Negative remaining clearance flags FAIL.",
    edition: "OSHA 29 CFR 1926.502 (Fall protection systems criteria) by section. ANSI Z359 (Fall Protection and Fall Restraint) by name. Manufacturer connector-decel benchmarks from data/cross/fall-protection-benchmarks.json.",
    freeAccess: "29 CFR 1926.502 free at ecfr.gov. ANSI Z359 licensed; manufacturer guides free at each manufacturer site.",
    governance: GOVERNANCE.engineer_of_record,
    editionNote: "Single-edition (29 CFR 1926.502 + manufacturer connector specs; quarterly recheck of manufacturer attribution per spec-v7 §8).",
    assumptions: [
      { name: "Default free-fall", value: "6 ft for personal fall arrest (PFAS)", source: "29 CFR 1926.502(d)(16)" },
      { name: "Default decel", value: "3.5 ft for shock-absorbing lanyard / 1.0 ft for SRL", source: "manufacturer typical" },
      { name: "Default worker height", value: "5 ft from D-ring to feet", source: "engineering practice" },
      { name: "Default safety factor", value: "1 ft margin", source: "engineering practice" },
    ],
  },

  // --- v8 Phase E.3 / E.4 / E.5 (utilities 255 through 257) ---

  "duct-leakage": {
    formula: "leakage_cfm = design_cfm - measured_cfm. leak_at_1inwc = leakage_cfm / sqrt(test_pressure_inwc) (orifice-flow scaling). leak_per_100ft2 = leak_at_1inwc / duct_surface_ft2 × 100. Effective class = smallest SMACNA class (3, 6, 12, 24, 48) whose limit ≥ leak_per_100ft2.",
    edition: "SMACNA Duct Leakage Test Manual (3rd ed.) by name. " + ASHRAE_62_1.replace("ASHRAE 62.1", "ASHRAE 90.1-2022 §6.4.4.2") + " (referenced for the leakage-class system).",
    freeAccess: "SMACNA standards licensed; class-system overview free at smacna.org outreach. " + ASHRAE_FREE,
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (SMACNA Duct Leakage Test Manual 3rd ed.; class numbers stable across editions).",
    assumptions: [
      { name: "Leakage scales with sqrt(P)", value: "orifice-flow model", source: "physical fact" },
      { name: "Leakage classes", value: "3 / 6 / 12 / 24 / 48 cfm per 100 ft² at 1 in WC", source: "SMACNA Duct Leakage Test Manual" },
    ],
  },
  "residential-framing": {
    formula: "Stud count = ceil(perimeter / stud_oc) + 8 (corner/T allowance). Plate lf = ceil(perimeter × 3 × 1.10) (sole + 2 top + 10% waste). Joist count = ceil(footprint / (joist_span × joist_oc)) + 2. Rafter count derived from approx_length / rafter_oc × 2 (both sides). Rafter length = building_run × m_common where m_common = sqrt(P² + 144) / 12. Board feet per ft per nominal: 2x4 = 0.667, 2x6 = 1.0, 2x8 = 1.333, 2x10 = 1.667, 2x12 = 2.0.",
    edition: IRC_2021 + " Tables R502.5 (joists), R602.5 (studs), R802.5.1 (rafters). WWPA standard grading rules for board-feet conversions.",
    freeAccess: ICC_FREE,
    governance: GOVERNANCE.structural,
    editionNote: IRC_DISCLOSURE,
    assumptions: [
      { name: "Corner / T allowance", value: "+8 studs for a simple rectangle (engineering practice)", source: "framing convention" },
      { name: "Plate waste factor", value: "10%", source: "engineering practice" },
      { name: "Sizes", value: "stud 2x4 / joist 2x10 / rafter 2x8 defaults; user-selectable", source: "IRC 2021 typical residential" },
    ],
  },
  "coagulant-dose": {
    formula: "pure_lb_day = flow_MGD × jar_dose_mg_L × 8.34 (mass-balance constant for water). product_lb_day = pure_lb_day / (strength_pct / 100). product_gal_day = product_lb_day / (sg × 8.34).",
    edition: "Metcalf & Eddy (Wastewater Engineering: Treatment and Resource Recovery, 5th ed.) by name; AWWA M37 (Operational Control of Coagulation and Filtration Processes) by name. Manufacturer product-strength + density values (alum 48.5% sg 1.33, ferric chloride 38% sg 1.40, PAC 10% sg 1.20).",
    freeAccess: "Metcalf & Eddy / AWWA M37 licensed; jar-test methodology free in EPA SDWA training materials at epa.gov.",
    governance: GOVERNANCE.water,
    editionNote: "Single-edition (engineering-practice constant + manufacturer product strengths; quarterly recheck of manufacturer attribution).",
    assumptions: [
      { name: "Constant 8.34 lb/gal", value: "water at 60 °F", source: "physical fact" },
      { name: "Product strengths", value: "alum dry 100%, alum liquid 48.5%, ferric chloride 38%, PAC 10%", source: "manufacturer typical" },
      { name: "Product specific gravities", value: "alum liquid 1.33, ferric 1.40, PAC 1.20", source: "manufacturer typical" },
    ],
  },

  // --- v8 Phase E.1 (utility 254): Panel Loading and Phase Rebalance ---

  "panel-rebalance": {
    formula: "Per-phase total = sum of single-leg circuits on phase. Imbalance % = (max - min) / mean × 100. Greedy swap suggestion: move heaviest single-leg circuit on the heaviest phase to the lightest phase if the projected imbalance is reduced.",
    edition: NEC_2023 + " §220 (load calculations) and §408.36 (panel rating). NEMA MG-1 by name for the imbalance / horsepower derate cited adjacent to the result.",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Phases", value: "A / B / C single-leg circuits only (multi-pole breakers must be aggregated by the user)", source: "engineering practice" },
      { name: "Swap threshold", value: "imbalance > 5% triggers a suggestion (NEMA MG-1 caution at 1%; engineering-practice 5% rebalance trigger)", source: "engineering practice" },
    ],
  },

  // --- v9 Group A extensions ---

  "noise-dose": {
    formula: "T_hr = 8 / 2^((L - 90) / 5). D_pct = sum(C_i / T_i) * 100. TWA_dBA = 16.61 * log10(D / 100) + 90. Levels below 80 dBA contribute zero to the OSHA dose.",
    edition: "OSHA 29 CFR 1910.95(b) Appendix A and Table G-16a.",
    freeAccess: "ecfr.gov for 1910.95; cdc.gov/niosh for the NIOSH 98-126 alternative.",
    governance: GOVERNANCE.worker_safety,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Exchange rate", value: "5 dB (OSHA)", source: "OSHA 1910.95(b) Appendix A" },
      { name: "NIOSH alternative", value: "3 dB exchange rate; not implemented here because OSHA is the regulatory record", source: "NIOSH 98-126" },
      { name: "Action level", value: "TWA 85 dBA = 50% dose", source: "OSHA 1910.95(c)" },
      { name: "PEL", value: "TWA 90 dBA = 100% dose", source: "OSHA 1910.95(b)" },
      { name: "Threshold", value: "levels below 80 dBA contribute zero dose", source: "OSHA 1910.95 Appendix A" },
    ],
  },

  "svi-sludge-index": {
    formula: "SVI (mL/g) = (SV30 mL/L * 1000) / MLSS mg/L. Bands: < 80 pin-floc / under-aerated; 80-150 typical CAS; 150-200 filamentous developing; > 200 bulking.",
    edition: "USEPA Wastewater Operator Training (public domain); WEF Manual of Practice No. 11 by name.",
    freeAccess: "epa.gov for operator-training materials.",
    governance: GOVERNANCE.water,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Settled-volume procedure", value: "30-min Imhoff cone or 1 L cylinder", source: "USEPA / WEF method" },
      { name: "Companion F:M", value: "srt-fm-ratio tile provides the F:M / SRT pair", source: "v4 srt-fm-ratio (already shipped)" },
      { name: "Bulking threshold", value: "SVI > 200 mL/g indicates the sludge will not settle in conventional secondary clarifier residence times", source: "WEF MOP 11 operator guidance" },
    ],
  },

  "disinfection-ct": {
    formula: "CT_achieved (mg-min/L) = chlorine_mg_l * t10_minutes. CT_required from bilinear interpolation of SWTR Table A-1 (free chlorine, 3-log Giardia, <=0.4 mg/L band) over the 6 temperature x 4 pH grid. 4-log virus credit from the SWTR Table E-1 simplified contact-time relation.",
    edition: "USEPA Surface Water Treatment Rule Guidance Manual EPA 815-R-99-014, Tables A-1 and E-1 (public domain).",
    freeAccess: "epa.gov/dwreginfo/surface-water-treatment-rules.",
    governance: GOVERNANCE.water,
    editionNote: "State primacy agency governs CT compliance; this tile is a planning check, not a compliance report.",
    assumptions: [
      { name: "Lookup table", value: "SWTR Table A-1 free-chlorine 3-log Giardia, <=0.4 mg/L band, 6 temperatures (0.5-25 C) x 4 pH (6.0-9.0)", source: "USEPA EPA 815-R-99-014" },
      { name: "t10 contact time", value: "input is the tracer-derived t10, not the theoretical detention time", source: "SWTR Guidance Manual procedure" },
      { name: "Virus credit", value: "4-log virus inactivation passes when CT_achieved exceeds the SWTR Table E-1 simplified value at the input temperature and pH", source: "USEPA EPA 815-R-99-014 Table E-1" },
      { name: "Chlorine band", value: "applicable to free chlorine residual <=0.4 mg/L; higher residuals warn (the higher-residual bands of Table A-1 are not bundled in this screen)", source: "spec-v9 §E.2" },
    ],
  },

  "sous-vide-pasteurization": {
    formula: "come_up_seconds = 0.4 * L_m^2 / alpha (Heisler-chart slab approximation at Fo ~ 0.4). hold_minutes from linear interpolation of FDA Food Code Annex 6 Table A at the bath temperature. total = come_up + hold.",
    edition: "FDA Food Code Annex 6 Table A (6.5-log Salmonella reduction). Heisler-chart thermal-diffusion approximation.",
    freeAccess: "fda.gov/food/retail-food-protection/fda-food-code.",
    governance: GOVERNANCE.food,
    editionNote: "Field thermometer at the geometric center is the verdict. Other pathogens may require different times.",
    assumptions: [
      { name: "Diffusivity values", value: "poultry / pork 1.4e-7; beef 1.3e-7; fish 1.45e-7; egg 1.4e-7 (m^2/s)", source: "public engineering references (Baldwin)" },
      { name: "Slab model", value: "half-thickness L = thickness / 2 (heat from both sides)", source: "engineering practice for sous-vide bag in bath" },
      { name: "Hold-time interpolation", value: "linear between bundled Annex 6 break points 130-147 F", source: "FDA Food Code Annex 6 Table A" },
      { name: "Limitation", value: "this is a screen, not a HACCP plan", source: "spec-v10 §B.3 simplified-screening invariant" },
    ],
  },

  "sprayer-calibration": {
    formula: "travel_distance_ft = (43560 / 128) / boom_width_ft = 340.3125 / boom_width_ft. gpa_actual = oz_per_nozzle (1/128-acre identity: 128 fl oz per gallon).",
    edition: "USDA Cooperative Extension Service public method. Pesticide label rates govern application.",
    freeAccess: "extension.org and land-grant university extension offices.",
    governance: GOVERNANCE.general,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "1/128-acre identity", value: "128 fl oz per gallon -> oz collected per nozzle = GPA when measured over 1/128 acre", source: "USDA Extension calibration method" },
      { name: "Adjustment threshold", value: "5% deviation from target triggers a suggested-speed correction", source: "engineering practice" },
    ],
  },

  "thi-livestock": {
    formula: "THI = T_F - (0.55 - 0.0055 * RH) * (T_F - 58). Species stress bands: dairy 72/79/89/99; beef 74/80/90/99; hog 75/82/90/99; poultry 70/75/85/95; horse 72/79/89/99.",
    edition: "USDA-ARS livestock heat-stress publications; Kansas State University Cooperative Extension. Public domain.",
    freeAccess: "usda.gov and K-State Research and Extension.",
    governance: GOVERNANCE.general,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Formula", value: "Same identity in F and C forms", source: "USDA-ARS / NRC" },
      { name: "Dairy thresholds (most cited)", value: "72 mild / 79 moderate / 89 severe / 99 emergency", source: "K-State Extension / Bohmanova et al." },
      { name: "Open vs closed ventilation", value: "open pasture provides natural cooling; effective band one step lower", source: "engineering practice" },
    ],
  },

  "lightning-countdown": {
    formula: "distance_mi = flash_to_bang_seconds / 5 (sound at sea level ~ 1125 ft/s). 30-30 rule: under 30 s flash-to-bang (~6 mi) -> seek shelter.",
    edition: "NOAA / NWS lightning safety; 30-30 rule is a public guideline.",
    freeAccess: "weather.gov/safety/lightning.",
    governance: GOVERNANCE.field,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Sound speed", value: "~1125 ft/s at sea level; 5 s ~ 1 mi", source: "standard atmospheric model" },
      { name: "30-30 rule threshold", value: "30 s flash-to-bang (~6 mi); resume after 30 min of last detected strike", source: "NWS public guideline" },
    ],
  },

  "stopping-sight-distance": {
    formula: "d_pr = 1.47 * v * t_pr; d_br = v^2 / (30 * (f + g)); d = d_pr + d_br.",
    edition: "AASHTO Green Book (Policy on Geometric Design of Highways and Streets, 7th ed.) Chapter 3.",
    freeAccess: "transportation.org for TOC; AASHTO design SSD tables are licensed.",
    governance: GOVERNANCE.trucking,
    editionNote: "AASHTO design SSD tables round these numbers; this tile outputs the underlying physics. State DOT governs roadway design.",
    assumptions: [
      { name: "Perception-reaction time", value: "2.5 s default", source: "AASHTO Green Book Chapter 3" },
      { name: "Friction coefficient", value: "0.35 dry / 0.20 wet / 0.10 ice", source: "engineering practice; AASHTO design values" },
      { name: "Grade", value: "decimal; + uphill, - downhill", source: "standard convention" },
    ],
  },

  "excavation-bench-plan": {
    formula: "horizontal_offset = depth * ratio (A 0.75 / B 1.0 / C 1.5). top_width = bottom_width + 2 * offset. cross_section = (top + bottom) / 2 * depth. volume_yd3 = cross_section * length / 27. Bench layout (A/B): 4 ft per bench; horizontal_step = bench_height * ratio.",
    edition: "OSHA 29 CFR 1926 Subpart P Appendix B and §1926.652.",
    freeAccess: "ecfr.gov.",
    governance: GOVERNANCE.worker_safety,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Soil classes", value: "A 0.75:1, B 1:1, C 1.5:1", source: "OSHA Subpart P Appendix B" },
      { name: "Bench height", value: "4 ft typical", source: "OSHA Subpart P engineering practice" },
      { name: "Surcharge bump", value: "+0.25 H:V additive when surcharge load present", source: "engineering practice" },
      { name: "Bottom width default", value: "2 ft (utility-trench common case)", source: "engineering practice" },
      { name: "Depth ceiling", value: "above 20 ft requires PE design per 1926.652(b)(4); tile stops there", source: "OSHA 1926.652(b)(4)" },
    ],
  },

  "nfpa-1142-water-supply": {
    formula: "Q_total = (V * O * H) / 5 per NFPA 1142 §5. 1.5x exposure multiplier when adjacent structure within 50 ft. 0.5x sprinkler reduction when UL-listed system present.",
    edition: "NFPA 1142-2022 (Standard on Water Supplies for Suburban and Rural Firefighting) §5.",
    freeAccess: "nfpa.org/freeaccess.",
    governance: GOVERNANCE.fire,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Occupancy factors", value: "NFPA 1142 §5.2 type 1-7 formula coefficients (cited by name, not reproduced as a table)", source: "NFPA 1142-2022 §5.2" },
      { name: "Construction factors", value: "Class I-V per NFPA 1142 §5.2.7", source: "NFPA 1142-2022 §5.2.7" },
      { name: "Exposure multiplier", value: "1.5x when adjacent structure within 50 ft", source: "NFPA 1142-2022 §5.4" },
      { name: "Sprinkler reduction", value: "0.5x contingent on confirmed UL-listed system", source: "NFPA 1142-2022 §5.5; AHJ inspection governs" },
      { name: "Standard tanker sizes", value: "1000 / 1500 / 2000 / 3000 gal", source: "common apparatus sizing" },
    ],
  },

  "scba-cylinder-time": {
    formula: "available_scf_to_alarm = (P_start - P_alarm) / P_rated * V_rated. time_to_alarm_min = available_scf / consumption_scfm. Time-to-empty is a math aid only; exit at the low-air alarm.",
    edition: "NFPA 1981-2019; NIOSH 42 CFR 84.",
    freeAccess: "nfpa.org/freeaccess for NFPA 1981 TOC; ecfr.gov for 42 CFR 84.",
    governance: GOVERNANCE.fire,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Rated scf", value: "manufacturer-published per cylinder rating (e.g., 88 scf for 60-min 4500 psi)", source: "manufacturer technical bulletin" },
      { name: "Low-air alarm", value: "typically ~33% of rated pressure", source: "NFPA 1981 §6.2 alarm threshold" },
      { name: "Exit policy", value: "NFPA 1500 / incident-command practice trains members to exit at the alarm, not at empty", source: "NFPA 1500" },
    ],
  },

  "outdoor-air-ventilation": {
    formula: "Vbz = Rp * Pz + Ra * Az. Voz = Vbz / E_z. Per-person and per-area ratios surface the design density.",
    edition: "ASHRAE 62.1-2022 §6.2.2.1 (single-zone breathing-zone procedure). AHJ-adopted edition governs.",
    freeAccess: "ashrae.org/technical-resources/standards-and-guidelines/read-only-versions-of-ashrae-standards for TOC.",
    governance: GOVERNANCE.mechanical,
    editionNote: "ASHRAE 62.1 Table 6-1 occupancy categories are NOT bundled; user enters Rp and Ra from the AHJ-adopted edition.",
    assumptions: [
      { name: "Rp / Ra", value: "user-supplied; placeholder presets for office / classroom / retail are starting points only", source: "ASHRAE 62.1-2022 Table 6-1 (not reproduced)" },
      { name: "E_z default", value: "1.0 (ceiling supply with ceiling return)", source: "ASHRAE 62.1-2022 Table 6-2" },
      { name: "E_z range", value: "0.5 to 1.2 typical", source: "ASHRAE 62.1-2022 Table 6-2" },
    ],
  },

  "shr-latent": {
    formula: "Q_sensible = 1.08 * CFM * (T_ra - T_sa) * (rho/rho_sea). Q_latent = Q_total - Q_sensible. SHR = Q_sensible / Q_total. W from dry-bulb / wet-bulb via ASHRAE Fund Ch.1 eq. 35: W = ((2501 - 2.326*T_wb_C)*W_s_wb - 1.006*(T_db_C - T_wb_C)) / (2501 + 1.86*T_db_C - 4.186*T_wb_C). dW = Q_latent / (4840 * CFM * rho_ratio). W_sa = W_ra - dW. Altitude correction P(z) = 101.325 * (1 - 2.25577e-5 * z_m)^5.2559.",
    edition: "ASHRAE Fundamentals 2021 Chapter 1 (psychrometrics) and Chapter 18 (nonresidential cooling and heating load calculations).",
    freeAccess: "ashrae.org for TOC; full handbook is licensed.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Field measurement is the verdict; the rated total capacity is one input among several. Sea-level coefficients (1.08 / 4840) are per ASHRAE Handbook.",
    assumptions: [
      { name: "Sensible coefficient", value: "1.08 = 60 min/hr * 0.075 lb/ft^3 * 0.24 Btu/(lb F) at standard sea-level air density", source: "ASHRAE Handbook" },
      { name: "Latent coefficient", value: "4840 = 60 min/hr * 0.075 lb/ft^3 * 1076 Btu/lb water at standard sea-level air density (lb-water / lb-dry-air form)", source: "ASHRAE Handbook" },
      { name: "Altitude correction", value: "rho / rho_sea = P(z) / P0 with P from standard-atmosphere formula", source: "ASHRAE Fundamentals 2021 Ch. 1 eq. 3" },
      { name: "Humidity ratio from wet-bulb", value: "ASHRAE Fundamentals 2021 Ch. 1 eq. 35 (psychrometric)", source: "ASHRAE Handbook" },
      { name: "Saturation pressure", value: "Magnus form e_s = 0.61094 * exp(17.625 * T / (T + 243.04)) kPa (adequate for the 32-120 F range)", source: "engineering practice; ASHRAE Fund Ch. 1 eq. 6 simplified" },
      { name: "Band labels", value: "SHR 0.65-0.80 typical residential cooling; 0.55-0.65 high-latent climate; >0.80 dry-climate; <0.55 dehumidification-dominant", source: "spec-v9 §B.1 context band" },
    ],
  },

  "hood-exhaust": {
    formula: "Type I: Q = duty_multiplier * L. Wall-canopy duty multipliers (light 200, medium 300, heavy 400, extra-heavy 550 cfm/ft) per IMC 2021 §507.13. Single-island canopy (400 / 500 / 600 / 700). Double-island (250 / 300 / 400 / 550). Backshelf / proximity / pass-over (250 / 300 / 400; extra-heavy not allowed). Type II: Q = 100 * L (IMC 507.20). Makeup = 0.80 * Q (IMC 508 balance check). Duct area (in^2) = Q / V * 144.",
    edition: "IMC 2021 §507.13 (Type I) and §507.20 (Type II). NFPA 96-2024 governs grease-handling exhaust system design.",
    freeAccess: "codes.iccsafe.org for IMC TOC; nfpa.org/freeaccess for NFPA 96 TOC.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Duty multipliers are formula coefficients per the published IMC; not a code-table reproduction. AHJ governs final equipment selection.",
    assumptions: [
      { name: "Hood-type x duty matrix", value: "wall-canopy / single-island / double-island / backshelf / proximity / pass-over, each with light / medium / heavy / extra-heavy multipliers", source: "IMC 2021 §507.13" },
      { name: "Type II rate", value: "100 cfm per linear foot for vapor-only hoods", source: "IMC 2021 §507.20" },
      { name: "Makeup air", value: "80% of exhaust as a balance-check rule of thumb; AHJ governs final balance", source: "IMC 2021 §508" },
      { name: "Duct velocity range", value: "Type I grease-duct velocity 500-2000 fpm to keep grease suspended", source: "NFPA 96-2024 §8.2.1.1" },
      { name: "Grease-duct slope", value: "1/4 in per ft minimum slope back to the hood", source: "IMC 2021 §506.3" },
    ],
  },

  "grounding-electrode": {
    formula: "Driven rod (Dwight 1936): R = (rho / (2*pi*L)) * (ln(8L/d) - 1). Ring: R = (rho / (4*pi^2*D)) * (ln(8D/d) + ln(4D/s)). Plate: R = (rho / 4) * sqrt(pi / A). Ufer: rod formula with concrete-cylinder effective diameter, times 0.5 empirical reduction.",
    edition: "IEEE 142-2007 (Green Book) §4. " + NEC_2023 + " §250.53 governs adoption.",
    freeAccess: "standards.ieee.org for IEEE 142 bibliographic data; " + NEC_FREE + " for NEC 250.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Soil resistivity", value: "user-supplied (ohm-cm); varies seasonally", source: "field megger reading is the authoritative value at the time of inspection" },
      { name: "25-ohm advisory", value: "NEC 250.53(A)(2) two-electrode rule when a single electrode exceeds 25 ohms", source: "NEC 2023 §250.53(A)(2)" },
      { name: "Mutual impedance", value: "supplemental-rod count ignores mutual impedance at typical 6 ft spacing", source: "engineering practice; field check required" },
      { name: "Ufer reduction factor", value: "0.5 empirical (conservative)", source: "IEEE 142 §4.2.4" },
    ],
  },

  "motor-branch-from-nameplate": {
    formula: "Single-phase: I = HP * 746 / (V * eta * PF). Three-phase: I = HP * 746 / (sqrt(3) * V * eta * PF). Branch-circuit conductor at 125% per NEC §430.22; overload max at 115% or 125% per NEC §430.32 (SF >= 1.15 -> 125%).",
    edition: NEC_2023 + " §430.6(A)(1) (reference-FLA tables), §430.22 (branch conductor 125% rule), §430.32 (overload sizing).",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Reference-FLA tables", value: "NEC 430.247 / 430.248 / 430.250 are NOT reproduced; the physics output is a companion to (not a substitute for) the table value", source: "NEC 2023 §430.6(A)(1)" },
      { name: "Design FLA", value: "larger of computed vs nameplate when nameplate is provided", source: "engineering practice" },
      { name: "Overload multiplier", value: "125% for SF >= 1.15; 115% otherwise", source: "NEC 2023 §430.32" },
    ],
  },

  "arc-flash-screen": {
    formula: "E_lee (cal/cm^2 at distance D in inches) = (2.142e6 * V * I_bf * t) / D^2. Boundary distance D_b = sqrt((2.142e6 * V * I_bf * t) / 1.2). PPE category band looked up against the NFPA 70E Table 130.7(C)(15)(c) ranges (table cited by name only; not reproduced).",
    edition: "NFPA 70E-2024 §130.5 governs the arc-flash risk assessment. IEEE 1584-2018 is the study-grade method.",
    freeAccess: NEC_FREE + " for NFPA 70E TOC and Annex D.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Equation source", value: "Ralph Lee 1982 closed-form, pre-IEEE-1584", source: "Lee, R.H., 'The Other Electrical Hazard: Electric Arc Blast Burns', IEEE Trans. on Industry Applications, 1982" },
      { name: "Second-degree threshold", value: "1.2 cal/cm^2", source: "NFPA 70E hazard threshold" },
      { name: "Conservatism", value: "Lee is conservative below 600 V open-air but may be non-conservative for some 480 V box configurations covered by IEEE 1584", source: "engineering practice; IEEE 1584-2018 commentary" },
      { name: "PPE category bands", value: "1.2 / 4 / 8 / 25 / 40 cal/cm^2 breakpoints", source: "NFPA 70E Table 130.7(C)(15)(c) ranges; table not reproduced" },
    ],
  },

  // --- v7 Group E extensions (utilities 246 through 251) ---

  "stair-stringer-layout": {
    formula: "Riser count = ceil(total_rise / target_rise). Exact rise = total / count. Total run = (count − 1) × tread. Stringer hypotenuse = sqrt(rise² + run²). Throat depth = stringer_thickness × cos(theta) − exact_rise × sin(theta) where theta = atan2(rise, run). Pass/fail against user-entered local-code rise max and tread min.",
    edition: IRC_2021 + " §R311.7 referenced by name; the user supplies the AHJ's adopted max rise and min tread (the tile does not bundle code values).",
    freeAccess: ICC_FREE,
    governance: GOVERNANCE.structural,
    editionNote: IRC_DISCLOSURE + " The tool deliberately does not bundle a per-jurisdiction max-rise / min-tread shard; the user enters the values from local code.",
    assumptions: [
      { name: "Default target rise / tread", value: "7.0 in / 11.0 in (engineering practice typical)", source: "engineering practice" },
      { name: "Default code max rise / min tread", value: "7.75 in / 10.0 in (IRC 2021 §R311.7 typical; verify your AHJ)", source: "IRC 2021 default" },
    ],
  },
  "hip-valley-rafter": {
    formula: "Common-rafter run multiplier m = sqrt(P² + 144) / 12 (P = pitch, rise per 12 in run). Hip / valley multiplier m_hip = sqrt(P² + 288) / 12 (square 12 × 12 diagonal = 16.97). Jack-rafter shortening per OC: dx_oc = oc × m_common; jack length at distance n × dx_oc = (run − n × dx_oc) × m_common.",
    edition: "Carpentry framing-square method by name. Public layout taught in any framing-square reference (Steel Square Pocket Book, Audel's Carpenters and Builders Library) by name.",
    freeAccess: "Older Steel Square Pocket Book editions free at archive.org.",
    governance: GOVERNANCE.structural,
    editionNote: "Single-edition (geometry).",
    assumptions: [
      { name: "Diagonal of 12-by-12 square", value: "16.97 in (sqrt(2 × 12²))", source: "geometry" },
      { name: "Default jack OC", value: "16 in unless user supplies", source: "carpentry convention" },
    ],
  },
  "rebar-schedule": {
    formula: "Cut length = straight_ft + bend_allowance_in / 12 where bend_allowance = sum over bend types of (multiplier × bar_diameter): 90° = 6 db, 135° = 6 db, 180° = 4 db, stirrup = 14 db, hook = 6 db. Row weight = cut_length × unit_weight × pieces. Total = sum of rows.",
    edition: "ACI 318-19 / CRSI Manual of Standard Practice by name. Unit weights per CRSI / ASTM A615 published values: #3 = 0.376 lb/ft, ..., #11 = 5.313 lb/ft.",
    freeAccess: "ACI 318 + CRSI manuals licensed; ASTM A615 nominal-weight table free in published engineering references.",
    governance: GOVERNANCE.engineer_of_record,
    editionNote: "Single-edition (CRSI standard practice; bar-diameter and weight tables stable across editions).",
    assumptions: [
      { name: "Unit-weight table", value: "data/construction/rebar-unit-weights.json keyed to bar size", source: "ASTM A615 / CRSI" },
      { name: "Bar-diameter table", value: "data/construction/rebar-unit-weights.json keyed to bar size", source: "ASTM A615 nominal" },
    ],
  },
  "plywood-span": {
    formula: "Allowable uniform load = lookup(span_rating, application). Pass/fail = (support_spacing ≤ allowable_spacing) AND (live_load ≤ allowable_live) AND (live + dead ≤ allowable_total).",
    edition: "APA - The Engineered Wood Association published span-rating tables by name. Cited by APA name only; numeric tables shipped under APA's technical-bulletin reuse policy. " + IRC_2021 + " §R503 / §R803 references the APA tables.",
    freeAccess: "APA technical bulletins free at apawood.org/publications.",
    governance: GOVERNANCE.structural,
    editionNote: IRC_DISCLOSURE + " APA span-rating values are stable across editions.",
    assumptions: [
      { name: "Span-rating table", value: "data/construction/apa-span-ratings.json keyed to rating × application", source: "APA technical bulletins" },
    ],
  },
  "helical-pile": {
    formula: "Ultimate axial capacity = Kt × installation_torque (lb-ft). Allowable = ultimate / factor_of_safety. Kt by shaft type (engineering-practice values): 1.5 in solid 10, 1.75 in solid 9, 2.875 in pipe 7, 3.5 in pipe 5.",
    edition: "ICC-ES Acceptance Criteria AC358 (helical foundation systems) by name; manufacturer technical bulletins (CHANCE, Magnum, Ram Jack, AB Chance) by name.",
    freeAccess: "ICC-ES AC358 free at icc-es.org. Manufacturer Kt values free in each manufacturer's published evaluation report.",
    governance: GOVERNANCE.engineer_of_record,
    editionNote: "Single-edition (manufacturer Kt benchmarks; quarterly recheck per spec-v7 §8). The engineer of record specifies the project Kt and acceptance torque.",
    assumptions: [
      { name: "Kt table", value: "data/construction/helical-pile-kt.json keyed to shaft type", source: "manufacturer technical bulletins" },
      { name: "Default factor of safety", value: "2.0 unless user supplies (engineering-practice default for axial helical piers)", source: "ICC-ES AC358 typical" },
    ],
  },
  "crane-lift-quick": {
    formula: "Gross load = load + rigging + block + jib_deduct. Per-leg sling tension L = W / (n × sin(theta/2)) (basket / bridle form). Percent of chart = gross / chart_capacity × 100. Flags: < 75% green, 75-90% yellow, ≥ 90% red. Refuses to render an output without the user-entered chart capacity (the tool never reproduces a load chart).",
    edition: "ASME B30.5 (Mobile and Locomotive Cranes) by name and section. ASME B30.9 (Slings) for the per-leg formula. OSHA 29 CFR 1926 Subpart CC (cranes and derricks) by section.",
    freeAccess: "ASME B30 series licensed; OSHA 29 CFR 1926 free at ecfr.gov.",
    governance: GOVERNANCE.engineer_of_record,
    editionNote: "Single-edition (ASME B30.5 / B30.9 + OSHA 29 CFR 1926 Subpart CC). The crane manufacturer's load chart and the qualified lift director govern.",
    assumptions: [
      { name: "Per-leg formula", value: "L = W / (n × sin(theta/2)) for bridle / basket; vertical pick L = W / n", source: "ASME B30.9" },
      { name: "Critical-lift threshold", value: "75% of chart capacity (engineering-practice critical-lift trigger)", source: "engineering practice" },
    ],
  },

  // --- v7 Group C extensions (utilities 242 through 245) ---

  "duct-friction-static": {
    formula: "Hydraulic diameter D_h = 4A/P (round D_h = D; rectangular Huebscher D_eq = 1.30 × (W×H)^0.625 / (W+H)^0.250). Velocity V_fpm = CFM / A. Velocity pressure VP = (V/4005)². Friction factor from Swamee-Jain explicit Colebrook: f = 0.25 / [log10(eps/(3.7 D) + 5.74/Re^0.9)]². Pressure loss dP = f × (L/D) × (rho_air × V²/(2g)) converted to in WC. Fitting losses dP_fit = Σ (C_o × VP).",
    edition: ASHRAE_62_1.replace("ASHRAE 62.1", "ASHRAE Handbook Fundamentals chapter 21") + " (referenced by name; principles in published engineering texts).",
    freeAccess: ASHRAE_FREE,
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (ASHRAE Fundamentals duct chapter; engineering-practice C_o values).",
    assumptions: [
      { name: "Air density / kinematic viscosity", value: "0.075 lb/ft³ / 1.62×10⁻⁴ ft²/s at 70 °F sea level", source: "ASHRAE Fundamentals" },
      { name: "Roughness table", value: "data/hvac/duct-roughness.json (galv smooth 0.0003 ft → flex metal 0.012 ft)", source: "engineering-practice consensus" },
      { name: "Fitting C_o library", value: "data/hvac/duct-fittings.json keyed to fitting kind", source: "engineering-practice consensus" },
    ],
  },
  "refrigerant-charging": {
    formula: "Saturation T from bundled manufacturer P-T table by linear interpolation. Superheat = T_suction_line − T_sat(P_suction); Subcool = T_sat(P_liquid) − T_liquid_line. Each pressure input has a psig/psia toggle (psig is gauge default; psia adds 14.696 to psig).",
    edition: "Manufacturer-attributed P-T tables (DuPont, Honeywell Solstice, Chemours Opteon, Arkema Forane) by name; ASHRAE 34 safety classifications by name.",
    freeAccess: "Free at each manufacturer site; ASHRAE 34 read-only at ashrae.org.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (manufacturer P-T tables; quarterly recheck per spec-v7 §8 cadence).",
    assumptions: [
      { name: "Standard atmospheric pressure", value: "14.696 psi (psig→psia conversion)", source: "NIST" },
      { name: "Superheat target band", value: "8-12 °F (manufacturer typical absent a charging chart)", source: "manufacturer commissioning guide typical" },
      { name: "Subcool target band", value: "8-15 °F (manufacturer typical absent a charging chart)", source: "manufacturer commissioning guide typical" },
    ],
  },
  "cooling-tower": {
    formula: "Range = T_in − T_out. Approach = T_out − T_wb. Heat rejection (BTU/hr) = gpm × 500 × range. Fan kW per ton = fan_kW × 12000 / heat_rejection.",
    edition: "Cooling Technology Institute (CTI) standard practice by name; ASHRAE Handbook (HVAC Systems and Equipment) cooling-tower chapter by name.",
    freeAccess: "CTI guides free at cti.org outreach; ASHRAE Handbook licensed.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (engineering-practice cooling-tower convention).",
    assumptions: [
      { name: "Constant 500", value: "(8.34 lb/gal × 60 min/hr × cp = 1 BTU/lb-°F) ≈ 500 BTU/(hr · gpm · °F)", source: "physical-fact derivation for water" },
      { name: "Approach target band", value: "5-10 °F", source: "CTI engineering practice" },
      { name: "Range target band", value: "8-12 °F", source: "CTI engineering practice" },
    ],
  },
  "insulation-heat-loss": {
    formula: "R_cond = ln(r2/r1) / (2π × k); h_outside = h_conv(V) + h_rad(eps, T); R_outside = 1 / (h_outside × 2π × r2); Q = (T_s − T_a) / (R_cond + R_outside). h_conv ≈ 0.225 + 0.000625 × V_fpm (engineering approximation); h_rad = eps × σ × ((T_s_R² + T_a_R²)(T_s_R + T_a_R)). Iterate for outer-surface temperature.",
    edition: "ASHRAE Handbook Fundamentals chapter 25 (insulation) by name; ASTM C680 (cylindrical surface conditions) by name; manufacturer k-values from data/hvac/insulation-k-values.json.",
    freeAccess: "ASTM C680 licensed; manufacturer technical bulletins free at each manufacturer site.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (engineering practice + manufacturer k-values; quarterly recheck of manufacturer attribution).",
    assumptions: [
      { name: "Stefan-Boltzmann constant σ", value: "0.1714×10⁻⁸ BTU/(hr·ft²·°R⁴)", source: "physical fact" },
      { name: "Default jacket emissivity", value: "0.9 (painted steel / fabric jacket)", source: "engineering practice" },
      { name: "Iterative outer-surface T solve", value: "12 fixed-point iterations for the R_outside ↔ T_s2 coupling", source: "engineering practice" },
    ],
  },

  "service-load-standard": {
    formula: "Standard Method per NEC 220.42 (general lighting demand factors: first 3000 VA at 100%, next 117000 VA at 35%, remainder at 25%); 220.53 (fixed appliances 75% if 4+ items in branch); 220.54 (dryer 5000 W or nameplate, whichever is greater); 220.55 (range simplified); 430.24 (largest motor at 125%); 220.60 (HVAC larger of cooling vs. heating). Service A = total_VA / V; recommended service from the NEC 100/125/150/175/200/225/300/400 ladder.",
    edition: NEC_2023 + " Article 220 (Branch-Circuit, Feeder, and Service Load Calculations).",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "General lighting load density", value: "3 VA per ft² (NEC 220.12 dwelling)", source: "NEC 2023" },
      { name: "Small-appliance circuit value", value: "1500 VA per circuit (≥ 2 required)", source: "NEC 220.52(A)" },
      { name: "Laundry circuit value", value: "1500 VA (one required)", source: "NEC 220.52(B)" },
      { name: "Range demand", value: "≤ 8 kW: 100%; 8-12 kW: 8000 VA; > 12 kW: 8000 + 5% per kW above 12", source: "NEC 220.55 simplified" },
      { name: "Service voltage", value: "240 V single-phase split unless user supplies", source: "ANSI C84.1 nominal dwelling service" },
    ],
  },

  // --- Group B: Plumbing and Gas (priority 2 per spec-v6.md §6) ---
  // Tiles cite IPC / IFGC by section number and edition only; no IPC table
  // text is reproduced. Hazen-Williams uses AWWA M11 C-values; Manning uses
  // USGS WSP-2339 n-values (public domain). Numeric assumption lists name
  // every constant the tile applies that the user does not supply.

  "pipe-sizing": {
    formula: "Water-supply size from Hunter's Curve fixture units (DFU per IPC 2021 Section 709, Table 709.1); WSFU for water supply per IPC Section 604, Table 604.3.",
    edition: IPC_2021 + " Sections 604, 709, Tables 604.3 and 709.1. Hunter's Curve methodology by name.",
    freeAccess: ICC_FREE,
    governance: GOVERNANCE.plumbing,
    editionNote: IPC_DISCLOSURE,
    assumptions: [
      { name: "Pressure head at most-distant fixture", value: "8 psi minimum unless user supplies", source: "IPC 2021 Section 604.6" },
      { name: "Maximum velocity", value: "8 fps water supply / 5 fps hot water", source: "IPC 2021 Section 604.4" },
    ],
  },
  "friction-loss": {
    formula: "Hazen-Williams: hL = 4.52 × Q^1.852 / (C^1.852 × D^4.87) per 100 ft (water; English units). Darcy-Weisbach for gas and other fluids.",
    edition: "Hazen-Williams (AWWA M11, 5th ed., by name). Darcy-Weisbach: classical fluid mechanics.",
    freeAccess: "AWWA M11 licensed; principles free at engineering OCW. NIST fluid-property tables free at nist.gov.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (AWWA M11 5th ed. C-values; physical-fact Darcy-Weisbach).",
    assumptions: [
      { name: "Hazen-Williams C-value", value: "from data/plumbing/pipe-properties.json keyed to material; AWWA M11 5th ed.", source: "AWWA M11 by name" },
      { name: "Water temperature", value: "60 °F nominal", source: "engineering practice" },
    ],
  },
  "pipe-volume": {
    formula: "V = π × (D/2)² × L. Geometric volume of a right cylinder; gallons via 1 ft³ = 7.4805 gal.",
    edition: "Classical geometry; physical fact.",
    freeAccess: "NIST SP 811 unit factors free at nist.gov.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (geometry).",
    assumptions: [
      { name: "Pipe inner diameter", value: "schedule-40 ID per nominal trade size from data/plumbing/pipe-properties.json", source: "ASTM nominal pipe size" },
    ],
  },
  "pump-sizing": {
    formula: "Total dynamic head TDH = static lift + friction loss + velocity head + pressure required at outlet. Brake HP = (GPM × TDH) / (3960 × pump_efficiency).",
    edition: "Hydraulic Institute by name; Hazen-Williams (AWWA M11 5th ed.) for friction term.",
    freeAccess: "Hydraulic Institute standards licensed; principles free in published engineering texts and university OCW.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (engineering practice; manufacturer pump curves authoritative for selection).",
    assumptions: [
      { name: "Pump efficiency", value: "65% unless user supplies a curve point", source: "Hydraulic Institute typical for end-suction centrifugal" },
      { name: "Water density / specific gravity", value: "1.000 unless user supplies", source: "60 °F freshwater" },
    ],
  },
  "static-pressure-piping": {
    formula: "Pressure head from elevation (P = ρgh, English form 1 ft of water = 0.433 psi) plus accumulated friction loss along the run.",
    edition: "Classical fluid statics; AWWA M11 5th ed. C-values for the friction term.",
    freeAccess: "NIST fluid-property tables free at nist.gov; AWWA M11 licensed.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (physics).",
    assumptions: [
      { name: "Conversion factor", value: "1 ft H2O = 0.433 psi at 60 °F", source: "NIST" },
    ],
  },
  "gas-pipe-sizing": {
    formula: "Spitzglass / Weymouth public formulas with bundled gas properties; longest-length method per IFGC 2021 Section 402.4 and Tables 402.4(1)–(36).",
    edition: IFGC_2021 + " Section 402.4 and capacity tables.",
    freeAccess: ICC_FREE + " NFPA 54: " + NFPA54_FREE,
    governance: GOVERNANCE.plumbing,
    editionNote: IFGC_DISCLOSURE,
    assumptions: [
      { name: "Pressure-drop allowance", value: "0.5 in WC (low-pressure) / 1.0 psig (medium-pressure) unless user supplies", source: "IFGC 2021 Section 402.3" },
      { name: "Specific gravity", value: "0.60 natural gas / 1.50 propane", source: "data/plumbing/gas-pipe-capacity.json" },
    ],
  },
  "slope": {
    formula: "Slope expressed as fraction (1/4 inch per foot), degrees, and percent. Standard horizontal-drainage slopes per IPC 2021 Table 704.1.",
    edition: IPC_2021 + " Section 704, Table 704.1.",
    freeAccess: ICC_FREE,
    governance: GOVERNANCE.plumbing,
    editionNote: IPC_DISCLOSURE,
    assumptions: [
      { name: "Minimum slope rule", value: "1/4 in per ft for ≤ 2.5 in DWV; 1/8 in per ft for ≥ 3 in", source: "IPC 2021 Table 704.1" },
    ],
  },
  "pressure-conversion": {
    formula: "Bidirectional conversion between psi, ft of water head, in WC, kPa, and bar. 1 psi = 2.31 ft H2O at 60 °F.",
    edition: "NIST SP 811 unit factors; physical fact.",
    freeAccess: "Free at nist.gov.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (NIST unit factors).",
    assumptions: [
      { name: "Reference temperature for water-column conversions", value: "60 °F", source: "engineering convention" },
    ],
  },
  "backflow": {
    formula: "(reference page; no compute) Common backflow hazards mapped to typical preventer types (RP, DCV, PVB, AVB, AG) per the cross-connection categories described in IPC 2021 Section 608 / AWWA M14.",
    edition: IPC_2021 + " Section 608. AWWA M14 by name.",
    freeAccess: ICC_FREE + " AWWA M14 licensed; cross-connection program guides free at most state primacy agency sites.",
    governance: GOVERNANCE.plumbing,
    editionNote: IPC_DISCLOSURE,
    assumptions: [],
  },
  "water-hammer-arrestor": {
    formula: "PDI WH-201 method: arrestor size class A–F selected by branch length and fixture-unit count.",
    edition: "PDI WH-201 by name.",
    freeAccess: "PDI specifications licensed; manufacturer data sheets (Sioux Chief, Watts) free at each manufacturer site.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (PDI WH-201 sizing classes).",
    assumptions: [
      { name: "Closure speed assumption", value: "fast-closing solenoid valve", source: "PDI WH-201 by name" },
    ],
  },
  "recirc-pump-head": {
    formula: "Recirc head = friction loss along the recirc loop at design flow + minor-loss allowance for fittings. Sized for the longest closed-loop circuit per ASHRAE Handbook hot-water recirculation guidance.",
    edition: "ASHRAE Handbook (HVAC Applications) by name; Hazen-Williams (AWWA M11 5th ed.) for friction.",
    freeAccess: "ASHRAE Handbook licensed; ASHRAE 90.1 read-only at ashrae.org.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (engineering practice).",
    assumptions: [
      { name: "Design recirc flow", value: "0.5 gpm per branch unless user supplies", source: "ASHRAE Handbook typical" },
      { name: "Minor-loss factor", value: "20% of straight-pipe friction", source: "engineering practice" },
    ],
  },
  "recirc-loop-sizing": {
    formula: "q_per_ft = U * (T_hot - T_ambient). Q_total = q_per_ft * L. GPM = Q_total / (500 * set-point-delta). Friction head via Hazen-Williams (C=140 for copper). Pump-size ladder: 1/40 / 1/25 / 1/20 / 1/12 / 1/6 / 1/4 HP, with 25% wet-rotor wire-to-water efficiency factor.",
    edition: "ASPE Data Book Vol. 4 (Plumbing Engineering Design Handbook) Chapter 6 simplified per-foot heat-loss method. ASHRAE 90.1-2022 §7.4.4 for recirculation control.",
    freeAccess: "aspe.org for TOC.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Per-foot loss coefficients are operator-grade defaults that match ASPE Data Book Vol. 4 Ch. 6 simplified per-foot losses for copper pipe at typical residential conditions. AHJ governs.",
    assumptions: [
      { name: "Pipe material", value: "Type L copper", source: "ASPE typical residential recirc loop" },
      { name: "Loss-coefficient table", value: "U (Btu/hr/ft/°F-delta) by nominal size (0.5 / 0.75 / 1 / 1.25 / 1.5 in) and insulation thickness (0 / 0.5 / 1 / 1.5 in)", source: "ASPE Data Book Vol. 4 Ch. 6 simplified per-foot losses" },
      { name: "Insulation interpolation", value: "linear in insulation thickness between bundled break points", source: "engineering practice" },
      { name: "Pump efficiency", value: "25% wire-to-water for small wet-rotor circulators", source: "manufacturer typical (Taco / Grundfos / Bell & Gossett small circulators)" },
      { name: "Pump-size ladder", value: "1/40, 1/25, 1/20, 1/12, 1/6, 1/4 HP next-standard rounding", source: "common North American residential / light-commercial circulator sizes" },
      { name: "Length floor", value: "loops below 50 ft warned: 'may not need recirc; consider point-of-use heater'", source: "spec-v9 §B.4" },
      { name: "Insulation floor", value: "0-in insulation flagged as non-compliant for most ASHRAE 90.1 jurisdictions", source: "ASHRAE 90.1-2022 §7.4.4" },
    ],
  },

  "septic-tank": {
    formula: "Tank capacity from EPA on-site wastewater treatment manual sizing rules and state minimum-volume tables; required volume = bedrooms × per-bedroom rule + safety reserve.",
    edition: "U.S. EPA Onsite Wastewater Treatment Systems Manual (EPA/625/R-00/008); state-published per-bedroom rules.",
    freeAccess: "Free at epa.gov/septic. State rules free on each state department of health / DEQ site.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (EPA manual + state minimum-volume tables, refreshed at build time).",
    assumptions: [
      { name: "Per-bedroom rule", value: "from data/plumbing/septic-rules.json keyed to state when supplied; defaults to EPA manual minimums otherwise", source: "data/plumbing/septic-rules.json" },
    ],
  },
  "trap-arm": {
    formula: "Trap-arm horizontal length capped per IPC 2021 Section 909.1, Table 909.1 keyed to trap-arm size.",
    edition: IPC_2021 + " Section 909, Table 909.1.",
    freeAccess: ICC_FREE,
    governance: GOVERNANCE.plumbing,
    editionNote: IPC_DISCLOSURE,
    assumptions: [
      { name: "Trap-arm slope", value: "1/4 in per ft min, 1 pipe diameter max fall", source: "IPC 2021 Section 909.1" },
    ],
  },
  "pipe-expansion": {
    formula: "ΔL = α × L × ΔT. Linear thermal-expansion coefficient α per material from NIST and pipe-manufacturer technical bulletins.",
    edition: "NIST material properties; manufacturer technical bulletins by name.",
    freeAccess: "NIST data free at nist.gov; manufacturer bulletins free on each manufacturer site.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (material properties).",
    assumptions: [
      { name: "Coefficient table", value: "from data/plumbing/material-expansion.json keyed to pipe material", source: "NIST + manufacturer" },
      { name: "Reference (cold) temperature", value: "60 °F unless user supplies", source: "engineering practice" },
    ],
  },
  "tankless-gpm": {
    formula: "Required heater output (BTU/hr) = 8.34 × ΔT × GPM × 60. Solved for GPM given the heater's rated input × thermal efficiency.",
    edition: "ASHRAE Handbook (HVAC Systems and Equipment) by name; manufacturer ratings on the heater nameplate.",
    freeAccess: "ASHRAE Handbook licensed; manufacturer data sheets free at each manufacturer site.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (engineering practice + manufacturer data).",
    assumptions: [
      { name: "Specific heat × density factor", value: "8.34 (BTU per gal-°F)", source: "physical fact for water" },
      { name: "Default thermal efficiency", value: "0.82 unless user supplies a tested EF", source: "DOE federal minimum for gas tankless" },
    ],
  },
  "gas-leak-rate": {
    formula: "Orifice flow estimate Q = Cd × A × √(2 × ΔP / ρ); converted to scf/h with bundled natural-gas / propane density at standard conditions.",
    edition: "Classical fluid mechanics; orifice coefficient typical from public engineering references.",
    freeAccess: "NIST fluid-property tables free at nist.gov.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (physics).",
    assumptions: [
      { name: "Discharge coefficient Cd", value: "0.61 sharp-edged orifice unless user supplies", source: "engineering practice" },
      { name: "Gas density at standard conditions", value: "from data/plumbing/gas-pipe-capacity.json", source: "engineering reference" },
    ],
  },
  "stormwater-rational": {
    formula: "Q = C × i × A. C from bundled runoff coefficients per surface; i from user-supplied design rainfall intensity; A in acres yields Q in cfs (1 cfs ≈ 449 gpm).",
    edition: "Rational method by name (public hydrology). C-values from public engineering practice.",
    freeAccess: "Rainfall intensity / IDF curves free at hdsc.nws.noaa.gov (NOAA Atlas 14).",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (public hydrology).",
    assumptions: [
      { name: "C-values", value: "data/plumbing/runoff-coefficients.json keyed to surface", source: "public engineering practice" },
      { name: "Time of concentration", value: "user-supplied; method assumes Q peaks at Tc", source: "rational method assumption" },
    ],
  },
  "manning-slope": {
    formula: "English Manning V = (1.486 / n) × R^(2/3) × S^(1/2), solved for self-cleansing slope at 2 ft/s and the slope to carry target flow at half-full with R = D / 4.",
    edition: "Manning equation; n-values from USGS WSP-2339 (public domain).",
    freeAccess: "USGS WSP-2339 free at pubs.usgs.gov.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (USGS public-domain n-values).",
    assumptions: [
      { name: "Half-full hydraulic radius", value: "R = D / 4", source: "circular cross-section geometry" },
      { name: "Self-cleansing velocity", value: "2 ft/s for sanitary sewers", source: "public engineering practice" },
    ],
  },
  "hydrostatic-test": {
    formula: "Test pressure: 1.5× working pressure for water systems (IPC 2021 Section 312), 1.25× for fuel-gas systems (IFGC 2021 Section 406.4); recommended hold time scales with system volume.",
    edition: IPC_2021 + " Section 312; " + IFGC_2021 + " Section 406.4.",
    freeAccess: ICC_FREE,
    governance: GOVERNANCE.plumbing,
    editionNote: IPC_DISCLOSURE + " " + IFGC_DISCLOSURE,
    assumptions: [
      { name: "Default hold time", value: "≥ 15 min for plumbing tests; ≥ 10 min for fuel-gas tests", source: "IPC 2021 Section 312.3 / IFGC 2021 Section 406.4" },
    ],
  },
  "grease-trap": {
    formula: "Volume = peak GPM × retention time × loading factor. Recommended nominal sizes follow PDI G101 step ladder. IPC 2021 Section 1003 governs interceptor selection.",
    edition: "PDI G101 by name; " + IPC_2021 + " Section 1003.",
    freeAccess: ICC_FREE + " PDI G101 licensed; manufacturer (Schier, Thermaco, Rockford) sizing tools free.",
    governance: GOVERNANCE.plumbing,
    editionNote: IPC_DISCLOSURE,
    assumptions: [
      { name: "Retention time", value: "30 min unless user supplies", source: "PDI G101 by name" },
      { name: "Loading factor", value: "1.0 unless user supplies adjustment for high-grease use", source: "engineering practice" },
    ],
  },
  "glycol-mix": {
    formula: "Linear interpolation across manufacturer freeze-point curves for propylene glycol and ethylene glycol; gallons of concentrate = system_volume × concentration_target.",
    edition: "Manufacturer freeze-point curves (Dow Dowfrost / Dowtherm SR-1) by name.",
    freeAccess: "Free at dow.com / chemours.com technical bulletins.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (manufacturer freeze-point curves; quarterly recheck).",
    assumptions: [
      { name: "Curve table", value: "data/plumbing/glycol-curves.json keyed to glycol type", source: "Dow technical bulletins" },
    ],
  },
  "expansion-tank": {
    formula: "V_tank = V_sys × ((ρ_cold / ρ_hot) − 1) / (1 − P_initial_abs / P_final_abs). Absolute pressures (gauge + 14.7 psi); densities from a public water-density table.",
    edition: "ASHRAE Handbook (HVAC Systems and Equipment) by name; water-density table from NIST.",
    freeAccess: "NIST data free at nist.gov; ASHRAE Handbook licensed.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (engineering practice).",
    assumptions: [
      { name: "Working temperatures", value: "user-supplied (cold fill, hot operating)", source: "user input" },
      { name: "Final pressure margin", value: "set 5 psi below relief-valve setting", source: "ASHRAE Handbook by name" },
    ],
  },
  "backflow-loss": {
    formula: "Linear interpolation of manufacturer pressure-loss curves by device class (RP / DCV / PVB / AVB) and pipe size.",
    edition: "Manufacturer technical bulletins (Watts Series 909 RP / 909 DCV / 800 PVB / Series 8 AVB) by name.",
    freeAccess: "Free at watts.com.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (manufacturer curves; quarterly recheck).",
    assumptions: [
      { name: "Curve table", value: "data/plumbing/backflow-curves.json keyed to device class and size", source: "Watts technical bulletins" },
    ],
  },

  // --- Group H: Knowledge References (priority 3 per spec-v6.md §6,
  // covering the NFPA / IFC / OSHA / FEMA / FIRESCOPE reference set) ---
  // Reference pages, not calc tiles. The §3 "formula" line names the
  // page's content scope; the assumption lists are intentionally short
  // because reference pages do not apply tile-side constants.

  "color-codes": {
    formula: "(reference page; no compute) NEC conductor color conventions, IEC three-phase color conventions, and ASME A13.1 piping identification color scheme.",
    edition: NEC_2023 + " Sections 200, 210, 215, 250 by section. ASME A13.1-2020 by name. IEC 60446 (replaced by IEC 60445) by name.",
    freeAccess: NEC_FREE + " ASME A13.1 licensed; pipe-marking guides free at most state-DOT and pipe-marker manufacturer (Brady, Seton) sites.",
    governance: GOVERNANCE.general,
    editionNote: "Editions available: NEC 2023, IEC 60445, ASME A13.1-2020. Older NEC editions used the same color rules; ASME A13.1 was last updated in 2020.",
    assumptions: [],
  },
  "knot-reference": {
    formula: "(reference page; no compute) Common rigging and rescue knots (figure-eight, bowline, clove hitch, prusik, water knot, double fisherman) with typical strength-reduction percentages from public rope-rescue and arboriculture training materials.",
    edition: "NFPA 1006 / NFPA 1670 by name; National Fire Academy rope rescue training materials (U.S. government, public domain).",
    freeAccess: "NFA training materials free at usfa.fema.gov. NFPA 1006 / 1670 read-only at nfpa.org/freeaccess.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (training-material reference; original plain-English summary).",
    assumptions: [],
  },
  "inspection-checklist": {
    formula: "(reference page; no compute) Per-trade rough-in and final inspection checklists organized by inspection point: electrical (NEC 2023), plumbing (IPC 2021), mechanical (IMC 2021), and structural framing (IRC 2021).",
    edition: NEC_2023 + " " + IPC_2021 + " IMC 2021. IRC 2021. All cited by section number only.",
    freeAccess: NEC_FREE + " IPC / IMC / IRC: " + ICC_FREE,
    governance: GOVERNANCE.general,
    editionNote: "Editions available: NEC 2023, IPC 2021, IMC 2021, IRC 2021. Inspection points are stable across recent editions; section numbering may shift.",
    assumptions: [],
  },
  "emergency-contacts": {
    formula: "(reference page; no compute) Universal U.S. emergency and information numbers: 911 (emergency), 811 (call before you dig), 1-800-222-1222 (Poison Help), 1-800-321-OSHA (OSHA hotline), 301-415-7000 (NRC operations), and the per-state utility locator extensions.",
    edition: "FCC and state-PUC published assignments; refreshed annually.",
    freeAccess: "Free at call811.com, poisonhelp.org, osha.gov, and nrc.gov.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (refreshed at build time from federal-agency publications).",
    assumptions: [],
  },
  "tool-maintenance": {
    formula: "(reference page; no compute) Maintenance interval recommendations for common trade tools (drills, impact drivers, multimeters, megohmmeters, manometers, pipe wrenches, torque wrenches, etc.) compiled from manufacturer technical bulletins and OSHA 29 CFR 1910 Subpart P (Hand and Portable Powered Tools) requirements.",
    edition: "OSHA 29 CFR 1910 Subpart P by section. Manufacturer technical bulletins by name.",
    freeAccess: "29 CFR 1910 free at ecfr.gov. Manufacturer guides free on each manufacturer site.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (manufacturer + OSHA reference; refreshed annually).",
    assumptions: [],
  },
  "hand-signals": {
    formula: "(reference page; no compute) Crane, excavator, flagger, and aircraft-marshalling hand signals as described (not depicted) by name only. Image reproduction prohibited.",
    edition: "ASME B30.5 (Mobile and Locomotive Cranes) by name; OSHA 29 CFR 1926 Subpart CC; FAA AC 120-57B (aircraft marshalling).",
    freeAccess: "29 CFR 1926 free at ecfr.gov. FAA Advisory Circulars free at faa.gov/regulations_policies/advisory_circulars. ASME B30.5 licensed.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (descriptions only; image reproduction prohibited per ASME B30.5 / FAA copyright).",
    assumptions: [],
  },
  "osha-top10": {
    formula: "(reference page; no compute) Most-recently published OSHA Top 10 Most Frequently Cited Standards, listed by 29 CFR section number with topic.",
    edition: "OSHA-published top-10 list (refreshed annually each fiscal year).",
    freeAccess: "Free at osha.gov/top10citedstandards.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (refreshed annually from OSHA's published top-10 list).",
    assumptions: [],
  },
  "loto-steps": {
    formula: "(reference page; no compute) Standard 9-step lockout / tagout sequence (notify, identify, shut down, isolate, lock, release stored energy, verify, service, reverse) as required by OSHA 29 CFR 1910.147 (control of hazardous energy).",
    edition: "OSHA 29 CFR 1910.147 by section.",
    freeAccess: "Free at ecfr.gov.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (29 CFR 1910.147 stable since 1989; refreshed if OSHA updates).",
    assumptions: [],
  },
  "defensible-space": {
    formula: "(reference page; no compute) Zone 0 / 1 / 2 wildland-urban-interface defensible-space actions per CALFIRE 2022 guidance and NFPA 1144 (Standard for Reducing Structure Ignition Hazards from Wildland Fire).",
    edition: "CALFIRE 2022 'Defensible Space' guidance by name; NFPA 1144 by name. IBHS Wildfire Prepared Home program by name.",
    freeAccess: "CALFIRE guidance free at readyforwildfire.org. NFPA 1144: " + NFPA54_FREE + " IBHS guides free at ibhs.org.",
    governance: GOVERNANCE.fire,
    editionNote: "Editions available: CALFIRE 2022 (Zone 0 / Ember-Resistant Zone added 2020), NFPA 1144-2023. Verify the current edition adopted by your state forestry agency / AHJ.",
    assumptions: [],
  },
  "storm-shelter": {
    formula: "(reference page; no compute) FEMA P-320 (Taking Shelter from the Storm) and ICC 500 (Standard for the Design and Construction of Storm Shelters) wind-design, anchorage, door, and ventilation considerations.",
    edition: "FEMA P-320 (5th edition, 2021) by name; ICC 500-2020 by name.",
    freeAccess: "FEMA P-320 free at fema.gov. ICC 500 read-only at codes.iccsafe.org.",
    governance: GOVERNANCE.structural,
    editionNote: "Editions available: FEMA P-320 5th ed. (2021), ICC 500-2020. Verify the current edition adopted by your AHJ.",
    assumptions: [],
  },
  "triage-quickread": {
    formula: "(reference page; no compute) START (Simple Triage and Rapid Treatment) categories: immediate (red), delayed (yellow), minor (green), expectant (black). Decision tree based on respiration, perfusion, and mental status.",
    edition: "START / JumpSTART triage frameworks by name (Hoag Hospital / Newport Beach Fire 1983; JumpSTART 1995). FEMA NIMS ICS-100 / ICS-200 reference materials.",
    freeAccess: "START reference materials free at chemm.hhs.gov and at most state EMS authority sites. NIMS materials free at fema.gov/training.",
    governance: GOVERNANCE.field,
    editionNote: "Single-edition (triage framework; not medical advice; call 911. See sophiewell.com for clinical decision support).",
    assumptions: [],
  },

  // --- Group C: HVAC (priority 4 per spec-v6.md §6) ---
  // Tiles cite ACCA Manual J / D / S, ASHRAE 62.1-2022, IMC 2021, and
  // manufacturer P-T tables by name and edition. No ACCA / ASHRAE table
  // text is reproduced. The simplified Manual J cooling / heating tiles
  // explicitly disclose that they are estimators, not code-compliant load
  // calculations, per the spec §2.5 mechanical governance variant.

  "manual-j-cooling": {
    formula: "Sensible cooling load = U×A×ΔT + solar gain + internal gain + infiltration. Latent load = 0.69 × CFM_inf × Δgr (grains/lb). Simplified estimator only; ACCA Manual J 8th ed. is the code-compliant method.",
    edition: ACCA_J + " NOAA NCEI cooling design temperatures by location (public domain).",
    freeAccess: "ACCA Manual J licensed; principles free in published HVAC engineering texts. NOAA design temps free at ncei.noaa.gov.",
    governance: GOVERNANCE.mechanical,
    editionNote: ACCA_DISCLOSURE,
    assumptions: [
      { name: "Indoor design temperature", value: "75 °F unless user supplies", source: "ACCA Manual J 8th ed. typical" },
      { name: "Outdoor design temperature", value: "data/hvac/climate-data.json keyed to location (NOAA NCEI 99% / 1% values)", source: "NOAA NCEI" },
      { name: "Air density factor", value: "1.08 BTU/(hr × CFM × °F)", source: "ASHRAE Fundamentals by name (sea level, 70 °F)" },
    ],
  },
  "manual-j-heating": {
    formula: "Heating load = U×A×ΔT + infiltration sensible (1.08 × CFM_inf × ΔT). Simplified estimator only; ACCA Manual J 8th ed. is the code-compliant method.",
    edition: ACCA_J + " NOAA NCEI heating design temperatures by location.",
    freeAccess: "ACCA Manual J licensed. NOAA design temps free at ncei.noaa.gov.",
    governance: GOVERNANCE.mechanical,
    editionNote: ACCA_DISCLOSURE,
    assumptions: [
      { name: "Indoor design temperature", value: "70 °F unless user supplies", source: "ACCA Manual J 8th ed. typical" },
      { name: "Outdoor design temperature", value: "data/hvac/climate-data.json keyed to location (NOAA NCEI 99% values)", source: "NOAA NCEI" },
      { name: "Air density factor", value: "1.08 BTU/(hr × CFM × °F)", source: "ASHRAE Fundamentals by name (sea level, 70 °F)" },
    ],
  },
  "duct-sizing": {
    formula: "Equal-friction or static-regain method per ACCA Manual D 3rd ed. and ASHRAE Fundamentals duct chapter. Friction rate 0.08–0.10 in WC per 100 ft typical for residential systems.",
    edition: "ACCA Manual D, 3rd edition by name. ASHRAE Handbook (Fundamentals) by name.",
    freeAccess: "ACCA / ASHRAE Handbook licensed; principles free in published engineering texts.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Editions available: ACCA Manual D 3rd ed. is the current published edition. The simplified estimator on this tile does not replace Manual D for layouts.",
    assumptions: [
      { name: "Default friction rate", value: "0.08 in WC per 100 ft unless user supplies", source: "ACCA Manual D 3rd ed. typical" },
      { name: "Duct surface roughness", value: "data/hvac/duct-friction.json by material", source: "public engineering reference" },
    ],
  },
  "static-pressure-hvac": {
    formula: "Total external static pressure = sum of element pressure drops (filter + coil + grille + register + duct path) compared against the AHU's rated TESP.",
    edition: "Manufacturer AHU rating data + ACCA Manual D, 3rd edition by name.",
    freeAccess: "Manufacturer technical bulletins free on each manufacturer site.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (manufacturer rating data + ACCA Manual D).",
    assumptions: [
      { name: "Filter / coil drops", value: "user-supplied or manufacturer-published values", source: "manufacturer technical bulletin" },
    ],
  },
  "refrigerant-pt": {
    formula: "Saturated pressure or temperature lookup against manufacturer-published P-T data for R-22, R-410A, R-32, R-454B, R-744 (CO2), and R-1234yf.",
    edition: "Manufacturer P-T tables (DuPont, Honeywell, Chemours, Arkema) by name.",
    freeAccess: "Free at each manufacturer site (chemours.com, honeywell-refrigerants.com).",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (manufacturer P-T tables; quarterly recheck against the manufacturer's current bulletin).",
    assumptions: [
      { name: "P-T data", value: "data/hvac/refrigerants.json", source: "manufacturer-attributed per row" },
    ],
  },
  "superheat-subcool": {
    formula: "Superheat = suction-line temperature − saturation temperature at suction pressure. Subcool = saturation temperature at liquid-line pressure − liquid-line temperature.",
    edition: "Classical refrigeration cycle; manufacturer P-T tables for the saturation lookup.",
    freeAccess: "Refrigeration-cycle texts free at university OCW; manufacturer P-T tables free per refrigerant-pt.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (physics + manufacturer reference).",
    assumptions: [
      { name: "Superheat target", value: "manufacturer commissioning guide; typical 10–14 °F", source: "manufacturer technical bulletin" },
      { name: "Subcool target", value: "manufacturer commissioning guide; typical 10–12 °F", source: "manufacturer technical bulletin" },
    ],
  },
  "seer-eer": {
    formula: "EER = BTU/hr ÷ W (steady state at AHRI 95 °F outdoor / 80 °F indoor). SEER weights cooling capacity over an AHRI 210/240 seasonal bin profile. SEER2 / EER2 add return-static loading per the 2023 federal test procedure.",
    edition: "AHRI 210/240-2023 by name. DOE 10 CFR 430 (federal energy-conservation standards) by section.",
    freeAccess: "AHRI 210/240 licensed; DOE 10 CFR 430 free at ecfr.gov.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Editions available: AHRI 210/240-2023 is the current edition (SEER2 / EER2). Older equipment rated per AHRI 210/240-2008 (SEER / EER) is shown alongside.",
    assumptions: [
      { name: "Test conditions", value: "AHRI 95 °F outdoor / 80 °F indoor / 67 °F wet bulb", source: "AHRI 210/240" },
    ],
  },
  "balance-point": {
    formula: "Outdoor temperature at which heat-pump heating capacity equals the building heat-loss line. Solve C_design × (T_in − T_bp) = HP_capacity(T_bp) by interpolation across the manufacturer capacity-vs-OAT table.",
    edition: ACCA_J + " manufacturer heat-pump capacity tables by name.",
    freeAccess: "Manufacturer capacity tables free on each manufacturer site.",
    governance: GOVERNANCE.mechanical,
    editionNote: ACCA_DISCLOSURE,
    assumptions: [
      { name: "Heat-loss line", value: "linear in (T_in − T_outdoor) per Manual J convention", source: "ACCA Manual J 8th ed." },
    ],
  },
  "shr": {
    formula: "SHR = sensible cooling load / total cooling load. Used to select an indoor coil that matches the building's load profile.",
    edition: "ASHRAE Fundamentals by name; ACCA Manual S 2nd ed. for equipment selection.",
    freeAccess: "ACCA / ASHRAE Handbook licensed; principles free in published engineering texts.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (ASHRAE Fundamentals + ACCA Manual S).",
    assumptions: [],
  },
  "cfm-per-ton": {
    formula: "Standard 400 CFM per ton for cooling (12000 BTU/hr per ton). Adjusted to 350 CFM per ton in high-humidity climates and 450 CFM per ton in dry climates per ACCA Manual S 2nd ed. guidance.",
    edition: "ACCA Manual S, 2nd edition by name.",
    freeAccess: "ACCA Manual S licensed; principles free in published engineering texts.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (ACCA Manual S 2nd ed.).",
    assumptions: [
      { name: "1 ton = 12000 BTU/hr", value: "AHRI definition", source: "AHRI by name" },
    ],
  },
  "combustion-air": {
    formula: "Required combustion-air opening per IFGC 2021 §304 (standard method): 1 sq inch per 1000 BTU/hr for outdoor air, 1 sq inch per 4000 BTU/hr for indoor air with two openings.",
    edition: IFGC_2021 + " §304.",
    freeAccess: ICC_FREE,
    governance: GOVERNANCE.mechanical,
    editionNote: IFGC_DISCLOSURE,
    assumptions: [
      { name: "Standard method", value: "IFGC §304.5; known-air-infiltration method §304.6 not applied unless user supplies", source: "IFGC 2021" },
    ],
  },
  "compare-refrigerants": {
    formula: "Side-by-side P-T lookup for two refrigerants at the same temperature or pressure, plus GWP / safety-class comparison.",
    edition: "Manufacturer P-T tables (as per refrigerant-pt). ASHRAE 34 safety classifications by name.",
    freeAccess: "Manufacturer tables free at each manufacturer site. ASHRAE 34 read-only at ashrae.org.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (manufacturer P-T + ASHRAE 34 safety classes).",
    assumptions: [
      { name: "P-T data", value: "data/hvac/refrigerants.json", source: "manufacturer-attributed per row" },
    ],
  },
  "refrigerant-charge": {
    formula: "Total charge = factory charge + per-foot adder × (line length − rated length). Per-foot adders from manufacturer line-set tables (oz/ft) by refrigerant and liquid-line diameter.",
    edition: "Manufacturer line-set bulletins (Daikin, Carrier, Trane, Rheem) by name.",
    freeAccess: "Free at each manufacturer site.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (manufacturer line-set tables; quarterly recheck).",
    assumptions: [
      { name: "Per-foot adder table", value: "data/hvac/charge-per-foot.json", source: "manufacturer-attributed per row" },
    ],
  },
  "approach-delta-t": {
    formula: "Approach = T_liquid_line − T_outdoor (cooling) or T_supply − T_outdoor (heat-pump heating). Delta-T = T_return_air − T_supply_air. Targets compared against manufacturer commissioning guide ranges.",
    edition: "Manufacturer commissioning guides by name.",
    freeAccess: "Free at each manufacturer site.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (manufacturer commissioning targets).",
    assumptions: [
      { name: "Typical delta-T", value: "18–22 °F across the indoor coil for cooling", source: "manufacturer typical" },
    ],
  },
  "outdoor-air-mix": {
    formula: "Mixed-air dry bulb T_mix = (CFM_OA × T_OA + CFM_RA × T_RA) / (CFM_OA + CFM_RA). Outdoor-air ratio against ASHRAE 62.1 ventilation rates by occupancy.",
    edition: ASHRAE_62_1,
    freeAccess: ASHRAE_FREE,
    governance: GOVERNANCE.mechanical,
    editionNote: "Editions available: ASHRAE 62.1-2022 is the current published edition; ASHRAE 62.1-2019 is widely adopted in jurisdictions on IECC 2018.",
    assumptions: [
      { name: "Default occupancy ventilation rate", value: "user-supplied per ASHRAE 62.1-2022 Table 6-1", source: "ASHRAE 62.1-2022" },
    ],
  },
  "equivalent-length": {
    formula: "Sum of per-fitting equivalent lengths from public engineering tables; total run = straight pipe + Σ(equivalent lengths).",
    edition: "ASHRAE Handbook (Fundamentals) by name; engineering-practice consensus values.",
    freeAccess: "ASHRAE Handbook licensed; equivalent-length tables free in published engineering texts.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (engineering-practice consensus).",
    assumptions: [
      { name: "Fitting library", value: "data/hvac/equivalent-lengths.json", source: "public engineering reference" },
    ],
  },
  "wet-bulb-psychrometer": {
    formula: "Sling psychrometer dry-bulb / wet-bulb pair → relative humidity, dew point, and grains per pound via August-Roche-Magnus saturation-vapor-pressure approximation.",
    edition: "August-Roche-Magnus formulation by name; ASHRAE Fundamentals psychrometric chart by name.",
    freeAccess: "Psychrometric formulas free in published engineering texts.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (physics).",
    assumptions: [
      { name: "Atmospheric pressure", value: "14.696 psi (sea level) unless user supplies", source: "NIST" },
    ],
  },
  "insulation-thickness": {
    formula: "Heat loss / gain through pipe insulation: Q = (2π × k × L × ΔT) / ln(r2 / r1) for cylindrical insulation. Surface temperature compared against condensation / safe-touch limits.",
    edition: "ASHRAE Fundamentals by name; ASTM C680 for surface-condition calculation.",
    freeAccess: "ASTM C680 licensed; principles free in published engineering texts.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (engineering practice).",
    assumptions: [
      { name: "Insulation k-value", value: "data/hvac/insulation.json keyed to material", source: "manufacturer + public engineering reference" },
      { name: "Outside-film coefficient", value: "1.65 BTU/(hr × ft² × °F) horizontal pipe", source: "engineering practice" },
    ],
  },
  "evaporative-cooling": {
    formula: "Indirect-evaporative supply temperature ≈ T_db − ε × (T_db − T_wb). Latent heat of vaporization for water = 970.3 BTU/lb at 212 °F (used to convert water consumption to cooling output).",
    edition: "ASHRAE Fundamentals psychrometrics by name; classical thermodynamics.",
    freeAccess: "Psychrometric formulas free in published engineering texts.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (physics).",
    assumptions: [
      { name: "Default effectiveness ε", value: "0.85 indirect / 0.70 direct unless user supplies", source: "manufacturer typical" },
    ],
  },
  "affinity-laws": {
    formula: "Q2/Q1 = (N2/N1); H2/H1 = (N2/N1)²; P2/P1 = (N2/N1)³. Laws apply for geometrically similar fans / pumps at the same point of operation.",
    edition: "Hydraulic Institute / AMCA by name; classical pump and fan theory.",
    freeAccess: "Principles free in published engineering texts.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (physics).",
    assumptions: [
      { name: "Operating point", value: "constant (no system-curve change)", source: "affinity-law assumption" },
    ],
  },
  "belt-pulley": {
    formula: "V-belt length L = 2C + (π/2)(D + d) + (D − d)² / (4C). Driven RPM via diameter ratio. Belt speed (fpm) = π × D × RPM / 12.",
    edition: "Gates / Goodyear / Bando manufacturer drive-design manuals by name.",
    freeAccess: "Free at each manufacturer site.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (manufacturer geometry; physics).",
    assumptions: [
      { name: "V-belt cross-section", value: "user-supplied (A / B / 3V / 5V)", source: "manufacturer cross-section table" },
    ],
  },
  "air-receiver": {
    formula: "V = (t × (C_demand − C_pump) × P_atm) / (P1 − P2). Convert ft³ to gallons via 7.4805. Concurrent-tools count from a tool-list with duty-cycle prefix sum.",
    edition: "Compressed Air and Gas Institute (CAGI) handbook by name; ISO 8573 by name for air-quality classes.",
    freeAccess: "CAGI guides free at cagi.org.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (engineering practice).",
    assumptions: [
      { name: "Atmospheric pressure", value: "14.7 psi unless user supplies altitude correction", source: "NIST" },
    ],
  },
  "geothermal-loop": {
    formula: "Required loop length = peak design BTU/hr (max of heating, cooling) / BTU-per-foot benchmark from soil-class lookup (vertical / horizontal × dry / moist / saturated soil).",
    edition: "DOE / IGSHPA technical reports by name (U.S. government, public domain).",
    freeAccess: "DOE reports free at energy.gov / nrel.gov. IGSHPA training materials licensed.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (DOE / IGSHPA benchmarks; rock-horizontal explicitly unsupported).",
    assumptions: [
      { name: "BTU-per-foot table", value: "data/hvac/geothermal-soil.json keyed to soil class and loop type", source: "DOE technical reports" },
    ],
  },
  "baseboard-output": {
    formula: "Hydronic baseboard BTU/ft from manufacturer tables interpolated by water temperature; flow correction applied per manufacturer curve.",
    edition: "Slant/Fin Fine Line 30 typical-curve and high-output reference (manufacturer-attributed).",
    freeAccess: "Free at slantfin.com.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (manufacturer curves; quarterly recheck).",
    assumptions: [
      { name: "Curve table", value: "data/hvac/baseboard-output.json keyed to model and water temperature", source: "Slant/Fin technical literature" },
    ],
  },
  "npsh-a": {
    formula: "NPSHa = H_atm + H_static_source − H_friction − H_vapor (all in ft of pumped fluid). H_atm from elevation-lapse; H_vapor from a public engineering psi-by-temperature table converted via 2.31 ft/psi.",
    edition: "Hydraulic Institute by name; ASHRAE Fundamentals water-property tables.",
    freeAccess: "HI standards licensed; vapor-pressure data free at NIST.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (engineering practice).",
    assumptions: [
      { name: "Vapor-pressure table", value: "ASHRAE Fundamentals; converted via 2.31 ft H2O / psi", source: "ASHRAE Fundamentals" },
      { name: "Elevation lapse", value: "P_atm = 14.696 × (1 − 6.876e-6 × elev_ft)^5.2561", source: "ICAO Standard Atmosphere" },
    ],
  },

  // --- Group E: Carpentry and Construction (priority 5 per spec-v6.md §6) ---
  // Tiles cite IRC 2021 / IBC 2021 / ASCE 7-22 / AWC NDS-2018 / ACI 211 / ASTM /
  // SAE / AWS / OSHA by section number and edition. No code table text is
  // reproduced; ASCE 7 formulas are applied without reproducing the licensed
  // wording. The structural governance variant from spec §2.5 applies.

  "stairs": {
    formula: "Riser height and tread depth from total rise / number of risers; standard 7" + "″" + " max riser, 11" + "″" + " min tread per IRC 2021 §R311.7.",
    edition: IRC_2021 + " §R311.7.",
    freeAccess: ICC_FREE,
    governance: GOVERNANCE.structural,
    editionNote: IRC_DISCLOSURE,
    assumptions: [
      { name: "Standard riser max", value: "7-3/4 in residential per IRC §R311.7.5.1", source: "IRC 2021" },
      { name: "Standard tread min", value: "10 in residential per IRC §R311.7.5.2", source: "IRC 2021" },
    ],
  },
  "roof-pitch": {
    formula: "Pitch = rise / run, expressed as N/12 (carpenter form), degrees (atan2), and percent. Conversions for fall over distance.",
    edition: "Classical geometry; IRC 2021 §R905 references for slope minimums by roof-cover class.",
    freeAccess: ICC_FREE,
    governance: GOVERNANCE.structural,
    editionNote: IRC_DISCLOSURE,
    assumptions: [],
  },
  "rafter": {
    formula: "Rafter length L = sqrt(run² + rise²) plus tail and ridge plumb cuts. Birdsmouth depth limited to 1/3 rafter depth per IRC 2021 §R802.5.",
    edition: IRC_2021 + " §R802.5.",
    freeAccess: ICC_FREE,
    governance: GOVERNANCE.structural,
    editionNote: IRC_DISCLOSURE,
    assumptions: [
      { name: "Heel-cut depth limit", value: "≤ 1/3 of rafter depth", source: "IRC 2021 §R802.5" },
    ],
  },
  "square-footage": {
    formula: "Area = length × width (rectangle) and triangle / circle / sector for non-rectangular plans.",
    edition: "Classical geometry; IRC 2021 / IBC 2021 occupancy area definitions.",
    freeAccess: ICC_FREE,
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (geometry).",
    assumptions: [],
  },
  "board-footage": {
    formula: "Board feet = (thickness_in × width_in × length_ft) / 12. Rough-cut nominal vs. surfaced (S4S) actual dimensions resolved via NHLA / WWPA grading rules.",
    edition: "NHLA / WWPA grading rules by name.",
    freeAccess: "NHLA rule book licensed; WWPA standard grading rules free at wwpa.org.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (lumber-grading convention).",
    assumptions: [
      { name: "Nominal-to-actual table", value: "2x4 = 1.5 in × 3.5 in (S4S)", source: "WWPA standard grading rules" },
    ],
  },
  "concrete": {
    formula: "Volume = L × W × T converted to cubic yards (1 yd³ = 27 ft³); waste factor 5–10% added per ACI 301 / engineering practice.",
    edition: "ACI 301 by name. " + IBC_2021 + " §1905 references ACI 318 / 301.",
    freeAccess: "ACI standards licensed; principles free in published engineering texts.",
    governance: GOVERNANCE.structural,
    editionNote: IBC_DISCLOSURE,
    assumptions: [
      { name: "Default waste factor", value: "10% unless user supplies", source: "ACI 301 / engineering practice" },
    ],
  },
  "rebar": {
    formula: "Bars per direction = floor((dimension - 2 × cover) / spacing) + 1; total length = bars × dimension + lap-splice allowance per ACI 318 §25.5.",
    edition: "ACI 318-19 (Building Code Requirements for Structural Concrete) by name. " + IBC_2021 + " §1905 references ACI 318.",
    freeAccess: "ACI 318 licensed; principles free in published engineering texts.",
    governance: GOVERNANCE.structural,
    editionNote: IBC_DISCLOSURE,
    assumptions: [
      { name: "Default cover", value: "2 in (concrete cast against earth) unless user supplies", source: "ACI 318 §20.5.1.3" },
      { name: "Default lap splice", value: "40 × bar diameter for #5 and smaller (Class B)", source: "ACI 318 §25.5" },
    ],
  },
  "lumber-spans": {
    formula: "Allowable simple-beam span: deflection-limited L = sqrt(48 × E × I × Δ_allow / (5 × w × n)); strength-limited from M_allow = Fb × S. F_b and E from AWC NDS-2018 design values; deflection limit L/360 (live) or L/240 (total) per IRC §R301.7.",
    edition: AWC_NDS + " " + IRC_2021 + " §R301.7, R502.3, R802.4.",
    freeAccess: "AWC NDS free at awc.org/codes-standards. " + ICC_FREE,
    governance: GOVERNANCE.structural,
    editionNote: IRC_DISCLOSURE,
    assumptions: [
      { name: "Species / grade design values", value: "data/construction/lumber-properties.json keyed to species / grade", source: "AWC NDS / lumber-grading agency" },
      { name: "Default deflection limit", value: "L/360 live, L/240 total", source: "IRC 2021 §R301.7" },
    ],
  },
  "fastener-pullout": {
    formula: "Withdrawal capacity W = G^2 × D × p × L_threaded for nails (NDS Eq. 11.2-3 form); lag-screw withdrawal per NDS Table 12.2A. G is wood specific gravity.",
    edition: AWC_NDS + " Tables 11.2A / 12.2A.",
    freeAccess: "Free at awc.org/codes-standards.",
    governance: GOVERNANCE.structural,
    editionNote: "Editions available: AWC NDS-2018 is the current published edition.",
    assumptions: [
      { name: "Specific gravity table", value: "data/construction/lumber-properties.json keyed to species", source: "AWC NDS-2018" },
    ],
  },
  "beam-loading": {
    formula: "Simple-beam reactions / moment / deflection from load-type formulas (uniform, point, partial). M_max for uniform = wL²/8; deflection_max = 5wL⁴/(384 EI).",
    edition: "Classical mechanics of materials; AWC NDS-2018 design values for wood.",
    freeAccess: "Mechanics-of-materials texts free at university OCW. AWC NDS free at awc.org.",
    governance: GOVERNANCE.structural,
    editionNote: "Single-edition (physics + AWC NDS-2018).",
    assumptions: [
      { name: "Support condition", value: "simply supported", source: "calculation convention" },
    ],
  },
  "material-quantity": {
    formula: "Sheet / linear / plank quantities = area or run / unit + waste factor + per-edge cut allowance.",
    edition: "Engineering-practice waste-factor consensus.",
    freeAccess: "Free in published trade references.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering practice).",
    assumptions: [
      { name: "Default waste factor", value: "10% unless user supplies", source: "engineering practice" },
    ],
  },
  "stair-stringer": {
    formula: "Stringer length = sqrt((rise × n_risers)² + (run × n_treads)²) plus rise / drop adjustments at top and bottom plates.",
    edition: IRC_2021 + " §R311.7.",
    freeAccess: ICC_FREE,
    governance: GOVERNANCE.structural,
    editionNote: IRC_DISCLOSURE,
    assumptions: [],
  },
  "joist-deflection": {
    formula: "Mid-span deflection Δ = 5 × w × L⁴ / (384 × E × I) for uniformly loaded simple span. E and I from AWC NDS-2018 design values keyed to species / grade / size.",
    edition: AWC_NDS + " " + IRC_2021 + " §R301.7.",
    freeAccess: "Free at awc.org. " + ICC_FREE,
    governance: GOVERNANCE.structural,
    editionNote: IRC_DISCLOSURE,
    assumptions: [
      { name: "Section properties", value: "S4S actual dimensions per AWC NDS Supplement", source: "AWC NDS-2018" },
    ],
  },
  "footing-area": {
    formula: "Required bearing area A = P / q_allow. Allowable bearing pressure q_allow from IBC 2021 Table 1806.2 keyed to soil class.",
    edition: IBC_2021 + " Table 1806.2.",
    freeAccess: ICC_FREE,
    governance: GOVERNANCE.structural,
    editionNote: IBC_DISCLOSURE,
    assumptions: [
      { name: "Bearing-capacity table", value: "data/construction/soil-bearing.json keyed to soil class (USGS / IBC-mirrored)", source: "IBC 2021 Table 1806.2" },
    ],
  },
  "tile-count": {
    formula: "Tile count = floor area / tile_area + per-edge cut allowance. Grout volume = joint_area × depth × waste factor.",
    edition: "TCNA Handbook by name; ANSI A108 / A118 setting standards by name.",
    freeAccess: "TCNA Handbook licensed; ANSI standards licensed; principles free in trade references.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (TCNA / ANSI engineering practice).",
    assumptions: [
      { name: "Default waste factor", value: "10% straight set / 15% diagonal", source: "TCNA Handbook typical" },
    ],
  },
  "paint-coverage": {
    formula: "Gallons = total_area / coverage_per_gal × number_of_coats × waste factor.",
    edition: "Manufacturer technical data sheets (PDS) by name.",
    freeAccess: "Free at each manufacturer site (sherwin-williams.com, benjaminmoore.com, behr.com).",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (manufacturer PDS).",
    assumptions: [
      { name: "Default coverage", value: "350 ft²/gal latex unless user supplies", source: "manufacturer PDS typical" },
    ],
  },
  "excavation": {
    formula: "Volume = L × W × D plus side-slope swell volume for OSHA-compliant slopes (Type A / B / C per OSHA 29 CFR 1926 Subpart P).",
    edition: "OSHA 29 CFR 1926 Subpart P (Excavations).",
    freeAccess: "Free at ecfr.gov.",
    governance: GOVERNANCE.structural,
    editionNote: "Single-edition (OSHA 29 CFR 1926 Subpart P).",
    assumptions: [
      { name: "Soil swell factor", value: "user-supplied; typical 25% for clay / 15% for sand", source: "engineering practice" },
    ],
  },
  "masonry-count": {
    formula: "Brick count = wall_area / brick_face_area × layer factor. CMU count = wall_area / cmu_face_area. Allow 5% breakage waste.",
    edition: "BIA (Brick Industry Association) Technical Notes by name; NCMA TEK manuals by name.",
    freeAccess: "BIA Tech Notes free at gobrick.com. NCMA TEK manuals free at ncma.org.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (BIA / NCMA engineering practice).",
    assumptions: [
      { name: "Modular brick face area", value: "32 in² (4 in × 8 in nominal) unless user supplies", source: "BIA Tech Note 10" },
    ],
  },
  "wind-pressure": {
    formula: "Velocity pressure q = 0.00256 × V² × Kz × Kzt × Kd × Ke (psf). Public ASCE 7-22 formula. V from NOAA basic-wind-speed maps.",
    edition: ASCE_7 + " Section 26.10. Public formula; licensed text not reproduced. NOAA basic wind speeds (public domain).",
    freeAccess: "ASCE 7 licensed; ASCE-7 hazard tool free at asce7hazardtool.online (per ASCE outreach). NOAA wind data free at hazards.atcouncil.org.",
    governance: GOVERNANCE.structural,
    editionNote: IBC_DISCLOSURE,
    assumptions: [
      { name: "Air-density factor 0.00256", value: "ASCE 7-22 Section 26.10", source: "ASCE 7-22 by name" },
      { name: "Exposure / Kz / Kzt / Kd / Ke", value: "user-supplied or from data/construction/wind-snow-zones.json", source: "ASCE 7-22" },
    ],
  },
  "snow-load": {
    formula: "Flat-roof snow load Pf = 0.7 × Ce × Ct × Is × Pg (psf). Public ASCE 7-22 formula. Pg from NOAA ground-snow maps.",
    edition: ASCE_7 + " Section 7.3.",
    freeAccess: "ASCE 7 licensed; principles free in published structural texts. NOAA ground-snow data free at hazards.atcouncil.org.",
    governance: GOVERNANCE.structural,
    editionNote: IBC_DISCLOSURE,
    assumptions: [
      { name: "Default Ce / Ct / Is", value: "1.0 / 1.0 / 1.0 (Cat II, partially exposed, heated) unless user supplies", source: "ASCE 7-22 §7.3" },
      { name: "Pg map", value: "data/construction/wind-snow-zones.json", source: "NOAA / ASCE 7-22" },
    ],
  },
  "anchor-embedment": {
    formula: "Required tensile breakout depth from ACI 318 §17 anchor-design provisions; minimum embedment ratios per anchor type (cast-in / post-installed mechanical / adhesive).",
    edition: "ACI 318-19 §17 (Anchoring to Concrete). " + IBC_2021 + " §1908 references ACI 318.",
    freeAccess: "ACI 318 licensed; principles free in published structural texts.",
    governance: GOVERNANCE.structural,
    editionNote: IBC_DISCLOSURE,
    assumptions: [
      { name: "Manufacturer ICC-ES report", value: "user-supplied for post-installed anchors; required for code compliance", source: "ICC-ES evaluation reports" },
    ],
  },
  "drywall": {
    formula: "Sheets = wall_area / sheet_area + waste factor. Mud (joint compound) = 1 gal per ~70 ft² of seams. Tape = ~0.4 ft per ft² of wall. Screws ≈ 1 per ft² (16 in OC).",
    edition: "USG / National Gypsum technical literature by name; GA-216 (Gypsum Association Application and Finishing of Gypsum Panel Products) by name.",
    freeAccess: "GA-216 free at gypsum.org. Manufacturer guides free at usg.com / nationalgypsum.com.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (manufacturer + GA-216 engineering practice).",
    assumptions: [
      { name: "Default waste factor", value: "10% unless user supplies", source: "engineering practice" },
    ],
  },
  "roofing-squares": {
    formula: "Squares = roof_area / 100 ft² + pitch-based waste factor; bundles = squares × bundles_per_square (typically 3 for 3-tab, 3-4 for architectural). Underlayment + drip edge from linear quantities.",
    edition: "ARMA (Asphalt Roofing Manufacturers Association) Residential Asphalt Roofing Manual by name. " + IRC_2021 + " §R905.",
    freeAccess: "ARMA manuals free at asphaltroofing.org. " + ICC_FREE,
    governance: GOVERNANCE.general,
    editionNote: IRC_DISCLOSURE,
    assumptions: [
      { name: "Pitch-based waste factor", value: "8% (≤ 6/12) / 12% (8-9/12) / 17% (≥ 10/12)", source: "ARMA / engineering practice" },
    ],
  },
  "asphalt-tonnage": {
    formula: "Tonnage = volume × density / 2000. Density for HMA typical 145-150 pcf; truck-load conversion for 20-ton trucks.",
    edition: "NAPA (National Asphalt Pavement Association) Quality Improvement Series by name; AASHTO M 323 mix-design.",
    freeAccess: "NAPA guides free at asphaltpavement.org.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (NAPA / AASHTO engineering practice).",
    assumptions: [
      { name: "Default HMA density", value: "145 pcf unless user supplies mix-specific value", source: "NAPA typical" },
    ],
  },
  "aggregate": {
    formula: "Volume = L × W × D (cubic yards via /27); tonnage = volume × density. Density per material (3/4" + "″" + " gravel ~ 2700 lb/yd³, sand ~ 2700, river rock ~ 2900).",
    edition: "USGS / NSSGA aggregate density references by name.",
    freeAccess: "USGS free at usgs.gov.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (USGS / engineering reference).",
    assumptions: [
      { name: "Density table", value: "engineering-practice values per material", source: "USGS / NSSGA" },
    ],
  },
  "mortar-mix": {
    formula: "Bag yields per PCA / NCMA: 1 bag (94 lb Type N) yields ~3.0 ft³ mortar; joint volume from joint_thickness × wall_area_per_bag; brick / 8-inch CMU joint-thickness adjustment.",
    edition: "PCA (Portland Cement Association) Design and Control of Concrete Mixtures by name; ASTM C270 mortar specs by name.",
    freeAccess: "PCA / ASTM licensed; engineering-practice yield values free in published trade references.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (PCA / ASTM C270).",
    assumptions: [
      { name: "Mortar type yield", value: "Type N: 94 lb bag → 3.0 ft³ per PCA Table", source: "PCA" },
    ],
  },
  "concrete-mix-design": {
    formula: "ACI 211 simplified: w/c ratio interpolated by target strength and exposure class; water content from aggregate size + slump; cement = water / w_c; aggregate proportions per ACI 211 absolute-volume method.",
    edition: "ACI 211.1 (Standard Practice for Selecting Proportions for Normal, Heavyweight, and Mass Concrete) by name.",
    freeAccess: "ACI 211 licensed; principles free in published concrete texts.",
    governance: GOVERNANCE.structural,
    editionNote: "Single-edition (ACI 211.1 simplified estimator; full ACI 211 procedure supersedes).",
    assumptions: [
      { name: "Curve table", value: "data/construction/aci-211-curves.json keyed to strength / exposure", source: "ACI 211 by name" },
    ],
  },
  "bolt-torque": {
    formula: "T = K × D × F where T is torque (ft-lb), K is the nut factor, D is bolt diameter, F is desired clamp load (= proof load × torque-tension factor). Proof loads per ASTM / SAE bolt-grade specifications.",
    edition: "ASTM A325 / A490 / SAE J429 by name.",
    freeAccess: "ASTM / SAE licensed; principles free in Machinery's Handbook (free at archive.org for older editions).",
    governance: GOVERNANCE.structural,
    editionNote: "Single-edition (ASTM / SAE bolt-grade specifications).",
    assumptions: [
      { name: "Nut factor K", value: "0.20 dry / 0.15 lubricated unless user supplies", source: "engineering practice" },
      { name: "Proof-load table", value: "data/construction/bolt-grades.json", source: "ASTM / SAE by name" },
    ],
  },
  "bend-allowance": {
    formula: "BA = (π / 180) × angle × (R + K × t) where K is the K-factor (neutral-axis offset) and t is sheet thickness; flat blank = leg1 + leg2 + BA - setback.",
    edition: "Machinery's Handbook by name; SME Sheet Metal Forming by name.",
    freeAccess: "Older Machinery's Handbook editions free at archive.org.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice geometry).",
    assumptions: [
      { name: "Default K-factor", value: "0.33 (mild steel air bend) unless user supplies", source: "Machinery's Handbook typical" },
    ],
  },
  "speeds-feeds": {
    formula: "RPM = (SFM × 3.82) / D_in. Feed rate IPM = RPM × chipload × flutes. SFM and chipload from engineering-practice tables keyed to material and tool-type.",
    edition: "Machinery's Handbook engineering-consensus values; tooling-manufacturer (Sandvik, Kennametal, Niagara) recommendations by name.",
    freeAccess: "Older Machinery's Handbook editions free at archive.org. Manufacturer guides free at each tooling-manufacturer site.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice consensus).",
    assumptions: [
      { name: "SFM / chipload table", value: "data/construction/sfm-table.json keyed to material / tool-type", source: "Machinery's Handbook + manufacturer typical" },
    ],
  },
  "weld-usage": {
    formula: "Deposit weight = section_area × length × 0.283 lb/in³ (steel). Consumable weight = deposit / efficiency. Efficiency by process: SMAW ~65%, GMAW ~92%, FCAW ~82%, GTAW ~95%.",
    edition: "AWS Welding Handbook by name; AWS A5 series filler-metal specifications by name.",
    freeAccess: "AWS A5 specs licensed; AWS outreach materials free at aws.org.",
    governance: GOVERNANCE.structural,
    editionNote: "Single-edition (AWS deposition-efficiency benchmarks).",
    assumptions: [
      { name: "Deposition-efficiency table", value: "data/construction/aws-deposition.json", source: "AWS Welding Handbook" },
    ],
  },
  "demo-debris": {
    formula: "Tonnage = volume × density (pcf) / 2000. Densities by structure type (wood-frame ~ 18 pcf, masonry ~ 110, mixed-use ~ 60). Dumpster sizing across 10 / 20 / 30 / 40 yd³ steps.",
    edition: "EPA Construction and Demolition Debris Management guidance (EPA-530-K-16-002) by name; engineering-practice density values.",
    freeAccess: "Free at epa.gov/cdmaterials.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (EPA guidance + engineering practice).",
    assumptions: [
      { name: "Density per structure class", value: "engineering-practice consensus", source: "EPA / NDA" },
    ],
  },
  "formwork-pressure": {
    formula: "ACI 347 short-form pressure: P = C_w × (150 + 9000 × R / T) capped at the wet-head pressure ρgh. R is pour rate (ft/hr), T is concrete temperature (°F), C_w is unit-weight coefficient.",
    edition: "ACI 347R-14 (Guide to Formwork for Concrete) by name.",
    freeAccess: "ACI 347 licensed; engineering-practice formulas free in published concrete texts.",
    governance: GOVERNANCE.structural,
    editionNote: "Single-edition (ACI 347R-14 simplified formula; full procedure supersedes).",
    assumptions: [
      { name: "Concrete unit weight", value: "150 pcf normal-weight unless user supplies", source: "ACI 347" },
    ],
  },

  // --- Group J: Trucking and Logistics (priority 6 per spec-v6.md §6) ---
  // Tiles cite FMCSA 49 CFR 395 (HOS), 23 CFR 658.17 (Federal Bridge Formula),
  // NMFTA NMFC density brackets, ICC Incoterms 2020, and carrier / OEM
  // technical bulletins by name. The trucking governance variant from
  // spec §2.5 applies: "Math aid for personal verification. The ELD on
  // the truck and the carrier tariff are the legal record. State limits
  // may be lower than federal."

  "dim-weight": {
    formula: "DIM weight (lb) = L × W × H (in) / divisor. Billable weight = max(DIM, actual). Divisors are carrier-published per tariff (UPS, FedEx, USPS, DHL, LTL freight); cited by carrier name only.",
    edition: "Carrier-published tariffs (UPS Daily / Retail, FedEx Ground / Express, USPS Priority Mail, DHL Express, LTL freight) as of build date. Cited by carrier name only; tariff text not reproduced.",
    freeAccess: "Free at each carrier's published rate guide (ups.com/rates, fedex.com/rates, usps.com, dhl.com).",
    governance: GOVERNANCE.trucking,
    editionNote: "Single-edition (carrier-published divisors; semi-annual recheck per spec-v4 operations cadence; carriers update divisors at the start of each calendar year).",
    assumptions: [
      { name: "Divisor table", value: "data/trucking/dim-divisors.json keyed to carrier-tier", source: "carrier-attributed per row" },
    ],
  },
  "freight-density": {
    formula: "Density = weight (lb) / volume (ft³). NMFTA NMFC bracket assignment from density (lb/ft³) into Class 50 (>= 50 pcf) through Class 500 (< 1 pcf).",
    edition: "NMFTA NMFC density-class brackets by name. Cited by name only; NMFC item descriptions and commodity codes not reproduced.",
    freeAccess: "NMFC publication licensed; class-density bracket cutoffs free in published carrier rate guides.",
    governance: GOVERNANCE.trucking,
    editionNote: "Single-edition (NMFTA NMFC density brackets; classes 50 / 55 / 60 / 65 / 70 / 77.5 / 85 / 92.5 / 100 / 110 / 125 / 150 / 175 / 200 / 250 / 300 / 400 / 500).",
    assumptions: [
      { name: "Bracket cutoffs", value: "NMFTA-published density-class table", source: "NMFTA NMFC" },
    ],
  },
  "pallet-loadout": {
    formula: "Pallets per trailer = min(floor area / pallet footprint, weight rating / pallet weight). Cube-out vs. weigh-out flag = whichever bound binds first. Trailer specs: 53 ft / 48 ft / 28 ft pup / 40 ft reefer / 20 ft / 40 ft ocean container.",
    edition: "Carrier published trailer specs (Wabash National, Great Dane, Utility Trailer Manufacturing) by name; ISO 668 ocean-container specs by name.",
    freeAccess: "Trailer specs free at each manufacturer site. ISO 668 licensed; principles free in carrier rate guides.",
    governance: GOVERNANCE.trucking,
    editionNote: "Single-edition (trailer manufacturer + ISO 668 specs).",
    assumptions: [
      { name: "Standard pallet footprint", value: "48 in × 40 in (GMA) unless user supplies", source: "GMA pallet specification" },
      { name: "Trailer dimensions", value: "53 ft = 630 in × 100 in × 110 in interior typical", source: "trailer-manufacturer spec" },
    ],
  },
  "hos-math": {
    formula: "FMCSA 49 CFR 395.3: 11-hour driving limit, 14-hour on-duty window, 30-min break required after 8 cumulative hours of driving without a 30-min interruption, and either 70 hours / 8 days or 60 hours / 7 days depending on carrier election.",
    edition: "FMCSA 49 CFR 395.3 by section.",
    freeAccess: "Free at ecfr.gov.",
    governance: GOVERNANCE.trucking,
    editionNote: "Single-edition (49 CFR 395.3 as currently codified). State HOS rules may be more restrictive (CA 80-hour / 8-day, intrastate-only carve-outs in some states).",
    assumptions: [
      { name: "Property-carrying CMV", value: "true (passenger-carrying CMVs use 49 CFR 395.5)", source: "49 CFR 395" },
      { name: "Default 8-day rolling cycle", value: "70 hr / 8 days unless user supplies the 60 hr / 7 day election", source: "49 CFR 395.3(b)" },
    ],
  },
  "bridge-formula": {
    formula: "Federal Bridge Formula B: W = 500 × (LN / (N − 1) + 12N + 36) where W is the maximum allowed gross weight (lb) on a group of N consecutive axles spaced L feet apart. Single-axle limit 20 000 lb; tandem-axle limit 34 000 lb. Maximum gross 80 000 lb on Interstate routes.",
    edition: "23 CFR 658.17 by section (Federal-aid Highway Act of 1956 / FHWA Bridge Formula).",
    freeAccess: "Free at ecfr.gov.",
    governance: GOVERNANCE.trucking,
    editionNote: "Single-edition (23 CFR 658.17 as currently codified). State limits may be lower (especially on non-Interstate routes); some states exceed federal limits via grandfathering or annual permits.",
    assumptions: [
      { name: "Single / tandem caps", value: "20 000 lb / 34 000 lb", source: "23 CFR 658.17" },
      { name: "Gross-weight cap", value: "80 000 lb on Interstates unless permitted higher", source: "23 CFR 658.17" },
    ],
  },
  "reefer-burn": {
    formula: "Fuel burn (gal/hr) × ambient factor × hours = total fuel. Ambient factor 0.85 (cold) / 1.0 (moderate) / 1.20 (hot). Continuous vs. cycle-sentry / start-stop modes use different baseline GPH.",
    edition: "Manufacturer technical bulletins (Thermo King SB-series, Carrier Transicold Vector). Each entry attributes the publishing manufacturer.",
    freeAccess: "Free at thermoking.com and carriertransicold.com technical literature pages.",
    governance: GOVERNANCE.trucking,
    editionNote: "Single-edition (manufacturer-attributed benchmarks; quarterly recheck).",
    assumptions: [
      { name: "Mode baselines", value: "Thermo King continuous 0.65 / cycle 0.40; Carrier continuous 0.70 / cycle 0.45 (gph)", source: "data/trucking/reefer-burn.json" },
    ],
  },
  "incoterm-decoder": {
    formula: "(reference page; no compute) Plain-English decode of the eleven Incoterms 2020 rules (EXW, FCA, CPT, CIP, DAP, DPU, DDP, FAS, FOB, CFR, CIF) showing seller / buyer responsibility for transport, insurance, customs, and risk-transfer point.",
    edition: "ICC Incoterms 2020 by name. Cited by ICC name only; the official Incoterms 2020 publication is not reproduced.",
    freeAccess: "ICC Incoterms 2020 licensed (iccwbo.org). Free overviews from major carriers (DHL, Maersk, Kuehne+Nagel) summarize the eleven rules without reproducing the official text.",
    governance: GOVERNANCE.trucking,
    editionNote: "Editions available: Incoterms 2020 is the current published edition (effective 2020-01-01). Older contracts may reference Incoterms 2010 (notably with the EXW vs. FCA distinction); verify the edition named in the contract.",
    assumptions: [],
  },

  // --- Group K: Mechanic - Auto, Marine, Aviation (priority 7 per spec §6) ---
  // Tiles cite FAA Advisory Circulars, USCG / IMO stability documents, ASTM
  // fuel-property specs, and OEM service manuals by name. Aviation tiles
  // carry the spec §2.5 aviation governance variant (PIC + AFM); marine
  // tiles carry the marine variant (vessel master + USCG-approved loading
  // manual); the rest use general / structural as appropriate.

  "weight-balance": {
    formula: "Total moment = Σ (weight_i × arm_i). Center of gravity = total moment / total weight. Compare against AFM CG envelope and gross-weight limits.",
    edition: "FAA AC 91-23A (Pilot's Weight and Balance Handbook) by name. AFM (Airplane Flight Manual) by name; loading-graph values are aircraft-specific and user-supplied.",
    freeAccess: "FAA Advisory Circulars free at faa.gov/regulations_policies/advisory_circulars.",
    governance: GOVERNANCE.aviation,
    editionNote: "Single-edition (FAA AC 91-23A). The AFM loading graph or table for the specific aircraft and configuration governs; this tile is a math aid, not the official record.",
    assumptions: [
      { name: "Reference datum", value: "user-supplied per AFM (typical: firewall, leading edge, or fuselage station 0)", source: "aircraft-specific AFM" },
    ],
  },
  "prop-slip": {
    formula: "Theoretical knots = (RPM / gear_ratio) × pitch_in / 1056. Slip % = (theoretical − actual) / theoretical × 100. Planing 10–15% / displacement 25–30% category bands.",
    edition: "Classical marine-propeller theory; ABYC P-17 (Boat Propeller Selection) by name.",
    freeAccess: "ABYC standards licensed; principles free in published marine-engineering texts and at boatus.org.",
    governance: GOVERNANCE.marine,
    editionNote: "Single-edition (ABYC P-17 + classical propeller theory).",
    assumptions: [
      { name: "Constant 1056", value: "in/min × min/hr / (12 × 6076 ft/nm) = 1056", source: "knots-from-RPM derivation" },
    ],
  },
  "displacement-cr": {
    formula: "Displacement (in³) = π × (bore/2)² × stroke × n_cyl. Static compression ratio CR = (V_swept_per_cyl + V_TDC) / V_TDC where V_TDC = chamber + gasket + deck − dome.",
    edition: "Classical engine-design geometry; SAE J604 displacement / SAE J1349 power-rating by name.",
    freeAccess: "SAE standards licensed; principles free in published engine-design texts.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (geometry + SAE conventions).",
    assumptions: [
      { name: "Bore / stroke / chamber inputs", value: "user-supplied", source: "OEM service manual or measurement" },
    ],
  },
  "bolt-stretch": {
    formula: "Clamp load F = (stretch × area × E) / grip. Stretch is residual elongation after torque; E is fastener elastic modulus per material.",
    edition: "ASTM A325 / A490 / SAE J429 by name; SAE bolt material moduli (steel ~ 30e6 psi, stainless A2/A4 ~ 28e6, Inconel 718 ~ 29.6e6, titanium 6Al-4V ~ 16.5e6, aluminum 2024 ~ 10.6e6).",
    freeAccess: "ASTM / SAE licensed; engineering-property values free in Machinery's Handbook (older editions free at archive.org).",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (ASTM / SAE bolt material properties).",
    assumptions: [
      { name: "Elastic-region behavior", value: "true (stretch < proof-load yield)", source: "Hooke's law assumption" },
    ],
  },
  "driveshaft-crit": {
    formula: "Euler-Bernoulli first-mode whirl: N_crit (RPM) = (4.7 / L²) × sqrt((E × I) / (ρ × A)). Recommended max operating = 0.65 × N_crit (engineering-practice safety margin).",
    edition: "Euler-Bernoulli beam theory by name; AAM (American Axle) and Spicer / Dana driveshaft engineering manuals by name.",
    freeAccess: "Beam-theory principles free in mechanics-of-materials texts at university OCW.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (physics + manufacturer engineering practice).",
    assumptions: [
      { name: "Material moduli / densities", value: "from data/construction or user-supplied; steel E = 30e6 psi / ρ = 0.283 lb/in³ default", source: "engineering reference" },
      { name: "Operating margin", value: "0.65 × N_crit recommended", source: "AAM / Spicer engineering manuals" },
    ],
  },
  "fuel-range": {
    formula: "Energy stored (BTU) = tank_gal × LHV; range = tank × mpg × load_factor for liquid fuels; conversion to kWh via 1 BTU = 0.000293 kWh.",
    edition: "DOE EERE Alternative Fuels Data Center fuel-property table (LHV per fuel) by name; ASTM D975 (#2 diesel), D4814 (gasoline), D2 (jet A) by name.",
    freeAccess: "DOE AFDC free at afdc.energy.gov.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (DOE AFDC fuel-property values; refreshed semi-annually).",
    assumptions: [
      { name: "LHV table", value: "gasoline E10 ~ 112 000 BTU/gal; gasoline E85 ~ 81 800; diesel #2 ~ 129 500; LPG ~ 84 250; CNG ~ 33 800 BTU/cf; jet A ~ 124 000 BTU/gal", source: "DOE AFDC fuel-properties data sheet" },
    ],
  },
  "tire-gearing": {
    formula: "Effective tire diameter from metric size (e.g., 285/75R17): D_in = (W_mm × ratio/100 × 2 + R_in × 25.4) / 25.4. Revs/mile = 63 360 / (π × D). Effective ratio = axle_ratio × (rev/mi_stock / rev/mi_new).",
    edition: "Tire & Rim Association (TRA) Yearbook by name; ETRTO Standards Manual by name; SAE J267 metric-tire size convention.",
    freeAccess: "TRA / ETRTO licensed; principles free at most tire-manufacturer technical pages (Goodyear, Michelin).",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (TRA / ETRTO + SAE J267 size conventions).",
    assumptions: [
      { name: "Axle-ratio candidate set", value: "3.73 / 4.10 / 4.56 / 4.88 / 5.13 / 5.38 (common live-axle ratios)", source: "OEM ring-and-pinion catalogs" },
    ],
  },
  "brake-pad-life": {
    formula: "KE (BTU) = 0.5 × m × v² converted via 1 BTU = 778 ft-lb. Rotor temperature rise ΔT = KE / (mass_rotor × specific_heat). Wear rate by pad chemistry: organic / semi-metallic / ceramic typical mil-per-stop benchmarks.",
    edition: "Classical kinetic-energy theorem; SAE J661 friction test, SAE J2522 (brake performance) by name; manufacturer pad-chemistry technical bulletins (Akebono, EBC, Hawk, StopTech).",
    freeAccess: "SAE licensed; physical-fact derivations free in mechanics texts.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (physics + manufacturer wear-rate benchmarks).",
    assumptions: [
      { name: "Specific heat (cast-iron rotor)", value: "0.108 BTU/lb-°F", source: "engineering-practice value" },
      { name: "Wear-rate ranges", value: "organic ~ 0.5 mil/stop; semi-metallic ~ 0.3; ceramic ~ 0.2 (typical)", source: "manufacturer technical literature" },
    ],
  },

  // --- Group O: Kitchen and Food Service (priority 8 per spec §6) ---
  // Tiles cite FDA Food Code 2022, USDA FoodData Central, NSF/ANSI 2 / 3 / 4
  // (food equipment / pots and pans / commercial cooking equipment), and
  // GN (Gastronorm) pan conventions by name. The food-service governance
  // variant from spec §2.5 applies: "The thermometer on the food is the
  // verdict. Local health department governs."

  "recipe-scale": {
    formula: "Linear scaling of every ingredient by factor = target_yield / original_yield. Conversion to grams via USDA FoodData Central reference weights when scaling produces fractional eggs or unusual cup amounts (flour ~ 120 g/cup, sugar ~ 200 g/cup, butter ~ 227 g/cup, etc.).",
    edition: "USDA FoodData Central, accessed " + "at build time" + ".",
    freeAccess: "Free at fdc.nal.usda.gov.",
    governance: GOVERNANCE.food,
    editionNote: "Single-edition (USDA FoodData Central reference weights; semi-annual recheck).",
    assumptions: [
      { name: "Reference-weight table", value: "USDA FoodData Central 'Foundation Foods' density entries", source: "USDA FoodData Central" },
      { name: "Egg weight", value: "50 g per large egg (USDA)", source: "USDA grading standards for shell eggs" },
    ],
  },
  "yield-ep": {
    formula: "Yield % = EP weight / AP weight × 100. EP cost per lb = AP cost / yield. Cooking-loss adjustment applied as a second-stage yield where cooking changes the salable weight.",
    edition: "USDA FoodData Central yield factors by name; CIA Pro Chef textbook by name (engineering-practice yield benchmarks).",
    freeAccess: "USDA yield factors free at fdc.nal.usda.gov. CIA textbook licensed.",
    governance: GOVERNANCE.food,
    editionNote: "Single-edition (USDA yield factors; engineering-practice cooking-loss benchmarks).",
    assumptions: [
      { name: "Trim vs. cooking yield", value: "user-supplies the AP-to-EP ratio and (optionally) a separate cooking-loss percentage", source: "USDA yield factors" },
    ],
  },
  "cooling-curve": {
    formula: "FDA Food Code 2022 §3-501.14: cooked TCS food must cool from 135 °F to 70 °F within 2 hours and from 70 °F to 41 °F within 4 additional hours. Pass / fail flag computed against the user's measured times.",
    edition: "FDA Food Code 2022 §3-501.14.",
    freeAccess: "Free at fda.gov/food/retail-food-protection/fda-food-code.",
    governance: GOVERNANCE.food,
    editionNote: "Editions available: FDA Food Code 2022 is the current published edition. State and local health departments adopt on their own cycle (some still on the 2017 edition); verify the edition adopted by your AHJ.",
    assumptions: [
      { name: "TCS food", value: "true (Time/Temperature Control for Safety; non-TCS foods are not subject to §3-501.14)", source: "FDA Food Code 2022 §1-201.10" },
      { name: "Container / depth / ambient", value: "user-supplied; deeper than 4 in or non-shallow pans materially extend cooling time", source: "FDA Food Code 2022 Annex 3" },
    ],
  },
  "plate-cost": {
    formula: "Plate cost = Σ (ingredient EP cost × portion size). Suggested menu price = plate cost / target food-cost % (typical 28-32% in casual dining, 22-28% fine dining). Contribution margin = price − plate cost.",
    edition: "Engineering-practice food-cost benchmarks (NRA / National Restaurant Association published industry medians) by name; USDA FoodData Central for ingredient costs when bundled.",
    freeAccess: "NRA Restaurant Industry Forecast free at restaurant.org.",
    governance: GOVERNANCE.food,
    editionNote: "Single-edition (engineering-practice cost-control benchmarks; refresh as menu prices and ingredient costs shift).",
    assumptions: [
      { name: "Default target food-cost %", value: "30% unless user supplies (casual-dining median per NRA)", source: "NRA Restaurant Industry Forecast" },
    ],
  },
  "pan-conversion": {
    formula: "GN (Gastronorm) and U.S. Steam Table pan capacities by depth: full / 2-3 / half / 1-3 / quarter / sixth / ninth at 2.5 / 4 / 6 in depth. Cooling-depth warning when depth ≥ 4 in (FDA Food Code recommends shallow pans for rapid cooling).",
    edition: "NSF/ANSI 2-2022 (Food Equipment) and NSF/ANSI 4-2022 (Commercial Cooking, Rethermalization, and Powered Hot-Food Holding and Transport Equipment) by name; GN (DIN EN 631) Gastronorm pan dimensions by name.",
    freeAccess: "NSF/ANSI standards licensed; GN dimensions free at most pan-manufacturer (Vollrath, Cambro, Carlisle) technical pages. FDA Food Code free at fda.gov.",
    governance: GOVERNANCE.food,
    editionNote: "Single-edition (NSF/ANSI 2 / 4 + GN DIN EN 631 dimensions).",
    assumptions: [
      { name: "Full-size GN dimensions", value: "20.78 in × 12.78 in (1/1 GN per DIN EN 631)", source: "DIN EN 631" },
    ],
  },

  // --- Group M: Water and Wastewater Operations (priority 9 per spec §6) ---
  // Tiles cite EPA SDWA (40 CFR 141), AWWA standards (M11, M14, M28), Ten
  // States Standards (Recommended Standards for Water Works), and Metcalf
  // & Eddy (Wastewater Engineering: Treatment and Resource Recovery) by
  // name. The water governance variant from spec §2.5 applies: "Estimate.
  // Operator of record and primacy agency govern."

  "pounds-formula": {
    formula: "lb/day = flow (MGD) × dose (mg/L) × 8.34. Adjusted product feed = pure_lb / (purity %), keyed to the chemical: chlorine gas 100%, sodium hypochlorite 12.5%, calcium hypochlorite 65%, fluorosilicic acid 23%, alum dry 100% / liquid 48.5%, ferric chloride 38%.",
    edition: "AWWA M3 (Safety Practices for Water Utilities) by name; Water Environment Federation MOP-11 by name. The 8.34 factor is a physical constant: 1 gal H2O at 60 °F = 8.345 lb.",
    freeAccess: "AWWA / WEF manuals licensed; principles free in published water-treatment texts and at most state primacy-agency operator-training pages. EPA water-treatment manuals free at epa.gov.",
    governance: GOVERNANCE.water,
    editionNote: "Single-edition (engineering-practice constant + manufacturer purity tables; quarterly recheck of manufacturer purity values).",
    assumptions: [
      { name: "Mass per gallon", value: "8.34 lb (water at 60 °F)", source: "physical fact" },
      { name: "Chemical purity table", value: "manufacturer-attributed per chemical", source: "manufacturer technical bulletin" },
    ],
  },
  "filter-loading": {
    formula: "Loading rate (gpm/ft²) = filter_flow / filter_area. Backwash flow = backwash_rate × area. Categories: rapid sand 2-5 gpm/ft², high-rate 4-8 gpm/ft².",
    edition: "Ten States Standards (Recommended Standards for Water Works), Great Lakes - Upper Mississippi River Board of State and Provincial Public Health and Environmental Managers, current edition by name. AWWA B100 / B130 (filter media) by name.",
    freeAccess: "Ten States Standards licensed; principles free in published water-treatment texts.",
    governance: GOVERNANCE.water,
    editionNote: "Single-edition (Ten States Standards + AWWA filter-design conventions).",
    assumptions: [
      { name: "Default backwash rate", value: "15 gpm/ft² unless user supplies", source: "Ten States Standards typical" },
    ],
  },
  "detention-time": {
    formula: "Detention time = volume / flow. Used for chlorine contact (CT for Giardia / virus inactivation per EPA SWTR), flocculation, sedimentation. CT = concentration (mg/L) × T_10 contact time (min).",
    edition: "EPA Surface Water Treatment Rule (SWTR) 40 CFR 141 Subpart H by section. EPA Disinfection Profiling and Benchmarking Guidance Manual by name.",
    freeAccess: "40 CFR 141 free at ecfr.gov. EPA guidance manual free at epa.gov.",
    governance: GOVERNANCE.water,
    editionNote: "Single-edition (40 CFR 141 SWTR as currently codified). State primacy agencies may impose stricter CT requirements.",
    assumptions: [
      { name: "Plug-flow assumption", value: "T_10 ≈ 0.5-0.7 × theoretical detention time unless user supplies a tracer-study value", source: "EPA Disinfection Profiling Guidance" },
    ],
  },
  "lab-dilution": {
    formula: "C1V1 = C2V2 single-mode missing-side solve. Serial-mode: each step divides by the dilution factor; final concentration = C1 × DF^(-n_steps).",
    edition: "Standard Methods for the Examination of Water and Wastewater (APHA / AWWA / WEF), 24th edition by name.",
    freeAccess: "Standard Methods licensed; serial-dilution principles free at most NIH and university lab-protocol pages.",
    governance: GOVERNANCE.water,
    editionNote: "Editions available: Standard Methods 24th ed. is the current published edition. The C1V1 = C2V2 form is a physical-fact identity and stable across editions.",
    assumptions: [
      { name: "Volumetric accuracy", value: "Class A volumetric glassware (≤ 0.1% error) or calibrated pipettes", source: "Standard Methods 1010" },
    ],
  },
  "pump-eff-w2w": {
    formula: "Water HP WHP = (GPM × TDH) / 3960. Brake HP estimate BHP = motor_kW × 1.341 × motor_eff × drive_eff. Wire-to-water % = WHP / motor_HP × 100. Categories: ≥ 65% good, ≥ 50% ok, < 50% degraded.",
    edition: "Hydraulic Institute (HI) standards by name; ANSI/HI 14.6 (Rotodynamic Pumps for Hydraulic Performance Acceptance Tests) by name.",
    freeAccess: "HI standards licensed; principles free in published pump-engineering texts.",
    governance: GOVERNANCE.water,
    editionNote: "Single-edition (HI engineering-practice categories).",
    assumptions: [
      { name: "Constant 3960", value: "(550 ft-lb/sec/HP × 60 sec/min) / (8.34 lb/gal × 1 ft height) ≈ 3960", source: "physical-fact derivation" },
    ],
  },
  "srt-fm-ratio": {
    formula: "SRT (solids retention time, days) = (MLSS_lb in tank) / (TSS_lb wasted per day + TSS_lb lost in effluent per day). F/M ratio = BOD_lb_per_day / MLVSS_lb_in_tank. Conventional activated sludge typical: SRT 5-15 d, F/M 0.2-0.5.",
    edition: "Metcalf & Eddy (Wastewater Engineering: Treatment and Resource Recovery), 5th edition by name. Water Environment Federation MOP-8 (Design of Municipal Wastewater Treatment Plants) by name.",
    freeAccess: "Metcalf & Eddy / WEF MOP-8 licensed; principles free in EPA wastewater operator-training materials at epa.gov.",
    governance: GOVERNANCE.water,
    editionNote: "Single-edition (engineering-practice convention; CAS range from Metcalf & Eddy).",
    assumptions: [
      { name: "Conversion factor", value: "1 MGD × 1 mg/L × 8.34 = 1 lb/day (mass-balance constant)", source: "physical fact" },
      { name: "CAS range", value: "SRT 5-15 d, F/M 0.2-0.5 typical", source: "Metcalf & Eddy 5th ed." },
    ],
  },

  // --- Group D: Water Damage and Mold Restoration (priority 10 per spec §6) ---
  // Tiles cite IICRC S500-2021 (Standard for Professional Water Damage
  // Restoration), IICRC S520-2024 (Standard for Professional Mold
  // Remediation), EPA "Mold Remediation in Schools and Commercial Buildings"
  // (EPA 402-K-01-001), OSHA 29 CFR 1910.134 (Respiratory Protection), and
  // ASHRAE Fundamentals psychrometrics by name. Spec §2.5 carries no IICRC-
  // specific governance variant, so restoration tiles use the general
  // variant ("Estimate. AHJ and licensed professional govern.") — IICRC
  // S500 / S520 are private consensus standards, not law, but they are the
  // industry-standard care reference for damage-restoration work.

  "psychrometric": {
    formula: "Saturation vapor pressure es(T) = 6.112 × exp((17.62 × T) / (243.12 + T)) mb (August-Roche-Magnus). RH × es = e (actual vapor pressure). Dew point Td = (243.12 × ln(e/6.112)) / (17.62 - ln(e/6.112)). GPP = 7000 × (0.622 × e) / (P - e).",
    edition: "August-Roche-Magnus formulation by name; ASHRAE Handbook (Fundamentals) Chapter 1 (Psychrometrics) by name.",
    freeAccess: "Psychrometric formulas free in published engineering texts; ASHRAE Handbook licensed.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (physics).",
    assumptions: [
      { name: "Atmospheric pressure", value: "1013.25 mb (sea level) unless user supplies", source: "ICAO Standard Atmosphere" },
      { name: "Conversion 7000 gr/lb", value: "physical fact (1 lb water = 7000 grains)", source: "Avoirdupois weight system" },
    ],
  },
  "drying-goal": {
    formula: "Target indoor GPP = outdoor GPP - drying-gradient. IICRC S500-2021 'normal-drying' guidance: target 5-15 GPP below outdoor; psychrometric chart drives the dry-bulb / RH set point that delivers the target.",
    edition: "IICRC S500-2021 (Standard for Professional Water Damage Restoration) by name.",
    freeAccess: "IICRC standards licensed; principles free in published water-damage-restoration training literature.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (IICRC S500-2021; quarterly recheck).",
    assumptions: [
      { name: "Drying gradient", value: "5-15 GPP below outdoor (S500 normal-drying band) unless user supplies", source: "IICRC S500-2021" },
    ],
  },
  "dehumidifier": {
    formula: "Required dehumidifier capacity (PPD = pints per day) sized from affected cubic feet, water class (1-4 per IICRC S500), and category (1-3 per IICRC S500). AHAM-rated capacity is the published rating at 80 °F / 60% RH; field-rating at 75 °F / 50% RH is typically 60-70% of AHAM.",
    edition: "IICRC S500-2021 §10 (Equipment); AHAM DH-1-2008 (Dehumidifier rating standard) by name.",
    freeAccess: "AHAM standards licensed; rating principles free at AHAM (aham.org) outreach.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (IICRC S500-2021 + AHAM DH-1-2008).",
    assumptions: [
      { name: "AHAM-to-field derate", value: "0.65 (field-rated) unless user supplies", source: "engineering practice" },
    ],
  },
  "air-movers": {
    formula: "Number of air movers = max(area / 150 ft² per AM, perimeter / 12 ft per AM) per IICRC S500-2021 placement guidance (one AM per 150-300 ft² of affected floor, every 10-16 linear ft of wet wall).",
    edition: "IICRC S500-2021 §10 (Equipment) and §12 (Drying Process) by name.",
    freeAccess: "IICRC standards licensed; principles free in published water-damage-restoration training literature.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (IICRC S500-2021).",
    assumptions: [
      { name: "Per-AM coverage", value: "150 ft² Class 1, 200 ft² Class 2, 250 ft² Class 3, 300 ft² Class 4", source: "IICRC S500-2021 typical" },
    ],
  },
  "water-classes": {
    formula: "(reference page; no compute) IICRC S500-2021 water-loss classes (1 = least amount of water absorption through 4 = greatest, water trapped in materials with low evaporation rates) and categories (1 = sanitary / 2 = significantly contaminated / 3 = grossly contaminated). Original plain-English summary; standard text not reproduced.",
    edition: "IICRC S500-2021 §10.6 (Class) and §10.5 (Category) by section.",
    freeAccess: "IICRC S500-2021 licensed; original summaries free here. Industry overviews free at most restoration-equipment manufacturer (Phoenix, Dri-Eaz, B-Air) sites.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (IICRC S500-2021; original plain-English summary).",
    assumptions: [],
  },
  "drying-times": {
    formula: "(reference page; no compute) Typical drying-time benchmarks for common building materials (drywall 2-3 days, hardwood 4-7 days, carpet pad 1-2 days, plaster 5-10 days, etc.) based on engineering-practice observations and original plain-English notes.",
    edition: "IICRC S500-2021 by name; original plain-English notes by the project author.",
    freeAccess: "IICRC standards licensed; engineering-practice observations free in published restoration training literature.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (IICRC S500-2021 + original plain-English notes).",
    assumptions: [],
  },
  "mold": {
    formula: "(reference page; no compute) Mold-growth conditions: temperature 40-100 °F, RH ≥ 60-70% sustained, organic substrate, time ≥ 24-48 hours. EPA / IICRC S520-2024 thresholds.",
    edition: "EPA 402-K-01-001 (Mold Remediation in Schools and Commercial Buildings) + IICRC S520-2024 (Standard for Professional Mold Remediation) by name.",
    freeAccess: "EPA 402-K-01-001 free at epa.gov/mold. IICRC S520-2024 licensed.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (EPA 402-K-01-001 + IICRC S520-2024).",
    assumptions: [],
  },
  "ppe": {
    formula: "(reference page; no compute) PPE selection per IICRC S500-2021 / S520-2024 category mapping: Cat 1 (sanitary) - basic (gloves, boots); Cat 2 (significantly contaminated) - half-mask N95, eye, gloves, boots; Cat 3 (grossly contaminated) - full-face respirator (P100), Tyvek, gloves, boots. OSHA 29 CFR 1910.134 governs respiratory-protection program where required.",
    edition: "IICRC S500-2021 / S520-2024 by name; OSHA 29 CFR 1910.134 by section.",
    freeAccess: "29 CFR 1910.134 free at ecfr.gov. IICRC standards licensed.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (IICRC + OSHA 29 CFR 1910.134; OSHA's RPP is required for respirator use beyond voluntary N95).",
    assumptions: [],
  },
  "standing-water": {
    formula: "Volume = L × W × D for rectangular footprints; pool / partial-floor variants resolved geometrically. 1 ft³ water = 7.4805 gal × 8.34 lb/gal = 62.4 lb (room-temperature water).",
    edition: "Classical geometry; physical-fact density of water (62.4 lb/ft³ at 60 °F).",
    freeAccess: "NIST physical constants free at nist.gov.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (geometry).",
    assumptions: [
      { name: "Water density", value: "62.4 lb/ft³ at 60 °F", source: "NIST" },
    ],
  },
  "nam-sizing": {
    formula: "Required Negative Air Machine CFM = chamber_volume_ft³ × target_ACH / 60. 4-6 ACH for general containment; 12+ ACH for active mold remediation per IICRC S520-2024 §12.",
    edition: "IICRC S520-2024 §12 (Engineering Controls) by name; ASHRAE 170 (Ventilation of Health Care Facilities) by name for hospital-equivalent ACH.",
    freeAccess: "IICRC / ASHRAE standards licensed; ACH principles free in published engineering texts.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (IICRC S520-2024 + ASHRAE 170).",
    assumptions: [
      { name: "Default target ACH", value: "12 ACH (active remediation) unless user supplies", source: "IICRC S520-2024 §12" },
    ],
  },
  "hepa-filter-life": {
    formula: "Pre-filter loading: g per CFM-hour benchmarks from manufacturer technical bulletins; lifespan_hr = filter_capacity_g / (loading_rate × CFM). Particulate-load category low / medium / high adjusts the rate.",
    edition: "Manufacturer technical bulletins (Abatement Technologies, Phoenix, Dri-Eaz) by name; ANSI/ASHRAE 52.2 (Method of Testing General Ventilation Air-Cleaning Devices for Removal Efficiency by Particle Size) by name.",
    freeAccess: "ASHRAE 52.2 read-only at ashrae.org. Manufacturer bulletins free at each manufacturer site.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (manufacturer benchmarks; quarterly recheck).",
    assumptions: [
      { name: "Loading-rate table", value: "data/restoration/hepa-loading.json keyed to particulate category", source: "manufacturer technical bulletins" },
    ],
  },
  "thermal-delta-t": {
    formula: "(reference page; no compute) Thermal-imager delta-T interpretation: compare inspected component temperature against an unloaded reference of the same construction; ≥ 1 °C above reference flags moisture migration, ≥ 5-10 °C flags an active issue per IR-imaging engineering practice.",
    edition: "ASTM C1153 (Standard Practice for Location of Wet Insulation in Roofing Systems) by name; FLIR / Fluke published thermography training materials.",
    freeAccess: "ASTM licensed; training overviews free at flir.com / fluke.com / infraredtraining.com.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice IR thermography).",
    assumptions: [],
  },
  "containment-air-balance": {
    formula: "Orifice flow Q = 2610 × A × sqrt(ΔP) (cfm; A in ft², ΔP in inches WC). Recommended NAM count = required_negative_flow / per-NAM rated CFM.",
    edition: "Classical orifice-flow theory; constant 2610 from ASHRAE Fundamentals derivation. IICRC S520-2024 §12 for containment guidance.",
    freeAccess: "Orifice-flow derivations free in published engineering texts.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (physics).",
    assumptions: [
      { name: "Orifice constant 2610", value: "from ASHRAE Fundamentals (sharp-edge orifice, dry air, sea level)", source: "ASHRAE Fundamentals" },
      { name: "Default ΔP target", value: "0.02 in WC (negative pressure inside containment)", source: "IICRC S520-2024 §12" },
    ],
  },
  "chamber-turnover": {
    formula: "ACH = ((air_movers_total_cfm + dehu_cfm) × 60) / chamber_volume_ft³. Target ACH set by drying class (Class 1 ≥ 6, Class 2-3 ≥ 8, Class 4 ≥ 10 per IICRC S500-2021 typical). Gap = target_ACH - actual_ACH.",
    edition: "IICRC S500-2021 §12 (Drying Process) by name.",
    freeAccess: "IICRC licensed; principles free in published water-damage-restoration training literature.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (IICRC S500-2021).",
    assumptions: [
      { name: "Default target ACH", value: "Class 1 ≥ 6, Class 2-3 ≥ 8, Class 4 ≥ 10", source: "IICRC S500-2021 typical" },
    ],
  },

  "drying-log": {
    formula: "Per reading: GPP = humidity-ratio * 7000 from temperature_F / RH via the bundled psychrometric helper. Boundary-pass: chamber_GPP < ambient_GPP. Trend: linear regression of chamber_GPP vs day_index (least-squares). Estimated days-to-target = (target - intercept) / slope - last_day, when slope is negative.",
    edition: "IICRC S500-2021 (Standard for Professional Water Damage Restoration). Public-domain boundary-humidity test method; IICRC governs acceptance.",
    freeAccess: "iicrc.org for TOC; full standard is licensed.",
    governance: GOVERNANCE.general,
    editionNote: "Boundary-humidity test is a public method; the standard governs acceptance. Field instruments are the verdict; the calculator is a sanity envelope.",
    assumptions: [
      { name: "Maximum readings", value: "14 daily readings (one per day for a typical drying job)", source: "spec-v9 §H.1" },
      { name: "Default drying target", value: "ambient_GPP at the last reading minus 5 grains, when no explicit target is provided", source: "engineering practice (5-grain boundary margin)" },
      { name: "Trend model", value: "ordinary least-squares linear regression of chamber_GPP vs day_index", source: "engineering practice" },
      { name: "Boundary failure", value: "chamber_GPP at or above ambient_GPP surfaces 'check equipment placement and exhaust per IICRC S500'", source: "spec-v9 §H.1 edge case" },
      { name: "Flat / rising trend", value: "non-negative slope warns 'drying is not progressing - re-evaluate the drying plan'", source: "spec-v9 §H.1" },
    ],
  },

  // --- Group F: Fire-Ground Engineering (priority 11 per spec §6) ---
  // Tiles cite NFA hose-friction (U.S. government, public domain), NFPA 13
  // (sprinklers), NFPA 14 (standpipes), ISO Public Protection Classification,
  // OSHA 29 CFR 1910.146 (confined space), ASME B30.9 (slings), and
  // standard rescue / arboriculture mechanical-advantage references.

  "fire-friction": {
    formula: "Friction loss FL = C × Q² × L per 100 ft of hose. C and L per hose diameter from NFA training tables (1.75 in, 2.5 in, 3 in, 4 in, 5 in, etc.).",
    edition: "National Fire Academy hose-hydraulics training materials (U.S. government, public domain).",
    freeAccess: "Free at usfa.fema.gov/training.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (NFA training-materials hose-friction coefficients).",
    assumptions: [
      { name: "C-value table", value: "data/fire/hose-friction.json keyed to hose diameter", source: "NFA training materials" },
    ],
  },
  "pdp": {
    formula: "PDP = NP + FL + EL + AFL where NP is nozzle pressure, FL is hose friction, EL is elevation pressure (0.434 psi/ft), AFL is appliance friction.",
    edition: "NFA training materials by name; IFSTA Pumping Apparatus Driver/Operator Handbook by name.",
    freeAccess: "NFA materials free at usfa.fema.gov; IFSTA licensed.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (NFA + IFSTA engineering-practice values).",
    assumptions: [
      { name: "Elevation factor", value: "0.434 psi per ft of head", source: "physical fact (1 ft H2O = 0.434 psi at 60 °F)" },
    ],
  },
  "hydrant-flow": {
    formula: "Flow GPM = 29.83 × c × d² × sqrt(P_pitot). c = coefficient of discharge (0.90 typical for rounded outlets, 0.80 for square outlets, 0.70 for cocked-back outlets).",
    edition: "AWWA M17 (Installation, Field Testing, and Maintenance of Fire Hydrants) by name; ISO Public Protection Classification fire-flow methodology.",
    freeAccess: "AWWA M17 licensed; principles free at most state-DOT and water-utility training pages.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (AWWA M17 / ISO PPC).",
    assumptions: [
      { name: "Default coefficient", value: "0.90 (rounded outlet) unless user supplies", source: "AWWA M17 typical" },
    ],
  },
  "required-fire-flow": {
    formula: "ISO Needed Fire Flow NFF = (C × O × X × P) where C = 18 × F × sqrt(A), F is construction-class factor, O is occupancy hazard, X is exposure factor, P is communication factor.",
    edition: "ISO Public Protection Classification (PPC) Schedule by name.",
    freeAccess: "ISO PPC documents licensed; the per-class 0.6 / 0.8 / 1.0 / 1.2 / 1.5 F-factor multipliers are reproducible from ISO outreach materials.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (ISO PPC).",
    assumptions: [
      { name: "F / O / X / P tables", value: "data/fire/fire-flow-formulas.json", source: "ISO PPC Schedule" },
    ],
  },
  "master-stream": {
    formula: "Reach in feet = horizontal-stream and broken-stream reach by nozzle pressure and tip diameter, from NFPA 1965-published nozzle test data.",
    edition: "NFPA 1965 (Standard for Fire Hose Appliances) by name; NFA training-material reach tables.",
    freeAccess: "NFPA 1965 read-only at nfpa.org/freeaccess; NFA materials free at usfa.fema.gov.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (NFPA 1965 + NFA reach tables).",
    assumptions: [],
  },
  "aerial-ladder": {
    formula: "Horizontal reach = ladder_length × cos(angle); vertical reach = ladder_length × sin(angle) + apparatus turntable height.",
    edition: "NFPA 1901 (Standard for Automotive Fire Apparatus) by name; manufacturer aerial-device technical data sheets (Pierce, E-One, Sutphen) by name.",
    freeAccess: "NFPA 1901 read-only at nfpa.org/freeaccess; manufacturer specs free on each manufacturer site.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (NFPA 1901 + manufacturer aerial specs).",
    assumptions: [],
  },
  "foam": {
    formula: "Foam concentrate volume = application_rate (gpm/ft²) × area × duration × concentration_pct. Class A typical 0.1-0.5%, Class B AFFF/AR-AFFF 1-6%.",
    edition: "NFPA 11 (Standard for Low-, Medium-, and High-Expansion Foam) by name; manufacturer foam-concentrate technical data (National Foam, Chemguard, Solberg) by name.",
    freeAccess: "NFPA 11 read-only at nfpa.org/freeaccess.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (NFPA 11 + manufacturer concentrate specs).",
    assumptions: [
      { name: "Application-rate defaults", value: "0.10 gpm/ft² Class A; 0.16 gpm/ft² Class B AFFF (NFPA 11 typical)", source: "NFPA 11" },
    ],
  },
  "smoke-reading": {
    formula: "(reference page; no compute) Volume / velocity / density / color interpretation framework from Dave Dodson's 'Reading Smoke' methodology, by name.",
    edition: "Dave Dodson 'Reading Smoke' fire-service training materials by name; NFA Tactical-Decision-Making materials.",
    freeAccess: "NFA materials free at usfa.fema.gov.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (NFA training-material framework; original plain-English summary).",
    assumptions: [],
  },
  "reverse-lay-friction": {
    formula: "Single-pump: FL = C × Q² × L. Tandem (parallel): FL_parallel = FL_single / n² where n is the number of parallel hoses (each carrying Q/n).",
    edition: "NFA hose-hydraulics training materials by name.",
    freeAccess: "Free at usfa.fema.gov/training.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (NFA training).",
    assumptions: [
      { name: "Equal flow split", value: "Q / n per parallel hose unless user supplies a measured imbalance", source: "engineering practice" },
    ],
  },
  "sprinkler-density": {
    formula: "Total demand GPM = density (gpm/ft²) × area_of_operation (ft²) + hose-stream allowance per NFPA 13 §11.2 hydraulic calculations.",
    edition: "NFPA 13 (2022) §11.2 (Hydraulic Calculation Procedures) by name and section.",
    freeAccess: "NFPA 13 read-only at nfpa.org/freeaccess.",
    governance: GOVERNANCE.fire,
    editionNote: "Editions available: NFPA 13-2022 is the current published edition. Earlier editions (2019 / 2016 / 2013) shift area-of-operation curves slightly; verify the edition adopted by your AHJ.",
    assumptions: [
      { name: "Hose-stream allowance", value: "100 gpm light hazard / 250 gpm ordinary / 500 gpm extra hazard", source: "NFPA 13-2022 §11.2 typical" },
    ],
  },
  "standpipe-friction": {
    formula: "Total = elevation (0.434 psi/ft × height) + per-outlet friction + appliance friction. Min residual at the topmost outlet 100 psi for Class I per NFPA 14 §7.10.",
    edition: "NFPA 14 (2024) §7.10 (Pressure Limitations) by name and section.",
    freeAccess: "NFPA 14 read-only at nfpa.org/freeaccess.",
    governance: GOVERNANCE.fire,
    editionNote: "Editions available: NFPA 14-2024 is the current published edition; earlier editions (2019 / 2016 / 2013) carry slightly different residual-pressure requirements; verify the edition adopted by your AHJ.",
    assumptions: [
      { name: "Class I min residual", value: "100 psi at the topmost outlet", source: "NFPA 14-2024 §7.10" },
    ],
  },
  "ladder-pipe-reach": {
    formula: "Effective reach = aerial-tip horizontal projection + master-stream forward reach (from master-stream tile). Combines aerial-ladder geometry with NFPA 1965 nozzle reach.",
    edition: "NFPA 1901 + NFPA 1965 by name; NFA tactical-aerial training materials.",
    freeAccess: "NFPA standards read-only at nfpa.org/freeaccess; NFA materials free at usfa.fema.gov.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (NFPA 1901 / 1965 + NFA training).",
    assumptions: [],
  },
  "braking-distance": {
    formula: "Braking distance d = v² / (2 × g × (μ + grade)) + reaction_distance. Reaction distance = v × t_reaction. g = 32.2 ft/s².",
    edition: "Classical kinematics; AASHTO 'Policy on Geometric Design of Highways and Streets' (Green Book) by name.",
    freeAccess: "AASHTO Green Book licensed; kinematics free in physics texts.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (physics + AASHTO).",
    assumptions: [
      { name: "Default friction μ", value: "0.7 dry asphalt / 0.4 wet / 0.2 ice unless user supplies", source: "AASHTO Green Book typical" },
      { name: "Default reaction time", value: "1.5 s unless user supplies", source: "AASHTO Green Book typical" },
    ],
  },
  "confined-space-purge": {
    formula: "Time t = V × N / CFM where V is volume, N is target air changes (typically 4-7 for atmospheric clearance), CFM is the blower flow.",
    edition: "OSHA 29 CFR 1910.146 (Permit-Required Confined Spaces) by section. ANSI/ASSP Z117.1 (Safety Requirements for Entering Confined Spaces) by name.",
    freeAccess: "29 CFR 1910.146 free at ecfr.gov; ANSI/ASSP standards licensed.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (29 CFR 1910.146 as currently codified).",
    assumptions: [
      { name: "Default target air changes", value: "7 ACH for full atmospheric clearance unless user supplies", source: "OSHA 29 CFR 1910.146 / ANSI Z117.1" },
    ],
  },
  "confined-space-vent": {
    formula: "V = L * W * H (or operator-supplied volume). minutes_to_purge = V * N / Q. steady_ACH = Q * 60 / V. Default N (target air-changes) keyed to contaminant class: combustible-gas / oxygen-deficient / general = 7; H2S / CO = 10.",
    edition: "OSHA 29 CFR 1910.146 (Permit-Required Confined Spaces); NIOSH 80-106 (Working in Confined Spaces).",
    freeAccess: "ecfr.gov for 1910.146; cdc.gov/niosh for NIOSH 80-106.",
    governance: GOVERNANCE.fire,
    editionNote: "Companion to the v3 confined-space-purge tile. Adds L x W x H entry, contaminant-driven defaults, steady-state ACH, and the 1910.146(d)(5) 4-gas-meter reminder so the operator does not treat ventilation alone as space-certification.",
    assumptions: [
      { name: "Default ACH targets", value: "combustible-gas / oxygen-deficient / general 7 ACH; H2S / CO 10 ACH", source: "NIOSH 80-106 typical and engineering practice for denser-than-air contaminants" },
      { name: "Pre-entry monitoring", value: "calibrated 4-gas meter readings before and during entry are required regardless of ventilation result", source: "OSHA 29 CFR 1910.146(d)(5)" },
      { name: "Oxygen range", value: "O2 must be maintained between 19.5 and 23.5 percent", source: "OSHA 29 CFR 1910.146" },
      { name: "Purge-time warning", value: "purge time above 60 minutes surfaces a higher-capacity-blower hint", source: "engineering practice" },
      { name: "Steady-ACH floor", value: "steady-state ACH below 6 surfaces a 'verify blower placement / path length' warning per NIOSH 80-106 typical minimum", source: "spec-v9 §C.6" },
    ],
  },

  "rope-ma": {
    formula: "Theoretical MA per rig type × pulley_efficiency^n_pulleys. Haul force = load / actual_MA. Common rigs 1:1, 2:1, 3:1, 4:1 (Z-rig), 5:1 piggyback, T-method.",
    edition: "NFPA 1006 / NFPA 1670 by name; CMC Rope Rescue Manual + Rigging for Rescue training materials by name.",
    freeAccess: "NFPA standards read-only at nfpa.org/freeaccess; NFA rope-rescue materials free at usfa.fema.gov.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (NFPA + rescue-training engineering practice).",
    assumptions: [
      { name: "Pulley efficiency", value: "0.90 prussik-minding pulley / 0.95 ball-bearing pulley unless user supplies", source: "manufacturer typical" },
    ],
  },
  "sling-angle": {
    formula: "Per-leg tension L = W / (n × sin(θ/2)) for basket / bridle slings; vertical L = W / n; choker reduction factor 0.75 applied per ASME B30.9.",
    edition: "ASME B30.9 (Slings) by name and section.",
    freeAccess: "ASME B30.9 licensed; principles free at OSHA 29 CFR 1910.184 (free at ecfr.gov) and at major manufacturer (Crosby, Lift-It) technical pages.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (ASME B30.9 + OSHA 29 CFR 1910.184).",
    assumptions: [
      { name: "Choker derate", value: "0.75 (ASME B30.9 typical)", source: "ASME B30.9" },
    ],
  },

  // --- Group G: Cross-Trade Utilities (priority 11) ---
  // Mostly pure arithmetic and unit conversions. Tiles cite NIST SP 811,
  // IRS standard mileage, GSA per-diem, OSHA 29 CFR 1926 Subpart P, NIOSH
  // 1991 lifting equation, NWS heat / wind-chill formulas, ANSI A1264.1
  // (ladder angle), ICC A117.1 (ADA ramp), and engineering-practice
  // financial conventions.

  "unit-converter": {
    formula: "Bidirectional conversion across length / area / volume / mass / force / pressure / temperature / energy / power / flow / electrical units, all factors from NIST SP 811.",
    edition: "NIST SP 811 (Guide for the Use of the International System of Units (SI)) by name.",
    freeAccess: "Free at nist.gov.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (NIST SP 811; SI factors are physical-fact constants).",
    assumptions: [],
  },
  "material-cost": {
    formula: "Total cost = quantity × unit_price + tax + shipping. Pure arithmetic.",
    edition: "Engineering-practice arithmetic.",
    freeAccess: "n/a",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (arithmetic).",
    assumptions: [],
  },
  "markup": {
    formula: "Selling price = cost × (1 + markup_pct). Margin % = (price − cost) / price × 100. Pure arithmetic.",
    edition: "Engineering-practice arithmetic.",
    freeAccess: "n/a",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (arithmetic).",
    assumptions: [],
  },
  "time-and-materials": {
    formula: "Total billable = labor_hours × hourly_rate × (1 + OT_factor) + materials_cost × (1 + markup_pct) + travel.",
    edition: "Engineering-practice billing convention.",
    freeAccess: "n/a",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (arithmetic).",
    assumptions: [],
  },
  "sales-tax": {
    formula: "Tax = subtotal × state_rate. Total = subtotal + tax. State rates from data/crosswalks/state-tax-rates.json.",
    edition: "Each state revenue department's published rate by state. Verified at build time.",
    freeAccess: "Free at each state revenue-department site.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (state-published rates; monthly recheck).",
    assumptions: [
      { name: "Rate table", value: "data/crosswalks/state-tax-rates.json", source: "state revenue department per row" },
    ],
  },
  "tip-out": {
    formula: "Per-person split = total / count, optionally weighted by tip-out points per role.",
    edition: "Engineering-practice arithmetic.",
    freeAccess: "n/a",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (arithmetic).",
    assumptions: [],
  },
  "loan-payment": {
    formula: "Monthly payment M = P × (r × (1+r)^n) / ((1+r)^n − 1) where r = APR / 12 and n = months. Total interest = (M × n) − P.",
    edition: "Classical loan-amortization formula.",
    freeAccess: "Formula free in published finance texts.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (arithmetic).",
    assumptions: [
      { name: "Compounding frequency", value: "monthly (matching payment frequency)", source: "convention" },
    ],
  },
  "upgrade-roi": {
    formula: "Simple payback = capital / annual_savings. NPV = Σ (savings_t / (1 + r)^t) − capital. Discount rate r is user-supplied.",
    edition: "Classical capital-budgeting formulas.",
    freeAccess: "Formulas free in published finance / capital-budgeting texts.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (finance arithmetic).",
    assumptions: [
      { name: "Default horizon", value: "10 years unless user supplies", source: "engineering practice for capital upgrades" },
    ],
  },
  "mileage-cost": {
    formula: "Gallons = miles / mpg. Fuel cost = gallons × $/gal. IRS reimbursement = miles × IRS_standard_mileage_rate.",
    edition: "IRS-published standard mileage rate (current tax year).",
    freeAccess: "Free at irs.gov.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (IRS rate; annual update).",
    assumptions: [
      { name: "Rate", value: "data/crosswalks/irs-mileage.json (rate per mile in dollars)", source: "IRS-published standard mileage rate" },
    ],
  },
  "overtime": {
    formula: "Regular pay = min(hours, 40) × rate. OT = max(hours − 40, 0) × rate × 1.5 per FLSA 29 USC 207. Some states (CA, AK, NV) require daily OT.",
    edition: "Fair Labor Standards Act 29 USC 207 by section. State daily-OT rules per CA Labor Code §510, AK Stat §23.10.060, NV Admin Code §608.140.",
    freeAccess: "29 USC 207 free at uscode.house.gov; state codes free at each state legislature site.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (FLSA 29 USC 207 as currently codified). State daily-OT rules vary.",
    assumptions: [
      { name: "FLSA threshold", value: "40 hr/week federal; state daily thresholds may apply (CA / AK / NV 8 hr/day)", source: "29 USC 207 + state codes" },
    ],
  },
  "per-diem": {
    formula: "Lodging + M&IE per state from GSA-published per-diem rates (CONUS). DC, NY, MA, HI etc. carry standard-CONUS-plus values.",
    edition: "GSA Federal Travel Regulation per-diem rates, current fiscal year.",
    freeAccess: "Free at gsa.gov/travel/plan-book/per-diem-rates.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (GSA rates; annual update each fiscal year).",
    assumptions: [
      { name: "Rate table", value: "data/crosswalks/gsa-perdiem.json keyed to state", source: "GSA-published rate" },
    ],
  },
  "geometry": {
    formula: "Circle / ellipse (Ramanujan perimeter) / hexagon / sphere area, perimeter, volume formulas. Classical geometry.",
    edition: "Classical geometry; physical fact.",
    freeAccess: "Free in geometry texts.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (geometry).",
    assumptions: [],
  },
  "dilution": {
    formula: "Concentrate volume = total × target_strength / source_strength. Diluent = total − concentrate.",
    edition: "Classical mass-balance arithmetic.",
    freeAccess: "Free in chemistry texts.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (arithmetic).",
    assumptions: [],
  },
  "slope-from-level": {
    formula: "Bidirectional conversion: percent ↔ degrees ↔ inches per foot. tan(angle) = rise/run = pct/100; rise_in_per_ft = pct × 0.12.",
    edition: "Classical trigonometry.",
    freeAccess: "Free in math texts.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (trigonometry).",
    assumptions: [],
  },
  "haversine": {
    formula: "Great-circle distance via the haversine formula a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2); d = 2 × R × atan2(sqrt(a), sqrt(1−a)). R = 6371 km mean earth radius.",
    edition: "Classical spherical trigonometry; WGS84 mean radius.",
    freeAccess: "Free in navigation texts and at Movable Type Scripts (movable-type.co.uk).",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (spherical geometry; mean spherical earth model).",
    assumptions: [
      { name: "Earth radius", value: "6371 km (mean spherical) — actual oblate-spheroid distance can differ ≤ 0.5%", source: "WGS84 mean radius" },
    ],
  },
  "trench-slope": {
    formula: "Maximum allowable slope ratio (H:V) per OSHA 29 CFR 1926.652 and Appendix B: Type A 0.75:1, Type B 1:1, Type C 1.5:1. Benching geometry per Appendix B Figure B-1.1.",
    edition: "OSHA 29 CFR 1926 Subpart P and Appendix B by section.",
    freeAccess: "Free at ecfr.gov.",
    governance: GOVERNANCE.structural,
    editionNote: "Single-edition (29 CFR 1926 Subpart P as currently codified).",
    assumptions: [
      { name: "Soil-class table", value: "data/crosswalks/osha-trench.json", source: "29 CFR 1926 Appendix B" },
    ],
  },
  "niosh-lifting": {
    formula: "RWL = LC × HM × VM × DM × AM × FM × CM. LC (load constant) = 51 lb. Lifting Index LI = weight / RWL; LI > 1 indicates risk.",
    edition: "NIOSH 'Applications Manual for the Revised NIOSH Lifting Equation' (DHHS Publication No. 94-110, 1994) by name.",
    freeAccess: "Free at cdc.gov/niosh/docs/94-110.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (NIOSH 1991 equation; stable since 1994 publication).",
    assumptions: [
      { name: "Coupling-multiplier table", value: "data/crosswalks/niosh-coupling.json", source: "NIOSH Applications Manual" },
      { name: "Load constant", value: "51 lb", source: "NIOSH 1991" },
    ],
  },
  "heat-stress": {
    formula: "NWS Heat Index = polynomial of T_db (°F) and RH (%) (Steadman regression); WBGT estimate from public OSHA heat-illness work-rest table; OSHA-style work / rest cycle by exertion.",
    edition: "NWS Heat Index polynomial by name; OSHA Heat Illness Prevention work-rest table by name.",
    freeAccess: "Free at weather.gov/safety/heat-index and osha.gov/heat-exposure.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (NWS / OSHA public formulas).",
    assumptions: [
      { name: "Default acclimatization", value: "user-supplied (acclimatized vs. unacclimatized worker)", source: "OSHA Heat Illness Prevention" },
    ],
  },
  "wind-chill": {
    formula: "NWS 2001 Wind Chill: WC = 35.74 + 0.6215 × T − 35.75 × V^0.16 + 0.4275 × T × V^0.16 (T °F, V mph, valid V ≥ 3 mph).",
    edition: "NWS Wind Chill Temperature Index, 2001 revision.",
    freeAccess: "Free at weather.gov/safety/cold-wind-chill.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (NWS 2001 formula; replaced the 1945 Siple-Passel formulation).",
    assumptions: [
      { name: "Frostbite-time table", value: "5 / 10 / 30 min thresholds per NWS table", source: "NWS Wind Chill Chart" },
    ],
  },
  "ladder-angle": {
    formula: "4:1 rule: base distance = working_length / 4. Angle θ = atan(rise / run); pass band 75-77 degrees per ANSI A14.7 / A1264.1 (target 75.5°).",
    edition: "ANSI A14.7 (Mobile Ladder Stands and Mobile Ladder Stand Platforms) and ANSI/ASSP A1264.1 by name; OSHA 29 CFR 1926.1053 by section.",
    freeAccess: "29 CFR 1926.1053 free at ecfr.gov; ANSI standards licensed.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (ANSI + OSHA stable convention).",
    assumptions: [
      { name: "Pass-fail target", value: "75.5° (4:1)", source: "ANSI A14.7" },
    ],
  },
  "pulley-ma-gen": {
    formula: "Theoretical MA = number of supporting rope segments. Actual MA = theoretical × pulley_efficiency^n_pulleys. Fixed pulley redirects but does not multiply force; movable pulley × 2; block-and-tackle = 2n for n sheaves.",
    edition: "Classical mechanics; NFPA 1006 / 1670 by name for rescue context.",
    freeAccess: "Mechanics texts free at university OCW.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (physics).",
    assumptions: [
      { name: "Default pulley efficiency", value: "0.95 ball-bearing / 0.90 prussik-minding", source: "manufacturer typical" },
    ],
  },
  "ramp-slope": {
    formula: "Slope ratio (run:rise); 1:12 max per ADA Standards §405.2 (≤ 8.33% / 4.76°). Cross-slope ≤ 1:48 per ADA §403.3.",
    edition: "ADA Standards for Accessible Design (2010) §405; ICC A117.1-2017 by name.",
    freeAccess: "ADA Standards free at ada.gov; ICC A117.1 read-only at codes.iccsafe.org.",
    governance: GOVERNANCE.structural,
    editionNote: "Single-edition (ADA 2010 Standards + ICC A117.1-2017).",
    assumptions: [
      { name: "Pass-fail threshold", value: "1:12 (8.33%) maximum running slope; 1:48 max cross-slope", source: "ADA §405.2 / §403.3" },
    ],
  },
  "rainwater-yield": {
    formula: "Annual gallons = catchment_area_ft² × annual_rainfall_in × 0.6233 × collection_efficiency. The 0.6233 constant converts in × ft² to gallons (1 in × 1 ft² = 0.6233 gal).",
    edition: "ARCSA (American Rainwater Catchment Systems Association) Rainwater Harvesting Manual by name; NOAA precipitation data.",
    freeAccess: "ARCSA materials free at arcsa.org. NOAA precipitation data free at hdsc.nws.noaa.gov.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (ARCSA + NOAA precipitation data).",
    assumptions: [
      { name: "Default collection efficiency", value: "0.85 (asphalt-shingle roof) unless user supplies", source: "ARCSA typical" },
    ],
  },
  "timesheet": {
    formula: "Per-job hours summed; OT = max(total − 40, 0) × rate × 1.5; reimbursable miles × IRS rate.",
    edition: "FLSA 29 USC 207 by section + IRS standard mileage rate.",
    freeAccess: "Free at uscode.house.gov and irs.gov.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (FLSA + IRS).",
    assumptions: [],
  },
  "vehicle-load": {
    formula: "Front axle = Σ(weight × (wheelbase − distance_from_rear)) / wheelbase; Rear = total − Front. Compared against user-supplied GVWR and per-axle GAWR labels.",
    edition: "FMVSS 49 CFR 567.4 (vehicle certification labels) by section.",
    freeAccess: "Free at ecfr.gov.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (49 CFR 567.4 GVWR/GAWR convention).",
    assumptions: [
      { name: "GVWR / GAWR source", value: "vehicle door-jamb sticker (legal record)", source: "49 CFR 567.4" },
    ],
  },
  "job-estimate-rollup": {
    formula: "(meta-utility; no compute) Compose this session's calculator outputs into a printable estimate sheet. Pure DOM aggregation.",
    edition: "Site-internal feature (no external citation).",
    freeAccess: "n/a",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (site feature).",
    assumptions: [],
  },
  "material-order-list": {
    formula: "(meta-utility; no compute) Aggregate quantity outputs across this session's quantity-producing utilities into a single order list. Pure DOM aggregation.",
    edition: "Site-internal feature (no external citation).",
    freeAccess: "n/a",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (site feature).",
    assumptions: [],
  },
  "job-pack": {
    formula: "(meta-utility; no compute) Compose the user's pinned set + bundled inputs into a single printable job sheet with crew, date, and address fields. Pure DOM aggregation.",
    edition: "Site-internal feature (no external citation).",
    freeAccess: "n/a",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (site feature).",
    assumptions: [],
  },

  // --- Group L: Agriculture and Forestry (priority 11) ---
  // Tiles cite USDA, ASABE Standards, public log-volume tables (Doyle,
  // Scribner Decimal C, International 1/4), and engineering-practice
  // tractor and irrigation conventions.

  "gpa-rate": {
    formula: "GPA = (5940 × GPM) / (speed_mph × spacing_in). The constant 5940 = 60 min/hr × 43 560 ft²/acre / (12 in/ft × ?)... derives from unit reconciliation.",
    edition: "ASABE EP367 (Guide for Preparing Field Sprayer Calibration Procedures) by name; manufacturer sprayer-calibration guides (John Deere, AGCO, Case IH) by name.",
    freeAccess: "ASABE standards licensed; calibration principles free at most state-extension service pages (e.g., extension.psu.edu).",
    governance: GOVERNANCE.pesticide,
    editionNote: "Single-edition (ASABE EP367 + manufacturer calibration guides). Pesticide labels supersede this calculation: read and follow the product label.",
    assumptions: [
      { name: "Constant 5940", value: "engineering-practice constant for GPM-to-GPA at 1 mph nozzle spacing", source: "ASABE EP367" },
    ],
  },
  "timber-cruise": {
    formula: "Doyle: BF = ((D − 4)² × L) / 16. Scribner Decimal C: from public tabulated values keyed to D (in) and L (ft). International 1/4 inch: BF = 0.22 × D² − 0.71 × D (16-ft log basis).",
    edition: "Public log-volume tables (Doyle 1825, Scribner Decimal C, International 1/4-inch USDA Forest Service publications); USDA Forest Service Manual 2400 by name.",
    freeAccess: "Free at fs.usda.gov.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (public log-volume tables; stable for over a century).",
    assumptions: [
      { name: "Log length basis", value: "16-ft logs unless user supplies a different segment length", source: "USDA Forest Service convention" },
    ],
  },
  "seed-rate": {
    formula: "Seeds per acre = target_population_per_acre / germination_pct. Lbs per acre = seeds_per_acre / seeds_per_lb. Cost = lbs × $/lb.",
    edition: "ASABE EP367 by name; USDA Cooperative Extension published seeding-rate guides.",
    freeAccess: "USDA Extension materials free at most state-extension-service sites.",
    governance: GOVERNANCE.pesticide,
    editionNote: "Single-edition (USDA Extension + ASABE engineering practice).",
    assumptions: [],
  },
  "drawbar-power": {
    formula: "Drawbar HP = (pull_lb × speed_mph) / 375. PTO HP estimate = drawbar_HP / tractive_efficiency (typical 0.65 firm soil / 0.55 tilled / 0.45 soft).",
    edition: "ASABE D497 (Agricultural Machinery Management Data) by name; Nebraska Tractor Test Lab publications.",
    freeAccess: "Nebraska Tractor Test data free at tractortestlab.unl.edu.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (ASABE D497 + Nebraska Tractor Test).",
    assumptions: [
      { name: "Tractive-efficiency table", value: "0.65 firm / 0.55 tilled / 0.45 soft (engineering-practice values)", source: "ASABE D497" },
    ],
  },
  "irrigation-uniformity": {
    formula: "Christiansen CU = 100 × (1 − Σ|x_i − mean| / (n × mean)). Distribution Uniformity DU = 100 × mean_lowest_quarter / mean_all. Pass / fail at CU 85 / DU 75.",
    edition: "Christiansen 1942 paper by name; USDA NRCS National Engineering Handbook (NEH) Part 623 (Irrigation) by name.",
    freeAccess: "USDA NRCS NEH Part 623 free at nrcs.usda.gov.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (Christiansen 1942 + USDA NEH 623).",
    assumptions: [],
  },
  "bulk-density": {
    formula: "Bulk density (g/cm³) = dry_weight / volume. Total porosity = 1 − (bulk_density / particle_density), particle density typical 2.65 g/cm³ for mineral soils.",
    edition: "USDA NRCS Soil Survey Manual (SSM) and Soil Quality Indicators by name.",
    freeAccess: "USDA NRCS materials free at nrcs.usda.gov.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (USDA NRCS).",
    assumptions: [
      { name: "Particle density", value: "2.65 g/cm³ for mineral soils unless user supplies", source: "USDA NRCS SSM" },
      { name: "Compaction threshold", value: "varies by texture class (coarse 1.80 / medium 1.55 / fine 1.40 g/cm³)", source: "USDA NRCS Soil Quality Indicators" },
    ],
  },
  "crop-yield": {
    formula: "Adjusted yield = field_yield × (1 − moisture_field) / (1 − moisture_standard). Standard moisture: corn 15.0%, soybean 13.0%, wheat 13.5% (USDA standard).",
    edition: "USDA Federal Grain Inspection Service (FGIS) standard moisture grades by name.",
    freeAccess: "Free at usda.gov / ams.usda.gov.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (USDA FGIS).",
    assumptions: [
      { name: "Standard moisture", value: "corn 15.0% / soy 13.0% / wheat 13.5%", source: "USDA FGIS" },
    ],
  },

  // --- Group N: Stage and Live Production (priority 11) ---
  // Tiles cite ANSI E1 (Entertainment Technology) standards by name and
  // section, ESTA / DMX-512 conventions, classical acoustics (free-field
  // inverse square law), and manufacturer truss / rigging WLL charts.

  "truss-capacity": {
    formula: "Equivalent UDL (lb/ft) interpolated from manufacturer span-vs-load curves; equivalent-UDL safety factor; reactions A / B from simple-beam math; 2× point-load rule of thumb.",
    edition: "Manufacturer truss span-vs-load tables (Tomcat, Total Structures, Tyler GT, Global Truss) by name; ANSI E1.21 (Entertainment Technology - Temporary Ground-Supported Structures) by name.",
    freeAccess: "Manufacturer charts free at each manufacturer site. ANSI E1 standards licensed; some E1 documents (E1.21, E1.4-2014) free at tsp.esta.org.",
    governance: GOVERNANCE.rigging,
    editionNote: "Single-edition (manufacturer charts + ANSI E1.21).",
    assumptions: [
      { name: "Curve table", value: "manufacturer-attributed per row; quarterly recheck", source: "manufacturer technical bulletins" },
      { name: "Point-load to equivalent-UDL factor", value: "2× rule of thumb for centered point loads", source: "manufacturer typical" },
    ],
  },
  "time-alignment": {
    formula: "Speed of sound c = 331.3 + 0.606 × T_C (m/s). Delay-tower delay (ms) = distance_m / c × 1000. Haas-window offset 10-30 ms recommended for delayed system natural-source perception.",
    edition: "Classical acoustics; AES (Audio Engineering Society) information documents on time-alignment by name.",
    freeAccess: "AES information documents free at aes.org/standards/blog.",
    governance: GOVERNANCE.rigging,
    editionNote: "Single-edition (physics).",
    assumptions: [
      { name: "Default temperature", value: "20 °C unless user supplies", source: "engineering practice" },
    ],
  },
  "dmx-planner": {
    formula: "Per-fixture channel range from start_address to start_address + footprint − 1; universe utilization = sum_footprints / 512; conflict / overflow flagged when ranges intersect or exceed 512.",
    edition: "ANSI E1.11 (DMX-512-A: Asynchronous Serial Digital Data Transmission Standard for Controlling Lighting Equipment and Accessories) by name.",
    freeAccess: "ANSI E1.11 free at tsp.esta.org.",
    governance: GOVERNANCE.rigging,
    editionNote: "Single-edition (ANSI E1.11; 512 channel-per-universe limit is invariant).",
    assumptions: [],
  },
  "neutral-imbalance": {
    formula: "Three-phase neutral current (balanced linear loads) I_N = sqrt(I_A² + I_B² + I_C² − I_A·I_B − I_B·I_C − I_A·I_C). Harmonic-load warning (3rd harmonic doubles neutral current via in-phase summation).",
    edition: "IEEE 519 (Standard for Harmonic Control in Electric Power Systems) by name; classical three-phase electrical theory.",
    freeAccess: "IEEE 519 licensed; principles free in published power-engineering texts and at IEEE-USA outreach.",
    governance: GOVERNANCE.rigging,
    editionNote: "Single-edition (physics + IEEE 519 by name).",
    assumptions: [
      { name: "Linear-load assumption", value: "true (closed-form holds; non-linear / triplen-harmonic loads can drive neutral current above the worst phase)", source: "IEEE 519 §5" },
    ],
  },
  "spl-distance": {
    formula: "L2 = L1 − 20 × log10(d2 / d1). Free-field (−6 dB per doubling of distance), hemispherical (ground-coupled), or indoor (less attenuation due to reflection).",
    edition: "Classical acoustics (inverse-square law); ISO 9613-2 (Acoustics — Attenuation of sound during propagation outdoors) by name.",
    freeAccess: "Inverse-square principle free in physics texts; ISO 9613-2 licensed.",
    governance: GOVERNANCE.rigging,
    editionNote: "Single-edition (physics).",
    assumptions: [
      { name: "Mode adjustments", value: "free-field 0 dB / hemispherical −3 dB / indoor user-supplied", source: "ISO 9613-2 typical" },
    ],
  },
  "spl-atmospheric": {
    formula: "SPL_far = SPL_ref - 20*log10(d_far/d_ref) - alpha(f, T, RH, P)*d_far. Per-octave alpha (dB/m) from the ANSI S1.26 relaxation-frequency formula: alpha = 8.686 * f^2 * { 1.84e-11 * (p_r/p_a) * sqrt(T/T_0) + (T/T_0)^-2.5 * [ 0.01275 * exp(-2239.1/T) / (frO + f^2/frO) + 0.1068 * exp(-3352/T) / (frN + f^2/frN) ] }.",
    edition: "ANSI S1.26-2014 (R2019) Method for Calculation of the Absorption of Sound by the Atmosphere. Inverse-square law from classical acoustics.",
    freeAccess: "ansi.org for TOC; full standard is licensed.",
    governance: GOVERNANCE.rigging,
    editionNote: "For closed venues, room acoustics dominate over inverse-square + atmospheric absorption. AHJ governs final coverage. Coefficients become less accurate outside the -20 to 50 C / 0 - 100 percent RH typical-validity envelope.",
    assumptions: [
      { name: "Octave bands", value: "125 / 250 / 500 / 1000 / 2000 / 4000 / 8000 Hz", source: "spec-v9 §H.2" },
      { name: "Saturation vapor pressure", value: "ANSI S1.26 IAPWS-style approximation: log10(p_sat/p_r) = -6.8346 * (273.16/T)^1.261 + 4.6151", source: "ANSI S1.26-2014" },
      { name: "Relaxation frequencies", value: "frO and frN per ANSI S1.26 closed-form expressions in molar concentration of water vapor", source: "ANSI S1.26-2014" },
      { name: "Summary band", value: "1 kHz reported as the operator-grade voice-band reference", source: "spec-v9 §H.2 (operator-grade summary)" },
      { name: "Companion tile", value: "v1 spl-distance is inverse-square only; this tile adds atmospheric absorption", source: "spec-v9 §H.2 discipline" },
    ],
  },
  "rigging-check": {
    formula: "WLL at angle: leg tension L = W / (n × sin(θ/2)) for basket / bridle slings; choker derate 0.75. WLL by component class (shackles per ASME B30.26; slings per ASME B30.9; span sets / hoists per manufacturer specs).",
    edition: "ASME B30.9 (Slings) + ASME B30.26 (Rigging Hardware) + ASME B30.16 (Overhead Underhung and Stationary Hoists) by name and section. Manufacturer hoist data sheets (CM Lodestar, Columbus McKinnon, Chain Master) by name.",
    freeAccess: "ASME B30 series licensed; principles free at most rigging-manufacturer training pages.",
    governance: GOVERNANCE.rigging,
    editionNote: "Single-edition (ASME B30 series + manufacturer hoist specs).",
    assumptions: [
      { name: "Choker derate", value: "0.75 (ASME B30.9 typical)", source: "ASME B30.9" },
    ],
  },

  // --- Group P: Field, Backcountry, and SAR (priority 11) ---
  // Tiles cite USGS topographic / Krueger UTM, NOAA solar-position
  // algorithms, AIARE avalanche-terrain education, and engineering-
  // practice backcountry water / kcal benchmarks.

  "pacing-distance": {
    formula: "Distance = pace_count × stride_length × terrain_factor. Terrain factors: flat 1.0 / rolling 0.9 / steep 0.8 / brush 0.7 / snow 0.6.",
    edition: "U.S. Army FM 3-25.26 (Map Reading and Land Navigation) and FM 21-26 (predecessor) by name.",
    freeAccess: "U.S. Army field manuals free at army.mil and at archive.org.",
    governance: GOVERNANCE.field,
    editionNote: "Single-edition (FM 3-25.26).",
    assumptions: [
      { name: "Terrain factors", value: "flat 1.0 / rolling 0.9 / steep 0.8 / brush 0.7 / snow 0.6", source: "FM 3-25.26 typical" },
    ],
  },
  "bearing-conversion": {
    formula: "True bearing = magnetic bearing + east declination (or − west declination). 'East is least, west is best' memo. Declination from NOAA NCEI World Magnetic Model.",
    edition: "NOAA NCEI World Magnetic Model (WMM) 2025 by name; U.S. Army FM 3-25.26 by name.",
    freeAccess: "WMM 2025 free at ngdc.noaa.gov/geomag.",
    governance: GOVERNANCE.field,
    editionNote: "Editions available: WMM 2025 is the current published 5-year model. Verify the current model year if relying on the tile for a critical bearing.",
    assumptions: [],
  },
  "magnetic-declination": {
    formula: "Spherical-harmonic expansion of the geomagnetic potential V = a Σ_{n=1..12} (a/r)^{n+1} Σ_{m=0..n} [g_n^m cos(m λ) + h_n^m sin(m λ)] P_n^m(sin φ'); B = -∇V. WMM2025 coefficients g, h, dg/dt, dh/dt to degree 12 are bundled at data/field/wmm/coefficients.json (verbatim from NCEI WMM2025.COF). Geodetic latitude is converted to geocentric on the WGS84 ellipsoid; geocentric field components are rotated back to geodetic.",
    edition: "NOAA NCEI World Magnetic Model 2025 (WMM2025) by name. Reference radius a = 6371.2 km; WGS84 ellipsoid (a = 6378.137 km, b = 6356.7523142 km).",
    freeAccess: "WMM 2025 coefficients, technical report, and test-value table free at ncei.noaa.gov/products/world-magnetic-model. Coefficients are public domain (NCEI / NGA).",
    governance: GOVERNANCE.field,
    editionNote: "WMM2025 valid 2025-01-01 through 2029-12-31; coefficients expire 2030-01-01. Bundle must be refreshed at the next quinquennial release (WMM2030).",
    assumptions: [
      { name: "Reference radius", value: "6371.2 km", source: "NCEI WMM Tech Report" },
      { name: "Maximum degree", value: "12", source: "WMM2025 standard" },
      { name: "Local field perturbations", value: "Solar storms, geological anomalies, and nearby ferrous gear can shift the local field by several degrees beyond the model.", source: "NCEI WMM user notes" },
    ],
  },
  "slope-avalanche": {
    formula: "Slope angle (degrees) = atan(rise / run). Slope % = (rise / run) × 100. 30-45° avalanche start-zone window flagged per AIARE / USGS / Avalanche Center guidance.",
    edition: "AIARE (American Institute for Avalanche Research and Education) Level 1 / 2 curriculum by name; USFS National Avalanche Center materials by name.",
    freeAccess: "Free at avalanche.org and fsavalanche.org.",
    governance: GOVERNANCE.field,
    editionNote: "Single-edition (AIARE / USFS NAC).",
    assumptions: [
      { name: "Avalanche start-zone window", value: "30°-45° (true slope angle)", source: "AIARE Level 1 curriculum" },
    ],
  },
  "backcountry-needs": {
    formula: "Water L/day = base × ambient_factor (cool 3 / moderate 4 / hot 6 / extreme 8) × group_size × days. Kcal/day = base × exertion_factor (easy 2500 / moderate 3500 / hard 4500 / extreme 5500) × group × days.",
    edition: "U.S. Army FM 21-10 (Field Hygiene and Sanitation) + USDA Dietary Reference Intakes by name; ACSM (American College of Sports Medicine) Position Stand on hydration by name.",
    freeAccess: "USDA DRI free at nal.usda.gov; ACSM Position Stands free at acsm.org.",
    governance: GOVERNANCE.field,
    editionNote: "Single-edition (Army FM + USDA + ACSM engineering-practice values).",
    assumptions: [],
  },
  "utm-conversion": {
    formula: "Krueger forward and inverse formulas for WGS84 ellipsoid; series expansion to 4th order. Round-trip error < 0.1 m at typical latitudes.",
    edition: "USGS Krueger series by name; J.P. Snyder, USGS PP 1395 (Map Projections — A Working Manual, 1987) by name.",
    freeAccess: "USGS PP 1395 free at pubs.usgs.gov.",
    governance: GOVERNANCE.field,
    editionNote: "Single-edition (Krueger series; WGS84 datum).",
    assumptions: [
      { name: "Datum", value: "WGS84 (NAD83 differs by ≤ 1.5 m in CONUS)", source: "USGS PP 1395" },
    ],
  },
  "solar-times": {
    formula: "NOAA Solar Position Algorithm (SPA) calculates declination, equation of time, sunrise / sunset / civil / nautical / astronomical twilight from latitude / longitude / date.",
    edition: "NOAA Solar Calculator (USNO algorithm) by name; Reda & Andreas, 'Solar Position Algorithm for Solar Radiation Applications' (NREL/TP-560-34302, 2008) by name.",
    freeAccess: "Free at gml.noaa.gov/grad/solcalc.",
    governance: GOVERNANCE.field,
    editionNote: "Single-edition (NOAA SPA / Reda-Andreas; ≤ ±0.0003° accuracy).",
    assumptions: [
      { name: "Atmospheric refraction", value: "−0.833° standard at horizon", source: "NOAA SPA" },
    ],
  },

  // --- Group Q: Historical Reference Data (priority 11) ---

  "historical-pricing": {
    formula: "Bundled monthly time series per commodity from public BLS PPI / EIA / USDA NASS / FRED federal series. Percentile bands (p25 / p50 / p75 / p90) computed via linear-interpolation type-7 quantile over a user-selected lookback window.",
    edition: "Mixed federal series, build-fetched at the build date stamped on each shard. BLS PPI series WPU* (industrial commodities); EIA series PET.* / NG.* (retail fuel + city-gate gas); USDA NASS / FRED PWHEAMTUSDM / PMAIZMTUSDM / PSOYBUSDM (agricultural).",
    freeAccess: "Free at bls.gov/data, eia.gov/dnav, fdc.nal.usda.gov, fred.stlouisfed.org. Series IDs listed verbatim on every shard.",
    governance: GOVERNANCE.reference,
    editionNote: "Single-edition (federal data refreshed at the build date stamped on each commodity shard; build fails if any shard's latest point is more than 30 days behind the build date).",
    assumptions: [
      { name: "Quantile method", value: "linear-interpolation type-7 (matches NumPy / spreadsheet defaults)", source: "Hyndman-Fan 1996" },
      { name: "No live fetch", value: "true (every datapoint is a same-origin static asset bundled at build time)", source: "spec.md no-runtime-fetch rule" },
    ],
  },

  // --- Group R: Accounting, Tax, and Small-Business (priority 12, v5) ---

  "straight-line-depreciation": {
    formula: "Annual depreciation = (cost - salvage) / useful_life. Accumulated = annual * year_of_interest. Book value = cost - accumulated.",
    edition: "IRS Publication 946 (Chapter 1: Straight-Line Method), current edition.",
    freeAccess: "Free at irs.gov/publications/p946.",
    governance: GOVERNANCE.tax,
    editionNote: "First-principles arithmetic; the IRS publication is cited by name only. No reproduction of Pub 946 text.",
    assumptions: [
      { name: "Convention", value: "even split across the full useful life (no half-year, no mid-quarter)", source: "user-supplied life is the recovery period" },
    ],
  },
  "macrs-depreciation": {
    formula: "Per-year depreciation = cost * percentage_table[class_life][year]. Half-year convention bundled (Pub 946 Table A-1). 200% DB switching to straight-line for 3 / 5 / 7 / 10-year classes; 150% DB for 15 / 20-year.",
    edition: "IRS Publication 946 Tables A-1 (half-year, 200% DB) and the 15 / 20-year extensions, current edition.",
    freeAccess: "Free at irs.gov/publications/p946. Table values bundled in calc-accounting.js MACRS_TABLES (data/accounting/macrs-tables.json).",
    governance: GOVERNANCE.tax,
    editionNote: "Public-domain federal table; bundled values match Pub 946 to the published precision (4 decimals).",
    assumptions: [
      { name: "Convention", value: "half-year (the spec also calls for mid-quarter; only half-year is bundled in the v5 starter)", source: "Pub 946 Table A-1" },
      { name: "Class life", value: "3 / 5 / 7 / 10 / 15 / 20 year", source: "Pub 946 §4 class lives" },
    ],
  },
  "section-179": {
    formula: "Section 179 = min(business_basis, dollar_cap, taxable_income). dollar_cap = max(0, annual_cap - max(0, business_basis - phaseout_start)). bonus = (business_basis - sec179) * bonus_pct. Residual basis flows to MACRS.",
    edition: "IRC 179 cap and phase-out per IRS annual revenue procedures. Bonus depreciation per IRC 168(k). Per-year parameters bundled in SECTION_179_LIMITS (data/accounting/section-179-limits.json).",
    freeAccess: "Free at irs.gov; cap and phase-out announced in the annual Rev. Proc. (e.g., Rev. Proc. 2024-40 for 2025).",
    governance: GOVERNANCE.tax,
    editionNote: "Annual cadence: refreshed each January when the IRS posts the inflation-adjusted cap.",
    assumptions: [
      { name: "Phase-out", value: "dollar-for-dollar reduction in cap above the threshold", source: "IRC 179(b)(2)" },
      { name: "Bonus rate", value: "scheduled phase-down (80% / 60% / 40% / 20%) for 2023-2026", source: "TCJA bonus depreciation schedule" },
    ],
  },
  "se-tax": {
    formula: "Net adjusted = net_se * 0.9235. SS tax = min(net_adjusted, ss_wage_base - w2_ss) * 0.124. Medicare = net_adjusted * 0.029. Additional Medicare = max(0, net_adjusted - threshold) * 0.009. SE tax = sum. Deductible half = (SS + Medicare) / 2.",
    edition: "Schedule SE (Form 1040). Social Security wage base from SSA annual wage-base announcement; Additional Medicare 0.9% threshold from IRC 3101(b)(2).",
    freeAccess: "Free at irs.gov/forms-pubs/about-schedule-se-form-1040; SSA wage base at ssa.gov/oact/cola/cbb.html.",
    governance: GOVERNANCE.tax,
    editionNote: "Annual cadence: SS wage base refreshed each October when SSA posts the COLA announcement.",
    assumptions: [
      { name: "Net-earnings adjustment", value: "92.35%", source: "Schedule SE line 4a" },
      { name: "SS / Medicare rates", value: "12.4% / 2.9% / 0.9% Additional", source: "IRC 1401 / 3101(b)(2)" },
      { name: "$400 filing threshold", value: "below this, no SE tax owed", source: "Schedule SE Part I" },
    ],
  },
  "estimated-tax": {
    formula: "Required annual payment = min(0.90 * projected_current_tax, multiplier * prior_year_tax). multiplier = 1.10 if prior-year AGI > $150k else 1.00. After-withholding = required - withholding. Per-quarter = after-withholding / 4.",
    edition: "IRC 6654 (failure-to-pay-estimated-tax safe harbors). IRS Form 1040-ES quarterly schedule.",
    freeAccess: "Free at irs.gov/forms-pubs/about-form-1040-es. Due dates bundled per year in ESTIMATED_TAX_DUE_DATES.",
    governance: GOVERNANCE.tax,
    editionNote: "Annual cadence: due dates roll forward each year, with statutory weekend / holiday rollover applied by the IRS.",
    assumptions: [
      { name: "Safe harbor", value: "smaller of 90% current-year or 100% / 110% prior-year tax", source: "IRC 6654(d)(1)(B)" },
      { name: "Equal installments", value: "even quarterly split (the annualized-income alternative is not modeled)", source: "user choice; Form 2210 covers the alternative" },
    ],
  },
  "payroll-withholding": {
    formula: "Annualize gross. Apply Pub 15-T percentage-method bracket: fed_annual = base + (annual_gross - prev) * rate. Divide by pay periods. FICA: SS = min(gross, wage_base - ytd) * 0.062. Medicare = gross * 0.0145. Additional Medicare = 0.9% above the threshold.",
    edition: "IRS Publication 15-T (current year), Worksheet 1A (Percentage Method, manual payroll). Single-filer brackets bundled.",
    freeAccess: "Free at irs.gov/publications/p15t.",
    governance: GOVERNANCE.tax,
    editionNote: "Single-filer brackets bundled for the current year; MFJ / HoH and the 2020+ W-4 step-2 path are out of scope for the v5 starter (illustrative).",
    assumptions: [
      { name: "Filer type", value: "single (illustrative)", source: "Pub 15-T Worksheet 1A" },
      { name: "Standard deduction", value: "baked into the bundled bracket starts", source: "Pub 15-T 2025 percentage-method table" },
    ],
  },
  "loan-amortization": {
    formula: "Payment P = (r * PV) / (1 - (1+r)^-n) where r is monthly rate and n is term in months. Schedule recurrence: interest_i = balance_(i-1) * r; principal_i = P - interest_i + extra; balance_i = balance_(i-1) - principal_i.",
    edition: "Standard mortgage / installment-loan formula. First principles.",
    freeAccess: "No code citation required (arithmetic). Cross-check against any published mortgage calculator.",
    governance: GOVERNANCE.small_business,
    editionNote: "Single-edition (math).",
    assumptions: [
      { name: "Compounding", value: "monthly", source: "convention; APR / APY conversion is the user's responsibility" },
      { name: "Extra principal", value: "applied to principal each period after interest accrues", source: "user input; no escrow / fees" },
    ],
  },
  "breakeven": {
    formula: "Contribution margin = sale_price - variable_cost. CM ratio = CM / sale_price. Breakeven units = fixed_costs / CM. Breakeven revenue = breakeven_units * sale_price. Margin of safety = (target - breakeven) / target.",
    edition: "Standard cost-volume-profit identity. First principles.",
    freeAccess: "No code citation required (arithmetic).",
    governance: GOVERNANCE.small_business,
    editionNote: "Single-edition (algebra).",
    assumptions: [
      { name: "Linearity", value: "fixed costs constant, variable cost / unit constant, sale price constant in the relevant range", source: "CVP modeling convention" },
    ],
  },
  "sales-tax-compound": {
    formula: "Forward: tax = pre_tax * (rate1 + rate2). Reverse: pre_tax = post_tax / (1 + rate1 + rate2).",
    edition: "Arithmetic. No live rate lookup; user supplies state and local rates.",
    freeAccess: "Each state's department of revenue publishes its current rate; user is responsible for the rate.",
    governance: GOVERNANCE.small_business,
    editionNote: "Single-edition (math). Per spec §3, this site does not aggregate live sales-tax rates.",
    assumptions: [
      { name: "Compounding", value: "additive (state + local rates summed before applying)", source: "U.S. state tax convention; some jurisdictions tax differently — verify locally" },
    ],
  },
  "inventory-turnover": {
    formula: "Average inventory = (BI + EI) / 2. Turnover = COGS / avg_inventory. Days sales of inventory = period_days / turnover.",
    edition: "Standard inventory-management identity. Industry medians bundled from U.S. Census Annual Retail Trade Survey (ARTS) and SBA published medians.",
    freeAccess: "Free at census.gov/retail/arts. SBA at sba.gov/data.",
    governance: GOVERNANCE.small_business,
    editionNote: "Quarterly cadence: industry medians refreshed when Census ARTS publishes.",
    assumptions: [
      { name: "Average method", value: "simple average of beginning and ending inventory", source: "convention; some firms use 13-month rolling" },
      { name: "Period days", value: "365 default", source: "calendar year" },
    ],
  },
  "cash-conversion-cycle": {
    formula: "CCC = DIO + DSO - DPO. DIO = avg_inventory / (COGS / period_days). DSO = AR / (revenue / period_days). DPO = AP / (COGS / period_days).",
    edition: "Standard working-capital identity. First principles; user supplies the three day-counts.",
    freeAccess: "No code citation required.",
    governance: GOVERNANCE.small_business,
    editionNote: "Single-edition (algebra).",
    assumptions: [
      { name: "Inputs", value: "user supplies DSO / DIO / DPO already computed", source: "tile is the cycle calculation, not the underlying ratios" },
    ],
  },
  "mileage-rollup": {
    formula: "Total business miles = sum(trip.business_miles). Deductible amount = total_business_miles * IRS_standard_rate(year). Optional odometer span cross-check.",
    edition: "IRS standard mileage rate, annual notice (e.g., Notice 2024-08 for 2024). Per-year rate bundled in STANDARD_MILEAGE_RATES.",
    freeAccess: "Free at irs.gov/tax-professionals/standard-mileage-rates.",
    governance: GOVERNANCE.tax,
    editionNote: "Annual cadence: refreshed each December / January when the IRS posts the next year's rate.",
    assumptions: [
      { name: "Standard rate vs. actual expense", value: "standard rate selected; actual-expense method (gas + maintenance + depreciation) is out of scope", source: "IRS Pub 463 lets the taxpayer pick one method per vehicle per year" },
    ],
  },

  // --- Group S: Legal Plain-English and Statutory Math (priority 13, v5) ---

  "judgment-interest": {
    formula: "Simple: interest = balance * rate * (days / 365). Compound (daily): factor = (1 + rate/365)^days; interest = balance * (factor - 1). Partial payments applied per the U.S. Rule: payment satisfies accrued interest first, then principal.",
    edition: "Per-state judgment-interest statute (e.g., Cal. Civ. Proc. Code 685.010, Tex. Fin. Code 304.003). Bundled rates and accrual flag in JUDGMENT_INTEREST_RATES with per-entry citation and verified_on date.",
    freeAccess: "Each state publishes its own code; citations point to section numbers only.",
    governance: GOVERNANCE.legal,
    editionNote: "Quarterly cadence: per-state rates rechecked against the state source page; oldest verified_on first.",
    assumptions: [
      { name: "Day count", value: "365 (actual / 365); some statutes use 360", source: "convention; verify per state" },
      { name: "Partial payment rule", value: "U.S. Rule (interest first, then principal)", source: "Story v. Livingston (1839); the modern federal rule" },
    ],
  },
  "court-deadline": {
    formula: "Calendar days: deadline = trigger + N; if deadline lands on Saturday, Sunday, or legal holiday, roll forward to next available day. Court days: count forward N days, skipping intermediate weekends and federal holidays; if final day still inaccessible, roll forward.",
    edition: "Fed. R. Civ. P. 6(a)(1) (calendar), 6(a)(2) (court / period less than 11 days), 6(a)(3) (inaccessible day rollover), 6(a)(6) (legal holiday). Federal court holidays bundled in FEDERAL_COURT_HOLIDAYS for the current and next two years.",
    freeAccess: "Free at uscourts.gov/rules-policies/current-rules-practice-procedure/federal-rules-civil-procedure.",
    governance: GOVERNANCE.legal,
    editionNote: "Annual cadence: holiday roll-forward each January; current-minus-one year retained for the 90-day deprecation window.",
    assumptions: [
      { name: "Trigger day exclusion", value: "trigger day not counted (Rule 6(a)(1)(A))", source: "Fed. R. Civ. P. 6(a)(1)(A)" },
      { name: "Holiday calendar", value: "federal court holidays only; per-state holidays not bundled in v5 starter", source: "spec-v5.md 2.2" },
    ],
  },
  "statute-of-limitations": {
    formula: "Lookup by (state, claim_type) into a per-state plain-English summary with limitation period in years, accrual rule, and citation.",
    edition: "Per-state code (e.g., Cal. Civ. Proc. Code 337, N.Y. C.P.L.R. 213). Bundled in STATUTE_OF_LIMITATIONS with per-entry citation. Original plain-English summary; no statute text reproduced.",
    freeAccess: "Each state publishes its code free online; citations point to section numbers only.",
    governance: GOVERNANCE.legal,
    editionNote: "Quarterly cadence per spec-v5.md 8 recheck schedule.",
    assumptions: [
      { name: "Tolling and discovery exceptions", value: "summary names the accrual rule (breach / accrual / discovery / last payment); specific tolling fact patterns are out of scope", source: "spec-v5.md 2.2 - 'no legal advice'" },
    ],
  },
  "small-claims-reference": {
    formula: "Lookup by state into a per-state row with jurisdictional dollar maximum, filing-fee range, attorney-permitted flag, and citation.",
    edition: "Per-state small-claims statute or court rule (e.g., Cal. Civ. Proc. Code 116.220). Filing-fee range from each state court system's published fee schedule; representative only.",
    freeAccess: "Each state's court system publishes its fee schedule free; user verifies with the local court.",
    governance: GOVERNANCE.legal,
    editionNote: "Quarterly cadence; thresholds adjust by statute.",
    assumptions: [
      { name: "Filing-fee range", value: "representative across the state; specific county/city schedules vary", source: "state court fee schedules per entry" },
    ],
  },
  "tenant-notice": {
    formula: "Lookup by (state, notice_type) into a per-state row with notice_days, business-days flag, cure-allowed flag, and citation.",
    edition: "Per-state landlord-tenant code (e.g., Cal. Civ. Proc. Code 1161, N.Y. RPAPL 711). Bundled in LANDLORD_TENANT_NOTICE with per-entry citation. Original plain-English summary.",
    freeAccess: "Each state publishes its landlord-tenant code free; citations point to section numbers only.",
    governance: GOVERNANCE.legal,
    editionNote: "Quarterly cadence. Self-help eviction is illegal in every state; the inline notice repeats this regardless of state.",
    assumptions: [
      { name: "Self-help warning", value: "shown on every state, every notice type", source: "spec-v5.md 2.2" },
      { name: "Local rules", value: "city ordinances (e.g., NYC, San Francisco) may add steps not covered here", source: "user verifies with local code" },
    ],
  },
  "wage-hour": {
    formula: "regular_pay = min(hours, 40) * rate. overtime_pay = max(0, hours - 40) * rate * 1.5. tip_makeup = max(0, hours * applicable_minimum - (regular_pay + overtime_pay + cash_tips)). applicable_minimum = max(state_minimum, federal_minimum).",
    edition: "29 USC 207 (FLSA overtime), 29 USC 203(m) (tip credit). Per-state minimum wage from each state's labor department, cited per entry in STATE_MINIMUM_WAGE.",
    freeAccess: "Free at dol.gov/agencies/whd. State minimums at each state's labor-department site.",
    governance: GOVERNANCE.legal,
    editionNote: "Quarterly cadence; many state minimums change Jan 1 (and sometimes Jul 1).",
    assumptions: [
      { name: "Workweek", value: "single workweek (overtime computed per week, not per day)", source: "29 USC 207(a)(1)" },
      { name: "Tip credit", value: "FLSA federal floor; some states (CA, WA, OR, MN, AK, MT, NV) prohibit tip credit and require state minimum on cash wage", source: "state minimum-wage statute per entry" },
    ],
  },
  "contractor-vs-employee": {
    formula: "ABC test: result = independent_contractor iff A AND B AND C; else employee. IRS 20-factor: count factors marked 'employer' vs 'worker'; result = employee if employer-control count > worker-independence count, else independent_contractor.",
    edition: "IRS Rev. Rul. 87-41 (20-factor test). State ABC test where adopted (e.g., Cal. Lab. Code 2775 / AB 5; Massachusetts; New Jersey).",
    freeAccess: "Free at irs.gov for federal guidance; state statute citations per entry.",
    governance: GOVERNANCE.legal,
    editionNote: "Single-edition (test definitions). Tile is deterministic from the user's checklist; the user picks the test, the tool does not opine.",
    assumptions: [
      { name: "Tie-breaking", value: "IRS 20-factor tie defaults to independent_contractor (worker-friendly)", source: "convention; verify with counsel" },
      { name: "Default", value: "ABC test default is employee unless all three prongs are satisfied", source: "Dynamex Operations W. v. Superior Court, 4 Cal. 5th 903 (2018)" },
    ],
  },
  "contract-clause-reference": {
    formula: "Reference page; no compute. Each entry is a (what it does, what to look for) pair authored by the project.",
    edition: "Original plain-English summary by the project author. Not a model clause and not legal advice.",
    freeAccess: "MIT-licensed original creative work.",
    governance: GOVERNANCE.legal,
    editionNote: "Single-edition (reference). Updated when the author identifies a new common clause worth covering.",
    assumptions: [],
  },
  "lease-term-reference": {
    formula: "Reference page; no compute. Each entry is a (what it does, what to look for) pair authored by the project.",
    edition: "Original plain-English summary by the project author. Not a model lease and not legal advice.",
    freeAccess: "MIT-licensed original creative work.",
    governance: GOVERNANCE.legal,
    editionNote: "Single-edition (reference).",
    assumptions: [],
  },

  // --- Group T: Bench Science and Laboratory Math (priority 14, v5) ---

  "molarity-dilution": {
    formula: "C1 * V1 = C2 * V2. Solve for the missing fourth.",
    edition: "Standard dilution identity. First principles.",
    freeAccess: "No code citation required (chemistry).",
    governance: GOVERNANCE.lab,
    editionNote: "Single-edition (chemistry).",
    assumptions: [
      { name: "Conservation", value: "moles before = moles after; total mass / volume conserved", source: "stoichiometric convention" },
    ],
  },
  "serial-dilution": {
    formula: "transfer_volume = volume_per_tube / dilution_factor. diluent_volume = volume_per_tube - transfer_volume. concentration[i] = starting / dilution_factor^i.",
    edition: "Standard serial-dilution method. First principles.",
    freeAccess: "No code citation required.",
    governance: GOVERNANCE.lab,
    editionNote: "Single-edition (chemistry).",
    assumptions: [
      { name: "Equal volume per tube", value: "all tubes use the same volume", source: "convention; varied-volume protocols are user-customized" },
    ],
  },
  "molecular-weight": {
    formula: "MW = sum over elements (atomic_weight[element] * count). Formula parser supports parentheses and integer subscripts.",
    edition: "IUPAC Standard Atomic Weights 2021. Bundled in IUPAC_ATOMIC_WEIGHTS (data/lab/iupac-atomic-weights.json).",
    freeAccess: "Free at iupac.org/publications/journals/pac/. Element-by-element values published in Pure and Applied Chemistry.",
    governance: GOVERNANCE.lab,
    editionNote: "IUPAC publishes adjustments roughly every 2-4 years; bundled values follow the 2021 edition.",
    assumptions: [
      { name: "Isotopic abundance", value: "natural terrestrial average per IUPAC", source: "IUPAC 2021" },
      { name: "Hydrate notation", value: "dot (.) and middle-dot treated as concatenation", source: "convention" },
    ],
  },
  "mass-moles": {
    formula: "moles = mass / MW; mass = moles * MW. Solve for the missing one.",
    edition: "Stoichiometric identity. First principles.",
    freeAccess: "No code citation required.",
    governance: GOVERNANCE.lab,
    editionNote: "Single-edition (chemistry).",
    assumptions: [],
  },
  "rcf-rpm": {
    formula: "RCF (g) = 1.118e-5 * r(cm) * RPM^2. Both directions: RPM = sqrt(RCF / (1.118e-5 * r_cm)).",
    edition: "Standard centrifuge formula. First principles. Manufacturer rotor radii bundled in CENTRIFUGE_ROTORS (data/lab/centrifuge-rotors.json) with per-entry attribution.",
    freeAccess: "Manufacturer rotor charts (Eppendorf, Beckman Coulter, Thermo Fisher) free at the manufacturer's site.",
    governance: GOVERNANCE.lab,
    editionNote: "Quarterly cadence: rotor radii rechecked against the manufacturer's current catalog.",
    assumptions: [
      { name: "r convention", value: "rotor maximum radius (r_max) unless the user provides r_min for top-of-tube g", source: "Eppendorf / Beckman convention" },
    ],
  },
  "resuspension-volume": {
    formula: "volume = mass / target_concentration. Unit handling is the user's responsibility (target in g/L returns L).",
    edition: "Trivial arithmetic; the fixture is the unit handling.",
    freeAccess: "No code citation required.",
    governance: GOVERNANCE.lab,
    editionNote: "Single-edition.",
    assumptions: [],
  },
  "pcr-master-mix": {
    formula: "scaling_factor = number_of_reactions * (1 + fudge_factor_pct / 100). component_total = component_per_reaction * scaling_factor.",
    edition: "Standard master-mix arithmetic. Pipetting fudge factor (default 10%) accounts for dead-volume losses.",
    freeAccess: "No code citation required.",
    governance: GOVERNANCE.lab,
    editionNote: "Single-edition (arithmetic).",
    assumptions: [
      { name: "Fudge factor default", value: "10% (typical for 20-50 reactions)", source: "convention; lower for >100 reactions, higher for <12" },
    ],
  },
  "beer-lambert": {
    formula: "A = epsilon * c * L  =>  c = A / (epsilon * L). Path length in cm; epsilon in M^-1 cm^-1; concentration returned in M.",
    edition: "Beer-Lambert law. First principles.",
    freeAccess: "No code citation required (physical chemistry).",
    governance: GOVERNANCE.lab,
    editionNote: "Single-edition (physics).",
    assumptions: [
      { name: "Linear range", value: "A in 0.1-1.0 typical; deviations at high concentration outside this range", source: "spectrophotometry convention" },
    ],
  },
  "henderson-hasselbalch": {
    formula: "pH = pKa + log10([A-] / [HA]). ratio = 10^(pH - pKa). fraction_base = ratio / (ratio + 1). Moles each side from total buffer concentration * total volume * fraction.",
    edition: "Henderson-Hasselbalch equation. First principles. Common laboratory buffer pKa values bundled in BUFFER_PKA (data/lab/buffer-pka.json) with per-entry citation (Good et al. 1966; CRC Handbook 95th ed.).",
    freeAccess: "Good et al. 1966 historical paper free at the journal archive; CRC Handbook is a commercial reference book; the bundled pKa values are public physical constants cited only by name.",
    governance: GOVERNANCE.lab,
    editionNote: "Single-edition (physical chemistry).",
    assumptions: [
      { name: "Temperature", value: "pKa values at 25 C", source: "CRC Handbook / Good et al. tabulation convention" },
      { name: "Activity coefficients", value: "ignored (concentrations approximate activities at low ionic strength)", source: "approximation" },
    ],
  },
  // --- Group H v5 extensions (priority 15, Step 61) ---

  "irs-form-index": {
    formula: "Reference page; no compute. Each entry is a (form, title, purpose) record authored by the project.",
    edition: "IRS forms cited by number and published title only. No reproduction of form instructions. See irs.gov/forms-pubs for the current edition.",
    freeAccess: "Free at irs.gov.",
    governance: GOVERNANCE.tax,
    editionNote: "Annual cadence: review when the IRS releases a new tax-year edition. The 1099-K reporting threshold has shifted multiple times; verify the current-year threshold before relying.",
    assumptions: [],
  },
  "sales-tax-nexus": {
    formula: "Lookup by state into a per-state row with sales threshold (USD), optional transactions threshold, citation, and verified-on date.",
    edition: "Per-state department of revenue published nexus guidance, post-Wayfair (South Dakota v. Wayfair, Inc., 138 S. Ct. 2080 (2018)).",
    freeAccess: "Each state's DOR site publishes its current nexus rule.",
    governance: GOVERNANCE.legal,
    editionNote: "Quarterly cadence per spec-v5.md 8 recheck schedule.",
    assumptions: [
      { name: "Threshold lookback", value: "prior or current calendar year (most states)", source: "post-Wayfair convention; verify per state" },
      { name: "Sales tax vs. use tax", value: "thresholds shown trigger collection / remittance obligation; consumer-side use-tax is separate", source: "state tax convention" },
    ],
  },
  "osha-recordkeeping": {
    formula: "Reference page; no compute. Each entry is a (topic, note) record authored by the project.",
    edition: "29 CFR 1904 by section number only. Original plain-English summary.",
    freeAccess: "Free at osha.gov/recordkeeping.",
    governance: GOVERNANCE.worker_safety,
    editionNote: "Annual cadence: review when OSHA publishes a Federal Register update.",
    assumptions: [
      { name: "Industry exemptions", value: "low-hazard industries listed in 29 CFR 1904.2 are partially exempt; user verifies their NAICS classification", source: "29 CFR 1904.2 Appendix A" },
    ],
  },
  "lab-safety-quickread": {
    formula: "Reference page; no compute. Two sections: GHS pictograms (name, signal word, hazards) and a four-step spill-response decision tree (assess / evacuate / contain / report).",
    edition: "UN GHS Rev. 9 pictograms (cited by name only). OSHA Hazard Communication Standard 29 CFR 1910.1200 by section number only. EPA emergency-response framework cited by name.",
    freeAccess: "Free at unece.org/transport/dangerous-goods/ghs and osha.gov/hazcom.",
    governance: GOVERNANCE.worker_safety,
    editionNote: "Single-edition (reference). The hardened safety notice ('exceeds your lab's spill-kit capacity or unknown agent: stop, evacuate, call EH&S or 911') always appears.",
    assumptions: [],
  },

  "hemocytometer": {
    formula: "cells/mL = (total_cells / squares_counted) * 10^4 * dilution_factor. viability_pct = (total - dead) / total * 100.",
    edition: "Standard improved Neubauer hemocytometer; each large corner square = 1 mm x 1 mm x 0.1 mm = 0.1 uL.",
    freeAccess: "No code citation required (cell-counting convention).",
    governance: GOVERNANCE.lab,
    editionNote: "Single-edition (geometry of the chamber).",
    assumptions: [
      { name: "Chamber type", value: "improved Neubauer (1/10 mm depth)", source: "convention; older Neubauer / Burker chambers differ" },
      { name: "Counting method", value: "include cells touching top + left edges, exclude bottom + right (L-rule)", source: "convention; user is responsible for consistency" },
    ],
  },

  // v12 Group U: Veterinary.
  "vet-weight-based-dose": {
    formula: "total_mg = dose_mg_per_kg * weight_kg; volume_mL = total_mg / concentration_mg_per_mL. Weight accepted in kg or lb (lb -> kg conversion is 1 / 2.2046226218 per NIST SP 811).",
    edition: "Standard veterinary pharmacology arithmetic. No drug list is bundled; dose and concentration come from the current Plumb's Veterinary Drug Handbook (10th ed.), the USP Compendium, or the FDA-approved label.",
    freeAccess: "Plumb's online and USP compendium are paywalled, but FDA-approved labeling is free at fda.gov/animaldrugsatfda. Many manufacturer monographs are free.",
    governance: GOVERNANCE.veterinary,
    editionNote: "Math is fixed. The dose itself changes when a drug is reformulated, a species-specific contraindication is published, or a new label edition is issued; verify against the current formulary at every prescription.",
    assumptions: [
      { name: "Conversion", value: "1 lb = 0.45359237 kg exactly", source: "NIST SP 811" },
      { name: "Practical-flag thresholds", value: "volume < 0.05 mL flagged as hard to measure; > 50 mL flagged as unusually large", source: "convention" },
    ],
  },
  "vet-maintenance-fluid": {
    formula: "Maintenance: dog / cat 60 mL/kg/day (= 2.5 mL/kg/hr); horse / cow 50 mL/kg/day. Replacement = weight_kg * dehydration_fraction * 1000 mL/kg, spread over the user-chosen rehydration window. Total infusion rate = maintenance + replacement + ongoing_losses.",
    edition: "Holliday-Segar adapted for small-animal veterinary use per DiBartola, 'Fluid, Electrolyte, and Acid-Base Disorders in Small Animal Practice' (4th ed., 2012).",
    freeAccess: "DiBartola is a textbook; the formulas themselves are taught in every vet-tech program and printed in the BSAVA Manual (open chapters).",
    governance: GOVERNANCE.veterinary,
    editionNote: "Cardiac / renal / hepatic / hypoalbuminemic / pediatric patients require modified plans. The actual rate is titrated to physical exam, urine output (0.5-2 mL/kg/hr is typical), and serial bloodwork.",
    assumptions: [
      { name: "Maintenance basis", value: "60 mL/kg/day for dog / cat; 50 mL/kg/day for horse / cow", source: "DiBartola; some references vary 40-60" },
      { name: "Replacement", value: "1 kg of dehydration = 1 L of replacement fluid", source: "convention; 1 kg body water ~= 1 L" },
      { name: "Severe-dehydration flag", value: "fires at > 8 percent", source: "convention; needs ICU-level monitoring" },
    ],
  },
  "vet-energy-requirement": {
    formula: "RER (kcal/day) = 70 * weight_kg ^ 0.75. MER (kcal/day) = RER * activity_factor. Cups/day = MER / kcal_per_cup (when supplied).",
    edition: "AAHA Canine Life Stage Guidelines (2019). AAFP Feline Life Stage Guidelines (2021). The allometric formula is universal in veterinary nutrition (Kleiber 1947).",
    freeAccess: "AAHA / AAFP guidelines are free at aaha.org. Kleiber 1947 is open-access.",
    governance: GOVERNANCE.veterinary,
    editionNote: "Activity factors are published ranges; the values used here are mid-range. Pregnancy, lactation, illness, and environmental temperature all shift the factor. Reassess at every recheck with the body-condition score.",
    assumptions: [
      { name: "RER coefficient", value: "70 kcal/day per kg^0.75", source: "Kleiber 1947 / AAHA / AAFP" },
      { name: "Activity factors", value: "dog sedentary 1.2, active 1.6, working 3.0; cat sedentary 1.0, active 1.4, lactation 2.5; growth 2.5-3.0; weight loss 0.8-1.0", source: "AAHA / AAFP published ranges" },
    ],
  },
  "vet-bcs-reference": {
    formula: "Reference render of the 1-9 BCS scale per species. Verbal anchors at each integer score from emaciated (1) to severely obese (9).",
    edition: "AAHA Canine Life Stage Guidelines (2019), AAFP Feline Life Stage Guidelines (2021), WSAVA Global Nutrition Guidelines.",
    freeAccess: "Free at aaha.org and wsava.org.",
    governance: GOVERNANCE.veterinary,
    editionNote: "Older 1-5 systems are NOT directly translatable to 1-9 (a 3/5 is roughly a 5/9 but is not numerically convertible). Always note the scale on the chart entry. WSAVA recommends scoring at every visit.",
    assumptions: [
      { name: "Scale", value: "1-9 (modern AAHA / WSAVA / AAFP consensus)", source: "AAHA / WSAVA" },
    ],
  },
  "vet-pet-age": {
    formula: "Year 1 in pet years = 15 human years; year 2 cumulative = 24 human years (i.e., +9 in year 2). Beyond year 2: dogs add +size-band factor per year (small 4, medium 5, large 6, giant 7); cats add +4 per year.",
    edition: "AAHA Canine Life Stage Guidelines (2019). AAFP Feline Life Stage Guidelines (2021). The older '1 dog year = 7 human years' shortcut is rejected by the modern guidelines.",
    freeAccess: "Free at aaha.org and catvets.com.",
    governance: GOVERNANCE.veterinary,
    editionNote: "Genuine biological aging varies with breed, body condition, and underlying disease; the AAHA scheme is a communication aid. Senior-care decisions follow the actual life-stage flow, not the human-equivalent number.",
    assumptions: [
      { name: "Dog size bands", value: "small <22 lb, medium 22-50, large 51-100, giant >100", source: "AAHA Life Stage" },
      { name: "Cat scheme", value: "no size-band adjustment", source: "AAFP" },
    ],
  },
  "vet-gestation": {
    formula: "estimated_due = breeding_date + species_mean_gestation_days. Dog 63 (range 58-68), cat 65 (63-67), horse 340 (320-360), cow 283 (279-287).",
    edition: "Standard reproductive-physiology values. Published in every veterinary reproduction textbook (e.g., Feldman & Nelson Canine and Feline Endocrinology; Senger Pathways to Pregnancy and Parturition).",
    freeAccess: "Textbook values; widely available at extension.org and university veterinary-school websites.",
    governance: GOVERNANCE.veterinary,
    editionNote: "Gestation in dogs is most accurately tracked from the LH surge, not the breeding date; this tile uses the simpler breeding-date convention. For dairy cows the date references conception (= AI date); for natural-service breeding the range is wider.",
    assumptions: [
      { name: "Counting", value: "day 0 = breeding date; due date is breeding + species mean", source: "convention" },
    ],
  },

  // v12 Group V: EMS / Pre-hospital.
  "glasgow-coma-scale": {
    formula: "GCS total = E + V + M where E is 1 (none) to 4 (spontaneous), V is 1 (none) to 5 (oriented), M is 1 (none) to 6 (obeys commands). Bands: mild 13-15, moderate 9-12, severe 3-8. Intubated patients record V as 'T' and the total is not interpretable.",
    edition: "Teasdale and Jennett, 'Assessment of coma and impaired consciousness: a practical scale,' Lancet 304:7872 (1974). Bands per ACEP and ACS Committee on Trauma.",
    freeAccess: "Open-access PubMed (PMID 4136544) and ACEP / ACS public training materials. Free at acep.org and facs.org.",
    governance: GOVERNANCE.ems_prehospital,
    editionNote: "Scale unchanged since 1974. Some agencies record a separate pediatric GCS for patients under 5; this tile is the adult / standard scale.",
    assumptions: [
      { name: "Intubated handling", value: "verbal recorded as 'T'; total reported as 'not interpretable'", source: "ACS / ATLS convention" },
      { name: "Severity bands", value: "mild 13-15, moderate 9-12, severe 3-8", source: "ATLS / ACEP convention" },
    ],
  },
  "parkland-formula": {
    formula: "Total 24-hour Lactated Ringer's = 4 mL/kg/%TBSA. Half over the first 8 hours from burn onset; the remaining half over hours 8-24.",
    edition: "Baxter & Shires, 'Fluid Volume and Electrolyte Changes in the Early Post-burn Period,' Clinics in Plastic Surgery (1974). ABA Advanced Burn Life Support (ABLS) course.",
    freeAccess: "ABA public materials and ABLS provider manual summaries. Free at ameriburn.org.",
    governance: GOVERNANCE.ems_prehospital,
    editionNote: "The Parkland 4 mL formula is the starting point; actual resuscitation is titrated to urine output (0.5 mL/kg/hr adults, 1 mL/kg/hr pediatrics). Modified Brooke and Cincinnati pediatric variants use different multipliers.",
    assumptions: [
      { name: "Fluid", value: "Lactated Ringer's", source: "Parkland convention" },
      { name: "Timing reference", value: "hours since burn (not since EMS contact)", source: "ABLS / Parkland convention" },
      { name: "Scope", value: "thermal burns >= 20% TBSA in adults; pediatrics and electrical injuries require modified protocols", source: "ABLS" },
    ],
  },
  "cincinnati-stroke-scale": {
    formula: "Three binary findings: facial droop (smile asymmetry), arm drift (10-second hold), abnormal speech (repeat phrase). One or more abnormal raises stroke suspicion.",
    edition: "Kothari, Pancioli, Liu, Brott, Broderick, 'Cincinnati Prehospital Stroke Scale: reproducibility and validity,' Annals of Emergency Medicine 33:4 (1999).",
    freeAccess: "PubMed (PMID 10092713). AHA / ASA public stroke-screening materials. Free at stroke.org.",
    governance: GOVERNANCE.ems_prehospital,
    editionNote: "Scale validated in the original Cincinnati cohort. Modern LVO (large vessel occlusion) screens (LAMS, RACE, BE-FAST) add weakness-grading and gaze components for thrombectomy-center routing; agency protocol governs which screen to use.",
    assumptions: [
      { name: "Last-known-well time", value: "always documented; drives the thrombolytic / thrombectomy eligibility window", source: "AHA / ASA Stroke Guidelines" },
    ],
  },
  "apgar-score": {
    formula: "APGAR = appearance + pulse + grimace + activity + respiration, each 0-2, summed to 0-10. Recorded at 1 minute and 5 minutes; extend to 10 minutes if the 5-minute score is below 7.",
    edition: "Apgar, V., 'A Proposal for a New Method of Evaluation of the Newborn Infant,' Anesthesia & Analgesia 32 (1953).",
    freeAccess: "Open-access historical paper. AAP / ACOG public materials.",
    governance: GOVERNANCE.ems_prehospital,
    editionNote: "Score has not been modified since 1953. Pediatric-resuscitation decisions follow the Neonatal Resuscitation Program (NRP) algorithm, not the APGAR; do not delay resuscitation to compute the score.",
    assumptions: [
      { name: "Scoring window", value: "1 minute and 5 minutes after birth; extend to 10 minutes for severely-depressed infants", source: "AAP / ACOG" },
    ],
  },
  "iv-drip-rate": {
    formula: "gtts/min = (volume_mL * drop_factor_gtt_per_mL) / time_min. Hourly rate (mL/hr) = (volume_mL / time_min) * 60.",
    edition: "First-principles arithmetic over the drop-factor printed on the IV-set label. Standard drop factors: 10 / 15 / 20 macro (gtt/mL); 60 micro / pediatric.",
    freeAccess: "Universal nursing / EMS reference.",
    governance: GOVERNANCE.ems_prehospital,
    editionNote: "Drop factor is set by the IV-set manufacturer and is printed on the package; verify the label before relying on this tile. Some specialty sets (blood, parenteral nutrition) use different drop factors.",
    assumptions: [
      { name: "Drop factor source", value: "user reads from the IV-set label", source: "manufacturer convention" },
    ],
  },
  "o2-cylinder-duration": {
    formula: "minutes_to_reserve = ((pressure_psi - reserve_psi) * tank_factor) / flow_lpm. Tank factor = cylinder_full_L / cylinder_service_pressure_psi.",
    edition: "AARC clinical-practice convention. Tank factors: D=0.16, E=0.28, M=1.56, G=2.41, H=3.14.",
    freeAccess: "AARC public clinical-practice guidelines. Cylinder specifications free from each manufacturer's tech sheet.",
    governance: GOVERNANCE.ems_prehospital,
    editionNote: "Tank factors are nominal for the most common service pressures (2200 psi for medical O2). Verify against the actual cylinder service-pressure stamp before each transport.",
    assumptions: [
      { name: "Service pressure", value: "nominal 2200 psi for medical O2", source: "CGA / DOT cylinder marking" },
      { name: "Reserve floor", value: "200 psi is the convention; cylinders should never be drawn to zero", source: "AARC / NFPA 99" },
    ],
  },

  // v12 Group W: Pilots / Aviation.
  "density-altitude": {
    formula: "Density altitude DA = pressure altitude + 120 * (OAT_C - ISA_C). ISA_C = 15 - 1.98 * (PA / 1000).",
    edition: "FAA Pilot's Handbook of Aeronautical Knowledge (FAA-H-8083-25C), Chapter 4 (Aerodynamics of Flight) and Chapter 12 (Weather Theory).",
    freeAccess: "Public domain. Free at faa.gov/regulations_policies/handbooks_manuals.",
    governance: GOVERNANCE.aviation,
    editionNote: "The simplified 120-ft-per-deg-C formula is the standard FAA approximation taught in PHAK. A more precise virtual-temperature density-altitude formula is used in turbine performance work; the simplified form is what GA POH charts use and is the right cross-check for kneeboard work.",
    assumptions: [
      { name: "ISA lapse rate", value: "1.98 C per 1000 ft below the tropopause", source: "ICAO Standard Atmosphere" },
      { name: "Approximation factor", value: "120 ft of density altitude per deg C of ISA deviation", source: "FAA Koch chart convention" },
      { name: "Takeoff multipliers", value: "Koch-chart engineering approximation for a normally-aspirated piston single", source: "FAA PHAK" },
    ],
  },
  "crosswind-component": {
    formula: "HW = wind_speed * cos(wind_angle_off_runway); CW = wind_speed * sin(wind_angle_off_runway). Angle off runway = wind_direction - runway_heading, normalized to (-180, 180].",
    edition: "Pure geometry; published in any aviation training reference (Jeppesen Private Pilot Manual, ASA Pilot's Manual, etc.).",
    freeAccess: "No code citation required.",
    governance: GOVERNANCE.aviation,
    editionNote: "Demonstrated crosswind in the POH is the manufacturer's tested value, not a regulatory limit. PIC governs the operating decision.",
    assumptions: [
      { name: "Wind reference", value: "wind direction is degrees magnetic, from which the wind is blowing (METAR convention)", source: "FAA AC 00-45H Aviation Weather Services" },
      { name: "Runway numbering", value: "runway heading is rounded to the nearest 10 degrees magnetic; this tile accepts the actual heading", source: "FAA AC 150/5340-1L" },
    ],
  },
  "ete-eta": {
    formula: "Time en route (hours) = distance (nm) / groundspeed (kt). ETA local = departure local + ETE.",
    edition: "First-principles arithmetic.",
    freeAccess: "No code citation required.",
    governance: GOVERNANCE.aviation,
    editionNote: "Groundspeed reflects actual track over the ground, not airspeed. Wind correction is the difference; the planned-vs-actual track must be verified at every cruise checkpoint per FAA PHAK navigation chapter.",
    assumptions: [
      { name: "Groundspeed constant", value: "GS is assumed constant for the route; in practice wind shifts and altitude changes can vary it significantly", source: "convention for cruise-leg planning" },
    ],
  },
  "hypoxia-altitude": {
    formula: "Threshold lookup on cabin pressure altitude. <12,500 (none); 12,500-14,000 (crew O2 after 30 min); 14,000-15,000 (crew O2 always); >15,000 (all occupants).",
    edition: "14 CFR §91.211 (Supplemental Oxygen). Title 14 of the Code of Federal Regulations.",
    freeAccess: "Free at ecfr.gov.",
    governance: GOVERNANCE.aviation,
    editionNote: "Regulatory thresholds are CABIN pressure altitude, not flight level. Pressurized aircraft govern by cabin altitude (the aircraft can fly at FL250 with a 6000 ft cabin and trigger no O2 requirement). Different rules apply to commercial operations under 14 CFR Parts 121 and 135.",
    assumptions: [
      { name: "Scope", value: "general aviation under 14 CFR Part 91", source: "the regulation; commercial ops have stricter rules" },
    ],
  },
  "pressure-altitude": {
    formula: "PA = field_elevation + 1000 * (29.92 - altimeter_setting_inHg). The 29.92 inHg reference is the ISA standard sea-level pressure.",
    edition: "FAA Pilot's Handbook of Aeronautical Knowledge (FAA-H-8083-25C), Chapter 4 (Aerodynamics of Flight) and Chapter 7 (Aerodynamics of Flight). E6B / kneeboard shortcut universal in GA training.",
    freeAccess: "Public domain. Free at faa.gov/regulations_policies/handbooks_manuals.",
    governance: GOVERNANCE.aviation,
    editionNote: "Single-edition. The AFM performance chart uses pressure altitude as its altitude input; this tile produces the value the chart expects.",
    assumptions: [
      { name: "ISA reference", value: "29.92 inHg = 1013.25 hPa at sea level", source: "ICAO Standard Atmosphere" },
      { name: "Shortcut factor", value: "10 ft per 0.01 inHg deviation", source: "FAA kneeboard convention; the exact factor varies with altitude but 10 ft per 0.01 inHg is the GA-altitude-band approximation" },
    ],
  },
  "phonetic-alphabet": {
    formula: "26-letter A-Z table. Each letter maps to a published phonetic word: A=Alpha, B=Bravo, etc. Digits are read as the English digit (zero / one / two / etc.); 'X-ray' is hyphenated per ICAO Annex 10.",
    edition: "ICAO Annex 10 (Aeronautical Telecommunications), Volume II, Chapter 5. Also published in the FAA Aeronautical Information Manual §4-2-7.",
    freeAccess: "ICAO Annex 10 is licensed; the alphabet itself is publicly published in FAA AIM (free at faa.gov/air_traffic/publications) and is the same NATO phonetic alphabet used by US military and civilian aviation.",
    governance: GOVERNANCE.aviation,
    editionNote: "Universal across ICAO-member-state civilian aviation. Some agencies use modified spellings (some say 'Jul-i-ette' for Juliett); the bundled spellings are the published ICAO forms.",
    assumptions: [
      { name: "Translator scope", value: "letters and digits map per ICAO; spaces print as '(space)' and hyphens as 'dash'", source: "convention" },
    ],
  },

  // v12 Group X: Real Estate.
  "ltv": {
    formula: "LTV = loan_amount / value. Conventional conforming loans require PMI when LTV > 80%. Value is the lesser of appraised value or purchase price (FNMA Selling Guide).",
    edition: "FNMA Single-Family Selling Guide §B2-1.1-01 (current). FHA Handbook 4000.1 §II.A.2 (LTV caps; 96.5% maximum on purchase).",
    freeAccess: "Free at selling-guide.fanniemae.com and hud.gov/program_offices/housing/sfh/handbook_4000-1.",
    governance: GOVERNANCE.real_estate,
    editionNote: "Underwriting thresholds change over time and by product (conventional / FHA / VA / specialty); the bands shown here are common-practice ranges. Lender governs final underwriting.",
    assumptions: [
      { name: "Value basis", value: "user enters appraised value or purchase price; FNMA convention is the lesser", source: "FNMA Selling Guide" },
      { name: "PMI threshold", value: "LTV > 80% on conventional conforming", source: "FNMA / FHLMC convention; exact PMI rate is lender-set" },
    ],
  },
  "dti": {
    formula: "Front-end DTI = housing_payment / gross_monthly_income. Back-end DTI = (housing + other_debts) / gross_monthly_income. Thresholds per FNMA Selling Guide §B3-6-02 (typical 36/45, up to 50 with compensating factors), FHA Handbook 4000.1 §II.A.5 (default 31/43), VA Lenders Handbook M26-7 (back-end 41; no front-end limit).",
    edition: "FNMA Single-Family Selling Guide §B3-6-02 (current). FHA Handbook 4000.1 §II.A.5. VA Lenders Handbook M26-7.",
    freeAccess: "Free at selling-guide.fanniemae.com, hud.gov, and benefits.va.gov.",
    governance: GOVERNANCE.real_estate,
    editionNote: "DTI thresholds are 'default' values; compensating factors (large reserves, low LTV, large down payment) can push the maximum higher. Lender governs final underwriting.",
    assumptions: [
      { name: "Income basis", value: "gross monthly income (pre-tax)", source: "agency convention" },
      { name: "Housing payment", value: "PITI plus HOA per FNMA convention", source: "FNMA Selling Guide §B3-6-03" },
    ],
  },
  "piti": {
    formula: "Monthly P&I = (P * r) / (1 - (1 + r)^-n) where P is principal, r is APR/12, n is term in months. PITI = P&I + monthly_tax + monthly_insurance. Tax = annual_property_tax / 12; insurance = annual_premium / 12. HOA and PMI are user-supplied monthly line items.",
    edition: "Standard mortgage amortization. The closed-form annuity-payment formula is universal.",
    freeAccess: "Public reference; covered in any introductory finance text. CFPB Closing Disclosure form (public) shows the same line-item composition.",
    governance: GOVERNANCE.real_estate,
    editionNote: "Single-edition (mathematical fact). The PMI rate lookup from LTV is a lender-specific table and is not bundled; the user enters the PMI line item.",
    assumptions: [
      { name: "Amortization", value: "fully amortizing fixed-rate loan", source: "convention; ARMs and interest-only loans use a different schedule" },
      { name: "Payment cadence", value: "monthly", source: "convention" },
      { name: "Tax / insurance", value: "annualized amounts split evenly across 12 months", source: "escrow convention; actual escrow analyses may use a different schedule" },
    ],
  },
  "exchange-1031-timeline": {
    formula: "45-day identification deadline = sale_close + 45 calendar days. 180-day exchange deadline = sale_close + 180 calendar days. Earliest replacement deadline = min(180-day, tax-return due date for the year of the sale).",
    edition: "26 USC 1031 (Internal Revenue Code §1031). Treas. Reg. §1.1031(k)-1(b).",
    freeAccess: "26 USC free at uscode.house.gov. Treas. Reg. free at ecfr.gov.",
    governance: GOVERNANCE.real_estate,
    editionNote: "Statutory deadlines are calendar days (not business days; no Fed. R. Civ. P. 6(a) rollover). A qualified intermediary (QI) is required; attorney and tax professional govern the actual exchange.",
    assumptions: [
      { name: "Day count", value: "calendar days from sale-close (close day not counted, day 1 = next day)", source: "Treas. Reg. §1.1031(k)-1(b)" },
      { name: "Tax-return due date", value: "April 15 of the year after the sale (the tile uses the un-extended date)", source: "the taxpayer's return-due date includes extensions; if extended, 180-day governs" },
    ],
  },
  "section-121-exclusion": {
    formula: "amount_realized = sale_price - selling_costs. adjusted_basis = purchase_price + capital_improvements. realized_gain = amount_realized - adjusted_basis. exclusion = min(realized_gain, cap) when the two-of-five test is met. cap = $250,000 single / $500,000 MFJ. taxable_gain = max(0, realized_gain - exclusion).",
    edition: "26 USC 121 (Internal Revenue Code §121). Cap last amended by TRA-1997; non-qualified-use reduction added by HERA-2008 (effective 2009).",
    freeAccess: "26 USC free at uscode.house.gov. IRS Pub 523 (Selling Your Home) free at irs.gov.",
    governance: GOVERNANCE.real_estate,
    editionNote: "The two-of-five-year ownership and use test (§121(a)) is required for the full exclusion. Partial exclusion is available via §121(c) for unforeseen circumstances (job change > 50 miles, health, death, divorce). Non-qualified-use (rental after 2008) reduces the exclusion pro-rata per §121(b)(5).",
    assumptions: [
      { name: "Filing-status caps", value: "single / MFS / HoH = $250,000; MFJ = $500,000", source: "26 USC 121(b)" },
      { name: "Selling costs", value: "treated as a reduction to amount realized (vs. an addition to basis)", source: "IRS Pub 523 convention" },
      { name: "Capital improvements", value: "user enters the total of basis-eligible improvements", source: "user attests; IRS Pub 530 covers what qualifies" },
    ],
  },
  "property-tax": {
    formula: "annual_tax = max(0, assessed_value - homestead_exemption) * mill_rate / 1000. monthly_accrual = annual_tax / 12. effective_rate_percent = annual_tax / assessed_value * 100.",
    edition: "Standard mill-rate convention. 1 mill = $1 of tax per $1,000 of assessed value.",
    freeAccess: "Public reference; mill rate and assessed value are published by the local taxing authority / assessor.",
    governance: GOVERNANCE.real_estate,
    editionNote: "Mill rate is set by the local taxing authority (typically county + municipal + school + special district combined). Assessed value is set by the assessor and may differ substantially from market value depending on the jurisdiction's assessment ratio.",
    assumptions: [
      { name: "Mill definition", value: "$1 of tax per $1,000 of assessed value", source: "universal" },
      { name: "Exemption", value: "applies before the mill rate; senior / veteran / homestead exemptions vary by jurisdiction", source: "convention; some jurisdictions apply credit after tax" },
    ],
  },

  // v12 Group Y: Educators / K-12.
  "readability": {
    formula: "Flesch-Kincaid Grade Level: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59. Flesch Reading Ease: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words).",
    edition: "Kincaid, Fishburne, Rogers, and Chissom, 'Derivation of New Readability Formulas for Navy Enlisted Personnel,' Naval Technical Training Command Research Branch Report 8-75 (1975). Flesch, 'A New Readability Yardstick,' Journal of Applied Psychology 32:3 (1948).",
    freeAccess: "Public-domain U.S. government publication. Free at dtic.mil (DTIC report search).",
    governance: GOVERNANCE.education,
    editionNote: "Formula is fixed by the 1975 / 1948 papers. The runtime's deterministic syllable counter (vowel-cluster heuristic with silent-e and -le adjustments) differs from a dictionary syllable count by roughly 5 percent on edge cases (proper nouns, technical jargon).",
    assumptions: [
      { name: "Sentence boundary", value: "split on a period / question mark / exclamation followed by whitespace", source: "convention; abbreviations like 'Mr.' will over-segment" },
      { name: "Word boundary", value: "any maximal run of letters; apostrophes preserved internally", source: "convention" },
      { name: "Syllable count", value: "vowel-cluster heuristic, floor of 1 per word", source: "deterministic approximation; differs from a dictionary count by ~5 percent" },
      { name: "Validity range", value: "running prose of >= 50 words", source: "Kincaid 1975 Section 3 (shorter passages produce noisier scores)" },
    ],
  },
  "statistics-quickread": {
    formula: "Standard descriptive statistics. mean = sum / n; sample variance = sum((x_i - mean)^2) / (n-1); population variance = sum((x_i - mean)^2) / n; standard deviation = sqrt(variance).",
    edition: "Classical descriptive statistics; physical / mathematical fact. The sample-vs-population distinction is the Bessel-correction convention (Bessel 1838).",
    freeAccess: "No code citation required. Any introductory statistics text covers these.",
    governance: GOVERNANCE.education,
    editionNote: "Single-edition (mathematical fact). The sample-variance formula uses n-1; the population-variance formula uses n. Pick the one your assignment specifies.",
    assumptions: [
      { name: "Input parsing", value: "comma or whitespace separated tokens; non-numeric tokens are silently skipped", source: "convention" },
      { name: "Mode", value: "all values tied for highest frequency; empty list when every value is unique", source: "convention" },
    ],
  },
  "quadratic-formula": {
    formula: "ax^2 + bx + c = 0 => x = (-b +/- sqrt(b^2 - 4ac)) / (2a). Discriminant D = b^2 - 4ac signs the root type: D > 0 two real, D = 0 one real double, D < 0 complex conjugate pair. Vertex at x = -b/(2a).",
    edition: "Classical algebra; mathematical fact. The closed form is attributed to Indian, Greek, and later Persian / European mathematicians; the modern algebraic form is universal.",
    freeAccess: "No code citation required.",
    governance: GOVERNANCE.education,
    editionNote: "Single-edition (mathematical fact). When a = 0 the tile reports a degenerate solve (linear, infinite, or no-solution per the b and c values).",
    assumptions: [
      { name: "Coefficients", value: "all three a, b, c are real", source: "convention; complex coefficients are out of scope" },
    ],
  },
  "scientific-notation": {
    formula: "Scientific notation: any nonzero number x = sign(x) * m * 10^n where 1 <= m < 10 and n = floor(log10(|x|)). Significant figures are read from the input string: leading zeros are not significant; embedded zeros and trailing zeros after a decimal point are significant.",
    edition: "Standard scientific notation. Significant-figure conventions per the SI / NIST guidance for measurement reporting.",
    freeAccess: "Public reference; NIST SP 811 (Guide for the Use of the International System of Units) covers significant-figure conventions.",
    governance: GOVERNANCE.education,
    editionNote: "Single-edition (mathematical / SI convention).",
    assumptions: [
      { name: "Zero handling", value: "0 returns mantissa 0 and exponent 0 with sig figs = 1", source: "convention" },
      { name: "Input form", value: "decimal or scientific notation accepted; the sig-fig count uses the raw input string before normalization", source: "convention" },
    ],
  },
};

// --- Reference-block renderer (spec-v6.md §3) ---
//
// Mounts the six-line block beneath the result region. Idempotent: if a
// block already exists for `tool.id`, it's replaced. No-op if the tile
// has no structured citation yet (the audit pass adds them group by
// group).

export function renderCitationBlock(parent, toolId) {
  if (!parent) return null;
  const c = CITATIONS[toolId];
  if (!c) return null;
  // Replace any existing block.
  const prev = parent.querySelector(".v6-reference-block");
  if (prev) parent.removeChild(prev);

  const block = document.createElement("section");
  block.className = "v6-reference-block";
  block.setAttribute("aria-label", "Reference block");

  const heading = document.createElement("h2");
  heading.textContent = "Reference";
  heading.className = "v6-reference-heading";
  block.appendChild(heading);

  const dl = document.createElement("dl");
  dl.className = "v6-reference-list";

  const rows = [
    ["Formula or table cited", c.formula],
    ["Edition / source date", c.edition],
    ["Public free-access pointer", c.freeAccess],
    ["What governs", c.governance],
    ["Edition selector / disclosure", c.editionNote],
  ];
  for (const [label, value] of rows) {
    if (!value) continue;
    const dt = document.createElement("dt"); dt.textContent = label;
    const dd = document.createElement("dd"); dd.textContent = value;
    dl.appendChild(dt); dl.appendChild(dd);
  }
  block.appendChild(dl);

  // Numeric assumptions list (spec §3 line 6).
  if (Array.isArray(c.assumptions) && c.assumptions.length > 0) {
    const sub = document.createElement("h3");
    sub.textContent = "Numeric assumptions";
    sub.className = "v6-reference-subheading";
    block.appendChild(sub);

    const dl2 = document.createElement("dl");
    dl2.className = "v6-assumption-list";
    for (const a of c.assumptions) {
      const dt = document.createElement("dt");
      dt.textContent = a.name;
      const dd = document.createElement("dd");
      dd.textContent = a.value + (a.source ? "  (" + a.source + ")" : "");
      dl2.appendChild(dt); dl2.appendChild(dd);
    }
    block.appendChild(dl2);
  } else {
    const note = document.createElement("p");
    note.className = "v6-assumption-note";
    note.textContent = "No additional numeric assumptions: every input on this tile is user-supplied.";
    block.appendChild(note);
  }

  parent.appendChild(block);
  return block;
}

// --- "Copy answer with full reference block" affordance (spec-v6.md §3 / §8) ---
//
// Builds the plain-text string a tradesperson pastes into a job log,
// RFI, permit application, or text to the foreman. Concatenates the
// tool name, the user-visible answer string (provided by the caller),
// and the six §3 lines plus the assumption list. Returns the string;
// the caller wires it to a "Copy answer with full reference block"
// button using clipboard.copyText.

export function buildAnswerWithReference(toolName, answerSummary, toolId) {
  const c = CITATIONS[toolId];
  const lines = [];
  lines.push(toolName);
  if (answerSummary) lines.push(answerSummary);
  if (!c) {
    lines.push("(structured reference block not yet authored for this tile)");
    return lines.join("\n");
  }
  lines.push("");
  if (c.formula)     lines.push("Formula: " + c.formula);
  if (c.edition)     lines.push("Edition: " + c.edition);
  if (c.freeAccess)  lines.push("Free access: " + c.freeAccess);
  if (c.governance)  lines.push("Governance: " + c.governance);
  if (c.editionNote) lines.push("Edition note: " + c.editionNote);
  if (Array.isArray(c.assumptions) && c.assumptions.length > 0) {
    lines.push("Assumptions:");
    for (const a of c.assumptions) {
      lines.push("  - " + a.name + ": " + a.value + (a.source ? "  (" + a.source + ")" : ""));
    }
  }
  return lines.join("\n");
}
