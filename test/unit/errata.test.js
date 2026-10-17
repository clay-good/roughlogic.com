// spec-v1967 (spec-v106 roadmap pillar 6): the corrections log at /errata/
// lists every CHANGELOG "### Fixed" bullet that names a live calculator. An
// errata log that silently drops an entry undercuts the integrity it exists to
// show, so the count is checked against a second, independent reading. No
// per-tile "corrected N times" claim is made: the CHANGELOG does not record
// which tiles a fix changed, and a bullet can name a tile it found correct.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parseCorrections, errataShell } from "../../scripts/build-shells.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("the corrections log covers every Fixed bullet that names a live calculator, and nothing else", async () => {
  const { TOOLS } = await import("../../tools-data.js");
  const live = new Set(TOOLS.map((t) => t.id));
  const changelog = readFileSync(resolve(ROOT, "CHANGELOG.md"), "utf8");
  const entries = parseCorrections(changelog, live);
  assert.ok(entries.length > 400, `only ${entries.length} corrections; did the CHANGELOG format change?`);
  // Numbered from the oldest, listed newest first, no gaps: anchors stay stable.
  assert.deepEqual(entries.map((e) => e.n), entries.map((_, i) => entries.length - i));
  for (const e of entries) {
    assert.ok(e.tiles.length > 0 && e.tiles.every((t) => live.has(t)), `#fix-${e.n} names no live calculator`);
    assert.ok(e.title && !/\*\*/.test(e.title), `#fix-${e.n} has no clean title`);
  }
  // Independent count, by a second and simpler reading of the file: split it
  // into top-level bullets, keep those that sit under a "### Fixed" heading,
  // and count the ones whose text (continuation lines included) names a live id.
  let expected = 0, inFixed = false, bullet = null;
  const close = () => { if (bullet !== null && [...bullet.matchAll(/`([a-z0-9-]+)`/g)].some((m) => live.has(m[1]))) expected++; bullet = null; };
  for (const line of changelog.split("\n")) {
    if (/^#{2,3} /.test(line)) { close(); inFixed = /^### Fixed\s*$/.test(line); continue; }
    if (line.startsWith("- ")) { close(); if (inFixed) bullet = line; continue; }
    if (bullet !== null && line.startsWith("  ")) { bullet += " " + line; continue; }
    if (line.trim() !== "") close();
  }
  close();
  assert.equal(entries.length, expected, "the log drops or invents a correction");
  // Every entry is on the page with its stable anchor, and the page never
  // claims a calculator was changed -- only that an entry names it.
  const html = errataShell(entries, TOOLS);
  for (const e of entries) assert.ok(html.includes(`id="fix-${e.n}"`), `#fix-${e.n} missing from the log page`);
  assert.ok(!/Calculators changed|Corrected \d+ times|Corrected once/.test(html), "the log page overclaims what an entry changed");
  assert.ok(html.includes("Calculators named:"));
});

test("the parser: Fixed only, continuation lines joined, a calculator required, dates from dated headings", () => {
  const live = new Set(["voltage-drop", "pipe-volume"]);
  const md = [
    "# Changelog", "", "## Unreleased", "",
    "### Added", "", "- **A feature touching `voltage-drop`.** not a correction", "",
    "### Fixed", "",
    "- **Voltage drop no longer rounds the wrong way.** `voltage-drop` read", "  low; the second line also names `pipe-volume`.", "",
    "- **A build-only fix.** no calculator named here", "",
    "- **Bogus id.** `not-a-tile` only", "",
    "## v0.9.0 - 2026-01-02", "", "### Fixed", "",
    "- **Pipe volume ID typo.** `pipe-volume`", "",
  ].join("\n");
  const e = parseCorrections(md, live);
  assert.deepEqual(e.map((x) => [x.n, x.title, x.tiles, x.date]), [
    [2, "Voltage drop no longer rounds the wrong way.", ["voltage-drop", "pipe-volume"], null],
    [1, "Pipe volume ID typo.", ["pipe-volume"], "2026-01-02"],
  ], "Added is not a correction; a bullet naming no live calculator is left out; a continuation line counts");
});
