// Accessibility tests using Playwright + axe-core.
// Runs in CI; the build fails on any new serious or critical violation.

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// v10 §E.3 a11y parameterized loop covering every TOOLS id.
//
// The prior 27-route curated sample (one tile per group, plus a Group H
// reference subset) is replaced by a build-time parse of the TOOLS array
// in tools-data.js (spec-v17 §H.2 extracted the catalog registry out of
// app.js into a lazy-loaded module). Every tile_id ships with an axe-core
// pass under wcag2a / wcag2aa / wcag22aa. The home view is included as the
// first entry. The list is derived deterministically from tools-data.js so
// a new tile added to TOOLS is automatically covered without a test edit.
//
// The parse is intentionally narrow: it scans the literal `{ id: "..."`
// tokens between the `const TOOLS = [` header and its closing bracket
// (matched as a substring of `export const TOOLS = [`). This avoids
// running the module at test-import time.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APP_JS = readFileSync(join(__dirname, "..", "..", "tools-data.js"), "utf8");
function readToolIdsFromAppJs(src) {
  const start = src.indexOf("const TOOLS = [");
  if (start < 0) throw new Error("a11y.test.js: TOOLS array not found in tools-data.js");
  // Walk forward to the matching closing bracket of the TOOLS array.
  let i = src.indexOf("[", start);
  let depth = 1;
  i++;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === "[") depth++;
    else if (ch === "]") depth--;
    if (depth === 0) break;
    i++;
  }
  const body = src.slice(start, i);
  const ids = [];
  const re = /\{\s*id:\s*"([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(body)) !== null) ids.push(m[1]);
  return ids;
}
const TOOL_IDS = readToolIdsFromAppJs(APP_JS);
const ROUTES = [{ name: "home", hash: "" }].concat(
  TOOL_IDS.map((id) => ({ name: id, hash: id }))
);

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

test("home view has a single, visible h1 (the elevator pitch)", async ({ page }) => {
  await page.goto("/index.html");
  const h1Count = await page.locator("h1").count();
  expect(h1Count).toBe(1);
  expect(await page.locator("h1").first().isVisible()).toBe(true);
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

// Regression: the `?` keyboard-shortcut overlay must be legible in BOTH
// themes. It is built with inline styles in app.js; an earlier revision
// hardcoded a near-white background with no text color, so in the default
// dark theme it rendered light-on-white (contrast ~1:1, unreadable). The
// panel now uses the theme CSS variables (var(--bg-secondary)/var(--fg)),
// so assert the rendered panel clears WCAG AA (4.5:1) in dark and light.
function relLuminance([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrastRatio(rgbA, rgbB) {
  const la = relLuminance(rgbA);
  const lb = relLuminance(rgbB);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
function parseRgb(s) {
  const m = s.match(/(\d+(?:\.\d+)?)/g);
  return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
}
for (const theme of ["dark", "light"]) {
  test(`shortcut overlay panel is legible (WCAG AA) in ${theme} theme`, async ({ page }) => {
    await page.addInitScript((t) => {
      try { localStorage.setItem("rl-theme", t); } catch (e) { /* no-op */ }
    }, theme);
    await page.goto("/index.html");
    await page.waitForTimeout(150);
    await page.keyboard.press("?");
    const panel = page.locator("#shortcut-overlay > div");
    await expect(panel).toBeVisible();
    const { fg, bg } = await panel.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { fg: cs.color, bg: cs.backgroundColor };
    });
    // The panel must paint an opaque, non-transparent background (the bug
    // left it transparent over a white scrim).
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    const ratio = contrastRatio(parseRgb(fg), parseRgb(bg));
    expect(ratio, `overlay text ${fg} on panel ${bg} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });
}

// The `?` overlay is a modal dialog; it must carry aria-modal, trap Tab
// inside itself, and restore focus to its opener on close (ARIA APG modal
// pattern + WCAG 2.4.3). The earlier version set none of these -- Tab fell
// through to the page behind and focus dropped to <body> on close.
test("shortcut overlay manages focus: aria-modal, trap, and restore", async ({ page }) => {
  await page.goto("/index.html");
  await page.waitForTimeout(150);
  const inOverlay = () => page.evaluate(() => {
    const o = document.getElementById("shortcut-overlay");
    return !!(o && o.contains(document.activeElement));
  });

  await page.locator("#theme-toggle").focus();
  await page.keyboard.press("?");
  const overlay = page.locator("#shortcut-overlay");
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveAttribute("aria-modal", "true");
  expect(await inOverlay(), "focus should move into the dialog on open").toBe(true);

  // Tab and Shift+Tab both keep focus inside the dialog.
  await page.keyboard.press("Tab");
  expect(await inOverlay(), "Tab should stay trapped in the dialog").toBe(true);
  await page.keyboard.press("Shift+Tab");
  expect(await inOverlay(), "Shift+Tab should stay trapped in the dialog").toBe(true);

  // Esc closes and returns focus to the element that opened it.
  await page.keyboard.press("Escape");
  await expect(overlay).toHaveCount(0);
  const restored = await page.evaluate(() => document.activeElement && document.activeElement.id);
  expect(restored, "focus should return to the opener (#theme-toggle)").toBe("theme-toggle");
});

test("home search input touch target is at least 48px tall", async ({ page }) => {
  await page.goto("/index.html");
  await page.waitForSelector("#search-input", { timeout: 5000 });
  const dims = await page.locator("#search-input").boundingBox();
  expect(dims.height).toBeGreaterThanOrEqual(48);
});

test("focusing the empty search shows the full catalog dropdown", async ({ page }) => {
  await page.goto("/index.html");
  await page.waitForSelector("#search-input", { timeout: 5000 });
  await page.locator("#search-input").click();
  await page.waitForTimeout(120);
  expect(await page.locator("#search-results").isVisible()).toBe(true);
  // Empty query lists the whole catalog. The count is derived from the
  // TOOLS registry (TOOL_IDS) so it never goes stale when tiles are added.
  expect(await page.locator(".search-result").count()).toBe(TOOL_IDS.length);
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

test("calculator 'Test with example' button meets the 48px touch-target floor", async ({ page }) => {
  // The example button is the primary "show me a worked case" CTA on every
  // tile (ui-fields.attachExampleButton). A bare <button> renders ~22px tall,
  // below the documented 48px floor and WCAG 2.2 SC 2.5.8; the .example-btn
  // class carries the floor. Checked on a representative tile (one shared
  // component, so one render covers the catalog).
  await page.goto("/index.html#voltage-drop");
  await page.waitForSelector(".example-btn", { timeout: 5000 });
  const dims = await page.locator(".example-btn").boundingBox();
  expect(dims.height, "example button height").toBeGreaterThanOrEqual(48);
});

test("search routes on Enter for a partial name match", async ({ page }) => {
  await page.goto("/index.html");
  await page.waitForSelector("#search-input", { timeout: 5000 });
  await page.fill("#search-input", "wire ampac");
  await page.waitForTimeout(120);
  await page.locator("#search-input").press("Enter");
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => location.hash)).toBe("#wire-ampacity");
  expect(await page.locator("#view-region").isVisible()).toBe(true);
});

test("clicking a search result routes to that tool", async ({ page }) => {
  await page.goto("/index.html");
  await page.waitForSelector("#search-input", { timeout: 5000 });
  await page.fill("#search-input", "ohm");
  await page.waitForTimeout(120);
  // First result for "ohm" is Ohm's Law; clicking it routes to the tool.
  await page.locator(".search-result").first().click();
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => location.hash)).toBe("#ohms-law");
  expect(await page.locator("#view-region").isVisible()).toBe(true);
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
  // The search input is static HTML and present even with JS disabled
  // (only the results dropdown / routing needs JS).
  expect(await page.locator("#search-input").count()).toBe(1);
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

test("Mobile header lays out brand and theme toggle on a single row", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/index.html");
  await page.waitForTimeout(300);
  const layout = await page.evaluate(() => {
    const brand = document.querySelector(".brand").getBoundingClientRect();
    const toggle = document.querySelector("#theme-toggle").getBoundingClientRect();
    return { brand, toggle };
  });
  // Brand and toggle share a row (centers align to the same line).
  const brandCenter = layout.brand.top + layout.brand.height / 2;
  const toggleCenter = layout.toggle.top + layout.toggle.height / 2;
  expect(Math.abs(brandCenter - toggleCenter)).toBeLessThan(4);
  // The header no longer carries a search box; the toggle is right-aligned.
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

test("the back-link returns from a tool view to the home hero", async ({ page }) => {
  // Search lives on the home hero (no header search), so returning from a
  // tool view goes through the "Back to tools" link rather than a
  // persistent search box.
  await page.goto("/index.html#voltage-drop");
  await page.waitForSelector(".input-region input", { timeout: 5000 });
  expect(await page.locator("#view-region").isVisible()).toBe(true);
  expect(await page.locator("#tools").isVisible()).toBe(false);
  await page.locator(".back-link").click();
  await page.waitForTimeout(150);
  expect(await page.locator("#tools").isVisible()).toBe(true);
  expect(await page.locator("#view-region").isVisible()).toBe(false);
  expect(await page.locator("#search-input").isVisible()).toBe(true);
});

// spec-v12 §10 mobile sweep: the page never scrolls horizontally at the
// 320 px iPhone-SE floor. The risky surfaces are (a) the home hero +
// browse-by-trade pill list, (b) a wide multi-column data table (loan
// amortization is 5 currency columns whose intrinsic width exceeds 320 px;
// the `.tabular-tool` wrapper owns that scroll so the page does not), and
// (c) a long-string reference view (color codes emits a long <dl>). A
// page-level horizontal scrollbar at this width is the exact regression
// the sweep forbids, so assert documentElement.scrollWidth never exceeds
// the viewport by more than a sub-pixel rounding tolerance.
for (const route of ["", "#loan-amortization", "#macrs-depreciation", "#color-codes", "#rent-vs-buy", "#holding-fuel"]) {
  test(`no page-level horizontal scroll at 320 px on /index.html${route || " (home)"}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(`/index.html${route}`);
    if (route === "#loan-amortization" || route === "#macrs-depreciation") {
      // Populate the schedule table via the renderer's example button so the
      // widest surface (the full multi-column <table>) is in the DOM. The
      // MACRS 5-column schedule regressed before its <div> was given the
      // `.tabular-tool` wrapper that owns the horizontal scroll; this guards it.
      await page.waitForSelector(".input-region button", { timeout: 5000 });
      await page.locator(".input-region button").first().click();
      await page.waitForSelector(".tabular-tool table", { timeout: 5000 });
    } else if (route === "#rent-vs-buy" || route === "#holding-fuel") {
      // Populate outputs via the example button: the rent-vs-buy verdict
      // and net-sale lines are the longest single-line strings the v17
      // batch adds, the surface most likely to force a horizontal scroll.
      await page.waitForSelector(".input-region button", { timeout: 5000 });
      await page.locator(".input-region button").first().click();
      await page.waitForTimeout(120);
    } else if (route === "#color-codes") {
      await page.waitForSelector(".citation", { timeout: 5000 });
    }
    await page.waitForTimeout(200);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
    });
    // Allow a 1 px sub-pixel rounding slack; anything wider is a real
    // horizontal-scroll regression.
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });
}
