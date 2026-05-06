#!/usr/bin/env node
// Analyze data shard changes between the previous (in git) and current
// state of data/. Produces a Markdown summary suitable for a pull-request
// body. Used by .github/workflows/data-refresh.yml after build-data.mjs.
//
// Standalone Node 20 script using only built-ins. No network, no deps.
//
// Output format:
//   # Data refresh summary
//   _Generated <date>_
//
//   ## physical-constants/constants.json
//   - Status: changed
//   - Old hash: ...
//   - New hash: ...
//   - 2 entries modified, 0 added, 0 removed
//   - Modified entries: c (value), p_atm (value, unit)
//
// On stdout. Caller redirects into PR body.

import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const DATA = resolve(ROOT, "data");

function git(...args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

function sha(s) { return createHash("sha256").update(s).digest("hex").slice(0, 12); }

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

async function readCurrent(rel) {
  try { return await readFile(resolve(DATA, rel), "utf8"); }
  catch { return null; }
}

function readPrevious(rel) {
  // Read the file from HEAD via git show. Returns null if the file did not exist.
  const text = git("show", `HEAD:data/${rel}`);
  return text;
}

function listShards(manifestText) {
  const m = safeJson(manifestText);
  if (!m || !Array.isArray(m.shards)) return [];
  return m.shards.map((s) => s.file);
}

// Drill-down layers recognized by the analyzer. v1 layers were named in
// MATERIAL_PROPERTIES / STATE_TAX_RATES / REFRIGERANTS / SUMMARIES. v2
// adds shards with their own dictionary roots (charge per foot,
// equivalent lengths, soil bearing, wind/snow zones, GSA per-diem,
// thermal expansion, lighting density, GFCI/AFCI references).
const DRILL_LAYER_KEYS = [
  // v1
  "values", "rates", "refrigerants", "summaries",
  // v2
  "oz_per_ft", "feet_by_fitting_and_diameter", "k_btu_in_per_hr_ft2_F",
  "loading_per_CFM_hour_grams", "allowable_psf", "basic_wind_speeds_mph",
  "ground_snow_loads_psf", "rates_by_state", "gfci_afci_by_area",
  "benchmark_W_per_ft2", "alpha_per_F", "fixtures", "gases", "zones",
  "species_grades", "mixes", "thresholds", "materials", "table",
];

function pickKeys(obj) {
  if (!obj || typeof obj !== "object") return [];
  for (const k of DRILL_LAYER_KEYS) {
    if (obj[k] && typeof obj[k] === "object") return Object.keys(obj[k]);
  }
  return Object.keys(obj);
}

function compareEntries(prev, curr) {
  const pv = prev && typeof prev === "object" ? prev : {};
  const cv = curr && typeof curr === "object" ? curr : {};
  // Drill into the same recognized layer if present on both sides.
  const layer = (o) => {
    if (!o) return o;
    for (const k of DRILL_LAYER_KEYS) {
      if (o[k] && typeof o[k] === "object") return o[k];
    }
    return o;
  };
  const a = layer(pv) || {};
  const b = layer(cv) || {};
  const keysA = new Set(Object.keys(a || {}));
  const keysB = new Set(Object.keys(b || {}));
  const added = [...keysB].filter((k) => !keysA.has(k));
  const removed = [...keysA].filter((k) => !keysB.has(k));
  const modified = [];
  for (const k of keysA) {
    if (!keysB.has(k)) continue;
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) modified.push(k);
  }
  return { added, removed, modified };
}

const FOLDERS = [
  "physical-constants", "electrical", "plumbing", "hvac", "restoration",
  "construction", "fire", "crosswalks", "summaries",
];

const out = [];
out.push("# Data refresh summary");
out.push("");
out.push(`_Generated ${new Date().toISOString().slice(0, 10)}_`);
out.push("");

let anyChanges = false;

for (const folder of FOLDERS) {
  const manifestRel = `${folder}/manifest.json`;
  const currManifest = await readCurrent(manifestRel);
  const prevManifest = readPrevious(manifestRel);

  if (!currManifest && !prevManifest) continue;
  if (currManifest && !prevManifest) {
    anyChanges = true;
    out.push(`## ${folder}/`);
    out.push("");
    out.push("- Status: **new dataset**");
    const shards = listShards(currManifest);
    out.push(`- Shards: ${shards.join(", ") || "(none)"}`);
    out.push("");
    continue;
  }
  if (!currManifest && prevManifest) {
    anyChanges = true;
    out.push(`## ${folder}/`);
    out.push("");
    out.push("- Status: **removed**");
    out.push("");
    continue;
  }

  const currShards = listShards(currManifest);
  const prevShards = listShards(prevManifest);
  const added = currShards.filter((s) => !prevShards.includes(s));
  const removed = prevShards.filter((s) => !currShards.includes(s));
  const common = currShards.filter((s) => prevShards.includes(s));

  let folderChanges = [];

  for (const shard of common) {
    const rel = `${folder}/${shard}`;
    const curr = await readCurrent(rel);
    const prev = readPrevious(rel);
    if (curr === prev) continue;
    folderChanges.push({ shard, prev, curr, status: "changed" });
  }
  for (const shard of added) {
    const rel = `${folder}/${shard}`;
    const curr = await readCurrent(rel);
    folderChanges.push({ shard, prev: null, curr, status: "added" });
  }
  for (const shard of removed) {
    const rel = `${folder}/${shard}`;
    const prev = readPrevious(rel);
    folderChanges.push({ shard, prev, curr: null, status: "removed" });
  }

  if (folderChanges.length === 0) continue;

  anyChanges = true;
  out.push(`## ${folder}/`);
  out.push("");

  for (const c of folderChanges) {
    out.push(`### ${c.shard}`);
    out.push("");
    out.push(`- Status: ${c.status}`);
    if (c.status === "changed") {
      out.push(`- Old hash: \`${sha(c.prev || "")}\``);
      out.push(`- New hash: \`${sha(c.curr || "")}\``);
      const diff = compareEntries(safeJson(c.prev), safeJson(c.curr));
      out.push(`- ${diff.modified.length} modified, ${diff.added.length} added, ${diff.removed.length} removed`);
      if (diff.modified.length > 0) out.push(`- Modified: ${diff.modified.slice(0, 12).join(", ")}${diff.modified.length > 12 ? ", ..." : ""}`);
      if (diff.added.length > 0) out.push(`- Added: ${diff.added.slice(0, 12).join(", ")}${diff.added.length > 12 ? ", ..." : ""}`);
      if (diff.removed.length > 0) out.push(`- Removed: ${diff.removed.slice(0, 12).join(", ")}${diff.removed.length > 12 ? ", ..." : ""}`);
    } else if (c.status === "added") {
      out.push(`- New hash: \`${sha(c.curr || "")}\``);
      const j = safeJson(c.curr);
      const keys = pickKeys(j);
      if (keys.length > 0) out.push(`- Top-level entries: ${keys.slice(0, 12).join(", ")}${keys.length > 12 ? ", ..." : ""}`);
    } else if (c.status === "removed") {
      out.push(`- Old hash: \`${sha(c.prev || "")}\``);
    }
    out.push("");
  }
}

if (!anyChanges) {
  out.push("No data changes since the previous build.");
  out.push("");
}

out.push("## Notes");
out.push("");
out.push("- Physical constants change rarely; any modification should be cross-checked against the NIST reference.");
out.push("- Refrigerant P-T data updates require the manufacturer attribution to remain accurate.");
out.push("- NOAA climate data updates monthly; deltas in design temperatures are expected.");
out.push("- State sales tax rate changes should be cross-checked against each state revenue department's published rate.");

process.stdout.write(out.join("\n"));
