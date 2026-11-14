// A whole count printed beside a fixed plural noun reads "1 bags", "1 rolls",
// "1 days" on every small job. On 2026-11-14 about 300 renderer lines of the
// shape `fmt(r.x, 0) + " bags` or `r.x + " bags` were changed to choose the
// noun by the printed count; this keeps new lines from coming back in the old
// shape. Units that are not nouns (cfs, fps) and words that are not plurals
// are listed below.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url);
const NOT_A_PLURAL_NOUN = new Set(["governs", "vs", "pass", "cfs", "fps", "pays", "times", "plus", "minus", "gas", "less", "across", "this", "pervious", "gross",
  // calc-soilproperties.js: a soil type name followed by a verb ("Gravel needs ...").
  "needs",
  // calc-airquality.js: "<area> reaches 99%" -- a verb after an area figure.
  "reaches"]);
// The result-key form (`fmt(r.bags, 0)`) and, since the same day's second pass
// over computes' verdict sentences, the local-variable form (`fmt(days, 0)`).
// A third pass the same day added the material-order factories' forms,
// `_fmtC(r.rolls, 0)` and `String(r.sheets)` (61 lines).
const SHAPE = /(?:(?:fmt|_fmtC)\((?:(?:r|x|res|out)\.)?[A-Za-z_][A-Za-z_0-9]*, ?0\)|String\((?:r|x)\.[a-z_0-9]+\)|(?:r|x)\.[a-z_0-9]+) \+ " ([a-z]+s)\b/g;

test("count nouns: a whole count is not printed beside a fixed plural noun", () => {
  const hits = [];
  for (const f of readdirSync(ROOT).filter((n) => /^calc-.*\.js$/.test(n)).sort()) {
    const src = readFileSync(new URL(f, ROOT), "utf8");
    for (const m of src.matchAll(SHAPE)) {
      const w = m[1];
      if (NOT_A_PLURAL_NOUN.has(w) || /(?:ss|us|is)$/.test(w)) continue;
      hits.push(`${f}: ${m[0]}`);
    }
  }
  assert.deepEqual(hits, [], 'write `fmt(r.n, 0) + " " + (fmt(r.n, 0) === "1" ? "bag" : "bags")`');
});

// The rendered-page check: every tile is drawn, its example loaded, and each
// input scaled down until counts fall to one; any "1 <word>s" on the page must
// be a reviewed tile + word below. Each reviewed pair was read: the word is a
// verb or a table name, or the 1 is not a count of that noun ("2 to 1 terms",
// "reading 1, 7, 2 and 1 mils", "1 meals" = one pallet of meals).
const REVIEWED = new Set([
  "ada-stair-check this", "asme-shell-thickness governs", "blast-airblast-overpressure times",
  "cleanout-layout governs", "coating-breakdown-factor times", "composite-curve-number pervious",
  "extinguisher-coverage governs", "governor-tripping-speed terms", "hazmat-placard-threshold class",
  "hazmat-placard-threshold materials", "pwht-holding-time flattens", "refractory-shell-temperature sees",
  "relief-commodity-truckloads meals", "seepage-travel-time this", "silica-table-1 specifies",
  "soft-foot-correction mils", "soil-relative-density cancels", "standby-battery-sizing credits",
  "sub-slab-suction-field this", "traction-roping-ratio dominates", "two-stage-interstage-pressure across",
  "ventilation-rate-procedure needs", "weld-metal-volume pass",
]);

test("count nouns: no rendered page prints a count of one beside a plural noun", async () => {
  const { execFileSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const sweep = fileURLToPath(new URL("../fixtures/render-count-noun-sweep.js", import.meta.url));
  const report = JSON.parse(execFileSync(process.execPath, [sweep], { encoding: "utf8", maxBuffer: 1 << 24, stdio: ["ignore", "pipe", "ignore"] }));
  assert.ok(report.withExample > 2200, `only ${report.withExample} tiles rendered an example`);
  const fresh = report.hits.filter((h) => !REVIEWED.has(h.id + " " + h.word)).map((h) => `${h.id} (${h.state}): ...${h.text}`);
  assert.deepEqual(fresh, [], "choose the noun by the printed count, or review the pair above");
});
