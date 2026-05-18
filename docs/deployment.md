# Deployment

roughlogic.com is a static site deployed via Cloudflare Pages. There is no server, no build environment beyond Node 20, and no runtime dependency.

## Cloudflare Pages

- Production: `main` branch -> https://roughlogic.com
- Preview: `develop` branch -> preview environment
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: 20

The `_headers` file is copied into `dist/` and consumed by Cloudflare Pages to serve the section 7 security headers and the `Cache-Control` rules.

## Build

`npm run build` runs `scripts/build.mjs`, which:

1. Removes any prior `dist/`.
2. Copies the static shell (index.html, styles.css, app.js, sw.js, manual-j-worker.js, all 24 calc-* modules from calc-electrical.js through calc-edu.js (which include the v2 Group H reference module calc-references.js), the support libs citations.js / tile-meta.js / limitation-banner.js / search-discovery.js / hash-state.js / clipboard.js / cost-output.js / v5-platform.js / theme.js, _headers, robots.txt, sitemap.xml, site.webmanifest, CHANGELOG.md, LICENSE). (The v2 `bundle.js` module was retired in commit 5734d28.)
3. Recursively copies `data/`.
4. Copies optional icons if present (favicon.ico, apple-touch-icon.png).
5. Writes `dist/build-info.json` with the build timestamp.
6. Reports total file count and KB.

No bundler, no transpiler, no minifier. The shipped files are the source.

## Local development

`npm run dev` starts a Node-only static server on http://localhost:8080 with the same Content-Security-Policy and same-origin headers as production. No external server software is required for development.

## Cloudflare configuration checklist

- HTTPS enforced (default on Pages).
- HSTS preloaded via the `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` line in `_headers`. Submit https://roughlogic.com to https://hstspreload.org once production traffic is verified.
- `_headers` carries: CSP, X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy no-referrer, COOP/COEP/CORP same-origin, and Permissions-Policy disabling camera/microphone/geolocation/payment/USB/accelerometer/gyroscope/magnetometer.
- Custom domain `roughlogic.com` mapped to the Pages production environment.
- Preview deployments map to `*.pages.dev`.

## Verification after first deploy

1. https://observatory.mozilla.org returns A+.
2. https://securityheaders.com returns A+.
3. The CSP blocks third-party connections in the browser console.
4. The service worker registers and the page loads after going offline.
5. Lighthouse CI in `.github/workflows/ci.yml` continues to pass on every push.

## v0.2.0 release notes

The v2 expansion is a content + UX expansion only. No infrastructure
changes are required:

- `_headers` CSP unchanged. The Project Bundle Download (utility 121) uses a same-origin Blob URL, which `default-src 'self'` already permits, and the file download is not subject to `connect-src`.
- Service worker shell precache extended to include the new v2 modules `calc-references.js` and `bundle.js` so offline navigation to a Group H tool or use of the Project Bundle affordances still hits the cache. The cache name remains keyed by build hash; the new shell list takes effect on the next deploy.
- Home-view payload remains under the 100 KB after-gzip budget. `npm run lint` runs `scripts/check-home-payload.mjs` to enforce this on every build.
- Lighthouse CI thresholds (>= 95 across performance / accessibility / best practices / SEO) unchanged.

Pending items remain the same first-deploy gates listed in
`docs/launch-checklist.md`.

## v0.12.0 release notes

The v12 expansion (Groups U Veterinary, V EMS / Pre-hospital, W
Pilots / Aviation, X Real Estate, Y Educators; Phases F mobile-
responsive, G wiring audit, H tiered data refresh) is a content +
build-pipeline expansion only. No Cloudflare or runtime
infrastructure changes are required:

- `_headers` CSP unchanged. Every new v12 module is dynamic-imported
  on first tool open from the same origin, which `default-src
  'self'` already permits. No new third-party origins, no new
  `connect-src` entries, no new `worker-src` entries.
- The service-worker shell precache in [`sw.js`](../sw.js) is
  extended to include the five new calculator modules
  (`calc-vet.js`, `calc-ems.js`, `calc-aviation.js`,
  `calc-realestate.js`, `calc-edu.js`) so offline navigation to a
  Group U / V / W / X / Y tile still hits the cache. The cache
  name remains keyed by build hash; the new shell list takes
  effect on the next deploy. `scripts/check-dist.mjs` (Phase G.3)
  asserts every precached path exists in `dist/`.
- Home-view payload remains under the 100 KB after-gzip budget
  (currently 54,817 B / 53.5% of cap; JS sub-budget tightest at
  98.9% of 40 KB). `npm run check:home-payload` continues to
  enforce this on every build.
- Phase H (tiered data refresh) adds one new GitHub Actions
  workflow,
  [`.github/workflows/data-refresh-weekly.yml`](../.github/workflows/data-refresh-weekly.yml)
  (cron `0 12 * * 1`), alongside the existing monthly
  [`data-refresh.yml`](../.github/workflows/data-refresh.yml)
  (`0 12 1 * *`). Both run `npm run data:refresh` + `npm run
  data:verify`, append a one-line summary to
  [`scripts/sources.md`](../scripts/sources.md) via
  [`scripts/append-source-diff-log.mjs`](../scripts/append-source-diff-log.mjs),
  and open a PR for review when the integrity hashes shift. No
  workflow auto-merges; the maintainer triages every diff. No
  runtime fetches are introduced (spec-v12 §H.4).
- New data folder `data/realestate/` (FHFA conforming loan
  limits, HUD Fair Market Rents) shipped with `manifest.json`
  carrying the spec-v12 §H.2 `refresh_cadence` field. Total
  integrity entries 120 -> 123 verified end-to-end by
  `npm run data:verify`.
- Lighthouse CI thresholds (>= 95 across performance /
  accessibility / best practices / SEO) unchanged. The
  `lighthouserc.json` invariants and the axe-core parameterized
  loop (spec-v10 §E.3) pick up every new v12 tile_id
  automatically; no test-config edits required.

Ready to deploy v0.12.0 once the gate items above pass against
the deployed environment. The v12-specific gates are enumerated
under "v0.11 / v0.12 (spec-v12 expansion)" in
[`launch-checklist.md`](launch-checklist.md).
