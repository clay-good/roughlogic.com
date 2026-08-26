// A calculator opens blank, and every box is captioned with the value the
// page's worked example uses ("e.g. 150"), so a reader sees the expected unit
// and magnitude before typing their own number over it.
//
// Both halves of that hang off one thing: the "Test with example" button.
// primeExamplePlaceholders gets the captions by running the button's filler
// once against the freshly rendered fields, so a calculator without the button
// has no captions either -- and the four that were missing it (economic
// insulation thickness, pipe insulation for condensation, compressed-air
// pressure drop, fan sheave for a target CFM) had each been given field
// defaults and a compute-at-construction call instead, so they opened with
// somebody else's job typed in AND already answered.
//
// That is the pair this pins. A calculator has the button, and a calculator
// shows no answer until the reader asks for one. Neither can be checked from
// source: the button is attached at render time, from inside 25 differently
// named declarative factories.
//
// REFERENCE_TILES are the Group H pages that compute nothing -- a knot chart,
// a color code table. They have no inputs, so they have no example to load and
// nothing to caption.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOLS_SRC = readFileSync(join(__dirname, "..", "..", "tools-data.js"), "utf8");
const TOOL_IDS = [...TOOLS_SRC.matchAll(/\{\s*id:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);

const REFERENCE_TILES = new Set([
  "backflow", "color-codes", "defensible-space", "emergency-contacts",
  "gfci-afci-reference", "hand-signals", "inspection-checklist",
  "irs-form-index", "knot-reference", "lab-safety-quickread", "loto-steps",
  "magnetic-declination", "mold-conditions", "osha-recordkeeping", "osha-top10",
  "sales-tax-nexus", "smoke-reading", "storm-shelter", "thermal-delta-t",
  "tool-maintenance", "triage-quickread", "water-classes",
]);

// KNOWN BLIND SPOT, measured 2026-08-26. This sweep reads each view 25 ms
// after opening it, which is right for the button and the field values but
// cannot see an answer that arrives LATE. A worker-backed tile
// (manual-j-cooling posts to manual-j-worker.js) answers about 2 SECONDS
// after open in a real browser -- and at 1,700 tiles a 2 s settle per view
// would take an hour, so the sweep cannot simply wait.
//
// Worse, the behaviour does not reproduce here at all: under Playwright the
// same tile shows NO answer even at 4 s, with no console error and no failed
// request, while a real browser shows it on 8 opens out of 8. Three attempts
// to make this gate catch it -- stability polling, never-settle-on-empty, and
// a targeted 2.6 s pass over the async tiles derived from source -- all
// passed against a build with the bug deliberately restored.
//
// So: a green run here does NOT prove an async tile opens blank. That class
// was caught by hand (open the tile 8x in a browser, read `.output-region`)
// and is guarded at the source instead, by the reader-driven stop condition
// in primeExamplePlaceholders. If you change that guard, verify it the same
// way; this test will not tell you.
test("every calculator offers its worked example, and answers nothing until asked", async ({ page }) => {
  // A 1,709-view hash sweep, not a 3x nudge on the default budget.
  test.setTimeout(300_000);
  await page.goto("/index.html");
  const noButton = [];
  const preAnswered = [];
  for (const id of TOOL_IDS) {
    if (REFERENCE_TILES.has(id)) continue;
    await page.evaluate((h) => { window.location.hash = h; }, id);
    await page.waitForFunction((h) => location.hash === `#${h}`, id).catch(() => {});
    // Priming runs in a microtask after the renderer builds its fields, so it
    // has landed by the next task; this is the beat the a11y sweep uses too.
    await page.waitForTimeout(25);
    const state = await page.evaluate(() => ({
      hasButton: !!document.querySelector("#view-region .example-btn"),
      hasFields: !!document.querySelector("#view-region input, #view-region select, #view-region textarea"),
      // An answer on open is only wrong when it was computed off a number
      // somebody else typed. A pure lookup -- burial depth by wiring method,
      // raceway support spacing by trade size -- answers off a dropdown, which
      // always holds a value, and there is no "before you type" state to
      // protect there. So the signal is a FILLED typeable box, not the mere
      // presence of one.
      prefilled: [...document.querySelectorAll(
        "#view-region input[type=number], #view-region input[type=text], #view-region textarea",
      )].some((el) => el.value),
      // A note row is a collapsed <details> of prose, not an answer.
      answers: [...document.querySelectorAll("#view-region .out-value:not(.note-value)")]
        .map((el) => el.textContent.trim()).filter(Boolean),
    }));
    if (!state.hasFields) continue;
    if (!state.hasButton) noButton.push(id);
    if (state.prefilled && state.answers.length) preAnswered.push(`${id}: ${state.answers.join(" ; ").slice(0, 120)}`);
  }
  expect(
    noButton,
    `these calculators have no "Test with example" button, so no field gets an "e.g." caption either:\n${noButton.join("\n")}`,
  ).toEqual([]);
  expect(
    preAnswered,
    `these calculators show an answer before the reader has typed anything:\n${preAnswered.join("\n")}`,
  ).toEqual([]);
});
