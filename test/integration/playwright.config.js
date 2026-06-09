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
  // verifying on a second engine. Only responsive-stress re-runs on WebKit
  // (testMatch) so the rest of the integration job stays Chromium-only and
  // bounded. The `webkit-responsive` browser must be installed in CI
  // (`npx playwright install --with-deps webkit`).
  projects: [
    { name: "chromium" },
    {
      name: "webkit-responsive",
      use: { browserName: "webkit" },
      testMatch: /responsive-stress\.test\.js$/,
    },
  ],
  webServer: {
    // Serve the project root, not the testDir. Playwright resolves the
    // command's working directory from the config file's location, so
    // an explicit `cwd` anchors http-server to the repo root where
    // index.html, app.js, and the data/ tree live. Without this, every
    // page request 404s and tests fail with "tools-section not found".
    command: "npx -y http-server -p 8080 -c-1 .",
    cwd: "../..",
    port: 8080,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  reporter: [["list"]],
});
