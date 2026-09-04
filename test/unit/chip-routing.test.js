// The four chips the home view teaches must ROUTE, and the vague queries
// spec-v1343 exists for must still ASK.
//
// This is the contract the search-prefill e2e checks in a browser, restated
// where it costs milliseconds instead of thirty minutes. It was written after
// an integration failure that took a full CI run to surface and a log that only
// said the URL never changed: a ranking change reordered the top twelve rows,
// pulled a tile that ties Ohm's Law on score into that window, and the
// ambiguity rule -- which reads nothing but score -- turned a named request
// into a question. The chip stopped routing and the home view stopped
// demonstrating the thing the README's first line promises.
//
// The chip list is read from index.html rather than copied, so a chip edited
// there is covered here automatically and a chip that stops routing fails here
// first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { TOOLS } = await import(resolve(ROOT, "tools-data.js"));
const { normalizeQuery, rankTools } = await import(resolve(ROOT, "search-discovery.js"));
const aliases = JSON.parse(
  await readFile(resolve(ROOT, "data", "search", "aliases.json"), "utf8"),
).aliases;

// The same rule app.js applies on Enter, minus the alias/slots escape hatches
// that can only make it route MORE often -- so a query this says asks is one
// app.js might still route, never the reverse.
const AMBIGUITY_RATIO = 0.95;
function asks(query) {
  const rows = rankTools(normalizeQuery(query).tokens, TOOLS, aliases, { limit: 12 });
  if (rows.length < 2 || !rows[0].score) return false;
  return rows.filter((r) => r.score / rows[0].score >= AMBIGUITY_RATIO).length >= 2;
}

test("every home-view chip routes instead of asking", async () => {
  const html = await readFile(resolve(ROOT, "index.html"), "utf8");
  const chips = [...html.matchAll(/class="hero-chip"[^>]*>([^<]+)</g)].map((m) => m[1].trim());
  assert.equal(chips.length, 4, `expected 4 hero chips in index.html, found ${chips.length}`);
  for (const chip of chips) {
    assert.equal(asks(chip), false, `the chip "${chip}" would open a pick card instead of routing`);
  }
});

test("the vague queries spec-v1343 names still ask instead of guessing", () => {
  // Named in the rule's own comment as the cases it exists for. If a change
  // makes these route, the guard above has grown too broad.
  for (const q of ["pressure drop", "heat loss", "payment", "grounding"]) {
    assert.equal(asks(q), true, `"${q}" should offer a choice, not guess`);
  }
});
