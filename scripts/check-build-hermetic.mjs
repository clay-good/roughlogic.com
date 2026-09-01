#!/usr/bin/env node
// The build does not talk to the internet.
//
// Every value in data/ is transcribed into an in-tree constant by a
// maintainer, reviewed in a diff, and emitted deterministically by
// scripts/build-data.mjs. Nothing in the build or the lint chain fetches a
// published source at build time. That is a stronger position than fetching
// would be, and the reason is the threat model's T2: a constant that lives in
// the repository is auditable in a pull request forever, while a value pulled
// from a URL during a build is whatever that URL served that morning, with no
// record of what it said the morning before.
//
// The README claimed the opposite until 2026-09-01 -- "build-data.mjs
// refreshes the integrity-hashed data shards from NIST, NOAA, NCEI WMM, FHFA,
// HUD" -- against a script with no network call in it at all. Nothing was
// watching either the claim or the property, so a single `await fetch(...)`
// added to the data pipeline would have made the site's data depend on a live
// upstream without anyone noticing.
//
// A script that genuinely must reach the network declares it on the line
// above the call:
//
//     // NETWORK: <why this one call is allowed to leave the machine>
//     const r = await fetch(url);
//
// The marker sits beside the call rather than in an allowlist in this file,
// because an allowlist entry outlives the reason it was written for and the
// person reading the call is the one who needs the reason.
//
// Standalone Node 20 script using only built-ins. Reads sources; runs nothing.

import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// A call that leaves the process. `child_process` is not here: the build
// shells out to node and to git, and neither reaches the network.
const CALL = /\b(?:await\s+)?(?:fetch|https?\.(?:get|request))\s*\(/;
// A target that never leaves the machine.
const LOCAL = /localhost|127\.0\.0\.1|\[::1\]|\bBASE\b|\bPORT\b|\bORIGIN\b/;
const MARKER = /^\s*\/\/\s*NETWORK:\s*\S/;

function scan(text, file) {
  const lines = text.split("\n");
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!CALL.test(line)) continue;
    if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) continue;
    if (LOCAL.test(line)) continue;
    // A declared call: the reason sits in the comment block directly above it,
    // so a multi-line explanation is fine as long as nothing but comment lines
    // separate the marker from the call.
    let declared = false;
    for (let j = i - 1; j >= 0; j--) {
      const above = lines[j].trimStart();
      if (MARKER.test(lines[j])) { declared = true; break; }
      if (!above.startsWith("//")) break;
    }
    if (declared) continue;
    findings.push(`${file}:${i + 1}: ${line.trim().slice(0, 90)}`);
  }
  return findings;
}

async function main() {
  const dirs = ["scripts", "mcp"];
  const errors = [];
  let scanned = 0;
  let declared = 0;
  for (const d of dirs) {
    for (const f of (await readdir(resolve(ROOT, d))).sort()) {
      if (!f.endsWith(".mjs") && !f.endsWith(".js")) continue;
      const text = await readFile(resolve(ROOT, d, f), "utf8");
      scanned += 1;
      declared += (text.match(/^\s*\/\/\s*NETWORK:/gm) || []).length;
      errors.push(...scan(text, `${d}/${f}`));
    }
  }

  if (errors.length) {
    console.error(`check-build-hermetic: ${errors.length} undeclared network call(s).`);
    for (const e of errors) console.error("  - " + e);
    console.error(
      "  The build and the data pipeline do not fetch published sources; every value in data/ is\n" +
      "  an in-tree constant, reviewable in a diff. If a call genuinely must leave the machine, put\n" +
      "  `// NETWORK: <why>` on the line above it so the next reader sees the reason at the call."
    );
    process.exit(1);
  }
  console.log(
    `check-build-hermetic OK: ${scanned} build and agent script(s) scanned; no undeclared network call ` +
    `(${declared} declared, the rest local-only). data/ is built from in-tree constants, not fetched.`
  );
}

await main();
