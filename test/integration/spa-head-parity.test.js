// One tile, two surfaces, one canonical URL: the prerendered shell at
// /tools/<id>/ and the SPA route /#<id>, whose <head> app.js rewrites on every
// navigation. app.js has claimed since spec-v13 §5.5 that the SPA sets those
// tags "to match the per-tile shell". Measured 2026-09-01 it did not: 1,396 of
// 1,804 titles and 1,685 of 1,804 descriptions differed, because the SPA wrote
// `name + " - Rough Logic"` and the raw `desc` while the shell wrote the
// profession noun, the reference tail, and both spec caps.
//
// The reason it survived is the reason the home page carried the same defect
// hours earlier: check-shells reads dist/tools/<id>/index.html, a FILE, and
// nothing read the running page. So this spec is deliberately a browser spec.
// It loads the SPA route, reads the head out of the live DOM after app.js has
// written it, fetches the shell for the same tile, and asserts the three tags
// are identical strings.
//
// Sampled, not catalog-wide: the strings themselves are pinned for all 1,804
// tiles by test/unit/shell-meta.test.js, which calls the shared module. What a
// browser adds, and only a browser can, is that app.js ACTUALLY CALLS IT. The
// routes below cover the shapes that differ from each other -- a short title,
// a title long enough to drop the profession noun, one long enough to be
// truncated, a description short enough to keep the tail, one long enough to
// lose it, and an apostrophe that escapes to more characters than it occupies.

import { test, expect } from "@playwright/test";

const ROUTES = [
  "ohms-law",
  "wire-ampacity",
  "voltage-drop",
  "awg-wire-geometry",
  "manual-j-cooling",
  "duct-sizing",
  "lumber-spans",
  "stairs",
  "required-fire-flow",
  "septic-tank",
  "loan-payment",
  "joist-deflection",
];

function tagsFromHtml(html) {
  const title = /<title>([^<]*)<\/title>/.exec(html);
  const desc = /<meta name="description" content="([^"]*)"/.exec(html);
  const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html);
  return {
    title: title && title[1],
    description: desc && desc[1],
    canonical: canonical && canonical[1],
  };
}

// The shell stores these HTML-escaped inside an attribute; the SPA sets them
// through the DOM, which returns them decoded. Compare on the decoded side.
function unescapeHtml(s) {
  return s === null || s === undefined
    ? s
    : s
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
}

for (const id of ROUTES) {
  test("spa-head-parity: /#" + id + " sets the same title, description and canonical as its shell", async ({ page, request }) => {
    const res = await request.get("/tools/" + id + "/");
    expect(res.ok(), "shell /tools/" + id + "/ should exist").toBeTruthy();
    const shell = tagsFromHtml(await res.text());
    expect(shell.title, "shell has a <title>").toBeTruthy();
    expect(shell.description, "shell has a meta description").toBeTruthy();
    expect(shell.canonical, "shell has a canonical link").toBeTruthy();

    await page.goto("/#" + id);
    // The head is written after the shared module resolves, so wait on the
    // value rather than reading once and racing the dynamic import.
    await expect
      .poll(() => page.title(), { timeout: 10_000 })
      .toBe(unescapeHtml(shell.title));

    const live = await page.evaluate(() => ({
      description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null,
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
    }));
    expect(live.description).toBe(unescapeHtml(shell.description));
    expect(live.canonical).toBe(unescapeHtml(shell.canonical));
  });
}

// Leaving a tile must put the home values back, not strand the tile's. The
// home strings are pinned against index.html by check-readme-counts; what is
// checked here is that the revert happens at all.
test("spa-head-parity: returning home restores the home title and description", async ({ page, request }) => {
  const home = tagsFromHtml(await (await request.get("/")).text());
  await page.goto("/#ohms-law");
  await expect.poll(() => page.title(), { timeout: 10_000 }).not.toBe(unescapeHtml(home.title));
  await page.goto("/#home");
  await expect.poll(() => page.title(), { timeout: 10_000 }).toBe(unescapeHtml(home.title));
  const desc = await page.evaluate(() =>
    document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null,
  );
  expect(desc).toBe(unescapeHtml(home.description));
});
