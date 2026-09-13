// Node 20+ recursively discovers test files when it receives a directory. Keep
// the unit-test entry point shell-independent: macOS ships Bash 3, where the
// previous `shopt -s globstar` wrapper printed an error before running tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("unit-test scripts use Node's recursive directory discovery", async () => {
  const pkg = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));

  assert.equal(pkg.scripts.test, "node --test test/unit");
  assert.equal(pkg.scripts["test:unit"], pkg.scripts.test);
});
