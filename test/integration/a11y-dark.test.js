// The axe sweep, in the other colour scheme.
//
// `a11y.test.js` runs axe over all 1,804 SPA routes and `shell-a11y.test.js`
// over every static page shape -- both in whatever scheme Playwright defaults
// to, which is light. Colour contrast is one of the things axe checks, and this
// site ships two palettes; until 2026-09-02 nothing had ever run a contrast
// check against the dark one.
//
// That axis produced two real defects the same day. The 1,826 prerendered pages
// ignored `prefers-color-scheme` entirely and rendered dark for every reader,
// and printing a calculator with the dark theme active put the answer in white
// on white paper -- both invisible to suites that only ever saw one scheme.
//
// Deliberately a SAMPLE, not a second full sweep. The full pass is 1,875 tests
// and roughly 27 minutes; the palettes are two token sets shared by every page,
// so a violation in one is a violation in all of that page's shape. What is
// needed is one of each shape, which is what this is: the SPA home, the catalog
// hub, the not-found page, a group hub, a calculator shell, a reference shell
// with no worked example, and four tile views including a filled one, a
// worker-backed one, and one whose answer is a table.
//
// Named `a11y:` so it runs in the accessibility job with the rest of the axe
// work rather than lengthening the integration job.

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ROUTES = [
  ["/", "the SPA home"],
  ["/tools/", "the catalog hub"],
  ["/404.html", "the not-found page"],
  ["/groups/electrical/", "a group hub"],
  ["/tools/ohms-law/", "a calculator shell"],
  ["/tools/osha-top10/", "a reference shell, no worked example"],
  ["/#ohms-law", "a tile view, empty"],
  ["/#voltage-drop?v=1&vd-phase=single&vd-mat=copper&vd-awg=12&vd-len=150&vd-cur=20&vd-src=240", "a tile view, answered"],
  ["/#manual-j-cooling", "a worker-backed tile view"],
  ["/#loan-payment", "a tile view whose answer is a table"],
];

test.describe("dark scheme", () => {
  test.use({ colorScheme: "dark" });

  for (const [url, why] of ROUTES) {
    test(`a11y: dark scheme ${url} (${why})`, async ({ page }) => {
      test.slow();                       // an axe pass plus a two-stage render
      const response = await page.goto(url);
      // A route that 404s would sweep an error page clean.
      expect(response.status(), `${url} did not serve`).toBeLessThan(400);
      // A tile view builds in two passes; give the renderer its turn before
      // asking axe what the reader can see. Wait on a FIELD, not on the output
      // region: an unanswered tile keeps that region hidden on purpose
      // (`output-blank`), so waiting for it to be visible never returns.
      if (url.includes("#")) await page.waitForSelector(".input-region .field", { timeout: 30_000 });
      // NOT `data-theme="dark"`: the prerendered pages load no script, so
      // nothing ever sets that attribute on them -- they render dark through
      // the prefers-color-scheme block, which is exactly the mechanism this
      // sweep exists to cover. Assert the thing that is true on both surfaces:
      // the page really is painting the dark palette.
      const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const mean = ((/^rgba?\((\d+), (\d+), (\d+)/.exec(bodyBg) || []).slice(1, 4).reduce((a, b) => a + Number(b), 0)) / 3;
      expect(mean, `${url} is not rendering the dark palette (body ${bodyBg})`).toBeLessThan(60);

      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
      const seriousOrCritical = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(seriousOrCritical, JSON.stringify(seriousOrCritical, null, 2)).toEqual([]);
    });
  }
});
