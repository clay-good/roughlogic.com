// The two doors must answer a digit-led query the same way.
//
// A calculator is reachable two ways: the search box on the site, and the MCP
// server an agent calls. Both rank through search-discovery.js `rankTools`
// precisely so their recall cannot drift -- but rankTools returns NOTHING for
// a query whose tokens are all digit-led, because values carry no coverage.
// Every code section and every trade spec ("240.21", "62.2", "12/2", "200a")
// therefore fell to a FALLBACK, and each door had written its own: the browser
// matched name, then description, then any alias term containing the query;
// the agent matched an AND-of-terms over id+name+desc, then promoted an exact
// alias and alias prefixes. Over the 500 digit-led queries the alias file
// implies, they disagreed on the first result 287 times, and on one ("11250")
// the agent returned nothing where the site answered.
//
// `fallbackSearch` is now that one pass, and this file pins it: the agent door
// is asserted against it by RUNNING the real `search()`, not by restating its
// algorithm. The browser half is asserted in the browser, in
// test/integration/door-parity.test.js, for the same reason -- a gate that
// reimplements the thing it checks passes while the product is broken.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeQuery, rankTools, fallbackSearch } from "../../search-discovery.js";
import { search } from "../../mcp/catalog.mjs";
import { TOOLS } from "../../tools-data.js";

const byId = new Map(TOOLS.map((t) => [t.id, t]));
const aliases = JSON.parse(
  await readFile(new URL("../../data/search/aliases.json", import.meta.url), "utf8")
).aliases.filter((r) => r && typeof r.term === "string" && byId.has(r.target));

// Every query the alias file implies that the ranker declines to answer.
function fallbackQueries() {
  const cand = new Set();
  for (const row of aliases) {
    const { tokens } = normalizeQuery(row.term);
    if (tokens.length && tokens.every((t) => /^\d/.test(t))) cand.add(row.term);
    for (const tok of row.term.split(/\s+/)) if (/^\d/.test(tok)) cand.add(tok);
  }
  const out = [];
  for (const q of cand) {
    const { tokens } = normalizeQuery(q);
    if (tokens.length && rankTools(tokens, TOOLS, aliases, { limit: 1 }).length) continue;
    out.push(q);
  }
  return out;
}

const QUERIES = fallbackQueries();

test("the alias file still implies a body of ranker-less queries to check", () => {
  // If this collapses, the corpus stopped covering anything and the parity
  // assertion below became vacuous.
  assert.ok(QUERIES.length > 300, `expected a corpus, got ${QUERIES.length}`);
});

test("the agent door answers every digit-led query from the shared fallback", async () => {
  const drift = [];
  for (const q of QUERIES) {
    const mine = fallbackSearch(q, TOOLS, aliases, 12).map((t) => t.id);
    const door = (await search({ query: q, limit: 12 })).results.map((r) => r.id);
    if (JSON.stringify(mine) !== JSON.stringify(door)) {
      drift.push(`"${q}" shared=[${mine.slice(0, 3)}] door=[${door.slice(0, 3)}]`);
    }
  }
  assert.deepEqual(drift, [], `agent door diverged from the shared fallback:\n${drift.join("\n")}`);
});

// The two queries that motivated the fallback in the first place. Named, so a
// re-ordering that keeps the doors agreed but breaks the answer still fails.
test("trade shorthand and code sections reach the tile a human mapped them to", () => {
  const top = (q) => (fallbackSearch(q, TOOLS, aliases, 12)[0] || {}).id;
  assert.equal(top("12/2"), "wire-ampacity");
  assert.equal(top("200a"), "battery-runtime");
  assert.equal(top("240.21"), "feeder-tap-rule");
  assert.equal(top("62.2"), "ashrae-622-ventilation");
  // Sections added 2026-08-30 from the tiles' own citations, each of which
  // returned nothing at all before: one tile in the catalog cites it verbatim.
  assert.equal(top("130.5"), "arc-flash-screen");
  assert.equal(top("250.53"), "grounding-electrode");
  assert.equal(top("430.22"), "motor-branch-from-nameplate");
  assert.equal(top("705.3"), "exterior-opening-protection");
});

// An alias prefix counts only on a whole leading phrase. Matching a bare
// character prefix promotes whichever alias happens to sit first in the file:
// "3" came back Steinhart-Hart, off an alias reading "3 point calibration".
test("an alias prefix must end on a word boundary", () => {
  const tiles = [
    { id: "mentions-3", name: "Wire Pull", desc: "uses 3 conductors" },
    { id: "breaker-demo", name: "Breaker Demo", desc: "no digits here" },
  ];
  const rows = [{ term: "30 amp breaker", target: "breaker-demo" }];
  // "3" is a character prefix of that alias, not a phrase of it: the alias tile
  // is still reachable, through the infix pass, but it is not promoted over the
  // tile that actually mentions the query.
  assert.deepEqual(fallbackSearch("3", tiles, rows, 5).map((t) => t.id), ["mentions-3", "breaker-demo"]);
  // "30" is the whole leading phrase, so the curated mapping leads.
  assert.deepEqual(fallbackSearch("30", tiles, rows, 5).map((t) => t.id), ["breaker-demo"]);
});

// A trade filter with no query is a browse, not a search.
test("the agent door still lists a trade when no query is given", async () => {
  const res = await search({ trade: "electrical", limit: 3 });
  assert.ok(res.total > 100, `expected the electrical pool, got ${res.total}`);
});
