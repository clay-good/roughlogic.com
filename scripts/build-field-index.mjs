#!/usr/bin/env node
// spec-v1339: build the browser-readable field index.
//
// 1,330 of the catalog's 1,709 tiles carry a machine-readable descriptor for
// every input they render -- `render.schema.inputs` on the declarative
// renderers, and the statically-extracted BESPOKE_SCHEMAS for the
// hand-written ones. Between them that is 7,322 field descriptors: the key,
// the human label, the kind, and the select options. Nothing in the browser
// reads any of it today.
//
// The extractor in query-fill.js needs exactly that data to turn a typed
// question into filled inputs for the whole catalog instead of the 49 tiles
// data/search/slots.json covers by hand. It cannot import mcp/catalog.mjs --
// that is a node-only module that lazy-imports every calc-*.js in the repo --
// so this step projects the same descriptors into static JSON.
//
// SHARDED BY GROUP LETTER, reusing the convention data/search/aliases-<g>.json
// already established (spec-v590): the browser knows a tile's group from
// TOOLS before it wants that tile's fields, so it computes the shard name with
// no manifest fetch, and the shards it needs are the ones the service worker
// already pre-caches by the same pattern.
//
// Row shape is short-keyed because it is downloaded, not read:
//   d  the field key -- which in this catalog is ALSO the DOM id, so a filled
//      field and a hash-state param are the same string
//   l  the label lead: the human text with its trailing unit stripped
//   k  the kind: number | select | checkbox | text
//   u  the canonical unit the label declares, omitted when it declares none
//   o  the allowed values, select fields only
//
// A field with no label is omitted entirely. Those come from the 379 tiles
// that degrade to compute-parameter introspection, where the extractor would
// see `area_ft2` and no human text; matching on a machine key would be
// guessing, and this program refuses rather than guesses.
//
// Derived, never authoritative: the renderers remain the single source of
// truth and this file can be regenerated from them at any time.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "data", "fields");
const CHECK = process.argv.includes("--check");
const VERBOSE = process.argv.includes("--verbose");

// Per-shard gzip ceiling. A build failure, not a warning: the shards are
// fetched on a phone on a job site. If a group outgrows this, split that
// group's shard rather than raising the number.
const SHARD_GZIP_CAP = 24 * 1024;

// The manifest's edition/asOf stamp. A literal, not `new Date()`: a generated
// file whose contents change with the clock fails its own --check gate the
// next day. Bump it deliberately when the descriptor shape changes.
const EDITION_DATE = "2026-08-20";

const { describe } = await import(resolve(ROOT, "mcp", "catalog.mjs"));
const { TOOLS } = await import(resolve(ROOT, "tools-data.js"));
const { unitFromLabel, labelLead } = await import(resolve(ROOT, "field-units.js"));
const { bucketFor } = await import(resolve(ROOT, "field-bucket.js"));

const KINDS = new Set(["number", "select", "checkbox", "text", "textarea"]);

function rowFor(field) {
  if (!field || typeof field.key !== "string" || !field.key) return null;
  const label = typeof field.label === "string" ? field.label.trim() : "";
  if (!label) return null;                       // no human text -> not indexed
  const lead = labelLead(label);
  if (!lead) return null;
  const row = { d: field.key, l: lead };
  const kind = KINDS.has(field.kind) ? field.kind : null;
  if (kind) row.k = kind;
  const unit = unitFromLabel(label);
  if (unit) row.u = unit;
  if (kind === "select" && Array.isArray(field.options)) {
    const values = field.options
      .map((o) => (o && typeof o === "object" ? o.value : o))
      .filter((v) => v !== undefined && v !== null)
      .map(String);
    if (values.length) row.o = values;
  }
  return row;
}

const shards = new Map();   // group letter -> { tileId: [rows] }
let tilesIndexed = 0, fieldsIndexed = 0, fieldsSkipped = 0, tilesEmpty = 0;

for (const tool of TOOLS) {
  let described;
  try { described = await describe({ id: tool.id }); } catch { continue; }
  if (!Array.isArray(described.inputs)) continue;
  const rows = [];
  for (const field of described.inputs) {
    const row = rowFor(field);
    if (row) rows.push(row);
    else fieldsSkipped++;
  }
  if (!rows.length) { tilesEmpty++; continue; }
  // Two fields sharing a key would make a fill ambiguous at the DOM level.
  // The renderer contract forbids it; assert rather than assume.
  const keys = new Set();
  for (const r of rows) {
    if (keys.has(r.d)) {
      console.error(`build-field-index FAIL: ${tool.id} declares "${r.d}" twice.`);
      process.exit(1);
    }
    keys.add(r.d);
  }
  const g = bucketFor(tool.group, tool.id);
  if (!shards.has(g)) shards.set(g, {});
  shards.get(g)[tool.id] = rows;
  tilesIndexed++;
  fieldsIndexed += rows.length;
}

const written = [];
let drift = 0;
for (const [g, tiles] of [...shards].sort()) {
  const path = resolve(OUT_DIR, `${g}.json`);
  const text = JSON.stringify({ version: 1, bucket: g, tiles }) + "\n";
  const gz = gzipSync(Buffer.from(text)).length;
  if (gz > SHARD_GZIP_CAP) {
    console.error(
      `build-field-index FAIL: shard ${g}.json is ${(gz / 1024).toFixed(1)} KB gzip, ` +
      `over the ${SHARD_GZIP_CAP / 1024} KB cap. Raise this group's entry in SPLIT_GROUPS ` +
      `(field-bucket.js); do not raise the cap.`,
    );
    process.exit(1);
  }
  written.push({ g, tiles: Object.keys(tiles).length, gz });
  if (CHECK) {
    let existing = null;
    try { existing = await readFile(path, "utf8"); } catch { existing = null; }
    if (existing !== text) {
      console.error(`build-field-index FAIL: data/fields/${g}.json is stale. Run: node scripts/build-field-index.mjs`);
      drift++;
    }
  } else {
    await mkdir(OUT_DIR, { recursive: true });
    await writeFile(path, text, "utf8");
  }
}

// A shard for a group that no longer exists would be served forever.
if (!CHECK) {
  let present = [];
  try { present = await readdir(OUT_DIR); } catch { present = []; }
  const expected = new Set(written.map((w) => `${w.g}.json`));
  for (const name of present) {
    if (name === "manifest.json") continue;
    if (name.endsWith(".json") && !expected.has(name)) {
      console.error(`build-field-index FAIL: data/fields/${name} has no matching bucket. Delete it.`);
      process.exit(1);
    }
  }
}

// data/<folder>/manifest.json is required of every data folder by
// check-manifests (edition + asOf + a recorded hash per shard) and by
// check-sw-precache (the manifest must be named in sw.js DATA_MANIFESTS).
// Hashes are "pending", the same convention the generated alias shards use:
// a pinned hash on a derived file churns every time its source changes, and
// the drift gate below (--check) is what actually holds these honest.
const manifestPath = resolve(OUT_DIR, "manifest.json");
const manifestText = JSON.stringify({
  name: "fields",
  version: EDITION_DATE,
  fetched: EDITION_DATE,
  edition:
    "Original project-authored field descriptors, projected from the renderers' own " +
    "render.schema / BESPOKE_SCHEMAS declarations (spec-v1339). Derived data: the renderers " +
    "are authoritative and these shards regenerate from them. Not from any external standard.",
  asOf: EDITION_DATE,
  refresh_cadence: "on every catalog change (generated by scripts/build-field-index.mjs)",
  shards: written.map((w) => ({
    file: `${w.g}.json`,
    name: `Field descriptors, ${w.g} runtime shard (generated)`,
    gzip_size_bytes: w.gz,
  })),
  hashes: Object.fromEntries(written.map((w) => [`${w.g}.json`, "pending"])),
}, null, 2) + "\n";

if (CHECK) {
  let existing = null;
  try { existing = await readFile(manifestPath, "utf8"); } catch { existing = null; }
  if (existing !== manifestText) {
    console.error("build-field-index FAIL: data/fields/manifest.json is stale. Run: node scripts/build-field-index.mjs");
    drift++;
  }
} else {
  await writeFile(manifestPath, manifestText, "utf8");
}

if (drift) process.exit(1);

const totalGz = written.reduce((n, w) => n + w.gz, 0);
if (VERBOSE) {
  for (const w of written) {
    console.log(`  ${w.g}.json  ${String(w.tiles).padStart(4)} tiles  ${(w.gz / 1024).toFixed(1)} KB gzip`);
  }
}
console.log(
  `build-field-index: ${CHECK ? "clean" : "wrote"} ${written.length} shards, ` +
  `${tilesIndexed} tiles, ${fieldsIndexed} fields ` +
  `(${fieldsSkipped} unlabelled fields and ${tilesEmpty} tiles skipped), ` +
  `${(totalGz / 1024).toFixed(1)} KB gzip total, largest ${(Math.max(...written.map((w) => w.gz)) / 1024).toFixed(1)} KB.`,
);
