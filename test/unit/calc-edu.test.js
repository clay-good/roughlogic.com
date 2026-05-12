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
