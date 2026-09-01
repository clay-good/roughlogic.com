#!/usr/bin/env node
// Per-URL <lastmod> ledger for sitemap.xml.
//
// Every one of the 1,827 sitemap URLs used to carry the build timestamp as its
// <lastmod>. The site rebuilds on every push, so a crawler saw 1,804 tile pages
// claiming to have changed today, every day, whatever had actually changed --
// next to a <changefreq> of `monthly` on the same URL. An entirely inaccurate
// lastmod is worse than none: search engines drop the signal for the whole
// sitemap once they can see it does not track content, so the pages that really
// did change lose the one hint that says so.
//
// This ledger records, for each URL, the hash of the bytes a reader receives and
// the date that hash was last stamped. The build reads it and emits the recorded
// date for a page whose bytes are unchanged, falling back to the build date for
// one that is new or has moved on. Re-stamp with `npm run stamp:lastmod` and
// commit the result; `check-shells` fails a dist/ that has drifted from it, so
// a content change cannot ship with a stale date.
//
// Standalone Node 20 script using only built-ins. Reads dist/; does not build.
// Run after `npm run build`.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");
export const LEDGER_PATH = resolve(ROOT, "scripts", "page-lastmod.json");

function sha(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

// The bytes that decide what a reader gets at each URL. A static shell is its
// own document. The home page is the SPA frame plus the catalog it renders --
// index.html alone never changes when a tile is added, and the home page
// visibly does.
export async function hashPages() {
  const pages = new Map();
  const read = async (p) => readFile(p, "utf8");

  const home = await read(resolve(DIST, "index.html"));
  const catalog = await read(resolve(DIST, "tools-data.js"));
  pages.set("/", sha(home + "\n" + catalog));

  pages.set("/tools/", sha(await read(resolve(DIST, "tools", "index.html"))));

  for (const slug of (await readdir(resolve(DIST, "groups"), { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()) {
    pages.set(`/groups/${slug}/`, sha(await read(resolve(DIST, "groups", slug, "index.html"))));
  }

  for (const id of (await readdir(resolve(DIST, "tools"), { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()) {
    pages.set(`/tools/${id}/`, sha(await read(resolve(DIST, "tools", id, "index.html"))));
  }
  return pages;
}

export async function loadLedger() {
  if (!existsSync(LEDGER_PATH)) return { pages: {} };
  try {
    const j = JSON.parse(await readFile(LEDGER_PATH, "utf8"));
    return j && j.pages ? j : { pages: {} };
  } catch {
    return { pages: {} };
  }
}

// Compare a freshly hashed dist/ against the committed ledger. Returns the
// paths that are new, changed, or recorded but no longer built.
export function diffLedger(hashes, ledger) {
  const added = [];
  const changed = [];
  const removed = [];
  for (const [path, h] of hashes) {
    const row = ledger.pages[path];
    if (!row) added.push(path);
    else if (row.sha !== h) changed.push(path);
  }
  for (const path of Object.keys(ledger.pages)) {
    if (!hashes.has(path)) removed.push(path);
  }
  return { added, changed, removed };
}

async function main() {
  if (!existsSync(DIST)) {
    console.error("build-page-lastmod: dist/ does not exist. Run `npm run build` first.");
    process.exit(1);
  }
  const check = process.argv.includes("--check");
  const hashes = await hashPages();
  const ledger = await loadLedger();
  const { added, changed, removed } = diffLedger(hashes, ledger);

  if (check) {
    const drift = added.length + changed.length + removed.length;
    if (drift === 0) {
      console.log(`page-lastmod ledger OK: ${hashes.size} URL(s), every one matching scripts/page-lastmod.json.`);
      return;
    }
    console.error(`page-lastmod: ledger is ${drift} URL(s) out of date with dist/.`);
    const show = (label, list) => {
      if (!list.length) return;
      console.error(`  ${label} (${list.length}): ${list.slice(0, 8).join(", ")}${list.length > 8 ? ", ..." : ""}`);
    };
    show("changed", changed);
    show("added", added);
    show("no longer built", removed);
    console.error("  Run `npm run stamp:lastmod` and commit scripts/page-lastmod.json so these URLs carry today's <lastmod> and the rest keep theirs.");
    process.exit(1);
  }

  // The date a page's content last moved. UTC, to match the sitemap's date-only
  // form and the CI clock.
  const today = new Date().toISOString().slice(0, 10);
  const pages = {};
  for (const [path, h] of hashes) {
    const row = ledger.pages[path];
    pages[path] = row && row.sha === h ? { sha: h, date: row.date } : { sha: h, date: today };
  }
  const out = {
    _comment:
      "Per-URL <lastmod> for sitemap.xml. `date` is when that page's bytes last changed, " +
      "not when the site was last built. Regenerate with `npm run stamp:lastmod` after a " +
      "build and commit; check-shells fails if dist/ has drifted from it.",
    pages,
  };
  await writeFile(LEDGER_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(
    `page-lastmod: ${hashes.size} URL(s) stamped -- ${changed.length} changed, ${added.length} new, ` +
    `${removed.length} dropped, ${hashes.size - changed.length - added.length} unchanged and keeping their date.`
  );
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) await main();
