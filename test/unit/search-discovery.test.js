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
  extractQuantities,
  mapSlots,
} from "../../search-discovery.js";
import { search as mcpSearch } from "../../mcp/catalog.mjs";
import { parseHashRoute } from "../../routing.js";

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
  // spec-v592 did-you-mean: the corrected corpus token is exposed so the
  // dropdown can say what the results actually match.
  assert.equal(ranked[0].typoFixes.condiut, "conduit");
  const corrected = normalizeQuery("condiut fill").tokens
    .map((t) => ranked[0].typoFixes[t] || t).join(" ");
  assert.equal(corrected, "conduit fill");
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

test("a committed alias phrase typed verbatim gets the exact-phrase bonus", async () => {
  const { TOOLS, aliases } = await loadCatalog();
  // "3/4 emt" content also lives in support-spacing's name/desc at name
  // weight; the verbatim bonus is what routes the committed phrase to
  // its own tile.
  const ranked = rankTools(normalizeQuery("how many wires in 3/4 emt").tokens, TOOLS, aliases, { limit: 2 });
  assert.equal(ranked[0].tool.id, "conduit-fill");
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
    // ("how much can i pay for a house to flip" was pinned here through
    // 0.181.x; the Phase 2 corpus gave max-offer-70-rule -- the literal
    // "maximum offer" tile -- a stronger claim to it, which is the better
    // answer. The alias row itself still meets the top-3 bar.)
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

// ---------------------------------------------------------------------------
// spec-v591: quantity slot parsing and prefilled deep links.
// ---------------------------------------------------------------------------

test("extractQuantities: glued, spaced, fraction, comma, unitless", () => {
  assert.deepEqual(extractQuantities("120v"), [{ value: "120", unit: "v" }]);
  assert.deepEqual(extractQuantities("150 ft"), [{ value: "150", unit: "ft" }]);
  assert.deepEqual(extractQuantities("3/4 in"), [{ value: "0.75", unit: "in" }]);
  assert.deepEqual(extractQuantities("1,200 watts"), [{ value: "1200", unit: "watts" }]);
  assert.deepEqual(extractQuantities("about 40"), [{ value: "40", unit: null }]);
  // Single-letter units are glued-only: an article never reads as a unit.
  //
  // What that costs, measured 2026-09-02 and written here so the next person
  // weighing the rule can see the price: `ohms law 120 v, 10 a` prefills
  // NOTHING, while `120V 10A` and `120 volts 10 amps` both fill. The home
  // page's example chip advertised the spaced short form until that date --
  // the one phrasing the site taught was the one the extractor dropped. The
  // rule is kept anyway: "10 a" is genuinely ambiguous between ten amps and
  // ten a-something, and `extractQuantities` has no tile context to break the
  // tie with. Any fix belongs where that context exists (mapSlots), and has to
  // be measured with scripts/measure-query-fill.mjs, not reasoned about.
  assert.deepEqual(extractQuantities("for a 50 amp circuit"), [{ value: "50", unit: "amp" }]);
  assert.deepEqual(extractQuantities("20 a"), [{ value: "20", unit: null }]);
  assert.deepEqual(extractQuantities("120 v"), [{ value: "120", unit: null }]);
  assert.deepEqual(extractQuantities("120v"), [{ value: "120", unit: "v" }]);
  // Identifier-glued digits are not quantities; bad input is empty.
  assert.deepEqual(extractQuantities("ashrae 62.2"), [{ value: "62.2", unit: null }]);
  assert.deepEqual(extractQuantities(null), []);
});

// A pure number inside a tile NAME is part of an identifier, not a word anyone
// searches for. `R310.2.3` in "Egress Window Well (IRC R310.2.3)" tokenizes to
// r310, 2, 3 -- and the bare 3 matched a reader's "3 in deep", which is how
// `asphalt 2400 sq ft, 3 in deep` ranked the window well above Asphalt
// Tonnage on the site's own example query. Digit-led query tokens were already
// barred from COVERAGE for exactly this reason; they still added SCORE, and
// score decides once coverage ties.
//
// The same filter has always applied to alias tokens, with the same comment
// beside it ("pure-number alias tokens are illustrative, not identifying").
// This extends it to the name, where the evidence is weaker still.
test("a pure number in a tile name does not rank it", () => {
  const tools = [
    { id: "asphalt-tonnage", name: "Asphalt Tonnage", trades: ["construction"], desc: "Tons of mix and truck loads." },
    { id: "egress-window-well", name: "Egress Window Well (IRC R310.2.3)", trades: ["construction"], desc: "The window well an egress window opens into; 9 sq ft of horizontal area, deep enough for a ladder." },
  ];
  const { tokens } = normalizeQuery("asphalt 2400 sq ft, 3 in deep");
  const ranked = rankTools(tokens, tools, [], { limit: 2 });
  assert.equal(ranked[0].tool.id, "asphalt-tonnage", JSON.stringify(ranked.map((r) => r.tool.id + ":" + r.score)));
});

// A digit stands in for its word only where that word is part of the
// calculator's identity. "3 phase" must still meet "Three-Phase Power" -- the
// word is in the NAME -- while a reader's "4 in thick" must not match a spelled
// four inside a curated phrase belonging to some other tile.
//
// The live case: `concrete slab 20 ft by 30 ft 4 in thick` returned Concrete
// Control Joint Spacing above Concrete Volume, because that tile carries the
// alias "joint grid for a four inch slab" and the alias field is worth 2 --
// exactly the 10-to-9 margin. (Asserted here on a pair of tiles built to
// isolate the rule rather than on that query: a three-tile fixture scores
// nothing like the real 1,804-tile corpus, and a fixture that happens to
// reproduce an outcome is measuring itself.)
test("a digit borrows its word from a name, not from an alias", () => {
  const viaName = { id: "four-slab", name: "Four Inch Slab Rebar", trades: ["concrete"], desc: "Rebar for a slab." };
  const viaAlias = { id: "joint-grid", name: "Joint Grid Layout", trades: ["concrete"], desc: "Rebar for a slab." };
  const tools = [viaName, viaAlias];
  const aliases = [{ term: "four inch slab", target: "joint-grid", kind: "question" }];
  const ranked = rankTools(normalizeQuery("4 slab rebar").tokens, tools, aliases, { limit: 2 });
  const score = new Map(ranked.map((r) => [r.tool.id, r.score]));

  // The digit reaches the word in the NAME and scores there.
  assert.ok(score.get("four-slab") > score.get("joint-grid"),
    `name should outscore alias: ${JSON.stringify([...score])}`);

  // And the alias-only tile scores exactly what it would with no digit at all:
  // the 4 bought it nothing.
  const withoutDigit = rankTools(normalizeQuery("slab rebar").tokens, tools, aliases, { limit: 2 });
  const before = new Map(withoutDigit.map((r) => [r.tool.id, r.score]));
  assert.equal(score.get("joint-grid"), before.get("joint-grid"),
    "the digit must add nothing through an alias");
});

test("extractQuantities: a dimension pair maps nothing", () => {
  const got = extractQuantities("10x12 shed");
  assert.ok(got.every((qty) => qty.unit === null || qty.unit === "shed"));
});

test("mapSlots fills only unambiguous, yet-unfilled slots", () => {
  const row = {
    tile: "voltage-drop",
    slots: [
      { param: "vd-src", units: ["v", "volt", "volts"] },
      { param: "vd-len", units: ["ft", "foot", "feet"] },
      { param: "vd-cur", units: ["a", "amp", "amps"] },
    ],
  };
  assert.deepEqual(
    mapSlots(extractQuantities("voltage drop 120v 150 ft 20 amps"), row),
    { "vd-src": "120", "vd-len": "150", "vd-cur": "20" },
  );
  // Unitless numbers never map.
  assert.equal(mapSlots(extractQuantities("voltage drop 120 150 20"), row), null);
  // A second quantity for an already-filled slot is dropped.
  assert.deepEqual(
    mapSlots(extractQuantities("100 ft or 200 ft"), row),
    { "vd-len": "100" },
  );
  // Ambiguity across two slots accepting the same token drops the quantity.
  const ambiguous = { tile: "x", slots: [
    { param: "a1", units: ["ft"] },
    { param: "a2", units: ["ft"] },
  ] };
  assert.equal(mapSlots(extractQuantities("50 ft"), ambiguous), null);
  assert.equal(mapSlots([], row), null);
  assert.equal(mapSlots(null, row), null);
});

test("flagship: question with numbers ranks voltage-drop and maps all three params", async () => {
  const { TOOLS, aliases } = await loadCatalog();
  const shard = JSON.parse(
    await readFile(resolve(ROOT, "data", "search", "slots.json"), "utf8"),
  );
  const query = "voltage drop 120v 150 ft 20 amps";
  const ranked = rankTools(normalizeQuery(query).tokens, TOOLS, aliases, { limit: 3 });
  assert.equal(ranked[0].tool.id, "voltage-drop");
  const row = shard.tiles.find((t) => t.tile === "voltage-drop");
  assert.ok(row, "voltage-drop missing from slots.json seed");
  const params = mapSlots(extractQuantities(query), row);
  assert.deepEqual(params, { "vd-src": "120", "vd-len": "150", "vd-cur": "20" });
  // The emitted hash round-trips through the router with params intact.
  const hash = "voltage-drop?v=1&" + new URLSearchParams(params).toString();
  const { route } = parseHashRoute("#" + hash, new Set(TOOLS.map((t) => t.id)));
  assert.equal(route.view, "tool");
  assert.equal(route.id, "voltage-drop");
  assert.equal(route.params["vd-len"], "150");
  assert.equal(route.params["vd-cur"], "20");
  assert.equal(route.params["vd-src"], "120");
  assert.equal(route.params.v, "1");
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

// A moment and a torque are written as two units with a hyphen between them.
// The unit match used to stop at the hyphen, so "5422 kip-ft" came back as
// 5422 kip -- a moment read as a force -- and "300 ft-lb" came back as 300
// FEET, which is how a torque ends up filling a length field.
test("extractQuantities keeps compound moment and torque units whole", () => {
  assert.deepEqual(extractQuantities("overturning 5422 kip-ft, dead load 900 kip"), [
    { value: "5422", unit: "kip-ft" },
    { value: "900", unit: "kip" },
  ]);
  assert.deepEqual(extractQuantities("torque 300 ft-lb"), [{ value: "300", unit: "ft-lb" }]);
  assert.deepEqual(extractQuantities("12 in-lb"), [{ value: "12", unit: "in-lb" }]);
});

// An allowlist, not a rule about hyphens: an ordinary hyphenated phrase after
// a unit still reads as that unit, and a hyphenated word that is no unit at
// all still reads as no unit.
test("extractQuantities leaves ordinary hyphenated phrases alone", () => {
  assert.deepEqual(extractQuantities("150 ft-long run"), [{ value: "150", unit: "ft" }]);
  assert.deepEqual(extractQuantities("3-ply wall"), [{ value: "3", unit: null }]);
});

// A query that OPENS with a calculator's whole name is asking for that
// calculator and then handing it numbers. Coverage sorts ahead of score, so a
// sibling matching one more of the leftover words used to win: "asphalt
// tonnage 5000 ft2 3 in 145 pcf" returned Pavement Milling Production, and on
// the agent door -- where nobody sees a dropdown -- second place is the wrong
// answer.
test("a query that opens with a tile's full name returns that tile first", async () => {
  const { TOOLS, aliases } = await loadCatalog();
  const rank = (q) => rankTools(normalizeQuery(q).tokens, TOOLS, aliases, { limit: 3 }).map((r) => r.tool.id);
  assert.equal(rank("asphalt tonnage 5000 ft2 3 in 145 pcf")[0], "asphalt-tonnage");
  assert.equal(rank("voltage imbalance 480 v 475 v 470 v")[0], "voltage-imbalance");
});

// The name must OPEN the query, not merely appear in it. "max circuit length
// for voltage drop" contains Voltage Drop in full and is not asking for it.
test("a full name inside a longer question does not take the top spot", async () => {
  const { TOOLS, aliases } = await loadCatalog();
  const rank = (q) => rankTools(normalizeQuery(q).tokens, TOOLS, aliases, { limit: 3 }).map((r) => r.tool.id);
  assert.equal(rank("max circuit length for voltage drop")[0], "max-circuit-length-for-vd");
});

// ...and what follows the name has to be numbers. "friction loss 200 ft of
// hose at 150 gpm" opens with the Friction Loss tile's whole name and is
// asking for the fire-hose one: "hose" is the reader narrowing, and coverage
// is the machinery that reads it.
test("a qualifying word after the name still lets coverage decide", async () => {
  const { TOOLS, aliases } = await loadCatalog();
  const rank = (q) => rankTools(normalizeQuery(q).tokens, TOOLS, aliases, { limit: 3 }).map((r) => r.tool.id);
  assert.equal(rank("friction loss 200 ft of hose at 150 gpm")[0], "fire-friction");
  assert.equal(rank("friction loss 150 gpm 100 ft")[0], "friction-loss");
});

// --- exact-id ranking (2026-08-29) ---
//
// A short id used to lose to its own longer siblings on the alphabetical
// tiebreak: every "Concrete ..." tile ties on coverage and score for the
// one-word query "concrete", so the tile whose id and name-head are literally
// "concrete" (Concrete Volume) did not appear in the top TWENTY, on the browser
// search box and the agent door alike. 139 of 1,804 tiles failed to rank first
// for their own identifier; after the bonus, 59 do.
async function rankingFixture() {
  const { aliases } = await loadShards();
  const { TOOLS } = await import("../../tools-data.js");
  return { aliases, TOOLS };
}

test("a query that is a tile's whole id ranks that tile first", async () => {
  const { aliases: ALIASES, TOOLS } = await rankingFixture();
  const tokens = normalizeQuery("concrete").tokens;
  const ranked = rankTools(tokens, TOOLS, ALIASES, { limit: 5 });
  assert.equal(ranked[0].tool.id, "concrete",
    "the tile whose id IS the query must win over siblings that merely start with the word");
});

test("exact-id ranking holds for other short ids that lost to longer siblings", async () => {
  const { aliases: ALIASES, TOOLS } = await rankingFixture();
  for (const id of ["slope", "backflow", "service-load"]) {
    const ranked = rankTools(normalizeQuery(id.replace(/-/g, " ")).tokens, TOOLS, ALIASES, { limit: 3 });
    assert.equal(ranked[0].tool.id, id, `"${id}" should rank its own tile first`);
  }
});

test("a tile's own name outranks an alias that claims the same phrase", async () => {
  const { aliases: ALIASES, TOOLS } = await rankingFixture();
  // This was decided the other way earlier the same day, when "expansion tank"
  // was the only case in view: it is the id `expansion-tank` AND a curated
  // alias for `wh-expansion-tank`, and deferring to the curator is defensible
  // there. Then the same shape turned up where it is not defensible -- "pump
  // sizing" is mapped to septic-pumpout-interval while a tile is named Pump
  // Sizing, and "tip out" to nozzle-flow-pressure. Typing a calculator's exact
  // name and being handed a different calculator is wrong however the mapping
  // got there, and one rule has to cover both cases.
  for (const [q, want] of [["pump sizing", "pump-sizing"], ["expansion tank", "expansion-tank"]]) {
    const ranked = rankTools(normalizeQuery(q).tokens, TOOLS, ALIASES, { limit: 3 });
    assert.equal(ranked[0].tool.id, want, `"${q}" should rank its own tile first`);
  }
});

test("a curated alias still outranks mere coverage", async () => {
  const { aliases: ALIASES, TOOLS } = await rankingFixture();
  // "how many btu to heat 1500 sq ft" is a curated alias for manual-j-heating
  // and lost to manual-j-COOLING, which covers "btu", "heat", "square" and
  // "feet" through its own description. The +4 verbatim score bonus could not
  // help, because coverage sorts ahead of score.
  const ranked = rankTools(
    normalizeQuery("how many btu to heat 1500 sq ft").tokens, TOOLS, ALIASES, { limit: 3 });
  assert.equal(ranked[0].tool.id, "manual-j-heating");
});

test("the id bonus does not promote a tile the query merely contains", async () => {
  const { aliases: ALIASES, TOOLS } = await rankingFixture();
  // Both of these are called out in search-discovery.js as regressions to
  // avoid, and both involve a tile id appearing inside a longer query.
  const hose = rankTools(normalizeQuery("friction loss 200 ft of hose at 150 gpm").tokens, TOOLS, ALIASES, { limit: 3 });
  assert.equal(hose[0].tool.id, "fire-friction");
  const mcl = rankTools(normalizeQuery("max circuit length for voltage drop").tokens, TOOLS, ALIASES, { limit: 3 });
  assert.equal(mcl[0].tool.id, "max-circuit-length-for-vd");
});

test("an id containing stopwords still earns the exact-id bonus", async () => {
  const { aliases: ALIASES, TOOLS } = await rankingFixture();
  // "septic-tank-for-interval" normalizes to "septic tank interval", and so
  // does the query. Comparing the raw de-hyphenated id would never match,
  // which is why the direction-naming queries lost to their inverse siblings.
  for (const id of ["septic-tank-for-interval", "cash-on-cash"]) {
    const phrase = id.replace(/-/g, " ");
    const ranked = rankTools(normalizeQuery(phrase).tokens, TOOLS, ALIASES, { limit: 3 });
    assert.equal(ranked[0].tool.id, id, `"${phrase}" should rank its own tile first`);
  }
});

test("each triangle solver answers its own method, not a sibling one edit away", async () => {
  const { aliases: ALIASES, TOOLS } = await rankingFixture();
  // SSS / SAS / ASA are distinct methods whose names sit one edit apart. The
  // id was not in the search corpus, so "sas" matched nothing anywhere, the
  // bounded typo fallback mapped it onto "sss", and a question about two sides
  // and the included angle was answered by the three-sides solver.
  for (const method of ["sss", "sas", "asa"]) {
    const ranked = rankTools(normalizeQuery(`triangle ${method}`).tokens, TOOLS, ALIASES, { limit: 3 });
    assert.equal(ranked[0].tool.id, `triangle-${method}`,
      `"triangle ${method}" must not be answered by a different triangle solver`);
  }
});

test("the id corpus does not out-compete a real name match", async () => {
  const { aliases: ALIASES, TOOLS } = await rankingFixture();
  // Weighting the id with the name (3) instead of the aliases (2) sent this
  // curated row to awg-wire-geometry, whose id carries both "awg" and "wire".
  const ranked = rankTools(
    normalizeQuery("how many 12 awg wires in 1/2 inch conduit").tokens, TOOLS, ALIASES, { limit: 3 });
  assert.equal(ranked[0].tool.id, "conduit-fill");
});

test("a tie is broken by how much of the tile's name the query accounted for", async () => {
  const { aliases: ALIASES, TOOLS } = await rankingFixture();
  // Every concrete tile ties on this query: coverage 2, score 5, "concrete"
  // on the name and "slab" on an alias. Dozens of them, settled by name order,
  // which left the tile actually named Concrete Volume out of the top six.
  const ranked = rankTools(
    normalizeQuery("how much concrete for a 10x12 slab").tokens, TOOLS, ALIASES, { limit: 3 });
  assert.equal(ranked[0].tool.id, "concrete");
});

test("the tie-break does not outrank an exact id or a committed alias", async () => {
  const { aliases: ALIASES, TOOLS } = await rankingFixture();
  // Order within a tie is id, then curation, then share. "wind chill" is an id
  // and must not go to the inverse solver; the fire-hose and max-circuit-length
  // queries are the two regressions search-discovery.js warns about.
  const cases = [
    ["friction loss 200 ft of hose at 150 gpm", "fire-friction"],
    ["max circuit length for voltage drop", "max-circuit-length-for-vd"],
    ["backflow", "backflow"],
  ];
  for (const [q, want] of cases) {
    const r = rankTools(normalizeQuery(q).tokens, TOOLS, ALIASES, { limit: 3 });
    assert.equal(r[0].tool.id, want, `"${q}" should still rank ${want} first`);
  }
});
