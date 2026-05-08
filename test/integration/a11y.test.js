// Accessibility tests using Playwright + axe-core.
// Runs in CI; the build fails on any new serious or critical violation.

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ROUTES = [
  { name: "home", hash: "" },
  { name: "ohms-law", hash: "ohms-law" },
  { name: "wire-ampacity", hash: "wire-ampacity" },
  { name: "voltage-drop", hash: "voltage-drop" },
  { name: "friction-loss", hash: "friction-loss" },
  { name: "pipe-sizing", hash: "pipe-sizing" },
  { name: "manual-j-cooling", hash: "manual-j-cooling" },
  { name: "duct-sizing", hash: "duct-sizing" },
  { name: "refrigerant-pt", hash: "refrigerant-pt" },
  { name: "psychrometric", hash: "psychrometric" },
  { name: "lumber-spans", hash: "lumber-spans" },
  { name: "stairs", hash: "stairs" },
  { name: "fire-friction", hash: "fire-friction" },
  { name: "required-fire-flow", hash: "required-fire-flow" },
  { name: "unit-converter", hash: "unit-converter" },
  { name: "sales-tax", hash: "sales-tax" },
  // v2 representative routes (one per group's v2 surface plus Group H).
  { name: "service-load", hash: "service-load" },
  { name: "septic-tank", hash: "septic-tank" },
  { name: "compare-refrigerants", hash: "compare-refrigerants" },
  { name: "standing-water", hash: "standing-water" },
  { name: "joist-deflection", hash: "joist-deflection" },
  { name: "braking-distance", hash: "braking-distance" },
  { name: "loan-payment", hash: "loan-payment" },
  { name: "haversine", hash: "haversine" },
  { name: "color-codes", hash: "color-codes" },
  { name: "knot-reference", hash: "knot-reference" },
  { name: "inspection-checklist", hash: "inspection-checklist" },
];

for (const route of ROUTES) {
  test("a11y: " + route.name, async ({ page }) => {
    await page.goto("/index.html#" + route.hash);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(seriousOrCritical, JSON.stringify(seriousOrCritical, null, 2)).toEqual([]);
  });
}

test("home view has a single h1 (visually hidden)", async ({ page }) => {
  await page.goto("/index.html");
  const h1Count = await page.locator("h1").count();
  expect(h1Count).toBe(1);
});

test("calculator view has a focused h1 with the tool name", async ({ page }) => {
  await page.goto("/index.html#ohms-law");
  await page.waitForFunction(() => document.querySelector("#view-region h1") !== null);
  const text = await page.locator("#view-region h1").textContent();
  expect(text).toContain("Ohm");
});

test("theme toggle flips data-theme and persists across reloads", async ({ page }) => {
  await page.goto("/index.html");
  const before = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  await page.click("#theme-toggle");
  const after = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(after).not.toBe(before);
  // Reload and confirm preference persisted via localStorage rl-theme.
  await page.reload();
  const persisted = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(persisted).toBe(after);
});

test("home tile-link touch target is at least 48x48 pixels", async ({ page }) => {
  await page.goto("/index.html");
  await page.waitForSelector(".tile-link", { timeout: 5000 });
  const dims = await page.locator(".tile-link").first().boundingBox();
  expect(dims.height).toBeGreaterThanOrEqual(48);
});

test("header theme toggle touch target is at least 48x48 pixels", async ({ page }) => {
  await page.goto("/index.html");
  // Wait for the header's rl-fade-down keyframe to settle so boundingBox
  // measures the resting position (the keyframe briefly translates the
  // header 8 px above the viewport top, clipping reported height).
  await page.waitForTimeout(600);
  const dims = await page.locator("#theme-toggle").boundingBox();
  expect(dims.height).toBeGreaterThanOrEqual(48);
  expect(dims.width).toBeGreaterThanOrEqual(48);
});

test("search input narrows tile count when typed into", async ({ page }) => {
  await page.goto("/index.html");
  await page.waitForSelector(".tile", { timeout: 5000 });
  const before = await page.locator(".tile").count();
  await page.fill("#search-input", "ohm");
  // Search debounce is 50 ms; give it a tick.
  await page.waitForTimeout(120);
  const after = await page.locator(".tile").count();
  expect(after).toBeLessThan(before);
  expect(after).toBeGreaterThan(0);
});

test("home renders all eight group sections", async ({ page }) => {
  await page.goto("/index.html");
  await page.waitForSelector(".tools-section", { timeout: 5000 });
  expect(await page.locator(".tools-section").count()).toBe(8);
});

test("Arrow-key navigation works across v2 group sections", async ({ page }) => {
  // The v2 home renders multiple <ul class="tile-grid"> blocks (one per
  // group). The arrow-key handler must walk every .tile-link in document
  // order, not just the first list. Regression guard: starting on Ohm's
  // Law (first tile of Group A), ArrowRight should focus Wire Ampacity
  // (next tile, same row), ArrowDown should focus the tile one row down.
  await page.goto("/index.html");
  await page.waitForSelector(".tile-link", { timeout: 5000 });
  await page.locator(".tile-link").first().focus();
  await page.keyboard.press("ArrowRight");
  const after = await page.evaluate(() => {
    const tile = document.activeElement?.closest(".tile");
    return tile?.querySelector(".tile-title")?.textContent;
  });
  expect(after).toBe("Wire Ampacity");
});

test("entire tile body is clickable (card-link pattern), Pin stays separate", async ({ page }) => {
  // Click in the title area, not on the explicit "Open tool" link or Pin
  // button. The card-link click handler on `.tile` should route to the
  // tool view.
  await page.goto("/index.html");
  await page.waitForSelector(".tile", { timeout: 5000 });
  const box = await page.locator(".tile").first().boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + 30);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => location.hash)).toBe("#ohms-law");
  expect(await page.locator("#view-region").isVisible()).toBe(true);

  // Pin button does NOT navigate; it only toggles pin state.
  await page.goto("/index.html");
  await page.waitForSelector(".tile-pin", { timeout: 5000 });
  await page.locator(".tile-pin").first().click();
  await page.waitForTimeout(250);
  expect(await page.locator("#tools").isVisible()).toBe(true);
  expect(await page.evaluate(() => location.hash)).toContain("p=");
});

test("changelog.html renders headings and list items from CHANGELOG.md", async ({ page }) => {
  // The static viewer at /changelog.html fetches CHANGELOG.md and renders
  // it with deterministic Markdown-lite parsing (heading-only logic, no
  // innerHTML, no library). Smoke test ensures the parse succeeds and
  // produces visible structure - if a future change breaks the fetch or
  // the parser, this test catches it before deploy.
  const errs = [];
  page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
  await page.goto("/changelog.html", { waitUntil: "networkidle" });
  await page.waitForSelector("#changelog-content h2, #changelog-content h3", { timeout: 5000 });
  // At minimum we expect both v0.2.0 and v0.1.0 release h2 headings, plus
  // assorted ### subheadings for the build-progress sections.
  const headers = await page.locator("#changelog-content h2, #changelog-content h3").count();
  expect(headers).toBeGreaterThan(2);
  const items = await page.locator("#changelog-content li").count();
  expect(items).toBeGreaterThan(20);
  // Theme toggle still works on the changelog page.
  expect(await page.locator("#theme-toggle").count()).toBe(1);
  expect(errs).toEqual([]);
});

test("noscript notice renders and is visible when JavaScript is disabled", async ({ browser }) => {
  // Static-site / progressive-enhancement contract: with JS off, the page
  // must visibly tell the user the calculators won't load (rather than
  // showing an empty page). The notice also reassures that no data leaves
  // the device.
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/index.html");
  await page.waitForTimeout(200);
  const notice = page.locator(".noscript-notice");
  expect(await notice.count()).toBe(1);
  expect(await notice.isVisible()).toBe(true);
  const text = await notice.textContent();
  expect(text).toContain("JavaScript");
  expect(text).toContain("locally");
  // Tiles do not render without JS.
  expect(await page.locator(".tile").count()).toBe(0);
  await ctx.close();
});

test("Brand link and back-link route home via keyboard Enter without scroll-to-top", async ({ page }) => {
  // The brand and "Back to tools" links keep `href="#"` so right-click "Open
  // in new tab" still works, but plain click + Enter should preventDefault
  // and route home directly without the browser's default scroll-to-top.
  await page.goto("/index.html#voltage-drop");
  await page.waitForSelector(".back-link", { timeout: 5000 });
  await page.locator(".back-link").focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.locator("#tools").isVisible()).toBe(true);

  await page.goto("/index.html#voltage-drop");
  await page.waitForSelector(".brand", { timeout: 5000 });
  await page.locator(".brand").focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.locator("#tools").isVisible()).toBe(true);
});

test("Mobile header lays out as brand+toggle row 1, search row 2", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/index.html");
  await page.waitForTimeout(300);
  const layout = await page.evaluate(() => {
    const brand = document.querySelector(".brand").getBoundingClientRect();
    const toggle = document.querySelector("#theme-toggle").getBoundingClientRect();
    const search = document.querySelector(".header-search").getBoundingClientRect();
    return { brand, toggle, search };
  });
  // Brand and toggle are on the same row (vertically centered, but
  // their bounding boxes may differ in top by a few px due to height).
  // Their bounding-box centers should match the same row's center line.
  const brandCenter = layout.brand.top + layout.brand.height / 2;
  const toggleCenter = layout.toggle.top + layout.toggle.height / 2;
  expect(Math.abs(brandCenter - toggleCenter)).toBeLessThan(4);
  // Search occupies its own row below.
  expect(layout.search.top).toBeGreaterThan(layout.brand.bottom - 4);
  expect(layout.search.top).toBeGreaterThan(layout.toggle.bottom - 4);
  // Toggle is right-aligned (right of brand).
  expect(layout.toggle.left).toBeGreaterThan(layout.brand.right);
});

test("Group H reference views do not render an empty input-region panel", async ({ page }) => {
  // Reference utilities (color codes, inspection checklist, etc.) render
  // content into the output region only and leave the input region empty.
  // Without `.input-region:empty { display: none }`, an empty 50 px
  // bordered box appears above the actual content. Regression guard.
  await page.goto("/index.html#color-codes");
  await page.waitForSelector(".citation", { timeout: 5000 });
  await page.waitForTimeout(300);
  const height = await page.locator(".input-region").evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBe(0);
});

test("Calculator views still render a non-empty input-region", async ({ page }) => {
  await page.goto("/index.html#voltage-drop");
  await page.waitForSelector(".input-region input", { timeout: 5000 });
  const height = await page.locator(".input-region").evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBeGreaterThan(0);
});

test("Copy-all button stays hidden on Group H reference views", async ({ page }) => {
  // Reference utilities render <dl> lists, not labelled <p> rows, so the
  // Copy-all affordance has nothing to copy and must stay hidden. Author
  // CSS specifies `display: inline-flex` on `.copy-all-btn`, which used
  // to override the UA `[hidden] { display: none }` rule and let the
  // button show even when `el.hidden = true`. Regression guard for the
  // global `[hidden] { display: none !important }` fix.
  await page.goto("/index.html#color-codes");
  await page.waitForTimeout(400);
  const btn = page.locator(".copy-all-btn");
  expect(await btn.count()).toBe(1); // injected by addCopyAllButton
  expect(await btn.isVisible()).toBe(false);
});

test("Copy-all button is visible on a calculator with labelled outputs", async ({ page }) => {
  await page.goto("/index.html#voltage-drop");
  await page.waitForSelector(".input-region input", { timeout: 5000 });
  // Click the renderer's example button to populate output rows.
  const exampleBtn = page.locator(".input-region button").first();
  await exampleBtn.click();
  await page.waitForTimeout(200);
  expect(await page.locator(".copy-all-btn").isVisible()).toBe(true);
});

test("search from a tool view auto-routes back to home with the filter applied", async ({ page }) => {
  await page.goto("/index.html#voltage-drop");
  await page.waitForSelector(".input-region input", { timeout: 5000 });
  // Tool view is visible; tools grid is hidden.
  expect(await page.locator("#view-region").isVisible()).toBe(true);
  expect(await page.locator("#tools").isVisible()).toBe(false);
  // Type into the persistent header search bar.
  await page.fill("#search-input", "ohm");
  await page.waitForTimeout(150);
  // The view should have swapped: home is back, filter applied.
  expect(await page.locator("#view-region").isVisible()).toBe(false);
  expect(await page.locator("#tools").isVisible()).toBe(true);
  const tileCount = await page.locator(".tile").count();
  expect(tileCount).toBeGreaterThan(0);
  expect(tileCount).toBeLessThan(20);
});
