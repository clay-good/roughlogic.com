// Prerendered-shell mobile audit (spec-v12 §10 / spec-v13 §F follow-up).
//
// The SPA 320px sweep in test/integration/a11y.test.js guards the
// interactive `#hash` tile views. The prerendered static shells under
// dist/tools/<id>/ and dist/groups/<slug>/ (plus changelog.html) are a
// SEPARATE, zero-JS surface that crawlers and direct visitors hit, and
// the always-on integration job serves the repo root (not dist/), so it
// cannot reach them. This script closes that gap: it serves dist/ and
// asserts no page-level horizontal scroll on every shell at 320px.
//
// It is an on-demand gate, not part of `npm run lint`, because it needs
// a headless browser (Playwright, a CI-only no-save dependency) and a
// built dist/. Run it after any change to the shell template
// (scripts/build-shells.mjs) or to styles.css. It SKIPS (exit 0) with a
// clear message when Playwright or dist/ is unavailable, mirroring the
// dist-absent skip in check-module-sizes.mjs.
//
//   npm run build && npm run check:shell-mobile
import { spawn } from "node:child_process";
import { readdir, access } from "node:fs/promises";

const PORT = 8099;
const BASE = `http://localhost:${PORT}`;

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function main() {
  if (!(await exists("dist/tools")) || !(await exists("dist/groups"))) {
    console.log("check-shell-mobile: dist/ shells not present; run `npm run build` first. Skipping.");
    return;
  }
  // Local runs install `playwright`; CI installs `@playwright/test` (which
  // re-exports the same `chromium` launcher). Try both before skipping.
  let chromium;
  for (const pkg of ["playwright", "@playwright/test"]) {
    try { ({ chromium } = await import(pkg)); break; } catch { /* try next */ }
  }
  if (!chromium) {
    console.log("check-shell-mobile: Playwright not installed (CI-only no-save dep). Skipping.");
    return;
  }

  const server = spawn("npx", ["-y", "http-server", "-p", String(PORT), "-c-1", "dist"], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 2500));
  try {
    const tools = (await readdir("dist/tools", { withFileTypes: true }))
      .filter((d) => d.isDirectory()).map((d) => `/tools/${d.name}/`);
    const groups = (await readdir("dist/groups", { withFileTypes: true }))
      .filter((d) => d.isDirectory()).map((d) => `/groups/${d.name}/`);
    const routes = [...tools, ...groups, "/changelog.html", "/"];

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setViewportSize({ width: 320, height: 720 });
    const offenders = [];
    for (const route of routes) {
      const resp = await page.goto(BASE + route, { waitUntil: "load" });
      if (!resp || !resp.ok()) { offenders.push(`${route} (HTTP ${resp ? resp.status() : "null"})`); continue; }
      // changelog.html fetches and renders CHANGELOG.md client-side AFTER
      // the load event; wait for the network to settle so we measure the
      // rendered content, not the empty "Loading..." shell (otherwise the
      // audit races and silently passes a genuinely-overflowing page).
      await page.waitForLoadState("networkidle");
      const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      if (o.sw > o.cw + 1) offenders.push(`${route} (${o.sw} > ${o.cw})`);
    }
    await browser.close();

    console.log(`check-shell-mobile: audited ${routes.length} prerendered shells at 320px.`);
    if (offenders.length) {
      console.error(`FAIL: ${offenders.length} shell(s) scroll horizontally at 320px:\n  ` + offenders.join("\n  "));
      console.error("Fix: wrap any wide element so the wrapper owns the scroll, or add overflow-wrap to long strings.");
      process.exitCode = 1;
    } else {
      console.log("check-shell-mobile OK: zero page-level horizontal scroll on any shell at 320px.");
    }
  } finally {
    server.kill();
  }
}

main().catch((err) => { console.error(err.stack || err.message); process.exit(1); });
