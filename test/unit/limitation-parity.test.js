// A caveat a PERSON is shown must reach an AGENT too.
//
// Twelve tiles render an <aside class="limitation-banner"> above their inputs:
// "Not a Manual J load calculation", "Not a code-compliant septic design".
// `describe_calculator` reports the same copy as `limitation`, so an agent can
// pass it on. Both read limitation-banner.js, so the WORDING cannot drift --
// but each surface looks it up by a different id. The page uses whatever id
// the renderer was written with; the door uses the tile's own.
//
// They disagreed on septic-drainfield-capacity. calc-septic.js renders the
// drainfield caveat on two tiles, passing
// getLimitationCopy("septic-drainfield") from both renderers, so a person
// sizing a drainfield's CAPACITY was told that a state-approved soil
// evaluation and a licensed designer govern -- while an agent asking the same
// question was told nothing. Of all the things to disclose on one surface
// only, a septic design caveat is a poor choice.
//
// Checked in both directions, because the opposite is just as wrong: a
// limitation the door announces that the page never shows would be a caveat
// the reader is not getting.
import { test } from "node:test";
import assert from "node:assert/strict";

const FIXTURES = new URL("../fixtures/", import.meta.url);

test("a limitation banner on the page is a limitation the door reports", async () => {
  const fake = await import("../fixtures/fake-dom.js");
  fake.installTimers();
  fake.installFetch();
  const doc = fake.installDocument();
  if (!globalThis.CSS) globalThis.CSS = { escape: (s) => s };

  const { RENDERER_MAP } = await import("../fixtures/renderer-map.js");
  const { TOOLS } = await import("../../tools-data.js");
  const { describe } = await import("../../mcp/catalog.mjs");

  const pageOnly = [], doorOnly = [], both = [];
  let rendered = 0;
  for (const tool of TOOLS) {
    const reg = RENDERER_MAP[tool.id];
    if (!reg) continue;
    let render;
    try { render = (await import(new URL(reg.module, FIXTURES).href))[reg.exportName]?.[tool.id]; } catch { continue; }
    if (typeof render !== "function") continue;

    doc.body.replaceChildren();
    const view = doc.createElement("section");
    const inputs = doc.createElement("div"), outputs = doc.createElement("div"), cite = doc.createElement("p");
    view.append(inputs, outputs, cite);
    doc.body.appendChild(view);
    try { await render(inputs, outputs, cite); fake.flushTimers(); } catch { continue; }
    rendered += 1;

    const onPage = view.querySelectorAll(".limitation-banner").length > 0;
    let d;
    try { d = await describe({ id: tool.id }); } catch { continue; }
    const atDoor = !!(d && d.limitation);
    if (onPage && atDoor) both.push(tool.id);
    else if (onPage) pageOnly.push(tool.id);
    else if (atDoor) doorOnly.push(tool.id);
  }

  assert.ok(rendered > 2200, `every renderer is driven (${rendered})`);
  // The parity assertions come before the count, so a regression names the
  // TILE rather than reporting that a total moved.
  assert.deepEqual(pageOnly, [], "a caveat the page shows and the door withholds");
  assert.deepEqual(doorOnly, [], "a caveat the door announces and the page never shows");
  assert.ok(both.length >= 13, `the tiles that carry a caveat still carry it (${both.length})`);

  // And the copy itself is the same object, not a second transcription.
  const { getLimitationCopy } = await import("../../limitation-banner.js");
  const d = await describe({ id: "septic-drainfield-capacity" });
  assert.deepEqual(d.limitation, getLimitationCopy("septic-drainfield"),
    "the aliased tile reports the very copy its page prints");
});
