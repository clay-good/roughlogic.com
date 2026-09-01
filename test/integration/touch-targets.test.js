// docs/accessibility.md promises "touch targets at least 48 by 48 pixels
// (slightly larger than the WCAG minimum of 44) for gloved-hand operation."
// Nothing measured them. Measured on 2026-09-02 at a 390 px phone viewport:
// every text field was 46, the footer badges 46, the header wordmark 36, the
// catalog page's group headings 38, and a shell's breadcrumb link 18.
//
// axe-core sweeps all 1,804 routes and does not cover this: SC 2.5.8 (Target
// Size (Minimum), AA in WCAG 2.2) carries an inline exception and a spacing
// exception that a static rule cannot decide, so axe leaves it alone. A promise
// with no measurement is how 46 px sat under a stated 48 px floor.
//
// Two floors, because they are two different promises:
//
//   48 px -- the site's own, stricter than WCAG on purpose, on the controls a
//            reader operates to do the work: fields, buttons, and the primary
//            navigation links styled as controls.
//   24 px -- WCAG 2.2 SC 2.5.8, on every other target, EXCEPT a link sitting
//            inside a sentence, which the success criterion exempts by name
//            (its size is set by the prose around it and cannot be changed
//            without changing the text).
//
// Both surfaces are swept: SPA routes and prerendered shells, which share one
// stylesheet but not one set of markup.

import { test, expect } from "@playwright/test";

const PHONE = { width: 390, height: 844 };

const SPA_ROUTES = ["", "#ohms-law", "#voltage-drop", "#lumber-spans", "#manual-j-cooling", "#loan-payment"];
const SHELL_ROUTES = ["tools/ohms-law/", "tools/lumber-spans/", "tools/osha-top10/", "groups/electrical/", "tools/", "404.html"];

// The selectors that take the site's own 48 px floor.
const OPERABLE = [
  'input:not([type="hidden"]):not([type="checkbox"])',
  "select",
  "textarea",
  "button",
  '[role="button"]',
  "summary",
  ".footer-badge",
  ".brand",
  ".shell-run-link",
  ".ti-hub",
].join(", ");

function measureUndersized(operableSelector) {
  const isInline = (el) => {
    // SC 2.5.8's inline exception: a link whose size is determined by the
    // sentence it sits in. The test is its parent -- a paragraph, a list item
    // of prose, a table cell -- carrying text of its own beside the link.
    if (el.tagName !== "A") return false;
    const p = el.parentElement;
    if (!p) return false;
    if (!/^(P|LI|TD|SPAN|SMALL|DD|DT|FIGCAPTION)$/.test(p.tagName)) return false;
    return (p.textContent || "").trim().length > (el.textContent || "").trim().length;
  };
  const all = document.querySelectorAll(
    'a, button, input:not([type="hidden"]), select, textarea, summary, [role="button"]',
  );
  const out = [];
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none") continue;
    if (isInline(el)) continue;
    const floor = el.matches(operableSelector) ? 48 : 24;
    if (r.width + 0.5 < floor || r.height + 0.5 < floor) {
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className || "").slice(0, 40),
        text: (el.textContent || el.value || "").trim().slice(0, 40),
        w: Math.round(r.width),
        h: Math.round(r.height),
        floor,
      });
    }
  }
  return out;
}

for (const route of SPA_ROUTES) {
  test("a11y: touch targets meet their floor on the live view /" + (route || "(home)"), async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/" + route);
    // A tile route builds in two passes; the fields arrive with the renderer.
    if (route) await page.waitForSelector(".input-region .field, .output-region .out-value, .shell-io", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(500);
    const undersized = await page.evaluate(measureUndersized, OPERABLE);
    expect(undersized, JSON.stringify(undersized, null, 1)).toEqual([]);
  });
}

for (const route of SHELL_ROUTES) {
  test("a11y: touch targets meet their floor on the static page /" + route, async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/" + route);
    const undersized = await page.evaluate(measureUndersized, OPERABLE);
    expect(undersized, JSON.stringify(undersized, null, 1)).toEqual([]);
  });
}
