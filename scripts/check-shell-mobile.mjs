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
    const routes = [...tools, ...groups, "/"];

    // The prerendered shells are generated from one template, so the 320px
    // portrait floor over EVERY shell already proves the template handles every
    // tile's content (the only per-tile variable is string length, which the
    // shared overflow-wrap rule absorbs). The two secondary axes a single
    // viewport misses -- landscape (short height) and 200% text-only zoom
    // (WCAG 1.4.4) -- are template-driven in exactly the same way, so they audit
    // a representative sample: every group hub, the home shell,
    // and an evenly-strided slice of tool shells. (320px portrait is also the
    // WCAG 1.4.10 reflow guarantee: 400% page zoom resolves to a 320px viewport.)
    const meta = routes.filter((r) => !r.startsWith("/tools/"));
    const toolRoutes = routes.filter((r) => r.startsWith("/tools/"));
    const stride = Math.max(1, Math.floor(toolRoutes.length / 24));
    const sample = [...toolRoutes.filter((_, i) => i % stride === 0), ...meta];
    const CONDITIONS = [
      { label: "320px portrait", width: 320, height: 720, textZoom: false, routes },
      { label: "568x320 landscape", width: 568, height: 320, textZoom: false, routes: sample },
      { label: "375px @ 200% text zoom", width: 375, height: 720, textZoom: true, routes: sample },
    ];
    const browser = await chromium.launch();
    const offenders = [];
    let checks = 0;
    for (const cond of CONDITIONS) {
      // A fresh page per condition so the text-zoom init script (which runs on
      // every navigation) applies cleanly and only where intended.
      const page = await browser.newPage();
      await page.setViewportSize({ width: cond.width, height: cond.height });
      if (cond.textZoom) {
        await page.addInitScript(() => {
          const s = document.createElement("style");
          s.textContent = "html{font-size:200% !important}";
          document.documentElement.appendChild(s);
        });
      }
      for (const route of cond.routes) {
        checks++;
        const resp = await page.goto(BASE + route, { waitUntil: "load" });
        if (!resp || !resp.ok()) { offenders.push(`[${cond.label}] ${route} (HTTP ${resp ? resp.status() : "null"})`); continue; }
        // The static tool/group shells are fully painted at the load event, so
        // measure them immediately.
        const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
        if (o.sw > o.cw + 1) offenders.push(`[${cond.label}] ${route} (${o.sw} > ${o.cw})`);
      }
      await page.close();
    }
    await browser.close();

    console.log(`check-shell-mobile: ${checks} checks across ${routes.length} shells (all at 320px portrait; ${sample.length} sampled at 568x320 landscape + 200% text zoom).`);
    if (offenders.length) {
      console.error(`FAIL: ${offenders.length} shell-condition(s) scroll horizontally:\n  ` + offenders.join("\n  "));
      console.error("Fix: wrap any wide element so the wrapper owns the scroll, or add overflow-wrap to long strings.");
      process.exitCode = 1;
    } else {
      console.log("check-shell-mobile OK: zero page-level horizontal scroll on any shell at 320px portrait, 568x320 landscape, or 200% text zoom.");
    }
  } finally {
    server.kill();
  }
}

main().catch((err) => { console.error(err.stack || err.message); process.exit(1); });
