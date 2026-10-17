// spec-v1968 (spec-v106 roadmap pillar 1): the NEC edition each state
// enforces. A wrong enforced edition is worse than none, so every rule that
// keeps a row honest is seeded red here, and a row that is unsigned or past
// its recheck must never render an edition.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRows, validateRows, buildCodeAdoptionShard, JURISDICTIONS } from "../../scripts/code-adoption.mjs";
import { editionsOn, adoptionLine, isFresh, tileNecEdition, citesNec, mountStatePicker } from "../../code-adoption.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TODAY = "2026-10-17";
const clone = (x) => JSON.parse(JSON.stringify(x));
const errorsOf = (doc, today = TODAY) => validateRows(doc, today).errors;

test("the drafted rows pass: all 50 states and DC, each cited", () => {
  const doc = loadRows();
  assert.deepEqual(errorsOf(doc), []);
  assert.equal(Object.keys(doc.rows).length, 51);
  assert.equal(JURISDICTIONS.length, 51);
  for (const r of Object.values(doc.rows)) assert.ok(r.citation && r.source_url.startsWith("https://"));
});

test("each rule is seeded red", () => {
  const base = loadRows();
  const seed = (fn) => { const d = clone(base); fn(d); return errorsOf(d); };
  const hits = (errs, re) => errs.some((e) => re.test(e));

  assert.ok(hits(seed((d) => { delete d.rows.WY; }), /WY: row missing/), "a missing state");
  assert.ok(hits(seed((d) => { d.rows.GA.citation = " "; }), /GA: no citation/), "an uncited row");
  assert.ok(hits(seed((d) => { d.rows.GA.source_url = "http://example.gov"; }), /GA: source_url/), "a non-https source");
  assert.ok(hits(seed((d) => { d.rows.GA.status = "maybe"; }), /GA: status/), "an unknown status");
  // A mistyped edition the NFPA map does not show, with no explanation.
  assert.ok(hits(seed((d) => { d.rows.GA.editions[0].edition = "2020"; }), /GA: NEC 2020 disagrees with the NFPA map/), "a wrong edition");
  assert.ok(hits(seed((d) => { d.rows.GA.editions[0].effective = "Jan 2025"; }), /GA: effective/), "a non-ISO date");
  assert.ok(hits(seed((d) => { d.rows.AZ.editions = [{ applies_to: "all", edition: "2023", effective: "2024-01-01" }]; }), /AZ: local rows list no editions/), "a local row with an edition");
  assert.ok(hits(seed((d) => { d.rows.GA.scope = "x".repeat(141); }), /GA: scope is 141 characters/), "a shipped string over the prose cap");
  // Sign-off rules.
  assert.ok(hits(seed((d) => { d.rows.GA.verified_on = TODAY; }), /GA: verified_on is set but verified_by is empty/), "a date without a signer");
  assert.ok(hits(seed((d) => { d.rows.GA.verified_by = "me"; }), /GA: verified_by is set but verified_on/), "a signer without a date");
  assert.ok(hits(seed((d) => { Object.assign(d.rows.IL, { verified_by: "me", verified_on: TODAY }); }), /IL: signed, but its citation is not a primary source/), "signing a secondary citation");
  assert.ok(hits(seed((d) => { Object.assign(d.rows.GA, { verified_by: "me", verified_on: "2026-12-01" }); }), /GA: verified_on 2026-12-01 is in the future/), "a future sign-off");
  assert.ok(hits(seed((d) => { Object.assign(d.rows.GA, { verified_by: "me", verified_on: "2026-01-01" }); }), /GA: verified 289 days ago, two rechecks late/), "a forgotten recheck");
  const late = clone(base);
  Object.assign(late.rows.GA, { verified_by: "me", verified_on: "2026-06-01" });
  assert.deepEqual(errorsOf(late), []);
  assert.ok(validateRows(late, TODAY).warnings.some((w) => /GA: verified 138 days ago, past its 92-day recheck/.test(w)), "one recheck late warns");
});

test("the shipped shard carries the signed rows only, and matches the rows file", () => {
  const doc = loadRows();
  const shard = JSON.parse(readFileSync(resolve(ROOT, "data/legal/code-adoption.json"), "utf8"));
  assert.deepEqual(shard, buildCodeAdoptionShard(doc, shard.fetched));
  assert.equal(Object.keys(shard.names).length, 51);
  const signed = clone(doc);
  Object.assign(signed.rows.GA, { verified_by: "me", verified_on: TODAY });
  const built = buildCodeAdoptionShard(signed, TODAY);
  assert.deepEqual(Object.keys(built.by_state), ["GA", "verifiedOn"]);
  assert.equal(built.by_state.verifiedOn, TODAY);
  for (const f of ["draft_note", "nfpa_2026_08_03", "citation_primary"]) assert.ok(!(f in built.by_state.GA), f + " must not ship");
});

test("the edition in force is resolved as of the day, scope by scope", () => {
  const { rows } = loadRows();
  const on = (k, day) => editionsOn(rows[k], day).map((e) => e.applies_to + ":" + e.edition).join(",");
  assert.equal(on("WA", "2026-12-30"), "all:2023");
  assert.equal(on("WA", "2026-12-31"), "all:2026");
  assert.equal(on("SC", "2026-12-31"), "all:2020");
  assert.equal(on("SC", "2027-01-01"), "all:2023");
  assert.equal(on("MI", TODAY), "other-than-one-two-family:2023,one-two-family:2014");
  assert.equal(on("NC", TODAY), "other-than-one-two-family:2020,one-two-family:2017");
});

test("an unsigned, missing or stale row never shows an edition", () => {
  const { rows } = loadRows();
  const ga = { ...rows.GA, verified_by: "me", verified_on: "2026-10-01" };
  const shown = adoptionLine("Georgia", ga, "2023", TODAY, 92);
  assert.equal(shown.verified, true);
  assert.equal(shown.text, "Georgia enforces NEC 2023 (since Jan 1, 2025). This calculator follows NEC 2023.");
  assert.equal(shown.source.href, ga.source_url);
  for (const [why, row, day] of [["unsigned", rows.GA, TODAY], ["missing", undefined, TODAY], ["stale", ga, "2027-01-02"]]) {
    const r = adoptionLine("Georgia", row, "2023", day, 92);
    assert.equal(r.verified, false, why);
    assert.ok(!/NEC 20\d\d/.test(r.text), why + " row printed an edition: " + r.text);
    assert.equal(r.source, undefined, why);
  }
  assert.equal(isFresh(ga, "2027-01-01", 92), true);
  assert.equal(isFresh(ga, "2027-01-02", 92), false);
});

test("the sentence for split, limited, local and upcoming rows", () => {
  const { rows } = loadRows();
  const sign = (r) => ({ ...r, verified_by: "me", verified_on: TODAY });
  assert.equal(adoptionLine("Michigan", sign(rows.MI), "2023", TODAY, 92).text,
    "Michigan enforces NEC 2023 for buildings other than one- and two-family dwellings (since Mar 12, 2024) and NEC 2014 for one- and two-family dwellings (since Feb 8, 2016), with state amendments. This calculator follows NEC 2023.");
  assert.match(adoptionLine("Kansas", sign(rows.KS), null, TODAY, 92).text,
    /^Kansas has a limited state adoption: NEC 2008 for state buildings \(since Feb 4, 2011\)\. Applies to: State-owned buildings/);
  assert.equal(adoptionLine("Arizona", sign(rows.AZ), null, TODAY, 92).text, "Arizona adopts no statewide NEC: your city or county sets the edition.");
  assert.match(adoptionLine("Washington", sign(rows.WA), "2023", TODAY, 92).text, /NEC 2023 \(since Apr 1, 2024\), with state amendments\. NEC 2026 takes effect Dec 31, 2026\./);
  assert.match(adoptionLine("Georgia", sign(rows.GA), null, TODAY, 92).text, /cites NEC sections by name; check them against that edition\.$/);
});

test("which tiles get the row, and the edition each follows", async () => {
  const { CITATIONS } = await import("../../citations.js");
  const nec = Object.entries(CITATIONS).filter(([, c]) => c && typeof c === "object" && citesNec(c.edition));
  assert.ok(nec.length > 90, "only " + nec.length + " NEC-citing tiles");
  assert.equal(tileNecEdition(CITATIONS["wire-ampacity"].edition), "2023");
  assert.equal(tileNecEdition("NEC (NFPA 70) Article 310 paralleled-conductor provisions"), null);
  assert.equal(citesNec("NFPA 72 (National Fire Alarm and Signaling Code)"), false);
  assert.equal(citesNec("NFPA 70E-2024"), false);
});

test("no picker appears until a row is signed", async () => {
  const made = [];
  globalThis.document = { createElement: () => { const el = { children: [], appendChild(c) { this.children.push(c); } }; made.push(el); return el; } };
  try {
    const block = { querySelector: () => null };
    const entry = { edition: "NEC 2023 (NFPA 70)." };
    const shard = buildCodeAdoptionShard(loadRows(), TODAY);
    assert.equal(await mountStatePicker(block, entry, shard), null);
    assert.equal(made.length, 0, "nothing is built when no row is signed");
  } finally {
    delete globalThis.document;
  }
});
