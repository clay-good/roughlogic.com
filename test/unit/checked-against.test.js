// spec-v1965 (spec-v106 roadmap pillar 4): each static page says, under its
// worked example, which published sources the calculator is checked against,
// or that none covers it. A trust claim that names the wrong source is worse
// than none, so this holds every page's line to the tile's own registry rows,
// independently of the builder's code.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadCheckedAgainst, checkedAgainstLine } from "../../scripts/build-shells.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PREFIX = "Checked against published worked examples from: ";
const NONE = "No published worked example is on file for this calculation.";

test("every page's checked-against line is true to that tile's registry rows", async () => {
  const { rows } = JSON.parse(readFileSync(resolve(ROOT, "test/fixtures/worked-examples.json"), "utf8"));
  const byTile = new Map();
  for (const r of rows) (byTile.get(r.tile_id) || byTile.set(r.tile_id, []).get(r.tile_id)).push(r);
  // check-worked-examples' own predicates, restated here so the test does not
  // lean on the builder it is checking.
  const SELF = /^Project\b|first-principles/i;
  const REC = /machine-verified|recomputed|\bspec-v\d+\b/i;
  const derived = (r) => SELF.test(r.source_publisher || "") || REC.test([r.source_edition_or_year, r.source_section_or_page, r.source_title].join(" "));
  const lines = await loadCheckedAgainst();
  const bad = [];
  let named = 0, none = 0;
  for (const [id, rs] of byTile) {
    const line = lines.get(id);
    if (!line) { bad.push(`${id}: no line`); continue; }
    const pubs = rs.filter((r) => !derived(r)).map((r) => String(r.source_publisher || "").trim().replace(/\s*;\s*/g, ", ")).filter((p) => /^[A-Z0-9(]/.test(p));
    const derivedOnly = rs.every(derived);
    if (line.startsWith(PREFIX)) {
      named++;
      if (!pubs.length) bad.push(`${id}: names a source but has no named outside row`);
      const items = line.slice(PREFIX.length).replace(/([^.])\.$/, "$1").split("; ").filter((x) => !/^and \d+ more$/.test(x));
      for (const it of items) {
        const stem = it.replace(/\.\.\.$/, "");
        if (!pubs.some((p) => p.startsWith(stem))) bad.push(`${id}: "${it}" is not one of its publishers`);
      }
      if (/reference test/.test(line)) bad.push(`${id}: named-source line claims a reference test`);
    } else if (line.startsWith(NONE)) {
      none++;
      if (pubs.length) bad.push(`${id}: says no published example but has ${pubs.length} named row(s)`);
      if (/independent reference test/.test(line) !== derivedOnly) bad.push(`${id}: reference-test clause ${derivedOnly ? "missing on" : "claimed by"} a ${derivedOnly ? "" : "non-"}derived-only tile`);
    } else bad.push(`${id}: unrecognized line "${line.slice(0, 60)}"`);
    if (/\.\.\.\.|\([^)]*$|\s\.$/.test(line)) bad.push(`${id}: malformed "${line}"`);
  }
  assert.ok(named > 1800 && none > 300, `named ${named}, none ${none}: did the registry or the publisher rule change?`);
  assert.deepEqual(bad.slice(0, 20), [], `${bad.length} untrue or malformed checked-against line(s)`);
});

test("a method name is not a publisher, and a long publisher is clipped without breaking the sentence", () => {
  const row = (pub, extra = {}) => ({ source_publisher: pub, source_title: "t", source_section_or_page: "s", source_edition_or_year: "e", ...extra });
  assert.ok(checkedAgainstLine([row("one-way ANOVA (hand-computed, scipy cross-checked)")], false).startsWith(NONE), "lowercase lead = a method");
  assert.ok(checkedAgainstLine([row("Project (first-principles)")], true).endsWith("and an independent reference test."));
  assert.ok(checkedAgainstLine([row("NFPA", { source_title: "the spec-v12 worked example, recomputed" })], false).startsWith(NONE), "a recomputed spec row is not an outside source");
  assert.equal(checkedAgainstLine([row("NFPA"), row("NFPA"), row("Mike Holt Enterprises")], false), PREFIX + "NFPA; Mike Holt Enterprises.");
  assert.equal(checkedAgainstLine(["A", "B", "C", "D", "E"].map((p) => row(p + " Co")), false), PREFIX + "A Co; B Co; C Co; and 2 more.");
  const long = checkedAgainstLine([row("University of Washington Rural Technology Initiative (Briggs, Forest Products Measurements and Conversion Factors, 1994)")], false);
  assert.ok(long.endsWith("Initiative...") && !/\(/.test(long), long);
});
