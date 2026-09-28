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

test("tile ids are read from numeric and lettered historical headings", () => {
  assert.deepEqual(specTileIds("### 2.1 `haversine` -- Tile\n### G.2 Center of gravity (`cable-tray-fill`)\n"), ["haversine", "cable-tray-fill"]);
});

test("legacy status formats are normalized instead of skipped", () => {
  assert.equal(parseStatus("> **Implementation status: CLOSED 2026-06-13.**").word, "LANDED");
  assert.equal(parseStatus("> **Implementation status: DRAFT 2026-06-09.**").word, "PROPOSED");
  assert.equal(parseStatus("> Status: **SHIPPED (2026-08-20).**").word, "LANDED");
  assert.equal(parseStatus("# Spec with no status"), null);
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

test("LANDED cannot use incidental live ids or one alias to hide missing tiles", () => {
  assert.equal(errors(spec("LANDED, related to `haversine`.", "radiography-boundary")).length, 1);
  const multiple = spec("LANDED, built as `rt-restricted-area`.", "radiography-boundary")
    + "\n### 2.2 `another-missing-tile` -- Another tile\n";
  assert.equal(errors(multiple).length, 1);
  const mapped = spec("LANDED: `radiography-boundary` built as `rt-restricted-area`; `another-missing-tile` built as `haversine`.", "radiography-boundary")
    + "\n### 2.2 `another-missing-tile` -- Another tile\n";
  assert.deepEqual(errors(mapped), []);
});

test("a built platform spec cannot remain proposed", () => {
  assert.equal(specStatusErrors(parseStatus("> **Status: PROPOSED.**"), [], CATALOG, true).length, 1);
});

test("LANDED can account for calculators retired by a later spec", () => {
  const status = parseStatus("> **Status: LANDED; later cut by `spec-v107`: `retired-one`, `retired-two`.**");
  assert.deepEqual(specStatusErrors(status, ["retired-one", "retired-two"], CATALOG), []);
  assert.equal(specStatusErrors(status, ["retired-one", "unaccounted"], CATALOG).length, 1);
});
