// The readable type floor, enforced instead of assumed.
//
// The 2026-08-18 pass raised every rule in styles.css to a floor of 1rem for
// reading text and controls and 0.9375rem for meta, but shipped no gate. A
// control with no font-size rule at all therefore stayed invisible to review:
// `.view-copy-reference` inside the proof block carried only a margin and a
// min-height, so it rendered at the browser's default 13.3 px button face on
// all 1,709 tiles, and nothing caught it.
//
// This sweeps the live app (every <details> forced open, so the collapsed
// proof and detail blocks are measured too), the home document, and one
// prerendered tile and group shell, and fails on any VISIBLE element that owns
// text and renders below the floor.

import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const READING_FLOOR_PX = 16;      // 1rem: anything a person reads, and every control
const META_FLOOR_PX = 15;         // 0.9375rem: footer, source stamps, section eyebrows

// Deliberate meta-scale elements. Each is a label ABOUT the content rather
// than the content, and each is pinned at the 0.9375rem meta floor -- not
// below it. Add to this list only with a reason, never to silence a finding.
const META = new Set([
  "p.data-source-stamp",          // "Source: NOAA ..., version ..., fetched ..."
]);

const rows = JSON.parse(readFileSync(new URL("../fixtures/worked-examples.json", import.meta.url), "utf8")).rows;
const ids = [...new Set(rows.map((r) => r.tile_id))];
const step = Math.max(1, Math.floor(ids.length / 60));
const SAMPLE = ids.filter((_, i) => i % step === 0);

function probe() {
  const out = [];
  for (const el of document.body.querySelectorAll("*")) {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") continue;
    if (!el.getClientRects().length) continue;
    const owns = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!owns) continue;
    const px = parseFloat(s.fontSize);
    if (px >= 16) continue;
    const cls = (el.getAttribute("class") || "").split(" ")[0];
    // The site footer is chrome, not content: it is meta by position, and its
    // spans carry no class to name.
    const meta = !!el.closest(".site-footer, .shell-footer, footer");
    out.push({ px, meta, sel: el.tagName.toLowerCase() + "." + cls, text: el.textContent.trim().slice(0, 60) });
  }
  return out;
}

function judge(found, where, bad) {
  for (const f of found) {
    const floor = (f.meta || META.has(f.sel)) ? META_FLOOR_PX : READING_FLOOR_PX;
    if (f.px < floor) bad.push(`${where}: ${f.sel} at ${f.px}px (floor ${floor}px) -- "${f.text}"`);
  }
}

test("a11y: every visible element meets the readable type floor", async ({ page }) => {
  test.setTimeout(300000);
  const bad = [];
  await page.setViewportSize({ width: 390, height: 844 });

  for (const [url, label] of [["/", "home"], ["/tools/ohms-law/", "tile shell"], ["/groups/electrical/", "group shell"]]) {
    await page.goto(url);
    await page.evaluate(() => { for (const d of document.querySelectorAll("details")) d.open = true; });
    judge(await page.evaluate(probe), label, bad);
  }

  await page.goto("/");
  for (const id of SAMPLE) {
    await page.evaluate(() => { location.hash = ""; });
    await page.evaluate((h) => { location.hash = h; }, id);
    await page.waitForTimeout(140);
    // The proof and detail blocks are the reason this gate exists: they hold
    // the citation, the reference rows, and the copy-with-sources button, and
    // a closed <details> hides all of it from a naive sweep.
    await page.evaluate(() => { for (const d of document.querySelectorAll("details")) d.open = true; });
    judge(await page.evaluate(probe), "live #" + id, bad);
  }

  expect(bad.join("\n")).toBe("");
});
