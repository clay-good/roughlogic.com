#!/usr/bin/env node
// spec-v12 §H follow-up: SW precache inverse-direction lint.
//
// Walks the data/ tree and the repo-root calc-*.js set, then asserts
// that every per-folder data/<folder>/manifest.json is named in sw.js's
// DATA_MANIFESTS list and every shipped calc-*.js / support-lib .js
// shipped via scripts/build.mjs FILES is named in sw.js's SHELL_ASSETS
// list.
//
// This closes the omission class the 2026-05-18 sw.js fix surfaced
// (the v12 data/realestate/ folder was wired into the runtime
// integrity check and into the build's FILES list, but the per-folder
// manifest line in DATA_MANIFESTS was missed - so a user who installed
// the SW before ever opening an X.* tile online, then went offline,
// would hit a network-fetch failure on the realestate manifest at
// startup and trip a spurious integrity banner).
//
// The v12 §G.3 check-dist.mjs lint walks the opposite direction
// (precache entries -> dist files) so it could not catch this class.
// This script is the missing inverse: data/ folder set -> precache
// list, and FILES -> SHELL_ASSETS.
//
// Standalone Node 20 script using only built-ins. No network, no deps.
// Wired into `npm run lint` and through to `npm run audit`.

import { readFile, readdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { existsSync } from "node:fs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const SW_PATH = resolve(ROOT, "sw.js");
const DATA_DIR = resolve(ROOT, "data");
const BUILD_PATH = resolve(ROOT, "scripts", "build.mjs");

if (!existsSync(SW_PATH)) {
  console.error("check-sw-precache: sw.js not found at " + SW_PATH);
  process.exit(1);
}

let failed = false;
function fail(msg) {
  console.error("check-sw-precache: " + msg);
  failed = true;
}

// Extract a single `const NAME = [ ... ];` string-literal array from a
// JS source file. Returns the array of strings (raw values, no quotes).
function extractStringArray(source, name) {
  const re = new RegExp("const\\s+" + name + "\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*;");
  const m = source.match(re);
  if (!m) return null;
  const body = m[1];
  const items = [];
  for (const lm of body.matchAll(/["']([^"']+)["']/g)) {
    items.push(lm[1]);
  }
  return items;
}

async function main() {
  const swSource = await readFile(SW_PATH, "utf8");

  const SHELL_ASSETS = extractStringArray(swSource, "SHELL_ASSETS");
  if (!SHELL_ASSETS) {
    fail("could not extract SHELL_ASSETS array from sw.js");
    process.exit(1);
  }
  const DATA_MANIFESTS = extractStringArray(swSource, "DATA_MANIFESTS");
  if (!DATA_MANIFESTS) {
    fail("could not extract DATA_MANIFESTS array from sw.js");
    process.exit(1);
  }

  // --- 1. DATA_MANIFESTS check: every data/<folder>/manifest.json must
  // appear in the precache list. (Allow folders that ship no manifest.)
  const shellSet = new Set(SHELL_ASSETS);
  const dataSet = new Set(DATA_MANIFESTS);

  const folders = (await readdir(DATA_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  let dataChecked = 0;
  for (const folder of folders) {
    const manifestPath = resolve(DATA_DIR, folder, "manifest.json");
    if (!existsSync(manifestPath)) continue;
    dataChecked++;
    const expected = "./data/" + folder + "/manifest.json";
    if (!dataSet.has(expected)) {
      fail(
        "data/" + folder + "/manifest.json exists on disk but is not in sw.js DATA_MANIFESTS; " +
        "add \"" + expected + "\" so the manifest pre-caches at SW install time and offline " +
        "integrity check finds it.",
      );
    }
  }

  // The inverse direction (DATA_MANIFESTS entries pointing to a missing
  // folder) is already covered by check-dist.mjs G.3, which fails if a
  // precache path is not present in dist/. Skip the redundant check.

  // --- 2. SHELL_ASSETS check: every calc-*.js named in scripts/build.mjs
  // FILES must appear in the precache list. Other support libs in FILES
  // (theme.js / app.js / integrity.js / routing.js etc.) must also be
  // there - those are the home-view entry shards. The build script is
  // the source of truth for what ships at runtime.
  let buildSource = "";
  if (existsSync(BUILD_PATH)) {
    buildSource = await readFile(BUILD_PATH, "utf8");
  }
  const FILES = extractStringArray(buildSource, "FILES") || [];
  let shellChecked = 0;
  for (const file of FILES) {
    // Only check shipped .js files in the repo root (the SW precaches
    // .js modules, not _headers / robots.txt / sitemap.xml etc.; those
    // are not part of the offline shell the cache is built around).
    if (!/\.(?:js|mjs)$/.test(file)) continue;
    if (file.includes("/")) continue;
    // sw.js does not precache itself - the SW registration in app.js
    // fetches sw.js directly from the network, not from the SW cache.
    if (file === "sw.js") continue;
    shellChecked++;
    const expected = "./" + file;
    if (!shellSet.has(expected)) {
      fail(
        file + " is in scripts/build.mjs FILES and ships in dist/ but is not in sw.js " +
        "SHELL_ASSETS; add \"" + expected + "\" so the module pre-caches at SW install time " +
        "and the offline shell stays complete.",
      );
    }
  }

  // Some data files are precached ONE FILE AT A TIME rather than behind a
  // per-folder manifest, so the check above cannot see them -- and their file
  // sets are not fixed. A shard appears the first time a group letter has
  // something to put in it, which is exactly how data/fields/q.json arrived
  // unlisted: captioning one field on a group nothing else covered created a
  // file, and that group's tiles would have fetched over the network on an
  // offline install.
  //
  // Each entry below is a directory plus the filename pattern sw.js lists from
  // it. The pattern matters: data/search also holds `aliases.json`, the merged
  // master that the build and the MCP server read and the browser never
  // fetches, so requiring every file in that directory would be wrong.
  const SHARDED = [
    { dir: "fields", label: "data/fields", match: (f) => f.endsWith(".json") && f !== "manifest.json" },
    { dir: "search", label: "data/search", match: (f) => /^aliases-[A-Za-z0-9_-]+\.json$/.test(f) },
  ];

  let shardChecked = 0;
  for (const group of SHARDED) {
    const dir = resolve(DATA_DIR, group.dir);
    if (!existsSync(dir)) continue;
    const onDisk = (await readdir(dir)).filter(group.match).sort();
    // Pull every quoted "./data/<dir>/<file>" string out of sw.js. Built by
    // splitting rather than by an assembled regex: the paths contain slashes.
    const prefix = "./" + group.label + "/";
    const listed = new Set(
      [...swSource.matchAll(/"([^"]+)"/g)]
        .map((m) => m[1])
        .filter((v) => v.startsWith(prefix))
        .map((v) => v.slice(prefix.length))
        .filter(group.match),
    );
    for (const file of onDisk) {
      shardChecked++;
      if (!listed.has(file)) {
        fail(
          group.label + "/" + file + " exists but is not in sw.js's precache list; add " +
          '"./' + group.label + "/" + file + '" so the shard is available offline.',
        );
      }
    }
    for (const file of listed) {
      if (!onDisk.includes(file)) {
        fail(
          "sw.js precaches " + group.label + "/" + file + ", which no longer exists; a missing " +
          "precache entry fails the whole SW install, taking every other asset with it.",
        );
      }
    }
  }

  if (failed) {
    console.error("check-sw-precache: see failures above. Edit sw.js to close the gap.");
    process.exit(1);
  }
  console.log(
    "check-sw-precache OK: " + dataChecked + " data/<folder>/manifest.json entries, " +
    shardChecked + " per-file data shards, and " +
    shellChecked + " calc-*/support .js entries all present in sw.js precache lists.",
  );
}

main().catch((e) => {
  console.error("check-sw-precache: unexpected error", e);
  process.exit(1);
});
