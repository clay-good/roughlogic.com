// v10 Phase H.3 first-paint timing audit (spec-v10.md §10.3).
//
// Loads the home view through Chrome DevTools Protocol's network and
// CPU throttling, captures Web Vitals via the Performance API, and
// asserts the four spec targets:
//
//   - First Contentful Paint (FCP)        <  1.5 s
//   - Largest Contentful Paint (LCP)      <  2.5 s
//   - Total Blocking Time (TBT)           <  200 ms
//   - Cumulative Layout Shift (CLS)       <  0.05
//
// "Slow-3G" profile per Chrome DevTools defaults: 500 kbit/s down,
// 500 kbit/s up, 400 ms RTT, 4x CPU slowdown. The site is static and
// tiny; these targets are achievable.
//
// CI-only. Local dev does not require Playwright; `npm test` only runs
// unit tests.
//
// Three-tier failure policy.
//
//   1. Advisory targets (FCP < 1.5s, LCP < 2.5s, TBT < 200ms, CLS < 0.05).
//      Logged + warned without failing the build. These are the spec's
//      absolute targets; slow-3G + 4x CPU throttle frequently misses them
//      even on a healthy build, so warn-only is the right gate.
//
//   2. Soft 10% regression check against test/perf-baseline.json (added
//      2026-05-12 as the v10 §H.3 follow-up). Each metric is compared
//      against the checked-in baseline; a delta above the tolerance is
//      warned in the CI log with the absolute delta and the percent.
//      Warn-only because slow-3G CPU-throttled environments have
//      inherent run-to-run jitter; the signal value is "is this a
//      drift trend across releases?" not "block this commit."
//
//   3. Hard-fail thresholds (~4-5x the advisory target). Egregious
//      values that signal a real regression rather than a slow-3G
//      artifact (e.g. LCP > 10s on a static page is broken). These
//      fail the build.
//
// Prerendered shells (added 2026-08-29). Until then this file measured the
// home view and nothing else, so the deep-linked and crawled surface -- the
// static /tools/<id>/ and /groups/<slug>/ documents -- was measured by
// nothing at all. That was invisible while Lighthouse CI ran, because
// lighthouserc.json checked exactly those URLs; the job was removed on
// 2026-08-23 over an unpatched @lhci/cli advisory (see docs/performance.md)
// and the coverage went with it. The three URLs below are the ones that
// config named, so what this restores is the coverage that was lost rather
// than a budget invented here.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { test, expect } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BASELINE = JSON.parse(
  readFileSync(join(__dirname, "..", "perf-baseline.json"), "utf8")
);

// Slow-3G CDP profile (matches Chrome DevTools "Slow 3G" preset).
const NET = {
  offline: false,
  downloadThroughput: (500 * 1024) / 8,
  uploadThroughput: (500 * 1024) / 8,
  latency: 400,
};
const CPU_THROTTLE = 4;

// Spec targets (advisory; logged + asserted as warnings).
const TARGETS = {
  fcp_ms: 1500,
  lcp_ms: 2500,
  tbt_ms: 200,
  cls: 0.05,
};

// Hard-fail thresholds (egregious values that signal real regressions
// rather than slow-3G CPU-throttle artifacts; ~4-5x the spec target).
const HARD_FAIL = {
  fcp_ms: 5000,
  lcp_ms: 10000,
  tbt_ms: 1000,
  cls: 0.25,
};

async function captureVitals(page) {
  // The CRUX-style observer collects FCP / LCP / CLS. TBT is computed
  // by counting long-task durations over 50 ms.
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      const out = { fcp_ms: null, lcp_ms: null, tbt_ms: 0, cls: 0 };
      // FCP from PerformancePaintTiming.
      const paintEntries = performance.getEntriesByType("paint");
      for (const e of paintEntries) {
        if (e.name === "first-contentful-paint") out.fcp_ms = e.startTime;
      }
      // LCP via PerformanceObserver.
      let lcp = 0;
      try {
        const lcpObs = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) lcp = Math.max(lcp, e.startTime);
        });
        lcpObs.observe({ type: "largest-contentful-paint", buffered: true });
      } catch { /* unsupported */ }
      // CLS via PerformanceObserver (excluding entries with hadRecentInput).
      let cls = 0;
      try {
        const clsObs = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (!e.hadRecentInput) cls += e.value;
          }
        });
        clsObs.observe({ type: "layout-shift", buffered: true });
      } catch { /* unsupported */ }
      // TBT via PerformanceObserver: sum of (long-task duration - 50 ms).
      let tbt = 0;
      try {
        const ltObs = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) tbt += Math.max(0, e.duration - 50);
        });
        ltObs.observe({ type: "longtask", buffered: true });
      } catch { /* unsupported */ }
      // Settle for one second so observers flush their buffered entries.
      setTimeout(() => {
        out.lcp_ms = lcp || out.fcp_ms; // fall back to FCP if no LCP entry
        out.cls = cls;
        out.tbt_ms = tbt;
        resolve(out);
      }, 1000);
    });
  });
}

test("perf: home view meets FCP / LCP / TBT / CLS budgets on slow-3G", async ({ page, browser }) => {
  // Throttle network and CPU via CDP for Chromium-based engines.
  // (Webkit / Firefox lack equivalent CDP hooks; this test is gated
  // to Chromium in playwright.config.js when the suite is expanded
  // beyond the default project.)
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", NET);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });

  await p.goto("/index.html", { waitUntil: "networkidle" });

  const v = await captureVitals(p);

  // Annotate the run for the CI log; warn on any spec-target overrun
  // without failing the build.
  console.log("perf vitals (home / slow-3G):", JSON.stringify(v));
  for (const [k, t] of Object.entries(TARGETS)) {
    if (v[k] > t) console.warn("perf WARN: " + k + " " + v[k] + " over advisory target " + t);
  }

  // Soft regression check against test/perf-baseline.json. Warns on any
  // metric that exceeds (baseline * (1 + tolerance_pct/100)); does not
  // fail the build (slow-3G CPU-throttled jitter would flake hard-fail).
  const tol = (BASELINE.tolerance_pct || 10) / 100;
  for (const [k, base] of Object.entries(BASELINE.metrics || {})) {
    const cur = v[k];
    if (cur == null || base == null) continue;
    const limit = base * (1 + tol);
    if (cur > limit) {
      const deltaPct = ((cur - base) / base) * 100;
      console.warn(
        "perf REGRESSION: " + k + " " + cur.toFixed(3) +
        " over baseline " + base + " by " + deltaPct.toFixed(1) + "% (tolerance " +
        (tol * 100).toFixed(0) + "%)"
      );
    }
  }

  // Hard-fail only on egregious values; ~4-5x the advisory target.
  expect(v.fcp_ms, "FCP exceeded hard-fail threshold").toBeLessThan(HARD_FAIL.fcp_ms);
  expect(v.lcp_ms, "LCP exceeded hard-fail threshold").toBeLessThan(HARD_FAIL.lcp_ms);
  expect(v.tbt_ms, "TBT exceeded hard-fail threshold").toBeLessThan(HARD_FAIL.tbt_ms);
  expect(v.cls, "CLS exceeded hard-fail threshold").toBeLessThan(HARD_FAIL.cls);

  await ctx.close();
});

// --- Prerendered shells ---
//
// Mirrors the URL set lighthouserc.json asserted before the Lighthouse job was
// removed: one tile shell from a v1 calculator, one from a lazy-loaded module,
// and one group index. These are zero-JS static documents, so their paint is
// dominated by the profile's 400 ms RTT rather than by anything on the page --
// which is why the thresholds here are not the tight numbers lighthouserc.json
// used (those were a desktop preset on a 1.6 Mbit link, not slow-3G).
//
// Thresholds come from measurement, not from a target someone liked. Measured
// 2026-08-29 under this profile: run in isolation these shells are remarkably
// stable -- seven runs each gave FCP 1,856-1,864 ms for both tile shells and
// 2,708-2,716 ms for the group index, TBT and CLS zero throughout. Run inside
// the suite the same tile shell came back at 2,628 ms, so the variance that
// matters is harness contention, not the page. Advisory is set above the worst
// in-suite reading rather than above the tidy isolated median, because an
// advisory that cries wolf on harness noise is one people learn to scroll past.
// The hard tier sits at roughly double that: "the document did not arrive"
// territory, not "the page got a little heavier".
const SHELLS = [
  { url: "/tools/wire-ampacity/", label: "tile shell (v1 calculator)", advisory_ms: 3200, hard_ms: 5000 },
  { url: "/tools/friction-loss/", label: "tile shell (lazy-loaded module)", advisory_ms: 3200, hard_ms: 5000 },
  { url: "/groups/electrical/", label: "group index", advisory_ms: 3800, hard_ms: 6500 },
];

// No TBT assertion here, deliberately. The obvious one to write is "a shell
// runs no script, so TBT must be zero" -- but seeding a 600 ms blocking script
// into a built shell and re-running this file left TBT at 0, because a
// parser-blocking script that runs before captureVitals registers its observer
// is never attributed as a long task. The assertion would have passed while the
// page it describes was broken. Script on a shell is check-shells' rule, and
// that one does fail on the same seed: "carries an executable <script>. Shells
// ship zero JavaScript".
const SHELL_CLS_ADVISORY = 0.05;
const SHELL_CLS_HARD = 0.25;

for (const shell of SHELLS) {
  test(`perf: ${shell.url} meets shell paint budgets on slow-3G`, async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", NET);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });

    await p.goto(shell.url, { waitUntil: "networkidle" });
    const v = await captureVitals(p);

    console.log(`perf vitals (${shell.label} ${shell.url} / slow-3G):`, JSON.stringify(v));

    // Advisory tier: warn, do not fail. Same policy as the home view.
    if (v.fcp_ms > shell.advisory_ms) {
      console.warn(`perf WARN: ${shell.url} FCP ${v.fcp_ms} over advisory ${shell.advisory_ms}`);
    }
    if (v.lcp_ms > shell.advisory_ms) {
      console.warn(`perf WARN: ${shell.url} LCP ${v.lcp_ms} over advisory ${shell.advisory_ms}`);
    }
    if (v.cls > SHELL_CLS_ADVISORY) {
      console.warn(`perf WARN: ${shell.url} CLS ${v.cls} over advisory ${SHELL_CLS_ADVISORY}`);
    }

    // Hard tier.
    expect(v.fcp_ms, `${shell.url} FCP exceeded hard-fail threshold`).toBeLessThan(shell.hard_ms);
    expect(v.lcp_ms, `${shell.url} LCP exceeded hard-fail threshold`).toBeLessThan(shell.hard_ms);
    expect(v.cls, `${shell.url} CLS exceeded hard-fail threshold`).toBeLessThan(SHELL_CLS_HARD);

    await ctx.close();
  });
}

// --- SPA tile routes ---
//
// The hash routes a reader reaches from search and from a shared link. Neither
// the home-view test nor the shell tests covered them, and that hid a real
// defect: a tile view builds in two passes (title and lead synchronously, then
// fields and answer once the renderer module resolves), so the footer sat high
// and got shoved down when the calculator arrived. Measured CLS on slow-3G was
// 0.173 / 0.180 / 0.247 for the three routes below -- against a 0.05 budget,
// with 0.25 the Core Web Vitals "poor" line. Reserving the page height for the
// duration of a tool route (applyRoute + the html[data-route="tool"] rule in
// styles.css) took them to 0.056 / 0.060 / 0.101.
//
// The CLS thresholds are deliberately set between those two ranges. A hard tier
// at 0.25 would have sat above the defect it exists to catch, which is a
// threshold that looks like a gate and is not one; 0.15 is above the worst
// measured value today and below the best value before the fix, so the
// regression that motivated this test would fail it.
const SPA_ROUTES = [
  { url: "/index.html#wire-ampacity", label: "v1 calculator" },
  { url: "/index.html#friction-loss", label: "lazy-loaded module" },
  { url: "/index.html#manual-j-cooling", label: "Web Worker tile" },
];
// These run on the faster profile lighthouserc.json used (1,638 kbps / 150 ms
// RTT, same 4x CPU throttle), not slow-3G. The shift being measured comes from
// the STAGED ARRIVAL of the SPA's modules, not from how slow each stage is, so
// the profile does not change the number: both routes give the same CLS to
// three decimals on either profile. What it changes is the cost. A cold deep
// link blocks on tools-data.js -- 398 KB of catalog the page needs one row of
// -- which took 17.9 s of the 23 s on slow-3G. Three specs each holding a
// throttled context that long starved the worker pool and made unrelated specs
// time out in newPage(). On this profile the same measurement takes 8.3 s.
const SPA_NET = {
  offline: false,
  downloadThroughput: (1638.4 * 1024) / 8,
  uploadThroughput: (768 * 1024) / 8,
  latency: 150,
};
const SPA_CLS_ADVISORY = 0.12;
const SPA_CLS_HARD = 0.15;
const SPA_FCP_ADVISORY_MS = 2000;
const SPA_FCP_HARD_MS = 4000;

for (const route of SPA_ROUTES) {
  test(`perf: ${route.url} holds its layout on a staged load`, async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", SPA_NET);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });

    // Not networkidle. Under this profile that waits out the whole catalog and
    // holds a throttled context open for ~24 s, three times over -- enough to
    // starve the worker pool and make unrelated specs time out in newPage().
    // What this test needs is the tile's LATE content, because the shift being
    // measured is the second render pass landing. Waiting for the proof block
    // (appended once the renderer module resolves) and then letting
    // captureVitals settle for its second covers the same window in a third of
    // the time. Verified to produce the same CLS values as networkidle did.
    await p.goto(route.url, { waitUntil: "load" });
    await p.locator("#view-region details.proof").waitFor({ state: "attached", timeout: 25_000 });
    const v = await captureVitals(p);
    console.log(`perf vitals (SPA route ${route.label} ${route.url} / fast-3G):`, JSON.stringify(v));

    // The reservation itself, asserted directly. If applyRoute stops setting
    // the attribute, or the rule is dropped from styles.css, the CLS numbers
    // would drift back slowly and confusingly; this says why in one line.
    const reserved = await p.evaluate(() => document.documentElement.getAttribute("data-route"));
    expect(reserved, "a tool route must mark the document so main reserves its height").toBe("tool");

    if (v.cls > SPA_CLS_ADVISORY) {
      console.warn(`perf WARN: ${route.url} CLS ${v.cls} over advisory ${SPA_CLS_ADVISORY}`);
    }
    if (v.fcp_ms > SPA_FCP_ADVISORY_MS) {
      console.warn(`perf WARN: ${route.url} FCP ${v.fcp_ms} over advisory ${SPA_FCP_ADVISORY_MS}`);
    }

    expect(v.cls, `${route.url} CLS exceeded hard-fail threshold`).toBeLessThan(SPA_CLS_HARD);
    expect(v.fcp_ms, `${route.url} FCP exceeded hard-fail threshold`).toBeLessThan(SPA_FCP_HARD_MS);

    await ctx.close();
  });
}
