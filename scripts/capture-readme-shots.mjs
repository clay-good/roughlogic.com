#!/usr/bin/env node
// Re-shoot the three phone screenshots in the README.
//
// They were taken by hand, which meant they quietly went stale: the ones in
// the repo showed the pre-one-box home page and a calculator whose answer sat
// below its inputs, months after both had changed. A README picture that shows
// a product nobody can find any more is worse than no picture. This makes the
// shot reproducible, so the answer to "are these current" is `npm run build &&
// node scripts/capture-readme-shots.mjs`.
//
// 390 CSS px at 2x, matching the dimensions already committed (780 wide).
// Serves dist/, so what is photographed is what ships.

import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8123;
const OUT = resolve(ROOT, "docs", "img");

const SHOTS = [
  { file: "home-mobile.png", path: "/", theme: "dark", height: 900 },
  { file: "calculator-mobile.png", path: "/index.html#ohms-law?v=1&ol-v=120&ol-i=10", theme: "light", height: 1350 },
  { file: "calculator-dark.png", path: "/index.html#ohms-law?v=1&ol-v=120&ol-i=10", theme: "dark", height: 1350 },
];

const server = spawn("npx", ["-y", "http-server", "-p", String(PORT), "-c-1", "dist"], {
  cwd: ROOT, stdio: "ignore",
});
process.on("exit", () => server.kill());

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/`);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("http-server did not come up");
}

await waitForServer();
const browser = await chromium.launch();
for (const shot of SHOTS) {
  const page = await browser.newPage({
    viewport: { width: 390, height: shot.height },
    deviceScaleFactor: 2,
    colorScheme: shot.theme,
  });
  await page.goto(`http://localhost:${PORT}${shot.path}`, { waitUntil: "networkidle" });
  // The theme is a stored choice, not just a media query: set it the way the
  // toggle does so the shot cannot come out in the other one.
  await page.evaluate((t) => {
    try { localStorage.setItem("theme", t); } catch { /* ignore */ }
    document.documentElement.setAttribute("data-theme", t);
  }, shot.theme);
  // A deep link focuses the view title, and a focus ring in a marketing shot
  // reads as a highlighted box rather than as keyboard focus.
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(OUT, shot.file) });
  console.log(`wrote docs/img/${shot.file} (${shot.theme}, 390x${shot.height} @2x)`);
  await page.close();
}
await browser.close();
server.kill();
