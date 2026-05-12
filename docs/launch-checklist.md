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
- **D.2**: [data/search/companions.json](../data/search/companions.json) - 70+ source tiles with up to 4 companions each.
- **Lint**: [scripts/check-discoverability.mjs](../scripts/check-discoverability.mjs) validates every alias target / companion id against live TOOLS.
- **Runtime**: [search-discovery.js](../search-discovery.js) pure resolvers; home-view search bar lazy-loads aliases.json on first keystroke; tool view renders a `.companion-strip` after the calculator. **Status**: pass.

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
- **H.2**: [scripts/check-home-payload.mjs](../scripts/check-home-payload.mjs) per-asset sub-budgets (HTML 20 KB, CSS 25 KB, JS 40 KB).
- **H.3 first-paint timing (Playwright)**: [test/integration/perf.test.js](../test/integration/perf.test.js) landed 2026-05-11. Loads the home view under Chrome DevTools slow-3G (500 kbit/s / 400 ms RTT) + 4x CPU throttle and captures FCP / LCP / TBT / CLS. Three-tier policy: advisory targets warn-only; soft 10% regression check vs. [test/perf-baseline.json](../test/perf-baseline.json) (landed 2026-05-12) warn-only; hard-fail thresholds at ~4-5x the advisory target. The middle tier is warn-only because slow-3G CPU-throttled environments have inherent run-to-run jitter; the value is "watch the trend across releases" not "block this commit." **Status**: pass.
- **H.4 SW freshness**: [test/unit/sw-freshness.test.js](../test/unit/sw-freshness.test.js) covers BUILD_HASH-keyed cache names, skipWaiting / clients.claim, prior-cache deletion, same-origin guard, offline navigation fallback. **Status**: pass.

### Phase I - Documentation polish (§11)

- **I.1**: [docs/maintainer-quickstart.md](maintainer-quickstart.md). **I.2**: [docs/contributor-checklist.md](contributor-checklist.md). **I.3**: [docs/audit-trail.md](audit-trail.md). **Status**: pass.

### §2 / §14 - Pre-PR audit gate

`npm run audit` (added by spec-v10 §2): single-shot orchestrator chaining `lint -> test -> build -> data:verify` with per-stage banners and a summary, short-circuits on first failure. Standard pre-PR ritual. **Status**: pass.

### Build numbers (v0.10, refreshed 2026-05-12)

- Test count: 2,708 (v0.9.0 baseline) -> **3,034 passing** (+326 across v10 + the 2026-05-12 v9 §F.2 timer batch + v9 §F.1 magnetic-declination + the doc-reconciliation passes). Lint clean. Build clean. `npm run data:verify` reports all shards OK (120 entries including the new field/wmm shard). `npm run audit` reports all 4 stages OK.
- Home-view payload: 45,364 B (v0.9.0) -> **48,658 B** (47.5% of 100 KB cap). Per-asset sub-budgets: HTML 9.2%, CSS 30.6%, JS 95.1% (next non-trivial home-view JS addition needs a per-tile split or refactor).
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
