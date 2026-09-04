// README step 3: "The answer sits at the top of the page, above the inputs that
// produced it."
//
// That is the whole reading order of every calculator page, and it was decided
// deliberately -- the 2026-08-16 presentation overhaul moved the answer above
// the inputs and the proof below both. Nothing asserted it. app.js appends the
// output region and then the input region, two adjacent lines; swapping them,
// or a stylesheet growing an `order:` or `column-reverse` that flips them
// visually, would invert the page and leave every gate green. The a11y sweeps
// check that both regions exist and are labelled, not which one a reader meets
// first.
//
// So this measures POSITION, not DOM order, because position is what the README
// promises and what a reader experiences. A DOM-order assertion would pass while
// CSS displayed the opposite.
//
// The answer region is hidden until there is an answer -- an untouched
// calculator deliberately shows nothing, which is the spec-v1343 priming guard
// -- so each tile is driven through its own worked example first, and the test
// waits for the answer to appear rather than sleeping past a debounce.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = readFileSync(resolve(ROOT, "tools-data.js"), "utf8");
const IDS = [...src.matchAll(/id: "([a-z0-9-]+)"/g)].map((m) => m[1]);
// An evenly-strided sample, stated rather than implied: one template renders
// every calculator, so the variable across tiles is content, not layout.
const SAMPLE = IDS.filter((_, i) => i % 90 === 0);

test("the answer renders above the inputs that produced it", async ({ page }) => {
  test.slow();
  const inverted = [];
  let measured = 0;

  for (const id of SAMPLE) {
    await page.goto("/#" + id);
    const inputs = page.locator(".input-region");
    await expect(inputs.first()).toBeVisible({ timeout: 30_000 });

    const button = page.locator("#view-region button").filter({ hasText: /example/i }).first();
    if ((await button.count()) === 0) continue; // a reference tile with no example
    await button.click();

    const output = page.locator(".output-region").first();
    try {
      await expect(output).toBeVisible({ timeout: 15_000 });
    } catch {
      continue; // no answer for this tile's example; the ordering claim needs one
    }

    const out = await output.boundingBox();
    const inp = await inputs.first().boundingBox();
    if (!out || !inp) continue;
    measured++;
    if (out.y >= inp.y) {
      inverted.push(`${id}: answer at y=${Math.round(out.y)}, inputs at y=${Math.round(inp.y)}`);
    }
  }

  // A sample that silently emptied would make the assertion below meaningless,
  // which is the failure this whole file exists to prevent elsewhere.
  expect(measured, `expected to measure a real sample, measured ${measured} of ${SAMPLE.length}`).toBeGreaterThan(8);
  expect(inverted, inverted.join("\n")).toEqual([]);
});
