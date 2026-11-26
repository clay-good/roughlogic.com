// Everything the server advertises as a resource can actually be read.
//
// The same question this project has been asking of the agent door all along,
// one surface over. `describe_calculator` advertised input keys an agent could
// not send; `run_calculator` advertised a default it did not apply; the steps
// panel advertised rows it left out. The resource surface advertises 106 URIs
// -- the catalog overview and one per trade -- plus a template,
// `roughlogic://calculator/{id}`, and the suite read exactly ONE of them
// (pull-box-sizing) and listed the rest.
//
// Reading all of them finds nothing today, which is the point of writing it
// down: a trade added whose resource 404s, or a tile whose card throws, now
// fails here instead of being discovered by whoever asked for it.
import { test } from "node:test";
import assert from "node:assert/strict";

test("every advertised resource reads, and every calculator card is its own", async () => {
  const { listResources, listResourceTemplates, readResource } = await import("../../mcp/catalog.mjs");
  const { TOOLS } = await import("../../tools-data.js");

  const { resources } = await listResources();
  assert.ok(resources.length > 20, `the trade resources are advertised (${resources.length})`);

  const broken = [];
  for (const r of resources) {
    let out;
    try { out = await readResource(r.uri); } catch (e) { broken.push(`${r.uri}: threw ${e.message}`); continue; }
    const first = out && out.contents && out.contents[0];
    if (!first || typeof first.text !== "string" || !first.text.trim()) { broken.push(`${r.uri}: no content`); continue; }
    // It declares application/json, so it has to be JSON.
    try { JSON.parse(first.text); } catch { broken.push(`${r.uri}: declares JSON, body does not parse`); }
  }
  assert.deepEqual(broken.slice(0, 8), [], `${broken.length} advertised resource(s) cannot be read`);

  // The template, for every tile rather than one.
  const templates = listResourceTemplates().resourceTemplates;
  assert.equal(templates[0].uriTemplate, "roughlogic://calculator/{id}");
  const badCards = [];
  for (const tool of TOOLS) {
    let out;
    try { out = await readResource(`roughlogic://calculator/${tool.id}`); } catch (e) { badCards.push(`${tool.id}: threw ${e.message}`); continue; }
    const first = out && out.contents && out.contents[0];
    let card = null;
    try { card = JSON.parse(first.text); } catch { /* reported below */ }
    if (!card) { badCards.push(`${tool.id}: card is not readable JSON`); continue; }
    // A card for the wrong tile is worse than no card.
    if (card.id !== tool.id) badCards.push(`${tool.id}: card reports id ${JSON.stringify(card.id)}`);
  }
  assert.deepEqual(badCards.slice(0, 8), [], `${badCards.length} calculator card(s) unreadable or mis-identified`);
  assert.ok(TOOLS.length > 2200);
});

test("a percent-encoded resource uri resolves to the same thing as the plain one", async () => {
  const { readResource } = await import("../../mcp/catalog.mjs");
  // listResources builds trade URIs with encodeURIComponent and readResource
  // decodes them. No trade name needs encoding today -- they are all single
  // lowercase words -- so that pair is exercised by nothing, and a mismatch
  // would surface only on the day a trade with a space or an ampersand lands.
  const plain = await readResource("roughlogic://trade/construction");
  const encoded = await readResource("roughlogic://trade/constructio%6E");
  assert.equal(encoded.contents[0].text, plain.contents[0].text, "the uri is decoded before the lookup");

  const card = await readResource("roughlogic://calculator/ohms-law");
  const cardEncoded = await readResource("roughlogic://calculator/ohms%2Dlaw");
  assert.equal(cardEncoded.contents[0].text, card.contents[0].text, "and so is a calculator id");
});

test("an unknown resource uri names the forms that exist", async () => {
  const { readResource } = await import("../../mcp/catalog.mjs");
  await assert.rejects(() => readResource("roughlogic://nope/x"), (e) => {
    assert.match(e.message, /roughlogic:\/\/catalog/);
    assert.match(e.message, /roughlogic:\/\/trade/);
    assert.match(e.message, /roughlogic:\/\/calculator/);
    return true;
  });
});
