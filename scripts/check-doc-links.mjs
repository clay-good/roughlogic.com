#!/usr/bin/env node
// Living-docs relative-link lint.
//
// Verifies that every relative markdown link in the LIVING docs -- README.md,
// ARCHITECTURE.md, docs/*.md, and mcp/README.md -- resolves to a file or
// directory that exists in the tree. This drift class has bitten twice: the
// spec-v107 trades-only cut left 16 dead links across four docs (fixed at
// 3b03cb5), and the throwaway auditor written for that sweep was never
// committed, so nothing has guarded the surface since.
//
// Deliberately EXCLUDED: CHANGELOG.md and specs/*.md. Both are append-only
// historical records; their entries keep links to files that later specs
// deliberately deleted (the 81 CHANGELOG refs and one spec-v11 ref to the
// spec-v107 cut modules stay as written, per the 2026-07-05 resync entry).
//
// External (http/https/mailto), pure-anchor (#...), and data: targets are
// skipped; a target's own #fragment is stripped before the existence check.
//
// Pure read-and-report; no network, no mutation.

import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const errors = [];

async function livingDocs() {
  const files = [];
  for (const f of ["README.md", "ARCHITECTURE.md", "mcp/README.md"]) {
    if (existsSync(resolve(ROOT, f))) files.push(f);
  }
  for (const f of await readdir(resolve(ROOT, "docs"))) {
    if (f.endsWith(".md")) files.push("docs/" + f);
  }
  return files;
}

// [text](target) and [text](target "title"); target has no whitespace.
const LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

async function main() {
  let checked = 0;
  const files = await livingDocs();
  for (const rel of files) {
    const text = await readFile(resolve(ROOT, rel), "utf8");
    const lineOf = (idx) => text.slice(0, idx).split("\n").length;
    for (const m of text.matchAll(LINK_RE)) {
      let target = m[1];
      if (/^(https?:|mailto:|#|data:)/.test(target)) continue;
      target = decodeURIComponent(target.split("#")[0]);
      if (!target) continue;
      checked += 1;
      const abs = resolve(ROOT, dirname(rel), target);
      if (!existsSync(abs)) {
        errors.push(
          rel + ":" + lineOf(m.index) + " broken relative link '" + m[1] + "'",
        );
      }
    }
  }
  if (errors.length > 0) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error(
      "check-doc-links FAILED: " +
        errors.length +
        " broken relative link(s) across " +
        files.length +
        " living docs.",
    );
    process.exit(1);
  }
  console.log(
    "check-doc-links OK: " +
      checked +
      " relative links across " +
      files.length +
      " living docs all resolve (CHANGELOG.md and specs/ excluded as append-only records).",
  );
}

main().catch((err) => {
  console.error("check-doc-links crashed:", err);
  process.exit(1);
});
