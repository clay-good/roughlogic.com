#!/usr/bin/env node
// spec-v12 Phase G.2: wiring-correctness lint.
//
// Walks the static + dynamic import graph rooted at the runtime entry
// modules (app.js, theme.js, integrity.js, routing.js, sw.js, plus the
// top-level *.js files referenced from index.html) and asserts every
// import target is:
//
//   1. Present on disk.
//   2. Enumerated in scripts/build.mjs FILES (so the production dist/
//      copy ships the file).
//   3. Enumerated in sw.js SHELL_ASSETS (so the service worker
//      pre-caches the file).
//
// This generalizes the build-time guard added 2026-05-12 after the
// v5-platform.js miss (commit 47d90df) where v5-platform.js was
// imported by calc-accounting.js / calc-legal.js / calc-lab.js,
// listed in sw.js, but absent from build.mjs FILES. A fresh
// Cloudflare deploy with no SW cache would have 404'd every v5
// accounting / legal / lab tile.
//
// Failure cases that the lint surfaces:
//
//   - file imported but missing from disk
//   - top-level .js imported by a runtime module but missing from FILES
//   - top-level .js shipped via FILES but missing from SHELL_ASSETS
//     (so the SW pre-cache is incomplete; first offline visit fails)
//   - top-level .js in SHELL_ASSETS but missing from FILES (the SW
//     pre-cache references a file that dist/ does not ship)
//
// Standalone Node 20 script using only built-ins. No network, no deps.
// Runs as part of `npm run lint` and `npm run audit`.

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");

let failed = false;
function fail(msg) {
  console.error("check-wiring: " + msg);
  failed = true;
}

// Extract a string-array literal from a source file. Returns the
// array entries with leading "./" stripped (so we get bare file names).
async function readStringArray(rel, varName) {
  const text = await readFile(resolve(ROOT, rel), "utf8");
  const re = new RegExp("const\\s+" + varName + "\\s*=\\s*\\[([\\s\\S]*?)\\];");
  const m = text.match(re);
  if (!m) {
    fail("could not parse " + varName + " from " + rel);
    return new Set();
  }
  const entries = [...m[1].matchAll(/"([^"]+)"/g)].map((mm) => mm[1].replace(/^\.\//, ""));
  return new Set(entries);
}

// Find every static + dynamic import of a relative .js file in src.
// Returns the set of bare file names (e.g. "calc-hvac.js").
function importTargets(src) {
  const targets = new Set();
  // Static: import ... from "./<path>.js"
  for (const m of src.matchAll(/from\s+["']\.\/([a-zA-Z0-9_./-]+\.js)["']/g)) {
    targets.add(basename(m[1]));
  }
  // Dynamic: import("./<path>.js")
  for (const m of src.matchAll(/\bimport\(\s*["']\.\/([a-zA-Z0-9_./-]+\.js)["']\s*\)/g)) {
    targets.add(basename(m[1]));
  }
  return targets;
}

// Files that live at the repo root but are intentionally NOT runtime
// entry points (so we do not crawl them for missing-FILES violations).
// build-time scripts under scripts/ are excluded by the directory
// filter; this list covers top-level files that look like JS but are
// not part of the dist/ ship.
const NON_RUNTIME = new Set([
  "package.json", "package-lock.json",
  "wrangler.jsonc", "lighthouserc.json",
]);

async function main() {
  const buildFiles = await readStringArray("scripts/build.mjs", "FILES");
  const shellAssets = await readStringArray("sw.js", "SHELL_ASSETS");

  // Walk the repo root and collect every *.js file. The runtime modules
  // (the things app.js / theme.js / index.html boot from) are exactly
  // these; the build-time scripts live in scripts/ and are not crawled.
  const allJs = new Set();
  for (const name of await readdir(ROOT)) {
    if (NON_RUNTIME.has(name) || name.startsWith(".")) continue;
    if (!name.endsWith(".js")) continue;
    allJs.add(name);
  }

  // Build the import graph: for each top-level .js, collect its imports.
  // Resolve every import target against disk; flag anything missing.
  const importedByRuntime = new Set();
  for (const file of allJs) {
    let src;
    try {
      src = await readFile(resolve(ROOT, file), "utf8");
    } catch (e) {
      fail("could not read " + file + ": " + e.message);
      continue;
    }
    for (const target of importTargets(src)) {
      importedByRuntime.add(target);
      if (!existsSync(resolve(ROOT, target))) {
        fail(file + " imports ./" + target + " which does not exist on disk");
      }
    }
  }

  // Index.html may boot scripts directly via <script src="./x.js"> tags
  // (theme.js currently ships this way for the no-flash theme paint).
  // Pull those in so we do not falsely flag theme.js as unimported.
  try {
    const html = await readFile(resolve(ROOT, "index.html"), "utf8");
    for (const m of html.matchAll(/<script[^>]*\bsrc\s*=\s*["']\.?\/?([a-zA-Z0-9_./-]+\.js)["']/g)) {
      importedByRuntime.add(basename(m[1]));
    }
  } catch { /* index.html missing in some sandboxes */ }

  // Rule 1: every runtime-imported .js MUST be in FILES so dist/ ships
  // it. This is the lint that would have caught v5-platform.js.
  for (const target of importedByRuntime) {
    if (!allJs.has(target)) continue; // not a top-level file; skip
    if (!buildFiles.has(target)) {
      fail("runtime imports " + target + " but scripts/build.mjs FILES omits it (dist/ will not ship it)");
    }
  }

  // Rule 2: every runtime-imported .js MUST be in SHELL_ASSETS so the
  // service worker pre-caches it. Without this, the first offline visit
  // fails for any tile that depends on the un-pre-cached module.
  for (const target of importedByRuntime) {
    if (!allJs.has(target)) continue;
    if (!shellAssets.has(target)) {
      fail("runtime imports " + target + " but sw.js SHELL_ASSETS omits it (offline first-visit will fail)");
    }
  }

  // Rule 3: FILES and SHELL_ASSETS must agree on JS files. A JS in
  // SHELL_ASSETS but absent from FILES means the SW references a path
  // that dist/ never produces. The reverse (in FILES but not SHELL_ASSETS)
  // is allowed for sw.js itself (a service worker cannot cache itself),
  // robots.txt, sitemap.xml, _headers, build-info.json, and the like.
  for (const target of shellAssets) {
    if (!target.endsWith(".js")) continue;
    if (!buildFiles.has(target)) {
      fail("sw.js SHELL_ASSETS references " + target + " but scripts/build.mjs FILES omits it");
    }
  }
  // Allow-list of FILES entries that legitimately do not appear in
  // SHELL_ASSETS (the SW does not cache itself; robots/sitemap are
  // crawler hints, not runtime needs; build-info.json is patched
  // at build time and re-fetched fresh, not cached).
  const SHELL_EXEMPT = new Set(["sw.js", "robots.txt", "sitemap.xml"]);
  for (const target of buildFiles) {
    if (!target.endsWith(".js")) continue;
    if (SHELL_EXEMPT.has(target)) continue;
    if (!shellAssets.has(target)) {
      fail("scripts/build.mjs FILES contains " + target + " but sw.js SHELL_ASSETS omits it (offline first-visit will fail)");
    }
  }

  // Rule 4 (spec-v12 §G.4): renderer-export cross-check. For every
  // declare("./calc-X.js", "X_RENDERERS", [tile_ids...]) in app.js,
  // verify the target module exports a renderer registry named
  // X_RENDERERS and that every listed tile_id appears as a key in
  // that registry. The pre-G.4 enforcement was the renderer-wiring
  // tests under test/unit/v8-renderer-wiring*.test.js; G.4 promotes
  // it to a build-time assertion so a renamed export is caught at
  // lint time, not at run-the-tile time.
  let rendererPairsChecked = 0;
  let rendererTileIdsChecked = 0;
  try {
    const appJs = await readFile(resolve(ROOT, "app.js"), "utf8");
    // Match: declare("./calc-foo.js", "FOO_RENDERERS", [ "tile-a", "tile-b", ... ])
    const declareRe = /declare\(\s*["']\.\/([a-zA-Z0-9_./-]+\.js)["']\s*,\s*["']([A-Z][A-Z0-9_]*)["']\s*,\s*\[([\s\S]*?)\]\s*\)/g;
    for (const m of appJs.matchAll(declareRe)) {
      const modulePath = m[1];
      const exportName = m[2];
      const tileIds = [...m[3].matchAll(/"([a-z0-9-]+)"/g)].map((mm) => mm[1]);
      const targetSrc = await readFile(resolve(ROOT, modulePath), "utf8").catch(() => null);
      if (targetSrc === null) {
        fail("app.js declare() references " + modulePath + " which does not exist on disk");
        continue;
      }
      rendererPairsChecked++;
      // Verify the export exists. Either:
      //   export const NAME = { ... }
      //   export const NAME = (...)
      //   export { ..., NAME, ... }
      const exportRe = new RegExp(
        "(export\\s+const\\s+" + exportName + "\\b)" +
        "|(export\\s*\\{[^}]*\\b" + exportName + "\\b[^}]*\\})"
      );
      if (!exportRe.test(targetSrc)) {
        fail(modulePath + " does not export " + exportName +
          " (referenced by app.js declare(\"./" + modulePath + "\", \"" + exportName + "\", ...))");
        continue;
      }
      // Extract the registry-literal body and the post-hoc assignment
      // forms. The expected shapes are:
      //   export const NAME = { "tile-id": fn, ... };
      //   NAME["tile-id"] = fn;     // post-hoc assignment (v8 pattern)
      const registryRe = new RegExp(
        "export\\s+const\\s+" + exportName + "\\s*=\\s*\\{([\\s\\S]*?)\\};"
      );
      const reg = targetSrc.match(registryRe);
      const registryBody = reg ? reg[1] : "";
      const assignRe = new RegExp(
        "\\b" + exportName + "\\[[\"']([a-z0-9-]+)[\"']\\]\\s*=",
        "g"
      );
      const assignedTileIds = new Set();
      for (const am of targetSrc.matchAll(assignRe)) assignedTileIds.add(am[1]);
      for (const tileId of tileIds) {
        rendererTileIdsChecked++;
        const keyRe = new RegExp("[\"']" + tileId.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "[\"']\\s*:");
        const inLiteral = keyRe.test(registryBody);
        const inAssign = assignedTileIds.has(tileId);
        if (!inLiteral && !inAssign) {
          fail(modulePath + " " + exportName + " is missing a renderer entry for tile_id \"" + tileId + "\" (not in object literal and not in post-hoc " + exportName + "[\"" + tileId + "\"] = ... assignment)");
        }
      }
    }
  } catch (e) {
    fail("renderer-export cross-check (G.4) failed: " + e.message);
  }

  if (failed) {
    console.error("");
    console.error("check-wiring: at least one wiring-correctness violation. fix the above and re-run.");
    process.exit(1);
  }
  console.log("v12 wiring lint OK (" + allJs.size + " top-level .js files; " +
    importedByRuntime.size + " runtime imports; FILES " + buildFiles.size +
    " entries; SHELL_ASSETS " + shellAssets.size + " entries; " +
    rendererPairsChecked + " renderer modules; " +
    rendererTileIdsChecked + " tile-id renderer entries verified [G.4]).");
}

await main();
