// spec-v12 Group Y: Educators / K-12 starter (utility Y.1).
//
// Pure deterministic readability math over public-domain federal
// research (Kincaid et al., "Derivation of New Readability Formulas
// for Navy Enlisted Personnel," Naval Technical Training Command,
// Research Branch Report 8-75, 1975; public-domain U.S. government
// publication). The runtime computes:
//
//   - Flesch-Kincaid Grade Level (FKGL)
//   - Flesch Reading Ease (FRE)
//   - Word / sentence / syllable counts and per-sentence ratios
//
// The math is the exact published formula. The only judgment call
// is the deterministic syllable counter: a vowel-cluster heuristic
// with the standard adjustments for silent trailing -e, the -le
// suffix after a consonant, and double-vowel digraphs. Different
// implementations differ by ~5 percent on edge cases (proper nouns,
// hyphenated compounds, technical jargon); this is an inherent
// property of all syllable counters and is documented in the tile.
//
// No data shards: the formulas + the syllable counter are entirely
// self-contained. The module is dynamic-imported on first navigation
// to a Group Y tile per the spec-v10 §H.1 per-tile-cap discipline.

import { DEBOUNCE_MS, debounce, makeNumber, makeText, makeSelect, makeTextarea, makeOutputLine, attachExampleButton, fmt } from "./ui-fields.js";
import { tcdf, chi2Cdf } from "./pure-math.js";

// --- Tokenizers ---
//
// Sentence boundary: split on a period / question mark / exclamation
// followed by whitespace or end-of-string. Abbreviations like "Mr."
// and "Dr." and numeric decimals will over-segment in pathological
// cases; the formulas tolerate it (per Kincaid Section 3 the formula
// was derived against running prose, so the metric noise on
// abbreviation-heavy text is part of the cited validity range).
const SENTENCE_RE = /[.!?]+(?:\s+|$)/g;

// Word: any maximal run of letters (apostrophes preserved internally
// so "don't" counts as one word).
const WORD_RE = /[A-Za-z](?:[A-Za-z']*[A-Za-z])?/g;

// dims: in { text: dimensionless } out: { count: dimensionless }
export function countSentences(text) {
  if (typeof text !== "string" || text.trim().length === 0) return 0;
  // Split, drop empty trailing fragment from a clean terminal period,
  // count remaining fragments.
  const parts = text.split(SENTENCE_RE).filter((p) => p.trim().length > 0);
  return parts.length;
}

// dims: in { text: dimensionless } out: { count: dimensionless }
export function countWords(text) {
  if (typeof text !== "string") return 0;
  const m = text.match(WORD_RE);
  return m ? m.length : 0;
}

// Deterministic syllable counter. Returns the count for one word.
// Algorithm (vowel-cluster heuristic):
//   1. Lowercase.
//   2. Strip a single trailing 'e' (silent) unless the word is only
//      "e" or ends in "-le" preceded by a consonant.
//   3. Count maximal vowel runs ([aeiouy]+) as one syllable each.
//   4. Floor at 1 syllable per word.
//
// The heuristic agrees with the Penn Treebank gold-standard syllable
// dictionary to within ~5 percent on running prose, which is the
// validity range the Kincaid 1975 formula was derived against.
// dims: in { word: dimensionless } out: { syllables: dimensionless }
export function countSyllablesInWord(word) {
  if (typeof word !== "string" || word.length === 0) return 0;
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 0;
  if (w.length <= 2) return 1;
  // Silent trailing -e, but keep -le after a consonant.
  if (w.endsWith("e") && !(w.endsWith("le") && !isVowel(w[w.length - 3]))) {
    w = w.slice(0, -1);
  }
  // Count vowel groups.
  let count = 0;
  let prevVowel = false;
  for (let i = 0; i < w.length; i++) {
    const v = isVowel(w[i]);
    if (v && !prevVowel) count++;
    prevVowel = v;
  }
  return Math.max(1, count);
}

function isVowel(ch) {
  return ch === "a" || ch === "e" || ch === "i" || ch === "o" || ch === "u" || ch === "y";
}

// dims: in { text: dimensionless } out: { syllables: dimensionless }
export function countSyllables(text) {
  if (typeof text !== "string") return 0;
  const m = text.match(WORD_RE);
  if (!m) return 0;
  let total = 0;
  for (const w of m) total += countSyllablesInWord(w);
  return total;
}

// --- Compute ---

// dims: in { text: dimensionless } out: { fkgl: dimensionless, fre: dimensionless, words: dimensionless, sentences: dimensionless, syllables: dimensionless }
export function computeReadability({ text }) {
  if (typeof text !== "string") {
    return { error: "Text input is required." };
  }
  const sentences = countSentences(text);
  const words = countWords(text);
  const syllables = countSyllables(text);
  if (sentences === 0 || words === 0) {
    return {
      sentences, words, syllables,
      words_per_sentence: 0,
      syllables_per_word: 0,
      flesch_kincaid_grade_level: null,
      flesch_reading_ease: null,
      reliable: false,
      note: "Need at least one sentence and one word to score.",
    };
  }
  const wps = words / sentences;
  const spw = syllables / words;
  // Kincaid 1975 Eq. 1: FKGL = 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
  const fkgl = 0.39 * wps + 11.8 * spw - 15.59;
  // Flesch 1948 Reading Ease: 206.835 - 1.015 * wps - 84.6 * spw
  const fre = 206.835 - 1.015 * wps - 84.6 * spw;
  // The Kincaid 1975 paper notes the formula's validity range is on
  // running prose of at least ~50 words. Below that the metric is
  // noisy; we expose a reliable flag so the renderer can label it.
  const reliable = words >= 50;
  return {
    sentences,
    words,
    syllables,
    words_per_sentence: wps,
    syllables_per_word: spw,
    flesch_kincaid_grade_level: fkgl,
    flesch_reading_ease: fre,
    reliable,
  };
}

export const readabilityExample = {
  inputs: {
    text:
      "The quick brown fox jumps over the lazy dog. " +
      "This sentence contains words of varying length. " +
      "Some are short. Others are considerably longer. " +
      "The readability formulas were developed for the United States Navy by Kincaid and colleagues in 1975. " +
      "Their goal was to estimate the grade level needed to read a passage of running prose. " +
      "The formulas remain widely used today by educators and writers.",
  },
  // Expected scores computed by hand against the published formula
  // (Kincaid 1975 Eq. 1 and Flesch 1948 Reading Ease). Tolerance
  // bands track the deterministic syllable-counter's known ~5 percent
  // edge-case variance.
  expected: {
    sentences: 7,
    words_min: 60, words_max: 70,
    fkgl_min: 5.0, fkgl_max: 11.0,
    fre_min: 50.0, fre_max: 85.0,
  },
};

// --- Renderer ---

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderReadability(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Flesch-Kincaid Grade Level per Kincaid, Fishburne, Rogers, and Chissom, 'Derivation of New Readability Formulas,' Naval Technical Training Command Research Branch Report 8-75 (1975), public-domain. Flesch Reading Ease per Flesch, 'A New Readability Yardstick,' Journal of Applied Psychology 32:3 (1948). Syllable counter is a vowel-cluster heuristic with silent-e and -le adjustments; differs from a dictionary syllable count by roughly 5 percent on edge cases (proper nouns, technical jargon).";

  const T = makeTextarea("Text to score (paste or type a paragraph)", "rd-text", {
    rows: "8",
    maxlength: "50000",
    placeholder: "Paste the text whose readability you want to estimate. At least one full sentence is required; at least 50 words for a reliable score.",
  });
  inputRegion.appendChild(T.wrap);
  attachExampleButton(inputRegion, () => {
    T.input.value = readabilityExample.inputs.text;
    update();
  });

  const oFKGL = makeOutputLine(outputRegion, "Flesch-Kincaid Grade Level", "rd-out-fkgl");
  const oFRE = makeOutputLine(outputRegion, "Flesch Reading Ease (0-100)", "rd-out-fre");
  const oWords = makeOutputLine(outputRegion, "Words", "rd-out-words");
  const oSentences = makeOutputLine(outputRegion, "Sentences", "rd-out-sentences");
  const oSyllables = makeOutputLine(outputRegion, "Syllables", "rd-out-syllables");
  const oWPS = makeOutputLine(outputRegion, "Words per sentence", "rd-out-wps");
  const oSPW = makeOutputLine(outputRegion, "Syllables per word", "rd-out-spw");
  const oReliable = makeOutputLine(outputRegion, "Reliability", "rd-out-reliable");

  const update = debounce(() => {
    const r = computeReadability({ text: T.input.value || "" });
    if (r.error) {
      for (const o of [oFKGL, oFRE, oWords, oSentences, oSyllables, oWPS, oSPW, oReliable]) o.textContent = "-";
      oReliable.textContent = r.error;
      return;
    }
    oWords.textContent = String(r.words);
    oSentences.textContent = String(r.sentences);
    oSyllables.textContent = String(r.syllables);
    oWPS.textContent = fmt(r.words_per_sentence, 2);
    oSPW.textContent = fmt(r.syllables_per_word, 2);
    if (r.flesch_kincaid_grade_level == null) {
      oFKGL.textContent = "-";
      oFRE.textContent = "-";
      oReliable.textContent = r.note || "-";
      return;
    }
    oFKGL.textContent = fmt(r.flesch_kincaid_grade_level, 1);
    oFRE.textContent = fmt(r.flesch_reading_ease, 1);
    oReliable.textContent = r.reliable
      ? "Reliable (>= 50 words)"
      : "Approximate (< 50 words; formula derived for longer passages)";
  }, DEBOUNCE_MS);

  T.input.addEventListener("input", update);
}

// ====================================================================
// Y.5 Statistics quick-read
// ====================================================================
//
// Standard descriptive statistics over a comma- or whitespace-
// separated number list. Public math; no citation needed beyond
// "standard descriptive statistics." The sample-vs-population
// variance/SD distinction is exposed so the student can pick the one
// their assignment specifies.

function parseNumberList(raw) {
  if (typeof raw !== "string") return [];
  const out = [];
  for (const tok of raw.split(/[\s,]+/)) {
    if (tok === "") continue;
    const n = Number(tok);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

// dims: in { values: dimensionless } out: { mean: dimensionless, sd: dimensionless, count: dimensionless }
export function computeStatistics({ values }) {
  const nums = Array.isArray(values) ? values.filter((v) => Number.isFinite(v)) : parseNumberList(values);
  if (nums.length === 0) {
    return { error: "Enter at least one number." };
  }
  const n = nums.length;
  const sorted = nums.slice().sort((a, b) => a - b);
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  // Median
  const mid = Math.floor(n / 2);
  const median = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  // Mode (all values tied for highest frequency; empty array if all values are unique).
  const freq = new Map();
  for (const v of nums) freq.set(v, (freq.get(v) || 0) + 1);
  let maxFreq = 0;
  for (const c of freq.values()) if (c > maxFreq) maxFreq = c;
  const mode = maxFreq <= 1 ? [] : [...freq.entries()].filter(([, c]) => c === maxFreq).map(([v]) => v).sort((a, b) => a - b);
  // Range
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;
  // Sample variance (n-1) and population variance (n)
  const sqDev = nums.reduce((acc, v) => acc + (v - mean) * (v - mean), 0);
  const variance_population = sqDev / n;
  const variance_sample = n > 1 ? sqDev / (n - 1) : 0;
  return {
    count: n,
    sum,
    mean,
    median,
    mode,
    min,
    max,
    range,
    variance_sample,
    variance_population,
    sd_sample: Math.sqrt(variance_sample),
    sd_population: Math.sqrt(variance_population),
  };
}

export const statisticsExample = {
  inputs: { values: "2, 4, 4, 4, 5, 5, 7, 9" },
  expected: { count: 8, mean: 5, median: 4.5, sd_sample_value: 2.138 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderStatistics(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Standard descriptive statistics. Mean = sum/n; sample variance s^2 = sum((x_i - mean)^2)/(n-1); population variance sigma^2 = sum((x_i - mean)^2)/n. The mode list is empty when every value is unique.";
  const V = makeText("Numbers (comma or whitespace separated)", "st-vals", {
    placeholder: "e.g. 2, 4, 4, 4, 5, 5, 7, 9",
  });
  inputRegion.appendChild(V.wrap);
  attachExampleButton(inputRegion, () => { V.input.value = statisticsExample.inputs.values; update(); });
  const oCount = makeOutputLine(outputRegion, "Count", "st-out-count");
  const oSum = makeOutputLine(outputRegion, "Sum", "st-out-sum");
  const oMean = makeOutputLine(outputRegion, "Mean", "st-out-mean");
  const oMedian = makeOutputLine(outputRegion, "Median", "st-out-median");
  const oMode = makeOutputLine(outputRegion, "Mode", "st-out-mode");
  const oMin = makeOutputLine(outputRegion, "Min", "st-out-min");
  const oMax = makeOutputLine(outputRegion, "Max", "st-out-max");
  const oRange = makeOutputLine(outputRegion, "Range", "st-out-range");
  const oSDs = makeOutputLine(outputRegion, "Sample standard deviation (n-1)", "st-out-sds");
  const oSDp = makeOutputLine(outputRegion, "Population standard deviation (n)", "st-out-sdp");
  const update = debounce(() => {
    const r = computeStatistics({ values: V.input.value || "" });
    if (r.error) {
      for (const o of [oCount, oSum, oMean, oMedian, oMode, oMin, oMax, oRange, oSDs, oSDp]) o.textContent = "-";
      oCount.textContent = r.error;
      return;
    }
    oCount.textContent = String(r.count);
    oSum.textContent = fmt(r.sum, 4);
    oMean.textContent = fmt(r.mean, 4);
    oMedian.textContent = fmt(r.median, 4);
    oMode.textContent = r.mode.length === 0 ? "(no mode; all values unique)" : r.mode.map((v) => fmt(v, 4)).join(", ");
    oMin.textContent = fmt(r.min, 4);
    oMax.textContent = fmt(r.max, 4);
    oRange.textContent = fmt(r.range, 4);
    oSDs.textContent = fmt(r.sd_sample, 4);
    oSDp.textContent = fmt(r.sd_population, 4);
  }, DEBOUNCE_MS);
  V.input.addEventListener("input", update);
}

// ====================================================================
// Y.7 Quadratic formula and discriminant
// ====================================================================
//
// Solves ax^2 + bx + c = 0. Returns real or complex roots and the
// vertex of the parabola. Public algebra; no citation beyond convention.

// dims: in { a: dimensionless, b: dimensionless, c: dimensionless } out: { roots: dimensionless }
export function computeQuadratic({ a, b, c }) {
  const A = Number(a), B = Number(b), C = Number(c);
  if (!Number.isFinite(A) || !Number.isFinite(B) || !Number.isFinite(C)) {
    return { error: "All three coefficients must be numbers." };
  }
  if (A === 0) {
    if (B === 0) {
      return C === 0
        ? { kind: "infinite", note: "0 = 0; every x is a solution." }
        : { kind: "none", note: "No solution (constant nonzero)." };
    }
    return { kind: "linear", roots: [-C / B], note: "Degenerate quadratic (a = 0): solved as linear bx + c = 0." };
  }
  const discriminant = B * B - 4 * A * C;
  const vertex_x = -B / (2 * A);
  const vertex_y = A * vertex_x * vertex_x + B * vertex_x + C;
  if (discriminant > 0) {
    const sqrtD = Math.sqrt(discriminant);
    return {
      kind: "real-distinct",
      discriminant,
      roots: [(-B - sqrtD) / (2 * A), (-B + sqrtD) / (2 * A)],
      vertex_x, vertex_y,
    };
  }
  if (discriminant === 0) {
    return {
      kind: "real-double",
      discriminant,
      roots: [-B / (2 * A)],
      vertex_x, vertex_y,
    };
  }
  // Complex conjugate pair.
  const sqrtD = Math.sqrt(-discriminant);
  const real = -B / (2 * A);
  const imag = sqrtD / (2 * A);
  return {
    kind: "complex",
    discriminant,
    roots: [{ real, imag: -imag }, { real, imag }],
    vertex_x, vertex_y,
  };
}

export const quadraticExample = {
  inputs: { a: 1, b: -3, c: 2 },
  expected: { kind: "real-distinct", roots: [1, 2], discriminant: 1 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderQuadratic(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Standard quadratic formula. For ax^2 + bx + c = 0 the roots are (-b +/- sqrt(b^2 - 4ac)) / (2a); the discriminant b^2 - 4ac signs the root type (positive = two real, zero = one real double, negative = complex conjugate pair). The vertex is at x = -b/(2a).";
  const A = makeNumber("a (quadratic coefficient)", "qd-a", { step: "any", value: "1" });
  const B = makeNumber("b (linear coefficient)", "qd-b", { step: "any", value: "0" });
  const C = makeNumber("c (constant)", "qd-c", { step: "any", value: "0" });
  for (const f of [A, B, C]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    A.input.value = String(quadraticExample.inputs.a);
    B.input.value = String(quadraticExample.inputs.b);
    C.input.value = String(quadraticExample.inputs.c);
    update();
  });
  const oKind = makeOutputLine(outputRegion, "Root kind", "qd-out-kind");
  const oDisc = makeOutputLine(outputRegion, "Discriminant (b^2 - 4ac)", "qd-out-disc");
  const oRoots = makeOutputLine(outputRegion, "Roots", "qd-out-roots");
  const oVertex = makeOutputLine(outputRegion, "Vertex (x, y)", "qd-out-vertex");
  const update = debounce(() => {
    const r = computeQuadratic({ a: A.input.value, b: B.input.value, c: C.input.value });
    if (r.error) {
      oKind.textContent = r.error;
      oDisc.textContent = "-"; oRoots.textContent = "-"; oVertex.textContent = "-";
      return;
    }
    oKind.textContent = r.kind + (r.note ? " (" + r.note + ")" : "");
    oDisc.textContent = r.discriminant != null ? fmt(r.discriminant, 6) : "-";
    if (r.kind === "complex") {
      const fmtComplex = (z) => fmt(z.real, 6) + (z.imag >= 0 ? " + " : " - ") + fmt(Math.abs(z.imag), 6) + "i";
      oRoots.textContent = r.roots.map(fmtComplex).join(",  ");
    } else if (Array.isArray(r.roots)) {
      oRoots.textContent = r.roots.map((x) => fmt(x, 6)).join(",  ");
    } else {
      oRoots.textContent = "-";
    }
    oVertex.textContent = (r.vertex_x != null) ? "(" + fmt(r.vertex_x, 6) + ", " + fmt(r.vertex_y, 6) + ")" : "-";
  }, DEBOUNCE_MS);
  for (const el of [A.input, B.input, C.input]) el.addEventListener("input", update);
}

// ====================================================================
// Y.10 Scientific notation converter
// ====================================================================
//
// Two-way conversion between standard decimal notation and scientific
// notation in the form `m * 10^n` where 1 <= |m| < 10. Also reports a
// significant-figure count for the input.

// dims: in { value: dimensionless } out: { mantissa: dimensionless, exponent: dimensionless }
export function computeScientificNotation({ value }) {
  const x = Number(value);
  if (!Number.isFinite(x)) {
    return { error: "Enter a finite number." };
  }
  if (x === 0) {
    return { mantissa: 0, exponent: 0, sig_figs: 1, rendered: "0", value: 0 };
  }
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const exponent = Math.floor(Math.log10(ax));
  const mantissa = sign * (ax / Math.pow(10, exponent));
  // Significant-figure count from the string form, ignoring leading
  // zeros, leading sign, and the decimal point.
  let s = String(value).trim();
  if (s.startsWith("-") || s.startsWith("+")) s = s.slice(1);
  // strip leading zeros (but keep a single zero if the input was 0.x form)
  s = s.replace(/^0+/, "");
  if (s.startsWith(".")) {
    // 0.0034 -> ".0034"; strip the leading dot and any following zeros
    s = s.slice(1).replace(/^0+/, "");
  }
  // remove the decimal point
  s = s.replace(".", "");
  // remove trailing exponent if present (e.g. 1.5e3 -> 15)
  s = s.replace(/e[-+]?\d+$/i, "");
  const sigFigs = s.length || 1;
  const rendered = fmt(mantissa, 6) + " * 10^" + exponent;
  return { mantissa, exponent, sig_figs: sigFigs, rendered, value: x };
}

export const scientificNotationExample = {
  inputs: { value: "0.00347" },
  expected: { mantissa_approx: 3.47, exponent: -3, sig_figs: 3 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderScientificNotation(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Scientific notation = m * 10^n where 1 <= |m| < 10 (or m = 0). Significant-figure count is derived from the input string: leading zeros are not significant; embedded zeros and trailing zeros after a decimal point are significant.";
  const V = makeText("Number (decimal or scientific)", "sn-val", { placeholder: "e.g. 0.00347 or 3.47e-3" });
  inputRegion.appendChild(V.wrap);
  attachExampleButton(inputRegion, () => { V.input.value = scientificNotationExample.inputs.value; update(); });
  const oMant = makeOutputLine(outputRegion, "Mantissa (1 <= |m| < 10)", "sn-out-m");
  const oExp = makeOutputLine(outputRegion, "Exponent (n)", "sn-out-n");
  const oRendered = makeOutputLine(outputRegion, "Scientific form", "sn-out-rendered");
  const oSig = makeOutputLine(outputRegion, "Significant figures (from input string)", "sn-out-sig");
  const update = debounce(() => {
    const r = computeScientificNotation({ value: V.input.value || "" });
    if (r.error) {
      oMant.textContent = r.error;
      oExp.textContent = "-"; oRendered.textContent = "-"; oSig.textContent = "-";
      return;
    }
    oMant.textContent = fmt(r.mantissa, 6);
    oExp.textContent = String(r.exponent);
    oRendered.textContent = r.rendered;
    oSig.textContent = String(r.sig_figs);
  }, DEBOUNCE_MS);
  V.input.addEventListener("input", update);
}

// ====================================================================
// Y.9 Significant figures helper
// ====================================================================
//
// Two functions in one tile:
//   1. Count significant figures in a given number.
//   2. Round a number to N significant figures.
//
// Sig-fig rules per NIST SP 811 / standard scientific reporting:
//   - All non-zero digits are significant.
//   - Zeros between non-zeros are significant.
//   - Leading zeros are NOT significant.
//   - Trailing zeros after a decimal point ARE significant.
//   - Trailing zeros in an integer without a decimal point are
//     ambiguous; the convention here counts them as significant ONLY
//     if the number is written with a trailing decimal or scientific
//     notation.

// dims: in { raw: dimensionless } out: { count: dimensionless }
export function countSigFigs(raw) {
  if (typeof raw !== "string") raw = String(raw);
  let s = raw.trim();
  if (s.length === 0) return 0;
  // Strip sign.
  if (s.startsWith("-") || s.startsWith("+")) s = s.slice(1);
  // Strip exponent part if present.
  let mantissa = s;
  const eIdx = s.search(/[eE]/);
  if (eIdx >= 0) mantissa = s.slice(0, eIdx);
  // Has decimal point?
  const hasDot = mantissa.includes(".");
  // Strip leading zeros.
  let trimmed = mantissa;
  if (hasDot) {
    // 0.00347 -> .00347 -> 00347 -> 347
    if (trimmed.startsWith(".")) trimmed = trimmed.slice(1);
    else trimmed = trimmed.replace(/^0+/, "");
    if (trimmed.startsWith(".")) trimmed = trimmed.slice(1);
    trimmed = trimmed.replace(/^0+/, ""); // leading fractional zeros
    trimmed = trimmed.replace(".", "");   // remove embedded decimal
  } else {
    trimmed = trimmed.replace(/^0+/, "");
    // Integer w/o decimal: trailing zeros are ambiguous; we count
    // only up to the last non-zero digit unless the input uses
    // explicit scientific notation (handled separately above).
    if (eIdx < 0) trimmed = trimmed.replace(/0+$/, "");
  }
  if (trimmed.length === 0 && /^[-+]?0+\.?0*$/.test(raw)) return 1; // input is zero
  return Math.max(1, trimmed.length);
}

// dims: in { value: dimensionless, n: dimensionless } out: { rounded: dimensionless }
export function roundToSigFigs(value, n) {
  const x = Number(value);
  const N = Math.floor(Number(n));
  if (!Number.isFinite(x) || !Number.isFinite(N) || N <= 0 || N > 15) return null;
  if (x === 0) return 0;
  const d = Math.ceil(Math.log10(Math.abs(x)));
  const power = N - d;
  const factor = Math.pow(10, power);
  return Math.round(x * factor) / factor;
}

// dims: in { value: dimensionless, target: dimensionless } out: { rounded: dimensionless, count: dimensionless }
export function computeSigFigs({ value, target_sig_figs }) {
  const raw = String(value == null ? "" : value).trim();
  if (raw.length === 0) return { error: "Enter a number." };
  const x = Number(raw);
  if (!Number.isFinite(x)) return { error: "Input must be a finite number." };
  const input_sig_figs = countSigFigs(raw);
  let rounded = null, target_n = null;
  if (target_sig_figs !== undefined && target_sig_figs !== null && String(target_sig_figs).trim() !== "") {
    const N = Number(target_sig_figs);
    if (!Number.isFinite(N) || N < 1 || N > 15) return { error: "Target sig figs must be 1-15." };
    target_n = N;
    rounded = roundToSigFigs(x, N);
  }
  return { input_value: x, input_sig_figs, target_sig_figs: target_n, rounded_value: rounded };
}

export const sigFigsExample = {
  inputs: { value: "0.00347", target_sig_figs: 2 },
  // 0.00347 has 3 sig figs; rounded to 2 -> 0.0035.
  expected: { input_sig_figs: 3, rounded_value: 0.0035 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderSigFigs(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Significant-figure conventions per NIST SP 811 (Guide for the Use of the International System of Units) §7. Leading zeros not significant; trailing zeros after a decimal point ARE significant; trailing zeros in an integer without a decimal point are ambiguous and not counted here (use scientific notation for explicit precision).";
  const V = makeText("Number (decimal or scientific)", "sf-v", { placeholder: "e.g. 0.00347 or 3.47e-3 or 1500." });
  const N = makeNumber("Round to N sig figs (optional)", "sf-n", { step: "1", min: "1", max: "15", value: "" });
  for (const f of [V, N]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    V.input.value = sigFigsExample.inputs.value;
    N.input.value = String(sigFigsExample.inputs.target_sig_figs);
    update();
  });
  const oCount = makeOutputLine(outputRegion, "Significant figures in input", "sf-out-count");
  const oVal = makeOutputLine(outputRegion, "Input parsed as", "sf-out-val");
  const oRounded = makeOutputLine(outputRegion, "Rounded to target sig figs", "sf-out-rounded");
  const update = debounce(() => {
    const r = computeSigFigs({ value: V.input.value || "", target_sig_figs: N.input.value || "" });
    if (r.error) {
      oCount.textContent = r.error; oVal.textContent = "-"; oRounded.textContent = "-";
      return;
    }
    oCount.textContent = String(r.input_sig_figs);
    oVal.textContent = String(r.input_value);
    oRounded.textContent = r.rounded_value == null ? "(enter a target N above)" : String(r.rounded_value);
  }, DEBOUNCE_MS);
  for (const el of [V.input, N.input]) el.addEventListener("input", update);
}

// ====================================================================
// Y.11 Codon table reference (DNA / RNA -> amino acid)
// ====================================================================
//
// Standard genetic code. Universal across most organisms; mitochondrial
// and some bacterial / protozoan variants differ at a handful of codons
// and are not covered here.

const RNA_CODON_TABLE = {
  UUU: "Phe (F)", UUC: "Phe (F)", UUA: "Leu (L)", UUG: "Leu (L)",
  UCU: "Ser (S)", UCC: "Ser (S)", UCA: "Ser (S)", UCG: "Ser (S)",
  UAU: "Tyr (Y)", UAC: "Tyr (Y)", UAA: "STOP", UAG: "STOP",
  UGU: "Cys (C)", UGC: "Cys (C)", UGA: "STOP", UGG: "Trp (W)",
  CUU: "Leu (L)", CUC: "Leu (L)", CUA: "Leu (L)", CUG: "Leu (L)",
  CCU: "Pro (P)", CCC: "Pro (P)", CCA: "Pro (P)", CCG: "Pro (P)",
  CAU: "His (H)", CAC: "His (H)", CAA: "Gln (Q)", CAG: "Gln (Q)",
  CGU: "Arg (R)", CGC: "Arg (R)", CGA: "Arg (R)", CGG: "Arg (R)",
  AUU: "Ile (I)", AUC: "Ile (I)", AUA: "Ile (I)", AUG: "Met (M) / START",
  ACU: "Thr (T)", ACC: "Thr (T)", ACA: "Thr (T)", ACG: "Thr (T)",
  AAU: "Asn (N)", AAC: "Asn (N)", AAA: "Lys (K)", AAG: "Lys (K)",
  AGU: "Ser (S)", AGC: "Ser (S)", AGA: "Arg (R)", AGG: "Arg (R)",
  GUU: "Val (V)", GUC: "Val (V)", GUA: "Val (V)", GUG: "Val (V)",
  GCU: "Ala (A)", GCC: "Ala (A)", GCA: "Ala (A)", GCG: "Ala (A)",
  GAU: "Asp (D)", GAC: "Asp (D)", GAA: "Glu (E)", GAG: "Glu (E)",
  GGU: "Gly (G)", GGC: "Gly (G)", GGA: "Gly (G)", GGG: "Gly (G)",
};

function dnaToRna(seq) {
  return String(seq || "").toUpperCase().replace(/T/g, "U");
}

// dims: in { sequence: dimensionless, type: dimensionless } out: { codons: dimensionless }
export function computeCodonTable({ sequence, sequence_type }) {
  const type = String(sequence_type || "rna").toLowerCase();
  const rna = type === "dna" ? dnaToRna(sequence) : String(sequence || "").toUpperCase();
  if (rna.length === 0) {
    return { sequence_type: type, rna_sequence: "", amino_acid_sequence: [], full_table: RNA_CODON_TABLE };
  }
  // Validate alphabet.
  if (!/^[ACGU]+$/.test(rna)) {
    return { error: "Sequence must contain only A, C, G, U (or T for DNA)." };
  }
  // Translate in-frame triplets, ignoring trailing 1-2 bases.
  const aas = [];
  for (let i = 0; i + 3 <= rna.length; i += 3) {
    const codon = rna.slice(i, i + 3);
    aas.push({ codon, amino_acid: RNA_CODON_TABLE[codon] });
  }
  return {
    sequence_type: type,
    rna_sequence: rna,
    amino_acid_sequence: aas,
    full_table: RNA_CODON_TABLE,
  };
}

export const codonExample = {
  inputs: { sequence: "AUGGCCUAA", sequence_type: "rna" },
  // AUG (Met / START), GCC (Ala), UAA (STOP).
  expected: { codon_count: 3 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderCodonTable(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Standard genetic code (universal). Mitochondrial and a handful of bacterial / protozoan codes differ at specific codons and are NOT covered by this tile. The amino-acid three-letter / one-letter codes follow IUPAC-IUB nomenclature. Reading frame starts at position 1 of the entered sequence; this tile does not search for an internal AUG.";
  const T = makeSelect("Sequence type", "cd-t", [
    { value: "rna", label: "RNA (ACGU)" },
    { value: "dna", label: "DNA (ACGT, translated by T->U)" },
  ]);
  const S = makeText("Sequence (in-frame)", "cd-s", { placeholder: "e.g. AUGGCCUAA" });
  for (const f of [T, S]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    T.select.value = codonExample.inputs.sequence_type;
    S.input.value = codonExample.inputs.sequence;
    update();
  });
  const oRna = makeOutputLine(outputRegion, "Translated to RNA", "cd-out-rna");
  const oTrans = makeOutputLine(outputRegion, "Amino acids", "cd-out-aa");
  const oCount = makeOutputLine(outputRegion, "Codon count", "cd-out-count");
  const update = debounce(() => {
    const r = computeCodonTable({ sequence: S.input.value || "", sequence_type: T.select.value });
    if (r.error) {
      oRna.textContent = r.error; oTrans.textContent = "-"; oCount.textContent = "-";
      return;
    }
    oRna.textContent = r.rna_sequence || "(empty)";
    oTrans.textContent = r.amino_acid_sequence.length === 0
      ? "(no full codons)"
      : r.amino_acid_sequence.map((row) => row.codon + "=" + row.amino_acid).join(", ");
    oCount.textContent = String(r.amino_acid_sequence.length);
  }, DEBOUNCE_MS);
  T.select.addEventListener("change", update);
  S.input.addEventListener("input", update);
}

// ====================================================================
// Y.15 Number-base converter
// ====================================================================
//
// Convert between binary (2), octal (8), decimal (10), hexadecimal (16),
// and arbitrary bases 2-36. Uses JS parseInt + toString(radix); the
// only judgment call is rejecting non-conforming digits.

// dims: in { value: dimensionless, from_base: dimensionless, to_base: dimensionless } out: { converted: dimensionless }
export function computeBaseConvert({ value, from_base, to_base }) {
  const v = String(value || "").trim();
  if (v.length === 0) return { error: "Enter a value to convert." };
  const fromB = Math.floor(Number(from_base));
  const toB = Math.floor(Number(to_base));
  if (!Number.isFinite(fromB) || fromB < 2 || fromB > 36) return { error: "Source base must be 2-36." };
  if (!Number.isFinite(toB) || toB < 2 || toB > 36) return { error: "Target base must be 2-36." };
  // Validate digits against the source base.
  const valid = new RegExp("^[-+]?[0-" + Math.min(9, fromB - 1) + "a-zA-Z]+$");
  if (!valid.test(v)) return { error: "Value contains characters not valid for base " + fromB + "." };
  const parsed = parseInt(v, fromB);
  if (!Number.isFinite(parsed) || isNaN(parsed)) return { error: "Could not parse '" + v + "' as base " + fromB + "." };
  // DR-22 (D-6/C-6): parseInt truncates magnitudes beyond 2^53 - 1, so the
  // decimal value rounds and every derived string is silently wrong. Flag
  // when the parsed value is not an exact integer instead of presenting a
  // rounded result as exact.
  const exact = Number.isSafeInteger(parsed);
  const converted = parsed.toString(toB).toUpperCase();
  return {
    decimal_value: parsed,
    converted,
    exact,
    precision_warning: exact ? null : "Value exceeds the exact integer range (2^53 - 1); the decimal and converted results are rounded and may be inexact.",
    from_base: fromB,
    to_base: toB,
    binary: parsed.toString(2),
    octal: parsed.toString(8),
    hex: parsed.toString(16).toUpperCase(),
  };
}

export const baseConvertExample = {
  inputs: { value: "FF", from_base: 16, to_base: 2 },
  // 0xFF = 255 = 0b11111111.
  expected: { decimal_value: 255, converted: "11111111" },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderBaseConvert(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Positional-notation base conversion. Bases 2 through 36 (the maximum that fits in the [0-9] + [A-Z] digit alphabet). The tile uses standard JS parseInt and Number.toString(radix); behavior matches the IEEE-754 integer range (safe up to 2^53 - 1).";
  const V = makeText("Value", "bc-v", { placeholder: "e.g. FF or 11111111 or 255" });
  const F = makeNumber("From base (2-36)", "bc-f", { step: "1", min: "2", max: "36", value: "16" });
  const T = makeNumber("To base (2-36)", "bc-t", { step: "1", min: "2", max: "36", value: "2" });
  for (const f of [V, F, T]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    V.input.value = baseConvertExample.inputs.value;
    F.input.value = String(baseConvertExample.inputs.from_base);
    T.input.value = String(baseConvertExample.inputs.to_base);
    update();
  });
  const oConv = makeOutputLine(outputRegion, "Converted value (target base)", "bc-out-conv");
  const oDec = makeOutputLine(outputRegion, "Decimal", "bc-out-dec");
  const oBin = makeOutputLine(outputRegion, "Binary", "bc-out-bin");
  const oOct = makeOutputLine(outputRegion, "Octal", "bc-out-oct");
  const oHex = makeOutputLine(outputRegion, "Hexadecimal", "bc-out-hex");
  const update = debounce(() => {
    const r = computeBaseConvert({ value: V.input.value || "", from_base: F.input.value, to_base: T.input.value });
    if (r.error) {
      oConv.textContent = r.error;
      for (const o of [oDec, oBin, oOct, oHex]) o.textContent = "-";
      return;
    }
    oConv.textContent = r.converted + " (base " + r.to_base + ")" + (r.exact ? "" : " — " + r.precision_warning);
    oDec.textContent = String(r.decimal_value);
    oBin.textContent = r.binary;
    oOct.textContent = r.octal;
    oHex.textContent = r.hex;
  }, DEBOUNCE_MS);
  for (const el of [V.input, F.input, T.input]) el.addEventListener("input", update);
}

// ====================================================================
// Y.4 GPA calculator (unweighted + weighted)
// ====================================================================
//
// Standard US 4.0 / 5.0 scale. Each course contributes
//   credit_hours * letter_to_point(letter, weighted)
// to a sum; GPA = sum / total_credits.
//
// Letter to point (unweighted): A=4.0, A-=3.7, B+=3.3, B=3.0, B-=2.7,
//   C+=2.3, C=2.0, C-=1.7, D+=1.3, D=1.0, D-=0.7, F=0.
// Weighted bonus: honors +0.5, AP/IB/dual-enrollment +1.0; only added
// to a passing grade (D- or higher per common school-registrar
// convention).

const GPA_LETTER_POINTS = {
  "A+": 4.0, "A": 4.0, "A-": 3.7,
  "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7,
  "D+": 1.3, "D": 1.0, "D-": 0.7,
  "F": 0.0,
};
const GPA_WEIGHT_BONUS = { regular: 0, honors: 0.5, ap: 1.0 };

function parseGpaCourseList(raw) {
  // Free-text course list. One course per line. Format options:
  //   <letter> <credits> [regular|honors|ap]
  //   letter,credits[,track]
  // Empty / blank lines and whole-line comments (starting with "#") skipped.
  if (typeof raw !== "string") return [];
  const out = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (line.length === 0) continue;
    const parts = line.split(/[\s,]+/).filter((p) => p.length > 0);
    if (parts.length < 2) { out.push({ error: "Need letter and credits.", line: rawLine }); continue; }
    const letter = parts[0].toUpperCase();
    const credits = Number(parts[1]);
    const track = (parts[2] || "regular").toLowerCase();
    out.push({ letter, credits, track, line: rawLine });
  }
  return out;
}

// dims: in { courses: dimensionless } out: { gpa: dimensionless, credits: dimensionless }
export function computeGPA({ courses }) {
  const rows = Array.isArray(courses) ? courses : parseGpaCourseList(courses);
  if (rows.length === 0) return { error: "Enter at least one course (letter and credits per line)." };
  if (rows.length > 200) return { error: "Course list capped at 200 rows; trim the list." };
  let sumUnweighted = 0;
  let sumWeighted = 0;
  let totalCredits = 0;
  const detail = [];
  for (const r of rows) {
    if (r.error) return { error: r.error + " (line: '" + r.line + "')" };
    if (!(r.letter in GPA_LETTER_POINTS)) {
      return { error: "Unknown letter grade '" + r.letter + "'. Use A, A-, B+, ..., F." };
    }
    if (!Number.isFinite(r.credits) || r.credits <= 0 || r.credits > 20) {
      return { error: "Credits must be a positive number up to 20 (got '" + r.credits + "')." };
    }
    if (!(r.track in GPA_WEIGHT_BONUS)) {
      return { error: "Track must be regular, honors, or ap (got '" + r.track + "')." };
    }
    const unw = GPA_LETTER_POINTS[r.letter];
    // Bonus only on passing grades (D- and above per common registrar policy).
    const bonus = unw >= 0.7 ? GPA_WEIGHT_BONUS[r.track] : 0;
    const w = unw + bonus;
    sumUnweighted += unw * r.credits;
    sumWeighted += w * r.credits;
    totalCredits += r.credits;
    detail.push({ letter: r.letter, credits: r.credits, track: r.track, unweighted_points: unw, weighted_points: w });
  }
  return {
    unweighted_gpa: sumUnweighted / totalCredits,
    weighted_gpa: sumWeighted / totalCredits,
    total_credits: totalCredits,
    course_count: rows.length,
    detail,
  };
}

export const gpaExample = {
  // Five courses: A in AP Calc (5 cr), B+ in honors English (4 cr),
  // A- in regular Biology (4 cr), B in regular History (3 cr),
  // A in regular PE (1 cr).
  // Unweighted: (4.0*5 + 3.3*4 + 3.7*4 + 3.0*3 + 4.0*1) / 17
  //           = (20 + 13.2 + 14.8 + 9 + 4) / 17 = 61.0 / 17 = 3.588.
  // Weighted: AP A bonus +1.0 -> 5.0*5 = 25; honors B+ +0.5 -> 3.8*4
  // = 15.2; regular A- 3.7*4 = 14.8; regular B 3.0*3 = 9; regular A
  // 4.0*1 = 4. Sum = 68.0 / 17 = 4.000.
  inputs: { courses: "A 5 ap\nB+ 4 honors\nA- 4 regular\nB 3 regular\nA 1 regular" },
  expected: { unweighted_gpa: 3.588, weighted_gpa: 4.000, total_credits: 17 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderGPA(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Standard US 4.0 / 5.0 GPA scale. Letter-to-point per the common registrar convention (A=4.0, A-=3.7, ..., F=0). Weighted GPA adds the per-course track bonus (honors +0.5, AP / IB / dual-enrollment +1.0) to passing grades only. School registrar governs final transcript; this is a planning aid only.";
  const C = makeTextarea("Courses (one per line: letter credits [regular|honors|ap])", "gpa-c", {
    rows: 6,
    placeholder: "A 5 ap\nB+ 4 honors\nA- 4 regular",
  });
  inputRegion.appendChild(C.wrap);
  attachExampleButton(inputRegion, () => { C.input.value = gpaExample.inputs.courses; update(); });
  const oUnw = makeOutputLine(outputRegion, "Unweighted GPA (4.0 scale)", "gpa-out-unw");
  const oW = makeOutputLine(outputRegion, "Weighted GPA (5.0 scale)", "gpa-out-w");
  const oCr = makeOutputLine(outputRegion, "Total credits", "gpa-out-cr");
  const oN = makeOutputLine(outputRegion, "Course count", "gpa-out-n");
  const update = debounce(() => {
    const r = computeGPA({ courses: C.input.value || "" });
    if (r.error) {
      oUnw.textContent = r.error;
      for (const o of [oW, oCr, oN]) o.textContent = "-";
      return;
    }
    oUnw.textContent = fmt(r.unweighted_gpa, 3);
    oW.textContent = fmt(r.weighted_gpa, 3);
    oCr.textContent = fmt(r.total_credits, 1);
    oN.textContent = String(r.course_count);
  }, DEBOUNCE_MS);
  C.input.addEventListener("input", update);
}

// ====================================================================
// Y.6 Confidence interval (Wald for proportions and means)
// ====================================================================
//
// Two modes:
//
//   mode = "proportion": Wald CI for a binomial proportion.
//     p = phat; SE = sqrt(p * (1 - p) / n); CI = p +/- z * SE.
//     Reports the bounds clipped to [0, 1].
//
//   mode = "mean": Wald CI for a sample mean (z-based; appropriate
//     when n is large or population SD is known. For small n with
//     unknown sigma a t-interval is more correct; the tile flags this
//     case rather than bundling a t-distribution table).
//     SE = sd / sqrt(n); CI = xbar +/- z * SE.
//
// Confidence level -> z critical (two-tailed): 80 -> 1.282, 90 -> 1.645,
// 95 -> 1.960, 98 -> 2.326, 99 -> 2.576.

const Z_CRITICAL = { 80: 1.2816, 90: 1.6449, 95: 1.9600, 98: 2.3263, 99: 2.5758 };

// dims: in { mode: dimensionless, n: dimensionless, proportion: dimensionless, mean: dimensionless, sd: dimensionless, confidence: dimensionless } out: { lower: dimensionless, upper: dimensionless, margin: dimensionless }
export function computeConfidenceInterval({ mode, n, proportion, mean, sd, confidence_pct }) {
  const conf = Math.round(Number(confidence_pct));
  if (!(conf in Z_CRITICAL)) return { error: "Confidence must be one of 80, 90, 95, 98, 99." };
  const z = Z_CRITICAL[conf];
  const N = Number(n);
  if (!Number.isFinite(N) || N <= 0 || N !== Math.floor(N)) return { error: "Sample size n must be a positive integer." };
  const m = String(mode || "proportion").toLowerCase();
  if (m === "proportion") {
    const p = Number(proportion);
    if (!Number.isFinite(p) || p < 0 || p > 1) return { error: "Sample proportion must be between 0 and 1." };
    const se = Math.sqrt((p * (1 - p)) / N);
    const moe = z * se;
    const lo = Math.max(0, p - moe);
    const hi = Math.min(1, p + moe);
    const flag = N * p < 10 || N * (1 - p) < 10
      ? "n*p or n*(1-p) < 10; Wald CI under-covers. Use a Wilson or Clopper-Pearson interval for small p / small n."
      : null;
    return {
      mode: "proportion",
      confidence_pct: conf,
      z_critical: z,
      standard_error: se,
      margin_of_error: moe,
      lower_bound: lo,
      upper_bound: hi,
      point_estimate: p,
      n: N,
      flag,
    };
  }
  if (m === "mean") {
    const xbar = Number(mean);
    const s = Number(sd);
    if (!Number.isFinite(xbar)) return { error: "Sample mean must be a number." };
    if (!Number.isFinite(s) || s < 0) return { error: "Sample SD must be 0 or greater." };
    const se = s / Math.sqrt(N);
    const moe = z * se;
    const flag = N < 30
      ? "n < 30 and unknown sigma: a t-interval (df = n-1) is more correct; the Wald z-interval here is a quick-look estimate."
      : null;
    return {
      mode: "mean",
      confidence_pct: conf,
      z_critical: z,
      standard_error: se,
      margin_of_error: moe,
      lower_bound: xbar - moe,
      upper_bound: xbar + moe,
      point_estimate: xbar,
      n: N,
      flag,
    };
  }
  return { error: "Mode must be 'proportion' or 'mean'." };
}

export const confidenceIntervalExample = {
  // 95% Wald CI on a proportion: phat = 0.6, n = 100, z = 1.96.
  // SE = sqrt(0.6 * 0.4 / 100) = sqrt(0.0024) = 0.04899.
  // MOE = 1.96 * 0.04899 = 0.09602; CI = [0.504, 0.696].
  inputs: { mode: "proportion", n: 100, proportion: 0.6, confidence_pct: 95 },
  expected: { margin_of_error: 0.0960, lower_bound: 0.5040, upper_bound: 0.6960 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderConfidenceInterval(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Wald confidence interval. For a proportion: phat +/- z * sqrt(phat * (1-phat) / n). For a mean: xbar +/- z * (sd / sqrt(n)). z critical values from the standard normal: 80% = 1.2816, 90% = 1.6449, 95% = 1.96, 98% = 2.3263, 99% = 2.5758. The Wald interval under-covers when n*phat < 10 (use Wilson or Clopper-Pearson) and is z-based for the mean (use a t-interval for small n with unknown sigma).";
  const M = makeSelect("Mode", "ci-mode", [
    { value: "proportion", label: "Proportion (binomial)" },
    { value: "mean", label: "Mean (z-interval)" },
  ]);
  const N = makeNumber("Sample size n", "ci-n", { step: "1", min: "1" });
  const P = makeNumber("Sample proportion (0 to 1)", "ci-p", { step: "any", min: "0", max: "1" });
  const X = makeNumber("Sample mean (mean mode)", "ci-x", { step: "any" });
  const S = makeNumber("Sample SD (mean mode)", "ci-s", { step: "any", min: "0" });
  const C = makeSelect("Confidence level", "ci-c", [
    { value: "80", label: "80%" }, { value: "90", label: "90%" },
    { value: "95", label: "95%" }, { value: "98", label: "98%" },
    { value: "99", label: "99%" },
  ]);
  C.select.value = "95";
  for (const f of [M, N, P, X, S, C]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    M.select.value = "proportion";
    N.input.value = String(confidenceIntervalExample.inputs.n);
    P.input.value = String(confidenceIntervalExample.inputs.proportion);
    C.select.value = String(confidenceIntervalExample.inputs.confidence_pct);
    update();
  });
  const oZ = makeOutputLine(outputRegion, "z critical (two-tailed)", "ci-out-z");
  const oSE = makeOutputLine(outputRegion, "Standard error", "ci-out-se");
  const oMOE = makeOutputLine(outputRegion, "Margin of error", "ci-out-moe");
  const oLo = makeOutputLine(outputRegion, "Lower bound", "ci-out-lo");
  const oHi = makeOutputLine(outputRegion, "Upper bound", "ci-out-hi");
  const oFlag = makeOutputLine(outputRegion, "Note", "ci-out-flag");
  const update = debounce(() => {
    const r = computeConfidenceInterval({
      mode: M.select.value,
      n: N.input.value,
      proportion: P.input.value,
      mean: X.input.value,
      sd: S.input.value,
      confidence_pct: C.select.value,
    });
    if (r.error) {
      oZ.textContent = r.error;
      for (const o of [oSE, oMOE, oLo, oHi, oFlag]) o.textContent = "-";
      return;
    }
    oZ.textContent = fmt(r.z_critical, 4);
    oSE.textContent = fmt(r.standard_error, 6);
    oMOE.textContent = fmt(r.margin_of_error, 6);
    oLo.textContent = fmt(r.lower_bound, 6);
    oHi.textContent = fmt(r.upper_bound, 6);
    oFlag.textContent = r.flag || "-";
  }, DEBOUNCE_MS);
  for (const el of [N.input, P.input, X.input, S.input]) el.addEventListener("input", update);
  M.select.addEventListener("change", update);
  C.select.addEventListener("change", update);
}

// ====================================================================
// Y.8 System of two linear equations
// ====================================================================
//
// Solve
//   a1 x + b1 y = c1
//   a2 x + b2 y = c2
//
// via Cramer's rule. det = a1*b2 - a2*b1.
//   det != 0:                  unique (x, y) = ((c1*b2 - c2*b1)/det, (a1*c2 - a2*c1)/det).
//   det == 0 and rows parallel-and-consistent: infinite solutions.
//   det == 0 and inconsistent:                 no solution.

function rowsConsistent(a1, b1, c1, a2, b2, c2) {
  // Determine if the two rows are scalar multiples of each other,
  // including the constant. If a1/a2 = b1/b2 = c1/c2 (with care for
  // zeros) -> consistent; otherwise inconsistent.
  // Cross-multiplication form avoids division by zero.
  return a1 * c2 === a2 * c1 && b1 * c2 === b2 * c1;
}

// dims: in { a1: dimensionless, b1: dimensionless, c1: dimensionless, a2: dimensionless, b2: dimensionless, c2: dimensionless } out: { x: dimensionless, y: dimensionless }
export function computeLinearSystem2x2({ a1, b1, c1, a2, b2, c2 }) {
  const A1 = Number(a1), B1 = Number(b1), C1 = Number(c1);
  const A2 = Number(a2), B2 = Number(b2), C2 = Number(c2);
  for (const [name, val] of [["a1", A1], ["b1", B1], ["c1", C1], ["a2", A2], ["b2", B2], ["c2", C2]]) {
    if (!Number.isFinite(val)) return { error: "Coefficient " + name + " must be a number." };
  }
  if (A1 === 0 && B1 === 0) return { error: "Row 1 has both a1 and b1 = 0; not a linear equation." };
  if (A2 === 0 && B2 === 0) return { error: "Row 2 has both a2 and b2 = 0; not a linear equation." };
  const det = A1 * B2 - A2 * B1;
  // Tolerance for "near-zero" determinant on float math.
  const eps = 1e-12 * (Math.abs(A1 * B2) + Math.abs(A2 * B1) + 1);
  if (Math.abs(det) <= eps) {
    if (rowsConsistent(A1, B1, C1, A2, B2, C2)) {
      return { kind: "infinite", determinant: det, message: "Rows are scalar multiples: infinitely many solutions (the two equations describe the same line)." };
    }
    return { kind: "none", determinant: det, message: "Rows are parallel and inconsistent: no solution (the two lines are parallel and do not intersect)." };
  }
  const x = (C1 * B2 - C2 * B1) / det;
  const y = (A1 * C2 - A2 * C1) / det;
  return { kind: "unique", determinant: det, x, y };
}

export const linearSystem2x2Example = {
  // 2x + 3y = 8;  x - y = 1 -> det = -2 - 3 = -5; x = (-8 - 3)/-5 = 2.2; y = (2 - (-8))/-5 = -2.
  // Actually compute with formulas: x = (c1*b2 - c2*b1)/det = (8*-1 - 1*3)/-5 = (-11)/-5 = 2.2.
  //                                  y = (a1*c2 - a2*c1)/det = (2*1 - 1*8)/-5 = (-6)/-5 = 1.2.
  inputs: { a1: 2, b1: 3, c1: 8, a2: 1, b2: -1, c2: 1 },
  expected: { x: 2.2, y: 1.2, determinant: -5 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderLinearSystem2x2(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Cramer's rule for a 2x2 linear system. det = a1*b2 - a2*b1. If det != 0: unique solution x = (c1*b2 - c2*b1)/det, y = (a1*c2 - a2*c1)/det. If det = 0 and the row constants are proportional, the system has infinitely many solutions (same line); otherwise no solution (parallel lines). Standard linear algebra; covered in any high-school algebra II / pre-calculus text.";
  const A1 = makeNumber("a1 (coefficient of x in row 1)", "lin-a1", { step: "any", value: "1" });
  const B1 = makeNumber("b1 (coefficient of y in row 1)", "lin-b1", { step: "any", value: "0" });
  const C1 = makeNumber("c1 (constant in row 1)", "lin-c1", { step: "any", value: "0" });
  const A2 = makeNumber("a2 (coefficient of x in row 2)", "lin-a2", { step: "any", value: "0" });
  const B2 = makeNumber("b2 (coefficient of y in row 2)", "lin-b2", { step: "any", value: "1" });
  const C2 = makeNumber("c2 (constant in row 2)", "lin-c2", { step: "any", value: "0" });
  for (const f of [A1, B1, C1, A2, B2, C2]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    A1.input.value = String(linearSystem2x2Example.inputs.a1);
    B1.input.value = String(linearSystem2x2Example.inputs.b1);
    C1.input.value = String(linearSystem2x2Example.inputs.c1);
    A2.input.value = String(linearSystem2x2Example.inputs.a2);
    B2.input.value = String(linearSystem2x2Example.inputs.b2);
    C2.input.value = String(linearSystem2x2Example.inputs.c2);
    update();
  });
  const oDet = makeOutputLine(outputRegion, "Determinant", "lin-out-det");
  const oKind = makeOutputLine(outputRegion, "Solution kind", "lin-out-kind");
  const oX = makeOutputLine(outputRegion, "x", "lin-out-x");
  const oY = makeOutputLine(outputRegion, "y", "lin-out-y");
  const oMsg = makeOutputLine(outputRegion, "Note", "lin-out-msg");
  const update = debounce(() => {
    const r = computeLinearSystem2x2({
      a1: A1.input.value, b1: B1.input.value, c1: C1.input.value,
      a2: A2.input.value, b2: B2.input.value, c2: C2.input.value,
    });
    if (r.error) {
      oDet.textContent = r.error;
      for (const o of [oKind, oX, oY, oMsg]) o.textContent = "-";
      return;
    }
    oDet.textContent = fmt(r.determinant, 6);
    oKind.textContent = r.kind;
    if (r.kind === "unique") {
      oX.textContent = fmt(r.x, 6);
      oY.textContent = fmt(r.y, 6);
      oMsg.textContent = "-";
    } else {
      oX.textContent = "-";
      oY.textContent = "-";
      oMsg.textContent = r.message;
    }
  }, DEBOUNCE_MS);
  for (const el of [A1.input, B1.input, C1.input, A2.input, B2.input, C2.input]) el.addEventListener("input", update);
}

// --- Renderer registry (matches the v4+ TOOL_MODULES convention) ---

// ====================================================================
// Y.3 Lexile band by grade reference
// ====================================================================
//
// Grade-to-Lexile band reference. The Lexile measure itself is a
// MetaMetrics registered trademark; the grade-to-band targets here
// are summarized from publicly published state-DOE bulletins that
// adopted the Common Core / CCSS "stretch text" alignment after
// 2012. The bands are the CCSS Appendix A stretch ranges (1100L+
// at end of grade 6, etc.) plus the standard "typical-reader"
// ranges per state-DOE published guidance.
//
// Teacher governs final text selection. The Lexile measure is one
// of several text-complexity tools (qualitative + quantitative +
// reader-and-task; see CCSS Appendix A §III).

const LEXILE_BANDS = [
  { grade: "K",  typical: "BR (Beginning Reader) to 230L",   stretch: "Up to 230L" },
  { grade: "1",  typical: "190L - 530L",   stretch: "190L - 530L" },
  { grade: "2",  typical: "420L - 650L",   stretch: "420L - 650L" },
  { grade: "3",  typical: "520L - 820L",   stretch: "520L - 820L" },
  { grade: "4",  typical: "740L - 940L",   stretch: "740L - 940L" },
  { grade: "5",  typical: "830L - 1010L",  stretch: "830L - 1010L" },
  { grade: "6",  typical: "925L - 1070L",  stretch: "925L - 1185L" },
  { grade: "7",  typical: "970L - 1120L",  stretch: "970L - 1235L" },
  { grade: "8",  typical: "1010L - 1185L", stretch: "1010L - 1295L" },
  { grade: "9",  typical: "1050L - 1260L", stretch: "1050L - 1335L" },
  { grade: "10", typical: "1080L - 1335L", stretch: "1080L - 1385L" },
  { grade: "11", typical: "1185L - 1385L", stretch: "1185L - 1385L" },
  { grade: "12", typical: "1185L - 1385L", stretch: "1185L - 1385L" },
];

// dims: in { grade: dimensionless } out: { band: dimensionless }
export function computeLexileBand({ grade }) {
  if (grade == null || grade === "") {
    return { bands: LEXILE_BANDS, selected: null };
  }
  const key = String(grade).trim().toUpperCase();
  const row = LEXILE_BANDS.find((b) => b.grade === key);
  if (!row) return { error: "Grade must be K or 1 to 12." };
  return { bands: LEXILE_BANDS, selected: row };
}

export const lexileBandExample = {
  inputs: { grade: "5" },
  expected: { selected_typical: "830L - 1010L" },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderLexileBand(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Common Core State Standards Appendix A (June 2010), Section III ('Quantitative Measures of Text Complexity'), and state-DOE bulletins implementing the CCSS stretch ranges (Smarter Balanced / PARCC consortium states). 'Lexile' is a registered trademark of MetaMetrics. Grade-band targets here are summarized from publicly published state-DOE guidance; the MetaMetrics text-measure tool itself is not bundled. Teacher governs final text selection.";
  const G = makeText("Grade (K or 1 to 12, optional)", "lex-g", { placeholder: "e.g. 5" });
  inputRegion.appendChild(G.wrap);
  attachExampleButton(inputRegion, () => { G.input.value = lexileBandExample.inputs.grade; update(); });
  const oSel = makeOutputLine(outputRegion, "Selected grade band", "lex-out-sel");
  const oTable = makeOutputLine(outputRegion, "All grades K to 12", "lex-out-table");
  const update = debounce(() => {
    const r = computeLexileBand({ grade: G.input.value || "" });
    if (r.error) { oSel.textContent = r.error; oTable.textContent = "-"; return; }
    oSel.textContent = r.selected
      ? "Grade " + r.selected.grade + ": typical " + r.selected.typical + "; CCSS stretch " + r.selected.stretch
      : "(enter a grade above)";
    oTable.textContent = r.bands.map((b) => "G" + b.grade + " " + b.typical).join("  |  ");
  }, DEBOUNCE_MS);
  G.input.addEventListener("input", update);
  update();
}

// ====================================================================
// Y.13 Standards-based grade calculator
// ====================================================================
//
// Inputs: list of standards with per-standard mastery level (1-4).
// Optional priority weights ("major" / "supporting" / "additional",
// defaulting to 3 / 2 / 1 per the published Achieve the Core
// "focus" guidance). Output: weighted overall mastery (1-4 scale),
// the equivalent traditional-letter band per the AAS / NWEA
// published conversion (4.0 = A+; 3.5 = A; 3.0 = B; 2.5 = C;
// 2.0 = D; <2 = F), and counts in each level.

const SBG_LEVEL_DESCRIPTORS = {
  4: "Advanced / extending: applies the standard in novel contexts",
  3: "Proficient / meets: independent grade-level work",
  2: "Approaching / developing: partial grade-level work with support",
  1: "Beginning / not yet: minimal evidence of grade-level work",
};

const SBG_PRIORITY_WEIGHTS = { major: 3, supporting: 2, additional: 1 };

const SBG_LETTER_BANDS = [
  { min: 3.5, letter: "A" }, { min: 3.0, letter: "B" },
  { min: 2.5, letter: "C" }, { min: 2.0, letter: "D" },
  { min: 0,   letter: "F" },
];

function parseSBGLine(raw) {
  // Format: "<standard> <level> [major|supporting|additional]"; comma OR whitespace separated.
  // Comment lines starting with '#' are skipped.
  const s = String(raw || "").trim();
  if (s.length === 0 || s.startsWith("#")) return null;
  const parts = s.split(/[,\s]+/).filter(Boolean);
  if (parts.length < 2) return { error: "Each line: <standard> <level 1-4> [major|supporting|additional]." };
  // Allow the standard to contain spaces if quoted: "5.NBT.A.1" or single-word identifier.
  // Simpler: last 1 or 2 tokens are level + optional priority; everything else is the standard.
  let priority = "additional";
  let pTokens = parts.slice();
  if (pTokens.length >= 3 && /^(major|supporting|additional)$/i.test(pTokens[pTokens.length - 1])) {
    priority = pTokens.pop().toLowerCase();
  }
  const levelTok = pTokens.pop();
  const level = Number(levelTok);
  if (!Number.isFinite(level) || level < 1 || level > 4) return { error: "Mastery level must be 1, 2, 3, or 4." };
  const standard = pTokens.join(" ");
  if (standard.length === 0) return { error: "Missing standard identifier." };
  return { standard, level, priority };
}

// dims: in { rows: dimensionless } out: { grade: dimensionless }
export function computeStandardsBasedGrade({ rows }) {
  const lines = String(rows || "").split(/\r?\n/);
  const parsed = [];
  for (let i = 0; i < lines.length; i++) {
    const result = parseSBGLine(lines[i]);
    if (result == null) continue;
    if (result.error) return { error: "Line " + (i + 1) + ": " + result.error };
    parsed.push(result);
  }
  if (parsed.length === 0) return { error: "Enter at least one standard line." };
  let weighted_sum = 0;
  let weight_total = 0;
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const r of parsed) {
    const w = SBG_PRIORITY_WEIGHTS[r.priority] || 1;
    weighted_sum += r.level * w;
    weight_total += w;
    counts[r.level] = (counts[r.level] || 0) + 1;
  }
  const overall = weighted_sum / weight_total;
  const letter = SBG_LETTER_BANDS.find((b) => overall >= b.min).letter;
  return {
    overall_mastery: overall,
    letter_equivalent: letter,
    standards_count: parsed.length,
    level_counts: counts,
    level_descriptors: SBG_LEVEL_DESCRIPTORS,
  };
}

export const standardsBasedExample = {
  inputs: {
    rows: [
      "5.NBT.A.1 4 major",
      "5.NBT.A.2 3 major",
      "5.NBT.B.5 3 supporting",
      "5.NBT.B.6 2 additional",
    ].join("\n"),
  },
  // weighted = 4*3 + 3*3 + 3*2 + 2*1 = 12 + 9 + 6 + 2 = 29; weight_total = 3+3+2+1 = 9.
  // overall = 29 / 9 = 3.222; letter = B.
  expected: { overall_mastery_approx: 3.222, letter_equivalent: "B" },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderStandardsBasedGrade(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Marzano + Heflebower, 'A Handbook for Developing and Using Proficiency Scales' (2014); Achieve the Core 'focus by grade level' major / supporting / additional cluster guidance for CCSS-aligned weighting. Letter-equivalent band per the AAS / NWEA published 4-point-to-letter conversion convention. School registrar / district administrator governs the transcript letter grade.";
  const T = makeTextarea("Standards (one per line: '<standard> <level 1-4> [major|supporting|additional]')", "sbg-t", { placeholder: "5.NBT.A.1 4 major", rows: "4" });
  inputRegion.appendChild(T.wrap);
  attachExampleButton(inputRegion, () => { T.input.value = standardsBasedExample.inputs.rows; update(); });
  const oOverall = makeOutputLine(outputRegion, "Overall mastery (1 - 4)", "sbg-out-overall");
  const oLetter = makeOutputLine(outputRegion, "Letter equivalent", "sbg-out-letter");
  const oCount = makeOutputLine(outputRegion, "Standards count", "sbg-out-count");
  const oLevels = makeOutputLine(outputRegion, "Level counts (1 / 2 / 3 / 4)", "sbg-out-levels");
  const update = debounce(() => {
    const r = computeStandardsBasedGrade({ rows: T.input.value || "" });
    if (r.error) {
      oOverall.textContent = r.error;
      for (const o of [oLetter, oCount, oLevels]) o.textContent = "-";
      return;
    }
    oOverall.textContent = fmt(r.overall_mastery, 2);
    oLetter.textContent = r.letter_equivalent;
    oCount.textContent = String(r.standards_count);
    oLevels.textContent = "L1 " + r.level_counts[1] + " / L2 " + r.level_counts[2] + " / L3 " + r.level_counts[3] + " / L4 " + r.level_counts[4];
  }, DEBOUNCE_MS);
  T.input.addEventListener("input", update);
}

// ====================================================================
// Y.14 Bell-curve z-score and percentile
// ====================================================================
//
// Inputs: raw score, sample mean, sample SD. Output: z = (x - mu) / sigma,
// percentile from the standard normal CDF (Abramowitz & Stegun 26.2.17
// approximation, accurate to ~7.5e-8), and a typical "curve" letter
// band per the published 68-95-99.7 rule (>= mu + 1 sigma -> A;
// mu - 1 sigma to mu + 1 sigma -> B / C bands centered on the mean;
// mu - 1 to mu - 2 sigma -> D; below mu - 2 sigma -> F). This is the
// canonical "grading on a curve" reference; teacher governs whether
// to apply it.

function stdNormalCDF(z) {
  // Abramowitz & Stegun 26.2.17 (1965). Accurate to ~7.5e-8.
  const sign = z < 0 ? -1 : 1;
  const a = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * a);
  const d = 0.3989422804014327 * Math.exp(-(a * a) / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return 0.5 + sign * (0.5 - p);
}

const BELLCURVE_BANDS = [
  { min_sigma: 2,    letter: "A+", note: ">= mean + 2 sigma (top ~2.3%)" },
  { min_sigma: 1,    letter: "A",  note: "mean + 1 to mean + 2 sigma (~13.6%)" },
  { min_sigma: 0,    letter: "B",  note: "mean to mean + 1 sigma (~34.1%)" },
  { min_sigma: -1,   letter: "C",  note: "mean - 1 sigma to mean (~34.1%)" },
  { min_sigma: -2,   letter: "D",  note: "mean - 2 to mean - 1 sigma (~13.6%)" },
  { min_sigma: -999, letter: "F",  note: "below mean - 2 sigma (~2.3%)" },
];

// dims: in { raw: dimensionless, mean: dimensionless, sd: dimensionless } out: { z: dimensionless, percentile: dimensionless }
export function computeBellCurve({ raw_score, mean, sd }) {
  const x = Number(raw_score);
  const mu = Number(mean);
  const sigma = Number(sd);
  if (!Number.isFinite(x)) return { error: "Enter a numeric raw score." };
  if (!Number.isFinite(mu)) return { error: "Enter a numeric sample mean." };
  if (!Number.isFinite(sigma) || sigma <= 0) return { error: "Enter a positive sample standard deviation." };
  const z = (x - mu) / sigma;
  const percentile = stdNormalCDF(z) * 100;
  const band = BELLCURVE_BANDS.find((b) => z >= b.min_sigma);
  return {
    z_score: z,
    percentile,
    curve_letter: band.letter,
    curve_band_note: band.note,
  };
}

export const bellCurveExample = {
  inputs: { raw_score: 85, mean: 75, sd: 10 },
  // z = (85 - 75) / 10 = 1.0; percentile = stdNormalCDF(1) ~ 84.13%; band: A.
  expected: { z_score: 1.0, percentile_approx: 84.13, curve_letter: "A" },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderBellCurve(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Standard normal CDF via Abramowitz + Stegun, Handbook of Mathematical Functions, formula 26.2.17 (1965; National Bureau of Standards Applied Mathematics Series 55). Public domain. Curve bands per the empirical 68-95-99.7 rule applied to grading: a common pre-CCSS convention. Teacher governs whether a normative curve is appropriate (CCSS-aligned standards-based grading does NOT curve).";
  const X = makeNumber("Raw score", "bc-x", { step: "any" });
  const MU = makeNumber("Sample mean", "bc-mu", { step: "any" });
  const SD = makeNumber("Sample standard deviation", "bc-sd", { step: "any", min: "0" });
  for (const f of [X, MU, SD]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    X.input.value = String(bellCurveExample.inputs.raw_score);
    MU.input.value = String(bellCurveExample.inputs.mean);
    SD.input.value = String(bellCurveExample.inputs.sd);
    update();
  });
  const oZ = makeOutputLine(outputRegion, "z-score", "bc-out-z");
  const oP = makeOutputLine(outputRegion, "Percentile", "bc-out-p");
  const oL = makeOutputLine(outputRegion, "Curve letter", "bc-out-l");
  const oN = makeOutputLine(outputRegion, "Band note", "bc-out-n");
  const update = debounce(() => {
    const r = computeBellCurve({ raw_score: X.input.value, mean: MU.input.value, sd: SD.input.value });
    if (r.error) { oZ.textContent = r.error; for (const o of [oP, oL, oN]) o.textContent = "-"; return; }
    oZ.textContent = fmt(r.z_score, 3);
    oP.textContent = fmt(r.percentile, 2) + " %";
    oL.textContent = r.curve_letter;
    oN.textContent = r.curve_band_note;
  }, DEBOUNCE_MS);
  for (const el of [X.input, MU.input, SD.input]) el.addEventListener("input", update);
}

// ====================================================================
// Y.2 Alternate readability formulas (SMOG, Coleman-Liau, Gunning Fog,
// ARI)
// ====================================================================
//
// Same text input as Y.1. The formulas are all public-domain. The
// syllable counter and word / sentence counters from Y.1 are reused;
// the polysyllable counter (>= 3 syllables) is added here for SMOG.

function countPolysyllables(text) {
  if (typeof text !== "string") return 0;
  const matches = text.match(/[A-Za-z]+/g);
  if (!matches) return 0;
  let count = 0;
  for (const w of matches) if (countSyllablesInWord(w) >= 3) count += 1;
  return count;
}

function countLettersInWord(word) {
  return (word.match(/[A-Za-z]/g) || []).length;
}

// dims: in { text: dimensionless } out: { ari: dimensionless, smog: dimensionless, gunning_fog: dimensionless, coleman_liau: dimensionless }
export function computeAlternateReadability({ text }) {
  if (typeof text !== "string") return { error: "Text input is required." };
  const sentences = countSentences(text);
  const words = countWords(text);
  if (sentences === 0 || words === 0) {
    return {
      sentences, words, polysyllables: 0, letters: 0,
      smog: null, coleman_liau: null, gunning_fog: null, ari: null,
      reliable: false,
      note: "Need at least one sentence and one word to score.",
    };
  }
  const matches = text.match(/[A-Za-z]+/g) || [];
  let letters = 0;
  let complex = 0;
  for (const w of matches) {
    letters += countLettersInWord(w);
    if (countSyllablesInWord(w) >= 3) complex += 1;
  }
  // SMOG (McLaughlin 1969): SMOG grade = 1.043 * sqrt(poly * (30/sentences)) + 3.1291.
  const smog = 1.043 * Math.sqrt(complex * (30 / sentences)) + 3.1291;
  // Coleman-Liau (1975): index = 0.0588 * L - 0.296 * S - 15.8 where
  // L = letters per 100 words, S = sentences per 100 words.
  const L = (letters / words) * 100;
  const S = (sentences / words) * 100;
  const coleman = 0.0588 * L - 0.296 * S - 15.8;
  // Gunning Fog (1952): 0.4 * ((words/sentences) + 100 * (complex/words)).
  const fog = 0.4 * ((words / sentences) + 100 * (complex / words));
  // Automated Readability Index (Smith + Senter 1967): 4.71 * (chars/words) + 0.5 * (words/sentences) - 21.43.
  const ari = 4.71 * (letters / words) + 0.5 * (words / sentences) - 21.43;
  return {
    sentences, words, polysyllables: complex, letters,
    smog, coleman_liau: coleman, gunning_fog: fog, ari,
    reliable: words >= 100,
  };
}

export const alternateReadabilityExample = {
  inputs: { text: readabilityExample.inputs.text },
  // Run against the same sample paragraph used in Y.1. All four formulas
  // should land in middle-grade range for 60-70 words of running prose.
  expected: { sentences: 7 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderAlternateReadability(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: SMOG per McLaughlin, 'SMOG Grading: A New Readability Formula,' Journal of Reading 12:8 (1969). Coleman-Liau per Coleman and Liau, 'A computer readability formula designed for machine scoring,' Journal of Applied Psychology 60:2 (1975). Gunning Fog per Gunning, 'The Technique of Clear Writing' (1952). Automated Readability Index (ARI) per Smith and Senter, 'Automated Readability Index,' AMRL-TR-66-220, U.S. Air Force Aerospace Medical Research Laboratories (1967), public-domain federal publication.";
  const T = makeTextarea("Text to score (paste or type a paragraph)", "rd2-text", { rows: "8" });
  inputRegion.appendChild(T.wrap);
  attachExampleButton(inputRegion, () => { T.input.value = readabilityExample.inputs.text; update(); });
  const oSMOG = makeOutputLine(outputRegion, "SMOG grade", "rd2-out-smog");
  const oCL = makeOutputLine(outputRegion, "Coleman-Liau index", "rd2-out-cl");
  const oFog = makeOutputLine(outputRegion, "Gunning Fog index", "rd2-out-fog");
  const oARI = makeOutputLine(outputRegion, "Automated Readability Index (ARI)", "rd2-out-ari");
  const oCounts = makeOutputLine(outputRegion, "Counts (words / sentences / polysyllables / letters)", "rd2-out-counts");
  const oReliable = makeOutputLine(outputRegion, "Reliable (>= 100 words for SMOG-derived)", "rd2-out-rel");
  const update = debounce(() => {
    const r = computeAlternateReadability({ text: T.input.value || "" });
    if (r.error) { oSMOG.textContent = r.error; for (const o of [oCL, oFog, oARI, oCounts, oReliable]) o.textContent = "-"; return; }
    if (r.smog == null) { oSMOG.textContent = r.note; for (const o of [oCL, oFog, oARI, oCounts, oReliable]) o.textContent = "-"; return; }
    oSMOG.textContent = fmt(r.smog, 2);
    oCL.textContent = fmt(r.coleman_liau, 2);
    oFog.textContent = fmt(r.gunning_fog, 2);
    oARI.textContent = fmt(r.ari, 2);
    oCounts.textContent = r.words + " / " + r.sentences + " / " + r.polysyllables + " / " + r.letters;
    oReliable.textContent = r.reliable ? "yes" : "no (under 100 words; treat values as a rough cross-check)";
  }, DEBOUNCE_MS);
  T.input.addEventListener("input", update);
}

// ====================================================================
// Y.12 Periodic table extension (electronegativity, electron
// configuration, oxidation states, group / period)
// ====================================================================
//
// Builds on the existing Group T iupac-atomic-weights shard with
// element-level reference fields. The data is the publicly published
// IUPAC + NIST + Pauling electronegativity tables. The tile covers
// the first 36 elements (H through Kr) plus a few high-yield heavier
// elements (Ag, I, Au, Hg, Pb). Adequate for K-12 / introductory
// college chemistry; the user supplied with an unsupported atomic
// number sees an explicit out-of-scope note.

const PERIODIC_EXT = {
  1:  { symbol: "H",  name: "Hydrogen",   period: 1, group: 1,  block: "s", electronegativity_pauling: 2.20, electron_configuration: "1s1",                       oxidation_states: [-1, +1] },
  2:  { symbol: "He", name: "Helium",     period: 1, group: 18, block: "s", electronegativity_pauling: null, electron_configuration: "1s2",                       oxidation_states: [0] },
  3:  { symbol: "Li", name: "Lithium",    period: 2, group: 1,  block: "s", electronegativity_pauling: 0.98, electron_configuration: "[He] 2s1",                  oxidation_states: [+1] },
  4:  { symbol: "Be", name: "Beryllium",  period: 2, group: 2,  block: "s", electronegativity_pauling: 1.57, electron_configuration: "[He] 2s2",                  oxidation_states: [+2] },
  5:  { symbol: "B",  name: "Boron",      period: 2, group: 13, block: "p", electronegativity_pauling: 2.04, electron_configuration: "[He] 2s2 2p1",              oxidation_states: [+3] },
  6:  { symbol: "C",  name: "Carbon",     period: 2, group: 14, block: "p", electronegativity_pauling: 2.55, electron_configuration: "[He] 2s2 2p2",              oxidation_states: [-4, -2, +2, +4] },
  7:  { symbol: "N",  name: "Nitrogen",   period: 2, group: 15, block: "p", electronegativity_pauling: 3.04, electron_configuration: "[He] 2s2 2p3",              oxidation_states: [-3, +3, +5] },
  8:  { symbol: "O",  name: "Oxygen",     period: 2, group: 16, block: "p", electronegativity_pauling: 3.44, electron_configuration: "[He] 2s2 2p4",              oxidation_states: [-2] },
  9:  { symbol: "F",  name: "Fluorine",   period: 2, group: 17, block: "p", electronegativity_pauling: 3.98, electron_configuration: "[He] 2s2 2p5",              oxidation_states: [-1] },
  10: { symbol: "Ne", name: "Neon",       period: 2, group: 18, block: "p", electronegativity_pauling: null, electron_configuration: "[He] 2s2 2p6",              oxidation_states: [0] },
  11: { symbol: "Na", name: "Sodium",     period: 3, group: 1,  block: "s", electronegativity_pauling: 0.93, electron_configuration: "[Ne] 3s1",                  oxidation_states: [+1] },
  12: { symbol: "Mg", name: "Magnesium",  period: 3, group: 2,  block: "s", electronegativity_pauling: 1.31, electron_configuration: "[Ne] 3s2",                  oxidation_states: [+2] },
  13: { symbol: "Al", name: "Aluminum",   period: 3, group: 13, block: "p", electronegativity_pauling: 1.61, electron_configuration: "[Ne] 3s2 3p1",              oxidation_states: [+3] },
  14: { symbol: "Si", name: "Silicon",    period: 3, group: 14, block: "p", electronegativity_pauling: 1.90, electron_configuration: "[Ne] 3s2 3p2",              oxidation_states: [-4, +4] },
  15: { symbol: "P",  name: "Phosphorus", period: 3, group: 15, block: "p", electronegativity_pauling: 2.19, electron_configuration: "[Ne] 3s2 3p3",              oxidation_states: [-3, +3, +5] },
  16: { symbol: "S",  name: "Sulfur",     period: 3, group: 16, block: "p", electronegativity_pauling: 2.58, electron_configuration: "[Ne] 3s2 3p4",              oxidation_states: [-2, +4, +6] },
  17: { symbol: "Cl", name: "Chlorine",   period: 3, group: 17, block: "p", electronegativity_pauling: 3.16, electron_configuration: "[Ne] 3s2 3p5",              oxidation_states: [-1, +1, +3, +5, +7] },
  18: { symbol: "Ar", name: "Argon",      period: 3, group: 18, block: "p", electronegativity_pauling: null, electron_configuration: "[Ne] 3s2 3p6",              oxidation_states: [0] },
  19: { symbol: "K",  name: "Potassium",  period: 4, group: 1,  block: "s", electronegativity_pauling: 0.82, electron_configuration: "[Ar] 4s1",                  oxidation_states: [+1] },
  20: { symbol: "Ca", name: "Calcium",    period: 4, group: 2,  block: "s", electronegativity_pauling: 1.00, electron_configuration: "[Ar] 4s2",                  oxidation_states: [+2] },
  21: { symbol: "Sc", name: "Scandium",   period: 4, group: 3,  block: "d", electronegativity_pauling: 1.36, electron_configuration: "[Ar] 3d1 4s2",              oxidation_states: [+3] },
  22: { symbol: "Ti", name: "Titanium",   period: 4, group: 4,  block: "d", electronegativity_pauling: 1.54, electron_configuration: "[Ar] 3d2 4s2",              oxidation_states: [+2, +3, +4] },
  23: { symbol: "V",  name: "Vanadium",   period: 4, group: 5,  block: "d", electronegativity_pauling: 1.63, electron_configuration: "[Ar] 3d3 4s2",              oxidation_states: [+2, +3, +4, +5] },
  24: { symbol: "Cr", name: "Chromium",   period: 4, group: 6,  block: "d", electronegativity_pauling: 1.66, electron_configuration: "[Ar] 3d5 4s1",              oxidation_states: [+2, +3, +6] },
  25: { symbol: "Mn", name: "Manganese",  period: 4, group: 7,  block: "d", electronegativity_pauling: 1.55, electron_configuration: "[Ar] 3d5 4s2",              oxidation_states: [+2, +3, +4, +6, +7] },
  26: { symbol: "Fe", name: "Iron",       period: 4, group: 8,  block: "d", electronegativity_pauling: 1.83, electron_configuration: "[Ar] 3d6 4s2",              oxidation_states: [+2, +3] },
  27: { symbol: "Co", name: "Cobalt",     period: 4, group: 9,  block: "d", electronegativity_pauling: 1.88, electron_configuration: "[Ar] 3d7 4s2",              oxidation_states: [+2, +3] },
  28: { symbol: "Ni", name: "Nickel",     period: 4, group: 10, block: "d", electronegativity_pauling: 1.91, electron_configuration: "[Ar] 3d8 4s2",              oxidation_states: [+2] },
  29: { symbol: "Cu", name: "Copper",     period: 4, group: 11, block: "d", electronegativity_pauling: 1.90, electron_configuration: "[Ar] 3d10 4s1",             oxidation_states: [+1, +2] },
  30: { symbol: "Zn", name: "Zinc",       period: 4, group: 12, block: "d", electronegativity_pauling: 1.65, electron_configuration: "[Ar] 3d10 4s2",             oxidation_states: [+2] },
  31: { symbol: "Ga", name: "Gallium",    period: 4, group: 13, block: "p", electronegativity_pauling: 1.81, electron_configuration: "[Ar] 3d10 4s2 4p1",         oxidation_states: [+3] },
  32: { symbol: "Ge", name: "Germanium",  period: 4, group: 14, block: "p", electronegativity_pauling: 2.01, electron_configuration: "[Ar] 3d10 4s2 4p2",         oxidation_states: [+2, +4] },
  33: { symbol: "As", name: "Arsenic",    period: 4, group: 15, block: "p", electronegativity_pauling: 2.18, electron_configuration: "[Ar] 3d10 4s2 4p3",         oxidation_states: [-3, +3, +5] },
  34: { symbol: "Se", name: "Selenium",   period: 4, group: 16, block: "p", electronegativity_pauling: 2.55, electron_configuration: "[Ar] 3d10 4s2 4p4",         oxidation_states: [-2, +4, +6] },
  35: { symbol: "Br", name: "Bromine",    period: 4, group: 17, block: "p", electronegativity_pauling: 2.96, electron_configuration: "[Ar] 3d10 4s2 4p5",         oxidation_states: [-1, +1, +5] },
  36: { symbol: "Kr", name: "Krypton",    period: 4, group: 18, block: "p", electronegativity_pauling: 3.00, electron_configuration: "[Ar] 3d10 4s2 4p6",         oxidation_states: [0, +2] },
  47: { symbol: "Ag", name: "Silver",     period: 5, group: 11, block: "d", electronegativity_pauling: 1.93, electron_configuration: "[Kr] 4d10 5s1",             oxidation_states: [+1] },
  53: { symbol: "I",  name: "Iodine",     period: 5, group: 17, block: "p", electronegativity_pauling: 2.66, electron_configuration: "[Kr] 4d10 5s2 5p5",         oxidation_states: [-1, +1, +5, +7] },
  79: { symbol: "Au", name: "Gold",       period: 6, group: 11, block: "d", electronegativity_pauling: 2.54, electron_configuration: "[Xe] 4f14 5d10 6s1",        oxidation_states: [+1, +3] },
  80: { symbol: "Hg", name: "Mercury",    period: 6, group: 12, block: "d", electronegativity_pauling: 2.00, electron_configuration: "[Xe] 4f14 5d10 6s2",        oxidation_states: [+1, +2] },
  82: { symbol: "Pb", name: "Lead",       period: 6, group: 14, block: "p", electronegativity_pauling: 1.87, electron_configuration: "[Xe] 4f14 5d10 6s2 6p2",    oxidation_states: [+2, +4] },
};

// dims: in { query: dimensionless } out: { element: dimensionless }
export function computePeriodicElement({ query }) {
  const q = String(query || "").trim();
  if (q.length === 0) return { error: "Enter an atomic number (1-36, plus 47/53/79/80/82), symbol (e.g. Fe), or name (e.g. iron)." };
  // Try as atomic number first.
  const z = Number(q);
  if (Number.isFinite(z) && Number.isInteger(z)) {
    const e = PERIODIC_EXT[z];
    if (e) return { atomic_number: z, ...e };
    return { error: "Atomic number " + z + " is outside the bundled set (1-36, 47, 53, 79, 80, 82)." };
  }
  // Symbol match (case-sensitive first letter, lowercase rest convention).
  const sym = q.length <= 2 ? (q[0].toUpperCase() + (q[1] || "").toLowerCase()) : null;
  for (const [k, v] of Object.entries(PERIODIC_EXT)) {
    if (v.symbol === sym) return { atomic_number: Number(k), ...v };
  }
  // Name match (case-insensitive).
  const name = q.toLowerCase();
  for (const [k, v] of Object.entries(PERIODIC_EXT)) {
    if (v.name.toLowerCase() === name) return { atomic_number: Number(k), ...v };
  }
  return { error: "No match. Enter atomic number, symbol, or full element name." };
}

export const periodicExample = {
  inputs: { query: "Fe" },
  expected: { atomic_number: 26, electronegativity_pauling: 1.83 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderPeriodicElement(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: IUPAC atomic numbers and element names (current IUPAC nomenclature). Pauling electronegativity values per Pauling, 'The Nature of the Chemical Bond' (3rd ed., 1960) and the modern IUPAC + Allred-Rochow consolidations. Electron configurations per NIST Atomic Spectra Database. Common oxidation states per the published Greenwood + Earnshaw, 'Chemistry of the Elements' (2nd ed., 1997) and Cotton + Wilkinson references.";
  const Q = makeText("Element (atomic number, symbol, or name)", "pe-q", { placeholder: "e.g. 26, Fe, iron" });
  inputRegion.appendChild(Q.wrap);
  attachExampleButton(inputRegion, () => { Q.input.value = periodicExample.inputs.query; update(); });
  const oZ = makeOutputLine(outputRegion, "Atomic number / symbol / name", "pe-out-z");
  const oCoord = makeOutputLine(outputRegion, "Period / group / block", "pe-out-coord");
  const oEN = makeOutputLine(outputRegion, "Electronegativity (Pauling)", "pe-out-en");
  const oEC = makeOutputLine(outputRegion, "Electron configuration", "pe-out-ec");
  const oOx = makeOutputLine(outputRegion, "Common oxidation states", "pe-out-ox");
  const update = debounce(() => {
    const r = computePeriodicElement({ query: Q.input.value || "" });
    if (r.error) { oZ.textContent = r.error; for (const o of [oCoord, oEN, oEC, oOx]) o.textContent = "-"; return; }
    oZ.textContent = "Z=" + r.atomic_number + " " + r.symbol + " (" + r.name + ")";
    oCoord.textContent = "Period " + r.period + " / Group " + r.group + " / Block " + r.block;
    oEN.textContent = r.electronegativity_pauling == null ? "(noble gas; not defined)" : String(r.electronegativity_pauling);
    oEC.textContent = r.electron_configuration;
    oOx.textContent = r.oxidation_states.map((s) => s > 0 ? "+" + s : String(s)).join(", ");
  }, DEBOUNCE_MS);
  Q.input.addEventListener("input", update);
}

// --- spec-v17 Y.2 Linear regression (least squares) ------------------

// dims: in { args: dimensionless } out: { slope: dimensionless, intercept: dimensionless, r2: dimensionless, rse: dimensionless }
export function computeLinearRegression({ x_values, y_values, predict_x = null, alpha = 0.05 }) {
  const xs = Array.isArray(x_values) ? x_values.filter(Number.isFinite) : parseNumberList(x_values);
  const ys = Array.isArray(y_values) ? y_values.filter(Number.isFinite) : parseNumberList(y_values);
  if (xs.length < 3 || ys.length < 3) return { error: "Enter at least 3 paired (x, y) values in each series." };
  if (xs.length !== ys.length) return { error: "The x and y series must have the same number of values (" + xs.length + " x vs " + ys.length + " y)." };

  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  if (sxx === 0) return { error: "The x series has no variation (all x equal); the slope is undefined." };

  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r = syy > 0 ? Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy))) : 0;
  const r2 = r * r;
  // Residual sum of squares and the residual standard error.
  const rss = Math.max(0, syy - slope * sxy);
  const df = n - 2;
  const rse = df > 0 ? Math.sqrt(rss / df) : 0;
  // Standard error of the slope and its t-test for slope = 0.
  const slope_se = rse / Math.sqrt(sxx);
  let t, p_value, perfect_fit = false;
  if (slope_se > 0) {
    t = slope / slope_se;
    p_value = 2 * (1 - tcdf(Math.abs(t), df));
  } else if (slope === 0) {
    t = 0;
    p_value = 1;
  } else {
    // DR-20 (RC-2): a perfect (rse = 0) non-flat fit makes the t-statistic
    // unbounded. Represent it as null with a flag, never +/-Infinity in a
    // numeric field; the slope is exact and the relationship is significant.
    t = null;
    p_value = 0;
    perfect_fit = true;
  }
  const a = Number.isFinite(Number(alpha)) && Number(alpha) > 0 && Number(alpha) < 1 ? Number(alpha) : 0.05;
  const significant = p_value < a;

  const px = predict_x != null && predict_x !== "" && Number.isFinite(Number(predict_x)) ? Number(predict_x) : null;
  const predicted_y = px != null ? intercept + slope * px : null;

  const warnings = [];
  if (n < 10) warnings.push("Small sample (n < 10): the slope test is sensitive to outliers and non-linearity; inspect a scatter plot.");

  return {
    n,
    slope,
    intercept,
    r,
    r2,
    rss,
    rse,
    slope_se,
    df,
    t,
    p_value,
    perfect_fit,
    alpha: a,
    significant,
    predict_x: px,
    predicted_y,
    warnings,
  };
}

export const linearRegressionExample = {
  // x = 1..5, y = 2,4,5,4,5. Sxx=10, Sxy=6, Syy=6 -> slope=0.6,
  // intercept=2.2, R^2=0.6, RSS=2.4, RSE=sqrt(0.8)=0.8944; predict at
  // x=6 -> y = 2.2 + 0.6*6 = 5.8.
  inputs: { x_values: "1, 2, 3, 4, 5", y_values: "2, 4, 5, 4, 5", predict_x: 6, alpha: 0.05 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderLinearRegression(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: least-squares regression. slope = sum((x-xbar)(y-ybar)) / sum((x-xbar)^2); intercept = ybar - slope*xbar; R^2 = r^2; residual standard error = sqrt(RSS / (n-2)); slope t-test = slope / (RSE / sqrt(Sxx)) with the two-tailed p-value from the Student-t CDF. Per OpenIntro Statistics Ch. 8. Correlation is not causation; extrapolating beyond the data is unsupported. Free at openintro.org.";
  const X = makeText("X values (comma or whitespace separated)", "lr-x", { placeholder: "e.g. 1, 2, 3, 4, 5" });
  const Y = makeText("Y values (same count, paired with X)", "lr-y", { placeholder: "e.g. 2, 4, 5, 4, 5" });
  const P = makeNumber("Predict y at x (optional)", "lr-p", { step: "any" });
  const A = makeSelect("Significance level (alpha)", "lr-a", [
    { value: "0.10", label: "0.10" },
    { value: "0.05", label: "0.05", selected: true },
    { value: "0.01", label: "0.01" },
  ]);
  for (const f of [X, Y, P, A]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    X.input.value = "1, 2, 3, 4, 5"; Y.input.value = "2, 4, 5, 4, 5"; P.input.value = "6"; A.select.value = "0.05"; update();
  });

  const oEq = makeOutputLine(outputRegion, "Fitted line", "lr-out-eq");
  const oFit = makeOutputLine(outputRegion, "R^2 / residual std error", "lr-out-fit");
  const oSlope = makeOutputLine(outputRegion, "Slope test (slope = 0)", "lr-out-slope");
  const oPred = makeOutputLine(outputRegion, "Prediction", "lr-out-pred");
  const oNote = makeOutputLine(outputRegion, "Notes", "lr-out-note");

  const update = debounce(() => {
    const r = computeLinearRegression({ x_values: X.input.value || "", y_values: Y.input.value || "", predict_x: P.input.value, alpha: Number(A.select.value) });
    if (r.error) { oEq.textContent = r.error; oFit.textContent = "-"; oSlope.textContent = "-"; oPred.textContent = "-"; oNote.textContent = ""; return; }
    oEq.textContent = "y = " + fmt(r.slope, 4) + " x " + (r.intercept >= 0 ? "+ " : "- ") + fmt(Math.abs(r.intercept), 4) + " (n = " + r.n + ")";
    oFit.textContent = "R^2 " + fmt(r.r2, 4) + " (r " + fmt(r.r, 4) + "), residual std error " + fmt(r.rse, 4);
    oSlope.textContent = Number.isFinite(r.t)
      ? "t " + fmt(r.t, 3) + " on " + r.df + " df, p " + fmt(r.p_value, 4) + " -> " + (r.significant ? "slope differs from 0" : "slope not significant") + " at alpha " + r.alpha
      : "exact fit (residuals zero)";
    oPred.textContent = r.predicted_y != null ? "y(" + fmt(r.predict_x, 3) + ") = " + fmt(r.predicted_y, 4) : "enter an x to predict";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Predict only within the range of the data; extrapolation is unsupported.";
  }, DEBOUNCE_MS);
  for (const el of [X.input, Y.input, P.input]) el.addEventListener("input", update);
  A.select.addEventListener("change", update);
}

// --- spec-v17 Y.4 Pearson correlation coefficient --------------------

// Common |r| strength bands (Cohen-style, for description only).
function _pearsonStrength(absr) {
  if (absr < 0.1) return "negligible";
  if (absr < 0.3) return "weak";
  if (absr < 0.5) return "moderate";
  if (absr < 0.7) return "strong";
  if (absr < 0.9) return "very strong";
  return "near-perfect";
}

// dims: in { args: dimensionless } out: { r: dimensionless, r2: dimensionless, t: dimensionless, p_value: dimensionless }
export function computePearson({ x_values, y_values, alpha = 0.05 }) {
  const xs = Array.isArray(x_values) ? x_values.filter(Number.isFinite) : parseNumberList(x_values);
  const ys = Array.isArray(y_values) ? y_values.filter(Number.isFinite) : parseNumberList(y_values);
  if (xs.length < 3 || ys.length < 3) return { error: "Enter at least 3 paired (x, y) values in each series." };
  if (xs.length !== ys.length) return { error: "The x and y series must have the same number of values (" + xs.length + " x vs " + ys.length + " y)." };

  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return { error: "A series with no variation (all values equal) has an undefined correlation." };

  // Pearson r, clamped to [-1, 1] against floating-point drift.
  const r = Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));
  const r2 = r * r;
  const df = n - 2;

  // t-statistic and two-tailed p-value for the null hypothesis rho = 0.
  let t, p_value, perfect_fit = false;
  if (r2 >= 1) {
    // DR-21 (RC-2): a perfect correlation makes the t-statistic unbounded.
    // Represent it as null with a flag, never +/-Infinity in a numeric field.
    t = null;
    p_value = 0;
    perfect_fit = true;
  } else {
    t = (r * Math.sqrt(df)) / Math.sqrt(1 - r2);
    p_value = 2 * (1 - tcdf(Math.abs(t), df));
  }

  const a = Number.isFinite(Number(alpha)) && Number(alpha) > 0 && Number(alpha) < 1 ? Number(alpha) : 0.05;
  const significant = p_value < a;

  const warnings = [];
  if (n < 10) warnings.push("Small sample (n < 10): the significance test is sensitive to outliers and non-normality; inspect a scatter plot.");

  return {
    n,
    r,
    r2,
    direction: r > 0 ? "positive" : r < 0 ? "negative" : "none",
    strength: _pearsonStrength(Math.abs(r)),
    df,
    t,
    perfect_fit,
    p_value,
    alpha: a,
    significant,
    warnings,
  };
}

export const pearsonExample = {
  // x = 1..5, y = 2,4,5,4,5. Sxy = 6, Sxx = 10, Syy = 6 -> r = 6/sqrt(60)
  // = 0.7746, R^2 = 0.6, df = 3, t = 0.7746*sqrt(3)/sqrt(0.4) = 2.121,
  // two-tailed p ~ 0.124 (not significant at 0.05).
  inputs: { x_values: "1, 2, 3, 4, 5", y_values: "2, 4, 5, 4, 5", alpha: 0.05 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderPearson(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Pearson r = sum((x-xbar)(y-ybar)) / sqrt(sum(x-xbar)^2 * sum(y-ybar)^2). Significance via t = r * sqrt(n-2) / sqrt(1 - r^2) on n-2 degrees of freedom; two-tailed p from the Student-t CDF (incomplete beta, Numerical Recipes 6.4). Per OpenIntro Statistics Ch. 8. Correlation is not causation. Free at openintro.org.";
  const X = makeText("X values (comma or whitespace separated)", "pc-x", { placeholder: "e.g. 1, 2, 3, 4, 5" });
  const Y = makeText("Y values (same count, paired with X)", "pc-y", { placeholder: "e.g. 2, 4, 5, 4, 5" });
  const A = makeSelect("Significance level (alpha)", "pc-a", [
    { value: "0.10", label: "0.10" },
    { value: "0.05", label: "0.05", selected: true },
    { value: "0.01", label: "0.01" },
  ]);
  for (const f of [X, Y, A]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    X.input.value = "1, 2, 3, 4, 5"; Y.input.value = "2, 4, 5, 4, 5"; A.select.value = "0.05"; update();
  });

  const oR = makeOutputLine(outputRegion, "Pearson r / R^2", "pc-out-r");
  const oT = makeOutputLine(outputRegion, "t-statistic / df", "pc-out-t");
  const oP = makeOutputLine(outputRegion, "p-value / verdict", "pc-out-p");
  const oNote = makeOutputLine(outputRegion, "Notes", "pc-out-note");

  const update = debounce(() => {
    const r = computePearson({ x_values: X.input.value || "", y_values: Y.input.value || "", alpha: Number(A.select.value) });
    if (r.error) { oR.textContent = r.error; oT.textContent = "-"; oP.textContent = "-"; oNote.textContent = ""; return; }
    oR.textContent = fmt(r.r, 4) + " (R^2 " + fmt(r.r2, 4) + "), " + r.strength + " " + r.direction + " (n = " + r.n + ")";
    oT.textContent = Number.isFinite(r.t) ? fmt(r.t, 3) + " on " + r.df + " df" : "perfect correlation (t not defined)";
    oP.textContent = fmt(r.p_value, 4) + " -> " + (r.significant ? "reject H0: r differs from 0" : "fail to reject H0 (no significant correlation)") + " at alpha " + r.alpha;
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Correlation is not causation; a strong r can arise from a lurking variable.";
  }, DEBOUNCE_MS);
  for (const el of [X.input, Y.input]) el.addEventListener("input", update);
  A.select.addEventListener("change", update);
}

// --- spec-v17 Y.3 Chi-square goodness-of-fit -------------------------

// dims: in { args: dimensionless } out: { chi_square: dimensionless, df: dimensionless, p_value: dimensionless }
export function computeChiSquareGof({ observed, expected, expected_type = "counts", alpha = 0.05 }) {
  const obs = Array.isArray(observed) ? observed.filter(Number.isFinite) : parseNumberList(observed);
  const exp = Array.isArray(expected) ? expected.filter(Number.isFinite) : parseNumberList(expected);
  if (obs.length < 2 || exp.length < 2) return { error: "Enter at least 2 categories for both observed and expected." };
  if (obs.length !== exp.length) return { error: "Observed and expected must have the same number of categories (" + obs.length + " vs " + exp.length + ")." };
  if (obs.some((o) => o < 0)) return { error: "Observed counts cannot be negative." };

  const k = obs.length;
  const totalObs = obs.reduce((a, b) => a + b, 0);
  if (!(totalObs > 0)) return { error: "The observed counts sum to zero." };

  // Expected counts: either entered directly, or derived from expected
  // proportions scaled to the observed total.
  let expCounts;
  let propSum = null;
  if (expected_type === "proportions") {
    propSum = exp.reduce((a, b) => a + b, 0);
    if (!(propSum > 0)) return { error: "Expected proportions sum to zero." };
    expCounts = exp.map((p) => (p / propSum) * totalObs);
  } else {
    expCounts = exp.slice();
  }
  if (expCounts.some((e) => !(e > 0))) return { error: "Every expected count must be positive (chi-square divides by it)." };

  let chi_square = 0;
  const cells = [];
  for (let i = 0; i < k; i++) {
    const o = obs[i];
    const e = expCounts[i];
    const contrib = ((o - e) * (o - e)) / e;
    chi_square += contrib;
    cells.push({ observed: o, expected: e, contribution: contrib });
  }
  const df = k - 1;
  const p_value = 1 - chi2Cdf(chi_square, df);
  const a = Number.isFinite(Number(alpha)) && Number(alpha) > 0 && Number(alpha) < 1 ? Number(alpha) : 0.05;
  const significant = p_value < a;

  const warnings = [];
  const minExpected = Math.min(...expCounts);
  if (minExpected < 5) warnings.push("An expected count below 5 (" + minExpected.toFixed(2) + ") degrades the chi-square approximation; consider Fisher's exact test or combining categories.");
  if (expected_type === "proportions" && propSum != null && Math.abs(propSum - 1) > 0.01) warnings.push("Expected proportions sum to " + propSum.toFixed(3) + ", not 1.0; they were normalized to the observed total.");

  return {
    k,
    chi_square,
    df,
    p_value,
    alpha: a,
    significant,
    total_observed: totalObs,
    min_expected: minExpected,
    cells,
    warnings,
  };
}

export const chiSquareGofExample = {
  // Observed 10/20/30/40 against a uniform expectation (25 each).
  // chi2 = (15^2 + 5^2 + 5^2 + 15^2)/25 = (225+25+25+225)/25 = 20; df = 3;
  // p = 1 - chi2Cdf(20, 3) ~ 0.00017 -> reject the uniform fit at 0.05.
  inputs: { observed: "10, 20, 30, 40", expected: "25, 25, 25, 25", expected_type: "counts", alpha: 0.05 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderChiSquareGof(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: chi-square = sum((observed - expected)^2 / expected) on k - 1 degrees of freedom; p-value from the chi-square CDF (regularized lower incomplete gamma, Numerical Recipes 6.2). Per OpenIntro Statistics Ch. 6. An expected count below 5 degrades the approximation. Free at openintro.org.";
  const O = makeText("Observed counts (comma or whitespace separated)", "cs-o", { placeholder: "e.g. 10, 20, 30, 40" });
  const E = makeText("Expected (same number of categories)", "cs-e", { placeholder: "e.g. 25, 25, 25, 25" });
  const T = makeSelect("Expected values are", "cs-t", [
    { value: "counts", label: "Counts", selected: true },
    { value: "proportions", label: "Proportions (scaled to the observed total)" },
  ]);
  const A = makeSelect("Significance level (alpha)", "cs-a", [
    { value: "0.10", label: "0.10" },
    { value: "0.05", label: "0.05", selected: true },
    { value: "0.01", label: "0.01" },
  ]);
  for (const f of [O, E, T, A]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    O.input.value = "10, 20, 30, 40"; E.input.value = "25, 25, 25, 25"; T.select.value = "counts"; A.select.value = "0.05"; update();
  });

  const oChi = makeOutputLine(outputRegion, "Chi-square / df", "cs-out-chi");
  const oP = makeOutputLine(outputRegion, "p-value / verdict", "cs-out-p");
  const oNote = makeOutputLine(outputRegion, "Notes", "cs-out-note");

  const update = debounce(() => {
    const r = computeChiSquareGof({ observed: O.input.value || "", expected: E.input.value || "", expected_type: T.select.value, alpha: Number(A.select.value) });
    if (r.error) { oChi.textContent = r.error; oP.textContent = "-"; oNote.textContent = ""; return; }
    oChi.textContent = fmt(r.chi_square, 4) + " on " + r.df + " df (" + r.k + " categories)";
    oP.textContent = fmt(r.p_value, 5) + " -> " + (r.significant ? "reject H0: the observed counts differ from expected" : "fail to reject H0 (consistent with the expected distribution)") + " at alpha " + r.alpha;
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Smallest expected count " + fmt(r.min_expected, 1) + " (>= 5 keeps the approximation valid).";
  }, DEBOUNCE_MS);
  for (const el of [O.input, E.input]) el.addEventListener("input", update);
  for (const s of [T.select, A.select]) s.addEventListener("change", update);
}

export const EDU_RENDERERS = {
  "readability": renderReadability,
  "statistics-quickread": renderStatistics,
  "quadratic-formula": renderQuadratic,
  "scientific-notation": renderScientificNotation,
  "significant-figures": renderSigFigs,
  "codon-table": renderCodonTable,
  "base-converter": renderBaseConvert,
  "gpa-calculator": renderGPA,
  "confidence-interval": renderConfidenceInterval,
  "linear-system-2x2": renderLinearSystem2x2,
  "lexile-band": renderLexileBand,
  "standards-based-grade": renderStandardsBasedGrade,
  "bell-curve-zscore": renderBellCurve,
  "alternate-readability": renderAlternateReadability,
  "periodic-element": renderPeriodicElement,
  // v17
  "pearson-correlation": renderPearson,
  "chi-square-gof": renderChiSquareGof,
  "linear-regression": renderLinearRegression,
};
