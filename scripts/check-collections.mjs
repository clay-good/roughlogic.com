#!/usr/bin/env node
// scripts/check-collections.mjs -- spec-v1926 lint gate.
//
// A collection (collections.js) is hand-typed data, so it can carry a typo that
// silently drops a tile from the page, or list one tile twice. This gate holds
// every collection to four rules:
//
//   1. every id is a live TOOLS tile, or a tile named by a spec whose status is
//      still PROPOSED (a planned tile the build omits until it lands);
//   2. no id appears twice in one collection;
//   3. no section is empty;
//   4. slugs are unique and URL-safe.
//
// Pure read-and-report. Standalone Node 20, built-ins only.

import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The tile ids a PROPOSED spec defines: the `### 2.1 \`id\`` tile heading of a
// spec whose first **Status:** span says PROPOSED.
export async function proposedTileIds(root = ROOT) {
  const dir = resolve(root, "specs");
  const ids = new Set();
  for (const f of await readdir(dir)) {
    if (!/^spec-v\d+\.md$/.test(f)) continue;
    const text = await readFile(resolve(dir, f), "utf8");
    const status = /\*\*Status:([^*]*)\*\*/.exec(text);
    if (!status || !/PROPOSED/.test(status[1])) continue;
    for (const m of text.matchAll(/^### \d+\.\d+ `([a-z0-9-]+)`/gm)) ids.add(m[1]);
  }
  return ids;
}

export function checkCollections(collections, liveIds, plannedIds) {
  const errors = [];
  const slugs = new Set();
  for (const c of collections) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.slug || "")) errors.push(`collection slug "${c.slug}" is not URL-safe`);
    if (slugs.has(c.slug)) errors.push(`collection slug "${c.slug}" appears twice`);
    slugs.add(c.slug);
    if (!c.title) errors.push(`${c.slug}: missing title`);
    const seen = new Set();
    for (const s of c.sections || []) {
      if (!s.ids || s.ids.length === 0) errors.push(`${c.slug}: section "${s.heading}" is empty`);
      for (const id of s.ids || []) {
        if (seen.has(id)) errors.push(`${c.slug}: "${id}" is listed twice`);
        seen.add(id);
        if (!liveIds.has(id) && !plannedIds.has(id)) {
          errors.push(`${c.slug}: "${id}" is neither a live tile nor a tile named by a PROPOSED spec`);
        }
      }
    }
    if (!c.sections || c.sections.length === 0) errors.push(`${c.slug}: no sections`);
  }
  return errors;
}

async function main() {
  const { COLLECTIONS } = await import(pathToFileURL(resolve(ROOT, "collections.js")).href);
  // The live catalog from the data module itself, not a regex over its text.
  const { TOOLS } = await import(pathToFileURL(resolve(ROOT, "tools-data.js")).href);
  const liveIds = new Set(TOOLS.map((t) => t.id));
  const planned = await proposedTileIds();
  const errors = checkCollections(COLLECTIONS, liveIds, planned);
  if (errors.length) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error(`check-collections FAILED with ${errors.length} error(s).`);
    process.exit(1);
  }
  for (const c of COLLECTIONS) {
    const ids = c.sections.flatMap((s) => s.ids);
    const landed = ids.filter((id) => liveIds.has(id)).length;
    console.log(`check-collections OK: ${c.slug} lists ${ids.length} tiles in ${c.sections.length} sections, ${landed} landed and ${ids.length - landed} planned.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
