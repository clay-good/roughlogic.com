#!/usr/bin/env node
// Fuzzy code-text duplicate detector per spec section 13.
//
// Scans project text files (markdown, html, css, js, mjs, json, txt) for
// 25-word n-grams whose SHA-256 matches an entry in a private hash list
// of known NEC / IPC / IRC / IECC / IFC / IBC / ASHRAE / ACCA / NFPA / AWC
// code-text spans. The hash list is intentionally kept off the public
// repo (gitignored); maintainers compute hashes from their own reference
// copy and never commit the underlying text.
//
// If scripts/banned-ngrams.json is not present (the default in the public
// repo) the check skips with a clear message and exits 0. CI environments
// that have the list mounted at the expected path will run the full scan.
//
// "Fuzzy" here is bounded by whitespace-normalized lowercase tokenization.
// Reordered or paraphrased spans do not match by design; the goal is to
// catch verbatim or near-verbatim reproduction of licensed code text, not
// general inspiration. Maintainers can lower the n-gram size with the
// NGRAM_SIZE environment variable for stricter checks.

import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, relative, extname } from "node:path";
import { createHash } from "node:crypto";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const LIST_PATH = process.env.NGRAM_LIST || resolve(ROOT, "scripts", "banned-ngrams.json");
const NGRAM_SIZE = Number(process.env.NGRAM_SIZE) || 25;

if (!existsSync(LIST_PATH)) {
  console.log(
    "check-ngrams: " + relative(ROOT, LIST_PATH) + " not present; skipping. " +
    "Build a private hash list of code-text spans (see scripts/banned-ngrams.example.json) " +
    "and place it at the path above to run the full check in CI."
  );
  process.exit(0);
}

let banned;
try {
  const raw = JSON.parse(await readFile(LIST_PATH, "utf8"));
  if (!raw || !Array.isArray(raw.hashes)) {
    console.error("check-ngrams: invalid hash list format; expected { hashes: [string, ...] }");
    process.exit(1);
  }
  banned = new Set(raw.hashes);
} catch (e) {
  console.error("check-ngrams: failed to read hash list: " + e.message);
  process.exit(1);
}

if (banned.size === 0) {
  console.log("check-ngrams: hash list is empty; nothing to scan against. ok");
  process.exit(0);
}

const SCAN_EXT = new Set([".md", ".html", ".css", ".js", ".mjs", ".json", ".txt"]);
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".cache", "test"]);
const SKIP_FILES = new Set([
  "scripts/check-ngrams.mjs",
  "scripts/banned-ngrams.json",
  "scripts/banned-ngrams.example.json",
  "scripts/expected-hashes.json",
  "data/integrity.json",
]);

let failed = false;
let scanned = 0;

async function walk(dir) {
  for (const name of await readdir(dir)) {
    if (SKIP_DIRS.has(name) || name.startsWith(".")) continue;
    const p = resolve(dir, name);
    const st = await stat(p);
    if (st.isDirectory()) {
      await walk(p);
    } else if (SCAN_EXT.has(extname(name))) {
      const rel = relative(ROOT, p);
      if (SKIP_FILES.has(rel)) continue;
      await scanFile(p, rel);
    }
  }
}

async function scanFile(abs, rel) {
  const text = await readFile(abs, "utf8");
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length < NGRAM_SIZE) return;
  scanned++;
  for (let i = 0; i + NGRAM_SIZE <= tokens.length; i++) {
    const span = tokens.slice(i, i + NGRAM_SIZE).join(" ");
    const h = createHash("sha256").update(span).digest("hex");
    if (banned.has(h)) {
      console.error(
        "check-ngrams: " + rel + ": 25-word span starting at token " + i +
        " hashes to a banned code-text fingerprint. Rephrase or remove."
      );
      failed = true;
    }
  }
}

await walk(ROOT);

if (failed) process.exit(1);
console.log("check-ngrams: ok (" + scanned + " files scanned against " + banned.size + " fingerprints)");
