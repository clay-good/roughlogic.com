#!/usr/bin/env node
// spec-v1346: both-doors coverage lint.
//
// A calculator in this catalog is reachable two ways: a person types into the
// search box on the website, and an agent calls the local MCP server. Every
// one of the 1,804 tiles is reachable both ways -- but nothing in the gate
// chain asserted it, so it was true by luck rather than by construction. A
// tile added without a COMPUTE_MAP row, a renamed compute export, or a tile
// name that collides its way out of the top twelve would all pass CI while
// leaving a calculator unreachable.
//
// This gate pins those properties:
//
//   SEARCH DOOR  every tile's own name, run through the SAME ranker the
//                browser dropdown uses, returns that tile in the first 12.
//   MCP DOOR     every tile resolves through describe(), reports runnable,
//                and names a compute the server can actually call.
//   INPUT KEYS   every input the door advertises is a key a caller can send,
//                and every key the tile's own example sets is advertised.
//   EXAMPLES     every tile carries a publisher-verified worked example, and
//                that example actually runs clean through run().
//   ANSWER KEYS  every caption-sourced output the door names is a key that
//                example's result actually carries, so no answer is described
//                that is not there.
//
// Reaching a tile is not the same as being able to USE it. Three tiles
// advertised an input name no JSON object could carry, because the signature
// parser read a maintainer comment as a parameter; the value never arrived and
// the tile answered from its default, which on `npsh-a` meant reporting a
// cavitation margin 2 ft safer than the truth. Five more advertised nothing at
// all. The INPUT KEYS assertion is what catches that class, and it leans on
// the worked example -- authored separately from the signature -- rather than
// re-parsing the signature the door already parsed.
//
// It runs the REAL ranker over the REAL catalog. A gate that reimplements
// the thing it checks passes while the product is broken.
//
// Deliberately NO allowlist. Every number is 1,804 of 1,804 today, so an
// exemption list would start empty and exist only to absorb the first
// regression silently. A tile that genuinely cannot be found or run is a
// spec decision with a written reason, not a line in a JSON file.
//
// Standalone Node 20, built-ins only. No network, no mutation.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VERBOSE = process.argv.includes("--verbose");

// The dropdown shows 12 results, so 12 is the reachability horizon a person
// actually has. NOT rank 1: five tiles legitimately share vocabulary with a
// near-neighbour, and gating on first place would gate on a tie-break rather
// than on whether the tile can be found at all.
const SEARCH_HORIZON = 12;

// A key a caller can spell in a JSON `inputs` object and have the compute
// destructure receive.
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const { normalizeQuery, rankTools } = await import(resolve(ROOT, "search-discovery.js"));
const { TOOLS } = await import(resolve(ROOT, "tools-data.js"));
const { describe, run } = await import(resolve(ROOT, "mcp", "catalog.mjs"));

// The alias master, not a per-group shard: the browser merges every shard at
// runtime, so the master is the equivalent corpus.
let aliases = [];
try {
  const raw = JSON.parse(await readFile(resolve(ROOT, "data", "search", "aliases.json"), "utf8"));
  if (Array.isArray(raw.aliases)) {
    aliases = raw.aliases
      .filter((r) => r && typeof r.term === "string" && typeof r.target === "string")
      .map((r) => ({ term: r.term.toLowerCase(), target: r.target }));
  }
} catch {
  console.error("check-both-doors FAIL: data/search/aliases.json unreadable.");
  process.exit(1);
}

const failures = [];
let searchable = 0, runnable = 0, withExample = 0, exampleRuns = 0;
let withOutputs = 0;

for (const tool of TOOLS) {
  // --- search door ---
  const { tokens } = normalizeQuery(tool.name);
  if (!tokens.length) {
    failures.push(`${tool.id}: SEARCH -- the tile name "${tool.name}" normalizes to no tokens, so no query can reach it.`);
  } else {
    const ranked = rankTools(tokens, TOOLS, aliases, { limit: SEARCH_HORIZON });
    const rank = ranked.findIndex((r) => r.tool.id === tool.id);
    if (rank < 0) {
      failures.push(
        `${tool.id}: SEARCH -- searching its own name "${tool.name}" does not return it in the ` +
        `first ${SEARCH_HORIZON}. Add an alias in data/search/aliases.json, or rename the tile.`,
      );
    } else {
      searchable++;
      if (VERBOSE && rank > 0) console.log(`  note: ${tool.id} ranks ${rank + 1} on its own name.`);
    }
  }

  // --- MCP door ---
  let described;
  try {
    described = await describe({ id: tool.id });
  } catch (e) {
    failures.push(`${tool.id}: MCP -- describe() threw: ${e && e.message ? e.message : e}`);
    continue;
  }
  if (!described.runnable) {
    failures.push(
      `${tool.id}: MCP -- not runnable. Every tile needs a row in test/fixtures/compute-map.js ` +
      `naming the module and exported compute function.`,
    );
  } else {
    runnable++;
  }
  // Every input the door advertises must be a key a caller can actually send.
  // A name that is not a JS identifier cannot appear in a `run` call at all,
  // so the value silently never reaches the compute and the tile answers from
  // its defaults. Three tiles shipped that way: a maintainer comment inside a
  // destructure became an input name (`npsh-a` dropped friction loss, and
  // reported NPSHa 2 ft higher -- safer -- than the truth), and a renamed key
  // was advertised as `protected: prot` rather than `protected`.
  //
  // Deliberately a shape assertion, not a re-parse of the signature: a gate
  // that reruns the parser it is checking agrees with it by construction.
  for (const field of described.inputs || []) {
    const name = field && (field.name ?? field.key);
    if (typeof name !== "string" || !IDENTIFIER.test(name)) {
      failures.push(
        `${tool.id}: MCP -- advertises an input named ${JSON.stringify(name)}, which is not a ` +
        `key a caller can send. Its value would be dropped and the tile would answer from defaults.`,
      );
    }
  }

  if (described.example && described.example.inputs) {
    withExample++;
    // The published example and the compute's signature are authored
    // separately, so the example is an INDEPENDENT statement of what the tile
    // takes. Every key it sets must be one the door advertises: a key the
    // example uses but `describe` never names is a value an agent following
    // the door's own contract will omit, and the tile answers without it.
    //
    // This is the assertion that caught all three shipped defects -- the
    // signature parser lost `friction_loss_ft` behind a maintainer comment and
    // `npsh-a` reported NPSHa 2 ft higher (safer) than the truth. Checking the
    // names are well-formed would not have: the parser drops what it cannot
    // read, so a lost input goes missing rather than looking wrong.
    const advertised = new Set((described.inputs || []).map((f) => f && (f.name ?? f.key)));
    for (const key of Object.keys(described.example.inputs)) {
      if (!advertised.has(key)) {
        failures.push(
          `${tool.id}: MCP -- its own worked example sets "${key}", which describe() does not ` +
          `advertise. An agent reading the door would omit it and answer from the default.`,
        );
      }
    }
    // ...and the example must actually survive the door it is published for.
    // An agent's cheapest first move is to replay the published example; if
    // that errors, the tile is runnable in name only.
    try {
      const out = await run({ id: tool.id, inputs: described.example.inputs });
      if (!out || !out.result) {
        failures.push(`${tool.id}: EXAMPLE -- run() returned no result for the published example.`);
      } else if (out.result.error) {
        failures.push(`${tool.id}: EXAMPLE -- run() rejected the published example: ${out.result.error}`);
      } else {
        exampleRuns++;
        // ANSWER KEYS. The input assertions above say a caller can hand the
        // tile its values; this says the tile's answer can be read.
        //
        // Only for `outputs_source: "captions"` -- the 961 tiles whose answer
        // names come from the captions the renderer prints, keyed by the
        // compute's own result key so a caller can join them straight onto
        // `result`. A schema-sourced output is keyed by the renderer's DISPLAY
        // LINE instead ("pd", "cf"), which is a different and equally
        // deliberate key space: 703 of the 708 schema tiles key that way, and
        // `run` hands those lines their formatted `display` string. Asserting
        // one key space against the other would be a category error.
        //
        // The captions are extracted from display code, where an expression can
        // name an input element or a mode the tile is not in. On a shell page
        // such a caption is a no-op with nothing to label; advertised through
        // the door it is a claim about an answer that does not exist.
        const carried = out.result;
        for (const o of (described.outputs_source === "captions" ? described.outputs : []) || []) {
          if (!o || typeof o.key !== "string") continue;
          if (!Object.prototype.hasOwnProperty.call(carried, o.key)) {
            failures.push(
              `${tool.id}: MCP -- advertises an output "${o.key}" (${JSON.stringify(o.label)}) ` +
              `that its own worked example does not produce. The door names an answer that is not there.`,
            );
          }
        }
        withOutputs += (described.outputs || []).length ? 1 : 0;
      }
    } catch (e) {
      failures.push(`${tool.id}: EXAMPLE -- run() threw on the published example: ${e && e.message ? e.message : e}`);
    }
  } else {
    failures.push(`${tool.id}: EXAMPLE -- no publisher-verified worked example row.`);
  }
}

if (failures.length) {
  for (const f of failures) console.error("ERROR: " + f);
  console.error(`check-both-doors FAILED with ${failures.length} unreachable tile(s).`);
  process.exit(1);
}

console.log(
  `check-both-doors OK: ${TOOLS.length} tiles -- ${searchable} searchable ` +
  `(top ${SEARCH_HORIZON} on their own name), ${runnable} MCP-runnable, ${withExample} with a worked ` +
  `example, ${exampleRuns} of which run clean through the MCP door; ${withOutputs} name their answers.`,
);
