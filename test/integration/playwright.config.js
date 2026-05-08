// Playwright configuration. CI-only dependency. Local dev does not require
// installing Playwright; `npm test` only runs unit tests.

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.test\.js$/,
  use: {
    baseURL: "http://localhost:8080",
    headless: true,
  },
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
