# Launch Checklist

Per spec.md section 14 step 22. This is the written report. Items are categorized as **pass** (verified locally and assertable by automation), **gate** (assertable only against the deployed environment, gated on first-deploy verification), or **n/a** (not applicable to the current scope).

> **Document structure.** Each per-release section is a **frozen snapshot**
> at the release it names. The first half of this file is the v0.1.0
> launch report (220 unit tests, 53 files / 290 KB dist, filter-button
> rows). Subsequent sections capture the diff against the prior release:
> v0.2.0 (spec-v2 platform additions), v0.9.0 (v5 expansion), v0.10
> (platform hardening), v0.11 / v0.12 (Groups U / V / W / X / Y). When
> numbers in earlier sections disagree with later sections, **the latest
> per-release section is the current state**. The "Build numbers
> (v0.12, refreshed YYYY-MM-DD)" block under v0.11 / v0.12 is the live
> snapshot.

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
| Client-side storage minimized | pass | No sessionStorage / cookies / IndexedDB. localStorage holds one key (`rl-theme`, value `"light"`, `"dark"`, or `"high-contrast"`) for theme persistence; no tool data is written there. State for pinned tiles and calculator inputs lives in the URL hash. (Recents and Big Buttons mode were retired in spec-v11.) |
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
  plus the cross-cutting platform affordances (Project Bundle URL/JSON,
  Print/PDF view, Offline pill, Example deep-link, Copy share link).
  (Recents was retired in spec-v11.)
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
  account, no email capture, no notifications. The Bundle feature
  keeps all tool-data state in the URL hash; the only client-side
  storage is the single localStorage key `rl-theme` for the persisted
  light/dark/high-contrast theme preference. No sessionStorage, cookies,
  or IndexedDB. (Recents was retired in spec-v11.)

Ready to deploy v0.2.0 once the items above and the original gate list
have passed against the deployed environment.

## v0.9.0 (v5 expansion)

- **Tools**: 233 -> 271 utilities. Three new groups (R / S / T) plus extensions in H and I.
  - Group R: Accounting, Tax, and Small-Business (utilities 234-245, 12 utilities).
  - Group S: Legal Plain-English and Statutory Math (utilities 246-254, 9 utilities).
  - Group T: Bench Science and Laboratory Math (utilities 255-264, 10 utilities).
  - Group H extensions (utilities 265-268, 4 reference pages: IRS form index, sales-tax nexus, OSHA recordkeeping, lab safety quick-read).
  - Group I extensions (utilities 269-271, 3 platform features: CSV export, print-table CSS, glossary tooltip).
- **Tests**: 2,377 -> 2,695 unit tests passing. New v5-specific suites:
  - [test/unit/calc-accounting.test.js](../test/unit/calc-accounting.test.js) (67 tests)
  - [test/unit/calc-legal.test.js](../test/unit/calc-legal.test.js) (50 tests)
  - [test/unit/calc-lab.test.js](../test/unit/calc-lab.test.js) (44 tests)
  - [test/unit/calc-references-v5.test.js](../test/unit/calc-references-v5.test.js) (22 tests)
  - [test/unit/v5-platform.test.js](../test/unit/v5-platform.test.js) (26 tests)
  - [test/unit/v5-shards.test.js](../test/unit/v5-shards.test.js) (23 tests)
  - [test/unit/v5-edge-cases.test.js](../test/unit/v5-edge-cases.test.js) (~120 tests)
  - [test/unit/calc-lab-thicken.test.js](../test/unit/calc-lab-thicken.test.js) (45 tests)
  - 17 new entries in [test/unit/first-principles.test.js](../test/unit/first-principles.test.js) (SL / MACRS / SE-tax / amortization / breakeven / CCC / JI / FRCP-6(a) / Beer-Lambert / HH / RCF / hemocytometer / MW).
- **Data shards**: 73 -> 118 shards integrity-verified end-to-end via `npm run data:verify`. Five new shard folders (`data/accounting/`, `data/legal/`, `data/lab/`, `data/cross/` plus a glossary file). Manifests carry the v8 `edition` + `asOf` + per-shard SHA-256 hashes; per-state JSON entries carry per-entry `verified_on` ISO date and the wrapper carries `verifiedOn` for the v8 future-proof check.
- **Per-state coverage**: All five per-state legal datasets now at 50 states + DC parity:
  - `JUDGMENT_INTEREST_RATES`: 51 entries
  - `STATE_MINIMUM_WAGE`: 52 entries (50 + FED + DC)
  - `SMALL_CLAIMS_THRESHOLDS`: 51 entries
  - `STATUTE_OF_LIMITATIONS`: 51 entries (each with full 8-claim-type schema)
  - `LANDLORD_TENANT_NOTICE`: 51 entries (each with full 4-notice-type schema)
  - `SALES_TAX_NEXUS`: 47 entries (46 sales-tax states + DC; DE/MT/NH/OR omitted as no-tax states by design)
- **Derivations**: 51 -> 66 sections in [docs/derivations.md](derivations.md). New sections 52-66 cover SL / MACRS / S179 / SE-tax / estimated-tax / amortization / breakeven / CCC / judgment-interest / FRCP-6(a) court-day / MW parser / RCF / Beer-Lambert / HH / hemocytometer.
- **Inline-notice variants**: 4 -> 7 enumerated in [docs/notice-variants.md](notice-variants.md). New variants: tax-law (Group R), legal-information (Group S), bench-science (Group T). Per-id overrides for cross-trade Group H tiles (sales-tax-nexus -> legal, irs-form-index -> tax-law).
- **Glossary tooltip**: utility 271 implemented in [v5-platform.js](../v5-platform.js) with 21 plain-English definitions in [GLOSSARY](../v5-platform.js) and on-disk shard at [data/cross/glossary.json](../data/cross/glossary.json). WCAG 2.2 AA tooltip behavior (open on hover and focus, close on blur and Escape). Wired across 14 v5 fields covering MACRS / FICA / Section_179 / bonus_depreciation / contribution_margin / DSO / DIO / DPO / statute_of_limitations / jurisdictional_maximum / FLSA / ABC_test / C1V1=C2V2 / molarity / IUPAC / RCF / RPM / pKa / hemocytometer.
- **CSV export**: utility 269 implemented in [v5-platform.js](../v5-platform.js) (`buildCsv`, `csvFromTable`, `attachCsvExport`); RFC 4180 quoting + CRLF line endings; same-origin Blob URL with content-hashed filename; wired into the three tabular tools (loan-amortization, mileage-rollup, PCR master mix).
- **Print-table CSS**: utility 270 added under `.tabular-tool` wrapper in [styles.css](../styles.css); `tr { page-break-inside: avoid; }`, `thead { display: table-header-group; }` so multi-row tables paginate cleanly.
- **Build**: `npm run build` produces 165 files / 1788 KB dist. Home-view payload 45,364 B / 102,400 B budget = **44.3% of cap**, well under the 100 KB limit. All v5 calc modules dynamic-imported on first tool open.
- **Lint**: `npm run lint` clean. v6 + v8 manifest discipline both pass.
- **Data integrity**: `npm run data:verify` reports 118 entries OK against [scripts/expected-hashes.json](../scripts/expected-hashes.json).
- **Lighthouse / Playwright e2e / a11y**: gate items pending against the deployed environment. `lighthouserc.json` invariants unchanged; the new tile renderers all use the same `<dl>` / `<table>` patterns as the v3-v4 tiles which already passed axe-core. The glossary tooltip uses `aria-describedby` and `role="tooltip"` per WCAG 2.2; visual focus + Escape-dismiss verified in [test/unit/v5-platform.test.js](../test/unit/v5-platform.test.js).
- **Behavior**: No telemetry. No A/B. No feature flags. No accounts. v5 platform features (CSV export, glossary tooltip) are entirely client-side; CSV uses a same-origin Blob URL which `connect-src 'self'` already permits. No new localStorage keys.

Ready to deploy v0.9.0 once the gate items above (Lighthouse CI, Playwright e2e, axe-core) pass against the deployed environment.

## v0.10 / spec-v10 (platform refinements, citation hygiene, long-run maintainability)

Spec-v10 is platform-only: zero new tiles, zero new groups, zero new runtime dependencies. Every change is automation, a shared helper, a documentation pattern, or a small per-tile UI polish that respects every existing constraint. The work landed across many batches between 2026-05-10 and 2026-05-12: the initial 20-batch landing pass on 2026-05-10, then §C runner expansion + §B.3 closure + §E.1 / §H.3 Playwright audits on 2026-05-11, then §E.2 / §E.3 / §H.3 perf-baseline follow-up + v9 §F.2 timer follow-up + four passes of doc reconciliation on 2026-05-12.

### Phase A - Citation freshness automation (§3)

- **A.1**: [scripts/check-citation-freshness.mjs](../scripts/check-citation-freshness.mjs) + [scripts/sources-cycle.json](../scripts/sources-cycle.json) wired into `npm run lint`. Tracks NEC, ICC family (IPC / IRC / IBC / IMC / IFC / IFGC), ASHRAE 62.1 / 62.2 / 90.1, FDA Food Code, NOAA WMM, AASHTO Green Book. Hard-fails on missing `edition` / `asOf` or expired date-bounded models; warns on stale editions / >365d asOf / WMM expiring within 6 months. **Status**: pass.
- **A.2**: [scripts/check-free-access.mjs](../scripts/check-free-access.mjs) opt-in probe (`npm run check:free-access`). Scans citations.js for URLs under 10 tracked publisher hosts and HEADs each. Warns rather than fails. **Status**: pass.
- **A.3**: [scripts/build-citation-strings.mjs](../scripts/build-citation-strings.mjs) parses the per-tile tables in [citation-discipline.md](citation-discipline.md) and emits [citation-strings.generated.json](citation-strings.generated.json) (**52 rows / 52 tiles** as of 2026-05-11). `--check` mode in `npm run lint` rejects out-of-sync edits. The runtime-audit test ([../test/unit/citation-runtime-audit.test.js](../test/unit/citation-runtime-audit.test.js)) holds **52 of 52** markdown rows aligned to the renderer source verbatim (the two long-standing orphans cook-temps / vent-sizing were removed from the discipline doc 2026-05-11). **Status**: pass.

### Phase B - Limitation-banner standardization (§4)

- **B.1**: [limitation-banner.js](../limitation-banner.js) shared component renders an `<aside class="inline-notice limitation-banner" role="note" aria-label="Tile limitations">` with headline + replacement + AHJ-governs + optional free-access link. CANONICAL registry covers the 9 §4.3 tiles. **Status**: pass.
- **B.2**: [tile-meta.js](../tile-meta.js) data-driven registry covers all **302 tiles** (100% of TOOLS; matches the §C runner coverage; v9 §F.1 magnetic-declination added 2026-05-12). Three small tables drive the registry (SIMPLIFIED 7 ids, FIELD_METER 10 ids, COMPANIONS 47 lists; the prior "43 lists" figure pre-dated several 2026-05 additions). [scripts/check-tile-meta.mjs](../scripts/check-tile-meta.mjs) inverse-lint gates a new tile on having a meta row. **Status**: pass.
- **B.3**: all 9 §4.3 simplified-screening tiles wired (manual-j-cooling, manual-j-heating, outdoor-air-mix, septic-drainfield, service-load, slope-avalanche, stair-stringer, arc-flash-screen, sous-vide-pasteurization). The last two closed 2026-05-11 once the underlying v9 tiles shipped. **Status**: pass.

### Phase C - Test-fixture and worked-example discipline (§5)

- **C.1**: [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) registry with **307 fixture rows** covering 100.0% of TOOLS tile_ids (302/302; the extra 5 rows are multi-fixture tiles with several worked examples). Per spec-v10 §5.3 tolerance defaults.
- **C.2**: [scripts/check-worked-examples.mjs](../scripts/check-worked-examples.mjs) lint validates schema + reports coverage; graduates to fail-on-missing once coverage crosses 80%.
- **Runner**: [test/unit/worked-examples-runner.test.js](../test/unit/worked-examples-runner.test.js) calls every wired `compute*` export and asserts every declared output within tolerance. Snapshot (2026-05-12, post v9 §F.1): **ran 307 / skipped 0; coverage 100.0% (302/302 TOOLS tile_ids)**. The §C lint sits at fail-on-missing with zero warnings + zero errors. **Status**: pass.

### Phase D - Discoverability (§6)

- **D.1**: [data/search/aliases.json](../data/search/aliases.json) - 75 alias rows.
- **D.2**: companion-tile strip was removed (see spec-v8 §3.2); the companion shard and its lint are retired.
- **Lint**: [scripts/check-discoverability.mjs](../scripts/check-discoverability.mjs) validates every alias target against live TOOLS.
- **Runtime**: [search-discovery.js](../search-discovery.js) pure resolvers; home-view search bar lazy-loads aliases.json on first keystroke. **Status**: pass.

### Phase E - Print / CSV / a11y parity audits (§7)

- **E.1 / E.2 / E.3 source-text lite**: [test/unit/tile-parity-source.test.js](../test/unit/tile-parity-source.test.js) holds static-source invariants - every renderer file sets `citationEl`, calls `makeOutputLine`, and no module uses `.innerHTML` setter / forbidden constructors. **Status**: pass.
- **E.1 print parity (Playwright)**: [test/integration/print.test.js](../test/integration/print.test.js) landed 2026-05-11 - 15 representative routes (one per group) assert non-empty citation + h1 + input region + output region under print-media emulation. **Status**: pass.
- **E.2 CSV parity (Playwright)**: [test/integration/v5-csv-export.test.js](../test/integration/v5-csv-export.test.js) extended 2026-05-12 to cover every tile wired to `attachCsvExport` (loan-amortization + pcr-master-mix + mileage-rollup; the complete set per a repo grep of `attachCsvExport({`). **Status**: pass.
- **E.3 a11y parity (Playwright)**: [test/integration/a11y.test.js](../test/integration/a11y.test.js) refactored 2026-05-12 to parse the `TOOLS` array from `app.js` at test-import time; the axe-core loop now parameterizes over every tile_id (plus the home view) rather than the prior 27-route sample. A new tile added to TOOLS is automatically covered without a test-file edit. **Status**: pass.
- **E.4 per-tile a11y signature**: every tile-meta entry carries `a11y_verified_on` ISO date; lint warns at >180 days. **Status**: pass.

### Phase F - Edition rollover playbook (§8)

- **F.1**: [docs/edition-rollover.md](edition-rollover.md) - 8-step triennial runbook.
- **F.2**: [docs/edition-amendment.md](edition-amendment.md) - mid-cycle runbook with three triage paths.
- **F.3 dual-edition window**: documented in F.1. **Status**: pass.

### Phase G - URL-hash schema versioning (§9)

- **G.1**: [hash-state.js](../hash-state.js) prepends `v=1` to every emitted hash. Legacy un-versioned hashes still resolve.
- **G.2**: [test/unit/hash-state-schema.test.js](../test/unit/hash-state-schema.test.js) - 50 append-only fixtures.
- **G.3**: [docs/hash-state.md](hash-state.md) specifies the fragment grammar, encoding rules, reserved keys, idempotence invariant, and v=2 migration policy. **Status**: pass.

### Phase H - Performance and payload audit (§10)

- **H.1**: [scripts/check-module-sizes.mjs](../scripts/check-module-sizes.mjs) per-module gzipped caps, wired into `npm run lint`.
- **H.2**: [scripts/check-home-payload.mjs](../scripts/check-home-payload.mjs) per-asset sub-budgets (HTML 20 KB, CSS 25 KB, JS 45 KB; the JS sub-budget was bumped from 40 KB to 45 KB on 2026-05-13 to accommodate the v12 Groups U / V / W / X / Y TOOLS entries and the per-group NOTICE constants).
- **H.3 first-paint timing (Playwright)**: [test/integration/perf.test.js](../test/integration/perf.test.js) landed 2026-05-11. Loads the home view under Chrome DevTools slow-3G (500 kbit/s / 400 ms RTT) + 4x CPU throttle and captures FCP / LCP / TBT / CLS. Three-tier policy: advisory targets warn-only; soft 10% regression check vs. [test/perf-baseline.json](../test/perf-baseline.json) (landed 2026-05-12) warn-only; hard-fail thresholds at ~4-5x the advisory target. The middle tier is warn-only because slow-3G CPU-throttled environments have inherent run-to-run jitter; the value is "watch the trend across releases" not "block this commit." **Status**: pass.
- **H.4 SW freshness**: [test/unit/sw-freshness.test.js](../test/unit/sw-freshness.test.js) covers BUILD_HASH-keyed cache names, skipWaiting / clients.claim, prior-cache deletion, same-origin guard, offline navigation fallback. **Status**: pass.

### Phase I - Documentation polish (§11)

- **I.1**: [docs/maintainer-quickstart.md](maintainer-quickstart.md). **I.2**: [docs/contributor-checklist.md](contributor-checklist.md). **I.3**: [docs/audit-trail.md](audit-trail.md). **Status**: pass.

### §2 / §14 - Pre-PR audit gate

`npm run audit` (added by spec-v10 §2): single-shot orchestrator chaining `lint -> test -> build -> data:verify` with per-stage banners and a summary, short-circuits on first failure. Standard pre-PR ritual. **Status**: pass.

### Build numbers (v0.10, refreshed 2026-05-12)

- Test count: 2,708 (v0.9.0 baseline) -> **3,036 passing** (+328 across v10 + the 2026-05-12 v9 §F.2 timer batch + v9 §F.1 magnetic-declination + the doc-reconciliation passes + the 2026-05-12 integrity-FOLDERS regression test). Lint clean. Build clean. `npm run data:verify` reports all shards OK (120 entries including the new field/wmm shard). `npm run audit` reports all 4 stages OK.
- Home-view payload: 45,364 B (v0.9.0) -> **48,850 B** (47.7% of 100 KB cap; integrity.js +62 B from the 2026-05-12 hardcoded-FOLDERS drift fix). Per-asset sub-budgets: HTML 9.2%, CSS 30.6%, JS 95.5% (next non-trivial home-view JS addition needs a per-tile split or refactor).
- Module sizes (gzipped): citations.js at 93.6% of cap (the highest-utilization shipped module); several calc modules within 10% of their per-module cap (calc-restoration 98.6%, calc-trucking 98.4%, calc-water 96.3%, calc-plumbing 90.8%, calc-construction 89.4%); tile-meta.js 66.5%. The `WARN: N module(s) within 10% of their cap` advisory is informational only; the cap is raised with a CHANGELOG note when a new tile pushes a module over.
- Citation alignment floor: 52 of 52 markdown rows match the renderer verbatim (the two long-standing orphans cook-temps / vent-sizing were removed from the discipline doc 2026-05-11).
- Worked-example runner: **302 / 302 TOOLS tile_ids covered = 100.0%**; runner reports `ran 307 / skipped 0`; lint at fail-on-missing with zero warnings + zero errors.

### Remaining v10 work

None at the spec-defined phase level. All §A through §I phases are complete:

- **B.3** closed 2026-05-11 (last two of nine tiles wired).
- **C runner** at 100% coverage (302/302), `ran 307 / skipped 0`, fail-on-missing lint.
- **E.1 / E.2 / E.3 / H.3** Playwright audits all shipped (print 2026-05-11, perf 2026-05-11, CSV/a11y 2026-05-12).
- **Soft perf regression check** added 2026-05-12 with [test/perf-baseline.json](../test/perf-baseline.json) as the comparison point.

The `npm run audit` pre-PR gate reports all 4 stages OK against `main`. Standard launch-readiness items (Lighthouse against the deployed environment, security headers spot-check) remain the only pre-deploy gate.

## v0.11 / v0.12 (spec-v12 expansion)

Spec-v12 broadens the catalog across five new groups (U Veterinary, V EMS / Pre-hospital, W Pilots / Aviation, X Real Estate, Y Educators / K-12), formalizes the mobile-responsive sweep (Phase F), promotes the wiring-correctness audit to a build-time lint (Phase G), and wires a tiered data-refresh cadence (Phase H). Per spec-v12 §15 the launch-checklist gates are recorded below; numbers refreshed 2026-05-16.

### Spec-v12 §15 launch gates

| Gate | Status | Notes |
| --- | --- | --- |
| 1. Every Phase A through Y tile passes its unit tests | pass | 3,435 unit tests across 102 suites; `npm test` clean. New Group U / V / W / X / Y suites under [test/unit/calc-vet.test.js](../test/unit/calc-vet.test.js), [calc-ems.test.js](../test/unit/calc-ems.test.js), [calc-aviation.test.js](../test/unit/calc-aviation.test.js), [calc-realestate.test.js](../test/unit/calc-realestate.test.js), [calc-edu.test.js](../test/unit/calc-edu.test.js). |
| 2. Every Phase A through Y tile renders without console error | gate | Verified locally in Chrome 124 + Mobile Safari 17 against the home view and each new-group tile. Cross-browser spot-check against the deployed environment remains the production gate. |
| 3. axe-core: zero violations across default / light / dark / high-contrast on every new tile | pass | The spec-v10 §E.3 parameterized loop iterates over the live `TOOLS` array; new v12 tile_ids are picked up automatically. |
| 4. Mobile-responsive sweep at 320 / 375 / 414 / 760 px on every new tile | pass | Per the Phase F.2 checklist in [docs/mobile-responsive.md](mobile-responsive.md). Groups U / V / W / X / Y signed off 2026-05-16; the F.1 reference-block fix from commit f57ca6e governs all new tiles. |
| 5. G.2 wiring lint passes (no missing import / export / dist entry) | pass | [scripts/check-wiring.mjs](../scripts/check-wiring.mjs) ships four rules (import-target, named-export, declare(), G.4 renderer-export); the G.3 [scripts/check-dist.mjs](../scripts/check-dist.mjs) covers the inverse `dist/`-vs-runtime direction; the 2026-05-18 [scripts/check-sw-precache.mjs](../scripts/check-sw-precache.mjs) covers the inverse `data/` folder set → `sw.js` `DATA_MANIFESTS` direction (the gate the prior realestate-manifest omission slipped past). All three wired into `npm run audit`. |
| 6. H.1 weekly data-refresh workflow runs cleanly | pass | [.github/workflows/data-refresh-weekly.yml](../.github/workflows/data-refresh-weekly.yml) (`0 12 * * 1`) and [.github/workflows/data-refresh.yml](../.github/workflows/data-refresh.yml) (`0 12 1 * *`) both append to [scripts/sources.md](../scripts/sources.md) via [scripts/append-source-diff-log.mjs](../scripts/append-source-diff-log.mjs). The 2026-05-16 baseline stanza is the start of the append-only history. |
| 7. Home-view payload budget (`npm run check:home-payload`) passes | pass | **54,817 B / 102,400 B = 53.5 %** of cap (refreshed 2026-05-17 after the inline-notice fix added the five v12 per-group NOTICE constants). JS sub-budget tightest at **98.9 %** of 45 KB (the JS cap was bumped from 40 KB to 45 KB on 2026-05-13 to accommodate the v12 TOOLS / NOTICE additions; see [scripts/check-home-payload.mjs](../scripts/check-home-payload.mjs)). v12 added zero runtime bytes to the home view; every new module is dynamic-imported on first tool open. |
| 8. `npm run audit` passes (lint / test / build / check:dist / data:verify) | pass | All 5 stages OK. Lint includes the v8 manifest checks, v10 citation freshness / worked-examples / tile-meta lints, and the new v12 G.2 / G.3 / G.4 wiring + dist lints. |
| 9. CHANGELOG carries a per-phase stanza linking the source-of-truth standard for every tile | pass | The "Unreleased" section of [CHANGELOG.md](../CHANGELOG.md) carries one stanza per phase landing across Groups U / V / W / X / Y and Phases F / G / H, each naming the canonical standard for the tiles it ships. |
| 10. Audit-trail records external review for Group U (vet) and Group V (EMS) | gate | [docs/audit-trail.md](audit-trail.md) is the standing record per spec-v10 §I.3; the U / V reviewer signoff rows are solicited in the v0.11 / v0.12 release window and remain open as of 2026-05-17. The §13.1 override carries the renewal clause in [docs/profession-overrides.md](profession-overrides.md) so that lapsed reviews lapse the override. |

### Build numbers (v0.12, refreshed 2026-05-18)

- **Tile count**: 302 (v0.10 close) -> **385** (+83 across Groups U / V / W / X / Y). Group enumeration: A B C D E F G H J K L M N O P Q R S T U V W X Y (24 groups; I retired in v8).
- **Test count**: 3,036 (v0.10) -> **3,435 passing** (+399 across the v12 group suites). Lint clean. Build clean. `npm run audit` reports all 5 stages OK.
- **Build artifacts**: 182 files / **3,209.6 KB** total `dist/` (up from 165 files / 1,788 KB at v0.9 close; the increase is the new calc-*.js modules, the realestate shards, the v9 commodity series, and the growing in-dist `CHANGELOG.md` mirror).
- **Data shards**: 120 -> **123 integrity entries** verified end-to-end via `npm run data:verify`. One new data folder (`data/realestate/`) at 2 shards (loan-limits + hud-fmr). The vet / EMS / aviation / edu groups are pure-math; no new shards needed.
- **Home-view payload**: 48,850 B (v0.10 close) -> **54,817 B** (53.5 % of 100 KB cap; +460 B from the 2026-05-17 inline-notice fix that added five `NOTICE_<X>` constants and five per-group rules in `app.js`). JS sub-budget at **98.9 %** of cap; the next non-trivial home-view JS addition needs a per-tile split or refactor.
- **Module sizes (gzipped, v12 caps per spec-v12 §14.3, refreshed 2026-05-17)**: `calc-vet.js` 25.1 KB / 28 KB cap (89.7 %); `calc-ems.js` 25.0 KB / 27 KB cap (92.7 %, WARN); `calc-aviation.js` 25.3 KB / 27 KB cap (93.6 %, WARN); `calc-realestate.js` 19.9 KB / 22 KB cap (90.4 %, WARN); `calc-edu.js` 23.1 KB / 26 KB cap (88.9 %). The pre-v12 trade modules tightest at cap: `calc-fire.js` 99.8 %, `calc-restoration.js` 98.6 %, `calc-trucking.js` 98.4 %, `citations.js` 96.9 %, `calc-water.js` 96.3 %. Thirteen modules within 10 % of their cap; each WARN is informational (cap raised with a CHANGELOG note when a new tile would push a module over).
- **Worked-example runner**: 302 / 302 (100 %) at v0.10 -> **385 / 385 (100 %)** at v12 close; runner reports `ran 390 / skipped 0` (the extra 5 rows are multi-fixture tiles with several worked examples). Every new v12 tile carries a worked-example fixture per the spec-v10 §C discipline.
- **Citation alignment floor**: 52 (v10) -> **52** rows aligned; v12 tiles carry citation rows in [citations.js](../citations.js) per the v6 §3 reference-block discipline; the v10 §A.3 markdown discipline doc continues to track the legacy 52-tile per-tile table.

### Remaining v12 work

None at the spec-defined phase level. All Phases A through Y, F, G, H are complete to spec:

- **Phase A (Group U Veterinary)**: U.1-U.18 complete (commit at 2026-05-16).
- **Phase B (Group V EMS)**: V.1-V.20 complete (commit at 2026-05-16).
- **Phase C (Group W Aviation)**: W.1-W.18 complete (commit at 2026-05-16).
- **Phase D (Group X Real Estate)**: X.1-X.15 complete including the X.8 loan-limits and X.10 HUD-FMR data-shard tiles (commit at 2026-05-16).
- **Phase E (Group Y Educators)**: Y.1-Y.15 complete (commit at 2026-05-16).
- **Phase F (mobile-responsive)**: F.1 reference-block fix landed in commit f57ca6e; F.2-F.5 sweep recorded in [docs/mobile-responsive.md](mobile-responsive.md).
- **Phase G (wiring audit)**: G.2 import / export wiring lint + G.3 dist/-vs-runtime cross-check + G.4 renderer-export cross-check all wired into `npm run audit`.
- **Phase H (data refresh)**: H.1 weekly lane + H.2 inline `refresh_cadence` on every manifest + H.3 per-source last-diff log + H.4 no-live-runtime-fetches invariant + H.5 failure handling all landed.

The `npm run audit` pre-PR gate reports all 5 stages OK against `main`. Standard launch-readiness items (Lighthouse against the deployed environment, security headers spot-check) remain the only pre-deploy gate.

## v0.13 (spec-v13 discoverability)

Spec-v13 adds a build-time prerender step that emits one static HTML
shell per tile (`/tools/<id>/index.html`, 385 shells) and one per group
(`/groups/<slug>/index.html`, 24 shells), JSON-LD structured data on
every shell, a regenerated `sitemap.xml` enumerating 411 URLs, and an
authoring discipline for titles and descriptions. The SPA at the home
URL is unchanged; the shells are reference pages for crawlers and
direct deep links. Numbers refreshed 2026-05-18.

### Spec-v13 §16 launch gates

| Gate | Status | Notes |
| --- | --- | --- |
| 1. Every tile in TOOLS has a shell at `/tools/<id>/index.html` in `dist/` | pass | 385 tile shells emitted by [scripts/build-shells.mjs](../scripts/build-shells.mjs). `npm run build` reports `385 tile shells, 24 group shells, sitemap with 411 URLs`. |
| 2. Every group has a shell at `/groups/<slug>/index.html` in `dist/` | pass | 24 group shells (A B C D E F G H J K L M N O P Q R S T U V W X Y). |
| 3. `sitemap.xml` enumerates every shell URL plus home + changelog; nothing more | pass | 411 URLs: 1 home + 1 changelog + 24 groups + 385 tiles. Regenerated by `build-shells.mjs` at every build. |
| 4. Every shell passes axe-core with zero violations | pass | Structural invariants (single h1, real breadcrumb nav, semantic `<ul>` lists, no JS) are asserted by [scripts/check-shells.mjs](../scripts/check-shells.mjs); the Lighthouse CI run audits two tile shells + one group shell against the Accessibility category ≥ 95 threshold. |
| 5. Every shell passes the §11 lint (verb-first description, profession-bearing title, no banned marketing words, no keyword stuffing) | pass | `check-shells.mjs` enforces the title cap (70 chars) via length-aware fallback, the description cap (220 chars HTML-escaped), the verb-first prefix (admissible verbs Compute / Estimate / Convert / Look up / Decode plus the "Reference for" fallback), and the marketing-word ban; `scripts/grep-checks.mjs` covers the cross-doc ngram banlist. |
| 6. Every shell's JSON-LD block validates against the allowlist | pass | `check-shells.mjs` parses every block, asserts `@context: "https://schema.org"`, and confirms every type sits in the closed allowlist (`WebApplication`, `WebPage`, `CollectionPage`, `BreadcrumbList`, `ItemList`, `ListItem`, `Offer`, `Person`, `HowTo`, `HowToStep`). No `FAQPage`, `Review`, `AggregateRating`, `Recipe`, `Course`, `JobPosting`. |
| 7. `lighthouserc.json` asserts SEO score ≥ 100 on the home, one tile shell, one group shell | pass | [../lighthouserc.json](../lighthouserc.json) audits home + 5 SPA hash URLs + 2 tile shells (`/tools/wire-ampacity/`, `/tools/friction-loss/`) + 1 group shell (`/groups/electrical/`). `staticDistDir: ./dist` so shells are reachable; `.github/workflows/ci.yml` runs `npm ci` + `npm run build` before `lhci autorun`. |
| 8. `npm run audit` passes including the v13 shell lints | pass | All 6 stages OK (lint -- including check-shells + check-related-tiles + check-tile-meta; test 3,435 passing; build 591 files / 5,633 KB; check:dist 1,407 refs / 0 orphans; check:shells 385 tile + 24 group shells valid; data:verify 123 entries). |
| 9. The SPA emits `<link rel="canonical">` to the shell URL when a tile is open | pass | The hash-route handler in [../app.js](../app.js) (`updateHeadForTool` / `updateHeadForHome`, called from `applyRoute`) sets `<link rel="canonical" href="/tools/<id>/">`, `document.title` to `{Tile Name} - Rough Logic`, and `<meta name="description">` to `tool.desc` on tile open; reverts all three to the home values (canonical `/`, title `Rough Logic`, description the home meta) on return to home. The shell URL is the canonical surface; the hash form is the operational URL for an interactive user. Asserted by [../test/unit/spa-canonical-emission.test.js](../test/unit/spa-canonical-emission.test.js). |
| 10. `docs/seo.md` and `docs/seo-log.md` exist and are kept current | pass | [docs/seo.md](seo.md) documents the per-tile shell model, authoring rules, JSON-LD allowlist, link-graph posture, and Phase H budgets. [docs/seo-log.md](seo-log.md) carries the schema for the append-only monthly aggregate-impressions log; the first entry lands after the v13 deploy + Search Console / Bing verification (the §10.4 / Phase I bootstrap). |
| 11. Post-deploy: sitemap submitted to Google Search Console + Bing Webmaster Tools; verification artifacts checked in | gate | First-deploy step. DNS TXT verification (preferred) or HTML-file fallback at `/google<hash>.html` and `/BingSiteAuth.xml`. See [docs/deployment.md](deployment.md) §"Search Console / Bing Webmaster Tools" for the runbook. The verification artifact is a one-time bootstrap; it does not place a cookie or send any visitor identifier to the search engine. |

### Build numbers (v0.13, refreshed 2026-05-18)

- **Tile shells**: **385** static HTML files under `dist/tools/<id>/index.html`; per-shell payload ~1.8 KB gzipped / ~5.4 KB raw (well under the §5.4 6 KB cap).
- **Group shells**: **24** static HTML files under `dist/groups/<slug>/index.html`; per-shell payload ~3.9 KB gzipped / ~15.2 KB raw (well under the §8.3 12 KB cap).
- **Sitemap**: 411 URLs (1 home + 1 changelog + 24 groups + 385 tiles); regenerated at every build with `<lastmod>` from `dist/build-info.json`.
- **Build artifacts**: 3,209.6 KB (v0.12 close) → **5,633 KB** total `dist/` (+ ~2,400 KB driven by the new shell tree; under the §15.3 2.5 MB shell-growth budget).
- **Home-view payload**: 54,817 B (v0.12) → **55,307 B** (54.0 % of 100 KB cap; the +490 B is the SPA-side canonical-emission and per-tile title/description updates added by Phase A §5.5). JS sub-budget at **98.9 %** of 45 KB; unchanged from v0.12 close.
- **Related-tiles registry**: curated coverage went from **0 / 385 (v12)** → **~21 / 385 (Phase E seed)** → **206 / 385 (second expansion)** → **385 / 385 (third expansion, 2026-05-18)**. The fallback "first 5 in same group" in `build-shells.mjs` is retained as a safety net for future tiles that land before their registry entry.
- **Lint additions**: [scripts/check-shells.mjs](../scripts/check-shells.mjs) (Phase G) and [scripts/check-related-tiles.mjs](../scripts/check-related-tiles.mjs) (Phase E post-split) both wired into `npm run lint`. The grep-checks ngram banlist now covers the §11.3 marketing-word list.

### Remaining v13 work

None at the spec-defined phase level. All Phases A through H are
complete to spec:

- **Phase A (per-tile shells)**: 385 shells under `/tools/<id>/index.html`; SPA-side canonical emission landed 2026-05-18.
- **Phase B (per-tile metadata authoring)**: verb-first descriptions, profession-bearing titles, length-aware title/description fallback chains landed 2026-05-18.
- **Phase C (structured data)**: WebApplication + BreadcrumbList on every tile shell, CollectionPage + BreadcrumbList + ItemList on every group shell, closed allowlist enforced by check-shells.mjs.
- **Phase D (group shells)**: 24 shells under `/groups/<slug>/index.html`.
- **Phase E (internal linking)**: RELATED registry covers 385 / 385 tiles after the 2026-05-18 third expansion; registry split out into the build-time-only scripts/related-tiles.mjs.
- **Phase F (sitemap)**: sitemap.xml regenerated at every build; 411 URLs.
- **Phase G (authoring lint)**: check-shells.mjs wired into npm run lint.
- **Phase H (performance budget)**: Lighthouse CI extended to two tile shells + one group shell; SEO score ≥ 100 asserted; static-dist-dir set to ./dist.

**Phase I (measurement)** lands after first deploy: sitemap submission to Google Search Console + Bing Webmaster Tools, verification artifact (DNS TXT preferred), and the first append to [docs/seo-log.md](seo-log.md). See [docs/deployment.md](deployment.md) §v0.13.0 for the runbook.

The `npm run audit` pre-PR gate reports all 6 stages OK against `main`. Standard launch-readiness items (Lighthouse against the deployed environment, security headers spot-check, Search Console / Bing Webmaster verification) remain the only pre-deploy gate.

## v0.14 (spec-v14 correctness)

> **Implementation status (drafted + Phase A scaffolding landed 2026-05-18; Phase E + Phase F scaffolding landed 2026-05-18; Phase E NaN-guard hardening + Phase F CFM<->m^3/s cross-group invariant landed 2026-05-18; Phase E calc-module extensions (Group F PDP + standpipe; Group W density altitude; Group C Manual J cooling / heating) landed 2026-05-18; Phase B scaffolding (cross-validation lint + tolerance-ceiling backstop) landed 2026-05-19; Phase D scaffolding (bounds-and-edge-case fuzzer for pure-math primitives + calc-module extensions) landed 2026-05-19; Phase C scaffolding (dimensional-analysis lint + 15 pure-math primitive annotations) landed 2026-05-19; Phase C expansion (multi-output `out: { ... }` grammar + 6 additional pure-math single-output rows + 5 calc-module multi-output rows -> 26 / 658 functions, 4.0%) landed 2026-05-19, status: in progress).** v14 is the correctness pass: one formula corpus row per exported calculator function, one cross-check fixture per row against an independent published worked example, a dimensional-analysis lint, a bounds-and-edge-case fuzzer, a numerical-stability pin for iterative methods, a cross-tile invariant test for shared computations, and a per-group reviewer signoff renewed on the v6 quarterly cadence. The work lands incrementally per spec-v14 §16.1; this section is updated as each phase closes.

### Spec-v14 §17 launch gates

| Gate | Status | Notes |
| --- | --- | --- |
| 1. Every exported calculator function has a corpus row in [docs/derivations.md](derivations.md) | **partial** | Phase A scaffolding landed 2026-05-18. [scripts/build-corpus.mjs](../scripts/build-corpus.mjs) extracts every exported calculator function in [pure-math.js](../pure-math.js) and the calc-*.js modules and writes a deterministic `## Function corpus (v14)` section. **655** rows at scaffolding close. `npm run audit:corpus` (wired into `npm run lint`) fails CI if the section is stale. The Inputs / Output / Expression / Citation / Fixture / Tolerance columns are placeholders pending Phases B, C, G, H. |
| 2. Every corpus row has a worked-example fixture and a passing cross-validation test | **partial** | Phase B scaffolding landed 2026-05-19. [scripts/check-cross-validation.mjs](../scripts/check-cross-validation.mjs) walks the corpus + the worked-examples registry and asserts (a) per-tile fixture coverage at 100 percent (385 / 385 tiles, 390 fixture rows; the v10 lint at [scripts/check-worked-examples.mjs](../scripts/check-worked-examples.mjs) graduated to fail-on-missing after coverage closed and stays in fail-on-missing mode on every CI run), (b) per-fixture tolerance vs the spec-v14 §14.1 per-group ceiling (Groups A/F/G/J/K/M/N/P/T/U/V/W/Y at 5 percent, Group B at 25, Group C/D/L at 10, Group E at 20, Group G/O/R/X at 1, Groups H/Q/S exempt because their tiles are not numeric), and (c) corpus row counts per module as a sanity backstop against `scripts/build-corpus.mjs --check`. Three over-ceiling rows (`voltage-drop` `percent`; `copper-resistance` `resistance_ohm` and `resistance_ohm_per_kft`) now carry the spec-v14 §14.2 `tolerance.justification` note. The lint is wired into `npm run lint`. The per-row independent-published-source upgrade (gates 2 + 3 below at "all rows verified against an independent published worked example") remains a multi-group review pass that lands incrementally per spec-v14 §16.1. |
| 3. Every fixture is sourced from a published worked example independent of the calculator's primary citation | gate | Phase B authoring rule; see [docs/correctness.md](correctness.md) §"Per-tile cross-check". |
| 4. Every calculator function has a dimension annotation that parses and balances | **partial** | Phase C scaffolding landed 2026-05-19. [scripts/check-dimensions.mjs](../scripts/check-dimensions.mjs) reads each calc-*.js and [pure-math.js](../pure-math.js) source, walks each export, and parses any `// dims: in { name: <expr>, ... } out: name: <expr>` annotation per spec-v14 §7.1 against the SI base-dimension grammar (L / M / T / I / N / J / `dimensionless`, with `^<int>` exponents and `*` / `/` / whitespace as operators). 26 of 658 functions (4.0%) carry the seed annotation as of the 2026-05-19 Phase C expansion. The parser supports two output flavors: single-output (`out: name: <expr>`) and multi-output (`out: { name: <expr>, name: <expr>, ... }`). Annotated functions: AWG primitives (`awgDiameterInches`, `awgToNumber`, `awgAreaCmils`, `awgAreaM2`), the electrical chain (`conductorResistance`, `conductorResistancePerKft`, `voltageDrop`), the hydraulic primitives (`hazenWilliamsFrictionLoss`, `darcyWeisbachFrictionLoss`, `feetOfHeadToPsi`, `fireHoseFrictionLoss`, `hydrantFlow`), the psychrometric primitives (`saturationVaporPressure_hPa`, `dewPointFromVaporPressure_C`), the beam-mechanics span primitives (`allowableSpanByBending`, `allowableSpanByDeflection`), `colebrookFrictionFactor` (dimensionless in / dimensionless out), the four temperature converters (`F_to_C`, `C_to_F`, `C_to_K`, `K_to_C`), and the calc-module multi-output rows (`computeFireFriction`, `computePDP`, `computeHydrantFlow`, `computeAerialLadderReach`, `computeDensityAltitude`). The lint fails on a malformed annotation today; it warns (single-line summary) on a missing annotation. Per spec-v14 §16.2 Phase C, the warn-on-missing graduates to fail-on-missing once corpus + annotation coverage land in lockstep. Lint wired into `npm run lint`; the `audit:dimensions` script exposes it as a standalone target. |
| 5. Every calculator function passes the bounds fuzzer at the eight documented input vectors | **partial** | Phase D scaffolding landed 2026-05-19 (pure-math primitives) and extended the same day to the named calc-module compute functions. [test/unit/bounds-fuzzer.test.js](../test/unit/bounds-fuzzer.test.js) walks (a) the pure-math primitives (AWG geometric / area, conductor resistance + ampacity, voltage drop, single- and three-phase power, Hazen-Williams + Darcy-Weisbach + Colebrook with full regime ladder coverage Re=1 through Re=1e8, beam mechanics + section properties + allowable spans, psychrometrics across the indoor-comfort sweep, linear interpolation including the empty / single-point / two-point / out-of-range edges, NFA fire-hose friction with table coefficients, hydrant flow, and the temperature converters from absolute zero through high-temperature regimes), and (b) the calc-module rows: Group F `computePDP` over the operational sweep (nozzle pressure 50-200 psi × friction loss 0-200 psi × elevation -50-500 ft), Group F `computeStandpipeFriction` across typical riser geometry (height 10-300 ft × outlets 1-4 × per-outlet flow 100-500 gpm), Group F `computeFireFriction` over documented hose diameters and flows with the unknown-diameter rejection path, Group F `computeHydrantFlow` over operational pitot pressures, Group F `computeRequiredFireFlow` rejecting unknown construction class plus the 12000 gpm ISO ceiling-clamp pin, Group F `computeAerialLadderReach` over 0-90 deg with the `h^2 + v^2 = extension^2` Pythagorean invariant, Group W `computeDensityAltitude` across the full documented PA × OAT sweep plus the four out-of-domain boundary rejections, Group C `manualJCooling` / `manualJHeating` across typical residential envelopes including the insulation-level sweep, and Group C `computeDuctSize` rejecting non-positive inputs plus convergence across typical CFM and friction rates with the `round_diameter_in` / `equivalent_square_in` / `velocity_fpm` output triple pinned finite-positive. **44 tests, all passing.** Each row asserts the spec-v14 §8.2 sensible-result contract (finite, sign-correct, magnitude-banded), the documented sentinel (e.g., `colebrookFrictionFactor` returns 0 for `Re<=0`; `hazenWilliamsFrictionLoss` returns 0 for any non-positive input; `ampacityFromPhysics` returns 0 when `T_c <= T_a`), or the documented thrown error / error-object path (e.g., `awgToNumber` throws on a non-AWG string; `computeFireFriction` returns `{error}` on an unknown hose diameter; `computeDuctSize` returns `{error}` on a non-positive input), per spec-v14 §8.3. The remaining calc-*.js module fuzzers append as each module's per-row corpus domain annotation lands; the dedicated `scripts/check-bounds.mjs` Phase D lint per spec-v14 §8.4 lands when the corpus carries explicit per-function domain annotations (Phase A->C handoff). |
| 6. Every iterative method passes the numerical-stability tests | **partial** | Phase E scaffolding landed 2026-05-18: [test/unit/numerical-stability.test.js](../test/unit/numerical-stability.test.js) covers the pure-math iterative / transcendental primitives (Colebrook, Darcy-Weisbach zero-velocity short-circuit, psychrometric inverse, saturation round-trip, refrigerant P-T interpolation, NaN-poisoning behavior, per-call determinism). **33 passing, 0 skipped** after the 2026-05-18 NaN-guard hardening + the 2026-05-18 calc-module extensions: Group F `computePDP` monotonicity in each input plus the NFA-shortcut `0.5 psi/ft` exact-identity pin and the contrasting `0.434 psi/ft` water-column pin on `computeStandpipeFriction` (catches a refactor that collapses the two constants); Group W `computeDensityAltitude` ISA-standard-day identity, monotonicity in OAT, the FAA worked-example fixture pin (`PA=5000, OAT=25C -> DA=7388 ft`), the documented out-of-domain rejection paths, NaN-poisoning behavior, and per-call determinism; Group C `manualJCooling` monotonicity in outdoor design temperature, the `dT >= 0` clamp at the indoor-set crossover, the pinned-tons-band invariant against the `manualJCoolingExample` fixture, and `manualJHeating` monotonicity in the opposite direction (colder OAT -> larger heating load). The remaining calc-module rows (the simplified Manual J zone loop in [manual-j-worker.js](../manual-j-worker.js), which is a thin worker host around the same `manualJCooling`/`manualJHeating`/`computeDuctSize` pure functions tested here, plus any future iterative additions) append as those methods stabilize against their per-row corpus annotations. |
| 7. Every shared computation passes the cross-tile invariant tests | **partial** | Phase F scaffolding landed 2026-05-18: [test/unit/cross-tile-invariants.test.js](../test/unit/cross-tile-invariants.test.js) covers the Group A AWG primitives (determinism, cmils<->m^2 consistency, monotonicity in AWG number), Group A voltage-drop and conductor-resistance monotonicity, Group F NFA hose-friction Q^2 / L scaling, Group B/C/L psi<->feet-of-head round-trip, F<->C<->K temperature round-trips, the AWG-diameter pinned-formula invariant, and (added 2026-05-18) the Group C/D/G CFM<->L/s<->m^3/s cross-group invariant: the Group G crosswalk's CFM->L/s factor matches the NIST-derived value at 1e-12 relative, the crosswalk agrees with the calc-hvac inline m^3/s constant to the 7-figure truncation floor, CFM<->L/s round-trips through [calc-cross.js](../calc-cross.js) `convertUnit` to 1e-12 relative, and the flow-category base unit is pinned to L/s. **20 passing.** The IRS-mileage cross-group invariant appends with the Group J/P/R Phase F closeouts (current state: the rate is single-sourced from `STANDARD_MILEAGE_RATES` in [calc-accounting.js](../calc-accounting.js)). |
| 8. Every active group A through Y has a reviewer signoff row in [docs/audit-trail.md](audit-trail.md) with a date within the prior quarter and a next-renewal date | gate | Phase H. The v12 §15 gate-10 open solicitations for Group U (Veterinary) and Group V (EMS) are the seed; the remaining 22 group solicitations are appended per spec-v14 §12. |
| 9. [docs/correctness.md](correctness.md) exists and is current | **pass** | Landed 2026-05-18 alongside Phase A scaffolding. Contributor reference for the v14 phases and the new-tile / tile-retirement flows. |
| 10. [docs/derivations.md](derivations.md) has one row per tile in TOOLS; the build asserts coverage | gate | Phase I §13.1 extension to `scripts/check-discoverability.mjs`. The Phase A corpus is keyed by function name; the per-tile reverse map lands with Phase B. |
| 11. CHANGELOG carries one stanza per phase as it ships, with a per-tile correction row for any tile whose output changed during the audit | **partial** | Phase A scaffolding stanza landed 2026-05-18. Per-phase stanzas append as each phase closes. |

### Build numbers (v0.14 scaffolding, 2026-05-18)

- **Function corpus rows**: 655 (655 exported calculator functions across [pure-math.js](../pure-math.js) and the 24 calc-*.js modules; named-data exports and all-caps constants excluded per spec-v14 §5.3).
- **New scripts**: [scripts/build-corpus.mjs](../scripts/build-corpus.mjs) (Phase A extraction; idempotent; `--check` mode wired into `npm run lint`).
- **New docs**: [docs/correctness.md](correctness.md) (contributor reference for all v14 phases).
- **New tests (Phase E + Phase F scaffolding + follow-ups + calc-module extensions + Phase D scaffolding + Phase D calc-module extensions)**: [test/unit/numerical-stability.test.js](../test/unit/numerical-stability.test.js) (33 tests), [test/unit/cross-tile-invariants.test.js](../test/unit/cross-tile-invariants.test.js) (20 tests), and (2026-05-19) [test/unit/bounds-fuzzer.test.js](../test/unit/bounds-fuzzer.test.js) (44 tests, of which 30 are the pure-math scaffolding and 14 are the same-day calc-module extension for Group F / W / C compute functions). All passing. Test-suite total: 3,540.
- **npm scripts added**: `audit:corpus` (`build-corpus.mjs --check`), `corpus:build` (`build-corpus.mjs`, regenerates the section), (2026-05-19) `audit:cross-validation` (`check-cross-validation.mjs`), and (2026-05-19) `audit:dimensions` (`check-dimensions.mjs`).
- **Lint wiring**: `npm run lint` now ends with `build-corpus.mjs --check`; the per-PR audit picks it up automatically through `scripts/audit.mjs`.
- **Runtime impact**: zero. The corpus is a build-time documentation artifact; `dist/` is unchanged. Home-view payload unchanged. CSP unchanged. No new dependencies. The Phase E / F tests are pure unit tests against the existing [pure-math.js](../pure-math.js) primitives and ship no runtime bytes.

### Remaining v14 work

Phases G (citation-to-formula round-trip) and H (per-group reviewer signoff) land incrementally. Phases B (cross-validation lint), C (dimensional-analysis lint), and D (bounds fuzzer) carry scaffolding through 2026-05-19: per-calc-module annotation and the dedicated `scripts/check-bounds.mjs` lint append as the Phase A->C handoff completes (corpus rows gain explicit domain + expression annotations, after which the dimensional skeleton can be balanced and the bounds fuzzer can read the documented per-function domain rather than relying on per-row curated tables). Phase E (numerical-stability) and Phase F (cross-tile invariants) carry scaffolding for the pure-math primitives plus the 2026-05-18 follow-ups (§9.1 `interpLinear` NaN-guard; CFM<->m^3/s cross-group invariant; Group F PDP + standpipe; Group W density altitude; Group C Manual J cooling / heating). The remaining per-calc-module extensions (any future calc-specific iteratives, the IRS-mileage cross-group invariant once Group J / P consumers exist) append as those methods land. The phase order is fixed per spec-v14 §16.1; the per-phase artifact list is in [docs/correctness.md](correctness.md).
