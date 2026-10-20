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

test("building codes: six rows files exist and pass; all six codes have all 51 drafted, unsigned; the NEC rows are unchanged by them", () => {
  for (const c of BUILDING_CODES) {
    const doc = loadCodeRows(c);
    assert.ok(doc, c);
    assert.deepEqual(validateCodeRows(c, doc, TODAY).errors, [], c);
  }
  const shards = buildCodeShards(Object.fromEntries(BUILDING_CODES.map((c) => [c, loadCodeRows(c)])));
  assert.deepEqual(Object.keys(shards), BUILDING_CODES, "every building code has its rows");
  for (const c of BUILDING_CODES) {
    assert.equal(Object.keys(shards[c].by_state).length, 51, c);
    assert.ok(Object.values(loadCodeRows(c).rows).every((r) => r.verified_by === null && r.verified_on === null), c + ": a person signs a row, never the drafter");
  }
  const withCodes = buildCodeAdoptionShard(loadRows(), TODAY);
  const necOnly = buildCodeAdoptionShard(loadRows(), TODAY, {});
  assert.equal("codes" in necOnly, false);
  assert.deepEqual(withCodes.by_state, necOnly.by_state, "the NEC rows are byte-for-byte the same with the IRC beside them");
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
  assert.match(codeAdoptionLine("IPC", "California", { ...ca, scope: "California Plumbing Code 2025, on UPC 2024." }, "2027", TODAY, 92).text, /may not apply\. California Plumbing Code 2025, on UPC 2024\./, "the other family's edition is named");
  assert.equal(codeAdoptionLine("IRC", "California", undefined, "2024", TODAY, 92), null);
  const oh = { ...okRow(), review: null };
  assert.match(codeAdoptionLine("IRC", "Ohio", oh, "2024", TODAY, 92).text, /Ohio enforces IRC 2024 for residential buildings \(since Jan 1, 2025\), with state amendments\. This calculator follows IRC 2024\./);
});

test("building codes: a state code of its own, a limited adoption and an upcoming edition each read right", () => {
  const wi = { name: "Wisconsin", status: "statewide", family: "other", editions: [], upcoming: [], scope: "Uniform Dwelling Code.", citation: "Wis. Admin. Code SPS 320", source_url: "https://docs.legis.wisconsin.gov/code/admin_code/sps/safety_and_buildings_and_environment/320_325/320", citation_primary: true, verified_on: null, verified_by: null, review: null };
  const w = codeAdoptionLine("IRC", "Wisconsin", wi, "2024", TODAY, 92).text;
  assert.match(w, /Wisconsin enforces a code of its own, not based on the IRC this calculator follows/);
  assert.ok(!/enforces \./.test(w), "never an empty edition list");
  const tx = { ...okRow({ name: "Texas", status: "limited", scope: "Inside cities only.", editions: [{ edition: "2012", applies_to: "all", effective: "2022-01-01" }] }), review: null };
  assert.match(codeAdoptionLine("IRC", "Texas", tx, "2024", TODAY, 92).text, /Texas has a limited state adoption: IRC 2012 \(since Jan 1, 2022\)\. Applies to: Inside cities only\./);
  const sc = { ...okRow({ name: "South Carolina", editions: [{ edition: "2021", applies_to: "all", effective: "2023-01-01" }], upcoming: [{ edition: "2024", applies_to: "all", effective: "2027-01-01" }] }), review: null };
  assert.match(codeAdoptionLine("IRC", "South Carolina", sc, "2024", TODAY, 92).text, /IRC 2021 \(since Jan 1, 2023\), with state amendments\. IRC 2024 takes effect Jan 1, 2027\./);
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
