#!/usr/bin/env node
// A spec's Status line must agree with the catalog.
//
// Newer specs open with `> **Status: PROPOSED (date). ...**`, and landing a
// tile did not always touch that line. On 2026-09-24, 884 of the 1,787 specs still
// read PROPOSED although every one of them had shipped -- so the direct
// question "which specs are left to build?" answered 884 when the answer was
// zero. Thirteen of those had shipped under a different id than the spec
// named (`radiography-boundary` is `rt-restricted-area`), and five had been
// cut as duplicates in a scope doc, so neither the spec's id nor its status
// told a reader what happened.
//
// The rules, for a spec whose section headings name its tiles (`### 2.1 \`id\``):
//   PROPOSED  fails when every named id is in the catalog, or when a calc
//             module carries a `// spec-vN:` section header or comment for it
//             (a tile built under another id, or a cut noted in the code).
//             Mark it LANDED or CUT.
//   LANDED    fails when a named id is missing from the catalog, unless the
//             status explicitly resolves one missing id with "built as `x`".
//   CUT       fails when a named id IS in the catalog, unless the status names
//             it (an exact id collision with an older tile, disclosed).
// Older specs use `Implementation status` or `Status: **SHIPPED**`. Those
// forms are normalized too, and every numbered spec must have a recognized
// status so a historical spelling cannot silently fall out of the tally.
// Platform specs name no tile ids, so only their status coverage is checked.
//
// Pure read-and-report; no network, no mutation.

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { argv } from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The status word and the whole bold status span, which may wrap lines.
export function parseStatus(text) {
  const canonical = text.match(/\*\*Status:\s*([A-Z]+)[\s\S]*?\*\*/);
  if (canonical) return { word: canonical[1], span: canonical[0] };

  const alternate = text.match(/^>\s*Status:\s*\*\*([A-Z]+)[\s\S]*?\*\*/m);
  if (alternate) return { word: normalizeLegacyStatus(alternate[1]), span: alternate[0] };

  const implementation = text.match(/^>\s*\*\*Implementation status[\s\S]*?\*\*/mi);
  if (!implementation) return null;
  const upper = implementation[0].toUpperCase();
  const legacy = ["LANDED", "CLOSED", "COMPLETE", "SHIPPED", "IMPLEMENTED", "CUT", "DRAFT", "PLANNED", "PROPOSED"]
    .find((state) => new RegExp("\\b" + state + "\\b").test(upper));
  return legacy ? { word: normalizeLegacyStatus(legacy), span: implementation[0] } : null;
}

function normalizeLegacyStatus(word) {
  if (["LANDED", "CLOSED", "COMPLETE", "SHIPPED", "IMPLEMENTED"].includes(word)) return "LANDED";
  if (["DRAFT", "PLANNED"].includes(word)) return "PROPOSED";
  return word;
}

// Tile ids named by the spec's own section headings.
export function specTileIds(text) {
  return [...text.matchAll(/^#{2,4}\s+[A-Z0-9]+(?:\.[A-Z0-9]+)*\s+.*?(?:\(`([a-z0-9-]+)`\)|`([a-z0-9-]+)`)/gm)]
    .map((m) => m[1] || m[2]);
}

const names = (span, id) => new RegExp("(^|[^a-z0-9-])" + id + "($|[^a-z0-9-])").test(span);

// Errors for one spec. `catalog` is a Set of live tile ids; `built` is true
// when a calc module carries this spec's section header.
export function specStatusErrors({ word, span }, ids, catalog, built = false) {
  const live = ids.filter((id) => catalog.has(id));
  const missing = ids.filter((id) => !catalog.has(id));
  if (ids.length === 0) {
    return word === "PROPOSED" && built
      ? ["says PROPOSED but a calc module names it in a `// spec-vN` comment; mark it LANDED or CUT"]
      : [];
  }
  if (word === "PROPOSED") {
    if (missing.length === 0) return ["says PROPOSED but " + live.map((i) => "`" + i + "`").join(", ") + " is in the catalog; mark it LANDED"];
    if (built) return ["says PROPOSED but a calc module names it in a `// spec-vN` comment; mark it LANDED (\"built as `id`\") or CUT"];
    return [];
  }
  if (word === "LANDED") {
    const genericAlias = missing.length === 1
      && [...span.matchAll(/\bbuilt\s+as\s+(?:>\s*)?`([a-z0-9-]+)`/g)].some((m) => catalog.has(m[1]));
    const mapped = missing.filter((id) => {
      const match = new RegExp("`" + id + "`\\s+built\\s+as\\s+(?:>\\s*)?`([a-z0-9-]+)`").exec(span);
      return match && catalog.has(match[1]);
    });
    const laterCut = /\blater cut by `spec-v\d+`/.test(span)
      && missing.every((id) => names(span, id));
    const missingResolved = genericAlias || mapped.length === missing.length || laterCut;
    return missing.length > 0 && !missingResolved
      ? ["says LANDED but " + missing.map((i) => "`" + i + "`").join(", ") + " is not in the catalog; name each as-built id (\"`old-id` built as `live-id`\")"]
      : [];
  }
  if (word === "CUT") {
    const undisclosed = live.filter((id) => !names(span, id));
    return undisclosed.length > 0
      ? ["says CUT but " + undisclosed.map((i) => "`" + i + "`").join(", ") + " is in the catalog; name the collision in the status"]
      : [];
  }
  return [];
}

function main() {
  const catalog = new Set([...readFileSync(join(ROOT, "tools-data.js"), "utf8").matchAll(/\{ id: "([a-z0-9-]+)"/g)].map((m) => m[1]));
  const headers = new Set();
  for (const name of readdirSync(ROOT)) {
    if (!/^calc-.*\.js$/.test(name)) continue;
    for (const m of readFileSync(join(ROOT, name), "utf8").matchAll(/^\/\/[ =]*spec-v(\d+)[:\s]/gm)) headers.add(m[1]);
  }
  const errors = [];
  const tally = {};
  const specs = readdirSync(join(ROOT, "specs")).filter((n) => /^spec-v\d+\.md$/.test(n));
  for (const name of specs) {
    const text = readFileSync(join(ROOT, "specs", name), "utf8");
    const status = parseStatus(text);
    if (!status) {
      errors.push("specs/" + name + ": has no recognized Status or Implementation status line");
      continue;
    }
    tally[status.word] = (tally[status.word] || 0) + 1;
    const v = /\d+/.exec(name)[0];
    for (const e of specStatusErrors(status, specTileIds(text), catalog, headers.has(v))) errors.push("specs/" + name + ": " + e);
  }
  if (errors.length > 0) {
    for (const e of errors.slice(0, 25)) console.error("ERROR: " + e);
    if (errors.length > 25) console.error("ERROR: ... and " + (errors.length - 25) + " more.");
    console.error(
      "check-spec-status FAILED: " + errors.length + " spec(s) whose Status line disagrees with the catalog.\n" +
        "A spec's status is how a reader learns what is left to build; update it when the tile lands or is cut.",
    );
    process.exit(1);
  }
  const summary = Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([w, n]) => n + " " + w).join(", ");
  console.log("check-spec-status OK: " + specs.length + " specs; statuses agree with the catalog (" + summary + ").");
}

if (resolve(argv[1] || "") === fileURLToPath(import.meta.url)) main();
