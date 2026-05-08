// Spec.md section 6 invariant: shipped service worker has a build-hash-keyed
// cache name. The build pipeline patches BUILD_HASH in dist/sw.js so each
// release evicts the prior shell cache. This test asserts the patch matches
// the YYYYMMDDTHHMMSS shape (15 chars) and that the source sw.js retains
// the dev placeholder.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..", "..");

test("source sw.js retains the dev BUILD_HASH placeholder", async () => {
  const text = await readFile(resolve(ROOT, "sw.js"), "utf8");
  // Source uses dev-* so local-dev caching works without a build step.
  assert.match(text, /const\s+BUILD_HASH\s*=\s*"dev-[^"]*";/);
});

test("dist/sw.js (when present) has a build-hash-keyed BUILD_HASH", async () => {
  const distSw = resolve(ROOT, "dist", "sw.js");
  if (!existsSync(distSw)) {
    // dist/ may not exist in CI before a build step; skip gracefully.
    return;
  }
  const text = await readFile(distSw, "utf8");
  // Built output should be ISO 8601 basic format YYYYMMDDTHHMMSS (15 chars),
  // i.e. 8 digits + T + 6 digits, no hyphens or colons.
  const m = text.match(/const\s+BUILD_HASH\s*=\s*"([^"]+)";/);
  assert.ok(m, "dist/sw.js must declare BUILD_HASH");
  const hash = m[1];
  // Must not still be the placeholder.
  assert.ok(!hash.startsWith("dev-"), "dist/sw.js must have its dev placeholder replaced");
  // Must match the 15-char ISO basic format.
  assert.match(hash, /^\d{8}T\d{6}$/, "dist/sw.js BUILD_HASH must match YYYYMMDDTHHMMSS");
});

test("dist/sw.js cache names include the build hash", async () => {
  const distSw = resolve(ROOT, "dist", "sw.js");
  if (!existsSync(distSw)) return;
  const text = await readFile(distSw, "utf8");
  assert.match(text, /SHELL_CACHE\s*=\s*"roughlogic-shell-"\s*\+\s*BUILD_HASH/);
  assert.match(text, /DATA_CACHE\s*=\s*"roughlogic-data-"\s*\+\s*BUILD_HASH/);
});
