// spec-v1974: the state's edition for the building codes, by code family.
import { test } from "node:test";
import assert from "node:assert/strict";
import { codesCited, tileCodeEdition, codeAdoptionLine, mountStatePicker } from "../../code-adoption.js";
import { BUILDING_CODES, loadCodeRows, validateCodeRows, buildCodeShards, buildCodeAdoptionShard, loadRows } from "../../scripts/code-adoption.mjs";

const TODAY = "2026-10-20";
const okRow = (over = {}) => ({
  name: "Ohio", status: "statewide-amended", family: "IRC",
  editions: [{ edition: "2024", applies_to: "residential", effective: "2025-01-01" }],
  citation: "Ohio Adm.Code 4101:8-1-01", source_url: "https://codes.ohio.gov/ohio-administrative-code/rule-4101:8-1-01", citation_primary: true,
  verified_on: null, verified_by: null, ...over,
});

test("building codes: six empty rows files exist and pass; the NEC shard is unchanged by them", () => {
  for (const c of BUILDING_CODES) {
    const doc = loadCodeRows(c);
    assert.ok(doc, c);
    assert.deepEqual(validateCodeRows(c, doc, TODAY).errors, [], c);
  }
  assert.equal(buildCodeShards(Object.fromEntries(BUILDING_CODES.map((c) => [c, loadCodeRows(c)]))), null);
  assert.equal("codes" in buildCodeAdoptionShard(loadRows(), TODAY), false);
});

test("building codes: each rule, seeded red, is caught, and a UPC row may not carry an IPC edition", () => {
  const doc = (code, rows) => ({ code, cadence_days: 92, rows });
  assert.deepEqual(validateCodeRows("IRC", doc("IRC", { OH: okRow() }), TODAY).errors, []);
  const seeds = [
    ["IPC", { CA: okRow({ name: "California", family: "UPC", editions: [{ edition: "2027", applies_to: "all", effective: "2027-01-01" }] }) }],
    ["IRC", { OH: okRow({ family: "UPC" }) }],
    ["IRC", { OH: okRow({ editions: [{ edition: "2024", applies_to: "porches", effective: "2025-01-01" }] }) }],
    ["IRC", { OH: okRow({ source_url: "http://example.com" }) }],
    ["IRC", { OH: okRow({ verified_on: "2026-10-01", verified_by: "x", citation_primary: false }) }],
    ["IRC", { OH: okRow({ verified_on: "2026-12-01", verified_by: "x" }) }],
    ["IRC", { XX: okRow() }],
    ["IRC", { OH: okRow({ editions: [] }) }],
    ["IRC", { OH: okRow({ citation: "" }) }],
  ];
  for (const [code, rows] of seeds) assert.ok(validateCodeRows(code, doc(code, rows), TODAY).errors.length > 0, JSON.stringify(rows).slice(0, 90));
  assert.ok(validateCodeRows("IPC", doc("IRC", {}), TODAY).errors.length > 0, "a file naming another code");
  assert.deepEqual(validateCodeRows("IPC", doc("IPC", { CA: okRow({ name: "California", family: "UPC", editions: [] , status: "statewide" }) }), TODAY).errors, [], "a UPC row with no IPC edition is fine");
});

test("building codes: the citation matcher finds the codes a tile names, and not the Internal Revenue Code", () => {
  assert.deepEqual(codesCited("IRC 2024 R1001.10 and IBC 2027 Section 1008.2"), ["IRC", "IBC"]);
  assert.deepEqual(codesCited("IRC 179 expensing, IRC 168(k) bonus depreciation"), []);
  assert.deepEqual(codesCited("IPC 2027 Table 709.1"), ["IPC"]);
  assert.equal(tileCodeEdition("IPC", "IPC 2027 Table 709.1"), "2027");
});

test("building codes: a UPC state reads the family sentence on an IPC tile; an undrafted state reads nothing", () => {
  const ca = { name: "California", status: "statewide-amended", family: "UPC", editions: [], citation: "Cal. Code Regs. tit. 24, pt. 5", source_url: "https://www.dgs.ca.gov/BSC", citation_primary: true, verified_on: null, verified_by: null, review: null };
  const r = codeAdoptionLine("IPC", "California", ca, "2027", TODAY, 92);
  assert.match(r.text, /California adopts the Uniform Plumbing Code, not the IPC this calculator follows, so its IPC rule may not apply/);
  assert.match(r.text, /^Not verified/);
  assert.equal(codeAdoptionLine("IRC", "California", undefined, "2024", TODAY, 92), null);
  const oh = { ...okRow(), review: null };
  assert.match(codeAdoptionLine("IRC", "Ohio", oh, "2024", TODAY, 92).text, /Ohio enforces IRC 2024 for residential buildings \(since Jan 1, 2025\), with state amendments\. This calculator follows IRC 2024\./);
});

test("building codes: a tile citing two codes gets two lines under one picker", async () => {
  const kids = (n) => n.children.flatMap((c) => [c, ...(c.children ? kids(c) : [])]);
  const el = (tag) => ({ tag, children: [], attrs: {}, value: "", textContent: "", className: "", listeners: {},
    appendChild(c) { this.children.push(c); }, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { this.listeners[t] = f; } });
  globalThis.document = { createElement: el, createTextNode: (t) => ({ text: t }) };
  try {
    const dl = el("dl");
    const block = { querySelector: (q) => (q === ".v6-reference-list" ? dl : null) };
    const oh = (family, code, scope) => ({ ...okRow({ family }), editions: [{ edition: "2024", applies_to: scope, effective: "2025-01-01" }], review: null });
    const shard = { names: { OH: "Ohio", CA: "California" }, cadence_days: 92, by_state: {},
      codes: { IRC: { cadence_days: 92, by_state: { OH: oh("IRC", "IRC", "residential") } }, IBC: { cadence_days: 92, by_state: { OH: oh("IBC", "IBC", "commercial") } } } };
    const row = await mountStatePicker(block, { edition: "IRC 2024 R507 and IBC 2027 Section 1607.9" }, shard);
    assert.ok(row, "a picker is built from building-code rows alone");
    const select = kids(row).find((n) => n.tag === "select");
    select.value = "OH";
    select.listeners.change();
    const lines = kids(row).filter((n) => n.tag === "p" && n.children.length).map((p) => p.children.map((c) => c.text || c.textContent || "").join(""));
    assert.equal(lines.length, 2);
    assert.match(lines[0], /Ohio enforces IRC 2024 for residential buildings/);
    assert.match(lines[1], /Ohio enforces IBC 2024 for commercial buildings/);
    assert.equal(await mountStatePicker(block, { edition: "IECC 2024 Table R402.1.2" }, shard), null, "a code with no drafted rows shows nothing");
  } finally {
    delete globalThis.document;
  }
});
