// spec-v22 Citation Integrity II — concrete findings register regression tests.
// Each asserts a CF-NN fix holds and its gate would catch a recurrence.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (name) => readFile(resolve(ROOT, name), "utf8");

// --- CF-01: edition-note relevance ---

test("CF-01: no non-NEC tile carries NEC_DISCLOSURE", async () => {
  const { CITATIONS } = await import("../../citations.js");
  const NEC_NOTE = "ambient corrections and ampacity ranges";
  const offenders = [];
  for (const [id, c] of Object.entries(CITATIONS)) {
    if (typeof c.editionNote !== "string" || !c.editionNote.includes(NEC_NOTE)) continue;
    const text = [c.formula, c.edition, c.governance].join(" ");
    if (!/\bNEC\b|\bNFPA[\s-]*70\b/i.test(text)) offenders.push(id);
  }
  assert.deepEqual(offenders, [], "tiles wearing the NEC ampacity note without citing the NEC: " + offenders.join(", "));
});

test("CF-01: the eight enumerated tiles now carry domain-appropriate notes", async () => {
  const { CITATIONS } = await import("../../citations.js");
  const eight = ["noise-dose", "svi-sludge-index", "sprayer-calibration", "thi-livestock",
    "lightning-countdown", "excavation-bench-plan", "nfpa-1142-water-supply", "scba-cylinder-time"];
  for (const id of eight) {
    assert.ok(CITATIONS[id], id + " exists");
    assert.ok(!CITATIONS[id].editionNote.includes("ampacity ranges"), id + " no longer wears the NEC note");
  }
});

// --- CF-05 / CF-06: link hygiene ---

test("CF-05/06: no defunct/non-whitelisted citation hosts", async () => {
  const text = await read("citations.js");
  assert.ok(!text.includes("convertit.com"), "convertit.com removed (CF-06)");
  assert.ok(!text.includes("movable-type.co.uk"), "movable-type.co.uk removed (CF-05)");
  // No second-level foreign ccTLD the linkifier cannot render.
  const foreign = [...text.matchAll(/\b[a-z0-9-]+\.(?:co|com|org|net|gov|ac)\.[a-z]{2}\b/gi)].map((m) => m[0]);
  assert.deepEqual(foreign, [], "non-whitelisted domains: " + foreign.join(", "));
});

// --- CF-08: 320px overflow guard ---

test("CF-08: .citation-link keeps the overflow-wrap break guard", async () => {
  const css = await read("styles.css");
  const block = css.slice(css.indexOf(".citation-link"), css.indexOf(".citation-link") + 400);
  assert.match(block, /overflow-wrap:\s*anywhere/, "overflow-wrap: anywhere protects long URL tokens at 320px");
  assert.match(block, /word-break:\s*break-word/, "word-break: break-word belt-and-suspenders");
});

// --- CF-09: numeric prose convention ---

test("CF-09: citations.js carries no spelled-out '<number> percent' or 'in dollars'", async () => {
  const text = await read("citations.js");
  const pct = [...text.matchAll(/\d+(?:\.\d+)?\s+percent\b/g)].map((m) => m[0]);
  const dol = [...text.matchAll(/\bin dollars\b/g)].map((m) => m[0]);
  assert.deepEqual(pct, [], "spelled-out percents: " + pct.join(", "));
  assert.deepEqual(dol, [], "'in dollars' uses: " + dol.join(", "));
});

// --- CF-02 / CF-03: cycle table + ledger ---

test("CF-03: every cycle row with a passed next_expected carries a last_verified re-stamp", async () => {
  const cycle = JSON.parse(await read("scripts/sources-cycle.json"));
  const today = new Date();
  const parse = (s) => {
    const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(s || "");
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +(m[3] || 1))) : null;
  };
  for (const s of cycle.standards) {
    const next = parse(s.next_expected);
    if (!next || next >= today) continue;
    const verified = parse(s.last_verified);
    assert.ok(verified && verified >= next,
      s.id + ": next_expected " + s.next_expected + " passed but has no valid last_verified re-stamp (CF-03)");
  }
});

test("CF-02 ledger-completeness: every tracked source has a ledger row", async () => {
  const cycle = JSON.parse(await read("scripts/sources-cycle.json"));
  const ledger = await read("docs/citation-freshness-ledger.md");
  for (const s of cycle.standards) {
    assert.ok(ledger.includes("`" + s.id + "`"), "ledger missing row for tracked source '" + s.id + "'");
  }
});

test("CF-02: NEC disclosed-lag — cycle row advanced to 2026, disclosure names it", async () => {
  const cycle = JSON.parse(await read("scripts/sources-cycle.json"));
  const nec = cycle.standards.find((s) => s.id === "nec");
  assert.equal(nec.current_edition, "2026");
  const text = await read("citations.js");
  assert.match(text, /NEC 2026 is the current published edition/, "NEC_DISCLOSURE discloses 2026");
});
