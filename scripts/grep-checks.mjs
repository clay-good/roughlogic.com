#!/usr/bin/env node
// CI grep check. Fails on:
//   - innerHTML, outerHTML, insertAdjacentHTML, eval, new Function in source files
//   - emoji codepoints in source files
//   - em-dashes (U+2014) in source files
// Scans index.html, styles.css, every shipped root-level client *.js (every
// calc-*.js and loose module, discovered dynamically), curated scripts/*.mjs,
// docs/*.md, README.md, and CHANGELOG.md.

import { readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");

const TARGETS = [
  "index.html",
  "styles.css",
  "app.js",
  "tools-data.js",
  "sw.js",
  "manual-j-worker.js",
  "pure-math.js",
  "routing.js",
  "hash-state.js",
  "data-stamp.js",
  "clipboard.js",
  "ui-fields.js",
  "ui-validity.js",
  "integrity.js",
  "changelog.js",
  "calc-electrical.js",
  "calc-plumbing.js",
  "calc-hvac.js",
  "calc-restoration.js",
  "calc-construction.js",
  "calc-fire.js",
  "calc-cross.js",
  "calc-references.js",
  "theme.js",
  "README.md",
  "CHANGELOG.md",
  "specs/spec.md",
  "docs/architecture.md",
  "docs/data-sources.md",
  "docs/legal.md",
  "docs/derivations.md",
  "docs/accessibility.md",
  "docs/threat-model.md",
  "docs/performance.md",
  "docs/deployment.md",
  "docs/launch-checklist.md",
  "scripts/grep-checks.mjs",
  "scripts/build.mjs",
  "scripts/build-data.mjs",
  "scripts/check-ngrams.mjs",
  "scripts/check-home-payload.mjs",
  "scripts/dev.mjs",
  "scripts/verify-integrity.mjs",
  "scripts/analyze-data-changes.mjs",
  "scripts/check-wiring.mjs",
];

// Every shipped root-level client module is also scanned. The list above was
// hand-curated and fell behind as the catalog grew (it named only the original
// 8 calc-*.js modules while the repo reached 24, plus loose modules like
// limitation-banner.js, citations.js, and tile-meta.js), so the no-em-dash /
// no-emoji / no-innerHTML invariants went silently unenforced on 16 calc
// modules. Derive the rest dynamically so a new calc-<group>.js (or any new
// root module) is auto-covered without a checker edit. Test/config files live
// under test/ and scripts/, not the repo root, so every root *.js is a shipped
// client module.
for (const f of readdirSync(ROOT)) {
  if (/\.js$/.test(f) && !/\.(test|config)\.js$/.test(f) && !TARGETS.includes(f)) {
    TARGETS.push(f);
  }
}

// Match real DOM usage; documentation mentions of these names are allowed.
const FORBIDDEN_TOKENS = [
  { re: /\.innerHTML\s*[=+]/, name: ".innerHTML assignment" },
  { re: /\.outerHTML\s*[=+]/, name: ".outerHTML assignment" },
  { re: /\.insertAdjacentHTML\s*\(/, name: "insertAdjacentHTML(" },
  { re: /(^|[^.\w])eval\s*\(/, name: "eval(" },
  { re: /\bnew\s+Function\s*\(/, name: "new Function(" },
];

// Files where forbidden-token checks are skipped (documentation that names them).
const TOKEN_CHECK_SKIP = new Set([
  "specs/spec.md",
  "docs/threat-model.md",
  "docs/accessibility.md",
  "docs/legal.md",
  "scripts/grep-checks.mjs",
  // CHANGELOG legitimately describes the parity-audit invariants by
  // name (".innerHTML setter", "eval(", "new Function(") when
  // documenting batches that add the gates.
  "CHANGELOG.md",
]);

// Emoji codepoint ranges (broad, conservative).
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{2700}-\u{27BF}]/u;

const EM_DASH = String.fromCodePoint(0x2014);

let failed = false;

function report(file, line, msg) {
  console.error(file + ":" + line + ": " + msg);
  failed = true;
}

for (const rel of TARGETS) {
  let text;
  try {
    text = await readFile(resolve(ROOT, rel), "utf8");
  } catch {
    continue;
  }
  // Skip forbidden-token checks in files that legitimately name those APIs.
  const isChecker = TOKEN_CHECK_SKIP.has(rel);
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    if (!isChecker) {
      for (const t of FORBIDDEN_TOKENS) {
        if (t.re.test(line)) report(rel, lineNum, "forbidden token: " + t.name);
      }
    }
    if (EMOJI_RE.test(line)) report(rel, lineNum, "emoji codepoint detected");
    if (line.includes(EM_DASH)) report(rel, lineNum, "em-dash (U+2014) detected; use a hyphen or rephrase");
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log("grep-checks: ok");
}
