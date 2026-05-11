#!/usr/bin/env node
// v10 Phase A.3 citation-strings generator (spec-v10.md §3.3).
//
// Reads docs/citation-discipline.md, parses every per-tile source-stamp
// table under a `### calc-*.js` heading, and emits the structured
// JSON to docs/citation-strings.generated.json.
//
// Exit codes:
//   0  generated file written (or unchanged).
//   1  parse error in citation-discipline.md.
//
// CLI flags:
//   --check   parse only; fail (exit 1) if generated file would differ
//             from what is on disk. Used by `npm run lint`.
//   --emit    parse and write to disk. Default when no flag is given.
//
// The generator is deterministic so `--check` is a reliable
// in-sync gate.

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(ROOT, "docs", "citation-discipline.md");
const OUT = resolve(ROOT, "docs", "citation-strings.generated.json");

const MODE = process.argv.includes("--check") ? "check" : "emit";

function parse(text) {
  const lines = text.split(/\r?\n/);
  const rows = [];
  let group = null; // current `### calc-*.js (Group X)` heading

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = /^###\s+(calc-[a-z0-9-,. ]*\.js[^\n]*)$/.exec(line);
    if (headingMatch) {
      group = headingMatch[1].trim();
      continue;
    }
    // A per-tile row looks like:
    //   | tile-id | "Citation: ..." |
    // We pick rows whose source-stamp cell starts with a quoted string.
    if (!group) continue;
    if (!line.startsWith("| ")) continue;
    // Skip the header row and the separator row.
    if (line.includes("Tile") && line.includes("Source-stamp")) continue;
    if (/^\|\s*-+\s*\|/.test(line)) continue;
    // Split on `|` but only the first three columns (rest may contain |).
    const parts = splitMarkdownRow(line);
    if (parts.length < 2) continue;
    const tileCell = parts[0].trim();
    const stampCell = parts[1].trim();
    if (!tileCell || !stampCell) continue;
    if (!stampCell.startsWith('"') || !stampCell.endsWith('"')) continue;
    const stamp = stampCell.slice(1, -1);
    // A row may name multiple tiles separated by `, `; emit one entry
    // per tile so the runtime resolution stays per-id.
    const ids = tileCell
      .split(/\s*,\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const id of ids) {
      rows.push({ id, group, stamp });
    }
  }
  return rows;
}

function splitMarkdownRow(line) {
  // Strip leading/trailing pipe, then split on |. The source-stamp cell
  // never contains a pipe in practice; if a future row does, this will
  // be a parse error caught by the in-sync test (the regenerated file
  // will differ from the committed one).
  const inner = line.replace(/^\|\s*/, "").replace(/\s*\|\s*$/, "");
  return inner.split(/\s*\|\s*/);
}

function buildJson(rows, srcMtime) {
  // De-dup: a tile that appears in two tables is an error per spec
  // (single source of truth). Surface the duplicate as a parse failure.
  const byId = {};
  const dupes = [];
  for (const r of rows) {
    if (byId[r.id]) dupes.push(r.id);
    byId[r.id] = { group: r.group, stamp: r.stamp };
  }
  return {
    _comment:
      "v10 Phase A.3 generated artifact. DO NOT EDIT BY HAND. Source of truth is docs/citation-discipline.md; regenerate via `npm run docs:citation-strings`. Per spec-v10 §3.3 the runtime citations.js will eventually import these strings; the in-sync unit test holds the contract until then.",
    _generated_from: "docs/citation-discipline.md",
    _generator: "scripts/build-citation-strings.mjs",
    _row_count: rows.length,
    _duplicates: dupes,
    strings: byId,
  };
}

async function main() {
  if (!existsSync(SRC)) {
    console.error("ERROR: " + SRC + " not found.");
    process.exit(1);
  }
  const text = await readFile(SRC, "utf8");
  const rows = parse(text);
  if (rows.length === 0) {
    console.error("ERROR: parsed zero rows from citation-discipline.md.");
    process.exit(1);
  }
  const json = buildJson(rows);
  if (json._duplicates.length > 0) {
    console.error(
      "ERROR: duplicate tile id(s) in citation-discipline.md: " + json._duplicates.join(", "),
    );
    process.exit(1);
  }
  // Stable sort key order so the on-disk JSON is deterministic.
  const sortedStrings = {};
  for (const id of Object.keys(json.strings).sort()) {
    sortedStrings[id] = json.strings[id];
  }
  json.strings = sortedStrings;
  const out = JSON.stringify(json, null, 2) + "\n";

  if (MODE === "check") {
    if (!existsSync(OUT)) {
      console.error("ERROR: " + OUT + " missing. Run `npm run docs:citation-strings`.");
      process.exit(1);
    }
    const onDisk = await readFile(OUT, "utf8");
    if (onDisk !== out) {
      console.error(
        "ERROR: " + OUT + " is out of sync with docs/citation-discipline.md. Run `npm run docs:citation-strings`.",
      );
      process.exit(1);
    }
    console.log(
      "v10 citation-strings in-sync OK (" + rows.length + " rows / " + Object.keys(sortedStrings).length + " tiles).",
    );
    return;
  }

  await writeFile(OUT, out);
  console.log(
    "wrote " + OUT + " (" + rows.length + " rows / " + Object.keys(sortedStrings).length + " tiles).",
  );
}

await main();
