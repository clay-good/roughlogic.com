// v10 Phase E.1 print parity audit (spec-v10.md §7.1).
//
// For each representative tile, load the route, click "Test with
// example" to populate inputs, switch the page to print emulation,
// and assert the rendered DOM contains the four print-view invariants
// the spec requires:
//
//   1. Citation footer (a non-empty `#citation` element).
//   2. View h1 with the tool name (the spec's "single h1" rule).
//   3. Inputs are present as labeled fields (the input-region carries
//      the tile's input controls; print CSS keeps them visible).
//   4. Outputs are present (the output-region carries the rendered
//      result lines for tiles whose compute returned scalar output).
//
// CI-only. Local dev does not require Playwright; `npm test` only runs
// unit tests. Mirrors the route-list shape of test/integration/a11y.
// test.js so the two audits stay in lockstep.

import { test, expect } from "@playwright/test";

const ROUTES = [
  { name: "ohms-law", hash: "ohms-law" },
  { name: "wire-ampacity", hash: "wire-ampacity" },
  { name: "voltage-drop", hash: "voltage-drop" },
  { name: "friction-loss", hash: "friction-loss" },
  { name: "pipe-sizing", hash: "pipe-sizing" },
  { name: "manual-j-cooling", hash: "manual-j-cooling" },
  { name: "duct-sizing", hash: "duct-sizing" },
  { name: "lumber-spans", hash: "lumber-spans" },
  { name: "stairs", hash: "stairs" },
  { name: "fire-friction", hash: "fire-friction" },
  { name: "required-fire-flow", hash: "required-fire-flow" },
  { name: "service-load", hash: "service-load" },
  { name: "septic-tank", hash: "septic-tank" },
  { name: "joist-deflection", hash: "joist-deflection" },
  { name: "loan-payment", hash: "loan-payment" },
];

// The print view in BOTH colour schemes, which the sweep below does not cover.
//
// Playwright renders in the light scheme by default, so every print assertion
// in this file has only ever seen a reader whose system prefers light. Under
// dark, `@media print` forced `body` and three containers to white with black
// text -- and left every descendant holding its token, so the ANSWER printed
// white on white paper. The h1 too. The input boxes printed solid black.
//
// The fix redefines the palette inside @media print rather than adding a fifth
// !important rule; this asserts the outcome a reader actually gets, which is
// ink on the page.
for (const scheme of ["light", "dark"]) {
  test.describe("print scheme " + scheme, () => {
    test.use({ colorScheme: scheme });
    test("print: the answer is readable ink on white in the " + scheme + " scheme", async ({ page }) => {
      await page.goto("/#voltage-drop?v=1&vd-phase=single&vd-mat=copper&vd-awg=12&vd-len=150&vd-cur=20&vd-src=240");
      await page.waitForSelector(".input-region .field", { timeout: 30_000 });
      await expect(page.locator(".out-value").first()).not.toBeEmpty({ timeout: 30_000 });
      await page.emulateMedia({ media: "print" });

      const read = () => page.evaluate(() => {
        const of = (el) => {
          if (!el) return null;
          const s = getComputedStyle(el);
          return { color: s.color, bg: s.backgroundColor };
        };
        return {
          body: getComputedStyle(document.body).backgroundColor,
          answer: of(document.querySelector(".out-value")),
          title: of(document.querySelector(".view-title, h1")),
          input: of(document.querySelector(".input-region input")),
        };
      });

      // Mean channel value: near 0 is ink, near 255 is paper. Enough to tell
      // "readable on the page" from "invisible on it", which is the whole
      // question here.
      const lum = (c) => {
        const m = /^rgba?\((\d+), (\d+), (\d+)/.exec(String(c || ""));
        return m ? (Number(m[1]) + Number(m[2]) + Number(m[3])) / 3 : -1;
      };

      // Switching the emulated media does not repaint computed styles in the
      // same tick -- measured: the input box still reports the screen palette
      // for a beat, and `matchMedia("print").matches` flips before it does. So
      // poll the value that is actually being asserted.
      await expect
        .poll(async () => lum((await read()).input.bg), { timeout: 15_000 })
        .toBeGreaterThan(200);

      const shot = await read();
      expect(lum(shot.body), "printed page background should be white").toBeGreaterThan(200);
      expect(lum(shot.answer.color), `the answer printed at ${shot.answer.color} on ${shot.body}`).toBeLessThan(80);
      expect(lum(shot.title.color), `the title printed at ${shot.title.color}`).toBeLessThan(80);
      expect(lum(shot.input.color), `input text printed at ${shot.input.color}`).toBeLessThan(80);
    });
  });
}

for (const route of ROUTES) {
  test("print: " + route.name + " carries h1 + citation + inputs + outputs under print emulation", async ({ page }) => {
    await page.goto("/index.html#" + route.hash);

    // Wait for the calculator view to mount.
    await page.waitForFunction(() => document.querySelector("#view-region h1") !== null);

    // Populate the tile's inputs with the spec-mandated worked example.
    const exampleBtn = page.getByRole("button", { name: "Test with example" });
    if (await exampleBtn.count() > 0) {
      await exampleBtn.first().click();
    }

    // Switch the page to print emulation. The site's @media print
    // stylesheet hides the header chrome and footer badges; the
    // calculator view itself stays visible.
    await page.emulateMedia({ media: "print" });

    // These use retrying web-first assertions (toHaveText / toHaveCount)
    // rather than a single innerText snapshot. innerText is layout-aware,
    // so reading it on the same tick that emulateMedia('print') triggers a
    // style/layout recompute was an intermittent empty read (observed as a
    // flaky "citation footer is empty" on otherwise-correct tiles).
    // toHaveText matches normalized textContent and auto-retries until the
    // content is stable, removing the print-emulation race while keeping
    // the same DOM-content invariant.

    // (1) Citation present and non-empty. It lives inside the collapsed
    // `details.proof` block; toHaveText reads textContent, so the assertion
    // holds whether or not the disclosure is expanded.
    await expect(page.locator("#view-region .citation").first(), "citation footer is empty for " + route.name).toHaveText(/\S/);

    // (2) View h1 carries the tool name.
    await expect(page.locator("#view-region h1"), "view h1 is empty for " + route.name).toHaveText(/\S/);

    // (3) Input region exists and contains at least one form control.
    await expect(page.locator("#view-region .input-region :is(input, select, textarea, button)"), "no input controls in input-region for " + route.name).not.toHaveCount(0);

    // (4) Output region exists; for tiles that produce scalar output,
    // assert at least one rendered output line. Reference-only tiles
    // (color-codes, knot-reference, OSHA top-10, etc.) render lists
    // rather than output lines, so the spec only requires *some*
    // textual content in the output region for those.
    await expect(page.locator("#view-region .output-region"), "output region is empty for " + route.name).toHaveText(/\S/);
  });
}
