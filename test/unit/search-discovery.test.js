// v10 Phase D unit tests for search-discovery.js (spec-v10 §6).
//
// Pure-functional resolvers; no DOM. Asserts the runtime contract for
// resolveQuery and matchAliasPrefix and exercises the real
// data/search/aliases.json shard to catch a future shard edit that
// breaks the resolver shape.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveQuery,
  matchAliasPrefix,
  normalizeQuery,
  rankTools,
  editDistance1,
  STOPWORDS,
  TOKEN_SYNONYMS,
} from "../../search-discovery.js";
import { search as mcpSearch } from "../../mcp/catalog.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadShards() {
  const aliases = JSON.parse(
    await readFile(resolve(ROOT, "data", "search", "aliases.json"), "utf8"),
  );
  // Live tile id list for filter-out-renames behavior.
  const appText = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const ids = new Set();
  for (const m of appText.matchAll(/\{\s*id:\s*"([a-z0-9-]+)"/g)) ids.add(m[1]);
  return { aliases: aliases.aliases, ids };
}

test("resolveQuery returns exact tile-id match without alias indirection", () => {
  const ids = new Set(["ohms-law", "wire-ampacity"]);
  assert.deepEqual(resolveQuery("ohms-law", [], ids), { match: "ohms-law" });
  // Case-insensitive.
  assert.deepEqual(resolveQuery("Ohms-Law", [], ids), { match: "ohms-law" });
});

test("resolveQuery resolves an alias to its target", () => {
  const aliases = [
    { term: "amps", target: "breaker-sizing", kind: "industry" },
    { term: "perc test", target: "septic-drainfield", kind: "industry" },
  ];
  const ids = new Set(["breaker-sizing", "septic-drainfield"]);
  assert.deepEqual(resolveQuery("amps", aliases, ids), {
    match: "breaker-sizing",
    alias: "amps",
    kind: "industry",
  });
  assert.deepEqual(resolveQuery("PERC TEST", aliases, ids), {
    match: "septic-drainfield",
    alias: "perc test",
    kind: "industry",
  });
});

test("resolveQuery returns null on unknown query and bad input", () => {
  assert.equal(resolveQuery("nonsense", [], new Set()), null);
  assert.equal(resolveQuery("", [], new Set()), null);
  assert.equal(resolveQuery(null, [], new Set()), null);
  assert.equal(resolveQuery("ohms-law", null, new Set()), null);
});

test("resolveQuery filters out aliases that target a renamed tile", () => {
  const aliases = [
    { term: "amps", target: "renamed-tile", kind: "industry" },
  ];
  // Live ids do NOT include 'renamed-tile' -> alias must not resolve.
  const ids = new Set(["breaker-sizing"]);
  assert.equal(resolveQuery("amps", aliases, ids), null);
});

test("matchAliasPrefix returns prefix-matching aliases up to the limit", () => {
  const aliases = [
    { term: "amps", target: "breaker-sizing", kind: "industry" },
    { term: "amperage", target: "breaker-sizing", kind: "industry" },
    { term: "ampacity", target: "wire-ampacity", kind: "industry" },
    { term: "perc test", target: "septic-drainfield", kind: "industry" },
  ];
  const got = matchAliasPrefix("amp", aliases);
  assert.equal(got.length, 3);
  assert.deepEqual(
    got.map((r) => r.term),
    ["amps", "amperage", "ampacity"],
  );
  // Limit honored.
  const limited = matchAliasPrefix("amp", aliases, 1);
  assert.equal(limited.length, 1);
  assert.equal(limited[0].term, "amps");
});

test("matchAliasPrefix returns [] on empty / bad input", () => {
  assert.deepEqual(matchAliasPrefix("", [{ term: "amps", target: "x" }]), []);
  assert.deepEqual(matchAliasPrefix(null, []), []);
  assert.deepEqual(matchAliasPrefix("amp", null), []);
});

// ---------------------------------------------------------------------------
// spec-v589: deterministic natural-language ranking.
// ---------------------------------------------------------------------------

async function loadCatalog() {
  const [{ TOOLS }, { aliases }] = await Promise.all([
    import("../../tools-data.js"),
    loadShards(),
  ]);
  return { TOOLS, aliases };
}

test("normalizeQuery strips stopwords and punctuation", () => {
  const { tokens } = normalizeQuery("How many yards of concrete do I need, for a slab?");
  assert.deepEqual(tokens, ["yards", "concrete", "slab"]);
});

test("normalizeQuery maps unit spellings through TOKEN_SYNONYMS", () => {
  assert.deepEqual(normalizeQuery("500 sqft deck").tokens, ["500", "square", "feet", "deck"]);
  assert.deepEqual(normalizeQuery("50 amps wire").tokens, ["50", "amp", "wire"]);
  assert.ok(TOKEN_SYNONYMS.get("lbs") === "pound");
});

test("normalizeQuery on a stopword-only query returns no tokens (substring fallback)", () => {
  assert.deepEqual(normalizeQuery("how").tokens, []);
  assert.deepEqual(normalizeQuery("how do i").tokens, []);
  assert.equal(normalizeQuery("how do i").raw, "how do i");
  assert.ok(STOPWORDS.has("how"));
});

test("normalizeQuery handles bad input", () => {
  assert.deepEqual(normalizeQuery(null), { tokens: [], raw: "" });
  assert.deepEqual(normalizeQuery("").tokens, []);
});

test("editDistance1 is Damerau-Levenshtein <= 1", () => {
  assert.ok(editDistance1("conduit", "conduit")); // equal
  assert.ok(editDistance1("condiut", "conduit")); // transposition
  assert.ok(editDistance1("voltge", "voltage")); // deletion
  assert.ok(editDistance1("volttage", "voltage")); // insertion
  assert.ok(editDistance1("voltafe", "voltage")); // substitution
  assert.ok(!editDistance1("volt", "voltage"));
  assert.ok(!editDistance1("conduit", "circuit"));
  assert.ok(!editDistance1(null, "voltage"));
});

test("rankTools is deterministic: same input, identical order", async () => {
  const { TOOLS, aliases } = await loadCatalog();
  const { tokens } = normalizeQuery("concrete slab yards");
  const a = rankTools(tokens, TOOLS, aliases, { limit: 12 });
  const b = rankTools(tokens, TOOLS, aliases, { limit: 12 });
  assert.ok(a.length > 0 && a.length <= 12);
  assert.deepEqual(a.map((r) => r.tool.id), b.map((r) => r.tool.id));
});

test("rankTools corrects a transposition typo at half weight", async () => {
  const { TOOLS, aliases } = await loadCatalog();
  const ranked = rankTools(normalizeQuery("condiut fill").tokens, TOOLS, aliases, { limit: 12 });
  assert.equal(ranked[0].tool.id, "conduit-fill");
  assert.ok(ranked[0].viaTypo, "typo-corrected result must set viaTypo");
});

test("rankTools survives a dropped-letter typo plus partial coverage", async () => {
  const { TOOLS, aliases } = await loadCatalog();
  const ranked = rankTools(normalizeQuery("voltage drp").tokens, TOOLS, aliases, { limit: 12 });
  assert.equal(ranked[0].tool.id, "voltage-drop");
});

test("acceptance: question-shaped queries rank the expected tile first", async () => {
  const { TOOLS, aliases } = await loadCatalog();
  const table = [
    ["how many yards of concrete do i need for a slab", "concrete"],
    ["what size wire for 50 amps", "wire-ampacity"],
    ["voltage drop 3 phase", "voltage-drop"],
  ];
  for (const [query, expected] of table) {
    const { tokens } = normalizeQuery(query);
    assert.ok(tokens.length > 0, "tokens empty for: " + query);
    const ranked = rankTools(tokens, TOOLS, aliases, { limit: 12 });
    assert.ok(ranked.length > 0, "no results for: " + query);
    assert.equal(
      ranked[0].tool.id,
      expected,
      `"${query}" ranked ${ranked[0].tool.id}, expected ${expected}`,
    );
  }
});

test("rankTools returns [] on empty tokens or bad input", () => {
  assert.deepEqual(rankTools([], [{ id: "x", name: "X", desc: "", trades: [] }], []), []);
  assert.deepEqual(rankTools(null, [], []), []);
  assert.deepEqual(rankTools(["volt"], null, []), []);
});

test("spec-v590: committed question-phrase aliases surface their target first", async () => {
  const { TOOLS, aliases } = await loadCatalog();
  // Shard sanity: the question corpus landed and is well-formed.
  const questions = aliases.filter((r) => r.kind === "question");
  assert.ok(questions.length >= 1000, "question corpus missing or truncated");
  for (const r of questions) {
    assert.match(r.term, /^[a-z0-9][a-z0-9 /.\-]*$/, "style violation: " + r.term);
    assert.ok(normalizeQuery(r.term).tokens.length > 0, "stopword-only phrase shipped: " + r.term);
  }
  // A handful of committed phrases, typed verbatim, rank their tile first.
  const pinned = [
    ["12/2 wire max amps", "wire-ampacity"],
    ["what angle is a 4/12 roof", "roof-pitch"],
    ["how much can the crane pick after deductions", "crane-net-capacity"],
    ["how much chlorine to shock past breakpoint", "breakpoint-chlorination"],
    ["employee cost with payroll taxes and benefits per hour", "labor-burden-rate"],
    ["make 500 ml of 0.1 molar from stock", "molarity-dilution"],
    ["how much can i pay for a house to flip", "fix-flip-profit"],
  ];
  for (const [phrase, expected] of pinned) {
    const ranked = rankTools(normalizeQuery(phrase).tokens, TOOLS, aliases, { limit: 3 });
    assert.equal(ranked[0].tool.id, expected, `"${phrase}" ranked ${ranked[0] && ranked[0].tool.id}`);
  }
});

test("MCP search parity: typo query resolves through the same ranker", async () => {
  const got = await mcpSearch({ query: "conduit fil" });
  assert.ok(got.results.length > 0);
  assert.equal(got.results[0].id, "conduit-fill");
  const questioned = await mcpSearch({ query: "what size wire for 50 amps" });
  assert.equal(questioned.results[0].id, "wire-ampacity");
  // Trade filter still constrains the pool.
  const traded = await mcpSearch({ query: "voltage drop", trade: "electrical" });
  assert.ok(traded.results.every((r) => r.trades.includes("electrical")));
  assert.equal(traded.results[0].id, "voltage-drop");
});

test("end-to-end: real shards resolve representative queries", async () => {
  const { aliases, ids } = await loadShards();
  // Every alias target must be a real tile.
  for (const row of aliases) {
    assert.ok(ids.has(row.target), "alias target not a tile: " + row.target);
  }
  // Spot-check resolution on real data.
  const r1 = resolveQuery("amps", aliases, ids);
  assert.ok(r1 && r1.match === "breaker-sizing");
  const r2 = resolveQuery("yard math", aliases, ids);
  assert.ok(r2 && r2.match === "concrete");
  const r3 = resolveQuery("manual j", aliases, ids);
  assert.ok(r3 && r3.match === "manual-j-cooling");
});
