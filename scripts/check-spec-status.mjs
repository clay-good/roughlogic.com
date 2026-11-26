#!/usr/bin/env node
// A spec's Status line must agree with the catalog.
//
// Newer specs open with `> **Status: PROPOSED (date). ...**`, and landing a
// tile did not always touch that line. On 2026-09-24, 884 of the 1,787 specs still
// read PROPOSED although every one of them had shipped -- so the direct
// question "which specs are left to build?" answered 884 when the answer was
// zero. Thirteen of those had shipped under a different id than the spec
// named (`radiography-boundary` is `rt-restricted-area`), and five had been
// cut as duplicates in a scope doc, so neither the spec's id nor its status
// told a reader what happened.
//
// The rules, for a spec whose section headings name its tiles (`### 2.1 \`id\``):
//   PROPOSED  fails when every named id is in the catalog, or when a calc
//             module carries a `// spec-vN:` section header or comment for it
//             (a tile built under another id, or a cut noted in the code).
//             Mark it LANDED or CUT.
//   LANDED    fails when a named id is missing from the catalog, unless the
//             status explicitly resolves one missing id with "built as `x`".
//   PROPOSED or BLOCKED, on a platform spec that names no tile, fails when a
//             test under test/ cites the spec as `spec-vN:` -- the test is
//             holding behavior the status says does not exist yet.
//   CUT       fails when a named id IS in the catalog, unless the status names
//             it (an exact id collision with an older tile, disclosed).
// Older specs use `Implementation status` or `Status: **SHIPPED**`. Those
// forms are normalized too, and every numbered spec must have a recognized
// status so a historical spelling cannot silently fall out of the tally.
// Platform specs name no tile ids, so only their status coverage is checked.
//
// Pure read-and-report; no network, no mutation.

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { argv } from "node:process";
import { fileURLToPath } from "node:url";
import { assertFullCatalogParse } from "./catalog-size.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The whole leading blockquote the status lives in -- the bold span plus the
// `>` lines that continue it, which is what a reader reads as "the status".
// A CUT-as-duplicate spec often names its replacement in those continuation
// lines rather than inside the bold part (2026-11-24).
function statusBlock(text, at) {
  const lines = text.slice(at).split("\n");
  const out = [];
  for (const l of lines) {
    if (out.length && !/^>/.test(l)) break;
    out.push(l);
  }
  return out.join("\n");
}

// The status word and the whole bold status span, which may wrap lines.
export function parseStatus(text) {
  const canonical = text.match(/\*\*Status:\s*([A-Z]+)[\s\S]*?\*\*/);
  if (canonical) return { word: canonical[1], span: canonical[0], block: statusBlock(text, canonical.index) };

  const alternate = text.match(/^>\s*Status:\s*\*\*([A-Z]+)[\s\S]*?\*\*/m);
  if (alternate) return { word: normalizeLegacyStatus(alternate[1]), span: alternate[0] };

  const implementation = text.match(/^>\s*\*\*Implementation status[\s\S]*?\*\*/mi);
  if (!implementation) return null;
  const upper = implementation[0].toUpperCase();
  const legacy = ["LANDED", "CLOSED", "COMPLETE", "SHIPPED", "IMPLEMENTED", "CUT", "DRAFT", "PLANNED", "PROPOSED"]
    .find((state) => new RegExp("\\b" + state + "\\b").test(upper));
  return legacy ? { word: normalizeLegacyStatus(legacy), span: implementation[0] } : null;
}

function normalizeLegacyStatus(word) {
  if (["LANDED", "CLOSED", "COMPLETE", "SHIPPED", "IMPLEMENTED"].includes(word)) return "LANDED";
  if (["DRAFT", "PLANNED"].includes(word)) return "PROPOSED";
  return word;
}

// Tile ids named by the spec's own section headings.
export function specTileIds(text) {
  return [...text.matchAll(/^#{2,4}\s+[A-Z0-9]+(?:\.[A-Z0-9]+)*\s+.*?(?:\(`([a-z0-9-]+)`\)|`([a-z0-9-]+)`)/gm)]
    .map((m) => m[1] || m[2]);
}

const names = (span, id) => new RegExp("(^|[^a-z0-9-])" + id + "($|[^a-z0-9-])").test(span);

// Errors for one spec. `catalog` is a Set of live tile ids; `built` is true
// when a calc module carries this spec's section header.
export function specStatusErrors({ word, span, block }, ids, catalog, built = false, tested = false) {
  const live = ids.filter((id) => catalog.has(id));
  const missing = ids.filter((id) => !catalog.has(id));
  if (ids.length === 0) {
    if (word === "PROPOSED" && built) return ["says PROPOSED but a calc module names it in a `// spec-vN` comment; mark it LANDED or CUT"];
    // A platform spec names no tile, so the catalog cannot say whether it
    // shipped. A test that cites it can: spec-v1347 read BLOCKED BY DESIGN for
    // seven weeks after its change landed, while search-prefill.test.js
    // asserted the result under a `spec-v1347:` comment.
    if ((word === "PROPOSED" || word === "BLOCKED") && tested) return ["says " + word + " but a test under test/ cites it as `spec-vN:`; if the change shipped, mark it LANDED"];
    return [];
  }
  if (word === "PROPOSED") {
    if (missing.length === 0) return ["says PROPOSED but " + live.map((i) => "`" + i + "`").join(", ") + " is in the catalog; mark it LANDED"];
    if (built) return ["says PROPOSED but a calc module names it in a `// spec-vN` comment; mark it LANDED (\"built as `id`\") or CUT"];
    return [];
  }
  if (word === "LANDED") {
    const genericAlias = missing.length === 1
      && [...span.matchAll(/\bbuilt\s+as\s+(?:>\s*)?`([a-z0-9-]+)`/g)].some((m) => catalog.has(m[1]));
    const mapped = missing.filter((id) => {
      const match = new RegExp("`" + id + "`\\s+built\\s+as\\s+(?:>\\s*)?`([a-z0-9-]+)`").exec(span);
      return match && catalog.has(match[1]);
    });
    const laterCut = /\blater cut by `spec-v\d+`/.test(span)
      && missing.every((id) => names(span, id));
    const missingResolved = genericAlias || mapped.length === missing.length || laterCut;
    return missing.length > 0 && !missingResolved
      ? ["says LANDED but " + missing.map((i) => "`" + i + "`").join(", ") + " is not in the catalog; name each as-built id (\"`old-id` built as `live-id`\")"]
      : [];
  }
  if (word === "CUT") {
    const undisclosed = live.filter((id) => !names(span, id));
    if (undisclosed.length > 0) {
      return ["says CUT but " + undisclosed.map((i) => "`" + i + "`").join(", ") + " is in the catalog; name the collision in the status"];
    }
    // A spec cut as a DUPLICATE is a claim that the work is already done
    // elsewhere, and the claim is only checkable if it names the live tile
    // that does it -- in backticks, so a tool can read it. Four such specs
    // named their replacement in plain prose (`flood-cut-quantity`,
    // `ev-charger-load`, `pv-interconnection-busbar` and six others), so
    // nothing could tell the claim from a dead pointer; if one of those tiles
    // were ever retired, the spec would go on asserting a capability the
    // catalog had lost (2026-11-24). A cut for any other reason -- superseded,
    // a design never executed -- is exempt, since there is no replacement to
    // name.
    // Only where the work landed under a DIFFERENT id. When one of the spec's
    // own ids is itself live, the collision rule above has already made the
    // spec name it, and the live tile IS the replacement.
    const duplicate = live.length === 0
      && /\b(duplicate|dupe|duplicates|overlapping|overlaps|collision|covered by)\b/i.test(span);
    const namesLive = [...String(block || span).matchAll(/`([a-z0-9][a-z0-9-]*)`/g)].some((m) => catalog.has(m[1]));
    return duplicate && !namesLive
      ? ["says CUT as a duplicate but names no live tile in backticks; name the tile that already computes it, e.g. \"a duplicate of `live-id`\""]
      : [];
  }
  return [];
}

async function main() {
  const catalog = new Set([...readFileSync(join(ROOT, "tools-data.js"), "utf8").matchAll(/\{ id: "([a-z0-9-]+)"/g)].map((m) => m[1]));
  // This was the one text-parser of tools-data.js that did not assert its own
  // reach, while catalog-size.mjs's header said "Every such parser asserts
  // here". The pattern above wants `{ id: "` with exactly one space: `{id:`,
  // `{  id:` and `{ id:"` are each missed, so a tile formatted any of those
  // ways would drop out of `catalog` -- and this gate's whole output is a
  // comparison against it. A spec whose tile had vanished from the set would
  // read as a status disagreement, or worse, a CUT spec whose tile is actually
  // live would read as agreeing. It parses all 2,288 today; this keeps that
  // true rather than assuming it.
  await assertFullCatalogParse(catalog.size, "check-spec-status");
  const headers = new Set();
  for (const name of readdirSync(ROOT)) {
    if (!/^calc-.*\.js$/.test(name)) continue;
    for (const m of readFileSync(join(ROOT, name), "utf8").matchAll(/^\/\/[ =]*spec-v(\d+)[:\s]/gm)) headers.add(m[1]);
  }
  // Specs a test cites by number in a comment or a test title.
  const tested = new Set();
  for (const dir of ["unit", "integration"]) {
    for (const name of readdirSync(join(ROOT, "test", dir))) {
      if (!name.endsWith(".js")) continue;
      for (const m of readFileSync(join(ROOT, "test", dir, name), "utf8").matchAll(/\bspec-v(\d+)\s*[:(]/g)) tested.add(m[1]);
    }
  }
  const errors = [];
  const tally = {};
  const specs = readdirSync(join(ROOT, "specs")).filter((n) => /^spec-v\d+\.md$/.test(n));
  for (const name of specs) {
    const text = readFileSync(join(ROOT, "specs", name), "utf8");
    const status = parseStatus(text);
    if (!status) {
      errors.push("specs/" + name + ": has no recognized Status or Implementation status line");
      continue;
    }
    tally[status.word] = (tally[status.word] || 0) + 1;
    const v = /\d+/.exec(name)[0];
    for (const e of specStatusErrors(status, specTileIds(text), catalog, headers.has(v), tested.has(v))) errors.push("specs/" + name + ": " + e);
  }
  // EVERY LANDED SPEC IS ANCHORED TO SOMETHING.
  //
  // The rules above check that a spec's STATUS agrees with the catalog, which
  // is a different question from whether anything in the tree points back at
  // the spec. A tile spec is anchored by its own ids being live. A platform
  // spec has no tile, so its only anchors are a `// spec-vN` module header or a
  // test citing it -- and three had neither: spec-v1851 (the homepage search
  // snippet), spec-v1852 (explicit landed-spec aliases) and spec-v1853
  // (complete spec-status coverage). All three were genuinely implemented, and
  // the last two specify the rules in THIS FILE, so the specs governing this
  // gate were the ones it could not see. Each is cited now at the assertion
  // that holds it, and this keeps that true: a platform spec cannot be marked
  // LANDED with nothing in the tree naming it.
  //
  // The anchor is computed over CODE AND TESTS, not prose: a doc mentioning a
  // spec says someone wrote about it, not that it shipped. `headers` above
  // reads only calc-*.js and `tested` only test/, which between them miss a
  // platform spec implemented in mcp/ or scripts/ -- scoring that as unanchored
  // reported 51 where the true figure is one.
  const namedInTree = new Set();
  const noteSpecs = (file) => {
    let src = "";
    try { src = readFileSync(file, "utf8"); } catch { return; }
    for (const m of src.matchAll(/spec-v(\d+)\b/g)) namedInTree.add(m[1]);
  };
  for (const name of readdirSync(ROOT)) if (/\.(?:js|mjs)$/.test(name)) noteSpecs(join(ROOT, name));
  for (const dir of ["mcp", "scripts", "test/unit", "test/integration", "test/fixtures"]) {
    let names = [];
    try { names = readdirSync(join(ROOT, dir)); } catch { continue; }
    for (const name of names) if (/\.(?:js|mjs|json)$/.test(name)) noteSpecs(join(ROOT, dir, name));
  }

  const unanchored = [];
  for (const name of specs) {
    const text = readFileSync(join(ROOT, "specs", name), "utf8");
    const status = parseStatus(text);
    if (!status || status.word !== "LANDED") continue;
    const v = /\d+/.exec(name)[0];
    if (specTileIds(text).some((id) => catalog.has(id))) continue;
    if (headers.has(v) || tested.has(v) || namedInTree.has(v)) continue;
    unanchored.push(name);
  }
  for (const name of unanchored) {
    errors.push(
      "specs/" + name + ": says LANDED but nothing in the tree names it -- no live tile id of its own, "
      + "no `// spec-vN` header in a calc module, and no test citing it as `spec-vN:`. Cite it where the "
      + "behaviour is held, or correct the status.");
  }

  // A PROGRAM CHARTER CANNOT CLAIM WORK THAT IS DONE.
  //
  // specs/scope-*.md are the "what are we building" surface: each names a range
  // of numbered specs and carries its own status. This gate globs only
  // `spec-v\d+.md`, so it never read them -- and on 2026-11-26 three were stale
  // after their programs closed. scope-trade-expansion said PROPOSED with 95
  // LANDED and 5 CUT behind it; scope-trade-expansion-3 said ACTIVE with "33 of
  // 101 tiles wired" against 101 LANDED; and scope-trade-expansion-2 said
  // IN PROGRESS on the line directly above a line reading "COMPLETE. All 38
  // bands have landed" -- the body was updated when the bands shipped and the
  // status field was not. Between them they told a reader 468 tiles were still
  // to come. So: a charter whose whole range is terminal must say so.
  for (const name of readdirSync(join(ROOT, "specs"))) {
    if (!/^scope-.*\.md$/.test(name)) continue;
    const text = readFileSync(join(ROOT, "specs", name), "utf8");
    const declared = /Status:\s*\*{0,2}([A-Z][A-Z ]*)/.exec(text);
    if (!declared) continue;
    const word = declared[1].trim().split(" ")[0];
    if (["COMPLETE", "LANDED", "CLOSED", "CUT", "ADOPTED"].includes(word)) continue;
    // The range the charter names, e.g. "specs v1350-v1449".
    const range = /specs?\s+v(\d+)\s*[-\u2013]\s*v(\d+)/i.exec(text);
    if (!range) continue;
    const [lo, hi] = [Number(range[1]), Number(range[2])];
    let open = 0, total = 0;
    for (let v = lo; v <= hi; v++) {
      let spec;
      try { spec = readFileSync(join(ROOT, "specs", "spec-v" + v + ".md"), "utf8"); } catch { continue; }
      total += 1;
      const st = parseStatus(spec);
      if (!st || !["LANDED", "CUT"].includes(st.word)) open += 1;
    }
    if (total > 0 && open === 0) {
      errors.push(
        "specs/" + name + ": says " + word + " but all " + total + " specs in v" + lo + "-v" + hi
        + " are LANDED or CUT. A charter is how a reader learns what is left to build; mark it COMPLETE.");
    }
  }

  if (errors.length > 0) {
    for (const e of errors.slice(0, 25)) console.error("ERROR: " + e);
    if (errors.length > 25) console.error("ERROR: ... and " + (errors.length - 25) + " more.");
    console.error(
      "check-spec-status FAILED: " + errors.length + " spec(s) whose Status line disagrees with the catalog.\n" +
        "A spec's status is how a reader learns what is left to build; update it when the tile lands or is cut.",
    );
    process.exit(1);
  }
  const summary = Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([w, n]) => n + " " + w).join(", ");
  console.log("check-spec-status OK: " + specs.length + " specs; statuses agree with the catalog (" + summary + ").");
}

if (resolve(argv[1] || "") === fileURLToPath(import.meta.url)) await main();
