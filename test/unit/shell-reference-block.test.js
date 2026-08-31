// 20 tiles take no inputs -- OSHA Top-10, the knot and hand-signal references,
// Lockout/Tagout Steps, the GFCI/AFCI table. They carry no worked example, so
// their shell printed the tile name, one lead sentence, and nothing else: on
// exactly the pages that are nothing BUT reference content, none of it was on
// the page. `referenceBlock` renders what the tile computes on no inputs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { referenceBlock } from "../../scripts/build-shells.mjs";

test("a list of flat rows renders as labelled rows, leading field first", () => {
  const html = referenceBlock({
    publication: "OSHA Top 10, most recent published year.",
    items: [
      { rank: 1, standard: "29 CFR 1926.501", topic: "Fall protection" },
      { rank: 2, standard: "29 CFR 1910.1200", topic: "Hazard communication" },
    ],
  });
  assert.match(html, /<p class="shell-source">OSHA Top 10, most recent published year\.<\/p>/);
  assert.match(html, /<p class="shell-io-label">Items<\/p>/);
  assert.match(html, /<li><span>1<\/span> <b>29 CFR 1926\.501<\/b><small>Topic: Fall protection<\/small><\/li>/);
  assert.equal((html.match(/<li>/g) || []).length, 2);
});

test("a numbered row whose next field restates the number drops the stutter", () => {
  // The S500 table numbers each row and then names it "Class 1".
  const html = referenceBlock({ classes: [{ id: 1, name: "Class 1", summary: "Least absorption." }] });
  assert.match(html, /<li><span>Class 1<\/span> <b>Least absorption\.<\/b><\/li>/);
  // Token equality, not substring: an OSHA rank of 1 must survive next to
  // a standard numbered 1926.501.
  const osha = referenceBlock({ items: [{ rank: 1, standard: "29 CFR 1926.501" }] });
  assert.match(osha, /<span>1<\/span> <b>29 CFR 1926\.501<\/b>/);
});

test("rows carrying nested lists become one labelled sub-list each", () => {
  const html = referenceBlock({
    systems: [
      { system: "NEC residential", entries: [{ item: "Neutral", color: "White" }] },
      { system: "IEC industrial", entries: [{ item: "Neutral", color: "Blue" }] },
    ],
  });
  assert.match(html, /<p class="shell-io-label">NEC residential<\/p>/);
  assert.match(html, /<p class="shell-io-label">IEC industrial<\/p>/);
  assert.equal((html.match(/<ul class="shell-io">/g) || []).length, 2);
});

test("an object of named string lists becomes one list per name", () => {
  const html = referenceBlock({ trades: { Electrical: ["Panel labeled."], Plumbing: ["Cleanouts present."] } });
  assert.match(html, /<p class="shell-io-label">Electrical<\/p>/);
  assert.match(html, /<li><span>Panel labeled\.<\/span><\/li>/);
  assert.match(html, /<li><span>Cleanouts present\.<\/span><\/li>/);
});

test("content is HTML-escaped, and an unrecognised shape renders nothing", () => {
  const html = referenceBlock({ rows: [{ a: "<script>x</script>", b: "R&D" }] });
  assert.ok(!html.includes("<script>"), html);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /R&amp;D/);
  // Nothing to render is empty, not a broken fragment; check-shells fails the
  // page rather than the builder guessing at a shape it does not know.
  assert.equal(referenceBlock({ n: 3, deep: [[1, 2]] }).includes("<ul"), false);
});

test("every page the builder treats as a reference renders rows", async () => {
  // The builder's own condition: no worked-example INPUTS, which is what makes
  // a shell print no Example section. magnetic-declination advertises no
  // fields but does carry an example, so it keeps its example and is not one
  // of these.
  const catalog = await import("../../mcp/catalog.mjs");
  const { TOOLS } = await import("../../tools-data.js");
  const { loadWorkedExamples } = await import("../../scripts/build-shells.mjs");
  const examples = await loadWorkedExamples();
  const refs = TOOLS.filter((t) => !examples.get(t.id) || !Object.keys(examples.get(t.id).inputs || {}).length);
  assert.equal(refs.length, 20, `reference-page population moved: ${refs.map((t) => t.id)}`);
  const thin = [];
  for (const t of refs) {
    const ran = await catalog.run({ id: t.id, inputs: {} });
    const rows = (referenceBlock(ran.result).match(/<li>/g) || []).length;
    if (rows < 2) thin.push(`${t.id}: ${rows} row(s)`);
  }
  assert.deepEqual(thin, []);
});
