// Unit tests for calc-references.js (utilities 114-118).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeColorCodes,
  computeKnotReference,
  computeInspectionChecklist,
  computeEmergencyContacts,
  computeToolMaintenance,
  COLOR_CODES,
  KNOT_REFERENCE,
  INSPECTION_CHECKLISTS,
  EMERGENCY_CONTACTS,
  TOOL_MAINTENANCE,
  REFERENCE_RENDERERS,
} from "../../calc-references.js";

// --- Utility 114: Color Codes ---

test("Color codes: returns 4 systems", () => {
  const r = computeColorCodes();
  assert.equal(r.systems.length, 4);
});

test("Color codes: every system has a name and entries", () => {
  for (const s of COLOR_CODES) {
    assert.ok(typeof s.system === "string");
    assert.ok(Array.isArray(s.entries) && s.entries.length > 0);
  }
});

test("Color codes: every entry has item and color", () => {
  for (const s of COLOR_CODES) {
    for (const e of s.entries) {
      assert.ok(typeof e.item === "string");
      assert.ok(typeof e.color === "string");
    }
  }
});

test("Color codes: includes IEC industrial system", () => {
  const found = COLOR_CODES.some((s) => /IEC/i.test(s.system));
  assert.ok(found);
});

test("Color codes: includes ASME A13.1 piping", () => {
  const found = COLOR_CODES.some((s) => /A13\.1/i.test(s.system));
  assert.ok(found);
});

// --- Utility 115: Knot Reference ---

test("Knot reference: returns 5+ knots", () => {
  const r = computeKnotReference();
  assert.ok(r.knots.length >= 5);
});

test("Knot reference: includes bowline", () => {
  const found = KNOT_REFERENCE.some((k) => /bowline/i.test(k.knot));
  assert.ok(found);
});

test("Knot reference: includes figure-eight", () => {
  const found = KNOT_REFERENCE.some((k) => /figure-eight/i.test(k.knot));
  assert.ok(found);
});

test("Knot reference: every knot has use, strength_reduction, note", () => {
  for (const k of KNOT_REFERENCE) {
    assert.ok(k.use && k.strength_reduction && k.note);
  }
});

test("Knot reference: bowline strength reduction mentioned", () => {
  const b = KNOT_REFERENCE.find((k) => /bowline/i.test(k.knot));
  assert.ok(/percent/i.test(b.strength_reduction));
});

// --- Utility 116: Inspection Checklists ---

test("Inspection: includes 4 trades", () => {
  const r = computeInspectionChecklist();
  assert.equal(Object.keys(r.trades).length, 4);
});

test("Inspection: each trade has at least 5 items", () => {
  for (const items of Object.values(INSPECTION_CHECKLISTS)) {
    assert.ok(items.length >= 5);
  }
});

test("Inspection: items are non-empty strings", () => {
  for (const items of Object.values(INSPECTION_CHECKLISTS)) {
    for (const item of items) {
      assert.ok(typeof item === "string" && item.length > 10);
    }
  }
});

test("Inspection: includes Electrical, Plumbing, HVAC, Carpentry", () => {
  const keys = Object.keys(INSPECTION_CHECKLISTS);
  assert.ok(keys.includes("Electrical"));
  assert.ok(keys.includes("Plumbing"));
  assert.ok(keys.includes("HVAC"));
  assert.ok(keys.includes("Carpentry"));
});

test("Inspection: HVAC mentions condensate or venting", () => {
  const hvac = INSPECTION_CHECKLISTS.HVAC.join(" ");
  assert.ok(/condensate|venting/i.test(hvac));
});

// --- Utility 117: Emergency Contacts ---

test("Emergency: includes 811", () => {
  const found = EMERGENCY_CONTACTS.some((c) => c.number.includes("811"));
  assert.ok(found);
});

test("Emergency: includes Poison Control 1-800-222-1222", () => {
  const found = EMERGENCY_CONTACTS.some((c) => c.number.includes("222-1222"));
  assert.ok(found);
});

test("Emergency: includes OSHA hotline", () => {
  const found = EMERGENCY_CONTACTS.some((c) => /osha/i.test(c.purpose));
  assert.ok(found);
});

test("Emergency: every contact has number, purpose, and note", () => {
  for (const c of EMERGENCY_CONTACTS) {
    assert.ok(c.number && c.purpose && c.note);
  }
});

test("Emergency: returns at least 5 contacts", () => {
  const r = computeEmergencyContacts();
  assert.ok(r.contacts.length >= 5);
});

// --- Utility 118: Tool Maintenance ---

test("Tool maintenance: returns 5+ tools", () => {
  const r = computeToolMaintenance();
  assert.ok(r.tools.length >= 5);
});

test("Tool maintenance: every entry has tool, interval, action", () => {
  for (const t of TOOL_MAINTENANCE) {
    assert.ok(t.tool && t.interval && t.action);
  }
});

test("Tool maintenance: includes generator", () => {
  const found = TOOL_MAINTENANCE.some((t) => /generator/i.test(t.tool));
  assert.ok(found);
});

test("Tool maintenance: includes circular saw", () => {
  const found = TOOL_MAINTENANCE.some((t) => /circular saw/i.test(t.tool));
  assert.ok(found);
});

test("Tool maintenance: actions are descriptive (>10 chars)", () => {
  for (const t of TOOL_MAINTENANCE) {
    assert.ok(t.action.length > 10);
  }
});

// --- Renderer registry ---

test("REFERENCE_RENDERERS exposes 18 ids (v1 5 + v3 6 + v5 4 + v177/v178 electrician 2 + v187 pool-bonding 1)", () => {
  assert.equal(Object.keys(REFERENCE_RENDERERS).length, 18);
});

test("REFERENCE_RENDERERS: every value is a function", () => {
  for (const v of Object.values(REFERENCE_RENDERERS)) {
    assert.equal(typeof v, "function");
  }
});
