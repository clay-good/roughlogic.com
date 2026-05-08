// Unit tests for calc-references.js v3 utilities (174 through 179).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HAND_SIGNALS, computeHandSignals,
  OSHA_TOP_10, computeOSHATop10,
  LOTO_STEPS, computeLOTO,
  DEFENSIBLE_SPACE, computeDefensibleSpace,
  STORM_SHELTER, computeStormShelter,
  TRIAGE_CATEGORIES, computeTriage,
  REFERENCE_RENDERERS,
} from "../../calc-references.js";

// 174 Hand signals
test("Hand signals: registry non-empty", () => { assert.ok(HAND_SIGNALS.length >= 8); });
test("Hand signals: every entry has domain, signal, description", () => { for (const s of HAND_SIGNALS) { assert.ok(s.domain && s.signal && s.description); } });
test("Hand signals: covers crane, excavator, flagger, marshalling", () => { const ds = new Set(HAND_SIGNALS.map((s) => s.domain)); for (const d of ["Crane", "Excavator", "Flagger", "Aircraft marshalling"]) assert.ok(ds.has(d)); });
test("Hand signals: compute returns the registry", () => { assert.equal(computeHandSignals().signals.length, HAND_SIGNALS.length); });
test("Hand signals: descriptions are non-empty strings", () => { for (const s of HAND_SIGNALS) assert.ok(s.description.length > 10); });

// 175 OSHA Top 10
test("OSHA Top 10: ten items", () => { assert.equal(OSHA_TOP_10.items.length, 10); });
test("OSHA Top 10: ranks 1-10 unique", () => { const ranks = OSHA_TOP_10.items.map((i) => i.rank).sort((a, b) => a - b); assert.deepEqual(ranks, [1,2,3,4,5,6,7,8,9,10]); });
test("OSHA Top 10: every standard cited by 29 CFR section", () => { for (const i of OSHA_TOP_10.items) assert.match(i.standard, /^29 CFR /); });
test("OSHA Top 10: publication string set", () => { assert.ok(OSHA_TOP_10.publication.length > 0); });
test("OSHA Top 10: compute returns publication and items", () => { const r = computeOSHATop10(); assert.equal(r.items.length, 10); assert.ok(r.publication.includes("OSHA")); });

// 176 LOTO
test("LOTO: nine steps", () => { assert.equal(LOTO_STEPS.length, 9); });
test("LOTO: steps numbered 1-9 in order", () => { for (let i = 0; i < LOTO_STEPS.length; i++) assert.equal(LOTO_STEPS[i].step, i + 1); });
test("LOTO: every step has action text", () => { for (const s of LOTO_STEPS) assert.ok(s.action.length > 20); });
test("LOTO: cite 29 CFR 1910.147", () => { assert.match(computeLOTO().citation, /1910\.147/); });
test("LOTO: compute returns step list", () => { const r = computeLOTO(); assert.equal(r.steps.length, 9); });

// 177 Defensible space
test("Defensible: three zones", () => { assert.equal(DEFENSIBLE_SPACE.length, 3); });
test("Defensible: every zone has zone, purpose, actions", () => { for (const z of DEFENSIBLE_SPACE) { assert.ok(z.zone && z.purpose && z.actions); } });
test("Defensible: Zone 0 mentions ember-resistant", () => { const z0 = DEFENSIBLE_SPACE[0]; assert.match(z0.purpose, /ember/i); });
test("Defensible: cite CALFIRE / NFPA", () => { assert.match(computeDefensibleSpace().citation, /CALFIRE|NFPA/); });
test("Defensible: compute returns zone list", () => { const r = computeDefensibleSpace(); assert.equal(r.zones.length, 3); });

// 178 Storm shelter
test("Storm shelter: at least 5 topics", () => { assert.ok(STORM_SHELTER.length >= 5); });
test("Storm shelter: every topic has topic and note", () => { for (const t of STORM_SHELTER) { assert.ok(t.topic && t.note); } });
test("Storm shelter: cites FEMA P-320 by name only", () => { assert.match(computeStormShelter().citation, /FEMA P-320/); });
test("Storm shelter: no figure reproduction", () => { assert.match(computeStormShelter().citation, /No reproduction/); });
test("Storm shelter: compute returns topic list", () => { const r = computeStormShelter(); assert.ok(r.topics.length >= 5); });

// 179 Triage
test("Triage: four START categories", () => { assert.equal(TRIAGE_CATEGORIES.length, 4); });
test("Triage: covers immediate, delayed, minor, expectant", () => { const cats = TRIAGE_CATEGORIES.map((c) => c.category.toLowerCase()); assert.ok(cats.some((c) => c.includes("immediate"))); assert.ok(cats.some((c) => c.includes("delayed"))); assert.ok(cats.some((c) => c.includes("minor"))); assert.ok(cats.some((c) => c.includes("expectant") || c.includes("deceased"))); });
test("Triage: notice mentions not medical advice and 911", () => { const r = computeTriage(); assert.match(r.notice, /not medical advice/i); assert.match(r.notice, /911/); });
test("Triage: notice references sophiewell.com", () => { assert.match(computeTriage().notice, /sophiewell\.com/); });
test("Triage: compute returns categories array", () => { assert.equal(computeTriage().categories.length, 4); });

// Renderer registry
test("REFERENCE_RENDERERS: includes all six v3 ids", () => {
  for (const id of ["hand-signals", "osha-top10", "loto-steps", "defensible-space", "storm-shelter", "triage-quickread"]) {
    assert.equal(typeof REFERENCE_RENDERERS[id], "function", id);
  }
});
