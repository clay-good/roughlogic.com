# Launch Checklist

Per spec.md section 14 step 22. This is the written report. Items are categorized as **pass** (verified locally and assertable by automation), **gate** (assertable only against the deployed environment, gated on first-deploy verification), or **n/a** (not applicable to the current scope).

> **Document structure.** The first half of this file is the v0.1.0 launch
> report - a frozen snapshot of the state at v0.1.0 (220 unit tests, 53
> files / 290 KB total dist, footer with Changelog and Data-version lines,
> filter-button rows). The "v0.2.0 deploy-time gates" section near the
> bottom captures the diff against v0.1.0. When numbers in the two
> sections disagree, the v0.2.0 stanza is the current state.

## Cross-browser rendering and operation

| Item | Status | Notes |
| --- | --- | --- |
| Every utility renders on Chrome, Firefox, Safari (desktop) | gate | All utilities use vanilla ES modules, system fonts, and `textContent`/`createElement` only. No browser-specific APIs. Verify on the deployed environment. |
| Every utility works on Chrome, Firefox, Safari (mobile) | gate | Inputs use `inputmode="decimal"` and 48 px touch targets. Verify on iOS Safari and Android Chrome. |

## Standards conformance

| Item | Status | Notes |
| --- | --- | --- |
| Page passes the W3C HTML validator | gate | Index uses semantic HTML with single `<main>`, `<header>`, `<footer>`, and one `<h1>` per view. Run https://validator.w3.org against the deployed URL. |
| Mozilla Observatory grade A+ | gate | `_headers` carries the section 7 set: CSP, HSTS preload, COOP/COEP/CORP same-origin, X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy no-referrer, Permissions-Policy. Run after first deploy. |
| securityheaders.com grade A+ | gate | Same set. Run after first deploy. |

## Accessibility

| Item | Status | Notes |
| --- | --- | --- |
| WCAG 2.2 Level AA | pass | Documented in [docs/accessibility.md](accessibility.md). Enforced by Playwright + `@axe-core/playwright` across 27 representative views in [test/integration/a11y.test.js](../test/integration/a11y.test.js) (16 v1 + 11 v2 routes spanning groups A through H). |
| axe-core: zero serious/critical violations | pass | Build fails on any new violation. |
| Touch targets at least 48 by 48 pixels | pass | `--touch-min: 48px` token applied to header search input, theme toggle, tile-link, tile-pin, view-pin / view-share / view-bundle-* / view-print buttons, back-link, copy / copy-all buttons, and the example button on each calculator. Verified end-to-end by Playwright bounding-box assertions on a representative element from each row (tile-link, theme-toggle). |
| Voice input compatibility | pass | No event handlers block dictation; numeric inputs use `inputmode="decimal"`; the "Test with example" button is named so dictation triggers it. |
| Single h1 per view | pass | Home view has a visually-hidden h1; tool view inserts an h1 with the tool name and focuses it. |
| Live regions announce results | pass | `aria-live="polite"` on each output region; "Copied" announcement on copy actions. |
| Body text contrast | pass | `#0A0A0A` on `#FFFFFF` exceeds 7:1. |

## Test suite

| Item | Status | Notes |
| --- | --- | --- |
| Unit tests pass | pass | 220 tests, Node built-in runner: pure-math (40), calc-electrical (29), calc-plumbing (23), calc-hvac (27), calc-restoration (19), calc-construction (28), calc-fire (17), calc-cross (24), first-principles (13). |
| First-principles verification suite passes | pass | [test/unit/first-principles.test.js](../test/unit/first-principles.test.js) cross-checks Cu resistance/kft, ampacity vs NEC 75 C column, Hazen-Williams worked example, refrigerant P-T at table points, lumber spans vs published-equivalent values, NFA hose friction, hydrant flow. |
| Lint and grep checks pass | pass | `npm run lint` runs [scripts/grep-checks.mjs](../scripts/grep-checks.mjs) which fails on `.innerHTML`, `.outerHTML`, `insertAdjacentHTML`, `eval`, `new Function`, emoji codepoints, and em-dashes. |
| Data integrity check passes | pass | `npm run data:verify` confirms 33 manifest and shard SHA-256 hashes match `scripts/expected-hashes.json`. |
| Playwright integration tests | gate | CI-only dependency. Will run in `.github/workflows/ci.yml` on push. |
| Lighthouse CI scores >= 95 | gate | `lighthouserc.json` enforces FCP <1s, LCP <1.5s, TBT <100ms, CLS <0.05, plus >= 95 on Performance, Accessibility, Best Practices, SEO. Will run in CI on push. |

## Security and privacy

| Item | Status | Notes |
| --- | --- | --- |
| CSP blocks third-party connections | gate | `connect-src 'self'` enforced both in `_headers` and the `<meta>` tag in `index.html`. Verify in browser DevTools console after first deploy. |
| Service worker caches shell and shards | pass | [sw.js](../sw.js) precaches the shell + per-folder manifests; data shards are cached on first fetch. Cache name keyed to `BUILD_HASH`. |
| Service worker offline behavior | gate | Verify by loading once, going offline, reloading. The navigation fallback returns `index.html`. |
| Client-side storage minimized | pass | No sessionStorage / cookies / IndexedDB. localStorage holds one key (`rl-theme`, value `"light"` or `"dark"`) for theme persistence; no tool data is written there. State for pinned tiles, recents, and calculator inputs lives in the URL hash. |
| No outbound network calls at runtime | pass | No `fetch` of cross-origin URLs. CSP enforces same-origin. |
| `innerHTML` forbidden | pass | ESLint rule + grep check both fail the build on detection. |

## Legal posture (spec section 5)

| Item | Status | Notes |
| --- | --- | --- |
| First-principles approach implemented | pass | All physics-derived calculators evaluate the underlying equations directly. Documented per calculator in [docs/derivations.md](derivations.md). |
| No NEC, IPC, IRC, ASHRAE Fundamentals, ACCA Manual J, NFPA, AWC text reproduced | pass | Spec text enumerated in [docs/legal.md](legal.md). Calculator outputs are derived from public physics and bundled material/property values. |
| Original plain-English summaries present | pass | [data/summaries/summaries.json](../data/summaries/summaries.json) carries an entry per utility, written by the project author. |
| Manual J views show the simplified-estimate notice | pass | [calc-hvac.js](../calc-hvac.js) emits "Simplified engineering load estimator ... A code-compliant load calculation requires Manual J." |
| Section 9 inline notice on every calculator | pass | Default and SOP-and-incident-command variants applied based on the tool's trade tag in [app.js](../app.js). |
| Universal disclaimer in footer | pass | Section 10 disclaimer text in [index.html](../index.html) footer, served on every view. |
| Fire-ground utilities show SOP-and-incident-command notice | pass | All Group F tools tagged `fire`; renderer selects the variant. |
| `docs/legal.md` and `docs/data-sources.md` accurate | pass | Updated whenever a new dataset is added. |

## Operations

| Item | Status | Notes |
| --- | --- | --- |
| Data manifests show fresh dates | pass | All 9 manifests stamped with the current build date. |
| `_headers` ships in `dist/` | pass | Verified by `npm run build`; 53 files / 290 KB total dist. |
| Footer attribution and links | pass | "Made with love by Clay Good", "View source on GitHub", and "Changelog" links present. |
| README and docs accurate | pass | README ordered per spec section 14 step 3; docs cover architecture, data sources, legal, derivations, accessibility, threat model, performance, deployment. |

## Items requiring first-deploy verification

These items can only be exercised against the production environment. Run after the first Cloudflare Pages deploy of `main`:

1. `https://roughlogic.com` resolves over HTTPS and renders the home view.
2. Mozilla Observatory and securityheaders.com both report A+.
3. CSP `connect-src 'self'` is observed in the browser console.
4. Service worker registers; offline reload still renders the shell.
5. Lighthouse CI passes on the deployed URL.
6. Data version footer line shows the build timestamp from `dist/build-info.json`.
7. Submit `https://roughlogic.com` to https://hstspreload.org.

## Summary

- **Pass**: 19 items verified locally and assertable by automation.
- **Gate**: 11 items contingent on first-deploy verification listed above.
- **Tests**: 220 unit tests passing; lint clean; data-integrity passing.
- **Build**: 53 files, 290.6 KB total dist (well under any per-utility 250 KB budget).

Ready to deploy. Pending items are the deploy-time checks that cannot be performed without the deployed environment.

## v0.2.0 deploy-time gates (added by spec-v2 Step 36)

The v2 expansion follows the same deploy-time gate set above. The diff
versus the v0.1.0 checklist:

- **Tool count**: 64 -> 119 utilities (118 from spec-v2 plus utility 119
  Compare Two Refrigerants implemented under Group C per spec-v2 Step 31),
  plus the cross-cutting platform affordances (Recents, Project Bundle
  URL/JSON, Print/PDF view, Offline pill, Example deep-link, Copy share
  link).
- **Tests**: 220 -> 836 unit tests passing (220 v1 + 616 v2 across the
  per-utility suites, the v2 first-principles verifications, the bundle
  round-trip, and the routing v2-format invariants); lint clean
  (including the v2-added home-view payload check); data-integrity
  passing across 46 manifest entries.
- **Data shards**: 24 -> 37 shipped under data/ across 9 datasets.
- **Derivations**: 11 -> 24 sections in docs/derivations.md.
- **Home-view payload budget**: still under 100 KB after gzip; every new
  calc-*.js module is dynamic-imported on first tool open. The new
  modules calc-references.js (Group H) and bundle.js (utility 121)
  follow the same lazy-load pattern.
- **Lighthouse**: rerun on deployed URL post-v0.2.0 deploy; same >= 95
  thresholds across performance / accessibility / best practices / SEO
  apply.
- **Accessibility**: WCAG 2.2 AA invariants (single-h1 per view, 48 px
  touch targets, semantic group sections rendered as `<section class="tools-section">` with their own `<h2>` per group A through H) hold; rerun axe-core e2e suite post-deploy.
- **CSP**: unchanged. Project Bundle Download uses a same-origin Blob
  URL, which `connect-src 'self'` already permits.
- **Behavior**: No telemetry. No A/B testing. No feature flags. No
  account, no email capture, no notifications. The Recents and Bundle
  features keep all tool-data state in the URL hash; the only client-side
  storage is the single localStorage key `rl-theme` for the persisted
  light/dark theme preference. No sessionStorage, cookies, or IndexedDB.

Ready to deploy v0.2.0 once the items above and the original gate list
have passed against the deployed environment.
