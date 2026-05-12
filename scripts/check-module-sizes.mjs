#!/usr/bin/env node
// v10 Phase H.1 per-module size lint (spec-v10.md §10.1).
//
// Spec-v10 §H.1 declares a 5 KB gzipped cap on every dynamic-imported
// per-tile module. The current architecture does not split tiles into
// per-tile modules; tiles are grouped into per-trade calc-*.js modules.
// Until that refactor lands, this lint enforces an explicit per-module
// ceiling that catches a runaway addition without forcing the split.
// The Manual J, duct-sizing, and psychrometric helper modules called
// out by the spec are tracked individually below.
//
// The cap on each module is "current gzipped size + 20% headroom",
// rounded to 500 B. Once a module routinely brushes its cap, the right
// remediation is to split per-tile (which lets the 5 KB spec cap take
// over) and not to keep raising the budget.
//
// Behavior:
//   FAIL (exit 1) when any module exceeds its declared cap.
//   WARN when a module is within 90% of its cap (early signal).
//   OK otherwise.
//
// Pure read-and-report; reads from dist/. The script will skip
// gracefully if dist/ has not been built (CI runs npm run build before
// npm run lint when needed).

import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");

// Per-module gzip caps in bytes. Set to current size + ~20% headroom,
// rounded to 500 B. Maintainers update this file in the same PR that
// intentionally grows a module; CI will fail otherwise. Modules absent
// from the table use the default cap (DEFAULT_CAP).
const DEFAULT_CAP = 6 * 1024;
const CAPS = {
  // Per-trade calc bundles.
  "calc-meta.js": 4500,
  "calc-historical.js": 5000,
  // v5 expansion (Groups R / S / T) modules. Brought into the build
  // manifest 2026-05-11 (they had been referenced by app.js and tested
  // locally since v0.9.0 but were missing from scripts/build.mjs FILES,
  // so the size lint never saw them). Caps set to current + ~20%
  // headroom per the policy in this file. Per spec-v10 §H.1 the per-tile
  // split is the preferred long-term path once a module routinely
  // brushes its cap; calc-legal.js in particular is a candidate.
  "calc-accounting.js": 15000,
  "calc-lab.js": 10500,
  "calc-legal.js": 25000,
  // Bumped 7500 -> 10000 when v9 §H.6 sous-vide-pasteurization added
  // the FDA Annex 6 Table A break points + diffusivity table. Per
  // spec-v10 §H.1 the per-tile split is the preferred long-term path.
  "calc-kitchen.js": 10000,
  // Bumped 7500 -> 9000 (v9 §H.4 thi-livestock species tables) and
  // 9000 -> 11000 (v9 §H.3 sprayer-calibration). Per spec-v10 §H.1
  // the per-tile split is the preferred long-term path once the bundle
  // routinely brushes its cap.
  "calc-agriculture.js": 11000,
  // Bumped 8000 -> 10000 (v9 §E.2 disinfection-ct SWTR table + bilinear
  // interpolation helper). Per spec-v10 §H.1 the per-tile split is the
  // preferred long-term path once the bundle routinely brushes its cap.
  "calc-water.js": 10000,
  // Bumped 8500 -> 10000 for v9 §F.2 30-minute resume timer landing
  // 2026-05-12 (parseTimerState / encodeTimerState / timerRemainingSeconds
  // / formatTimerMMSS helpers plus the custom renderLightning that mounts
  // the timer UI alongside the standard flash-to-bang inputs). The four
  // helpers are pure and exported so unit tests verify the round-trip
  // without a DOM. Per spec-v10 §H.1 the per-tile split is preferred
  // long-term once the bundle routinely brushes its cap.
  // Bumped 10000 -> 16500 for v9 §F.1 magnetic-declination landing
  // 2026-05-12 (NCEI WMM2025 port: schmidtK helper, decimalYearFromIso,
  // computeWMM core ~110 lines including geodetic->geocentric conversion,
  // Schmidt semi-normalized associated Legendre recurrences, field
  // summation, spherical->geodetic rotation, and the secular-variation
  // chain rule; plus the renderMagneticDeclination custom renderer that
  // loads data/field/wmm/coefficients.json once per session and wires
  // the bearing-conversion helper inline). Computed match against the
  // bundled NCEI WMM2025_TestValues.txt is within 0.005 deg D/I and
  // 0.001 nT H over all 100 test vectors (see calc-field-v9.test.js).
  // Per spec-v10 §H.1 the per-tile split is still preferred long-term;
  // calc-field.js is now a leading candidate.
  "calc-field.js": 16500,
  // Bumped 8500 -> 10500 for v9 §H.2 spl-atmospheric (ANSI S1.26-2014
  // relaxation-frequency closed-form). Per spec-v10 §H.1 per-tile split
  // remains preferred long-term.
  "calc-stage.js": 10500,
  "calc-trucking.js": 11000,
  "calc-mechanic.js": 11500,
  "calc-restoration.js": 12500,
  // Bumped 13500 -> 16000 when v9 §C.1 nfpa-1142-water-supply added
  // the occupancy / construction factor tables and §C.3 scba-cylinder-
  // time. Per spec-v10 §H.1 the per-tile split is preferred long-term.
  "calc-fire.js": 16000,
  "calc-references.js": 15500,
  "calc-cross.js": 24000,
  "calc-plumbing.js": 30000,
  // Bumped 36500 -> 39000 for v9 §B.3 hood-exhaust (IMC duty table) and
  // §B.1 shr-latent (psychrometric humidity-ratio helpers and altitude
  // correction). Per spec-v10 §H.1 the per-tile split remains preferred
  // long-term once the bundle routinely brushes its cap.
  "calc-hvac.js": 39000,
  "calc-construction.js": 37000,
  // calc-electrical cap raised 39000 -> 42000 when v9 §A.3 + §A.4 landed.
  // Per spec-v10 §H.1: prefer per-tile split once the module routinely
  // brushes its cap. The arc-flash-screen + motor-branch-from-nameplate
  // additions are within the spec-v10 5 KB-per-tile budget; the bundled
  // Group A renderer-set is still inside the platform-wide envelope.
  "calc-electrical.js": 42000,

  // Worker and v5 platform.
  "manual-j-worker.js": 1500,
  "v5-platform.js": 6000,

  // v12 Group Y starter (utility Y.1 Flesch-Kincaid). Pure-math,
  // self-contained syllable counter + the two published formulas.
  // Per spec-v12 §14.3 the group cap is 14 KB once fully populated;
  // the starter sits well under at ~3 KB.
  "calc-edu.js": 5000,

  // Reference / citation modules. citations.js is the structured §3
  // reference block that every per-tile source-stamp resolves against;
  // it is dynamic-imported from the calc modules. Large by nature
  // because it carries every published citation; tracked separately.
  "citations.js": 75000,

  // v10 §B.1 limitation-banner shared component. Larger than 2.5 KB
  // because it bundles the canonical per-tile copy registry; still
  // well under the 5 KB per-tile spec cap for shared helpers.
  "limitation-banner.js": 4000,
  // v10 Phase D pure-functional resolvers.
  "search-discovery.js": 2500,
  // v10 Phase B.2 per-tile meta-object registry. Grows incrementally
  // toward full TOOLS coverage; cap raised in lockstep.
  "tile-meta.js": 7000,
};

// Modules excluded entirely. The home-view bundle is enforced by
// check-home-payload.mjs; we don't double-count it.
const EXCLUDE = new Set([
  "index.html",
  "styles.css",
  "theme.js",
  "app.js",
  "integrity.js",
  "routing.js",
  "sw.js",
  "bundle.js",
  "changelog.js",
  "changelog.html",
]);

async function main() {
  if (!existsSync(DIST)) {
    console.warn("WARN: dist/ not present; run `npm run build` first. Skipping per-module size lint.");
    return;
  }
  const entries = await readdir(DIST);
  const candidates = entries.filter(
    (e) => e.endsWith(".js") && !EXCLUDE.has(e),
  );

  const rows = [];
  for (const name of candidates) {
    const p = resolve(DIST, name);
    const st = await stat(p);
    if (!st.isFile()) continue;
    const buf = await readFile(p);
    const gz = gzipSync(buf).length;
    const cap = CAPS[name] ?? DEFAULT_CAP;
    rows.push({ name, gzip: gz, cap });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));

  console.log("per-module gzipped sizes (spec-v10 §H.1):");
  let failed = 0;
  let warned = 0;
  for (const r of rows) {
    const pct = ((r.gzip / r.cap) * 100).toFixed(1);
    const tag = r.gzip > r.cap ? " FAIL" : r.gzip > r.cap * 0.9 ? " WARN" : "";
    console.log(
      "  " +
        r.name.padEnd(28) +
        " " +
        String(r.gzip).padStart(7) +
        " B / " +
        String(r.cap).padStart(7) +
        " B (" +
        pct +
        "%)" +
        tag,
    );
    if (r.gzip > r.cap) failed += 1;
    else if (r.gzip > r.cap * 0.9) warned += 1;
  }

  if (failed > 0) {
    console.error(
      "FAIL: " + failed + " module(s) exceed their gzipped budget. Either split the module per-tile (preferred) or raise the cap in scripts/check-module-sizes.mjs with a CHANGELOG note.",
    );
    process.exit(1);
  }
  if (warned > 0) {
    console.warn(
      "WARN: " + warned + " module(s) within 10% of their cap. Plan a split before the next batch.",
    );
  }
  console.log("v10 per-module size lint OK.");
}

await main();
