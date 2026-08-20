#!/usr/bin/env node
// spec-v1346: both-doors coverage lint.
//
// A calculator in this catalog is reachable two ways: a person types into the
// search box on the website, and an agent calls the local MCP server. Today
// every one of the 1,709 tiles is reachable both ways -- but nothing in the
// 42-gate chain asserts it, so it is true by luck rather than by
// construction. A tile added without a COMPUTE_MAP row, a renamed compute
// export, or a tile name that collides its way out of the top twelve would
// all pass CI while leaving a calculator unreachable.
//
// This gate pins both properties:
//
//   SEARCH DOOR  every tile's own name, run through the SAME ranker the
//                browser dropdown uses, returns that tile in the first 12.
//   MCP DOOR     every tile resolves through describe(), reports runnable,
//                and names a compute the server can actually call.
//   EXAMPLES     every tile carries a publisher-verified worked example,
//                which is what lets an agent answer in one round trip.
//
// It runs the REAL ranker over the REAL catalog. A gate that reimplements
// the thing it checks passes while the product is broken.
//
// Deliberately NO allowlist. Both numbers are 1,709 of 1,709 today, so an
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

const { normalizeQuery, rankTools } = await import(resolve(ROOT, "search-discovery.js"));
const { TOOLS } = await import(resolve(ROOT, "tools-data.js"));
const { describe } = await import(resolve(ROOT, "mcp", "catalog.mjs"));

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
let searchable = 0, runnable = 0, withExample = 0;

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
  if (described.example && described.example.inputs) withExample++;
  else failures.push(`${tool.id}: EXAMPLE -- no publisher-verified worked example row.`);
}

if (failures.length) {
  for (const f of failures) console.error("ERROR: " + f);
  console.error(`check-both-doors FAILED with ${failures.length} unreachable tile(s).`);
  process.exit(1);
}

console.log(
  `check-both-doors OK: ${TOOLS.length} tiles -- ${searchable} searchable ` +
  `(top ${SEARCH_HORIZON} on their own name), ${runnable} MCP-runnable, ${withExample} with a worked example.`,
);
