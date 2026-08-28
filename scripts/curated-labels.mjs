// Hand-authored captions for the worked-example rows no extractor can name.
//
// Every tile's example is printed on its static page as "You enter / You get",
// and each row wants a caption a reader understands. Most captions are read
// straight out of the renderer by scripts/extract-bespoke-schemas.mjs, and that
// is where a caption should come from whenever it can.
//
// 111 rows across 77 tiles cannot be reached that way, for three honest reasons:
//
//   1. One output LINE carries several numbers. "Agv / Anv / Ant" captions the
//      whole line, so attributing it to any one of the three would name two of
//      them wrong. The extractor correctly refuses.
//   2. The example key is a compute-side name the renderer never prints on its
//      own ("se" = S x E inside the ASME thickness formula).
//   3. The tile's fields are built by a bespoke layout the parser does not read
//      (the ASTM C33 sieve ladder, the harmonic spectrum).
//
// Those rows used to print the bare key -- "ka 0.3333", "SHR 0.8022" -- which
// tells a reader nothing. The captions below are the names the cited standard
// itself uses, so they add no claim the tile was not already making.
//
// This map is the FLOOR: an extracted caption or a renderer schema always wins.
// scripts/check-curated-labels.mjs fails the build on an entry that names a
// tile or key that does not exist, and on an entry the extractor has since
// learned to read -- so fixing a renderer retires its entry here rather than
// leaving two sources of truth.

export const CURATED_INPUT_LABELS = {
  // Reading list: a run of backsights and foresights, not two scalars.
  "differential-leveling": { bs: "Backsight readings (ft)", fs: "Foresight readings (ft)" },
  // ASTM C33 fine-aggregate sieve ladder: percent PASSING each sieve.
  "fine-aggregate-grading": {
    p38: "Passing 3/8 in (%)", p4: "Passing #4 (%)", p8: "Passing #8 (%)",
    p16: "Passing #16 (%)", p30: "Passing #30 (%)", p50: "Passing #50 (%)",
    p100: "Passing #100 (%)",
  },
  // ASTM C136 fineness modulus: cumulative percent RETAINED on each sieve.
  "fineness-modulus": {
    r4: "Cumulative retained on #4 (%)", r8: "Cumulative retained on #8 (%)",
    r16: "Cumulative retained on #16 (%)", r30: "Cumulative retained on #30 (%)",
    r50: "Cumulative retained on #50 (%)", r100: "Cumulative retained on #100 (%)",
  },
  // UL 1561 harmonic spectrum, each current as a fraction of the fundamental.
  "transformer-k-factor": {
    i1: "Fundamental current (per unit)", i3: "3rd harmonic (per unit)",
    i5: "5th harmonic (per unit)", i7: "7th harmonic (per unit)",
    i9: "9th harmonic (per unit)", i11: "11th harmonic (per unit)",
    i13: "13th harmonic (per unit)",
  },
  "unit-converter": { to: "Convert to" },
  // Shape-dispatched renderers: the tile builds its dimension boxes only after
  // a shape is chosen, and passes them to the compute through a rest element
  // (`computeArea({ shape, ...dims })`). The extractor reads a compute CALL, and
  // there is no call site naming these keys, so it correctly declines. The
  // labels below are the ones the renderer itself passes to `make(...)` for the
  // shape each tile's own worked example uses. Without them the field index
  // could not carry the dimensions at all, and "square footage 20 ft by 10 ft"
  // -- about the most typed question this site takes -- filled nothing.
  "square-footage": { length_ft: "Length (ft)", width_ft: "Width (ft)" },
  "concrete": { length_ft: "Length (ft)", width_ft: "Width (ft)", thickness_in: "Thickness (in)" },
  "metal-weight": { thickness_in: "Thickness (in)" },
  // A select the renderer builds from a data list, so the options are not in the
  // source for the extractor to read. The caption is.
  "historical-pricing": { commodity: "Commodity" },
  // The renderer hands its values to a Web Worker through an `inputs` object
  // rather than calling the compute directly, and routes the floor area through
  // a local first (`const floor_ft2 = Number(fa.input.value)`) because the
  // BTU/hr-per-sq-ft context band needs it again. The extractor follows a field
  // straight into a compute call, not through the extra hop, so the one input
  // every load calculation starts from had no caption and could not be filled
  // from a typed question. Both captions are the renderers' own strings.
  "manual-j-cooling": { floor_area_ft2: "Floor area (ft²)" },
  "manual-j-heating": { floor_area_ft2: "Floor area (ft²)" },
  // Same shape: the optional NPSHr is read through a local so an empty box can
  // mean "not supplied" rather than zero. The friction loss is captioned here
  // too -- it is mapped straight into the compute call and should have been
  // read, but the parameter it maps to sat behind a comment in the compute's
  // own destructure, so the extractor never had a key to look it up by. That
  // is the same input whose loss made this tile report an available NPSH two
  // feet higher, and therefore safer, than the truth.
  "npsh-a": {
    friction_loss_ft: "Suction friction loss (ft)",
    npsh_required_ft: "NPSH required (ft, optional)",
  },
};

export const CURATED_OUTPUT_LABELS = {
  "aggregate": { pcf: "Material density (pcf)" },
  "air-density-correction": { DF: "Density factor DF" },
  "arrhenius-equation": { q10: "Q10 temperature coefficient" },
  // S x E, the allowable stress already reduced by the joint efficiency.
  "asme-head-thickness": { se: "Allowable stress x joint efficiency S·E (psi)" },
  "asme-shell-thickness": { se: "Allowable stress x joint efficiency S·E (psi)" },
  "bolt-torque": { K: "Nut factor K for this lubrication" },
  "boring-bar-deflection": { ld: "Overhang ratio L/D" },
  "boring-bar-max-overhang": { ld: "Overhang ratio L/D" },
  "camera-lens-fov": { ppf: "Pixel density (pixels per ft)" },
  "carpet-seam-layout": { sy: "Carpet ordered (SY)" },
  "channel-froude-number": { fr: "Froude number Fr" },
  "channel-normal-depth": { fr: "Froude number Fr" },
  "chi-square-gof": { df: "Degrees of freedom" },
  "cmu-wall-flexure": { k: "Neutral-axis depth ratio k", j: "Lever-arm ratio j" },
  "coefficient-of-consolidation": { tv: "Time factor Tv" },
  "cohesive-earth-pressure": { ka: "Active earth-pressure coefficient Ka" },
  // AISC Design Guide 1 base-plate cantilevers.
  "column-base-plate": { m: "Cantilever m (in)", n: "Cantilever n (in)", np: "Cantilever n' (in)" },
  "cooling-system-flow": { gpm: "Required coolant flow (gpm)" },
  "coulomb-earth-pressure": { ka: "Active earth-pressure coefficient Ka" },
  "countertop-overhang-support": { psf: "Slab weight (psf)" },
  "decibel-converter": { db: "Result (dB)" },
  "demo-debris": { pcf: "Debris density (pcf)" },
  "dyno-correction-sae": { cf: "SAE J1349 correction factor" },
  "economic-insulation-thickness": { crf: "Capital recovery factor CRF" },
  "gcwr-check": { ok: "Within both limits" },
  "gear-dynamic-tooth-stress": { kv: "Barth velocity factor Kv" },
  "gear-mph-rpm": { mph: "Road speed (MPH)" },
  "helical-pile": { Kt: "Torque-to-capacity factor Kt" },
  "hp-from-torque": { hp: "Horsepower" },
  "hx-lmtd-ntu": { ntu: "Number of transfer units NTU" },
  "hydraulic-jump": { fr1: "Upstream Froude number Fr1" },
  "langelier-index": { phs: "Saturation pH (pHs)" },
  "lateral-earth-pressure": { ka: "Active coefficient Ka", kp: "Passive coefficient Kp" },
  "lifting-lug-design": { dcr: "Demand-to-capacity ratio" },
  "lighting-uniformity-ratio": { U0: "Overall uniformity U0 (min/avg)" },
  "linear-regression": { r2: "R² (coefficient of determination)", rse: "Residual standard error" },
  "liquefaction-screening": { rd: "Stress reduction factor rd" },
  "manual-j-cooling": { SHR: "Sensible heat ratio SHR" },
  "max-offer-70-rule": { mao: "Maximum allowable offer ($)" },
  "molarity-dilution": { v1: "Stock volume V1 (L)", v2: "Final volume V2 (L)" },
  "one-sample-t-test": { df: "Degrees of freedom" },
  "paired-t-test": { df: "Degrees of freedom" },
  "pearson-correlation": {
    r: "Correlation r", r2: "R² (coefficient of determination)",
    df: "Degrees of freedom", t: "t statistic",
  },
  "rc-slab-max-span-for-thickness": { kfy: "Grade (yield) modifier" },
  "rc-slab-min-thickness": { kfy: "Grade (yield) modifier" },
  "rc-tbeam-flexure": { phi: "Strength reduction factor phi" },
  "rcf-rpm": { rcf: "Relative centrifugal force (x g)" },
  "refrigeration-cop": { eer: "EER (BTU/hr per watt)" },
  "reorder-point": { z: "Service-level z score" },
  "retaining-wall-stability": { mr: "Resisting moment (ft-lb/ft)", mo: "Overturning moment (ft-lb/ft)" },
  "seer-eer": { SEER: "SEER" },
  "seismic-earth-pressure": { kae: "Seismic active coefficient Kae", pae: "Total seismic thrust Pae (lb/ft)" },
  "shr": { SHR: "Sensible heat ratio SHR" },
  "slip-critical-with-tension": { ksc: "Tension reduction factor ksc" },
  "sloped-backfill-earth-pressure": { ka: "Active earth-pressure coefficient Ka" },
  "soil-bearing-capacity": { nq: "Bearing capacity factor Nq", nc: "Bearing capacity factor Nc" },
  "soil-gradation-coefficients": { cu: "Uniformity coefficient Cu" },
  "spearman-rank-correlation": { rho: "Spearman rho" },
  "steel-b2-amplifier": { rm: "Story stiffness factor RM" },
  "steel-block-shear": {
    agv: "Gross shear area Agv (in²)", anv: "Net shear area Anv (in²)",
    ant: "Net tension area Ant (in²)",
  },
  "steel-tension-member": { u: "Shear lag factor U" },
  "tankless-gpm": { gpm: "Hot-water flow (gpm)" },
  "tire-load-check": { ok: "Within the tire rating" },
  "tr55-graphical-peak-discharge": { fp: "Pond and swamp factor Fp" },
  "wind-gust-effect-factor": { iz: "Turbulence intensity Iz", q: "Background response factor Q" },
};
