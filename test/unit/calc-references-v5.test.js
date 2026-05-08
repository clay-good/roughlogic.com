// Unit tests for calc-references.js v5 additions (utilities 265-268).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  IRS_FORM_INDEX, computeIrsFormIndex, irsFormIndexExample,
  SALES_TAX_NEXUS, computeSalesTaxNexus, salesTaxNexusExample,
  OSHA_RECORDKEEPING, computeOshaRecordkeeping, oshaRecordkeepingExample,
  GHS_PICTOGRAMS, SPILL_DECISION_TREE, computeLabSafety, labSafetyExample,
  REFERENCE_RENDERERS,
} from "../../calc-references.js";

// 265 IRS form index
test("IRS forms: includes the spec-required forms", () => {
  const numbers = IRS_FORM_INDEX.map((f) => f.form);
  for (const expected of ["1040", "Schedule C (1040)", "Schedule SE (1040)", "Schedule E (1040)", "Form 4562", "Form 941", "Form W-9", "Form 1099-NEC", "Form 1099-K"]) {
    assert.ok(numbers.includes(expected), "missing " + expected);
  }
});
test("IRS forms: every entry has form + title + purpose", () => { for (const f of IRS_FORM_INDEX) { assert.ok(f.form); assert.ok(f.title); assert.ok(f.purpose); } });
test("IRS forms: compute returns the array", () => { const r = computeIrsFormIndex(); assert.equal(r.forms.length, IRS_FORM_INDEX.length); });
test("IRS forms: example count matches", () => { assert.equal(irsFormIndexExample.expected.count, IRS_FORM_INDEX.length); });

// 266 Sales tax nexus
test("Sales tax nexus: example CA = $500k threshold", () => { const r = computeSalesTaxNexus(salesTaxNexusExample.inputs); assert.equal(r.sales_threshold_usd, 500000); });
test("Sales tax nexus: 46+ jurisdictions bundled (post-expansion: 50 states + DC minus 4 no-tax)", () => { assert.ok(Object.keys(SALES_TAX_NEXUS).length >= 46); });
test("Sales tax nexus: every entry has citation + verified_on", () => { for (const v of Object.values(SALES_TAX_NEXUS)) { assert.ok(v.citation); assert.ok(v.verified_on); assert.ok(v.sales_threshold_usd > 0); } });
test("Sales tax nexus: unknown state errors", () => { assert.ok(computeSalesTaxNexus({ state: "ZZ" }).error); });

// 267 OSHA recordkeeping
test("OSHA: covers form 300, 300A, 301, retention, severe-injury", () => {
  const topics = OSHA_RECORDKEEPING.map((e) => e.topic);
  for (const expected of ["Form 300", "Form 300A", "Form 301", "Retention", "Severe injury reporting"]) {
    assert.ok(topics.some((t) => t.includes(expected)), "missing " + expected);
  }
});
test("OSHA: every entry references 29 CFR 1904 by section", () => {
  for (const e of OSHA_RECORDKEEPING) assert.match(e.note, /1904/);
});
test("OSHA: compute returns the array", () => { assert.equal(computeOshaRecordkeeping().entries.length, OSHA_RECORDKEEPING.length); });

// 268 Lab safety
test("Lab safety: 9 GHS pictograms (8 mandatory + 1 environment)", () => { assert.ok(GHS_PICTOGRAMS.length >= 8); });
test("Lab safety: 4-step decision tree (assess / evacuate / contain / report)", () => {
  const steps = SPILL_DECISION_TREE.map((s) => s.step);
  for (const expected of ["Assess", "Evacuate", "Contain", "Report"]) assert.ok(steps.includes(expected), "missing " + expected);
});
test("Lab safety: every pictogram has signal word + hazards", () => { for (const p of GHS_PICTOGRAMS) { assert.ok(p.signal_word); assert.ok(p.hazards); } });
test("Lab safety: compute returns both lists", () => { const r = computeLabSafety(); assert.equal(r.pictograms.length, GHS_PICTOGRAMS.length); assert.equal(r.decision_tree.length, SPILL_DECISION_TREE.length); });

// Renderer registry
test("REFERENCE_RENDERERS exposes all 4 v5 utilities", () => {
  for (const id of ["irs-form-index", "sales-tax-nexus", "osha-recordkeeping", "lab-safety-quickread"]) {
    assert.ok(typeof REFERENCE_RENDERERS[id] === "function", id);
  }
});

// --- Additional edge-case coverage for v5 references (utilities 265-268) ---

// 265 IRS form index
test("IRS forms: 9 entries (matches spec list)", () => { assert.equal(IRS_FORM_INDEX.length, 9); });
test("IRS forms: 1099-K mentions threshold-shift caveat", () => {
  const k = IRS_FORM_INDEX.find((f) => f.form === "Form 1099-K");
  assert.ok(k); assert.match(k.purpose, /threshold/i);
});
test("IRS forms: every purpose is one paragraph (single sentence-ish)", () => {
  for (const f of IRS_FORM_INDEX) {
    assert.ok(f.purpose.length > 30, f.form + " purpose too short");
    assert.ok(f.purpose.length < 600, f.form + " purpose too long");
  }
});
test("IRS forms: every title contains form-relevant keyword", () => {
  for (const f of IRS_FORM_INDEX) assert.ok(f.title && f.title.length > 5);
});

// 266 Sales tax nexus
test("Sales tax nexus: every CA, TX, NY threshold > 100k", () => {
  for (const st of ["CA", "TX", "NY"]) {
    assert.ok(SALES_TAX_NEXUS[st].sales_threshold_usd >= 100000);
  }
});
test("Sales tax nexus: NY has both sales + transactions threshold", () => {
  assert.ok(SALES_TAX_NEXUS.NY.sales_threshold_usd > 0);
  assert.ok(SALES_TAX_NEXUS.NY.transactions_threshold > 0);
});
test("Sales tax nexus: every entry has non-empty citation", () => {
  for (const [st, v] of Object.entries(SALES_TAX_NEXUS)) {
    assert.ok(v.citation && v.citation.length > 5, st + " citation too short");
  }
});
test("Sales tax nexus: compute returns the row", () => {
  const r = computeSalesTaxNexus({ state: "FL" });
  assert.equal(r.sales_threshold_usd, 100000);
});

// 267 OSHA
test("OSHA: 7 topics bundled", () => { assert.equal(OSHA_RECORDKEEPING.length, 7); });
test("OSHA: 5-year retention is mentioned", () => {
  const ret = OSHA_RECORDKEEPING.find((e) => e.topic === "Retention");
  assert.ok(ret); assert.match(ret.note, /5 years|five year/i);
});
test("OSHA: severe-injury reporting includes 8 / 24 hour windows", () => {
  const sev = OSHA_RECORDKEEPING.find((e) => e.topic === "Severe injury reporting");
  assert.ok(sev); assert.match(sev.note, /8 hours/); assert.match(sev.note, /24 hours/);
});
test("OSHA: 300A posting period spans Feb 1 - Apr 30", () => {
  const f = OSHA_RECORDKEEPING.find((e) => e.topic === "Form 300A");
  assert.ok(f); assert.match(f.note, /February 1/); assert.match(f.note, /April 30/);
});

// 268 Lab safety
test("Lab safety: includes all 8 mandatory GHS pictograms + Environment", () => {
  const names = GHS_PICTOGRAMS.map((p) => p.name);
  for (const expected of ["Health Hazard", "Flame", "Exclamation Mark", "Gas Cylinder", "Corrosion", "Exploding Bomb", "Flame Over Circle", "Skull and Crossbones"]) {
    assert.ok(names.includes(expected), "missing pictogram " + expected);
  }
});
test("Lab safety: spill tree is exactly 4 steps in correct order", () => {
  const steps = SPILL_DECISION_TREE.map((s) => s.step);
  assert.deepEqual(steps, ["Assess", "Evacuate", "Contain", "Report"]);
});
test("Lab safety: every spill step has actions text > 50 chars", () => {
  for (const s of SPILL_DECISION_TREE) assert.ok(s.actions.length > 50, s.step + " actions too short");
});
test("Lab safety: assess step mentions SDS", () => {
  const assess = SPILL_DECISION_TREE.find((s) => s.step === "Assess");
  assert.ok(assess); assert.match(assess.actions, /SDS/);
});

// --- Sales tax nexus 50-state coverage assertions ---

test("Sales tax nexus: every entry has positive sales threshold", () => {
  for (const [st, v] of Object.entries(SALES_TAX_NEXUS)) {
    assert.ok(v.sales_threshold_usd > 0, st + " threshold not positive");
  }
});
test("Sales tax nexus: thresholds in published bands ($100k / $250k / $500k)", () => {
  const bands = new Set([100000, 250000, 500000]);
  for (const [st, v] of Object.entries(SALES_TAX_NEXUS)) {
    assert.ok(bands.has(v.sales_threshold_usd), st + " threshold " + v.sales_threshold_usd + " outside published bands");
  }
});
test("Sales tax nexus: every entry has citation + verified_on ISO", () => {
  for (const [st, v] of Object.entries(SALES_TAX_NEXUS)) {
    assert.ok(v.citation && v.citation.length > 5, st + " citation too short");
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(v.verified_on), st + " bad verified_on");
  }
});
test("Sales tax nexus: TX / CA / NY at $500k", () => {
  for (const st of ["TX", "CA", "NY"]) assert.equal(SALES_TAX_NEXUS[st].sales_threshold_usd, 500000);
});
test("Sales tax nexus: AL and MS at $250k", () => {
  for (const st of ["AL", "MS"]) assert.equal(SALES_TAX_NEXUS[st].sales_threshold_usd, 250000);
});
test("Sales tax nexus: DE / MT / NH / OR not bundled (no general sales tax)", () => {
  for (const st of ["DE", "MT", "NH", "OR"]) assert.ok(!SALES_TAX_NEXUS[st], st + " should not be bundled (no sales tax)");
});
