#!/usr/bin/env node
// spec-v12 Phase H.3: per-source last-diff append-only log.
//
// After scripts/build-data.mjs regenerates data/ and after
// analyze-data-changes.mjs has summarized what changed, this script
// appends a dated stanza to the `## Last-diff log` section of
// scripts/sources.md. One line per shard with the date + a one-
// sentence summary of what changed (or "no change" if the SHA-256
// matched the previous commit).
//
// Behavior:
//   - Reads the in-repo state of every data/<folder>/*.json shard.
//   - Reads the on-disk state of the same shard (after refresh).
//   - For each shard, computes whether the SHA-256 changed vs HEAD;
//     if changed, records a one-sentence summary derived from the
//     analyze-data-changes JSON output (counts of added / removed /
//     modified entries).
//   - Appends one stanza per refresh run under `## Last-diff log` at
//     the end of scripts/sources.md. Stanza header is the run date;
//     within the stanza, one bullet per shard.
//   - Idempotent: re-running on the same date and same shard state
//     replaces the latest stanza rather than appending a duplicate.
//
// Wired into .github/workflows/data-refresh.yml (monthly) and
// data-refresh-weekly.yml (weekly) per spec-v12 §H.3.
//
// Standalone Node 20 script using only built-ins. No network, no deps.
//
// Usage:
//   node scripts/append-source-diff-log.mjs [--dry-run] [--date YYYY-MM-DD]

import { readFile, writeFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const DATA = resolve(ROOT, "data");
const SOURCES = resolve(ROOT, "scripts", "sources.md");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dateIdx = args.indexOf("--date");
const today = dateIdx >= 0 && args[dateIdx + 1]
  ? args[dateIdx + 1]
  : new Date().toISOString().slice(0, 10);

function git(...gitArgs) {
  try {
    return execFileSync("git", gitArgs, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

function sha(s) { return createHash("sha256").update(s).digest("hex"); }

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

// Walk data/ and collect every *.json shard (skip per-folder manifest
// and the integrity index; those are derived).
async function allShards() {
  const out = [];
  for (const entry of await readdir(DATA, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const sub = resolve(DATA, entry.name);
    for (const file of await readdir(sub, { withFileTypes: true })) {
      if (file.isFile() && file.name.endsWith(".json")
          && file.name !== "manifest.json"
          && file.name !== "integrity.json") {
        out.push(entry.name + "/" + file.name);
      } else if (file.isDirectory()) {
        // One level of nesting (e.g. data/field/wmm/coefficients.json,
        // data/historical/commodities/*.json).
        const deep = resolve(sub, file.name);
        for (const inner of await readdir(deep)) {
          if (inner.endsWith(".json") && inner !== "manifest.json") {
            out.push(entry.name + "/" + file.name + "/" + inner);
          }
        }
      }
    }
  }
  out.sort();
  return out;
}

function oneLineSummary(rel, oldText, newText) {
  if (oldText === null) return "added (new shard)";
  if (newText === null) return "removed (shard deleted)";
  if (oldText === newText) return "no change";
  const oldJ = safeJson(oldText);
  const newJ = safeJson(newText);
  if (!oldJ || !newJ) return "content changed (non-JSON or unparsable)";
  // Heuristic per-shape diff.
  if (Array.isArray(oldJ) && Array.isArray(newJ)) {
    const dlen = newJ.length - oldJ.length;
    if (dlen === 0) return newJ.length + " entries; values updated";
    return Math.abs(dlen) + " entr" + (Math.abs(dlen) === 1 ? "y" : "ies") + " " + (dlen > 0 ? "added" : "removed") + "; net " + newJ.length;
  }
  if (typeof oldJ === "object" && typeof newJ === "object") {
    const oldKeys = new Set(Object.keys(oldJ));
    const newKeys = new Set(Object.keys(newJ));
    const added = [...newKeys].filter((k) => !oldKeys.has(k));
    const removed = [...oldKeys].filter((k) => !newKeys.has(k));
    const common = [...newKeys].filter((k) => oldKeys.has(k));
    let modified = 0;
    for (const k of common) {
      if (JSON.stringify(oldJ[k]) !== JSON.stringify(newJ[k])) modified++;
    }
    const parts = [];
    if (added.length) parts.push(added.length + " key" + (added.length === 1 ? "" : "s") + " added");
    if (removed.length) parts.push(removed.length + " key" + (removed.length === 1 ? "" : "s") + " removed");
    if (modified) parts.push(modified + " key" + (modified === 1 ? "" : "s") + " modified");
    if (parts.length === 0) return "content changed (key reorder or whitespace)";
    return parts.join("; ");
  }
  return "content changed";
}

async function readOnDisk(rel) {
  const path = resolve(DATA, rel);
  if (!existsSync(path)) return null;
  return await readFile(path, "utf8");
}

function readFromHead(rel) {
  return git("show", "HEAD:data/" + rel);
}

const SECTION_HEADER = "## Last-diff log";

async function main() {
  const shards = await allShards();
  const lines = [];
  let changedCount = 0;
  for (const rel of shards) {
    const oldText = readFromHead(rel);
    const newText = await readOnDisk(rel);
    const oldH = oldText === null ? null : sha(oldText).slice(0, 12);
    const newH = newText === null ? null : sha(newText).slice(0, 12);
    const summary = oneLineSummary(rel, oldText, newText);
    if (summary !== "no change") changedCount++;
    lines.push("- `" + rel + "` (" + (oldH || "-") + " -> " + (newH || "-") + "): " + summary);
  }
  const stanza = [
    "### " + today,
    "",
    "- run: data-refresh (build-data.mjs + integrity verify)",
    "- shards inspected: " + shards.length,
    "- shards changed: " + changedCount,
    "",
    ...lines,
    "",
  ].join("\n");

  let existing;
  try {
    existing = await readFile(SOURCES, "utf8");
  } catch {
    console.error("append-source-diff-log: scripts/sources.md not found at " + SOURCES);
    process.exit(1);
  }
  let next;
  if (existing.includes(SECTION_HEADER)) {
    // Insert / replace per-date stanza beneath the section header.
    // If a stanza for `today` already exists, replace it; otherwise
    // append after the section header.
    const lines = existing.split("\n");
    const headerIdx = lines.findIndex((l) => l.trim() === SECTION_HEADER);
    // Find the start of the existing stanza for `today` (if any).
    const existingHdr = "### " + today;
    let startIdx = -1, endIdx = -1;
    for (let i = headerIdx + 1; i < lines.length; i++) {
      if (lines[i].trim() === existingHdr) {
        startIdx = i;
        // Find next "### " line or EOF.
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].startsWith("### ")) { endIdx = j; break; }
        }
        if (endIdx === -1) endIdx = lines.length;
        break;
      }
    }
    if (startIdx >= 0) {
      // Replace existing stanza for today.
      const before = lines.slice(0, startIdx).join("\n");
      const after = lines.slice(endIdx).join("\n");
      next = before + (before.endsWith("\n") ? "" : "\n") + stanza + (after.startsWith("\n") ? "" : "\n") + after;
    } else {
      // Insert new stanza immediately after the section header.
      const before = lines.slice(0, headerIdx + 1).join("\n") + "\n\n";
      const after = lines.slice(headerIdx + 1).join("\n");
      next = before + stanza + (after.startsWith("\n") ? "" : "\n") + after;
    }
  } else {
    // Append new section at end.
    const trailer = existing.endsWith("\n") ? "" : "\n";
    next = existing + trailer + "\n" + SECTION_HEADER + "\n\n" +
      "Appended after each `data:refresh` CI run per spec-v12 §H.3. One stanza per run date with one bullet per shard (old-hash -> new-hash + one-sentence summary; `no change` when SHA-256 matched the previous commit).\n\n" +
      stanza;
  }
  if (dryRun) {
    process.stdout.write(stanza);
    console.error("append-source-diff-log: dry-run; would write " + lines.length + " line(s) to " + SOURCES + " under " + SECTION_HEADER);
    return;
  }
  await writeFile(SOURCES, next, "utf8");
  console.log("append-source-diff-log: wrote " + lines.length + " bullet(s) for " + today + " (" + changedCount + " shards changed).");
}

await main();
