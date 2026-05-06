#!/usr/bin/env node
// Verify SHA-256 hashes of every data shard against scripts/expected-hashes.json.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const expected = JSON.parse(await readFile(resolve(ROOT, "scripts/expected-hashes.json"), "utf8"));

let failed = false;

for (const [rel, want] of Object.entries(expected.hashes)) {
  const path = resolve(ROOT, "data", rel);
  let text;
  try {
    text = await readFile(path, "utf8");
  } catch {
    console.error("missing: data/" + rel);
    failed = true;
    continue;
  }
  const got = createHash("sha256").update(text).digest("hex");
  if (got !== want) {
    console.error("hash mismatch: data/" + rel);
    console.error("  expected " + want);
    console.error("  got      " + got);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log("verify-integrity: ok (" + Object.keys(expected.hashes).length + " entries)");
}
