// Molecular and cell-biology calculators split from calc-lab.js by
// spec-v1876. Calculator behavior and citations are unchanged.

import {
  DEBOUNCE_MS,
  debounce,
  makeNumber,
  makeSelect,
  makeText,
  makeOutputLine,
  attachExampleButton,
  fmt,
} from "./ui-fields.js";

const _finiteGuard = (o) => {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const v of Object.values(o)) {
      if (typeof v === "number" && !Number.isFinite(v)) {
        return { error: "All numeric inputs must be finite numbers." };
      }
    }
  }
  return null;
};

export const LABMOLECULAR_RENDERERS = {};

// ===========================================================================
// spec-v20 Phase T - two new lab tiles (v18/v21 tile contract).
// ===========================================================================

// --- v20 T.1: Primer melting temperature (`primer-tm`) ---
// Wallace (<=14 nt): Tm = 2(A+T) + 4(G+C). Basic GC% (>14 nt): Tm = 64.9 + 41*(G+C-16.4)/len.
// dims: in { sequence: dimensionless, method: dimensionless } out: { tm_c: T, length_nt: dimensionless }
export function computePrimerTm({ sequence = "", method = "auto" } = {}) {
  const seq = String(sequence || "").toUpperCase().replace(/\s+/g, "");
  const cleaned = seq.replace(/[^ATGC]/g, "");
  const dropped = seq.length - cleaned.length;
  const len = cleaned.length;
  if (len === 0) return { error: "Enter a primer sequence (A/T/G/C)." };
  let A = 0, T = 0, G = 0, C = 0;
  for (const b of cleaned) { if (b === "A") A++; else if (b === "T") T++; else if (b === "G") G++; else if (b === "C") C++; }
  const gc = G + C;
  const at = A + T;
  let useMethod = method;
  if (method === "auto") useMethod = len <= 14 ? "wallace" : "gc";
  let tm;
  if (useMethod === "wallace") tm = 2 * at + 4 * gc;
  else tm = 64.9 + 41 * (gc - 16.4) / len;
  const gcContent = gc / len * 100;
  return {
    tm_c: Number.isFinite(tm) ? tm : null,
    length_nt: len,
    gc_content_pct: Number.isFinite(gcContent) ? gcContent : null,
    method_used: useMethod,
    dropped_chars: dropped,
    note: "The Wallace rule is valid only for short primers (<=14 nt) at ~1 M NaCl. Nearest-neighbor (SantaLucia) thermodynamics is the modern gold standard - these are quick estimates. Non-ACGT characters are flagged and dropped.",
  };
}
export const primerTmExample = { inputs: { sequence: "GCGGATCCATG", method: "auto" } };

function renderPrimerTm(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per Wallace R.B. et al., Nucleic Acids Research 6 (1979), for the short-oligo rule and Marmur & Doty, J Mol Biol 5 (1962) / standard molecular-biology references for the GC% formula, by name. Complements the pcr-master-mix tile. Nearest-neighbor (SantaLucia) thermodynamics is the modern gold standard. Free abstracts at pubmed.ncbi.nlm.nih.gov.";
  const seq = makeText("Primer sequence (5' -> 3')", "ptm-seq", {});
  const method = makeSelect("Method", "ptm-method", [
    { value: "auto", label: "Auto (Wallace <=14 nt, else GC%)", selected: true },
    { value: "wallace", label: "Wallace 2(A+T)+4(G+C)" },
    { value: "gc", label: "Basic GC%" },
  ]);
  for (const f of [seq, method]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { seq.input.value = "GCGGATCCATG"; method.select.value = "auto"; update(); });
  const oTm = makeOutputLine(outputRegion, "Tm", "ptm-out-tm");
  const oLen = makeOutputLine(outputRegion, "Length / GC content", "ptm-out-len");
  const oNote = makeOutputLine(outputRegion, "Note", "ptm-out-note");
  const update = debounce(() => {
    const r = computePrimerTm({ sequence: seq.input.value, method: method.select.value });
    if (r.error) { oTm.textContent = r.error; oLen.textContent = ""; oNote.textContent = ""; return; }
    oTm.textContent = fmt(r.tm_c, 1) + " C (" + r.method_used + ")";
    oLen.textContent = r.length_nt + " nt, " + fmt(r.gc_content_pct, 0) + "% GC";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [seq.input, method.select]) f.addEventListener("input", update);
}
LABMOLECULAR_RENDERERS["primer-tm"] = renderPrimerTm;

// --- v20 T.2: CFU/mL viable plate count (`cfu-plate-count`) ---
// CFU/mL = colonies / (dilution_factor * volume_plated). Dilution accepted as
// 1e-5 (factor) or 100000 (x) - both normalized to the same result.
// dims: in { colonies: dimensionless, dilution_factor: dimensionless, volume_ml: L^3 } out: { cfu_per_ml: dimensionless }
// Countable range defaults to FDA BAM Chapter 3's 15-300 per plate (revised
// March 2025 from 25-250, and ISO's range). Until 2026-09-24 the default was
// the superseded 25-250 and the note had APHA and BAM swapped.
export function computeCfuPlateCount({ colonies = 0, dilution_factor = 0, volume_ml = 0, low = 15, high = 300 } = {}) {
  const col = Number(colonies) || 0;
  let df = Number(dilution_factor) || 0;
  const vol = Number(volume_ml) || 0;
  if (col < 0 || !Number.isFinite(col)) return { error: "Colony count must be non-negative." };
  if (!(df > 0 && Number.isFinite(df))) return { error: "Dilution factor must be positive." };
  if (!(vol > 0 && Number.isFinite(vol))) return { error: "Volume plated must be positive (mL)." };
  // Normalize: if df >= 1 it is the "times" form (e.g. 100000); multiply.
  // If df < 1 it is the fraction form (e.g. 1e-5); divide.
  const cfuPerMl = df >= 1 ? col * df / vol : col / (df * vol);
  const inRange = col >= low && col <= high;
  return {
    cfu_per_ml: Number.isFinite(cfuPerMl) ? cfuPerMl : null,
    in_countable_range: inRange,
    note: (col > high ? "Count above the countable range (TNTC) - statistically unreliable. " : col < low && col > 0 ? "Count below the countable range (TFTC) - statistically unreliable. " : "")
      + "Countable range " + low + "-" + high + " per plate here; FDA BAM Chapter 3 uses 15-300 (since March 2025, as ISO does), APHA 25-250, USDA and AOAC 30-300 -- use the method your lab reports under. Spread/pour/spiral change the effective plated volume.",
  };
}
export const cfuPlateCountExample = { inputs: { colonies: 150, dilution_factor: 1e-5, volume_ml: 0.1 } };

function renderCfuPlateCount(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the FDA Bacteriological Analytical Manual (BAM) Chapter 3 (Aerobic Plate Count) and APHA Standard Methods, by name; both public/free. Countable range 15-300 per plate (FDA BAM Chapter 3 since March 2025, and ISO); APHA uses 25-250, USDA and AOAC 30-300. Free at fda.gov/food/science-research-food/laboratory-methods-food.";
  const col = makeNumber("Colonies counted", "cfu-col", { step: "any", min: "0" });
  const df = makeNumber("Dilution factor (e.g. 1e-5 or 100000)", "cfu-df", { step: "any", min: "0" });
  const vol = makeNumber("Volume plated (mL)", "cfu-vol", { step: "any", min: "0" });
  for (const f of [col, df, vol]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { col.input.value = "150"; df.input.value = "0.00001"; vol.input.value = "0.1"; update(); });
  const oCfu = makeOutputLine(outputRegion, "CFU/mL", "cfu-out-cfu");
  const oRange = makeOutputLine(outputRegion, "Countable range", "cfu-out-range");
  const oNote = makeOutputLine(outputRegion, "Note", "cfu-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeCfuPlateCount({ colonies: readNum(col.input), dilution_factor: readNum(df.input), volume_ml: readNum(vol.input) });
    if (r.error) { oCfu.textContent = r.error; oRange.textContent = ""; oNote.textContent = ""; return; }
    oCfu.textContent = r.cfu_per_ml.toExponential(2) + " CFU/mL";
    oRange.textContent = r.in_countable_range ? "Within countable range" : "Outside countable range";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [col.input, df.input, vol.input]) f.addEventListener("input", update);
}
LABMOLECULAR_RENDERERS["cfu-plate-count"] = renderCfuPlateCount;

// --- spec-v531 T: Molarity from a concentrated reagent (`molarity-from-stock`) ---
// M = 10 * %(w/w) * density / MW. volume_to_draw = target_M * final_volume / stock_M.
// dims: in { purity_pct: dimensionless, density_g_ml: dimensionless, mol_weight: dimensionless, target_m: dimensionless, final_volume_ml: dimensionless } out: { stock_m: dimensionless, volume_to_draw_ml: dimensionless }
export function computeMolarityFromStock({ purity_pct = 0, density_g_ml = 0, mol_weight = 0, target_m = 0, final_volume_ml = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const purity = Number(purity_pct) || 0;
  const density = Number(density_g_ml) || 0;
  const mw = Number(mol_weight) || 0;
  const target = Number(target_m) || 0;
  const finalVol = Number(final_volume_ml) || 0;
  if (!(purity > 0)) return { error: "Assay / purity percent must be positive." };
  if (purity > 100) return { error: "Purity percent cannot exceed 100." };
  if (!(density > 0)) return { error: "Density must be positive (g/mL)." };
  if (!(mw > 0)) return { error: "Molecular weight must be positive (g/mol)." };
  const stock_m = 10 * purity * density / mw;
  let volume_to_draw_ml = null;
  if (target > 0 || finalVol > 0) {
    if (!(target > 0)) return { error: "Target molarity must be positive when preparing a dilution." };
    if (!(finalVol > 0)) return { error: "Final volume must be positive (mL) when preparing a dilution." };
    if (target > stock_m) return { error: "Target molarity exceeds the stock molarity - you cannot concentrate by dilution." };
    volume_to_draw_ml = target * finalVol / stock_m;
  }
  return {
    stock_m,
    volume_to_draw_ml,
    note: "A concentrated liquid reagent is labeled by weight percent and density, not molarity, so both must be combined with the molecular weight (ignoring either is a 20-40% error); the 10 factor converts g per 100 mL to per liter. Always add concentrated acid to water, never the reverse. The reagent lot assay and lab safety procedures govern.",
  };
}
export const molarityFromStockExample = { inputs: { purity_pct: 37, density_g_ml: 1.19, mol_weight: 36.46, target_m: 1.0, final_volume_ml: 1000 } };

function renderMolarityFromStock(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard reagent preparation - stock molarity from assay and density, stock_M = 10 x purity_pct x density / MW; volume_to_draw = target_M x final_volume / stock_M. A concentrated liquid reagent is labeled by weight percent and density, not molarity, so both must be combined with the molecular weight (ignoring either is a 20-40% error). Always add concentrated acid to water, never the reverse. The reagent lot certificate of analysis and lab safety procedures govern.";
  const purity = makeNumber("Assay / purity (% w/w)", "mfs-purity", { step: "any", min: "0" });
  const density = makeNumber("Density (g/mL)", "mfs-density", { step: "any", min: "0" });
  const mw = makeNumber("Molecular weight (g/mol)", "mfs-mw", { step: "any", min: "0" });
  const target = makeNumber("Target molarity (mol/L, optional)", "mfs-target", { step: "any", min: "0" });
  const finalVol = makeNumber("Final volume to prepare (mL, optional)", "mfs-vol", { step: "any", min: "0" });
  for (const f of [purity, density, mw, target, finalVol]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { purity.input.value = "37"; density.input.value = "1.19"; mw.input.value = "36.46"; target.input.value = "1"; finalVol.input.value = "1000"; update(); });
  const oStock = makeOutputLine(outputRegion, "Stock molarity", "mfs-out-stock");
  const oDraw = makeOutputLine(outputRegion, "Volume of concentrate to draw", "mfs-out-draw");
  const oNote = makeOutputLine(outputRegion, "Note", "mfs-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeMolarityFromStock({ purity_pct: readNum(purity.input), density_g_ml: readNum(density.input), mol_weight: readNum(mw.input), target_m: readNum(target.input), final_volume_ml: readNum(finalVol.input) });
    if (r.error) { oStock.textContent = r.error; oDraw.textContent = ""; oNote.textContent = ""; return; }
    oStock.textContent = fmt(r.stock_m, 2) + " mol/L";
    oDraw.textContent = r.volume_to_draw_ml !== null ? fmt(r.volume_to_draw_ml, 1) + " mL (into water)" : "- (enter a target molarity and final volume)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [purity.input, density.input, mw.input, target.input, finalVol.input]) f.addEventListener("input", update);
}
LABMOLECULAR_RENDERERS["molarity-from-stock"] = renderMolarityFromStock;

// --- spec-v533 T: Nucleic-acid concentration from A260 (`nucleic-acid-a260`) ---
// concentration = A260 x factor x dilution (factor 50 dsDNA, 33 ssDNA/oligo, 40 RNA). purity = A260/A280.
const NUCLEIC_ACID_FACTORS = { dsDNA: 50, ssDNA: 33, oligo: 33, RNA: 40 };
// dims: in { a260: dimensionless, na_type: dimensionless, dilution_factor: dimensionless, a280: dimensionless } out: { concentration_ng_ul: dimensionless, purity_260_280: dimensionless }
export function computeNucleicAcidA260({ a260 = 0, na_type = "dsDNA", dilution_factor = 1, a280 = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const a = Number(a260) || 0;
  const dil = Number(dilution_factor) || 0;
  const a2 = Number(a280) || 0;
  if (a < 0) return { error: "A260 must be non-negative." };
  const factor = NUCLEIC_ACID_FACTORS[na_type];
  if (!factor) return { error: "Nucleic-acid type must be dsDNA, ssDNA, oligo, or RNA." };
  if (!(dil > 0)) return { error: "Dilution factor must be positive." };
  const concentration_ng_ul = a * factor * dil;
  let purity_260_280 = null;
  if (a2 !== 0) {
    if (!(a2 > 0)) return { error: "A280 must be positive when a purity ratio is requested." };
    purity_260_280 = a / a2;
  }
  const threshold = na_type === "RNA" ? 2.0 : 1.8;
  const clean = purity_260_280 === null ? null : purity_260_280 >= threshold;
  return {
    concentration_ng_ul,
    purity_260_280,
    factor,
    clean,
    note: "The factor is an empirical mass coefficient, not a molar one, and it differs by strandedness (ssDNA absorbs more per mass, so it reads a lower concentration at the same A260). A 260/280 below about 1.8 (DNA) or 2.0 (RNA) flags protein or phenol carryover that makes the concentration unreliable. The read assumes a clean 1 cm path and a blanked instrument. The sample and instrument govern.",
  };
}
export const nucleicAcidA260Example = { inputs: { a260: 0.6, na_type: "dsDNA", dilution_factor: 50, a280: 0.324 } };

function renderNucleicAcidA260(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard spectrophotometric nucleic-acid quantitation (Beer-Lambert at 260 nm); concentration = A260 x factor x dilution, factor 50 (dsDNA) / 33 (ssDNA, oligo) / 40 (RNA) ug/mL per A260; purity = A260 / A280. The factor is an empirical mass coefficient, not molar, and differs by strandedness. A 260/280 below ~1.8 (DNA) or ~2.0 (RNA) flags protein/phenol carryover. Assumes a clean 1 cm path and a blanked instrument. The sample and instrument govern.";
  const a260 = makeNumber("A260 (absorbance at 260 nm)", "na260-a260", { step: "any", min: "0" });
  const type = makeSelect("Nucleic-acid type", "na260-type", [
    { value: "dsDNA", label: "Double-stranded DNA (factor 50)" },
    { value: "ssDNA", label: "Single-stranded DNA (factor 33)" },
    { value: "oligo", label: "Oligo (factor 33)" },
    { value: "RNA", label: "RNA (factor 40)" },
  ]);
  const dil = makeNumber("Dilution factor", "na260-dil", { step: "any", min: "0" });
  const a280 = makeNumber("A280 (optional, for 260/280 purity)", "na260-a280", { step: "any", min: "0" });
  for (const f of [a260, type, dil, a280]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a260.input.value = "0.6"; type.select.value = "dsDNA"; dil.input.value = "50"; a280.input.value = "0.324"; update(); });
  const oConc = makeOutputLine(outputRegion, "Concentration", "na260-out-conc");
  const oPurity = makeOutputLine(outputRegion, "260/280 purity", "na260-out-purity");
  const oNote = makeOutputLine(outputRegion, "Note", "na260-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeNucleicAcidA260({ a260: readNum(a260.input), na_type: type.select.value, dilution_factor: readNum(dil.input), a280: readNum(a280.input) });
    if (r.error) { oConc.textContent = r.error; oPurity.textContent = ""; oNote.textContent = ""; return; }
    oConc.textContent = fmt(r.concentration_ng_ul, 1) + " ng/uL (factor " + r.factor + ")";
    oPurity.textContent = r.purity_260_280 !== null ? fmt(r.purity_260_280, 2) + (r.clean ? " - clean" : " - below threshold, protein/phenol carryover") : "- (enter A280)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [a260.input, type.select, dil.input, a280.input]) f.addEventListener("input", update);
}
LABMOLECULAR_RENDERERS["nucleic-acid-a260"] = renderNucleicAcidA260;

// --- spec-v534 T: Ligation insert:vector molar ratio (`ligation-molar-ratio`) ---
// insert_ng = ratio x (insert_len/vector_len) x vector_ng. pmol = ng / (len x 650) x 1e6.
// dims: in { vector_ng: dimensionless, vector_length_bp: dimensionless, insert_length_bp: dimensionless, molar_ratio: dimensionless } out: { insert_ng: dimensionless, vector_pmol: dimensionless, insert_pmol: dimensionless }
export function computeLigationMolarRatio({ vector_ng = 0, vector_length_bp = 0, insert_length_bp = 0, molar_ratio = 3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const vng = Number(vector_ng) || 0;
  const vlen = Number(vector_length_bp) || 0;
  const ilen = Number(insert_length_bp) || 0;
  const ratio = Number(molar_ratio) || 0;
  if (!(vng > 0)) return { error: "Vector mass must be positive (ng)." };
  if (!(vlen > 0)) return { error: "Vector length must be positive (bp)." };
  if (!(ilen > 0)) return { error: "Insert length must be positive (bp)." };
  if (!(ratio > 0)) return { error: "Molar ratio must be positive." };
  const insert_ng = ratio * (ilen / vlen) * vng;
  // ng / (bp * 650 g/mol) gives mol; x 1e3 converts to pmol (the spec's 1e6 yields femtomoles).
  const vector_pmol = vng / (vlen * 650) * 1e3;
  const insert_pmol = ratio * vector_pmol;
  return {
    insert_ng,
    vector_pmol,
    insert_pmol,
    note: "The ratio is molar, not mass, so a short insert needs proportionally less mass than the vector (equal masses over-represent small fragments and cut efficiency). 650 g/mol per base pair is the double-stranded DNA average (single-stranded and RNA differ). The standard 3:1 insert:vector is a starting point optimized empirically. The enzyme protocol and fragment ends govern.",
  };
}
export const ligationMolarRatioExample = { inputs: { vector_ng: 50, vector_length_bp: 5000, insert_length_bp: 1000, molar_ratio: 3 } };

function renderLigationMolarRatio(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard molecular cloning - ligation insert:vector molar-ratio setup; insert_ng = ratio x (insert_length / vector_length) x vector_ng; vector_pmol = vector_ng / (vector_length x 650) x 1e3; insert_pmol = ratio x vector_pmol. The ratio is molar, not mass; 650 g/mol per bp is the dsDNA average (ssDNA and RNA differ); 3:1 is a starting point optimized empirically. The enzyme protocol and fragment ends govern.";
  const vng = makeNumber("Vector mass (ng)", "lmr-vng", { step: "any", min: "0" });
  const vlen = makeNumber("Vector length (bp)", "lmr-vlen", { step: "any", min: "0" });
  const ilen = makeNumber("Insert length (bp)", "lmr-ilen", { step: "any", min: "0" });
  const ratio = makeNumber("Insert:vector molar ratio", "lmr-ratio", { step: "any", min: "0" });
  for (const f of [vng, vlen, ilen, ratio]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { vng.input.value = "50"; vlen.input.value = "5000"; ilen.input.value = "1000"; ratio.input.value = "3"; update(); });
  const oInsert = makeOutputLine(outputRegion, "Insert mass to add", "lmr-out-insert");
  const oPmol = makeOutputLine(outputRegion, "Amounts (pmol)", "lmr-out-pmol");
  const oNote = makeOutputLine(outputRegion, "Note", "lmr-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeLigationMolarRatio({ vector_ng: readNum(vng.input), vector_length_bp: readNum(vlen.input), insert_length_bp: readNum(ilen.input), molar_ratio: readNum(ratio.input) });
    if (r.error) { oInsert.textContent = r.error; oPmol.textContent = ""; oNote.textContent = ""; return; }
    oInsert.textContent = fmt(r.insert_ng, 1) + " ng of insert";
    oPmol.textContent = "vector " + fmt(r.vector_pmol, 4) + " pmol, insert " + fmt(r.insert_pmol, 4) + " pmol";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [vng.input, vlen.input, ilen.input, ratio.input]) f.addEventListener("input", update);
}
LABMOLECULAR_RENDERERS["ligation-molar-ratio"] = renderLigationMolarRatio;

// --- spec-v535 T: Cell-culture doubling time (`doubling-time`) ---
// Td = t x ln(2) / ln(N/N0). mu = ln(N/N0)/t. doublings = log2(N/N0).
// dims: in { initial_count: dimensionless, final_count: dimensionless, elapsed_time: dimensionless } out: { doubling_time: dimensionless, growth_rate: dimensionless, doublings: dimensionless }
export function computeDoublingTime({ initial_count = 0, final_count = 0, elapsed_time = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const n0 = Number(initial_count) || 0;
  const n = Number(final_count) || 0;
  const t = Number(elapsed_time) || 0;
  if (!(n0 > 0)) return { error: "Initial count (or OD) must be positive." };
  if (!(n > 0)) return { error: "Final count (or OD) must be positive." };
  if (!(n > n0)) return { error: "Final count must exceed the initial count (no growth to measure)." };
  if (!(t > 0)) return { error: "Elapsed time must be positive." };
  const ratio = n / n0;
  const doubling_time = t * Math.LN2 / Math.log(ratio);
  const growth_rate = Math.log(ratio) / t;
  const doublings = Math.log2(ratio);
  return {
    doubling_time,
    growth_rate,
    doublings,
    note: "Doubling time is constant only during log (exponential) phase - a measurement spanning lag or stationary phase is meaningless. If N is an optical density, the ratio assumes OD stays proportional to cell count (which fails at high density). The culture, medium, and conditions govern.",
  };
}
export const doublingTimeExample = { inputs: { initial_count: 1e5, final_count: 8e5, elapsed_time: 24 } };

function renderDoublingTime(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard exponential-growth / population-doubling kinetics; Td = elapsed x ln(2) / ln(N / N0); mu = ln(N / N0) / elapsed; doublings = log2(N / N0). Doubling time is constant only during log (exponential) phase; a measurement spanning lag or stationary phase is meaningless. If N is an optical density, the ratio assumes OD stays proportional to cell count (fails at high density). The culture, medium, and conditions govern.";
  const n0 = makeNumber("Initial count or OD (N0)", "dt-n0", { step: "any", min: "0" });
  const n = makeNumber("Final count or OD (N)", "dt-n", { step: "any", min: "0" });
  const t = makeNumber("Elapsed time (h)", "dt-t", { step: "any", min: "0" });
  for (const f of [n0, n, t]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { n0.input.value = "100000"; n.input.value = "800000"; t.input.value = "24"; update(); });
  const oTd = makeOutputLine(outputRegion, "Doubling time", "dt-out-td");
  const oMu = makeOutputLine(outputRegion, "Specific growth rate / doublings", "dt-out-mu");
  const oNote = makeOutputLine(outputRegion, "Note", "dt-out-note");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeDoublingTime({ initial_count: readNum(n0.input), final_count: readNum(n.input), elapsed_time: readNum(t.input) });
    if (r.error) { oTd.textContent = r.error; oMu.textContent = ""; oNote.textContent = ""; return; }
    oTd.textContent = fmt(r.doubling_time, 2) + " h";
    oMu.textContent = fmt(r.growth_rate, 3) + " /h, " + fmt(r.doublings, 2) + " doublings";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [n0.input, n.input, t.input]) f.addEventListener("input", update);
}
LABMOLECULAR_RENDERERS["doubling-time"] = renderDoublingTime;

// growth-projected-count: inverse of doubling-time. The doubling-time tile measures the doubling time from two counts;
// the inverse projects the count forward from a KNOWN doubling time over an elapsed time. From Td = t x ln2 / ln(N/N0),
// N = N0 x 2^(t / Td). It reports the number of doublings (t/Td) and the fold increase (2^(t/Td)).
// dims: in { initial_count: dimensionless, doubling_time: dimensionless, elapsed_time: dimensionless } out: { final_count: dimensionless, doublings: dimensionless, fold_increase: dimensionless }
export function computeGrowthProjectedCount({ initial_count = 0, doubling_time = 0, elapsed_time = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const n0 = Number(initial_count) || 0;
  const td = Number(doubling_time) || 0;
  const t = Number(elapsed_time) || 0;
  if (!(n0 > 0)) return { error: "Initial count (or OD) must be positive." };
  if (!(td > 0)) return { error: "Doubling time must be positive." };
  if (!(t > 0)) return { error: "Elapsed time must be positive." };
  const doublings = t / td;
  const fold_increase = Math.pow(2, doublings);
  const final_count = n0 * fold_increase;
  if (![doublings, fold_increase, final_count].every(Number.isFinite)) return { error: "Projected-count math is not a finite value." };
  return {
    final_count, doublings, fold_increase,
    note: "Exponential-growth projection: N = N0 x 2^(t / Td), the number of doublings is t / Td, and the fold increase is 2^(t / Td), the inverse of the doubling-time measurement. This holds only in LOG (exponential) phase - real cultures slow into stationary phase as the medium depletes and waste builds, so the projection over-predicts once the culture nears its carrying capacity. If N is an optical density, the ratio assumes OD stays proportional to cell count (fails at high density). The culture, medium, and conditions govern.",
  };
}
export const growthProjectedCountExample = { inputs: { initial_count: 1e5, doubling_time: 8, elapsed_time: 24 } };
function renderGrowthProjectedCount(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard exponential-growth kinetics, Td = t x ln(2) / ln(N/N0) solved for N: N = N0 x 2^(t / Td); doublings = t / Td; fold = 2^(t / Td). Holds only in log (exponential) phase; a projection past stationary phase over-predicts. If N is an optical density, the ratio assumes OD stays proportional to cell count. The culture, medium, and conditions govern.";
  const n0 = makeNumber("Initial count or OD (N0)", "gpc-n0", { step: "any", min: "0" });
  const td = makeNumber("Doubling time (h)", "gpc-td", { step: "any", min: "0" });
  const t = makeNumber("Elapsed time (h)", "gpc-t", { step: "any", min: "0" });
  for (const f of [n0, td, t]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { n0.input.value = "100000"; td.input.value = "8"; t.input.value = "24"; update(); });
  const oN = makeOutputLine(outputRegion, "Projected count or OD", "gpc-out-n");
  const oD = makeOutputLine(outputRegion, "Doublings / fold increase", "gpc-out-d");
  const oNote = makeOutputLine(outputRegion, "Note", "gpc-out-note");
  const update = debounce(() => {
    const r = computeGrowthProjectedCount({ initial_count: Number(n0.input.value) || 0, doubling_time: Number(td.input.value) || 0, elapsed_time: Number(t.input.value) || 0 });
    if (r.error) { oN.textContent = r.error; oD.textContent = "-"; oNote.textContent = ""; return; }
    oN.textContent = fmt(r.final_count, r.final_count >= 1e6 ? 0 : 1) + (r.final_count >= 1e6 ? " (" + r.final_count.toExponential(2) + ")" : "");
    oD.textContent = fmt(r.doublings, 2) + " doublings, " + fmt(r.fold_increase, 1) + "x";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [n0.input, td.input, t.input]) f.addEventListener("input", update);
}
LABMOLECULAR_RENDERERS["growth-projected-count"] = renderGrowthProjectedCount;

// --- spec-v536 T: Michaelis-Menten enzyme kinetics (`michaelis-menten`) ---
// v = Vmax x [S] / (Km + [S]). percent_vmax = v/Vmax x 100. At [S]=Km, v = Vmax/2.
// dims: in { vmax: dimensionless, km: dimensionless, substrate: dimensionless } out: { velocity: dimensionless, percent_vmax: dimensionless }
export function computeMichaelisMenten({ vmax = 0, km = 0, substrate = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const vm = Number(vmax) || 0;
  const kmv = Number(km) || 0;
  const s = Number(substrate) || 0;
  if (!(vm > 0)) return { error: "Vmax must be positive." };
  if (!(kmv > 0)) return { error: "Km must be positive." };
  if (s < 0) return { error: "Substrate concentration must be non-negative." };
  const velocity = vm * s / (kmv + s);
  const percent_vmax = velocity / vm * 100;
  const at_half = s === kmv;
  return {
    velocity,
    percent_vmax,
    at_half,
    note: "Km is the substrate concentration at half of Vmax (an affinity proxy - a low Km means high affinity - not a rate). The hyperbola approaches but never reaches Vmax, so saturating substrate is an approximation. The equation assumes steady state with substrate far in excess of enzyme. The actual assay conditions govern.",
  };
}
export const michaelisMentenExample = { inputs: { vmax: 100, km: 25, substrate: 25 } };

function renderMichaelisMenten(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard enzyme kinetics - the Michaelis-Menten equation; v = Vmax x [S] / (Km + [S]); percent_vmax = v / Vmax x 100. At [S] = Km the velocity is exactly half of Vmax. Km is the substrate concentration at half of Vmax (an affinity proxy, a low Km means high affinity, not a rate). The hyperbola approaches but never reaches Vmax. Assumes steady state with substrate far in excess of enzyme. The assay conditions govern.";
  const vmax = makeNumber("Vmax (maximum velocity)", "mm-vmax", { step: "any", min: "0" });
  const km = makeNumber("Km (substrate at half Vmax)", "mm-km", { step: "any", min: "0" });
  const sub = makeNumber("Substrate concentration [S]", "mm-sub", { step: "any", min: "0" });
  for (const f of [vmax, km, sub]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { vmax.input.value = "100"; km.input.value = "25"; sub.input.value = "25"; update(); });
  const oV = makeOutputLine(outputRegion, "Velocity", "mm-out-v");
  const oPct = makeOutputLine(outputRegion, "Percent of Vmax", "mm-out-pct");
  const oNote = makeOutputLine(outputRegion, "Note", "mm-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeMichaelisMenten({ vmax: readNum(vmax.input), km: readNum(km.input), substrate: readNum(sub.input) });
    if (r.error) { oV.textContent = r.error; oPct.textContent = ""; oNote.textContent = ""; return; }
    oV.textContent = fmt(r.velocity, 3) + (r.at_half ? " (exactly Vmax/2 at [S]=Km)" : "");
    oPct.textContent = fmt(r.percent_vmax, 1) + "% of Vmax";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [vmax.input, km.input, sub.input]) f.addEventListener("input", update);
}
LABMOLECULAR_RENDERERS["michaelis-menten"] = renderMichaelisMenten;

// [S] = Km x f/(1 - f) for a target fraction f = v/Vmax. At f = 0.5, [S] = Km.
// dims: in { km: dimensionless, target_percent: dimensionless } out: { substrate: dimensionless, fold_km: dimensionless }
export function computeSubstrateForVelocity({ km = 0, target_percent = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const kmv = Number(km) || 0;
  const pct = Number(target_percent) || 0;
  if (!(kmv > 0)) return { error: "Km must be positive." };
  if (!(pct > 0 && pct < 100)) return { error: "Target velocity must be between 0 and 100 percent of Vmax (exclusive)." };
  const f = pct / 100;
  const fold_km = f / (1 - f);
  const substrate = kmv * fold_km;
  return {
    substrate, fold_km, at_half: pct === 50,
    note: "The Michaelis-Menten equation inverted for the substrate concentration that reaches a target fraction of Vmax: from v/Vmax = [S]/(Km + [S]), [S] = Km x f/(1 - f) with f = v/Vmax. At 50% of Vmax [S] = Km (the definition of Km); the hyperbola then demands rapidly more substrate - 90% needs 9 x Km and 99% needs 99 x Km, which is why saturating an enzyme takes a large excess and Vmax is approached, never reached. Steady state with substrate far in excess of enzyme; the actual assay conditions govern.",
  };
}
export const substrateForVelocityExample = { inputs: { km: 25, target_percent: 90 } };
function renderSubstrateForVelocity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: the Michaelis-Menten equation inverted - [S] = Km x f/(1 - f) for a target fraction f = v/Vmax. At [S] = Km the velocity is half of Vmax; 90% needs 9 x Km, 99% needs 99 x Km. Steady state, substrate in excess of enzyme; the assay conditions govern.";
  const km = makeNumber("Km (substrate at half Vmax)", "sfv-km", { step: "any", min: "0" });
  const pct = makeNumber("Target velocity (% of Vmax)", "sfv-pct", { step: "any", min: "0" });
  for (const f of [km, pct]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { km.input.value = "25"; pct.input.value = "90"; update(); });
  const oS = makeOutputLine(outputRegion, "Required substrate [S]", "sfv-out-s");
  const oFold = makeOutputLine(outputRegion, "As a multiple of Km", "sfv-out-fold");
  const oNote = makeOutputLine(outputRegion, "Note", "sfv-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeSubstrateForVelocity({ km: readNum(km.input), target_percent: readNum(pct.input) });
    if (r.error) { oS.textContent = r.error; oFold.textContent = ""; oNote.textContent = ""; return; }
    oS.textContent = fmt(r.substrate, 3) + (r.at_half ? " (= Km, the half-Vmax definition)" : "");
    oFold.textContent = fmt(r.fold_km, 2) + " x Km";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [km.input, pct.input]) f.addEventListener("input", update);
}
LABMOLECULAR_RENDERERS["substrate-for-velocity"] = renderSubstrateForVelocity;
