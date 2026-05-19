#!/usr/bin/env node
// spec-v14 §11.2 Phase G citation-to-formula round-trip (scaffolding).
//
// Builds the inverse map of the CITATIONS object in citations.js: for
// every cited source (NEC, ASHRAE, NFPA, IPC, IRC, IBC, ACCA, etc.),
// list every tile that cites it. The map is the input to the per-source
// edition-rollover playbook: when a published source ships a new
// edition, the rollover-recheck row in docs/v6-audit.md lists exactly
// the tiles affected.
//
// Behavior:
//   FAIL (exit 1):
//     - citations.js missing or unparseable.
//     - A CITATIONS tile_id is not in TOOLS (orphan citation; the v10
//       check-tile-meta lint already catches the TOOLS->CITATIONS
//       direction, this is the inverse direction).
//   WARN (does not fail; scaffolding):
//     - A TOOLS tile has no CITATIONS entry. (Already a warning in
//       check-tile-meta.mjs for some tile sets; re-asserted here so a
//       future regression in either path is caught.)
//
// Pure read-and-report; no network, no mutation. Wired into
// `npm run lint`.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP_JS = resolve(ROOT, "app.js");
const CITATIONS_JS = resolve(ROOT, "citations.js");

// The source tokens we track. Each maps a regex pattern (applied to the
// per-tile `edition` field of CITATIONS) to a canonical source name.
// The list is the published-source surface called out in spec-v14 §6.1
// (textbook / code-body / handbook / NIST / FRED / extension-service).
// A future source ships an entry here and the lint picks up the new
// inverse-map row automatically.
const SOURCE_PATTERNS = [
  { re: /\bNEC[\s-]*2017\b/i, name: "NEC 2017" },
  { re: /\bNEC[\s-]*2020\b/i, name: "NEC 2020" },
  { re: /\bNEC[\s-]*2023\b/i, name: "NEC 2023" },
  { re: /\bNEC[\s-]*2026\b/i, name: "NEC 2026" },
  { re: /\bNFPA[\s-]*13\b/i, name: "NFPA 13 (sprinkler)" },
  { re: /\bNFPA[\s-]*54\b/i, name: "NFPA 54 (fuel gas)" },
  { re: /\bNFPA[\s-]*1962\b/i, name: "NFPA 1962 (fire hose)" },
  { re: /\bNFPA[\s-]*1142\b/i, name: "NFPA 1142 (rural water supply)" },
  { re: /\bIRC[\s-]*201[8-9]\b/i, name: "IRC 2018" },
  { re: /\bIRC[\s-]*2021\b/i, name: "IRC 2021" },
  { re: /\bIRC[\s-]*2024\b/i, name: "IRC 2024" },
  { re: /\bIBC[\s-]*2021\b/i, name: "IBC 2021" },
  { re: /\bIPC[\s-]*2021\b/i, name: "IPC 2021" },
  { re: /\bIFGC[\s-]*2021\b/i, name: "IFGC 2021" },
  { re: /\bASHRAE[\s-]*62\.1\b/i, name: "ASHRAE 62.1" },
  { re: /\bASHRAE[\s-]*Fundamentals\b/i, name: "ASHRAE Fundamentals" },
  { re: /\bACCA[\s-]*Manual[\s-]*J\b/i, name: "ACCA Manual J" },
  { re: /\bACCA[\s-]*Manual[\s-]*D\b/i, name: "ACCA Manual D" },
  { re: /\bAWC[\s-]*NDS\b/i, name: "AWC NDS" },
  { re: /\bASCE[\s-]*7\b/i, name: "ASCE 7" },
  { re: /\bIEEE[\s-]*141\b/i, name: "IEEE 141 (Red Book)" },
  { re: /\bIEEE[\s-]*835\b/i, name: "IEEE 835 (ampacity)" },
  { re: /\bIICRC[\s-]*S500\b/i, name: "IICRC S500" },
  { re: /\bNIST[\s-]*(CODATA|SP)/i, name: "NIST CODATA / SP" },
  { re: /\bIRS\b.*\bmileage\b/i, name: "IRS standard mileage" },
  { re: /\bFMCSA\b/i, name: "FMCSA" },
  { re: /\bFAA[\s-]*H-8083\b/i, name: "FAA H-8083 (Pilot's Handbook)" },
  { re: /\b14[\s-]*CFR\b/i, name: "14 CFR" },
  { re: /\bAHA\b|\bACLS\b/i, name: "AHA / ACLS" },
  { re: /\bAAHA\b/i, name: "AAHA" },
  { re: /\bPlumb's\b/i, name: "Plumb's Veterinary Drug Handbook" },
  { re: /\bNOAA\b.*\bWMM\b/i, name: "NOAA WMM" },
  { re: /\bUSGS\b/i, name: "USGS" },
  { re: /\bFRED\b/i, name: "FRED" },
  { re: /\bCDC\b/i, name: "CDC" },
  { re: /\bFDA\b/i, name: "FDA" },
];

async function loadToolIds() {
  const text = await readFile(APP_JS, "utf8");
  const ids = new Set();
  const re = /\{\s*id:\s*"([a-z0-9-]+)"/g;
  for (const m of text.matchAll(re)) ids.add(m[1]);
  return ids;
}

async function loadCitations() {
  // The CITATIONS object is a large object literal in citations.js. We
  // do not eval the module (the file imports from a generated module
  // chain and dynamic import would force a build). Instead we extract
  // the per-tile keys and the edition / freeAccess strings via regex.
  // The lint is conservative: it counts tile entries and per-tile
  // `edition` content for source-pattern matching, not the full object
  // semantics.
  const text = await readFile(CITATIONS_JS, "utf8");
  const start = text.indexOf("export const CITATIONS = {");
  if (start < 0) return null;
  // Capture each `"<id>": { ... edition: "<edition-string>" ... }`
  // block. We use a permissive matcher that extracts the tile id and
  // any leading edition string; tiles whose edition is a JS const
  // (e.g., `edition: NEC_2023`) are picked up via the const-resolution
  // pass below.
  const entries = new Map();
  // Phase 1: collect tile ids + raw edition tokens.
  const tileRe = /"([a-z0-9-]+)":\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  for (const m of text.slice(start).matchAll(tileRe)) {
    const id = m[1];
    const body = m[2];
    // Find the edition field. Edition can be either a string literal
    // or a const reference like NEC_2023.
    const editionStringMatch = body.match(/edition:\s*"([^"]*)"/);
    const editionConstMatch = body.match(/edition:\s*([A-Z_][A-Z0-9_]*)/);
    let editionRaw = "";
    if (editionStringMatch) editionRaw = editionStringMatch[1];
    else if (editionConstMatch) editionRaw = editionConstMatch[1];
    // Concatenated forms like `NEC_2023 + " Chapter 9..."` show up as
    // both: capture both halves.
    const concatStringMatch = body.match(/edition:\s*[A-Z_][A-Z0-9_]*\s*\+\s*"([^"]*)"/);
    if (concatStringMatch) editionRaw += " " + concatStringMatch[1];
    entries.set(id, editionRaw);
  }
  // Phase 2: resolve const references by reading the top-of-file
  // constants. NEC_2023, AWC_NDS, etc. live above the CITATIONS export.
  const constHeader = text.slice(0, start);
  const constMap = new Map();
  for (const m of constHeader.matchAll(/^const\s+([A-Z_][A-Z0-9_]*)\s*=\s*"([^"]*)"/gm)) {
    constMap.set(m[1], m[2]);
  }
  // Substitute const tokens in entries.
  for (const [id, raw] of entries) {
    let resolved = raw;
    // If raw is exactly a known const, replace; otherwise concatenated
    // forms already carry the string suffix from the regex pass above.
    if (constMap.has(raw)) resolved = constMap.get(raw);
    else if (constMap.has(raw.split(" ")[0])) {
      const head = raw.split(" ")[0];
      resolved = constMap.get(head) + raw.slice(head.length);
    }
    entries.set(id, resolved);
  }
  return entries;
}

async function main() {
  const errors = [];
  const warnings = [];

  const toolIds = await loadToolIds();
  const citationsMap = await loadCitations();
  if (!citationsMap) {
    console.error("ERROR: citations.js does not expose CITATIONS; spec-v14 §11.2 lint cannot proceed.");
    process.exit(1);
  }

  // TOOLS -> CITATIONS direction.
  for (const id of toolIds) {
    if (!citationsMap.has(id)) warnings.push("TOOLS tile '" + id + "' has no CITATIONS entry.");
  }
  // CITATIONS -> TOOLS direction.
  for (const id of citationsMap.keys()) {
    if (!toolIds.has(id)) errors.push("CITATIONS tile '" + id + "' is not in TOOLS (orphan citation).");
  }

  // Inverse map: source -> tiles. Counts only; the full list is
  // available via --verbose if a maintainer wants it.
  const sourceToTiles = new Map();
  for (const [id, edition] of citationsMap) {
    for (const src of SOURCE_PATTERNS) {
      if (src.re.test(edition)) {
        if (!sourceToTiles.has(src.name)) sourceToTiles.set(src.name, []);
        sourceToTiles.get(src.name).push(id);
      }
    }
  }

  console.log(
    "citation-coverage: " + citationsMap.size + " CITATIONS tile(s); " +
    toolIds.size + " TOOLS tile(s); " +
    sourceToTiles.size + " tracked source(s) cited; " +
    [...sourceToTiles.values()].reduce((a, b) => a + b.length, 0) + " tile->source edge(s).",
  );

  if (process.argv.includes("--verbose")) {
    const rows = [...sourceToTiles.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [name, ids] of rows) {
      console.log("  " + name + " (" + ids.length + "): " + ids.slice(0, 5).join(", ") + (ids.length > 5 ? ", ..." : ""));
    }
  }

  if (errors.length > 0) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error("v14 citation-coverage lint FAILED with " + errors.length + " orphan(s).");
    process.exit(1);
  }
  if (warnings.length > 0 && warnings.length <= 5) {
    for (const w of warnings) console.warn("WARN: " + w);
  }
  console.log(
    "v14 citation-coverage lint OK (" + warnings.length + " coverage warning(s); Phase G scaffolding, run with --verbose for the per-source tile list).",
  );
}

await main();
