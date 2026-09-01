#!/usr/bin/env node
// The registries a new tile must be added to, derived rather than remembered.
//
// docs/contributor-checklist.md tells a contributor which files a new tile has
// to be wired into. That list was written by hand and had drifted both ways by
// 2026-09-01: it omitted test/fixtures/renderer-map.js and never named
// test/fixtures/worked-examples.json as a file (both mandatory -- removing a
// live tile from either reddens a gate), and it called
// scripts/related-tiles.mjs mandatory when 130 live tiles have no entry there.
// A contributor following it hit failures it did not predict and did work it
// did not need.
//
// A registry that holds every tile id is one a new tile must be added to. That
// is a fact about the repository, not a fact about anyone's memory, so this
// gate reads it off the files: every registry at 100% coverage must be named
// in the checklist, and no registry below 100% may be presented there as
// mandatory.
//
// Standalone Node 20 script using only built-ins. Reads files; runs nothing.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECKLIST = "docs/contributor-checklist.md";

// Every per-tile registry the catalog has. Coverage is measured, not assumed.
const REGISTRIES = [
  "tool-modules.js",
  "tile-meta.js",
  "citations.js",
  "test/fixtures/compute-map.js",
  "test/fixtures/renderer-map.js",
  "test/fixtures/worked-examples.json",
  "data/search/aliases.json",
  "scripts/related-tiles.mjs",
];

// A registry names a tile if the id appears as a quoted token. Every one of
// these files keys on the id, so a bare substring would over-count on a
// hyphenated prefix ("box-fill" inside "box-fill-derate").
function holds(text, id) {
  return text.includes(`"${id}"`) || text.includes(`'${id}'`) || text.includes("`" + id + "`");
}

async function main() {
  const mod = await import(pathToFileURL(resolve(ROOT, "tools-data.js")).href);
  const ids = (mod.TOOLS || []).map((t) => t.id);
  if (ids.length === 0) {
    console.error("check-tile-registries: TOOLS is empty.");
    process.exit(1);
  }
  const checklist = await readFile(resolve(ROOT, CHECKLIST), "utf8");
  const errors = [];
  const rows = [];

  for (const rel of REGISTRIES) {
    const path = resolve(ROOT, rel);
    if (!existsSync(path)) {
      errors.push(`${rel}: registry named by this gate does not exist. Was it renamed?`);
      continue;
    }
    const text = await readFile(path, "utf8");
    let held = 0;
    for (const id of ids) if (holds(text, id)) held++;
    const complete = held === ids.length;
    rows.push({ rel, held, complete });

    const named = checklist.includes(rel);
    if (complete && !named) {
      errors.push(
        `${rel} holds all ${ids.length} tile ids, so a new tile must be added to it, ` +
        `and ${CHECKLIST} never names the file. A contributor following that list ` +
        `will hit a gate it did not predict.`);
    }
    if (!complete && named) {
      // Named is fine -- but it must not be presented as required.
      const around = checklist.slice(Math.max(0, checklist.indexOf(rel) - 400), checklist.indexOf(rel) + 200);
      if (!/\bnot\b[^.]{0,60}required|optional/i.test(around)) {
        errors.push(
          `${rel} holds ${held} of ${ids.length} tile ids, so it is optional, but ${CHECKLIST} ` +
          `presents it as a registry a new tile must be wired into. Say it is optional, or the ` +
          `list asks for work no gate requires.`);
      }
    }
  }

  if (errors.length) {
    console.error(`check-tile-registries: ${errors.length} issue(s).`);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  const complete = rows.filter((r) => r.complete);
  console.log(
    `check-tile-registries OK: ${complete.length} of ${rows.length} per-tile registries hold all ` +
    `${ids.length} ids and are named in ${CHECKLIST} (${complete.map((r) => r.rel).join(", ")}); ` +
    `${rows.length - complete.length} partial and marked optional there ` +
    `(${rows.filter((r) => !r.complete).map((r) => `${r.rel} ${r.held}/${ids.length}`).join(", ")}).`);
}

await main();
