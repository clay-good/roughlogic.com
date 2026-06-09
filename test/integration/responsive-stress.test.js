// Responsive-stress gate. The standing mobile sweep (a11y.test.js, spec-v12
// §10) and check-shell-mobile.mjs (spec-v18 §6) both assert zero page-level
// horizontal scroll at a 320 px *viewport* -- which also covers WCAG 2.2
// 1.4.10 Reflow (content at 400% page zoom on a 1280 px window resolves to a
// 320 CSS-px viewport). This file extends that guarantee to the two responsive
// axes the single-viewport sweep does NOT exercise:
//
//   * WCAG 1.4.4 Resize Text (200% text-only zoom). Emulated by doubling the
//     root font-size, which scales every rem-based type size, control height,
//     and padding the way Firefox text-only zoom does. The risk it surfaces is
//     a fixed-width or short-word container whose doubled text spills past the
//     column and pushes a page-level scrollbar.
//   * Landscape phones and tablet portraits. Short-height landscape (568x320,
//     667x375) and the iPad widths (768, 834), plus both sides of the lone
//     760 px breakpoint, confirm the fluid layout never reintroduces a sideways
//     scroll between the phone floor and the desktop column cap.
//
// The contract is identical everywhere: documentElement.scrollWidth never
// exceeds clientWidth by more than a sub-pixel rounding tolerance, so every
// view scrolls only vertically on every device class.
import { test, expect } from "@playwright/test";

// Diverse SPA surfaces: home hero + browse list, a phasor-diagram calculator,
// the two widest multi-column schedules, the longest reference <dl>, a
// select-heavy tile, and the longest-output finance tiles.
const SPA_ROUTES = [
  "", "#voltage-drop", "#loan-amortization", "#macrs-depreciation",
  "#color-codes", "#hos-math", "#rent-vs-buy", "#duct-sizing", "#parkland-formula",
];
// One tool shell, one wide-table tool shell, two group shells, and the
// client-rendered changelog -- the zero-JS prerendered surface.
const STATIC_ROUTES = [
  "/tools/voltage-drop/", "/tools/loan-amortization/",
  "/groups/electrical/", "/groups/accounting/", "/changelog.html",
];

async function assertNoHScroll(page, label) {
  const m = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(
    m.sw,
    `${label}: page scrolls horizontally (scrollWidth ${m.sw} > clientWidth ${m.cw})`,
  ).toBeLessThanOrEqual(m.cw + 1);
}

// Populate a calculator's widest DOM state via its "Test with example" button
// so wide tables / long outputs are actually present when measured.
async function populateExample(page, route) {
  if (!route.startsWith("#")) return;
  const btn = await page.$(".input-region button");
  if (btn) {
    await btn.click().catch(() => {});
    await page.waitForTimeout(60);
  }
}

function doubleRootFontSize(page) {
  return page.addInitScript(() => {
    const s = document.createElement("style");
    s.textContent = "html{font-size:200% !important}";
    document.documentElement.appendChild(s);
  });
}

test.describe("WCAG 1.4.4 resize text: 200% text zoom, no horizontal scroll", () => {
  for (const route of SPA_ROUTES) {
    test(`text-200% SPA /index.html${route || " (home)"}`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 720 });
      await doubleRootFontSize(page);
      await page.goto(`/index.html${route}`);
      await populateExample(page, route);
      await assertNoHScroll(page, `text-200% ${route || "home"}`);
    });
  }
  for (const route of STATIC_ROUTES) {
    test(`text-200% shell ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 720 });
      await doubleRootFontSize(page);
      await page.goto(route);
      await assertNoHScroll(page, `text-200% ${route}`);
    });
  }
});

const VIEWPORTS = [
  { w: 568, h: 320, name: "landscape-iphone-se" },
  { w: 667, h: 375, name: "landscape-iphone-8" },
  { w: 759, h: 1024, name: "just-below-760-breakpoint" },
  { w: 761, h: 1024, name: "just-above-760-breakpoint" },
  { w: 768, h: 1024, name: "ipad-portrait" },
  { w: 834, h: 1112, name: "ipad-air-portrait" },
];

test.describe("landscape + tablet widths, no horizontal scroll", () => {
  for (const vp of VIEWPORTS) {
    for (const route of ["", "#voltage-drop", "#loan-amortization", "#color-codes"]) {
      test(`${vp.name} /index.html${route || " (home)"}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.w, height: vp.h });
        await page.goto(`/index.html${route}`);
        await populateExample(page, route);
        await assertNoHScroll(page, `${vp.name} ${route || "home"}`);
      });
    }
  }
  // Landscape over the prerendered shells too.
  for (const route of STATIC_ROUTES) {
    test(`landscape-iphone-se shell ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 568, height: 320 });
      await page.goto(route);
      await assertNoHScroll(page, `landscape ${route}`);
    });
  }
});
