// The leader-key shortcuts are described in three places, and docs/
// accessibility.md asserts outright that the three agree: "These match the
// live `SHORTCUTS` map in app.js and the `?` overlay."
//
//   1. `SHORTCUTS` in app.js -- what a keypress actually does.
//   2. The `?` overlay's entry list -- what the reader is told it does.
//   3. The bullet in docs/accessibility.md -- what a maintainer reads.
//
// Nothing compared them. Three copies of one table is how a shortcut gets
// added to the map and not the overlay, or points at a tile id that was
// renamed -- and a G-key that silently lands on the home view looks exactly
// like a key that was never pressed.
//
// A claim of agreement is a test waiting to be written, so: read all three,
// compare them, and check the two things the strings alone cannot say -- that
// every destination is a live tile, and that the label the overlay shows is
// that tile's own name. The second found one: the overlay said "Refrigerant
// P-T" for a tile called "Refrigerant P-T Chart".

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { TOOLS } from "../../tools-data.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP_JS = await readFile(resolve(ROOT, "app.js"), "utf8");
const DOC = await readFile(resolve(ROOT, "docs", "accessibility.md"), "utf8");

const NAME_BY_ID = new Map(TOOLS.map((t) => [t.id, t.name]));

// 1. The live map: `x: { type: "route", id: "some-tile" }` plus the two
//    non-route actions.
function readShortcutMap() {
  const block = /const SHORTCUTS = \{([\s\S]*?)\n\};/.exec(APP_JS);
  assert.ok(block, "could not find the SHORTCUTS map in app.js");
  const out = new Map();
  for (const m of block[1].matchAll(/^\s*([a-z]):\s*\{\s*type:\s*"([a-z]+)"(?:,\s*(?:id|target):\s*"([^"]+)")?/gm)) {
    out.set(m[1], { type: m[2], id: m[3] || null });
  }
  return out;
}

// 2. The overlay's own list of `["G X", "Label"]` pairs.
function readOverlayEntries() {
  const block = /const entries = \[([\s\S]*?)\n  \];/.exec(APP_JS);
  assert.ok(block, "could not find the shortcut overlay's entries list in app.js");
  return [...block[1].matchAll(/\["([^"]+)",\s*"((?:[^"\\]|\\.)*)"\]/g)].map((m) => [m[1], m[2]]);
}

// 3. The doc's bullet, as "G X Label" runs separated by commas.
function readDocPairs() {
  const line = /- Leader-key shortcuts \(G prefix\)[^\n]*/.exec(DOC);
  assert.ok(line, "could not find the leader-key bullet in docs/accessibility.md");
  const listed = /section 11\.4:\s*([^.]*?)\./.exec(line[0]);
  assert.ok(listed, "the leader-key bullet no longer lists its shortcuts before a full stop");
  return listed[1]
    .split(",")
    .map((s) => s.trim())
    .map((s) => {
      const m = /^G ([A-Z])\s+(.*)$/.exec(s);
      assert.ok(m, `leader-key bullet entry ${JSON.stringify(s)} is not "G <KEY> <Label>"`);
      return [m[1].toLowerCase(), m[2]];
    });
}

const MAP = readShortcutMap();
const OVERLAY = readOverlayEntries();
const DOC_PAIRS = readDocPairs();

// The overlay also documents "?" and "Esc", which are not leader keys.
const OVERLAY_LEADER = OVERLAY.filter(([k]) => /^G [A-Z]$/.test(k)).map(([k, label]) => [k.slice(2).toLowerCase(), label]);

test("every routing shortcut points at a live tile", () => {
  const dead = [];
  for (const [key, action] of MAP) {
    if (action.type !== "route") continue;
    if (!NAME_BY_ID.has(action.id)) dead.push([key, action.id]);
  }
  // A dead target is invisible: parseHashRoute falls back to the home view, so
  // the key looks like one that was never pressed.
  assert.deepEqual(dead, [], "G-keys routing to a tile id that is not in the catalog");
});

test("the overlay lists exactly the keys the map binds", () => {
  assert.deepEqual(OVERLAY_LEADER.map(([k]) => k).sort(), [...MAP.keys()].sort());
});

test("the overlay names each destination the way the catalog names it", () => {
  const wrong = [];
  for (const [key, label] of OVERLAY_LEADER) {
    const action = MAP.get(key);
    if (!action || action.type !== "route") continue;
    const real = NAME_BY_ID.get(action.id);
    if (label !== real) wrong.push([key, label, real]);
  }
  assert.deepEqual(wrong, [], "overlay labels that are not the tile's own name");
});

test("docs/accessibility.md lists the same keys and the same labels", () => {
  assert.deepEqual(
    DOC_PAIRS.map(([k]) => k).sort(),
    [...MAP.keys()].sort(),
    "the doc's leader-key list and the live SHORTCUTS map bind different keys",
  );
  const overlayLabel = new Map(OVERLAY_LEADER);
  const mismatched = DOC_PAIRS.filter(([k, label]) => overlayLabel.get(k) !== label);
  assert.deepEqual(mismatched, [], "doc labels that differ from what the overlay shows");
});
