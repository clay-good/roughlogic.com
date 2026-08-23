import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..", "..");
const read = (file) => readFile(resolve(ROOT, file), "utf8");

test("dev server is loopback-only and serves the built public tree", async () => {
  const source = await read("scripts/dev.mjs");
  assert.match(source, /const ROOT = resolve\([^\n]+"dist"\)/);
  assert.match(source, /const HOST = "127\.0\.0\.1"/);
  assert.match(source, /headers\.host/);
  assert.match(source, /421/);
  assert.match(source, /lstat\(file\)/);
  assert.match(source, /realpath\(file\)/);
  assert.match(source, /relative\(ROOT, file\)/);
  assert.match(source, /\.listen\(PORT, HOST/);
});

test("build refuses symbolic links and special files", async () => {
  const source = await read("scripts/build.mjs");
  assert.match(source, /lstat\(s\)/);
  assert.match(source, /isSymbolicLink\(\)/);
  assert.match(source, /refusing symbolic link in public source/);
  assert.match(source, /required public source must be a regular file/);
});

test("all environment and Wrangler local-secret filename variants are ignored", async () => {
  const ignore = await read(".gitignore");
  assert.match(ignore, /^\.env\*$/m);
  assert.match(ignore, /^\.dev\.vars\*$/m);
  assert.match(ignore, /^!\.env\.example$/m);
  const gate = await read("scripts/check-secret-files.mjs");
  assert.match(gate, /git", \["ls-files", "-z"\]/);
  assert.match(gate, /privateKeyExtensions/);
});

test("CI actions are SHA-pinned with least-privilege checkout", async () => {
  for (const file of [
    ".github/workflows/ci.yml",
    ".github/workflows/data-refresh.yml",
    ".github/workflows/data-refresh-weekly.yml",
  ]) {
    const workflow = await read(file);
    for (const line of workflow.split("\n").filter((value) => /^\s*uses:/.test(value))) {
      assert.match(line, /@[0-9a-f]{40}(?:\s+#|$)/, `${file}: mutable action reference: ${line.trim()}`);
    }
    assert.match(workflow, /persist-credentials:\s*false/);
  }
  const ci = await read(".github/workflows/ci.yml");
  assert.match(ci, /permissions:\s*\n\s*contents:\s*read/);
  assert.doesNotMatch(ci, /@latest|npm install -g|npm install --no-save/);
  assert.doesNotMatch(ci, /LHCI_GITHUB_APP_TOKEN|@lhci\/cli/);
});
