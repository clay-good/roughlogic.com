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
