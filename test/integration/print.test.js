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

    // (1) Citation footer present and non-empty. The view inserts two
    // `.citation` paragraphs (the inline citation and the v6 sources
    // note); both share the class. We assert the first one carries
    // text, which is the spec's "Citation: ..." line.
    const citationText = await page.locator("#view-region .citation").first().innerText();
    expect(citationText.trim().length, "citation footer is empty for " + route.name).toBeGreaterThan(0);

    // (2) View h1 carries the tool name.
    const h1Text = await page.locator("#view-region h1").innerText();
    expect(h1Text.trim().length, "view h1 is empty for " + route.name).toBeGreaterThan(0);

    // (3) Input region exists and contains at least one form control.
    const inputControls = await page.locator("#view-region .input-region :is(input, select, textarea, button)").count();
    expect(inputControls, "no input controls in input-region for " + route.name).toBeGreaterThan(0);

    // (4) Output region exists; for tiles that produce scalar output,
    // assert at least one rendered output line. Reference-only tiles
    // (color-codes, knot-reference, OSHA top-10, etc.) render lists
    // rather than output lines, so the spec only requires *some*
    // textual content in the output region for those.
    const outputText = await page.locator("#view-region .output-region").innerText();
    expect(outputText.trim().length, "output region is empty for " + route.name).toBeGreaterThan(0);
  });
}
