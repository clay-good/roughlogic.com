// Education assessment and statistical-inference calculators split from
// calc-edu.js by spec-v1875. Calculator behavior and citations are unchanged.

import {
  DEBOUNCE_MS,
  debounce,
  makeNumber,
  makeText,
  makeSelect,
  makeTextarea,
  makeOutputLine,
  attachExampleButton,
  fmt,
} from "./ui-fields.js";
import { tcdf, chi2Cdf, betainc, normCdf } from "./pure-math.js";

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

// Common |r| strength bands (Cohen-style, for description only).
function _pearsonStrength(absr) {
  if (absr < 0.1) return "negligible";
  if (absr < 0.3) return "weak";
  if (absr < 0.5) return "moderate";
  if (absr < 0.7) return "strong";
  if (absr < 0.9) return "very strong";
  return "near-perfect";
}

export const EDUCATIONASSESSMENT_RENDERERS = {};

// ===========================================================================
// spec-v20 Phase Y - three new educator tiles (v18/v21 tile contract).
// ===========================================================================

// --- v20 Y.1: Final-exam grade needed (`final-grade-needed`) ---
// needed = (target - current*(1 - w_f)) / w_f, w_f = final_weight/100.
// dims: in { current_pct: dimensionless, final_weight_pct: dimensionless, target_pct: dimensionless } out: { needed_pct: dimensionless, max_pct: dimensionless }
export function computeFinalGradeNeeded({ current_pct = 0, final_weight_pct = 0, target_pct = 0 } = {}) {
  const current = Number(current_pct);
  const fwPct = Number(final_weight_pct);
  const target = Number(target_pct);
  if (![current, fwPct, target].every(Number.isFinite)) return { error: "All inputs must be finite percentages." };
  if (!(fwPct > 0 && fwPct <= 100)) return { error: "Final weight must be in (0, 100]%." };
  const wf = fwPct / 100;
  const needed = (target - current * (1 - wf)) / wf;
  const maxGrade = current * (1 - wf) + 100 * wf;
  const minGrade = current * (1 - wf);
  let status = "achievable";
  let neededClamped = needed;
  if (needed > 100) status = "not achievable with a perfect final";
  else if (needed < 0) { status = "already secured"; neededClamped = 0; }
  return {
    needed_pct: Number.isFinite(neededClamped) ? neededClamped : null,
    needed_raw_pct: Number.isFinite(needed) ? needed : null,
    max_pct: Number.isFinite(maxGrade) ? maxGrade : null,
    min_pct: Number.isFinite(minGrade) ? minGrade : null,
    status,
    note: "Weighted-average arithmetic. Needed above 100% is not achievable with a perfect final; needed below 0 means the target is already secured. The instructor's gradebook governs.",
  };
}
export const finalGradeNeededExample = { inputs: { current_pct: 88, final_weight_pct: 25, target_pct: 90 } };

function renderFinalGradeNeeded(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard weighted-average arithmetic (the common syllabus weighted-category convention); the instructor's gradebook governs. Pure public algebra.";
  const current = makeNumber("Current grade (%)", "fgn-cur", { step: "any" });
  const fw = makeNumber("Final exam weight (%)", "fgn-fw", { step: "any", min: "0", max: "100" });
  const target = makeNumber("Target grade (%)", "fgn-target", { step: "any" });
  for (const f of [current, fw, target]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { current.input.value = "88"; fw.input.value = "25"; target.input.value = "90"; update(); });
  const oNeeded = makeOutputLine(outputRegion, "Needed final score", "fgn-out-needed");
  const oRange = makeOutputLine(outputRegion, "Max / min possible grade", "fgn-out-range");
  const oNote = makeOutputLine(outputRegion, "Note", "fgn-out-note");
  function readNum(i) { if (i.value === "") return NaN; const n = Number(i.value); return Number.isFinite(n) ? n : NaN; }
  const update = debounce(() => {
    const r = computeFinalGradeNeeded({ current_pct: readNum(current.input), final_weight_pct: readNum(fw.input), target_pct: readNum(target.input) });
    if (r.error) { oNeeded.textContent = r.error; oRange.textContent = ""; oNote.textContent = ""; return; }
    oNeeded.textContent = fmt(r.needed_pct, 1) + "% (" + r.status + ")";
    oRange.textContent = "max " + fmt(r.max_pct, 1) + "%, min " + fmt(r.min_pct, 1) + "%";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [current.input, fw.input, target.input]) f.addEventListener("input", update);
}
EDUCATIONASSESSMENT_RENDERERS["final-grade-needed"] = renderFinalGradeNeeded;

// --- v20 Y.2: Weighted category grade (`category-weighted-grade`) ---
// category% = earned/possible*100; overall = sum(cat%*weight)/sum(weight).
// dims: in { categories: dimensionless } out: { overall_pct: dimensionless, letter: dimensionless }
export function computeCategoryWeightedGrade({ categories = [] } = {}) {
  const cats = Array.isArray(categories) ? categories : [];
  if (cats.length === 0) return { error: "Enter at least one category (earned/possible/weight)." };
  let weightedSum = 0, weightSum = 0;
  const rows = [];
  for (const c of cats) {
    const earned = Number(c && c.earned);
    const possible = Number(c && c.possible);
    const weight = Number(c && c.weight);
    if (!Number.isFinite(weight) || weight <= 0) continue;
    if (!Number.isFinite(possible) || possible <= 0) continue; // exclude possible=0
    if (!Number.isFinite(earned) || earned < 0) continue;
    const pct = earned / possible * 100;
    weightedSum += pct * weight;
    weightSum += weight;
    rows.push({ pct, weight });
  }
  if (weightSum === 0) return { error: "No valid categories (each needs a positive weight and possible points)." };
  const overall = weightedSum / weightSum;
  let letter = "F";
  if (overall >= 90) letter = "A"; else if (overall >= 80) letter = "B"; else if (overall >= 70) letter = "C"; else if (overall >= 60) letter = "D";
  return {
    overall_pct: Number.isFinite(overall) ? overall : null,
    letter,
    weight_sum: weightSum,
    weight_normalized: Math.abs(weightSum - 100) > 1e-9,
    categories: rows,
    note: "Weighted mean normalized by the sum of weights (handles a partially-complete term). Standard US letter bands (A >= 90, B >= 80, ...). A category with possible = 0 is excluded. The instructor's gradebook governs; bands vary by school.",
  };
}
export const categoryWeightedGradeExample = { inputs: { categories: [{ earned: 92, possible: 100, weight: 20 }, { earned: 85, possible: 100, weight: 30 }, { earned: 78, possible: 100, weight: 50 }] } };

function renderCategoryWeightedGrade(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Pure weighted-mean arithmetic; standard US letter bands (A >= 90, B >= 80, C >= 70, D >= 60). The instructor's gradebook governs; bands vary by school.";
  const data = makeText("Categories (pct/weight, e.g. 92/20, 85/30, 78/50)", "cwg-data", {});
  inputRegion.appendChild(data.wrap);
  attachExampleButton(inputRegion, () => { data.input.value = "92/20, 85/30, 78/50"; update(); });
  const oOverall = makeOutputLine(outputRegion, "Overall grade", "cwg-out-overall");
  const oCheck = makeOutputLine(outputRegion, "Weight sum", "cwg-out-check");
  const oNote = makeOutputLine(outputRegion, "Note", "cwg-out-note");
  function parse(s) { return String(s).split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean).map((p) => { const [pct, weight] = p.split("/"); return { earned: Number(pct), possible: 100, weight: Number(weight) }; }); }
  const update = debounce(() => {
    const r = computeCategoryWeightedGrade({ categories: parse(data.input.value) });
    if (r.error) { oOverall.textContent = r.error; oCheck.textContent = ""; oNote.textContent = ""; return; }
    // Truncated, not rounded: until 2026-10-08 an 89.996% overall printed as "90.00% (B)".
    oOverall.textContent = fmt(r.overall_pct === null ? null : Math.floor(r.overall_pct * 100 + 1e-9) / 100, 2) + "% (" + r.letter + ")";
    oCheck.textContent = fmt(r.weight_sum, 0) + (r.weight_normalized ? " (normalized - does not sum to 100)" : "");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  data.input.addEventListener("input", update);
}
EDUCATIONASSESSMENT_RENDERERS["category-weighted-grade"] = renderCategoryWeightedGrade;

// --- v20 Y.3: Two-sample t-test (`two-sample-t-test`) ---
// t = (m1-m2)/sqrt(s1^2/n1 + s2^2/n2); Welch-Satterthwaite df; p from tcdf.
// dims: in { mean1: dimensionless, sd1: dimensionless, n1: dimensionless, mean2: dimensionless, sd2: dimensionless, n2: dimensionless, tail: dimensionless } out: { t_stat: dimensionless, p_value: dimensionless }
export function computeTwoSampleTTest({ mean1 = 0, sd1 = 0, n1 = 0, mean2 = 0, sd2 = 0, n2 = 0, tail = "two", alpha = 0.05 } = {}) {
  const m1 = Number(mean1), s1 = Number(sd1), nn1 = Number(n1);
  const m2 = Number(mean2), s2 = Number(sd2), nn2 = Number(n2);
  if (![m1, s1, nn1, m2, s2, nn2].every(Number.isFinite)) return { error: "All inputs must be finite numbers." };
  if (!(nn1 >= 2) || !(nn2 >= 2)) return { error: "Each group needs n >= 2." };
  if (s1 < 0 || s2 < 0) return { error: "Standard deviations must be non-negative." };
  const v1 = s1 * s1 / nn1, v2 = s2 * s2 / nn2;
  const se = Math.sqrt(v1 + v2);
  if (!(se > 0)) return { error: "Standard error is zero (both SDs zero) - t is not defined." };
  const t = (m1 - m2) / se;
  const df = Math.pow(v1 + v2, 2) / (Math.pow(v1, 2) / (nn1 - 1) + Math.pow(v2, 2) / (nn2 - 1));
  const cdf = tcdf(Math.abs(t), df);
  const pTwo = 2 * (1 - cdf);
  const pOne = 1 - cdf;
  const p = tail === "one" ? pOne : pTwo;
  return {
    t_stat: Number.isFinite(t) ? t : null,
    df: Number.isFinite(df) ? df : null,
    p_value: Number.isFinite(p) ? p : null,
    mean_diff: m1 - m2,
    significant: Number.isFinite(p) ? p < (Number(alpha) || 0.05) : null,
    se: Number.isFinite(se) ? se : null,
    note: "Welch's t (unequal variances) with the Welch-Satterthwaite df; the t-CDF reuses the bundled special-function helper. Small n (< 30) - the normality assumption is noted.",
  };
}
export const twoSampleTTestExample = { inputs: { mean1: 82, sd1: 6, n1: 25, mean2: 78, sd2: 7, n2: 22, tail: "two", alpha: 0.05 } };

function renderTwoSampleTTest(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per OpenIntro Statistics Chapter 7 (inference for numerical data, Welch's t) and the Welch-Satterthwaite df, by name; the t-CDF reuses the bundled special-function helper. Free at openintro.org.";
  const m1 = makeNumber("Group 1 mean", "tt-m1", { step: "any" });
  const s1 = makeNumber("Group 1 SD", "tt-s1", { step: "any", min: "0" });
  const n1 = makeNumber("Group 1 n", "tt-n1", { step: "1", min: "2" });
  const m2 = makeNumber("Group 2 mean", "tt-m2", { step: "any" });
  const s2 = makeNumber("Group 2 SD", "tt-s2", { step: "any", min: "0" });
  const n2 = makeNumber("Group 2 n", "tt-n2", { step: "1", min: "2" });
  const tail = makeSelect("Tail", "tt-tail", [{ value: "two", label: "Two-sided", selected: true }, { value: "one", label: "One-sided, in the observed direction" }]);
  for (const f of [m1, s1, n1, m2, s2, n2, tail]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { m1.input.value = "82"; s1.input.value = "6"; n1.input.value = "25"; m2.input.value = "78"; s2.input.value = "7"; n2.input.value = "22"; tail.select.value = "two"; update(); });
  const oT = makeOutputLine(outputRegion, "t-statistic / df", "tt-out-t");
  const oP = makeOutputLine(outputRegion, "p-value / significance", "tt-out-p");
  const oNote = makeOutputLine(outputRegion, "Note", "tt-out-note");
  function readNum(i) { if (i.value === "") return NaN; const n = Number(i.value); return Number.isFinite(n) ? n : NaN; }
  const update = debounce(() => {
    const r = computeTwoSampleTTest({ mean1: readNum(m1.input), sd1: readNum(s1.input), n1: readNum(n1.input), mean2: readNum(m2.input), sd2: readNum(s2.input), n2: readNum(n2.input), tail: tail.select.value });
    if (r.error) { oT.textContent = r.error; oP.textContent = ""; oNote.textContent = ""; return; }
    oT.textContent = "t = " + fmt(r.t_stat, 3) + ", df = " + fmt(r.df, 1);
    oP.textContent = "p = " + fmt(r.p_value, 4) + " (" + (r.significant ? "significant" : "not significant") + " at alpha)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [m1.input, s1.input, n1.input, m2.input, s2.input, n2.input, tail.select]) f.addEventListener("input", update);
}
EDUCATIONASSESSMENT_RENDERERS["two-sample-t-test"] = renderTwoSampleTTest;

// --- spec-v1234 Y: Paired (dependent-samples) t-test (`paired-t-test`) ---
// On the n differences d_i (before-after / matched pairs): t = d_bar / (s_d / sqrt(n)), df = n-1, p from tcdf.
// dims: in { mean_diff: dimensionless, sd_diff: dimensionless, n_pairs: dimensionless, tail: dimensionless, alpha: dimensionless } out: { t_stat: dimensionless, df: dimensionless, p_value: dimensionless }
export function computePairedTTest({ mean_diff = 0, sd_diff = 0, n_pairs = 0, tail = "two", alpha = 0.05 } = {}) {
  const d = Number(mean_diff), sd = Number(sd_diff), n = Number(n_pairs);
  if (![d, sd, n].every(Number.isFinite)) return { error: "All inputs must be finite numbers." };
  if (!(n >= 2)) return { error: "Need at least n = 2 pairs." };
  if (sd < 0) return { error: "The standard deviation of the differences must be non-negative." };
  const se = sd / Math.sqrt(n);
  if (!(se > 0)) return { error: "Standard error is zero (the differences have no spread) - t is not defined." };
  const t = d / se;
  const df = n - 1;
  const cdf = tcdf(Math.abs(t), df);
  const pTwo = 2 * (1 - cdf);
  const pOne = 1 - cdf;
  const p = tail === "one" ? pOne : pTwo;
  return {
    t_stat: Number.isFinite(t) ? t : null,
    df,
    se: Number.isFinite(se) ? se : null,
    p_value: Number.isFinite(p) ? p : null,
    significant: Number.isFinite(p) ? p < (Number(alpha) || 0.05) : null,
    note: "The paired (dependent-samples) t-test collapses matched before/after pairs to their n differences and runs a one-sample t on them: t = d_bar / (s_d / sqrt(n)) on df = n - 1, where d_bar and s_d are the mean and standard deviation of the differences (NOT of the two groups). Pairing removes the between-subject variation, so a paired test is usually far more powerful than a two-sample test on the same data - but it requires genuinely matched pairs (same subject, twins, before/after). Enter the summary of the differences you already computed. Small n (< 30) leans on the normality of the differences; the t-CDF reuses the bundled special-function helper.",
  };
}
export const pairedTTestExample = { inputs: { mean_diff: 2.5, sd_diff: 3.0, n_pairs: 20, tail: "two", alpha: 0.05 } };

function renderPairedTTest(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per OpenIntro Statistics Chapter 7 (inference for paired data) - the paired t-test is a one-sample t on the differences, t = d_bar/(s_d/sqrt(n)) on n-1 df, by name; the t-CDF reuses the bundled special-function helper. Free at openintro.org.";
  const md = makeNumber("Mean of the differences d_bar", "ptt-md", { step: "any" });
  const sd = makeNumber("SD of the differences s_d", "ptt-sd", { step: "any", min: "0" });
  const n = makeNumber("Number of pairs n", "ptt-n", { step: "1", min: "2" });
  const tail = makeSelect("Tail", "ptt-tail", [{ value: "two", label: "Two-sided", selected: true }, { value: "one", label: "One-sided, in the observed direction" }]);
  for (const f of [md, sd, n, tail]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { md.input.value = "2.5"; sd.input.value = "3"; n.input.value = "20"; tail.select.value = "two"; update(); });
  const oT = makeOutputLine(outputRegion, "t-statistic / df", "ptt-out-t");
  const oP = makeOutputLine(outputRegion, "p-value / significance", "ptt-out-p");
  const oNote = makeOutputLine(outputRegion, "Note", "ptt-out-note");
  function readNum(i) { if (i.value === "") return NaN; const v = Number(i.value); return Number.isFinite(v) ? v : NaN; }
  const update = debounce(() => {
    const r = computePairedTTest({ mean_diff: readNum(md.input), sd_diff: readNum(sd.input), n_pairs: readNum(n.input), tail: tail.select.value });
    if (r.error) { oT.textContent = r.error; oP.textContent = ""; oNote.textContent = ""; return; }
    oT.textContent = "t = " + fmt(r.t_stat, 3) + ", df = " + r.df;
    oP.textContent = "p = " + fmt(r.p_value, 4) + " (" + (r.significant ? "significant" : "not significant") + " at alpha)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [md.input, sd.input, n.input, tail.select]) f.addEventListener("input", update);
}
EDUCATIONASSESSMENT_RENDERERS["paired-t-test"] = renderPairedTTest;

// --- spec-v1236 Y: One-sample t-test (`one-sample-t-test`) ---
// Tests a sample mean against a hypothesized/target value mu0: t = (x_bar - mu0)/(s/sqrt(n)), df = n-1, p from tcdf.
// dims: in { sample_mean: dimensionless, sample_sd: dimensionless, n: dimensionless, hypothesized_mean: dimensionless, tail: dimensionless, alpha: dimensionless } out: { t_stat: dimensionless, df: dimensionless, p_value: dimensionless }
export function computeOneSampleTTest({ sample_mean = 0, sample_sd = 0, n = 0, hypothesized_mean = 0, tail = "two", alpha = 0.05 } = {}) {
  const xbar = Number(sample_mean), s = Number(sample_sd), nn = Number(n), mu0 = Number(hypothesized_mean);
  if (![xbar, s, nn, mu0].every(Number.isFinite)) return { error: "All inputs must be finite numbers." };
  if (!(nn >= 2)) return { error: "Need at least n = 2 observations." };
  if (s < 0) return { error: "The sample standard deviation must be non-negative." };
  const se = s / Math.sqrt(nn);
  if (!(se > 0)) return { error: "Standard error is zero (the sample has no spread) - t is not defined." };
  const t = (xbar - mu0) / se;
  const df = nn - 1;
  const cdf = tcdf(Math.abs(t), df);
  const pTwo = 2 * (1 - cdf);
  const pOne = 1 - cdf;
  const p = tail === "one" ? pOne : pTwo;
  return {
    t_stat: Number.isFinite(t) ? t : null,
    df,
    se: Number.isFinite(se) ? se : null,
    mean_diff: xbar - mu0,
    p_value: Number.isFinite(p) ? p : null,
    significant: Number.isFinite(p) ? p < (Number(alpha) || 0.05) : null,
    note: "The one-sample t-test asks whether a sample mean differs from a fixed target or spec value mu0: t = (x_bar - mu0) / (s / sqrt(n)) on df = n - 1, where x_bar and s are the sample mean and standard deviation. It is the everyday QC question - is the mean fill weight really 16.0 oz, is the mean cure strength really 4,000 psi - as opposed to the two-sample test (two groups) or the paired test (before/after on the same subjects). A sample of 25 with mean 16.1, SD 0.3, tested against 16.0 gives t = 1.67 on 24 df, two-sided p = 0.109 (not significant at 0.05). Small n (< 30) leans on approximate normality of the sample; the t-CDF reuses the bundled special-function helper.",
  };
}
export const oneSampleTTestExample = { inputs: { sample_mean: 16.1, sample_sd: 0.3, n: 25, hypothesized_mean: 16.0, tail: "two", alpha: 0.05 } };

function renderOneSampleTTest(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per OpenIntro Statistics Chapter 7 (inference for a single mean) - the one-sample t-test, t = (x_bar - mu0)/(s/sqrt(n)) on n-1 df, by name; the t-CDF reuses the bundled special-function helper. Free at openintro.org.";
  const xb = makeNumber("Sample mean x_bar", "ostt-xb", { step: "any" });
  const sd = makeNumber("Sample SD s", "ostt-sd", { step: "any", min: "0" });
  const n = makeNumber("Sample size n", "ostt-n", { step: "1", min: "2" });
  const mu0 = makeNumber("Hypothesized / target mean mu0", "ostt-mu", { step: "any" });
  const tail = makeSelect("Tail", "ostt-tail", [{ value: "two", label: "Two-sided", selected: true }, { value: "one", label: "One-sided, in the observed direction" }]);
  for (const f of [xb, sd, n, mu0, tail]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { xb.input.value = "16.1"; sd.input.value = "0.3"; n.input.value = "25"; mu0.input.value = "16.0"; tail.select.value = "two"; update(); });
  const oT = makeOutputLine(outputRegion, "t-statistic / df", "ostt-out-t");
  const oP = makeOutputLine(outputRegion, "p-value / significance", "ostt-out-p");
  const oNote = makeOutputLine(outputRegion, "Note", "ostt-out-note");
  function readNum(i) { if (i.value === "") return NaN; const v = Number(i.value); return Number.isFinite(v) ? v : NaN; }
  const update = debounce(() => {
    const r = computeOneSampleTTest({ sample_mean: readNum(xb.input), sample_sd: readNum(sd.input), n: readNum(n.input), hypothesized_mean: readNum(mu0.input), tail: tail.select.value });
    if (r.error) { oT.textContent = r.error; oP.textContent = ""; oNote.textContent = ""; return; }
    oT.textContent = "t = " + fmt(r.t_stat, 3) + ", df = " + r.df;
    oP.textContent = "p = " + fmt(r.p_value, 4) + " (" + (r.significant ? "significant" : "not significant") + " at alpha)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [xb.input, sd.input, n.input, mu0.input, tail.select]) f.addEventListener("input", update);
}
EDUCATIONASSESSMENT_RENDERERS["one-sample-t-test"] = renderOneSampleTTest;

// --- spec-v1261: one-way ANOVA (`one-way-anova`) ---
// The inferential-stats family has one/two/paired t-tests and chi-square GOF but no way to compare
// THREE OR MORE group means at once -- one-way ANOVA is that missing generalization of the two-sample
// t-test. Partition the total variation: between-groups SSB = sum n_i (mean_i - grand)^2 (df = k-1) and
// within-groups SSW = sum sum (x - mean_i)^2 (df = N-k); F = (SSB/df_b)/(SSW/df_w). The upper-tail p-value
// comes from the F distribution via the bundled regularized incomplete beta: p = I_{df_w/(df_w+df_b F)}(df_w/2, df_b/2).
// eta^2 = SSB/SST is the effect size. Verified against scipy.stats.f_oneway.
// dims: in { groups_text: dimensionless } out: { f_stat: dimensionless, df_between: dimensionless, df_within: dimensionless, p_value: dimensionless, ss_between: dimensionless, ss_within: dimensionless, ms_between: dimensionless, ms_within: dimensionless, eta_squared: dimensionless, groups: dimensionless, n_total: dimensionless }
export function computeOneWayAnova({ groups_text = "" } = {}) {
  if (typeof groups_text !== "string") return { error: "Provide the group data as text, one group per line." };
  const groups = groups_text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0)
    .map((l) => l.split(/[\s,]+/).map(Number).filter((v) => Number.isFinite(v)))
    .filter((g) => g.length > 0);
  const k = groups.length;
  if (k < 2) return { error: "Enter at least two groups (one group per line, values separated by spaces or commas)." };
  const counts = groups.map((g) => g.length);
  const N = counts.reduce((a, b) => a + b, 0);
  if (N - k < 1) return { error: "Need more observations than groups (the within-group df N - k must be at least 1)." };
  const groupMeans = groups.map((g) => g.reduce((a, b) => a + b, 0) / g.length);
  const grand = groups.reduce((a, g) => a + g.reduce((x, y) => x + y, 0), 0) / N;
  let ssb = 0;
  for (let i = 0; i < k; i++) ssb += counts[i] * Math.pow(groupMeans[i] - grand, 2);
  let ssw = 0;
  for (let i = 0; i < k; i++) for (const x of groups[i]) ssw += Math.pow(x - groupMeans[i], 2);
  const dfb = k - 1, dfw = N - k;
  if (!(ssw > 0)) return { error: "No within-group variation (each group's values are identical) - F is not defined." };
  const msb = ssb / dfb, msw = ssw / dfw;
  const F = msb / msw;
  const p = betainc(dfw / (dfw + dfb * F), dfw / 2, dfb / 2);
  const sst = ssb + ssw;
  const eta2 = sst > 0 ? ssb / sst : 0;
  if (![F, p, msb, msw].every(Number.isFinite)) return { error: "ANOVA math is not a finite value." };
  return {
    f_stat: F, df_between: dfb, df_within: dfw, p_value: p,
    ss_between: ssb, ss_within: ssw, ms_between: msb, ms_within: msw,
    eta_squared: eta2, groups: k, n_total: N,
    significant: p < 0.05,
    note: "One-way ANOVA, the member the t-test family was missing: it tests whether three or more group means differ by more than chance, the way the two-sample t-test does for two. The total spread is split into between-group variation SSB = sum n_i (mean_i - grand)^2 and within-group variation SSW = sum (x - group mean)^2; F = (SSB/(k-1)) / (SSW/(N-k)) is the ratio of the two, and a large F (small p) says at least one group mean stands out. The p-value is the upper tail of the F distribution with k-1 and N-k degrees of freedom, from the bundled special-function helper. eta^2 = SSB/SST is the share of variance explained (0.01 small, 0.06 medium, 0.14 large). ANOVA assumes roughly normal groups with similar variances and only flags THAT a difference exists, not which pair -- a post-hoc test (Tukey HSD) locates it. A first-principles statistics aid; the study design governs.",
  };
}
export const oneWayAnovaExample = { inputs: { groups_text: "88 90 92 85 91\n79 82 80 78 84\n93 95 91 90 94" } };
function renderOneWayAnova(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: one-way ANOVA per OpenIntro Statistics Chapter 7 (comparing many means), by name: F = MSB/MSW with df k-1 and N-k; the F-distribution p-value reuses the bundled regularized-incomplete-beta helper. Verified against scipy.stats.f_oneway. Free at openintro.org.";
  const t = makeTextarea("Groups (one group per line; values separated by spaces or commas)", "anova-t", { placeholder: "88 90 92 85 91\n79 82 80 78 84\n93 95 91 90 94", rows: "5" });
  inputRegion.appendChild(t.wrap);
  attachExampleButton(inputRegion, () => { t.input.value = "88 90 92 85 91\n79 82 80 78 84\n93 95 91 90 94"; update(); });
  const oF = makeOutputLine(outputRegion, "F-statistic / df", "anova-out-f");
  const oP = makeOutputLine(outputRegion, "p-value / significance", "anova-out-p");
  const oE = makeOutputLine(outputRegion, "Effect size (eta squared)", "anova-out-e");
  const oNote = makeOutputLine(outputRegion, "Note", "anova-out-note");
  const update = debounce(() => {
    const r = computeOneWayAnova({ groups_text: t.input.value });
    if (r.error) { oF.textContent = r.error; oP.textContent = ""; oE.textContent = ""; oNote.textContent = ""; return; }
    oF.textContent = "F = " + fmt(r.f_stat, 3) + " (df " + r.df_between + ", " + r.df_within + "); " + r.groups + " groups, N = " + r.n_total;
    oP.textContent = "p = " + fmt(r.p_value, 4) + " (" + (r.significant ? "significant" : "not significant") + " at 0.05)";
    oE.textContent = "eta^2 = " + fmt(r.eta_squared, 3);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  t.input.addEventListener("input", update);
}
EDUCATIONASSESSMENT_RENDERERS["one-way-anova"] = renderOneWayAnova;

// --- spec-v1262: chi-square test of independence (`chi-square-independence`) ---
// The chi-square family has only goodness-of-fit (one row of categories vs an expected distribution). The test
// of INDEPENDENCE works on an r x c contingency table (two categorical variables cross-tabulated) and asks
// whether the row and column variables are related. It builds its own expected cells from the margins --
// E[i][j] = row_total_i * col_total_j / N -- so it is a distinct calculation, not the GOF tile: chi2 = sum
// (O - E)^2/E on df = (r-1)(c-1); p from the bundled chi-square CDF. Cramer's V = sqrt(chi2/(N min(r-1,c-1)))
// is the effect size. Verified against scipy.stats.chi2_contingency (correction=False for non-2x2 tables).
// dims: in { table_text: dimensionless } out: { chi_square: dimensionless, df: dimensionless, p_value: dimensionless, cramers_v: dimensionless, rows: dimensionless, cols: dimensionless, n_total: dimensionless, min_expected: dimensionless }
export function computeChiSquareIndependence({ table_text = "" } = {}) {
  if (typeof table_text !== "string") return { error: "Provide the contingency table as text, one row per line." };
  const rows = table_text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0)
    .map((l) => l.split(/[\s,]+/).map(Number));
  if (rows.length < 2) return { error: "Enter at least two rows (one row per line, cells separated by spaces or commas)." };
  const c = rows[0].length;
  if (c < 2) return { error: "Each row needs at least two columns (a 2x2 table or larger)." };
  if (rows.some((row) => row.length !== c)) return { error: "Every row must have the same number of columns." };
  if (rows.some((row) => row.some((v) => !Number.isFinite(v) || v < 0))) return { error: "All cells must be non-negative numbers." };
  const r = rows.length;
  const rowTot = rows.map((row) => row.reduce((a, b) => a + b, 0));
  const colTot = [];
  for (let j = 0; j < c; j++) { let s = 0; for (let i = 0; i < r; i++) s += rows[i][j]; colTot.push(s); }
  const N = rowTot.reduce((a, b) => a + b, 0);
  if (!(N > 0)) return { error: "The table totals to zero." };
  if (rowTot.some((t) => !(t > 0)) || colTot.some((t) => !(t > 0))) return { error: "Every row and column must have a positive total (an all-zero row or column has no expected count)." };
  let chi2 = 0, minExp = Infinity;
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
    const e = rowTot[i] * colTot[j] / N;
    if (e < minExp) minExp = e;
    chi2 += Math.pow(rows[i][j] - e, 2) / e;
  }
  const df = (r - 1) * (c - 1);
  const p = 1 - chi2Cdf(chi2, df);
  const cramers_v = Math.sqrt(chi2 / (N * Math.min(r - 1, c - 1)));
  if (![chi2, p, cramers_v].every(Number.isFinite)) return { error: "Chi-square math is not a finite value." };
  const warnings = [];
  if (minExp < 5) warnings.push("An expected cell below 5 (" + minExp.toFixed(2) + ") weakens the chi-square approximation; consider combining categories or Fisher's exact test.");
  return {
    chi_square: chi2, df, p_value: p, cramers_v,
    rows: r, cols: c, n_total: N, min_expected: minExp,
    significant: p < 0.05, warnings,
    note: "The chi-square test of independence, the contingency-table member the goodness-of-fit tile is not: it cross-tabulates TWO categorical variables (rows x columns) and tests whether they are related or independent. Unlike goodness-of-fit, which compares one row against an expected distribution you supply, this builds its own expected counts from the margins -- E = row total x column total / grand total, the counts you would see if the variables were unrelated -- then chi2 = sum (observed - expected)^2 / expected on (r-1)(c-1) degrees of freedom. A small p says the two variables ARE associated. Cramer's V = sqrt(chi2/(N min(r-1,c-1))) rates the strength from 0 (no association) to 1. The approximation weakens when an expected cell drops below 5, flagged as a warning. A statistics aid; the study design governs.",
  };
}
export const chiSquareIndependenceExample = { inputs: { table_text: "10 20 30\n30 20 10" } };
function renderChiSquareIndependence(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: chi-square test of independence per OpenIntro Statistics Chapter 6 (contingency tables), by name: expected E = row total x col total / N, chi2 = sum (O-E)^2/E on (r-1)(c-1) df; the chi-square CDF reuses the bundled special-function helper. Cramer's V effect size. Verified against scipy.stats.chi2_contingency. Free at openintro.org.";
  const t = makeTextarea("Contingency table (one row per line; cells separated by spaces or commas)", "chi2i-t", { placeholder: "10 20 30\n30 20 10", rows: "4" });
  inputRegion.appendChild(t.wrap);
  attachExampleButton(inputRegion, () => { t.input.value = "10 20 30\n30 20 10"; update(); });
  const oC = makeOutputLine(outputRegion, "Chi-square / df", "chi2i-out-c");
  const oP = makeOutputLine(outputRegion, "p-value / significance", "chi2i-out-p");
  const oV = makeOutputLine(outputRegion, "Cramer's V (effect size)", "chi2i-out-v");
  const oW = makeOutputLine(outputRegion, "Warnings", "chi2i-out-w");
  const oNote = makeOutputLine(outputRegion, "Note", "chi2i-out-note");
  const update = debounce(() => {
    const rr = computeChiSquareIndependence({ table_text: t.input.value });
    if (rr.error) { oC.textContent = rr.error; oP.textContent = ""; oV.textContent = ""; oW.textContent = ""; oNote.textContent = ""; return; }
    oC.textContent = "chi2 = " + fmt(rr.chi_square, 3) + " (df " + rr.df + "); " + rr.rows + "x" + rr.cols + " table, N = " + rr.n_total;
    oP.textContent = "p = " + fmt(rr.p_value, 4) + " (" + (rr.significant ? "significant" : "not significant") + " at 0.05)";
    oV.textContent = "V = " + fmt(rr.cramers_v, 3);
    oW.textContent = rr.warnings.length ? rr.warnings.join(" ") : "none";
    oNote.textContent = rr.note;
  }, DEBOUNCE_MS);
  t.input.addEventListener("input", update);
}
EDUCATIONASSESSMENT_RENDERERS["chi-square-independence"] = renderChiSquareIndependence;

// --- spec-v1263: Spearman rank correlation (`spearman-rank-correlation`) ---
// The correlation/regression family has Pearson r and linear regression but no nonparametric rank correlation --
// the standard companion when the relationship is monotonic-but-not-linear or the data are ordinal. Spearman's
// rho is simply Pearson's r computed on the RANKS of the two series (ties take the average rank). The two-sided
// p-value uses the same t approximation scipy.stats.spearmanr does: t = rho sqrt((n-2)/(1-rho^2)) on n-2 df.
function _averageRanks(arr) {
  const idx = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const ranks = new Array(arr.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1; // 1-based average rank for the tie block
    for (let k = i; k <= j; k++) ranks[idx[k][1]] = avg;
    i = j + 1;
  }
  return ranks;
}
// dims: in { x_values: dimensionless, y_values: dimensionless, alpha: dimensionless } out: { n: dimensionless, rho: dimensionless, rho_squared: dimensionless, df: dimensionless, t: dimensionless, p_value: dimensionless }
export function computeSpearman({ x_values, y_values, alpha = 0.05 } = {}) {
  const xs = Array.isArray(x_values) ? x_values.filter(Number.isFinite) : parseNumberList(x_values);
  const ys = Array.isArray(y_values) ? y_values.filter(Number.isFinite) : parseNumberList(y_values);
  if (xs.length < 3 || ys.length < 3) return { error: "Enter at least 3 paired (x, y) values in each series." };
  if (xs.length !== ys.length) return { error: "The x and y series must have the same number of values (" + xs.length + " x vs " + ys.length + " y)." };
  const n = xs.length;
  const rx = _averageRanks(xs);
  const ry = _averageRanks(ys);
  const mrx = rx.reduce((a, b) => a + b, 0) / n;
  const mry = ry.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = rx[i] - mrx, dy = ry[i] - mry;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return { error: "A series with no variation (all values tied) has no defined rank correlation." };
  const rho = Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));
  const rho2 = rho * rho;
  const df = n - 2;
  let t, p_value, perfect_fit = false;
  if (rho2 >= 1) {
    t = null; p_value = 0; perfect_fit = true;
  } else {
    t = (rho * Math.sqrt(df)) / Math.sqrt(1 - rho2);
    p_value = 2 * (1 - tcdf(Math.abs(t), df));
  }
  const a = Number.isFinite(Number(alpha)) && Number(alpha) > 0 && Number(alpha) < 1 ? Number(alpha) : 0.05;
  const warnings = [];
  if (n < 10) warnings.push("Small sample (n < 10): the p-value approximation is rough; inspect a scatter plot.");
  return {
    n, rho, rho_squared: rho2,
    direction: rho > 0 ? "positive" : rho < 0 ? "negative" : "none",
    strength: _pearsonStrength(Math.abs(rho)),
    df, t, perfect_fit, p_value, alpha: a, significant: p_value < a, warnings,
    note: "Spearman's rank correlation rho, the nonparametric companion to Pearson's r: it is Pearson's r computed on the RANKS of the two series rather than their raw values (tied values take the average rank). Because it works on ranks it measures any MONOTONIC relationship, not just a straight-line one, and it shrugs off outliers and non-normal data - the right tool for ordinal ratings or a curved but steadily-rising trend. rho runs from -1 (perfectly decreasing) through 0 (no monotonic trend) to +1 (perfectly increasing). The two-sided p-value tests rho = 0 with t = rho sqrt((n-2)/(1-rho^2)) on n-2 df, the same approximation scipy.stats.spearmanr uses; for very small samples it is only approximate. A statistics aid; the study design governs.",
  };
}
export const spearmanExample = { inputs: { x_values: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10", y_values: "3, 1, 4, 1, 5, 9, 2, 6, 5, 8", alpha: 0.05 } };
function renderSpearman(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Spearman's rank correlation per OpenIntro Statistics (nonparametric association), by name: rho is Pearson's r on the average-tied ranks; two-sided p from t = rho sqrt((n-2)/(1-rho^2)) on n-2 df, reusing the bundled Student-t CDF. Verified against scipy.stats.spearmanr. Free at openintro.org.";
  const X = makeTextarea("X series (values separated by commas, spaces, or new lines)", "spr-x", { placeholder: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10", rows: "3" });
  const Y = makeTextarea("Y series (same count as X)", "spr-y", { placeholder: "3, 1, 4, 1, 5, 9, 2, 6, 5, 8", rows: "3" });
  for (const f of [X, Y]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { X.input.value = "1, 2, 3, 4, 5, 6, 7, 8, 9, 10"; Y.input.value = "3, 1, 4, 1, 5, 9, 2, 6, 5, 8"; update(); });
  const oR = makeOutputLine(outputRegion, "Spearman rho / strength", "spr-out-r");
  const oP = makeOutputLine(outputRegion, "p-value / significance", "spr-out-p");
  const oW = makeOutputLine(outputRegion, "Warnings", "spr-out-w");
  const oNote = makeOutputLine(outputRegion, "Note", "spr-out-note");
  const update = debounce(() => {
    const rr = computeSpearman({ x_values: X.input.value || "", y_values: Y.input.value || "" });
    if (rr.error) { oR.textContent = rr.error; oP.textContent = ""; oW.textContent = ""; oNote.textContent = ""; return; }
    oR.textContent = "rho = " + fmt(rr.rho, 4) + " (" + rr.direction + ", " + rr.strength + "); n = " + rr.n;
    oP.textContent = rr.perfect_fit ? "p = 0 (perfect monotonic fit)" : "p = " + fmt(rr.p_value, 4) + " (" + (rr.significant ? "significant" : "not significant") + " at 0.05)";
    oW.textContent = rr.warnings.length ? rr.warnings.join(" ") : "none";
    oNote.textContent = rr.note;
  }, DEBOUNCE_MS);
  for (const f of [X.input, Y.input]) f.addEventListener("input", update);
}
EDUCATIONASSESSMENT_RENDERERS["spearman-rank-correlation"] = renderSpearman;

// --- spec-v1264: two-proportion z-test (`two-proportion-z-test`) ---
// The hypothesis-test family (t-tests, chi-square, ANOVA) had no test for comparing two proportions -- the
// standard question when each group is a count of successes out of a total (conversion rate A vs B, defect rate
// line 1 vs line 2, pass rate this year vs last). The pooled two-proportion z-test: p_pool = (x1+x2)/(n1+n2),
// z = (p1 - p2) / sqrt(p_pool (1-p_pool)(1/n1 + 1/n2)); p from the standard-normal CDF. Verified against
// statsmodels.stats.proportion.proportions_ztest (pooled).
// dims: in { x1: dimensionless, n1: dimensionless, x2: dimensionless, n2: dimensionless, tail: dimensionless, alpha: dimensionless } out: { p1: dimensionless, p2: dimensionless, diff: dimensionless, z_stat: dimensionless, p_value: dimensionless }
export function computeTwoProportionZTest({ x1 = 0, n1 = 0, x2 = 0, n2 = 0, tail = "two", alpha = 0.05 } = {}) {
  const s1 = Number(x1), t1 = Number(n1), s2 = Number(x2), t2 = Number(n2);
  if (![s1, t1, s2, t2].every(Number.isFinite)) return { error: "Successes and totals must be finite numbers." };
  if (!(t1 > 0) || !(t2 > 0)) return { error: "Each group total n must be positive." };
  if (s1 < 0 || s2 < 0 || s1 > t1 || s2 > t2) return { error: "Successes must be between 0 and the group total." };
  const p1 = s1 / t1, p2 = s2 / t2;
  const pPool = (s1 + s2) / (t1 + t2);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / t1 + 1 / t2));
  if (!(se > 0)) return { error: "Pooled standard error is zero (both proportions 0% or both 100%) - z is not defined." };
  const z = (p1 - p2) / se;
  const cdf = normCdf(Math.abs(z));
  const pTwo = 2 * (1 - cdf);
  const pOne = 1 - cdf;
  const p_value = tail === "one" ? pOne : pTwo;
  const a = Number.isFinite(Number(alpha)) && Number(alpha) > 0 && Number(alpha) < 1 ? Number(alpha) : 0.05;
  // 95%-style CI on the difference uses the UNPOOLED standard error (standard practice).
  const seUnpooled = Math.sqrt(p1 * (1 - p1) / t1 + p2 * (1 - p2) / t2);
  const zCrit = tail === "one" ? 1.6448536269514722 : 1.959963984540054;
  const ciLow = (p1 - p2) - zCrit * seUnpooled;
  const ciHigh = (p1 - p2) + zCrit * seUnpooled;
  if (![z, p_value].every(Number.isFinite)) return { error: "Two-proportion z math is not a finite value." };
  const warnings = [];
  if (s1 < 5 || (t1 - s1) < 5 || s2 < 5 || (t2 - s2) < 5) warnings.push("A cell with fewer than 5 successes or failures makes the normal approximation rough; consider Fisher's exact test.");
  return {
    p1, p2, diff: p1 - p2, pooled_p: pPool,
    z_stat: z, p_value, alpha: a, significant: p_value < a,
    ci_low: ciLow, ci_high: ciHigh, warnings,
    note: "The two-proportion z-test, the count-based member of the hypothesis-test family: it compares two sample proportions -- each a number of successes out of a total (conversion A vs B, defect rate line 1 vs line 2, pass rate this year vs last). Under the null that the two true proportions are equal, the counts are pooled into p_pool = (x1+x2)/(n1+n2) to estimate the shared rate, and z = (p1 - p2) / sqrt(p_pool (1-p_pool)(1/n1 + 1/n2)) is compared to the standard normal. A small p says the two rates really differ. The reported confidence interval on the difference uses the unpooled standard error (the usual convention for the interval). The normal approximation needs at least about 5 successes AND 5 failures in each group, flagged as a warning otherwise; below that Fisher's exact test is preferred. A statistics aid; the study design governs.",
  };
}
export const twoProportionZTestExample = { inputs: { x1: 45, n1: 100, x2: 30, n2: 100, tail: "two", alpha: 0.05 } };
function renderTwoProportionZTest(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: pooled two-proportion z-test per OpenIntro Statistics Chapter 6 (inference for two proportions), by name: p_pool = (x1+x2)/(n1+n2), z = (p1-p2)/sqrt(p_pool(1-p_pool)(1/n1+1/n2)); p from the standard-normal CDF; the difference CI uses the unpooled SE. Verified against statsmodels proportions_ztest. Free at openintro.org.";
  const x1 = makeNumber("Group 1 successes x1", "tp-x1", { step: "1", min: "0" });
  const n1 = makeNumber("Group 1 total n1", "tp-n1", { step: "1", min: "1" });
  const x2 = makeNumber("Group 2 successes x2", "tp-x2", { step: "1", min: "0" });
  const n2 = makeNumber("Group 2 total n2", "tp-n2", { step: "1", min: "1" });
  const tail = makeSelect("Tail", "tp-tail", [{ value: "two", label: "Two-sided", selected: true }, { value: "one", label: "One-sided, in the observed direction" }]);
  for (const f of [x1, n1, x2, n2, tail]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { x1.input.value = "45"; n1.input.value = "100"; x2.input.value = "30"; n2.input.value = "100"; tail.select.value = "two"; update(); });
  const oP = makeOutputLine(outputRegion, "Proportions p1 / p2 / difference", "tp-out-p");
  const oZ = makeOutputLine(outputRegion, "z-statistic / p-value", "tp-out-z");
  const oCI = makeOutputLine(outputRegion, "Difference CI (unpooled; 95% two-sided, 90% when one-sided is chosen)", "tp-out-ci");
  const oW = makeOutputLine(outputRegion, "Warnings", "tp-out-w");
  const oNote = makeOutputLine(outputRegion, "Note", "tp-out-note");
  function readNum(i) { if (i.value === "") return NaN; const n = Number(i.value); return Number.isFinite(n) ? n : NaN; }
  const update = debounce(() => {
    const r = computeTwoProportionZTest({ x1: readNum(x1.input), n1: readNum(n1.input), x2: readNum(x2.input), n2: readNum(n2.input), tail: tail.select.value });
    if (r.error) { oP.textContent = r.error; oZ.textContent = ""; oCI.textContent = ""; oW.textContent = ""; oNote.textContent = ""; return; }
    oP.textContent = fmt(r.p1, 4) + " / " + fmt(r.p2, 4) + " / " + fmt(r.diff, 4);
    oZ.textContent = "z = " + fmt(r.z_stat, 3) + ", p = " + fmt(r.p_value, 4) + " (" + (r.significant ? "significant" : "not significant") + " at alpha)";
    oCI.textContent = "[" + fmt(r.ci_low, 4) + ", " + fmt(r.ci_high, 4) + "]";
    oW.textContent = r.warnings.length ? r.warnings.join(" ") : "none";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [x1.input, n1.input, x2.input, n2.input, tail.select]) f.addEventListener("input", update);
}
EDUCATIONASSESSMENT_RENDERERS["two-proportion-z-test"] = renderTwoProportionZTest;
