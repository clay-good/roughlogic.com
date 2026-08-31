// The proof has to print. A sheet of paper has no disclosure to click, and the
// formula and its authority are the reference content the page exists to carry.
//
// styles.css tried to do that by rendering the closed <details> in print media
// through `::details-content` -- a rule Chromium honours and no other engine
// does. The SPA papers over the gap by setting `open` on beforeprint; a shell
// runs zero JavaScript and cannot. Measured 2026-08-31: printing a tile shell
// in WebKit dropped the formula and every source line, silently, in the engine
// behind roughly half of US mobile traffic. Nothing in CSS can open a closed
// <details>, so the shell now prints from `.shell-print-proof`, a copy that is
// display:none on screen and aria-hidden.
//
// This spec runs on Chromium AND WebKit (see playwright.config.js) because a
// Chromium-only pass is exactly what hid the defect.
import { test, expect } from "@playwright/test";

const PAGES = [
  ["/tools/ohms-law/", "a calculator tile"],
  ["/tools/osha-top10/", "a reference tile"],
];

for (const [url, what] of PAGES) {
  test(`the proof prints in full on ${what} (${url})`, async ({ page }) => {
    await page.goto(url);
    // On screen the reader gets one collapsed disclosure and no duplicate.
    await expect(page.locator(".shell-print-proof")).toBeHidden();
    await expect(page.locator("details.shell-proof")).toBeVisible();
    await expect(page.locator("details.shell-proof")).not.toHaveAttribute("open", /.*/);

    await page.emulateMedia({ media: "print" });
    const printed = page.locator(".shell-print-proof");
    await expect(printed).toBeVisible();
    // The formula and the source stamp, the two lines the page exists for.
    await expect(printed.locator(".shell-formula")).toBeVisible();
    await expect(printed.locator(".shell-source").first()).toBeVisible();
    // Printed once, not twice: the <details> gives way to the copy.
    await expect(page.locator("p.shell-formula:visible")).toHaveCount(1);
    await expect(page.locator("details.shell-proof")).toBeHidden();
  });
}

test("the printed copy is hidden from assistive technology, not just sighted readers", async ({ page }) => {
  await page.goto("/tools/ohms-law/");
  await expect(page.locator(".shell-print-proof")).toHaveAttribute("aria-hidden", "true");
  // One <details> per tile page is a standing contract; the copy is a <div>.
  await expect(page.locator("details")).toHaveCount(1);
});
