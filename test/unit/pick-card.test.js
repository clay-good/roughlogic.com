// THE DISAMBIGUATION CARD HAD NO TESTS.
//
// pick-card.js ships -- it is in sw.js's precache list and build.mjs's manifest,
// and app.js imports it lazily -- and nothing in test/ referenced it. It is the
// surface that runs when the ranker cannot separate its top two and the page
// asks instead of guessing: "pressure drop" is compressed-air AND filter, "heat
// loss" is duct AND pipe. Picking wrong on a job is not a small error, so the
// card is the one place the program chooses to ask, and it was unguarded.
//
// These are its first tests. They pin the threshold (ask only when there is
// genuinely a choice), the routing (one pick() for focus, prefill and
// provenance alike), and the one visible string that could go wrong.
import { test } from "node:test";
import assert from "node:assert/strict";

test("pick-card: asks only when there is more than one candidate", async () => {
  const { installDocument, installTimers } = await import("../fixtures/fake-dom.js");
  installTimers();
  const doc = installDocument();
  const { renderPickCard } = await import("../../pick-card.js");

  const host = doc.createElement("div");
  doc.body.appendChild(host);
  const lead = (d) => String(d || "").split(".")[0];

  // Fewer than two is not a choice: the ranker has an answer, so routing
  // straight through is right and a card would be a question with one answer.
  for (const tools of [[], [{ id: "a", name: "A", desc: "One." }], null, undefined]) {
    assert.equal(renderPickCard({ tools, host, lead, onPick: () => {} }), null, `${JSON.stringify(tools)} renders no card`);
    assert.equal(host.querySelectorAll(".pick-card").length, 0);
  }

  const card = renderPickCard({
    tools: [
      { id: "duct-heat-loss", name: "Duct Heat Loss", desc: "Heat lost from a duct run. More." },
      { id: "pipe-heat-loss", name: "Pipe Heat Loss", desc: "Heat lost from bare pipe. More." },
    ],
    host, lead, onPick: () => {},
  });
  assert.ok(card, "two candidates ask");
  assert.equal(host.querySelectorAll(".pick-card").length, 1);
  // Named for assistive technology, since the question is the point of the card.
  assert.equal(card.getAttribute("aria-label"), "Which calculator did you mean?");
  const buttons = card.querySelectorAll("button");
  assert.equal(buttons.length, 2, "one option per candidate");
  for (const b of buttons) {
    assert.equal(b.type, "button", "a pick must not submit anything");
  }
  assert.equal(card.querySelectorAll(".pick-name")[0].textContent, "Duct Heat Loss");
  // The option is named by the question it answers, not its group label.
  assert.equal(card.querySelectorAll(".pick-desc")[0].textContent, "Heat lost from a duct run");
});

test("pick-card: a pick routes through onPick and takes the card with it", async () => {
  const { installDocument, installTimers } = await import("../fixtures/fake-dom.js");
  installTimers();
  const doc = installDocument();
  const { renderPickCard, clearPickCard } = await import("../../pick-card.js");

  const host = doc.createElement("div");
  doc.body.appendChild(host);
  const picked = [];
  const tools = [
    { id: "loan-payment", name: "Loan Payment", desc: "A." },
    { id: "piti", name: "PITI", desc: "B." },
  ];
  renderPickCard({ tools, host, lead: () => "", onPick: (t) => picked.push(t.id) });

  host.querySelectorAll("button")[1].click();
  assert.deepEqual(picked, ["piti"], "the pick reaches onPick, which is the one route in");
  assert.equal(host.querySelectorAll(".pick-card").length, 0, "and the question goes away once answered");

  // Rendering again replaces rather than stacks, and clearPickCard removes all.
  renderPickCard({ tools, host, lead: () => "", onPick: () => {} });
  renderPickCard({ tools, host, lead: () => "", onPick: () => {} });
  assert.equal(host.querySelectorAll(".pick-card").length, 1, "a second ask replaces the first");
  clearPickCard(doc);
  assert.equal(host.querySelectorAll(".pick-card").length, 0);
});

// The one visible string that could go wrong. `needsLine` lowercases a field
// label straight out of the field index -- `String(r.l).toLowerCase()` -- so a
// required row with no label would render the words "Needs undefined." on the
// card. None does: 0 of 8,497 REQUIRED rows across data/fields/ lack one (the
// shards hold 11,509 rows in all, and the first count of this mixed the two up
// -- the reach assertion below is what caught it). This
// holds that, because the shards are generated and the card cannot defend
// itself.
test("pick-card: every required field-index row has a label, so no option reads \"Needs undefined\"", async () => {
  const { readdirSync, readFileSync } = await import("node:fs");
  const dir = new URL("../../data/fields/", import.meta.url);
  let scanned = 0;
  const unlabelled = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json") || file === "manifest.json") continue;
    const json = JSON.parse(readFileSync(new URL(file, dir), "utf8"));
    const tiles = json && json.tiles;
    if (!tiles) continue;
    for (const [tileId, rows] of Object.entries(tiles)) {
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (!row || typeof row !== "object" || !row.r) continue;
        scanned++;
        if (typeof row.l !== "string" || !row.l.trim()) unlabelled.push(`${tileId}: ${JSON.stringify(row)}`);
      }
    }
  }
  assert.ok(scanned > 8000, `the scan must reach the shards (scanned ${scanned}, was 8,497 required rows)`);
  assert.deepEqual(unlabelled, [], `a required row with no label makes the pick card say "Needs undefined":\n${unlabelled.join("\n")}`);
});

test("pick-card: needsLine names the required fields, at most three, and never throws", async () => {
  const { installDocument, installTimers, installFetch } = await import("../fixtures/fake-dom.js");
  installTimers();
  installDocument();
  installFetch();
  const { needsLine } = await import("../../pick-card.js");

  // concrete needs its slab dimensions; the line is field labels, lowercased.
  const line = await needsLine({ id: "concrete", group: "E" });
  if (line) {
    assert.match(line, /^Needs .+\.$/, `the line is a sentence: ${line}`);
    assert.doesNotMatch(line, /undefined|null/, "and never names a missing label");
    assert.ok(line.split(",").length <= 3, `two or three names, then stop: ${line}`);
  }

  // A tile outside the field index gets no line rather than a blank or a throw.
  assert.equal(await needsLine({ id: "__no-such-tile__", group: "E" }), "");
  assert.equal(await needsLine({ id: "concrete", group: "__no-such-group__" }), "");
});
