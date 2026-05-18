# roughlogic

Field math for the trades. A calm, fast, ad-free, account-free, ever-free reference site.

roughlogic.com is a single-page static web application that helps electricians, plumbers, HVAC technicians, water-damage and mold-restoration techs, carpenters and general contractors, and fire-ground engineers do the math they actually do during a workday. Everything runs in the browser. No server, no account, no analytics, no telemetry, no AI inference, no API key, no ongoing operating cost beyond domain renewal.

## The problem

Tradespeople do quick math constantly. Voltage drop, friction loss, conduit fill, duct sizing, refrigerant superheat, psychrometric drying goals, stair geometry, fireground pump pressure. The reference material lives behind paywalled code books, in licensed apps that nag the user constantly, or in cluttered websites that lard the page with advertisements and trackers. The trades deserve better.

## The solution

A single static page with three hundred eighty-five small calculators and reference tools, organized into twenty-four categories (the original eight trades plus v4's Trucking and Logistics, Mechanic, Agriculture and Forestry, Water and Wastewater Operations, Stage and Live Production, Kitchen and Food Service, Field / Backcountry / SAR, Historical Reference Data, v5's Accounting / Tax / Small-Business, Legal Plain-English and Statutory Math, and Bench Science and Laboratory Math, and v12's Veterinary, EMS / Pre-hospital, Pilots / Aviation, Real Estate, and Educators / K-12), plus a set of cross-cutting platform affordances (offline indicator, example deep-link, high-contrast theme for direct sunlight, and crash-safe resume). Each tool does one thing. The home page is scannable in five seconds. Every formula is computed from public physics or public-domain data. Every reference value is sourced and dated. The user can save the page and use it offline forever.

## Quick start

Open https://roughlogic.com in a browser. Type a tool's name in the header search bar (it autocompletes from the live tool list - pick a suggestion to jump straight to that calculator) or scroll the twenty-four category sections. Click the tile to open the calculator. Type in your numbers. Read the answer. Copy to clipboard. Go back to work. The header toggle cycles three themes (dark, light, high-contrast for direct sunlight); the chosen theme persists across reloads.

## How it works and how to use it

The home view shows all three hundred eighty-five tools organized into twenty-four category sections (Electrical, Plumbing and Gas, HVAC, Water Damage and Mold Restoration, Carpentry and Construction, Fire-Ground Engineering, Cross-Trade Utilities, Knowledge References, Trucking and Logistics, Mechanic - Auto / Marine / Aviation, Agriculture and Forestry, Water and Wastewater Operations, Stage and Live Production, Kitchen and Food Service, Field / Backcountry / SAR, Historical Reference Data, Accounting / Tax / Small-Business, Legal Plain-English and Statutory Math, Bench Science and Laboratory Math, Veterinary, EMS and Pre-hospital, Pilots and General Aviation, Real Estate, and Educators / K-12). A search box in the header live-filters by tool name and description across every section, with a native datalist that autocompletes against every tool name; picking a suggestion routes straight to that calculator.

Selecting a tool opens its calculator view. Each calculator has labeled numeric inputs, a "Test with example" button that fills the inputs with a known reference case, an inline citation, a live-rendered output that updates as you type, and a Copy button next to every numeric output. There is no submit button anywhere on the site.

Pinned tiles and calculator state are stored in the URL hash. You can bookmark or share a calculator with its inputs preloaded.

## System design and architecture

The site is a single index.html, a single styles.css, a single app.js, a service worker for offline use, and a data folder of sharded JSON. The architecture follows the same principles as encryptalotta.com and sophiewell.com: same-origin static assets, a strict Content Security Policy, no runtime dependencies, no telemetry.

Most computation runs on the main thread. The simplified Manual J load estimators and the duct sizing calculator run in a Web Worker. The service worker pre-caches the application shell and caches data shards on first access.

For full details see docs/architecture.md.

### Trade audiences

- Electrical
- Plumbing and Gas
- HVAC
- Water Damage and Mold Restoration
- Carpentry and Construction
- Fire-Ground Engineering

### Utility groups

- Group A: Electrical (utilities 1 to 11; v2 adds 65 to 71)
- Group B: Plumbing and Gas (utilities 12 to 20; v2 adds 72 to 78)
- Group C: HVAC (utilities 21 to 31; v2 adds 79 to 85)
- Group D: Water Damage and Mold Restoration (utilities 32 to 39; v2 adds 86 to 89)
- Group E: Carpentry and Construction (utilities 40 to 50; v2 adds 90 to 99)
- Group F: Fire-Ground Engineering (utilities 51 to 58; v2 adds 100 to 104)
- Group G: Cross-Trade Utilities (utilities 59 to 64; v2 adds 105 to 113)
- Group H: Knowledge References (v2 utilities 114 to 118; v3 174 to 179; v5 265 to 268)
- Group J: Trucking and Logistics (v4 utilities 200 to 206)
- Group K: Mechanic - Auto, Marine, Aviation (v4 utilities 207 to 214)
- Group L: Agriculture and Forestry (v4 utilities 215 to 221)
- Group M: Water and Wastewater Operations (v4 utilities 222 to 227)
- Group N: Stage and Live Production (v4 utilities 228 to 233)
- Group O: Kitchen and Food Service (v4 utilities 234 to 238 in spec; renumbered)
- Group P: Field, Backcountry, SAR (v4 utilities 239 to 244 in spec; renumbered)
- Group Q: Historical Reference Data (v4 utility 233)
- Group R: Accounting, Tax, and Small-Business (v5 utilities 234 to 245)
- Group S: Legal Plain-English and Statutory Math (v5 utilities 246 to 254)
- Group T: Bench Science and Laboratory Math (v5 utilities 255 to 264)
- Group U: Veterinary (v12 §5, U.1 to U.18; 18 tiles)
- Group V: EMS / Pre-hospital (v12 §6, V.1 to V.20; 20 tiles)
- Group W: Pilots / Aviation (v12 §7, W.1 to W.18; 18 tiles)
- Group X: Real Estate (v12 §8, X.1 to X.15; 15 tiles)
- Group Y: Educators / K-12 (v12 §9, Y.1 to Y.15; 15 tiles)

Cross-cutting platform affordances (v2 / v3 / v5): Print / PDF view (122), Offline indicator (123), Example deep-link / Copy share link (124), CSV export (v5 269), Print-table CSS (v5 270), Inline glossary tooltip (v5 271). Recents (120) and Big Buttons mode (182) were retired in v11; Project Bundle (121) was retired in commit 5734d28 alongside `bundle.js` (pre-retirement `#b=` hashes still parse and route to the home view). See [specs/spec-v11.md](specs/spec-v11.md).

The full inventory is in [specs/spec.md](specs/spec.md), [specs/spec-v2.md](specs/spec-v2.md), [specs/spec-v3.md](specs/spec-v3.md), [specs/spec-v4.md](specs/spec-v4.md), [specs/spec-v5.md](specs/spec-v5.md), [specs/spec-v6.md](specs/spec-v6.md), [specs/spec-v7.md](specs/spec-v7.md), [specs/spec-v8.md](specs/spec-v8.md), [specs/spec-v9.md](specs/spec-v9.md), [specs/spec-v10.md](specs/spec-v10.md), [specs/spec-v11.md](specs/spec-v11.md), and [specs/spec-v12.md](specs/spec-v12.md). Each spec inherits from the prior ones; v6 set the citation discipline, v7 / v8 / v9 added new tiles, v10 was the platform-only maintenance pass, v11 retired Recents and Big Buttons mode, and v12 added five new groups (Veterinary, EMS / Pre-hospital, Pilots / Aviation, Real Estate, Educators - 86 tiles total) plus a mobile-responsive sweep (Phase F), a wiring-correctness lint (Phase G; G.2 import / export, G.3 dist/-vs-runtime, G.4 renderer-export), and a tiered automated data-refresh (Phase H; weekly + monthly lanes with per-shard `refresh_cadence`).

## Deterministic logic versus LLM usage

roughlogic uses zero LLM and zero AI. Every output is the result of a deterministic function over user input and bundled data. There is no inference, no model, no probabilistic step. The same inputs produce the same outputs, every time, on any device, with or without a network connection.

## Commands

The site itself has no command-line interface. The repository ships the following npm scripts for development, testing, and data refresh.

- `npm run dev` Start a local development server.
- `npm run build` Produce the static dist/ for deployment.
- `npm test` Run the full test suite.
- `npm run test:unit` Run unit tests under Node's built-in test runner.
- `npm run test:e2e` Run Playwright end-to-end tests.
- `npm run test:a11y` Run axe-core accessibility tests.
- `npm run lint` Run the linter and the ban-list grep checks.
- `npm run data:refresh` Run the data pipeline; fetch, parse, and shard datasets.
- `npm run data:verify` Verify shard SHA-256 hashes against expected-hashes.json.
- `npm run clean` Remove dist/ and temp build artifacts.

## Safety guarantees

- Read-only by default. The site does not write to sessionStorage, cookies, or IndexedDB. localStorage is used for one key (`rl-theme`, value `"light"`, `"dark"`, or `"high-contrast"`) so the chosen theme survives reloads without a flash of the wrong palette; no calculator inputs, pinned set, or bundle data is written there. The service worker cache holds only same-origin static assets.
- No outbound network calls at runtime. CSP `connect-src 'self'` is enforced.
- All inputs are typed. No HTML rendering of user-supplied text.
- A startup integrity check (integrity.js) verifies the SHA-256 hash of each per-folder data manifest matches the hash recorded in `data/integrity.json` (a build-time sidecar produced by the data pipeline). Mismatch surfaces a non-blocking banner naming the affected dataset.
- Inline notices on every calculator and a persistent footer disclaimer state that the site is a math aid, not a code authority.

## Limitations

The site is honest about what it is and what it is not.

- It is not a code authority. It does not interpret code requirements. The authority having jurisdiction governs all installations and inspections.
- It does not reproduce any licensed code text or table. NEC, IPC, IRC, ASHRAE Fundamentals, ACCA Manual J, NFPA standards, and AWC tables are not bundled. Where the site's first-principles calculator produces values that match a code table for the same inputs, that is because both are computing the same physics, not because the table was copied.
- The Manual J cooling and heating load estimators are simplified. A code-compliant load calculation requires Manual J. The site says so on every Manual J view.
- The site does not include a HazMat reference. That belongs on a future hazardous-materials reference site.
- The site does not generate code-compliant designs. The user is the judgment.

## Stability commitments

- No A/B testing, ever.
- No user-visible feature flags.
- No tracking. No email capture. No notifications.
- Public changelog at CHANGELOG.md (also rendered as a static page at /changelog.html).
- 90-day deprecation notice for any utility being removed or having its formula changed.
- Semantic versioning.

## Documentation

- [specs/](specs/) - the build specifications. spec.md is the v1 source of truth; spec-v2 / v3 / v4 / v5 / v6 / v7 / v8 / v9 / v10 / v11 / v12 are inheriting expansion packs. Each carries an implementation-status banner naming the release that landed it. The constraints in each spec remain in force for any future work; every later spec inherits earlier specs by reference.
- docs/architecture.md - runtime architecture and ASCII diagram.
- docs/data-sources.md - every dataset with canonical source, license, cadence, and shard layout.
- docs/legal.md - the legal posture, dataset attributions, and the first-principles approach.
- docs/derivations.md - how each physics-derived calculator is derived from first principles.
- docs/accessibility.md - WCAG 2.2 Level AA conformance checklist.
- docs/threat-model.md - threats and controls.
- docs/performance.md - performance budget and how it is enforced.
- docs/deployment.md - Cloudflare Pages configuration.
- docs/launch-checklist.md - written report against spec section 14 step 22 plus the per-release deploy-time gates (v0.1.0 baseline, v0.2.0 spec-v2 additions, v0.9.0 v5 expansion, v0.10 platform hardening, v0.11 / v0.12 Groups U / V / W / X / Y; the latest section is the live snapshot).
- docs/citation-discipline.md (v8) - per-tile source-stamp strings and edition table (generates docs/citation-strings.generated.json).
- docs/v6-audit.md (v6) - per-group citation audit ledger.
- docs/notice-variants.md (v5, expanded v12) - the inline-notice variants and per-tool governance overrides. The v5 baseline introduced five new variants (tax-law, legal-information, bench-science, plus the existing default and fire) on top of the v4 default / fire / historical set; v12 §5-§9 added five more (veterinary, EMS / pre-hospital, aviation, real-estate, education) for the new Groups U / V / W / X / Y.
- docs/hash-state.md (v10 §G.3) - the URL-hash grammar and per-version encoding rules; back-compat policy for old links.
- docs/edition-rollover.md (v10 §F.1) - triennial code-rollover runbook (NEC, IPC, IBC, IMC, IFC, etc).
- docs/edition-amendment.md (v10 §F.2) - mid-cycle amendment runbook (Federal Register / ASHRAE addendum / EPA reissue).
- docs/maintainer-quickstart.md (v10 §I.1) - one-page "I want to X" command set for recurring maintenance.
- docs/contributor-checklist.md (v10 §I.2) - per-PR checklist (axe-core, manifest, citation, payload, CHANGELOG).
- docs/audit-trail.md (v10 §I.3) - append-only public record of external citation / a11y / security reviews.
- docs/profession-overrides.md (v12 §13.1) - the v12 override of the spec.md / spec-v9 §11 clinical-utility carve-out for Groups U (Veterinary) and V (EMS), with the bounded scope and audit posture.
- docs/mobile-responsive.md (v12 §F.2) - per-tile mobile-responsive sweep checklist and per-group sweep state (320 / 375 / 414 / 760 px viewports).
- CHANGELOG.md - public changelog.
