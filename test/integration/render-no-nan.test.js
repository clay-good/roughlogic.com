// spec-v18 §5.4 render assertions (real-render layer).
//
// The §7 compute sweep guarantees every solver returns a finite result or
// an { error } object. §5.4 closes the other half of the C-7 contract: the
// *renderer* must never paint a raw `NaN`, `Infinity`, `$NaN`, or
// `undefined` into the output the user reads. A value can be finite and a
// renderer can still leak (a missing field, a bad format string, a `${x}`
// over an undefined), so this is asserted at the DOM, not the function.
//
// It runs at the Playwright layer (real chromium) rather than jsdom,
// honoring the spec-v13 zero-runtime-dependency rule and spec-v18 §5.5
// (the 320px shell audit already uses the CI-only Playwright/Chromium dev
// dependency; this adds none). Every TOOLS id is covered for two states:
//   (a) a finite result, via the tile's "Test with example" button; and
//   (b) the empty / degenerate initial state on first render.
// The id list is parsed from tools-data.js so a new tile is auto-covered
// without a test edit (same parse as a11y.test.js).
//
// RENDERER-HEALTH (no-crash) guarantee: the same per-tile navigation also
// asserts the tile produced no uncaught error and no console.error during
// load + example-populate. The app wraps every renderer in a crash-safe
// boundary that catches a throw and logs "[crash-safe] calculator threw"
// via console.error -- so a renderer that crashes still paints a fallback
// (no NaN, passes the checks above) and would otherwise pass silently. This
// is the gap that let an unimported `makeCheckbox` and a temporal-dead-zone
// `update` reference ship three broken tiles (phase-balance,
// declining-balance-depreciation, cockcroft-gault-crcl) past unit tests
// (which test compute fns, not renderers) and the NaN checks. A fresh tile
// load is otherwise console-clean (verified: favicon resolves, the service
// worker does not register on the http test origin), so any console.error
// or pageerror here is a real defect.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TOOLS_JS = readFileSync(join(__dirname, "..", "..", "tools-data.js"), "utf8");

function readToolIds(src) {
  const start = src.indexOf("const TOOLS = [");
  if (start < 0) throw new Error("render-no-nan.test.js: TOOLS array not found in tools-data.js");
  let i = src.indexOf("[", start) + 1;
  let depth = 1;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === "[") depth++;
    else if (ch === "]") { depth--; if (depth === 0) break; }
    i++;
  }
  const body = src.slice(start, i);
  const ids = [];
  const re = /\{\s*id:\s*"([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(body)) !== null) ids.push(m[1]);
  return ids;
}

const TOOL_IDS = readToolIds(TOOLS_JS);
// Case-sensitive on NaN/Infinity (the JS string forms), so prose like
// "infinite" or "not a number" never false-positives. `undefined` and the
// `$NaN` currency-format artifact are matched as whole tokens.
const BAD = /\bNaN\b|\bInfinity\b|\$NaN|\bundefined\b/;

for (const id of TOOL_IDS) {
  test("render-no-nan: " + id, async ({ page }) => {
    // Collect renderer crashes: a thrown renderer surfaces as a pageerror
    // (uncaught) or as the crash-safe boundary's console.error log. Attach
    // before navigation so boot-time failures are caught too.
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console.error: " + m.text()); });

    await page.goto("/index.html#" + id);
    const out = page.locator("#view-region .output-region");
    await out.waitFor({ state: "attached" });

    // (b) empty / degenerate initial state.
    const initial = (await out.textContent()) || "";
    expect(initial, `${id} leaked in initial output: "${initial.trim()}"`).not.toMatch(BAD);

    // (a) finite result via the "Test with example" button, when the tile
    // has one (Group H reference tiles do not compute and have none).
    const exampleBtn = page.locator(".input-region button", { hasText: /example/i }).first();
    if (await exampleBtn.count()) {
      await exampleBtn.click();
      await page.waitForTimeout(70); // clear the 50ms input debounce
      const filled = (await out.textContent()) || "";
      expect(filled, `${id} leaked after example: "${filled.trim()}"`).not.toMatch(BAD);
    }

    // Renderer-health: no crash during load or example-populate.
    expect(errors, `${id} renderer crashed:\n${errors.join("\n")}`).toEqual([]);
  });
}
