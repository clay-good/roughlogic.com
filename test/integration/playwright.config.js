// Playwright configuration. CI-only dependency. Local dev does not require
// installing Playwright; `npm test` only runs unit tests.

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.test\.js$/,
  // The print-emulation specs (print.test.js) are timing-sensitive under the
  // default parallel worker pool: each spec navigates, flips emulateMedia to
  // "print", then asserts the rendered shell. Under load a single random spec
  // occasionally loses that race (it always passes when run in isolation), so
  // a different print spec would flake on each full run and redden CI for no
  // real defect. Retry flaky specs rather than serialize the whole suite.
  retries: process.env.CI ? 2 : 1,
  use: {
    baseURL: "http://localhost:8080",
    headless: true,
  },
  // The whole suite runs on Chromium; the responsive-stress sweep ALSO runs on
  // WebKit (the iOS Safari engine). WebKit's flexbox `min-width` and sub-pixel
  // rounding diverge from Chromium, and roughly half of US mobile traffic is
  // iOS Safari, so the no-horizontal-scroll guarantee is the one axis worth
  // verifying on a second engine -- as is "the proof prints", which relied on
  // a rule only Chromium honours. Only responsive-stress and shell-print
  // re-run on WebKit (testMatch) so the rest of the integration job stays
  // Chromium-only and bounded. The `webkit-responsive` browser must be
  // installed in CI
  // (`npx playwright install --with-deps webkit`).
  projects: [
    { name: "chromium" },
    {
      name: "webkit-responsive",
      use: { browserName: "webkit" },
      // shell-print rides along for the same reason: the proof stopped
      // printing on every engine but Chromium and a Chromium-only pass is
      // what hid it.
      testMatch: /(responsive-stress|shell-print)\.test\.js$/,
    },
  ],
  webServer: {
    // Use the repository's loopback-only server. Its predev step builds and
    // serves dist/ rather than exposing source, Git metadata, or local secrets.
    command: "npm run dev",
    cwd: "../..",
    port: 8080,
    reuseExistingServer: !process.env.CI,
    // `npm run dev` runs `predev` first, which is a full `build.mjs`: it emits
    // a static shell per tile, so it gets slower every time the catalog does.
    // At 1,833 tiles it is ~15 s of CPU on an idle machine and comfortably
    // past 30 s on a busy one, and the failure it produces --
    // "Timed out waiting 30000ms from config.webServer" -- names neither the
    // build nor the catalog size, so it reads as a broken server. Raised
    // 2026-09-05 (30 s -> 180 s) with room for the rest of the
    // scope-trade-expansion-2 program rather than one band at a time.
    timeout: 180_000,
  },
  reporter: [["list"]],
});
