// spec-v1973: a tile whose rule changed between editions says so, only for a
// reader working under the other edition, and every row stays checkable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EDITION_ROWS, sensitivityLine, mountEditionChanges } from "../../edition-sensitivity.js";
import { checkEditionRows } from "../../scripts/check-edition-sensitivity.mjs";
import { TOOLS } from "../../tools-data.js";
import { CITATIONS } from "../../citations.js";

const ctx = { ids: new Set(TOOLS.map((t) => t.id)), citations: CITATIONS, today: "2026-10-20" };

test("edition sensitivity: the seven verified I-code rows pass every rule", () => {
  assert.equal(EDITION_ROWS.length, 7);
  assert.deepEqual(checkEditionRows(EDITION_ROWS, ctx), []);
  assert.ok(!EDITION_ROWS.some((r) => r.code === "NEC"), "no NEC row is asserted without both editions' text");
});

test("edition sensitivity: each rule, seeded red, is caught", () => {
  const base = EDITION_ROWS[1];
  const seeds = [
    { ...base, id: "no-such-tile" },
    { ...base, code: "UPC" },
    { ...base, from_edition: 2024, to_edition: 2021 },
    { ...base, sources: [base.sources[1]] },
    { ...base, sources: [{ edition: 2021, citation: "IRC R314.3.1" }, base.sources[1]] },
    { ...base, changed: "x".repeat(141) },
    { ...base, older_rule: "" },
    { ...base, verified_on: "2026-12-31" },
    { ...base, verified_by: "" },
    { ...base, to_edition: 2027, sources: [base.sources[0], { edition: 2027, citation: "IRC 2027 R310.3.1" }] },
  ];
  for (const s of seeds) assert.ok(checkEditionRows([s], ctx).length > 0, JSON.stringify(s).slice(0, 80));
  assert.ok(checkEditionRows([base, base], ctx).some((e) => /more than one row/.test(e)));
});

test("edition sensitivity: the sentence shows only for a reader on the older side of the change", () => {
  const r = EDITION_ROWS.find((x) => x.id === "smoke-alarm-placement");
  assert.match(sensitivityLine(r, 2021), /follows IRC 2024.*changed after IRC 2021.*Set the calculator's edition input to 2021/);
  assert.equal(sensitivityLine(r, 2024), null);
  assert.equal(sensitivityLine(r, "x"), null);
  const g = EDITION_ROWS.find((x) => x.id === "grease-trap");
  assert.ok(!/edition input/.test(sensitivityLine(g, 2021)), "a tile without an edition input is not told to set one");
});

test("edition sensitivity: the reference row mounts for a tile with a row and not for one without", async () => {
  const { installDocument } = await import("../fixtures/fake-dom.js");
  const doc = installDocument();
  const block = doc.createElement("section");
  const dl = doc.createElement("dl"); dl.className = "v6-reference-list"; block.appendChild(dl);
  assert.equal(mountEditionChanges(block, "voltage-drop"), null);
  const row = mountEditionChanges(block, "smoke-alarm-placement");
  assert.ok(row);
  const select = row.querySelectorAll("select")[0], out = row.querySelectorAll("p")[0];
  assert.equal(out.textContent, "");
  select.value = "0";
  select.dispatchEvent(new Event("change"));
  assert.match(out.textContent, /IRC 2021 R314\.3\.1/);
});
