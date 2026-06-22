// Responsive-stress gate (SPA surface). The standing mobile sweep
// (a11y.test.js, spec-v12 §10) asserts zero page-level horizontal scroll at a
// 320 px *viewport* -- which also covers WCAG 2.2 1.4.10 Reflow (content at
// 400% page zoom on a 1280 px window resolves to a 320 CSS-px viewport). This
// file extends that guarantee for the interactive SPA to the two responsive
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
// SCOPE: SPA routes only. The integration webServer serves the repo root, where
// the prerendered /tools/ and /groups/ shells do NOT exist (they live in dist/),
// so navigating to them here would 404 -- and a 404 page trivially does not
// scroll, which would be a false pass. The prerendered shells are audited on
// these same axes by scripts/check-shell-mobile.mjs, which serves dist/.
//
// The contract is identical everywhere: documentElement.scrollWidth never
// exceeds clientWidth by more than a sub-pixel rounding tolerance, so every
// view scrolls only vertically on every device class.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Every TOOLS tile id, parsed from tools-data.js with the same narrow,
// run-free scan a11y.test.js uses (scan the `{ id: "..."` tokens between the
// `const TOOLS = [` header and its matching close bracket) so a new tile is
// swept automatically without a test edit.
const __dirname = dirname(fileURLToPath(import.meta.url));
function readToolIds() {
  const src = readFileSync(join(__dirname, "..", "..", "tools-data.js"), "utf8");
  const start = src.indexOf("const TOOLS = [");
  if (start < 0) throw new Error("responsive-stress: TOOLS array not found in tools-data.js");
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
const TOOL_IDS = readToolIds();

// Diverse SPA surfaces: home hero + browse list, a phasor-diagram calculator,
// the two widest multi-column schedules, the longest reference <dl>, a
// select-heavy tile, and the longest-output finance tiles.
const SPA_ROUTES = [
  "", "#voltage-drop", "#loan-amortization", "#macrs-depreciation",
  "#color-codes", "#hos-math", "#rent-vs-buy", "#duct-sizing",
];

async function gotoOk(page, path) {
  // Guard against a server misconfig silently serving a (scroll-free) error
  // page: every SPA route is /index.html, which must return a 2xx.
  const resp = await page.goto(path);
  expect(resp && resp.ok(), `${path}: navigation did not return a 2xx`).toBeTruthy();
}

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
      await gotoOk(page, `/index.html${route}`);
      await populateExample(page, route);
      await assertNoHScroll(page, `text-200% ${route || "home"}`);
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
        await gotoOk(page, `/index.html${route}`);
        await populateExample(page, route);
        await assertNoHScroll(page, `${vp.name} ${route || "home"}`);
      });
    }
  }
});

// Exhaustive live-SPA mobile gate: EVERY TOOLS tile's interactive view --
// input grid plus its populated "Test with example" output -- must not scroll
// the page sideways at the 320 px iPhone-SE floor. The a11y.test.js 320 px
// block covers six representative routes and axe-core visits every tile, but
// axe does not assert horizontal scroll; scripts/check-shell-mobile.mjs sweeps
// every tile *shell* but those are the static prerendered landing pages, which
// do not contain the live calculator's wide output tables (loan/MACRS/IFTA
// schedules, reference <dl>s, multi-method comparison rows). Those tables are
// exactly where a sideways scrollbar reappears, so this closes the gap by
// driving every live view on the phone floor. The page is loaded once and
// each tile is reached by setting location.hash (the app re-renders on the
// hashchange the same way a user navigating between tiles does); a per-tile
// page.goto would be a no-op reload anyway, since same-document hash nav does
// not refetch index.html.
//
// Runtime scales with the catalog (~70 ms of settle per tile x the full
// TOOL_IDS list); on the shared 2-core CI runner the WebKit pass takes well
// over 2 min and keeps growing as tiles are added. `test.slow()` only triples
// the 30 s base timeout to 90 s -- below this test's own documented runtime --
// so it had been surviving on retries until the catalog crossed the ceiling
// and exhausted all three attempts. Pin an explicit timeout with headroom for
// further growth instead; per-engine workers run chromium + webkit-responsive
// in parallel, so this does not serialize the rest of the suite.
test("every live tile view: no page-level horizontal scroll at 320 px", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 320, height: 720 });
  await gotoOk(page, "/index.html");
  const offenders = [];
  for (const id of TOOL_IDS) {
    await page.evaluate((h) => { window.location.hash = h; }, id);
    await page.waitForFunction((h) => location.hash === `#${h}`, id).catch(() => {});
    await page.waitForTimeout(30);
    const btn = await page.$(".input-region button");
    if (btn) { await btn.click().catch(() => {}); await page.waitForTimeout(40); }
    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }));
    if (m.sw > m.cw + 1) offenders.push(`${id} (scrollWidth ${m.sw} > clientWidth ${m.cw})`);
  }
  expect(
    offenders,
    `live tile views scrolling horizontally at 320 px:\n${offenders.join("\n")}`,
  ).toEqual([]);
});
