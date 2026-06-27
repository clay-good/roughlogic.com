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
// dependency; this adds none). Every TOOLS id is covered for these states:
//   (a) a finite result, via the tile's "Test with example" button;
//   (b) the empty / degenerate initial state on first render;
//   (c) degenerate-input-after-interaction (each input blanked, each select
//       cycled through every option); and
//   (d) checkbox / radio toggle states (each box on AND off, each radio
//       selected) -- the mode-switch branches (a)-(c) never reach.
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
    // Triple the per-test timeout to 90 s. The four-state sweep (clear every
    // input, cycle every select option, toggle every checkbox/radio) with the
    // post-clear debounce margin can approach the default 30 s on the field-
    // and select-heavy tiles (friction-loss) on the shared CI runner. A
    // ceiling, not a wait: zero cost for the fast majority.
    test.slow();
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
      // The "Test with example" button is the catalog's primary worked-case
      // CTA, so its output region must actually be painted. An empty result is
      // not a NaN/Infinity/undefined leak (it matches none of BAD), produces no
      // axe violation, and does not scroll, so a renderer whose example branch
      // silently paints nothing -- a no-op button, an unwired example, a guard
      // that swallows the whole output -- would otherwise pass every gate. The
      // worked-examples unit runner proves the compute fn returns a result for
      // the fixture inputs, but not that the live button's renderer paints it.
      // Assert a non-empty populated output to close that gap (every example
      // tile paints >= a one-line result today; this guards future regressions).
      expect(
        filled.trim().length,
        `${id} painted an empty output region after clicking "Test with example"`,
      ).toBeGreaterThan(0);

      // (c) degenerate-input-after-interaction. The example populates a
      // valid state, but a real user can type a value and then CLEAR a
      // required field, which drives the compute fn down its { error }
      // branch. A renderer that reads result fields without an `if (r.error)`
      // guard then paints "undefined" / "NaN" (the transformer-sizing
      // "Next standard kVA: undefined kVA" leak, 2026-06-08). Neither the
      // empty FIRST render (which usually never calls update()) nor the
      // example state exercises this. Sweep it: blank each numeric/text
      // input in turn (firing the input event) and flip every select to
      // each option, asserting no leak after each change.
      // Only the inputs/selects actually visible in the current mode are
      // user-reachable; a tile with a mode toggle (e.g. water-heater-recovery)
      // hides the inactive-mode fields, and fill()/selectOption() on a hidden
      // element hangs to the test timeout rather than failing fast. Skip
      // anything not visible+editable, with a short per-action timeout so a
      // transiently-disabled control can never stall the sweep.
      const fields = page.locator(
        ".input-region input[type=number], .input-region input:not([type])",
      );
      const nFields = await fields.count();
      for (let k = 0; k < nFields; k++) {
        const f = fields.nth(k);
        if (!(await f.isVisible()) || !(await f.isEditable())) continue;
        await f.fill("", { timeout: 2000 }).catch(() => {});
        // Wait comfortably past the app's 50 ms input debounce before reading.
        // The original 60 ms (a 10 ms margin) let the re-render race the read on
        // the shared CI runner, so this state intermittently read the stale
        // (pre-clear) output and a real leak (ramp-slope "Slope ratio:
        // Infinity:1", pallet-loadout "By floor: Infinity") flakily passed one
        // run and failed the next. 100 ms is a 50 ms margin -- 5x the failing
        // one -- without doubling the gate's wall-clock the way 150 ms did.
        await page.waitForTimeout(100);
        const cleared = (await out.textContent()) || "";
        expect(cleared, `${id} leaked after clearing input #${k}: "${cleared.trim()}"`).not.toMatch(BAD);
      }
      const selects = page.locator(".input-region select");
      const nSel = await selects.count();
      for (let s = 0; s < nSel; s++) {
        const sel = selects.nth(s);
        if (!(await sel.isVisible())) continue;
        const opts = await sel.locator("option").evaluateAll((els) => els.map((e) => e.value));
        for (const v of opts) {
          await sel.selectOption(v, { timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(50);
          const toggled = (await out.textContent()) || "";
          expect(toggled, `${id} leaked after select #${s}=${v}: "${toggled.trim()}"`).not.toMatch(BAD);
        }
      }

      // (d) checkbox / radio toggle states. A mode-toggle checkbox or a radio
      // group (e.g. a "show advanced" flag or a method selector) switches the
      // renderer onto a branch the example/select/clear states never reach, and
      // that branch can read a field the active mode never populated -> a
      // "undefined" leak the same way a missing `if (r.error)` guard does. Only
      // 14 tiles carry one today, so this is near-free; toggle each visible
      // checkbox on AND off, and select each visible radio, asserting no leak.
      const checkboxes = page.locator(".input-region input[type=checkbox]");
      const nCb = await checkboxes.count();
      for (let c = 0; c < nCb; c++) {
        const cb = checkboxes.nth(c);
        if (!(await cb.isVisible())) continue;
        for (const want of [true, false]) {
          await cb.setChecked(want, { timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(50);
          const tog = (await out.textContent()) || "";
          expect(tog, `${id} leaked after checkbox #${c}=${want}: "${tog.trim()}"`).not.toMatch(BAD);
        }
      }
      const radios = page.locator(".input-region input[type=radio]");
      const nRad = await radios.count();
      for (let r = 0; r < nRad; r++) {
        const rad = radios.nth(r);
        if (!(await rad.isVisible())) continue;
        await rad.check({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(50);
        const tog = (await out.textContent()) || "";
        expect(tog, `${id} leaked after radio #${r}: "${tog.trim()}"`).not.toMatch(BAD);
      }
    }

    // Renderer-health: no crash during load or example-populate.
    expect(errors, `${id} renderer crashed:\n${errors.join("\n")}`).toEqual([]);
  });
}
