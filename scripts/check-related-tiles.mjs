#!/usr/bin/env node
// spec-v13 Phase E (post-split): related-tiles registry lint.
//
// The registry lived inside tile-meta.js until 2026-05-18; it was lifted
// out into ./related-tiles.mjs (a build-time-only module the SPA never
// sees) so the runtime tile-meta.js stops growing with the editorial map.
// The validation moved with it.
//
// Asserts, for every entry in ./related-tiles.mjs `RELATED`:
//   - the key is a real tile id from the tools-data.js TOOLS array,
//   - the value is an array of strings,
//   - no entry references the tile itself,
//   - no entry is a duplicate within the array,
//   - the array length is <= 6 per spec-v13 §9.1,
//   - every referenced id is a real tile from TOOLS.
//
// Standalone Node 20 script using only built-ins. Wired into `npm run
// lint` so a curated set that drifts (a typo in an id, a stale
// reference to a retired tile) fails CI.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { assertFullCatalogParse } from "./catalog-size.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadToolIds() {
  const text = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const ids = new Set();
  const re = /\{\s*id:\s*"([a-z0-9-]+)"\s*,\s*name:\s*"[^"]+"\s*,\s*group:\s*"([^"]+)"/g;
  for (const m of text.matchAll(re)) ids.add(m[1]);
  await assertFullCatalogParse(ids.size, "check-related-tiles");
  return ids;
}

async function main() {
  const toolIds = await loadToolIds();
  if (toolIds.size === 0) {
    console.error("check-related-tiles: could not parse TOOLS from app.js.");
    process.exit(1);
  }
  const mod = await import(resolve(ROOT, "scripts/related-tiles.mjs"));
  const RELATED = mod.RELATED;
  if (!RELATED || typeof RELATED !== "object") {
    console.error("check-related-tiles: scripts/related-tiles.mjs does not export RELATED.");
    process.exit(1);
  }

  const errors = [];
  for (const [id, list] of Object.entries(RELATED)) {
    const where = "RELATED[" + JSON.stringify(id) + "]";
    if (!toolIds.has(id)) {
      errors.push(where + ": key is not a known TOOLS tile id.");
      continue;
    }
    if (!Array.isArray(list)) {
      errors.push(where + ": value is not an array.");
      continue;
    }
    if (list.length > 6) {
      errors.push(where + ": has " + list.length + " entries (cap 6 per spec-v13 §9.1).");
    }
    const seen = new Set();
    for (const r of list) {
      if (typeof r !== "string") {
        errors.push(where + ": entry " + JSON.stringify(r) + " is not a string.");
        continue;
      }
      if (r === id) {
        errors.push(where + ": entry references the tile itself.");
      }
      if (!toolIds.has(r)) {
        errors.push(where + ": entry '" + r + "' is not a known TOOLS id.");
      }
      if (seen.has(r)) {
        errors.push(where + ": entry '" + r + "' is a duplicate.");
      }
      seen.add(r);
    }
  }

  // docs/seo.md describes the BUILT graph -- the one `relatedGraph` produces
  // after adopting every tile that received no inbound link -- and states its
  // edge count and how many orphans found a host. Those are facts about this
  // registry, so they are checked here rather than in check-readme-counts, and
  // measured by running the builder's own function rather than a second
  // implementation of it. Both had rotted with the catalog: 6,387 edges and
  // "268 of the 269" against a live 7,247 and 293 of 294.
  //
  // The mean inbound degree and the heaviest receiver are stated in the same
  // sentence and were still correct (3.48 rounds to the 3.5 it claims, and 30
  // is unchanged), so they are left as prose rather than pinned to a number
  // that would churn on every landing.
  const { relatedGraph, relatedTiles } = await import("./build-shells.mjs");
  // The checks above work from parsed ids; the graph needs the real tile
  // objects (the ranker reads name and group), so load the module here.
  const { TOOLS } = await import(resolve(ROOT, "tools-data.js"));
  const preLists = new Map(TOOLS.map((t) => [t.id, relatedTiles(t, TOOLS, RELATED)]));
  const preInbound = new Map(TOOLS.map((t) => [t.id, 0]));
  for (const l of preLists.values()) for (const r of l) preInbound.set(r.id, (preInbound.get(r.id) || 0) + 1);
  const orphans = [...preInbound.values()].filter((v) => v === 0).length;
  const lists = relatedGraph(TOOLS, RELATED);
  let edges = 0;
  for (const l of lists.values()) edges += l.length;
  const adopted = orphans - [...TOOLS].filter((t) => {
    for (const l of lists.values()) if (l.some((x) => x.id === t.id)) return false;
    return true;
  }).length;
  const seo = await readFile(resolve(ROOT, "docs", "seo.md"), "utf8");
  const seoEdges = /The graph now carries ([\d,]+) edges/.exec(seo);
  const seoHosts = /([\d,]+) of the ([\d,]+) find a host/.exec(seo);
  if (!seoEdges) errors.push("docs/seo.md no longer states the built graph's edge count; it is anchored here so it cannot rot.");
  else if (Number(seoEdges[1].replace(/,/g, "")) !== edges) errors.push(`docs/seo.md says the graph carries ${seoEdges[1]} edges; it carries ${edges}.`);
  if (!seoHosts) errors.push("docs/seo.md no longer states how many orphaned tiles find a host; it is anchored here so it cannot rot.");
  else if (Number(seoHosts[1].replace(/,/g, "")) !== adopted || Number(seoHosts[2].replace(/,/g, "")) !== orphans) {
    errors.push(`docs/seo.md says ${seoHosts[1]} of the ${seoHosts[2]} orphans find a host; it is ${adopted} of ${orphans}.`);
  }

  if (errors.length > 0) {
    console.error("check-related-tiles: " + errors.length + " issue(s):");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }

  console.log(
    "check-related-tiles OK: " + Object.keys(RELATED).length +
    " curated entries; every id resolves to a TOOLS tile, no self-refs, no duplicates, all <= 6 entries; the built graph carries " + edges + " edges and docs/seo.md agrees on that and on the " + adopted + " of " + orphans + " orphans that find a host."
  );
}

await main();
