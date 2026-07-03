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
const NEC_DISCLOSURE = "Editions available: bundled values follow NEC 2023. NEC 2026 is the current published edition; jurisdictions on NEC 2017 / 2020 / 2023 / 2026 use slightly different ambient corrections and ampacity ranges; verify the edition adopted by your AHJ.";

// Carpentry / construction common phrasing (Group E audit, priority 5).
const IRC_2021 = "IRC 2021 (International Residential Code).";
const IBC_2021 = "IBC 2021 (International Building Code).";
const ASCE_7 = "ASCE 7-22 (Minimum Design Loads for Buildings and Other Structures).";
const AWC_NDS = "AWC NDS-2018 (National Design Specification for Wood Construction).";
const IRC_DISCLOSURE = "Editions available: bundled values follow IRC 2021. Jurisdictions on IRC 2018 / 2024 differ at the margins; verify the edition adopted by your AHJ.";
const IBC_DISCLOSURE = "Editions available: bundled values follow IBC 2021 and ASCE 7-22 referenced formulas. Older IBC editions reference ASCE 7-16 / 7-10; verify the edition adopted by your AHJ.";

// HVAC common phrasing (Group C audit, priority 4 per spec §6).
const ASHRAE_62_1 = "ASHRAE 62.1-2022 (Ventilation for Acceptable Indoor Air Quality).";
const ASHRAE_FREE = "Free read-only access to ASHRAE standards at ashrae.org (Technical Resources, read-only standards).";
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

// Group A - Electrical. Priority-1 audit per spec-v6.md §6.
// Citations cite NEC by section number and edition only; no NEC table text
// is reproduced. Numeric assumption lists name every constant the tile
// applies that the user does not enter (ambient, termination temperature,
// conductor count, fill-table column, voltage tolerance, etc.).
export const CITATIONS = {




  "final-grade-needed": {
    formula: "needed = (target - current*(1 - w_f)) / w_f, w_f = final_weight/100; max = current*(1-w_f) + 100*w_f; min = current*(1-w_f).",
    edition: "Standard weighted-average arithmetic (the common syllabus weighted-category convention); the instructor's gradebook governs, by name.",
    freeAccess: "Pure public algebra.",
    governance: GOVERNANCE.general,
    editionNote: "Needed above 100% is not achievable with a perfect final; needed below 0 means the target is already secured (clamped to 0).",
    assumptions: [
      { name: "Weighted average", value: "the final and the graded-so-far portion combine by weight", source: "syllabus convention" },
    ],
  },

  "category-weighted-grade": {
    formula: "category% = earned/possible*100; overall = sum(category% * weight) / sum(weight). Letter bands A >= 90, B >= 80, C >= 70, D >= 60.",
    edition: "Pure weighted-mean arithmetic; standard US letter bands, by name; the instructor's gradebook governs.",
    freeAccess: "Pure public algebra; bands vary by school.",
    governance: GOVERNANCE.general,
    editionNote: "Normalizing by the sum of weights handles a partially-complete term; a category with possible = 0 is excluded.",
    assumptions: [
      { name: "Letter bands", value: "A >= 90, B >= 80, C >= 70, D >= 60 (standard US)", source: "common gradebook" },
    ],
  },

  "two-sample-t-test": {
    formula: "t = (m1-m2)/sqrt(s1^2/n1 + s2^2/n2); Welch df = (s1^2/n1 + s2^2/n2)^2 / [ (s1^2/n1)^2/(n1-1) + (s2^2/n2)^2/(n2-1) ]; p from the Student-t CDF.",
    edition: "Per OpenIntro Statistics Chapter 7 (inference for numerical data, Welch's t) and the Welch-Satterthwaite df, by name; the t-CDF reuses the bundled special-function helper.",
    freeAccess: "Free at openintro.org.",
    governance: GOVERNANCE.general,
    editionNote: "Welch's t (unequal variances); n < 2 in either group is rejected. Small n (< 30) - the normality assumption applies.",
    assumptions: [
      { name: "Welch's t", value: "does not assume equal variances; uses the Welch-Satterthwaite df", source: "OpenIntro Ch. 7" },
    ],
  },

  "gross-rent-multiplier": {
    formula: "GRM_annual = price / gross_annual_rent; GRM_monthly = price / gross_monthly_rent; implied_value = market_GRM * gross_rent; gross_yield% = 1/GRM_annual * 100.",
    edition: "Standard income-approach screening metric per the Appraisal Institute's The Appraisal of Real Estate income approach, by name; USPAP governs the appraiser's value opinion.",
    freeAccess: "Distinct from cap-rate-dscr, which uses NOI, not gross rent. Screening only.",
    governance: GOVERNANCE.general,
    editionNote: "GRM ignores vacancy and operating expenses - use cap rate / DSCR for underwriting. Annual vs. monthly GRM differ by 12x.",
    assumptions: [
      { name: "Gross rent", value: "must be market rent for comparability", source: "Appraisal Institute" },
    ],
  },

  "pmi-cancellation-date": {
    formula: "Amortized balance B(m) = P*((1+r)^n - (1+r)^m)/((1+r)^n - 1), r = APR/12; the first month where B(m) <= 0.80*value and <= 0.78*value; midpoint backstop = ceil(n/2).",
    edition: "Per the Homeowners Protection Act of 1998 (12 USC 4901-4910) - automatic termination at 78% and borrower-requested cancellation at 80% of original value, with the amortization-midpoint requirement, by name.",
    freeAccess: "CFPB consumer guidance free at consumerfinance.gov; uscode.house.gov for the statute. Estimate; the servicer governs.",
    governance: GOVERNANCE.general,
    editionNote: "The HPA uses original value and scheduled amortization (not market value or extra payments); applies to borrower-paid PMI on conventional loans, not FHA MIP.",
    assumptions: [
      { name: "Scheduled amortization", value: "uses the original payment schedule, not extra principal", source: "12 USC 4901" },
    ],
  },

  "debt-yield": {
    formula: "DY = NOI / loan x 100 (%); max_loan = NOI / (DY_min/100).",
    edition: "The commercial-real-estate debt-yield definition used by CRE lenders, by name.",
    freeAccess: "Debt yield is a standard CRE underwriting ratio defined in lender guidance and CRE finance references. The lender governs the required minimum.",
    governance: GOVERNANCE.general,
    editionNote: "Debt yield DY = NOI / loan, the lender's day-one return if it foreclosed, and the maximum loan a target debt yield supports max_loan = NOI / DY_min. Debt yield is independent of the interest rate, amortization, and cap rate, which is why it became the binding loan-sizing constraint in tight credit; typical lender minimums run 8-10%. This returns the ratio or the loan it supports: it uses the stabilized NOI as entered, is a loan-sizing screen not a full underwrite, and does not compute the DSCR or LTV (separate constraints). The lender governs the required floor.",
    assumptions: [
      { name: "Definition", value: "DY = NOI / loan; max_loan = NOI / DY_min", source: "CRE lender underwriting" },
      { name: "Leverage-independent", value: "ignores rate, amortization, and cap rate", source: "CRE finance" },
      { name: "Screen only", value: "a loan-sizing screen, not the DSCR/LTV constraints or a full underwrite", source: "scope of this tile" },
    ],
  },
  "break-even-occupancy": {
    formula: "BEO = (OpEx + debt service) / PGI x 100 (%); cushion = market occupancy - BEO.",
    edition: "The break-even (default-ratio) occupancy definition used in real-estate underwriting, by name.",
    freeAccess: "Break-even occupancy (the default ratio) is a standard underwriting metric in CRE finance references and lender guidance. The lender and market govern the acceptable level.",
    governance: GOVERNANCE.general,
    editionNote: "Break-even occupancy BEO = (operating expenses + annual debt service) / potential gross income, the occupancy at which the property exactly covers its costs, and the cushion to the market/stabilized occupancy. This returns the ratio and cushion: it uses the OpEx, debt service, and PGI as entered, treats PGI as fully-leased plus other income, and is an underwriting aid, not a full pro forma. A thin cushion (or a break-even above market) flags a fragile, highly-leveraged deal. The lender and market govern.",
    assumptions: [
      { name: "Definition", value: "BEO = (OpEx + debt service) / PGI; cushion = market occupancy - BEO", source: "CRE underwriting" },
      { name: "PGI basis", value: "potential gross income = fully-leased rent plus other income", source: "CRE finance" },
      { name: "Underwriting aid", value: "not a full pro forma; inputs entered, not derived", source: "scope of this tile" },
    ],
  },
  "max-offer-70-rule": {
    formula: "MAO = ARV x rule% - repairs - fee; spread = ARV - MAO - repairs.",
    edition: "The fix-and-flip 70% rule heuristic used by real-estate investors, by name.",
    freeAccess: "The 70% rule is a widely-published real-estate-investing rule of thumb. It is a heuristic, not an appraisal standard; the investor's actual costs and profit target govern.",
    governance: GOVERNANCE.general,
    editionNote: "The fix-and-flip 70% rule: maximum allowable offer MAO = ARV x rule% - repairs (minus any wholesale assignment fee). At 70%, the 30% held back covers holding, financing, selling costs, and profit. This returns the max offer and the gross spread: the ARV must come from real comparable sales and the repair estimate from a real scope, the rule percentage is adjustable for market conditions, and a negative MAO is reported as no deal. A rule of thumb, not an appraisal; the investor's actual cost and profit targets govern.",
    assumptions: [
      { name: "Definition", value: "MAO = ARV x rule% - repairs - fee; default rule 70%", source: "real-estate-investing heuristic" },
      { name: "30% haircut", value: "at 70%, the 30% held back covers holding, financing, selling, and profit", source: "fix-and-flip practice" },
      { name: "Unverified inputs", value: "ARV must be from real comps and repairs from a real scope; not an appraisal", source: "scope of this tile" },
    ],
  },
  "seller-net-sheet": {
    formula: "commission = price*rate; transfer_tax = price*rate; tax_proration = annual_tax*days_seller_owes/365; net = price - payoff - commission - transfer_tax - fees - concessions - proration - other.",
    edition: "Per the TILA-RESPA Integrated Disclosure / Closing Disclosure (12 CFR 1026.38) and RESPA (12 CFR 1024), by name; the transfer-tax rate is state/local and user-supplied.",
    freeAccess: "Distinct from the buyer-side closing-costs tile. Estimate; the settlement statement and closing agent govern. Free at consumerfinance.gov and ecfr.gov.",
    governance: GOVERNANCE.general,
    editionNote: "Transfer-tax base and payer vary by jurisdiction (some states levy per $500 of value). The proration convention (365 vs 360, arrears vs advance) varies.",
    assumptions: [
      { name: "Payoff", value: "includes per-diem interest and any prepayment penalty not in the principal balance", source: "settlement practice" },
    ],
  },









  "primer-tm": {
    formula: "Wallace (<=14 nt): Tm = 2(A+T) + 4(G+C). Basic GC% (>14 nt): Tm = 64.9 + 41*(G+C-16.4)/length.",
    edition: "Per Wallace R.B. et al., Nucleic Acids Research 6 (1979), for the short-oligo rule and Marmur & Doty, J Mol Biol 5 (1962) / standard references for the GC% formula, by name.",
    freeAccess: "Free abstracts at pubmed.ncbi.nlm.nih.gov; complements the pcr-master-mix tile.",
    governance: GOVERNANCE.general,
    editionNote: "Quick estimates; nearest-neighbor (SantaLucia) thermodynamics is the modern gold standard. Wallace is valid only for short primers at ~1 M NaCl.",
    assumptions: [
      { name: "Method gate", value: "Wallace for <=14 nt, GC% formula above; non-ACGT characters dropped", source: "Wallace 1979 / Marmur-Doty 1962" },
    ],
  },

  "cfu-plate-count": {
    formula: "CFU/mL = colonies / (dilution_factor * volume_plated). The dilution factor is accepted as a fraction (1e-5) or a times value (100,000) and normalized to the same result.",
    edition: "Per the FDA Bacteriological Analytical Manual (BAM) Chapter 3 (Aerobic Plate Count) and APHA Standard Methods, by name; both public/free.",
    freeAccess: "Free at fda.gov/food/science-research-food/laboratory-methods-food.",
    governance: GOVERNANCE.general,
    editionNote: "Countable range 25-250 (FDA BAM) or 30-300 (APHA); counts outside are statistically unreliable (TNTC/TFTC).",
    assumptions: [
      { name: "Plated volume", value: "spread/pour/spiral methods change the effective plated volume", source: "FDA BAM Ch. 3" },
    ],
  },



  "declining-balance-depreciation": {
    formula: "DB_rate = factor*(1/life); dep = book_begin*DB_rate, floored so book value never drops below salvage. Optional straight-line crossover when SL >= DDB.",
    edition: "GAAP book depreciation - ASC 360 (Property, Plant, and Equipment), by name; distinct from the macrs-depreciation tile (IRS Pub 946 tax method).",
    freeAccess: "Accounting information, not advice; a CPA and current GAAP govern.",
    governance: GOVERNANCE.general,
    editionNote: "Salvage is NOT subtracted before applying the DB rate (unlike straight-line). Pure DDB never reaches salvage without the SL switch.",
    assumptions: [
      { name: "Salvage floor", value: "book value is floored at salvage; depreciation in the final year is plugged to reach salvage", source: "ASC 360" },
    ],
  },

  "markup-vs-margin": {
    formula: "markup% = (price-cost)/cost*100; margin% = (price-cost)/price*100; margin% = markup%/(1+markup%); markup% = margin%/(1-margin%); price = cost*(1+markup%) = cost/(1-margin%).",
    edition: "Standard managerial-accounting pricing identity (cost-volume-profit), universal public formula; AICPA / introductory managerial-accounting texts, by name.",
    freeAccess: "Universal public identity.",
    governance: GOVERNANCE.general,
    editionNote: "Markup and margin diverge sharply (50% markup = 33.3% margin); margin >= 100% is guarded (price would be infinite).",
    assumptions: [
      { name: "Two-of-four", value: "any two of cost, price, markup, or margin resolve the rest", source: "CVP identity" },
    ],
  },

  "employer-payroll-tax": {
    formula: "SS = min(wages, SS_base)*6.2%; Medicare = wages*1.45%; FUTA = min(wages, 7000)*FUTA_rate; SUTA = min(wages, state_base)*SUTA_rate.",
    edition: "FICA - 26 USC 3101/3111 and IRS Pub 15 (Circular E), 6.2% SS / 1.45% Medicare; FUTA - 26 USC 3301-3306, $7,000 wage base, 0.6% net, IRS Form 940 - all by name.",
    freeAccess: "Free at irs.gov/forms-pubs and uscode.house.gov; the SS wage base is user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "The SS wage base is indexed annually (user-supplied). FUTA credit-reduction states have a rate above 0.6%. Employer pays no Additional Medicare match.",
    assumptions: [
      { name: "Wage base", value: "the SS wage base changes yearly and is required as a user input", source: "IRS Pub 15" },
    ],
  },

  "search-probability": {
    formula: "cumulative_POD = 1 - product(1 - POD_i); POS = POA * cumulative_POD; residual = POA * (1 - cumulative_POD).",
    edition: "Standard SAR search theory (Koopman detection theory) as used in the U.S. National SAR Supplement and NASAR / FEMA search-planning doctrine, by name.",
    freeAccess: "POD/POA/POS definitions are public; method cited, not reproduced.",
    governance: GOVERNANCE.general,
    editionNote: "Assumes independent passes - correlated searches overstate cumulative POD. POS is always <= POA.",
    assumptions: [
      { name: "Independence", value: "passes treated as statistically independent; correlated passes overstate cumulative POD", source: "Koopman detection theory" },
    ],
  },

  "brine-cure": {
    formula: "brine% = salt/(salt+water)*100; equilibrium salt% = salt/(meat+water)*100; finished nitrite ppm = cure*0.0625*1e6/total; salt-to-add = target%*total/100 - salt.",
    edition: "First-principles mass-fraction chemistry. Prague Powder #1 is 6.25% sodium nitrite; finished-product ingoing nitrite is limited per USDA FSIS regulation (9 CFR 424.21/424.22, by name).",
    freeAccess: "Free at fsis.usda.gov and ecfr.gov; the user confirms the current FSIS ingoing limit.",
    governance: GOVERNANCE.general,
    editionNote: "Salt % by weight (not by volume); equilibrium cure assumes full absorption. The 6.25% nitrite constant is fixed; the regulated ingoing maximum is user-confirmed.",
    assumptions: [
      { name: "Cure #1 nitrite", value: "Prague Powder #1 is 6.25% sodium nitrite by weight", source: "USDA FSIS" },
    ],
  },

  "bakers-percentage": {
    formula: "Flour = 100%. Ingredient weight = flour x percent / 100; hydration water = flour x hydration% / 100; total dough = sum of all ingredient weights; total formula % = 100 + sum of the other percentages; per-piece = total / pieces.",
    edition: "Baker's percentage (baker's math) - the standard bakery / pizzeria dough formulation method; first-principles arithmetic, public domain.",
    freeAccess: "Pure arithmetic, public; the flour weight and the per-ingredient percentages are user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles baker's math. Yeast / leaven amount and ferment time are leaven-type, temperature, and schedule specific; salt is typically about 2% of flour. The tile does the weights, not the schedule.",
    assumptions: [
      { name: "Flour basis", value: "total flour is the 100% basis; every percentage is by weight relative to flour", source: "baker's percentage" },
    ],
  },

  "power-distro": {
    formula: "1-phase I = W/(V*PF); 3-phase I = W/(sqrt(3)*V_LL*PF); %load = I/rating*100; continuous limit = rating*0.80.",
    edition: "First-principles AC power (P = V*I*PF; 3-phase adds sqrt(3)); the NEC continuous-load 80% rule and temporary-power Articles 520/525, by name.",
    freeAccess: "NFPA 70 free read-only at nfpa.org/freeaccess; a qualified electrician and the AHJ govern temporary power.",
    governance: GOVERNANCE.electrical,
    editionNote: "Assumes balanced legs unless per-phase entered; ignores inrush / dimmer harmonics on the neutral. Distinct from neutral-imbalance.",
    assumptions: [
      { name: "Balanced legs", value: "per-leg current assumes a balanced load unless per-phase watts are entered", source: "AC power" },
    ],
  },

  "weir-flow": {
    formula: "90-degree V-notch: Q = 2.49*H^2.48. Rectangular Francis: Q = 3.33*(L-0.2H)*H^1.5 (contracted) or 3.33*L*H^1.5 (suppressed). 1 cfs = 448.831 GPM.",
    edition: "Per the USBR Water Measurement Manual (public domain) - V-notch and Francis rectangular-weir equations and Kindsvater-Carter / Francis coefficients, by name.",
    freeAccess: "Free at usbr.gov/tsc/techreferences/mands/wmm; the user confirms the calibrated weir coefficient.",
    governance: GOVERNANCE.general,
    editionNote: "Requires a sharp-crested, ventilated, free-flow weir; a submerged/drowned condition is invalid. Head below ~0.2 ft is low-accuracy.",
    assumptions: [
      { name: "Weir condition", value: "fully-contracted, ventilated, sharp-crested, free-flow", source: "USBR Water Measurement Manual" },
    ],
  },

  "langelier-index": {
    formula: "LSI = pH - pHs; pHs = (9.3 + A + B) - (C + D), with A = (log10(TDS)-1)/10, B = -13.12*log10(T_K)+34.55, C = log10(Ca)-0.4, D = log10(alkalinity).",
    edition: "Langelier (1936) saturation index as standardized in Standard Methods for the Examination of Water and Wastewater (APHA/AWWA/WEF) and AWWA practice, by name.",
    freeAccess: "Method cited, not reproduced; the user supplies measured water-quality values.",
    governance: GOVERNANCE.general,
    editionNote: "Valid roughly 25-250 mg/L Ca and alkalinity; outside that range consider the Ryznar / modified indices. LSI predicts tendency, not rate.",
    assumptions: [
      { name: "Temperature unit", value: "converted to Kelvin internally", source: "Langelier equation" },
    ],
  },

  "chemical-feed-pump": {
    formula: "pure lb/day = MGD*dose*8.34; solution lb/day = pure/(strength/100); GPD = solution_lb_day/(8.34*SG); mL/min = GPD*3785.41/1440; setting% = GPD/pump_max*100.",
    edition: "Pounds-formula basis (lb/day = MGD x mg/L x 8.34), standard AWWA / EPA water-operator practice, by name.",
    freeAccess: "Public pounds formula; the operator of record and primacy agency govern.",
    governance: GOVERNANCE.general,
    editionNote: "Percent-by-weight differs from trade strength (12.5% NaOCl is ~11.8% by weight). Calibrate against a drawdown cylinder, not the dial.",
    assumptions: [
      { name: "8.34 lb/gal", value: "weight of one gallon of water", source: "pounds formula" },
    ],
  },

  "growing-degree-days": {
    formula: "GDD = ((min(Tmax,cutoff) + Tmin_adj)/2) - base, floored at 0. The modified method caps Tmax at the cutoff and floors Tmin at the base before averaging.",
    edition: "Per the USDA / NWS growing-degree-day method and McMaster & Wilhelm (1997), 'Growing degree-days: one equation, two interpretations,' Agric. & Forest Meteorology 87, by name.",
    freeAccess: "Free at university extension sites and agresearch indexes; corn 50/86 F is the land-grant convention.",
    governance: GOVERNANCE.general,
    editionNote: "Two methods (standard vs. modified) that diverge on hot days; the method is labeled. Days with Tmin > Tmax are skipped.",
    assumptions: [
      { name: "Base/cutoff", value: "crop-specific (corn 50/86 F); user-supplied", source: "land-grant extension" },
    ],
  },

  "pearson-square-ration": {
    formula: "parts_a = |B - target|; parts_b = |A - target|; pct_a = parts_a/(parts_a+parts_b)*100. The target must lie strictly between A and B.",
    edition: "Pearson square method - standard land-grant animal-science ration formulation (USDA / university extension; Ensminger 'Feeds & Nutrition'), by name.",
    freeAccess: "Free at university extension sites; the square is public arithmetic.",
    governance: GOVERNANCE.general,
    editionNote: "Single nutrient only - does not balance energy and protein simultaneously. Target between the two feed values or the blend is impossible.",
    assumptions: [
      { name: "Single nutrient", value: "balances one nutrient (e.g. crude protein), not energy and protein together", source: "Pearson square method" },
    ],
  },

  "livestock-water-requirement": {
    formula: "Table: per-head gallons interpolated linearly between two user-supplied temperature breakpoints. Intake ratio: gallons = DMI * water_per_DMI / 8.345. Lactation roughly doubles demand.",
    edition: "Per NRC Nutrient Requirements of Beef Cattle / Dairy Cattle water-intake guidance and the USDA NRCS National Range and Pasture Handbook water section, by name; breakpoints user-supplied.",
    freeAccess: "Free NRCS guidance at nrcs.usda.gov; per-class gallon breakpoints are table values, not reproduced.",
    governance: GOVERNANCE.general,
    editionNote: "Distinct from thi-livestock (heat-stress index, no water demand). Above the entered breakpoints it extrapolates, flagged.",
    assumptions: [
      { name: "Breakpoints", value: "per-class temperature/gallon breakpoints user-supplied from NRC / NRCS tables", source: "NRC / NRCS" },
    ],
  },

  "two-stroke-mix": {
    formula: "oil volume = fuel volume / ratio (gas:oil by volume); 1 US gallon = 128 fl oz; 1 fl oz = 29.5735 mL; oz per gallon = 128 / ratio.",
    edition: "Two-stroke fuel/oil mixing by volume ratio; first-principles volume arithmetic, public domain. The oil grade and ratio are set by the equipment manufacturer.",
    freeAccess: "Pure arithmetic, public; modern air-cooled two-strokes are commonly 50:1 with a JASO/ISO oil, but the equipment manual governs.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles ratio-by-volume; the ratio (50:1, 40:1, etc.) and oil specification come from the chainsaw / trimmer / outboard manual.",
    assumptions: [
      { name: "Ratio by volume", value: "the X:1 ratio is gas:oil by volume, the small-engine convention", source: "equipment manufacturer specification" },
    ],
  },

  "hp-from-torque": {
    formula: "HP = Torque(lb-ft) * RPM / 5252 (5252 = 33,000 / 2*pi); kW = HP * 0.7457. Torque and HP are equal at 5252 RPM by definition. Solve for any of {HP, torque, RPM}.",
    edition: "Classical definition of mechanical power (Watt's 33,000 ft-lb/min); SAE J1349 engine-power rating, by name.",
    freeAccess: "The constant 5252 is a pure derivation, fully public.",
    governance: GOVERNANCE.general,
    editionNote: "Single-identity; brake/observed power per the inputs, not SAE-corrected unless the dyno applied the correction.",
    assumptions: [
      { name: "Power constant", value: "5252 = 33,000 ft-lb/min per HP / (2*pi rad/rev)", source: "definition of horsepower" },
    ],
  },

  "volumetric-efficiency": {
    formula: "4-stroke theoretical CFM = displacement(ci) * RPM / 3456 (3456 = 1728 * 2 revs per intake cycle); 2-stroke uses /1728. VE% = actual / theoretical * 100.",
    edition: "Classical four-stroke airflow derivation; SAE engine-test conventions, by name.",
    freeAccess: "The 3456/1728 constants are pure unit derivations, public.",
    governance: GOVERNANCE.general,
    editionNote: "Single-derivation; VE above 100% is legitimate for forced induction / tuned runners (not clamped). CFM is at standard density.",
    assumptions: [
      { name: "Cycle constant", value: "4-stroke fires every 2 revolutions (3456 = 1728 in3/ft3 * 2)", source: "engine-builder reference" },
    ],
  },

  "gear-mph-rpm": {
    formula: "MPH = RPM * pi * dia(in) * 60 / (trans * axle * 63,360); inverse for RPM; revs/mile = 63,360 / (pi * dia).",
    edition: "Classical drivetrain kinematics; SAE J267 metric tire-size convention for decoding a tire code to diameter, by name.",
    freeAccess: "Pure geometry, public; consistent with the tire-gearing tile.",
    governance: GOVERNANCE.general,
    editionNote: "Single-identity (geometric no-slip speed); ignores tire and torque-converter slip.",
    assumptions: [
      { name: "No slip", value: "geometric speed ignores tire and torque-converter slip", source: "drivetrain kinematics" },
    ],
  },

  "cutting-speed-rpm": {
    formula: "RPM = 12 * SFM / (pi * dia(in)); feed IPM = RPM * flutes * chip_load(in/tooth); 12/pi = 3.8197.",
    edition: "First-principles cutting geometry; the speeds-and-feeds method as in Machinery's Handbook (Industrial Press), by name.",
    freeAccess: "Pure geometry, public; the surface speed (SFM) and chip load per tooth are user-supplied from the tool / material chart.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles RPM/feed identities; recommended SFM and chip load come from the tool manufacturer chart, and the machine, setup, and rigidity govern the safe spindle speed.",
    assumptions: [
      { name: "Chart inputs", value: "recommended SFM and chip load per tooth are user-supplied from the tool/material chart", source: "tool manufacturer data" },
    ],
  },

  "drill-point-depth": {
    formula: "point length = (diameter / 2) / tan(point angle / 2); tip (drill-to) depth = full-diameter depth + point length; a 118-degree point is about 0.3 * diameter.",
    edition: "Drill-point geometry; the 118 / 135-degree drill-point relation as in Machinery's Handbook (Industrial Press), by name; first-principles trigonometry.",
    freeAccess: "Pure geometry, public; web thinning, drift, and the machine depth stop govern the actual hole.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles tip-allowance identity; the point angle is user-supplied (118 general purpose, 135 for hard materials).",
    assumptions: [
      { name: "Ideal conical point", value: "treats the point as an ideal cone; ignores web thinning and split-point geometry", source: "drill-point geometry" },
    ],
  },

  "cost-per-mile": {
    formula: "fixed_cpm = fixed_monthly / miles; fuel_cpm = price / mpg; total_cpm = fixed_cpm + fuel_cpm + maint_cpm + driver_cpm; break-even rate = total_cpm.",
    edition: "Cost-per-mile bucket methodology per ATRI (American Transportation Research Institute), 'An Analysis of the Operational Costs of Trucking', by name; arithmetic is public.",
    freeAccess: "Report free at truckingresearch.org; all figures user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "Single-method (ATRI cost buckets); deadhead miles should be in the mileage base or fixed costs are understated per mile.",
    assumptions: [
      { name: "Mileage base", value: "include deadhead miles in the base for an honest per-mile figure", source: "ATRI methodology" },
    ],
  },

  "deadhead-percent": {
    formula: "total = loaded + deadhead; deadhead% = deadhead/total * 100; rate_loaded = revenue/loaded; rate_total = revenue/total.",
    edition: "Freight-economics arithmetic; FMCSA/DOT terminology ('deadhead' = unladen movement), by name.",
    freeAccess: "Public definitions, no proprietary table.",
    governance: GOVERNANCE.general,
    editionNote: "Single-method; rate per total mile is the effective loaded rate after absorbing empty miles. Fuel surcharge is added once, not double-counted.",
    assumptions: [
      { name: "Surcharge", value: "fuel surcharge added once to revenue, not against the empty leg", source: "freight-rate convention" },
    ],
  },

  "axle-load-distribution": {
    formula: "Lever-arm: moving the tandem d inches changes the trailer reaction by dW = trailer_load * d / L (L = kingpin-to-tandem). shift_per_hole = trailer * hole_spacing / L; holes = ceil(target_shift / shift_per_hole).",
    edition: "Per the federal axle/gross weight limits - 23 CFR 658.17 (12,000 lb steer, 34,000 lb tandem, 80,000 lb gross) and the federal Bridge Formula, by name; lever-arm statics is public.",
    freeAccess: "Free at ecfr.gov; cross-references the bridge-formula tile. FMCSA enforces.",
    governance: GOVERNANCE.general,
    editionNote: "Single-method (lever-arm slide); sliding redistributes drive<->trailer only, cannot fix an over-gross load. Bridge-formula spacing may bind before the cap.",
    assumptions: [
      { name: "Per-hole shift", value: "computed from the lever arm (trailer load * spacing / kingpin-to-tandem distance), not assumed", source: "statics" },
    ],
  },

  "elevation-pressure-loss": {
    formula: "Exact P = 0.434 * dH_ft; rule of thumb ~5 psi per floor (assumes 10-ft floors). Climbing is a loss, descending a gain.",
    edition: "Hydrostatic head 0.434 psi/ft (public); fire-ground 5-psi-per-floor approximation per IFSTA Pumping Apparatus Driver/Operator and the NFPA 14 design basis, by name.",
    freeAccess: "NFPA 14 free read-only at nfpa.org/freeaccess; the hydrostatic constant is public.",
    governance: GOVERNANCE.fire,
    editionNote: "Two methods shown (exact vs. rule of thumb); the 5-psi/floor rule assumes 10-ft floors. Friction loss is not included.",
    assumptions: [
      { name: "Floor height", value: "~10 ft assumed by the 5-psi/floor rule; exact uses the entered height", source: "NFPA 14 standpipe design basis" },
    ],
  },

  "water-supply-duration": {
    formula: "t = V / GPM; with continuous resupply R: if R >= GPM the supply is effectively sustained (report sustainable flow = R); else t = V / (GPM - R).",
    edition: "Volume/flow continuity (first principles); required-duration context per NFPA 1142 (rural/suburban water supply), by name.",
    freeAccess: "NFPA 1142 free read-only at nfpa.org/freeaccess.",
    governance: GOVERNANCE.fire,
    editionNote: "Constant flow assumed; usable tank volume is less than nominal (draft losses). Distinct from nfpa-1142-water-supply (sizes required supply) and scba-cylinder-time (air).",
    assumptions: [
      { name: "Constant flow", value: "the demand flow is held constant; resupply is continuous", source: "continuity" },
    ],
  },

  "point-load-bearing": {
    formula: "A_req = P / (Fc_perp * Cb); required bearing length = A_req / width; actual f_c_perp = P / (width * provided_length).",
    edition: "Per the National Design Specification (NDS) for Wood Construction - compression perpendicular to grain and the bearing-area factor Cb, by name; Fc-perp values user-supplied.",
    freeAccess: "AWC publishes the NDS free read-only at awc.org; the IBC-adopted edition governs.",
    governance: GOVERNANCE.general,
    editionNote: "IBC-adopted NDS edition governs; Cb applies only to bearings under ~6 in not near a member end. Does not check crushing of the supported member.",
    assumptions: [
      { name: "Fc-perp", value: "allowable compression perpendicular to grain, user-supplied by species/grade", source: "NDS supplement" },
    ],
  },

  "column-buckling-wood": {
    formula: "le/d governs (smaller dimension); FcE = 0.822*Emin/(le/d)^2; a = FcE/Fc*; c = 0.8 (sawn); Cp = (1+a)/(2c) - sqrt(((1+a)/(2c))^2 - a/c); Fc' = Fc**Cp; capacity = Fc'*b*d.",
    edition: "Per the NDS column-stability provisions (the Cp / Euler buckling basis), by name; reference design values user-supplied.",
    freeAccess: "AWC publishes the NDS free read-only at awc.org; the IBC-adopted edition governs.",
    governance: GOVERNANCE.general,
    editionNote: "Solid rectangular sawn lumber, c = 0.8; built-up / round columns out of scope; le/d capped at the NDS limit of 50.",
    assumptions: [
      { name: "c factor", value: "0.8 for sawn lumber (0.85 round poles, 0.9 glulam)", source: "NDS section 3.7" },
    ],
  },

  "beam-reactions": {
    formula: "UDL: R = wL/2, M = wL^2/8. Point load: R_left = P(L-a)/L, R_right = Pa/L. Combined bending moment M(x) = R_left*x - w*x^2/2 - (x>a ? P*(x-a) : 0), maximized over the span.",
    edition: "Statics / AISC Steel Construction Manual simple-beam diagram formulas (public; also in the AWC/NDS and any statics text), by name.",
    freeAccess: "Public statics; reproduced in any structural text.",
    governance: GOVERNANCE.general,
    editionNote: "Simple-span pinned-roller only; fixed/continuous/cantilever out of scope. Outputs reactions and moment for post/footing sizing, not stress or deflection.",
    assumptions: [
      { name: "Support condition", value: "simple-span pinned-roller; self-weight not added unless folded into w", source: "statics" },
    ],
  },

  "grains-removed": {
    formula: "dG = inlet_GPP - outlet_GPP; mass-air = CFM*60/13.33 lb-dry-air/hr; water lb/hr = mass-air * dG / 7000 (7000 grains/lb); gal = lb/hr * hours / 8.345.",
    edition: "First-principles psychrometric mass balance (7000 grains/lb; ~13.33 ft3/lb dry air); IICRC S500 grain-depression field method, by name.",
    freeAccess: "Public psychrometric constants; IICRC S500 governs the drying plan.",
    governance: GOVERNANCE.general,
    editionNote: "Single-method (in-situ field verification, not the AHAM rating); the 13.33 humid-volume constant drifts at high temperature.",
    assumptions: [
      { name: "Humid volume", value: "~13.33 ft3/lb dry air at standard conditions", source: "psychrometric chart" },
    ],
  },

  "evaporation-load": {
    formula: "load_gal = area * load_factor(class); lb = gal * 8.345; first-24h pints = load_gal * 8 * fraction; suggested AHAM pints = target / derating.",
    edition: "Per the IICRC S500 water-class framework and evaporation-load drying principle, by name (not reproduced); per-class load factors are editable field defaults.",
    freeAccess: "IICRC S500 governs; load factors are field estimates the user tunes to the standard and the job.",
    governance: GOVERNANCE.general,
    editionNote: "Single-framework (IICRC S500 water classes 1-4); the output is only as good as the class assessment. Class 4 is non-linear in area.",
    assumptions: [
      { name: "Per-class load factor", value: "editable default gal/ft2 by water class; user tunes to the job", source: "IICRC S500" },
    ],
  },

  "economizer-savings-hours": {
    formula: "Q_sens = 1.08 * CFM * dT (sensible heat, standard air); ton-hours = Q_sens * hours / 12,000. dT is the mix-to-supply delta-T.",
    edition: "ASHRAE sensible-heat relation Q = 1.08 * CFM * dT (public); air-side economizer changeover per ASHRAE Standard 90.1, by name.",
    freeAccess: "ASHRAE 90.1 free read-only at ashrae.org; the 1.08 sensible factor is public.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-relation (the 1.08 factor is sea-level standard air; apply a density correction at altitude). Design conditions govern.",
    assumptions: [
      { name: "Standard air", value: "1.08 BTU/(hr.CFM.F) at sea level, 70 F", source: "ASHRAE Fundamentals" },
    ],
  },

  "pipe-heat-loss-radial": {
    formula: "Q/L = 2*pi*k'*(T_hot - T_amb) / ln(r2/r1), where r1 = OD/2, r2 = r1 + thickness, and k' = k_value / 12 converts BTU-in/(hr.ft2.F) to BTU/(hr.ft.F).",
    edition: "Fourier conduction through a cylindrical shell (public heat-transfer formula); insulation k-values per ASHRAE Fundamentals / ASTM C335, by name.",
    freeAccess: "Free principles in published HVAC texts; k-values user-supplied.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-formula (radial log-mean conduction); distinct from the flat-wall insulation tiles. k is at the mean insulation temperature.",
    assumptions: [
      { name: "k at mean temperature", value: "insulation conductivity rises with temperature; the value entered is at the mean insulation temperature", source: "ASTM C335" },
    ],
  },

  "fan-motor-bhp": {
    formula: "AHP = CFM * TSP / 6356; BHP = AHP / eta_fan; motor HP = BHP / eta_drive, rounded up to the next standard NEMA MG 1 size.",
    edition: "AMCA / ASHRAE fan-power relation BHP = (CFM * SP) / (6356 * eta) (public); standard motor HP sizes per NEMA MG 1, by name.",
    freeAccess: "Free principles in published HVAC texts; the 6356 constant is a pure unit derivation.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-relation; TSP must be total static (external + internal) and efficiency at the duty point. Fan curve and motor data govern.",
    assumptions: [
      { name: "Total static pressure", value: "external + internal static, not just external", source: "AMCA fan-rating convention" },
    ],
  },

  "thermal-expansion-volume": {
    formula: "dV = V * (rho_cold / rho_hot - 1), where rho is water density (g/mL) at the cold inlet and set hot temperature, interpolated from bundled NIST water-density points within 32-212 F.",
    edition: "Water density vs. temperature, NIST / standard steam tables, by name (public domain).",
    freeAccess: "Free at nist.gov; the density-temperature relation is public.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-table (NIST water density 32-212 F, no extrapolation); distinct from the expansion-tank sizing tiles, which size the tank.",
    assumptions: [
      { name: "Density range", value: "interpolated within 32-212 F; temperatures outside are rejected", source: "NIST water-density table" },
    ],
  },

  "vent-sizing-stack": {
    formula: "Pass if connected_DFU <= table_DFU AND developed_length <= table_max_length. Percent length used = developed_length / table_max_length * 100. The vent should be at least half the drain diameter.",
    edition: "Per the adopted plumbing code's vent sizing and length provisions (IPC Chapter 9 / UPC Chapter 9, by name); table values user-supplied.",
    freeAccess: "Code library free read-only at codes.iccsafe.org; the AHJ-adopted edition governs.",
    governance: GOVERNANCE.plumbing,
    editionNote: "AHJ-adopted IPC/UPC edition governs; the tile reproduces no proprietary table - the user enters the two governing code values.",
    assumptions: [
      { name: "Table values", value: "permitted DFU and maximum developed length user-supplied from the adopted code table", source: "IPC/UPC Chapter 9" },
    ],
  },

  "gas-pipe-pressure-drop": {
    formula: "Spitzglass low-pressure: Q = 3550 * K * sqrt((dH * D^5) / (SG * L)), K = 1/sqrt(1 + 3.6/D + 0.03*D). Solved for dH given Q (CFH), D (in actual bore), L (ft), SG. Velocity from Q and bore area.",
    edition: "Published Spitzglass low-pressure gas-flow equation (public engineering formula); the longhand alternative to the NFPA 54 / IFGC capacity tables, by name.",
    freeAccess: "NFPA 54 free read-only at nfpa.org/freeaccess and codes.iccsafe.org; NFPA 54 governs the installation.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-formula (Spitzglass low-pressure regime, <= ~1.5 psi); the high-pressure compressible form is a different equation, flagged.",
    assumptions: [
      { name: "Inside diameter", value: "actual bore, not nominal pipe size", source: "Spitzglass equation" },
    ],
  },
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
    editionNote: "Single-edition (Eaton/Bussmann point-to-point method; published C-value table, stable across editions. Available fault current feeds the NEC 110.24 / 110.9 interrupting-rating check; verify the Bussmann SPD table currency for the conductor class in use).",
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
    editionNote: "Single-edition (OSHA 29 CFR 1910.95; the 90 dBA criterion and 5 dB exchange rate are the OSHA PEL basis. NIOSH 98-126 separately recommends an 85 dBA / 3 dB basis; verify which your hearing-conservation program applies).",
    assumptions: [
      { name: "Exchange rate", value: "5 dB (OSHA)", source: "OSHA 1910.95(b) Appendix A" },
      { name: "NIOSH alternative", value: "3 dB exchange rate; not implemented here because OSHA is the regulatory record", source: "NIOSH 98-126" },
      { name: "Action level", value: "TWA 85 dBA = 50% dose", source: "OSHA 1910.95(c)" },
      { name: "PEL", value: "TWA 90 dBA = 100% dose", source: "OSHA 1910.95(b)" },
      { name: "Threshold", value: "levels below 80 dBA contribute zero dose", source: "OSHA 1910.95 Appendix A" },
    ],
  },

  "pump-tdh": {
    formula: "TDH = (static_discharge_head + static_suction_lift) + suction_friction + discharge_friction + fittings_friction. Friction = Hazen-Williams h_f = 4.52*Q^1.852 / (C^1.852 * d^4.87) * L. Pipe velocity v (ft/s) = 0.4085 * GPM / d^2.",
    edition: "Hazen-Williams (1905, public domain); Crane Technical Paper No. 410 (fittings equivalent length).",
    freeAccess: "Free at flowoffluids.com for Crane TP-410 excerpts.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Stable empirical correlation; Crane TP-410 is the de-facto fittings reference.",
    assumptions: [
      { name: "Hazen-Williams C", value: "150 PVC / 130 new steel / 100 old steel; the user enters the value", source: "Crane TP-410" },
      { name: "Fittings", value: "entered as an equivalent pipe length (ft) per TP-410; the tile bundles no fitting table", source: "Crane TP-410" },
      { name: "Operating point", value: "the manufacturer pump curve governs the actual head at the duty flow", source: "pump manufacturer" },
    ],
  },

  "hydraulic-cylinder": {
    formula: "A_extend = pi*(bore/2)^2; A_retract = A_extend - pi*(rod/2)^2; F = P * A; v = (GPM * 231) / (60 * A); oil_per_stroke = A * stroke / 231.",
    edition: "First-principles fluid power; NFPA T2.13.7 (hydraulic cylinder dimensions / definitions) by name.",
    freeAccess: "Free at nfpa.com for the NFPA fluid-power table of contents.",
    governance: GOVERNANCE.mechanical,
    editionNote: "First-principles; definitions per the NFPA/NFPA fluid-power standard.",
    assumptions: [
      { name: "Effective area", value: "full bore on extension, bore-minus-rod annulus on retraction", source: "first-principles fluid power" },
      { name: "Unit constant", value: "231 in^3 = 1 US gallon", source: "US customary definition" },
    ],
  },

  "vbelt-drive": {
    formula: "ratio = driver_rpm / driven_rpm = D_driven / D_driver; belt length L = 2C + (pi/2)(D1+D2) + (D2-D1)^2/(4C); design_HP = nameplate_HP * service_factor; belts = ceil(design_HP / HP_per_belt).",
    edition: "ANSI/RMA IP-20 (Classical V-belts); ANSI/RMA IP-22 (Narrow V-belts). Gates Industrial Drive Design Manual (public).",
    freeAccess: "Free at gates.com/literature.",
    governance: GOVERNANCE.mechanical,
    editionNote: "HP-per-belt is a coarse planning default by cross-section; the manufacturer's speed-specific table governs.",
    assumptions: [
      { name: "HP per belt", value: "coarse nominal by cross-section (A 3 / B 7 / C 15 / D 30 / 3V 5 / 5V 12 / 8V 30 HP); verify against the manufacturer power table", source: "Gates Industrial Drive Design Manual" },
      { name: "Driver pitch diameter", value: "entered by the user; the driven diameter follows from the ratio", source: "first-principles drive geometry" },
    ],
  },

  "gear-cascade": {
    formula: "stage_ratio = N_out / N_in; overall_ratio = product of stage ratios; RPM_out = RPM_in / overall_ratio; T_out = T_in * overall_ratio * efficiency^stages.",
    edition: "First-principles gear math; AGMA 2000 (gear classification) for tolerance by name.",
    freeAccess: "Free at agma.org for the AGMA standards table of contents.",
    governance: GOVERNANCE.mechanical,
    editionNote: "First-principles; the ratio math is independent of the AGMA quality class.",
    assumptions: [
      { name: "Per-stage efficiency", value: "0.97 default for spur gears; the user can override", source: "typical spur-gear practice" },
      { name: "Undercut threshold", value: "tooth count below 8 risks undercut on a standard 20-degree spur tooth", source: "first-principles gear geometry" },
    ],
  },

  "svi-sludge-index": {
    formula: "SVI (mL/g) = (SV30 mL/L * 1000) / MLSS mg/L. Bands: < 80 pin-floc / under-aerated; 80-150 typical CAS; 150-200 filamentous developing; > 200 bulking.",
    edition: "USEPA Wastewater Operator Training (public domain); WEF Manual of Practice No. 11 by name.",
    freeAccess: "epa.gov for operator-training materials.",
    governance: GOVERNANCE.water,
    editionNote: "Single-edition (WEF Manual of Practice No. 11 / USEPA operator training; the sludge volume index is a settleability measure stable across editions).",
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

  "pool-turnover": {
    formula: "Required flow (GPM) = pool volume / (turnover hours x 60). Chlorine product (lb) = volume x ppm x 8.34 / 1,000,000 / available-chlorine fraction (cal-hypo 0.65, trichlor 0.90, liquid bleach 0.125).",
    edition: "NSPF Certified Pool Operator Handbook (2022); ANSI/APSP/ICC 11 (Public Pools and Spas).",
    freeAccess: "phta.org for the APSP-11 TOC; NSPF handbook licensed.",
    governance: GOVERNANCE.water,
    editionNote: "NSPF governs operator certification; the AHJ governs the adopted pool code, the turnover requirement, and the maximum free-chlorine residual.",
    assumptions: [
      { name: "Water weight", value: "8.34 lb/gal", source: "physical fact for water" },
      { name: "Turnover default", value: "6 hr commercial / 8 hr residential", source: "NSPF / APSP-11 typical" },
      { name: "Available chlorine", value: "cal-hypo 65% / trichlor 90% / liquid bleach 12.5%", source: "NSPF Certified Pool Operator Handbook" },
    ],
  },
  "well-drawdown": {
    formula: "Drawdown (ft) = pumping water level - static water level. Specific capacity (GPM/ft) = discharge / drawdown. Recommended pump setting (ft) = pumping level + offset (default 20 ft below the pumping level).",
    edition: "AWWA A100 (Water Wells) standard; USGS well-testing methods (USGS Open-File Report 02-197).",
    freeAccess: "awwa.org for the A100 TOC; pubs.usgs.gov for the USGS report.",
    governance: GOVERNANCE.water,
    editionNote: "A declining specific capacity over successive tests indicates well silting or screen incrustation; a licensed well driller governs rehabilitation.",
    assumptions: [
      { name: "Specific-capacity floor", value: "< 0.5 GPM/ft flagged as a marginal well", source: "AWWA A100 / USGS field practice" },
      { name: "Pump-setting offset", value: "20 ft below the pumping level (default; user overrides)", source: "well-pump field practice" },
    ],
  },
  "cooling-water-makeup": {
    formula: "Evaporation (GPM) = recirculation x delta-T / 1000. Blowdown (GPM) = evaporation / (COC - 1). Drift (GPM) = recirculation x drift fraction. Makeup (GPM) = evaporation + blowdown + drift.",
    edition: "Cooling Technology Institute (CTI) publications; ASHRAE Systems and Equipment 2020 Chapter 40 (cooling towers).",
    freeAccess: "cti.org and ashrae.org for the TOCs.",
    governance: GOVERNANCE.water,
    editionNote: "The evaporation rule of thumb (~1% of recirculation per ~10 F of range) is approximate; site psychrometrics and the makeup-water hardness govern the cycles-of-concentration target.",
    assumptions: [
      { name: "Evaporation rule", value: "evaporation = recirculation x delta-T / 1000", source: "CTI / ASHRAE rule of thumb" },
      { name: "Drift default", value: "0.002 (0.2%) for a modern drift eliminator", source: "CTI drift-eliminator practice" },
      { name: "COC scaling flag", value: "> 10 cycles flagged as a scaling risk", source: "cooling-water treatment practice" },
    ],
  },
  "chlorine-decay": {
    formula: "First-order decay C(t) = C0 x exp(-k x t). Time to target = ln(C0 / target) / k. Booster distance = distribution velocity x time-to-target (when a velocity is entered).",
    edition: "EPA 815-R-02-020 (Effects of Water Age on Distribution System Water Quality); AWWA M14.",
    freeAccess: "epa.gov and awwa.org.",
    governance: GOVERNANCE.water,
    editionNote: "EPA 40 CFR 141.74 governs the detectable residual at the system extremity; the decay constant k depends on temperature, TOC, and pipe material and should come from field decay testing.",
    assumptions: [
      { name: "Decay model", value: "bulk first-order C(t) = C0 e^(-kt)", source: "EPA 815-R-02-020 water-age model" },
      { name: "Typical k", value: "0.05-0.20 1/hr depending on TOC and temperature", source: "AWWA M14 / EPA water-age studies" },
      { name: "Extremity target", value: "0.2 mg/L default detectable residual", source: "EPA 40 CFR 141.74" },
    ],
  },

  "sous-vide-pasteurization": {
    formula: "come_up_seconds = 0.4 * L_m^2 / alpha (Heisler-chart slab approximation at Fo ~ 0.4). hold_minutes from linear interpolation of FDA Food Code Annex 6 Table A at the bath temperature. total = come_up + hold.",
    edition: "FDA Food Code Annex 6 Table A (6.5-log Salmonella reduction). Heisler-chart thermal-diffusion approximation.",
    freeAccess: "fda.gov (Food, Retail Food Protection, FDA Food Code).",
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
    editionNote: "Single-edition (1/128-acre calibration identity; the EPA-registered product label sets the legal application rate and supersedes any rule of thumb).",
    assumptions: [
      { name: "1/128-acre identity", value: "128 fl oz per gallon -> oz collected per nozzle = GPA when measured over 1/128 acre", source: "USDA Extension calibration method" },
      { name: "Adjustment threshold", value: "5% deviation from target triggers a suggested-speed correction", source: "engineering practice" },
    ],
  },

  "irrigation-requirement": {
    formula: "ET_crop = Kc x ET0 x days. Net depth = max(0, ET_crop - effective rainfall). Gross depth = net / application efficiency. Total = gross_in x acres / 12 (acre-feet); gallons = acre-ft x 325,851.",
    edition: "FAO Irrigation and Drainage Paper 56 (Crop Evapotranspiration, Allen et al. 1998) by name; USDA NRCS Irrigation Guide by name. Kc values from FAO 56 Table 12.",
    freeAccess: "FAO 56 free at fao.org; NRCS Irrigation Guide free at nrcs.usda.gov.",
    governance: GOVERNANCE.general,
    editionNote: "Reference ET0 is user-supplied from the local CIMIS / Mesonet / NOAA station; the bundled Kc values are representative mid-season single values (the full FAO 56 dual-Kc method varies by growth stage). Verify against the local extension recommendation.",
    assumptions: [
      { name: "Crop coefficient Kc", value: "alfalfa 1.15, corn 1.20, cotton 1.15, wheat 1.15, pasture 0.95, turfgrass 0.80, vegetables 1.05", source: "FAO 56 Table 12 mid-season" },
      { name: "Application efficiency", value: "drip 90%, sprinkler 75%, flood 50%", source: "NRCS Irrigation Guide" },
      { name: "Acre-foot conversion", value: "1 acre-foot = 325,851 US gallons", source: "physical fact" },
    ],
  },
  "cattle-stocking-rate": {
    formula: "Available forage = production (lb/acre) x area (acres) x utilization. AUMs = available forage / 780 lb (one animal-unit-month). Head supported for 30 days = AUMs / AU-equivalent. Grazing days for a herd = available forage / (herd x AU-equivalent x 26 lb/day).",
    edition: "USDA NRCS National Range and Pasture Handbook Chapter 6 (stocking rate) by name.",
    freeAccess: "Free at nrcs.usda.gov for the handbook.",
    governance: GOVERNANCE.general,
    editionNote: "One animal unit (AU) = a 1,000 lb cow consuming ~26 lb dry matter/day; one AUM = 780 lb. Drought and climate adjustments are essential and not modeled. Forage production from a clip-and-weigh sample or the NRCS Ecological Site Description governs.",
    assumptions: [
      { name: "AUM dry matter", value: "780 lb (26 lb/day x 30 days)", source: "NRCS National Range and Pasture Handbook" },
      { name: "Animal-unit equivalents", value: "cow-calf 1.0, yearling 0.7, sheep 0.2, horse 1.25", source: "NRCS NRPH Ch. 6 typical" },
      { name: "Utilization guideline", value: "25-50% arid range, 50-70% tame pasture (take-half-leave-half)", source: "NRCS range management practice" },
    ],
  },
  "grain-shrink-moisture": {
    formula: "moist_shrink = (M_wet - M_dry)/(100 - M_dry); W_dry = W (100 - M_wet)/(100 - M_dry); W_net = W_dry (1 - handling/100); bushels = W_net / test_weight; total_shrink = (W - W_net)/W.",
    edition: "The standard grain moisture-shrink relation used by USDA and land-grant extension, by name.",
    freeAccess: "Grain-shrink formulas are published free by land-grant extension services (e.g. Iowa State, Purdue). The buyer's contract, moisture discount schedule, and certified settlement scale govern.",
    governance: GOVERNANCE.general,
    editionNote: "The moisture-shrink fraction (M_wet - M_dry)/(100 - M_dry), the dried weight W (100 - M_wet)/(100 - M_dry), the handling/invisible shrink deduction, and the net market bushels at the crop's test weight (56 lb/bu corn, 60 lb/bu wheat and soybeans, 32 lb/bu oats). This returns the net dried weight, bushels, and total shrink for the entered moistures: it does not apply dockage for foreign material or damage, does not compute the elevator's moisture-discount dollars, and takes the handling shrink as entered. The buyer's contract and settlement scale govern; each extra point of drying costs more than a point of weight.",
    assumptions: [
      { name: "Moisture-shrink form", value: "(M_wet - M_dry)/(100 - M_dry) with the water-balance dried weight", source: "USDA / land-grant extension" },
      { name: "Test weight", value: "56 lb/bu corn, 60 lb/bu wheat and soybeans, 32 lb/bu oats", source: "USDA FGIS" },
      { name: "No dockage", value: "no foreign-material or damage dockage and no discount-dollar computation", source: "scope of this tile" },
    ],
  },
  "livestock-dry-matter-intake": {
    formula: "DMI = BW x intake/100; as_fed = DMI / (feed_DM/100); herd_as_fed = as_fed x head.",
    edition: "The NRC Nutrient Requirements dry-matter-intake basis, by name.",
    freeAccess: "Dry-matter-intake guidelines are published by NRC (National Research Council) and land-grant extension. A ration balancer and a nutritionist govern the actual diet.",
    governance: GOVERNANCE.general,
    editionNote: "The dry-matter intake DMI = body weight x intake (percent of body weight, on a dry-matter basis), the as-fed conversion as_fed = DMI / feed dry-matter fraction, and the herd multiplier. Intake runs roughly 2-3% of body weight for beef cattle; feed dry matter is about 88% for dry hay and 30-40% for corn silage. This returns a single-feed as-fed amount from a dry-matter intake: it does not balance a ration for energy, protein, or minerals, does not account for a multi-ingredient TMR, and takes the intake percentage as entered. A nutritionist and the NRC requirements govern the diet.",
    assumptions: [
      { name: "Dry-matter basis", value: "DMI = BW x intake%, always figured on a dry-matter basis", source: "NRC Nutrient Requirements" },
      { name: "As-fed conversion", value: "as_fed = DMI / (feed dry-matter fraction); wet feeds weigh far more as-fed", source: "NRC / extension" },
      { name: "Single feed only", value: "not a balanced ration; no energy/protein/mineral balancing", source: "scope of this tile" },
    ],
  },
  "manure-application-rate": {
    formula: "available_per_unit = total_nutr x availability/100; rate = crop_need / available_per_unit; applied = rate x available_per_unit = crop_need.",
    edition: "The nutrient-based manure application rate per USDA NRCS Conservation Practice Standard 590 (Nutrient Management), by name.",
    freeAccess: "NRCS Code 590 and manure-management guidance are free at nrcs.usda.gov and from land-grant extension. A manure test and the farm's nutrient-management plan govern.",
    governance: GOVERNANCE.general,
    editionNote: "The available nutrient per unit = total nutrient x first-year availability fraction, and the application rate = crop nutrient requirement / available per unit (ton/acre for solid manure, 1,000 gal/acre for liquid). The rate is set by the most limiting of nitrogen or P2O5 under the farm's nutrient-management plan. This returns the single-nutrient rate for the entered availability: it takes the plant-available fraction as entered (not by a mineralization model), does not run a phosphorus-index or the P-based cap that often governs, and is not itself a nutrient-management plan. NRCS Code 590 and the farm's certified plan govern.",
    assumptions: [
      { name: "Nutrient-based rate", value: "rate = crop_need / (total_nutr x availability); closes to applied = crop_need", source: "NRCS Code 590" },
      { name: "Form units", value: "ton/acre for solid manure (lb/ton), 1,000 gal/acre for liquid (lb/1,000 gal)", source: "extension manure guidance" },
      { name: "Limiting nutrient", value: "the plan sets whether N or P2O5 governs; a P-index can force a lower rate", source: "scope of this tile" },
    ],
  },
  "grain-bin-capacity": {
    formula: "Cylinder volume = pi x (d/2)^2 x eave height. Cone volume = (1/3) x pi x (d/2)^2 x peak height. Total ft^3 = (cylinder + cone) x packing factor. Bushels = ft^3 x 0.8036 (1 bushel = 1.2445 ft^3). Weight = bushels x test weight.",
    edition: "Bin geometry first-principles; USDA FGIS (Federal Grain Inspection Service) standard test weights by name.",
    freeAccess: "Free at ams.usda.gov/services/grain-inspection.",
    governance: GOVERNANCE.general,
    editionNote: "Test weights (lb/bushel): corn 56, wheat 60, soybeans 60, oats 32. The packing factor (1.00 free-flow to 1.05 packed) and actual fill cone govern real capacity; moisture affects test weight.",
    assumptions: [
      { name: "Bushel conversion", value: "1 ft^3 = 0.8036 bushels (1 bushel = 1.2445 ft^3)", source: "USDA standard" },
      { name: "Test weights", value: "corn 56, wheat 60, soybeans 60, oats 32 lb/bushel", source: "USDA FGIS" },
    ],
  },

  "npk-blend": {
    formula: "Nutrient recommendation = max(0, crop demand - soil-test credit) for each of N, P2O5, K2O. Three-straight blend: potash (lb/acre) = K2O rec / 0.60; DAP = P2O5 rec / 0.46 (carrying N = DAP x 0.18); urea = max(0, N rec - N from DAP) / 0.46. Total product = rate x acres.",
    edition: "USDA NRCS Agronomy Technical Note ranges and the state Cooperative Extension Service published recommendations (state-keyed) by name.",
    freeAccess: "Free at nrcs.usda.gov.",
    governance: GOVERNANCE.general,
    editionNote: "Crop nutrient demand is a representative mid-range starting point; the certified soil-test lab report and the state Extension recommendation for your soil and yield goal govern. Default grades: urea 46-0-0, DAP 18-46-0, muriate of potash 0-0-60. Legumes (soybeans, alfalfa) fix their own nitrogen.",
    assumptions: [
      { name: "Default fertilizer grades", value: "urea 46-0-0, DAP 18-46-0, potash 0-0-60", source: "common straight fertilizers" },
      { name: "Representative crop demand", value: "corn 150-60-40, wheat 100-50-30, soybeans 0-45-80 lb/acre N-P2O5-K2O", source: "NRCS Agronomy Technical Note ranges" },
      { name: "Soil-test credit", value: "subtracted from crop demand, floored at zero", source: "Extension nutrient-budget method" },
    ],
  },
  "tank-mix": {
    formula: "Acres per tank = tank capacity (gal) / spray volume (GPA). Product per tank = acres per tank x product rate per acre. Tanks needed = ceil(field acres / acres per tank). Total product = field acres x rate. Total carrier water = field acres x GPA.",
    edition: "EPA pesticide label (the label is the law per FIFRA) and NRCS Agronomy Technical Note 5 (spray calibration) by name.",
    freeAccess: "Free at epa.gov/pesticide-labels for label search.",
    governance: GOVERNANCE.pesticide,
    editionNote: "The EPA label governs the rate, carrier volume, re-entry interval (REI), and PPE. Nozzle-output (GPA) calibration is the separate Chemical Application Rate (GPA) tile. Product volume displaces a negligible share of the carrier at label rates. Liquid units in fl oz; dry units in oz (avoirdupois).",
    assumptions: [
      { name: "Volume conversions", value: "1 gal = 128 fl oz; 1 fl oz = 29.5735 mL", source: "US customary" },
      { name: "Mass conversions", value: "1 lb = 16 oz; 1 oz = 28.3495 g", source: "avoirdupois" },
      { name: "Boom-spray GPA band", value: "5-30 GPA typical (flagged outside)", source: "NRCS / Extension spray calibration" },
    ],
  },

  "thi-livestock": {
    formula: "THI = T_F - (0.55 - 0.0055 * RH) * (T_F - 58). Species stress bands: dairy 72/79/89/99; beef 74/80/90/99; hog 75/82/90/99; poultry 70/75/85/95; horse 72/79/89/99.",
    edition: "USDA-ARS livestock heat-stress publications; Kansas State University Cooperative Extension. Public domain.",
    freeAccess: "usda.gov and K-State Research and Extension.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (USDA-ARS / K-State temperature-humidity index; species stress bands are agency guidance, stable across publications).",
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
    editionNote: "Single-edition (NOAA / NWS 30-30 rule; flash-to-bang distance is a physical fact, the speed of sound at sea level).",
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
    editionNote: "Single-edition (OSHA 29 CFR 1926 Subpart P; the A/B/C soil-class slope ratios are the OSHA protective-system basis, refreshed if OSHA updates).",
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
    editionNote: "Editions available: bundled values follow NFPA 1142-2022 (Water Supplies for Suburban and Rural Fire Fighting). Jurisdictions on an earlier edition differ at the margins; verify the edition adopted by your AHJ.",
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
    editionNote: "Single-edition (physical fact: ideal-gas air duration from rated cylinder volume and pressure. NFPA 1981 air-management practice and the low-air alarm govern the exit decision, not this estimate).",
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

  "pv-interconnection-busbar": {
    formula: "Load-side: sum = main + PV_existing + PV_proposed; limit = 1.20 * busbar (breaker at the opposite end of the busbar from the main, NEC 705.12(B)(3)(2)) or 1.00 * busbar (other load-side position, 705.12(B)(3)(1)); pass when sum <= limit. Supply-side connection (705.11) is ahead of the service disconnect and is not subject to the busbar rule.",
    edition: NEC_2023 + " Article 705 (705.11 supply-side; 705.12 load-side busbar).",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Breaker position", value: "the 120% allowance requires the PV breaker at the opposite end of the busbar from the main", source: "NEC 2023 705.12(B)(3)(2); the AHJ inspector verifies position at the panel" },
      { name: "Supply-side exemption", value: "a 705.11 connection ahead of the service disconnect is governed by service-conductor ampacity, not the busbar rule", source: "NEC 2023 705.11(B)" },
    ],
  },

  "off-grid-battery": {
    formula: "usable_Wh = daily_Wh * days_autonomy; nameplate_Wh = usable_Wh / (DoD * round_trip_efficiency * temperature_derate); nameplate_Ah = nameplate_Wh / system_V.",
    edition: "IEEE 1013 (Sizing Lead-Acid Batteries for Stand-Alone PV Systems); IEEE 1561 (PV / Hybrid Power Systems).",
    freeAccess: "standards.ieee.org for IEEE 1013 bibliographic data.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (IEEE 1013 / 1561 stand-alone PV battery-sizing practice; DoD and temperature-derate defaults from manufacturer data. NEC Article 706 governs the installation, not this sizing estimate).",
    assumptions: [
      { name: "Usable depth-of-discharge", value: "about 0.50 for flooded lead-acid; about 0.80 for LFP", source: "IEEE 1013; the chemistry datasheet governs" },
      { name: "Round-trip efficiency", value: "about 0.85 lead-acid; about 0.95 LFP", source: "manufacturer datasheet" },
    ],
  },

  "voltage-drop-reactance": {
    formula: "Vd = k * I * (R*cos(theta) + X*sin(theta)) * L / 1000, with k = 2 single-phase or sqrt(3) three-phase and theta = arccos(PF). R and X per 1000 ft are selected by conductor size and conduit material.",
    edition: NEC_2023 + " Chapter 9 Table 9 (R and X per 1000 ft); 210.19(A) Note 4 (3% branch) and 215.2(A)(1) Note 2 (5% total) advisory bands.",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Impedance values", value: "R and X per 1000 ft are entered from NEC Chapter 9 Table 9 for the conductor size and conduit material (steel raceway raises X)", source: "NEC 2023 Chapter 9 Table 9; the tile does not bundle the table" },
      { name: "Advisory band", value: "3% on a branch, 5% total (branch + feeder) is advisory, not mandatory", source: "NEC 2023 210.19(A) Note 4 and 215.2(A)(1) Note 2" },
    ],
  },

  "power-triangle": {
    formula: "kVA^2 = kW^2 + kVAR^2; PF = kW / kVA; theta = arccos(PF). Any two of kW / kVA / kVAR / PF / angle fix the triangle, provided at least one is a magnitude.",
    edition: "IEEE 1459 (Definitions for the Measurement of Electric Power Quantities). Sinusoidal-case algebra.",
    freeAccess: "standards.ieee.org for the IEEE 1459 abstract.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (IEEE 1459 power-quantity definitions; the sinusoidal-case power triangle is a physical identity).",
    assumptions: [
      { name: "Sinusoidal system", value: "the classic power triangle applies to sinusoidal voltage and current; non-sinusoidal systems add a distortion-power term", source: "IEEE 1459" },
      { name: "Reactive sign", value: "lagging (inductive) reactive power is drawn by motors; leading (capacitive) by over-correction", source: "first-principles AC theory" },
    ],
  },

  // spec-v121..v128 (2026-06-23): motors / feeders / fault / raceway / grounding / three-phase fundamentals.
  "motor-synchronous-speed-slip": {
    formula: "Ns = 120 x f / P (the 120 carries the 60 s/min x 2 poles-per-pole-pair bridge); slip = (Ns - rated_rpm) / Ns; slip_pct = slip x 100; rotor (slip) frequency = slip x f.",
    edition: "First-principles AC-machine speed relation; classical induction-machine theory.",
    freeAccess: "First-principles physics; no licensed source required.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the synchronous-speed relation and slip definition are physical identities; the 120 constant is a fixed unit bridge).",
    assumptions: [
      { name: "Rated speed", value: "the nameplate full-load speed governs the slip; a speed near synchronous indicates a lightly loaded machine, rising slip indicates loading or a rotor fault", source: "motor nameplate / manufacturer" },
      { name: "Pole count", value: "the stator pole count is an even integer (2, 4, 6, 8, ...)", source: "AC-machine construction" },
    ],
  },

  "motor-shaft-torque": {
    formula: "T = 5252 x HP / RPM (5252 = 33,000 ft-lb/min per HP divided by 2 pi, the rev/min-to-rad/s bridge); inverse HP = T x RPM / 5252. Supply exactly one of HP or torque; the tile solves for the other.",
    edition: "First-principles rotational-power identity (power = torque x angular speed).",
    freeAccess: "First-principles physics; no licensed source required.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the horsepower-speed-torque identity is a physical relation; the 5252 constant is a fixed unit bridge).",
    assumptions: [
      { name: "Mechanical horsepower", value: "horsepower here is mechanical shaft horsepower at the stated speed", source: "first-principles rotational power" },
      { name: "Service factor", value: "the nameplate and the driven load govern the service-factor margin; this is the rated-point torque", source: "motor nameplate / driven load" },
    ],
  },

  "motor-operating-cost": {
    formula: "input_kW = HP x 0.746 x (load_factor/100) / (efficiency/100); annual_kWh = input_kW x run_hours; annual_cost = annual_kWh x rate. The 0.746 kW/HP is the mechanical-to-electrical conversion.",
    edition: "First-principles electrical-input power and the 0.746 kW-per-HP identity.",
    freeAccess: "First-principles physics; no licensed source required.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (input power and energy cost are physical relations; the 0.746 constant is a fixed unit bridge).",
    assumptions: [
      { name: "Energy charge only", value: "the result is the energy-charge component only and excludes demand charges, time-of-use rates, and power-factor penalties", source: "utility tariff governs the full bill" },
      { name: "Efficiency basis", value: "efficiency is the full-load efficiency; partial-load efficiency differs and the load factor scales the input power linearly as a first approximation", source: "motor nameplate / manufacturer curve" },
    ],
  },

  "multi-motor-feeder": {
    formula: "min_feeder_ampacity = 1.25 x largest_FLC + sum_other_FLC (430.24); max_feeder_OCPD = largest_branch_OCPD + sum_other_FLC (430.62), then the next standard size down (it may not exceed the limit).",
    edition: NEC_2023 + " 430.24 (feeder conductors) and 430.62 (feeder overcurrent protection).",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "FLC table value", value: "each motor full-load current must be the NEC table value (430.248 / 430.250), user-supplied; the tile does not bundle the motor FLC tables", source: "NEC 2023 430.6 / 430.248 / 430.250" },
      { name: "Standard sizes", value: "the feeder OCPD is rounded down to a 240.6(A) standard size because 430.62 sets a ceiling that may not be exceeded", source: "NEC 2023 240.6(A) / 430.62; the AHJ governs" },
    ],
  },

  "conductor-short-circuit-withstand": {
    formula: "(I/A)^2 x t = K x log10((T2 + B)/(T1 + B)); withstand = area x sqrt(C / t), min size = fault x sqrt(t / C), where C = K log10((T2+B)/(T1+B)). Copper K=0.0297 B=234; aluminum K=0.0125 B=228.",
    edition: "ICEA P-32-382 / Onderdonk adiabatic short-circuit heating equation (public-domain form), by name.",
    freeAccess: "Public-domain engineering relation; the ICEA P-32-382 standard itself is licensed.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the Onderdonk / ICEA P-32-382 adiabatic relation is a public-domain engineering equation). A thermal-withstand SCREEN, not a substitute for the protective-device time-current curve or an engineered study.",
    assumptions: [
      { name: "Adiabatic", value: "the equation assumes all fault energy heats the conductor with no heat loss, valid for short clearing times", source: "Onderdonk / ICEA P-32-382" },
      { name: "Scope", value: "the protective-device clearing curve and an engineered study govern the final determination; this is a screen", source: "engineered short-circuit study" },
    ],
  },

  "conduit-thermal-expansion": {
    formula: "delta_L = coefficient x (run_length_ft x 12) x temperature_change; an expansion fitting is required once delta_L reaches the 1/4-inch (0.25 in) trigger, sized for that travel. PVC coefficient 3.38e-5 in/in/deg-F.",
    edition: NEC_2023 + " 352.44 (expansion fittings for rigid PVC conduit).",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "PVC coefficient", value: "the bundled 3.38e-5 in/in/deg-F coefficient is the public PVC physical property underlying NEC Table 352.44; the manufacturer's published coefficient governs", source: "NEC 2023 Table 352.44 / PVC manufacturer" },
      { name: "Temperature swing", value: "the temperature change is the maximum-minus-minimum the conduit will see; a zero or negative swing yields zero expansion to absorb", source: "site temperature extremes; the AHJ governs" },
    ],
  },

  "egc-upsize-proportional": {
    formula: "ratio = max(1, installed_phase_cmil / base_phase_cmil); upsized_EGC_cmil = base_EGC_cmil x ratio, then select the next standard AWG/kcmil at or above this. A ratio below 1 is clamped to 1 (the EGC is never reduced below its table size).",
    edition: NEC_2023 + " 250.122(B) (increase in size of equipment grounding conductors).",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "User-supplied tables", value: "the base EGC size (from the 250.122 table for the OCPD) and the minimum-required phase area are user-supplied; the tile bundles neither table", source: "NEC 2023 Table 250.122" },
      { name: "Upper bound", value: "the EGC need never exceed the ungrounded conductors it runs with; the AHJ governs the final size", source: "NEC 2023 250.122(B); the AHJ governs" },
    ],
  },

  "delta-wye-line-phase": {
    formula: "Wye: V_line = root-3 x V_phase, I_line = I_phase. Delta: V_line = V_phase, I_line = root-3 x I_phase. Connection-independent S = root-3 x V_line x I_line; P = S x PF. root-3 = 1.73205.",
    edition: "First-principles three-phase winding relations; classical balanced three-phase theory.",
    freeAccess: "First-principles physics; no licensed source required.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the wye and delta line/phase relations and the root-3 power identity are physical relations).",
    assumptions: [
      { name: "Balanced system", value: "the relations assume a balanced three-phase system; the root-3 factor is exact for balanced sinusoidal quantities", source: "balanced three-phase theory" },
      { name: "Connection", value: "the equipment nameplate governs the actual connection (wye/star or delta)", source: "equipment nameplate" },
    ],
  },

  "ev-charger-load": {
    formula: "I_circuit = I_charger * 1.25 (continuous); recommended breaker = next standard size >= I_circuit; new_panel_load = existing_load + I_circuit; headroom = main - new_panel_load.",
    edition: NEC_2023 + " Article 625 (625.41/625.42 continuous-load and load-management); 220.83/220.87 panel load; 310.16 conductor.",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Continuous load", value: "EVSE is a continuous load; circuit and overcurrent device are sized at 125% of nameplate", source: "NEC 2023 625.41 / 625.42" },
      { name: "Conductor estimate", value: "the recommended conductor is a first-principles ampacity estimate (copper, 75 C, 30 C ambient); verify against NEC 310.16", source: "NEC 2023 310.16; the AHJ governs" },
    ],
  },

  "ambient-ampacity-adjust": {
    formula: "adjusted_ampacity = base_ampacity * ambient_factor * fill_factor. Ambient factor per 310.15(B)(1) (30 C table basis), fill factor per 310.15(C)(1) (more than three current-carrying conductors).",
    edition: NEC_2023 + " 310.15(B)(1) (ambient correction) and 310.15(C)(1) (conductor-fill adjustment).",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Base ampacity", value: "the base ampacity is the user's NEC 310.16 table value for the conductor; the tile does not bundle 310.16", source: "NEC 2023 Table 310.16" },
      { name: "Correction tables", value: "the 310.15(B)(1) and 310.15(C)(1) factors are bundled de-facto public reference", source: "NEC 2023 310.15(B)(1) / 310.15(C)(1)" },
    ],
  },

  "service-load-optional": {
    formula: "General load demand = first 10 kVA at 100% + remainder at 40%, where general load = 3 VA/ft^2 + 1500 VA per small-appliance and laundry circuit + nameplate of fixed appliances, range, dryer, water heater. HVAC larger of heating vs cooling added at 100% (220.82(C)).",
    edition: NEC_2023 + " 220.82 (optional dwelling load calculation); 220.42 (standard method) for the comparison.",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Method choice", value: "the optional method may be used for a dwelling served by a single 120/240 V or 120/208 V set of service conductors; size to the larger of the optional and standard methods", source: "NEC 2023 220.82 / 220.42" },
      { name: "HVAC", value: "the larger of heating vs cooling is added at 100%; non-simultaneous loads are not summed", source: "NEC 2023 220.82(C)" },
    ],
  },

  "lux-to-footcandle": {
    formula: "fc = lux / 10.764 (1 footcandle = 1 lumen/ft^2; 1 lux = 1 lumen/m^2; 1 ft^2 = 0.092903 m^2). Lumen method (room average): fc = (total lumens × CU × LLF) / area_ft2, where CU is the coefficient of utilization and LLF the light-loss factor.",
    edition: "IES Lighting Handbook (10th ed.) lumen method, by name; the 10.764 lux-per-footcandle conversion is an exact unit identity.",
    freeAccess: "IES Handbook licensed; the conversion identity and the lumen-method formula are public and reproduced in any lighting-design text.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (exact photometric unit identity + IES lumen method; the room result is a maintained average, not a point reading).",
    assumptions: [
      { name: "Conversion constant", value: "1 fc = 10.764 lux (exact, from 1 ft^2 = 0.092903 m^2)", source: "SI/US-customary unit identity" },
      { name: "CU / LLF", value: "coefficient of utilization and light-loss factor are project-specific and user-supplied from the luminaire photometric report and maintenance schedule", source: "IES Lighting Handbook lumen method" },
    ],
  },

  "parallel-conductor-derate": {
    formula: "I_total = I_single x N x F_ccc x F_ambient, where N is the number of identical parallel sets, F_ccc is the more-than-three current-carrying-conductor adjustment (1.0 for <=3, 0.8 for 4-6, 0.7 for 7-9, 0.5 for 10-20, ...), and F_ambient the temperature correction. Per-set current I_set = I_load / N. Paralleling is permitted only at 1/0 AWG and larger.",
    edition: "NEC (NFPA 70) Article 310 paralleled-conductor provisions and the 310.15(C)(1) adjustment factors, by name.",
    freeAccess: "NFPA 70 free read-only at nfpa.org/freeaccess; conductor ampacities user-supplied from the adopted edition's ampacity table.",
    governance: GOVERNANCE.electrical,
    editionNote: "AHJ-adopted NEC edition governs; the 1/0-AWG minimum and the all-sets-identical (length / material / termination) rule are long-standing NEC requirements.",
    assumptions: [
      { name: "Conductor ampacity", value: "single-conductor ampacity user-supplied from the NEC ampacity table for the conductor / insulation / termination", source: "NEC ampacity tables" },
      { name: "Parallel sets identical", value: "all parallel sets share length, material, size, insulation, and termination", source: "NEC Article 310 parallel-conductor rule" },
    ],
  },

  "neutral-current-3ph": {
    formula: "I_N = sqrt(Ia^2 + Ib^2 + Ic^2 - Ia*Ib - Ib*Ic - Ic*Ia), the RMS magnitude of the phasor sum of three 120-degree-displaced phase currents. A balanced linear load gives I_N = 0; with dominant triplen (3rd-harmonic) content the neutral approaches 3 x the per-phase triplen current and can exceed the phase current.",
    edition: "Phasor-sum first principles; neutral-as-current-carrying-conductor and harmonic guidance per NEC Article 310 and IEEE Std 519, by name.",
    freeAccess: "NFPA 70 free read-only at nfpa.org/freeaccess; IEEE 519 is the named harmonic-limits standard.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-formula (the result is an RMS magnitude, not a direction); the harmonic estimate is a screening approximation, not a measured spectrum.",
    assumptions: [
      { name: "Sinusoidal fundamental", value: "the phasor-sum form assumes the fundamental; harmonic content is handled by the separate triplen estimate", source: "AC circuit theory" },
    ],
  },

  "motor-vd-starting": {
    formula: "V_drop = (2 for 1-phase, sqrt(3) for 3-phase) x K x LRC x L / cmils; V_terminal = V_source - V_drop; %dip = V_drop / V_source x 100. K is the conductor constant (Cu ~12.9, Al ~21.2 ohm-cmil/ft) and LRC the motor locked-rotor current.",
    edition: "Ohm's-law voltage-drop method (first principles); motor locked-rotor current per NEC Article 430 code-letter tables; contactor pickup/dropout ~85% nominal per NEMA ICS 2, by name.",
    freeAccess: "NFPA 70 free read-only at nfpa.org/freeaccess; LRC user-supplied from the nameplate code letter or estimated as 6x FLA.",
    governance: GOVERNANCE.electrical,
    editionNote: "AHJ governs; distinct from the steady-state voltage-drop tile (this is the transient starting dip that decides whether the contactor holds).",
    assumptions: [
      { name: "Locked-rotor current", value: "user-supplied from the NEC 430 code-letter table, or estimated as 6x full-load amps", source: "NEC Article 430" },
      { name: "Conductor constant K", value: "12.9 ohm-cmil/ft copper, 21.2 aluminum (one-way)", source: "voltage-drop convention" },
    ],
  },

  "duct-velocity-pressure": {
    formula: "V = 4005 * sqrt(VP) and VP = (V / 4005)^2, for standard air (0.075 lb/ft^3 at sea level, 70 F). The 4005 constant embeds the standard-air density; at altitude or elevated temperature a density correction applies.",
    edition: "ACCA Manual D / ASHRAE Fundamentals duct-design velocity-pressure relation, by name.",
    freeAccess: "ACCA / ASHRAE licensed; the velocity-pressure identity is public and reproduced in any duct-design text.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (standard-air velocity-pressure identity; apply a density correction off standard conditions).",
    assumptions: [
      { name: "Air density", value: "standard air 0.075 lb/ft^3 (sea level, 70 F); the 4005 constant is density-dependent", source: "ASHRAE Fundamentals" },
    ],
  },

  "refrigerant-velocity": {
    formula: "V_fpm = (mass_flow_lb_hr * specific_volume_ft3_lb) / area_ft2 / 60, where area = (pi/4)(ID_in/12)^2. Oil return needs a minimum velocity (higher in a suction riser); above ~4000 fpm the line is noisy.",
    edition: "ASHRAE Refrigeration Handbook line-sizing and oil-return guidance, by name.",
    freeAccess: "ASHRAE licensed; refrigerant specific volume is read from the manufacturer's P-T / property data (user-supplied).",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (line-velocity identity; oil-return minimums and the ~4000 fpm ceiling are advisory and manufacturer-table-governed).",
    assumptions: [
      { name: "Oil-return window", value: "horizontal min ~700 fpm, suction-riser min ~1500 fpm, noise ceiling ~4000 fpm (advisory)", source: "ASHRAE Refrigeration Handbook line-sizing guidance" },
      { name: "Specific volume", value: "refrigerant specific volume at the line condition is strain-of-refrigerant- and state-specific and user-supplied", source: "manufacturer refrigerant property data" },
    ],
  },

  "fire-stream-reaction": {
    formula: "Smooth bore: NR = 1.57 * d^2 * NP. Fog: NR = 0.0505 * Q * sqrt(NP). NR in lb, d in inches, NP in psi, Q in gpm.",
    edition: "IFSTA Pumping Apparatus Driver/Operator nozzle-reaction formulas, by name.",
    freeAccess: "IFSTA licensed; the nozzle-reaction formulas are public and reproduced in pump-operations curricula.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (classical nozzle-reaction formulas; the ~60 lb one-person and ~75 lb hose-team staffing thresholds are advisory).",
    assumptions: [
      { name: "Staffing thresholds", value: "~60 lb one-firefighter, ~75 lb hose-team (advisory; AHJ and fire-officer judgment govern)", source: "IFSTA pump-operations practice" },
    ],
  },

  "sprinkler-k-factor": {
    formula: "Q = K * sqrt(P), solved for flow Q (gpm), pressure P (psi), or the nominal nameplate K-factor.",
    edition: "NFPA 13 sprinkler discharge relation Q = K*sqrt(P), by name.",
    freeAccess: "Free read-only at nfpa.org/freeaccess; NFPA 13 governs the design.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (discharge identity; K is the nominal nameplate K-factor - temperature/orifice variants differ).",
    assumptions: [
      { name: "K-factor", value: "nominal nameplate K (e.g., 5.6 for a standard 1/2-in orifice); the actual K is marked on the sprinkler", source: "NFPA 13 / manufacturer data sheet" },
    ],
  },

  "valve-flow-coefficient": {
    formula: "Liquid: Q = Cv * sqrt(dP / SG), solved for Cv, flow Q (gpm), or pressure drop dP (psi). The gas / compressible regime uses a different (choked-aware) equation and is flagged, not computed.",
    edition: "ISA-75.01 / Crane Technical Paper 410 (TP-410) control-valve sizing relation, by name.",
    freeAccess: "ISA / Crane licensed; the incompressible liquid Cv relation is public and reproduced in valve-sizing references.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (incompressible liquid Cv relation; choked / cavitating flow and the gas regime are out of scope, flagged).",
    assumptions: [
      { name: "Flow regime", value: "incompressible, non-choked liquid; specific gravity is relative to water at 60 F", source: "ISA-75.01 / Crane TP-410" },
    ],
  },

  "od600-cell-count": {
    formula: "cells/mL = OD600 * factor * dilution, where the OD-to-cells factor is strain- and instrument-specific. Linear range is typically OD < ~0.8 (dilute and re-read above it).",
    edition: "Standard microbiology spectrophotometry; the OD600-to-cell-density relation, by practice.",
    freeAccess: "Public method; the conversion factor is established per strain and instrument by the lab (no universal constant).",
    governance: GOVERNANCE.lab,
    editionNote: "Single-edition (Beer-Lambert-regime spectrophotometry; the OD-to-cells factor is user-supplied and instrument-calibrated).",
    assumptions: [
      { name: "Conversion factor", value: "strain- and instrument-specific (e.g., E. coli ~8e8 cells/mL per OD600 on a typical spectrophotometer); user-supplied", source: "lab calibration" },
      { name: "Linear range", value: "OD600 < ~0.8; above it, dilute and re-read", source: "spectrophotometry practice" },
    ],
  },

  "curve-grade-scaler": {
    formula: "Flat: new = raw + k. Square-root: new = 10 * sqrt(raw). Linear rescale: a = (100 - target)/(100 - mean), b = 100(1 - a), new = raw*a + b (class mean -> target, 100 anchored at 100). All clamped to [0, 100].",
    edition: "Standard psychometric score-scaling methods (flat, square-root, linear rescale), by practice.",
    freeAccess: "Public; the scaling formulas are standard classroom and psychometric practice.",
    governance: GOVERNANCE.education,
    editionNote: "Single-edition (standard grade-curve transforms; estimate only - the instructor's gradebook and academic-integrity policy govern final grades).",
    assumptions: [
      { name: "Clamp", value: "the curved score is clamped to [0, 100]; the square-root curve only raises scores below 100", source: "score-scaling practice" },
    ],
  },

  // ---- v23 Part II batch 2 (15 new tiles) ----

  "trap-seal-loss": {
    formula: "Pass if the developed trap-to-vent distance <= the code-permitted maximum for the drain diameter; percent used = distance / permitted x 100; siphonage risk when the vent is inadequate or the trap seal is below 1 in.",
    edition: "IPC §1002 / UPC §1002 trap-seal-protection and trap-to-vent distance provisions, by name.",
    freeAccess: "Free read-only at codes.iccsafe.org; the AHJ-adopted edition governs.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (trap-seal-protection principle is stable; the permitted maximum distance is user-supplied from the AHJ-adopted IPC/UPC table - no proprietary table reproduced).",
    assumptions: [
      { name: "Permitted maximum", value: "user-supplied from the adopted trap-to-vent distance table for the drain diameter", source: "IPC/UPC §1002" },
      { name: "Scope", value: "S-traps are out of scope; the standard trap seal is ~2 in", source: "plumbing practice" },
    ],
  },

  "water-meter-sizing": {
    formula: "Adequate if peak demand <= the meter's normal-flow rating at the available pressure loss; percent used = peak / normal x 100; headroom = normal - peak; flag if peak exceeds the peak-flow rating.",
    edition: "AWWA M22 (Sizing Water Service Lines and Meters) and the AWWA C700-series meter standards, by name.",
    freeAccess: "AWWA-published; guidance summaries free at awwa.org. Meter flow ranges user-supplied for the candidate size.",
    governance: GOVERNANCE.water,
    editionNote: "Single-edition (meter normal/peak flow ranges are user-supplied per the candidate meter class; the available pressure loss must be the drop across the meter, not the static pressure).",
    assumptions: [
      { name: "Flow ranges", value: "normal and peak flow ratings user-supplied for the candidate meter size/class", source: "AWWA M22 / C700-series" },
    ],
  },

  "drying-chamber-co2": {
    formula: "Q_fresh (cfm) = CO2 generation (cfm) x 1e6 / (C_indoor_ppm - C_outdoor_ppm); ACH = Q_fresh x 60 / containment_volume_ft3.",
    edition: "ASHRAE 62.1 ventilation-rate mass-balance basis, by name.",
    freeAccess: "ASHRAE-published; the steady-state mass balance is public. IICRC S500 governs the drying plan.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (steady-state single-zone CO2 mass balance; complements chamber-turnover, which sizes air movers not fresh air).",
    assumptions: [
      { name: "Steady state", value: "well-mixed single zone at steady state; CO2 generation entered as cfm of CO2", source: "ASHRAE 62.1 mass balance" },
    ],
  },

  "wall-bracing-length": {
    formula: "Required braced-panel length = (required bracing percent / 100) x braced-wall-line length; pass if provided >= required.",
    edition: "IRC §R602.10 wall-bracing provisions, by name.",
    freeAccess: "Free read-only at codes.iccsafe.org; the AHJ-adopted edition governs.",
    governance: GOVERNANCE.structural,
    editionNote: "Single-edition (the percent-of-line rule is stable; the required percent is user-supplied from the AHJ-adopted IRC table - it depends on method, seismic design category, and exposure).",
    assumptions: [
      { name: "Required percent", value: "user-supplied from the adopted IRC R602.10 bracing table for the method/SDC/exposure", source: "IRC R602.10" },
    ],
  },

  "deck-ledger-fasteners": {
    formula: "Fastener count = floor(ledger_length_ft x 12 / on-center spacing) + 1; spans <= 18 ft are within the IRC table, beyond require an engineered connection.",
    edition: "IRC §R507.9 deck ledger connection provisions, by name.",
    freeAccess: "Free read-only at codes.iccsafe.org; the AHJ-adopted edition governs.",
    governance: GOVERNANCE.structural,
    editionNote: "Single-edition (the count follows from the on-center spacing, which is user-supplied from the AHJ-adopted IRC R507.9 table for the fastener type / joist-span row).",
    assumptions: [
      { name: "Spacing", value: "user-supplied from the adopted IRC R507.9 table; bolt edge-distance and stagger apply; bottom-of-ledger spacing excluded", source: "IRC R507.9" },
    ],
  },

  "cargo-securement-wll": {
    formula: "Aggregate WLL = number of tiedowns x per-tiedown WLL; required >= 0.5 x cargo weight; minimum tiedown count from the length/weight rule (>= 1 per 10 ft, >= 2 for articles over 5 ft or 1100 lb).",
    edition: "FMCSA 49 CFR 393.100-393.136 cargo securement (aggregate-WLL and tiedown-count rules), by name.",
    freeAccess: "Free at ecfr.gov; FMCSA enforces.",
    governance: GOVERNANCE.trucking,
    editionNote: "Single-edition (the general cargo-securement rules; commodity-specific rules for logs, vehicles, coils, etc. are out of scope and flagged).",
    assumptions: [
      { name: "WLL", value: "the marked rating of each tiedown (not breaking strength); the lowest-rated component governs each tiedown", source: "49 CFR 393.102" },
    ],
  },

  "fuel-tax-ifta": {
    formula: "Taxable gallons = jurisdiction miles / fleet MPG; net tax = taxable gallons x rate - gallons purchased x rate (a negative net is a credit).",
    edition: "IFTA Articles of Agreement quarterly-return method, by name.",
    freeAccess: "Free at iftach.org; the base jurisdiction's return governs.",
    governance: GOVERNANCE.trucking,
    editionNote: "Single-edition (the per-jurisdiction taxable-gallon method; rates change quarterly and are user-supplied - run per jurisdiction and sum the net column).",
    assumptions: [
      { name: "Tax rate", value: "per-jurisdiction $/gal, user-supplied (rates change quarterly)", source: "IFTA member-jurisdiction tax-rate matrix" },
    ],
  },

  "screw-conveyor": {
    formula: "Q (ft^3/hr) = (pi/4)(D^2 - d^2) x pitch x RPM x loading x 60, all in feet; mass rate = Q x bulk density.",
    edition: "CEMA Screw Conveyor standard (Book No. 350) capacity method, by name.",
    freeAccess: "CEMA-published; the swept-volume capacity relation is public. CEMA and the manufacturer govern.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (geometric swept-volume capacity; the trough loading fraction is per the CEMA material class and is user-supplied).",
    assumptions: [
      { name: "Loading fraction", value: "per the CEMA material class (light ~30-45%, heavy/abrasive lower); user-supplied", source: "CEMA Book No. 350" },
    ],
  },

  "pesticide-rei-phi": {
    formula: "REI remaining = max(0, REI_hours - hours since application); PHI remaining = max(0, PHI_days - days since application); early-entry / early-harvest violation when not yet clear.",
    edition: "EPA Worker Protection Standard 40 CFR 170 (REI) and the product label's PHI, by name.",
    freeAccess: "Free at epa.gov and ecfr.gov; the label is the law (FIFRA).",
    governance: GOVERNANCE.pesticide,
    editionNote: "Single-edition (elapsed-time clock; REI/PHI values are user-supplied from the product label, which always governs over any default).",
    assumptions: [
      { name: "REI / PHI", value: "user-supplied from the product label (the label is the law)", source: "product label / 40 CFR 170" },
    ],
  },

  "backflow-test-psi": {
    formula: "RP pass: #1 check >= 5 psid AND relief opens >= 2 psid below the #1 check. DC pass: each check holds >= 1 psid tight.",
    edition: "USC FCCCHR Manual of Cross-Connection Control and AWWA C511 field-test procedure, by name.",
    freeAccess: "USC FCCCHR / AWWA published; the tester-procedure thresholds are public. The certified tester and water purveyor govern.",
    governance: GOVERNANCE.water,
    editionNote: "Single-edition (the field-test pass criteria for RP and DC assemblies; gauge accuracy and the opening-point definition apply, and assembly-specific procedures govern).",
    assumptions: [
      { name: "Thresholds", value: "RP relief >= 2 psid below #1 check and #1 check >= 5 psid; DC checks >= 1 psid", source: "USC FCCCHR Manual / AWWA C511" },
    ],
  },

  "gel-percent-agarose": {
    formula: "Recommended percent from the fragment-size resolution map (0.5% for >= 20 kb down to 2% for < 1 kb); grams = used percent / 100 x buffer volume (mL); percent clamped to 0.5-3%.",
    edition: "Sambrook & Russell, Molecular Cloning, gel-electrophoresis resolution tables, by name.",
    freeAccess: "Textbook reference; the percent-vs-resolution map is standard practice. Lab SOP governs.",
    governance: GOVERNANCE.lab,
    editionNote: "Single-edition (standard agarose resolution map; very small/large fragments fall outside agarose - PAGE / pulsed-field - and are flagged).",
    assumptions: [
      { name: "Resolution map", value: "standard agarose percent vs. fragment-size range; lab SOP may differ", source: "Sambrook & Russell" },
    ],
  },



  "depreciation-recapture": {
    formula: "§1245: recaptured = min(gain, accumulated depreciation) at the ordinary rate. §1250: unrecaptured = min(gain, straight-line depreciation) at the 25% maximum rate. Recapture cannot exceed the gain.",
    edition: "IRS Pub 544 and IRC §1245 / §1250, by name.",
    freeAccess: "Free at irs.gov and uscode.house.gov; tax information, not advice - current IRS rules and a CPA govern.",
    governance: GOVERNANCE.tax,
    editionNote: "Single-edition (the §1245 ordinary-recapture and §1250 unrecaptured-gain rules; the 25% figure is a maximum, not a flat rate, and state recapture differs).",
    assumptions: [
      { name: "Ordinary rate", value: "user-supplied marginal ordinary-income rate", source: "current IRS brackets" },
      { name: "25% cap", value: "the §1250 unrecaptured-gain rate is a maximum, not a flat rate", source: "IRC §1(h)" },
    ],
  },

  "rent-roll-vacancy": {
    formula: "Vacancy/credit loss = potential gross rent x (vacancy% + credit%)/100; EGI = potential rent - loss + other income; loss percent = loss / potential x 100.",
    edition: "Appraisal Institute income-approach EGI definition, by name.",
    freeAccess: "Appraisal Institute methodology; the EGI definition is standard practice. Appraiser and lender govern the underwritten figures.",
    governance: GOVERNANCE.real_estate,
    editionNote: "Single-edition (standard EGI build-up; other income is not vacancy-adjusted; combined vacancy + credit above 100% is rejected). Feeds the cap-rate-dscr tile.",
    assumptions: [
      { name: "Other income", value: "entered as an annual figure, not vacancy-adjusted", source: "Appraisal Institute income approach" },
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
    editionNote: "Editions available: bundled PPE bands follow NFPA 70E-2024 Table 130.7(C)(15)(c) and the IEEE 1584-2018 method. Jurisdictions / employers on NFPA 70E-2021 differ at the margins; verify the edition adopted by your electrical-safety program.",
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
    formula: "Range = T_in − T_out. Approach = T_out − T_wb. Efficiency = range / (range + approach) = range / (T_in − T_wb). Heat rejection (BTU/hr) = gpm × 500 × range. Fan kW per ton = fan_kW × 12000 / heat_rejection.",
    edition: "Cooling Technology Institute (CTI) ATC-105 standard practice by name; ASHRAE Handbook (HVAC Systems and Equipment) cooling-tower chapter by name.",
    freeAccess: "CTI guides free at cti.org outreach; ASHRAE Handbook licensed.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Single-edition (engineering-practice cooling-tower convention).",
    assumptions: [
      { name: "Constant 500", value: "(8.34 lb/gal × 60 min/hr × cp = 1 BTU/lb-°F) ≈ 500 BTU/(hr · gpm · °F)", source: "physical-fact derivation for water" },
      { name: "Approach target band", value: "5-10 °F", source: "CTI engineering practice" },
      { name: "Range target band", value: "8-12 °F", source: "CTI engineering practice" },
    ],
  },
  "chiller-tons": {
    formula: "Q (BTU/hr) = GPM × factor × delta-T; tons = Q / 12000; kW = Q / 3412. Water factor 500 = 60 min/hr × 8.33 lb/gal × 1 BTU/lb-°F. Required flow at nameplate tons = tons × 12000 / (factor × delta-T).",
    edition: "First-principles fluid energy balance; ASHRAE Fundamentals 2021 Chapter 31 (secondary coolants) by name for glycol factors.",
    freeAccess: "ASHRAE Handbook TOC free at ashrae.org; full handbook licensed.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Glycol factors (475 for 30% PG, 449 for 50% PG) are property-derived at a typical chilled-water mean; the manufacturer's fluid correction table governs.",
    assumptions: [
      { name: "Water factor", value: "500 BTU/(hr · gpm · °F)", source: "60 min/hr × 8.33 lb/gal × 1 BTU/lb-°F (physical fact for water)" },
      { name: "30% propylene glycol factor", value: "≈ 475", source: "ASHRAE Fundamentals 2021 Ch. 31 property derivation" },
      { name: "50% propylene glycol factor", value: "≈ 449", source: "ASHRAE Fundamentals 2021 Ch. 31 property derivation" },
      { name: "Typical chiller delta-T", value: "10-14 °F", source: "ASHRAE engineering practice" },
    ],
  },
  "hx-lmtd-ntu": {
    formula: "LMTD = (dT1 − dT2) / ln(dT1/dT2). Q = C × delta-T with C = GPM × fluid factor. UA = Q / LMTD. Effectiveness = Q / (C_min × (Th_in − Tc_in)). NTU = UA / C_min. Capacity-rate ratio Cr = C_min / C_max.",
    edition: "TEMA (Tubular Exchanger Manufacturers Association) standards by name; standard heat-transfer texts (Incropera, Cengel) by name.",
    freeAccess: "TEMA standards TOC free at tema.org; texts licensed.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Counter-flow uses end differences Th_in−Tc_out and Th_out−Tc_in; parallel-flow uses Th_in−Tc_in and Th_out−Tc_out. Thermodynamically impossible temperature crossings are rejected.",
    assumptions: [
      { name: "LMTD limit", value: "as dT1 → dT2 the LMTD equals the common end difference", source: "calculus limit of the LMTD expression" },
      { name: "Capacity rate", value: "C = GPM × fluid factor (BTU/hr-°F)", source: "first-principles fluid energy balance" },
    ],
  },
  "air-changes-hour": {
    formula: "ACH = supply CFM × 60 / room volume (ft³). Net delivered ACH = min(supply, return) × 60 / volume. Pressurization airflow = supply − return (positive = pressurized).",
    edition: "ASHRAE 62.1-2022 (ventilation for acceptable indoor air quality) by name; ASHRAE 170-2021 (ventilation of health care facilities) by name.",
    freeAccess: "ASHRAE standard TOCs free at ashrae.org; full standards licensed.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Occupancy target bands are comparison ranges, not the code minimum for a specific project; the AHJ and the governing standard's full procedure govern.",
    assumptions: [
      { name: "Residential band", value: "0.35-1 ACH", source: "ASHRAE 62.2 whole-house ventilation" },
      { name: "Classroom band", value: "4-6 ACH", source: "ASHRAE 62.1 typical" },
      { name: "Laboratory band", value: "6-12 ACH", source: "ASHRAE typical" },
      { name: "Operating room band", value: "20-25 ACH", source: "ASHRAE 170 healthcare" },
    ],
  },
  "boiler-pipe-sizing": {
    formula: "GPM = Q / (500 × delta-T) (hydronic water energy balance). Velocity (ft/s) = GPM / (2.448 × d_in²). The smallest standard inner diameter whose velocity is at or below the ceiling is recommended. Head loss = Hazen-Williams (C = 150 copper/PEX, 130 steel); pump head = head per 100 ft × run length / 100.",
    edition: "ASHRAE Systems and Equipment 2020 Chapter 13 (hydronic heating) by name; Bell & Gossett / Taco system-design velocity limits by name. Hazen-Williams (1905) public domain.",
    freeAccess: "ASHRAE Handbook TOC free at ashrae.org; B&G / Taco design guides free at bellgossett.com / tacocomfort.com.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Standard inner diameters: copper Type L (ASTM B88), steel Schedule 40 (ASTM A53), PEX SDR-9 (ASTM F876). Default velocity ceilings 4 ft/s copper, 6 ft/s steel, 3 ft/s PEX; fitting equivalent length is added separately for the final pump head.",
    assumptions: [
      { name: "Water factor", value: "500 BTU/(hr · gpm · °F)", source: "60 min/hr × 8.33 lb/gal × 1 BTU/lb-°F (physical fact for water)" },
      { name: "Velocity constant", value: "v = GPM / (2.448 × d²)", source: "pipe-area / 448.83 gal·ft⁻³·min⁻¹ identity" },
      { name: "Hazen-Williams C", value: "150 copper / PEX, 130 black steel", source: "AWWA water-flow C-values" },
      { name: "Default velocity ceiling", value: "4 / 6 / 3 ft/s (copper / steel / PEX)", source: "Bell & Gossett / Taco quiet-operation limits" },
    ],
  },
  "compressor-short-cycle": {
    formula: "Cycle rate N = N_max × 4 × X × (1 − X), where X is the runtime (load) fraction and N_max is the per-hour ceiling; the parabola peaks at X = 0.5. On-time = X × 60 / N; off-time = (1 − X) × 60 / N. Short-cycling is flagged when the estimated on-time is below the minimum oil-return runtime or the observed cycles exceed the ceiling.",
    edition: "Copeland Application Engineering Bulletin 17-1226 by name; ASHRAE Fundamentals 2021. The ASHRAE/AHRI part-load cycling model by name.",
    freeAccess: "Copeland AE bulletins free at copeland.com/literature; ASHRAE Handbook TOC free at ashrae.org.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Thresholds: single-stage 10-min on / 5-min off / 6 cph; two-stage 8 / 5 / 8; VRF / inverter modulate capacity (4-min on, per-manufacturer, no fixed cycles-per-hour ceiling). Per-manufacturer guidance governs final operation.",
    assumptions: [
      { name: "Cycling parabola", value: "N = N_max × 4 × X × (1 − X)", source: "ASHRAE/AHRI part-load cycling model" },
      { name: "Single-stage minimum runtime", value: "10 min on, 5 min off", source: "Copeland AE Bulletin 17-1226 / industry rule of thumb" },
      { name: "Cycles-per-hour ceiling", value: "6 single-stage, 8 two-stage", source: "compressor-protection guidance" },
    ],
  },
  "humidifier-capacity": {
    formula: "Moisture addition (lb/hr) = 60 × CFM × rho × (W_target − W_entering); W = 0.621945 × Pw / (P − Pw) with Pw = RH × Pws(T_db) and P the altitude-corrected pressure. Daily water = lb/hr × 24 / 8.34. Latent load = addition × 1061 BTU/lb.",
    edition: "ASHRAE Fundamentals 2021 Chapter 1 (psychrometrics) by name.",
    freeAccess: "ASHRAE Handbook TOC free at ashrae.org; full handbook licensed.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Saturation vapor pressure by the Magnus form; air density from the ideal-gas law at the standard-atmosphere altitude pressure. AHJ and the manufacturer's published humidifier capacity govern actual delivery.",
    assumptions: [
      { name: "Latent heat of vaporization", value: "1061 BTU/lb (near room temperature)", source: "ASHRAE Fundamentals 2021 Ch. 1" },
      { name: "Dry-air gas constant", value: "287.055 J/(kg·K)", source: "physical fact" },
      { name: "Water density", value: "8.34 lb/gal", source: "physical fact for water" },
    ],
  },
  "filter-pressure-drop": {
    formula: "Airflow (CFM) = face area × face velocity. Pressure drop scales ~linearly with face velocity (Darcy regime): dp(V) = dp_ref × V / 300 fpm. Fan power (kW) = (CFM × dp_in_wc / 6356) / fan total efficiency × 0.7457. Average drop over a linear loading cycle = (clean + change-out) / 2; annual fan energy = average-drop kW × runtime; loading penalty = (average − clean) kW × runtime.",
    edition: "ASHRAE 52.2-2017 (Method of Testing General Ventilation Air-Cleaning Devices for Removal Efficiency by Particle Size) by name; manufacturer published cut sheets for the pressure-drop values.",
    freeAccess: "ASHRAE 52.2 TOC free at ashrae.org; full standard licensed; manufacturer cut sheets free at each vendor site.",
    governance: GOVERNANCE.mechanical,
    editionNote: "Clean / change-out drops are representative cut-sheet values for 2-4 in pleated media at a 300 fpm reference velocity, user-overridable; the MERV rating is defined by ASHRAE 52.2, but the cut sheet (not the test method) publishes the drop. The dust-loading change interval depends on the site dust load and is not modeled; the tile reports the pressure-drop schedule and its fan-energy cost.",
    assumptions: [
      { name: "Air horsepower constant", value: "AHP = CFM × dp(in. WC) / 6356", source: "fan engineering identity" },
      { name: "Velocity scaling", value: "dp ∝ face velocity (first-order Darcy regime)", source: "fibrous-media engineering practice" },
      { name: "MERV 13 reference drops", value: "0.35 in WC clean / 0.70 in WC change-out at 300 fpm", source: "representative pleated-filter cut-sheet value" },
      { name: "Default fan total efficiency", value: "0.60 (fan × motor × drive)", source: "engineering practice" },
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

  "water-heater-recovery": {
    formula: "gph = (input BTU/hr × recovery efficiency) / (8.33 × delta-T). Electric input = kW × 3412 BTU/hr. First-hour rating = recovery gph + 0.70 × stored gallons (DOE FHR convention). 8.33 BTU per gallon per degree F is first-principles water properties.",
    edition: "DOE 10 CFR 430 water-heater efficiency test procedure; AHRI 1300 (residential water heaters).",
    freeAccess: "Free at energy.gov/eere for DOE test procedures and ahri.org for the AHRI directory / TOC.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Recovery-efficiency defaults (0.98 electric / 0.80 atmospheric gas / 0.94 condensing gas) are test-procedure conventions; the nameplate governs. AHJ governs.",
    assumptions: [
      { name: "Recovery efficiency", value: "0.98 electric / 0.80 atmospheric gas / 0.94 condensing gas unless the user enters the nameplate value", source: "DOE 10 CFR 430 / AHRI 1300 typical" },
      { name: "First-hour usable storage", value: "70% of nominal tank volume per the DOE first-hour-rating convention", source: "DOE 10 CFR 430 FHR test" },
      { name: "Water energy constant", value: "8.33 BTU per gallon per degree F", source: "first-principles water properties" },
    ],
  },
  "wh-expansion-tank": {
    formula: "expansion factor = (rho_cold − rho_hot) / rho_hot from public steam-table densities; V_expansion = heater volume × factor; V_tank = V_expansion / acceptance factor; pre-charge = incoming pressure. Recommended size = smallest standard diaphragm tank (2 / 4.4 / 8.5 / 14 / 20 gal) ≥ required volume.",
    edition: "ASPE Plumbing Engineering Design Handbook (2nd ed.) Chapter 6; ASME B40.1 steam tables. IPC 2021 §604.8 (PRV) and §607 (thermal expansion control).",
    freeAccess: "Free at aspe.org for table-of-contents excerpts; codes.iccsafe.org for the IPC TOC.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Densities interpolated from bundled steam-table values (40-180 F). Acceptance factor defaults to 0.46 for diaphragm types; the manufacturer's value governs. AHJ governs.",
    assumptions: [
      { name: "Acceptance factor", value: "0.46 for diaphragm-type tanks unless the user enters the manufacturer value", source: "Amtrol / Watts diaphragm-tank cut sheets" },
      { name: "Standard tank sizes", value: "2 / 4.4 / 8.5 / 14 / 20 gal diaphragm potable-expansion tanks", source: "common North American residential sizes" },
      { name: "Water density", value: "ASME B40.1 steam-table values, linearly interpolated between bundled break points", source: "ASME B40.1" },
    ],
  },
  "sanitary-dfu": {
    formula: "total DFU = sum(fixture count × DFU value). Minimum pipe size = smallest size whose table maximum ≥ total DFU: horizontal branch and stack per IPC Table 710.1(2); building drain per IPC Table 710.1(1) (slope-dependent).",
    edition: IPC_2021 + " Section 710; DFU values per IPC Table 709.1; capacities per Tables 710.1(1) and 710.1(2).",
    freeAccess: ICC_FREE,
    governance: GOVERNANCE.plumbing,
    editionNote: "Bundled DFU and capacity tables follow IPC 2021. Jurisdictions on UPC or an older IPC edition differ at the margins; verify the edition adopted by your AHJ.",
    assumptions: [
      { name: "DFU values", value: "IPC Table 709.1 (private WC 3, public WC 4, lavatory 1, bath 2, shower 2, kitchen sink 2, urinal 4, floor drain 2, ...)", source: "IPC 2021 Table 709.1" },
      { name: "Branch / stack capacity", value: "IPC Table 710.1(2) max DFU by nominal size", source: "IPC 2021 Table 710.1(2)" },
      { name: "Building-drain capacity", value: "IPC Table 710.1(1) max DFU by size and slope (1/8 / 1/4 / 1/2 in per ft)", source: "IPC 2021 Table 710.1(1)" },
    ],
  },
  "trap-primer": {
    formula: "primers = ceil(floor-drain count / drains-per-distribution-unit). Annual water = drains × (delivery oz per cycle / 128) × cycles per day × 365. Occupied-space floor drains require a primer per IPC 1002.4.",
    edition: IPC_2021 + " Section 1002.4 (trap seals). Manufacturer flow rates per published cut sheets (Precision Plumbing Products / Sioux Chief / Mifab).",
    freeAccess: ICC_FREE,
    governance: GOVERNANCE.plumbing,
    editionNote: "Drains-per-unit (electronic / pressure-drop / pump-discharge feed up to 4 drains via a distribution unit; manual serves 1) and delivery volume follow manufacturer cut sheets; the cut sheet governs. AHJ governs.",
    assumptions: [
      { name: "Drains per distribution unit", value: "4 for electronic / pressure-drop / pump-discharge; 1 for manual", source: "PPP / Sioux Chief / Mifab distribution-unit cut sheets" },
      { name: "Default delivery", value: "8 fl oz per cycle, one cycle per day, unless the user enters the manufacturer value", source: "manufacturer cut-sheet typical" },
      { name: "Occupied-space rule", value: "every floor drain in occupied space requires a primer; manual prime allowed only in mechanical spaces with a documented seasonal procedure", source: "IPC 2021 §1002.4 and exception" },
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
  "septic-dose-tank": {
    formula: "Net dose = daily flow / doses per day; pumped per cycle = net dose + drainback; pumped per day = pumped per cycle x doses; dose-to-void ratio = net dose / drainback (target >= 5).",
    edition: "USEPA Onsite Wastewater Treatment Systems Manual (EPA/625/R-00/008); university onsite-wastewater extension low-pressure-pipe design guidance, by name.",
    freeAccess: "Free at epa.gov/septic. Extension LPP design guidance free on land-grant university extension sites.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (EPA manual + extension LPP design guidance, refreshed at build time).",
    assumptions: [
      { name: "Default doses per day", value: "4 (editable; more, smaller doses rest the soil better)", source: "extension LPP design guidance" },
      { name: "Dose-to-void target", value: "net dose >= 5x the drainback volume so the field pressurizes before the dose is spent", source: "extension LPP design guidance" },
      { name: "Drainback handling", value: "drainback returns to the tank and is re-pumped (pumping energy, not lost flow); the dose count, dose volume, and float settings on the permit drawing govern", source: "EPA/625/R-00/008" },
    ],
  },
  "septic-pumpout-interval": {
    formula: "Allowed accumulation = tank volume x fill fraction; years between pump-outs = allowed accumulation / (occupants x accumulation per person per year).",
    edition: "USEPA Onsite Wastewater Treatment Systems Manual (EPA/625/R-00/008); university onsite-wastewater extension pumping-frequency guidance, by name.",
    freeAccess: "Free at epa.gov/septic. Extension pumping-frequency tables free on land-grant university extension sites.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (EPA manual + extension pumping-frequency guidance, refreshed at build time).",
    assumptions: [
      { name: "Default accumulation", value: "30 gal per person per year of net sludge + scum (a garbage disposal roughly doubles it); editable", source: "extension pumping-frequency guidance" },
      { name: "Default fill fraction", value: "0.33 of the tank before pumping; editable", source: "extension pumping-frequency guidance" },
      { name: "Measurement governs", value: "a sludge-judge or core measurement of actual sludge and scum depth governs; never let sludge reach the outlet baffle; many states set a mandatory interval that overrides any estimate", source: "EPA/625/R-00/008; state onsite code" },
    ],
  },
  "septic-lpp-orifice": {
    formula: "Per-orifice flow (gpm) = 19.63 x Cd x d_in^2 x sqrt(h_ft) (Cd 0.6 gives the familiar 11.79 coefficient); system flow = per-orifice flow x orifices per lateral x laterals.",
    edition: "Standard orifice-discharge equation; university onsite-wastewater extension low-pressure-pipe design guidance, by name.",
    freeAccess: "Extension LPP design guidance free on land-grant university extension sites.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (orifice-discharge equation + extension LPP design guidance).",
    assumptions: [
      { name: "Discharge coefficient", value: "Cd 0.6 default (gives the 11.79 / 19.63x0.6 orifice coefficient); editable", source: "orifice-discharge equation" },
      { name: "Squirt height target", value: "roughly 2.5 to 5 ft (about 1 to 2 psi) for LPP, higher for mound or drip", source: "extension LPP design guidance" },
      { name: "Ten-percent rule", value: "a uniform squirt requires distal-to-proximal flow to vary by less than about 10%; orifice size, spacing, and layout come from the permitted onsite design", source: "extension LPP design guidance" },
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
  "drainage-invert": {
    formula: "Total fall = slope x run; invert-out = invert-in - fall; top of pipe = invert-out + OD; cover = surface - top of pipe. Slope entered as in/ft or percent, normalized to ft/ft.",
    edition: IPC_2021 + " Section 704 (drainage piping slope minimums).",
    freeAccess: ICC_FREE,
    governance: GOVERNANCE.general,
    editionNote: IPC_DISCLOSURE + " The minimum-cover and maximum-depth limits, the local frost depth, and the live-load bury requirement are set by the adopted code and the engineer/survey of record; the minimum cover compared against is the user-supplied governing value.",
    assumptions: [
      { name: "Cover datum", value: "cover measured from finished grade to the top of the pipe (invert-out + OD / 12)", source: "standard trench-section geometry" },
      { name: "Sign convention", value: "a negative cover (pipe crown above grade) is flagged, not rejected", source: "spec-v163 output contract" },
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
  "backflow-sizing": {
    formula: "Required assembly from the hazard category (high / health hazard requires a reduced-pressure principle assembly). Head loss at design flow interpolated from the bundled assembly curves; downstream pressure = upstream supply pressure − head loss; flag when downstream is below the minimum residual.",
    edition: "IPC 2021 §312 (cross-connection control) and AWWA M14 (Backflow Prevention and Cross-Connection Control) by name; EPA 40 CFR 141.85 (annual testing) by section. Head-loss curves from data/plumbing/backflow-curves.json (Watts technical bulletins, representative).",
    freeAccess: ICC_FREE,
    governance: GOVERNANCE.plumbing,
    editionNote: "High (health) hazard requires an RP assembly regardless of the user's selection; PVB / AVB protect against back-siphonage only. The bundled Watts curves are representative; the specific assembly's cut sheet and the USC FCCCHR approved-assembly list govern the actual head loss.",
    assumptions: [
      { name: "High-hazard rule", value: "reduced-pressure principle (RP) assembly required", source: "IPC 312 / cross-connection control practice" },
      { name: "Minimum residual", value: "20 psi default (user-adjustable)", source: "engineering practice" },
      { name: "Annual test", value: "certified tester required yearly", source: "EPA 40 CFR 141.85 / AWWA M14" },
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
    freeAccess: "29 CFR 1926 free at ecfr.gov. FAA Advisory Circulars free at faa.gov (Regulations & Policies, Advisory Circulars). ASME B30.5 licensed.",
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
  "header-sizing": {
    formula: "Tributary uniform load w (plf) = total area load (psf) × supported width (ft); roof = ground snow + 15 psf dead, each floor adds 50 psf. Smallest built-up member with min(L_bending, L_deflection) ≥ span, where Fb is adjusted by load-duration C_D and size factor C_F. Jack studs each end = ceil(end reaction / (F_c-perp × 5.25 in²)).",
    edition: IRC_2021 + " §R602.7 (headers). " + AWC_NDS + " reference design values, load-duration C_D and size factor C_F.",
    freeAccess: ICC_FREE + " AWC NDS free at awc.org.",
    governance: GOVERNANCE.structural,
    editionNote: IRC_DISCLOSURE,
    assumptions: [
      { name: "Load assembly", value: "roof = snow (live) + 15 psf dead; each floor above = 40 psf live + 10 psf dead", source: "IRC 2021 typical residential" },
      { name: "Load-duration factor C_D", value: "1.15 snow (roof-only) / 1.0 occupancy (floors above)", source: "AWC NDS-2018 Table 2.3.2" },
      { name: "Cross-check", value: "allowable spans verified against IRC Table R602.7(1) by physics; discrepancies flagged", source: "IRC 2021 Table R602.7(1)" },
    ],
  },
  "deck-beam-post": {
    formula: "Tributary width to beam = joist span / 2; beam load w (plf) = (live + dead) psf × tributary. Smallest built-up beam with min(L_bending, L_deflection) ≥ post spacing. Post axial load = w × post spacing; NDS column capacity = F_c × C_P × A with C_P from F_cE = 0.822 E_min / (le/d)². Footing from soil bearing; ledger fastener spacing from IRC Table R507.9.1.3(1).",
    edition: IRC_2021 + " §R507 (decks). " + AWC_NDS + " reference values; IRC Table R507.9.1.3(1) ledger fasteners.",
    freeAccess: ICC_FREE + " AWC NDS free at awc.org.",
    governance: GOVERNANCE.structural,
    editionNote: IRC_DISCLOSURE,
    assumptions: [
      { name: "Deck loads", value: "40 psf live + 10 psf dead per IRC R507 default", source: "IRC 2021 §R507" },
      { name: "Column stability", value: "pinned-pinned (K_e = 1), c = 0.8 for sawn lumber, E_min and F_c per NDS Supplement Table 4A No.2", source: "AWC NDS-2018" },
      { name: "Ledger schedule", value: "1/2 in lag / approved fastener spacing by joist span, attached decks only", source: "IRC 2021 Table R507.9.1.3(1)" },
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
    freeAccess: "Free at epa.gov/smm/sustainable-management-construction-and-demolition-materials.",
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
    freeAccess: "Free at fda.gov (Food, Retail Food Protection, FDA Food Code).",
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
  // variant ("Estimate. AHJ and licensed professional govern.") - IICRC
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
  "mold-remediation-level": {
    formula: "Deterministic lookup: EPA 402-K-01-001 area bands (small < 10 ft2, medium 10-100, large > 100); NYC DOHMH levels (I < 10, II 10-30, III 30-100, IV > 100, V on any HVAC involvement). Derived controls: containment (limited / full) by band and porous material; PPE tier by band; independent assessor when area > 100, HVAC, or vulnerable occupant; clearance for medium/large, HVAC, or vulnerable occupant.",
    edition: "EPA 402-K-01-001 (Mold Remediation in Schools and Commercial Buildings) area bands; NYC DOHMH Guidelines on Assessment and Remediation of Fungi in Indoor Environments levels; IICRC S520-2024 by name.",
    freeAccess: "EPA 402-K-01-001 free at epa.gov/mold; NYC DOHMH guidelines free at nyc.gov. IICRC S520-2024 licensed.",
    governance: GOVERNANCE.general,
    editionNote: "Scope guidance keyed to public EPA / NYC DOHMH bands; not a substitute for an assessment. The assessor's and remediator's protocol governs the cut line.",
    assumptions: [
      { name: "EPA area bands", value: "small < 10 ft2, medium 10-100, large > 100", source: "EPA 402-K-01-001" },
      { name: "HVAC override", value: "any HVAC-system involvement -> NYC DOHMH Level V regardless of area", source: "NYC DOHMH guidelines" },
    ],
  },
  "mold-conditions": {
    formula: "(reference page; no compute) IICRC S520-2024 Condition framework: Condition 1 (normal fungal ecology, the goal state), Condition 2 (settled spores dispersed from a Condition 3 area, no actual growth), Condition 3 (actual growth, active or dormant, visible or hidden). Remediation returns Condition 2 and 3 areas to Condition 1. Original plain-English summary; standard text not reproduced.",
    edition: "IICRC S520-2024 (Standard for Professional Mold Remediation) Condition framework, by section.",
    freeAccess: "IICRC S520-2024 licensed; original plain-English summaries free here.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (IICRC S520-2024; original plain-English summary).",
    assumptions: [],
  },
  "antimicrobial-dilution": {
    formula: "finished_gal = area / coverage_ft2_per_gal; conc_oz_per_gal = oz_per_gal (mode A) or 128/(N+1) (mode B, 1:N by volume); concentrate_oz = finished_gal * conc_oz_per_gal; water_gal = finished_gal - concentrate_oz/128; tanks = ceil(finished_gal / tank); per_tank_conc_oz = conc_oz_per_gal * tank. 128 fl oz per US gallon.",
    edition: "FIFRA / the EPA-registered product label (the label is the law); IICRC S520-2024 physical-removal principle by name.",
    freeAccess: "EPA pesticide-label database free at epa.gov; the label on the product governs. IICRC S520-2024 licensed.",
    governance: GOVERNANCE.pesticide,
    editionNote: "The dilution and coverage defaults are placeholders, not a recommendation; read the label. Antimicrobial application does not replace physical removal of mold growth (IICRC S520).",
    assumptions: [
      { name: "Coverage rate", value: "label placeholder ft2/gal; the product label governs", source: "EPA-registered product label" },
      { name: "128 fl oz/gal", value: "US fluid ounces per gallon", source: "US customary units" },
    ],
  },
  "air-sample-volume": {
    formula: "run_time_min = target_volume_L / flow_rate_lpm; run_time_sec = run_time_min * 60; total_volume_L = target_volume_L * sample_count; total_time_min = run_time_min * sample_count (sequential on one pump).",
    edition: "ASTM D7391 (spore-trap method) and the cassette manufacturer's instructions; AIHA-accredited laboratory analysis.",
    freeAccess: "ASTM D7391 licensed; cassette manufacturer instructions free with the product. AIHA lab accreditation directory free at aiha.org.",
    governance: GOVERNANCE.general,
    editionNote: "The calibrated rotameter flow governs (not the nominal pump rating); the cassette manufacturer sets the acceptable volume window. Defaults are spore-trap placeholders (15 L/min, 75 L).",
    assumptions: [
      { name: "Spore-trap defaults", value: "15 L/min flow, 75 L target volume", source: "common spore-trap cassette instructions" },
    ],
  },
  "moisture-dry-goal": {
    formula: "delta = affected_reading - reference_reading (the unaffected dry standard); at_dry_standard = delta <= acceptable_delta; points_to_go = max(0, delta - acceptable_delta).",
    edition: "IICRC S500-2021 dry-standard concept by name: a material is dry when its moisture content matches similar unaffected material in the same structure.",
    freeAccess: "IICRC S500-2021 licensed; the dry-standard comparison concept is summarized in original plain English here.",
    governance: GOVERNANCE.general,
    editionNote: "The reference must be the same material, meter, mode, and scale as the affected reading. The dry standard is the unaffected reading, not a fixed number; a calibrated meter and the protocol govern acceptance.",
    assumptions: [
      { name: "Acceptable delta default", value: "4 points above the unaffected standard (editable)", source: "IICRC S500 field practice" },
    ],
  },
  "flood-cut-quantity": {
    formula: "drywall_ft2 = wall_run_lf * (cut_height_in/12) * faces (faces = 2 if both sides); sheets_4x8 = ceil(drywall_ft2 / 32); baseboard_lf = wall_run_lf; insulation_ft2 = insulated ? wall_run_lf * (cut_height_in/12) : 0. 4x8 sheet = 32 ft2.",
    edition: "IICRC S500-2021 structural-removal principle by name; standard geometry.",
    freeAccess: "IICRC S500-2021 licensed; the take-off geometry is public.",
    governance: GOVERNANCE.general,
    editionNote: "The cut height is a field decision driven by the highest moisture reading (the wick line), not a fixed 2 ft rule. Category 3 may require removing all wet porous material; pre-1980 structures require lead / asbestos assessment first.",
    assumptions: [
      { name: "Cut height default", value: "24 in above the floor (editable)", source: "common flood-cut practice" },
      { name: "Sheet size", value: "4x8 drywall = 32 ft2", source: "standard gypsum board" },
    ],
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
  "equipment-power-draw": {
    formula: "Total continuous draw (A) = sum(quantity × nameplate amps) + other load. Continuous-load limit per circuit = 0.80 × breaker rating (NEC 210.20(A), continuous = 3 hr or more). Circuits required = ceil(total / (0.80 × breaker)). Total VA = total amps × circuit voltage.",
    edition: "NEC 2023 (NFPA 70) §210.20(A) (overcurrent protection for branch circuits) by section. Equipment nameplate amps are representative cut-sheet values (Phoenix / Dri-Eaz / B-Air class drying equipment).",
    freeAccess: "NFPA 70 free read-only at nfpa.org/freeaccess; manufacturer cut sheets free at each vendor site.",
    governance: GOVERNANCE.electrical,
    editionNote: "Nameplate amps are user-overridable defaults, not a fixed reference table; the actual unit nameplate governs. Drying equipment runs 3 hr or more, so it is a continuous load under NEC 210.20(A).",
    assumptions: [
      { name: "Continuous-load factor", value: "0.80 (continuous load ≤ 80% of breaker)", source: "NEC 2023 §210.20(A)" },
      { name: "LGR dehumidifier", value: "8.5 A at 120 V", source: "representative Phoenix / Dri-Eaz LGR cut-sheet value" },
      { name: "1/4 HP air mover", value: "2.5 A at 120 V", source: "representative cut-sheet value" },
      { name: "HEPA scrubber (500 CFM)", value: "3.5 A at 120 V", source: "representative cut-sheet value" },
      { name: "Heat-drying unit", value: "12 A at 120 V", source: "representative cut-sheet value" },
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
  "standpipe-pdp": {
    formula: "PDP = nozzle pressure + supply-hose friction (NFA CQ²L) + appliance loss + elevation (0.434 psi/ft × highest outlet above pumper). Negative elevation (below the pumper) subtracts.",
    edition: "NFPA 14 (2024) §7 (Standpipe System Design) by name and section; National Fire Academy CQ²L hydraulics.",
    freeAccess: "NFPA 14 read-only at nfpa.org/freeaccess; NFA materials free at usfa.fema.gov.",
    governance: GOVERNANCE.fire,
    editionNote: "Editions available: NFPA 14-2024 is the current published edition; earlier editions (2019 / 2016) carry slightly different residual-pressure requirements; verify the edition adopted by your AHJ.",
    assumptions: [
      { name: "Appliance loss", value: "25 psi default for the standpipe system (intake, riser check, hose valve, FDC); user-adjustable", source: "NFPA 14 / IFSTA typical" },
      { name: "Design flow", value: "250 GPM default at the topmost outlet; the system demand (500 GPM first riser) governs the supply", source: "NFPA 14-2024 §7" },
    ],
  },
  "smoke-ejector-cfm": {
    formula: "Required CFM = volume × ACH / 60. Fans = ceil(required CFM / per-fan rating). Time to one air change = volume / actual CFM. Exhaust-to-entry opening ratio drives PPV efficiency (1:1 to 1.5:1).",
    edition: "NFPA 1500 §8.5 (apparatus and equipment) by name; IFSTA Essentials of Fire Fighting ventilation chapter by name.",
    freeAccess: "NFPA 1500 read-only at nfpa.org/freeaccess; NFA materials free at usfa.fema.gov.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (NFPA 1500 + IFSTA Essentials).",
    assumptions: [
      { name: "Default target ACH", value: "5 air changes per hour for post-fire negative-pressure ventilation", source: "IFSTA Essentials typical" },
      { name: "Opening ratio", value: "exhaust slightly larger than entry (1:1 to 1.5:1) for efficient PPV", source: "IFSTA Essentials / PPV best practice" },
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
      { name: "Oxygen range", value: "O2 must be maintained between 19.5% and 23.5%", source: "OSHA 29 CFR 1910.146" },
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
      { name: "Rate", value: "data/crosswalks/irs-mileage.json (rate per mile, USD)", source: "IRS-published standard mileage rate" },
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
    freeAccess: "Haversine / great-circle derivations are free in navigation texts and at nist.gov and university OCW.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (spherical geometry; mean spherical earth model).",
    assumptions: [
      { name: "Earth radius", value: "6371 km (mean spherical) - actual oblate-spheroid distance can differ ≤ 0.5%", source: "WGS84 mean radius" },
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
    edition: "Classical acoustics (inverse-square law); ISO 9613-2 (Acoustics - Attenuation of sound during propagation outdoors) by name.",
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
    editionNote: "For closed venues, room acoustics dominate over inverse-square + atmospheric absorption. AHJ governs final coverage. Coefficients become less accurate outside the -20 to 50 C / 0%–100% RH typical-validity envelope.",
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
    edition: "USGS Krueger series by name; J.P. Snyder, USGS PP 1395 (Map Projections - A Working Manual, 1987) by name.",
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
      { name: "Compounding", value: "additive (state + local rates summed before applying)", source: "U.S. state tax convention; some jurisdictions tax differently - verify locally" },
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
  "home-office": {
    formula: "Simplified method = min(office_ft2, 300) * $5, capped at $1,500. Actual method = (office_ft2 / home_ft2) * total_home_expenses. Recommended = max(simplified, actual).",
    edition: "IRS Publication 587 (Business Use of Your Home) and Form 8829 by name; simplified rate per Rev. Proc. 2013-13.",
    freeAccess: "Free at irs.gov.",
    governance: GOVERNANCE.tax,
    editionNote: "The $5/ft^2 simplified rate and 300 ft^2 / $1,500 cap have been unchanged since the 2013 tax year (Rev. Proc. 2013-13). The actual method requires Form 8829 and triggers depreciation recapture on sale.",
    assumptions: [
      { name: "Simplified rate / cap", value: "$5 per ft^2, 300 ft^2 max, $1,500 cap", source: "IRS Rev. Proc. 2013-13" },
      { name: "Regular and exclusive use", value: "the office must be used regularly and exclusively for business", source: "IRC 280A(c)(1)" },
    ],
  },

  // --- Group S: Legal Plain-English and Statutory Math (priority 13, v5) ---


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

  // v12 Group V: EMS / Pre-hospital.

  // v12 Group W: Pilots / Aviation.

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
  "mortgage-point-breakeven": {
    formula: "Monthly payment at each rate = (P * r) / (1 - (1 + r)^-n), r = rate/12, n = term months. monthly_savings = payment_base - payment_points. point_cost = loan * point_cost_pct/100. break_even_months = point_cost / monthly_savings. Verdict compares holding period (months) to break-even.",
    edition: "First-principles amortization. Discount points and their cost are disclosed on the CFPB Loan Estimate and Closing Disclosure (12 CFR 1026.37-38).",
    freeAccess: "CFPB Loan Estimate / Closing Disclosure forms free at consumerfinance.gov. The amortization formula is universal.",
    governance: GOVERNANCE.real_estate,
    editionNote: "One discount point typically costs 1% of the loan, but the rate buy-down per point varies by lender, day, and program; the user enters both the rate with points and the point cost. Break-even ignores the time value of money and the tax deductibility of points (which can shift the true break-even); it is a first-order screen.",
    assumptions: [
      { name: "Amortization", value: "fully amortizing fixed-rate loan at each rate", source: "convention" },
      { name: "Break-even basis", value: "undiscounted cumulative payment savings vs up-front cost", source: "common-practice screen" },
    ],
  },
  "per-diem-interest": {
    formula: "daily_interest = loan_amount * (annual_rate/100) / basis (365, 360, or 30/360). days_to_eom = last_day_of_month - closing_day + 1 (counting the closing day; 30/360 uses 30 - closing_day + 1). prepaid_interest = daily_interest * days_to_eom.",
    edition: "CFPB Closing Disclosure (12 CFR 1026.38, Appendix H) prepaid-interest line item.",
    freeAccess: "Closing Disclosure form and Regulation Z free at consumerfinance.gov and ecfr.gov.",
    governance: GOVERNANCE.real_estate,
    editionNote: "Prepaid (odd-days) interest covers the stub period from closing through the end of the month, because the first regular payment is due the first of the following month and pays in arrears. The day-count convention varies by lender; Actual/365 is typical for owner-occupied conventional loans. Lender governs the actual figure.",
    assumptions: [
      { name: "Stub period", value: "closing day through the last day of the closing month, inclusive", source: "standard prepaid-interest convention" },
      { name: "Day-count basis", value: "365, 360, or 30/360 per the selected convention", source: "lender disclosure" },
    ],
  },
  "mortgage-reserves": {
    formula: "required = PITI_monthly * reserves_months. eligible = liquid_assets + retirement_balance * retirement_allowable_pct/100. delta = eligible - required. months_covered = eligible / PITI_monthly.",
    edition: "Fannie Mae Single-Family Selling Guide B3-4.1-01 (reserves) and B3-4.3-03 (retirement-account funds). Freddie Mac Single-Family Seller/Servicer Guide 5501.2.",
    freeAccess: "Fannie Mae Selling Guide free at selling-guide.fanniemae.com; Freddie Mac Guide free at guide.freddiemac.com.",
    governance: GOVERNANCE.real_estate,
    editionNote: "Required reserve months vary by loan type and program (conventional 0-6, jumbo 6-12, investment property 6+); the user enters the figure the lender requires. The allowable fraction of vested retirement (commonly ~60% of the withdrawable balance) and which assets count are lender- and program-specific.",
    assumptions: [
      { name: "Reserve unit", value: "one month of full PITIA payment", source: "Fannie Mae B3-4.1-01" },
      { name: "Retirement haircut", value: "default 60% of vested balance, user-adjustable", source: "common agency convention" },
    ],
  },
  "rent-vs-buy": {
    formula: "discount d_t = 1/(1+i)^t, i = investment return. PV_buy = down_payment + Σ ownership_outflow_t * d_t − net_sale * d_N, where ownership_outflow = P&I*12 + tax_pct*price + insurance + HOA*12 + maint_pct*price and net_sale = price*(1+appr)^N − sell_pct*value − loan_balance_N. PV_rent = Σ rent*12*(1+rent_infl)^(t-1) * d_t. difference = PV_buy − PV_rent.",
    edition: "New York Times 'Is It Better to Rent or Buy?' rent-vs-buy methodology (published interactive). AICPA personal-financial-planning guidance. First-principles discounted cash flow.",
    freeAccess: "The NYT methodology is published; the DCF math is universal. CFPB homebuyer materials free at consumerfinance.gov.",
    governance: GOVERNANCE.real_estate,
    editionNote: "Estimate only. Tax treatment (mortgage-interest deduction, SALT cap, the Section 121 capital-gains exclusion) is out of scope and materially changes the answer; consult a CPA. Property tax, insurance, HOA, and maintenance are held at the entered values (not inflated) for transparency. The down payment's opportunity cost is captured by discounting at the investment-return rate, so the renter's retained down payment correctly carries zero net present value.",
    assumptions: [
      { name: "Discount rate", value: "the investment-return rate is used as the opportunity cost of capital for both paths", source: "NYT methodology" },
      { name: "Annual cash flows", value: "ownership and rent outflows discounted at year-end; mid-year timing not modeled", source: "DCF simplification" },
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
  "cap-rate-dscr": {
    formula: "Cap rate = NOI / property_value (as a percent). DSCR = NOI / annual_debt_service. NOI is gross income minus operating expenses (excluding debt service, depreciation, income tax). Bands are common-practice; not agency-defined.",
    edition: "Standard CRE underwriting ratios. Universal in commercial-real-estate practice.",
    freeAccess: "Public reference; covered in every introductory CRE finance text.",
    governance: GOVERNANCE.real_estate,
    editionNote: "Cap rate bands shift by market and asset class; the bundled bands (<4 prime / 4-6 strong / 6-8 typical / >8 secondary) are GA / common-practice. DSCR thresholds are agency-set; FNMA / Freddie Mac multifamily, FHA 223(f), and CMBS each have different floors.",
    assumptions: [
      { name: "NOI scope", value: "gross income minus operating expenses; EXCLUDES debt service, depreciation, income tax", source: "convention" },
      { name: "Cap-rate bands", value: "<4 prime, 4-6 strong, 6-8 typical, >8 higher-risk", source: "common-practice approximation" },
      { name: "DSCR bands", value: "<1.0 negative, 1.0-1.25 thin, 1.25-1.5 agency-acceptable, >1.5 strong", source: "FNMA / Freddie / CMBS convention" },
    ],
  },
  "cash-on-cash": {
    formula: "cash_on_cash_percent = annual_pretax_cashflow / cash_invested * 100. payback_years = cash_invested / annual_pretax_cashflow (when positive).",
    edition: "Standard rental-real-estate / investment-property metric. Common across BiggerPockets-era investor practice and small-balance lending.",
    freeAccess: "Public reference; no specific publication required.",
    governance: GOVERNANCE.real_estate,
    editionNote: "Not an agency-defined ratio. Different investors define 'annual cash flow' differently (some include capex reserve, some don't; some assume PMI, some don't). The tile takes both inputs from the user so the definition is explicit.",
    assumptions: [
      { name: "Cash invested", value: "down payment + closing costs + immediate rehab; excludes hold-period capex", source: "convention" },
      { name: "Cash flow", value: "annual pre-tax; user computes from rents minus PITI minus opex minus capex reserve", source: "convention" },
    ],
  },
  "commission-split": {
    formula: "gross = sale_price * total_commission_percent. this_side = gross * side_share_percent. agent_pre_fee = this_side * brokerage_split_percent. agent_net = max(0, agent_pre_fee - brokerage_flat_fee).",
    edition: "Standard three-stage residential-brokerage commission flow. Universal in NAR-affiliated practice.",
    freeAccess: "Public reference; the buyer-broker / listing agreement governs the actual splits.",
    governance: GOVERNANCE.real_estate,
    editionNote: "Cooperating-commission disclosure rules changed in 2024 (post-Sitzer v. NAR settlement); listing brokers no longer publish buyer-broker compensation on the MLS in many states. This tile is the underlying arithmetic; the actual splits come from the agreements.",
    assumptions: [
      { name: "Split sequence", value: "(1) gross from sale, (2) gross split between listing and selling sides, (3) brokerage split with the agent, (4) flat fee subtracted", source: "standard convention" },
      { name: "Flat fee", value: "subtracted from agent_pre_fee (per-transaction franchise / desk / E&O); some brokerages bill monthly instead", source: "common-practice" },
    ],
  },
  "amortization-schedule": {
    formula: "Monthly P&I = (P * r) / (1 - (1 + r)^-n) where r = APR/12 and n = term in months. Per-row: interest = balance * r; principal = payment - interest + extra; balance = balance - principal; loop until balance <= 0 or n reached.",
    edition: "Standard mortgage amortization (closed-form annuity formula). FNMA Single-Family Selling Guide §B2-1.2 (loan term and amortization). 12 CFR §1026.18 (truth-in-lending payment schedule disclosure).",
    freeAccess: "FNMA Selling Guide free at selling-guide.fanniemae.com. 12 CFR Part 1026 (Regulation Z) free at ecfr.gov.",
    governance: GOVERNANCE.real_estate,
    editionNote: "Extra-principal posting rules vary by lender and product. Some servicers apply extra principal immediately (preferred); some hold it for the next due date; some require explicit borrower instruction. Lender governs.",
    assumptions: [
      { name: "Extra principal posting", value: "applied immediately each month before next interest accrual", source: "standard / preferred convention" },
      { name: "Rounding", value: "no per-payment rounding; balance closes within $0.01 floating-point precision", source: "convention" },
    ],
  },
  "cost-of-waiting": {
    formula: "P&I at current rate vs P&I at future rate, same principal and term. monthly_delta = pi_future - pi_now; total_interest_delta = (pi_future - pi_now) * n.",
    edition: "Standard mortgage amortization at two rates. No forecasting model; both rates are user-supplied.",
    freeAccess: "Underlying formula is public. No specific source authority; this tile is a comparison aid.",
    governance: GOVERNANCE.real_estate,
    editionNote: "'Cost of waiting' is a sales framing. Actual outcomes depend on future home prices, inflation, opportunity cost of the down payment, and personal cash flow. This tile produces the mortgage-payment delta only.",
    assumptions: [
      { name: "Constant principal", value: "same loan amount and same term at both rates; in practice future buying power may differ if prices have moved", source: "convention; the tile names this gap in the citation" },
      { name: "No prepayment", value: "30-year fixed held to maturity; in practice refinances and sales often shorten the lifetime", source: "convention" },
    ],
  },
  "closing-costs": {
    formula: "Sum over the CFPB Closing Disclosure line items: origination + appraisal + credit + title (search + lender's + owner's) + recording + transfer tax + prepaid interest + initial escrow + survey. Each item is either a percent of loan / price or a flat dollar range; transfer tax uses a user-supplied state rate; prepaid interest = (loan * note_rate / 365) * 15 days.",
    edition: "CFPB Loan Estimate (Form H-24) and Closing Disclosure (Form H-25) under 12 CFR Part 1026 Subpart C (TILA-RESPA Integrated Disclosure rule). Section labels A / B / C / E / F / G / H per the CFPB published forms.",
    freeAccess: "Free at consumerfinance.gov/owning-a-home. Forms H-24 / H-25 published in 12 CFR Part 1026 Appendix H.",
    governance: GOVERNANCE.real_estate,
    editionNote: "Dollar ranges are common-case national midpoints; HCOL and LCOL markets vary materially. The lender's Loan Estimate (delivered within 3 business days of application) is the value of record. State and local transfer taxes vary by orders of magnitude (some states $0; others 1-2% of price).",
    assumptions: [
      { name: "15-day prepaid interest", value: "default mid-month closing assumption; actual closings may run 0 to 30 days", source: "common-practice" },
      { name: "Two-month escrow cushion", value: "RESPA permits up to 2 months as an initial deposit (12 CFR §1024.17(c)(1))", source: "12 CFR Part 1024" },
      { name: "Owner's title policy optional", value: "in some states the seller pays; in others the buyer is offered the option to skip", source: "state-by-state convention" },
    ],
  },
  "rental-worksheet": {
    formula: "gross_rent = monthly_rent * 12. vacancy_loss = gross_rent * vacancy_pct/100. EGI = gross_rent - vacancy_loss + other_income. NOI = EGI - sum(expenses) (excluding depreciation). taxable_rental_income = NOI - depreciation. cap_rate = NOI / property_value. cash_on_cash = NOI / cash_invested. grm = property_value / gross_rent (gross rent multiplier, income approach). value_at_market_grm = market_grm * gross_rent.",
    edition: "IRS Schedule E (Form 1040), Supplemental Income and Loss, Part I (Income or Loss From Rental Real Estate). Schedule E lines 5-19 (expense categories). 26 USC §469 (passive activity loss rules). 26 USC §1402 (self-employment tax exemption for rental real estate). The gross-rent-multiplier income approach per the Appraisal Institute, The Appraisal of Real Estate (15th ed.).",
    freeAccess: "Schedule E form + instructions free at irs.gov. 26 USC Part 1 free at uscode.house.gov.",
    governance: GOVERNANCE.real_estate,
    editionNote: "NOI excludes depreciation because depreciation is a non-cash deduction (Schedule E line 18 is separate). Whether a taxable rental loss reduces other income depends on 26 USC §469 passive-loss rules; CPA governs the return. STR (short-term rental) and material-participation status change the analysis.",
    assumptions: [
      { name: "Expense categories", value: "Schedule E lines 5-19 covered; line 18 (depreciation) handled separately", source: "Schedule E instructions" },
      { name: "Vacancy treatment", value: "vacancy modeled as a fraction of gross potential rent; the tile does NOT model rent concessions or bad-debt loss separately", source: "convention" },
      { name: "Passive-loss treatment", value: "the tile reports taxable rental income / loss; whether the loss is currently usable vs suspended is a 26 USC §469 question outside scope", source: "26 USC §469" },
      { name: "GRM basis", value: "GRM is computed on annual scheduled gross rent (price / annual gross rent), the income-approach convention; some markets quote a monthly GRM instead, so compare like with like", source: "Appraisal of Real Estate 15th ed." },
    ],
  },
  "loan-limits": {
    formula: "Per-county lookup against the FHFA Conforming Loan Limit Values table (one-unit baseline + HERA high-cost adjustments). FHA single-family limit equals 65% of the conforming baseline as the floor and 150% of the FHFA ceiling as the FHA ceiling per 12 USC §1709(b)(2). VA full-entitlement borrowers have no statutory cap since 2020-01-01 per the Blue Water Navy Vietnam Veterans Act; partial-entitlement borrowers use the county conforming limit as the upper bound on the VA-guaranteed portion. Unknown counties fall back to the 48-state contiguous baseline.",
    edition: "FHFA Conforming Loan Limit Values for 2026 (annual, published 2025-11). HUD FHA Single-Family Mortgage Limits for 2026 (annual, published 2025-12). VA loan-limit policy per Public Law 116-23 (Blue Water Navy Vietnam Veterans Act of 2019).",
    freeAccess: "FHFA loan-limit values at fhfa.gov (Data). HUD FHA limits at hud.gov (FHA mortgage-limits lookup). VA county loan limits at va.gov (Home Loans).",
    governance: GOVERNANCE.real_estate,
    editionNote: "The bundled high-cost county list is a representative subset (CA / NY / DC / MA / WA / CO / HI / AK). Other high-cost counties exist; the tile says so on a baseline fallback and points the user at the FHFA / HUD canonical lookup. The annual cycle is November (FHFA) / December (HUD).",
    assumptions: [
      { name: "One-unit", value: "the bundled table covers one-unit properties; 2-/3-/4-unit limits scale from baseline per the FHFA published multipliers", source: "FHFA annual table" },
      { name: "Alaska / Hawaii / Guam / USVI", value: "the HERA high-cost ceiling applies as the baseline in these jurisdictions", source: "HERA §202" },
    ],
  },
  "hud-fmr": {
    formula: "Per-area lookup against HUD Fair Market Rents at the 40th-percentile rent of recent-mover units in the HUD-defined FMR Area. Five bedroom-count columns (0BR / 1BR / 2BR / 3BR / 4BR) published per area. FMR Areas are typically MSAs, HUD Metro FMR Areas (which subdivide an MSA where rent differs by sub-area), or counties for non-metropolitan FMR Areas.",
    edition: "U.S. Department of Housing and Urban Development, Office of Policy Development and Research. Fair Market Rents for FY2026 (effective 2025-10-01 through 2026-09-30). Methodology per 24 CFR Part 888.",
    freeAccess: "huduser.gov (Datasets, Fair Market Rents); per-area FMR lookup via the Geography selector on the same FMR dataset page.",
    governance: GOVERNANCE.real_estate,
    editionNote: "FMRs are used to set Housing Choice Voucher (Section 8) program payment standards, ESG, HOME, and certain HUD subsidies. They are not a measure of average rent; the 40th percentile of recent movers is intentionally below the median.",
    assumptions: [
      { name: "Coverage", value: "the bundled snapshot is a representative subset of ~19 MSAs / HUD Metro FMR Areas; canonical per-county lookup is at huduser.gov", source: "HUD PD&R" },
      { name: "Percentile", value: "FY2026 uses the 40th-percentile rent of recent-mover units per 24 CFR §888", source: "24 CFR §888.113" },
    ],
  },

  // v12 Group Y: Educators / K-12.
  "readability": {
    formula: "Flesch-Kincaid Grade Level: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59. Flesch Reading Ease: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words).",
    edition: "Kincaid, Fishburne, Rogers, and Chissom, 'Derivation of New Readability Formulas for Navy Enlisted Personnel,' Naval Technical Training Command Research Branch Report 8-75 (1975). Flesch, 'A New Readability Yardstick,' Journal of Applied Psychology 32:3 (1948).",
    freeAccess: "Public-domain U.S. government publication. Free at dtic.mil (DTIC report search).",
    governance: GOVERNANCE.education,
    editionNote: "Formula is fixed by the 1975 / 1948 papers. The runtime's deterministic syllable counter (vowel-cluster heuristic with silent-e and -le adjustments) differs from a dictionary syllable count by roughly 5% on edge cases (proper nouns, technical jargon).",
    assumptions: [
      { name: "Sentence boundary", value: "split on a period / question mark / exclamation followed by whitespace", source: "convention; abbreviations like 'Mr.' will over-segment" },
      { name: "Word boundary", value: "any maximal run of letters; apostrophes preserved internally", source: "convention" },
      { name: "Syllable count", value: "vowel-cluster heuristic, floor of 1 per word", source: "deterministic approximation; differs from a dictionary count by ~5%" },
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
  "significant-figures": {
    formula: "Sig-fig count: non-zero digits are always significant; zeros between non-zeros are significant; leading zeros are not; trailing zeros after a decimal point ARE significant. Trailing zeros in a bare integer are ambiguous and NOT counted here (use scientific notation for explicit precision). Rounding to N sig figs: scale by 10^(N - ceil(log10(|x|))), round, scale back.",
    edition: "Significant-figure conventions per NIST SP 811 §7 (Guide for the Use of the International System of Units).",
    freeAccess: "Free at nist.gov/pml/special-publication-811.",
    governance: GOVERNANCE.education,
    editionNote: "Single-edition (mathematical / SI convention). The rounding implementation uses IEEE-754 round-half-to-even via Math.round which matches the SI / NIST 'banker's rounding' convention for ties.",
    assumptions: [
      { name: "Bare-integer trailing zeros", value: "not counted; use scientific notation (1.500e3) or a trailing decimal (1500.) to mark them as significant", source: "convention; the rule is ambiguous in plain decimal" },
      { name: "Rounding mode", value: "round half to even (banker's rounding) via IEEE-754", source: "JS Math.round behavior; matches NIST guidance" },
    ],
  },
  "codon-table": {
    formula: "Standard genetic-code lookup: each in-frame triplet of RNA bases (A / C / G / U) maps to an amino acid or a STOP codon. DNA sequences are translated by replacing T with U before lookup.",
    edition: "Standard genetic code (universal). IUPAC-IUB amino-acid one- and three-letter codes.",
    freeAccess: "Public domain reference. Available in every introductory molecular-biology textbook and at ncbi.nlm.nih.gov.",
    governance: GOVERNANCE.education,
    editionNote: "Mitochondrial and certain bacterial / protozoan genetic codes differ at specific codons (e.g., UGA codes for Trp in vertebrate mitochondria, not STOP) and are NOT covered by this tile. Reading frame starts at position 1 of the entered sequence; the tile does not search for an internal start codon.",
    assumptions: [
      { name: "Code", value: "standard / universal genetic code", source: "convention" },
      { name: "Reading frame", value: "starts at position 1 of the input", source: "convention; for ORF finding use a dedicated tool" },
      { name: "Trailing partial codon", value: "1 or 2 trailing bases are ignored (no partial codon translated)", source: "convention" },
    ],
  },
  "base-converter": {
    formula: "Positional-notation base conversion. parseInt(value, source_base) -> integer; integer.toString(target_base) -> output. Bases 2 through 36 (limit of JavaScript radix support).",
    edition: "Standard positional-notation conversion. The 2-36 range is the upper limit of the [0-9] + [A-Z] digit alphabet.",
    freeAccess: "Universal computer-science reference.",
    governance: GOVERNANCE.education,
    editionNote: "The tile handles signed integers up to JavaScript's safe-integer range (2^53 - 1). Fractional / floating-point base conversion is not supported. Negative numbers are converted by sign-magnitude (not two's complement).",
    assumptions: [
      { name: "Integer-only", value: "no fractional support", source: "JS parseInt convention" },
      { name: "Sign", value: "sign-magnitude (a leading minus prefix is preserved)", source: "convention" },
      { name: "Safe range", value: "absolute value below 2^53; larger numbers lose precision", source: "IEEE-754 limit" },
    ],
  },
  "gpa-calculator": {
    formula: "unweighted_gpa = sum(letter_points * credits) / sum(credits). weighted_gpa = sum((letter_points + track_bonus) * credits) / sum(credits). Letter points: A=4.0, A-=3.7, B+=3.3, B=3.0, B-=2.7, C+=2.3, C=2.0, C-=1.7, D+=1.3, D=1.0, D-=0.7, F=0. Track bonus: honors +0.5, AP / IB / dual-enrollment +1.0. Bonus applies to passing grades (D- or higher) per common registrar convention.",
    edition: "Standard US 4.0 / 5.0 GPA scale. Letter-to-point mapping and track-bonus convention follow AACRAO (American Association of Collegiate Registrars and Admissions Officers) guidance.",
    freeAccess: "Universal registrar convention; published in school-district handbooks and the AACRAO transcript guide. No code citation required.",
    governance: GOVERNANCE.education,
    editionNote: "Some districts use slightly different mappings (e.g., 4.3 for A+, no bonus on dual-enrollment courses, or +0.33 for honors). The school registrar governs final transcript GPA; this tile is a planning aid.",
    assumptions: [
      { name: "Bonus on passing only", value: "honors / AP +0.5 / +1.0 added only on D- or higher", source: "common-registrar convention" },
      { name: "Letter set", value: "A through F with plus / minus modifiers; no A+ premium above 4.0", source: "AACRAO" },
      { name: "Track names", value: "regular / honors / ap (covers IB / dual-enrollment via the ap weighting)", source: "convention" },
    ],
  },
  "confidence-interval": {
    formula: "Proportion: phat +/- z * sqrt(phat*(1-phat)/n). Mean: xbar +/- z * (sd / sqrt(n)). z critical values (two-tailed) from the standard normal: 80% = 1.2816, 90% = 1.6449, 95% = 1.9600, 98% = 2.3263, 99% = 2.5758.",
    edition: "Standard inferential statistics. Wald CI per Wald, Abraham, 'Tests of statistical hypotheses concerning several parameters when the number of observations is large,' Trans. Amer. Math. Soc. 54 (1943).",
    freeAccess: "Universal reference; covered in any introductory statistics textbook (Moore, McCabe; Devore; OpenIntro Statistics).",
    governance: GOVERNANCE.education,
    editionNote: "The Wald interval under-covers for small n or extreme phat (the rule of thumb is n*phat >= 10 and n*(1-phat) >= 10). For small n with unknown population SD on a mean, a t-interval (df = n-1) is more correct than the z-based Wald interval; this tile flags both cases.",
    assumptions: [
      { name: "Two-tailed", value: "z critical values are two-tailed", source: "convention" },
      { name: "Independence", value: "sample observations are assumed independent and identically distributed", source: "Wald CI assumption" },
      { name: "Continuity correction", value: "not applied", source: "this tile is the Wald form; a continuity-corrected variant exists but is not bundled" },
    ],
  },
  "linear-system-2x2": {
    formula: "det = a1*b2 - a2*b1. If det != 0: x = (c1*b2 - c2*b1)/det, y = (a1*c2 - a2*c1)/det (Cramer's rule). If det = 0 and (a1*c2 = a2*c1) and (b1*c2 = b2*c1): infinitely many solutions (same line). If det = 0 otherwise: no solution (parallel lines).",
    edition: "Standard linear algebra; Cramer's rule per Gabriel Cramer, 'Introduction a l'analyse des lignes courbes algebriques,' 1750.",
    freeAccess: "Universal reference; covered in any algebra II / pre-calculus textbook.",
    governance: GOVERNANCE.education,
    editionNote: "For larger systems Cramer's rule is numerically unstable and slow; this tile is bounded to the 2x2 case where it is exact in floating-point for well-conditioned coefficients. The near-zero determinant tolerance (1e-12 * scale) catches floating-point degenerate cases.",
    assumptions: [
      { name: "Field", value: "real coefficients; complex coefficients are not supported", source: "scope" },
      { name: "Consistency check", value: "cross-multiplication form avoids division by zero (a1*c2 == a2*c1 and b1*c2 == b2*c1)", source: "standard equivalence test" },
    ],
  },
  "lexile-band": {
    formula: "Reference render: grade-to-Lexile bands (K, 1-12) with both the 'typical reader' midrange and the CCSS Appendix A stretch ranges.",
    edition: "Common Core State Standards Appendix A (June 2010), Section III ('Quantitative Measures of Text Complexity'). State-DOE bulletins from Smarter Balanced / PARCC consortium states implementing the CCSS stretch alignment.",
    freeAccess: "CCSS Appendix A free at corestandards.org. State bulletins free at the respective state-DOE sites.",
    governance: GOVERNANCE.education,
    editionNote: "'Lexile' is a registered trademark of MetaMetrics, Inc. The MetaMetrics measure itself is licensed; only the grade-to-band targets summarized from publicly published state-DOE guidance are bundled. The CCSS framework explicitly directs educators to combine quantitative (Lexile) with qualitative + reader-and-task analyses; this tile is one of three inputs to text selection.",
    assumptions: [
      { name: "Stretch alignment", value: "post-2012 CCSS stretch ranges (1185L+ end of grade 6 etc.); pre-2012 'typical reader' ranges are also surfaced", source: "CCSS Appendix A §III" },
      { name: "BR (Beginning Reader)", value: "Lexile assigns 'BR' below 0L for emergent readers; the tile labels K with BR through 230L", source: "MetaMetrics convention" },
    ],
  },
  "standards-based-grade": {
    formula: "Per row: parse '<standard> <level 1-4> [major|supporting|additional]'. priority weight: major=3, supporting=2, additional=1 (Achieve the Core focus guidance). overall = sum(level * weight) / sum(weight). Letter band: 3.5+ A; 3.0+ B; 2.5+ C; 2.0+ D; below D F.",
    edition: "Marzano + Heflebower, 'A Handbook for Developing and Using Proficiency Scales' (2014). Achieve the Core 'focus by grade level' major / supporting / additional cluster guidance. AAS / NWEA published 4-point-to-letter conversion convention.",
    freeAccess: "Achieve the Core focus documents free at achievethecore.org. NWEA published conversion table free at nwea.org.",
    governance: GOVERNANCE.education,
    editionNote: "Standards-based grading deliberately decouples mastery from points-out-of-100; the letter equivalent here is a translation aid for transcript reporting only. School district policy governs whether a letter equivalent is required and which conversion table is used.",
    assumptions: [
      { name: "Priority weights", value: "major=3, supporting=2, additional=1 per Achieve the Core focus guidance", source: "Achieve the Core convention" },
      { name: "Letter conversion", value: "3.5+ A, 3.0+ B, 2.5+ C, 2.0+ D, <2.0 F", source: "AAS / NWEA convention" },
    ],
  },
  "bell-curve-zscore": {
    formula: "z = (raw - mean) / sd. percentile = standard-normal-CDF(z) * 100, via the Abramowitz + Stegun 26.2.17 approximation (~7.5e-8 absolute error). Curve bands: z >= 2 A+; 1 to 2 A; 0 to 1 B; -1 to 0 C; -2 to -1 D; below -2 F.",
    edition: "Abramowitz + Stegun, Handbook of Mathematical Functions, formula 26.2.17 (1965; National Bureau of Standards Applied Mathematics Series 55). Empirical 68-95-99.7 rule for the curve bands; pre-CCSS norm-referenced grading convention.",
    freeAccess: "AMS 55 is public domain; free at dlmf.nist.gov and nist.gov/pml.",
    governance: GOVERNANCE.education,
    editionNote: "Grading on a curve is a normative grading convention. Standards-based grading (Y.13 in this group) deliberately rejects curving; the two tiles solve different problems. Teacher governs which framework applies.",
    assumptions: [
      { name: "Population vs sample SD", value: "the tile takes a single SD; the user picks whether it is the population or sample value", source: "convention" },
      { name: "Approximation", value: "Abramowitz + Stegun 26.2.17 is accurate to ~7.5e-8 absolute error in the standard-normal CDF", source: "AMS 55 §26.2" },
    ],
  },
  "pearson-correlation": {
    formula: "Pearson r = sum((x - xbar)(y - ybar)) / sqrt(sum(x - xbar)^2 * sum(y - ybar)^2). R^2 = r^2. Significance test for rho = 0: t = r * sqrt(n - 2) / sqrt(1 - r^2) on n - 2 degrees of freedom; two-tailed p = 2 * (1 - tcdf(|t|, n - 2)).",
    edition: "OpenIntro Statistics 4th ed. Chapter 8 (introduction to linear regression) by name; the Student-t CDF via the regularized incomplete beta function per Numerical Recipes in C 2nd ed. §6.4.",
    freeAccess: "OpenIntro Statistics free at openintro.org; Numerical Recipes chapters free at numerical.recipes.",
    governance: GOVERNANCE.education,
    editionNote: "Correlation is not causation; a strong r can arise from a lurking variable or a non-linear relationship that the linear coefficient cannot see. The significance test assumes approximately bivariate-normal data; inspect a scatter plot for small samples.",
    assumptions: [
      { name: "Degrees of freedom", value: "n - 2 (two parameters estimated)", source: "Student-t test for a correlation coefficient" },
      { name: "Two-tailed p-value", value: "2 * (1 - tcdf(|t|, n - 2))", source: "OpenIntro Statistics Ch. 8" },
      { name: "Student-t CDF", value: "derived from the regularized incomplete beta function I_x(df/2, 1/2)", source: "Numerical Recipes 6.4" },
    ],
  },
  "chi-square-gof": {
    formula: "Chi-square statistic = sum((observed - expected)^2 / expected) over k categories, on k - 1 degrees of freedom. p-value = 1 - chi2Cdf(chi-square, k - 1). Expected proportions are scaled to the observed total. Reject H0 (the observed counts follow the expected distribution) when p < alpha.",
    edition: "OpenIntro Statistics 4th ed. Chapter 6 (inference for categorical data) by name; the chi-square CDF via the regularized lower incomplete gamma function per Numerical Recipes in C 2nd ed. §6.2.",
    freeAccess: "OpenIntro Statistics free at openintro.org; Numerical Recipes chapters free at numerical.recipes.",
    governance: GOVERNANCE.education,
    editionNote: "The chi-square approximation degrades when an expected count is below 5; the tile flags it and suggests Fisher's exact test or combining categories. This is a goodness-of-fit test (k - 1 df), not a test of independence (which uses (r-1)(c-1) df).",
    assumptions: [
      { name: "Degrees of freedom", value: "k - 1 (goodness-of-fit, one constraint: counts sum to the total)", source: "OpenIntro Statistics Ch. 6" },
      { name: "Expected-count floor", value: "every expected count should be at least 5 for the approximation", source: "Cochran's rule" },
      { name: "Chi-square CDF", value: "regularized lower incomplete gamma P(df/2, x/2)", source: "Numerical Recipes 6.2" },
    ],
  },
  "linear-regression": {
    formula: "Least squares: slope = sum((x - xbar)(y - ybar)) / sum((x - xbar)^2); intercept = ybar - slope * xbar. R^2 = r^2. Residual sum of squares RSS = Syy - slope * Sxy; residual standard error = sqrt(RSS / (n - 2)). Slope t-test for slope = 0: t = slope / (RSE / sqrt(Sxx)) on n - 2 df, two-tailed p = 2 * (1 - tcdf(|t|, n - 2)). Prediction y-hat = intercept + slope * x.",
    edition: "OpenIntro Statistics 4th ed. Chapter 8 (introduction to linear regression) by name; the Student-t CDF via the regularized incomplete beta function per Numerical Recipes in C 2nd ed. §6.4.",
    freeAccess: "OpenIntro Statistics free at openintro.org; Numerical Recipes chapters free at numerical.recipes.",
    governance: GOVERNANCE.education,
    editionNote: "Correlation is not causation, and a fitted line describes only a linear relationship within the observed range; predicting beyond the data (extrapolation) is unsupported. The slope t-test equals the Pearson correlation t-test for the same data.",
    assumptions: [
      { name: "Degrees of freedom", value: "n - 2 (slope and intercept estimated)", source: "OpenIntro Statistics Ch. 8" },
      { name: "Residual standard error", value: "sqrt(RSS / (n - 2))", source: "ordinary least squares" },
      { name: "Slope standard error", value: "RSE / sqrt(Sxx)", source: "OpenIntro Statistics Ch. 8" },
    ],
  },
  "alternate-readability": {
    formula: "SMOG = 1.043 * sqrt(polysyllables * (30/sentences)) + 3.1291. Coleman-Liau = 0.0588 * L - 0.296 * S - 15.8 (L = letters/100 words; S = sentences/100 words). Gunning Fog = 0.4 * (words/sentences + 100 * complex/words). ARI = 4.71 * (chars/words) + 0.5 * (words/sentences) - 21.43.",
    edition: "SMOG per McLaughlin, 'SMOG Grading: A New Readability Formula,' Journal of Reading 12:8 (1969). Coleman-Liau per Coleman + Liau, 'A computer readability formula designed for machine scoring,' Journal of Applied Psychology 60:2 (1975). Gunning Fog per Gunning, 'The Technique of Clear Writing' (1952). ARI per Smith + Senter, 'Automated Readability Index,' AMRL-TR-66-220 (1967), public-domain federal publication.",
    freeAccess: "AMRL-TR-66-220 free at dtic.mil. The McLaughlin, Coleman-Liau, and Gunning papers are widely summarized in any introductory linguistics or composition reference.",
    governance: GOVERNANCE.education,
    editionNote: "SMOG was designed to evaluate health communication; it predicts the grade level needed for 100% comprehension and tends to read higher than Flesch-Kincaid. Coleman-Liau uses only letter / sentence counts (no syllables) and is therefore more stable on technical jargon. ARI was designed for U.S. Air Force technical writing. All four are deterministic; no LLM.",
    assumptions: [
      { name: "Polysyllable", value: "any word with 3+ syllables per the deterministic counter (SMOG and Gunning Fog 'complex word')", source: "McLaughlin 1969 / Gunning 1952" },
      { name: "Validity range", value: "SMOG validated against ~30 sentence passages; <100 words flagged as unreliable", source: "McLaughlin 1969 §3" },
    ],
  },
  "periodic-element": {
    formula: "Lookup table over atomic number, symbol, or name. Returns period / group / block / Pauling electronegativity / electron configuration / common oxidation states.",
    edition: "IUPAC atomic numbers and element names (current IUPAC). Pauling electronegativity per Pauling, 'The Nature of the Chemical Bond' (3rd ed., 1960). Electron configurations per NIST Atomic Spectra Database. Common oxidation states per Greenwood + Earnshaw, 'Chemistry of the Elements' (2nd ed., 1997); Cotton + Wilkinson, 'Advanced Inorganic Chemistry'.",
    freeAccess: "NIST Atomic Spectra Database free at physics.nist.gov/asd. IUPAC nomenclature free at iupac.org.",
    governance: GOVERNANCE.education,
    editionNote: "Coverage is the first 36 elements (H through Kr) plus Ag, I, Au, Hg, Pb. The full table (118 elements) would add ~2 KB; that is a future extension. Pauling electronegativity is undefined for the noble gases (the tile returns 'noble gas; not defined' for He / Ne / Ar). The Kr Pauling value is included where defined.",
    assumptions: [
      { name: "Coverage", value: "H-Kr plus 5 selected heavy elements; full table out of scope for this Y.12 extension", source: "scope" },
      { name: "Electronegativity scale", value: "Pauling scale; Allred-Rochow and Mulliken scales are alternatives", source: "convention" },
    ],
  },

  // ---- spec-v24 conduit-bending suite (Group A) ----
  "conduit-offset": {
    formula: "Distance between the two bend marks = offset / sin(angle) (the cosecant multiplier); total shrink = offset * tan(angle/2). The classic multipliers (30 deg = 2.0, 45 deg = 1.41, 22.5 deg = 2.61, 60 deg = 1.15) and shrink rules fall out of the trig exactly.",
    edition: "Standard conduit-bending trigonometry taught in the electrical apprenticeship and summarized in Ugly's Electrical References and the NECA bending guidance, by name. NEC Article 358 minimum radius and the 360-degree-per-run limit govern the install.",
    freeAccess: "Free read-only access to the NEC at nfpa.org/freeaccess. The bending trigonometry is public first-principles math.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (first-principles bending trig). Bender deduct and shoe figures are tool-specific; confirm against your bender's marked values.",
    assumptions: [
      { name: "In-plane bends", value: "both bends in the same plane (a simple offset)", source: "method" },
      { name: "Minimum radius", value: "cross-check the conductor minimum bend radius with the cable-bend-radius tile", source: "NEC Article 358" },
    ],
  },
  "conduit-saddle": {
    formula: "Three-point saddle: center bend = 2x the outer angle; outer marks at the field multiplier from center (2.5 x depth for the 45/22.5 preset, 2.0 x depth for 60/30) with the per-inch shrink rule (3/16 in per inch of depth for 45/22.5, 1/4 in for 60/30). Four-point saddle: two back-to-back offsets each = depth / sin(angle) separated by the obstruction width.",
    edition: "Standard three- and four-point saddle-bend geometry taught in the electrical apprenticeship and Ugly's Electrical References, by name. NEC Article 358 governs the install.",
    freeAccess: "Free read-only access to the NEC at nfpa.org/freeaccess. The saddle geometry is public first-principles math.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (first-principles bending trig). The bender's marked center-notch / rim-notch reference governs which mark aligns with the bend point; confirm against your tool.",
    assumptions: [
      { name: "In-plane presets", value: "the 45/22.5 and 60/30 presets are the two that keep the conduit in-plane", source: "method" },
      { name: "Shrink applied once", value: "the three-point shrink is applied once, not per outer bend", source: "method" },
    ],
  },
  "conduit-90-stub": {
    formula: "Stub-up mark = desired height - bender deduct (take-up). Back-to-back: the far mark referenced from the near stub. Segmented 90: shot count n = ceil(90 / per-shot angle), arc per shot = radius * per-shot angle in radians.",
    edition: "Standard 90-degree stub-up deduct (take-up) and segment-bend geometry from the electrical apprenticeship and Ugly's Electrical References, by name. NEC Article 358 minimum radius and the four-quarter-bends-per-run limit govern.",
    freeAccess: "Free read-only access to the NEC at nfpa.org/freeaccess. The deduct geometry is public first-principles math.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (first-principles bending geometry). The deduct is the bender-shoe constant (tool-specific, user-supplied); common EMT defaults (1/2 in ~ 5 in, 3/4 in ~ 6 in, 1 in ~ 8 in, 1-1/4 in ~ 11 in) are a starting point only.",
    assumptions: [
      { name: "Deduct source", value: "user-supplied bender take-up; EMT defaults offered as a starting point", source: "tool-specific" },
    ],
  },

  // ---- spec-v24 welding / metal / layout (Group E) ----
  "weld-heat-input": {
    formula: "Arc energy = (60 * V * I) / TS (J per unit length); heat input HI = arc energy * efficiency / 1000 (kJ per unit length). Arc efficiency defaults by process: 0.8 SMAW/GMAW/FCAW, 0.6 GTAW, 1.0 SAW (user-editable). kJ/in to kJ/mm via x 0.0394.",
    edition: "AWS D1.1 Structural Welding Code and ASME BPVC Section IX heat-input definition HI = (60*V*I)/TS, by name, with the arc-efficiency factor by process.",
    freeAccess: "Free overviews at aws.org. The governing WPS/PQR ranges are user-supplied.",
    governance: GOVERNANCE.engineer_of_record,
    editionNote: "Editions available: AWS D1.1 and ASME BPVC Section IX revise on multi-year cycles; the heat-input definition is stable but the qualified-WPS ranges govern. Verify the adopted code edition.",
    assumptions: [
      { name: "Arc efficiency", value: "process default 0.6 to 1.0, user-editable", source: "AWS/ASME process convention" },
    ],
  },
  "metal-weight": {
    formula: "weight = cross-sectional area * length * density * quantity. Per-shape area from geometry: tube = pi/4 * (OD^2 - ID^2), hex = 0.866 * width^2, round = pi/4 * dia^2, etc. lb to kg via x 0.453592.",
    edition: "First-principles weight = volume x density. Densities are the published nominal values for the common alloys (carbon steel 0.2836, stainless 0.289, aluminum 6061 0.098, copper 0.323, brass 0.307 lb/in^3) or user-supplied.",
    freeAccess: "The density values are published nominal references; mill certs and the actual alloy temper govern the real figure.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (geometry plus nominal alloy densities). Nominal pipe-size differs from actual OD; enter the actual OD/ID.",
    assumptions: [
      { name: "Alloy density", value: "published nominal lb/in^3 by alloy, or user-supplied", source: "alloy reference" },
    ],
  },
  "layout-squaring": {
    formula: "Diagonal = sqrt(a^2 + b^2) (Pythagoras / the 3-4-5 rule). For a rectangle the two diagonals are equal when square, so out-of-square = |d1 - d2| and the longer diagonal's corner is the one to draw in.",
    edition: "The Pythagorean 3-4-5 right-angle layout method (public) and the standard foundation- and deck-squaring technique.",
    freeAccess: "Public first-principles geometry; no paywalled source.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (Pythagorean geometry). A layout aid, not a substitute for a transit or a string-line check on long runs.",
    assumptions: [
      { name: "Rectangular assumption", value: "the check-square mode assumes a rectangle (equal diagonals when square)", source: "method" },
    ],
  },

  // ---- spec-v25 civil curve / earthwork / grading (Group E) ----
  "superelevation": {
    formula: "e + f = V^2/(15 R); required e = V^2/(15 R) - f; minimum radius R_min = V^2/(15(e_max + f)). V in mph, R in ft.",
    edition: "The AASHTO A Policy on Geometric Design of Highways and Streets (the Green Book) point-mass curve model, by name.",
    freeAccess: "The AASHTO point-mass relation is published in the Green Book; the side-friction design factors are in its speed table. AHJ, state DOT design manual, and the licensed civil engineer of record govern.",
    governance: GOVERNANCE.general,
    editionNote: "The AASHTO Green Book point-mass relation e + f = V^2/(15 R), the required superelevation e = V^2/(15 R) - f, the minimum radius R_min = V^2/(15(e_max + f)), and that the side-friction factor f decreases with design speed (about 0.16 at 30 mph to 0.08 at 80 mph). This returns the point-mass superelevation and minimum radius: it uses the entered design side-friction factor (from the AASHTO speed table), does not distribute e and f by an AASHTO method (1 through 5) over the speed range, and does not size the superelevation transition/runoff length or the spiral. A negative required e (a curve flat enough that side friction alone holds it) is reported as no superelevation required. A design aid, not a substitute for a licensed civil engineer's geometric design.",
    assumptions: [
      { name: "Point-mass model", value: "e + f = V^2/(15 R), V in mph and R in ft", source: "AASHTO Green Book" },
      { name: "Side-friction factor", value: "f is the AASHTO design value at the design speed (about 0.16 at 30 mph to 0.08 at 80 mph)", source: "AASHTO Green Book speed table" },
      { name: "Not a runoff/spiral design", value: "no e/f distribution method, no transition or spiral length", source: "scope of this tile" },
    ],
  },
  "vertical-curve-sight-distance": {
    formula: "L = A S^2 / C for S <= L; L = 2 S - C/A for S > L; C = 2158 (SSD crest) or 2800 (passing); K = L/A.",
    edition: "The AASHTO A Policy on Geometric Design of Highways and Streets (the Green Book) crest vertical-curve sight-distance minimums, by name.",
    freeAccess: "The AASHTO crest-curve length equations are published in the Green Book. AHJ, state DOT design manual, and the licensed civil engineer of record govern.",
    governance: GOVERNANCE.general,
    editionNote: "The AASHTO Green Book crest vertical-curve minimums L = A S^2 / 2158 for S <= L and L = 2 S - 2158/A for S > L, the 2158 constant embedding a 3.5 ft driver eye and 2.0 ft object height, the K = L/A rate-of-vertical-curvature form, and that sag curves use headlight/comfort/drainage controls as separate cases. This returns the minimum crest vertical-curve length for the entered stopping sight distance: it is the crest SSD control (passing sight distance uses the larger 2800 constant, and sag curves use headlight/comfort/drainage criteria), takes the SSD as entered, and does not check the drainage-maximum K = 167 or the appearance minimum. A design aid, not a substitute for a licensed civil engineer's design.",
    assumptions: [
      { name: "Branch selection", value: "L = A S^2 / C when S <= L, else L = 2 S - C/A; the governing branch is chosen by the S vs L comparison", source: "AASHTO Green Book" },
      { name: "Sight constant", value: "C = 2158 for the SSD crest (3.5 ft eye, 2.0 ft object); 2800 for passing sight distance", source: "AASHTO Green Book" },
      { name: "Crest SSD only", value: "sag curves use headlight/comfort/drainage criteria, not this relation", source: "scope of this tile" },
    ],
  },
  "horizontal-sightline-offset": {
    formula: "M = R (1 - cos(28.65 S / R)) [half-angle in degrees]; inverse S = (R/28.65) arccos(1 - M/R); R to the inside-lane centerline.",
    edition: "The AASHTO A Policy on Geometric Design of Highways and Streets (the Green Book) horizontal sightline offset (middle ordinate), by name.",
    freeAccess: "The AASHTO middle-ordinate relation is published in the Green Book. AHJ, state DOT design manual, and the licensed civil engineer of record govern.",
    governance: GOVERNANCE.general,
    editionNote: "The AASHTO Green Book middle-ordinate M = R (1 - cos(28.65 S / R)) with R to the inside-lane centerline (the vehicle's path), the inverse S = (R/28.65) arccos(1 - M/R), and that the offset is measured from the sightline to the sight obstruction. This returns the horizontal sightline offset (clear-zone width) for the entered sight distance and radius: it uses R to the vehicle's path (inside-lane centerline, not the curve centerline), assumes the sight obstruction is continuous along the curve, and does not account for the driver-to-obstruction geometry at the curve ends or a variable offset. A design aid, not a substitute for a licensed civil engineer's design.",
    assumptions: [
      { name: "Middle-ordinate model", value: "M = R (1 - cos(28.65 S / R)), the 28.65 = 90/pi putting the half-angle in degrees", source: "AASHTO Green Book" },
      { name: "Radius basis", value: "R is to the inside-lane centerline (the vehicle's path), not the curve centerline", source: "AASHTO Green Book" },
      { name: "Continuous obstruction", value: "assumes the sight obstruction runs continuously along the curve; no end geometry", source: "scope of this tile" },
    ],
  },
  "horizontal-curve": {
    formula: "T = R*tan(delta/2); L = R*delta_rad (arc definition); E = R*(sec(delta/2)-1); M = R*(1-cos(delta/2)); LC = 2*R*sin(delta/2); arc-definition D = 5729.58/R; PC = PI - T, PT = PC + L.",
    edition: "Simple circular-curve geometry per the AASHTO A Policy on Geometric Design of Highways and Streets (the Green Book) and FM 5-233 Construction Surveying, by name; first-principles trig.",
    freeAccess: "FM 5-233 is public-domain US Government work, free at US Army publication archives. The design of record and the engineer of record govern the alignment.",
    governance: GOVERNANCE.engineer_of_record,
    editionNote: "Single-edition (first-principles curve trig). The arc-vs-chord degree-of-curve definition is a labeled toggle so the two never silently mix.",
    assumptions: [
      { name: "Degree definition", value: "arc definition D = 5729.58 / R unless the chord toggle is set", source: "AASHTO / FM 5-233" },
    ],
  },
  "vertical-curve": {
    formula: "Equal-tangent parabola from the BVC: elev(x) = bvc_elev + (g1/100)*x + ((g2-g1)/100)/(2L)*x^2, x in ft from BVC. Turning point at x = -g1*L/(g2-g1) when it lies in [0, L].",
    edition: "Equal-tangent parabolic vertical-curve elevations and the high/low-point location per the AASHTO Green Book vertical-alignment relations and FM 5-233, by name; first-principles.",
    freeAccess: "FM 5-233 is public-domain US Government work, free at US Army publication archives. The design of record governs.",
    governance: GOVERNANCE.engineer_of_record,
    editionNote: "Single-edition (first-principles parabolic geometry). Equal grades (g1 = g2) report a straight grade rather than dividing by zero.",
    assumptions: [
      { name: "Symmetric curve", value: "equal-tangent (symmetric) parabola; unequal-tangent curves out of scope", source: "method" },
    ],
  },
  "earthwork-end-area": {
    formula: "Average end area V = (L/2)*(A1 + A2); prismoidal V = (L/6)*(A1 + 4*Am + A2); yd^3 = ft^3 / 27; adjusted volume = V * swell/shrink factor.",
    edition: "The average-end-area and prismoidal earthwork-volume methods per the FHWA and state-DOT earthwork references and FM 5-233, by name; first-principles.",
    freeAccess: "FM 5-233 is public-domain US Government work. Compaction swell/shrink factors are material- and spec-specific and user-supplied; the project earthwork report governs the paid quantity.",
    governance: GOVERNANCE.engineer_of_record,
    editionNote: "Single-edition (first-principles volume methods). Cut and fill are entered and labeled separately, never netted automatically, to avoid a sign trap.",
    assumptions: [
      { name: "Swell/shrink factor", value: "material- and spec-specific, user-supplied", source: "project earthwork report" },
    ],
  },
  "slope-stake-cut-fill": {
    formula: "cut/fill = existing - design (positive = cut, negative = fill); catch-point offset = offset_at_hinge + ratio * |cut/fill| for the planar approximation, with the slope-ratio convention (H:V) stated.",
    edition: "Slope-stake cut/fill and the catch-point (daylight) offset for a planar design slope per FM 5-233 Construction Surveying and the FHWA construction-survey guidance, by name; first-principles grading geometry.",
    freeAccess: "FM 5-233 is public-domain US Government work. A field staking aid; the grading plan and the surveyor of record govern.",
    governance: GOVERNANCE.engineer_of_record,
    editionNote: "Single-edition (first-principles grading geometry). The H:V vs V:H convention is a labeled toggle so a 2:1 is never read upside down.",
    assumptions: [
      { name: "Planar slope", value: "planar design slope to a single catch point; compound slopes out of scope", source: "method" },
    ],
  },

  // ---- spec-v24 cross-trade rolling offset (Group G) ----
  "rolling-offset": {
    formula: "True offset = sqrt(rise^2 + roll^2) (Pythagoras); travel = true offset * cosecant(angle) = true offset / sin(angle); run advance = true offset / tan(angle); multiplier = 1 / sin(angle).",
    edition: "First-principles rolling-offset trigonometry used in pipe fitting and conduit work (the Pythagorean true-offset and the cosecant travel multiplier); public, as taught in NCCER pipefitting and the standard fitter's references, by name.",
    freeAccess: "Public first-principles trig. Fitting make-up / take-out is product-specific and user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (first-principles fitter's trig). Pairs with the conduit-offset tile (the single-plane case).",
    assumptions: [
      { name: "Fitting make-up", value: "product-specific, user-supplied; the multiplier is the center-to-center geometry only", source: "fitting reference" },
    ],
  },

  // ---- spec-v24 stage audio electronics (Group N) ----
  "speaker-impedance": {
    formula: "Series Z = sum of Z_i; parallel Z = 1 / sum(1/Z_i) (equal drivers = Z/N); series-parallel combines the two. Safety verdict: total impedance >= amplifier minimum rated load.",
    edition: "Ohm's-law series/parallel impedance combination (public); the amplifier-minimum-load check follows the manufacturer's rated minimum, by name (user-supplied).",
    freeAccess: "Public Ohm's-law network theory. The amplifier specification governs the rated minimum load.",
    governance: GOVERNANCE.rigging,
    editionNote: "Single-edition (physics). A nominal-impedance estimate; real loudspeaker impedance is frequency-dependent, and the amp's spec governs.",
    assumptions: [
      { name: "Nominal impedance", value: "the rated nominal driver impedance, not the frequency-dependent curve", source: "manufacturer rating" },
    ],
  },
  "decibel-converter": {
    formula: "Power dB = 10*log10(P2/P1); voltage/pressure dB = 20*log10(V2/V1); dBu ref 0.775 V, dBV ref 1 V, dBSPL ref 20 uPa; incoherent sum L = 10*log10(sum 10^(Li/10)).",
    edition: "Per the ANSI S1.1 acoustical-terminology decibel definitions (power 10*log, field-quantity 20*log) and the standard reference levels (dBu 0.775 V, dBV 1 V, dBSPL 20 uPa), by name; public.",
    freeAccess: "Free read-only access to the ANSI S1.1 table of contents at ansi.org. The decibel definitions are public.",
    governance: GOVERNANCE.rigging,
    editionNote: "Single-edition (ANSI S1.1 definitions). The 10*log vs 20*log distinction is mode-locked so a power ratio is never read as a voltage ratio.",
    assumptions: [
      { name: "Reference levels", value: "dBu 0.775 V, dBV 1 V, dBSPL 20 uPa", source: "ANSI S1.1" },
    ],
  },
  "amp-power-spl": {
    formula: "SPL(d) = sensitivity + 10*log10(P) - 20*log10(d / 1 m); peak = SPL + crest factor; inverse power P = 10^((target - sensitivity + 20*log10(d)) / 10).",
    edition: "First-principles loudspeaker SPL from the 1 W / 1 m sensitivity reference, the 10*log power term, and the inverse-square distance term (public; ANSI S1.1 decibel basis), by name.",
    freeAccess: "Public first-principles acoustics. A free-field estimate; the manufacturer's max-SPL spec governs.",
    governance: GOVERNANCE.rigging,
    editionNote: "Single-edition (physics). Free-field estimate; room gain, power compression, and driver excursion limits are not modeled.",
    assumptions: [
      { name: "Free field", value: "no room gain or boundary reinforcement modeled", source: "method" },
    ],
  },

  "lighting-beam": {
    formula: "Beam (pool) diameter = 2 x throw x tan(beam angle / 2); center illuminance E = candela / distance^2 (inverse-square). Candela from lumens = lumens / (2*pi*(1 - cos(beam angle / 2))). 1 fc = 10.764 lux.",
    edition: "First-principles theatrical photometry - beam spread and the inverse-square illuminance the form fixture photometric charts (manufacturer cut sheets) publish, by name; public domain.",
    freeAccess: "Public first-principles photometry. The center-beam candela / field-vs-beam angle come from the fixture's photometric data; a real beam is brighter at center than the edge.",
    governance: GOVERNANCE.rigging,
    editionNote: "Single-edition (physics). Point-source / single-fixture model; for room or area average illuminance (lumen method) use the lux-to-footcandle tile. The lumens-to-candela conversion is an average-over-the-cone estimate.",
    assumptions: [
      { name: "Point source", value: "single aimed fixture, inverse-square from the photometric center; no field falloff or atmospheric loss modeled", source: "method" },
    ],
  },

  // ---- spec-v25 coordinate / traverse surveying (Group P) ----
  "area-by-coordinates": {
    formula: "Shoelace / coordinate method: A = 1/2 * |sum (E_i * N_{i+1} - E_{i+1} * N_i)| over the closed ring; acres = ft^2 / 43560; m^2 = ft^2 * 0.0929. Coordinates are North/East (surveying order).",
    edition: "The coordinate (shoelace) method for the area of a closed traverse per FM 5-233 Construction Surveying and the standard surveying texts, by name; public-domain US Government work and first-principles coordinate geometry.",
    freeAccess: "FM 5-233 is public-domain US Government work, free at US Army publication archives. The recorded plat and the surveyor of record govern the legal area.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (first-principles coordinate geometry). A self-intersecting (bow-tie) polygon is flagged; the signed area is reported but is not a simple enclosed area.",
    assumptions: [
      { name: "Coordinate order", value: "North/East (surveying convention), labeled inline", source: "FM 5-233" },
    ],
  },
  "traverse-closure": {
    formula: "Per course Lat = dist*cos(azimuth), Dep = dist*sin(azimuth); misclosure components = sum Lat, sum Dep; linear misclosure = sqrt(sumLat^2 + sumDep^2); relative precision = perimeter / misclosure (1:N); Compass (Bowditch) correction per course = -(course_length / perimeter) * (that component).",
    edition: "Traverse latitude/departure, linear misclosure, relative precision, and the Compass (Bowditch) rule adjustment per FM 5-233 Construction Surveying and the standard surveying references, by name; public-domain and first-principles.",
    freeAccess: "FM 5-233 is public-domain US Government work, free at US Army publication archives. The field procedure, instrument calibration, and the surveyor of record govern the record traverse.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (first-principles traverse geometry). A misclosure of exactly zero reports perfect closure rather than 1:infinity; an open traverse suppresses the precision ratio with a note.",
    assumptions: [
      { name: "Adjustment method", value: "Compass (Bowditch) rule; the transit rule and least-squares are alternatives", source: "FM 5-233" },
    ],
  },

  "hiking-time": {
    formula: "Naismith's rule: time = horizontal distance / pace + ascent / (600 m per hour); total = that x terrain/fatigue factor. Default pace 5 km/h (3 mph).",
    edition: "Naismith's rule (W. W. Naismith, 1892) for hill-walking time, plus the canonical 1-hour-per-600 m ascent rate, by name; first-principles, public domain.",
    freeAccess: "Public-domain rule of thumb. A planning estimate; pace, terrain, load, weather, rest, and the party's condition vary widely.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the historical rule). Descent is treated as flat (Langmuir's steep-descent correction is not modeled); the terrain/fatigue factor and turnaround discipline govern the actual schedule.",
    assumptions: [
      { name: "Fit walker, good ground", value: "the default pace assumes a fit walker on good ground with a light load; scale with the factor otherwise", source: "Naismith's rule" },
    ],
  },

  // ---- spec-v26 electrician / plumber / pipefitter (Groups A, B, G) ----
  "motor-feeder-multiple": {
    formula: "Feeder conductor (NEC 430.24) >= 1.25 * FLC_largest + sum(FLC_other) + non-motor load. Feeder OCPD (NEC 430.62) <= largest_branch_device + sum(FLC_other), not rounded up (next standard size down where the sum is not a standard rating).",
    edition: "Feeder conductor and feeder overcurrent sizing for several motors on one feeder per NEC 430.24 and 430.62, by name; table FLC (not nameplate FLA) per 430.6(A). The AHJ-adopted NEC edition governs.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. Table FLC and branch-device ratings are user-supplied.",
    governance: GOVERNANCE.electrical,
    editionNote: "NEC Articles 430.24 / 430.62 / 430.6(A). The 430.62 feeder device is a maximum and is taken to the next standard size down, never above the code maximum.",
    assumptions: [
      { name: "FLC source", value: "NEC Table 430.250 (etc.) table full-load current, not nameplate FLA", source: "NEC 430.6(A)" },
    ],
  },
  "transformer-conductor-protection": {
    formula: "FLA = kVA*1000/V (1-phase) or kVA*1000/(sqrt(3)*V) (3-phase). Primary/secondary OCPD per NEC Table 450.3(B) (125% / 167% / 250% / 300% bands keyed to current and whether secondary protection exists; Note 1 next-higher standard size for the 125% case). Secondary conductor ampacity >= secondary FLA per NEC 240.21(C).",
    edition: "Transformer primary/secondary full-load current and overcurrent-protection maxima per NEC Table 450.3(B), with the secondary-conductor tap rules of NEC 240.21(C), by name. A computational aid for the <= 1000 V case; the AHJ-adopted NEC edition and the design engineer govern.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. Inrush/point-of-supply coordination is not modeled.",
    governance: GOVERNANCE.electrical,
    editionNote: "NEC Table 450.3(B) (transformers 1000 V and less) and 240.21(C). The band boundaries (9 A, 2 A) are exact and labeled.",
    assumptions: [
      { name: "Protection method", value: "primary-only vs primary-and-secondary changes the permitted percentage; a labeled toggle, never silently mixed", source: "NEC 450.3(B)" },
    ],
  },
  "feeder-tap-rule": {
    formula: "min_tap_ampacity = feeder_OCPD x 1/10 (tap <= 10 ft, 240.21(B)(1)) or x 1/3 (tap <= 25 ft, 240.21(B)(2)); a tap longer than 25 ft falls under neither short-tap rule. The proposed tap conductor's 75 C ampacity must equal or exceed that minimum.",
    edition: "Minimum feeder tap conductor ampacity under the 10-ft and 25-ft tap rules of NEC 2023 240.21(B)(1) and (B)(2), by name. A computational aid for the <= 1000 V case; the AHJ-adopted NEC edition and the design engineer govern.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. The supplemental 240.21(B) conditions (physical protection, single-OCPD termination for the 25-ft rule, the rating of the supplied device) are stated, not modeled.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Rule fractions", value: "1/10 for the 10-ft tap, 1/3 for the 25-ft tap; the 10 ft and 25 ft boundaries are the exact code lengths", source: "NEC 240.21(B)(1) and (B)(2)" },
      { name: "Tap ampacity basis", value: "the 75 C termination column ampacity of the proposed tap conductor", source: "NEC 110.14(C) / 310.16" },
    ],
  },
  "buck-boost-sizing": {
    formula: "boost_v = desired_v - supply_v; load_kva = desired_v x load_a / 1000; xfmr_kva = abs(boost_v) x load_a / 1000; ratio% = xfmr_kva / load_kva x 100. The autotransformer is rated for the boost/buck voltage times the load current, a fraction of the full load kVA.",
    edition: "Single-phase buck-boost (autotransformer) sizing. NEC 2023 Article 450 (transformers); the autotransformer connection per the manufacturer.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. Buck-boost selection, the connection diagram, taps, and overcurrent protection are the manufacturer's and the AHJ's; this sizes the required kVA only.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Autotransformer rating", value: "rated for the boost/buck voltage (desired minus supply) times the load current, not the full load kVA", source: "manufacturer buck-boost connection tables" },
      { name: "Connection and protection", value: "the catalog unit, tap connection, and overcurrent protection are manufacturer- and AHJ-governed, not selected here", source: "NEC Article 450; manufacturer" },
    ],
  },
  "wireway-fill": {
    formula: "interior = width x height; allowed = 0.20 x interior; used% = conductor_area / interior x 100; over 30 current-carrying conductors triggers the 310.15(C)(1) ampacity adjustment.",
    edition: "Metal wireway conductor fill and number of conductors, NEC 2023 376.22; the same 20% rule applies to auxiliary gutters (366.22), by name.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. The 30-conductor limit excludes signal and certain conductors per the article exceptions; exceeding 30 current-carrying conductors triggers ampacity adjustment, not prohibition.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Fill limit", value: "conductor cross-section no more than 20% of the wireway interior cross-section", source: "NEC 376.22(A) / 366.22(A)" },
      { name: "Conductor count", value: "more than 30 current-carrying conductors requires the 310.15(C)(1) adjustment factors", source: "NEC 376.22(B)" },
    ],
  },
  "rooftop-temp-adder": {
    formula: "adder = 60 F (33 C) where height above roof < 7/8 in (0.875 in), else 0; design_ambient = measured + adder; corrected = base_ampacity x (90 C-column correction factor at the design ambient).",
    edition: "Raceways and cables exposed to sunlight on or above rooftops, NEC 2020/2023 310.15(B)(2), with the 310.15(B)(1) 90 C-column ambient correction, by name.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. The 2017 NEC reduced the older tiered table to this single 33 C adder applied below 7/8 in; standoffs at or above 7/8 in remove it.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Sunlight adder", value: "33 C (60 F) added to the outdoor ambient where the raceway is less than 7/8 in above the roof", source: "NEC 310.15(B)(2)" },
      { name: "Correction basis", value: "the 90 C-column temperature-correction factor applied to the corrected ambient", source: "NEC Table 310.15(B)(1)" },
    ],
  },
  "working-space-110-26": {
    formula: "depth from Table 110.26(A)(1) by nominal voltage to ground and Condition 1/2/3 (0-150 V: 3/3/3 ft; 151-600 V: 3/3.5/4 ft); width = max(30 in, equipment width); headroom = 6.5 ft, with a 90-degree door swing.",
    edition: "Working space about electrical equipment, NEC 2023 110.26(A), and dedicated equipment space 110.26(E), by name.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. Condition 1/2/3 describe what is across from the live parts; the width is the greater of 30 in or the equipment width.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Depth table", value: "0-150 V to ground is 3 ft for all conditions; 151-600 V is 3 / 3.5 / 4 ft for Conditions 1 / 2 / 3", source: "NEC Table 110.26(A)(1)" },
      { name: "Width and headroom", value: "width is the greater of 30 in or the equipment width; headroom 6.5 ft or equipment height; a 90-degree door swing is required", source: "NEC 110.26(A)(2),(3)" },
    ],
  },
  "range-demand-220-55": {
    formula: "demand_kw = ColumnC(num_ranges) x (1 + increase); increase = 0.05 x ceil(nameplate_kw - 12) for ranges over 12 kW, else 0; demand_a = demand_kw x 1000 / supply_v. Column C: 1->8, 2->11, 3->14, 4->17, 5->20 kW.",
    edition: "Household electric ranges, wall ovens, and counter-mounted cooking units, NEC 2023 Table 220.55 Column C and Note 1, by name.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. This is the common equal-rating Column C path with the Note 1 over-12 kW increase; Notes 2-4 (Columns A/B and unequal-rating averaging) govern the other cases.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Column C series", value: "the bundled 1-through-16-range Column C demand series (1 range -> 8 kW)", source: "NEC Table 220.55 Column C" },
      { name: "Note 1 increase", value: "a range over 12 kW adds 5% of Column C per kW (or major fraction) above 12 kW", source: "NEC Table 220.55 Note 1" },
    ],
  },
  "dryer-demand-220-54": {
    formula: "per_dryer = max(nameplate, 5000 W); connected = per_dryer x count; demand = connected x factor; demand_a = demand / supply_v. Table 220.54 factor: 1-4 -> 100%, 5 -> 85%, 6 -> 75%, declining.",
    edition: "Electric clothes dryers, dwelling unit(s), NEC 2023 220.54 and Table 220.54, by name.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. The per-dryer load is the larger of 5,000 W or the nameplate; the demand factor for counts past the table is the published continuation.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Per-dryer floor", value: "each dryer counts at the larger of 5,000 W or its nameplate rating", source: "NEC 220.54" },
      { name: "Demand factors", value: "100% for 1-4 dryers, 85% at 5, then declining per the bundled Table 220.54 series", source: "NEC Table 220.54" },
    ],
  },
  "neutral-demand-220-61": {
    formula: "ordinary: neutral = min(load, 200) + 0.70 x max(load - 200, 0); nonlinear (220.61(C)): neutral = full unbalanced load (no reduction). The first 200 A of unbalanced load at 100%, the portion over 200 A at 70%.",
    edition: "Feeder and service neutral load, NEC 2023 220.61(B) (70% on the part over 200 A) and 220.61(C) (nonlinear-load prohibition), by name.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. 220.61(C) prohibits the reduction for nonlinear-load portions (electric-discharge lighting, electronic loads); this tile names that exclusion rather than assuming it away.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "200 A break", value: "the first 200 A of maximum unbalanced load at 100%, the portion over 200 A at 70%", source: "NEC 220.61(B)(1)" },
      { name: "Nonlinear exclusion", value: "no reduction is permitted for the nonlinear-load portion; that load stays at 100%", source: "NEC 220.61(C)" },
    ],
  },
  "motor-unbalance-derate": {
    formula: "v_avg = (Vab + Vbc + Vca)/3; unbalance% = max deviation from v_avg / v_avg x 100; derate_factor read off the NEMA MG-1 curve (1% -> ~0.98, 5% -> ~0.75), interpolated; over 5% -> do not operate.",
    edition: "Motor derating for voltage unbalance, NEMA MG-1; the unbalance per the NEMA definition (max deviation from the average over the average), by name.",
    freeAccess: "The NEMA MG-1 derate curve is read off the standard; above 5% unbalance the motor should not be operated. The manufacturer and MG-1 govern the final figure; correct the unbalance source first.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (manufacturer / standards-body convention).",
    assumptions: [
      { name: "Unbalance definition", value: "maximum deviation of any line-to-line voltage from the three-phase average, divided by the average", source: "NEMA MG-1 voltage-unbalance definition" },
      { name: "Derate curve", value: "the bundled MG-1 derating points (1/2/3/4/5% -> ~0.98/0.95/0.88/0.82/0.75), linearly interpolated", source: "NEMA MG-1" },
    ],
  },
  "point-illuminance": {
    formula: "distance = mount_height / cos(angle); E_fc = intensity_cd x cos(angle) / distance^2 = intensity_cd x cos(angle)^3 / mount_height^2; E_lux = E_fc x 10.764.",
    edition: "Point-by-point (inverse-square and cosine) method for horizontal illuminance from a source of known candlepower, IES Lighting Handbook / IESNA point method, by name.",
    freeAccess: "The result is the direct horizontal illuminance from one source ignoring interreflection; lux = fc x 10.764. A design relies on the manufacturer's photometric file and the IES target level.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (engineering-practice / first-principles; refresh as practice shifts).",
    assumptions: [
      { name: "Inverse-square + cosine", value: "horizontal illuminance falls off with the square of the slant distance and the cosine of the incidence angle", source: "IES point method" },
      { name: "Single source", value: "direct illuminance from one luminaire, ignoring interreflected light", source: "IES Lighting Handbook" },
    ],
  },
  "burial-depth-300-5": {
    formula: "min_cover (in) = Table 300.5 cell for (wiring method, location); cover is measured to the top of the raceway/cable. General earth: direct burial 24, RMC/IMC 6, PVC 18, residential GFCI branch 12, low-voltage 6.",
    edition: "Minimum cover requirements, 0 to 1000 volts, NEC 2023 Table 300.5, by name.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. Cover is measured to the top of the raceway/cable; the table footnotes (under buildings, in/under concrete, supplemental protection) modify specific cells.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Column values", value: "the <= 1000 V columns: direct burial, RMC/IMC, nonmetallic raceway, residential 120V/20A GFCI branch, and low-voltage irrigation/landscape", source: "NEC Table 300.5" },
      { name: "Footnotes", value: "raceways under buildings (0 in), in/under concrete, and supplemental protection modify specific cells", source: "NEC Table 300.5 footnotes" },
    ],
  },
  "support-spacing": {
    formula: "by wiring method: EMT secure within 36 in, support every 10 ft (358.30); NM within 12 in, every 4.5 ft (334.30); MC within 12 in, every 6 ft (330.30); AC within 12 in, every 4.5 ft (320.30); RMC/PVC intervals vary with trade size.",
    edition: "Securing and supporting sections of NEC 2023 Chapter 3 (320.30, 330.30, 334.30, 344.30, 352.30, 358.30), by name.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. RMC and PVC maximum intervals vary with trade size (the size-specific tables govern); some methods have securing exceptions (fishing, terminations).",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Per-method intervals", value: "EMT 3 ft / 10 ft; NM 12 in / 4.5 ft; MC 12 in / 6 ft; AC 12 in / 4.5 ft", source: "NEC 358.30, 334.30, 330.30, 320.30" },
      { name: "Size-dependent conduit", value: "RMC (344.30(B)(2)) and PVC (352.30) maximum intervals increase with trade size", source: "NEC Tables 344.30(B)(2) and 352.30" },
    ],
  },
  "motor-branch-protection": {
    formula: "max_ocpd = FLC x Table 430.52 multiplier (inverse-time breaker 250%, dual-element fuse 175%, nontime-delay fuse 300%, instantaneous-trip breaker 800%); round up to the next standard size (240.6) per 430.52(C)(1) Exception 1; min disconnect = 1.15 x FLC (430.110).",
    edition: "Motor branch-circuit short-circuit and ground-fault protection, NEC 2023 430.52 and Table 430.52, with the disconnect ampere rating 430.110, by name.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. The table value uses the table FLC (430.6(A)), not nameplate, and protects against short-circuit/ground-fault only; motor overload is sized separately (430.32).",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Table 430.52 multipliers", value: "inverse-time breaker 250%, dual-element/time-delay fuse 175%, nontime-delay fuse 300%, instantaneous-trip breaker 800% (squirrel-cage/induction)", source: "NEC Table 430.52" },
      { name: "Round-up and disconnect", value: "430.52(C)(1) Exception 1 permits the next standard size (240.6); the disconnect is rated at least 115% of FLC (430.110(A))", source: "NEC 430.52(C)(1), 430.110(A)" },
    ],
  },
  "commercial-lighting-load": {
    formula: "lighting_va = area x unit load (Table 220.12); recep_va = straps x 180 VA (220.14(I)); recep_demand = recep_va <= 10 kVA ? recep_va : 10000 + 0.50 x (recep_va - 10000) (220.44); total = lighting + recep_demand; amps = total / V.",
    edition: "Commercial general-lighting and receptacle load, NEC 2023 Table 220.12, 220.14(I), and 220.44, by name.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. The 125% continuous-lighting factor is applied at the OCPD (210.20(A)), not here; the energy code may set the lighting unit load.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Unit and strap loads", value: "the general-lighting unit load is from Table 220.12 by occupancy; each general-use receptacle strap counts at 180 VA", source: "NEC Table 220.12, 220.14(I)" },
      { name: "Receptacle demand", value: "100% of the first 10 kVA of receptacle load plus 50% of the remainder", source: "NEC 220.44" },
    ],
  },
  "noncoincident-load": {
    formula: "counted = both_can_run ? load_a + load_b : max(load_a, load_b); omitted = both_can_run ? 0 : min(load_a, load_b).",
    edition: "Noncoincident loads, NEC 2023 220.60, with the simultaneous-operation exception, by name.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. Where two loads are unlikely to be in use at the same time, only the larger is counted; the exception adds both where they operate together (a heat-pump compressor with supplemental strip heat).",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Larger-of rule", value: "the smaller of two noncoincident loads is omitted from the service/feeder calculation", source: "NEC 220.60" },
      { name: "Simultaneous exception", value: "both loads are counted where they can operate at the same time; the AHJ judges noncoincidence", source: "NEC 220.60 exception" },
    ],
  },
  "pv-circuit-ampacity": {
    formula: "max_current = Isc x strings x 1.25 (690.8(A)(1)); min_ampacity = max_current x 1.25 (690.8(B)(1)); the factors stack to 1.5625 (156%) of Isc, before conditions-of-use derate; also size for 690.8(B)(2) and take the greater.",
    edition: "PV source/output-circuit current and conductor ampacity, NEC 2023 690.8(A) and 690.8(B), by name.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. The two 125% factors stack to 156% of Isc; the conductor must also satisfy 690.8(B)(2) after temperature/conduit conditions of use, and the greater of (B)(1) and (B)(2) governs.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Maximum current", value: "rated Isc times the number of paralleled source circuits times 125%", source: "NEC 690.8(A)(1)" },
      { name: "Minimum ampacity", value: "the maximum current times another 125% before any conditions-of-use adjustment", source: "NEC 690.8(B)(1)" },
    ],
  },
  "transformer-k-factor": {
    formula: "K = sum(Ih^2 x h^2) / sum(Ih^2) over h = 1,3,5,7,9,11,13 with harmonics in per-unit of the fundamental; round up to the next standard K-rating (K-1, K-4, K-9, K-13, K-20, K-30, K-40).",
    edition: "Transformer K-factor for nonlinear loads, UL 1561 and IEEE C57.110, by name.",
    freeAccess: "The K-factor weights each harmonic by the square of its order; a near-linear load (K close to 1) needs no K-rated transformer. The measured spectrum and the manufacturer govern the final selection.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (UL 1561 / IEEE C57.110 K-factor convention; refresh as the standards revise).",
    assumptions: [
      { name: "K-factor definition", value: "sum of (per-unit harmonic current squared times harmonic order squared) divided by the sum of (per-unit harmonic current squared)", source: "UL 1561 / IEEE C57.110" },
      { name: "Standard K-ratings", value: "the tabulated ladder K-1 (standard) / K-4 / K-9 / K-13 / K-20 / K-30 / K-40", source: "UL 1561" },
    ],
  },
  "motor-capacitor-max": {
    formula: "magnetizing_kvar = sqrt(3) x V_ll x I_no-load / 1000; max_capacitor_kvar = safety_factor x magnetizing_kvar (default 0.90).",
    edition: "Maximum motor-terminal capacitor to avoid self-excitation, NEMA MG-1 and IEEE 18, by name.",
    freeAccess: "A capacitor switched with a motor must stay below the motor's magnetizing (no-load) kVAR, or the coasting motor can self-excite into a damaging overvoltage. The manufacturer's max-kVAR table by HP and speed governs.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (NEMA MG-1 / IEEE 18 self-excitation limit; refresh as the standards revise).",
    assumptions: [
      { name: "Magnetizing kVAR", value: "the three-phase no-load reactive power sqrt(3) x V x I_no-load / 1000 is the self-excitation ceiling", source: "NEMA MG-1 / IEEE 18" },
      { name: "Safety margin", value: "the recommended terminal capacitor is a fraction (default 0.90) of the magnetizing kVAR; keep the smaller of this and the target-PF size", source: "manufacturer convention" },
    ],
  },
  "bends-between-pulls": {
    formula: "total_deg = sum of the entered bend angles; quarter_bends_eq = total_deg / 90; verdict: total_deg <= 360 within limit, else insert a pull point.",
    edition: "Maximum bends between pull points (360 degrees / four quarter bends), NEC 2023 358.26 and the matching Chapter 3 .26 sections, by name.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. No run between pull points may contain more than 360 degrees of total bend; an offset counts both of its bends and a saddle all three.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "360-degree limit", value: "the sum of all bends between pull points (boxes, conduit bodies, fittings) may not exceed 360 degrees", source: "NEC 358.26 and matching .26 sections" },
      { name: "Bend counting", value: "an offset = its two bends, a saddle = its three bends; equivalent quarter bends = total / 90", source: "NEC Chapter 3 raceway articles" },
    ],
  },
  "shock-approach-boundary": {
    formula: "lookup by nominal phase-to-phase AC voltage band: limited approach (exposed movable conductor vs exposed fixed circuit part) and restricted approach; below 50 V no boundary is specified.",
    edition: "AC shock approach boundaries, NFPA 70E-2024 Table 130.4, by name.",
    freeAccess: "NFPA 70E is free to read at nfpa.org/freeaccess. These are shock boundaries only; the arc-flash boundary is a separate determination. Crossing the restricted approach requires a qualified person, an energized-work permit, and shock PPE.",
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (NFPA 70E-2024 Table 130.4; refresh on the next 70E cycle).",
    assumptions: [
      { name: "Limited approach", value: "the boundary an unqualified person must not cross; the larger distance applies to an exposed movable conductor, the smaller to an exposed fixed circuit part", source: "NFPA 70E Table 130.4" },
      { name: "Restricted approach", value: "the boundary requiring a qualified person, an energized-work permit, and shock PPE to cross", source: "NFPA 70E Table 130.4" },
    ],
  },
  "pool-bonding-680-26": {
    formula: "returns the 680.26(B) bonded-component list by pool type (pool shell/rebar, 3 ft perimeter, underwater forming shells, metal fittings >= 1 in, pump motor, metal piping/awnings/fences within 5 ft, listed water bond >= 9 sq in) with the #8 AWG solid copper minimum.",
    edition: "Swimming-pool equipotential bonding, NEC 2023 680.26, by name.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. The equipotential grid ties the listed conductive parts to the same potential and need not run to a remote grounding electrode; connections are listed and irreversible.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Bonded components", value: "the 680.26(B) list: pool shell/rebar, perimeter within 3 ft, metal structure, underwater forming shells, metal fittings 1 in and larger, electrical equipment, metal piping within 5 ft, and the listed water bond (680.26(C))", source: "NEC 680.26(B),(C)" },
      { name: "Conductor", value: "solid copper #8 AWG minimum; the grid is equipotential", source: "NEC 680.26(B)" },
    ],
  },
  "mixed-water-temp": {
    formula: "T_blend = (Qh*Th + Qc*Tc)/(Qh+Qc); inverse hot fraction = (T_target - Tc)/(Th - Tc); hot:cold ratio = (T_target - Tc)/(Th - T_target).",
    edition: "First-principles mixing energy balance for blending hot and cold potable water; the delivery-temperature limits follow the ASSE 1017 (master tempering) and ASSE 1016/1070 (point-of-use scald-guard) device standards and the IPC/UPC scald provisions, by name.",
    freeAccess: "Public first-principles energy balance. The listed mixing valve and the AHJ govern the installed setpoint.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (first-principles mixing). Scald limits: <= 120 F at the fixture, <= 110 F for showers/tub fills (ASSE guards).",
    assumptions: [
      { name: "Same fluid", value: "hot and cold are the same fluid (water); the balance is by flow-weighted temperature", source: "first principles" },
    ],
  },
  "pressure-tank-drawdown": {
    formula: "Diaphragm-tank drawdown by Boyle's law on absolute pressures: drawdown = V_tank * (P_pre_abs/P_in_abs - P_pre_abs/P_out_abs), P_abs = P_gauge + 14.7, precharge ~ cut-in - 2 psi. Runtime = drawdown / pump_gpm; size mode inverts for V_tank.",
    edition: "Pressure-tank drawdown from Boyle's law on the diaphragm air charge and the anti-short-cycle minimum-runtime rule (about 1 min per cycle), per the published pump/tank engineering practice (Amtrol/WellMate and the WQA references), by name; first-principles gas law.",
    freeAccess: "First-principles gas law. The pump manufacturer's minimum runtime and the installed precharge govern.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (Boyle's law). Precharge defaults to cut-in minus 2 psi, the standard diaphragm-tank rule, and is flagged.",
    assumptions: [
      { name: "Precharge", value: "cut-in minus 2 psi unless overridden; a precharge at or above cut-in will not draw down", source: "diaphragm-tank practice" },
    ],
  },
  "pipe-velocity": {
    formula: "Continuity: v (ft/s) = 0.4085 * gpm / d^2 (d = actual inside diameter, in); inverse gpm = v * d^2 / 0.4085.",
    edition: "Pipe-flow velocity from continuity (v = 0.4085*gpm/d^2) and the copper erosion-corrosion velocity limits (about 5 ft/s hot, 8 ft/s cold) per the Copper Development Association / ASTM and ASPE plumbing-design guidance, by name; first-principles.",
    freeAccess: "Public first-principles continuity. Actual inside diameter (not nominal) governs; the material erosion-corrosion ceiling is the design limit.",
    governance: GOVERNANCE.plumbing,
    editionNote: "Single-edition (continuity). Copper ceiling about 5 ft/s hot, 8 ft/s cold; the hot/cold service is a labeled toggle. Pairs with pipe-sizing and friction-loss.",
    assumptions: [
      { name: "Inside diameter", value: "the actual bore for the material/size, not the nominal size", source: "ASTM pipe dimension tables" },
    ],
  },
  "wsfu-demand": {
    formula: "gpm = interpolate(curve, wsfu): piecewise-linear between published [WSFU, GPM] breakpoints for the selected system type (flush tank or flush valve). Flush-valve systems peak higher at low WSFU.",
    edition: "Hunter's curve (NBS BMS65, Methods of Estimating Loads in Plumbing Systems) and IPC 2021 Appendix E (Table E103.3(2)) by name; the curve ships as editable breakpoints, not a transcribed table.",
    freeAccess: "IPC 2021 free read-only at codes.iccsafe.org; NBS BMS65 is public-domain (US government). The bundled curve is an editable approximation to tune to the published table.",
    governance: GOVERNANCE.general,
    editionNote: "The bundled flush-tank and flush-valve curves are editable approximations of Hunter's curve; tune to IPC Table E103.3(2). The output is the design demand, not a metered actual.",
    assumptions: [
      { name: "Demand curve", value: "editable [WSFU, GPM] breakpoints per system type; tune to IPC Appendix E", source: "Hunter's curve / IPC 2021 Appendix E" },
    ],
  },
  "supply-pressure-budget": {
    formula: "elevation_loss = fixture_height * 0.433; available = street_pressure - elevation_loss - meter_loss - bfp_loss - friction_loss; headroom = available - fixture_min; adequate = headroom >= 0. 0.433 psi per foot of water column.",
    edition: "IPC 2021 Section 604 and the ASPE Plumbing Engineering Design Handbook Vol. 2 by name; first-principles pressure budget.",
    freeAccess: "IPC 2021 free read-only at codes.iccsafe.org; the 0.433 psi/ft water-column constant is public.",
    governance: GOVERNANCE.general,
    editionNote: "Use the minimum recorded street pressure. Flush-valve / tankless fixtures need 15-25 psi vs ~8 psi for a tank fixture. IPC 604 caps static pressure at 80 psi (a PRV is required above it and adds its own loss).",
    assumptions: [
      { name: "Water column", value: "0.433 psi per foot of elevation", source: "physical fact (water density)" },
      { name: "Fixture minimum default", value: "8 psi (tank fixture); 15-25 psi flush valve / tankless", source: "IPC 604 / fixture manufacturer" },
    ],
  },
  "roof-drain-sizing": {
    formula: "gpm = roof_area x rainfall_rate x 0.0104 (GPM per ft^2 per in/hr); leader_in = smallest pipe in the vertical-leader table with capacity >= gpm; horiz_in = smallest pipe in the slope table with capacity >= gpm.",
    edition: "IPC 2021 Section 1106 (Tables 1106.2 vertical conductors, 1106.3 horizontal storm drains by slope, 1106.6 roof drains) by name; the capacity tables ship as editable conservative breakpoints, not a transcribed table.",
    freeAccess: "IPC 2021 free read-only at codes.iccsafe.org; the 0.0104 GPM-per-(ft^2 x in/hr) constant is public. The bundled capacity tables are editable approximations to tune to the published edition.",
    governance: GOVERNANCE.general,
    editionNote: "Rainfall rate is the locale-specific 100-year / 1-hour value from IPC Figure 1106.1, not a national default. Sloped, vertical, and parapet walls add contributing area per IPC 1106.4. Overflow drains and scuppers (IPC 1107) are a separate required path this tile does not size.",
    assumptions: [
      { name: "Storm-flow constant", value: "0.0104 GPM per ft^2 per in/hr of design rainfall", source: "IPC 2021 Section 1106 basis" },
      { name: "Capacity tables", value: "editable [size, GPM] breakpoints for the vertical leader and the horizontal storm drain at each slope; tune to IPC Tables 1106.2 / 1106.3 / 1106.6", source: "IPC 2021 Section 1106" },
    ],
  },
  "sump-basin-sizing": {
    formula: "area_ft2 = (PI/4)(basin_dia/12)^2; drawdown_gal = area_ft2 x (drawdown_in/12) x 7.48; run_time_s = drawdown_gal / (pump_gpm - inflow_gpm) x 60; fill_time_s = drawdown_gal / inflow_gpm x 60; cycles_per_hr = 3600 / (run + fill); adequate = run_time_s >= min_run_s.",
    edition: "IPC 2021 Section 712 (Sumps and Ejectors) and the Hydraulic Institute pump-cycling guidance by name; first-principles basin geometry and cycle math.",
    freeAccess: "IPC 2021 free read-only at codes.iccsafe.org; the 7.48 gal/ft^3 constant is public.",
    governance: GOVERNANCE.general,
    editionNote: "The pump must out-pace the inflow (the tile errors if it does not). A longer run time per cycle is gentler on the motor. A sewage ejector must pass 2 in solids and carries a vent, neither of which this tile sizes (IPC 712.3-712.4).",
    assumptions: [
      { name: "Volume constant", value: "7.48 gal per ft^3", source: "physical fact" },
      { name: "Minimum run default", value: "60 s per cycle (Hydraulic Institute cycling guidance)", source: "Hydraulic Institute / pump manufacturer" },
    ],
  },
  "gas-appliance-demand": {
    formula: "total_btuh = sum(appliance input ratings); cfh = total_btuh / heating_value. Default heating values: 1,000 BTU/ft^3 natural gas, 2,516 BTU/ft^3 propane (editable).",
    edition: "IFGC 2021 Section 402 (402.2 connected load) and NFPA 54 (National Fuel Gas Code) by name; first-principles energy-to-volume conversion.",
    freeAccess: "IFGC 2021 free read-only at codes.iccsafe.org; NFPA 54 free read-only at nfpa.org/freeaccess. Heating values are public physical data.",
    governance: GOVERNANCE.general,
    editionNote: "Fuel-gas piping is sized for the full connected load (no diversity) unless the AHJ accepts a demand factor (IFGC 402.2). The default heating values are editable; propane delivers more energy per cubic foot, so the same BTU load is fewer CFH.",
    assumptions: [
      { name: "Heating value", value: "1,000 BTU/ft^3 natural gas, 2,516 BTU/ft^3 propane (editable)", source: "IFGC / NFPA 54 standard values" },
      { name: "Full connected load", value: "no diversity unless an approved demand factor applies", source: "IFGC 2021 Section 402.2" },
    ],
  },
  "tpr-discharge": {
    formula: "rating_ok = valve_rating >= heater_input; discharge_in = valve outlet (never reduced). Output is a pass/fail and the IPC 504.6 discharge checklist, not a continuous quantity.",
    edition: "IPC 2021 Section 504 (504.4 valve rating vs heater input, 504.6 discharge piping) and ANSI Z21.22 / CSA 4.4 by name; first-principles comparison.",
    freeAccess: "IPC 2021 free read-only at codes.iccsafe.org. The discharge requirements are public code text.",
    governance: GOVERNANCE.general,
    editionNote: "An undersized or missing T&P valve is the top water-heater safety failure. The discharge pipe is the full valve outlet, never reduced, and serves no other valve (IPC 504.6). A replacement valve must match the heater's input and working pressure (ANSI Z21.22).",
    assumptions: [
      { name: "Discharge size", value: "the full valve outlet (typ. 3/4 in), never reduced", source: "IPC 2021 Section 504.6" },
      { name: "Rating rule", value: "valve marked relief capacity >= heater input rating", source: "IPC 2021 Section 504.4 / ANSI Z21.22" },
    ],
  },
  "pipe-support-spacing": {
    formula: "max_spacing = lookup(table, material, size, orientation); hangers = ceil(run_length / max_spacing) + 1 (both ends plus interior supports).",
    edition: "IPC 2021 Table 308.5 (hanger spacing) and MSS SP-58 by name; the spacing table ships as editable breakpoints by material and size.",
    freeAccess: "IPC 2021 free read-only at codes.iccsafe.org. The spacing values are an editable approximation to tune to the adopted edition.",
    governance: GOVERNANCE.general,
    editionNote: "Plastic pipe supports closer than metal and needs continuous support or mid-story guides on vertical runs. The table values are maximums - closer is always allowed and required near valves, heavy fittings, and changes of direction. Vertical piping is also supported at each floor/story (IPC 308.5).",
    assumptions: [
      { name: "Spacing table", value: "editable [material, max_size_in, horiz_ft, vert_ft] per IPC Table 308.5", source: "IPC 2021 Table 308.5 / MSS SP-58" },
      { name: "Hanger count", value: "ceil(run / max_spacing) + 1 (both ends plus interior)", source: "first-principles" },
    ],
  },
  "softener-sizing": {
    formula: "comp_hardness = hardness_gpg + iron_ppm x 4; daily_gal = people x use_per_cap; grain_load = daily_gal x comp_hardness; days_between = floor(capacity / grain_load); annual_salt = salt_per_regen x (365 / days_between). 1 gpg = 17.1 ppm.",
    edition: "NSF/ANSI 44 and the Water Quality Association (WQA) hardness/iron-compensation practice by name; first-principles ion-exchange grain budget.",
    freeAccess: "NSF/ANSI 44 is a published consensus standard (NSF International). The hardness conversion (1 gpg = 17.1 ppm) and the WQA iron compensation are public.",
    governance: GOVERNANCE.general,
    editionNote: "Dissolved iron, manganese, and high TDS each raise the effective load and may exceed a softener's rating (pre-treatment may be required). A higher salt dose buys more capacity per cubic foot at lower salt efficiency. The capacity used must match the dose the control valve is programmed for (NSF/ANSI 44).",
    assumptions: [
      { name: "Iron compensation", value: "~4 gpg of hardness added per ppm of dissolved iron", source: "Water Quality Association practice" },
      { name: "Default water use", value: "75 gal per person per day", source: "standard residential design figure" },
    ],
  },
  "cg-load-share": {
    formula: "load_p1 = W x (span - d1) / span; load_p2 = W x d1 / span; imbalance_pct = |load_p1 - load_p2| / W x 100; cg_outside flags d1 < 0 or d1 > span.",
    edition: "ASME B30.9 (Slings) and ITI rigging practice by name; first-principles statics (moment balance about a pick point).",
    freeAccess: "ASME B30.9 is a published consensus standard. The moment-balance statics are public.",
    governance: GOVERNANCE.rigging,
    editionNote: "Size the heavier sling, shackle, and hook to the higher leg, not the average. A CG outside the two pick points tips the load; re-rig. The published or estimated weight is only as good as its source.",
    assumptions: [
      { name: "Statics", value: "rigid load, two pick points, moment balance", source: "first-principles" },
    ],
  },
  "crane-net-capacity": {
    formula: "net = gross_chart - hook_block - jib - wire_rope; total_hook = load + below_hook; pct_of_net = total_hook / net x 100; flags at 75 / 90 / 100%.",
    edition: "OSHA 29 CFR 1926.1417(o) deduction stack and ASME B30.5 (Mobile and Locomotive Cranes) by name; arithmetic on chart numbers.",
    freeAccess: "OSHA 1926 Subpart CC is free at osha.gov. The capacity numbers come from the manufacturer's load chart.",
    governance: GOVERNANCE.rigging,
    editionNote: "The chart, the configuration (boom length, radius, outrigger spread, counterweight), and a qualified operator govern. Structural-vs-stability ratings and an out-of-level deration live on the chart. The 75 / 90 / 100% values are planning flags, not a substitute for the chart.",
    assumptions: [
      { name: "Deduction stack", value: "hook block / overhaul ball, erected jib, and wire-rope deduction per the chart", source: "OSHA 1926.1417(o)" },
      { name: "Flags", value: "75% critical / engineered, 90% margin gone, 100% over chart (STOP)", source: "rigging planning practice" },
    ],
  },
  "crane-ground-bearing": {
    formula: "gbp = reaction / bearing_area; required_area = reaction / allowable; mat_side = sqrt(required_area); pass = gbp <= allowable.",
    edition: "OSHA 29 CFR 1926 Subpart CC and the manufacturer's outrigger-reaction chart by name; first-principles pressure = force / area.",
    freeAccess: "OSHA 1926 Subpart CC is free at osha.gov. Allowable soil bearing comes from a geotechnical source.",
    governance: GOVERNANCE.rigging,
    editionNote: "The maximum reaction comes from the outrigger-reaction chart for the lift quadrant, not the static average. Allowable soil bearing must come from a geotech source; voids, backfill, frost, slopes, and adjacent excavations reduce capacity, and a qualified person verifies the setup.",
    assumptions: [
      { name: "Pressure", value: "reaction divided by float / track contact area", source: "first-principles" },
      { name: "Mat size", value: "square mat side = sqrt(reaction / allowable)", source: "first-principles" },
    ],
  },
  "sling-d-d-efficiency": {
    formula: "ratio = bend_dia / sling_dia; efficiency interpolated from the WRTB 6x19 / 6x37 D/d curve (1->0.50 ... 25+ ->1.00); reduced_wll = rated_wll x efficiency.",
    edition: "Wire Rope Technical Board Wire Rope Users Manual (D/d bend efficiency) and ASME B30.9 by name; the curve ships as editable breakpoints.",
    freeAccess: "The WRTB D/d efficiency curve is published guidance; ASME B30.9 is a consensus standard.",
    governance: GOVERNANCE.rigging,
    editionNote: "The bundled curve is for 6x19 / 6x37 wire-rope slings; synthetic round and web slings follow their own bend factors. The rated WLL is the catalog straight-pull value; the sling-angle factor and any choker reduction apply on top. A damaged or kinked sling is removed from service.",
    assumptions: [
      { name: "D/d curve", value: "editable [ratio, efficiency] breakpoints for 6x19 / 6x37 wire rope", source: "WRTB Wire Rope Users Manual" },
    ],
  },
  "wind-on-load": {
    formula: "q = 0.00256 x V^2 (ASCE velocity-pressure constant); wind_lb = q x sail_area x shape_coef; swing_deg = atan(wind_lb / load_weight) x 180 / pi.",
    edition: "ASCE 7 velocity-pressure constant (the same 0.00256 the wind-pressure tile uses) and OSHA 1926 Subpart CC by name; first-principles.",
    freeAccess: "The 0.00256 velocity-pressure constant is public (ASCE 7). OSHA 1926 Subpart CC is free at osha.gov.",
    governance: GOVERNANCE.rigging,
    editionNote: "Large-area, light loads swing the most and are the most dangerous. The manufacturer's maximum permissible in-service wind speed and the load chart's wind / area limits govern - many large lifts shut down well below storm wind. Gusts exceed the sustained number.",
    assumptions: [
      { name: "Velocity pressure", value: "q = 0.00256 V^2 (V in mph, q in psf)", source: "ASCE 7" },
      { name: "Shape coefficient", value: "flat panel ~1.2-2.0 (default 1.6)", source: "ASCE 7 force coefficients" },
    ],
  },
  "tagline-force": {
    formula: "tag_tension = lateral_force / cos(angle); handlers = ceil(tag_tension / per_person); mechanical_help when tag_tension > 2 x per_person.",
    edition: "OSHA 1926 Subpart CC and standard rigging practice by name; first-principles statics on the tag-line geometry.",
    freeAccess: "OSHA 1926 Subpart CC is free at osha.gov. The geometry is public.",
    governance: GOVERNANCE.rigging,
    editionNote: "A tag line at a shallow angle to horizontal pulls far harder than the lateral force it resists. Tag lines control rotation and position; they do not arrest a falling load. Handlers stand clear of the swing path, and 50 lb sustained per person is a planning default.",
    assumptions: [
      { name: "Per-person pull", value: "50 lb safe sustained pull per handler (planning default)", source: "rigging planning practice" },
    ],
  },
  "tandem-lift-share": {
    formula: "share_c1 = W x (span - cg) / span; share_c2 = W x cg / span; allow = net_chart x derate / 100; pass when each share <= its derated allowable.",
    edition: "ASME B30.5 and OSHA 1926 Subpart CC by name; the cg-load-share statics plus a per-crane tandem derate.",
    freeAccess: "OSHA 1926 Subpart CC is free at osha.gov; ASME B30.5 is a consensus standard. The capacities come from each crane's load chart.",
    governance: GOVERNANCE.rigging,
    editionNote: "A designated lift director controls a tandem lift. The 75% derate is a common planning default; the engineered lift plan or the more restrictive manufacturer guidance governs. Load shift during travel, boom-to-load geometry, and out-of-level change the share in real time.",
    assumptions: [
      { name: "Tandem derate", value: "75% of each crane's net chart capacity (planning default)", source: "rigging planning practice" },
    ],
  },
  "shackle-eyebolt-wll": {
    formula: "derated_capacity = rated_wll x derate(angle, hardware); pass = derated_capacity >= leg_load. Shackle side-load 0->1.00 / 45->0.70 / 90->0.50; shoulder eye bolt 0->1.00 / 15->0.75 / 30->0.55 / 45->0.30 / 60+ ->0.15. MBS = rated_wll x design_factor (5:1).",
    edition: "ASME B30.26 (Rigging Hardware) and ASME B18.15 / manufacturer eye-bolt data by name; the angular derate curves ship as editable approximations.",
    freeAccess: "ASME B30.26 is a published consensus standard. The angular derate follows the manufacturer's chart.",
    governance: GOVERNANCE.rigging,
    editionNote: "Shackles are loaded in line through the bow and pin; a side load follows the reduced chart. An eye bolt pulled at an angle can lose more than half its rating, and an angular pull on a plain (non-shoulder) eye bolt is not permitted. The 5:1 design factor is on the WLL.",
    assumptions: [
      { name: "Derate curves", value: "editable [angle, factor] breakpoints per hardware type", source: "ASME B30.26 manufacturer charts" },
      { name: "Design factor", value: "5:1 on the WLL (reported as MBS)", source: "ASME B30.26 / B30.9" },
    ],
  },
  "spreader-beam": {
    formula: "sling_angle = atan(top_height / (bar_length/2)); top_sling_tension = (load/2)/sin(angle); bar_compression = (load/2)/tan(angle); beam_moment = (load/2)(bar_length/2); headroom = top_height.",
    edition: "ASME BTH-1 (Design of Below-the-Hook Lifting Devices) and ASME B30.20 by name; first-principles statics.",
    freeAccess: "ASME BTH-1 and B30.20 are published consensus standards. The statics are public.",
    governance: GOVERNANCE.rigging,
    editionNote: "A spreader bar carries axial compression - check it for buckling, not just stress. A lifting beam needs more headroom but lets the slings hang vertical. Both are engineered below-the-hook devices marked with a rated capacity; the rating plate governs. This tile sizes the demand, not the device.",
    assumptions: [
      { name: "Load split", value: "load split equally to two end pick points (W/2 each)", source: "first-principles" },
    ],
  },
  "forklift-capacity-derate": {
    formula: "net_capacity = rated_cap x rated_lc / actual_lc (data-plate method); pass = load <= net_capacity; margin_pct = (net_capacity - load) / net_capacity x 100.",
    edition: "ASME B56.1 (Powered Industrial Trucks) and the truck data plate by name; the data-plate load-center method.",
    freeAccess: "ASME B56.1 is a published consensus standard. The capacity comes from the truck's data plate.",
    governance: GOVERNANCE.rigging,
    editionNote: "The truck's capacity plate is the legal rating, and an attachment changes the plate - a derated plate must be fitted by the dealer. Raising the load, tilting forward, soft ground, and grade all reduce real capacity further. A CG beyond the rated load center tips the truck forward.",
    assumptions: [
      { name: "Rated load center", value: "data-plate value (commonly 24 in)", source: "ASME B56.1 / data plate" },
    ],
  },
  "roller-jack-force": {
    formula: "roll_force = load x roll_coef x cos(incline); grade_force = load x sin(incline); push_steady = roll_force + grade_force; push_breakaway = push_steady x 1.5; skates = ceil(load / skate_cap).",
    edition: "Standard machinery-moving practice (rolling resistance + grade) by name; first-principles.",
    freeAccess: "The rolling-resistance and grade statics are public physics. Skate capacities come from the manufacturer.",
    governance: GOVERNANCE.rigging,
    editionNote: "The rolling coefficient depends on the skate, floor, and debris - a single chip stops the move. On any grade the load wants to run away and must be controlled with a winch or come-along on the downhill side. Verify the floor's own capacity for the concentrated wheel load.",
    assumptions: [
      { name: "Rolling coefficient", value: "steel roller ~0.01, machinery skate ~0.02-0.05 (default 0.03)", source: "machinery-moving practice" },
      { name: "Breakaway factor", value: "1.5x the steady push (startup / stiction)", source: "machinery-moving practice" },
    ],
  },
  "chain-lever-hoist": {
    formula: "hand_pull = load / (mech_adv x efficiency); hand_chain_travel = lift x mech_adv; pass = load <= rated_wll.",
    edition: "ASME B30.16 (Overhead Hoists) and ASME B30.21 (Lever Hoists) by name; first-principles mechanical advantage with a drivetrain efficiency.",
    freeAccess: "ASME B30.16 and B30.21 are published consensus standards. The mechanical-advantage relation is public.",
    governance: GOVERNANCE.rigging,
    editionNote: "ASME B30.16 / B30.21 limit the effort one person may apply - a load that needs a cheater bar or a second person on the lever is overloaded, stop. The rated WLL is the ceiling regardless of leverage. The load drops fast if the brake is defeated.",
    assumptions: [
      { name: "Drivetrain efficiency", value: "0.85 default (gear + chain-fall losses)", source: "hoist manufacturer data" },
    ],
  },
  "block-redirect-load": {
    formula: "resultant = 2 x line_tension x sin(direction_change / 2). A 180-degree turn doubles the line tension on the anchor.",
    edition: "ASME B30.26 and standard rigging statics by name; first-principles vector resultant.",
    freeAccess: "The vector-resultant statics are public. The block's rated capacity comes from the manufacturer.",
    governance: GOVERNANCE.rigging,
    editionNote: "A block that turns the line 180 degrees sees twice the line tension on its anchor - size the block, the anchor sling, and the attachment point for the resultant, not the line tension. The block's rated capacity is for the resultant load. Shock loading multiplies this further.",
    assumptions: [
      { name: "Resultant", value: "2 x line tension x sin(direction change / 2)", source: "first-principles statics" },
    ],
  },
  "soil-swell-shrink": {
    formula: "loose = bank x (1 + swell/100); load_factor = 1/(1 + swell/100); compacted = bank x (1 - shrink/100); fill_shortage = bank - compacted.",
    edition: "Caterpillar Performance Handbook soil-conversion method (swell / shrinkage / load factor) by name; first-principles volume conversion.",
    freeAccess: "The swell / shrinkage / load-factor concept is published earthmoving practice. The percentages come from the geotech report or a published soil table.",
    governance: GOVERNANCE.general,
    editionNote: "Swell and shrinkage are soil properties, not constants - wet clay, dry sand, and shot rock differ widely. The load factor converts a loose truck ticket back to bank yards for earned-quantity payment. Compaction to a spec is verified in the field, not assumed.",
    assumptions: [
      { name: "Soil percentages", value: "swell (sand ~12, common earth ~25, clay ~30, rock ~50+) and shrinkage (~10-20) from the geotech report", source: "Caterpillar Performance Handbook / geotech" },
    ],
  },
  "haul-cycle-production": {
    formula: "cycle = load + haul + dump + return + spot; loads_per_hour = working_min / cycle; production = truck_cap x loads_per_hour; trucks = ceil(cycle / load); fleet = production x trucks.",
    edition: "Caterpillar Performance Handbook cycle-time production-estimating method by name; first-principles cycle arithmetic.",
    freeAccess: "The cycle-time production method is published earthmoving practice.",
    governance: GOVERNANCE.general,
    editionNote: "The 50-minute hour is a planning default, not a guarantee. Haul and return times grow with distance, grade, and traffic. The matched truck count keeps the loader working: one short idles the loader, one over queues the trucks.",
    assumptions: [
      { name: "Working minutes", value: "50-minute hour (efficiency factor for real-world delays)", source: "Caterpillar Performance Handbook" },
      { name: "Spot time", value: "0.5 min to spot under the loader (default)", source: "earthmoving practice" },
    ],
  },
  "dewatering-rate": {
    formula: "drawdown_gal = pit_len x pit_wid x drawdown x 7.48052; pump_gpm = drawdown_gal / drawdown_min + inflow; sized_gpm = pump_gpm x (1 + safety/100).",
    edition: "First-principles volume and pumping-rate arithmetic by name; defers total dynamic head to the pump-tdh tile.",
    freeAccess: "The 7.48 gal/ft^3 constant is exact and public. The inflow must be estimated from a pumping test.",
    governance: GOVERNANCE.general,
    editionNote: "The inflow is the number that actually matters and must be estimated from the soil, head, and a pumping test, not guessed. Discharge water is managed for sediment and permitted discharge. Dewatering changes effective stress and can destabilize the wall - a competent-person and engineering call.",
    assumptions: [
      { name: "Volume constant", value: "7.48052 gal per ft^3 (exact)", source: "physical fact" },
      { name: "Safety margin", value: "25% pump-sizing margin (default)", source: "pump-selection practice" },
    ],
  },
  "spoil-setback": {
    formula: "base_halfwidth = spoil_height / tan(repose); setback = max(min_setback, trench_depth); total_clear = setback + base_halfwidth.",
    edition: "OSHA 29 CFR 1926.651(j) (2 ft spoil setback) and Subpart P (protective systems) by name; first-principles geometry.",
    freeAccess: "OSHA 1926 Subpart P is free at osha.gov. The 2 ft minimum is code text.",
    governance: GOVERNANCE.general,
    editionNote: "2 ft is the absolute code minimum, not a design. A deep trench's failure wedge reaches about one trench depth back, so a surcharge pile inside that zone must be set back farther or the wall protected. The protective system is a competent-person decision under Subpart P.",
    assumptions: [
      { name: "Code minimum", value: "2 ft from the trench edge (OSHA 1926.651(j)(2))", source: "OSHA 29 CFR 1926.651(j)" },
      { name: "Angle of repose", value: "loose earth ~30-37 deg (default 34)", source: "soil mechanics" },
    ],
  },
  "pipe-bedding-backfill": {
    formula: "bedding_cy = width x (bedding/12) x length / 27; bedding_tons = bedding_cy x density; embed_area = width x od_ft - (pi/4) od_ft^2; embedment_cy = embed_area x length / 27; backfill_cy = width x cover x length / 27.",
    edition: "ASTM D2321 (installation of buried thermoplastic pipe) and the typical municipal bedding detail by name; first-principles take-off.",
    freeAccess: "ASTM D2321 is a published consensus standard. The take-off geometry is public.",
    governance: GOVERNANCE.general,
    editionNote: "The embedment zone is the structural support for a flexible pipe and is placed and compacted in lifts per ASTM D2321 / the project detail, not dumped. The bedding density is a loose stone estimate and the supplier's ticket governs the tonnage. The pipe-zone aggregate excludes the pipe's own volume.",
    assumptions: [
      { name: "Stone density", value: "1.4 tons per loose cy (default; supplier ticket governs)", source: "aggregate supplier data" },
      { name: "Pipe-zone subtraction", value: "embedment excludes (pi/4) x OD^2 (the pipe's cross-section)", source: "first-principles" },
    ],
  },
  "log-limb-weight": {
    formula: "volume = (pi/3) x length x (r1^2 + r1 r2 + r2^2) with r = dia/24 (frustum; cylinder when butt = top); weight = volume x green density.",
    edition: "USDA Forest Products Laboratory Wood Handbook green density by species by name; first-principles frustum volume.",
    freeAccess: "The FPL Wood Handbook is free (US government). The frustum volume is public geometry.",
    governance: GOVERNANCE.general,
    editionNote: "Green density varies with species, moisture, and season; the bundled values are representative, not exact - weigh or conservatively over-estimate. A tapered frustum is lighter than a cylinder of the butt diameter, so a cylinder estimate is the safe side. This is the static load that tree-rigging-shock multiplies.",
    assumptions: [
      { name: "Green density", value: "FPL green density by species (red oak 64, white pine 36, generic hardwood 58, etc., lb/ft^3)", source: "USDA FPL Wood Handbook" },
    ],
  },
  "tree-rigging-shock": {
    formula: "stretch = elong/100 x rope_length; peak_load = static x (1 + sqrt(1 + 2 x drop / stretch)); multiplier = peak / static. An energy / elastic-catch estimate.",
    edition: "Arborist rigging dynamic-loading research (Detter, Rust, Donzelli, named generically) and ANSI Z133-2017 by name; first-principles energy balance.",
    freeAccess: "The energy-balance shock-load relation is public mechanics. ANSI Z133-2017 is a published consensus standard.",
    governance: GOVERNANCE.worker_safety,
    editionNote: "This assumes an elastic catch and UNDERESTIMATES a hard snub on low-stretch rope or a metal-on-metal stop - a floor, not a ceiling. The fall factor (drop over rope length) is the lever. The rigging point, sling, block, and device must all be rated for the peak with their own safety factor. A truly static catch (zero stretch) is unbounded and errors.",
    assumptions: [
      { name: "Rope elongation", value: "dynamic-rated rope ~5-20% at the working load", source: "rope manufacturer data" },
      { name: "Elastic catch", value: "energy balance assuming a linear-elastic rope; a hard catch is worse", source: "arborist rigging research" },
    ],
  },
  "felling-notch-hinge": {
    formula: "notch_depth = dia x notch_pct/100 (default 22%); hinge_thick = dia x 0.10; hinge_width = dia x 0.80; open-face angle 70 deg or more.",
    edition: "ANSI Z133-2017 (Arboricultural Operations - Safety Requirements) open-face felling practice by name; standard faller guidance.",
    freeAccess: "ANSI Z133-2017 is a published consensus standard. The open-face geometry is standard faller practice.",
    governance: GOVERNANCE.worker_safety,
    editionNote: "These are starting dimensions for a sound, straight-grained stem on level ground - lean, rot, included bark, spring poles, and a nearby target all change the plan. The hinge holds and steers; it is never cut through. A bore cut requires training, a defined retreat path and a qualified faller are required by Z133, and a tree near a structure is a rigging or crane removal, not a fell.",
    assumptions: [
      { name: "Open-face defaults", value: "notch 20-25% of dia (default 22), hinge ~10%, width ~80%, open face 70 deg+", source: "ANSI Z133-2017 / faller practice" },
    ],
  },
  "porta-wrap-friction": {
    formula: "hold(n) = load x exp(-mu x n x 2 pi) for n = 1..4 wraps (capstan / Euler-Eytelwein equation). More wraps, exponentially less hand force.",
    edition: "Capstan (Euler-Eytelwein) friction equation and ANSI Z133-2017 by name; first-principles mechanics.",
    freeAccess: "The capstan equation is public physics. ANSI Z133-2017 is a published consensus standard.",
    governance: GOVERNANCE.worker_safety,
    editionNote: "More wraps means less hand force but a harder, slower release and more heat - too many can lock and shock the system on a moving piece. The load side is the piece's dynamic tension under control, not just its static weight, so pair with tree-rigging-shock. A groundie keeps hands clear of the device and never wraps a hand in the tail.",
    assumptions: [
      { name: "Friction coefficient", value: "rope-on-device ~0.20 (default; depends on device, rope, glaze, moisture)", source: "capstan friction practice" },
    ],
  },
  "chipper-debris": {
    formula: "chip_volume = green_weight / chip_density; loads = ceil(chip_volume / box_capacity).",
    edition: "First-principles green-weight to loose-chip-volume conversion by name; the scale ticket governs the density.",
    freeAccess: "The weight-to-volume conversion is public arithmetic.",
    governance: GOVERNANCE.general,
    editionNote: "Bulk chip density swings with species, moisture, chip size, and how heaped the box is - 500 to 600 lb per loose cy is a typical green range and the scale ticket governs. Chipped brush is much denser than brush piled loose. Logs hauled as rounds are weight, not chip volume.",
    assumptions: [
      { name: "Chip density", value: "550 lb per loose cy default (typical green range 500-600)", source: "chip-hauling practice" },
    ],
  },
  "nozzle-flow-pressure": {
    formula: "New flow = rated flow x sqrt(operating pressure / rated pressure); required pressure for a target flow = rated pressure x (target flow / rated flow)^2.",
    edition: "Nozzle-flow square-root relation (standard spray-nozzle hydraulics), by name; USDA / land-grant extension sprayer-calibration guidance.",
    freeAccess: "The square-root flow relation is public hydraulics. Extension calibration guidance free on land-grant university extension sites.",
    governance: GOVERNANCE.general,
    editionNote: "The product label is the law (FIFRA); your state lead agency governs. Pressure is a fine-tuning lever, not a rate knob.",
    assumptions: [
      { name: "Square-root flow law", value: "flow scales with the square root of pressure; doubling the flow needs about 4x the pressure and drives the droplets finer", source: "spray-nozzle hydraulics" },
      { name: "Flat-fan band", value: "a required pressure outside about 15 to 60 psi is flagged -- change to a different tip size instead", source: "extension calibration guidance" },
    ],
  },
  "spray-drift-buffer": {
    formula: "Buffer = base buffer x (wind / 10 mph) x (release height / reference height). Base buffer set by droplet class: Very Coarse 5, Coarse 10, Medium 20, Fine 40 ft (editable, representative).",
    edition: "USDA / land-grant extension drift-management guidance; EPA pesticide label and the Worker Protection Standard (40 CFR 170), by name.",
    freeAccess: "Extension drift-management guidance free on land-grant university extension sites. The label ships with the product.",
    governance: GOVERNANCE.pesticide,
    editionNote: "This is a RELATIVE planning aid, not the label's required buffer, which is the law (FIFRA). The droplet-class base buffers are editable representative values, not regulatory numbers.",
    assumptions: [
      { name: "Droplet-class base buffers", value: "5 / 10 / 20 / 40 ft for Very Coarse / Coarse / Medium / Fine at the 10 mph, 20 in reference; editable", source: "extension drift-management guidance" },
      { name: "Label governs", value: "do not spray toward a sensitive area, during a temperature inversion, or above the label's maximum wind speed; coarser droplets and a lower boom cut drift far more than any buffer", source: "EPA label / WPS 40 CFR 170" },
    ],
  },
  "sprayer-field-capacity": {
    formula: "Theoretical acres/hr = boom width x speed / 8.25; effective = theoretical x field efficiency; spray time = field acres / effective; acres per tank = tank / GPA; tanks = ceil(acres / acres per tank).",
    edition: "USDA / land-grant extension sprayer field-efficiency guidance, by name.",
    freeAccess: "Extension field-capacity and field-efficiency guidance free on land-grant university extension sites.",
    governance: GOVERNANCE.general,
    editionNote: "The product label is the law (FIFRA); your state lead agency governs. The field efficiency is an editable representative value.",
    assumptions: [
      { name: "8.25 divisor", value: "boom width (ft) x speed (mph) / 8.25 = theoretical acres per hour (the 5280 / 43560 unit constant)", source: "field-capacity arithmetic" },
      { name: "Default field efficiency", value: "70% (typical 60 to 80% for boom spraying); captures overlap, turns, and refill loss; editable", source: "extension field-efficiency guidance" },
    ],
  },
  "coating-coverage-dft": {
    formula: "theoretical = 1604 x (vol_solids/100) / dft; practical = theoretical x (1 - loss/100); gallons = area / practical; wft = dft / (vol_solids/100).",
    edition: "SSPC / AMPP PA 2 (dry-film thickness) and the 1604 ft^2-mil/gal coverage constant by name; first-principles film-build math.",
    freeAccess: "The 1604 coverage constant is exact public arithmetic. SSPC / AMPP PA 2 is a published consensus standard.",
    governance: GOVERNANCE.general,
    editionNote: "1604 is exact (a gallon spread one mil thick covers 1604 ft^2 at 100% solids). The product data sheet's volume-solids governs and thinning lowers it. 35% spray loss is a default. DFT is verified with a gauge per SSPC / AMPP PA 2, not assumed from the WFT. Multiple coats and touch-up are not in this single-coat number.",
    assumptions: [
      { name: "Coverage constant", value: "1604 ft^2-mil per gallon at 100% volume solids (exact)", source: "physical fact" },
      { name: "Application loss", value: "35% spray-loss default (varies with method and conditions)", source: "coatings practice" },
    ],
  },
  "abrasive-blast": {
    formula: "cfm = base_cfm(bore) x pressure/100; compressor_hp = cfm / 4; abrasive_lb_hr = base_lb_hr(bore) x pressure/100; abrasive_lb = area x lb_per_ft2; tons = lb / 2000.",
    edition: "SSPC / AMPP surface-preparation (SP) specifications and the nozzle manufacturer's air / abrasive chart by name; representative nozzle values at 100 psi.",
    freeAccess: "The SSPC / AMPP SP specifications are published consensus standards. The nozzle values come from the manufacturer's chart.",
    governance: GOVERNANCE.general,
    editionNote: "The bundled nozzle values are representative at 100 psi and the nozzle manufacturer's chart is the real source. Pressure scaling is approximate, and nozzle wear opens the bore. The abrasive-per-ft^2 swings widely; 8 lb/ft^2 is a heavy-prep default. Blasting is silica / lead / dust-regulated work requiring respiratory protection, containment, and air monitoring per OSHA.",
    assumptions: [
      { name: "Nozzle table", value: "representative cfm / lb-hr by bore at 100 psi (3/16 -> 74/178 ... 1/2 -> 503/1320)", source: "nozzle manufacturer charts" },
      { name: "Rules of thumb", value: "~4 cfm per compressor hp; 8 lb/ft^2 heavy-prep abrasive default", source: "blasting practice" },
    ],
  },
  "abatement-containment": {
    formula: "poly = (floor_sf x floor_layers + wall_sf x wall_layers) x 1.10; req_cfm = volume x ach / 60; nam_count = ceil(req_cfm / nam_cfm); waste_bags = ceil(debris_cy x 27 / 4.4).",
    edition: "EPA NESHAP 40 CFR 61 Subpart M (asbestos), EPA RRP 40 CFR 745 (lead), and OSHA 1926.1101 / 1926.62 by name; a containment take-off.",
    freeAccess: "EPA NESHAP / RRP and OSHA 1926 are free federal regulations (epa.gov, osha.gov). The take-off geometry is public.",
    governance: GOVERNANCE.general,
    editionNote: "4 air changes per hour and the negative-pressure containment are industry practice for asbestos; the actual negative pressure is verified continuously with a manometer, not assumed. This is a take-off, not an abatement plan - a licensed asbestos / certified lead (RRP) contractor governs. Asbestos waste is RACM and lead debris is regulated: double-bagged, labeled, and manifested. OSHA 1926.1101 / 1926.62 and EPA NESHAP / RRP requirements are not optional.",
    assumptions: [
      { name: "Defaults", value: "4 ACH, 1,500 cfm per HEPA machine, 4.4 ft^3 usable per 33-gal bag, 2 floor / 1 wall poly layers, 10% laps", source: "asbestos abatement practice" },
    ],
  },
  "pipe-fitting-takeout": {
    formula: "Center-to-center: cut = C-to-C - (takeout_A + takeout_B) + (makeup_A + makeup_B). Face-to-face lands on the fitting faces, so only make-up / weld gap applies.",
    edition: "Fitting take-out / make-up cut-length layout as taught in NCCER Pipefitting and the standard fitter's references, by name; first-principles.",
    freeAccess: "Public first-principles layout. Fitting take-out and thread make-up are product-/schedule-specific and user-supplied; confirm against your fittings and the spool drawing.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (first-principles fitter's layout). Center-to-center vs face-to-face is a labeled toggle, never silently mixed. Cross-links rolling-offset and conduit-offset.",
    assumptions: [
      { name: "Take-out / make-up", value: "product- and schedule-specific, user-supplied", source: "fitting reference / spool drawing" },
    ],
  },
  "pipe-miter-cut": {
    formula: "For an n-piece miter turning total angle A: n-1 cuts (welds); cut angle theta = A/(2*(n-1)) from square; cutback = OD * tan(theta). End pieces are half-gores.",
    edition: "Multi-piece (lobster-back) miter-elbow geometry - the per-cut miter angle A/(2*(n-1)) and the OD*tan(theta) cutback - as taught in NCCER Pipefitting and the standard fabrication references, by name; first-principles geometry.",
    freeAccess: "Public first-principles geometry. The welding procedure, the bevel, and the engineer of record govern the fabricated fitting.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (first-principles geometry). A degenerate 90-degree cut (tan blowup) is flagged, not leaked as Infinity. Cross-links rolling-offset.",
    assumptions: [
      { name: "Fabrication", value: "the welding procedure, bevel, and engineer of record govern the finished fitting", source: "fabrication reference" },
    ],
  },
  "pipe-template-wrap": {
    formula: "For a plane cut at angle alpha from square, longitudinal offset at circumferential station phi: y(phi) = (OD/2) * tan(alpha) * (1 - cos(phi)), phi over 0..360 in equal stations; circumference = pi*OD; max ordinate = OD*tan(alpha).",
    edition: "The pipefitter's wraparound (ordinate) method for marking an angled pipe cut, y = (OD/2)*tan(alpha)*(1 - cos(phi)), as taught in NCCER Pipefitting and the standard layout references, by name; first-principles geometry.",
    freeAccess: "Public first-principles geometry. A layout aid - the bevel and fit-up govern the finished joint.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (first-principles geometry). A square cut yields zero ordinates; fewer than 4 stations is rejected as too coarse to scribe. Cross-links pipe-miter-cut.",
    assumptions: [
      { name: "Layout aid", value: "the bevel and fit-up govern the finished joint", source: "layout reference" },
    ],
  },
  "flange-bolt-torque": {
    formula: "F = stress * A_tensile; short-form torque T = K * D * F (D nominal bolt diameter). Cross/star tightening sequence per the ASME PCC-1 legacy pattern for the bolt count.",
    edition: "Bolt-preload torque by the short-form T = K*D*F and the cross/star tightening sequence, per ASME PCC-1 Guidelines for Pressure Boundary Bolted Flange Joint Assembly and the ASME B16.5 flange classes, by name.",
    freeAccess: "Public first-principles short-form torque. The nut factor K, gasket seating stress, and target preload are joint- and lubricant-specific and user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "ASME PCC-1 / B16.5. A computational aid - the assembly procedure, gasket manufacturer, and the engineer of record govern the installed torque. Cross-links pipe-fitting-takeout.",
    assumptions: [
      { name: "Nut factor K", value: "lubricated about 0.16-0.20, dry about 0.20-0.25; user-supplied, default flagged", source: "ASME PCC-1 / fastener data" },
    ],
  },

  // ---- spec-v27 welding / sheet-metal / rigging benches (Groups E, C, G) ----
  "fillet-weld-strength": {
    formula: "Effective throat a = 0.707*leg (equal-leg). ASD allowable shear 0.30*F_Exx; LRFD design 0.75*0.60*F_Exx. Capacity = stress * a * length. AISC min fillet (Table J2.4 by thinner part); max (J2.2b) = t - 1/16 for t >= 1/4. Size-from-load solves the leg for a target load.",
    edition: "Fillet-weld effective throat (0.707*leg) and shear strength (allowable 0.30*F_Exx; LRFD 0.75*0.60*F_Exx) per AWS D1.1 Structural Welding Code - Steel and AISC 360 §J2, by name, with the minimum/maximum fillet sizes of AISC Table J2.4 and §J2.2b.",
    freeAccess: "First-principles weld mechanics. The qualified WPS, the weld inspector, and the engineer of record govern; base-metal and matching-filler checks are the engineer's.",
    governance: GOVERNANCE.structural,
    editionNote: "AWS D1.1 / AISC 360 §J2. The ASD/LRFD method is a labeled toggle so the two safety bases are never mixed. Cross-links weld-heat-input and metal-weight.",
    assumptions: [
      { name: "Electrode strength", value: "E60/E70/E80 sets F_Exx; matching filler is the engineer's", source: "AWS D1.1" },
    ],
  },
  "round-to-rect-duct": {
    formula: "ASHRAE equal-friction equivalent diameter D_e = 1.30*(a*b)^0.625/(a+b)^0.250. Round-to-rect solves the unknown side for a target D_e; aspect ratio = long side / short side.",
    edition: "The ASHRAE equal-friction circular equivalent of a rectangular duct, D_e = 1.30*(a*b)^0.625/(a+b)^0.250, per ASHRAE Fundamentals (duct design) and SMACNA, by name; first-principles.",
    freeAccess: "First-principles equal-friction equivalence (not equal-velocity). The fabrication drawing governs.",
    governance: GOVERNANCE.mechanical,
    editionNote: "ASHRAE Fundamentals / SMACNA. An equal-friction equivalence, noted inline. An aspect ratio above 4:1 fires the sheet-metal-practical-limit flag. Pairs with duct-sizing.",
    assumptions: [
      { name: "Equivalence basis", value: "equal friction, not equal velocity", source: "ASHRAE Fundamentals" },
    ],
  },
  "center-of-gravity-2point": {
    formula: "Two-scale weigh: W = S1 + S2; CG distance from point 1 = S2*L / (S1+S2) (moment balance); percent at each point = S_i / W. Inverse solves the reading each pick point would see from a known total weight and CG.",
    edition: "Center of gravity from a two-point weigh by moment balance (x = S2*L / (S1+S2)), per the standard rigging practice in the ASME B30.9 / ITI rigging references, by name; first-principles statics.",
    freeAccess: "First-principles statics. A field aid - the lift plan, the rated rigging, and the qualified rigger / lift director govern.",
    governance: GOVERNANCE.rigging,
    editionNote: "ASME B30.9 / ITI rigging practice. A CG computed outside the span between the two points is flagged as out-of-range, not silently returned. Cross-links sling-angle and crane-lift-quick.",
    assumptions: [
      { name: "Two-point support", value: "the load rests on exactly two scales/pick points along one line", source: "ITI rigging handbook" },
    ],
  },

  "bolt-circle": {
    formula: "R = dia/2; hole i at angle start + i*(360/N): x = cx + R*cos(angle), y = cy + R*sin(angle); angular spacing = 360/N; adjacent center-to-center chord = 2*R*sin(180/N).",
    edition: "Circle-of-holes (bolt-circle) layout - the standard hole-pattern coordinate geometry as in Machinery's Handbook (Industrial Press), by name; first-principles trigonometry.",
    freeAccess: "Pure trigonometry, public; confirm the hole pattern, datum, and tolerance against the drawing before drilling.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles circle geometry; holes run counter-clockwise from the start angle (measured from +X). The drawing's datum and tolerance govern.",
    assumptions: [
      { name: "Even spacing", value: "the N holes are evenly spaced on one circle; for an unequal pattern enter each radius/angle directly", source: "circle-of-holes geometry" },
    ],
  },

  "decimal-to-fraction": {
    formula: "ticks = round(value * den); whole = floor(ticks/den); fraction = (ticks - whole*den)/den reduced by GCD; feet = floor(whole/12); error = rounded - exact.",
    edition: "Decimal-to-fraction tape-measure math - nearest 1/N rounding, GCD reduction, and feet-inch decomposition; first-principles arithmetic, public domain.",
    freeAccess: "Pure arithmetic, public; binary (power-of-two) denominators are the tape-measure / machinist-scale standard.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles arithmetic; the error reported is the rounded value minus the exact decimal, so the user can see the rounding loss.",
    assumptions: [
      { name: "Binary denominators", value: "rounds to a power-of-two tape-measure fraction (2/4/8/16/32/64)", source: "tape-measure / machinist scale convention" },
    ],
  },

  "sine-bar": {
    formula: "sin(theta) = H / L, where L is the sine bar length (roll-center distance) and H is the gauge-block stack height; so theta = arcsin(H / L) and H = L * sin(theta).",
    edition: "Sine bar / sine plate angle setup - the standard precision-angle relation as in Machinery's Handbook (Industrial Press), by name; first-principles trigonometry.",
    freeAccess: "Pure trigonometry, public; the gauge-block grade and surface-plate flatness govern the achievable accuracy.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles trigonometry; above about 45 degrees the stack height changes little per degree, so a sine plate or angle blocks are preferred for steep setups.",
    assumptions: [
      { name: "Roll-center length", value: "L is the center-to-center roll distance (commonly 5 in or 10 in), not the overall bar length", source: "sine-bar geometry" },
    ],
  },

  "thread-pitch": {
    formula: "Inch: P = 1 / TPI. Metric: P is the pitch in mm, TPI = 25.4 / P. Lead = P * starts. Sharp-V 60-degree height H = P * cos(30) = P * sqrt(3) / 2.",
    edition: "Thread pitch, lead, and 60-degree form - Unified (UN/UNC/UNF) inch and ISO metric threads share a 60-degree included angle - as in Machinery's Handbook (Industrial Press), by name; first-principles geometry.",
    freeAccess: "Pure geometry, public; the truncated thread depth and the tap-drill size are thread-form- and class-specific and are not computed here.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles 60-degree thread geometry. The lead (axial advance per turn) equals the pitch on a single-start thread and a multiple of it on a multi-start thread; the sharp-V height is the theoretical fundamental triangle, not the truncated working depth.",
    assumptions: [
      { name: "Thread form", value: "60-degree included angle (UN/UNC/UNF and ISO metric); Acme, buttress, and pipe-thread forms are not covered", source: "thread-form geometry" },
    ],
  },

  // ---- spec-v40 Machine Shop & Fabrication bench (calc-shop.js; groups K/G/E) ----
  "machining-time": {
    formula: "feed_IPM = RPM x IPR (when not entered directly); cut time t = L / feed_IPM (min); total = t x passes.",
    edition: "Cutting time as cut distance / feed rate, with feed rate = RPM x IPR - first-principles arithmetic as in Machinery's Handbook (Industrial Press), by name; public domain.",
    freeAccess: "Pure arithmetic, public; the cut length should include tool approach and overtravel, which the user adds.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles distance / feed rate. L should include tool approach and overtravel so the time covers the full tool path.",
    assumptions: [
      { name: "Cut length", value: "L is the full tool-path distance including approach and overtravel, supplied by the user", source: "cutting-time geometry" },
    ],
  },
  "material-removal-rate": {
    formula: "Milling MRR = WOC x DOC x feed_IPM; turning MRR = 12 x SFM x DOC x feed_IPR (the pi x D cancels); drilling MRR = (pi x D^2 / 4) x feed_IPM, in in^3/min.",
    edition: "Material removal rate as the swept volume per unit time - first-principles geometry as in Machinery's Handbook (Industrial Press), by name; public domain.",
    freeAccess: "Pure geometry, public; the machine rigidity, power, and chip-load limit cap the usable rate.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles swept-volume geometry. The turning form is diameter-independent because the pi x D in the RPM and the swept circumference cancel.",
    assumptions: [
      { name: "Operation mode", value: "milling, turning, or drilling - the dimensions entered match the selected mode", source: "MRR geometry" },
    ],
  },
  "turning-surface-finish": {
    formula: "Theoretical peak-to-valley Rt = f^2 / (8 x r); estimated arithmetic average Ra ~= Rt / 4 (= 0.032 x f^2 / r).",
    edition: "Theoretical surface roughness from feed and nose radius - first-principles scallop geometry as in Machinery's Handbook (Industrial Press), by name; public domain.",
    freeAccess: "Pure geometry, public; the measured finish is rougher than this theoretical value.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles scallop geometry: the theoretical finish from feed and nose radius only. Built-up edge, tool wear, deflection, and vibration make the measured finish rougher.",
    assumptions: [
      { name: "Round-nose tool", value: "the feed is fast enough that the round nose scallops the surface (the dominant regime); Ra ~= Rt / 4 is an estimate", source: "scallop geometry" },
    ],
  },
  "taper-calc": {
    formula: "Taper per inch = (D - d) / L; taper per foot = TPI x 12; angle per side = atan((D - d) / (2L)); included angle = 2 x (angle per side).",
    edition: "Taper definitions and the taper-per-foot / angle relations - first-principles trigonometry as in Machinery's Handbook (Industrial Press), by name; public domain.",
    freeAccess: "Pure trigonometry, public.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles trigonometry. The angle per side is the compound-slide setting on a lathe; the included angle is twice that.",
    assumptions: [
      { name: "Diameters and length", value: "D is the large diameter, d the small, L the axial length over which the taper runs, all user-supplied", source: "taper geometry" },
    ],
  },
  "dividing-head": {
    formula: "Turns per division = ratio / N (40/N on a standard 40:1 head). For a hole circle of H holes the move is the fractional part x H holes, reported when that product is a whole number.",
    edition: "Simple (plain) indexing on a 40:1 dividing head - first-principles ratio arithmetic as in Machinery's Handbook (Industrial Press), by name; public domain.",
    freeAccess: "Pure arithmetic, public; differential and angular indexing are out of scope.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles ratio arithmetic. Only simple (plain) indexing is computed; differential and angular indexing need a different setup.",
    assumptions: [
      { name: "Worm ratio and plate circles", value: "the worm ratio (default 40:1) and the available index-plate hole circles are user-supplied", source: "indexing geometry" },
    ],
  },
  "thread-measure-wire": {
    formula: "Best wire W = P / (2 cos30) = 0.57735 x P (range 0.560P to 0.650P); measurement over three wires M = E + 3W - 1.51553 x P for a 60-degree thread.",
    edition: "The three-wire measurement-over-wires method for 60-degree threads and the best-wire / 1.51553 constant - first-principles geometry as in Machinery's Handbook (Industrial Press), by name; public domain.",
    freeAccess: "Pure geometry, public; the pitch diameter E is user-supplied (no thread-class table lookup here).",
    governance: GOVERNANCE.general,
    editionNote: "First-principles 60-degree thread geometry. The pitch diameter E is supplied by the user; a wire outside the acceptable range is flagged, not blocked.",
    assumptions: [
      { name: "Thread form", value: "60-degree included angle (UN / ISO metric); the pitch diameter E is user-supplied", source: "three-wire geometry" },
    ],
  },
  "punch-force": {
    formula: "Cut perimeter (pi x D round, 2(a+b) rectangular, or entered); force F = perimeter x T x shear strength; tons = F / 2000; stripping ~= 3.5% of F.",
    edition: "Punching force as sheared area times shear strength - first-principles as in Machinery's Handbook (Industrial Press), by name; public domain.",
    freeAccess: "First-principles shear; the shear strength (~0.8 x UTS for mild steel) is user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles shear: force = sheared area x shear strength. The stripping force is an advisory fraction; the press capacity must exceed the punch force with margin.",
    assumptions: [
      { name: "Shear strength", value: "the material shear strength (~0.8 x UTS for mild steel) is user-supplied", source: "shear mechanics" },
    ],
  },
  "press-brake-tonnage": {
    formula: "Air-bend tons/ft = 575 x (UTS/60) x T^2 / V; total = tons/ft x bend length. Recommended die ~8 x T; minimum flange ~0.7 x die opening.",
    edition: "Press-brake air-bend tonnage formula (the 575 mild-steel constant) as published in press-brake tonnage charts / Machinery's Handbook, by name; empirical method.",
    freeAccess: "Empirical air-bend rule, cited; the user supplies the geometry and may override the strength. Bottoming and coining run substantially higher.",
    governance: GOVERNANCE.general,
    editionNote: "The 575 constant is the published mild-steel (60 ksi) air-bend value, scaled linearly by tensile strength. This estimates air bending; the die maker's chart governs the final setup.",
    assumptions: [
      { name: "Air bending", value: "the 575 rule is the air-bend form; bottoming and coining run several times higher", source: "press-brake tonnage chart" },
    ],
  },
  "weld-duty-cycle": {
    formula: "DC2 = DC1 x (A1/A2)^2 (capped at 100%); minutes-on per 10-min window = DC2 x 10; maximum continuous amperage A100 = A1 x sqrt(DC1/100).",
    edition: "The inverse-square duty-cycle relation (NEMA EW-1 arc-welding power-source convention), by name; first-principles I^2-heating, public domain.",
    freeAccess: "First-principles resistive heating, public; duty cycle is measured over a 10-minute window.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles I^2 (resistive) heating: the allowable duty cycle scales inverse-square with current. Exceeding the duty cycle trips the machine's thermal overload.",
    assumptions: [
      { name: "Duty-cycle window", value: "the rated duty cycle is over a standard 10-minute window (NEMA EW-1)", source: "NEMA EW-1" },
    ],
  },
  "carbon-equivalent": {
    formula: "CE_IIW = C + Mn/6 + (Cr + Mo + V)/5 + (Ni + Cu)/15. Bands: < 0.35 readily weldable; 0.35-0.55 preheat advised; > 0.55 high hardenability.",
    edition: "The IIW carbon-equivalent formula as adopted in AWS D1.1 Structural Welding Code, by name; published formula.",
    freeAccess: "Published weighted-sum formula; the output is a screening band, not a qualified welding procedure.",
    governance: GOVERNANCE.general,
    editionNote: "The IIW / AWS D1.1 carbon-equivalent weighted sum. This is a screen, not a welding procedure; the WPS, hydrogen level, restraint, and thickness govern the actual preheat (AWS D1.1 Annex).",
    assumptions: [
      { name: "Composition", value: "the steel chemistry (weight percent of C, Mn, Cr, Mo, V, Ni, Cu) is user-supplied from the mill certificate", source: "AWS D1.1" },
    ],
  },
  "shielding-gas-runtime": {
    formula: "Gas used = flow x arc-on / 60; runtime per cylinder = cylinder volume / flow; cylinders = ceil(gas used / cylinder volume); job gas cost = (gas used / cylinder volume) x cost per cylinder, prorated.",
    edition: "Torch / regulator maker's flow charts and the AWS welding cost / consumable references, by name.",
    freeAccess: "The flow-to-volume arithmetic is public; the maker's flow chart ships with the regulator.",
    governance: GOVERNANCE.worker_safety,
    editionNote: "Compressed-gas and hot-work hazards govern; follow the equipment maker's instructions and your site's hot-work permit. The cylinder volume is the usable gas, an editable value.",
    assumptions: [
      { name: "Usable cylinder volume", value: "a '330' cylinder holds about 251 ft3 of argon mix (also 145, 80); editable to the bottle on hand", source: "gas supplier cylinder spec" },
      { name: "Flow setting", value: "set the flow to the gun and the joint, not higher -- excess gas wastes money and causes turbulence and porosity; a windscreen beats cranking the flow", source: "welding practice" },
    ],
  },
  "oxyfuel-cutting-gas": {
    formula: "Cut time = cut length / cut speed; oxygen used = oxygen flow x cut time / 60; fuel used = fuel flow x cut time / 60; runtime per cylinder = cylinder volume / flow.",
    edition: "Torch maker's tip charts, by name.",
    freeAccess: "The flow-to-volume arithmetic is public; the tip chart ships with the torch.",
    governance: GOVERNANCE.worker_safety,
    editionNote: "Compressed-gas, flashback, and hot-work hazards govern; follow the equipment maker's instructions and your site's hot-work permit. Oxy-fuel cuts carbon steel only.",
    assumptions: [
      { name: "Default cylinder volumes", value: "244 ft3 oxygen, 330 ft3 fuel; editable to the bottles on hand", source: "gas supplier cylinder spec" },
      { name: "Acetylene withdrawal limit", value: "limited to about a seventh of the cylinder volume per hour or the acetone solvent carries over -- run propane or manifold cylinders for a high draw", source: "compressed-gas safety practice" },
      { name: "Process scope", value: "oxygen does the cutting by oxidizing the steel and dominates consumption; oxy-fuel cuts carbon steel only, not stainless or aluminum", source: "torch maker's tip chart" },
    ],
  },
  "weld-preheat-fuel": {
    formula: "Heat needed = mass x specific heat x (preheat temp - start temp); fuel = heat needed / efficiency; propane lb = fuel / 21,600 Btu/lb; propane gal = fuel / 91,500 Btu/gal.",
    edition: "Specific heat of carbon steel (about 0.11 Btu/lb-degF) and the heating value of propane (about 21,600 Btu/lb, 91,500 Btu/gal), by name; sensible-heat first principles.",
    freeAccess: "The sensible-heat relation and the property values are public.",
    governance: GOVERNANCE.worker_safety,
    editionNote: "Hot-work hazards govern; follow the equipment maker's instructions and your site's hot-work permit. The preheat TEMPERATURE comes from carbon-equivalent or the WPS; this tile only sizes the FUEL to reach it.",
    assumptions: [
      { name: "Steel specific heat", value: "0.11 Btu/lb-degF default; editable", source: "carbon-steel property tables" },
      { name: "Propane heating value", value: "21,600 Btu/lb and 91,500 Btu/gal default; editable", source: "propane property tables" },
      { name: "Open-torch efficiency", value: "25% default (roughly 15 to 30% for an open torch on a plate); an enclosed heat, blanket, or induction is far higher; hold the preheat through the weld and verify the interpass temperature", source: "welding preheat practice" },
    ],
  },
  "weld-cost-per-foot": {
    formula: "Consumable per ft = deposit per ft / efficiency; filler cost = consumable x filler cost per lb; arc hr per ft = deposit / deposition rate; labor hr per ft = arc hr / operating factor; total = filler + labor + gas per ft.",
    edition: "AWS welding cost and consumable references (deposition efficiency and operating-factor ranges), by name.",
    freeAccess: "The cost arithmetic is public; the deposition efficiency and operating-factor ranges are published in welding cost references.",
    governance: GOVERNANCE.general,
    editionNote: "AHJ and the licensed professional govern any bid. Labor and the operating factor usually dominate the cost, not the filler; a real bid adds shop overhead, grinding, tips, nozzles, and power.",
    assumptions: [
      { name: "Deposition efficiency", value: "the stub, spatter, and slag loss -- SMAW about 60 to 65%, GMAW solid about 90 to 98%, FCAW about 80 to 85%; default 95%", source: "AWS welding cost references" },
      { name: "Operating factor", value: "arc-on time divided by clock time, typically 20 to 40% for manual welding and higher for mechanized; default 30%", source: "AWS welding cost references" },
      { name: "Deposit per foot", value: "comes from weld-usage (deposit weight / weld length); user-supplied", source: "weld-usage" },
    ],
  },

  // ---- spec-v129..v134 metal-trades batch (calc-fab.js; groups E/G) ----
  "weld-metal-volume": {
    formula: "Fillet area = leg2 / 2 (equal-leg) or user-entered groove area; deposit volume = area x length; deposit weight = volume x 0.2836 lb/in3; filler purchased = deposit / deposition efficiency; passes = ceil(area / max single-pass area).",
    edition: "Weld deposit weight and filler consumed - first-principles joint geometry and steel density (0.2836 lb/in3, matching metal-weight), by name; public domain.",
    freeAccess: "Pure area-volume-weight geometry, public; the joint dimensions, deposition efficiency, and max single-pass area are user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles joint geometry and steel density. Deposition efficiency is the deposited/purchased ratio (solid wire about 0.90, SMAW about 0.60 to 0.65); the WPS and the shop's measured efficiency govern the purchase, and pass count is a planning estimate.",
    assumptions: [
      { name: "Steel density", value: "0.2836 lb/in3 (carbon steel, matching metal-weight); editable", source: "metal-weight" },
      { name: "Deposition efficiency", value: "deposited / filler purchased; default 0.90 solid wire", source: "WPS / shop measurement" },
      { name: "Max single-pass area", value: "default 0.05 in2; passes = ceil(weld area / max pass area)", source: "welding practice" },
    ],
  },
  "wire-feed-deposition": {
    formula: "Wire cross-section = pi/4 x diameter2; melt-off rate (lb/hr) = wire feed speed (in/min) x 60 x area x 0.2836 lb/in3; deposition rate = melt-off x deposition efficiency.",
    edition: "Melt-off and deposition rate from wire feed speed - first-principles wire-volume geometry and steel density (0.2836 lb/in3), by name; public domain.",
    freeAccess: "Pure volume-rate geometry, public; the wire feed speed, diameter, and deposition efficiency are user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles wire-volume geometry and steel density. Deposition efficiency (solid wire about 0.92, FCAW about 0.85) is the melted/deposited ratio; the WPS and the process (spray vs short-circuit, gas, electrode extension) govern the real efficiency.",
    assumptions: [
      { name: "Steel density", value: "0.2836 lb/in3 (carbon steel); editable", source: "first-principles" },
      { name: "Deposition efficiency", value: "deposited / melted; default 0.92 solid wire", source: "WPS / process" },
    ],
  },
  "weld-transverse-shrinkage": {
    formula: "Transverse shrinkage per weld = 0.2 x weld area / thickness (the 0.2 coefficient is dimensionless; the area-over-thickness ratio carries the length); total = per-weld x weld count; recommended pre-set = total.",
    edition: "Transverse weld shrinkage - the Blodgett weld-area-over-thickness relation from Blodgett, Design of Welded Structures (James F. Lincoln Arc Welding Foundation), by name.",
    freeAccess: "The published Blodgett relation; the weld area, thickness, and weld count are user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "Blodgett transverse-shrinkage relation shrink = 0.2 x A_w / t. This is a screen: joint restraint, fixturing, sequence, and a mock-up govern the actual movement, and longitudinal and angular distortion (restraint-dominated) are out of scope.",
    assumptions: [
      { name: "Blodgett coefficient", value: "0.2 (dimensionless); editable", source: "Blodgett, Design of Welded Structures" },
      { name: "Scope", value: "transverse component only; longitudinal and angular distortion not estimated", source: "screen scope" },
    ],
  },
  "weld-group-eccentric": {
    formula: "Two vertical welds length D, separation B: L_w = 2D; Ix = D3/6; Iy = D B2/2; J = Ix + Iy; direct shear f_d = P/L_w; torque T = P x e; f_tx = T(D/2)/J; f_ty = T(B/2)/J; resultant f_r = sqrt(f_tx2 + (f_d + f_ty)2); required leg (sixteenths) = ceil(f_r / allowable per 1/16 in).",
    edition: "Eccentrically loaded fillet weld group, elastic (vector) method, per AISC 360 and the AISC Steel Construction Manual Part 8, by name.",
    freeAccess: "First-principles weld-line mechanics (the elastic method); the load, eccentricity, weld geometry, and the E70 allowable (about 928 lb/in per 1/16 in, ASD) are user-supplied.",
    governance: GOVERNANCE.engineer_of_record,
    editionNote: "AISC 360 / Manual Part 8 elastic (vector) method. This is the conservative elastic method (not the instantaneous-center tables), a screen; AISC edition cycles update the tabulated allowables, and the engineer of record governs the connection (then check the AISC minimum fillet for the plate thickness).",
    assumptions: [
      { name: "Fillet allowable", value: "E70 ASD about 928 lb/in per 1/16 in of leg; editable", source: "AISC 360 §J2" },
      { name: "Method", value: "elastic (vector) method, conservative vs instantaneous-center", source: "AISC Manual Part 8" },
    ],
  },
  "min-bend-radius": {
    formula: "Radius-to-thickness multiple R/T = 50 / %elongation - 1; minimum inside radius R_min = thickness x R/T.",
    edition: "Minimum inside bend radius from ductility - the published forming-limit relation R_min = T x (50 / %elongation - 1), by name; public domain.",
    freeAccess: "The published forming-limit relation; the thickness and mill-cert elongation are user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "Published forming-limit relation tying bend radius to thickness and total elongation. This is a screen: the mill certificate, the bend orientation relative to the rolling direction (a bend across the grain tolerates a tighter radius than one along it), the fabricator's press experience, and a test bend govern.",
    assumptions: [
      { name: "Elongation", value: "total percent in 2 in from the mill cert (A36 about 20); domain (0, 50]", source: "mill certificate" },
      { name: "Grain direction", value: "transverse bends tolerate tighter radii than longitudinal; screen only", source: "forming practice" },
    ],
  },
  "shrink-fit": {
    formula: "Required temperature change delta_T = (interference + assembly clearance) / (alpha x nominal diameter); heat the outer/bore part to ambient + delta_T, or chill the inner/shaft part to ambient - delta_T. From delta_dia = alpha x dia x delta_T.",
    edition: "Interference shrink-fit assembly temperature - first-principles thermal-expansion relation delta_dia = alpha x dia x delta_T (steel alpha 6.5e-6 per degF), by name; public domain.",
    freeAccess: "Pure thermal-expansion arithmetic, public; the diameter, interference, clearance, coefficient, and ambient are user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles thermal-growth relation. The alloy's published coefficient governs the number (steel about 6.5e-6 per degF; aluminum and others differ); the interference contact pressure (a separate Lame thick-cylinder analysis) and the engineer govern the joint's holding capacity -- this tile sizes only the assembly temperature.",
    assumptions: [
      { name: "Coefficient of thermal expansion", value: "default 6.5e-6 per degF (steel); editable for the alloy", source: "published material data" },
      { name: "Ambient", value: "default 70 degF; a chill below dry ice (-109 degF) needs liquid nitrogen", source: "first-principles" },
    ],
  },

  // ---- spec-v41 Machine Shop & Fab bench, batch 2 (calc-shop.js; groups K/G) ----
  "tap-drill-size": {
    formula: "60-degree thread: percent of full thread = 76.98 x (D_major - D_drill) x TPI, so D_drill = D_major - % / (76.98 x TPI). The 76.98 constant is 1 / 0.012990; nearest 1/64 in fraction reported.",
    edition: "Tap drill for a target percent of full thread - first-principles 60-degree thread geometry as in Machinery's Handbook (Industrial Press), by name; public domain.",
    freeAccess: "Pure thread geometry, public; the major diameter, TPI / pitch, and target thread percent are user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles 60-degree (UN / ISO metric) thread geometry. The theoretical diameter is exact; the named letter / number / fraction drill is a chart lookup, so only the nearest 1/64 in fraction is given.",
    assumptions: [
      { name: "Thread form and target", value: "60-degree included angle; 65-75% thread is the usual target, user-supplied (default 75%)", source: "tap-drill geometry" },
    ],
  },
  "rolled-blank": {
    formula: "Developed flat length L = pi x neutral-axis diameter; with the neutral axis k x T from the inside, D_neutral = OD - 2T(1-k) = ID + 2kT. Default k = 0.5 (mid-thickness) gives L = pi x (OD - T).",
    edition: "Developed blank length to roll plate into a cylinder - first-principles arc-length geometry as in Machinery's Handbook (Industrial Press), by name; public domain.",
    freeAccess: "Pure arc-length geometry, public; the diameter, thickness, and k-factor are user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles arc-length at the neutral axis. The k-factor (default 0.5 mid-thickness) shifts the neutral axis inward for tighter rolls; edge trim and seam-weld gap are added separately.",
    assumptions: [
      { name: "Neutral axis", value: "the neutral axis sits k x thickness from the inside face (default k = 0.5)", source: "plate-rolling geometry" },
    ],
  },

  // ---- spec-v43 cross-trade tank gauging (calc-cross.js; group G) ----
  "tank-volume": {
    formula: "Horizontal cylinder partial volume = [R^2 x acos((R-h)/R) - (R-h) x sqrt(2Rh - h^2)] x length (circular-segment area times length); vertical cylinder = pi x R^2 x depth. US gallons = in^3 / 231.",
    edition: "Partial volume of a cylindrical tank from a depth reading - first-principles circular-segment geometry; public domain.",
    freeAccess: "Pure geometry, public; the tank diameter, length, and dipstick depth are user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles geometry with flat ends assumed. Dished or hemispherical heads hold more and need a head-type correction; use the actual inside dimensions.",
    assumptions: [
      { name: "Flat ends", value: "the tank ends are flat; dished/hemispherical heads need a separate head-volume correction", source: "tank geometry" },
    ],
  },
  "linear-interpolation": {
    formula: "y = y1 + (x - x1) x (y2 - y1) / (x2 - x1); slope = (y2 - y1) / (x2 - x1). The query is an extrapolation when x is outside [x1, x2].",
    edition: "Linear interpolation between two known points - first-principles linear geometry; public domain.",
    freeAccess: "Pure arithmetic, public; the two reference points and the query x are user-supplied from the chart or table.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles straight-line read. A linear estimate between two points: a curved relationship is approximated, so keep the points close, and the tile flags an out-of-range query as an extrapolation.",
    assumptions: [
      { name: "Local linearity", value: "the value varies linearly between the two reference points; confirm against the source table", source: "linear interpolation" },
    ],
  },

  // ---- spec-v54 compound miter for crown molding (calc-shop.js; group E) ----
  "compound-miter": {
    formula: "Crown cut flat on the saw: miter (table swing) = atan(tan(corner/2) x sin(spring)); bevel (blade tilt) = asin(cos(spring) x cos(corner/2)). Spring is the molding profile angle (38 or 45 deg), corner is the wall angle (90 deg square).",
    edition: "Compound-miter geometry for crown molding cut flat - first-principles trigonometry; public domain. Reproduces the standard published compound-miter chart.",
    freeAccess: "Pure trigonometry, public; the spring angle and wall corner angle are user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles trigonometry, verified against the standard compound-miter chart (38 deg spring / 90 deg corner gives 31.62 deg miter and 33.86 deg bevel; 45 / 90 gives 35.26 / 30.00). The angle magnitudes are the same for inside and outside corners; only the workpiece orientation changes. Cut a scrap test corner first.",
    assumptions: [
      { name: "Cut flat", value: "the molding lies flat on the saw table (not sprung against the fence); the spring angle is the molding's installed angle from the wall", source: "compound-miter geometry" },
    ],
  },

  // ---- spec-v44 cross-trade circular-arc layout (calc-fab.js; group G) ----
  "circular-arc": {
    formula: "Radius R = (chord^2 / 4 + rise^2) / (2 x rise); central angle = 2 x acos((R - rise) / R); arc length = R x angle. The rise is the sagitta (middle ordinate) at midspan.",
    edition: "Circular arc from a chord and rise (the sagitta / middle-ordinate relation) - first-principles circle geometry as in Machinery's Handbook (Industrial Press), by name; public domain.",
    freeAccess: "Pure circle geometry, public; the chord and rise are user-supplied field measurements.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles geometry. Valid for minor and major arcs (rise greater than the radius is a major arc); reproduce the curve by swinging the radius from the center or by trammel/string-line.",
    assumptions: [
      { name: "Chord and rise", value: "the chord (span) and the perpendicular rise at midspan are user-supplied measurements of the same arc", source: "circle geometry" },
    ],
  },
  "circle-from-3-points": {
    formula: "Circumcircle of the triangle on the three points: D = 2(x1(y2-y3) + x2(y3-y1) + x3(y1-y2)); center = ((|P1|^2(y2-y3)+|P2|^2(y3-y1)+|P3|^2(y1-y2))/D, (|P1|^2(x3-x2)+|P2|^2(x1-x3)+|P3|^2(x2-x1))/D); radius = distance(center, P1).",
    edition: "Circle through three points (the triangle's circumcircle) - first-principles coordinate geometry as in Machinery's Handbook (Industrial Press), by name; public domain.",
    freeAccess: "Pure coordinate geometry, public; the three points are user-supplied field measurements.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles geometry. The three points must be non-collinear (a zero determinant returns an error); points spread far apart on the arc reduce the radius's sensitivity to measurement error.",
    assumptions: [
      { name: "Three points on the arc", value: "the three (x, y) points lie on the same arc and are not collinear, in any consistent length unit", source: "coordinate geometry" },
    ],
  },

  // ---- spec-v55 regular-polygon miter & layout (calc-fab.js; group G) ----
  "polygon-miter": {
    formula: "Regular N-gon frame: miter = 180/N deg off square at each end; interior angle = (N-2) x 180/N. Side from across-flats: s = flats x tan(180/N); from across-corners: s = corners x sin(180/N). Across-flats = s/tan(180/N), across-corners = s/sin(180/N), perimeter = N x s, area = (N x s^2)/(4 tan(180/N)).",
    edition: "Regular-polygon miter and layout geometry (the miter saw setting and the apothem/circumradius relations) - first-principles trigonometry; public domain.",
    freeAccess: "Pure regular-polygon trigonometry, public; the number of sides and the target size are user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles geometry, reproducing the known shop miters (square 45, hexagon 30, octagon 22.5). The miter is the saw setting off square; the across-flats width and across-corners diameter let you size pieces to a target dimension. Cut a scrap test joint and allow for blade kerf, which shortens each piece.",
    assumptions: [
      { name: "Regular polygon", value: "the frame is a regular (equal-sided, equal-angled) N-gon built from straight pieces, mitered at each joint", source: "regular-polygon geometry" },
    ],
  },

  // ---- spec-v57 equal-spacing layout (calc-layout.js; group G) ----
  "equal-spacing": {
    formula: "N items of width w in a run R have N+1 equal gaps of gap = (R - N x w)/(N+1) and a center-to-center pitch of gap + w. Max-gap mode: smallest N with gap at or below gmax is N = ceil((R - gmax)/(w + gmax)). Item-center positions are measured from the start of the run.",
    edition: "Equal-spacing (baluster / picket / stud / division-point) layout - first-principles arithmetic; public domain.",
    freeAccess: "Pure layout arithmetic, public; the run, item width, and gap limit or count are user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles layout arithmetic. The maximum-gap limit is user-supplied: for a guard or railing the IRC R312.1.3 rule is that a 4-inch sphere must not pass, so a max gap just under 4 in is typical, but the AHJ-adopted code governs. Mark from a single datum to avoid cumulative creep, and allow for your end conditions (posts, reveals).",
    assumptions: [
      { name: "Equal end gaps", value: "the N items sit in a run with N+1 equal gaps, including the two end gaps (the post-to-baluster case); width 0 lays out division points", source: "layout arithmetic" },
    ],
  },

  // ---- spec-v28 low-voltage / data / security cabling (Group A, pending Group-Z signoff) ----
  "fiber-loss-budget": {
    formula: "loss = attenuation(dB/km) * length_km + connectors * loss_per_connector + splices * loss_per_splice; margin = max_channel_loss - loss; pass when margin >= 0.",
    edition: "Optical link loss budget - fiber attenuation plus connector and splice losses against the application's maximum channel loss - per the TIA-568 / TIA-526 fiber-test methods and the IEEE 802.3 channel-loss limits, by name; first-principles.",
    freeAccess: "First-principles dB accounting. Attenuation coefficients and component losses are component-specific and user-supplied; the OTDR/power-meter field test governs the certified link.",
    governance: GOVERNANCE.electrical,
    editionNote: "TIA-568 / TIA-526 / IEEE 802.3. Multimode vs single-mode default coefficients are a labeled choice so a value is never read against the wrong fiber. Cross-links poe-budget.",
    assumptions: [
      { name: "Component losses", value: "per-connector 0.75 dB and per-splice 0.3 dB defaults; user-supplied", source: "TIA-568 component data" },
    ],
  },
  "cable-tray-fill": {
    formula: "NEC 392.22(A): cables 4/0 and larger, sum of diameters <= tray inside width; smaller cables, sum of cross-sectional areas <= the column-2 allowable (~1.167 * width ladder/ventilated, ~0.917 * width solid bottom); mixed loads reduce the smaller-cable allowance by the large-cable diameters.",
    edition: "Cable-tray fill per NEC Article 392.22 (the sum-of-diameters rule for cables 4/0 and larger and the cross-sectional-area allowance for smaller cables), by name.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. Ampacity derating for tray fill (392.80) is a separate check.",
    governance: GOVERNANCE.electrical,
    editionNote: "NEC Article 392.22. The AHJ-adopted NEC edition governs; ampacity derating for tray fill (392.80) is cross-linked, not bundled. Distinct from conduit-fill.",
    assumptions: [
      { name: "Column-2 allowance", value: "the linear column-2 area the NEC Table 392.22(A) encodes; verify against the adopted table", source: "NEC Table 392.22(A)" },
    ],
  },
  "cctv-storage": {
    formula: "Per camera per day GB = bitrate_Mbps * 0.45 * recording_hours (1 Mbps for 24 h = 10.8 GB/day); total = cameras * per-camera-day * retention_days; aggregate bandwidth = cameras * bitrate.",
    edition: "IP-video storage and bandwidth from bitrate, recording hours, and retention (1 Mbps for 24 h is about 10.8 GB/day), per the standard NVR/VMS sizing practice; first-principles bitrate accounting.",
    freeAccess: "First-principles bitrate accounting. The H.264/H.265 bitrate estimates are scene- and vendor-specific and user-supplied; the VMS calculator and the installed cameras govern.",
    governance: GOVERNANCE.electrical,
    editionNote: "First-principles (no edition). A motion duty-cycle scales the recording hours; a retention of 0 days yields 0 storage rather than an error.",
    assumptions: [
      { name: "Bitrate", value: "per-camera bitrate is user-supplied or estimated from resolution/fps/codec", source: "VMS sizing practice" },
    ],
  },
  "speaker-70v-line": {
    formula: "Constant-voltage line: total tap load = sum of tap watts; budget verdict total <= rating*(1 - headroom); reflected impedance Z = V^2 / P_total; line loss from wire resistance and the line current I = P_total/V.",
    edition: "Constant-voltage (70 V / 100 V) distributed-audio line design - tap-wattage budget, reflected line impedance Z = V^2/P, and run line-loss - per the standard 70 V distributed-system practice and NEC Article 640 / 725 (Class 2/3 audio) wiring, by name; first-principles Ohm's law.",
    freeAccess: "First-principles Ohm's law. The amplifier spec governs the rated power and minimum load.",
    governance: GOVERNANCE.electrical,
    editionNote: "NEC Article 640 / 725. 70.7 V vs 100 V is a labeled toggle. Distinct from the low-impedance speaker-impedance (Group N) tile, which it cross-links.",
    assumptions: [
      { name: "Tap settings", value: "the speaker tap wattages are read off the transformer taps; user-supplied", source: "loudspeaker tap chart" },
    ],
  },
  "standby-battery-sizing": {
    formula: "Ah = [(I_standby * h_standby) + (I_alarm * h_alarm)] * derate, with the alarm minutes converted to hours; the next standard battery size is the smallest at or above the requirement.",
    edition: "Secondary (standby) battery sizing for a fire-alarm or security control unit - standby amp-hours plus alarm amp-hours times the aging/derate factor - per NFPA 72 National Fire Alarm and Signaling Code §10.6 (secondary power supply) and the panel manufacturer's battery-calculation worksheet, by name.",
    freeAccess: "First-principles amp-hour accounting. The AHJ-adopted NFPA 72 edition, the listed panel, and the battery manufacturer's derating govern.",
    governance: GOVERNANCE.fire,
    editionNote: "NFPA 72 §10.6. The standby hours and alarm minutes are unit-locked so the two are never added in mixed units; a derate below 1 is flagged.",
    assumptions: [
      { name: "Derate factor", value: "aging/derate factor 1.2 default (>= 1.0 expected); user-supplied", source: "NFPA 72 / panel worksheet" },
    ],
  },
  "coax-rg-loss": {
    formula: "loss_dB = loss_per_100ft(type, frequency) * length / 100; end level = source - loss; inverse max run = 100 * (source - target) / loss_per_100ft.",
    edition: "Coaxial-cable attenuation from the per-100-ft loss at frequency (loss = per-100-ft * length/100), per the cable manufacturer's published loss curves (Belden / CommScope) and the standard CATV/CCTV/SDI practice, by name; first-principles.",
    freeAccess: "First-principles attenuation. The per-100-ft loss is type- and frequency-specific and user-supplied or a flagged default; the manufacturer's datasheet governs.",
    governance: GOVERNANCE.electrical,
    editionNote: "Manufacturer loss curves (Belden / CommScope). The inverse max-run guards a zero loss coefficient.",
    assumptions: [
      { name: "Per-100-ft loss", value: "type- and frequency-specific; RG6 ~ 6 dB, RG59 ~ 11 dB, RG11 ~ 3.5 dB per 100 ft at ~1 GHz default", source: "Belden / CommScope datasheets" },
    ],
  },
  "pipe-cold-spring": {
    formula: "Free growth dL = alpha * L * dT (alpha per material in/in/F, L in inches, dT = |T_operating - T_install|); cold-spring gap = (factor/100) * dL; residual movement = dL - gap.",
    edition: "Pipe cold spring (cut-short) - the run is cut short by a fraction of the computed free thermal growth and sprung into place at the install temperature, lowering the hot anchor and equipment-nozzle reactions - per ASME B31.1 Power Piping §119 / B31.9 Building Services Piping, by name; first-principles linear expansion.",
    freeAccess: "First-principles linear expansion. Cold spring does not reduce the cyclic stress range (B31.1 §119.10); B31.1 credits two-thirds of the cold spring in the reaction. The piping engineer governs the flexibility analysis.",
    governance: GOVERNANCE.mechanical,
    editionNote: "ASME B31.1 §119 / B31.9. Coefficients match the pipe-expansion-loop tile (data/plumbing/thermal-expansion-coefficients.json); the 50% cold-spring factor is the common default and is user-adjustable. Cross-links pipe-expansion-loop.",
    assumptions: [
      { name: "Expansion coefficient", value: "alpha per material: steel 6.5e-6, copper 9.4e-6, PVC 3.0e-5, PEX 1.1e-4 in/in/F (matches the sibling tile); user-overridable", source: "ASME B31 / manufacturer bulletins" },
    ],
  },
  "raceway-expansion-fitting": {
    formula: "dL = alpha * L * dT with alpha = 3.38e-5 in/in/F (NEC Table 352.44 PVC); an expansion fitting is required where dL >= 0.25 in in a straight run; fittings = ceil(dL / fitting_travel).",
    edition: "PVC raceway thermal expansion and expansion-fitting sizing - the length change over the run from the temperature range, the 0.25 in straight-run threshold, and the fitting count - per NEC Article 352.44 and Table 352.44 (rigid PVC conduit), by name; first-principles linear expansion.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. The 3.38e-5 in/in/F PVC-conduit coefficient is the NEC Table 352.44 figure, distinct from PVC pipe.",
    governance: GOVERNANCE.electrical,
    editionNote: "NEC Article 352.44 / Table 352.44. The AHJ-adopted NEC edition governs; the fitting piston is set per the manufacturer's temperature chart at the install temperature. Distinct from the pipe-cold-spring tile (piping, ASME B31).",
    assumptions: [
      { name: "Conduit coefficient", value: "3.38e-5 in/in/F for rigid PVC conduit per NEC Table 352.44; user-overridable for RTRC / other raceway", source: "NEC Table 352.44" },
    ],
  },
  "pipe-spacing-rack": {
    formula: "Insulated OD = pipe OD + 2 * insulation thickness; center-to-center = insulated OD + clearance; bundle width = n * insulated OD + (n-1) * clearance; pipes that fit = floor((rack width + clearance) / center-to-center).",
    edition: "Insulated parallel-pipe rack spacing - center-to-center, total bundle width, and rack fit from the pipe OD, insulation thickness, and air-gap clearance - first-principles geometry; the insulated outside diameter follows the ASTM C585 nominal pipe-insulation dimensions, by name.",
    freeAccess: "First-principles geometry. The clearance allowance and the hanger / support span (MSS SP-58) are separate checks; the mechanical contractor governs the rack layout.",
    governance: GOVERNANCE.mechanical,
    editionNote: "ASTM C585 (insulated OD) with first-principles geometry; MSS SP-58 hanger spacing is cross-referenced, not bundled. Cross-links pipe-cold-spring.",
    assumptions: [
      { name: "Insulated OD", value: "pipe OD plus twice the nominal insulation thickness (ASTM C585 sizing); the actual jacket OD is read off the insulation", source: "ASTM C585" },
    ],
  },
  "groove-weld-strength": {
    formula: "Effective throat: CJP = thinner connected part thickness, PJP = WPS effective throat; weld-metal shear (AISC Table J2.5) Fnw = 0.60*FEXX; ASD allowable 0.30*FEXX, LRFD design 0.75*0.60*FEXX; capacity = stress * throat * length.",
    edition: "Groove weld (CJP / PJP) shear capacity - the AISC 360 Table J2.5 weld-metal shear strength 0.60*FEXX on the effective throat - per AWS D1.1 Structural Welding Code and AISC 360 §J2, by name; first-principles.",
    freeAccess: "First-principles AISC J2 shear. A CJP weld with matching filler develops the base metal in tension/compression; the PJP effective throat is read off the qualified WPS. The WPS, weld inspector, and engineer of record govern.",
    governance: GOVERNANCE.structural,
    editionNote: "AWS D1.1 / AISC 360 §J2 Table J2.5. ASD vs LRFD is a labeled toggle; the resistance factors match the fillet-weld-strength tile, which it complements (groove throat vs fillet 0.707*leg).",
    assumptions: [
      { name: "Effective throat", value: "CJP uses the thinner part thickness; PJP uses the WPS effective throat (groove depth less the AWS Table 3.1 reduction); user-supplied", source: "AWS D1.1 Table 3.1" },
    ],
  },
  "duct-static-pressure-total": {
    formula: "Total external static pressure (TESP) = sum of all external component pressure drops (filter, registers, grilles, wet coil, dampers, duct-run friction); remaining = blower rated ESP - TESP; within rating when TESP <= rated.",
    edition: "Total external static pressure roll-up - the sum of every external resistance the blower must overcome, checked against the blower fan table's rated static - per ACCA Manual D and the ASHRAE / SMACNA duct-design practice, by name; first-principles pressure accounting.",
    freeAccess: "First-principles pressure accounting. Component drops are user-supplied from the manufacturer tables or a manometer; the blower fan table governs the delivered CFM at this static.",
    governance: GOVERNANCE.mechanical,
    editionNote: "ACCA Manual D / SMACNA. A blank rating suppresses the verdict; component drops sum in in. w.c. The blower fan table governs the delivered CFM.",
    assumptions: [
      { name: "Component drops", value: "each external resistance in in. w.c. from the manufacturer tables or a manometer reading; user-supplied", source: "ACCA Manual D / equipment fan tables" },
    ],
  },
  "compression-ratio-refrig": {
    formula: "Compression ratio = absolute discharge / absolute suction = (discharge_psig + atmospheric) / (suction_psig + atmospheric); high-ratio flag above about 10:1.",
    edition: "Refrigeration compression ratio = absolute discharge pressure / absolute suction pressure - per the ASHRAE Handbook Refrigeration compressor-performance fundamentals, by name; first-principles.",
    freeAccess: "First-principles absolute-pressure ratio. Use the site atmospheric pressure at altitude, not 14.7, for accuracy. The compressor manufacturer's operating envelope governs.",
    governance: GOVERNANCE.mechanical,
    editionNote: "ASHRAE Refrigeration. The gauge-to-absolute conversion uses a user-adjustable atmospheric pressure; about 10:1 is the single-stage concern threshold (discharge temperature, volumetric-efficiency loss).",
    assumptions: [
      { name: "Atmospheric pressure", value: "14.696 psia at sea level default; user-adjustable for altitude", source: "site barometric pressure" },
    ],
  },

  // spec-v90..v100 (25 tiles)
  "food-cost-percentage": {
    formula: "COGS = beginning inventory + purchases - ending inventory; food cost % = COGS / food sales x 100; variance = actual - theoretical (in points and dollars).",
    edition: "Standard restaurant-accounting identity (NRA / restaurant P&L practice, by name).",
    freeAccess: "NRA Restaurant Industry Forecast free at restaurant.org.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Benchmark food-cost band", value: "full-service ~28-35% of food sales (advisory)", source: "NRA industry medians" },
    ],
  },
  "prime-cost": {
    formula: "COGS = food + beverage; prime cost = COGS + total labor; prime/labor/COGS percents are of total sales.",
    edition: "Standard restaurant P&L prime-cost definition (NRA / restaurant-accounting practice, by name).",
    freeAccess: "NRA Restaurant Industry Forecast free at restaurant.org.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Prime-cost benchmark", value: "<=~60% of sales full-service, ~55% limited-service (advisory)", source: "NRA industry medians" },
    ],
  },
  "pour-cost": {
    formula: "Pours per bottle = bottle size mL / (pour oz x 29.5735); cost per pour = bottle cost / pours; suggested price = (cost per pour + add) / target pour cost.",
    edition: "First-principles bar cost control; US fluid-ounce 29.5735 mL.",
    freeAccess: "First-principles; no proprietary source reproduced.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Spirit pour-cost band", value: "~18-24% (beer and wine higher) (advisory)", source: "bar-management practice" },
    ],
  },
  "load-profitability": {
    formula: "Net = revenue - (total miles/MPG x fuel + total miles x variable cpm + fixed/day x days + tolls + other); profit per loaded mile = net / loaded miles.",
    edition: "First-principles owner-operator load economics; consumes the cost-per-mile structure.",
    freeAccess: "First-principles; no proprietary source reproduced.",
    governance: GOVERNANCE.trucking,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Target margin band", value: "~$0.50-0.75 over all-in cost per mile (advisory)", source: "owner-operator practice" },
    ],
  },
  "fuel-surcharge": {
    formula: "FSC/mi = (current - base) / MPG peg when current > base, else 0; total = FSC/mi x loaded miles.",
    edition: "Standard pegged fuel-surcharge identity; DOE/EIA weekly national average diesel index (by name).",
    freeAccess: "DOE/EIA weekly diesel price free at eia.gov.",
    governance: GOVERNANCE.trucking,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Index", value: "DOE/EIA national average unless the contract names another (advisory)", source: "DOE/EIA" },
    ],
  },
  "maintenance-reserve": {
    formula: "Total reserve cpm = tire set / tire life + PM cost / PM interval + major-component reserve; monthly = total cpm x monthly miles.",
    edition: "First-principles owner-operator reserve discipline.",
    freeAccess: "First-principles; no proprietary source reproduced.",
    governance: GOVERNANCE.trucking,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Major-component reserve", value: "a few cents per mile over the truck's life (editable)", source: "owner-operator practice" },
    ],
  },
  "led-video-wall": {
    formula: "Size = cabinet pixels x pitch x grid / 304.8 mm/ft; weight/power = per-cabinet x cabinets; minimum view ~ pixel pitch (mm) x 3.28084 (the ~1 m per 1 mm rule).",
    edition: "LED panel maker's spec sheet (native pixel count, pitch, weight, peak watts, by name); 304.8 mm/ft, 3.28084 ft/m.",
    freeAccess: "Panel spec sheets free at the maker's product pages.",
    governance: GOVERNANCE.worker_safety,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Average-power factor", value: "~0.30-0.40 of peak for real content (default 0.35, editable)", source: "panel engineering practice" },
    ],
  },
  "projector-brightness": {
    formula: "Required lumens = target foot-lamberts x screen area / gain; throw distance = throw ratio x screen width.",
    edition: "Standard AV screen-luminance identity (SMPTE-style targets, by name); foot-lamberts = lumens x gain / area.",
    freeAccess: "Screen-luminance methods free at projector and screen maker technical pages.",
    governance: GOVERNANCE.worker_safety,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Target luminance band", value: "~16 fL dark room, ~30-50 fL ambient (default 16, editable)", source: "SMPTE-style AV practice" },
    ],
  },
  "room-acoustics": {
    formula: "RT60 = 0.049 x V / A (Sabine, imperial); first axial mode per dimension = c / (2 x length), c = 1130 ft/s.",
    edition: "W.C. Sabine reverberation equation (public domain); axial room-mode relation f = c / (2 x L) from first-principles standing-wave acoustics.",
    freeAccess: "Sabine's collected papers and the half-wavelength room-mode relation are public-domain physics.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (public-domain physics / first-principles take-off; the 0.049 and 1130 constants are bundled editable fields).",
    assumptions: [
      { name: "Sabine coefficient", value: "0.049 (imperial, ft and ft^3; default, editable)", source: "Sabine equation" },
      { name: "Speed of sound", value: "1130 ft/s at room temperature (default, editable)", source: "First-principles acoustics" },
    ],
  },
  "pool-alkalinity-adjust": {
    formula: "Raise: ~1.5 lb sodium bicarbonate per 10,000 gal per 10 ppm; lower: ~25 fl oz of 31.45% (20 Baume) muriatic acid per 10,000 gal per 10 ppm.",
    edition: "NSPF CPO Handbook / ANSI-APSP-ICC dosing tables (by name).",
    freeAccess: "Product labels and SDS free with the chemical; CPO course materials proprietary.",
    governance: GOVERNANCE.worker_safety,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Target TA band", value: "~80-120 ppm (advisory; lower for salt/plaster, higher for vinyl)", source: "NSPF CPO" },
    ],
  },
  "pool-cya-dose": {
    formula: "Raise: ~0.81 lb (~13 oz) cyanuric acid per 10,000 gal per 10 ppm; lower: drained fraction = 1 - target/current.",
    edition: "NSPF CPO Handbook / ANSI-APSP-ICC (by name).",
    freeAccess: "Product labels and SDS free with the chemical; CPO course materials proprietary.",
    governance: GOVERNANCE.worker_safety,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Target CYA band", value: "~30-50 ppm outdoor chlorine pool (advisory)", source: "NSPF CPO" },
    ],
  },
  "pool-chlorine-dose": {
    formula: "lb_cl = ppm x (gallons/1e6) x 8.34; lb_prod = lb_cl / (avail/100); dry_oz = lb_prod x 16; liq_floz = (lb_prod/10) x 128.",
    edition: "The standard pool free-chlorine dose mass balance and product available-chlorine fractions, by name.",
    freeAccess: "The 8.34 lb/gal water constant and product available-chlorine strengths are published free by pool-care references and product labels. The product label directions govern.",
    governance: GOVERNANCE.general,
    editionNote: "The free-chlorine dose: pounds of chlorine = ppm x (gallons/1,000,000) x 8.34, divided by the product's available-chlorine fraction (liquid 12.5%, cal-hypo 65%, dichlor 56%, trichlor 90%, or a custom %) for the product weight, then dry ounces or (liquid ~10 lb/gal) fluid ounces. A weaker product needs proportionally more weight. This returns the dose to raise free chlorine by the target: it does not subtract the pool's existing chlorine demand and does not model the CYA (stabilizer) effect on effective chlorine. Dose to a target and retest; the product label directions govern.",
    assumptions: [
      { name: "Mass balance", value: "lb chlorine = ppm x (gal/1e6) x 8.34; product weight = /available fraction", source: "pool-care practice" },
      { name: "Product strengths", value: "liquid 12.5%, cal-hypo 65%, dichlor 56%, trichlor 90%; liquid ~10 lb/gal", source: "product labels" },
      { name: "No demand/CYA", value: "does not subtract chlorine demand or model the CYA effect", source: "scope of this tile" },
    ],
  },
  "pool-heater-btu": {
    formula: "Q_btu = gallons x 8.34 x dT; delivered = output x eff; hours = Q_btu / delivered.",
    edition: "The sensible water-heating relation (1 Btu raises 1 lb of water 1 F), by name.",
    freeAccess: "The water-heating energy relation and the 8.34 lb/gal constant are standard published values. The equipment ratings and site conditions govern.",
    governance: GOVERNANCE.general,
    editionNote: "The pool heat-up: energy Btu = gallons x 8.34 lb/gal x temperature rise, and the heat-up time = energy / (heater output x efficiency). A gas heater at ~80% warms fast; a heat pump (entered as its COP-equivalent Btu/h) is far slower but cheaper to run, so it is left on to hold temperature rather than for a quick warm-up. This returns the sensible heat-up only: it ignores the cover, evaporation, and standby losses, so real heat-up takes longer, and it does not size the gas line or verify the electrical service. A sizing estimate; the equipment ratings and site conditions govern.",
    assumptions: [
      { name: "Sensible heat", value: "Btu = gallons x 8.34 x dT; 1 Btu raises 1 lb water 1 F", source: "thermodynamics" },
      { name: "Heat-up time", value: "hours = energy / (output x efficiency); enter COP-equiv Btu/h for a heat pump", source: "equipment ratings" },
      { name: "No standby loss", value: "ignores cover/evaporation/standby losses; real heat-up runs longer", source: "scope of this tile" },
    ],
  },
  "breakpoint-chlorination": {
    formula: "combined = total - free; dose_ppm = ratio x combined (ratio ~10); optional lb_product = dose_ppm x (gal/1e6) x 8.34 / (avail/100).",
    edition: "The breakpoint (superchlorination) chlorination rule and Standard Methods 4500-Cl, by name.",
    freeAccess: "The breakpoint-curve behavior and the ~10:1 shock rule are published free by pool-care and water-treatment references (Standard Methods 4500-Cl). The product label and testing govern.",
    governance: GOVERNANCE.general,
    editionNote: "Breakpoint (superchlorination) shock: combined chlorine (chloramines) = total - free, and the free-chlorine dose to reach breakpoint = ratio x combined (commonly ~10:1). Chloramines cause the 'chlorine smell' and eye irritation; a partial dose below breakpoint makes it worse, so shock all the way. A heavier chloramine load needs a proportionally heavier shock. This returns the ppm dose (and, with optional volume and product strength, the product weight): the 10:1 is a rule of thumb, the actual breakpoint is confirmed by testing, and it does not add the pool's baseline chlorine demand. A pool-care aid; the product label and testing govern.",
    assumptions: [
      { name: "Combined chlorine", value: "combined = total - free; dose = ratio x combined (ratio ~10)", source: "breakpoint curve / Standard Methods 4500-Cl" },
      { name: "Shock past breakpoint", value: "a partial dose below breakpoint worsens chloramines", source: "pool-care practice" },
      { name: "Confirm by testing", value: "10:1 is a rule of thumb; confirm the breakpoint by testing; no baseline demand added", source: "scope of this tile" },
    ],
  },
  "pool-salt-dose": {
    formula: "Add: salt lb = gallons x 8.34 lb/gal x ppm rise / 1,000,000, bags = ceil(lb / 40); lower: drained fraction = 1 - target/current.",
    edition: "Mass-balance identity (NSPF CPO / ANSI-APSP-ICC, by name); 8.34 lb/gal water.",
    freeAccess: "Cell spec plate and salt-bag label free with the equipment.",
    governance: GOVERNANCE.worker_safety,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Target salt band", value: "~3,000-3,500 ppm on the cell spec plate (advisory)", source: "salt-cell maker" },
    ],
  },
  "fence-estimate": {
    formula: "Sections = ceil(run / spacing); posts = sections + 1; rails = sections x rails/section; pickets = ceil(run x 12 / (picket width + gap)).",
    edition: "Standard fence-layout identities.",
    freeAccess: "First-principles; no proprietary source reproduced.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "End-post rule", value: "straight run posts = sections + 1; corners/ends/gates added by eye", source: "fence-layout practice" },
    ],
  },
  "post-hole-concrete": {
    formula: "Per hole = pi x (dia/2)^2 x depth / 1728 - post_side^2 x depth / 1728; total = per hole x posts; bags = ceil(total cu ft / bag yield).",
    edition: "Cylinder-volume geometry less post displacement; bagged-concrete yields ~0.45 cu ft (60-lb) / 0.60 cu ft (80-lb).",
    freeAccess: "Bag yields free on the concrete-bag label.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Bag yield", value: "~0.45 cu ft (60-lb) / 0.60 cu ft (80-lb) mixed (editable)", source: "bagged-concrete labels" },
    ],
  },
  "thinset-coverage": {
    formula: "Coverage per bag from the square-notch trowel (~95 / 63 / 45 sq ft for 1/4 / 1/4x3/8 / 1/2 in); bags = ceil(area x (1 + waste) / coverage).",
    edition: "Manufacturer thin-set coverage charts (Custom Building Products / Mapei / Laticrete, by name); ANSI A108 mortar-contact minimum.",
    freeAccess: "Coverage charts free at the maker's technical pages.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Mortar contact", value: "ANSI A108 ~80% dry / 95% wet or exterior (do not stretch a bag)", source: "ANSI A108" },
    ],
  },
  "flooring-takeoff": {
    formula: "Boxes = ceil(area x (1 + pattern waste) / box coverage); last row from full_rows = floor(width / plank), rip if the remainder is under a third of a plank.",
    edition: "Published flooring waste rules of thumb and the standard last-row balancing rule.",
    freeAccess: "First-principles; flooring-maker layout guides free at maker pages.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Pattern waste", value: "~10% straight / 15% diagonal / 17% herringbone (editable)", source: "flooring-install practice" },
    ],
  },
  "control-joint-spacing": {
    formula: "Spacing = min(factor x thickness, cap); depth = 0.25 x thickness; panels = ceil(length/spacing) x ceil(width/spacing); aspect kept under ~1.5:1.",
    edition: "ACI 302.1R / 360R slab-on-ground guidance (by name).",
    freeAccess: "ACI documents licensed; the rule of thumb is public practice.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Spacing factor and cap", value: "~2.5 ft per inch of thickness, capped ~15-18 ft (editable)", source: "ACI 302.1R / 360R" },
    ],
  },
  "rebar-lap-splice": {
    formula: "Lap = max(lap factor x bar diameter, 12 in); db from the #3..#11 table (bar number / 8 in for #3..#8).",
    edition: "ACI 318 development-and-splice basis (Class B tension lap ~1.3 x development length, by name).",
    freeAccess: "ACI 318 licensed; the bar-diameter field rule is public practice.",
    governance: GOVERNANCE.structural,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Lap factor", value: "40-48 bar diameters for Grade 60 in 4,000 psi normalweight, never less than 12 in (editable)", source: "ACI 318" },
    ],
  },
  "paver-patio": {
    formula: "Pavers/sq ft = 144 / face area; pavers = ceil(area x pavers/sq ft x (1 + waste)); base/sand cu yd = area x depth(in) / 324.",
    edition: "ICPI interlocking-paver base and bedding guidance (by name).",
    freeAccess: "ICPI tech specs free at icpi.org.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Base depth band", value: "~4-6 in walkway/patio, 8-12 in driveway, ~1 in bedding sand (editable)", source: "ICPI" },
    ],
  },
  "retaining-wall-block": {
    formula: "Buried = max(1 in/ft of height, one block height); courses = ceil(total height / block height); total = courses x ceil(run x 12 / block length); gravel by zone geometry.",
    edition: "Segmental retaining-wall maker guidance (Allan Block / Versa-Lok, by name).",
    freeAccess: "Install guides free at the block maker's pages.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Embedment + drainage", value: "bury ~1 in per ft, 2 ft x 6 in base pad, 12 in drainage zone (editable); engineered design over ~4 ft", source: "Allan Block / Versa-Lok" },
    ],
  },
  "attic-ventilation": {
    formula: "Required NFA = floor area / divisor; x 144 to sq in; split half intake / half exhaust; vents = ceil(intake / per-vent NFA); ridge ft = exhaust / per-foot NFA.",
    edition: "IRC R806 attic-ventilation rule (by name).",
    freeAccess: "IRC available to read free at codes.iccsafe.org; vent NFA on the product label.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Ratio", value: "1/150, reducible to 1/300 with a balanced split + vapor retarder (advisory)", source: "IRC R806" },
    ],
  },
  "gutter-downspout": {
    formula: "Adjusted area = plan area x pitch factor x (rainfall / 5 in/hr); downspouts = ceil((adjusted / 100) / downspout sq in); gutter 5 in K-style up to ~5,520 sq ft else 6 in.",
    edition: "SMACNA / standard residential gutter method (by name).",
    freeAccess: "SMACNA licensed; rainfall intensity free from NOAA Atlas 14 at hdsc.nws.noaa.gov.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Reference intensity", value: "5 in/hr reference; 1 sq in of downspout per ~100 sq ft of roof (editable)", source: "SMACNA practice" },
    ],
  },
  "assembly-r-value": {
    formula: "U_assembly = framing factor x 1/R_framing-path + (1 - factor) x 1/R_cavity-path; R = 1/U; framing path adds stud depth x 1.25 R/in.",
    edition: "ASHRAE Handbook of Fundamentals parallel-path (isothermal-planes) method (by name).",
    freeAccess: "ASHRAE Fundamentals licensed; air-film and material R-values widely published free.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Framing factor", value: "~0.25 at 16 in o.c., 0.22 at 24 in o.c.; softwood ~1.25 R/in (editable)", source: "ASHRAE / DOE" },
    ],
  },
  "blown-insulation-coverage": {
    formula: "Bags = ceil(area / 1000 x bags per 1,000); coverage per bag = 1000 / bags-per-1000; minimum thickness = target R / R-per-inch.",
    edition: "Manufacturer blown-insulation coverage charts (by name).",
    freeAccess: "Coverage charts free on the insulation bag and the maker's pages.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "R per inch", value: "~3.5 cellulose, ~2.5 blown fiberglass (editable); read the bag's settled-thickness column", source: "insulation maker charts" },
    ],
  },
  "paint-mix-ratio": {
    formula: "Hardener = base x hardener parts / paint parts; reducer = base x reducer parts / paint parts; total = base + hardener + reducer; mL = oz x 29.5735.",
    edition: "Paint manufacturer technical data sheet (mix ratio by volume; by name); 29.5735 mL per US fluid ounce.",
    freeAccess: "Mix ratios free on the product technical data sheet.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Induction and pot life", value: "~10-30 min induction, ~1-4 hr pot life at 70 F (off the TDS, not computed)", source: "paint TDS" },
    ],
  },
  "cutting-fluid-concentration": {
    formula: "Concentration % = Brix x refractometer factor; add concentrate = sump x (target - current) / (100 - target); add water = sump x (current - target) / target.",
    edition: "Metalworking-fluid refractometer method (by name).",
    freeAccess: "Refractometer factor and the maintenance range free on the coolant data sheet.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice / first-principles take-off; refresh as practice and product data shift).",
    assumptions: [
      { name: "Maintenance range", value: "often ~6-10% for general machining; factor usually 1-4 (off the data sheet)", source: "coolant data sheet" },
    ],
  },
  "spindle-power-torque": {
    formula: "Cutting horsepower = MRR (in3/min) x unit power (hp per in3/min); motor horsepower = cutting hp / (efficiency / 100); spindle torque (lb-ft) = 5252 x cutting hp / rpm.",
    edition: "Cutting power and spindle torque - first-principles specific-cutting-energy relation with Machinery's Handbook (Industrial Press) unit-power values, by name; the 5252 torque constant is universal.",
    freeAccess: "The specific-cutting-energy arithmetic is public; the material removal rate, unit power, efficiency, and rpm are user-supplied.",
    governance: GOVERNANCE.general,
    editionNote: "First-principles specific-cutting-energy relation. The unit-power (specific cutting energy) values are Machinery's Handbook tabular references (about 1.0 hp per in3/min carbon steel, 0.33 aluminum, 1.5 stainless/titanium); the tool, sharpness, and machine govern the real draw -- this is the stall / motor-size check before a heavy cut.",
    assumptions: [
      { name: "Unit power", value: "specific cutting energy, hp per in3/min: ~1.0 carbon steel, ~0.33 aluminum, ~1.5 stainless/titanium; default 1.0", source: "Machinery's Handbook" },
      { name: "Drive efficiency", value: "spindle drive efficiency; default 80%", source: "machine data" },
    ],
  },
  "pull-box-sizing": {
    formula: "Straight pull: min = 8 x largest raceway. Angle/U pull: min = 6 x largest raceway + sum of same-row others. Between same-conductor entries: >= 6 x larger raceway.",
    edition: "NEC (NFPA 70) 314.28(A)(1) and (A)(2) (by name).",
    freeAccess: "NFPA 70 free read-only at nfpa.org (registration); the multipliers are stated, not reproduced.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the code section and the design standard govern; the AHJ is the law).",
    assumptions: [
      { name: "Straight-pull multiplier", value: "8x the largest raceway trade size (NEC 314.28(A)(1))", source: "NEC 314.28(A)(1)" },
      { name: "Angle/U-pull multiplier", value: "6x the largest raceway + the sum of the other same-row raceways (NEC 314.28(A)(2))", source: "NEC 314.28(A)(2)" },
      { name: "Minimums only", value: "the box's listed dimensions, conductor bending space, and the AHJ govern", source: "NEC 314.28" },
    ],
  },
  "lumen-method": {
    formula: "count = ceil(target_fc x area / (lumens_per_lum x CU x LLF)); achieved_fc = count x lumens_per_lum x CU x LLF / area. 1 fc = 1 lumen per square foot.",
    edition: "IES lumen method (zonal-cavity number-of-luminaires relation, by name).",
    freeAccess: "Method is public lighting practice; CU comes from the maker's photometric report.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (engineering-practice / first-principles; refresh as practice shifts).",
    assumptions: [
      { name: "Coefficient of utilization", value: "default 0.7; read from the photometric report at the room cavity ratio and reflectances; bounded (0, 1.5]", source: "IES lumen method" },
      { name: "Light-loss factor", value: "default 0.8 = lamp-lumen depreciation x luminaire-dirt depreciation; bounded (0, 1]", source: "IES lumen method" },
      { name: "Average maintained", value: "sizes the average level over the work plane, not a point value or uniformity; a photometric layout governs spacing", source: "IES lumen method" },
    ],
  },
  "condensate-drain": {
    formula: "rate_gph = tons x pints_per_ton_hr / 8. Drain size by IMC 307.2.2 capacity steps (3/4 in to 20 tons, then 1, 1-1/4, 1-1/2, 2 in). fall = run x slope (>= 1/8 in/ft per 307.2.5).",
    edition: "IMC 307.2.2 (drain size by capacity) and 307.2.5 (slope) (by name).",
    freeAccess: "IMC free read-only at codes.iccsafe.org; the size steps are stated, not reproduced.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the code and the equipment manual govern).",
    assumptions: [
      { name: "Condensate rate", value: "default 3 pints per ton-hour, editable; about 2 to 4 is common in humid cooling. Tracks the latent load, not a code value", source: "field estimate" },
      { name: "Drain size steps", value: "IMC 307.2.2 by equipment capacity; 8 pints per gallon", source: "IMC 307.2.2" },
      { name: "Slope", value: "not less than 1/8 in per foot toward the discharge (IMC 307.2.5); a draw-through coil needs a trap", source: "IMC 307.2.5" },
    ],
  },
  "recovery-cylinder": {
    formula: "specific_gravity = density(lb/gal) / 8.34; max_net = 0.80 x water_capacity x specific_gravity; remaining = max(0, max_net - current). Do not fill when current >= max_net.",
    edition: "DOT / AHRI 700 / EPA Section 608 recovery practice (by name).",
    freeAccess: "The 80% fill rule and the WC/tare basis are public refrigerant-handling practice.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the cylinder stamp, the property sheet, and EPA 608 govern).",
    assumptions: [
      { name: "Fill fraction", value: "0.80 maximum (the 80% rule leaves room for liquid expansion with temperature); never fill past it", source: "DOT / AHRI 700" },
      { name: "Net basis", value: "water capacity (WC) and tare are stamped on the cylinder; net = gross on the scale minus tare; 8.34 lb per gallon water basis", source: "cylinder stamp" },
      { name: "Handling", value: "never mix refrigerants; use only a cylinder rated and in-date for recovery; EPA Section 608 governs", source: "EPA 608" },
    ],
  },
  "hvac-equipment-circuit": {
    formula: "MCA = 1.25 x largest motor RLA + sum of the other loads (NEC 440.33). MOCP = 1.75 x largest RLA + others, taken to the next NEC 240.6(A) standard size DOWN (NEC 440.22(A)); the 225% value is the ceiling allowed only where the 175% size will not start the equipment.",
    edition: NEC_2023 + " Section 440.33 (MCA), 440.22(A) (MOCP), and 240.6(A) (standard device sizes).",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: "Single-edition (verify the NEC edition adopted by your AHJ; the equipment nameplate's stamped MCA/MOCP governs).",
    assumptions: [
      { name: "RLA basis", value: "the largest motor's rated-load amps (RLA), not locked-rotor amps (LRA); the compressor is normally the largest", source: "NEC 440.33" },
      { name: "MOCP rounding", value: "175% is a ceiling, so the device is the largest NEC 240.6(A) standard size not exceeding it (round down); 225% only if needed to start", source: "NEC 440.22(A)" },
      { name: "Conductor", value: "the branch-circuit conductor ampacity must be at least the MCA", source: "NEC 440.32 / 440.33" },
    ],
  },
  "run-capacitor-microfarad": {
    formula: "measured_uf = 1e6 x I / (2 x pi x 60 x V) ~= 2652 x measured_amps / measured_volts (the in-circuit capacitance from Xc = 1/(2 x pi x f x C) at 60 Hz). Band = rated_uf x (1 +/- tolerance%/100); within / below / above gives the good / weak / replace verdict.",
    edition: "First-principles capacitive reactance (public); +/-6% run-capacitor tolerance is the common motor-capacitor convention (by name).",
    freeAccess: "The capacitive-reactance relation is public physics; the tolerance is an editable field convention.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the capacitor nameplate and the equipment manual govern; discharge before handling).",
    assumptions: [
      { name: "Frequency", value: "60 Hz line frequency (the 2652 constant is 1e6 / (2 x pi x 60))", source: "first principles" },
      { name: "Tolerance", value: "default +/-6% for run capacitors (editable); start capacitors use a wider band", source: "motor-capacitor convention" },
      { name: "Measurement", value: "amps by clamp on a capacitor lead and volts across its terminals with the unit running; replace with equal microfarad and equal-or-higher voltage rating", source: "field practice" },
    ],
  },
  "vacuum-decay-test": {
    formula: "rise_micron = end_micron - start_micron; rate_micron_per_min = rise / hold_min. Verdict: end at or below the pass ceiling (default 500 microns) is tight and dry; above it is residual moisture/outgassing if it plateaus or a leak if it climbs steadily.",
    edition: "First-principles standing-decay (blank-off) arithmetic (public); the 500-micron evacuation target and valve-off decay test are the common HVAC field convention (ACCA Standard 4 / AHRI / equipment manual, by name).",
    freeAccess: "The rise/time arithmetic is public; the 500-micron pass ceiling is an editable field convention.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the equipment manufacturer and the licensed tech govern; use an electronic micron gauge, not the manifold compound gauge).",
    assumptions: [
      { name: "Pass ceiling", value: "default 500 microns at valve-off (editable); some manufacturers call for a deeper hold", source: "ACCA Standard 4 / AHRI / equipment manual" },
      { name: "Moisture vs leak", value: "a rise that plateaus below ~1000-1500 microns is residual moisture/outgassing; a steady climb that does not plateau is a leak", source: "field practice" },
      { name: "Instrument", value: "read with an electronic micron (vacuum) gauge isolated from the pump, not the manifold compound gauge", source: "field practice" },
    ],
  },
  "nitrogen-pressure-test": {
    formula: "Gay-Lussac at constant volume: expected_psig = (start_psig + atm) x (T2_R / T1_R) - atm, with T_R = T_F + 459.67. leak_drop_psi = expected_psig - end_psig (positive = lost below the temperature-corrected value = leak); within +/- tolerance is a thermal-only hold.",
    edition: "First-principles Gay-Lussac's law (ideal gas at constant volume, public physics); the standing nitrogen pressure test with temperature correction is standard refrigeration leak-check practice (by name).",
    freeAccess: "The P/T = constant gas law is public physics; the test pressure and tolerance are editable field values.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the equipment and component pressure ratings and the AHJ govern; use dry nitrogen, never oxygen or acetylene).",
    assumptions: [
      { name: "Absolute units", value: "pressures in psia = psig + atmospheric (default 14.7); temperatures in Rankine = F + 459.67", source: "first principles" },
      { name: "Constant volume", value: "the system volume is fixed over the hold, so P/T is constant (Gay-Lussac)", source: "ideal-gas law" },
      { name: "Tolerance", value: "default +/-1 psi band on the leak figure (editable); read both temperatures at the same point on the system", source: "field practice" },
    ],
  },
  "main-disinfection-chlorine": {
    formula: "volume_gal = 0.0408 x diameter_in^2 x length_ft; available_cl_lb = (volume / 1,000,000) x dose_mg/L x 8.34; product_lb = available_cl / (product% / 100).",
    edition: "AWWA C651 Disinfecting Water Mains (by name).",
    freeAccess: "AWWA C651 licensed; the dose/contact-time methods are public water-works practice.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the standard and the local health authority govern; the AHJ is the law).",
    assumptions: [
      { name: "Dose / contact time", value: "default 25 mg/L held about 24 hours; another method is about 50 mg/L held about 3 hours", source: "AWWA C651" },
      { name: "Product strength", value: "cal-hypo (HTH-type) is roughly 65 to 70% available chlorine; liquid sodium hypochlorite is the label trade %", source: "product label" },
      { name: "Clearance", value: "flush and pass a bacteriological test, and dechlorinate any chlorinated water before discharge", source: "AWWA C651" },
    ],
  },
  "well-shock-chlorination": {
    formula: "well_volume_gal = 0.0408 x casing_in^2 x column_ft; bleach_gal = volume x target_ppm / (1,000,000 x (bleach% / 100)); available_cl_lb = (volume / 1,000,000) x target_ppm x 8.34.",
    edition: "AWWA A100 / state private-well shock-chlorination guidance (by name).",
    freeAccess: "State and extension well-disinfection guides are public; bleach strength is on the label.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the local health department and state well code govern the procedure).",
    assumptions: [
      { name: "Target concentration", value: "default 100 ppm; a shock is commonly about 50 to 200 ppm held overnight (often 12 to 24 hours)", source: "state well guidance" },
      { name: "Bleach strength", value: "plain unscented household bleach, about 5 to 8.25% available chlorine; ignores the slight bleach specific gravity, so round up", source: "product label" },
      { name: "Clearance", value: "pump to waste until the chlorine clears, then retest; the health department governs the bacteriological clearance", source: "state well code" },
    ],
  },
  "grounding-electrode-conductor": {
    formula: "GEC from NEC Table 250.66 by the largest ungrounded service conductor (or equivalent parallel area), then the 250.66(A)-(C) electrode caps: rod/pipe/plate sole connection not larger than 6 AWG copper / 4 AWG aluminum; concrete-encased not larger than 4 AWG copper; ground ring not smaller than the ring conductor and not smaller than 2 AWG; water-pipe / structural-steel electrode takes the full table size.",
    edition: NEC_2023 + " Section 250.66 and Table 250.66.",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Table mapping", value: "only the threshold-to-size mapping is encoded (the egc-sizing / wire-ampacity precedent), not a reproduced NFPA table", source: "NEC Table 250.66" },
      { name: "Electrode caps", value: "250.66(A) rod/pipe/plate, 250.66(B) concrete-encased, 250.66(C) ground ring; the cap is the smaller of the table size and the electrode limit", source: "NEC 250.66(A)-(C)" },
      { name: "Material", value: "the chosen material sizes both the service-conductor column and the GEC; copper default", source: "user input" },
    ],
  },
  "bonding-jumper": {
    formula: "Supply-side (main / system) jumper from Table 250.66 by the service conductor; above 1100 kcmil copper (1750 kcmil aluminum) it is at least 12.5% of the largest phase area, rounded up to a standard size (250.102(C)(1) / 250.28(D)). Equipment (load-side) jumper from Table 250.122 by the OCPD, a full-size jumper in each parallel raceway (250.102(D)).",
    edition: NEC_2023 + " Sections 250.28(D), 250.102(C) and 250.102(D).",
    freeAccess: NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "12.5% rule", value: "applies only where service phase conductors exceed 1100 kcmil copper / 1750 kcmil aluminum; the jumper is at least 0.125 x the largest phase area", source: "NEC 250.102(C)(1)" },
      { name: "Equipment mode", value: "Table 250.122 by the overcurrent device, the same mapping as the equipment grounding conductor; a full-size jumper in each parallel raceway", source: "NEC 250.102(D)" },
      { name: "Table mapping", value: "only the threshold-to-size mapping is encoded, not a reproduced NFPA table", source: "NEC Tables 250.66 / 250.122" },
    ],
  },
  "min-conductor-for-vd": {
    formula: "allowed_drop_V = target% / 100 x source_V; for each standard size smallest-up, drop = (2 for single phase, sqrt(3) for three phase) x K x I x length / cmils with K copper 12.9, aluminum 21.2 ohm-cmil/ft at 75 C; the result is the first size whose drop is at or below the allowed value.",
    edition: "First-principles I x R voltage drop (public); NEC FPN advisory 3% branch / 5% total (informational, not a requirement).",
    freeAccess: "The voltage-drop relation is public physics; the NEC FPN figures are advisory. " + NEC_FREE,
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "K-factor model", value: "the same model as the voltage-drop tile (copper 12.9, aluminum 21.2 ohm-cmil/ft at 75 C); the search ladder is 14 AWG through 4/0", source: "first principles" },
      { name: "Advisory only", value: "the NEC FPN 3% branch / 5% total figures are informational, not enforceable; the AHJ governs", source: "NEC 210.19 / 215.2 FPN" },
      { name: "Ampacity floor", value: "a voltage-drop size is a floor only; verify ampacity (310.16) and the 110.14(C) termination temperature separately", source: "NEC 310.16 / 110.14(C)" },
    ],
  },
  "gas-meter-clock": {
    formula: "cfh = (3600 / seconds-per-rev) x dial size; actual input (BTU/hr) = cfh x heating value. Verdict compares the clocked rate to the nameplate within 5%.",
    edition: "First-principles meter-clocking arithmetic (public); the heating value is an editable field.",
    freeAccess: "The clocking arithmetic is public; the gas utility's actual heating value governs the result.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the equipment rating plate and the licensed tech govern; clock with every other gas appliance off).",
    assumptions: [
      { name: "Heating value", value: "default 1030 BTU/cf natural gas (about 2500 for LP), editable; the gas utility's actual value governs and varies by supply", source: "field practice" },
      { name: "Method", value: "time one full revolution of a known test dial with every other gas appliance off (pilots included)", source: "utility meter-clocking method" },
      { name: "Verdict band", value: "within 5% of the nameplate is firing on rate; above is overfired, below is underfired", source: "field practice" },
    ],
  },
  "furnace-temp-rise": {
    formula: "delta_T = supply_air - return_air; output = input x efficiency / 100; CFM = output / (1.08 x delta_T). Verdict checks delta_T against the rating-plate rise range.",
    edition: "First-principles sensible-heat relation Qs = 1.08 x CFM x delta-T (public); the 1.08 air factor and efficiency are editable.",
    freeAccess: "The sensible-heat relation is public physics; the rating-plate rise range governs.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the equipment manufacturer's rating plate and the licensed tech govern).",
    assumptions: [
      { name: "Air factor", value: "1.08 BTU/hr per CFM per F is sea-level standard air; at altitude or high humidity it falls", source: "first principles" },
      { name: "Efficiency", value: "default 80% steady-state / thermal efficiency, an editable nameplate value", source: "rating plate" },
      { name: "Rise range", value: "default 40 to 70 F; the rating plate's stamped range is the governing limit", source: "rating plate" },
    ],
  },
  "gas-altitude-derate": {
    formula: "steps = max(0, (elevation - threshold) / 1000); factor = max(0, 1 - (derate-per-1000ft / 100) x steps); derated input = nameplate x factor. A high-altitude-kit flag is set above the threshold.",
    edition: "NFPA 54 (National Fuel Gas Code) / IFGC high-altitude provision (by name, not reproduced); the derate basis is an editable convention.",
    freeAccess: "The derate arithmetic is public; the exact basis varies by edition and AHJ. Free read-only at nfpa.org/freeaccess.",
    governance: GOVERNANCE.general,
    editionNote: "Multi-edition (the exact high-altitude basis differs by NFPA 54 / IFGC edition and jurisdiction; the manufacturer's instructions and the AHJ govern).",
    assumptions: [
      { name: "Derate basis", value: "default 4%/1000 ft above 2000 ft, both editable; the exact basis varies by edition and jurisdiction", source: "NFPA 54 / IFGC high-altitude provision" },
      { name: "Field drilling", value: "field orifice drilling is generally prohibited; use a listed manufacturer high-altitude conversion kit", source: "manufacturer instructions" },
      { name: "Floor", value: "the derate factor is floored at zero", source: "first principles" },
    ],
  },
  "gas-fuel-conversion": {
    formula: "cfh = appliance input / heating value for each fuel; orifice flow Q ~ area x sqrt(pressure / specific gravity), so holding input the area ratio = (cfh_to / cfh_from) x sqrt((p_from / sg_from) / (p_to / sg_to)).",
    edition: "First-principles orifice flow holding appliance input (public); the NG/LP heating values, specific gravities, and manifold pressures are editable defaults.",
    freeAccess: "The orifice-flow relation is public physics; the manufacturer's listed conversion kit governs.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the equipment manufacturer's listed NG/LP conversion kit and the AHJ govern).",
    assumptions: [
      { name: "Defaults", value: "NG/LP heating values 1030 / 2500 BTU/cf, specific gravities 0.60 / 1.52, manifold pressures 3.5 / 11.0 in. w.c., all editable", source: "public fuel-gas data" },
      { name: "Orifice model", value: "flow goes as area x sqrt(pressure / specific gravity); the area ratio holds appliance input across the fuel change", source: "first principles" },
      { name: "Field drilling", value: "field orifice drilling is generally prohibited; install the listed manufacturer conversion kit", source: "manufacturer instructions" },
    ],
  },
  "water-heater-storage-sizing": {
    formula: "recovery_gph = input_btuh x efficiency/100 / (8.33 x rise_F); first-hour rating FHR_gph = tank_gal x usable_fraction + recovery_gph; the verdict compares FHR to the peak-hour demand.",
    edition: "First-principles recovery Q = 8.33 x gph x delta-T with the DOE/AHRI first-hour-rating definition (usable storage plus one hour of recovery), by name, not reproduced.",
    freeAccess: "The recovery relation is public physics; the DOE/AHRI first-hour-rating test value on the EnergyGuide label and the manufacturer govern the rating.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the manufacturer's rated first-hour rating on the DOE EnergyGuide label and the AHJ govern the selection).",
    assumptions: [
      { name: "Constants", value: "8.33 lb/gal water and the default 0.70 usable-storage fraction (before the stored water drops below the set point) are editable", source: "first principles / DOE FHR method" },
      { name: "FHR definition", value: "first-hour rating = usable storage + one hour of recovery; match it to the peak-hour draw, not to tank gallons alone", source: "DOE/AHRI first-hour-rating method" },
      { name: "Check, not rating", value: "this is a sizing check; the manufacturer's tested FHR on the yellow EnergyGuide label is the governing value", source: "manufacturer EnergyGuide label" },
    ],
  },
  "guard-handrail-check": {
    formula: "guard required where surface_height > 30 in; min guard 36 in residential / 42 in commercial; max infill 4.0 in level (4.375 in stair triangle); stair handrail 34-38 in. Each measured value is compared to its limit; a 200 lb concentrated load applies regardless.",
    edition: "IRC 2021 (International Residential Code) Section R312 (guards) / R311.7.8 (handrails) and IBC 2021 Section 1015 by section; dimensional minimums only, not reproduced.",
    freeAccess: "Read-only at codes.iccsafe.org. The dimensional minimums are facts; the AHJ-adopted code and edition govern.",
    governance: GOVERNANCE.structural,
    editionNote: "Multi-edition (the AHJ-adopted IRC / IBC edition governs the guard, handrail, and infill minimums; the 200 lb concentrated load applies regardless).",
    assumptions: [
      { name: "Thresholds", value: "guard over 30 in surface; 36 in residential / 42 in commercial height; 4 in sphere (4-3/8 in stair triangle) infill; 34-38 in handrail", source: "IRC R312 / R311.7.8 / IBC 1015" },
      { name: "Load", value: "guards and handrails must also resist a 200 lb concentrated load in any direction (IRC R301.5 / IBC 1607); this tool checks dimensions only", source: "IRC R301.5" },
      { name: "AHJ governs", value: "the AHJ-adopted code and edition govern the final acceptance", source: "AHJ" },
    ],
  },
  "smooth-bore-flow": {
    formula: "gpm = 29.7 x bore_in^2 x sqrt(nozzle_pressure_psi); companion nozzle reaction = 1.57 x bore_in^2 x nozzle_pressure_psi.",
    edition: "IFSTA Pumping Apparatus Driver/Operator Handbook smooth-bore discharge form (by name); classical orifice discharge, no edition cycle.",
    freeAccess: "The discharge relation is public physics; standard nozzle pressures are 50 psi handline / 80 psi master. Incident command and the pump operator govern.",
    governance: GOVERNANCE.fire,
    editionNote: "Single-edition (the classical smooth-bore discharge form gpm = 29.7 d^2 sqrt(NP) does not roll; the standard 50 / 80 psi nozzle pressures are editable).",
    assumptions: [
      { name: "Discharge coefficient", value: "the 29.7 constant bundles the standard smooth-bore discharge coefficient and unit conversion; the tip must be a true smooth bore", source: "IFSTA" },
      { name: "Nozzle pressure", value: "default 50 psi handline / 80 psi master, editable to the tip in use", source: "IFSTA" },
      { name: "Estimate", value: "a discharge estimate; incident command governs the flow target and the pump operator sets engine pressure", source: "incident command" },
    ],
  },
  "gcwr-check": {
    formula: "combined = tractor + trailer; the binding limit is min(GCWR, federal_max); ok if combined <= binding, else over by combined - binding. GCWR margin and federal margin are reported separately.",
    edition: "23 CFR 658.17 (80,000 lb federal gross) and 49 CFR 393.75 by section, with the manufacturer's GCWR rating plate; limits not reproduced.",
    freeAccess: "Read-only at ecfr.gov. State limits may be lower than federal; a permit or the AHJ governs an over-limit move.",
    governance: GOVERNANCE.trucking,
    editionNote: "Single-edition (the federal 80,000 lb gross cap and the GCWR rating plate govern; state and permit limits may be lower and the cap is editable).",
    assumptions: [
      { name: "Binding limit", value: "the smaller of the rated GCWR (structural / drivetrain) and the federal gross cap governs", source: "23 CFR 658.17" },
      { name: "Federal cap editable", value: "default 80,000 lb; edit for a state or permit limit", source: "23 CFR 658.17" },
      { name: "Separate checks", value: "axle limits and the federal bridge formula are separate checks, not covered here", source: "23 CFR 658.17" },
    ],
  },
  "tire-load-check": {
    formula: "axle_capacity = tires_on_axle x tire_max_load; utilization% = 100 x axle_weight / axle_capacity; ok if axle_weight <= axle_capacity, else overloaded by the difference.",
    edition: "49 CFR 393.75 (tire load) by section and the DOT tire sidewall max-load marking; not reproduced.",
    freeAccess: "Read-only at ecfr.gov. The sidewall marking and inflation rating govern; use the single vs dual rating to match the wheel position.",
    governance: GOVERNANCE.trucking,
    editionNote: "Single-edition (the DOT sidewall max-load marking and 49 CFR 393.75 govern; the single vs dual rating must match the wheel position).",
    assumptions: [
      { name: "Single vs dual", value: "use the sidewall's single rating on a steer position and the dual rating in a dual position - they differ", source: "DOT sidewall marking" },
      { name: "Inflation", value: "the marked max load is rated at a specific cold inflation pressure; under-inflation lowers capacity", source: "49 CFR 393.75" },
      { name: "Not the GAWR", value: "this is a tire-load check, not a substitute for the axle's gross axle weight rating (GAWR)", source: "manufacturer GAWR" },
    ],
  },
  "chlorine-demand": {
    formula: "demand = applied - measured_residual; dose_for_target = demand + target_residual. A high demand (flagged above 4 mg/L) suggests ammonia / organics - check the breakpoint curve.",
    edition: "Standard Methods 4500-Cl / AWWA M14 (by name); applied-minus-residual mass balance, no edition cycle.",
    freeAccess: "The mass balance is public; the compliance residual, contact time, and method are set by the state primacy agency.",
    governance: GOVERNANCE.water,
    editionNote: "Single-edition (the applied-minus-residual demand balance does not roll; the state primacy agency sets the compliance residual and the method).",
    assumptions: [
      { name: "Mass balance", value: "demand is the chlorine consumed: applied minus the measured residual after the contact period", source: "Standard Methods 4500-Cl" },
      { name: "Breakpoint", value: "a high or rising demand points to ammonia / organics; free vs combined chlorine matters - check the breakpoint", source: "AWWA M14" },
      { name: "Primacy agency", value: "the state primacy agency sets the compliance residual and the approved method", source: "state primacy agency" },
    ],
  },
  "uv-dose": {
    formula: "dose_mj_cm2 = intensity_mw_cm2 x exposure_time_s (mW.s/cm^2 = mJ/cm^2); meets the target if dose >= target_dose (default 40 mJ/cm^2), else short.",
    edition: "USEPA UV Disinfection Guidance Manual (EPA 815-R-06-007) by name; dose = intensity x time, no edition cycle.",
    freeAccess: "The dose relation is public; the validated reactor dose and the state primacy agency govern compliance.",
    governance: GOVERNANCE.water,
    editionNote: "Single-edition (the dose = intensity x time relation does not roll; the validated reactor dose and the state primacy agency govern compliance).",
    assumptions: [
      { name: "Units", value: "mW.s/cm^2 equals mJ/cm^2; dose is the time integral of intensity, here intensity x time", source: "USEPA UVDGM" },
      { name: "Target", value: "a common validated target is 40 mJ/cm^2, editable to the validated reactor dose", source: "USEPA UVDGM" },
      { name: "Short dose", value: "a short dose points to an aged lamp, a fouled sleeve, or low UV transmittance (turbidity)", source: "USEPA UVDGM" },
    ],
  },
  "multi-leg-sling": {
    formula: "share_legs = (num_legs >= 3) ? 2 : num_legs; tension_per_leg = (total_load / share_legs) / sin(angle); load_factor = 1/sin(angle); equal-share reference = (total_load / num_legs) / sin(angle).",
    edition: "ASME B30.9 (Slings) by section; classical sling statics, no edition cycle.",
    freeAccess: "The statics are public; the qualified rigger and the sling's tag rating govern.",
    governance: GOVERNANCE.rigging,
    editionNote: "Single-edition (the classical sling statics do not roll; ASME B30.9 and the qualified rigger govern the lift).",
    assumptions: [
      { name: "Two-leg rule", value: "per ASME B30.9 a rigid load on 3 or more legs is assumed to hang from only 2; the conservative tension divides over 2 legs", source: "ASME B30.9" },
      { name: "Equal-share reference", value: "the equal-share value is reference only; do not use it unless an engineer qualifies a true equal-share lift", source: "ASME B30.9" },
      { name: "Angle", value: "the load factor 1/sin(angle from horizontal) grows fast as the angle flattens (1.155 at 60 deg, 2.0 at 30 deg)", source: "first principles" },
    ],
  },
  "wire-rope-strength": {
    formula: "mbs_tons = construction_factor x diameter_in^2 (default 46 tons/in^2 for IPS 6x19); wll_tons = mbs_tons / design_factor (default 5).",
    edition: "Wire Rope Users Manual rule-of-thumb (by name); MBS = factor x d^2, no edition cycle.",
    freeAccess: "An ESTIMATE only; the manufacturer's certified breaking strength governs. Do not place unmarked or uncertified rope in service.",
    governance: GOVERNANCE.rigging,
    editionNote: "Single-edition (the MBS = factor x d^2 rule-of-thumb does not roll; the manufacturer's certified breaking strength governs - this is an estimate only).",
    assumptions: [
      { name: "Construction factor", value: "the default 46 is the rule-of-thumb tons/in^2 for IPS 6x19; bright IPS, EIPS, and other constructions/grades differ - edit it", source: "Wire Rope Users Manual" },
      { name: "Design factor", value: "5:1 is typical for general rigging; the application and the AHJ set the required factor", source: "ASME B30.9" },
      { name: "Estimate only", value: "use the certified breaking strength for any real lift; never use unmarked or uncertified rope", source: "manufacturer certification" },
    ],
  },
  "hay-dry-matter": {
    formula: "dry_matter = bale_weight x (1 - moisture/100); weight_at_target = dry_matter / (1 - target_moisture/100); flag set where moisture > safe_threshold (default 18% large / 20% small).",
    edition: "First-principles dry-matter mass balance with USDA NRCS / land-grant extension safe-storage guidance (by name); no edition cycle.",
    freeAccess: "The mass balance is public; the safe-storage thresholds are editable. The producer and local extension guidance govern.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the dry-matter mass balance does not roll; the safe-storage moisture thresholds are editable and local extension guidance governs).",
    assumptions: [
      { name: "Dry-matter balance", value: "dry matter = weight x (1 - moisture); restating at a target moisture compares loads on an equal basis", source: "first principles" },
      { name: "Safe ceiling", value: "default 18% for large packages, 20% for small squares, both editable; wetter hay heats and molds", source: "USDA NRCS / extension" },
      { name: "Combustion risk", value: "very wet, tightly stacked hay can heat enough to spontaneously combust; monitor and do not store tight above the ceiling", source: "extension guidance" },
    ],
  },
  "sprinkler-precip-rate": {
    formula: "precip_in_hr = 96.3 x zone_gpm / zone_ft2 (the 96.3 constant = 231 in^3/gal / 144 in^2/ft^2 x 60 min/hr spreads 1 gpm over 1 ft^2).",
    edition: "First-principles precipitation-rate relation with the Irrigation Association design references and the Rain Bird / Hunter design manuals (by name); no edition cycle.",
    freeAccess: "The precipitation-rate relation and the 96.3 constant are public irrigation-design practice. The nozzle chart and the matched-precipitation rule are in the manufacturer's design manuals.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the 96.3 conversion and the matched-precipitation rule do not roll). The head flows come from the manufacturer's nozzle chart at the operating pressure, the zone area is the area the heads actually cover, and this is a design-rate estimate, not a system audit (irrigation-uniformity audits the installed result).",
    assumptions: [
      { name: "Precipitation-rate relation", value: "PR (in/hr) = 96.3 x zone gpm / zone area (ft^2)", source: "Irrigation Association / manufacturer design manuals" },
      { name: "Head flows", value: "the per-head flows are the manufacturer's nozzle-chart values at the operating pressure", source: "Rain Bird / Hunter nozzle charts" },
      { name: "Matched precipitation", value: "sprays (~1.5-2 in/hr) and rotors (~0.4-0.8 in/hr) apply water at very different rates and must not share a valve", source: "Irrigation Association design references" },
    ],
  },
  "irrigation-zone-runtime": {
    formula: "net_min = target_in / precip_in_hr x 60; gross_min = net_min / du; cycles = ceil(gross_min / max_cycle_min); per_cycle_min = gross_min / cycles.",
    edition: "First-principles runtime and cycle-and-soak relations with the Irrigation Association scheduling references (by name); no edition cycle.",
    freeAccess: "The runtime and cycle-and-soak relations are public irrigation-scheduling practice. The DU comes from a catch-can audit and the soil intake rate governs the cycle length.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the runtime and cycle-and-soak relations do not roll). The DU comes from a catch-can audit (irrigation-uniformity), the soil intake rate that caps the cycle length comes from the soil type, and this is a scheduling estimate that a controller and the site's actual runoff govern.",
    assumptions: [
      { name: "Net runtime", value: "net = target depth / precipitation rate x 60 (depth over rate)", source: "Irrigation Association scheduling references" },
      { name: "DU adjustment", value: "gross = net / lower-quarter distribution uniformity so the dry quarter receives the target", source: "Irrigation Association scheduling references" },
      { name: "Cycle-and-soak", value: "the gross time splits into cycles no longer than the soil/slope runoff limit, with soak gaps between them", source: "Irrigation Association scheduling references" },
    ],
  },
  "drip-zone-flow": {
    formula: "inline emitters = floor(tubing_ft x 12 / spacing_in); zone_gph = emitters x emitter_gph; zone_gpm = zone_gph / 60; utilization = zone_gpm / valve_gpm x 100.",
    edition: "First-principles total-flow and utilization relations with the Irrigation Association low-volume references and the major-manufacturer drip design data (by name); no edition cycle.",
    freeAccess: "The total-flow and utilization relations are public low-volume irrigation practice. The per-emitter flow and the valve / lateral limits are in the manufacturer's drip design data.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the total-flow and utilization relations do not roll). The per-emitter flow is the manufacturer's rated gph at the design pressure, the valve and lateral-tubing limits come from the product's published maximum flow, and this is a flow-budget check, not a hydraulic pressure-loss model.",
    assumptions: [
      { name: "Total flow", value: "zone flow = emitters x rated gph, converted to gpm (/60)", source: "Irrigation Association low-volume references" },
      { name: "Emitter count", value: "inline mode derives the count from dripline length and emitter spacing; point-source mode takes it directly", source: "manufacturer drip design data" },
      { name: "Valve capacity", value: "keep utilization under 100% of the valve / lateral limit or the far emitters starve", source: "manufacturer drip design data" },
    ],
  },
  "plant-spacing-count": {
    formula: "s_ft = spacing_in / 12; square_n = ceil(bed_ft2 / s_ft^2); triangular_n = ceil(bed_ft2 / (0.866 x s_ft^2)), 0.866 = sqrt(3)/2.",
    edition: "First-principles square- and triangular-grid relations with nursery / landscape estimating references for the staggered-grid 0.866 factor (by name); no edition cycle.",
    freeAccess: "The square- and triangular-grid relations are public planting-estimating practice; the 0.866 = sqrt(3)/2 row offset is the equilateral staggered grid.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the grid relations and the 0.866 factor do not roll). The spacing comes from the plant's mature spread or the planting plan, edge plants are rounded up so the bed is covered, and this is a planting-density count, not an irrigation or fertilization rate.",
    assumptions: [
      { name: "Square grid", value: "plants = bed area / spacing^2 (rows and columns square)", source: "nursery / landscape estimating" },
      { name: "Triangular grid", value: "plants = bed area / (0.866 x spacing^2); the 60-degree staggered rows pack about 15% more plants", source: "nursery / landscape estimating" },
      { name: "Spacing", value: "the on-center spacing is the plant's mature spread or the planting plan; edge plants round up", source: "planting plan" },
    ],
  },
  "sod-takeoff": {
    formula: "order_ft2 = lawn_ft2 x (1 + waste_pct/100); order_syd = order_ft2 / 9; slabs = ceil(order_ft2 / slab_ft2); pallets = ceil(order_ft2 / pallet_ft2).",
    edition: "First-principles area-plus-waste takeoff relation with turfgrass producer / landscape estimating references (by name); no edition cycle.",
    freeAccess: "The area-plus-waste takeoff is public estimating practice. The slab and pallet coverage are the supplier's published piece and skid sizes.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the area-plus-waste takeoff does not roll). The slab and pallet coverage are the supplier's published piece and skid sizes (they vary by farm; defaults ~10 / ~450 ft^2 are editable), the waste allowance covers cuts and edges, and this is a material takeoff, not a site-prep or establishment plan.",
    assumptions: [
      { name: "Ordered area", value: "lawn area x (1 + waste/100), restated in square yards (/9)", source: "first principles" },
      { name: "Slab and pallet coverage", value: "default ~10 ft^2 per slab and ~450 ft^2 per pallet, both editable and regional", source: "turfgrass producer references" },
      { name: "Waste allowance", value: "the waste percent covers the cuts and edges of a curvy lawn", source: "landscape estimating" },
    ],
  },
  "cmu-grout-volume": {
    formula: "cores = floor(wall_len_ft x 12 / core_spacing_in) + 1; vert_ft3 = cores x wall_ht_ft x (core_area_in2/144); bond_ft3 = wall_len_ft x (bond_area_in2/144); total_yd3 = (vert_ft3 + bond_ft3) / 27.",
    edition: "First-principles core-count and grout-volume relations with TMS 602 / ACI 530.1 (Specification for Masonry Structures) and the NCMA TEK grout references (by name).",
    freeAccess: "The core-count and grout-volume relations are public masonry-takeoff geometry. TMS 602 / ACI 530.1 and the NCMA TEK references are named; the structural drawings supply the spacing and cross-sections.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition geometry (the core-count and grout-volume relations do not roll; TMS 602 / ACI 530.1 and the NCMA TEK references are named for the practice). The grouted-cell spacing and the cross-section areas come from the structural drawings and the unit data, grout is ordered with a waste and pump allowance on top, and the engineer of record governs the reinforcement.",
    assumptions: [
      { name: "Core count", value: "cores = floor(wall length x 12 / spacing) + 1 (both ends grouted)", source: "first principles" },
      { name: "Grout volume", value: "vertical = cores x height x core area/144; bond beam = length x bond area/144 (one continuous top course)", source: "TMS 602 / ACI 530.1, NCMA TEK" },
      { name: "Cross-sections", value: "the grouted-core (~24 in^2 for an 8 in unit) and bond-beam (~30 in^2) areas come from the block manufacturer's data", source: "unit manufacturer data" },
    ],
  },
  "masonry-coursing": {
    formula: "course_in = unit_in + joint_in; courses = round(target_in / course_in); built_in = courses x course_in; off_in = target_in - built_in; on_module = |off_in| < 0.0625.",
    edition: "First-principles coursing relation with the Brick Industry Association (BIA) Technical Notes on modular masonry and the NCMA TEK dimensioning references (by name).",
    freeAccess: "The coursing relation is public modular-masonry layout (CMU 8 in course, three brick courses 8 in). The BIA Technical Notes and NCMA TEK references are named.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition geometry (the coursing relation does not roll; the BIA Technical Notes and NCMA TEK references are named for the modular dimensions). The unit and joint dimensions are nominal/modular and the actual product and the mason's joint govern, and this is a layout aid, not a structural or dimensional certification.",
    assumptions: [
      { name: "Course height", value: "course = unit height + one bed joint (CMU 7.625 + 0.375 = 8.0 in; modular brick 2.25 + 0.4167 = 2.6667 in)", source: "BIA Technical Notes / NCMA TEK" },
      { name: "Course count", value: "courses = round(target / course); built = courses x course; off = target - built", source: "first principles" },
      { name: "On module", value: "within 1/16 in of a course lands on the module; otherwise a cut course or fattened joints", source: "modular-masonry layout" },
    ],
  },
  "wallpaper-rolls": {
    formula: "strips_needed = ceil(perimeter_in / roll_width_in); strip_len_in = height_in + repeat_in; strips_per_roll = floor(roll_len_in / strip_len_in); rolls = ceil(strips_needed / strips_per_roll).",
    edition: "First-principles strips-and-rolls relations with wallcovering industry estimating practice (the strip method and the one-repeat-per-strip waste rule, by name); no edition cycle.",
    freeAccess: "The strip method and the one-repeat-per-strip waste rule are public wallcovering-estimating practice. The roll dimensions are the product's stated bolt size.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the strips-and-rolls relations do not roll). The roll dimensions are the product's stated bolt size (single/double/Euro rolls vary), door and window openings are a manual strip credit, and this is a material takeoff, not a hang plan.",
    assumptions: [
      { name: "Strips needed", value: "strips = ceil(perimeter / roll width); full-height strips across the run", source: "wallcovering estimating practice" },
      { name: "Pattern repeat", value: "strip length = wall height + one pattern repeat; one repeat is wasted per strip to match the run", source: "wallcovering estimating practice" },
      { name: "Rolls", value: "strips per roll = floor(roll length / strip length); rolls = ceil(strips needed / strips per roll)", source: "first principles" },
    ],
  },
  "ice-barrier-coverage": {
    formula: "slope_factor = sqrt(pitch_rise^2 + 144) / 12; coverage_in = (overhang_in + 24) x slope_factor; courses = coverage_in <= roll_width_in ? 1 : 1 + ceil((coverage_in - roll_width_in) / (roll_width_in - side_lap_in)); roll_lf = courses x eave_length_ft; rolls = ceil(roll_lf / roll_len_ft).",
    edition: "IRC R905.1.2 (the ice-barrier extent: from the eave to 24 in inside the exterior wall line) and ASTM D1970 (self-adhering polymer-modified membrane), by name; the coverage-and-roll relations are first-principles geometry.",
    freeAccess: "The ice-barrier extent is stated in the published IRC R905.1.2; the slope-factor and roll relations are public roofing-takeoff arithmetic. The membrane standard is ASTM D1970.",
    governance: GOVERNANCE.general,
    editionNote: "IRC R905.1.2 sets the ice-barrier extent (from the lowest roof edge to 24 in inside the exterior wall line, measured up the slope); ASTM D1970 is the self-adhering polymer-modified membrane standard. The ice barrier is required only where the AHJ has adopted it (a history of ice forming at the eaves); the 24 in is measured to the inside of the exterior wall line; valley and low-slope-transition coverage is a separate manual add. A material takeoff, not an installation detail.",
    assumptions: [
      { name: "Coverage extent", value: "coverage = (overhang + 24 in) measured up the slope: the slope factor sqrt(rise^2 + 144)/12 converts the horizontal run to the on-slope distance", source: "IRC R905.1.2" },
      { name: "Courses", value: "the first roll covers one roll width; each later course nets (roll width - side lap), so courses = 1 + ceil((coverage - roll width) / (roll width - side lap)) once coverage exceeds one width", source: "first principles" },
      { name: "Rolls", value: "roll_lf = courses x eave length; rolls = ceil(roll_lf / roll length); the roll dimensions are the product's stated size", source: "first principles" },
    ],
  },
  "metal-roof-panels": {
    formula: "panels = ceil(eave_width_ft x 12 / panel_net_in); total_panel_lf = panels x panel_length_ft; plane_area_ft2 = eave_width_ft x panel_length_ft; squares = plane_area_ft2 / 100; fasteners = ceil(squares x fasteners_per_sq).",
    edition: "Metal Construction Association (MCA) and Metal Roofing Alliance (MRA) installation references and the manufacturer panel-coverage and fastening charts, by name; the panel-count and fastener relations are first-principles arithmetic.",
    freeAccess: "The panel-count and fastener relations are public roofing-takeoff arithmetic; the net coverage width and the wind-zone fastening pattern are the manufacturer's published values.",
    governance: GOVERNANCE.general,
    editionNote: "The MCA and MRA installation references and the manufacturer panel-coverage and fastening charts govern. The net coverage width is the product's published value (not the overall sheet width); the fastener density is the manufacturer's pattern for the wind zone (a standing-seam system substitutes concealed clips for exposed screws); the panel length is the finished eave-to-ridge length on the slope including the overhang; the result is per roof plane (double it for a symmetric gable). A material takeoff, not a fastening or wind-uplift design.",
    assumptions: [
      { name: "Panel count", value: "panels = ceil(eave width in inches / net coverage width): the net coverage width, not the overall sheet width, sets the count", source: "MCA / MRA + manufacturer charts" },
      { name: "Slope area", value: "panel length is the on-slope eave-to-ridge length, so eave width x panel length is the plane (slope) area; squares = area / 100", source: "first principles" },
      { name: "Fasteners", value: "fasteners = ceil(squares x fasteners per square): the per-square count is the manufacturer's wind-zone pattern (clips replace exposed screws on standing seam)", source: "manufacturer fastening charts" },
    ],
  },
  "ridge-cap-fasteners": {
    formula: "cap_len_lf = ridge_lf + hip_lf; cap_bundles = ceil(cap_len_lf / cap_lf_per_bundle); field_nails = squares x shingles_per_sq x nails_per_shingle; cap_pieces = ceil(cap_len_lf x 12 / cap_exposure_in); cap_nails = cap_pieces x 2; total_nails = field_nails + cap_nails; nail_lbs = ceil(total_nails / nails_per_lb).",
    edition: "IRC R905.2.6 (the asphalt-shingle fastening pattern: four nails standard, six in the high-wind / steep-slope rows) and the shingle manufacturer's application instructions, by name; the cap-bundle and nail relations are first-principles arithmetic.",
    freeAccess: "The fastening pattern is stated in the published IRC R905.2.6; the cap-bundle and nail relations are public roofing-takeoff arithmetic. The cap coverage and nails-per-shingle are the product wrapper's values.",
    governance: GOVERNANCE.general,
    editionNote: "IRC R905.2.6 sets the asphalt-shingle fastening pattern (four nails standard, six in the high-wind / steep-slope rows); the shingle manufacturer's application instructions govern the product. The nails-per-shingle and the cap coverage per bundle come from the product's wrapper and the adopted wind zone (a pre-formed hip-and-ridge product covers far less per bundle than field-cut three-tab caps); the shingles-per-square is the product's count. A material takeoff, not a fastening approval.",
    assumptions: [
      { name: "Cap bundles", value: "cap length = ridge + hip; cap bundles = ceil(cap length / lf per bundle): a pre-formed hip/ridge product (~20 lf) covers far less per bundle than field-cut 3-tab (~35 lf)", source: "manufacturer wrapper" },
      { name: "Field nails", value: "field nails = squares x shingles per square x nails per shingle: IRC R905.2.6 steps the pattern from four nails to six in the high-wind / steep rows", source: "IRC R905.2.6" },
      { name: "Nails by the pound", value: "cap pieces = ceil(cap length x 12 / exposure), two nails each; nail lbs = ceil(total nails / nails per pound): roofers order nails by the pound, not the each", source: "first principles" },
    ],
  },
  "blower-door-ach50": {
    formula: "ach50 = cfm50 x 60 / volume_ft3; verdict = ach50 <= target_ach50 (PASS) else FAIL; ach_nat = ach50 / n_factor; cfm_nat = ach_nat x volume_ft3 / 60.",
    edition: "The ACH50 normalization (CFM50 x 60 / conditioned volume) and the LBL natural-infiltration divide-by-N rule, by name; IECC R402.4.1.2 states the air-leakage limit in ACH50 (<= 3 in climate zones 3-8, <= 5 in zones 1-2); ASTM E779 / E1827 are the blower-door test methods.",
    freeAccess: "The air-leakage limit is in the published IECC R402.4.1.2; the normalization and infiltration relations are public building-science arithmetic. The blower-door test methods are ASTM E779 / E1827.",
    governance: GOVERNANCE.general,
    editionNote: "IECC R402.4.1.2 sets the air-leakage limit, stated in ACH50, with the <= 3 (CZ 3-8) and <= 5 (CZ 1-2) thresholds the user pins as the target; ASTM E779 / E1827 are the blower-door test methods that produce CFM50; the LBL / ASHRAE Fundamentals infiltration model is the N-factor that divides ACH50 down to the annual-average natural ACH. The N-factor depends on climate zone, building height, and wind shielding (a single-story sheltered house and an exposed three-story house differ by roughly a factor of two); the code threshold is the AHJ-adopted IECC edition and climate zone; the volume is the conditioned volume, not the floor area. A field normalization, not a code certificate.",
    assumptions: [
      { name: "ACH50", value: "ach50 = CFM50 x 60 / conditioned volume normalizes the gauge reading to air changes per hour at 50 Pa", source: "first principles" },
      { name: "Code check", value: "verdict compares ACH50 to the editable target (IECC R402.4.1.2: <= 3 ACH50 in CZ 3-8, <= 5 in CZ 1-2)", source: "IECC R402.4.1.2" },
      { name: "Natural infiltration", value: "ach_nat = ach50 / N (LBL N-factor, default 17); cfm_nat = ach_nat x volume / 60 feeds the 62.2 ventilation and the infiltration load", source: "LBL / ASHRAE Fundamentals" },
    ],
  },
  "ashrae-622-ventilation": {
    formula: "q_tot = 0.03 x floor_area_ft2 + 7.5 x (bedrooms + 1); q_fan = max(0, q_tot - infil_credit_cfm); verdict = q_fan > 0 (fan required) else (credit meets Qtot).",
    edition: "ASHRAE 62.2-2019 §4.1 whole-house ventilation rate (Qtot = 0.03 x Afloor + 7.5 x (Nbr + 1)) and the fan flow Qfan = Qtot - Qinf, by name; the 0.03 cfm/ft^2 and 7.5 cfm/person are the standard's rate coefficients.",
    freeAccess: "The whole-house ventilation rate and the fan-flow relation are stated in ASHRAE 62.2-2019 §4.1; the arithmetic is public. The infiltration credit comes from the measured air-tightness.",
    governance: GOVERNANCE.general,
    editionNote: "ASHRAE 62.2-2019 §4.1 gives Qtot = 0.03 x Afloor + 7.5 x (Nbr + 1) and the fan flow Qfan = Qtot - Qinf, where Qinf is the infiltration credit. The bedroom count is the standard's occupancy proxy (occupants assumed = Nbr + 1); the infiltration credit comes from the measured air-tightness per the 62.2 infiltration method (the conservative default is zero credit, sizing the fan to the full Qtot); local exhaust (kitchen and bath) is a separate 62.2 requirement this tile does not cover. A sizing aid, not a 62.2 compliance certificate.",
    assumptions: [
      { name: "Total required Qtot", value: "Qtot = 0.03 x conditioned floor area + 7.5 x (bedrooms + 1); occupants assumed Nbr + 1", source: "ASHRAE 62.2-2019 §4.1" },
      { name: "Fan flow", value: "Qfan = max(0, Qtot - infiltration credit); the tighter the house, the smaller the credit and the larger the fan", source: "ASHRAE 62.2-2019" },
      { name: "Infiltration credit", value: "the credit is the blower-door natural infiltration; the conservative default is zero", source: "first principles" },
    ],
  },
  "infiltration-load": {
    formula: "q_sensible = 1.08 x cfm x delta_t_f; q_latent = 0.68 x cfm x delta_gr; q_total = q_sensible + q_latent.",
    edition: "ASHRAE Handbook of Fundamentals air-side sensible (q_s = 1.08 x Q x dT) and latent (q_l = 0.68 x Q x dW_gr) equations, by name; the 1.08 and 0.68 are the sea-level standard-air constants.",
    freeAccess: "The air-side sensible and latent equations are public ASHRAE Fundamentals relations; the 1.08 and 0.68 are standard-air constants.",
    governance: GOVERNANCE.general,
    editionNote: "The ASHRAE Handbook of Fundamentals air-side sensible q_s = 1.08 x Q x dT and latent q_l = 0.68 x Q x dW_gr (grains) equations. The 1.08 and 0.68 are sea-level standard-air constants (an altitude correction is a separate manual adjustment); the airflow is the natural infiltration from a blower-door test or a design infiltration estimate; this is the infiltration component of the load only (envelope conduction, solar, and internal gains are separate Manual J line items). A design-load aid, not a stamped Manual J.",
    assumptions: [
      { name: "Sensible", value: "q_sensible = 1.08 x cfm x design dry-bulb delta-T (the 1.08 = 60 x rho x cp at sea-level standard air)", source: "ASHRAE Fundamentals" },
      { name: "Latent", value: "q_latent = 0.68 x cfm x humidity-ratio difference in grains/lb (zero for heating, so the term drops out)", source: "ASHRAE Fundamentals" },
      { name: "Component only", value: "the infiltration line of the design load, not the whole Manual J", source: "first principles" },
    ],
  },
  "pv-energy-yield": {
    formula: "annual_kwh = dc_kw x psh x 365 x perf_ratio; specific_yield = annual_kwh / dc_kw; capacity_factor = annual_kwh / (dc_kw x 8760); monthly_kwh_avg = annual_kwh / 12.",
    edition: "NREL PVWatts energy model (E_annual = P_dc x PSH x 365 x PR) and the standard specific-yield and capacity-factor definitions, by name; the relations are public.",
    freeAccess: "The PVWatts energy model and the specific-yield and capacity-factor definitions are public NREL relations; PVWatts is free at pvwatts.nrel.gov.",
    governance: GOVERNANCE.general,
    editionNote: "The NREL PVWatts energy model E_annual = P_dc x PSH x 365 x PR, with specific yield = E / P_dc and capacity factor = E / (P_dc x 8760). The peak-sun-hours is the plane-of-array daily irradiation from NREL's NSRDB / PVWatts for the site, tilt, and azimuth (not a fixed 5); the performance ratio (default 0.77, the PVWatts all-loss default) varies with climate, soiling, and equipment and is the single biggest lever on the estimate; the first-year figure degrades roughly half a percent a year. A pre-design estimate, not a bankable production model.",
    assumptions: [
      { name: "Annual energy", value: "annual kWh = DC nameplate x peak-sun-hours x 365 x performance ratio (PVWatts)", source: "NREL PVWatts" },
      { name: "Performance ratio", value: "PR (default 0.77) rolls up soiling, shading, mismatch, wiring, inverter, and availability losses", source: "NREL PVWatts" },
      { name: "Benchmarks", value: "specific yield = annual / DC (kWh per kW); capacity factor = annual / (DC x 8760)", source: "first principles" },
    ],
  },
  "pv-row-spacing": {
    formula: "rise = L x sin(tilt); base = L x cos(tilt); shadow = rise / tan(profile_angle); pitch = base + shadow; gap = shadow; gcr = L / pitch.",
    edition: "NREL / Sandia PV array row-spacing geometry (pitch = L x cos(tilt) + L x sin(tilt) / tan(profile_angle), GCR = L / pitch), by name; the relations are first-principles trigonometry.",
    freeAccess: "The row-spacing geometry and the ground-coverage-ratio definition are public NREL / Sandia relations and first-principles trigonometry.",
    governance: GOVERNANCE.general,
    editionNote: "The NREL / Sandia PV array row-spacing geometry pitch = L x cos(tilt) + L x sin(tilt) / tan(profile_angle), GCR = L / pitch. The minimum solar profile angle is the winter-design sun elevation at the site (commonly the solar altitude at 9 a.m. to 3 p.m. on the winter solstice, read from the latitude or from solar-times); the relation assumes due-south rows and a level field (an azimuth offset or a graded slope is a separate correction). The no-shadow layout geometry, not an annual inter-row shading-loss model.",
    assumptions: [
      { name: "Row pitch", value: "pitch = collector horizontal footprint + the shadow its top edge throws at the minimum profile angle", source: "NREL / Sandia" },
      { name: "Profile angle", value: "the winter-design sun elevation; a profile angle near the horizon throws an effectively infinite shadow", source: "first principles" },
      { name: "Ground-coverage ratio", value: "GCR = collector length / pitch drives both the land area and the inter-row shading", source: "first principles" },
    ],
  },
  "pv-cell-temperature-power": {
    formula: "T_cell = T_amb + (NOCT - 20) x G/800; P = P_stc x (1 + (gamma/100)(T_cell - 25)); loss = (1 - P/P_stc) x 100.",
    edition: "The PV NOCT cell-temperature model and the datasheet power temperature coefficient, by name.",
    freeAccess: "The NOCT model and temperature-coefficient derate are standard PV design relations (NREL / module datasheets). The module datasheet governs the coefficients.",
    governance: GOVERNANCE.general,
    editionNote: "The cell temperature T_cell = T_amb + (NOCT - 20) x G/800 (NOCT the datasheet nominal operating cell temperature, default 45 C) and the temperature-derated power P = P_stc x (1 + gamma/100 x (T_cell - 25)) with gamma the datasheet power coefficient (about -0.35%/C for crystalline silicon). Cells run well above air temperature in sun, so a hot midsummer module makes less than its cool-morning nameplate. This is the temperature derate only: it uses the entered NOCT and gamma, does not scale power for irradiance below STC, and does not include soiling, wiring, inverter, or shading losses (see the performance-ratio tile). A design aid; the module datasheet governs.",
    assumptions: [
      { name: "NOCT model", value: "T_cell = T_amb + (NOCT - 20) x G/800", source: "PV design practice / NREL" },
      { name: "Power derate", value: "P = P_stc x (1 + gamma/100 x (T_cell - 25)); gamma ~ -0.35%/C silicon", source: "module datasheet" },
      { name: "Temperature only", value: "no irradiance scaling and no soiling/wiring/inverter/shading losses", source: "scope of this tile" },
    ],
  },
  "pv-performance-ratio": {
    formula: "PR = product over entered losses of (1 - loss_i/100); total_loss = (1 - PR) x 100.",
    edition: "The PV performance-ratio derate stack (PVWatts-style loss categories), by name.",
    freeAccess: "The PVWatts loss categories and the multiplicative derate stack are published free by NREL. A screening stack, not a metered performance ratio.",
    governance: GOVERNANCE.general,
    editionNote: "The performance ratio PR = product of (1 - loss_i) over the entered PVWatts-style derate factors (soiling, temperature, wiring DC/AC, inverter, mismatch, shading, availability, nameplate tolerance, LID, connections). Because the losses compound multiplicatively, attacking the two or three largest factors moves the PR far more than trimming an already-small loss. A typical rooftop stack lands near 0.75-0.82, and this PR feeds the energy-yield estimate. This is an annual-average screening stack, not a metered performance ratio (which comes from measured production vs. modeled irradiance). A design aid.",
    assumptions: [
      { name: "Multiplicative stack", value: "PR = product of (1 - loss_i); losses compound, not add", source: "NREL PVWatts" },
      { name: "Loss categories", value: "soiling, temperature, wiring, inverter, mismatch, shading, availability, nameplate, LID, connections", source: "PVWatts" },
      { name: "Screening, annual", value: "an annual-average screen; not a metered performance ratio", source: "scope of this tile" },
    ],
  },
  "pv-string-fusing": {
    formula: "req = 1.56 x Isc (1.25 x 1.25); fuse = smallest NEC 240.6(A) standard rating >= req; compliant if fuse <= module max; fuses required when >= 3 paralleled source circuits.",
    edition: "NEC 690.9 (PV source-circuit overcurrent protection) and 240.6(A) standard ratings, by name.",
    freeAccess: "NEC 690.9 and 240.6 are in NFPA 70; many jurisdictions publish the code free to read. The NEC and the AHJ govern.",
    governance: GOVERNANCE.general,
    editionNote: "PV source-circuit overcurrent per NEC 690.9(B): the fuse must be at least 1.56 x Isc (1.25 continuous x 1.25 PV), rounded UP to the next NEC 240.6(A) standard rating, then checked against the module label's maximum series fuse rating. Overcurrent protection is required only where three or more source circuits are paralleled (690.9(A)). This returns the required and selected fuse and the compliance flags: it sizes the source-circuit OCPD only (not the conductor ampacity, the combiner output, or the inverter DC OCPD), and a selected fuse above the module maximum means fewer strings per combiner or a different module. The NEC and the AHJ govern.",
    assumptions: [
      { name: "1.56 x Isc", value: "OCPD >= 1.25 x 1.25 x Isc, rounded up to a 240.6(A) standard rating", source: "NEC 690.9(B)" },
      { name: "Module maximum", value: "the selected fuse must not exceed the module label's maximum series fuse", source: "module label / NEC 690.9(B)" },
      { name: "Three-string threshold", value: "fuses required only with 3+ paralleled source circuits (690.9(A))", source: "NEC 690.9(A)" },
    ],
  },
  "pv-inverter-ratio": {
    formula: "ilr = dc_kw / ac_kw; clip_dc_kw = ac_kw / inv_eff; clip_fraction = clip_dc_kw / dc_kw; verdict by band (< 1.1 oversized, 1.1-1.3 optimal, > 1.3 undersized).",
    edition: "The inverter loading ratio (ILR / DC:AC ratio) and NREL inverter-sizing guidance (clipping begins where the array DC output exceeds P_ac / eta_inv), by name; the relations are public.",
    freeAccess: "The loading-ratio definition and the clipping-onset relation are public; NREL inverter-sizing guidance is free at nrel.gov.",
    governance: GOVERNANCE.general,
    editionNote: "The standard inverter loading ratio ILR = P_dc / P_ac and NREL inverter-sizing guidance; clipping begins where the array's DC output exceeds P_ac / eta_inv. The cost-optimal ILR band (commonly 1.1 to 1.3) shifts with the site's irradiance distribution, the module-to-inverter price ratio, and the energy value; the clipping-onset fraction is a screening threshold (the array clips only when its instantaneous DC output rises above that fraction of STC nameplate, near peak on cool clear days); an accurate annual clipping loss needs an 8760-hour production simulation this tile does not run. A sizing sanity check, not a clipping-loss model.",
    assumptions: [
      { name: "Loading ratio", value: "ILR = DC nameplate / inverter AC rating (the DC:AC ratio)", source: "first principles" },
      { name: "Clipping onset", value: "the inverter begins to clip where the array DC output exceeds AC / inverter efficiency", source: "NREL inverter-sizing guidance" },
      { name: "Optimal band", value: "the cost-optimal band is commonly 1.1 to 1.3; it shifts with irradiance, equipment price, and energy value", source: "NREL inverter-sizing guidance" },
    ],
  },
  // spec-v230..v232 electrical energy-cost-savings batch (calc-service.js, Group A)
  "vfd-energy-savings": {
    formula: "vfd_kwh = full_load_kw x (frac_a^3 x hours_a + frac_b^3 x hours_b + frac_c^3 x hours_c); full_kwh = full_load_kw x (hours_a + hours_b + hours_c); saved_kwh = full_kwh - vfd_kwh; saved_usd = saved_kwh x rate_kwh.",
    edition: "The centrifugal affinity cube law (P / P_full = (Q / Q_full)^3 for a fixed system curve) and the US DOE motor-systems / pump-system energy method, by name; the relations are public.",
    freeAccess: "The affinity laws and the DOE motor/pump-system energy method are public; the DOE MotorMaster and pump-system tip sheets are free at energy.gov. The arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "The centrifugal affinity laws (P / P_full = (Q / Q_full)^3 for a fixed system curve) and the US DOE motor-systems / pump-system energy method. The cube law holds for a centrifugal pump or fan on a friction-dominated system - a large static-head component flattens the system curve and reduces the savings. The baseline here is full-speed operation for the same hours (a throttled or dampered constant-speed device already saves a little on its own, so the VFD delta versus a throttle is smaller than versus full speed); VFD and motor losses at low speed trim a few points off the ideal. A screening estimate, not a metered measurement-and-verification.",
    assumptions: [
      { name: "Affinity cube law", value: "part-flow power scales as the cube of the flow (speed) ratio on a fixed system curve", source: "affinity laws" },
      { name: "Duty cycle", value: "annual energy is the flow-cubed power summed over the hours in each of three flow bins", source: "US DOE pump-system energy method" },
      { name: "Baseline", value: "savings are versus full-speed operation for the same hours; friction-dominated system assumed", source: "US DOE motor-systems method" },
    ],
  },
  "lighting-retrofit-savings": {
    formula: "kw_saved = fixtures x (watts_existing - watts_new) / 1000; kwh_saved = kw_saved x annual_hours; energy_usd = kwh_saved x rate_kwh; demand_usd = kw_saved x demand_per_kw_mo x 12; annual_usd = energy_usd + demand_usd; payback_years = install_cost > 0 ? install_cost / annual_usd : null.",
    edition: "The standard energy-and-demand lighting-retrofit savings method (kWh_saved = fixtures x (W_old - W_new) / 1000 x hours, demand savings at the utility's $/kW-month, simple payback = cost / annual savings), by name; the relations are public.",
    freeAccess: "The energy-and-demand savings relations and simple payback are public arithmetic; DOE and utility retrofit worksheets are free.",
    governance: GOVERNANCE.general,
    editionNote: "The standard energy-and-demand savings method: kWh saved = fixtures x (W_old - W_new) / 1000 x hours, demand savings at the utility's $/kW-month over twelve months, simple payback = cost / annual savings. The burn hours are the actual annual operating hours (a controls or occupancy-sensor retrofit changes them and is a separate credit); the demand savings apply only to the reduction coincident with the billed peak. An air-conditioned space also gains a cooling-energy credit (and a heated space a small heating penalty) not included here, and utility rebates are additive. A simple payback, not a discounted life-cycle analysis.",
    assumptions: [
      { name: "Energy savings", value: "connected-watt reduction times annual burn hours times the energy rate", source: "first principles" },
      { name: "Demand savings", value: "the kW reduction billed at the $/kW-month demand charge over twelve months, only if coincident with the peak", source: "utility demand billing" },
      { name: "Payback", value: "simple payback = install cost / annual savings; null when no cost is entered", source: "first principles" },
    ],
  },
  "power-factor-billing-savings": {
    formula: "kva_existing = real_power_kw / pf_existing; kva_target = real_power_kw / pf_target; kva_reduction = kva_existing - kva_target; kvar_needed = real_power_kw x (tan(acos(pf_existing)) - tan(acos(pf_target))); annual_usd = kva_reduction x demand_per_kva_mo x 12; payback_years = capacitor_cost > 0 ? capacitor_cost / annual_usd : null.",
    edition: "The power-triangle demand-billing method (kVA = kW / pf, correcting kVAR = kW x (tan(acos pf_old) - tan(acos pf_new)), demand savings = kVA reduction x $/kVA-month x 12), by name; the relations are public.",
    freeAccess: "The power triangle and the demand-savings arithmetic are public; capacitor-sizing and PF-billing worksheets are widely published.",
    governance: GOVERNANCE.general,
    editionNote: "The power-triangle demand-billing method: kVA = kW / pf, correcting capacitor kVAR = kW x (tan(acos pf_old) - tan(acos pf_new)), demand savings = the kVA reduction times the $/kVA-month times twelve months. The utility rate structure governs - some bill demand directly in kVA, some in kW with a separate low-power-factor penalty clause, so the user enters the effective $/kVA-month. The kVA reduction also releases that much transformer and feeder capacity (deferring a service upgrade, a benefit beyond the demand line); harmonics and switching transients require a detuned or filtered bank the sizing here does not address. A billing estimate, not a rate-tariff analysis.",
    assumptions: [
      { name: "Apparent power", value: "kVA = kW / power factor; correcting the power factor cuts the billed kVA", source: "power triangle" },
      { name: "Correcting kVAR", value: "kVAR = kW x (tan(acos pf_old) - tan(acos pf_new))", source: "power triangle" },
      { name: "Demand savings", value: "kVA reduction times the effective $/kVA-month over twelve months; diminishing returns above ~0.9", source: "utility demand billing" },
    ],
  },
  // spec-v233..v235 heat-pump heating-mode batch (calc-hvac.js, Group C)
  "heat-pump-seasonal-energy": {
    formula: "hp_kwh = seasonal_load_mmbtu x 1000 / hspf; hp_cost = hp_kwh x rate_kwh; resistance_kwh = seasonal_load_mmbtu x 1e6 / 3412; gas_therms = rate_therm > 0 ? seasonal_load_mmbtu x 10 / afue : null; gas_cost = rate_therm > 0 ? gas_therms x rate_therm : null.",
    edition: "The AHRI 210/240 HSPF definition (season Btu delivered per Wh input) and the standard fuel-cost comparison (gas therms = load / AFUE, resistance at COP 1), by name; the constants 1 MMBtu = 293.07 kWh, 3,412 Btu/kWh, and 100,000 Btu/therm are named.",
    freeAccess: "The HSPF definition and the fuel-cost comparison arithmetic are public; DOE and ENERGY STAR fuel-cost calculators are free.",
    governance: GOVERNANCE.general,
    editionNote: "The AHRI 210/240 HSPF (season Btu delivered per Wh input) and the standard fuel-cost comparison (gas therms = load / AFUE, resistance at a COP of one). The HSPF is the rated regional value (Region IV; a colder region delivers less, and the field seasonal COP depends on the actual climate and controls); the seasonal heating load comes from a Manual J plus degree-days or metered history; the gas comparison uses the delivered efficiency AFUE, not the steady-state efficiency. An operating-cost estimate, not a metered bill.",
    assumptions: [
      { name: "Heat-pump energy", value: "seasonal kWh = load / HSPF (HSPF is Btu delivered per Wh input, AHRI 210/240)", source: "AHRI 210/240" },
      { name: "Resistance baseline", value: "resistance heat at a COP of one, 3,412 Btu per kWh", source: "first principles" },
      { name: "Gas comparison", value: "gas therms = load / AFUE at the gas rate; skipped when no gas rate is entered", source: "fuel-cost comparison" },
    ],
  },
  "dual-fuel-balance-point": {
    formula: "gas_per_mmbtu = 10 / afue x rate_therm; hp_per_mmbtu = 293.07 / cop_now x rate_kwh; cop_switch = 293.07 x rate_kwh / gas_per_mmbtu; run_hp = hp_per_mmbtu <= gas_per_mmbtu.",
    edition: "The delivered-Btu fuel-cost comparison (heat-pump $/MMBtu = 293.07 / COP x rate_kwh, gas $/MMBtu = 10 / AFUE x rate_therm, switchover COP where the two are equal), by name; 1 MMBtu = 293.07 kWh and 10 therms per MMBtu are named constants.",
    freeAccess: "The delivered-Btu cost comparison is public arithmetic; dual-fuel setpoint worksheets are widely published.",
    governance: GOVERNANCE.general,
    editionNote: "The delivered-Btu fuel-cost comparison: heat-pump $/MMBtu = 293.07 / COP x rate_kwh, gas $/MMBtu = 10 / AFUE x rate_therm, and the switchover COP where the two are equal. The switchover COP maps to an outdoor temperature only through the specific unit's COP-vs-temperature curve (from the AHRI ratings or the manufacturer's data, entered separately or read from the cold-capacity tile); the comparison is on operating cost only (it ignores equipment wear, defrost, and comfort); the gas side uses the delivered AFUE. An economic setpoint aid, not a controls-commissioning procedure.",
    assumptions: [
      { name: "Delivered cost", value: "heat-pump $/MMBtu = 293.07 / COP x rate_kwh; gas $/MMBtu = 10 / AFUE x rate_therm", source: "delivered-Btu comparison" },
      { name: "Switchover COP", value: "the COP where heat-pump delivered cost equals gas delivered cost", source: "first principles" },
      { name: "Mapping to temperature", value: "the switchover COP maps to an outdoor temperature only through the unit's COP-vs-temperature curve", source: "manufacturer data / AHRI" },
    ],
  },
  "heat-pump-cold-capacity": {
    formula: "slope = (cap_47_btuh - cap_17_btuh) / (47 - 17); cap_design = max(0, cap_17_btuh + slope x (design_temp_f - 17)); shortfall = max(0, design_load_btuh - cap_design); aux_kw = shortfall / 3412.",
    edition: "The AHRI 210/240 low-temperature rating points (the 47 F and 17 F integrated heating capacities) and a linear capacity-versus-temperature interpolation, by name; 3,412 Btu/h per kW is a named constant.",
    freeAccess: "The AHRI rating points and the linear interpolation are public; manufacturer expanded-performance tables are published in submittal data.",
    governance: GOVERNANCE.general,
    editionNote: "The AHRI 210/240 low-temperature rating points (the 47 F and 17 F integrated heating capacities) with a linear capacity-versus-temperature interpolation. The two rated points come from the manufacturer's expanded performance data - a cold-climate / variable-capacity unit holds capacity far better than a linear extrapolation of a single-speed unit suggests, so prefer the published low-temperature data point over extrapolation when a conversion hinges on it. The design load and design temperature come from a Manual J; defrost and cycling trim the field capacity; a computed capacity that extrapolates below zero is clamped to zero and reported. A sizing check, not a performance guarantee.",
    assumptions: [
      { name: "Rating points", value: "capacity interpolated linearly between the AHRI 47 F and 17 F integrated heating capacities", source: "AHRI 210/240" },
      { name: "Auxiliary heat", value: "the shortfall below the design load is the backup heat, at 3,412 Btu/h per kW", source: "first principles" },
      { name: "Design load", value: "the design load and design temperature come from a Manual J; defrost and cycling derate the field capacity", source: "ACCA Manual J" },
    ],
  },
  // spec-v236..v238 grid-tied battery-economics batch (calc-solar.js, Group A)
  "battery-tou-arbitrage": {
    formula: "usable_kwh = nameplate_kwh x dod; charge_kwh = usable_kwh / rte; daily_value = usable_kwh x peak_price - charge_kwh x offpeak_price; annual_value = daily_value x cycles_per_year; breakeven_ratio = 1 / rte.",
    edition: "The standard energy-arbitrage value (daily = usable x peak - (usable / RTE) x offpeak, usable = nameplate x DoD, break-even when peak > offpeak / RTE) and the NREL battery round-trip / degradation framing, by name; the relations are public.",
    freeAccess: "The arbitrage-value arithmetic and the round-trip-efficiency relation are public; NREL storage cost/performance data is free at nrel.gov.",
    governance: GOVERNANCE.general,
    editionNote: "The energy-arbitrage value (daily = usable x peak - (usable / RTE) x offpeak, usable = nameplate x DoD, break-even when peak > offpeak / RTE) and the NREL battery round-trip / degradation framing. The round-trip efficiency is the AC-to-AC value (inverter plus cells; a DC-coupled solar charge avoids one conversion); the depth of discharge is the warranty-usable fraction; one cycle per day is the common assumption but a battery cannot capture two non-overlapping peaks it does not have the energy for; throughput degrades the cells, a cost this value figure does not net out. A gross arbitrage value, not a financed payback.",
    assumptions: [
      { name: "Arbitrage value", value: "daily = usable energy at the peak price minus the larger charge energy at the off-peak price", source: "first principles" },
      { name: "Round-trip loss", value: "charge energy = usable / RTE; break-even requires peak > offpeak / RTE (AC-to-AC efficiency)", source: "NREL battery round-trip framing" },
      { name: "Usable energy", value: "usable = nameplate x depth of discharge (the warranty-usable fraction)", source: "manufacturer warranty" },
    ],
  },
  "battery-peak-shaving": {
    formula: "usable_kwh = nameplate_kwh x dod; sustainable_kw = usable_kwh / event_duration_h; actual_shave_kw = min(target_shave_kw, sustainable_kw); annual_savings = actual_shave_kw x demand_per_kw_mo x 12; energy_limited = sustainable_kw < target_shave_kw.",
    edition: "The standard demand-charge peak-shaving method (sustainable shave = usable / duration, actual shave = min(target, sustainable), savings = actual shave x $/kW-month x 12), by name; the relations are public.",
    freeAccess: "The peak-shaving sizing and demand-savings arithmetic are public; utility demand-charge tariffs are published.",
    governance: GOVERNANCE.general,
    editionNote: "The demand-charge peak-shaving method: sustainable shave = usable / duration, actual shave = min(target, sustainable), savings = the actual shave times the $/kW-month times twelve. The peak-event duration is how long the facility's demand stays above the shave target (from an interval-meter load profile); the actual demand reduction depends on the battery discharging on exactly the right intervals (a controls problem this sizing does not solve); a coincident-peak or ratchet tariff changes the billing. A demand-savings estimate, not a metered bill.",
    assumptions: [
      { name: "Sustainable shave", value: "the most a battery can hold for the whole window = usable energy / event duration", source: "first principles" },
      { name: "Actual shave", value: "the lesser of the target reduction and the sustainable reduction (energy-limited when the peak outlasts the energy)", source: "first principles" },
      { name: "Savings", value: "the actual shave billed at the $/kW-month demand charge over twelve months", source: "utility demand billing" },
    ],
  },
  "battery-c-rate": {
    formula: "c_rate_power_kw = nameplate_kwh x c_rate; deliverable_kw = inverter_kw > 0 ? min(c_rate_power_kw, inverter_kw) : c_rate_power_kw; usable_kwh = nameplate_kwh x dod; discharge_time_h = usable_kwh / deliverable_kw.",
    edition: "The standard battery C-rate definition (power = nameplate x C, full discharge time = 1 / C, deliverable power = the lesser of the C-rate power and the inverter rating), by name; the relations are public.",
    freeAccess: "The C-rate definition and the power/duration arithmetic are public; manufacturer discharge-rate data is published in cut sheets.",
    governance: GOVERNANCE.general,
    editionNote: "The battery C-rate definition (power = nameplate x C, full discharge time = 1 / C, and the deliverable power is the lesser of the C-rate power and the inverter rating, with an inverter rating of zero meaning no inverter limit). The continuous C-rate is the sustained rating, not the brief surge rating (a pack delivers more for seconds than for an hour); the usable energy uses the depth of discharge; high discharge rates lose a few points of capacity and add heat. A nameplate power check, not a cell-level thermal model.",
    assumptions: [
      { name: "C-rate power", value: "continuous power = nameplate energy x C-rate (0.5C = half the nameplate energy per hour)", source: "battery C-rate definition" },
      { name: "Deliverable power", value: "the lesser of the C-rate power and the inverter/PCS continuous rating (0 = no inverter limit)", source: "first principles" },
      { name: "Discharge time", value: "usable energy (nameplate x DoD) divided by the deliverable power", source: "first principles" },
    ],
  },
  // spec-v239..v241 compressed-air energy batch (calc-hvac.js, Group C)
  "air-leak-cost": {
    formula: "leak_fraction = load_min / (load_min + unload_min); leak_cfm = compressor_cfm x leak_fraction; leak_kw = leak_cfm x specific_power / 100; annual_kwh = leak_kw x run_hours; annual_cost = annual_kwh x rate_kwh.",
    edition: "The US DOE Compressed Air Challenge load/unload leak test (leak fraction = t_load / (t_load + t_unload), leak flow = fraction x compressor cfm) and the compressed-air specific-power convention (18-22 kW per 100 cfm at 100 psig for a rotary-screw system), by name; the relations are public.",
    freeAccess: "The DOE Compressed Air Challenge load/unload method and the specific-power convention are public; the DOE compressed-air tip sheets and sourcebook are free at energy.gov.",
    governance: GOVERNANCE.general,
    editionNote: "The US DOE Compressed Air Challenge load/unload leak test (leak fraction = t_load / (t_load + t_unload), leak flow = fraction x compressor cfm) and the compressed-air specific-power convention (18 to 22 kW per 100 cfm at 100 psig for a rotary-screw system). The test is run with all production draw off so the only demand is the leaks; the loaded capacity is the compressor's actual delivered cfm at the operating pressure (not the nameplate); the specific power is the whole system's wire-to-air figure at its pressure (a higher pressure or an older compressor runs higher); the run hours are the hours the compressor is energized. An estimate from a stopwatch test, not a metered audit.",
    assumptions: [
      { name: "Leak fraction", value: "the loaded fraction of the load/unload cycle with production off, t_load / (t_load + t_unload)", source: "US DOE Compressed Air Challenge" },
      { name: "Leak flow", value: "the leak fraction times the compressor's delivered capacity at the operating pressure", source: "US DOE Compressed Air Challenge" },
      { name: "Specific power", value: "the whole system's wire-to-air kW per 100 cfm (18-22 at 100 psig, rotary screw)", source: "compressed-air specific-power convention" },
    ],
  },
  "compressed-air-power": {
    formula: "p2_abs = discharge_psig + 14.7; theo_hp = 0.004364 x inlet_psia x free_air_cfm x (k/(k-1)) x ((p2_abs/inlet_psia)^((k-1)/k) - 1); input_kw = theo_hp x 0.746 / overall_eff; annual_kwh = input_kw x run_hours; annual_cost = annual_kwh x rate_kwh. (k = 1.4)",
    edition: "The standard single-stage adiabatic (isentropic) compression power (hp = 0.004364 x P1 x Q x (k/(k-1)) x [(P2/P1)^((k-1)/k) - 1], P in psia, Q in cfm free air, k = 1.4), by name; the 0.004364 = 144/33,000 unit constant and 0.746 kW/hp are named.",
    freeAccess: "The isentropic compression-power relation is a public closed-form thermodynamic result; the DOE compressed-air sourcebook is free at energy.gov.",
    governance: GOVERNANCE.general,
    editionNote: "The standard single-stage adiabatic (isentropic) compression power hp = 0.004364 x P1 x Q x (k/(k-1)) x [(P2/P1)^((k-1)/k) - 1], with P in psia, Q in cfm free air, and k = 1.4 for air. This is the ideal single-stage isentropic work - a real compressor needs more, so the overall efficiency divides the ideal down to the wire, and multi-staging with intercooling beats single stage above roughly 100 psig. The free-air flow is referenced to the intake conditions and the discharge is the absolute pressure at the compressor. A sizing and cost estimate, not a compressor selection.",
    assumptions: [
      { name: "Isentropic work", value: "single-stage adiabatic compression power with k = 1.4 for air, from intake to discharge pressure ratio", source: "isentropic compression" },
      { name: "Overall efficiency", value: "the ideal work divided by the overall wire-to-air efficiency (isentropic x mechanical x motor)", source: "first principles" },
      { name: "Free air", value: "the flow is referenced to intake conditions; the discharge is the absolute pressure at the compressor", source: "compressed-air convention" },
    ],
  },
  "air-pressure-setpoint-savings": {
    formula: "work_current = ((current_psig + 14.7) / inlet_psia)^((k-1)/k) - 1; work_reduced = ((reduced_psig + 14.7) / inlet_psia)^((k-1)/k) - 1; pct_saved = 1 - work_reduced / work_current; kw_saved = input_kw x pct_saved; annual_kwh = kw_saved x run_hours; annual_savings = annual_kwh x rate_kwh. (k = 1.4)",
    edition: "The isentropic compression-power ratio (percent saved = 1 - [(P_reduced/P1)^((k-1)/k) - 1] / [(P_current/P1)^((k-1)/k) - 1]), which reproduces the DOE rule of roughly 0.5% of compressor energy per psi of reduction, by name; k = 1.4 for air is a named constant.",
    freeAccess: "The isentropic pressure-ratio relation and the DOE per-psi rule are public; the DOE compressed-air tip sheets are free at energy.gov.",
    governance: GOVERNANCE.general,
    editionNote: "The isentropic compression-power ratio: percent saved = 1 - [(P_reduced/P1)^((k-1)/k) - 1] / [(P_current/P1)^((k-1)/k) - 1], which reproduces the DOE rule of roughly 0.5% of compressor energy per psi of reduction. The reduced setpoint must still hold the minimum pressure the tools need after system pressure drop (the point of a leak and piping fix is to allow the drop); the saving is on the compression energy that actually falls with pressure (an unloaded or modulating compressor may not capture all of it); the ratio assumes single-stage isentropic behavior. An energy-savings estimate, not a metered result.",
    assumptions: [
      { name: "Power ratio", value: "the saving is the isentropic work ratio between the two discharge pressures (absolute)", source: "isentropic compression" },
      { name: "Per-psi rule", value: "reproduces the DOE rule of about 0.5% of compressor energy per psi of reduction", source: "US DOE" },
      { name: "Minimum pressure", value: "the reduced setpoint must still serve the tools after system pressure drop", source: "compressed-air best practice" },
    ],
  },
  "motor-overload-sizing": {
    formula: "hi_class = (sf >= 1.15) or (marked rise <= 40 degC); mult = hi_class ? 1.25 : 1.15; mult_max = hi_class ? 1.40 : 1.30; ol_A = fla_A x mult; ol_max_A = fla_A x mult_max.",
    edition: "Motor running-overload sizing on the nameplate full-load current under NEC 2023 430.32(A)(1) (125% for a marked service factor of 1.15 or more or a marked temperature rise of 40 degC or less, 115% otherwise) with the 430.32(C) will-not-start ceiling (140%/130%), by name. A computational aid; the AHJ-adopted NEC edition governs.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. The 430.32(B) small-motor rules, 430.36 fuse-as-overload, and thermally protected cases are stated as out of scope, not modeled.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Basis current", value: "the motor NAMEPLATE FLA, not the 430.6 table FLC the 430.52 branch device uses", source: "NEC 430.32 / 430.6(A)" },
      { name: "Class selection", value: "125%/140% for marked SF >= 1.15 or marked rise <= 40 degC; 115%/130% otherwise; an unmarked (blank) value does not qualify", source: "NEC 430.32(A)(1) and (C)" },
      { name: "Scope", value: "a continuous-duty motor over 1 hp with a separate overload device", source: "NEC 430.32(A)" },
    ],
  },
  "service-conductor-sizing": {
    formula: "A_req = 0.83 x service_A; size = smallest Table 310.16 75 degC conductor (ordered smallest first, copper or aluminum) with ampacity >= A_req.",
    edition: "The dwelling service/feeder 83% allowance of NEC 2023 310.12(A)/(B) with the conductor selected from the Table 310.16 75 degC column (reproducing Table 310.12's tabulated 100 A -> #4 Cu, 200 A -> 2/0 Cu / 4/0 Al results), by name. A computational aid; the AHJ-adopted NEC edition governs.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. The single-phase 120/240 V dwelling scope, the ambient/fill adjustments, and the neutral sizing are stated, not modeled.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "83% allowance", value: "ungrounded service-entrance or main-feeder conductors of a one-family dwelling (or an individual dwelling unit) at 83% of the service rating, single-phase 120/240 V", source: "NEC 310.12(A)/(B)" },
      { name: "Ampacity column", value: "Table 310.16 at 75 degC (the common service-equipment termination rating), single set to 400 kcmil; parallel sets are out of scope", source: "NEC 310.16 / 110.14(C)" },
    ],
  },
  "continuous-load-ocpd": {
    formula: "mult = rated_100 ? 1.00 : 1.25; A_min = mult x l_cont_A + l_noncont_A; ocpd_A = smallest NEC 240.6(A) standard rating >= A_min.",
    edition: "The continuous-load overcurrent and conductor rule of NEC 2023 210.20(A) (branch) / 215.3 (feeder) and 210.19(A) / 215.2(A) -- 125% of the continuous plus 100% of the noncontinuous load, device from the 240.6(A) standard ratings, with the 100%-rated-assembly exception -- by name. A computational aid; the AHJ-adopted NEC edition governs.",
    freeAccess: "NEC is free to read at nfpa.org/freeaccess. The ampacity-adjustment, termination-limit, 240.4(B), and equipment-specific (430/440/630) rules are stated as out of scope, not modeled.",
    governance: GOVERNANCE.electrical,
    editionNote: NEC_DISCLOSURE,
    assumptions: [
      { name: "Continuous load", value: "a load at its maximum current for 3 hours or more takes the 125% factor; a listed 100%-rated device-and-assembly drops it to 100%", source: "NEC 210.20(A) / 215.3" },
      { name: "Device selection", value: "the smallest 240.6(A) standard ampere rating at or above the computed minimum", source: "NEC 240.6(A)" },
      { name: "Conductor", value: "the conductor's pre-adjustment ampacity must also meet the same 125% + 100% sum", source: "NEC 210.19(A) / 215.2(A)" },
    ],
  },
  "wind-cc-pressure": {
    formula: "qh = 0.00256 Kz Kzt Kd Ke V^2; p_a = qh (GCp - GCpi); p_b = qh (GCp + GCpi); governing = the larger magnitude of p_a, p_b.",
    edition: "The ASCE 7-22 Chapter 30 components-and-cladding design pressure p = qh [(GCp) - (GCpi)], with the velocity pressure qh = 0.00256 Kz Kzt Kd Ke V^2 (Kd = 0.85, V in mph) and GCpi = +/-0.18 for an enclosed building, by name; GCp is read from the Chapter 30 zone figures.",
    freeAccess: "ASCE 7 is available through the ASCE Library at ascelibrary.org; the Chapter 30 C&C provisions and the 0.00256 velocity-pressure constant are public.",
    governance: GOVERNANCE.general,
    editionNote: "The ASCE 7-22 Chapter 30 C&C design pressure p = qh [(GCp) - (GCpi)], the velocity pressure qh = 0.00256 Kz Kzt Kd Ke V^2 with Kd = 0.85 and GCpi = +/-0.18 (enclosed), and GCp read from the Chapter 30 figures for the zone and effective wind area. This returns the C&C design pressure for an entered GCp and the computed qh - it does not read the zone figures for the user (enter GCp for the roof/wall zone and effective wind area), assumes an enclosed building unless GCpi is changed, and does not cover the MWFRS pressures (wind-mwfrs-pressure) or the parapet/overhang special cases. A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Velocity pressure", value: "qh = 0.00256 Kz Kzt Kd Ke V^2 at mean roof height (Kd = 0.85, V in mph)", source: "ASCE 7-22 26.10" },
      { name: "Design pressure", value: "p = qh (GCp - GCpi); both internal signs evaluated, the larger magnitude governs", source: "ASCE 7-22 30.3" },
      { name: "GCp", value: "read from the Chapter 30 zone figures by roof/wall zone and effective wind area (entered)", source: "ASCE 7-22 Ch. 30 figures" },
    ],
  },
  "snow-drift-load": {
    formula: "gamma = min(0.13 pg + 14, 30) pcf; hd = max(0.43 (lu)^(1/3) (pg + 10)^(1/4) - 1.5, 0) ft; w = 4 hd (hd <= hc) else min(4 hd^2/hc, 8 hc); pd = hd gamma psf.",
    edition: "The ASCE 7-22 Chapter 7 leeward snow-drift provisions -- the drift height 7.7.1, the snow density 7.7.1, the surcharge pd = hd gamma, and the drift width -- by name.",
    freeAccess: "ASCE 7 is available through the ASCE Library at ascelibrary.org; the Chapter 7 drift relations are public.",
    governance: GOVERNANCE.general,
    editionNote: "The ASCE 7-22 Chapter 7 leeward drift height hd = 0.43 (lu)^(1/3) (pg + 10)^(1/4) - 1.5 (lu the upwind fetch in ft, pg the ground snow in psf), the density gamma = 0.13 pg + 14 <= 30 pcf, the surcharge pd = hd gamma, and the drift width w = 4 hd when hd <= hc (w = 4 hd^2/hc <= 8 hc when the drift reaches the upper roof). This returns the leeward-drift surcharge height, width, and peak load at a roof step or wall - it uses the leeward form (the windward drift uses 0.75 hd and a different fetch), and does not add the balanced load beneath it (snow-load), the sliding-snow surcharge (7.9), or the unbalanced-gable case (7.6.1). A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Drift height", value: "hd = 0.43 (lu)^(1/3) (pg + 10)^(1/4) - 1.5, floored at zero for a short fetch", source: "ASCE 7-22 7.7.1" },
      { name: "Density", value: "gamma = 0.13 pg + 14, capped at 30 pcf", source: "ASCE 7-22 7.7.1" },
      { name: "Surcharge and width", value: "pd = hd gamma at the step over a 4 hd width (full-height triangle, hd <= hc)", source: "ASCE 7-22 7.7.1" },
    ],
  },
  "wind-mwfrs-pressure": {
    formula: "p_ww = qz G Cp_ww +/- qh GCpi (worst sign); p_lw = qh G Cp_lw +/- qh GCpi (worst sign); p_net = qz G Cp_ww - qh G Cp_lw (internal cancels).",
    edition: "The ASCE 7-22 Chapter 27 MWFRS design wall pressure p = q G Cp - qi (GCpi), with G = 0.85 (rigid), the wall Cp (+0.8 windward, -0.5 leeward for L/B <= 1), and GCpi = +/-0.18 (enclosed), by name.",
    freeAccess: "ASCE 7 is available through the ASCE Library at ascelibrary.org; the Chapter 27 Directional-Procedure MWFRS provisions are public.",
    governance: GOVERNANCE.general,
    editionNote: "The ASCE 7-22 Chapter 27 (27.3.1) MWFRS wall pressure p = q G Cp - qi (GCpi), with G = 0.85 (rigid building), the wall Cp (+0.8 windward, -0.5 leeward for L/B <= 1), and GCpi = +/-0.18 (enclosed). This returns the windward and leeward wall MWFRS pressures (each at the internal-pressure sign that maximizes its magnitude) and the net horizontal design pressure for a rectangular enclosed building; the internal pressure cancels in the net, so the net uses the external difference. It uses the entered qz/qh (from wind-pressure) and wall Cp, G = 0.85 (not the flexible-building Gf), and does not compute the roof MWFRS pressures, the internal-pressure effect on the roof diaphragm, or the torsional (Case 2-4) load patterns. A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Wall pressure", value: "p = q G Cp - qi (GCpi); q = qz windward, qh leeward; G = 0.85 rigid", source: "ASCE 7-22 27.3.1" },
      { name: "Wall coefficients", value: "Cp = +0.8 windward, -0.5 leeward for a building with L/B <= 1", source: "ASCE 7-22 Fig. 27.3-1" },
      { name: "Net cancels internal", value: "the internal pressure acts equally outward on both walls, so the net horizontal pressure is the external difference", source: "ASCE 7-22 Ch. 27 commentary" },
    ],
  },
  "steel-h1-interaction": {
    formula: "ratio = Pr/Pc; ratio >= 0.2: I = Pr/Pc + (8/9)(Mrx/Mcx + Mry/Mcy); ratio < 0.2: I = Pr/(2Pc) + (Mrx/Mcx + Mry/Mcy); pass when I <= 1.0.",
    edition: "The AISC 360-22 Section H1.1 combined-force (axial plus flexure) bilinear interaction equations, consistent for ASD or LRFD, by name.",
    freeAccess: "AISC 360 is free to read at aisc.org (Specification for Structural Steel Buildings); the H1.1 interaction equations are in the published specification.",
    governance: GOVERNANCE.general,
    editionNote: "The AISC 360-22 H1.1 combined-force equations - Pr/Pc + (8/9)(Mrx/Mcx + Mry/Mcy) for Pr/Pc >= 0.2 and Pr/(2Pc) + (Mrx/Mcx + Mry/Mcy) for Pr/Pc < 0.2 - consistent for ASD (available = nominal/Omega) or LRFD (available = phi x nominal). This evaluates the H1.1 interaction from the required and available strengths supplied - it takes Pc and Mc as already computed (from steel-column-capacity and steel-beam-ltb in the same ASD or LRFD basis), assumes the second-order (P-delta/P-Delta) amplification is already in Mr (Chapter C / Appendix 8), and does not cover the H1.3 out-of-plane or H2 unsymmetric-member cases. A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Bilinear interaction", value: "the 8/9 form for Pr/Pc >= 0.2, the half-axial form below, capped at 1.0", source: "AISC 360-22 Eq. H1-1a/H1-1b" },
      { name: "Available strengths", value: "Pc and Mc entered from the member tiles in a consistent ASD or LRFD basis", source: "AISC 360-22 H1.1" },
      { name: "Second-order", value: "the P-delta/P-Delta amplification is already carried in the required moment Mr", source: "AISC 360-22 Ch. C / App. 8" },
    ],
  },
  "steel-effective-length-k": {
    formula: "G = sum(EI/L)_columns / sum(EI/L)_beams; sway: K = sqrt((1.6 GA GB + 4(GA+GB) + 7.5)/(GA+GB+7.5)); braced: K = (3 GA GB + 1.4(GA+GB) + 0.64)/(3 GA GB + 2(GA+GB) + 1.28).",
    edition: "The AISC alignment-chart effective-length factor K from the joint stiffness ratios G, via the Dumonteil closed-form approximations to the sway and braced nomographs, by name.",
    freeAccess: "The AISC alignment charts and the Dumonteil closed-form fits are public results in the AISC Commentary and the standard steel-design references.",
    governance: GOVERNANCE.general,
    editionNote: "The AISC alignment-chart stiffness ratio G = sum(EI/L)_columns / sum(EI/L)_beams, the Dumonteil sway approximation K = sqrt((1.6 GA GB + 4(GA+GB) + 7.5)/(GA+GB+7.5)) and braced approximation K = (3 GA GB + 1.4(GA+GB) + 0.64)/(3 GA GB + 2(GA+GB) + 1.28), and the recommended G = 10 (pinned) / G = 1 (fixed) end conditions. This returns the effective-length factor from the joint stiffness ratios - it uses the Dumonteil closed-form fits (within ~2% of the nomograph), assumes the chart's idealizing assumptions (elastic behavior, all columns buckling simultaneously, equal L/r), and does not compute the G factors from member sizes for the user or apply the inelastic stiffness-reduction tau_b. A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Stiffness ratio", value: "G = sum(EI/L)_columns / sum(EI/L)_beams at each joint (10 pinned, 1 fixed)", source: "AISC Commentary alignment charts" },
      { name: "Closed-form K", value: "the Dumonteil sway/braced fits, within ~2% of the nomograph", source: "Dumonteil (1992)" },
      { name: "Chart assumptions", value: "elastic behavior, simultaneous column buckling, equal L/r; no tau_b", source: "AISC Commentary" },
    ],
  },
  "steel-bolt-tension-shear": {
    formula: "k = (LRFD) Fnt/(0.75 Fnv), (ASD) 2.00 Fnt/Fnv; F'nt = min(1.3 Fnt - k frv, Fnt) (floored at 0); available tension = 0.75 F'nt Ab (LRFD) or F'nt Ab/2.00 (ASD).",
    edition: "The AISC 360-22 Section J3.7 reduced tensile stress for a bearing-type bolt in combined tension and shear, with the Table J3.2 nominal stresses, by name.",
    freeAccess: "AISC 360 is free to read at aisc.org (Specification for Structural Steel Buildings); the J3.7 provision and Table J3.2 are in the published specification.",
    governance: GOVERNANCE.general,
    editionNote: "The AISC 360-22 J3.7 reduced tensile stress F'nt = 1.3 Fnt - (Fnt/(phi Fnv)) frv <= Fnt (LRFD, phi = 0.75) / 1.3 Fnt - (Omega Fnt/Fnv) frv <= Fnt (ASD, Omega = 2.00), the available tension phi F'nt Ab, and the Table J3.2 Fnt/Fnv values (A325/F1852: Fnt = 90, Fnv = 54 threads-N / 68 threads-X ksi). This returns the reduced bolt tension capacity in a bearing-type connection under combined tension and shear - it takes the required shear stress frv as entered (= required shear/Ab), uses the bearing-type interaction (a slip-critical joint reduces the slip resistance instead, J3.9), and does not check the bolt shear/bearing itself or the connected-element limit states. A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Reduced tension", value: "F'nt = 1.3 Fnt - k frv, capped at Fnt (no 1.3 benefit without shear) and floored at zero", source: "AISC 360-22 J3.7" },
      { name: "Nominal stresses", value: "Table J3.2: A325 Fnt = 90, Fnv = 54 (threads-N) or 68 (threads-X) ksi", source: "AISC 360-22 Table J3.2" },
      { name: "Bearing-type", value: "the bearing-type interaction; a slip-critical joint uses the J3.9 slip reduction", source: "AISC 360-22 J3.7 / J3.9" },
    ],
  },
  "steel-web-local-strength": {
    formula: "WLY Rn = Fy tw (5k + lb) interior, Fy tw (2.5k + lb) end (Omega 1.50 / phi 1.00); WC Rn = 0.80 tw^2 [1 + 3(lb/d)(tw/tf)^1.5] sqrt(E Fy tf/tw) (Omega 2.00 / phi 0.75); governing = min of the factored pair. (E = 29,000 ksi)",
    edition: "The AISC 360-22 J10.2 web local yielding and J10.3 web crippling limit states under a concentrated transverse force, with the interior/end coefficients and their differing resistance/safety factors, by name.",
    freeAccess: "AISC 360 is free to read at aisc.org (Specification for Structural Steel Buildings); the J10 provisions are in the published specification.",
    governance: GOVERNANCE.general,
    editionNote: "The AISC 360-22 J10.2 web local yielding Rn = Fy tw (5k + lb) interior / (2.5k + lb) end (phi = 1.00 / Omega = 1.50) and J10.3 web crippling Rn = 0.80 tw^2 [1 + 3(lb/d)(tw/tf)^1.5] sqrt(E Fy tf/tw) interior (phi = 0.75 / Omega = 2.00), E = 29,000 ksi, k = kdes. This returns the two web limit states under a concentrated transverse force at an interior or near-end location - it uses the interior/end forms as selected, and does not cover the near-end crippling reduction for lb/d > 0.2, web sidesway or compression buckling (J10.4/J10.5), or the bearing-stiffener design itself. A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Web local yielding", value: "Fy tw (5k + lb) interior; (2.5k + lb) within a member depth of the end", source: "AISC 360-22 J10.2" },
      { name: "Web crippling", value: "0.80 tw^2 [1 + 3(lb/d)(tw/tf)^1.5] sqrt(E Fy tf/tw) for an interior force", source: "AISC 360-22 J10.3" },
      { name: "Differing factors", value: "Omega 1.50 vs 2.00 (phi 1.00 vs 0.75) - the governing limit state can flip between ASD and LRFD", source: "AISC 360-22 J10" },
    ],
  },
  "steel-bolt-slip-critical": {
    formula: "Rn_bolt = mu Du hf Tb ns; ASD = Rn/1.50, LRFD = 1.00 Rn (standard holes); totals = n x per-bolt.",
    edition: "The AISC 360-22 J3.8 slip-critical connection resistance with the Class A/B slip coefficients, Du = 1.13, the Table J3.1 minimum pretension, and the standard-hole phi = 1.00 / Omega = 1.50, by name.",
    freeAccess: "AISC 360 is free to read at aisc.org (Specification for Structural Steel Buildings); the J3.8 provision and Table J3.1 pretensions are in the published specification.",
    governance: GOVERNANCE.general,
    editionNote: "The AISC 360-22 J3.8 slip resistance Rn = mu Du hf Tb ns, with mu = 0.30 (Class A) / 0.50 (Class B), Du = 1.13, the Table J3.1 minimum pretension Tb, and phi = 1.00 / Omega = 1.50 for standard holes. This returns the slip resistance of a pretensioned slip-critical bolt - it uses the standard-hole resistance factors (oversized and slotted holes reduce phi / raise Omega), the entered mu, Tb, and ns, and does not check the bolt shear/bearing at the strength level (which must also be satisfied), the bolt tension-slip interaction (J3.9), or the pretension installation method. A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Slip resistance", value: "mu Du hf Tb per slip plane; friction, not shear, governs the serviceability of the joint", source: "AISC 360-22 J3.8" },
      { name: "Surface class", value: "mu = 0.30 unpainted mill scale (Class A); 0.50 blast-cleaned (Class B)", source: "AISC 360-22 J3.8" },
      { name: "Also check strength", value: "the bearing-type shear and bearing/tearout limit states still apply", source: "AISC 360-22 J3.8 user note" },
    ],
  },
  "steel-fillet-weld-size": {
    formula: "min_leg from Table J2.4 by the thinner part (1/8 to 5/16 in brackets); max_leg = t (t < 1/4 in) or t - 1/16 (t >= 1/4 in) along an edge; te = 0.707 w; min length = 4 w.",
    edition: "The AISC 360-22 Table J2.4 minimum fillet-weld size, the J2.2b maximum size along an edge, the equal-leg effective throat, and the four-times-leg minimum length, by name.",
    freeAccess: "AISC 360 is free to read at aisc.org (Specification for Structural Steel Buildings); Table J2.4 and the J2.2b limits are in the published specification.",
    governance: GOVERNANCE.general,
    editionNote: "The AISC 360-22 Table J2.4 minimum fillet size by thinner-part thickness (1/8, 3/16, 1/4, 5/16 in), the J2.2b maximum size along an edge (t for t under 1/4 in, t - 1/16 in for t at or over 1/4 in), the effective throat te = 0.707 w for an equal-leg fillet, and the 4w minimum length. This returns the detailing size limits and geometry of an equal-leg fillet weld - it is not the weld strength, assumes an equal-leg fillet on connected material (not a skewed-tee or PJP groove), uses the along-an-edge maximum (an interior fillet away from an edge is not edge-limited), and does not cover the minimum-size-based-on-thicker-part alternative or prequalified WPS details. A fabrication aid; the welding procedure (AWS D1.1) and the engineer of record govern.",
    assumptions: [
      { name: "Minimum leg", value: "set by the THINNER part joined so the weld does not quench-crack: 1/8 / 3/16 / 1/4 / 5/16 in by thickness bracket", source: "AISC 360-22 Table J2.4" },
      { name: "Maximum along an edge", value: "the full thickness under 1/4 in; thickness minus 1/16 in at or over, so the edge is not melted away", source: "AISC 360-22 J2.2b" },
      { name: "Geometry", value: "equal-leg throat 0.707 w and a minimum load-carrying length of 4 legs", source: "AISC 360-22 J2.2a/J2.2b" },
    ],
  },
  "cantilever-beam": {
    formula: "M = P L + w L^2/2 (max moment at support); V = P + w L (max shear); delta = P L^3/(3 E I) + w L^4/(8 E I) (tip deflection, L in inches).",
    edition: "The standard cantilever beam moment/shear/deflection formulas (Roark's Formulas for Stress and Strain; AISC Manual beam diagrams), by name.",
    freeAccess: "Cantilever beam diagrams are published free in engineering references and the AISC Steel Construction Manual beam-diagram tables. The engineer of record governs the design.",
    governance: GOVERNANCE.general,
    editionNote: "The cantilever fixed at the support: max moment M = P L + w L^2/2 and max shear V = P + w L both at the fixed end, and tip deflection delta = P L^3/(3 E I) + w L^4/(8 E I) with the point and uniform terms superposed (L in inches, w in lb/in). This returns the elastic moment/shear/deflection: it assumes a prismatic member, small deflection, and no self-weight unless included in w, and does not include lateral-torsional buckling, shear deformation, or a strength/capacity check. A design aid, not a substitute for the engineer of record.",
    assumptions: [
      { name: "Support/loads", value: "fixed at one end; a tip point load, a uniform load, or both, superposed", source: "Roark / AISC beam diagrams" },
      { name: "Deflection form", value: "delta = P L^3/(3 E I) + w L^4/(8 E I)", source: "elastic beam theory" },
      { name: "Not a capacity check", value: "no LTB, shear deformation, or allowable-stress check", source: "scope of this tile" },
    ],
  },
  "section-properties": {
    formula: "rectangle I = b h^3/12; round I = pi d^4/64; pipe I = pi(d^4 - di^4)/64; tube I = (b h^3 - bi hi^3)/12; S = I/c; r = sqrt(I/A).",
    edition: "The standard cross-section property formulas (mechanics of materials; AISC Manual shapes), by name.",
    freeAccess: "Section-property formulas are published free in any mechanics-of-materials reference and the AISC Manual shape tables. The engineer of record governs the design.",
    governance: GOVERNANCE.general,
    editionNote: "The elastic cross-section properties about the bending (strong) axis: area A, moment of inertia I (b h^3/12 rectangle, pi d^4/64 round, the hollow difference for pipe/tube), section modulus S = I/c, extreme-fiber distance c, and radius of gyration r = sqrt(I/A). This returns the properties for a single rectangle, solid round, pipe, or hollow rectangular tube using the entered actual dimensions: it is the elastic (not plastic Z) property, is about the entered axis only, and does not handle built-up, composite, or standard rolled-shape lookups. I scales with the cube of the bending-direction depth, so orientation dominates. A design aid, not a substitute for the engineer of record.",
    assumptions: [
      { name: "Shapes", value: "rectangle, solid round, pipe (d/di), hollow rectangular tube (b/h, wall t)", source: "mechanics of materials" },
      { name: "Elastic properties", value: "I, S = I/c, r = sqrt(I/A); not the plastic modulus Z", source: "AISC / mechanics" },
      { name: "Actual dimensions", value: "uses the entered actual (dressed) dimensions, not nominal", source: "scope of this tile" },
    ],
  },
  "combined-stress-axial-bending": {
    formula: "sigma_axial = P/A; sigma_bend = M c/I; sigma_max = P/A + M c/I; sigma_min = P/A - M c/I; optional M = P e; no tension while M c/I <= P/A (kern e <= r^2/c).",
    edition: "The standard combined axial-plus-bending stress superposition (mechanics of materials), by name.",
    freeAccess: "The combined-stress superposition is published free in any mechanics-of-materials reference. The engineer of record governs the design.",
    governance: GOVERNANCE.general,
    editionNote: "The combined axial-plus-bending fiber stress on a short (non-buckling) member: sigma = P/A +/- M c/I, extreme compression fiber at P/A + M c/I and the other fiber at P/A - M c/I (tension where negative); an eccentricity e sets M = P e. The section stays wholly in compression only while M c/I <= P/A, the kern limit e <= r^2/c. This returns the elastic uniaxial fiber stresses: it does NOT include the P-delta / moment amplification of a slender member (use a beam-column interaction check for that), assumes bending about one axis, and is not an allowable-stress or code capacity check. A design aid, not a substitute for the engineer of record.",
    assumptions: [
      { name: "Superposition", value: "sigma = P/A +/- M c/I, extreme fibers; M from a moment or an eccentricity M = P e", source: "mechanics of materials" },
      { name: "Kern / no-tension", value: "the far face stays in compression while e <= r^2/c (the kern)", source: "mechanics of materials" },
      { name: "Short member", value: "no P-delta amplification; not a slender-column beam-column check", source: "scope of this tile" },
    ],
  },
  "wood-nail-withdrawal": {
    formula: "W = 1,380 G^(5/2) D (lb/in); Ctn = toenailed ? 0.67 : 1.0; Z_w = W x p x CD x Ctn.",
    edition: "The NDS 2018 12.2.3 reference nail/spike withdrawal design value and the toenail factor, by name; the 1,380 empirical constant is named.",
    freeAccess: "The NDS is free to view at awc.org (ANSI/AWC NDS); the 12.2.3 withdrawal equation and the 12.5.4 toenail factor are in the published standard.",
    governance: GOVERNANCE.general,
    editionNote: "The NDS 2018 12.2.3 reference withdrawal W = 1,380 G^(5/2) D (lb/in) with G the holding member's specific gravity and D the fastener diameter, the capacity W x p_pen, the toenail factor Ctn = 0.67 (12.5.4), and the rule that withdrawal from end grain is not permitted (12.2.3.4). This returns the reference nail-withdrawal design value and capacity - it applies to a nail loaded in withdrawal from side grain (not end grain), uses the holding member's specific gravity, multiplies by the entered CD and Ctn, and does not cover lateral (shear) loading, the head pull-through, or combined withdrawal-plus-lateral. A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Withdrawal value", value: "W = 1,380 G^(5/2) D per inch of penetration into the holding member", source: "NDS 2018 12.2.3" },
      { name: "Toenail factor", value: "Ctn = 0.67 for a toenailed connection (12.5.4)", source: "NDS 2018 12.5.4" },
      { name: "Side grain only", value: "withdrawal from end grain is not permitted", source: "NDS 2018 12.2.3.4" },
    ],
  },
  "wood-lag-withdrawal": {
    formula: "W = 1,800 G^(3/2) D^(3/4) (lb/in of thread); Ceg = end grain ? 0.75 : 1.0; Z_w = W x p_thread x CD x Ceg.",
    edition: "The NDS 2018 12.2.1 reference lag-screw withdrawal design value and the end-grain factor, by name; the 1,800 empirical constant is named.",
    freeAccess: "The NDS is free to view at awc.org (ANSI/AWC NDS); the 12.2.1 lag-withdrawal equation is in the published standard.",
    governance: GOVERNANCE.general,
    editionNote: "The NDS 2018 12.2.1 reference withdrawal W = 1,800 G^(3/2) D^(3/4) (lb/in of thread penetration) with G the holding member's specific gravity and D the shank diameter, the capacity W x p_thread, the load-duration CD, and the end-grain factor Ceg = 0.75. This returns the axial (withdrawal) lag design value - withdrawal scales only with the 3/4 power of diameter, so more or deeper lags beat one fat lag - and it does not cover the lateral yield-limit connection or the head/washer bearing. A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Withdrawal value", value: "W = 1,800 G^(3/2) D^(3/4) per inch of thread penetration", source: "NDS 2018 12.2.1" },
      { name: "End-grain factor", value: "Ceg = 0.75 for a lag installed into end grain", source: "NDS 2018 12.2.1" },
      { name: "Axial only", value: "the withdrawal value, not the lateral connection or the head bearing", source: "scope of this tile" },
    ],
  },
  "wood-screw-withdrawal": {
    formula: "W = 2,850 G^2 D (lb/in); Z_w = W x p x CD.",
    edition: "The NDS 2018 12.2.2 reference wood-screw withdrawal design value, by name; the 2,850 empirical constant is named.",
    freeAccess: "The NDS is free to view at awc.org (ANSI/AWC NDS); the 12.2.2 wood-screw-withdrawal equation is in the published standard.",
    governance: GOVERNANCE.general,
    editionNote: "The NDS 2018 12.2.2 reference withdrawal W = 2,850 G^2 D (lb/in) with G the holding member's specific gravity and D the screw diameter, the capacity W x p, and the load-duration CD. This returns the axial (withdrawal) wood-screw design value - withdrawal scales with the square of the specific gravity, so a screw that holds in Douglas Fir-Larch (G 0.50) can strip in a softer spruce (G 0.42) - and it does not cover the lateral connection or the head pull-through. A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Withdrawal value", value: "W = 2,850 G^2 D per inch of penetration", source: "NDS 2018 12.2.2" },
      { name: "G^2 sensitivity", value: "the square-of-specific-gravity law makes species the dominant variable", source: "NDS 2018 12.2.2" },
      { name: "Axial only", value: "the withdrawal value, not the lateral connection or the head pull-through", source: "scope of this tile" },
    ],
  },
  "wood-bearing-perpendicular": {
    formula: "Cb = (lb < 6 in and not within 3 in of the end) ? (lb + 0.375)/lb : 1.0; Fc_perp' = Fc_perp x Cb; fc_perp = R/(b lb); DCR = fc_perp / Fc_perp'; lb_req = R/(b Fc_perp) (Cb = 1, conservative).",
    edition: "The NDS 2018 3.10.2 compression-perpendicular-to-grain bearing check and the 3.10.4 bearing-area factor Cb = (lb + 0.375)/lb for a bearing under 6 in and not within 3 in of the member end, by name.",
    freeAccess: "The NDS is free to view at awc.org (ANSI/AWC NDS); the 3.10 bearing provisions and the Cb factor are in the published standard.",
    governance: GOVERNANCE.general,
    editionNote: "The NDS 2018 3.10.2 bearing stress fc_perp = R/(b lb) against Fc_perp' = Fc_perp x Cb, and the 3.10.4 bearing-area factor Cb = (lb + 0.375)/lb for bearings under 6 in and not within 3 in of the end. This checks compression perpendicular to grain at a bearing - it uses the reference Fc_perp (already adjusted for wet service CM and temperature Ct if entered as such; Fc_perp is not adjusted by CD load duration), applies Cb only within its geometric limits, and does not cover angle-to-grain bearing (the Hankinson formula), the member's bending or shear, or the 0.04 in deformation-limit alternative. A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Bearing check", value: "fc_perp = R/(b lb) at the support against the adjusted Fc_perp'", source: "NDS 2018 3.10.2" },
      { name: "Bearing-area factor", value: "Cb = (lb + 0.375)/lb, only for lb < 6 in and bearings not within 3 in of the member end", source: "NDS 2018 3.10.4" },
      { name: "No CD", value: "Fc_perp is a deformation-based value and takes no load-duration factor", source: "NDS 2018 Table 4.3.1" },
    ],
  },
  "wood-tension-member": {
    formula: "Ag = b d; An = Ag - nh dh b; Ft' = Ft x CD x CF; ft = T/An; DCR = ft/Ft'.",
    edition: "The NDS 2018 3.8.1 tension-parallel-to-grain check on the net section, with the load-duration CD and size CF adjustment factors, by name.",
    freeAccess: "The NDS is free to view at awc.org (ANSI/AWC NDS); the 3.8 tension provisions and the adjustment-factor table are in the published standard.",
    governance: GOVERNANCE.general,
    editionNote: "The NDS 2018 3.8.1 tension check ft = T/An <= Ft', the net area An = b d - nh dh b, and the adjusted value Ft' = Ft x CD x CF (with the other applicable factors folded into the entered values). This checks tension parallel to grain on the net section - it takes the reference Ft and the entered CD and CF (the user supplies the remaining CM, Ct, Ci if they apply), deducts holes in a single transverse line (no staggered-row chain), and does not cover perpendicular-to-grain tension (avoid it), the fastener/connection yield, or the row/group tear-out. A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Net section", value: "An deducts the fastener holes at the section in one transverse line", source: "NDS 2018 3.1.2 / 3.8.1" },
      { name: "Adjusted value", value: "Ft' = Ft x CD x CF with the remaining applicable factors entered by the user", source: "NDS 2018 Table 4.3.1" },
      { name: "Scope", value: "parallel-to-grain tension only; connection yield and tear-out are separate checks", source: "NDS 2018 3.8" },
    ],
  },
  "wood-combined-bending-axial": {
    formula: "fc = P/A; fb = M/S; FcE = 0.822 Emin'/(le/d)^2; interaction = (fc/Fc')^2 + fb/[Fb'(1 - fc/FcE)] <= 1.0.",
    edition: "The NDS 2018 3.9.2 combined bending and axial compression interaction with the Euler stress FcE = 0.822 Emin'/(le/d)^2 and the 1 - fc/FcE P-delta moment magnifier, by name.",
    freeAccess: "The NDS is free to view at awc.org (ANSI/AWC NDS); the 3.9.2 interaction equation is in the published standard.",
    governance: GOVERNANCE.general,
    editionNote: "The NDS 2018 3.9.2 combined bending-and-axial-compression interaction (fc/Fc')^2 + fb/[Fb'(1 - fc/FcE)] <= 1.0, with FcE = 0.822 Emin'/(le/d)^2 and the 1 - fc/FcE P-delta amplifier. This checks uniaxial bending plus concentric axial compression - it takes the already-adjusted Fc' (including Cp) and Fb' (including CL) as entered (compute them in the wood column and beam tiles), uses the bending axis whose d and le are supplied, and does not cover biaxial bending, the eccentric-load fc(6e/d) term, or tension-plus-bending (NDS 3.9.1). A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Interaction", value: "the squared axial term plus the amplified bending term must not exceed 1.0", source: "NDS 2018 Eq. 3.9-3" },
      { name: "P-delta amplifier", value: "the bending term divides by 1 - fc/FcE, growing without bound as fc approaches the Euler stress", source: "NDS 2018 3.9.2" },
      { name: "Adjusted values", value: "Fc' enters carrying the column-stability Cp; Fb' carrying the beam-stability CL", source: "NDS 2018 3.7 / 3.3.3" },
    ],
  },
  "soil-consolidation-settlement": {
    formula: "Sc_ft = (Cc H / (1 + e0)) log10((sigma'0 + d_sigma) / sigma'0); Sc_in = 12 Sc_ft.",
    edition: "The Terzaghi primary consolidation settlement of a normally-consolidated clay Sc = (Cc H/(1 + e0)) log10((sigma'0 + d_sigma)/sigma'0), with the compression index Cc, as compiled in the Das and NAVFAC references, by name.",
    freeAccess: "The primary-consolidation relation is a public soil-mechanics result; NAVFAC DM-7 is public-domain and free online.",
    governance: GOVERNANCE.general,
    editionNote: "The normally-consolidated primary consolidation Sc = (Cc H/(1 + e0)) log10((sigma'0 + d_sigma)/sigma'0), the compression index Cc (often ~0.009(LL - 10) for remolded clay), and the note that an overconsolidated clay uses the recompression index Cr below the preconsolidation stress. This returns the primary consolidation settlement of a single normally-consolidated clay layer - it is not the immediate elastic settlement or the secondary (creep) settlement, assumes the clay is normally consolidated (an OC clay straddling the preconsolidation stress needs the two-part Cr/Cc form), uses one representative mid-layer stress (sublayer the profile for accuracy), and gives no time rate (that needs the coefficient of consolidation). A design aid, not a substitute for the geotechnical engineer of record's report.",
    assumptions: [
      { name: "NC consolidation", value: "Sc = (Cc H/(1 + e0)) log10 of the effective-stress ratio at mid-layer", source: "Terzaghi / Das" },
      { name: "Compression index", value: "Cc, often ~0.009(LL - 10) for remolded clay; OC clay uses Cr below the preconsolidation stress", source: "soil-mechanics references" },
      { name: "Scope", value: "single NC layer, one mid-layer stress, no time rate or secondary creep", source: "scope of this tile" },
    ],
  },
  "footing-eccentric-pressure": {
    formula: "e = M/P; e <= B/6: q = (P/BL)(1 +/- 6e/B); e > B/6: q_max = 2P/(3L(B/2 - e)), q_min = 0, bearing length = 3(B/2 - e).",
    edition: "The eccentric spread-footing bearing-pressure relations - the middle-third (kern) trapezoidal form and the resultant-outside-kern triangular form - a standard foundation-engineering result, by name.",
    freeAccess: "The eccentric-footing pressure relations and the middle-third rule are public foundation-engineering results.",
    governance: GOVERNANCE.general,
    editionNote: "The middle-third rule q = (P/BL)(1 +/- 6e/B) for e <= B/6 and the resultant-outside-kern q_max = 2P/(3L(B/2 - e)), q_min = 0 for e > B/6, with e = M/P. This returns the service bearing pressure distribution under a one-way eccentric or axial-plus-moment load - it covers uniaxial eccentricity (a biaxial ex, ey load needs the two-way form), assumes a rigid footing on a linear-elastic soil (no soil-model refinement), and does not check the allowable bearing, settlement, or the footing's own flexure/shear. A design aid, not a substitute for the structural/geotechnical engineer of record's design.",
    assumptions: [
      { name: "Kern rule", value: "trapezoidal q = (P/BL)(1 +/- 6e/B) while e <= B/6 (full bearing)", source: "foundation engineering" },
      { name: "Outside kern", value: "heel lifts to a triangle over 3(B/2 - e) with q_max = 2P/(3L(B/2 - e))", source: "foundation engineering" },
      { name: "Scope", value: "uniaxial eccentricity, rigid footing; allowable bearing and settlement are separate", source: "scope of this tile" },
    ],
  },
  "boussinesq-surcharge-wall": {
    formula: "m = x/H, n = z/H; m <= 0.4: sigma_h = (0.203 qL/H) n/(0.16 + n^2)^2; m > 0.4: sigma_h = (1.28 qL/H)(m^2 n)/(m^2 + n^2)^2.",
    edition: "The NAVFAC DM-7.2 modified-Boussinesq line-load lateral pressure on a rigid wall, the doubled elastic Boussinesq solution for an unyielding wall, by name.",
    freeAccess: "NAVFAC DM-7.2 is public-domain and free online; the modified-Boussinesq surcharge relations are public.",
    governance: GOVERNANCE.general,
    editionNote: "The NAVFAC DM-7.2 modified-Boussinesq line-load lateral pressure sigma_h = (0.203 qL/H) n/(0.16 + n^2)^2 for m <= 0.4 and (1.28 qL/H)(m^2 n)/(m^2 + n^2)^2 for m > 0.4, the doubling of the elastic Boussinesq solution for an unyielding (non-deflecting) rigid wall, and m = x/H, n = z/H. This returns the lateral pressure at a single depth from a line load parallel to the wall - it uses the rigid-wall (doubled) form (a flexible wall that can deflect sees roughly the un-doubled Boussinesq value), covers a line load (a point or strip load uses the companion NAVFAC forms), and does not integrate the resultant thrust and its point of application or add the at-rest/active earth pressure beneath it. A design aid, not a substitute for the geotechnical engineer of record's report.",
    assumptions: [
      { name: "Modified Boussinesq", value: "the two m-branch forms with m = x/H, n = z/H; doubled for a rigid non-deflecting wall", source: "NAVFAC DM-7.2" },
      { name: "Line load", value: "a load per unit length parallel to the wall; point/strip loads use the companion forms", source: "NAVFAC DM-7.2" },
      { name: "Single depth", value: "pressure at one z; the integrated resultant thrust is a separate step", source: "scope of this tile" },
    ],
  },
  "soil-settlement-elastic": {
    formula: "Se_ft = q B (1 - nu^2) Is / Es; Se_in = 12 Se_ft.",
    edition: "The theory-of-elasticity immediate (elastic) settlement of a shallow foundation, Se = q B (1 - nu^2) Is / Es, with the shape-and-rigidity influence factor Is (~0.82 rigid square, ~0.95 flexible-square average, larger for strips), as compiled in Bowles (Foundation Analysis and Design) and the customary geotechnical texts, by name.",
    freeAccess: "The elasticity-based settlement form and the influence-factor tables are public in the standard foundation-engineering references; the arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "The theory-of-elasticity immediate settlement Se = q B (1 - nu^2) Is / Es, with the shape-and-rigidity influence factor Is (~0.82 rigid square, ~0.95 flexible average, larger for strips) as compiled in Bowles and the customary geotechnical texts. This returns the immediate (elastic) settlement of a footing on a deep, uniform elastic layer - it is not the consolidation settlement of a clay (a separate, time-dependent calculation), assumes a single homogeneous soil modulus (no layering or modulus increase with depth), takes the influence factor as entered, and excludes the embedment (depth) correction. A design aid, not a substitute for the geotechnical engineer of record's report.",
    assumptions: [
      { name: "Elastic form", value: "Se = q B (1 - nu^2) Is / Es on a deep uniform elastic layer", source: "theory of elasticity / Bowles" },
      { name: "Influence factor", value: "Is as entered (~0.82 rigid square; ~0.95 flexible-square average; larger for strips)", source: "Bowles influence-factor tables" },
      { name: "Scope", value: "immediate settlement only; consolidation, layering, and embedment are separate", source: "customary geotechnical practice" },
    ],
  },
  "pile-axial-capacity": {
    formula: "As = pi D L; Ap = pi D^2/4; Qs = alpha cu As; Qp = 9 cu Ap; Qult = Qs + Qp; Qall = Qult / FS.",
    edition: "The alpha (total-stress) method for the static axial capacity of a pile in clay -- skin friction alpha cu over the shaft plus end bearing Nc cu (Nc = 9) at the tip -- with the adhesion factor alpha (~1.0 soft to ~0.5 stiff) as compiled in the FHWA driven-pile manual and Das (Principles of Foundation Engineering), and the customary factor of safety of 2 to 3 without a load test, by name.",
    freeAccess: "The FHWA driven-pile design manuals are free at fhwa.dot.gov; the alpha-method relations are public in the standard foundation texts.",
    governance: GOVERNANCE.general,
    editionNote: "The alpha (total-stress) method for a pile in clay - Qult = alpha cu (pi D L) + 9 cu (pi D^2/4), with the adhesion factor alpha (~1.0 soft to ~0.5 stiff) and the tip bearing factor Nc = 9, as compiled in the FHWA and Das foundation texts - and the customary factor of safety of 2 to 3 without a load test. This returns the ultimate and allowable static axial (compression) capacity of a single straight-shaft pile in a uniform cohesive soil - it uses the total-stress alpha method (not the beta effective-stress method for sand), one soil layer, no group efficiency, no negative skin friction or uplift, and no pile-driving or dynamic capacity. A design aid; the geotechnical engineer of record and, where required, a load test govern.",
    assumptions: [
      { name: "Skin friction", value: "fs = alpha cu over the shaft surface pi D L; alpha from clay stiffness (~0.55 medium stiff)", source: "FHWA / Das alpha method" },
      { name: "End bearing", value: "qp = 9 cu over the tip area (Nc = 9 for a deep foundation in clay)", source: "Skempton / FHWA" },
      { name: "Safety factor", value: "the customary 2 to 3 on ultimate without a static load test", source: "FHWA driven-pile practice" },
    ],
  },
  "slope-stability-infinite": {
    formula: "driving = gamma H sin(beta) cos(beta); resisting = c' + gamma H cos^2(beta) tan(phi'); FS = resisting / driving. (c' = 0 collapses to FS = tan(phi')/tan(beta))",
    edition: "The infinite-slope stability model -- the factor of safety of a shallow translational slide on a plane parallel to a long uniform slope, with its cohesionless reduction tan(phi')/tan(beta) -- as compiled in Das (Principles of Geotechnical Engineering) and the NAVFAC DM-7 slope-stability references, by name.",
    freeAccess: "NAVFAC DM-7 is public-domain and free online; the infinite-slope relations are public in the standard geotechnical texts.",
    governance: GOVERNANCE.general,
    editionNote: "The infinite-slope factor of safety FS = (c' + gamma H cos^2(beta) tan(phi')) / (gamma H sin(beta) cos(beta)) and its cohesionless reduction FS = tan(phi')/tan(beta), as compiled in the Das and NAVFAC slope-stability references. This returns the factor of safety against a shallow translational slide on a plane parallel to a long, uniform slope with no seepage (dry, or water table below the failure plane) - it is not a circular/rotational (Bishop/Spencer) analysis, assumes a uniform soil and an infinite slope (edge effects and finite geometry ignored), takes drained effective-stress parameters, and excludes pore pressure / steady seepage (the gamma - gamma_w submerged case is a follow-on) and seismic loading. A design/screening aid, not a substitute for a geotechnical engineer's stability analysis.",
    assumptions: [
      { name: "Failure mode", value: "a shallow translational slide parallel to the surface at depth H; strength-over-stress ratio", source: "infinite-slope model (Das / NAVFAC)" },
      { name: "Cohesionless case", value: "c' = 0 gives FS = tan(phi')/tan(beta), independent of depth and unit weight (the angle of repose at FS = 1)", source: "infinite-slope model" },
      { name: "No seepage", value: "dry slope or water table below the plane; steady-seepage and seismic cases are separate", source: "scope of this tile" },
    ],
  },
  "relative-compaction": {
    formula: "gd_field = wet / (1 + w/100); RC = gd_field / max x 100; pass when RC >= spec.",
    edition: "The relative-compaction relation RC = (gamma_d,field / gamma_d,max) x 100 with the moisture-back-out of field dry density and the ASTM D698/D1557 Proctor basis, a standard earthwork-QC result, by name.",
    freeAccess: "The relative-compaction relation is a public earthwork-QC result; the ASTM D698/D1557 Proctor tests define the maximum dry density.",
    governance: GOVERNANCE.general,
    editionNote: "The relative compaction RC = (gamma_d,field / gamma_d,max) x 100, the field dry density gamma_d,field = gamma_wet / (1 + w), the Proctor maximum from ASTM D698 (standard) or D1557 (modified), and typical specs of 90 to 95% (structural fill often 95%, pavement subgrade higher). This returns the relative compaction and the pass/fail against an entered spec - it uses the entered Proctor maximum (which depends on the standard vs modified test and the soil), takes the field density from a nuclear gauge or sand cone as entered, and does not compute the optimum-moisture window, the one-point Proctor, or the relative density Dr of a cohesionless soil. A QC aid; the project geotechnical specification and the testing agency govern.",
    assumptions: [
      { name: "Relative compaction", value: "field dry density as a percentage of the lab Proctor maximum dry density", source: "earthwork QC practice" },
      { name: "Moisture back-out", value: "gamma_d,field = gamma_wet / (1 + w) from the nuclear-gauge or sand-cone reading", source: "field density testing" },
      { name: "Proctor basis", value: "maximum dry density from ASTM D698 (standard) or D1557 (modified)", source: "ASTM D698 / D1557" },
    ],
  },
  "soil-phase-relations": {
    formula: "gamma_d = gamma/(1 + w/100); e = Gs gamma_w/gamma_d - 1; n = e/(1 + e); S = w Gs/e. (gamma_w = 62.4 pcf)",
    edition: "The soil three-phase relations - dry unit weight, void ratio, porosity, and degree of saturation - as compiled in the Das and NAVFAC geotechnical references, by name.",
    freeAccess: "The soil phase relations are public geotechnical results; NAVFAC DM-7 is public-domain and free online.",
    governance: GOVERNANCE.general,
    editionNote: "The phase relations gamma_d = gamma/(1 + w), e = Gs gamma_w/gamma_d - 1, n = e/(1 + e), S = w Gs/e, and Gs ~ 2.65 to 2.72 for common soils, with gamma_w = 62.4 pcf, as compiled in the Das and NAVFAC references. This returns the void ratio, porosity, dry unit weight, and saturation from the total unit weight, water content, and specific gravity - it assumes the entered Gs (measure or estimate it by soil type), uses gamma_w = 62.4 pcf (fresh water), and does not compute the permeability, the effective stress, or the compaction relative density. An engineering aid; the soil test data govern.",
    assumptions: [
      { name: "Dry unit weight", value: "gamma_d = gamma/(1 + w), the solids weight per total volume", source: "soil mechanics" },
      { name: "Void ratio and porosity", value: "e = Gs gamma_w/gamma_d - 1, n = e/(1 + e)", source: "soil mechanics" },
      { name: "Saturation", value: "S = w Gs/e; gamma_w = 62.4 pcf fresh water, Gs ~ 2.65-2.72", source: "soil mechanics" },
    ],
  },
  "atterberg-indices": {
    formula: "PI = LL - PL; LI = (w - PL)/PI; A-line PI = 0.73(LL - 20); above A-line -> clay (CL/CH), below -> silt (ML/MH), split at LL = 50.",
    edition: "The Atterberg-limit indices (plasticity index, liquidity index) and the USCS A-line classification, with the ASTM D4318 limit tests, by name.",
    freeAccess: "The Atterberg-limit definitions and the USCS A-line are public geotechnical results; ASTM D4318 defines the limit tests.",
    governance: GOVERNANCE.general,
    editionNote: "The plasticity index PI = LL - PL, the liquidity index LI = (w - PL)/PI, the USCS A-line PI = 0.73(LL - 20) and U-line, the LL = 50 low/high-plasticity split, and the ASTM D4318 limit tests. This returns the plasticity indices and the A-line-based USCS group for a fine-grained soil - it classifies by the A-line/LL = 50 chart (the full USCS also needs the fines content and gradation for a coarse-grained or dual classification), assumes the limits are from the standard ASTM D4318 tests, and does not compute the shrink-swell potential, the activity, or the coarse-fraction sieve classification. An engineering aid; the soil test data and the geotechnical engineer govern.",
    assumptions: [
      { name: "Plasticity index", value: "PI = LL - PL; a soil with PL >= LL is nonplastic", source: "ASTM D4318" },
      { name: "A-line", value: "PI = 0.73(LL - 20); above -> clay (CL/CH), below -> silt (ML/MH)", source: "USCS (ASTM D2487)" },
      { name: "Plasticity split", value: "LL = 50 separates low (L) from high (H) plasticity", source: "USCS chart" },
    ],
  },
  "injector-size": {
    formula: "total_lbh = HP x BSFC; inj_lbh = total_lbh / (n_cyl x duty); inj_ccmin = inj_lbh x 10.5.",
    edition: "The fuel-injector-sizing relation lb/h = HP x BSFC / (n_cyl x duty), with the BSFC ranges, the customary 80% duty cycle, and the gasoline cc/min conversion, a standard tuning-reference result, by name.",
    freeAccess: "The injector-sizing relation and the BSFC ranges are public results in the engine-tuning references.",
    governance: GOVERNANCE.general,
    editionNote: "The injector flow lb/h = HP x BSFC / (n_cyl x duty), the BSFC ranges (~0.45 to 0.50 NA gas, ~0.55 to 0.65 boosted), the customary 80% maximum duty cycle, and the lb/h x 10.5 = cc/min conversion for gasoline (specific gravity ~0.72). This returns the per-injector flow at the stated duty - it uses the entered BSFC (which rises with boost and richer tuning), assumes evenly-distributed port injection with one injector per cylinder, and does not cover a return-versus-returnless fuel system, the rail pressure that sets the injector's static flow, or direct injection. A tuning aid; the engine's measured fueling and the tuner's judgment govern.",
    assumptions: [
      { name: "Injector flow", value: "HP x BSFC divided across the injectors at the maximum duty cycle", source: "engine-tuning practice" },
      { name: "BSFC", value: "~0.50 naturally-aspirated gas, 0.55-0.65 boosted; entered by the user", source: "tuning references" },
      { name: "Conversion", value: "lb/h x 10.5 = cc/min for gasoline (SG ~0.72)", source: "unit conversion" },
    ],
  },
  "mean-piston-speed": {
    formula: "mps_fpm = stroke_in x RPM / 6 (= 2 x stroke x RPM); mps_ms = mps_fpm x 0.00508; regime by ft/min band.",
    edition: "The mean-piston-speed relation MPS = 2 x stroke x RPM and the practical rpm-limit bands, as compiled in the engine-building references, by name.",
    freeAccess: "The mean-piston-speed relation is a public engine-building result; the regime bands are standard builder guidance.",
    governance: GOVERNANCE.general,
    editionNote: "The mean piston speed MPS = 2 x stroke x RPM (= stroke_in x RPM / 6 in ft/min), and the practical bands (~under 3,500-4,000 ft/min street/endurance, 4,000-4,500 performance, over 4,500 race), as compiled in the engine-building references. This returns the mean piston speed and its regime reading - it is the average (not peak, which is roughly pi/2 higher and offset by the rod ratio) speed, the bands are guidance for typical materials (a specific assembly's limit depends on the rods, pistons, and pins), and it does not compute the peak acceleration or the inertial bearing load. A shop aid; the component makers' rpm ratings govern.",
    assumptions: [
      { name: "Mean speed", value: "MPS = stroke_in x RPM / 6, the average piston speed over a stroke", source: "engine-building references" },
      { name: "Regime bands", value: "street/endurance under ~4,000, performance 4,000-4,500, race over 4,500 ft/min", source: "builder guidance" },
      { name: "Average not peak", value: "peak is roughly pi/2 higher and rod-ratio-dependent; not computed here", source: "kinematics" },
    ],
  },
  "trap-speed-horsepower": {
    formula: "HP = weight x (mph/234)^3; ET = 5.825 x (weight/HP)^(1/3).",
    edition: "Hale's empirical quarter-mile relations HP = weight x (mph/234)^3 and ET = 5.825 x (weight/HP)^(1/3), as compiled in the drag-racing references, by name.",
    freeAccess: "Hale's quarter-mile relations are public empirical results widely used in the drag-racing community.",
    governance: GOVERNANCE.general,
    editionNote: "Hale's empirical quarter-mile relations HP = weight x (mph/234)^3 and ET = 5.825 x (weight/HP)^(1/3), with weight the race weight including driver (lb) and mph the trap speed. This returns an empirical horsepower estimate from the timeslip - it is a statistical fit to typical cars (the 234 constant and the cube law average out aerodynamics, driveline loss, and traction; a very slippery or very draggy car deviates), reflects the power actually reaching the wheels at the traps, and is not a substitute for a dyno. A hobbyist estimate; the actual dyno measurement governs.",
    assumptions: [
      { name: "Trap-speed power", value: "HP = weight x (mph/234)^3, a cube-law fit to the power-to-weight ratio", source: "Hale quarter-mile relation" },
      { name: "ET companion", value: "ET = 5.825 x (weight/HP)^(1/3) cross-checks the estimate", source: "Hale quarter-mile relation" },
      { name: "Empirical", value: "a statistical fit reflecting wheel power at the traps; not a dyno measurement", source: "drag-racing practice" },
    ],
  },
  "refrigerant-mass-flow": {
    formula: "Q_btumin = (unit == tons) ? Q x 200 : Q/60; RE = h1 - h4; m_dot = Q_btumin / RE; m_dot_lbh = 60 m_dot.",
    edition: "The refrigerant mass-flow-from-capacity relation m_dot = Q / (h1 - h4) with the refrigeration effect off the pressure-enthalpy diagram, a standard refrigeration-cycle result, by name.",
    freeAccess: "The mass-flow-from-capacity relation is a public refrigeration-cycle result; the ASHRAE Handbook - Refrigeration covers the P-h cycle.",
    governance: GOVERNANCE.general,
    editionNote: "The refrigerant mass flow m_dot = Q / (h1 - h4), the refrigeration effect RE = h1 - h4 from the pressure-enthalpy diagram, the 1 ton = 200 Btu/min = 12,000 Btu/h conversion, and h4 = hf at the condensing pressure (isenthalpic throttling). This returns the circulated refrigerant mass flow - it takes the enthalpies off the refrigerant's P-h diagram or tables at the operating condition, assumes steady flow and 100% evaporator effectiveness, and does not compute the compressor displacement, the volumetric efficiency, or the enthalpies themselves. An engineering aid; the refrigerant property data at the operating condition govern.",
    assumptions: [
      { name: "Mass flow", value: "m_dot = Q / (h1 - h4), the load over the refrigeration effect", source: "vapor-compression cycle" },
      { name: "Throttling", value: "h4 = hf at the condensing pressure (isenthalpic expansion)", source: "refrigeration cycle" },
      { name: "Enthalpies", value: "read off the refrigerant P-h diagram or tables at the operating state points", source: "refrigerant property data" },
    ],
  },
  "refrigeration-cop": {
    formula: "COP = (h1 - h4)/(h2 - h1); COP_Carnot = (Tevap + 459.67)/((Tcond + 459.67) - (Tevap + 459.67)); eta_2nd = COP/COP_Carnot; EER = 3.412 COP.",
    edition: "The cooling coefficient of performance, its Carnot ceiling, the second-law efficiency, and the EER relation, standard refrigeration-cycle definitions, by name.",
    freeAccess: "The COP, Carnot-limit, and EER relations are public thermodynamic results; the ASHRAE Handbook covers the cycle.",
    governance: GOVERNANCE.general,
    editionNote: "The cooling COP = (h1 - h4)/(h2 - h1), the Carnot limit COP_Carnot = T_evap/(T_cond - T_evap) in absolute (Rankine) temperature, the second-law efficiency COP/COP_Carnot, and the relation EER = 3.412 x COP. This returns the cycle COP, its Carnot ceiling, and the second-law efficiency - it uses the enthalpies from the P-h diagram, takes the ideal (isentropic-work) or actual work as entered, uses saturation temperatures for the Carnot lift, and does not add the motor/drive or parasitic loads (the system COP is lower). An engineering aid; the refrigerant property data and measured state points govern.",
    assumptions: [
      { name: "Cycle COP", value: "the refrigeration effect over the compressor work, from the P-h enthalpies", source: "vapor-compression cycle" },
      { name: "Carnot ceiling", value: "T_evap/(T_cond - T_evap) in Rankine; the ratio is the second-law efficiency", source: "thermodynamics" },
      { name: "EER", value: "EER = 3.412 x COP (Btu/Wh per unit COP)", source: "unit conversion" },
    ],
  },
  "condenser-heat-rejection": {
    formula: "Q_btuh = (unit == tons) ? Q x 12,000 : Q; W_comp = Q_btuh/COP; THR = Q_btuh (1 + 1/COP); factor = 1 + 1/COP; THR_tons = THR/12,000.",
    edition: "The condenser total heat of rejection THR = Q_evap + W_comp = Q_evap (1 + 1/COP), a standard refrigeration-cycle result, by name.",
    freeAccess: "The total-heat-of-rejection relation is a public refrigeration-cycle result; the ASHRAE Handbook covers condenser sizing.",
    governance: GOVERNANCE.general,
    editionNote: "The total heat of rejection THR = Q_evap + W_comp = Q_evap (1 + 1/COP), the compressor work W_comp = Q_evap/COP, and the typical heat-rejection factor of about 1.25 for comfort cooling (higher at lower COP / low-temperature refrigeration). This returns the total heat of rejection at the condenser from the evaporator load and the COP - it uses the compressor work implied by the COP, assumes the condenser rejects the full evaporator-plus-compressor heat (no desuperheater/heat-recovery split), and does not add motor heat rejected outside the refrigerant (a hermetic compressor adds it, a belt-drive does not). An engineering aid; the equipment's rated heat-of-rejection data govern.",
    assumptions: [
      { name: "Heat of rejection", value: "THR = Q_evap (1 + 1/COP), the evaporator load plus the compressor work", source: "energy balance" },
      { name: "Rejection factor", value: "1 + 1/COP, about 1.25 for comfort cooling, higher at lower COP", source: "refrigeration practice" },
      { name: "No heat recovery", value: "full rejection at the condenser; no desuperheater split or external motor heat", source: "scope of this tile" },
    ],
  },
  "radial-chip-thinning": {
    formula: "r = ae/D; RCTF = (r < 0.5) ? 1/(2 sqrt(r - r^2)) : 1.0; fz_prog = fz_target x RCTF.",
    edition: "The radial-chip-thinning geometry - the chip thinning factor RCTF = 1/(2 sqrt((ae/D) - (ae/D)^2)) for ae below half the cutter diameter and the compensated feed - as compiled in the modern milling and Machinery's Handbook references, by name.",
    freeAccess: "The radial chip thinning relation is a public cutting-geometry result in the modern milling references and tool-maker guidance.",
    governance: GOVERNANCE.general,
    editionNote: "The radial chip thinning factor RCTF = 1/(2 sqrt((ae/D) - (ae/D)^2)) for ae < D/2, the compensated feed fz_prog = fz_target x RCTF, and RCTF = 1.0 at half immersion and above, as compiled in the modern milling / Machinery's Handbook references. This returns the radial chip thinning factor and compensated feed - it is the radial (not axial/lead-angle) thinning, applies to ae < D/2 (above which no compensation is needed), and does not itself cap the result against the machine's feed limit, the tool's maximum chip load, or the spindle power. A shop aid; the tool manufacturer's recommended chip load and the machine govern.",
    assumptions: [
      { name: "Thinning factor", value: "RCTF = 1/(2 sqrt((ae/D) - (ae/D)^2)) at light radial engagement", source: "milling geometry" },
      { name: "Compensated feed", value: "fz_prog = fz_target x RCTF restores the intended chip thickness", source: "milling practice" },
      { name: "Crossover", value: "RCTF = 1.0 at and above half immersion (ae >= D/2)", source: "radial-thinning geometry" },
    ],
  },
  "boring-bar-deflection": {
    formula: "I = pi d^4/64; delta = F L^3/(3 E I); L/d ratio for chatter risk. (E = 30e6 psi steel, ~90e6 carbide)",
    edition: "The cantilever tip-deflection model delta = F L^3/(3 E I) with I = pi d^4/64 for a round bar, and the practical L/d overhang limits, a standard mechanics-of-materials result applied to tool overhang, by name.",
    freeAccess: "The cantilever deflection formula is a public mechanics-of-materials result; the L/d overhang limits are standard machining guidance.",
    governance: GOVERNANCE.general,
    editionNote: "The cantilever tip deflection delta = F L^3/(3 E I) with I = pi d^4/64 for a round bar, the default E = 30e6 psi (steel) / ~90e6 (solid carbide), and the practical L/d overhang limits (~4:1 steel, ~6:1 to 8:1 carbide, higher with heavy-metal or damped bars). This returns the static cantilever deflection and the L/d chatter-risk ratio - it models the tool as a uniform solid round cantilever under a tip point load (a stepped or hollow bar changes I; a real cut also has a dynamic/regenerative-chatter component this static estimate does not capture), uses the entered cutting force, and is an estimate, not a stability-lobe analysis. A shop aid; the tool and setup govern.",
    assumptions: [
      { name: "Cantilever model", value: "delta = F L^3/(3 E I), I = pi d^4/64, uniform solid round bar under a tip load", source: "mechanics of materials" },
      { name: "L^3 dominance", value: "the overhang dominates via the cube law - halving the stickout cuts the deflection to one-eighth", source: "cantilever geometry" },
      { name: "L/d limits", value: "~4:1 steel, 6-8:1 carbide; a static estimate, not a stability-lobe analysis", source: "machining practice" },
    ],
  },
  "ballnose-scallop-height": {
    formula: "scallop mode: h = R - sqrt(R^2 - (s/2)^2); stepover mode: s = 2 sqrt(R^2 - (R - h)^2); approx h ~ s^2/(8R).",
    edition: "The ballnose scallop (cusp) height geometry and its inverse, with the small-scallop approximation, as compiled in the CAM and mold-machining references, by name.",
    freeAccess: "The ballnose scallop-height geometry is a public CAM/milling result in the standard machining references.",
    governance: GOVERNANCE.general,
    editionNote: "The ballnose scallop height h = R - sqrt(R^2 - (s/2)^2) and its inverse s = 2 sqrt(R^2 - (R - h)^2), with the small-scallop approximation h ~ s^2/(8R), as compiled in the CAM / mold-machining references. This returns the theoretical scallop between parallel passes on a flat surface - it is the geometric cusp (a sloped surface changes the effective stepover, and tool deflection and runout add to the real finish), assumes a true ballnose radius, and does not cover the cusp along the feed direction (that is the feed/turning-surface-finish geometry) or convert to Ra. A shop aid; the actual finish depends on the tool, deflection, and surface slope.",
    assumptions: [
      { name: "Scallop geometry", value: "h = R - sqrt(R^2 - (s/2)^2) between parallel passes of a ballnose radius R", source: "CAM geometry" },
      { name: "s^2 scaling", value: "near the bottom h ~ s^2/(8R), so doubling the stepover quadruples the scallop", source: "scallop approximation" },
      { name: "Flat, geometric", value: "theoretical cusp on a flat surface; slope, deflection, and runout change the real finish", source: "scope of this tile" },
    ],
  },
  "differential-leveling": {
    formula: "HI_i = elev_(i-1) + BS_i; elev_i = HI_i - FS_i; final_elev = bm + sum(BS) - sum(FS); misclosure = final_elev - known_close.",
    edition: "The height-of-instrument differential-leveling reduction and the loop-misclosure check, as compiled in the standard surveying references (Ghilani/Wolf, Elementary Surveying), by name.",
    freeAccess: "The HI leveling method and the loop-misclosure check are public surveying results; FM 5-233 (Construction Surveying) is a public-domain US Government reference.",
    governance: GOVERNANCE.general,
    editionNote: "The height-of-instrument method HI = elevation + BS, elevation = HI - FS, the elevation change sum(BS) - sum(FS), and the loop misclosure = computed closing elevation - known closing elevation, as compiled in the standard surveying references. This returns the carried elevations and the loop misclosure - it applies the arithmetic HI reduction, does not distribute the misclosure back through the turning points (a proportional adjustment is a follow-on), assumes rod readings already corrected for any rod/collimation error, and does not set an allowable-misclosure standard (0.05 sqrt(miles) or the project spec governs). A computational aid; the project survey control and specifications govern.",
    assumptions: [
      { name: "HI method", value: "HI = elev + BS, elev = HI - FS; elevation change = sum(BS) - sum(FS)", source: "Ghilani/Wolf Elementary Surveying" },
      { name: "Misclosure", value: "computed closing elevation minus the known closing elevation on a loop", source: "leveling practice" },
      { name: "No adjustment", value: "the misclosure is not distributed back through the turning points here", source: "scope of this tile" },
    ],
  },
  "stadia-distance": {
    formula: "H = K s cos^2(theta); V = K s cos(theta) sin(theta) = (K s/2) sin(2 theta); elevation = station_elev + HI + V - rod_center. (K = 100)",
    edition: "The stadia-tacheometry distance and elevation reduction with the standard interval factor K = 100, as compiled in the standard surveying references, by name.",
    freeAccess: "The stadia-reduction formulas are public surveying results in any elementary-surveying reference.",
    governance: GOVERNANCE.general,
    editionNote: "The stadia horizontal distance H = K s cos^2(theta), the vertical distance V = K s cos(theta) sin(theta) = (K s/2) sin(2 theta), the elevation = HI + V - rod-center, and the standard interval factor K = 100 (stadia constant C ~ 0 for internal-focusing instruments). This returns the reduced horizontal distance, vertical distance, and elevation from a stadia reading - it assumes an internal-focusing instrument (C = 0; add C cos theta / C for an external-focusing stadia constant), takes the vertical angle from the horizontal, and does not correct for earth curvature/refraction over long sights or for a rod not held plumb. A computational aid; the instrument's stadia constants and the field procedure govern.",
    assumptions: [
      { name: "Horizontal distance", value: "H = K s cos^2(theta) with K = 100 for an internal-focusing instrument", source: "stadia tacheometry" },
      { name: "Vertical distance", value: "V = (K s/2) sin(2 theta); elevation = HI + V - rod center", source: "stadia tacheometry" },
      { name: "Internal focusing", value: "stadia constant C ~ 0; external-focusing instruments add a C term", source: "instrument convention" },
    ],
  },
  "taping-corrections": {
    formula: "Ct = alpha (T - T0) L; Ch = -h^2/(2L); Cp = (P - P0) L/(A E); Cs = -w^2 L^3/(24 P^2); corrected = L + Ct + Ch + Cp + Cs. (alpha = 6.45e-6 /degF)",
    edition: "The four steel-tape distance corrections (temperature, slope, tension, sag) added to the measured length, as compiled in the standard surveying references (Ghilani/Wolf), by name.",
    freeAccess: "The taping-correction formulas and the steel thermal coefficient are public surveying results.",
    governance: GOVERNANCE.general,
    editionNote: "The temperature Ct = alpha (T - T0) L (alpha = 6.45e-6 /degF for steel), slope Ch = -h^2/(2L), tension Cp = (P - P0) L/(A E), and sag Cs = -w^2 L^3/(24 P^2) corrections, added to the measured length. This returns the corrected horizontal distance for a steel tape - the slope correction uses the approximate -h^2/(2L) (exact sqrt(L^2 - h^2) for steep grades), the sag term applies only to an unsupported span (zero when the tape is fully supported), and it does not cover the tape's own standardization/index error (a separate calibration constant). A computational aid; the tape's calibration and the field procedure govern.",
    assumptions: [
      { name: "Temperature", value: "Ct = alpha (T - T0) L; a warm tape expands and reads short (positive correction)", source: "surveying references" },
      { name: "Slope", value: "Ch = -h^2/(2L), the approximate reduction to horizontal (exact sqrt(L^2 - h^2) for steep grades)", source: "surveying references" },
      { name: "Tension and sag", value: "Cp = (P - P0) L/(A E); Cs = -w^2 L^3/(24 P^2) for an unsupported span", source: "surveying references" },
    ],
  },
  "building-ua": {
    formula: "cond = sum(A_i / R_i); UA_inf = 1.08 x CFM; UA = cond + UA_inf; design_load = UA x dT.",
    edition: "The whole-building heat-loss-coefficient roll-up UA = sum(A/R) + 1.08 x CFM with the design load Q = UA x dT, as compiled in the ASHRAE Fundamentals and RESNET energy-audit references, by name.",
    freeAccess: "The UA roll-up and the design-load relation are public building-science results in the ASHRAE Fundamentals and RESNET references.",
    governance: GOVERNANCE.general,
    editionNote: "The heat-loss coefficient UA = sum(A_i/R_i) + 1.08 x CFM (Btu/h per degF), the infiltration conductance from the sensible-air constant 1.08 = 60 x 0.075 x 0.24, the design load Q = UA x dT, and the ASHRAE Fundamentals / RESNET energy-audit basis. This returns the whole-building sensible heat-loss coefficient - it sums the entered assemblies and a single infiltration airflow (convert ACH50 to natural infiltration via an LBL/N-factor first, or enter the natural cfm), uses clear-field assembly R-values (thermal bridging is captured only to the extent each R_i already accounts for it), and does not add the latent, ground-coupling, or solar terms. An energy-audit aid, not a stamped Manual J; the ACCA Manual J / RESNET analysis governs.",
    assumptions: [
      { name: "Conduction", value: "sum of each assembly's area over its clear-field R-value", source: "building science" },
      { name: "Infiltration", value: "1.08 x CFM sensible conductance; enter the natural infiltration cfm", source: "ASHRAE Fundamentals" },
      { name: "Design load", value: "Q = UA x dT at the design temperature difference; sensible only", source: "ASHRAE Fundamentals" },
    ],
  },
  "degree-day-energy": {
    formula: "Q = 24 x HDD x UA; fuel = Q/eff; units = fuel / {therm 1e5, oil 138,500, kWh 3,412}; cost = units x price.",
    edition: "The degree-day annual-heating-energy method Q = 24 x HDD x UA (base-65 degF) with the fuel and cost conversions, as compiled in the ASHRAE degree-day / RESNET references, by name.",
    freeAccess: "The degree-day method and the fuel-energy conversions are public building-science results.",
    governance: GOVERNANCE.general,
    editionNote: "The degree-day annual energy Q = 24 x HDD x UA, the base-65 degF heating degree-day convention, the fuel = Q/efficiency, the unit conversions (1 therm = 100,000 Btu, 1 gal fuel oil ~ 138,500 Btu, 1 kWh = 3,412 Btu), and the ASHRAE degree-day / RESNET basis. This returns a degree-day annual-energy and cost estimate - it uses the base-65 degF steady-state degree-day method (a modified/variable-base method with the building's actual balance point is more accurate, and it ignores internal and solar gains that lower the true balance point), takes the UA and local HDD as entered, and does not add cooling, latent, or domestic-hot-water energy. An estimate, not a utility-bill-calibrated model; actual consumption depends on occupancy, weather, and gains.",
    assumptions: [
      { name: "Degree-day energy", value: "Q = 24 x HDD x UA at base-65 degF heating degree-days", source: "ASHRAE degree-day method" },
      { name: "Fuel and cost", value: "fuel = Q/efficiency, then unit-converted and priced", source: "energy-audit practice" },
      { name: "Steady-state", value: "ignores internal and solar gains that lower the true balance point", source: "degree-day limitation" },
    ],
  },
  "duct-heat-gain": {
    formula: "U = 1/R_duct; Q = U A dT (Btu/h); dT_air = Q / (1.08 x CFM).",
    edition: "The conductive duct heat-gain/loss relation from the ASHRAE Handbook - Fundamentals duct-design method, by name.",
    freeAccess: "The Q = U A dT conduction relation and the 1.08 sensible-air constant are standard ASHRAE / duct-design values. The ductwork design and ambient conditions govern.",
    governance: GOVERNANCE.general,
    editionNote: "The conductive duct heat gain/loss Q = U A dT with U = 1/R_duct and dT the ambient-minus-in-duct temperature (positive = the duct gains heat), and the resulting supply-air temperature change dT_air = Q / (1.08 x CFM). Doubling the duct R halves the loss (a linear return), and halving the airflow doubles the per-cfm temperature swing. This returns the steady-state conductive heat and air-temperature change: it uses a single mean dT and the R-value only, and does not model air leakage, radiant gain, or latent transfer. A design aid; the ductwork design governs.",
    assumptions: [
      { name: "Conduction", value: "Q = U A dT, U = 1/R_duct, mean dT across the run", source: "ASHRAE Fundamentals / duct design" },
      { name: "Air-temp change", value: "dT_air = Q / (1.08 x CFM), the sensible-air constant", source: "ASHRAE" },
      { name: "No leakage/latent", value: "conduction only; no air leakage, radiant gain, or latent transfer", source: "scope of this tile" },
    ],
  },
  "grille-face-velocity": {
    formula: "A_free = A_gross x ratio; V_face = CFM / A_free; A_gross_req = CFM / (V_target x ratio).",
    edition: "The grille/register free-area face-velocity relation from ASHRAE / SMACNA air-distribution practice, by name.",
    freeAccess: "Face velocity = airflow / free area is a standard air-distribution relation; the free-area ratio and throw/NC data come from the manufacturer's published grille catalog. The manufacturer's selection data govern.",
    governance: GOVERNANCE.general,
    editionNote: "The grille/register face velocity V_face = CFM / (gross area x free-area ratio) and the sizing inverse A_gross_req = CFM / (target velocity x ratio). Supply grilles run about 400-700 fpm and returns slower (quieter), which is why a return is larger than a supply for the same airflow. This returns the velocity or the required gross size: it uses the entered free-area ratio (a default 0.75), and does not compute the throw, drop, or noise criterion (NC) - those come from the manufacturer's published grille data. A design aid; the manufacturer's selection data govern.",
    assumptions: [
      { name: "Free-area velocity", value: "V_face = CFM / (A_gross x ratio); A_gross_req = CFM / (V_target x ratio)", source: "ASHRAE / SMACNA" },
      { name: "Velocity bands", value: "supply ~400-700 fpm; returns slower for quiet", source: "air-distribution practice" },
      { name: "No throw/NC", value: "throw, drop, and noise come from the manufacturer's catalog, not this tile", source: "scope of this tile" },
    ],
  },
  "air-density-correction": {
    formula: "alt = (1 - 6.73e-6 elev)^5.258; temp = 530/(460 + T_F); DF = alt x temp; SCFM = ACFM x DF; const = 1.08 x DF; sp = rated_sp x DF.",
    edition: "The air density correction for altitude and temperature from the ASHRAE Handbook - Fundamentals, by name.",
    freeAccess: "The barometric altitude factor and the absolute-temperature density ratio are standard ASHRAE air-property relations. The fan curve and equipment ratings at the actual condition govern.",
    governance: GOVERNANCE.general,
    editionNote: "The air density factor DF vs standard air (0.075 lb/ft^3 at 70 F sea level): the altitude factor (1 - 6.73e-6 x elev)^5.258 and the temperature factor 530/(460 + T_F), multiplied. Thinner air carries less mass per cfm, so SCFM = ACFM x DF, the 1.08 sensible constant scales to 1.08 x DF, and a sea-level-rated fan delivers rated_sp x DF of static. This returns the density factor and the corrected quantities: it assumes dry air and a standard atmosphere, and the delivered performance still must be read from the equipment's own fan curve and ratings at the actual condition. A correction factor; the appliance ratings govern.",
    assumptions: [
      { name: "Density factor", value: "DF = (1 - 6.73e-6 elev)^5.258 x 530/(460 + T_F)", source: "ASHRAE Fundamentals" },
      { name: "Corrections", value: "SCFM = ACFM x DF, sensible constant 1.08 x DF, fan static rated x DF", source: "ASHRAE" },
      { name: "Dry standard air", value: "dry air, standard atmosphere; verify against the equipment's fan curve", source: "scope of this tile" },
    ],
  },
  "wall-condensation-gradient": {
    formula: "R_total = R_inside + R_outside; T_plane = T_in - (R_inside/R_total)(T_in - T_out); T_dew = Magnus(T_in, RH); margin = T_plane - T_dew (<= 0 condensing).",
    edition: "The R-proportional through-wall temperature gradient and the Magnus dew-point comparison for a condensation-plane screen, standard building-science results, by name.",
    freeAccess: "The R-proportional gradient and the Magnus dew-point approximation are public building-science results.",
    governance: GOVERNANCE.general,
    editionNote: "The interface temperature T_plane = T_in - (R_inside/R_total)(T_in - T_out), the Magnus dew-point approximation for the indoor air, and the condensation criterion T_plane <= T_dew. This returns the condensation-plane temperature and its margin to the dew point - it is a one-dimensional steady-state thermal gradient (no thermal bridging, air movement, or vapor-diffusion/transient moisture accumulation, which a Glaser or hygrothermal model adds), uses the interior air's dew point (moderated by any vapor retarder), and is a screen. A building-science aid, not a substitute for a hygrothermal (WUFI-type) analysis; the assembly's vapor control and a full moisture analysis govern.",
    assumptions: [
      { name: "Temperature gradient", value: "T_plane = T_in - (R_inside/R_total)(T_in - T_out), 1-D steady state", source: "building science" },
      { name: "Dew point", value: "Magnus approximation of the indoor air's dew point", source: "psychrometrics" },
      { name: "Screen only", value: "no vapor diffusion or transient moisture; a Glaser/WUFI model is more complete", source: "scope of this tile" },
    ],
  },
  "reynolds-number-pipe": {
    formula: "Re = V (D/12) / nu; regime = Re < 2,300 laminar, <= 4,000 transitional, else turbulent.",
    edition: "The Reynolds number Re = V D / nu (= rho V D / mu) and the standard pipe-flow transition bands, with a 60 degF water kinematic viscosity of about 1.21e-5 ft^2/s, a standard fluid-mechanics result, by name.",
    freeAccess: "The Reynolds-number definition and the pipe-flow transition bands are public results in any fluid-mechanics reference.",
    governance: GOVERNANCE.general,
    editionNote: "The Reynolds number Re = V D / nu (= rho V D / mu), the pipe-flow transition bands (laminar below ~2,300, turbulent above ~4,000, transitional between), and a 60 degF water kinematic viscosity of about 1.21e-5 ft^2/s (1.13 centistokes). This returns the Reynolds number and regime for full pipe flow - it uses the entered kinematic viscosity (temperature- and fluid-dependent; provide the value for the fluid and temperature at hand), assumes a circular full pipe, and does not itself compute the friction factor or head loss. An engineering aid; the fluid property data at the operating condition govern.",
    assumptions: [
      { name: "Reynolds number", value: "Re = V D / nu, velocity times diameter over kinematic viscosity", source: "fluid mechanics" },
      { name: "Regime bands", value: "laminar below ~2,300, transitional ~2,300 to 4,000, turbulent above ~4,000", source: "pipe-flow convention" },
      { name: "Viscosity", value: "entered per fluid and temperature; ~1.21e-5 ft^2/s for 60 degF water", source: "fluid property tables" },
    ],
  },
  "hydronic-gpm-deltat": {
    formula: "Q_btuh = (unit == tons) ? load x 12,000 : load; GPM = Q_btuh / (factor x dT); chilled-water shortcut GPM = 24 tons/dT (water).",
    edition: "The water-side sensible-heat transport Q = 500 x GPM x dT and its rearrangement to the design flow, with the chilled-water 24 tons/dT shortcut and the glycol-lowered factor, a standard hydronic relation, by name.",
    freeAccess: "The water-side heat-transport equation and its 500 factor are public hydronic-design results.",
    governance: GOVERNANCE.general,
    editionNote: "The hydronic flow GPM = Q / (500 dT) from Q = 500 GPM dT (500 = 8.33 lb/gal x 60 min/h x 1.0 Btu/lb-degF for water), the chilled-water form GPM = 24 tons/dT (12,000/500 = 24), and the note that a propylene-glycol mix lowers the 500 factor (about 485 at 30% PG) via its density and specific heat. This returns the design system flow for pure water at the sea-level factor - it uses 500 (adjust for glycol or a different fluid via the fluid factor), assumes the full load is carried by the entered delta-T (no bypass or primary/secondary decoupling), and does not size the pump head, the pipe, or the coil. A design aid, not a substitute for the mechanical engineer of record's design.",
    assumptions: [
      { name: "Heat transport", value: "GPM = Q / (500 dT) for water; 500 = 8.33 x 60 x 1.0", source: "water-side sensible heat" },
      { name: "Chilled-water shortcut", value: "GPM = 24 tons/dT (12,000/500 = 24)", source: "hydronic design practice" },
      { name: "Fluid factor", value: "about 485 at 30% propylene glycol; adjust for a non-water fluid", source: "glycol property data" },
    ],
  },
  "pump-specific-speed": {
    formula: "Ns = N sqrt(Q) / H^(3/4) (N rpm, Q gpm at BEP, H ft per stage); class = radial < 2,000, mixed <= 4,500, else axial.",
    edition: "The US pump specific speed Ns = N sqrt(Q) / H^(3/4) and the customary impeller-type bands, as compiled in the Hydraulic Institute and pump-handbook references, by name.",
    freeAccess: "The specific-speed definition and the impeller-type bands are public results in the standard pump references.",
    governance: GOVERNANCE.general,
    editionNote: "The US specific speed Ns = N sqrt(Q) / H^(3/4) (rpm, gpm, ft/stage, at the best-efficiency point), and the customary impeller-type bands (radial below ~2,000, mixed ~2,000 to 4,500, axial above ~4,500) as compiled in the Hydraulic Institute and pump-handbook references. This returns the US-unit specific speed and the indicative impeller class - it uses the flow and head at the best-efficiency point per stage (divide total head by the number of stages), is the customary dimensional US form (not the dimensionless or metric nq), and does not compute the suction specific speed Nss (a separate NPSH-margin index) or select a specific pump. An engineering aid; the pump manufacturer's curves govern.",
    assumptions: [
      { name: "Specific speed", value: "Ns = N sqrt(Q) / H^(3/4) at BEP, per stage (US dimensional form)", source: "Hydraulic Institute" },
      { name: "Impeller bands", value: "radial below ~2,000, mixed flow ~2,000 to 4,500, axial above ~4,500", source: "pump-handbook convention" },
      { name: "Per stage", value: "divide total head by the number of stages before applying", source: "pump design practice" },
    ],
  },
  "time-of-concentration": {
    formula: "tc_min = 0.0078 L^0.77 S^(-0.385) (tc minutes, L feet, S ft/ft); tc_hr = tc_min / 60.",
    edition: "The Kirpich (1940) time-of-concentration equation tc = 0.0078 L^0.77 S^(-0.385), as compiled in the USDA TR-55 and NRCS drainage references, by name.",
    freeAccess: "TR-55 (Urban Hydrology for Small Watersheds) is a free USDA NRCS publication; the Kirpich equation is public.",
    governance: GOVERNANCE.general,
    editionNote: "The Kirpich (1940) time of concentration tc = 0.0078 L^0.77 S^(-0.385) (tc minutes, L feet, S ft/ft), as compiled in the TR-55 and NRCS drainage references. Kirpich was calibrated on small rural channelized watersheds, and overland/sheet flow on a paved surface is often taken at about 0.4x the Kirpich value. This returns a single-segment Kirpich estimate - it is not the TR-55 three-segment (sheet + shallow concentrated + channel) travel-time sum, does not apply the paved/overland adjustment factor automatically, and is an estimate for setting the design storm duration, not a routed hydrograph. A design aid, not a substitute for a licensed civil engineer's drainage report; the engineer of record and the local drainage manual govern.",
    assumptions: [
      { name: "Kirpich equation", value: "tc = 0.0078 L^0.77 S^(-0.385) on the longest flow path, single segment", source: "Kirpich (1940) / TR-55" },
      { name: "Calibration", value: "small rural channelized watersheds; a paved surface is often taken at about 0.4x", source: "NRCS drainage guidance" },
      { name: "Use", value: "sets the design storm duration read off the local IDF curve, not a routed hydrograph", source: "rational-method practice" },
    ],
  },
  "orifice-flow": {
    formula: "A = pi/4 (d/12)^2; Q_cfs = Cd A sqrt(2 g h) (g = 32.2 ft/s^2); Q_gpm = 448.831 Q_cfs.",
    edition: "The orifice discharge equation Q = Cd A sqrt(2 g h) with g = 32.2 ft/s^2 and the sharp-edged discharge coefficient (~0.6), a standard hydraulics result, by name.",
    freeAccess: "The orifice equation is a public closed-form hydraulics result; the discharge coefficients are in the standard references.",
    governance: GOVERNANCE.general,
    editionNote: "The orifice discharge Q = Cd A sqrt(2 g h) with g = 32.2 ft/s^2, Cd about 0.6 for a sharp-edged orifice (~0.8 short tube, ~0.98 rounded), and the head measured to the orifice centroid. This returns the free/submerged orifice discharge for a small orifice under a steady head - it assumes the orifice is small relative to the head (uniform velocity across it), uses the entered Cd, and does not integrate the falling head of a draining tank (the time-to-drain is a follow-on) or account for a partially submerged or gated outlet. A design aid, not a substitute for a licensed engineer's drainage design; the engineer of record governs.",
    assumptions: [
      { name: "Discharge", value: "Q = Cd A sqrt(2 g h) at the head to the orifice centroid", source: "orifice hydraulics" },
      { name: "Coefficient", value: "Cd about 0.6 sharp-edged (0.8 short tube, 0.98 rounded), entered", source: "standard hydraulics tables" },
      { name: "Steady head", value: "small orifice under a steady head; the falling-head drain time is separate", source: "scope of this tile" },
    ],
  },
  "channel-froude-number": {
    formula: "V = Q/(b y); Fr = V/sqrt(g y) (g = 32.2, D = y rectangular); regime by Fr vs 1; q = Q/b; yc = (q^2/g)^(1/3).",
    edition: "The open-channel Froude-number regime classification Fr = V/sqrt(g D) and the rectangular critical depth yc = (q^2/g)^(1/3), as compiled in Chow's Open-Channel Hydraulics, by name.",
    freeAccess: "The Froude-number classification and the rectangular critical-depth relation are public results in the standard open-channel-hydraulics references.",
    governance: GOVERNANCE.general,
    editionNote: "The Froude number Fr = V/sqrt(g D) (g = 32.2 ft/s^2, D = A/T the hydraulic depth, equal to y for a wide/rectangular section), the subcritical/critical/supercritical regimes at Fr <> 1, and the rectangular critical depth yc = (q^2/g)^(1/3) with q = Q/b, as compiled in Chow's open-channel-hydraulics reference. This returns the regime and rectangular critical depth for a prismatic rectangular channel - it uses D = y (rectangular), does not compute the normal depth (that is Manning), the hydraulic-jump conjugate depth, or a trapezoidal/irregular section's critical depth. A design aid, not a substitute for a licensed engineer's hydraulic design; the engineer of record governs.",
    assumptions: [
      { name: "Froude number", value: "Fr = V/sqrt(g y) for a rectangular section; Fr < 1 subcritical, > 1 supercritical", source: "Chow open-channel hydraulics" },
      { name: "Critical depth", value: "yc = (q^2/g)^(1/3) with q = Q/b; flow is subcritical when y > yc", source: "Chow open-channel hydraulics" },
      { name: "Scope", value: "prismatic rectangular channel; normal depth (Manning) and the hydraulic jump are separate", source: "scope of this tile" },
    ],
  },
  "rc-slab-min-thickness": {
    formula: "denom = {simply:20, one-end:24, both-ends:28, cantilever:10}; base = 12 l / denom; kfy = (fy == 60,000) ? 1 : 0.4 + fy/100,000; klw = (wc >= 145) ? 1 : max(1.65 - 0.005 wc, 1.09); hmin = base kfy klw.",
    edition: "The ACI 318-19 Table 7.3.1.1 (one-way slabs) and Table 9.3.1.1 (beams) minimum thickness for deflection control, with the (0.4 + fy/100,000) non-Grade-60 modifier and the lightweight-concrete factor, by name.",
    freeAccess: "ACI 318 is readable free through the ACI online reading room at concrete.org; the minimum-thickness tables are in the published code.",
    governance: GOVERNANCE.general,
    editionNote: "The ACI 318-19 Table 7.3.1.1 (one-way slabs) and 9.3.1.1 (beams) minimum thickness l/20 (simply supported), l/24 (one end continuous), l/28 (both continuous), l/10 (cantilever), the (0.4 + fy/100,000) modifier for fy other than 60,000 psi, and the 1.65 - 0.005 wc lightweight factor (>= 1.09). This returns the deflection-control minimum thickness that waives an explicit deflection calculation - it applies to normalweight (unless wc is set) members not supporting or attached to partitions or construction likely to be damaged by large deflections, uses the clear span, and is not the strength (flexure/shear) design or the actual deflection of a thinner member. A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Base thickness", value: "l/20, l/24, l/28, or l/10 by support condition, on the clear span", source: "ACI 318-19 Table 7.3.1.1 / 9.3.1.1" },
      { name: "Grade modifier", value: "(0.4 + fy/100,000) for fy other than 60,000 psi", source: "ACI 318-19 Table footnote" },
      { name: "Scope", value: "members not supporting partitions likely to be damaged by deflection; not a strength design", source: "ACI 318-19 7.3.1.1" },
    ],
  },
  "rc-doubly-reinforced": {
    formula: "a = (As - A's) fy / (0.85 f'c b); c = a/beta1; eps's = 0.003 (c - d')/c; eps_t = 0.003 (d - c)/c; Mn = (As - A's) fy (d - a/2) + A's fy (d - d'); phi Mn (phi = 0.90 tension-controlled).",
    edition: "The ACI 318-19 doubly-reinforced rectangular-beam flexural capacity with the compression-steel yield check and the tension-controlled strength-reduction factor, by name.",
    freeAccess: "ACI 318 is readable free through the ACI online reading room at concrete.org; the flexural provisions are in the published code.",
    governance: GOVERNANCE.general,
    editionNote: "The ACI 318-19 doubly-reinforced rectangular-beam capacity a = (As - A's) fy / (0.85 f'c b), Mn = (As - A's) fy (d - a/2) + A's fy (d - d'), the compression-steel yield check epsilon's = 0.003 (c - d')/c >= fy/Es, and the tension-controlled phi = 0.90 at epsilon_t >= 0.005. This assumes both steel layers yield (flagged when the compression steel does not, where a rigorous solution would iterate with f's = Es epsilon's <= fy), covers a rectangular section (no T-beam flange), and does not check minimum steel, bar spacing, or development. A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Two couples", value: "the singly-reinforced concrete couple plus the compression-steel-to-tension-steel couple A's fy (d - d')", source: "ACI 318-19 22.2" },
      { name: "Both yield", value: "both steel layers are assumed at fy; the compression-steel strain is checked and flagged", source: "ACI 318-19 22.2.1.1" },
      { name: "Tension-controlled", value: "phi = 0.90 confirmed at epsilon_t >= 0.005 (transition below)", source: "ACI 318-19 21.2.2" },
    ],
  },
  "rc-shear-friction": {
    formula: "mu = {monolithic:1.4, roughened:1.0, unroughened:0.6, steel:0.7} x lambda; Vn0 = mu Avf fy; cap = min(0.2 f'c, 480 + 0.08 f'c, 1600) Ac (normalweight mono/roughened); Vn = min(Vn0, cap); phi Vn = 0.75 Vn.",
    edition: "The ACI 318-19 22.9 shear-friction strength Vn = mu Avf fy, with the interface friction coefficients and the maximum-transfer caps, by name.",
    freeAccess: "ACI 318 is readable free through the ACI online reading room at concrete.org; the 22.9 shear-friction provisions are in the published code.",
    governance: GOVERNANCE.general,
    editionNote: "The ACI 318-19 22.9 shear-friction strength Vn = mu Avf fy, the mu values (1.4 lambda monolithic, 1.0 lambda against roughened hardened concrete, 0.6 lambda unroughened, 0.7 lambda against as-rolled steel), the maximum Vn = min(0.2 f'c, (480 + 0.08 f'c), 1600) Ac for a normalweight monolithic or roughened interface, and phi = 0.75. This returns the shear transferred across a single well-defined plane by friction in the perpendicular (no permanent net tension) case (a net tension needs added reinforcement Avf = Vu/(phi fy mu) + An), takes the reduced caps for lightweight or other interface conditions as a follow-on, and does not check the anchorage/development of the crossing bars or the concrete bracket/corbel bearing. A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Friction transfer", value: "Vn = mu Avf fy on the reinforcement crossing the plane", source: "ACI 318-19 22.9.4.2" },
      { name: "Interface coefficient", value: "mu = 1.4/1.0/0.6/0.7 x lambda by monolithic / roughened / unroughened / steel", source: "ACI 318-19 Table 22.9.4.2" },
      { name: "Maximum transfer", value: "capped by the concrete interface min(0.2 f'c, 480 + 0.08 f'c, 1600) Ac", source: "ACI 318-19 Table 22.9.4.4" },
    ],
  },
  "rc-column-axial": {
    formula: "Ag = b x h; rho_g = Ast / Ag (flagged outside 0.01..0.08); Po = 0.85 f'c (Ag - Ast) + fy Ast; phi Pn,max = 0.80 x 0.65 x Po.",
    edition: "The ACI 318-19 22.4.2 nominal axial strength of a non-prestressed compression member and the 22.4.2.1 tied-column maximum (0.80 phi Po, phi = 0.65 compression-controlled tied), with the 10.6.1 longitudinal-reinforcement ratio limits, by name.",
    freeAccess: "ACI 318 is readable free through the ACI online reading room at concrete.org; the 22.4 axial provisions and 10.6.1 limits are in the published code.",
    governance: GOVERNANCE.general,
    editionNote: "The ACI 318-19 22.4.2 Po = 0.85 f'c (Ag - Ast) + fy Ast, the 22.4.2.1 tied-column cap phi Pn,max = 0.80 phi Po with phi = 0.65, and the 10.6.1 1% to 8% longitudinal steel ratio. This returns the concentric (pure-axial) design capacity of a short tied column - it does not include moment interaction (the P-M diagram), slenderness or second-order effects (short columns only), the spiral-column 0.85 / phi = 0.75 variant, or the tie detailing. A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Nominal strength", value: "Po = 0.85 f'c on the net concrete plus fy on the longitudinal steel", source: "ACI 318-19 22.4.2.2" },
      { name: "Tied cap", value: "phi Pn,max = 0.80 phi Po (phi = 0.65) for the accidental eccentricity a concentric load never truly avoids", source: "ACI 318-19 22.4.2.1 / 21.2" },
      { name: "Steel ratio", value: "longitudinal rho_g flagged against the 1% minimum and 8% maximum", source: "ACI 318-19 10.6.1.1" },
    ],
  },
  "rc-punching-shear": {
    formula: "bo = 2(c1 + d) + 2(c2 + d); beta = max(c1,c2)/min(c1,c2); vc = min(4, 2 + 4/beta, 2 + alpha_s d/bo) x lambda sqrt(f'c); phi Vc = 0.75 vc bo d. (alpha_s = 40/30/20 interior/edge/corner)",
    edition: "The ACI 318-19 Table 22.6.5.2 two-way (punching) shear stress (least of the three terms) on the 22.6.4.1 critical section at d/2 from the column face, with alpha_s = 40/30/20 and phi = 0.75, by name.",
    freeAccess: "ACI 318 is readable free through the ACI online reading room at concrete.org; Table 22.6.5.2 and the 22.6.4.1 critical-section definition are in the published code.",
    governance: GOVERNANCE.general,
    editionNote: "The ACI 318-19 Table 22.6.5.2 two-way shear stress as the least of 4 lambda sqrt(f'c), (2 + 4/beta) lambda sqrt(f'c), and (2 + alpha_s d/bo) lambda sqrt(f'c), the d/2 critical perimeter, alpha_s = 40/30/20 for an interior/edge/corner column, and phi = 0.75. This returns the concrete two-way shear capacity on the d/2 critical section for a rectangular column - it assumes shear without unbalanced-moment transfer (no gamma_v eccentric-shear amplification), no shear reinforcement or shear-cap/drop panel, and a rectangular column with the full perimeter available. A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Critical section", value: "the perimeter bo at d/2 from the column faces; capacity phi vc bo d", source: "ACI 318-19 22.6.4.1" },
      { name: "Three-term least", value: "4, 2 + 4/beta, and 2 + alpha_s d/bo, each x lambda sqrt(f'c); the least governs", source: "ACI 318-19 Table 22.6.5.2" },
      { name: "Position constant", value: "alpha_s = 40 interior, 30 edge, 20 corner", source: "ACI 318-19 22.6.5.3" },
    ],
  },
  "rc-hook-development": {
    formula: "psi_c = f'c/15,000 + 0.6 (f'c < 6,000 psi, else 1.0); ldh = (fy psi_e psi_r psi_o psi_c / (55 lambda sqrt(f'c))) db^1.5; ldh = max(ldh, 8 db, 6 in).",
    edition: "The ACI 318-19 Eq. 25.4.3.1a hooked-bar tension development length with the 25.4.3.2 modification factors and the max(8 db, 6 in) minimum, by name.",
    freeAccess: "ACI 318 is readable free through the ACI online reading room at concrete.org; Eq. 25.4.3.1a and the 25.4.3.2 factor table are in the published code.",
    governance: GOVERNANCE.general,
    editionNote: "The ACI 318-19 Eq. 25.4.3.1a ldh = (fy psi_e psi_r psi_o psi_c / (55 lambda sqrt(f'c))) db^1.5, the 25.4.3.2 factors (psi_e 1.0/1.2/1.3 for coating, psi_r confining reinforcement, psi_o side cover/location, psi_c = f'c/15,000 + 0.6 for f'c below 6,000 psi), and the max(8 db, 6 in) minimum. This returns the tension development length of a standard 90 or 180 degree hooked deformed bar - it applies the modification factors as entered (defaulting to the base 1.0 values), assumes normalweight concrete unless lambda is set, and does not cover headed bars (25.4.4), compression development, or the hook geometry and bend-diameter detailing. A design aid, not a substitute for the structural engineer of record's stamped detailing.",
    assumptions: [
      { name: "Hook equation", value: "ldh scales with db^1.5 - not linearly - through Eq. 25.4.3.1a", source: "ACI 318-19 25.4.3.1" },
      { name: "Modification factors", value: "psi_e epoxy, psi_r confinement, psi_o location/cover, psi_c strength (f'c/15,000 + 0.6 under 6,000 psi)", source: "ACI 318-19 25.4.3.2" },
      { name: "Floor", value: "never less than 8 bar diameters nor 6 in", source: "ACI 318-19 25.4.3.1(b)/(c)" },
    ],
  },
  "steel-beam-ltb": {
    formula: "Mp = Fy Zx; Lp = 1.76 ry sqrt(E/Fy); Lr per AISC Eq. F2-6 (c = 1); Lb <= Lp: Mn = Mp; Lp < Lb <= Lr: Mn = Cb[Mp - (Mp - 0.7 Fy Sx)(Lb - Lp)/(Lr - Lp)] <= Mp; Lb > Lr: Fcr = Cb pi^2 E/(Lb/rts)^2 sqrt(1 + 0.078 Jc/(Sx ho)(Lb/rts)^2), Mn = Fcr Sx <= Mp. ASD = Mn/1.67; LRFD = 0.90 Mn. (E = 29,000 ksi)",
    edition: "The AISC 360-22 Section F2 lateral-torsional buckling provisions for a doubly-symmetric compact I-shape bending about its strong axis (Lp, the Eq. F2-6 Lr, the linear inelastic branch, and the Eq. F2-4 elastic critical stress with c = 1), by name; E = 29,000 ksi and the Omega_b = 1.67 / phi_b = 0.90 factors are named constants.",
    freeAccess: "AISC 360 is free to read at aisc.org (Specification for Structural Steel Buildings); the shape properties are in the AISC Steel Construction Manual tables.",
    governance: GOVERNANCE.general,
    editionNote: "The AISC 360-22 Section F2 limits Lp = 1.76 ry sqrt(E/Fy) and Lr (Eq. F2-6, computed with c = 1), the inelastic Mn = Cb[Mp - (Mp - 0.7 Fy Sx)(Lb - Lp)/(Lr - Lp)] <= Mp, and the elastic Fcr = Cb pi^2 E/(Lb/rts)^2 sqrt(1 + 0.078 (Jc/(Sx ho))(Lb/rts)^2), with E = 29,000 ksi. This covers doubly-symmetric compact I-shapes bending about the strong axis (the F2 case) - it does not cover noncompact or slender flanges/webs (F3-F5) or channels and singly-symmetric shapes, and it assumes the entered Cb matches the moment diagram (1.0 is conservative). A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Bracing limits", value: "Lp = 1.76 ry sqrt(E/Fy); Lr from the Eq. F2-6 closed form with c = 1 for a doubly-symmetric shape", source: "AISC 360-22 F2.2" },
      { name: "Three zones", value: "full Mp below Lp, linear interpolation to 0.7 Fy Sx at Lr, elastic Fcr Sx beyond, all capped at Mp and scaled by Cb", source: "AISC 360-22 Eq. F2-1..F2-4" },
      { name: "Scope", value: "compact doubly-symmetric I-shapes about the strong axis; section properties from the AISC Manual", source: "AISC 360-22 F2 user note" },
    ],
  },
  "steel-block-shear": {
    formula: "Lgv = end + (n - 1) s; Agv = Lgv t; Anv = (Lgv - (n - 0.5) dh) t; Ant = (edge - 0.5 dh) t; Rn = min(0.6 Fu Anv + Ubs Fu Ant, 0.6 Fy Agv + Ubs Fu Ant); ASD = Rn/2.00; LRFD = 0.75 Rn.",
    edition: "The AISC 360-22 Section J4.3 block-shear rupture strength (shear rupture plus tension rupture, capped by shear yielding plus tension rupture, Ubs = 1.0 for uniform tension) with the standard-hole net-area deductions, by name; Omega = 2.00 / phi = 0.75 are named factors.",
    freeAccess: "AISC 360 is free to read at aisc.org (Specification for Structural Steel Buildings); the J4.3 provision and the hole-deduction convention are in the published specification.",
    governance: GOVERNANCE.general,
    editionNote: "The AISC 360-22 Section J4.3 block-shear strength Rn = 0.6 Fu Anv + Ubs Fu Ant capped by 0.6 Fy Agv + Ubs Fu Ant, with Ubs = 1.0 for uniform tension and phi = 0.75 / Omega = 2.00, and the net-area deduction of one hole diameter per bolt on the shear plane (the last hole counted as a half on the shear tear) and a half hole on the tension plane. This covers a single tension-plane, single shear-line block (one bolt row) - it assumes standard holes at the bolt diameter + 1/8 in unless entered, does not chain multiple rows or a re-entrant coped-beam geometry (enter the governing block by hand), and does not check the bolt shear/bearing or the net-section tension member (separate tiles). A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Two paths", value: "net-shear + net-tension rupture, capped by gross-shear yielding + net-tension rupture; the lesser governs", source: "AISC 360-22 Eq. J4-5" },
      { name: "Hole deduction", value: "(n - 0.5) holes off the shear path, a half hole off the tension path, standard holes at bolt + 1/8 in", source: "AISC 360-22 B4.3b / J4.3" },
      { name: "Ubs", value: "1.0 for uniform tension stress (single row); 0.5 for the nonuniform multi-row case", source: "AISC 360-22 J4.3 commentary" },
    ],
  },
  "steel-tension-member": {
    formula: "An = Ag - nh dh t; U = U_override or 1 - xbar/L (capped at 1.0); Ae = U An; Pn_yield = Fy Ag (ASD /1.67, LRFD x0.90); Pn_rupture = Fu Ae (ASD /2.00, LRFD x0.75); capacity = min of the two limit states.",
    edition: "The AISC 360-22 Chapter D tension-member provisions -- D2 yielding on the gross section and rupture on the effective net area, with the D3 shear-lag factor U = 1 - xbar/L (Table D3.1 Case 2) and the net-area hole deduction -- by name; the paired resistance/safety factors are named constants.",
    freeAccess: "AISC 360 is free to read at aisc.org (Specification for Structural Steel Buildings); Table D3.1 and the Chapter D provisions are in the published specification.",
    governance: GOVERNANCE.general,
    editionNote: "The AISC 360-22 D2 gross yielding Pn = Fy Ag (phi = 0.90 / Omega = 1.67), D3 net rupture Pn = Fu Ae with Ae = U An (phi = 0.75 / Omega = 2.00), the shear-lag factor U = 1 - xbar/L (Table D3.1 Case 2), and the net area An = Ag - nh dh t. This covers the axial-tension yield and rupture limit states - it uses the entered or 1 - xbar/L shear-lag factor (not the tabulated element-specific cases), assumes standard holes in a single transverse line (no staggered s^2/4g chain), and does not check block shear, the bolt/weld connection, or L/r slenderness serviceability (separate tiles and guidance). A design aid, not a substitute for the structural engineer of record's stamped design.",
    assumptions: [
      { name: "Two limit states", value: "gross-section yielding (Fy Ag) and effective-net-section rupture (Fu U An); the lower factored capacity governs", source: "AISC 360-22 D2" },
      { name: "Shear lag", value: "U = 1 - xbar/L for a member connected through only some elements (Case 2); entered U overrides; capped at 1.0", source: "AISC 360-22 Table D3.1" },
      { name: "Net area", value: "Ag minus nh holes at the entered diameter and thickness, one transverse line, no stagger", source: "AISC 360-22 B4.3 / D3" },
    ],
  },
  "erv-sensible-recovery": {
    formula: "dT_F = t_ra_F - t_oa_F; t_leave_F = t_oa_F + eps_s x dT_F; Q_s_btuh = 1.08 x cfm x eps_s x dT_F; Q_noerv_btuh = 1.08 x cfm x dT_F; Q_resid_btuh = Q_noerv_btuh - Q_s_btuh.",
    edition: "The ASHRAE Standard 84 / AHRI Standard 1060 sensible-effectiveness definition (eps_s = (T_leaving - T_oa) / (T_ra - T_oa)) and the recovered sensible load Q_s = 1.08 x CFM x eps_s x (T_ra - T_oa), by name; the sea-level sensible constant 1.08 = 60 x 0.075 x 0.24 is a named constant.",
    freeAccess: "The effectiveness definition and the sensible-heat relation are public; AHRI 1060 certified ratings are free in the AHRI directory at ahridirectory.org.",
    governance: GOVERNANCE.general,
    editionNote: "The ASHRAE Standard 84 / AHRI Standard 1060 sensible-effectiveness definition eps_s = (T_leaving - T_oa) / (T_ra - T_oa) and the recovered sensible load Q_s = 1.08 x CFM x eps_s x (T_ra - T_oa) with the sea-level sensible constant 1.08 = 60 x 0.075 x 0.24. This returns the sensible recovery only - it assumes balanced (equal supply and exhaust) airflow, uses the manufacturer's rated effectiveness at the AHRI test condition rather than the part-load or frosting-derated value, and excludes latent (total-enthalpy) recovery, the exhaust-fan and defrost energy, and the pressure-drop penalty; equal outdoor and return temperatures recover nothing (a zero, reported, not an error). A design aid, not a substitute for the manufacturer's certified performance data.",
    assumptions: [
      { name: "Effectiveness", value: "eps_s = (T_leaving - T_oa) / (T_ra - T_oa), the rated sensible effectiveness at balanced flow", source: "ASHRAE 84 / AHRI 1060" },
      { name: "Recovered load", value: "Q_s = 1.08 x CFM x eps_s x dT with the sea-level sensible constant 1.08", source: "ASHRAE Fundamentals" },
      { name: "Sensible only", value: "no latent (enthalpy) recovery, frosting/defrost derate, or fan and pressure-drop penalty", source: "scope of this tile" },
    ],
  },
  "mua-tempering-load": {
    formula: "dT_F = t_target_F - t_oa_F; Q_s_btuh = 1.08 x cfm x dT_F; Q_l_btuh = 0.68 x cfm x (w_oa_gr - w_target_gr); Q_t_btuh = Q_s_btuh + Q_l_btuh; input_btuh = Q_s_btuh / eta.",
    edition: "The ASHRAE Fundamentals sensible (Q_s = 1.08 x CFM x dT), latent (Q_l = 0.68 x CFM x dW in gr/lb), and total psychrometric load equations and the IMC 508 makeup-air-equals-exhaust requirement, by name; the sea-level constants 1.08, 0.68, and 4.5 are named constants.",
    freeAccess: "The psychrometric load equations and their sea-level constants are public; the IMC makeup-air requirement is readable free at codes.iccsafe.org.",
    governance: GOVERNANCE.general,
    editionNote: "The ASHRAE Fundamentals sensible Q_s = 1.08 x CFM x dT, latent Q_l = 0.68 x CFM x dW (gr/lb), and total Q_t = 4.5 x CFM x dh equations with the sea-level constants 1.08 = 60 x 0.075 x 0.24, 0.68 = 60 x 0.075 x (1076/1.0)/7000, and 4.5 = 60 x 0.075, and the IMC 508 makeup-air-equals-exhaust requirement. This returns the design tempering load at the stated supply target - it uses sea-level air density (no altitude derate), assumes the makeup CFM equals the exhaust and is delivered at the target temperature (a neutral, not a heating, supply unless the target is set above space temperature), and excludes duct and cabinet losses, the fan heat, and the exhaust-hood capture efficiency; the latent term is zero when the humidity ratios are omitted (a heating-only MUA). A design aid, not a substitute for the mechanical engineer's stamped design.",
    assumptions: [
      { name: "Sensible load", value: "Q_s = 1.08 x CFM x (T_target - T_oa) at sea-level air density", source: "ASHRAE Fundamentals" },
      { name: "Latent load", value: "optional Q_l = 0.68 x CFM x dW with the humidity ratios in grains per pound", source: "ASHRAE Fundamentals" },
      { name: "Makeup requirement", value: "makeup air approximately equal to the exhaust; the burner input is the sensible load over the thermal efficiency", source: "IMC 508" },
    ],
  },
  "dcv-co2-ventilation": {
    formula: "dC_frac = (co2_set_ppm - co2_oa_ppm) / 1e6; Q_person_cfm = gen_cfm / dC_frac; Q_total_cfm = Q_person_cfm x n; co2_check_ppm = co2_oa_ppm + (gen_cfm / Q_person_cfm) x 1e6.",
    edition: "The steady-state single-zone CO2 mass balance (C_in = C_oa + N / Q, solved for the per-person outdoor airflow Q = N / (C_set - C_oa)) with the ASHRAE 62.1 note that CO2 indicates occupant-generated bioeffluents and a common sedentary generation rate of about 0.0106 cfm per person, by name.",
    freeAccess: "The single-zone mass balance is a public closed-form relation; ASHRAE 62.1 is readable free at ashrae.org.",
    governance: GOVERNANCE.general,
    editionNote: "The steady-state single-zone CO2 mass balance C_in = C_oa + N / Q, solved for the per-person outdoor airflow Q = N / (C_set - C_oa), with the ASHRAE 62.1 note that CO2 is an indicator of occupant-generated bioeffluents and a common sedentary generation rate of about 0.0106 cfm per person. This returns the equilibrium (fully mixed, steady-state) airflow - it is the airflow that eventually holds the setpoint, not the transient buildup or decay time (which depends on the room volume and air-change rate), assumes a single fully mixed zone at one occupancy, uses a fixed metabolic generation rate, and treats CO2 as an occupancy indicator rather than the ventilation design basis (the ASHRAE 62.1 Ventilation Rate Procedure governs the minimum outdoor air). A design and commissioning aid, not a substitute for the mechanical engineer's ventilation design.",
    assumptions: [
      { name: "Mass balance", value: "C_in = C_oa + N / Q at steady state in one fully mixed zone; Q = N / (C_set - C_oa)", source: "single-zone mass balance" },
      { name: "Generation rate", value: "about 0.0106 cfm CO2 per sedentary person (editable for activity level)", source: "ASHRAE 62.1 guidance" },
      { name: "Indicator only", value: "CO2 indicates occupancy; the Ventilation Rate Procedure governs the minimum outdoor air", source: "ASHRAE 62.1" },
    ],
  },
  "rain-load-ponding": {
    formula: "rain_load_psf = 5.2 x (static_head_in + hydraulic_head_in); design_flow_gpm = (roof_area > 0 && rainfall > 0) ? 0.0104 x roof_area_ft2 x rainfall_in_hr : null.",
    edition: "ASCE 7 Ch. 8 rain load (R = 5.2 x (ds + dh)) and the IPC roof-drainage design flow (Q = 0.0104 x A x i), by name; the 5.2 psf/in (62.4 pcf / 12) and 0.0104 gpm/(ft^2 in/hr) are named constants.",
    freeAccess: "The rain-load relation is in the published ASCE 7 Ch. 8; the roof-drainage design flow is the IPC relation; the constants are public. The arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "ASCE 7 Ch. 8 gives the rain load R = 5.2 x (ds + dh), the static head ds to the secondary (overflow) inlet plus the hydraulic head dh above it at design flow; the IPC roof-drainage design flow is Q = 0.0104 x A x i. The hydraulic head dh comes from the secondary drain or scupper's flow capacity at the design flow (a manufacturer or weir relation this tile takes as an input, not a bundled chart); the design rainfall is the 100-year hourly intensity for the site; a roof too flexible to shed the water must also pass the ASCE 7 §8.4 ponding-instability check. A load and flow aid, not a stamped roof-drainage design.",
    assumptions: [
      { name: "Rain load", value: "R = 5.2 psf per inch x (static head ds to the secondary inlet + hydraulic head dh above it at design flow)", source: "ASCE 7 Ch. 8" },
      { name: "Design flow", value: "optional Q = 0.0104 x tributary area x design rainfall (100-year hourly intensity) sizes the secondary drainage", source: "IPC" },
      { name: "Ponding", value: "a flat or near-flat roof must also pass the ASCE 7 §8.4 ponding-instability check", source: "ASCE 7 §8.4" },
    ],
  },
  "asce7-load-combinations": {
    formula: "combos = [D; D+L; D+S; D+0.75L+0.75S; D+0.6W; D+0.75L+0.75(0.6W)+0.75S; 0.6D+0.6W]; governing_gravity = max(combos); controlling_case = min(combos); net_uplift = controlling_case < 0 ? -controlling_case : 0.",
    edition: "ASCE 7 §2.4.1 basic ASD load combinations, by name; the combination coefficients are the standard's values.",
    freeAccess: "The basic ASD load combinations are stated in ASCE 7 §2.4.1; the arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "The ASCE 7 §2.4.1 basic ASD load combinations: D; D+L; D+(Lr or S or R); D+0.75L+0.75(Lr or S or R); D+0.6W; D+0.75L+0.75(0.6W)+0.75(Lr or S or R); 0.6D+0.6W. This is the basic ASD set (the seismic E combinations and the LRFD strength set are a separate selection); the roof load entered as S stands in for the governing of roof-live / snow / rain; the dead load in the 0.6D combinations is the reliably-present dead only. Wind is signed (positive downward, negative uplift). A load-combination aid, not a member design.",
    assumptions: [
      { name: "Governing gravity", value: "the largest of the seven combinations is the downward demand that sizes the member", source: "ASCE 7 §2.4.1" },
      { name: "Net uplift", value: "when 0.6D + 0.6W (or another case) goes below zero, the magnitude is the uplift the connection must resist", source: "ASCE 7 §2.4.1" },
      { name: "Signed wind", value: "wind is entered signed: positive downward (pressure), negative upward (uplift)", source: "first principles" },
    ],
  },
  "seismic-base-shear": {
    formula: "cs_basic = sds / (R / Ie); cs_cap = sd1 / (period_s x (R / Ie)); cs_min = max(0.044 x sds x Ie, 0.01); cs = max(cs_min, min(cs_basic, cs_cap)); base_shear = cs x weight.",
    edition: "ASCE 7 §12.8 equivalent lateral force (Cs = SDS / (R / Ie), the cap Cs <= SD1 / (T x (R / Ie)) for T <= TL, the minimum Cs >= max(0.044 x SDS x Ie, 0.01), V = Cs x W), by name.",
    freeAccess: "The equivalent-lateral-force base-shear relations are stated in ASCE 7 §12.8; the arithmetic is public. SDS / SD1 are from the USGS seismic design maps.",
    governance: GOVERNANCE.general,
    editionNote: "ASCE 7 §12.8: Cs = SDS / (R / Ie), the upper bound Cs <= SD1 / (T x (R / Ie)) for T <= TL, the minimum Cs >= max(0.044 x SDS x Ie, 0.01), and V = Cs x W. SDS and SD1 are the site's design spectral accelerations from the USGS seismic design maps (the user supplies them, not a bundled hazard map); R is the response-modification factor from ASCE 7 Table 12.2-1 for the chosen lateral system; the long-period transition TL is assumed not to govern (T <= TL); this is the equivalent-lateral-force base shear for a regular building (not a modal or response-history analysis, and not the vertical distribution to each level). A licensed engineer governs.",
    assumptions: [
      { name: "Response coefficient", value: "Cs = SDS / (R / Ie), bounded above by the period cap and below by the code minimum", source: "ASCE 7 §12.8" },
      { name: "Period cap", value: "Cs <= SD1 / (T x (R / Ie)) for T <= TL recognizes a flexible structure rides the short-period spectral peak less", source: "ASCE 7 §12.8" },
      { name: "Base shear", value: "V = Cs x seismic weight is the lateral demand that sizes the shear walls, braced frames, hold-downs, and anchorage", source: "ASCE 7 §12.8" },
    ],
  },
  "occupant-load": {
    formula: "per_space_load = ceil(area / olf); total_load = sum over spaces of per_space_load.",
    edition: "IBC 2021 §1004.5 and Table 1004.5 (occupant load = area / occupant-load factor, summed over spaces) and §1004.2 (round up to a whole person), by name.",
    freeAccess: "The occupant-load relation is stated in the published IBC §1004.5; the arithmetic is public. The occupant-load factors are the Table 1004.5 values for the actual use.",
    governance: GOVERNANCE.general,
    editionNote: "IBC 2021 §1004.5 and Table 1004.5: the occupant load is the sum over spaces of ceil(area / occupant-load factor), rounded up per §1004.2 so a fraction of a person counts as a whole person. Bundled representative factors (ft^2/occupant) are editable defaults: assembly standing 5 net, chairs-only 7 net, tables-and-chairs 15 net, business 150 gross, mercantile 60 gross, classroom 20 net, commercial kitchen 200 gross, industrial 100 gross, storage 500 gross, residential 200 gross. The factor and whether it applies to net or gross area come from the AHJ-adopted code edition and the actual use, not the tenant's label; a mezzanine or accessory use is its own line; the §1004.6 fixed-seating and §1004.7 outdoor-area rules are handled separately. A design aid, not a code-official determination.",
    assumptions: [
      { name: "Per-space load", value: "ceil(area / occupant-load factor) per §1004.2 rounds each space up to a whole person", source: "IBC 2021 §1004.5 / §1004.2" },
      { name: "Total", value: "the occupant load is the sum across spaces; the use, not the area alone, governs the factor", source: "IBC 2021 Table 1004.5" },
      { name: "Factor source", value: "the bundled factors are representative defaults; the AHJ-adopted edition and the actual use set the governing factor and its net-vs-gross basis", source: "IBC 2021 Table 1004.5" },
    ],
  },
  "egress-capacity": {
    formula: "factor = stair ? (sprinklered ? 0.2 : 0.3) : (sprinklered ? 0.15 : 0.2); exits_required = ol <= 49 ? 1 : ol <= 500 ? 2 : ol <= 1000 ? 3 : 4; total_width_in = ol x factor; per_exit_in = max(total_width_in / exits_required, min_door_in).",
    edition: "IBC 2021 §1005.3 (egress width = occupant load x capacity factor), §1006.2 / Table 1006.3.4 (exit-count thresholds), and §1010.1.1 (32 in minimum door clear width), by name.",
    freeAccess: "The egress-width and exit-count relations are stated in the published IBC §1005.3 / §1006.2 / Table 1006.3.4; the arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "IBC 2021 §1005.3 (egress width = occupant load x capacity factor), §1006.2 / Table 1006.3.4 (one exit up to 49 occupants, two to 500, three to 1,000, four beyond), and §1010.1.1 (32 in minimum door clear width). Bundled capacity factors (editable): sprinklered-with-alarm 0.2 in/occ stairways and 0.15 in/occ other; non-sprinklered 0.3 and 0.2. The 0.15 / 0.2 reduced factors require the §1005.3.1 / §1005.3.2 sprinkler and emergency-communication conditions; the width is divided among the required exits so no one exit carries more than its share; the door-leaf minimum and the §1005.7 projection rules can govern over the arithmetic width; high-hazard and some assembly occupancies have their own factors. A design aid, not a code-official determination.",
    assumptions: [
      { name: "Exit count", value: "the §1006.2 / Table 1006.3.4 thresholds (49 / 500 / 1000) set the number of separate exits, which usually controls a small space", source: "IBC 2021 §1006.2" },
      { name: "Required width", value: "occupant load x the §1005.3 capacity factor, divided among the exits", source: "IBC 2021 §1005.3" },
      { name: "Door minimum", value: "each leaf is floored at the §1010.1.1 32 in clear width; the sprinkler credit nearly halves the factor", source: "IBC 2021 §1010.1.1" },
    ],
  },
  "plumbing-fixture-count": {
    formula: "per_sex = ol x distribution; wc(sex) = ceil(min(per_sex, wc_tier) / wc_ratio) + (wc_ratio_over > 0 ? ceil(max(per_sex - wc_tier, 0) / wc_ratio_over) : 0); lav(sex) = ceil(per_sex / lav_ratio); fountains = ceil(ol / fountain_ratio); service = 1.",
    edition: "IBC 2021 §2902 and Table 2902.1 (minimum plumbing fixtures by occupancy, mirrored in IPC Table 403.1) and §2902.1.1 (round each ratio up), by name.",
    freeAccess: "The fixture-count relation is stated in the published IBC §2902 / Table 2902.1; the arithmetic is public. The ratios are the table values for the occupancy.",
    governance: GOVERNANCE.general,
    editionNote: "IBC 2021 §2902 and Table 2902.1: per sex, fixtures = ceil(occupants-per-sex / ratio), each rounded up per §2902.1.1, with a two-tier business water-closet schedule; drinking fountains and service sinks are counted on the total load. Bundled representative ratios (editable): business water closet 1:25 first-50 then 1:50 and lavatory 1:40; assembly-restaurant water closet 1:75 and lavatory 1:200; drinking fountain 1:100 business / 1:500 assembly; service sink minimum 1. The ratios, the net-vs-gross basis, the even-sex-split assumption, and any single-user / family-restroom or reduction allowances come from the AHJ-adopted code edition and the actual occupancy; employee and customer loads may be counted separately. A design aid, not a code-official determination.",
    assumptions: [
      { name: "Per sex", value: "the occupant load splits evenly between two sexes (0.5 each) unless a distribution override is supplied", source: "IBC 2021 §2902.2" },
      { name: "Round up", value: "each fixture ratio rounds up per §2902.1.1, so the 1:25 first tier undercounts on a naive per-50 read", source: "IBC 2021 §2902.1.1" },
      { name: "Ratio source", value: "the bundled ratios are representative; the occupancy class and the AHJ-adopted edition set the governing ratios", source: "IBC 2021 Table 2902.1" },
    ],
  },
  "shore-post-load": {
    formula: "slab_load = slab_in / 12 x unit_weight; design_psf = max(slab_load + form_load + live_load, 100); shore_load = design_psf x spacing_x x spacing_y; utilization = shore_load / shore_capacity.",
    edition: "ACI 347 (Guide to Formwork for Concrete), by name; the tributary-area load path is first-principles statics.",
    freeAccess: "The construction-load minimums are stated in ACI 347; the tributary-area load per shore is public statics.",
    governance: GOVERNANCE.general,
    editionNote: "ACI 347 (Guide to Formwork for Concrete): a construction live load of at least 50 psf and a combined dead-plus-live design load of not less than 100 psf (125 psf where motorized buggies run), with the load on any one shore equal to that pressure times the post's tributary area. Bundled defaults (editable): concrete unit weight 150 pcf, form dead load 10 psf, construction live load 50 psf, combined floor 100 psf. The construction live load rises to 75 psf and the floor to 125 psf where motorized carts or buggies run; the rated shore capacity is the manufacturer's allowable for the extended height and bracing (a taller or unbraced post rates far lower); reshoring and multi-level load distribution (ACI 347.2R) and the strength of the slab below are separate analyses. A design aid, not a stamped shoring plan.",
    assumptions: [
      { name: "Design pressure", value: "max(slab dead + form + construction live, 100 psf floor) per ACI 347", source: "ACI 347" },
      { name: "Load per shore", value: "design pressure x tributary area (the two shore spacings), the vertical companion to formwork-pressure", source: "first principles" },
      { name: "Rated capacity", value: "the manufacturer's allowable for the extended height and bracing governs; reshoring is a separate analysis", source: "ACI 347.2R" },
    ],
  },
  "concrete-evaporation-rate": {
    formula: "Tc = (concrete_temp_f - 32) / 1.8; Ta = (air_temp_f - 32) / 1.8; V = wind_mph x 1.609; E_metric = 5 x [(Tc + 18)^2.5 - (rh/100)(Ta + 18)^2.5](V + 4) x 1e-6; E_us = E_metric x 0.2048.",
    edition: "ACI 305 (Hot Weather Concreting) nomograph and the Menzel / NRMCA evaporation equation, by name; the F-to-C and mph-to-km/h conversions are exact.",
    freeAccess: "The evaporation-rate equation and the plastic-shrinkage threshold are published in ACI 305; the arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "ACI 305 (Hot Weather Concreting) nomograph and the Menzel / NRMCA evaporation equation E [kg/m^2/hr] = 5 x [(Tc + 18)^2.5 - (RH/100)(Ta + 18)^2.5](V + 4) x 1e-6, with Tc and Ta in C and V in km/h (converted from F and mph; 1 kg/m^2/hr = 0.2048 lb/ft^2/hr). Take plastic-shrinkage precautions above 0.2 lb/ft^2/hr (about 1.0 kg/m^2/hr); use the lower 0.1 lb/ft^2/hr caution for low-bleed mixes (low water-cement ratio, silica fume, or high-early cements). The concrete temperature, not the air, drives the vapor term; a low-bleed mix cracks below the nominal threshold; the equation estimates a rate under the day's conditions and does not by itself certify the cure (curing follows ACI 308). A field screen, not a curing specification.",
    assumptions: [
      { name: "Driving term", value: "the concrete temperature drives the vapor coming off the surface; the air term is what the air can reabsorb", source: "ACI 305 / Menzel" },
      { name: "Threshold", value: "0.2 lb/ft^2/hr is the precaution line; low-bleed mixes crack at the lower 0.1 caution", source: "ACI 305" },
      { name: "Screen only", value: "a go / no-go on precautions, not a cure certification; curing follows ACI 308", source: "ACI 308" },
    ],
  },
  "concrete-strength-gain": {
    formula: "fraction = age_days / (a + b x age_days); fc_t = fraction x fc28; target_age = (a x target_pct/100) / (1 - b x target_pct/100) when a target percent is given.",
    edition: "ACI 209R strength-development model f'c(t) = [t / (a + b t)] x f'c(28), by name; the constants are for the cement type and curing named.",
    freeAccess: "The strength-development model is published in ACI 209R; the arithmetic is public. The constants are the ACI 209 values for the cement type.",
    governance: GOVERNANCE.general,
    editionNote: "ACI 209R strength-development model: f'c(t) = [t / (a + b x t)] x f'c(28), the developed fraction expressed relative to the 28-day strength. Bundled constants (editable): Type I / II moist-cured a = 4.0, b = 0.85; steam-cured and Type III mixes take different pairs. The constants are for the cement type and curing named, and other cements or accelerators shift the curve; the model estimates the mean strength trend and is not a substitute for field-cured cylinder breaks or the maturity method (ASTM C1074); the engineer of record and the project specification set the actual strip / shore-removal / stressing strengths (commonly on the order of 75% of f'c to remove shores); cold weather slows the gain the model does not see. A scheduling estimate, not a strength acceptance.",
    assumptions: [
      { name: "Developed fraction", value: "t / (a + b t) lands near 46% at 3 days, 70% at 7, and 88% at 14 for Type I moist-cured", source: "ACI 209R" },
      { name: "Inverse solve", value: "the age to a target percent is (a x f) / (1 - b x f) for f = target/100 below the 1/b asymptote", source: "ACI 209R" },
      { name: "Estimate only", value: "the spec and cylinder breaks govern the strip; cold weather slows the real gain", source: "ASTM C1074" },
    ],
  },
  "allowable-area": {
    formula: "w_eff = min(open_width_ft, 30); frontage_if = (F/P) < 0.25 ? 0 : (F/P - 0.25) x (w_eff / 30); allowable = tabular_area + ns_area x frontage_if; pass = actual_area <= allowable.",
    edition: "IBC 2021 §506.2 (Aa = At + NS x If), §506.3.1, §506.3.2 (If = [F/P - 0.25] x W/30), and §506.3.3 (W capped at 30 ft), by name; Table 506.2 supplies the tabular areas.",
    freeAccess: "The allowable-area relation is stated in the published IBC §506.2 / §506.3; the arithmetic is public. The tabular areas are the Table 506.2 values.",
    governance: GOVERNANCE.general,
    editionNote: "IBC 2021 §506.2 (Aa = At + NS x If), §506.3.1 (the frontage must be 25% or more of the perimeter on an open space 20 ft or wider to take any increase, so If floors at 0 when F/P < 0.25), §506.3.2 (If = [F/P - 0.25] x W/30), and §506.3.3 (W is capped at 30 ft in the equation unless the §506.3.3 exception applies). The tabular areas At and NS come from Table 506.2 for the actual occupancy group and construction type in the correct sprinkler column (NS nonsprinklered, S1 single-story sprinklered, SM multistory sprinklered); a mixed-occupancy or multistory building uses the §506.2.2 / §508.4 sum-of-ratios and the §506.2.3 story multiplier rather than this single-occupancy single-story form. A feasibility aid, not a code-official determination.",
    assumptions: [
      { name: "Frontage increase", value: "If = [F/P - 0.25] x W/30, floored at 0 below a quarter of the perimeter on open space", source: "IBC 2021 §506.3" },
      { name: "Open-width cap", value: "W is capped at 30 ft in the equation absent the §506.3.3 exception", source: "IBC 2021 §506.3.3" },
      { name: "Tabular source", value: "At and NS come from Table 506.2 in the correct sprinkler column; a sprinkler system can triple the single-story area", source: "IBC 2021 Table 506.2" },
    ],
  },
  "egress-travel-distance": {
    formula: "pass_travel = travel_ft <= travel_limit_ft; pass_common = common_path_ft <= common_path_limit_ft; pass_deadend = dead_end_ft <= dead_end_limit_ft; pass = all three; margin = limit - measured for each.",
    edition: "IBC 2021 §1017 / Table 1017.2 (maximum exit-access travel distance), §1006.2.1 / Table 1006.2.1 (common path of egress travel), and §1020.5 (dead-end corridor), by name.",
    freeAccess: "The three egress-distance limits are stated in the published IBC §1017 / §1006.2.1 / §1020.5; the comparison is public arithmetic.",
    governance: GOVERNANCE.general,
    editionNote: "IBC 2021 §1017 / Table 1017.2 (maximum exit-access travel distance), §1006.2.1 / Table 1006.2.1 (common path of egress travel), and §1020.5 (dead-end corridor). Bundled limits (editable) are a sprinklered Group B floor: travel 300 ft, common path 100 ft, dead-end 50 ft. The limit for each distance depends on the occupancy group and whether the building is sprinklered per §903.3.1.1; travel distance is measured along the natural path of travel around obstructions, not in a straight line; common-path and dead-end limits tighten for higher-hazard uses and for occupant loads above the §1006.2.1 thresholds. A design aid, not a code-official determination.",
    assumptions: [
      { name: "Three checks", value: "travel distance, common path, and dead-end are checked independently; the overall pass is their conjunction", source: "IBC 2021 Chapter 10" },
      { name: "Limit source", value: "each limit depends on the occupancy and the §903.3.1.1 sprinkler status; a sprinkler system often clears the floor at once", source: "IBC 2021 Table 1017.2" },
      { name: "Measured path", value: "travel distance is measured along the natural path around obstructions, not a straight line", source: "IBC 2021 §1017" },
    ],
  },
  "exterior-opening-protection": {
    formula: "band = f(fsd_ft, protected) from Table 705.8; allowable_pct = band; allowable_area = band x wall_area (Infinity = no limit); pass = actual_opening <= allowable_area.",
    edition: "IBC 2021 Table 705.8 (maximum area of exterior wall openings) and §705.3 (measurement of the fire separation distance), by name.",
    freeAccess: "The opening-area limits are stated in the published IBC Table 705.8; the percentage comparison is public arithmetic.",
    governance: GOVERNANCE.general,
    editionNote: "IBC 2021 Table 705.8 (maximum area of exterior wall openings), keyed by fire separation distance and by protection / sprinkler status. Bundled bands (editable): under 3 ft none; 3 to under 5 ft 15% protected else none; 5 to under 10 ft 25% / 10%; 10 to under 15 ft 45% / 15%; 15 to under 20 ft 75% / 25%; 20 to under 25 ft no limit / 45%; 25 to under 30 ft no limit / 70%; 30 ft or more no limit. The fire separation distance is measured per §705.3 to the lot line, the centerline of a public way, or an imaginary line between buildings on the same lot; unprotected openings in a sprinklered building take the protected allowance per Note a to Table 705.8; the §705.8.5 vertical-separation and §705.8.6 protected-opening rules can further govern. A design aid, not a code-official determination.",
    assumptions: [
      { name: "Band lookup", value: "the allowable percentage is set by the fire separation distance band and by protection / sprinkler status", source: "IBC 2021 Table 705.8" },
      { name: "Sprinklered equals protected", value: "unprotected openings in a sprinklered building take the protected allowance per Note a", source: "IBC 2021 Table 705.8 Note a" },
      { name: "Measurement", value: "the fire separation distance is measured per §705.3 to the lot line, public-way centerline, or an assumed line between buildings", source: "IBC 2021 §705.3" },
    ],
  },
  "wood-beam-bending": {
    formula: "RB = sqrt(le x d / b^2); FbE = 1.20 x Emin' / RB^2; r = FbE/Fb*; CL = (1 + r)/1.9 - sqrt(((1 + r)/1.9)^2 - r/0.95) (clamped to 1.0); Fb' = Fb* x CL; S = b d^2 / 6; M' = Fb' x S.",
    edition: "NDS 3.3.3 beam stability factor CL and the slenderness / critical-buckling relations, by name; the reference bending value and its adjustment factors come from the NDS Supplement.",
    freeAccess: "The CL, RB, and FbE equations are stated in NDS 3.3.3, published free read-only by AWC at awc.org; the section-modulus and moment arithmetic is public statics.",
    governance: GOVERNANCE.general,
    editionNote: "The NDS beam stability factor CL with RB = sqrt(le d / b^2) (capped at 50), FbE = 1.20 Emin' / RB^2, and CL = (1 + FbE/Fb*)/1.9 - sqrt(((1 + FbE/Fb*)/1.9)^2 - (FbE/Fb*)/0.95) (NDS 3.3.3), and the effective-length le from the loading / bracing conditions of NDS Table 3.3.3. Emin' default 620,000 psi (a common visually-graded Douglas Fir-Larch reference minimum modulus). Fb* is the reference bending value already multiplied by every applicable adjustment factor except CL - the user supplies it, and the reference values and the factors CD, CM, Ct, CF, Cfu, Ci, Cr come from the NDS Supplement for the actual species, grade, and service condition; le is the effective unbraced length from NDS Table 3.3.3 (not the clear span) for the actual bracing and loading. This checks lateral-torsional buckling of a solid rectangular sawn-lumber bending member bent about its strong axis only, and does not cover the volume factor CV or curvature / interaction of glulam, biaxial bending, or combined bending-plus-axial. A design aid, not a substitute for the engineer of record.",
    assumptions: [
      { name: "Beam slenderness", value: "RB = sqrt(le d / b^2), capped at 50; geometry more slender than that is not a bending member", source: "NDS 3.3.3" },
      { name: "Fb* user-supplied", value: "Fb* is the reference bending value times every applicable factor except CL; the reference and CD/CM/Ct/CF/Cfu/Ci/Cr come from the NDS Supplement", source: "NDS Supplement" },
      { name: "Effective length", value: "le is the effective unbraced length of the compression edge from NDS Table 3.3.3, not the clear span", source: "NDS Table 3.3.3" },
    ],
  },
  "wood-beam-shear": {
    formula: "Vr = (2/3) Fv' b d; ratio = dn/d; Vr' = (2/3) Fv' b dn (dn/d)^2; fv = 3V / (2 b dn); dcr = V / Vr'.",
    edition: "NDS 3.4.2 rectangular-section shear stress and the NDS 3.4.3.2 tension-side end-notch reduction, by name; the adjusted shear value comes from the NDS Supplement.",
    freeAccess: "The fv = 3V/(2bd) stress and the notched-member rule are stated in NDS 3.4, published free read-only by AWC at awc.org; the arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "The rectangular-section shear stress fv = 3V / (2 b d) (NDS 3.4.2) and the notched-bending-member rule V' = (2/3) Fv' b dn (dn/d)^2 for a notch on the tension side at the end of a bending member (NDS 3.4.3.2). Fv' is the reference shear value already multiplied by every applicable adjustment factor - the user supplies it, and the reference Fv and the factors come from the NDS Supplement for the actual species, grade, and service condition. This is the tension-side end-notch case only, and does not cover notches on the compression side (a different rule), notches away from the support, the special provisions for sloped or bevel-cut notches, round notches, or the Cvr shear-reduction factor for members with connections in the shear zone; loads within a distance d of the support may be neglected in V per NDS 3.4.3.1, which the user applies to the input. A design aid, not a substitute for the engineer of record.",
    assumptions: [
      { name: "Notch penalty", value: "the (dn/d)^2 factor squares the depth ratio, so a tension-side notch cuts the allowable end shear far faster than the depth loss alone", source: "NDS 3.4.3.2" },
      { name: "Fv' user-supplied", value: "Fv' is the reference shear value times every applicable factor; the reference and factors come from the NDS Supplement", source: "NDS Supplement" },
      { name: "Loads near support", value: "loads within a distance d of the support may be neglected in V per NDS 3.4.3.1; the user applies that to the input", source: "NDS 3.4.3.1" },
    ],
  },
  "wood-bolt-connection": {
    formula: "Fe|| = 11,200 G; Fe_perp = 6,100 G^1.45 / sqrt(D); Hankinson blend to theta; Re = Fem/Fes; Rt = lm/ls; Ktheta = 1 + 0.25(theta/90); the six single-shear yield modes Z_Im..Z_IV of Table 12.3.1A; Z = min of the six.",
    edition: "NDS Table 12.3.1A single-shear yield-limit equations, the 12.3.3 dowel bearing strengths, and the Table 12.3.1B reduction terms, by name.",
    freeAccess: "The yield-limit equations, dowel bearing strengths, and reduction terms are published in NDS Chapter 12 (AWC, free read-only at awc.org); the arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "The single-shear yield-limit equations of NDS Table 12.3.1A (modes Im, Is, II, IIIm, IIIs, IV with coefficients k1, k2, k3), the dowel bearing strengths Fe|| = 11,200 G and Fe_perp = 6,100 G^1.45 / sqrt(D) (NDS 12.3.3) blended by the Hankinson formula, and the reduction terms Rd = (4, 3.6, 3.2) x Ktheta with Ktheta = 1 + 0.25 (theta/90) for 1/4 in <= D <= 1 in bolts (NDS Table 12.3.1B). Defaults (editable): Fyb 45,000 psi (a common bolt bending-yield strength), Gm = Gs = 0.50 (Douglas Fir-Larch / Southern Pine band), theta = 0 (load parallel to grain). This is the reference lateral design value Z of a single fastener in single shear (two members) before the adjustment factors of NDS Table 11.3.1 (CD, CM, Ct, group action Cg, geometry C_delta, end grain Ceg) and before any group / row multiplication - the user applies those; the 1/4..1 in diameter band selects the bolt reduction terms and excludes small-dowel nails / screws and the local-stress / spacing / end-and-edge-distance geometry checks. A design aid, not a substitute for the engineer of record.",
    assumptions: [
      { name: "Governing mode", value: "Z is the smallest of the six single-shear yield modes; a bolt into a thin side member usually governs in mode IIIs", source: "NDS Table 12.3.1A" },
      { name: "Reference value only", value: "Z is before the CD / CM / Ct / Cg / C_delta / Ceg adjustment factors and any group / row multiplication; the user applies those", source: "NDS Table 11.3.1" },
      { name: "Bolt band", value: "the 1/4 to 1 in diameter band selects the (4, 3.6, 3.2) bolt reduction terms and excludes small-dowel nails / screws and the geometry / spacing checks", source: "NDS Table 12.3.1B" },
    ],
  },
  "steel-beam-flexure": {
    formula: "Mp = Fy x Zx (kip-in); Mn = Mp / 12 (kip-ft); Ma = Mn / 1.67 (ASD); phi_b Mn = 0.90 Mn (LRFD); util = Mu / Ma.",
    edition: "AISC 360-22 Chapter F (F2.1) and §B3.1 / §B3.2, by name; Zx is read from the AISC Steel Construction Manual for the actual shape.",
    freeAccess: "The Mn = Fy Zx plastic-moment relation and the Omega_b / phi_b factors are stated in AISC 360, whose provisions are published; Zx comes from the AISC Manual shape tables.",
    governance: GOVERNANCE.general,
    editionNote: "AISC 360-22 Chapter F (F2.1) nominal flexural strength of a compact, laterally-braced doubly-symmetric I-shape: Mn = Mp = Fy x Zx, with the ASD allowable Mn / Omega_b (Omega_b = 1.67) and the LRFD design strength phi_b x Mn (phi_b = 0.90) per §B3.1 / §B3.2. This is the plastic-moment plateau only - it assumes the section is compact (F2 applies, not the F3 flange-local-buckling or F4 / F5 slender-web reductions) and the compression flange is continuously braced or Lb <= Lp (no lateral-torsional buckling, F2.2). Take Zx from the AISC Steel Construction Manual for the actual shape and grade (default Fy = 50 ksi, A992 / A572 Gr. 50). A design aid, not a substitute for the engineer of record.",
    assumptions: [
      { name: "Compact + braced", value: "Mn = Mp = Fy Zx is the plastic plateau; a noncompact flange or Lb > Lp reduces Mn below this (F3 / F2.2)", source: "AISC 360-22 F2" },
      { name: "Zx user-supplied", value: "the plastic section modulus is read from the AISC Manual for the actual rolled shape", source: "AISC Steel Construction Manual" },
      { name: "ASD / LRFD factors", value: "Omega_b = 1.67 (ASD) and phi_b = 0.90 (LRFD) per §B3", source: "AISC 360-22 B3" },
    ],
  },
  "steel-beam-shear": {
    formula: "Aw = d x tw; Vn = 0.6 x Fy x Aw x Cv1; Va = Vn / Omega_v; phi_v Vn (phi_v paired to Omega_v: 1.50/1.00 or 1.67/0.90); util = Vu / Va.",
    edition: "AISC 360-22 Chapter G (G2.1) and §B3.1 / §B3.2, by name; d and tw are read from the AISC Manual for the actual shape.",
    freeAccess: "The Vn = 0.6 Fy Aw Cv1 web-shear relation and the paired safety / resistance factors are stated in AISC 360; d and tw come from the AISC Manual.",
    governance: GOVERNANCE.general,
    editionNote: "AISC 360-22 Chapter G (G2.1) web shear strength of a rolled I-shape: Vn = 0.6 x Fy x Aw x Cv1 with Aw = d x tw. For rolled I-shapes with h/tw <= 2.24 sqrt(E/Fy) (about 53.9 at Fy = 50 ksi), Cv1 = 1.0 and the paired factors are Omega_v = 1.50 (ASD) / phi_v = 1.00 (LRFD) per G2.1(a); slenderer webs take Cv1 < 1.0 and the general Omega_v = 1.67 / phi_v = 0.90 per G2.1(b). The ASD allowable is Vn / Omega_v and the LRFD design strength is phi_v x Vn. Block shear at a coped or bolted end (J4.3) is a separate check. Take d and tw from the AISC Manual for the actual shape. A design aid, not a substitute for the engineer of record.",
    assumptions: [
      { name: "Rolled I-shape factor", value: "Cv1 = 1.0 and Omega_v = 1.50 / phi_v = 1.00 apply where h/tw <= 2.24 sqrt(E/Fy); slenderer webs use the general 1.67 / 0.90 pairing", source: "AISC 360-22 G2.1" },
      { name: "Web area", value: "Aw = d x tw (overall depth times web thickness) from the AISC Manual", source: "AISC 360-22 G2.1" },
      { name: "Block shear separate", value: "block shear at a coped or bolted end is a distinct limit state (J4.3), not covered here", source: "AISC 360-22 J4.3" },
    ],
  },
  "steel-column-capacity": {
    formula: "KL/r; Fe = pi^2 E / (KL/r)^2; Fcr = 0.658^(Fy/Fe) Fy if KL/r <= 4.71 sqrt(E/Fy) else 0.877 Fe; Pn = Fcr Ag; Pa = Pn / 1.67; phi_c Pn = 0.90 Pn.",
    edition: "AISC 360-22 Chapter E (E3) and §B3.1 / §B3.2, by name; r and Ag are read from the AISC Manual for the actual shape.",
    freeAccess: "The Fe / Fcr flexural-buckling relations and the Omega_c / phi_c factors are stated in AISC 360; r and Ag come from the AISC Manual shape tables.",
    governance: GOVERNANCE.general,
    editionNote: "AISC 360-22 Chapter E (E3) flexural-buckling compressive strength of a doubly-symmetric member with no slender elements: KL/r is the slenderness about the governing axis (usually the weak axis, r = ry), Fe = pi^2 E / (KL/r)^2 is the elastic buckling stress, and Fcr = (0.658^(Fy/Fe)) x Fy when KL/r <= 4.71 sqrt(E/Fy) (inelastic) else 0.877 x Fe (elastic). Pn = Fcr x Ag; the ASD allowable is Pn / Omega_c (Omega_c = 1.67) and the LRFD design strength is phi_c x Pn (phi_c = 0.90). Flexural buckling only (no torsional / flexural-torsional, no slender-element Q reduction); take K from the end conditions (or an alignment chart) and r, Ag from the AISC Manual for the actual shape. A design aid, not a substitute for the engineer of record.",
    assumptions: [
      { name: "Governing axis", value: "KL/r uses the radius of gyration about the axis that buckles first, usually ry; the smaller r governs", source: "AISC 360-22 E3" },
      { name: "Inelastic / elastic branch", value: "the transition is at KL/r = 4.71 sqrt(E/Fy) (about 113.4 at Fy = 50 ksi); below it 0.658^(Fy/Fe) Fy, above it 0.877 Fe", source: "AISC 360-22 E3" },
      { name: "Flexural buckling only", value: "no torsional / flexural-torsional buckling or slender-element (Q) reduction; K from the end conditions", source: "AISC 360-22 E3 / E4" },
    ],
  },
  "bolt-group-eccentric": {
    formula: "M = P x e; Ip = sum(x^2 + y^2) about the centroid; direct = P/n; tors_h = M ymax / Ip, tors_v = M xmax / Ip; R = sqrt(tors_h^2 + (direct + tors_v)^2).",
    edition: "The elastic (vector) method for an eccentric fastener group, the traditional conservative superposition; AISC Manual Part 7 gives the less-conservative instantaneous-center tables.",
    freeAccess: "The elastic vector superposition (direct plus torsional shear distributed by the polar moment of inertia) is public structural mechanics; the instantaneous-center coefficients are in the AISC Manual.",
    governance: GOVERNANCE.general,
    editionNote: "The elastic (vector) method for an eccentric bolt group in shear: superpose the direct shear P/n on every bolt with the torsional shear from the moment M = P x e, distributed by the group polar moment of inertia Ip = sum(x^2 + y^2) taken about the centroid, so the critical (far-corner) bolt carries a horizontal M ymax / Ip and a vertical M xmax / Ip added vectorially to the direct P/n. This is the traditional, conservative method - the instantaneous-center-of-rotation method in the AISC Manual (Part 7) gives a higher, less-conservative capacity. It returns the force on the worst bolt; compare it to the per-bolt design strength from bolt-shear-bearing (AISC J3). In-plane vertical load on a planar group only. A design aid, not a substitute for the engineer of record.",
    assumptions: [
      { name: "Elastic vector method", value: "direct shear P/n plus torsional shear M r / Ip on the critical corner bolt; conservative vs the instantaneous-center method", source: "AISC Manual Part 7" },
      { name: "Polar moment", value: "Ip = sum(x^2 + y^2) over all bolts about the group centroid (unit-area bolts)", source: "elastic mechanics" },
      { name: "Compare to per-bolt strength", value: "the resultant is the demand on the worst bolt; check it against bolt-shear-bearing (AISC J3)", source: "AISC 360-22 J3" },
    ],
  },
  "bolt-shear-bearing": {
    formula: "Rn_shear = ns x Fnv x Ab; bearing/tearout Rn = min(1.2 lc t Fu, 2.4 d t Fu) with lc = le - dh/2 (edge) or s - dh (interior); governing = min; phi Rn = 0.75 Rn; Rn/Omega = Rn/2.00.",
    edition: "AISC 360-22 §J3.6 (Table J3.2 Fnv) and §J3.10, by name; the material Fu and the bolt Ab / Fnv are standard tabulated values.",
    freeAccess: "The bolt shear-rupture and bearing / tearout relations and their phi / Omega factors are stated in AISC 360 §J3; the Fnv values are in Table J3.2.",
    governance: GOVERNANCE.general,
    editionNote: "AISC 360-22 §J3.6 bolt shear rupture Rn = nplanes x Fnv x Ab (Fnv from Table J3.2: 54 ksi A325-N, 68 ksi A325-X, 68 ksi A490-N, 84 ksi A490-X) and §J3.10 bearing / tearout at a bolt hole Rn = 1.2 lc t Fu <= 2.4 d t Fu, where lc is the clear distance in the line of force (edge bolt: le - dh/2; interior bolt: s - dh). The governing per-bolt nominal strength is the smaller of bolt shear and edge bearing / tearout; the design strength is phi x Rn (phi = 0.75) and the allowable is Rn / Omega (Omega = 2.00). Standard holes and the deformation-considered coefficients; one bolt at one hole (group action, slip-critical, and combined tension-shear are separate checks). A design aid, not a substitute for the engineer of record.",
    assumptions: [
      { name: "Two limit states", value: "the per-bolt strength is the smaller of shear rupture (Fnv Ab) and bearing / tearout (1.2 lc t Fu, capped at 2.4 d t Fu)", source: "AISC 360-22 J3.6 / J3.10" },
      { name: "Clear distance lc", value: "edge bolt lc = le - dh/2; interior bolt lc = s - dh, in the line of the force", source: "AISC 360-22 J3.10" },
      { name: "Factors", value: "phi = 0.75 (LRFD) and Omega = 2.00 (ASD); standard holes, one bolt at one hole", source: "AISC 360-22 J3" },
    ],
  },
  "column-base-plate": {
    formula: "A1_req = Pu / (0.65 x 0.85 f'c); m = (N - 0.95 d)/2; n = (B - 0.80 bf)/2; n' = sqrt(d bf)/4; l = max(m, n, n'); tp = l sqrt(2 Pu / (0.90 Fy B N)).",
    edition: "AISC Design Guide 1 §3.1 and AISC 360-22 §J8, by name; the concrete bearing uses phi_c = 0.65 with the confinement factor taken as 1.0.",
    freeAccess: "The base-plate bearing-area, cantilever, and thickness relations are published in AISC Design Guide 1 and AISC 360 §J8; the arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "AISC Design Guide 1 §3.1 and AISC 360-22 §J8 concentrically-loaded column base plate: the required concrete bearing area A1_req = Pu / (phi_c x 0.85 x f'c) with phi_c = 0.65 and the confinement factor sqrt(A2/A1) taken as 1.0 (base case); the cantilever dimensions m = (N - 0.95 d)/2, n = (B - 0.80 bf)/2, and n' = sqrt(d bf)/4 (with lambda = 1.0); and the plate thickness tp = l x sqrt(2 Pu / (0.90 Fy B N)) where l = max(m, n, n'). Concentric axial compression only (no moment / uplift); the anchor rods, the shear-transfer mechanism, and the concrete breakout / pier design are separate checks. A design aid, not a substitute for the engineer of record.",
    assumptions: [
      { name: "Bearing area", value: "A1_req = Pu / (0.65 x 0.85 f'c) with the confinement factor sqrt(A2/A1) = 1.0; a larger pier reduces the required plate", source: "AISC 360-22 J8" },
      { name: "Cantilever l", value: "l is the largest of m, n, and n' = sqrt(d bf)/4 (lambda = 1.0); the yield-line cantilever the plate must span", source: "AISC Design Guide 1 §3.1" },
      { name: "Concentric only", value: "concentric axial compression; moment / uplift, the anchor rods, and concrete breakout are separate checks", source: "AISC Design Guide 1" },
    ],
  },
  "rc-beam-flexure": {
    formula: "a = As x fy / (0.85 x f'c x b); Mn = As x fy x (d - a/2); phi Mn = 0.90 x Mn (tension-controlled); util = Mu / phi Mn.",
    edition: "ACI 318-19 (Building Code Requirements for Structural Concrete), by name: §22.2.2.4.1 (equivalent rectangular stress block), §22.2 (nominal flexural strength), §21.2.2 (phi = 0.90 tension-controlled).",
    freeAccess: "ACI 318-19 is viewable through ACI's online public-access reader; the stress-block and moment-arm arithmetic is public and printed in every reinforced-concrete text.",
    governance: GOVERNANCE.general,
    editionNote: "ACI 318-19 §22.2.2.4.1 (equivalent rectangular stress block, a = As x fy / (0.85 x f'c x b)), §22.2 (Mn = As x fy x (d - a/2)), and §21.2.2 (the strength-reduction factor phi = 0.90 for a tension-controlled section). fy defaults to 60,000 psi (Grade 60, the standard deformed-bar grade). Covers only a singly-reinforced rectangular section assumed tension-controlled - the user must confirm the net tensile strain epsilon_t is at least 0.005 (§21.2.2), and compression reinforcement, T-beam flange action, minimum steel (§9.6.1.2), and shear (see rc-beam-shear) are not checked here. Take As and d from the reinforcement schedule for the actual section. A design aid, not a substitute for a licensed engineer's design - the engineer of record's stamped design governs.",
    assumptions: [
      { name: "Section basis", value: "singly-reinforced rectangular section, tension-controlled (epsilon_t >= 0.005, phi = 0.90); confirm the strain, and use a doubly-reinforced or T-beam analysis where the section calls for it", source: "ACI 318-19 §21.2.2 / §22.2" },
      { name: "Grade 60 default", value: "fy defaults to 60,000 psi (Grade 60 deformed bar), editable for Gr 40 / Gr 80", source: "ACI 318-19" },
      { name: "Companion checks separate", value: "minimum steel (§9.6.1.2), shear (rc-beam-shear), deflection, and development (rc-development-length) are separate checks", source: "ACI 318-19" },
    ],
  },
  "rc-beam-shear": {
    formula: "Vc = 2 x lambda x sqrt(f'c) x bw x d; phi Vc = 0.75 x Vc; Vs,req = Vu/0.75 - Vc when Vu > phi Vc; s = Av x fyt x d / Vs; s_max = d/2.",
    edition: "ACI 318-19 (Building Code Requirements for Structural Concrete), by name: §22.5.5.1 (simplified Vc), §22.5.10.5.3 (vertical-stirrup Vs), §21.2.1 (phi = 0.75 shear), §9.7.6.2.2 (d/2 max spacing).",
    freeAccess: "ACI 318-19 is viewable through ACI's online public-access reader; the 2 x sqrt(f'c) x bw x d and Av x fyt x d / s arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "ACI 318-19 §22.5.5.1 (Vc = 2 x lambda x sqrt(f'c) x bw x d, the simplified concrete shear for a non-prestressed member without axial load, psi units), §22.5.10.5.3 (Vs = Av x fyt x d / s for vertical stirrups), §21.2.1 (phi = 0.75 for shear), and §9.7.6.2.2 (the d/2 maximum stirrup spacing, halved to d/4 when Vs exceeds 4 x sqrt(f'c) x bw x d). fyt defaults to 60,000 psi (Grade 60); lambda defaults to 1.0 (normalweight; 0.75 lightweight, §19.2.4). Uses the simplified Vc, not the detailed §22.5.5.1 expression with the reinforcement-ratio and size-effect terms; covers vertical stirrups on a member without significant axial load; and does not check the §22.5.1.2 upper limit Vs <= 8 x sqrt(f'c) x bw x d on the section size, the §9.6.3 minimum shear reinforcement, or deep-beam action. A design aid, not a substitute for a licensed engineer's design - the engineer of record's stamped design governs.",
    assumptions: [
      { name: "Simplified Vc", value: "the traditional 2 x lambda x sqrt(f'c) x bw x d concrete term for a member without axial load, not the detailed 318-19 expression with rho_w and size-effect terms", source: "ACI 318-19 §22.5.5.1" },
      { name: "Vertical stirrups", value: "Vs = Av x fyt x d / s assumes stirrups perpendicular to the axis; Av is the total area crossing the crack (both legs)", source: "ACI 318-19 §22.5.10.5.3" },
      { name: "Limits separate", value: "the §22.5.1.2 section upper limit, §9.6.3 minimum shear reinforcement, and the d/4 tightening when Vs is high are separate checks the detailer applies", source: "ACI 318-19" },
    ],
  },
  "rc-development-length": {
    formula: "ld = (3/40) x fy x psi_t x psi_e x psi_s x psi_g / (lambda x sqrt(f'c) x (cb + Ktr)/db) x db; (cb + Ktr)/db capped at 2.5; psi_t x psi_e capped at 1.7; ld >= 12 in.",
    edition: "ACI 318-19 (Building Code Requirements for Structural Concrete), by name: §25.4.2.3 (general tension development equation), §25.4.2.4 (confinement cap), Table 25.4.2.5 (modification factors), §25.4.2.1 (12 in minimum).",
    freeAccess: "ACI 318-19 is viewable through ACI's online public-access reader; the (3/40) x fy / (lambda sqrt(f'c)) x db arithmetic and the psi-factor table values are public.",
    governance: GOVERNANCE.general,
    editionNote: "ACI 318-19 §25.4.2.3 (the general tension development-length equation), §25.4.2.4 (the (cb + Ktr)/db confinement term, capped at 2.5), §25.4.2.5 / Table 25.4.2.5 (the modification factors: psi_t casting position 1.3 top bar / 1.0 other, psi_e coating 1.5 or 1.2 epoxy / 1.0 uncoated, psi_s size 0.8 for #6 and smaller / 1.0 for #7 and larger, psi_g grade 1.0 Gr 60 / 1.15 Gr 80 / 1.3 Gr 100, with the psi_t x psi_e product capped at 1.7), and §25.4.2.1 (the 12 in minimum). fy defaults to 60,000 psi (Grade 60, psi_g = 1.0); lambda defaults to 1.0 (normalweight; 0.75 lightweight); the confinement term defaults to 2.5 (the well-confined maximum). The psi factors are user-selected inputs, not derived here - the tool does not read cover, spacing, or transverse reinforcement to compute cb or Ktr. Straight-bar tension development only: not a standard hook (§25.4.3), a compression bar (§25.4.9), or a lap splice (§25.5, see rebar-lap-splice). A design aid, not a substitute for a licensed engineer's design - the engineer of record's detailing governs.",
    assumptions: [
      { name: "Psi factors user-selected", value: "psi_t / psi_e / psi_s / psi_g and the confinement term are entered from Table 25.4.2.5 and the actual detailing; the tool does not compute cb or Ktr from cover and stirrups", source: "ACI 318-19 Table 25.4.2.5" },
      { name: "Caps and floor", value: "(cb + Ktr)/db is capped at 2.5, psi_t x psi_e at 1.7, and ld is never less than 12 in", source: "ACI 318-19 §25.4.2.1 / .4 / .5" },
      { name: "Straight tension bars only", value: "hooked-bar (ldh, §25.4.3), headed-bar, compression (§25.4.9), and lap-splice (§25.5) lengths are separate calculations", source: "ACI 318-19 §25.4" },
    ],
  },
  "soil-bearing-capacity": {
    formula: "qu = c Nc sc + q Nq sq + 0.5 gamma B Ngamma sgamma; Nq = e^(pi tan phi) x tan^2(45 + phi/2); Nc = (Nq - 1) x cot phi (5.14 at phi = 0); Ngamma = 2 x (Nq + 1) x tan phi; q_all = qu / FS.",
    edition: "The general bearing-capacity equation with the Vesic (1973) factors and De Beer / Vesic shape factors, as compiled in Das, Principles of Foundation Engineering, and FHWA-NHI-16-009 (GEC 6, Shallow Foundations), by name.",
    freeAccess: "FHWA GEC 6 (FHWA-NHI-16-009) is a free public FHWA publication; the Vesic factor arithmetic is public and printed in every foundation-engineering text.",
    governance: GOVERNANCE.general,
    editionNote: "The general bearing-capacity equation qu = c Nc sc + q Nq sq + 0.5 gamma B Ngamma sgamma with the Vesic (1973) bearing-capacity factors Nq = e^(pi tan phi) tan^2(45 + phi/2), Nc = (Nq - 1) cot phi (the Prandtl 5.14 at phi = 0), Ngamma = 2 (Nq + 1) tan phi, and the De Beer / Vesic shape factors, as compiled in Das, Principles of Foundation Engineering, and FHWA-NHI-16-009 (GEC 6, Shallow Foundations). FS defaults to 3.0 (the customary factor of safety on gross bearing for a shallow foundation under static load); gamma defaults to 120 pcf. Returns the gross ultimate and allowable pressure for a general-shear failure of a level, concentrically loaded footing with a level ground surface and the water table at or below one footing width beneath the base - the net-bearing, groundwater, load-inclination, eccentricity, local- or punching-shear, and settlement corrections are not applied, and settlement (not this strength check) usually governs the design of a footing on sand. Take c, phi, and gamma from the geotechnical report for the actual site. A design aid, not a substitute for a geotechnical engineer's report - the geotechnical engineer of record's stamped recommendation governs.",
    assumptions: [
      { name: "General shear, level and concentric", value: "a level, concentrically loaded footing failing in general shear with level ground; eccentric / inclined loads, sloping ground, and local or punching shear are separate corrections", source: "Das / FHWA GEC 6" },
      { name: "Groundwater below the failure zone", value: "the water table is at or below one footing width beneath the base; a higher water table requires buoyant unit weights", source: "Das / FHWA GEC 6" },
      { name: "Settlement separate", value: "the allowable is a strength check only; settlement usually governs a footing on sand and is a separate analysis", source: "Das / FHWA GEC 6" },
    ],
  },
  "lateral-earth-pressure": {
    formula: "Ka = tan^2(45 - phi/2) = (1 - sin phi) / (1 + sin phi); Kp = 1/Ka; Pa = 0.5 Ka gamma H^2 at H/3, plus surcharge Ka q H at H/2; Pp = 0.5 Kp gamma H^2.",
    edition: "Rankine (1857) lateral earth pressure, as compiled in Das, Principles of Foundation Engineering, and NAVFAC DM-7.02 (Foundations and Earth Structures), by name.",
    freeAccess: "NAVFAC DM-7.02 is a free public US Navy design manual; the Rankine coefficient arithmetic is public and printed in every soil-mechanics text.",
    governance: GOVERNANCE.general,
    editionNote: "Rankine (1857) lateral earth pressure - Ka = tan^2(45 - phi/2) = (1 - sin phi)/(1 + sin phi), Kp = 1/Ka = tan^2(45 + phi/2), resultant Pa = 0.5 Ka gamma H^2 at H/3 plus a uniform-surcharge term Ka q H at H/2 - as compiled in Das, Principles of Foundation Engineering, and NAVFAC DM-7.02 (Foundations and Earth Structures). gamma defaults to 120 pcf, q to 0. The Rankine case only: a cohesionless soil (the 2c sqrt(Ka) tension-crack reduction of a cohesive backfill is not applied), a vertical wall face with no wall friction (Coulomb theory is required for an inclined or rough face and gives a lower active thrust), a dry level backfill with no water table (a submerged zone must be run with buoyant unit weight plus a separate hydrostatic pressure), and the fully-mobilized active and passive limit states (the wall must move enough to reach them). Take phi and gamma from the geotechnical report. A design aid, not a substitute for a geotechnical engineer's report - the geotechnical engineer of record's recommendation governs.",
    assumptions: [
      { name: "Rankine conditions", value: "cohesionless backfill, vertical frictionless wall face, level dry backfill; Coulomb / cohesive / submerged / sloped cases need their own analysis", source: "Rankine 1857 / Das / NAVFAC DM-7.02" },
      { name: "Limit states mobilized", value: "active and passive values require enough wall movement to mobilize them; a braced non-yielding wall sees the higher at-rest K0 = 1 - sin phi", source: "Das / NAVFAC DM-7.02" },
      { name: "Passive used cautiously", value: "the passive thrust is an upper bound needing large movement to develop; designs commonly reduce or neglect it", source: "NAVFAC DM-7.02" },
    ],
  },
  "retaining-wall-stability": {
    formula: "FS_ot = Mr / Mo; FS_sl = mu x sum(V) / Pa; e = B/2 - (Mr - Mo)/sum(V); q_max,min = (sum(V)/B) x (1 +/- 6e/B); Rankine Pa = 0.5 Ka gamma H^2 + Ka q H.",
    edition: "The standard cantilever-retaining-wall global-stability checks as compiled in Das, Principles of Foundation Engineering, and NAVFAC DM-7.02, against the IBC 1807.2.3 minimum factor of safety of 1.5 for sliding and overturning, by name.",
    freeAccess: "NAVFAC DM-7.02 is a free public US Navy design manual and the IBC is viewable through ICC's free online reader; the moment-ratio arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "The standard cantilever-retaining-wall global-stability checks - overturning FS = Mr / Mo (restoring moments of the stem, base, heel soil, and surcharge about the toe over the Rankine thrust moment), sliding FS = mu x sum(V) / Pa, and toe bearing q = (sum(V)/B)(1 +/- 6e/B) - as compiled in Das, Principles of Foundation Engineering, and NAVFAC DM-7.02, against the IBC 1807.2.3 minimum factor of safety of 1.5 for both sliding and overturning (standard practice designs overturning to 2.0). gamma_c defaults to 150 pcf (reinforced concrete); mu defaults to 0.5 (a common base-friction value; use tan of the base friction angle or the geotechnical report). A global-stability check of a level, cohesionless, dry backfill on a level base with the stem, base, and heel soil idealized as rectangles: the internal reinforced-concrete design of the stem and base is separate (see rc-beam-flexure / rc-beam-shear), passive resistance at the toe is conservatively neglected, seismic (Mononobe-Okabe) pressure and sloped or submerged backfills are not applied, and the reported gross toe pressure must be compared against the allowable bearing from soil-bearing-capacity. A design aid, not a substitute for a licensed engineer's design - the engineer of record's stamped design governs.",
    assumptions: [
      { name: "IBC 1807.2.3 targets", value: "minimum FS 1.5 against sliding and overturning (0.7 x seismic-included alternative not modeled); practice designs overturning to 2.0", source: "IBC 1807.2.3" },
      { name: "Rectangular idealization", value: "stem, base, and heel soil are rectangles; a tapered stem, a shear key, and passive toe credit are refinements the tool omits (conservative for passive)", source: "Das / NAVFAC DM-7.02" },
      { name: "Member design separate", value: "the stem and base are reinforced-concrete members with their own flexure / shear / development checks (see the ACI 318-19 tiles)", source: "ACI 318-19" },
    ],
  },
  "cmu-wall-flexure": {
    formula: "n = Es/Em (Em = 900 f'm); rho = As/(b d); k = sqrt(2 rho n + (rho n)^2) - rho n; j = 1 - k/3; Ms = As Fs j d; Mm = 0.5 Fb k j b d^2 (Fb = 0.45 f'm); Ma = min(Ms, Mm).",
    edition: "TMS 402-16 (Building Code Requirements for Masonry Structures, ACI 530 / ASCE 5) allowable-stress-design cracked transformed-section flexure, as compiled in the Masonry Designers' Guide and CMHA TEK 14-07C, by name.",
    freeAccess: "CMHA TEK 14-07C (Allowable Stress Design of Concrete Masonry) is a free public CMHA technical note; the k / j working-stress arithmetic is public and printed in every masonry-design text.",
    governance: GOVERNANCE.general,
    editionNote: "TMS 402-16 (ACI 530 / ASCE 5) allowable-stress-design cracked transformed-section flexure: n = Es/Em with Es = 29,000,000 psi and Em = 900 f'm for concrete masonry, rho = As/(b d), k = sqrt(2 rho n + (rho n)^2) - rho n, j = 1 - k/3, the steel-governed allowable moment Ms = As Fs j d and the masonry-governed Mm = 0.5 Fb k j b d^2, with Fs = 32,000 psi for Grade 60 reinforcement and Fb = 0.45 f'm, as compiled in the Masonry Designers' Guide and CMHA TEK 14-07C. Returns the allowable service-level bending moment of a singly reinforced, fully grouted masonry section by the working-stress method: the section is assumed cracked, the reinforcement developed and in tension, the axial compression negligible (a wall in near-pure flexure), and one layer of steel at the reported effective depth. The axial term and the one-third stress increase are not applied, and this is not the strength-design (LRFD) moment. Take f'm, the bar size, and the spacing from the structural drawings. A design aid, not a substitute for the engineer of record's stamped design - the structural engineer of record's stamped design governs.",
    assumptions: [
      { name: "Cracked working-stress section", value: "singly reinforced, fully grouted, cracked transformed section in near-pure flexure; the axial interaction and the slender-wall P-delta method are separate analyses", source: "TMS 402-16 / CMHA TEK 14-07C" },
      { name: "Allowable stresses", value: "Fs = 32,000 psi (Grade 60) and Fb = 0.45 f'm, with Em = 900 f'm for concrete masonry; editable for other grades and materials", source: "TMS 402-16" },
      { name: "Governing mode reported", value: "the lesser of the steel- and masonry-governed moments governs; adding steel past the balance point stops paying off once Mm < Ms", source: "Masonry Designers' Guide" },
    ],
  },
  "cmu-shear-wall": {
    formula: "Fvm = 0.5 x ((4.0 - 1.75 x M/(V dv)) x sqrt(f'm)) + 0.25 x (P/An); Fvs = 0.5 x (Av Fs dv)/(An s); Fv = Fvm + Fvs, capped at 3 sqrt(f'm) (M/(V dv) <= 0.25) grading to 2 sqrt(f'm) (>= 1.0); Va = Fv An.",
    edition: "TMS 402-16 (ACI 530 / ASCE 5) allowable-stress in-plane shear provisions, as compiled in the Masonry Designers' Guide and CMHA TEK 14-07C, by name.",
    freeAccess: "CMHA TEK notes on shear-wall allowable-stress design are free public CMHA technical notes; the Fvm / Fvs arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "TMS 402-16 (ACI 530 / ASCE 5) allowable-stress in-plane shear: Fvm = 0.5 x ((4.0 - 1.75 x M/(V dv)) x sqrt(f'm)) + 0.25 x (P/An) with the shear-span ratio taken positive and not greater than 1.0 inside the masonry term, Fvs = 0.5 x (Av Fs dv)/(An s) for horizontal shear reinforcement, the combined Fv = Fvm + Fvs, and the maximum-Fv cap of 3 sqrt(f'm) at M/(V dv) <= 0.25 grading linearly to 2 sqrt(f'm) at M/(V dv) >= 1.0, as compiled in the Masonry Designers' Guide and CMHA TEK 14-07C. Returns the allowable service-level in-plane shear of a reinforced, fully grouted masonry shear wall. P is the sustained gravity compression (a larger P raises the masonry term, so use the load combination that actually acts with the shear); M/(V dv) is the shear-span ratio the designer supplies from the wall's height and length; the special-reinforced detailing and minimum-reinforcement rules are the engineer's to satisfy separately. A design aid, not a substitute for the engineer of record's stamped lateral design - the structural engineer of record's stamped design governs.",
    assumptions: [
      { name: "Two contributions plus a cap", value: "the masonry diagonal-tension term (raised by axial compression, lowered by slenderness) plus the horizontal-steel term, with the combined stress capped on the shear-span-graded 3-to-2 sqrt(f'm) line", source: "TMS 402-16" },
      { name: "Sustained axial only", value: "P is the sustained compression acting with the shear; do not count live load that may be absent when the lateral force arrives", source: "TMS 402-16 / Masonry Designers' Guide" },
      { name: "Detailing separate", value: "special-reinforced shear-wall detailing, minimum reinforcement ratios, and the shear-friction base check are separate code requirements", source: "TMS 402-16" },
    ],
  },
  "cmu-wall-axial": {
    formula: "Pa = (0.25 f'm An + 0.65 Ast Fs) x R; R = 1 - (h/(140 r))^2 for h/r <= 99, R = (70 r / h)^2 for h/r > 99 (branches meet at h/r = 99).",
    edition: "TMS 402-16 (ACI 530 / ASCE 5) allowable-stress axial-compression provisions for reinforced masonry, as compiled in the Masonry Designers' Guide and CMHA TEK 14-07C, by name.",
    freeAccess: "CMHA TEK notes on ASD axial design are free public CMHA technical notes; the two-branch slenderness arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "TMS 402-16 (ACI 530 / ASCE 5) allowable-stress axial compression for reinforced masonry: Pa = (0.25 f'm An + 0.65 Ast Fs) x (1 - (h/(140 r))^2) for a slenderness ratio h/r <= 99, and Pa = (0.25 f'm An + 0.65 Ast Fs) x (70 r / h)^2 for h/r > 99 (the two branches meet at h/r = 99, so the curve is continuous), with Fs the allowable compressive stress in the reinforcement, as compiled in the Masonry Designers' Guide and CMHA TEK 14-07C. Returns the allowable service-level concentric axial compression of a reinforced, fully grouted masonry wall or column. The 0.65 Ast Fs reinforcement term applies where the vertical bars are laterally tied per the code's column provisions - for an untied wall the conservative practice is to drop that term (enter Ast = 0). Pure axial only: the moment interaction is separate (combine with cmu-wall-flexure through the unity check). The radius of gyration r and effective height h come from the section and the wall's actual bracing. A design aid, not a substitute for the engineer of record's stamped design - the structural engineer of record's stamped design governs.",
    assumptions: [
      { name: "Two-branch slenderness", value: "the 1 - (h/140r)^2 short/intermediate parabola and the (70r/h)^2 slender (Euler-type) branch meet continuously at h/r = 99", source: "TMS 402-16" },
      { name: "Tied bars for the steel term", value: "0.65 Ast Fs counts only laterally tied vertical reinforcement; an untied wall conservatively takes 0.25 f'm An x R alone", source: "TMS 402-16 / Masonry Designers' Guide" },
      { name: "Concentric only", value: "pure axial with no moment interaction; eccentric or combined loading runs through the unity check with the flexure tile", source: "TMS 402-16" },
    ],
  },
  "diaphragm-shear": {
    formula: "V = w L / 2; v = w L / (2 b); M = w L^2 / 8; chord T = C = M / b.",
    edition: "The AWC Special Design Provisions for Wind and Seismic (SDPWS) simple-span flexible-diaphragm deep-beam model, as compiled in the AWC/APA engineered-wood-diaphragm design guides, by name.",
    freeAccess: "AWC SDPWS is viewable free of charge through AWC's online reader; the deep-beam w L / (2 b) arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "The AWC SDPWS simple-span flexible-diaphragm model - the diaphragm as a deep horizontal beam with maximum unit shear v = w L / (2 b) at the supports and chord force T = C = M / b from the maximum moment M = w L^2 / 8 - as compiled in the AWC/APA engineered-wood-diaphragm design guides. Returns the maximum service-level unit shear and chord force of a simple-span, uniformly loaded flexible diaphragm: it assumes the diaphragm spans between two parallel resisting lines under a uniform load, is the flexible-diaphragm (tributary-area) distribution rather than a rigid-diaphragm (relative-stiffness) one, and does not add the collector / drag-strut force at intermediate lines, the diaphragm deflection, or openings. The unit shear is compared against the SDPWS nominal capacity for the chosen sheathing and nailing (with the ASD reduction or the seismic factor). A design aid, not a substitute for the engineer of record's stamped lateral design - the structural engineer of record's stamped design governs.",
    assumptions: [
      { name: "Simple-span flexible model", value: "uniform load between two parallel resisting lines with tributary-area distribution; a rigid-diaphragm relative-stiffness distribution and multi-span or cantilever diaphragms are separate analyses", source: "AWC SDPWS" },
      { name: "Collectors and openings separate", value: "drag-strut / collector forces at intermediate lines, diaphragm deflection, and openings each have their own checks", source: "AWC/APA design guides" },
      { name: "Compare to the nailing schedule", value: "the unit shear is checked against the SDPWS nominal capacity for the sheathing and nailing, with the ASD reduction or seismic factor applied", source: "AWC SDPWS Tables 4.2A-4.2D" },
    ],
  },
  "shearwall-overturning": {
    formula: "v = V / b; Mot = V h; Mr = 0.6 W (b/2); T = max((Mot - Mr) / b, 0).",
    edition: "The AWC SDPWS segmented shear-wall model with the ASCE 7 / IBC 0.6D allowable-stress overturning check, as compiled in the AWC/APA wood-frame shear-wall design guides, by name.",
    freeAccess: "AWC SDPWS is viewable free of charge through AWC's online reader; the unit-shear and overturning-couple arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "The AWC SDPWS segmented shear-wall model with the ASCE 7 / IBC allowable-stress overturning check: unit shear v = V / b, overturning moment Mot = V h resisted by 0.6 times the dead-load moment W x (b/2) per the 0.6D + 0.7E ASD load combination, net holdown tension T = (V h - 0.6 W b/2) / b, as compiled in the AWC/APA wood-frame shear-wall design guides. Returns the service-level unit shear and net holdown uplift of a single fully sheathed shear-wall segment. Uses the 0.6D resisting dead load of the ASD seismic combination (use the wind combination's factor where wind governs); W is the dead load tributary to and acting on the wall (not the whole floor); the wall is segmented (not force-transfer-around-openings or perforated). When 0.6D stabilizes the wall the uplift clamps to zero - no holdown is required for overturning, though sill anchorage and shear transfer still govern. The unit shear is compared against the SDPWS nominal capacity for the chosen sheathing and nailing; the compression-chord bearing check is separate. A design aid, not a substitute for the engineer of record's stamped lateral design - the structural engineer of record's stamped design governs.",
    assumptions: [
      { name: "0.6D ASD combination", value: "the resisting dead load is factored 0.6 per the ASD 0.6D + 0.7E combination; where wind governs, use the wind combination's factors", source: "ASCE 7 §2.4 / IBC" },
      { name: "Segmented wall", value: "a single fully sheathed segment with the holdown at its end; perforated and force-transfer-around-openings walls distribute differently", source: "AWC SDPWS §4.3" },
      { name: "Companion checks separate", value: "sill anchor-bolt shear, compression-chord bearing, and the sheathing nailing selection are separate checks", source: "AWC/APA design guides" },
    ],
  },
  "shearwall-deflection": {
    formula: "delta = 8 v h^3 / (E A b) + v h / (1000 Ga) + h da / b (unit-specific: v plf, h/b ft, E psi, A in^2, Ga kips/in, da/delta in).",
    edition: "The AWC SDPWS Equation 4.3-1 three-term shear-wall deflection (the apparent-shear-stiffness Ga linearization of the legacy four-term form), as compiled in the AWC/APA wood-frame shear-wall design guides, by name.",
    freeAccess: "AWC SDPWS is viewable free of charge through AWC's online reader; the three-term equation and the Table 4.3A/4.3B Ga values are public.",
    governance: GOVERNANCE.general,
    editionNote: "The AWC SDPWS Equation 4.3-1 three-term shear-wall deflection delta = 8 v h^3 / (E A b) + v h / (1000 Ga) + h da / b - the linearized (apparent-shear-stiffness Ga) form of the legacy four-term equation, its terms being end-post bending, combined panel-shear-and-nail-slip, and anchorage rotation - in the unit-specific convention (v in plf, h and b in ft, E in psi, A in in^2, Ga in kips/in, da and delta in inches; the equation is calibrated, so the tool does not rescale), as compiled in the AWC/APA wood-frame shear-wall design guides. Returns the top-of-wall deflection of a single segmented shear wall at the given service (ASD) unit shear. Ga is the tabulated apparent shear stiffness for the chosen sheathing and nailing (SDPWS Table 4.3A/4.3B, the seismic column); da is the total vertical anchorage elongation (holdown deformation, plate crushing, rod stretch and shrinkage) at that shear; the segmented-wall form, not the perforated or force-transfer-around-openings deflection. Compare against the ASCE 7 allowable story drift. A design aid, not a substitute for the engineer of record's stamped lateral design - the structural engineer of record's stamped design governs.",
    assumptions: [
      { name: "Unit-specific calibrated equation", value: "Eq 4.3-1 is dimensionally non-homogeneous by construction (the leading 8 folds the ft-to-in conversion); enter the documented units exactly and do not rescale", source: "AWC SDPWS Eq 4.3-1" },
      { name: "Tabulated Ga and measured da", value: "Ga comes from SDPWS Table 4.3A/4.3B for the sheathing and nailing; da is the holdown / anchorage elongation at the design shear from the manufacturer's data", source: "AWC SDPWS Tables 4.3A/4.3B" },
      { name: "Drift limit separate", value: "the computed deflection is checked against the ASCE 7 allowable story drift (amplified by Cd/I where the strength-level force is used)", source: "ASCE 7 §12.12" },
    ],
  },
  "fire-pump-curve": {
    formula: "churn_limit = 1.40 x rated_psi; overload_flow = 1.50 x rated_gpm; overload_min = 0.65 x rated_psi; churn_ok = churn <= churn_limit; overload_ok = measured >= overload_min; margins as % of rated pressure.",
    edition: "NFPA 20 (Standard for the Installation of Stationary Pumps for Fire Protection), 2022, by name; the 140% churn ceiling and the 65%-of-rated-at-150%-flow overload point are the listed centrifugal fire pump curve limits.",
    freeAccess: "NFPA 20 is viewable free of charge through NFPA's online free-access reader; the 1.40 / 1.50 / 0.65 envelope arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "NFPA 20 (Standard for the Installation of Stationary Pumps for Fire Protection), 2022: a listed centrifugal fire pump must not shut off (churn) at more than 140% of its rated total pressure (churn ceiling = 1.40 x rated pressure), and it must deliver at least 65% of rated pressure at 150% of rated flow (overload flow = 1.50 x rated flow, overload floor = 0.65 x rated pressure). The churn and 150%-flow points come from the field acceptance test with a calibrated flow-measuring device; a churn pressure that would push the system above its component rating requires a listed pressure-relief valve (NFPA 20 does not by itself waive that requirement); and the rated point and net pressure must still meet the system demand computed separately (see sprinkler-system-demand). A design and acceptance-check aid, not a stamped fire-pump submittal - a qualified fire-protection engineer and the AHJ govern.",
    assumptions: [
      { name: "Curve envelope", value: "churn <= 140% of rated pressure and >= 65% of rated pressure at 150% of rated flow, the two ends of the listed-pump acceptance curve", source: "NFPA 20 (2022)" },
      { name: "Field test points", value: "the churn and 150%-flow pressures come from the field acceptance test with a calibrated flow-measuring device; leave 0 to skip either check", source: "NFPA 20 (2022)" },
      { name: "Relief valve separate", value: "a churn pressure over the system component rating requires a listed pressure-relief valve; NFPA 20 does not by itself waive that", source: "NFPA 20 (2022)" },
    ],
  },
  "sprinkler-system-demand": {
    formula: "sprinkler_gpm = density x design_area; total_gpm = sprinkler_gpm + hose_gpm; volume_gal = total_gpm x duration_min.",
    edition: "NFPA 13 (Standard for the Installation of Sprinkler Systems), 2022, by name; the density / design-area / hose / duration levers come from the hazard classification and the density-area curves.",
    freeAccess: "NFPA 13 is viewable free of charge through NFPA's online free-access reader; the density x area + hose x duration arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "NFPA 13 (Standard for the Installation of Sprinkler Systems), 2022: sprinkler demand = density x design area, total demand = sprinkler demand + inside/outside hose-stream allowance, stored volume = total demand x duration. The hazard-class defaults are editable: Light 0.10 gpm/ft^2 over 1,500 ft^2 with 100 gpm hose for 30 min; Ordinary Group 1 0.15 / 1,500 / 250 / 60-90; Ordinary Group 2 0.20 / 1,500 / 250 / 60-90. This is the area/density (pipe-schedule-style) screening demand - a full hydraulic calculation to the most-remote area including friction and elevation yields the governing demand and is a separate analysis; the density / area / duration come from the applicable NFPA 13 density-area curve for the actual commodity and storage arrangement; storage and special occupancies (ESFR, high-piled, in-rack) use their own criteria. A design aid, not a stamped hydraulic submittal - a qualified fire-protection engineer and the AHJ govern.",
    assumptions: [
      { name: "Hazard-class levers", value: "the density, design area, hose allowance, and duration all come from the hazard classification (Light 0.10/1,500/100/30; OH1 0.15/1,500/250/60-90; OH2 0.20/1,500/250/60-90), editable defaults", source: "NFPA 13 (2022)" },
      { name: "Screening demand", value: "the area/density product is the pipe-schedule-style screening demand; the governing demand comes from a full most-remote-area hydraulic calculation with friction and elevation", source: "NFPA 13 (2022)" },
      { name: "Ordinary occupancies", value: "storage and special occupancies (ESFR, high-piled, in-rack) use their own density / area / duration criteria, not these defaults", source: "NFPA 13 (2022)" },
    ],
  },
  "sprinkler-head-layout": {
    formula: "spacing = min(max_spacing, sqrt(area_per_head)); heads_per_line = ceil(length / spacing); lines = ceil(width / spacing); total = heads_per_line x lines; achieved = room_area / total; wall_max = spacing / 2.",
    edition: "NFPA 13 (Standard for the Installation of Sprinkler Systems), 2022, by name; the protection-area and linear-spacing caps by hazard class for standard-spray upright / pendent heads.",
    freeAccess: "NFPA 13 is viewable free of charge through NFPA's online free-access reader; the min / sqrt / ceil layout arithmetic is public.",
    governance: GOVERNANCE.general,
    editionNote: "NFPA 13 (Standard for the Installation of Sprinkler Systems), 2022 protection-area and spacing caps for standard-spray upright / pendent heads: governing spacing = min(max spacing, sqrt(area per head)), heads per line = ceil(length / spacing), lines = ceil(width / spacing), total = heads per line x lines, achieved area per head = room area / total, max wall distance = spacing / 2. The hazard-class caps are editable: Light 225 ft^2 / 15 ft, Ordinary 130 ft^2 / 15 ft, Extra 100 ft^2 / 12 ft (hydraulically calculated). A rectangular-bay standard-spray estimate - obstructions, beams and the beam rule, sloped or high ceilings, small rooms, extended-coverage and residential heads, and ESFR / storage layouts each have their own spacing and clearance rules, and the minimum spacing between heads (typically 6 ft, to prevent cold-soldering) is a separate check. A takeoff aid, not a stamped sprinkler layout - a qualified fire-protection designer and the AHJ govern.",
    assumptions: [
      { name: "Hazard-class caps", value: "Light 225 ft^2 / 15 ft, Ordinary 130 ft^2 / 15 ft, Extra 100 ft^2 / 12 ft (hydraulically calculated), editable; whichever of the area or linear cap binds first governs the spacing", source: "NFPA 13 (2022)" },
      { name: "Rectangular bay", value: "a flat-ceiling rectangular-bay estimate for standard-spray heads; obstructions, the beam rule, sloped ceilings, small rooms, and EC / ESFR heads have their own rules", source: "NFPA 13 (2022)" },
      { name: "Minimum spacing separate", value: "the minimum distance between heads (typically 6 ft, preventing cold-soldering) is a separate check this tile does not perform", source: "NFPA 13 (2022)" },
    ],
  },
  "window-solar-heat-gain": {
    formula: "q_solar = area_ft2 x shgc x psf; q_cond = area_ft2 x u_factor x cltd_f; q_total = q_solar + q_cond.",
    edition: "ASHRAE / ACCA Manual J fenestration cooling load (Q_solar = A x SHGC x PSF, Q_cond = A x U x CLTD), by name; the relations are public.",
    freeAccess: "The fenestration solar and conduction cooling-load relations are public ASHRAE / ACCA Manual J equations; the SHGC and U come from the NFRC label.",
    governance: GOVERNANCE.general,
    editionNote: "The ASHRAE / ACCA Manual J fenestration cooling load: Q_solar = A x SHGC x PSF and Q_cond = A x U x CLTD. The peak solar factor (PSF / SHGF) is read from the ASHRAE/ACCA table for the window's orientation and the site latitude (a west or east wall in summer runs far higher than a north wall; the user supplies it, not a bundled chart); the SHGC and U come from the NFRC label; the CLTD for glass is the design temperature difference adjusted for the daily cycle; interior shades and overhangs reduce the solar term by a separate shade factor. One cooling-load component, not a Manual J.",
    assumptions: [
      { name: "Solar gain", value: "Q_solar = area x SHGC x peak solar factor; orientation and SHGC, not U, drive a glass cooling load", source: "ASHRAE / ACCA Manual J" },
      { name: "Conduction", value: "Q_cond = area x U x CLTD; on a west wall in summer the solar term dwarfs this by an order of magnitude", source: "ASHRAE / ACCA Manual J" },
      { name: "Component only", value: "one window line of a cooling load, not the whole Manual J", source: "first principles" },
    ],
  },
  "internal-heat-gains": {
    formula: "q_people_sensible = occupants x sens_per_person; q_people_latent = occupants x lat_per_person; q_lighting = lighting_w x 3.412 x use_factor; q_equipment = equipment_w x 3.412 x use_factor; q_sensible = q_people_sensible + q_lighting + q_equipment; q_latent = q_people_latent; q_total = q_sensible + q_latent.",
    edition: "ASHRAE / ACCA Manual J internal-gain method (occupant sensible and latent from the activity-level table, lighting and equipment at 3.412 Btu/h per watt), by name; the 3.412 is the watt-to-Btu/h conversion.",
    freeAccess: "The internal-gain relations are public ASHRAE / ACCA Manual J equations; the per-person rates come from the ASHRAE activity table.",
    governance: GOVERNANCE.general,
    editionNote: "The ASHRAE / ACCA Manual J internal-gain method: occupant sensible and latent from the activity table, lighting and equipment at 3.412 x W. The per-person sensible and latent rates come from the ASHRAE activity table (a seated office occupant is roughly 245 Btu/h sensible and 200 latent; heavier activity is far higher; the user supplies the rate); the lighting use factor accounts for the fraction actually on (and a ballast factor for the fixture type); recessed lighting vented to a return plenum delivers part of its heat to the plenum rather than the room. One cooling-load component, not a Manual J.",
    assumptions: [
      { name: "People", value: "occupant sensible and latent = count x the activity-level rate; the latent is moisture a sensible-only fix never removes", source: "ASHRAE / ACCA Manual J" },
      { name: "Lighting and equipment", value: "watts x 3.412 Btu/h per watt x the use factor actually on", source: "ASHRAE / ACCA Manual J" },
      { name: "Sensible/latent split", value: "the split sets the coil's job; dense-occupancy spaces are sized on the latent load", source: "first principles" },
    ],
  },
  "envelope-conduction-load": {
    formula: "q_cond = u_factor x area_ft2 x cltd_f.",
    edition: "ASHRAE / ACCA Manual J opaque-envelope cooling load (Q = U x A x CLTD, the CLTD being the sol-air cooling-load temperature difference), by name; the relation is public.",
    freeAccess: "The opaque-envelope conduction cooling-load relation is a public ASHRAE / ACCA Manual J equation; the U-factor is the whole-assembly value.",
    governance: GOVERNANCE.general,
    editionNote: "The ASHRAE / ACCA Manual J opaque-envelope cooling load Q = U x A x CLTD, the CLTD being the sol-air cooling-load temperature difference for the surface. The CLTD comes from the ASHRAE/ACCA table for the surface type, color, orientation, and design day (a dark, sunlit roof runs far above the air temperature difference because of solar absorptance and mass lag, while a light or shaded surface runs near it; the user supplies it, not a bundled chart); the U-factor is the whole-assembly value from assembly-r-value or the construction. One cooling-load component, not a Manual J.",
    assumptions: [
      { name: "Conduction", value: "Q = U x area x the sol-air CLTD; the sol-air CLTD, not the air temperature, conducts through a sunlit surface", source: "ASHRAE / ACCA Manual J" },
      { name: "Cool roof", value: "cutting the surface's solar absorptance drops the CLTD and the load far more than the air temperature would suggest", source: "first principles" },
      { name: "Component only", value: "one envelope line of a cooling load, not the whole Manual J", source: "first principles" },
    ],
  },
  "wood-emc": {
    formula: "EMC% = (1800/W)[Kh/(1-Kh) + (K1 K h + 2 K1 K2 K^2 h^2)/(1 + K1 K h + K1 K2 K^2 h^2)], h = RH/100, with W, K, K1, K2 temperature polynomials in degrees F (USDA FPL / Hailwood-Horrobin).",
    edition: "USDA Forest Products Laboratory Wood Handbook (Hailwood-Horrobin sorption equation) by name; the four temperature polynomials are bundled, no edition cycle.",
    freeAccess: "The sorption equation is public; the exact EMC varies by species. The IICRC S500 dry standard and the unaffected reference reading govern.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the USDA FPL Hailwood-Horrobin sorption equation and its bundled temperature polynomials do not roll; the IICRC S500 dry standard governs 'dry').",
    assumptions: [
      { name: "Sorption model", value: "the USDA FPL Hailwood-Horrobin equation with bundled W / K / K1 / K2 polynomials (T in degrees F)", source: "USDA FPL Wood Handbook" },
      { name: "Species variation", value: "the value is a generic-wood reference; the actual EMC varies by species and history", source: "USDA FPL Wood Handbook" },
      { name: "Dry standard", value: "the IICRC S500 dry standard and the dry, unaffected reference reading - not a single computed number - define 'dry'", source: "IICRC S500" },
    ],
  },
  "flood-cut-takeoff": {
    formula: "cut_line_lf = perimeter_ft; drywall_sf = perimeter_ft x (cut_height_in/12) x faces; sheets = ceil(drywall_sf / 32); insulation_sf = perimeter_ft x (cut_height_in/12) when present; baseboard_lf = perimeter_ft when present.",
    edition: "ANSI/IICRC S500 flood-cut demolition practice by name; the geometry and the 32 ft^2 standard 4x8 sheet are not edition-bound.",
    freeAccess: "The flood-cut takeoff is pure wall geometry; the standard 4x8 board is 32 ft^2. The moisture meter governs the cut line.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the wall geometry and the 32 ft^2 sheet do not roll). Cut a few inches above the highest moisture-meter reading - the meter governs the line, not a round number; the 12 / 24 / 48 in heights are common screens. ANSI/IICRC S500 names the flood-cut practice.",
    assumptions: [
      { name: "Cut line", value: "the cut height is a screen; cut a few inches above the highest moisture-meter reading, not at a round number", source: "ANSI/IICRC S500" },
      { name: "Sheet area", value: "standard 4x8 drywall = 32 ft^2 per sheet", source: "standard-sizes.js convention" },
      { name: "Scope", value: "linear and area takeoff only; the moisture map and the inspector govern how much wall comes out", source: "ANSI/IICRC S500" },
    ],
  },
  "ceiling-water-load": {
    formula: "load_psf = (avg_depth_in/12) x 62.4; weight_lb = pooled_area_ft2 x (avg_depth_in/12) x 62.4 = volume_gal x 8.34; volume_gal = pooled_area_ft2 x (avg_depth_in/12) x 7.48052; drain_first = load_psf > threshold_psf.",
    edition: "Hydrostatic load and water density (62.4 lb/ft^3, 8.34 lb/gal, 7.48052 gal/ft^3) by name; ANSI/IICRC S500 safety practice. Not edition-bound.",
    freeAccess: "Water is ~62.4 lb/ft^3, so a foot of depth is 62.4 psf and an inch is 5.2 psf. The densities are public constants.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the water densities and the hydrostatic load do not roll). The drain-first threshold is an EDITABLE screen value, NOT a code capacity - the actual fastening, span, and a structural engineer govern. This screens whether to punch-drain from a safe distance before working beneath the bulge.",
    assumptions: [
      { name: "Water density", value: "~62.4 lb/ft^3, 8.34 lb/gal, 7.48052 gal/ft^3", source: "pure-math.js convention" },
      { name: "Threshold", value: "the drain-first load (default 5 psf) is an editable, conservative screen, not a structural rating", source: "ANSI/IICRC S500 safety practice" },
      { name: "Scope", value: "a safety screen for trapped overhead water; the wet gypsum's fastening and a structural engineer govern collapse", source: "ANSI/IICRC S500" },
    ],
  },
  "dehumidifier-derate": {
    formula: "effective_pints = aham_pints_per_day x derate_factor; units_by_nameplate = ceil(demand / aham); units_by_field = ceil(demand / effective_pints); shortfall = units_by_field - units_by_nameplate.",
    edition: "ANSI/IICRC S500 caution that the AHAM rating overstates field output at low grain depression, by name; the linear derate is a working-band screen.",
    freeAccess: "The AHAM rating is taken at a high-grain-depression test condition and overstates what a unit removes as the chamber dries. The multiplication is arithmetic.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the arithmetic does not roll). The derate factor is read by the operator off the unit's published performance curve at the measured chamber GPP - the curve and psychrometric reality govern; this tile carries the multiplication and the honest count, which rises as the chamber dries (the drying plateau). ANSI/IICRC S500 names the caution.",
    assumptions: [
      { name: "Derate source", value: "the operator reads the derate factor off the unit's performance curve at the current chamber grain depression", source: "manufacturer performance curve" },
      { name: "AHAM overstates field", value: "the AHAM nameplate (high-grain-depression test) overstates field output as the chamber dries", source: "ANSI/IICRC S500" },
      { name: "Linear screen", value: "a linear derate is the working-band approximation manufacturers' curves support; not a curve fit", source: "manufacturer performance curve" },
    ],
  },
  "class-of-loss-screen": {
    formula: "top-down (first match wins): Class 4 if low-evaporation materials wet; else Class 3 if wick_height_ft > 2.0 or wall_wet_fraction >= 0.40; else Class 2 if floor_wet_fraction >= 0.40; else Class 1. Output carries the matching per-class evaporation factor (gal/ft^2).",
    edition: "ANSI/IICRC S500 Class-of-loss definitions and the 24 in (2 ft) wick threshold, by name; thresholds are deterministic where S500 leaves a judgment band.",
    freeAccess: "S500 keys the Class to affected surface area, the wick height above 24 in, and the presence of low-evaporation assemblies. The four Class definitions are public.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the Class definitions and the 24 in threshold are stable). The inspector's classification GOVERNS and a moisture map must confirm it - this is a screen that proposes a Class and states the rationale, it does not certify one. ANSI/IICRC S500 names the framework.",
    assumptions: [
      { name: "Class framework", value: "the four S500 Classes keyed to wetted surface, the 24 in wick threshold, and low-evaporation materials (hardwood / plaster / lightweight concrete / masonry -> Class 4)", source: "ANSI/IICRC S500" },
      { name: "Thresholds", value: "the 40% surface fractions are deterministic, editable screens where S500 leaves a judgment band", source: "ANSI/IICRC S500" },
      { name: "Scope", value: "a screen that proposes a Class and feeds the per-class evaporation factor; the inspector and a moisture map govern", source: "ANSI/IICRC S500" },
    ],
  },
  "desiccant-airflow-sizing": {
    formula: "lb_per_hr = required_pints_per_day x 1.043 / 24; process_cfm = lb_per_hr x 7000 / (4.5 x design_grain_depression); units_needed = ceil(process_cfm / nameplate_process_cfm). 4.5 = 60 min/hr x 0.075 lb/ft^3 standard air; 7000 grains/lb; 1.043 lb/pint.",
    edition: "Psychrometric mass balance and the desiccant process-airflow method, by name; ANSI/IICRC S500. The 4.5 / 7000 / 1.043 constants are not edition-bound.",
    freeAccess: "The same psychrometric mass balance the grains-removed tile uses, in reverse: process airflow carries the water-removal rate across the wheel at the design depression.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the mass balance and the constants do not roll). The manufacturer's performance map, reactivation exhaust ducting, and chamber conditions GOVERN the achievable grain depression - this is a sizing screen, and desiccant reactivation air must be ducted outside. ANSI/IICRC S500 names the deep-drying method.",
    assumptions: [
      { name: "Standard air", value: "4.5 lb/hr per cfm per (grains/lb/7000) = 60 min/hr x 0.075 lb/ft^3 standard air density", source: "pure-math.js convention" },
      { name: "Constants", value: "7000 grains/lb, 1.043 lb/pint water density", source: "pure-math.js convention" },
      { name: "Achievable depression", value: "the manufacturer's performance map governs the inlet->outlet grain depression; reactivation exhaust air must duct outside", source: "manufacturer performance map" },
    ],
  },
  "drying-balance": {
    formula: "balance_ppd = installed_ppd - evap_load_ppd; ratio = installed_ppd / evap_load_ppd; verdict from ratio against the target margin (default 1.2): >= margin balanced with margin, 1 to margin no margin, < 1 deficit (add margin x load - installed).",
    edition: "Balanced-drying-system principle, by name; ANSI/IICRC S500. The capacity-to-load comparison is a field-arithmetic identity, not edition-bound.",
    freeAccess: "Closes the loop between the evaporation-load and dehumidifier tiles: a balanced system keeps installed dehumidification at or above the evaporation load with margin.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the balance arithmetic does not roll). Field dehumidification capacity falls below the AHAM nameplate as grain depression drops; the restorer's daily monitoring GOVERNS equipment adjustments. ANSI/IICRC S500 names the balanced-drying principle.",
    assumptions: [
      { name: "Installed capacity", value: "use the field (achieved) capacity, not the AHAM nameplate, where known", source: "ANSI/IICRC S500" },
      { name: "Target margin", value: "a desired capacity-to-load ratio (default 1.2); the restorer tunes it to the job", source: "field practice" },
    ],
  },
  "bound-water": {
    formula: "dry_mass_lb = material_volume_ft3 x dry_density_lb_ft3; water_lb = dry_mass_lb x (mc_current_pct - mc_goal_pct) / 100; water_gal = water_lb / 8.34 lb/gal.",
    edition: "Gravimetric water-mass relation, by name; ANSI/IICRC S500. Moisture content on a dry-weight basis (consistent with wood-emc). The 8.34 lb/gal water density is not edition-bound.",
    freeAccess: "Quantifies the pounds and gallons the drying system must evaporate from wet materials, scoping equipment-days against the dry goal.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the gravimetric relation does not roll). Moisture content is dry-weight basis; dry density and material moisture vary by species and product. This is a PLANNING estimate, not a gravimetric measurement - in-situ meter readings and the restorer's judgment GOVERN. ANSI/IICRC S500 names the dry standard.",
    assumptions: [
      { name: "Dry-weight basis", value: "moisture content is percent of oven-dry weight, consistent with wood-emc", source: "ANSI/IICRC S500" },
      { name: "Water density", value: "8.34 lb/gal", source: "pure-math.js convention" },
    ],
  },
  "disinfectant-dwell": {
    formula: "Reference lookup: product class -> label-typical wet contact (dwell) time range, keep-wet rule, pre-clean rule, and the FIFRA label authority. No numeric computation beyond the lookup.",
    edition: "Antimicrobial contact-time principle, by name; ANSI/IICRC S500 and S520. Antimicrobials are EPA-registered pesticides whose label is the legal authority under FIFRA.",
    freeAccess: "States the contact time the label requires and the keep-wet / pre-clean rules that decide whether a disinfection claim is actually achieved.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the typical ranges are guidance; the specific EPA-registered product label GOVERNS the exact dwell under FIFRA). The surface must stay visibly wet for the full contact time (re-apply if it dries), and disinfection requires pre-cleaning because product cannot penetrate soil. ANSI/IICRC S500 and S520 name the remediation context.",
    assumptions: [
      { name: "Label authority", value: "the EPA-registered product label is the legal authority (FIFRA); the ranges shown are guidance", source: "EPA FIFRA / product label" },
      { name: "Keep-wet rule", value: "the surface must remain visibly wet for the full contact time", source: "ANSI/IICRC S500 / S520" },
    ],
  },
  "carpet-restore-replace": {
    formula: "Reference lookup: water category + component (carpet/cushion) + delamination -> restore-vs-replace decision with rationale. Delaminated carpet -> replace; saturated cushion -> typically remove; Category 3 -> remove and dispose. No numeric computation.",
    edition: "Carpet and cushion restore-vs-replace mapping, by name; ANSI/IICRC S500.",
    freeAccess: "Turns the water category into the most common flooring decision on a water job: dry and save, or remove.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the S500 decision matrix). The decision is a PROFESSIONAL determination case by case - age, condition, contamination, customer agreement, and the AHJ all bear on it. Delaminated carpet is replaced; cushion saturated in any category is typically removed because replacement costs less than drying; Category 3 porous flooring is generally removed and disposed. ANSI/IICRC S500 GOVERNS.",
    assumptions: [
      { name: "Case-by-case", value: "age, condition, contamination, customer agreement, and the AHJ all bear on the determination", source: "ANSI/IICRC S500" },
      { name: "Delamination", value: "delaminated carpet is replaced regardless of category", source: "ANSI/IICRC S500" },
    ],
  },
  "category-deterioration": {
    formula: "Reference lookup with threshold comparisons: origin category + elapsed wet hours + warm flag + contaminant-contact flag -> likely current category. Contaminant contact -> Category 3; Category 1 past ~48-72 h (sooner if warm) -> Category 2; otherwise origin.",
    edition: "Category-at-time-of-remediation principle, by name; ANSI/IICRC S500.",
    freeAccess: "Adds the time dimension to the water category: a clean loss left standing, warm, or in contact with contaminated materials degrades to a higher category.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the S500 principle). Category is a PROFESSIONAL determination made at the time of restoration, not by the source alone; elevated temperature and contact with contaminated materials accelerate the shift. The amplification window commonly cited is on the order of 48-72 hours under favorable conditions. When in doubt the HIGHER category is assumed - the restorer and ANSI/IICRC S500 GOVERN.",
    assumptions: [
      { name: "Amplification window", value: "commonly cited on the order of 48-72 hours under favorable conditions (sooner if warm)", source: "ANSI/IICRC S500" },
      { name: "When in doubt", value: "assume the higher category", source: "ANSI/IICRC S500" },
    ],
  },
  "hydroxyl-sizing": {
    formula: "units = ceil(structure_volume_ft3 / unit_coverage_ft3); run continuously for the anticipated days. Occupied-safe; remove the odor source and clean first.",
    edition: "Volume-and-coverage sizing, by name; ANSI/IICRC S700. The ceil(volume/coverage) count is a field-arithmetic identity, not edition-bound.",
    freeAccess: "Sizes occupied-space hydroxyl deodorization - the occupied-safe counterpart to ozone shock and thermal fogging.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the sizing arithmetic does not roll). Hydroxyl generators are SAFE for occupied spaces (unlike ozone, which requires an evacuated, sealed structure) but work more slowly, commonly running continuously for several days. Coverage ratings and run times are MANUFACTURER-specific; severe odor still requires source removal and cleaning first. The manufacturer and ANSI/IICRC S700 GOVERN.",
    assumptions: [
      { name: "Coverage rating", value: "per-unit coverage (ft^3/unit) is manufacturer-specific; the bundled value is a typical default", source: "manufacturer rating" },
      { name: "Occupied-safe", value: "hydroxyl is occupied-safe but slower than ozone; run continuously", source: "ANSI/IICRC S700" },
    ],
  },
  "cavity-drying-system": {
    formula: "bays = ceil(affected_wall_ft x 12 / stud_spacing_in); ports = bays x ports_per_bay; systems = ceil(ports / ports_per_system).",
    edition: "Bays-from-length geometry, by name; ANSI/IICRC S500. The stud-bay and system counts are field-arithmetic identities, not edition-bound.",
    freeAccess: "Sizes the injection / wall-cavity drying method - the minimally invasive alternative to a flood cut for drying enclosed assemblies in place.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the bay geometry does not roll). Port count, airflow per port, and ports per system are equipment-MANUFACTURER specific (the bundled defaults are typical, not prescriptive). Cavity air-pressure direction must respect contamination - do NOT push Category 2/3 cavity air into clean spaces. The cavity-drying decision versus a flood cut and access drilling follow ANSI/IICRC S500, which GOVERNS.",
    assumptions: [
      { name: "Manufacturer defaults", value: "ports per bay (default 1) and ports per system (default 12) are typical, not prescriptive", source: "equipment manufacturer" },
      { name: "Contamination direction", value: "do not push Category 2/3 cavity air into clean spaces", source: "ANSI/IICRC S500" },
    ],
  },
  "dry-time-projection": {
    formula: "remaining_pts = current_mc_pct - goal_mc_pct; days_to_goal = remaining_pts / daily_drop_pct (constant-rate, optimistic near goal). A non-positive daily drop reports 'not progressing' rather than dividing.",
    edition: "Linear-trend completion projection, by name; ANSI/IICRC S500. The constant-rate projection is a field-arithmetic identity, not edition-bound.",
    freeAccess: "Turns the drying-log readings into a schedule: how many days remain to the dry goal at the observed rate, and a stalled-job flag.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the linear projection does not roll). Drying is NON-LINEAR and slows as it approaches the goal, so a constant-rate projection is a planning estimate that runs OPTIMISTIC near the end. The drying-log boundary readings and the restorer's daily monitoring GOVERN the actual endpoint; the dry standard is the unaffected reference, not an absolute number. ANSI/IICRC S500 names the dry standard.",
    assumptions: [
      { name: "Constant rate", value: "the projection assumes the last 24-hour drop continues; real drying slows near the goal", source: "ANSI/IICRC S500" },
      { name: "Dry standard", value: "the goal is the unaffected reference moisture content, not an absolute number", source: "ANSI/IICRC S500" },
    ],
  },
  "equipment-heat-load": {
    formula: "sensible_btu_hr = total_equipment_watts x 3.412; required_cfm = sensible_btu_hr / (1.08 x target_temp_rise_f); temp_rise_at_exhaust = exhaust_cfm > 0 ? sensible_btu_hr / (1.08 x exhaust_cfm) : null.",
    edition: "Watt-to-heat conversion (3.412 BTU/hr per watt) and the 1.08 standard-air sensible-heat relation, by name; ANSI/IICRC S500. Field-arithmetic identities, not edition-bound.",
    freeAccess: "The watt-to-heat conversion and the 1.08 sensible relation are public HVAC arithmetic; the efficient-evaporation band is named in the published IICRC S500.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the conversion and sensible relation do not roll). Every watt of equipment draw becomes sensible heat (3.412 BTU/hr per watt); the 1.08 factor is 60 min x 0.075 lb/ft^3 x 0.24 BTU/lb-degF for standard air. An overheated chamber leaves the efficient-evaporation band and drives secondary damage and microbial growth. Envelope losses and the building HVAC GOVERN the real number; this is a screen. ANSI/IICRC S500 names the band.",
    assumptions: [
      { name: "Standard air", value: "the 1.08 sensible factor assumes standard air (0.075 lb/ft^3, 0.24 BTU/lb-degF); altitude and temperature shift it", source: "ASHRAE / IICRC S500" },
      { name: "All draw becomes heat", value: "essentially every watt the chamber's equipment draws lands in the room as sensible heat", source: "first principles" },
    ],
  },
  "char-depth-capacity": {
    formula: "char_depth_in = char_rate_in_hr x (exposure_min / 60); effective_char_in = char_depth_in + zero_strength_in; residual_width/depth = nominal - effective x faces (floored at 0 -> consumed); section_modulus_ratio = (rw x rd^2) / (b x d^2).",
    edition: "AWC National Design Specification one-dimensional char model (about 1.5 in/hr nominal) plus a heat-degraded zero-strength layer, by name.",
    freeAccess: "The one-dimensional char rate and the zero-strength-layer concept are public AWC/NDS structural fire-design provisions; the section-modulus ratio is geometry.",
    governance: GOVERNANCE.general,
    editionNote: "The char rate and zero-strength layer follow the AWC National Design Specification fire-design provisions; the species, density, and exposure shift the rate, so they are editable. This screens the residual BENDING section ONLY. A structural engineer GOVERNS connections, splitting, char-line judgment, and the load path; the engineer of record makes the keep-or-replace call. Not a stamped calculation.",
    assumptions: [
      { name: "Nominal char rate", value: "1.5 in/hr one-dimensional nominal; species and density shift it, so it is editable", source: "AWC NDS" },
      { name: "Zero-strength layer", value: "a 0.2 in heat-degraded layer beneath the char carries no load", source: "AWC NDS" },
      { name: "Bending only", value: "the section-modulus ratio screens bending capacity; shear, connections, and stability are out of scope", source: "structural engineering" },
    ],
  },
  "soot-cleaning-takeoff": {
    formula: "dry_sponges = ceil(affected_sf / sponge_coverage_sf); labor_hours = affected_sf / production_sf_per_hr; sealer_gal = seal_coat ? affected_sf / primer_sf_per_gal : 0.",
    edition: "Dry-sponge soot cleaning takeoff and the 300 ft^2/gal primer coverage, by name; ANSI/IICRC S700 fire and smoke restoration. Field-takeoff arithmetic, not edition-bound.",
    freeAccess: "The takeoff is public estimating arithmetic; the dry-sponge method and the residue-type guidance are named in the published IICRC S700.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the takeoff arithmetic does not roll). The RESIDUE TYPE GOVERNS the method: dry sponging is for dry smoke only, and protein, wet, fuel-oil/puffback, and synthetic residues need wet cleaning or solvents instead (see the residue-method screen). This sizes the dry-sponge quantity; it is not a cleaning protocol. ANSI/IICRC S700 names the methods.",
    assumptions: [
      { name: "Per-sponge coverage", value: "a chemical sponge fouls and stops lifting soot after a coverage area; heavier soot lowers it", source: "ANSI/IICRC S700" },
      { name: "Primer coverage", value: "300 ft^2/gal odor-seal primer is a starting rate; the product label governs", source: "manufacturer label" },
    ],
  },
  "ozone-shock-treatment": {
    formula: "generators_needed = ceil(structure_volume_ft3 / rated_volume_per_unit); lockout_required = true (always); reentry requires ventilate >= aeration_min and ozone < 0.1 ppm (OSHA).",
    edition: "Volume-based ozone deodorization sizing, by name; ANSI/IICRC S700, and the OSHA 0.1 ppm ozone permissible limit.",
    freeAccess: "The volume-based sizing is public arithmetic; the deodorization method is named in the published IICRC S700 and the 0.1 ppm limit in the public OSHA standard.",
    governance: GOVERNANCE.general,
    editionNote: "DANGER: ozone is a strong oxidizer and respiratory toxin. The space MUST be unoccupied and sealed during treatment, with people, pets, and plants removed, then aired out below the 0.1 ppm OSHA limit before reentry. A hydroxyl generator is the occupied-space alternative. This sizes equipment; it is NOT authority to run ozone in an occupied space. ANSI/IICRC S700 governs the method.",
    assumptions: [
      { name: "Rated treatable volume", value: "each generator's rated volume is the manufacturer's figure for the odor severity and dwell", source: "manufacturer rating" },
      { name: "Lockout is a precondition", value: "the unoccupied-sealed-aerate-below-0.1-ppm sequence is constant and does not scale with the job", source: "OSHA / ANSI/IICRC S700" },
    ],
  },
  "smoke-residue-method": {
    formula: "Deterministic lookup: residue_type in { dry, wet, protein, fueloil, synthetic } -> { source, appearance, method, deodorization_note, caution }. An unrecognized selector returns an error; no arithmetic.",
    edition: "Smoke residue type to cleaning method mapping, by name; ANSI/IICRC S700 fire and smoke restoration.",
    freeAccess: "The residue-to-method mapping is the public professional guidance named in the published IICRC S700.",
    governance: GOVERNANCE.general,
    editionNote: "A reference/screen tile: it narrows the method, it is not a procedure. A test-clean of an inconspicuous area GOVERNS the final method, and solvent selection and substrate compatibility are the cleaner's call. Protein residue is near-invisible and must NOT be dry-sponged. ANSI/IICRC S700 names the residue types and methods.",
    assumptions: [
      { name: "Test-clean governs", value: "the mapping narrows the method; a test-clean of an inconspicuous area confirms it before production", source: "ANSI/IICRC S700" },
      { name: "Five residue types", value: "dry, wet, protein, fuel-oil/puffback, and synthetic are the standard sort", source: "ANSI/IICRC S700" },
    ],
  },
  "thermal-fog-deodorization": {
    formula: "deodorant_oz = (structure_volume_ft3 / 1000) x dose_oz_per_1000ft3 x treatments; deodorant_gal = deodorant_oz / 128.",
    edition: "Volume-based fogging dosage and the 128 fl oz/gal constant, by name; ANSI/IICRC S700 fire and smoke restoration. Label-rate arithmetic, not edition-bound.",
    freeAccess: "The dosage is public label arithmetic; the fogging method is named in the published IICRC S700.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the dosage arithmetic does not roll). The product LABEL rate and dwell GOVERN the actual dose. A thermal fogger produces a HOT fog from an open flame, so the space is unoccupied, smoke detectors are managed, and a fire watch applies; ULV is the cold alternative. This sizes quantity only. ANSI/IICRC S700 names the method.",
    assumptions: [
      { name: "Label dose rate", value: "the ounces per 1,000 ft^3 is read from the product label and is editable", source: "manufacturer label" },
      { name: "Hot fog hazard", value: "a thermal fogger ignites the deodorant; unoccupied space, managed detectors, and a fire watch apply", source: "ANSI/IICRC S700" },
    ],
  },
  "contents-packout-inventory": {
    formula: "contents_volume_ft3 = floor_area_ft2 x contents_ft3_per_ft2; boxes = ceil(contents_volume_ft3 / box_volume_ft3); storage_volume_ft3 = contents_volume_ft3 x stacking_factor; truck_loads = ceil(storage_volume_ft3 / truck_volume_ft3).",
    edition: "Volume-based pack-out estimating method, by name; restoration estimating practice (ANSI/IICRC S500/S700). Field-estimating arithmetic, not edition-bound.",
    freeAccess: "The pack-out estimate is public estimating arithmetic; the densities are common restoration rules of thumb.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the estimating arithmetic does not roll). The actual inventory and the box mix GOVERN; the defaults (2 ft^3/ft^2 contents, 3 ft^3 box, 1.5 stacking, 1,000 ft^3 truck) are starting rules of thumb, all editable. This is an estimating screen for the contents side of the loss. Restoration estimating practice governs.",
    assumptions: [
      { name: "Contents density", value: "2 ft^3 of contents per ft^2 of floor is a furnished-room rule of thumb; the actual inventory governs", source: "restoration estimating practice" },
      { name: "Stacking allowance", value: "a 1.5 factor reserves warehouse aisle and stacking space beyond the raw contents volume", source: "restoration estimating practice" },
    ],
  },
  "surface-condensation-risk": {
    formula: "T_c = (air_temp_f - 32) x 5/9; g = ln(air_rh_pct/100) + 17.625 x T_c / (243.04 + T_c); dew_pt_c = 243.04 x g / (17.625 - g); dew_point_f = dew_pt_c x 9/5 + 32; margin_f = surface_temp_f - dew_point_f; condensing when margin_f <= 0.",
    edition: "Magnus-Tetens dew-point relation (17.625 / 243.04 degC coefficients) and the keep-surfaces-above-the-dew-point rule of ANSI/IICRC S500, by name. Not edition-bound.",
    freeAccess: "The Magnus dew-point relation is public psychrometrics; the surface-above-dew-point practice is named in the published ANSI/IICRC S500.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the Magnus relation does not roll). The Magnus form is an APPROXIMATION and the IR-read surface temperature GOVERNS; psychrometric is the chamber reference. This is a screen for where a drying setup will make secondary water by condensation, not a psychrometric certificate. ANSI/IICRC S500 names the rule.",
    assumptions: [
      { name: "Magnus coefficients", value: "17.625 and 243.04 degC are the standard Magnus-Tetens constants for dew point over water", source: "psychrometric convention" },
      { name: "Surface temperature", value: "the coldest surface is read with an IR thermometer and governs; a single value screens one surface at a time", source: "ANSI/IICRC S500" },
    ],
  },
  "spore-io-ratio": {
    formula: "io_ratio = indoor_spores_m3 / outdoor_spores_m3; pass when io_ratio <= 1 and no indoor-elevated water-damage marker (indoor_marker == 0).",
    edition: "Indoor/outdoor airborne-spore comparison and the marker-genera (Stachybotrys / Chaetomium) principle of ANSI/IICRC S520, by name. Not edition-bound.",
    freeAccess: "The indoor/outdoor ratio is public arithmetic; the comparison and marker-genera principle are named in the published ANSI/IICRC S520.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the ratio arithmetic does not roll). This is a SCREEN, not a clearance certificate: an independent environmental professional (IEP/CIH) interprets the genera and the full visual / moisture criteria, and a ratio at or under 1 alone does not clear a project. ANSI/IICRC S520 names the principle.",
    assumptions: [
      { name: "Outdoor control", value: "the outdoor sample establishes the baseline genera and concentration for the comparison and must be positive", source: "ANSI/IICRC S520" },
      { name: "Marker genera", value: "indoor-dominant water-damage markers (Stachybotrys, Chaetomium) elevated inside fail the screen regardless of the ratio", source: "ANSI/IICRC S520" },
    ],
  },
  "hardwood-floor-drying-mat": {
    formula: "mats_needed = ceil(floor_area_ft2 / mat_coverage_ft2); suction_units = ceil(mats_needed / mats_per_unit).",
    edition: "Hardwood-floor drying-mat system sizing under ANSI/IICRC S500 Class 4 specialty drying, by name. Field-sizing arithmetic, not edition-bound.",
    freeAccess: "The mat and unit counts are public estimating arithmetic; the Class 4 specialty-drying method is named in the published ANSI/IICRC S500.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the sizing arithmetic does not roll). The mat-system manufacturer's coverage and unit ratings GOVERN, and subfloor construction and finish affect feasibility. This sizes the system for the Class 4 specialty job the class screen identifies; it is not a drying protocol. ANSI/IICRC S500 names Class 4 specialty drying.",
    assumptions: [
      { name: "Per-mat coverage", value: "6 ft^2 per mat is a starting rate; the mat-system manufacturer's rating governs", source: "manufacturer rating" },
      { name: "Mats per unit", value: "16 mats per suction unit is a starting rate; the unit's rated capacity governs", source: "manufacturer rating" },
    ],
  },
  "mold-cleaning-labor": {
    formula: "labor_hours = affected_sf x passes / production_sf_per_hr; crew_hours = labor_hours / crew_size.",
    edition: "Source-removal multi-pass cleaning labor method (HEPA vacuum / damp wipe / HEPA vacuum) under ANSI/IICRC S520, by name. Field-labor arithmetic, not edition-bound.",
    freeAccess: "The labor roll-up is public estimating arithmetic; the multi-pass source-removal method is named in the published ANSI/IICRC S520.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the labor arithmetic does not roll). The Condition, substrate, and access GOVERN the production rate, and non-cleanable porous materials are removed (not counted here), not cleaned. This is a labor screen, not a remediation protocol. ANSI/IICRC S520 names the source-removal method.",
    assumptions: [
      { name: "Production rate", value: "100 ft^2/hr per pass is a starting rate; the Condition, substrate, and access govern the real rate", source: "ANSI/IICRC S520" },
      { name: "Passes", value: "a default of 2 (vac / wipe, or vac / vac) with a third pass common; the field method governs", source: "ANSI/IICRC S520" },
    ],
  },
  "flash-steam-pct": {
    formula: "flash_fraction = (hf_high - hf_low) / hfg_low; flash_pct = flash_fraction x 100. hf and hfg are saturated-water enthalpies (Btu/lb) at the two pressures.",
    edition: "First-principles steam thermodynamics; the bundled saturated-water enthalpy points are from the ASME steam tables, by name. Not edition-bound.",
    freeAccess: "The flash relation is public thermodynamics; the enthalpies come from the published ASME / IAPWS saturated-water steam tables.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the flash relation and the steam-table enthalpies do not roll). This is the THERMODYNAMIC-IDEAL flash fraction - real trap behavior, subcooling, and line losses move the field number, and a flash-recovery vessel is sized from the manufacturer's data. The ASME steam tables supply the enthalpy points.",
    assumptions: [
      { name: "Enthalpies", value: "saturated-liquid enthalpies hf and latent heat hfg from the ASME steam tables at the two pressures (user-supplied for an off-table pressure)", source: "ASME steam tables" },
      { name: "Ideal flash", value: "the fraction is the thermodynamic ideal; trap subcooling and line losses lower the field value", source: "steam thermodynamics" },
    ],
  },
  "steam-pipe-velocity": {
    formula: "req_area_ft2 = (steam_flow_lbhr x spec_vol_ft3lb) / (vel_ceiling_fpm x 60); req_dia_in = sqrt(4 x req_area_ft2 / pi) x 12; then the smallest Sch 40 nominal whose ID >= req_dia_in, and actual_fpm = (flow x spec_vol) / (chosen_area_ft2 x 60).",
    edition: "First-principles continuity; the recommended velocity band (supply mains ~6,000 to 12,000 ft/min) and the saturated-steam specific volumes are from ASHRAE Fundamentals / Systems, by name. Sch 40 IDs are ASME B36.10M nominal mill dimensions.",
    freeAccess: "Continuity (mass flow x specific volume = volumetric flow) is public; the steam specific volume comes from the published saturated-steam table at the line pressure.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (continuity and the nominal pipe schedule do not roll). The velocity band is a RECOMMENDATION, not a code limit - noise, erosion, and the condensate-loading reverse-flow case at low velocity all bear on the final choice, which the engineer of record governs. ASHRAE supplies the band and specific volumes.",
    assumptions: [
      { name: "Specific volume", value: "saturated-steam specific volume from the steam table at the line pressure (user-supplied for an off-table pressure)", source: "ASHRAE Fundamentals" },
      { name: "Velocity band", value: "supply mains ~6,000 to 12,000 ft/min is a recommendation, not a code limit", source: "ASHRAE Systems" },
      { name: "Pipe schedule", value: "Sch 40 nominal inside diameters per ASME B36.10M mill dimensions", source: "ASME B36.10M" },
    ],
  },
  "steam-trap-sizing": {
    formula: "condensate_lbhr = heat_duty_btuhr / hfg_btulb; req_capacity_lbhr = condensate_lbhr x safety_factor (2x typical, 3x warm-up / modulating).",
    edition: "First-principles condensate-load relation and the safety-factor practice, by name; the latent heat is from the ASME steam tables. Not edition-bound.",
    freeAccess: "The condensate load is the heat duty divided by the published latent heat at the operating pressure; the safety factor is standard practice.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the relation and the safety-factor practice do not roll). The trap is SELECTED FROM THE MANUFACTURER'S CAPACITY CHART at the actual differential pressure the installation develops - this tile gives the load and the capacity target, not a trap model, and modulating, warm-up, and stall conditions can demand a larger factor or a different trap type.",
    assumptions: [
      { name: "Latent heat", value: "hfg from the saturated-steam table at the operating pressure (user-supplied for an off-table pressure)", source: "ASME steam tables" },
      { name: "Safety factor", value: "2x typical, 3x on warm-up / modulating service; higher factors for stall conditions", source: "steam-trap selection practice" },
      { name: "Selection", value: "the trap is sized from the manufacturer's capacity chart at the actual differential pressure", source: "manufacturer capacity chart" },
    ],
  },
  "pipe-pressure-rating": {
    formula: "allowable: P = 2 S E (t_avail - A) / (D - 2 y (t_avail - A)), t_avail = wall x (1 - mill_tol). required wall: t = P D / (2 (S E + P y)) + A. ASME B31.1 internal-pressure design.",
    edition: "ASME B31.1 Power Piping pressure-design relation, by name (B31.3 Process Piping uses the same form with its own allowables). The allowable stress S, joint factor E, and y-coefficient are read from the code edition's tables.",
    freeAccess: "The internal-pressure design equation (Barlow for the first cut, the B31.1 form for the real one) is public; the material allowable stress, joint factor, and y-coefficient are read from the applicable code tables.",
    governance: GOVERNANCE.general,
    editionNote: "The allowable stress S, the joint factor E, and the y-coefficient are read from the applicable ASME B31.1 (or B31.3) edition's tables for the SPECIFIC MATERIAL AND TEMPERATURE, and entered by the user. This is a design SCREEN, not a stamped calculation - the engineer of record and the AHJ govern. Named editions roll the allowable-stress tables; this tile carries the relation, not the tables.",
    assumptions: [
      { name: "Allowable stress", value: "S is read from the applicable code edition's allowable-stress table for the material at temperature (user-supplied)", source: "ASME B31.1" },
      { name: "Joint factor", value: "weld-joint efficiency E (seamless = 1.0) from the code", source: "ASME B31.1" },
      { name: "y-coefficient", value: "temperature coefficient y (ferritic <= 900F = 0.4) from the code table", source: "ASME B31.1" },
    ],
  },
  "pipe-filled-support-load": {
    formula: "empty_lbft = (pi/4)(OD^2 - ID^2)/144 x pipe_density; fluid_lbft = (pi/4)(ID^2)/144 x fluid_density; insul_lbft = (pi/4)((OD + 2 thk)^2 - OD^2)/144 x insul_density; filled = empty + fluid + insul; per_hanger = filled x spacing.",
    edition: "First-principles cross-section x density; the MSS SP-58 operating support load the result feeds, by name. Not edition-bound.",
    freeAccess: "The support load is a pure cross-section-times-density buildup; the standard pipe weights and water density are public.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the geometry does not roll). Bundled pipe weights are NOMINAL MILL VALUES and the water density is taken at 62.4 lb/ft^3 - a hot or dense fluid changes the contents weight, and concentrated loads (valves, flanges) are added separately. MSS SP-58 names the operating support load this feeds.",
    assumptions: [
      { name: "Pipe weight", value: "computed from the entered OD/wall and material density (steel 490, copper 558 lb/ft^3); nominal mill values", source: "first-principles / mill dimensions" },
      { name: "Water density", value: "contents taken at 62.4 lb/ft^3 unless a different fluid density is entered", source: "first-principles" },
      { name: "Concentrated loads", value: "valves, flanges, and other point loads are added to the per-hanger load separately", source: "MSS SP-58" },
    ],
  },
  "hanger-rod-sizing": {
    formula: "rated(d) = MSS_SP58_table[d] x temp_derate; required_rod = smallest d such that rated(d) >= load_lb; utilization = load_lb / rated(required_rod) x 100. Table: 3/8 in 610 | 1/2 in 1130 | 5/8 in 1810 | 3/4 in 2710 | 7/8 in 3770 | 1 in 4960 | 1-1/8 in 6230 | 1-1/4 in 8000 | 1-3/8 in 9510 | 1-1/2 in 11630 lb.",
    edition: "MSS SP-58 carbon-steel threaded-rod maximum safe loads (at or below 650F), by name; the rod-selection logic is first-principles. The values are the standard's published carbon-steel allowable loads.",
    freeAccess: "The maximum safe loads are the MSS SP-58 carbon-steel threaded-rod values, published across the standard and every hanger catalog; the selection is a simple table lookup.",
    governance: GOVERNANCE.general,
    editionNote: "The bundled maximum safe loads are the MSS SP-58 carbon-steel threaded-rod values at or below 650F. Above 650F the temperature derate is applied from the standard's curve (user factor for an off-table temperature). The engineer of record and the standard's current edition govern the final selection.",
    assumptions: [
      { name: "Rod loads", value: "MSS SP-58 carbon-steel threaded-rod maximum safe loads at or below 650F", source: "MSS SP-58" },
      { name: "Temperature derate", value: "above 650F apply the standard's derate curve; the default 1.0 is the at-ambient value", source: "MSS SP-58" },
      { name: "Exceeds table", value: "a load above the largest tabulated rod (1-1/2 in) after derate returns an engineer-the-support error", source: "MSS SP-58" },
    ],
  },
  "radiant-loop-sizing": {
    formula: "tube_ft = floor_area_ft2 x 12 / spacing_in; loops = ceil(tube_ft / max_loop_ft); per_loop_ft = tube_ft / loops; total_gpm = load_btuhr / (500 x design_dt); per_loop_gpm = total_gpm / loops.",
    edition: "First-principles tube-footage, loop-count, and the GPM = Q / (500 x delta-T) hydronic flow relation, by name; the radiant-panel practice per ASHRAE HVAC Systems and Equipment (radiant panel chapter) and the Radiant Panel Association. Not edition-bound.",
    freeAccess: "The footage is area over the on-center spacing, the loop count is the footage over the loop limit, and the 500 x delta-T flow constant is the standard water-side relation; all public.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the geometry and the 500-constant flow relation do not roll). The MANUFACTURER'S TUBING TABLES and the room-by-room heat loss govern the final layout - this sizes footage, loops, and flow from a uniform load, not the panel surface-temperature or downward-loss design. ASHRAE and the Radiant Panel Association name the practice.",
    assumptions: [
      { name: "Footage", value: "one foot of tube per (spacing / 12) ft^2 of floor, a uniform serpentine layout", source: "radiant-panel practice" },
      { name: "Loop limit", value: "max loop length default 300 ft for 1/2 in PEX; the manufacturer's table governs the actual limit by tube size", source: "ASHRAE HVAC Systems and Equipment" },
      { name: "Flow constant", value: "GPM = Btu/hr / (500 x delta-T), the standard water-side sensible-heat relation", source: "ASHRAE Fundamentals" },
    ],
  },
  "condensate-return-sizing": {
    formula: "flash_lbhr = condensate_lbhr x flash_fraction; vol_cfm = flash_lbhr x spec_vol_ft3lb / 60; req_area_ft2 = vol_cfm / vel_ceiling_fpm; req_dia_in = sqrt(4 x req_area_ft2 / pi) x 12; then the smallest Sch 40 nominal whose ID >= req_dia_in.",
    edition: "First-principles continuity on the FLASH steam; the return-velocity ceiling (~4,000 to 5,000 ft/min, lower than a supply main) per ASHRAE / Spirax Sarco return-sizing practice, by name. Sch 40 IDs are ASME B36.10M nominal mill dimensions.",
    freeAccess: "Continuity (mass flow x specific volume = volumetric flow) is public; the flash fraction comes from flash-steam-pct and the flash-steam specific volume from the saturated-steam table at the return pressure.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (continuity and the nominal pipe schedule do not roll). The return is sized for the FLASH STEAM, not the liquid - a return sized for the gallons floods and water-hammers. The velocity ceiling is a RECOMMENDATION lower than a supply main; a wet, dry, or vacuum return and any lift each change the scheme, which the engineer of record governs. ASHRAE / Spirax Sarco supply the return-sizing practice.",
    assumptions: [
      { name: "Flash fraction", value: "the fraction that re-boils at the return pressure, from flash-steam-pct (user-supplied)", source: "flash-steam-pct" },
      { name: "Specific volume", value: "flash-steam specific volume from the saturated-steam table at the return pressure", source: "ASME steam tables" },
      { name: "Velocity ceiling", value: "~4,000 to 5,000 ft/min return ceiling, lower than a supply main; a recommendation, not a code limit", source: "ASHRAE / Spirax Sarco" },
    ],
  },
  "branch-saddle-cutback": {
    formula: "r = branch_od_in / 2; R = run_od_in / 2; cutback(theta) = R - sqrt(R^2 - (r sin theta)^2), theta around the branch from the run-axis line; max_cutback = R - sqrt(R^2 - r^2) at theta = 90; zero at theta = 0 (heel/toe).",
    edition: "The cylinder-intersection contour geometry, by name; the Pipe Fabrication Institute branch-layout practice. Not edition-bound.",
    freeAccess: "The saddle contour is the intersection of two cylinders, a closed-form square-root expression in the two radii; the geometry is public.",
    governance: GOVERNANCE.general,
    editionNote: "Single-edition (the geometry does not roll). This is the geometric contour for a 90-DEGREE, SAME-CENTERLINE branch; the weld bevel, gap, and root face are added per the WPS, and a reducing or angled branch shifts the contour. A fit-up aid, not a weld procedure. PFI names the layout practice.",
    assumptions: [
      { name: "Geometry", value: "a 90-degree, same-centerline branch on the run; branch OD <= run OD", source: "cylinder-intersection geometry" },
      { name: "Weld prep", value: "the bevel, gap, and root face are added to the geometric contour per the WPS", source: "Pipe Fabrication Institute" },
      { name: "Stations", value: "marks per quarter (default 6 = every 15 degrees) set the ordinate spacing", source: "layout practice" },
    ],
  },
  "reducer-offset": {
    formula: "centerline_offset = (large_od_in - small_od_in) / 2. concentric: centerline continuous, invert rises and crown drops by the offset. eccentric-flat-bottom: invert continuous, centerline and crown drop. eccentric-flat-top: crown continuous, centerline and invert rise.",
    edition: "First-principles geometry; the standard lay lengths per ASME B16.9 (bundled value entered by the user; a non-standard reducer overrides), and the flat-on-bottom-holds-invert / flat-on-top-holds-crown practice, by name. Not edition-bound for the offset.",
    freeAccess: "The offset is half the OD difference, a one-line geometric relation; which surface stays continuous follows from the reducer type. All public.",
    governance: GOVERNANCE.general,
    editionNote: "The offset and continuity are geometry; ASME B16.9 names the standard LAY LENGTHS (the bundled value, a user override allowed for a non-standard reducer). Flat-on-bottom holds the invert (keeps a drain self-cleaning) and flat-on-top holds the crown (keeps a pump suction free of air). The lay length is a fitting dimension, not a code minimum.",
    assumptions: [
      { name: "Offset", value: "centerline offset = (large OD - small OD) / 2, independent of the reducer type", source: "geometry" },
      { name: "Lay length", value: "standard end-to-end lay length per ASME B16.9 by size pair (user-entered; override for a non-standard reducer)", source: "ASME B16.9" },
      { name: "Continuity", value: "flat-on-bottom holds the invert; flat-on-top holds the crown; concentric holds the centerline", source: "fitting practice" },
    ],
  },
  "flange-rating": {
    formula: "mawp = interpolate(B16.5 Group 1.1 table[flange_class], temp_f), linear between the table temperatures (100, 200, 300, 400, 500, 600, 650 F). Class 150: 285, 260, 230, 200, 170, 140, 125; Class 300: 740, 680, 655, 635, 605, 570, 550; Class 600: 1480, 1360, 1310, 1265, 1205, 1135, 1100 psig; Class 900, 1500, 2500 scale from the 600 column by 1.5, 2.5, 4.17.",
    edition: "ASME B16.5 Pipe Flanges and Flanged Fittings pressure-temperature ratings, Material Group 1.1 (carbon steel, e.g. A105), by name. The ratings are read from the standard's table with linear interpolation.",
    freeAccess: "The pressure-temperature rating is a fixed published table lookup; the Group 1.1 ratings are the standard's carbon-steel values, widely republished.",
    governance: GOVERNANCE.general,
    editionNote: "The bundled ratings are MATERIAL GROUP 1.1 (carbon steel, e.g. A105); other material groups (stainless 2.x, low-alloy 1.x variants) have their OWN B16.5 tables. The value is the FLANGE'S rating - the weakest component (gasket, bolting, the mating pipe) can still govern the joint. A temperature outside the bundled 100 to 650 F range interpolates from the governing edition. The AHJ and the engineer of record govern.",
    assumptions: [
      { name: "Material group", value: "bundled ratings are B16.5 Material Group 1.1 (carbon steel, e.g. A105); other groups have their own tables", source: "ASME B16.5" },
      { name: "Interpolation", value: "linear between the table temperatures (100 to 650 F)", source: "ASME B16.5" },
      { name: "Weakest component", value: "the flange rating is not the joint rating; gasket, bolting, and the mating pipe can govern", source: "ASME B16.5" },
    ],
  },
  "branch-reinforcement": {
    formula: "d1 = (branch_od - 2 x branch_wall) / sin(beta); A_required = run_treq x d1 x (2 - sin beta); d2 = max(d1, branch_wall + run_wall + d1/2); L4 = min(2.5 x run_wall, 2.5 x branch_wall); A1 = (2 d2 - d1)(run_wall - run_treq); A2 = 2 L4 (branch_wall - branch_treq); adequate when A1 + A2 >= A_required, else pad_area = A_required - (A1 + A2).",
    edition: "ASME B31.1 para 104.3.1 branch-connection reinforcement (and B31.3 304.3 for process piping), by name; the area-replacement relations are read from the code's figure.",
    freeAccess: "The area-replacement relations are the standard branch-reinforcement balance, widely republished in piping-design texts; the required wall thicknesses come from the pressure design.",
    governance: GOVERNANCE.general,
    editionNote: "The required thicknesses come from the pressure design (see pipe-pressure-rating), the reinforcement-zone limits and the weld/pad area follow the code's figure, and the engineer of record and the AHJ govern. This is the area balance, NOT a stamped branch-connection design. ASME B31.1 104.3.1 governs power piping; B31.3 304.3 governs process.",
    assumptions: [
      { name: "Required walls", value: "run and branch required walls come from the pressure design (pipe-pressure-rating), not assumed here", source: "ASME B31.1 / B31.3" },
      { name: "Reinforcement zone", value: "half-width d2 = max(d1, T_b + T_h + d1/2); height L4 = min(2.5 T_h, 2.5 T_b) (no pad)", source: "ASME B31.1 104.3.1" },
      { name: "Governance", value: "the area balance is a screening check; the engineer of record and the AHJ govern the branch-connection design", source: "ASME B31.1" },
    ],
  },
  "expansion-guide-spacing": {
    formula: "first_guide = d1_mult x pipe_od (default 4 diameters from the joint); second_guide = d2_mult x pipe_od (default 14 diameters past the first guide); guide 2 is first_guide + second_guide from the joint.",
    edition: "The Expansion Joint Manufacturers Association (EJMA) 4-diameter / 14-diameter guide-placement rule and the manufacturer installation guides, by name.",
    freeAccess: "The 4D/14D first-and-second-guide rule is the EJMA published placement standard, republished in every manufacturer's installation guide.",
    governance: GOVERNANCE.general,
    editionNote: "The 4D/14D rule places the first TWO guides; intermediate guide spacing beyond the second guide comes from the EJMA table or the pipe-column stability calc (user-supplied / manufacturer), and the anchor and joint selection govern. This places the planning guides, it does NOT design the anchor loads.",
    assumptions: [
      { name: "First two guides", value: "first guide within 4 pipe diameters of the joint, second within 14 diameters of the first", source: "EJMA" },
      { name: "Beyond guide 2", value: "intermediate guide spacing comes from the EJMA table or a pipe-column stability calc (user-supplied)", source: "EJMA" },
      { name: "Anchors", value: "the anchor loads and joint selection are a separate design and govern", source: "EJMA / manufacturer" },
    ],
  },
  "medgas-demand": {
    formula: "connected_scfm = stations x per_station_scfm; design_scfm = connected_scfm x diversity, the diversity (simultaneous-use) factor in (0, 1] falling as the station count rises.",
    edition: "NFPA 99 Health Care Facilities Code (medical gas and vacuum systems) demand and diversity, with ASSE 6010 for the installer qualification, by name.",
    freeAccess: "The connected-times-diversity demand relation is the NFPA 99 sizing method; the per-station flows and diversity factors are read from the adopted edition and the facility equipment list.",
    governance: GOVERNANCE.general,
    editionNote: "The per-station design flows and the diversity (simultaneous-use) factors are read from the adopted NFPA 99 edition and the facility's equipment list (user-supplied here); medical-gas piping is installed and certified by brazing-qualified plumbers and pipefitters (ASSE 6010), and a medical-gas verifier and the AHJ govern. This tile gives the DESIGN FLOW that feeds pipe sizing, not the system design itself - a demand aggregation, not a med-gas system stamp.",
    assumptions: [
      { name: "Per-station flow", value: "the per-station design flow is read from NFPA 99 / the equipment list (user-supplied)", source: "NFPA 99" },
      { name: "Diversity", value: "the simultaneous-use factor falls as station count rises and is read from the adopted table (user-supplied)", source: "NFPA 99" },
      { name: "Installer", value: "medical-gas piping is brazed and certified by ASSE 6010-qualified plumbers/pipefitters; a verifier and the AHJ govern", source: "ASSE 6010 / NFPA 99" },
    ],
  },
};

// --- Citation linkifier ---
//
// The §3 reference rows ("Public free-access pointer", "Edition / source
// date", governance, edition note) and the assumption sources name their
// authoritative source by bare domain (nfpa.org/freeaccess, ecfr.gov,
// nist.gov/pml, codes.iccsafe.org, ...) rather than as a clickable URL.
// fillCitationText() renders those bare domains as real <a href> links so
// a tradesperson can tap straight through to the source, while leaving the
// surrounding prose as plain text. The TLD set is whitelisted to the
// authorities that actually appear in CITATIONS so version tokens like
// "802.3", "B31", or "29 CFR 1910.146" never match. textContent of the
// host element is preserved (link text === the domain), so the existing
// citation unit tests that assert on textContent still hold.
const CITATION_LINK_RE =
  /\b((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:gov|org|com|edu|net|mil|int))(\/[A-Za-z0-9._~:/?#@!$&'*+,;=%-]*[A-Za-z0-9_~/#-])?/gi;

function appendPlainText(host, text) {
  if (typeof document.createTextNode === "function") {
    host.appendChild(document.createTextNode(text));
  } else {
    // DOM-stub path (unit tests): no createTextNode, so wrap in a span.
    const s = document.createElement("span");
    s.textContent = text;
    host.appendChild(s);
  }
}

export function fillCitationText(host, value) {
  const str = typeof value === "string" ? value : "";
  CITATION_LINK_RE.lastIndex = 0;
  let last = 0;
  let matched = false;
  let m;
  while ((m = CITATION_LINK_RE.exec(str)) !== null) {
    matched = true;
    if (m.index > last) appendPlainText(host, str.slice(last, m.index));
    const token = m[0];
    const a = document.createElement("a");
    a.textContent = token;
    a.setAttribute("href", "https://" + token);
    a.setAttribute("rel", "noopener noreferrer");
    a.className = "citation-link";
    host.appendChild(a);
    last = m.index + token.length;
  }
  if (!matched) { host.textContent = str; return; }
  if (last < str.length) appendPlainText(host, str.slice(last));
}

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
    const dd = document.createElement("dd"); fillCitationText(dd, value);
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
      fillCitationText(dd, a.value + (a.source ? "  (" + a.source + ")" : ""));
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
