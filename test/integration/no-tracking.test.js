// The site's central promise, measured on the running page.
//
// The README says "No account, no email, and no tracking"; docs/hash-state.md
// says the URL fragment is "the only state mechanism the site uses. There is
// no localStorage, no sessionStorage, no cookies, no IndexedDB beyond
// `rl-theme`"; docs/threat-model.md pins the headers. `check-csp` holds the
// policy that would *block* a third-party request, and nothing checked whether
// the page actually stores or fetches anything.
//
// A policy and a behaviour are two different claims. A same-origin request to
// an analytics path, a cookie set by something added later, a library that
// opens an IndexedDB on import -- none of those are CSP violations, and all of
// them break the promise a reader is trusting. So this spec drives real
// journeys, then reads what the browser was left holding.
//
// The one permitted key is `rl-theme`, written only when the reader toggles
// the theme (the system-preference path persists nothing). Turnstile is the
// one third-party origin the CSP allows, and it loads only after the problem-
// report dialog is opened, which these journeys deliberately do not do.

import { test, expect } from "@playwright/test";

const ALLOWED_LOCAL_STORAGE_KEYS = ["rl-theme"];

// Every journey a reader takes that does not open the report dialog.
async function walkTheSite(page) {
  await page.goto("/");
  await page.waitForTimeout(400);

  // Search: the one interaction that fetches data shards.
  const search = page.locator("#search-input");
  if (await search.count()) {
    await search.fill("voltage drop 120v 150 ft");
    await page.waitForTimeout(1200);
    await search.fill("");
  }

  // A calculator, typed into.
  await page.goto("/#voltage-drop");
  await page.waitForSelector(".input-region .field", { timeout: 15_000 });
  await page.fill("#vd-len", "150").catch(() => {});
  await page.fill("#vd-cur", "20").catch(() => {});
  await page.waitForTimeout(600);

  // A calculator opened with its worked example.
  await page.goto("/#ohms-law?example=1");
  await page.waitForTimeout(800);

  // The prerendered surfaces.
  await page.goto("/tools/ohms-law/");
  await page.goto("/groups/electrical/");
  await page.goto("/tools/");
  await page.goto("/404.html");
}

test("no-tracking: a full journey leaves no cookie, no session storage and no database", async ({ page, context }) => {
  await walkTheSite(page);

  const stored = await page.evaluate(async () => {
    let databases = [];
    try { databases = (await indexedDB.databases()).map((d) => d.name); } catch { /* not supported */ }
    return {
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage),
      databases,
      documentCookie: document.cookie,
    };
  });

  expect(await context.cookies(), "the site set a cookie").toEqual([]);
  expect(stored.documentCookie, "the site set a cookie readable from script").toBe("");
  expect(stored.sessionStorage, "the site wrote sessionStorage").toEqual([]);
  expect(stored.databases, "the site opened an IndexedDB database").toEqual([]);
  const unexpected = stored.localStorage.filter((k) => !ALLOWED_LOCAL_STORAGE_KEYS.includes(k));
  expect(unexpected, `unexpected localStorage key(s): ${unexpected.join(", ")}`).toEqual([]);
});

test("no-tracking: only the theme toggle writes storage, and only its own key", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => Object.keys(localStorage));
  expect(before, "the home view persisted something before any interaction").toEqual([]);

  const toggle = page.locator('button[aria-label^="Switch to"]');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await page.waitForTimeout(300);

  const after = await page.evaluate(() => Object.keys(localStorage));
  expect(after).toEqual(["rl-theme"]);
});

test("no-tracking: every request the page makes goes to this origin", async ({ page }) => {
  const foreign = new Set();
  page.on("request", (r) => {
    const url = r.url();
    if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("about:")) return;
    if (!url.startsWith("http://localhost:8080/")) foreign.add(new URL(url).origin + new URL(url).pathname);
  });

  await walkTheSite(page);

  // CSP `connect-src 'self'` would block a fetch, but not a same-origin
  // beacon path, and `check-csp` reads the policy rather than the traffic.
  // This is the traffic.
  expect([...foreign], `the page requested a foreign origin: ${[...foreign].join(", ")}`).toEqual([]);
});
