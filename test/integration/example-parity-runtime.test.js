// The 131 tiles the static example-parity gate cannot see.
//
// `check-example-parity` resolves a tile's tool-side example through an export
// named off its compute function (`computeVoltageDrop` -> `voltageDropExample`)
// and compares it to the publisher-verified fixture the page prints. 131 tiles
// declare their example INLINE, inside `attachExampleButton(...)`, and export
// no such const -- so the gate counts them as "no example export to compare"
// and they are unguarded. That is not a hypothetical class: driving these
// routes by hand on 2026-08-20 found 30 divergences, then 17 more, where the
// page printed one worked example and the button loaded another -- and the
// first run of THIS spec found one more, `rigging-check`, which printed the
// verified vertical 1,500 lb case and opened a basket hitch at 5,000 lb. Its
// example const was merely misnamed, so renaming it moved that tile into the
// static gate instead of leaving it here.
//
// Values, not keys. The inline filler assigns to field variables (`bore`,
// `area`) that carry no relation to the fixture's input keys
// (`nozzle_bore_in`, `area_ft2`), so there is nothing to join on. What the
// reader actually compares is the NUMBERS on the page against the numbers they
// just read, and that is what this checks: open `#<id>?example=1`, read every
// visible field, and look for each fixture input value among them.
//
// The 50% threshold is deliberate. A fixture legitimately supersets the
// rendered form, and four tiles state the fixture in metric against an
// imperial form (search-track-spacing, spl-atmospheric, hiking-time,
// dyno-correction-sae) -- so a tile missing one or two values is noise. A tile
// missing HALF its inputs is a different example.
//
// The id list comes from the gate itself rather than from a second copy of its
// resolution rules; a tile that grows an example export leaves this list on its
// own and lands in the static gate instead.
import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const IDS = execFileSync("node", [resolve(ROOT, "scripts", "check-example-parity.mjs"), "--list-unresolved"], { encoding: "utf8" })
  .split("\n").map((s) => s.trim()).filter(Boolean);

const ROWS = new Map();
for (const row of JSON.parse(readFileSync(resolve(ROOT, "test", "fixtures", "worked-examples.json"), "utf8")).rows) {
  if (!ROWS.has(row.tile_id)) ROWS.set(row.tile_id, row); // rows[0] is the representative example
}

const near = (a, b) => Math.abs(a - b) <= Math.max(Math.abs(b) * 0.002, 1e-9);

function present(value, shown) {
  if (value === null || value === undefined) return true;
  if (typeof value === "number" || (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)))) {
    const n = Number(value);
    return shown.some((s) => Number.isFinite(Number(s)) && near(n, Number(s)));
  }
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return shown.some((s) => String(s).trim().toLowerCase() === v);
  }
  return true; // arrays and objects: the list-input gate owns those
}

test("example parity: the tiles with no example export still load what their page prints", async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  const divergent = [];
  let checked = 0;
  await page.goto("/");
  for (const id of IDS) {
    const row = ROWS.get(id);
    if (!row || !row.inputs) continue;
    const wanted = Object.entries(row.inputs).filter(([, v]) => v !== null && v !== undefined && typeof v !== "object");
    if (!wanted.length) continue;
    checked++;
    await page.evaluate((hash) => { window.location.hash = hash; }, `${id}?example=1`);
    await page.locator("#view-region .input-region").waitFor({ state: "attached", timeout: 20000 });
    await page.waitForTimeout(120);
    const shown = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#view-region input, #view-region select, #view-region textarea"))
        .map((el) => (el.tagName === "SELECT" ? [el.value, el.options[el.selectedIndex] && el.options[el.selectedIndex].textContent] : [el.value]))
        .flat().filter((v) => v != null && String(v).trim() !== ""));
    const missing = wanted.filter(([, v]) => !present(v, shown));
    if (missing.length * 2 >= wanted.length) {
      divergent.push(`${id}: ${missing.length}/${wanted.length} fixture inputs absent (${missing.map(([k, v]) => `${k}=${JSON.stringify(v)}`).slice(0, 4).join(", ")})`);
    }
  }
  console.log(`example-parity runtime: ${checked} export-less tile(s) driven, ${divergent.length} divergent`);
  expect(checked, "the id list collapsed; this spec stopped covering anything").toBeGreaterThan(100);
  expect(divergent, `tiles whose page prints one worked example and whose button loads another:\n${divergent.join("\n")}`).toEqual([]);
});
