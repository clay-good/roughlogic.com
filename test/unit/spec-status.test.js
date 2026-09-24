import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { parseStatus, specTileIds, specStatusErrors } from "../../scripts/check-spec-status.mjs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..", "..");
const CATALOG = new Set(["rt-restricted-area", "haversine", "cable-tray-fill"]);

const spec = (status, id) => "# Spec\n\n> **Status: " + status + "**\n\n### 2.1 `" + id + "` -- A tile\n";
const errors = (text, built = false) => specStatusErrors(parseStatus(text), specTileIds(text), CATALOG, built);

test("the status span and heading ids are read", () => {
  const text = spec("LANDED 2026-09-09 (proposed 2026-09-05), built as `rt-restricted-area`. Single-tile spec.", "radiography-boundary");
  assert.equal(parseStatus(text).word, "LANDED");
  assert.match(parseStatus(text).span, /built as `rt-restricted-area`/);
  assert.deepEqual(specTileIds(text), ["radiography-boundary"]);
});

test("PROPOSED fails once its tile is in the catalog -- the shape 884 specs shipped in", () => {
  assert.equal(errors(spec("PROPOSED (2026-08-26). Single-tile spec.", "haversine")).length, 1);
  // A genuinely unbuilt spec passes.
  assert.deepEqual(errors(spec("PROPOSED (2026-09-30). Single-tile spec.", "not-built-yet")), []);
  // Built under another id: the calc module's `// spec-vN` comment gives it away.
  assert.equal(errors(spec("PROPOSED (2026-09-05). Single-tile spec.", "radiography-boundary"), true).length, 1);
});

test("LANDED under a different id must name the as-built id", () => {
  assert.equal(errors(spec("LANDED 2026-09-09 (proposed 2026-09-05).", "radiography-boundary")).length, 1);
  assert.deepEqual(errors(spec("LANDED 2026-09-09 (proposed 2026-09-05), built as `rt-restricted-area`.", "radiography-boundary")), []);
  // Naming an id that is not live does not count.
  assert.equal(errors(spec("LANDED 2026-09-09, built as `no-such-tile`.", "radiography-boundary")).length, 1);
});

test("CUT with a live id must disclose the collision", () => {
  assert.equal(errors(spec("CUT (2026-07-04, dupe of existing tile).", "cable-tray-fill")).length, 1);
  assert.deepEqual(errors(spec("CUT (2026-07-04): v421 cable-tray-fill is an EXACT id collision.", "cable-tray-fill")), []);
  assert.deepEqual(errors(spec("CUT 2026-08-26: a duplicate of `haversine`.", "great-circle-distance")), []);
});

test("a platform spec names no tile ids and is not read", () => {
  assert.deepEqual(errors("# Spec\n\n> **Status: PROPOSED (2026-07-31). Platform spec.**\n\n## 2. Wiring\n"), []);
});

test("the gate passes on the tree as committed", () => {
  const out = execFileSync("node", ["scripts/check-spec-status.mjs"], { cwd: ROOT, encoding: "utf8" });
  assert.match(out, /check-spec-status OK/);
});
