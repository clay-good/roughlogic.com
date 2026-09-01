// answer_query corroborates a question before it points an agent at a
// calculator: the question carried values, or it names the tile, or a curated
// alias maps to it. Naming was decided by the tile's words of four characters
// or more, and three tiles have none -- Ohm's Law, CFM per Ton, Tip Out. The
// filter left an empty set and the function returned false for every question,
// including the tile's own name typed exactly, so `answer_query("ohms law")`
// answered "No calculator matched." while `search_calculators` ranked
// ohms-law first for the same string.
import { test } from "node:test";
import assert from "node:assert/strict";
import { answerQuery, search } from "../../mcp/catalog.mjs";
import { TOOLS } from "../../tools-data.js";

test("a tile whose whole name is short words is still reachable by name", async () => {
  for (const [q, id] of [
    ["ohms law", "ohms-law"],
    ["ohm law", "ohms-law"],
    ["what is ohms law", "ohms-law"],
    ["cfm per ton", "cfm-per-ton"],
    ["tip out", "tip-out"],
  ]) {
    const r = await answerQuery({ query: q });
    assert.notEqual(r.status, "NO_MATCH", `"${q}" returned NO_MATCH`);
    assert.equal(r.id, id, `"${q}" resolved to ${r.id}`);
  }
});

test("the short-name path matches whole tokens, not substrings", async () => {
  // "out" sits inside "output" and "about"; a substring test would have let
  // either corroborate Tip Out. The floor this replaces existed to stop one
  // incidental short word doing exactly that, so the replacement has to be
  // stricter, not looser: every word of the name, at a token boundary.
  for (const q of ["output tip", "tip about the outing", "the law of the land", "what is the meaning of life"]) {
    const r = await answerQuery({ query: q });
    assert.equal(r.status, "NO_MATCH", `"${q}" corroborated ${r.id}`);
  }
});

test("what the doors say about a short name agrees", async () => {
  // The defect was one door answering a question the other ranked first.
  for (const q of ["ohms law", "cfm per ton", "tip out"]) {
    const ranked = await search({ query: q, limit: 1 });
    const top = (ranked.results || [])[0];
    const answered = await answerQuery({ query: q });
    assert.ok(top, `search returned nothing for "${q}"`);
    assert.equal(answered.id, top.id, `search says ${top.id}, answer_query says ${answered.id}`);
  }
});

test("exactly three tiles depend on the short-name path", async () => {
  // Pinned so a rename that adds a fourth is a deliberate edit. The path only
  // runs when a name has no word of four characters or more, which is why the
  // other 1,801 tiles were provably unaffected by the change.
  const noise = new Set(["calculator", "calculators", "sizing", "size", "load", "loads", "flow",
    "drop", "rate", "factor", "index", "chart", "table", "length", "weight", "total", "check", "tool", "from", "with"]);
  const shortOnly = TOOLS
    .filter((t) => !String(t.name).toLowerCase().split(/[^a-z0-9]+/).some((w) => w.length >= 4 && !noise.has(w)))
    .map((t) => t.id)
    .sort();
  assert.deepEqual(shortOnly, ["cfm-per-ton", "ohms-law", "tip-out"]);
});
