// Unit tests for calc-edu.js (spec-v12 Group Y, utility Y.1
// Flesch-Kincaid readability). The math is the exact published
// formula; the syllable counter is a deterministic vowel-cluster
// heuristic that admits ~5 percent edge-case variance against a
// dictionary count. Tests assert the formula directly and bound
// the syllable count within the known range.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  countSentences,
  countWords,
  countSyllablesInWord,
  countSyllables,
  computeReadability,
  readabilityExample,
  computeStatistics,
  statisticsExample,
  computeQuadratic,
  quadraticExample,
  computeScientificNotation,
  scientificNotationExample,
  countSigFigs,
  roundToSigFigs,
  computeSigFigs,
  sigFigsExample,
  computeCodonTable,
  codonExample,
  computeBaseConvert,
  baseConvertExample,
  EDU_RENDERERS,
} from "../../calc-edu.js";

test("countSentences: terminal punctuation only", () => {
  assert.equal(countSentences("Hello. World."), 2);
  assert.equal(countSentences("One. Two! Three?"), 3);
  assert.equal(countSentences("No terminator"), 1);
  assert.equal(countSentences(""), 0);
  assert.equal(countSentences("   "), 0);
});

test("countSentences: tolerates duplicate terminators", () => {
  // "Wait!! What?!" is counted as a single segmentation event per
  // terminator-run, yielding two sentences.
  assert.equal(countSentences("Wait!! What?!"), 2);
});

test("countWords: letters only, apostrophes preserved", () => {
  assert.equal(countWords("Hello, world."), 2);
  assert.equal(countWords("It's a test."), 3);
  assert.equal(countWords("3.14 is pi"), 2); // digits excluded
  assert.equal(countWords(""), 0);
});

test("countSyllablesInWord: vowel-cluster heuristic", () => {
  // Single-syllable: cat, dog, run.
  assert.equal(countSyllablesInWord("cat"), 1);
  assert.equal(countSyllablesInWord("dog"), 1);
  assert.equal(countSyllablesInWord("run"), 1);
  // Two-syllable: running (run-ning), happy (hap-py).
  assert.equal(countSyllablesInWord("running"), 2);
  assert.equal(countSyllablesInWord("happy"), 2);
  // Silent-e: rate -> 1, mate -> 1, mode -> 1.
  assert.equal(countSyllablesInWord("rate"), 1);
  assert.equal(countSyllablesInWord("mode"), 1);
  // -le after consonant keeps the e (table -> ta-ble = 2).
  assert.equal(countSyllablesInWord("table"), 2);
  // Floor at 1 even for short edge cases.
  assert.equal(countSyllablesInWord("a"), 1);
  assert.equal(countSyllablesInWord("I"), 1);
  // Empty / non-string is 0.
  assert.equal(countSyllablesInWord(""), 0);
  assert.equal(countSyllablesInWord(null), 0);
});

test("countSyllables: sums across words", () => {
  assert.equal(countSyllables("cat dog"), 2);
  assert.equal(countSyllables("running quickly"), 4); // run-ning quick-ly
});

test("computeReadability: Kincaid 1975 single-sentence worked example", () => {
  // Hand-computed: "The quick brown fox jumps." => 5 words, 1 sentence.
  // Syllables: the(1) quick(1) brown(1) fox(1) jumps(1) = 5. wps=5, spw=1.
  // FKGL = 0.39*5 + 11.8*1 - 15.59 = 1.95 + 11.8 - 15.59 = -1.84.
  // FRE  = 206.835 - 1.015*5 - 84.6*1 = 206.835 - 5.075 - 84.6 = 117.16.
  const r = computeReadability({ text: "The quick brown fox jumps." });
  assert.equal(r.sentences, 1);
  assert.equal(r.words, 5);
  assert.equal(r.syllables, 5);
  assert.ok(Math.abs(r.flesch_kincaid_grade_level - (-1.84)) < 0.01, "FKGL " + r.flesch_kincaid_grade_level);
  assert.ok(Math.abs(r.flesch_reading_ease - 117.16) < 0.01, "FRE " + r.flesch_reading_ease);
  assert.equal(r.reliable, false);
});

test("computeReadability: bundled example paragraph scores in expected bands", () => {
  const r = computeReadability(readabilityExample.inputs);
  const e = readabilityExample.expected;
  assert.equal(r.sentences, e.sentences);
  assert.ok(r.words >= e.words_min && r.words <= e.words_max, "words " + r.words);
  assert.ok(r.flesch_kincaid_grade_level >= e.fkgl_min && r.flesch_kincaid_grade_level <= e.fkgl_max,
    "FKGL " + r.flesch_kincaid_grade_level);
  assert.ok(r.flesch_reading_ease >= e.fre_min && r.flesch_reading_ease <= e.fre_max,
    "FRE " + r.flesch_reading_ease);
  assert.equal(r.reliable, true);
});

test("computeReadability: empty text returns zero scores + reliable=false", () => {
  const r = computeReadability({ text: "" });
  assert.equal(r.sentences, 0);
  assert.equal(r.words, 0);
  assert.equal(r.flesch_kincaid_grade_level, null);
  assert.equal(r.reliable, false);
});

test("computeReadability: short text marked unreliable but still scored", () => {
  const r = computeReadability({ text: "Cat sat." });
  assert.equal(r.sentences, 1);
  assert.equal(r.words, 2);
  assert.ok(typeof r.flesch_kincaid_grade_level === "number");
  assert.equal(r.reliable, false);
});

test("computeReadability: non-string input rejected", () => {
  const r = computeReadability({ text: null });
  assert.ok(r.error);
});

test("computeReadability: FRE inversely correlated with FKGL on the same text", () => {
  // Simple text: short words, short sentences -> high FRE, low FKGL.
  const easy = computeReadability({ text: "Cat. Dog. Bird. Fish. Run. Jump. Eat. Sleep. Go. Stop." });
  // Complex text: long words, long sentences -> low FRE, high FKGL.
  const hard = computeReadability({
    text:
      "Communications infrastructure typically necessitates redundancy mechanisms in mission-critical configurations. " +
      "Reliability engineering practitioners systematically evaluate component-level failure probabilities against composite-system availability targets.",
  });
  assert.ok(hard.flesch_kincaid_grade_level > easy.flesch_kincaid_grade_level,
    "hard FKGL " + hard.flesch_kincaid_grade_level + " > easy FKGL " + easy.flesch_kincaid_grade_level);
  assert.ok(hard.flesch_reading_ease < easy.flesch_reading_ease,
    "hard FRE " + hard.flesch_reading_ease + " < easy FRE " + easy.flesch_reading_ease);
});

test("readability renderer exposed in EDU_RENDERERS", async () => {
  const mod = await import("../../calc-edu.js");
  assert.ok(typeof mod.EDU_RENDERERS.readability === "function",
    "renderReadability must be registered in EDU_RENDERERS");
});

// --- Y.5 Statistics quick-read ---

test("computeStatistics: Wikipedia worked example 2,4,4,4,5,5,7,9", () => {
  const r = computeStatistics(statisticsExample.inputs);
  assert.equal(r.count, 8);
  assert.equal(r.sum, 40);
  assert.equal(r.mean, 5);
  assert.equal(r.median, 4.5);
  assert.deepEqual(r.mode, [4]);
  assert.equal(r.min, 2);
  assert.equal(r.max, 9);
  assert.equal(r.range, 7);
  assert.ok(Math.abs(r.sd_sample - 2.138) < 0.005, "sample SD " + r.sd_sample);
  assert.ok(Math.abs(r.sd_population - 2.0) < 0.005, "population SD " + r.sd_population);
});

test("computeStatistics: empty input rejected", () => {
  const r = computeStatistics({ values: "" });
  assert.ok(r.error);
});

test("computeStatistics: tokenizer skips non-numeric, accepts whitespace + comma separators", () => {
  const r = computeStatistics({ values: "1, 2  3\tfoo 4" });
  assert.equal(r.count, 4);
  assert.equal(r.sum, 10);
});

test("computeStatistics: no mode when every value is unique", () => {
  const r = computeStatistics({ values: "1, 2, 3, 4, 5" });
  assert.deepEqual(r.mode, []);
});

test("computeStatistics: even-length median is midpoint of the two middle sorted values", () => {
  const r = computeStatistics({ values: "1, 3, 5, 8" });
  assert.equal(r.median, 4);
});

test("computeStatistics: sample SD undefined for n=1 returns 0 (no Bessel correction available)", () => {
  const r = computeStatistics({ values: "42" });
  assert.equal(r.count, 1);
  assert.equal(r.sd_sample, 0);
  assert.equal(r.sd_population, 0);
});

// --- Y.7 Quadratic formula ---

test("computeQuadratic: real distinct roots for x^2 - 3x + 2 = 0", () => {
  const r = computeQuadratic(quadraticExample.inputs);
  assert.equal(r.kind, "real-distinct");
  assert.equal(r.discriminant, 1);
  assert.deepEqual(r.roots.sort((a, b) => a - b), [1, 2]);
  assert.equal(r.vertex_x, 1.5);
  assert.equal(r.vertex_y, -0.25);
});

test("computeQuadratic: real double root when discriminant is zero", () => {
  // x^2 - 2x + 1 = 0 -> (x-1)^2 -> x = 1 (double)
  const r = computeQuadratic({ a: 1, b: -2, c: 1 });
  assert.equal(r.kind, "real-double");
  assert.equal(r.discriminant, 0);
  assert.deepEqual(r.roots, [1]);
});

test("computeQuadratic: complex conjugate pair when discriminant is negative", () => {
  // x^2 + 1 = 0 -> x = +-i
  const r = computeQuadratic({ a: 1, b: 0, c: 1 });
  assert.equal(r.kind, "complex");
  assert.equal(r.discriminant, -4);
  assert.equal(r.roots.length, 2);
  // Real parts are zero (allow +-0 since JS distinguishes them).
  for (const z of r.roots) assert.ok(Math.abs(z.real) < 1e-9, "real part " + z.real);
  assert.ok(Math.abs(Math.abs(r.roots[0].imag) - 1) < 1e-9);
  assert.ok(Math.abs(Math.abs(r.roots[1].imag) - 1) < 1e-9);
  // The two roots are complex conjugates.
  assert.ok(r.roots[0].imag === -r.roots[1].imag);
});

test("computeQuadratic: a=0 degenerates to linear; b=c=0 reports infinite/none", () => {
  const lin = computeQuadratic({ a: 0, b: 2, c: -4 });
  assert.equal(lin.kind, "linear");
  assert.deepEqual(lin.roots, [2]);
  const inf = computeQuadratic({ a: 0, b: 0, c: 0 });
  assert.equal(inf.kind, "infinite");
  const none = computeQuadratic({ a: 0, b: 0, c: 1 });
  assert.equal(none.kind, "none");
});

test("computeQuadratic: non-numeric input rejected", () => {
  const r = computeQuadratic({ a: "bad", b: 0, c: 0 });
  assert.ok(r.error);
});

// --- Y.10 Scientific notation ---

test("computeScientificNotation: 0.00347 -> 3.47e-3 with 3 sig figs", () => {
  const r = computeScientificNotation(scientificNotationExample.inputs);
  assert.ok(Math.abs(r.mantissa - 3.47) < 1e-9);
  assert.equal(r.exponent, -3);
  assert.equal(r.sig_figs, 3);
});

test("computeScientificNotation: round-trip preserves the value", () => {
  for (const v of ["12345", "0.0001", "1.5e10", "-42.7", "1"]) {
    const r = computeScientificNotation({ value: v });
    const reconstructed = r.mantissa * Math.pow(10, r.exponent);
    assert.ok(Math.abs(reconstructed - Number(v)) / Math.abs(Number(v) || 1) < 1e-9, v);
  }
});

test("computeScientificNotation: zero handled specially", () => {
  const r = computeScientificNotation({ value: "0" });
  assert.equal(r.mantissa, 0);
  assert.equal(r.exponent, 0);
  assert.equal(r.sig_figs, 1);
});

test("computeScientificNotation: leading zeros are not significant; trailing zeros after a decimal are", () => {
  const r1 = computeScientificNotation({ value: "0.00100" });
  assert.equal(r1.sig_figs, 3);
  const r2 = computeScientificNotation({ value: "1.500" });
  assert.equal(r2.sig_figs, 4);
});

test("computeScientificNotation: non-finite input rejected", () => {
  const r = computeScientificNotation({ value: "not a number" });
  assert.ok(r.error);
});

// --- Y.9 Significant figures ---

test("countSigFigs: leading zeros not significant; trailing zeros after decimal are", () => {
  assert.equal(countSigFigs("0.00347"), 3);
  assert.equal(countSigFigs("3.47"), 3);
  assert.equal(countSigFigs("0.00100"), 3);
  assert.equal(countSigFigs("1.500"), 4);
  assert.equal(countSigFigs("1500"), 2);  // trailing-zero-in-integer ambiguity: not counted
  assert.equal(countSigFigs("12345"), 5);
  assert.equal(countSigFigs("0"), 1);
});

test("countSigFigs: scientific notation uses the mantissa digits", () => {
  assert.equal(countSigFigs("3.47e-3"), 3);
  assert.equal(countSigFigs("1.500e3"), 4);
});

test("roundToSigFigs: standard cases", () => {
  assert.equal(roundToSigFigs(0.00347, 2), 0.0035);
  assert.equal(roundToSigFigs(12345, 3), 12300);
  assert.equal(roundToSigFigs(1.4999, 2), 1.5);
  assert.equal(roundToSigFigs(0, 3), 0);
});

test("computeSigFigs: worked example 0.00347 -> 3 sig figs, rounded to 2 = 0.0035", () => {
  const r = computeSigFigs(sigFigsExample.inputs);
  assert.equal(r.input_sig_figs, 3);
  assert.ok(Math.abs(r.rounded_value - 0.0035) < 1e-9);
});

test("computeSigFigs: no target sig figs returns null rounded_value (count only)", () => {
  const r = computeSigFigs({ value: "1.500" });
  assert.equal(r.input_sig_figs, 4);
  assert.equal(r.rounded_value, null);
});

test("computeSigFigs: invalid input or out-of-range target rejected", () => {
  assert.ok(computeSigFigs({ value: "" }).error);
  assert.ok(computeSigFigs({ value: "not a number" }).error);
  assert.ok(computeSigFigs({ value: "100", target_sig_figs: 0 }).error);
  assert.ok(computeSigFigs({ value: "100", target_sig_figs: 20 }).error);
});

// --- Y.11 Codon table ---

test("computeCodonTable: AUGGCCUAA -> Met/START, Ala, STOP", () => {
  const r = computeCodonTable(codonExample.inputs);
  assert.equal(r.amino_acid_sequence.length, 3);
  assert.match(r.amino_acid_sequence[0].amino_acid, /Met|START/);
  assert.match(r.amino_acid_sequence[1].amino_acid, /Ala/);
  assert.equal(r.amino_acid_sequence[2].amino_acid, "STOP");
});

test("computeCodonTable: DNA input is translated T->U before lookup", () => {
  const r = computeCodonTable({ sequence: "ATGGCCTAA", sequence_type: "dna" });
  assert.equal(r.rna_sequence, "AUGGCCUAA");
  assert.equal(r.amino_acid_sequence.length, 3);
});

test("computeCodonTable: trailing 1-2 partial-codon bases ignored", () => {
  const r = computeCodonTable({ sequence: "AUGGC", sequence_type: "rna" });
  assert.equal(r.amino_acid_sequence.length, 1);  // only AUG translates; GC dropped
});

test("computeCodonTable: invalid character rejected", () => {
  assert.ok(computeCodonTable({ sequence: "AUGZ", sequence_type: "rna" }).error);
});

test("computeCodonTable: empty input returns full reference table", () => {
  const r = computeCodonTable({ sequence: "", sequence_type: "rna" });
  assert.equal(r.amino_acid_sequence.length, 0);
  assert.ok(r.full_table && Object.keys(r.full_table).length === 64);
});

// --- Y.15 Base converter ---

test("computeBaseConvert: hex FF -> binary 11111111 (= decimal 255)", () => {
  const r = computeBaseConvert(baseConvertExample.inputs);
  assert.equal(r.decimal_value, 255);
  assert.equal(r.converted, "11111111");
});

test("computeBaseConvert: round-trip preserves the value across base pairs", () => {
  // 12345 in base 10 -> base 7 -> base 10 round-trip.
  const r1 = computeBaseConvert({ value: "12345", from_base: 10, to_base: 7 });
  const r2 = computeBaseConvert({ value: r1.converted, from_base: 7, to_base: 10 });
  assert.equal(r2.decimal_value, 12345);
});

test("computeBaseConvert: shows binary / octal / hex side cross-checks", () => {
  const r = computeBaseConvert({ value: "255", from_base: 10, to_base: 16 });
  assert.equal(r.binary, "11111111");
  assert.equal(r.octal, "377");
  assert.equal(r.hex, "FF");
});

test("computeBaseConvert: invalid digit-for-base / out-of-range base rejected", () => {
  assert.ok(computeBaseConvert({ value: "FF", from_base: 10, to_base: 2 }).error);
  assert.ok(computeBaseConvert({ value: "12", from_base: 1, to_base: 10 }).error);
  assert.ok(computeBaseConvert({ value: "12", from_base: 10, to_base: 40 }).error);
});

test("all seven Group Y renderers exposed in EDU_RENDERERS", () => {
  for (const key of ["readability", "statistics-quickread", "quadratic-formula", "scientific-notation", "significant-figures", "codon-table", "base-converter"]) {
    assert.ok(typeof EDU_RENDERERS[key] === "function", key + " must be registered");
  }
});
