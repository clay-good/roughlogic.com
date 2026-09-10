// spec-v1344: the MCP catalog layer's answer_query.
//
// The website went from 49 prefilled tiles to 1,331 with the field index;
// agents were still on the old three-round-trip path. These pin the one-call
// behaviour and, more importantly, the refusals.

import { test } from "node:test";
import assert from "node:assert/strict";
// --- spec-v1344: answer_query ------------------------------------------------
//
// One call instead of three. The property that matters is the same one that
// governs the browser path: it must not answer wrongly, and it must not point
// confidently at a calculator nobody asked about.

test("spec-v1344: a full question is answered in one call, marked via registry", async () => {
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  const out = await answerQuery({ query: "voltage drop 120v 150 ft 12 awg copper 20a single phase" });
  assert.equal(out.status, "OK");
  assert.equal(out.id, "voltage-drop");
  assert.equal(out.via, "registry");
  // The same number the website computes for the same sentence.
  assert.ok(Math.abs(out.result.drop_V - 11.853) < 0.01, `drop_V ${out.result.drop_V}`);
  assert.equal(out.inputs.awg, "12");
});

test("spec-v1344: values are coerced the way the browser coerces them", async () => {
  // queryFill returns strings because it also feeds the DOM and the URL hash.
  // ohms-law counts how many of V/I/R/P it was handed and a stringified "120"
  // failed that check, so a question that plainly supplied two values came
  // back "Provide any two of V, I, R, P."
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  const out = await answerQuery({ query: "ohms law 120 volts 10 amps" });
  assert.equal(out.status, "OK");
  assert.ok(!out.result.error, `unexpected error: ${out.result.error}`);
  // And it DERIVES the rest: an unfilled numeric field is passed as an
  // explicit null, which is how this catalog spells "absent".
  assert.ok(Math.abs(out.result.R - 12) < 1e-9, `R ${out.result.R}`);
  assert.ok(Math.abs(out.result.P - 1200) < 1e-9, `P ${out.result.P}`);
});

test("spec-v1344: a partial question returns what it worked out, not a refusal", async () => {
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  const out = await answerQuery({ query: "asphalt tonnage 2400 sq ft 3 in deep 12 ft wide" });
  assert.equal(out.status, "MISSING_INPUTS");
  assert.equal(out.id, "asphalt-tonnage");
  // What it recovered, so the caller does not re-type it...
  assert.equal(out.inputs.area_ft2, "2400");
  assert.equal(out.inputs.depth_in, "3");
  // ...and what it still needs, by human label.
  assert.ok(out.missing.some((m) => m.key === "density_pcf"), JSON.stringify(out.missing));
});

test("spec-v1344: naming a calculator without values is NO_VALUES, not a guess", async () => {
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  const out = await answerQuery({ query: "voltage drop" });
  assert.equal(out.status, "NO_VALUES");
  assert.equal(out.id, "voltage-drop");
});

test("spec-v1344: nonsense is NO_MATCH, never a confident pointer", async () => {
  // The ranker returns its best guess however weak. A tile is only named when
  // the query yielded values for it or contains a DISTINCTIVE word from its
  // name -- four characters or more, and not the connective vocabulary half
  // the catalog shares.
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  for (const q of ["what is the meaning of life", "hello there", "asdfghjkl"]) {
    const out = await answerQuery({ query: q });
    assert.equal(out.status, "NO_MATCH", `${q} -> ${out.status} ${out.id || ""}`);
    assert.equal(out.id, undefined, `${q} named ${out.id}`);
  }
});

test("spec-v1344: the same question twice gives the same answer", async () => {
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  const q = "voltage drop 240v 200 ft 10 awg aluminum 30a";
  const a = await answerQuery({ query: q });
  const b = await answerQuery({ query: q });
  assert.deepEqual(a.result, b.result);
});

test("spec-v1344: one incidental word is not a reader naming a calculator", async () => {
  // The nonsense guard used to depend on which of many equally-scoring tiles
  // happened to sort first: "what is the meaning of life" shares exactly one
  // word with HEPA Filter Life, and a single shared word was enough to call
  // the question corroborated. Whether that tile reached rank 0 was down to
  // alphabetical order, so the guard held by luck rather than by rule.
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  // Each of these shares exactly ONE distinctive word with a multi-word tile
  // name and nothing else. ("the filter of my life" is deliberately NOT here:
  // it shares two of HEPA Filter Life's three, which is a reader naming it.)
  for (const q of ["what is the meaning of life", "a life well lived", "what a lovely filter"]) {
    const out = await answerQuery({ query: q });
    assert.equal(out.status, "NO_MATCH", `${q} -> ${out.status} ${out.id || ""}`);
  }
  // And the rule still lets a real naming through: "drop" is noise, so
  // Voltage Drop is named by "voltage" alone.
  const vd = await answerQuery({ query: "voltage drop" });
  assert.equal(vd.id, "voltage-drop");
});

test("a curated alias promotes its tile over an uncorroborated top hit", async () => {
  // Corroboration is asked of ONE tile, so which one decides the answer.
  // Asking only rank 0 meant a phrase a human had mapped came back NO_MATCH
  // with the right calculator sitting at rank 1. Both cases in the corpus are
  // code sections, where every token is digit-led and therefore a VALUE to the
  // ranker, carrying no coverage, so the candidates tie on everything else.
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  for (const [q, want] of [["240.21", "feeder-tap-rule"], ["62.2", "ashrae-622-ventilation"]]) {
    const out = await answerQuery({ query: q });
    assert.notEqual(out.status, "NO_MATCH", `${q} should reach a calculator`);
    assert.equal(out.id, want);
  }
});

test("both doors agree on a code-section query", async () => {
  // rankTools returns NOTHING for a query of only digit-led tokens -- they are
  // values, they carry no coverage, so every candidate is filtered out. Every
  // code section therefore lands in search()'s fallback, and ordered by
  // substring alone the agent got transformer-conductor-protection for 240.21
  // and blower-door-ach50 for 62.2, while a reader typing the same into the
  // site got the tiles a human had mapped them to. search-discovery.js is
  // shared "so agent and browser recall cannot drift"; this is where it did.
  const { search } = await import("../../mcp/catalog.mjs");
  const { resolveQuery } = await import("../../search-discovery.js");
  const { TOOLS } = await import("../../tools-data.js");
  const { readFile } = await import("node:fs/promises");
  const { resolve, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const { aliases } = JSON.parse(await readFile(resolve(root, "data", "search", "aliases.json"), "utf8"));
  const ids = TOOLS.map((t) => t.id);
  const numeric = aliases.filter((r) => r && typeof r.term === "string" && /^\s*\d[\d.\-/]*\s*$/.test(r.term));
  assert.ok(numeric.length >= 20, `expected the corpus to carry code sections, found ${numeric.length}`);
  for (const row of numeric) {
    const out = await search({ query: row.term, limit: 3 });
    const first = (out.results || [])[0];
    const browser = resolveQuery(row.term, aliases, ids);
    assert.equal(first && first.id, row.target, `agent door: "${row.term}"`);
    assert.equal(browser && browser.match, row.target, `browser: "${row.term}"`);
  }
});

test("trade shorthand reaches the same tile on both doors", async () => {
  // "12/2" appears in no tile's id, name or description, so the substring
  // fallback returned NOTHING for the commonest romex spec there is, while the
  // site answered Wire Ampacity off the alias "12/2 wire max amps". The agent
  // fallback now asks the aliases the same two ways the browser does: exactly,
  // then by prefix.
  const { search } = await import("../../mcp/catalog.mjs");
  const { matchAliasPrefix } = await import("../../search-discovery.js");
  const { readFile } = await import("node:fs/promises");
  const { resolve, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const { aliases } = JSON.parse(await readFile(resolve(root, "data", "search", "aliases.json"), "utf8"));

  for (const q of ["12/2", "200a"]) {
    const out = await search({ query: q, limit: 3 });
    const first = (out.results || [])[0];
    const browser = matchAliasPrefix(q, aliases, 3)[0];
    assert.ok(browser, `"${q}" should still have an alias-prefix match to compare against`);
    assert.equal(first && first.id, browser.target, `"${q}" must agree with the browser`);
  }
  // Where the browser has nothing either, an empty list is the honest answer
  // and must not become a guess.
  for (const q of ["240v", "14-2"]) {
    assert.equal(matchAliasPrefix(q, aliases, 3).length, 0);
    const out = await search({ query: q, limit: 3 });
    assert.equal((out.results || []).length, 0, `"${q}" should stay empty, not guess`);
  }
});

// 20 tiles take no inputs at all -- OSHA Top-10, the knot and hand-signal
// references, the GFCI/AFCI table. Their content is the answer, so a question
// that names one carried nothing to extract and used to come back NO_VALUES
// with "call describe_calculator for its inputs", pointing at an empty list.
//
// It was 21 until 2026-09-09, and the 21st was not a reference tile at all:
// `magnetic-declination` looked input-free only because its compute-map entry
// is a zero-argument wiring stub, so the door advertised none of the four
// values its own page asks for and answered "declination at 25.76, -80.19"
// with the string "WMM-2025". The door now reads the bundled coefficients and
// runs the real model, so the tile advertises its inputs and leaves this set --
// which is now exactly the 20 pages build-shells treats as reference pages.
test("a tile with no inputs answers from its content, not NO_VALUES", async () => {
  const { answerQuery, describe } = await import("../../mcp/catalog.mjs");
  const out = await answerQuery({ query: "OSHA Top-10 Citations" });
  assert.equal(out.status, "OK");
  assert.equal(out.id, "osha-top10");
  assert.equal(out.via, "reference");
  assert.ok(Array.isArray(out.result.items) && out.result.items.length, JSON.stringify(out.result).slice(0, 200));
  // The premise: this tile really does advertise nothing to fill.
  assert.equal((await describe({ id: "osha-top10" })).inputs.length, 0);
});

test("every input-free tile answers when its own name is the question", async () => {
  const { answerQuery, describe } = await import("../../mcp/catalog.mjs");
  const { TOOLS } = await import("../../tools-data.js");
  const free = [];
  for (const t of TOOLS) {
    if (!(await describe({ id: t.id })).inputs.length) free.push(t);
  }
  assert.equal(free.length, 20, `input-free population moved: ${free.map((t) => t.id)}`);

  // Three living docs state this number in prose, and it is the kind of number
  // that moves under a change nobody connects to a doc. It did: AGENTS.md --
  // the file agents are pointed at -- still said 21 after fe03d908 moved it to
  // 20, and nothing looked. Anchored here, where the live count is already in
  // hand, rather than in a gate that would have to recompute it.
  const { readFile: readDoc } = await import("node:fs/promises");
  const stale = [];
  for (const rel of ["../../AGENTS.md", "../../mcp/README.md", "../../docs/architecture.md"]) {
    const text = await readDoc(new URL(rel, import.meta.url), "utf8");
    for (const m of text.matchAll(/(\d+) tiles that take no inputs/g)) {
      if (Number(m[1]) !== free.length) stale.push(`${rel}: "${m[0]}" but the live count is ${free.length}`);
    }
  }
  assert.deepEqual(stale, []);
  const unanswered = [];
  for (const t of free) {
    // water-classes loses its own name to class-of-loss-screen, a tile that
    // does take inputs; NO_VALUES is the right answer for that query, so ask
    // for it by id, which is what an agent that read the catalog would send.
    const q = t.id === "water-classes" ? t.id : t.name;
    const out = await answerQuery({ query: q });
    if (out.status !== "OK" || out.id !== t.id) unanswered.push(`${t.id}: ${out.status} -> ${out.id}`);
  }
  assert.deepEqual(unanswered, []);
});

// mcp/README.md states that the door's input-free set is "exactly the 20 pages
// the site prerenders as reference cards, and it is arrived at independently on
// each side". Two counts that agree are not two sets that agree, and the pair
// was 21 against 20 until 2026-09-09 -- so compare the members, not the totals.
// The door reads the compute's parameters; the builder reads the worked
// example's inputs. Neither knows about the other.
test("the door's input-free tiles are exactly the site's reference pages", async () => {
  const { describe } = await import("../../mcp/catalog.mjs");
  const { TOOLS } = await import("../../tools-data.js");
  const { loadWorkedExamples } = await import("../../scripts/build-shells.mjs");
  const examples = await loadWorkedExamples();
  const doorFree = [];
  for (const t of TOOLS) {
    if (!(await describe({ id: t.id })).inputs.length) doorFree.push(t.id);
  }
  const shellRefs = TOOLS
    .filter((t) => !examples.get(t.id) || !Object.keys(examples.get(t.id).inputs || {}).length)
    .map((t) => t.id);
  assert.deepEqual([...doorFree].sort(), [...shellRefs].sort());
});

// The substance of that fix: the two doors must not merely both answer, they
// must answer the SAME. The page's example is computed at build time from the
// bundled WMM coefficients (scripts/build-shells.mjs); the door computes from
// the same shard through mcp/catalog.mjs. Nothing here is hard-coded -- when
// the model is refreshed on the 2030 rollover, both sides move together, and a
// change that moves only one of them fails.
test("the MCP door and the tile page agree on the declination", async () => {
  const { run } = await import("../../mcp/catalog.mjs");
  const { loadWorkedExamples } = await import("../../scripts/build-shells.mjs");
  const page = (await loadWorkedExamples()).get("magnetic-declination");
  assert.ok(page && Object.keys(page.inputs || {}).length, "the page's example lost its inputs");

  // The door fills the same example from the same published object, so it can
  // be handed straight over: if the two ever diverge this line is what says so.
  const { describe } = await import("../../mcp/catalog.mjs");
  const doorExample = (await describe({ id: "magnetic-declination" })).example.inputs;
  assert.deepEqual(doorExample, page.inputs);

  const door = await run({ id: "magnetic-declination", inputs: { ...doorExample } });
  assert.deepEqual(door.warnings, [], "the page's own inputs must run warning-free");
  // The page rounds for display; compare at the page's own precision.
  const at = (key, digits) => Number(door.result[key].toFixed(digits));
  assert.equal(at("declination_deg", 2), page.outputs.declination_deg.value);
  assert.equal(at("inclination_deg", 2), page.outputs.inclination_deg.value);
  assert.equal(Math.round(door.result.total_intensity_nT), page.outputs.total_intensity_nT.value);
  assert.equal(at("annual_change_deg_yr", 3), page.outputs.annual_change_deg_yr.value);
});

// The other direction, which nothing checked: a tile that DOES take inputs must
// never fall into the reference path. The branch used to test `!rows.length` --
// the tile's field-INDEX rows -- and that is a different set from "has no
// inputs": a tile with no renderer shard, or one whose inputs are list-valued,
// projects no rows while having plenty of inputs. Measured 2026-09-02 the proxy
// fired for 42 tiles when 20 qualify, and the 22 extra had their OWN DEFAULTS
// run and returned as status "OK". "Rent vs Buy NPV Comparison" answered a
// question carrying no numbers with a $400,000 purchase price, $80,000 down and
// 6.5% -- none of it supplied, none of it distinguishable by the agent from an
// answer. NO_VALUES is the true reply, and a wrong answer is worse than none.
// The catalog-wide form of the test below, which pins a hand-listed 21 tiles
// and only flags the REFERENCE path. That list cannot grow on its own, and the
// reference path is not the only way to answer a question that carried nothing:
// a tile can answer `status: OK, via: "registry"` on a value the extractor
// scraped out of the query text when the query text was only the tile's name.
//
// `awg-wire-geometry` did exactly that. Its name ends "(Diameter, Circular
// Mils, mm^2)", the extractor read the exponent as a quantity, and the tile
// answered with the geometry of AWG 2 -- to a question that named no gauge, and
// the question an agent sends when it has just read the catalog.
//
// The invariant: a tile that takes inputs must not answer OK when the question
// is nothing but its own name. 2,062 tiles, roughly a minute.
// The alias corpus is the catalog's own statement of how people ask for these
// calculators, and `answer_query`'s rule for it has always been "a human wrote
// that phrase against that tile; nothing here outranks it". The rule was
// implemented as a search over the ranked TOP 3, so it could only rescue a
// target the ranker had already put there. Six of the ~22,500 terms had their
// target ranked lower or absent -- "how much can i build on my lot" does not
// put floor-area-ratio in the top TEN -- and the door answered NO_MATCH: no
// calculator matched, about a phrase the catalog itself maps to one.
//
// An exact term is now resolved from the corpus. The full sweep is
// scripts/measure-alias-door.mjs, about six minutes; these are the six, plus a
// deterministic slice so the property is not only pinned where it broke.
test("a curated alias reaches its own tile, even when the ranker buries it", async () => {
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  const REGRESSIONS = [
    ["sheave", "block-redirect-load"],
    ["what size wire", "min-conductor-for-vd"],
    ["what size weld", "steel-fillet-weld-size"],
    ["shaft size for torque", "shaft-diameter-for-torsion"],
    ["size a weir for flow", "weir-head-from-flow"],
    ["how much can i build on my lot", "floor-area-ratio"],
  ];
  const wrong = [];
  for (const [term, want] of REGRESSIONS) {
    const out = await answerQuery({ query: term });
    if (out.id !== want) wrong.push(`${term} -> ${out.id ?? out.status} (want ${want})`);
  }
  assert.deepEqual(wrong, []);
});

test("a deterministic slice of the alias corpus reaches its tiles", async () => {
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  const { readFile } = await import("node:fs/promises");
  const raw = JSON.parse(await readFile(new URL("../../data/search/aliases.json", import.meta.url), "utf8"));
  // Keyed as the door keys them. A term two tiles share states no preference,
  // so the ranker arbitrates it and it is not asserted here.
  const byTerm = new Map();
  for (const row of raw.aliases || []) {
    if (!row || typeof row.term !== "string" || typeof row.target !== "string") continue;
    const term = row.term.toLowerCase().trim();
    if (!term) continue;
    const set = byTerm.get(term);
    if (set) set.add(row.target); else byTerm.set(term, new Set([row.target]));
  }
  const unique = [...byTerm.entries()].filter(([, v]) => v.size === 1);
  const wrong = [];
  for (let i = 0; i < unique.length; i += 250) {
    const [term, set] = unique[i];
    const want = [...set][0];
    const out = await answerQuery({ query: term });
    if (out.id !== want) wrong.push(`${term} -> ${out.id ?? out.status} (want ${want})`);
  }
  assert.deepEqual(wrong, []);
});

// An id is not a phrasing, it is an ADDRESS: the one string the catalog
// guarantees is unique, and the one an agent holds after `search_calculators`.
// `describe_calculator` and `run_calculator` honour it exactly; `answer_query`
// resolved it by ranking like any other prose, and measured 2026-09-09, 21
// tiles named a DIFFERENT tile when handed their own id. `backflow-sizing` --
// a sizing screen -- came back `status: OK` carrying the `backflow` REFERENCE
// table, because "sizing" is a noise word and what was left matched the
// reference tile's name exactly.
//
// Two halves, and the first fix broke the second: after the tile resolved, the
// corroboration guard rejected it, because a hyphenated id carries no value,
// does not tokenise into the tile's name, and is nobody's curated phrase.
test("every tile answers to its own id, and none answers to another's", async () => {
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  const { TOOLS } = await import("../../tools-data.js");
  const wrong = [];
  for (const t of TOOLS) {
    const out = await answerQuery({ query: t.id });
    if (out.id !== t.id) wrong.push(`${t.id} -> ${out.id ?? out.status}`);
  }
  assert.deepEqual(wrong, []);
});

test("no tile answers a question that is only its own name", async () => {
  const { answerQuery, describe } = await import("../../mcp/catalog.mjs");
  const { TOOLS } = await import("../../tools-data.js");
  const answered = [];
  for (const t of TOOLS) {
    if (!(await describe({ id: t.id })).inputs.length) continue; // reference tiles may
    const out = await answerQuery({ query: t.name });
    if (out.status === "OK" && out.via !== "reference") {
      answered.push(`${t.id}: OK via ${out.via} with ${JSON.stringify(out.inputs)}`);
    }
  }
  assert.deepEqual(answered, []);
});

test("a tile that takes inputs never answers from its own defaults", async () => {
  const { answerQuery, describe } = await import("../../mcp/catalog.mjs");
  const { TOOLS } = await import("../../tools-data.js");
  const nameById = new Map(TOOLS.map((t) => [t.id, t.name]));
  // Every tile that took the reference path wrongly before the fix. Each has
  // inputs and each projects no field-index rows, which is exactly the gap
  // between the two conditions.
  const WITH_INPUTS_BUT_NO_ROWS = [
    "generator-sizing", "panel-rebalance", "static-pressure-hvac", "equivalent-length",
    "rebar-schedule", "geometry", "noise-dose", "bridge-formula", "hazmat-placard-threshold",
    "irrigation-uniformity", "dmx-planner", "lightning-countdown", "rental-worksheet",
    "loan-limits", "hud-fmr", "rent-vs-buy", "area-by-coordinates",
    "sailboat-performance-ratios", "occupant-load", "pv-performance-ratio", "bends-between-pulls",
  ];
  const guessed = [];
  for (const id of WITH_INPUTS_BUT_NO_ROWS) {
    assert.ok((await describe({ id })).inputs.length > 0, `${id} was expected to take inputs`);
    const out = await answerQuery({ query: nameById.get(id) });
    if (out.via === "reference") guessed.push(`${id}: answered from defaults ${JSON.stringify(out.inputs).slice(0, 80)}`);
  }
  assert.deepEqual(guessed, []);
});

// A curated alias may promote a tile past rank 1 -- that is how "240.21" reaches
// the feeder-tap-rule a human mapped it to. It may NOT do so when the query is
// another tile's own published name and that tile is sitting at rank 1: asking
// for "Water Loss Class and Category" returned the class-of-loss SCREEN,
// because "water loss class" is a curated alias for that one. Measured
// 2026-09-02, 79 tiles answered as a different calculator when asked for by
// their exact name while ranking first for it. An agent that reads the catalog
// and asks for a tile by the name the catalog gave it should get that tile.
test("a tile's own exact name outranks a partial curated alias", async () => {
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  const { TOOLS } = await import("../../tools-data.js");

  // The case that found it, both halves: the shorter phrase still goes where
  // the human sent it, and the full name goes to the tile that owns it.
  assert.equal((await answerQuery({ query: "water loss class" })).id, "class-of-loss-screen");
  assert.equal((await answerQuery({ query: "Water Loss Class and Category" })).id, "water-classes");

  // And nothing anywhere in the catalog answers to a different tile when asked
  // for by its own name -- all of them, not only the ones that rank first.
  // Two rank SECOND behind a near neighbour ("Markup and Margin" behind the
  // Markup vs. Margin Converter, "Two-Leg Bridle Leg Tension" behind the Sling
  // Angle Load Multiplier), and being someone's exact name is a stronger signal
  // than one rank of separation. 81 tiles failed this before 2026-09-02.
  //
  // One documented exception, and it is the rule working rather than an escape
  // hatch: "Fan Affinity Laws" is `affinity-laws`'s whole name AND an EXACT
  // curated term for `fan-affinity-laws` ("Fan Affinity Laws (Speed / Diameter
  // Change)"). A phrase a human wrote against a tile outranks a phrase that
  // merely happens to be another tile's name, so curation wins. Anything else
  // appearing here is a defect.
  const CURATED_OVER_NAME = new Map([["affinity-laws", "fan-affinity-laws"]]);
  const stolen = [];
  for (const t of TOOLS) {
    const out = await answerQuery({ query: t.name });
    if (!out.id || out.id === t.id) continue;
    if (CURATED_OVER_NAME.get(t.id) === out.id) continue;
    stolen.push(`${t.id} ("${t.name}") answered as ${out.id}`);
  }
  assert.deepEqual(stolen, []);

  // The seven curated terms that are also some other tile's whole name. The
  // first version of the exact-name rule sent every one of them to the name
  // instead of where the human sent it -- found by looking, not by reasoning.
  for (const [term, target] of [
    ["pump out", "septic-pumpout-interval"],
    ["fan affinity laws", "fan-affinity-laws"],
    ["how to figure total external static pressure", "static-pressure-hvac"],
    ["wire feed speed for a deposition rate", "wire-feed-speed-for-deposition"],
    ["two leg bridle tension per leg", "sling-angle"],
    ["tip size", "nozzle-flow-pressure"],
    ["markup vs margin", "markup-vs-margin"],
  ]) {
    assert.equal((await answerQuery({ query: term })).id, target, `curated term ${JSON.stringify(term)}`);
  }
});

test("the reference path does not loosen either corroboration guard", async () => {
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  // A tile that does take inputs still refuses to guess at them.
  assert.equal((await answerQuery({ query: "voltage drop" })).status, "NO_VALUES");
  // And nonsense still matches nothing, rather than falling into a reference.
  assert.equal((await answerQuery({ query: "asdfqwer zzz" })).status, "NO_MATCH");
});
