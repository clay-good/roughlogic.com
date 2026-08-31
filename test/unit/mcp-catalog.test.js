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

// 21 tiles take no inputs at all -- OSHA Top-10, the knot and hand-signal
// references, the WMM model stamp. Their content is the answer, so a question
// that names one carried nothing to extract and used to come back NO_VALUES
// with "call describe_calculator for its inputs", pointing at an empty list.
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
  assert.equal(free.length, 21, `input-free population moved: ${free.map((t) => t.id)}`);
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

test("the reference path does not loosen either corroboration guard", async () => {
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  // A tile that does take inputs still refuses to guess at them.
  assert.equal((await answerQuery({ query: "voltage drop" })).status, "NO_VALUES");
  // And nonsense still matches nothing, rather than falling into a reference.
  assert.equal((await answerQuery({ query: "asdfqwer zzz" })).status, "NO_MATCH");
});
