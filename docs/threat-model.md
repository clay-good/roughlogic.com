# Threat Model

roughlogic.com is a single-page static web application with no server, no account system, no analytics, and no third-party network calls at runtime. This document enumerates the threats that apply and the controls that mitigate them.

## Assets

- The static shell (index.html, styles.css, app.js, sw.js).
- The bundled data shards in data/.
- The user's input values, which never leave the browser.
- The integrity of the calculation outputs the user reads.

## Adversaries

- Network attackers between the user and Cloudflare Pages.
- Authors of malicious scripts that might be injected through compromised dependencies (we have none at runtime) or malicious input.
- Malicious users attempting to abuse the site to attack other users (cross-site scripting, link injection).
- Misuse: a user who treats the calculator's output as code-compliant and skips the inspector's review.

## Threats and controls

### T1. Cross-site scripting via user-pasted text

Threat: A user pastes attacker-controlled text into a numeric input. If the application renders that text as HTML, an attacker could craft content that executes script.

Controls:
- All DOM updates use `textContent` or `createElement`. `innerHTML` is forbidden in the codebase.
- ESLint rule and a CI grep check fail the build on any `innerHTML` usage.
- Inputs are typed (numeric inputs reject non-numeric text at the input boundary; reference inputs are bounded selects).
- CSP `script-src 'self'` blocks any injected inline or remote script.

### T2. Supply chain compromise

Threat: A compromised dependency injects malicious code into the shipped bundle.

Controls:
- Zero runtime dependencies. The site is plain HTML, CSS, and vanilla JavaScript.
- Build-time tooling is minimal Node built-ins where possible.
- Data shards are committed to the repository and reviewed in pull requests.
- A startup integrity check (integrity.js) loads data/integrity.json and verifies SHA-256 of each per-folder manifest.json via SubtleCrypto. Mismatch produces a console error and a non-blocking banner naming the affected dataset, so a tampered shard is visible to the user before any calculation depends on it.

### T3. Network exfiltration

Threat: A bug or injected script attempts to exfiltrate user input or referrer information.

Controls:
- CSP `connect-src 'self'`, `default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data:`, `form-action 'self'`, `base-uri 'self'`, `frame-ancestors 'none'`, `object-src 'none'`.
- `Referrer-Policy: no-referrer`.
- `Permissions-Policy` disables camera, microphone, geolocation, payment, USB, and accelerometer.
- The application makes no `fetch` calls to non-same-origin URLs.

### T4. Stale or tampered data

Threat: A data shard is modified in transit or in a stale CDN cache and serves wrong values.

Controls:
- HTTPS enforced; HSTS preloaded with one-year max-age.
- Subresource integrity is provided by the same-origin check and the per-manifest SHA-256 verified at startup.
- Visible data version stamps on every reference utility view.

### T5. Clickjacking

Threat: An attacker frames the site to perform UI redress attacks.

Controls:
- `X-Frame-Options: DENY`.
- CSP `frame-ancestors 'none'`.

### T6. Misuse as a code-compliance authority

Threat: A user treats the calculator's output as a code-compliant design and skips the inspector's review, creating a real safety issue.

Controls:
- A persistent footer disclaimer on every view (spec.md section 10).
- An inline notice above every calculator's input region (spec.md section 9), expanded to the SOP-and-incident-command variant for fire-ground utilities.
- The README and docs/legal.md state explicitly that the site is math and reference, not a code authority.

### T7. Privacy leakage

Threat: User input or activity is logged to a third party.

Controls:
- No analytics, telemetry, or tracking of any kind.
- No sessionStorage, cookies, or IndexedDB.
- localStorage is used by `theme.js` for a single key (`rl-theme`) holding the literal string `"light"`, `"dark"`, or `"high-contrast"` so the user's chosen theme survives reloads without a flash of incorrect color. No other client-side storage mechanism is used. No calculator inputs, pinned set, or bundle data is written to localStorage; all of that lives in the URL hash only (spec.md section 11.5). (The `rl-bigbuttons` key was retired in spec-v11 along with Big Buttons mode.)
- Service worker cache holds only same-origin static shell files and bundled data shards.
- The hash-based pinning and calculator state keep state in the URL only; the user controls when and where it is shared. (Recents was retired in spec-v11.)

### T8. Resource exhaustion on the device

Threat: A pathological input causes the browser to hang or crash.

Controls:
- Numeric input ranges are bounded with `min` and `max` attributes.
- Heavy calculations (Manual J load estimators, duct sizing) run in a Web Worker.
- Output rendering is debounced.

### T9. Service worker misbehavior

Threat: A buggy service worker serves stale assets or fails to update.

Controls:
- Cache name includes the build hash; old caches are deleted on activation.
- The service worker is registered only over HTTPS or localhost.
- The service worker scope is the application root and does not extend beyond.

### T10. Hostile bundle import (v2; retired in commit 5734d28)

The v2 Project Bundle import affordance (utility 121, `bundle.js`) was
**retired in commit 5734d28 (2026-05-15)** along with the calc-meta and
companion-strip features. The `bundle.js` module, the Download / Load
Bundle UI, and the bundle-related tests and shards no longer ship.
The `#b=...` URL hash key is still recognized by `routing.parseHashRoute`
for back-compat (it resolves to the home view with no state surfaced)
but no decoder, sanitizer, or persistence path runs against it. This
threat surface is therefore closed by removal rather than by controls;
the entry is retained here for the audit trail.

Historical controls (no longer in the runtime):
- `bundle.js` enforced a 32 KB size cap before parsing JSON.
- `decodeBundle` validated the bundle version (`{ version: 1 }`); other versions were rejected.
- `sanitizeBundle` filtered every id in `pinned` against the live tool registry; unknown ids were dropped. (Pre-v11 bundles also carried `recents`; that field was silently dropped on decode.)
- Tool input maps were filtered: only entries keyed by a valid tool id and whose value was a non-null object were retained.
- Bundle imports never triggered a network call; the bundle was decoded same-origin in the browser. Blob URLs used for the Download action were same-origin and CSP `connect-src 'self'` was unchanged.
- The Load Bundle file input only read the file via `file.text()` and never evaluated it as code.

### T11. URL-hash payload tampering (v2)

Threat: An attacker crafts a `#p=`, `#r=`, or `#tool?example=1` URL that
looks legitimate but encodes unintended state.

Controls:
- `routing.js` filters every id through the same valid-id set as the bundle path.
- `parseHashRoute` falls back to home for unknown tool ids.
- `example=1` only programmatically clicks the renderer's "Test with example" button and never executes attacker-supplied script.
- The URL hash is the only state mechanism for tool data. The single localStorage key `rl-theme` carries the theme preference and nothing else; no sessionStorage, cookies, or IndexedDB is used.

## Out of scope threats

- Server compromise (no server exists).
- Database breach (no database exists).
- Account takeover (no accounts exist).
- API abuse (no API exists).

## v5 additions and threat surface

The v5 expansion (utilities 234-271, Groups R / S / T plus H / I extensions) introduces no new server, no new origin, no new network call, and no new client-side storage.

- **CSV export (utility 269)** writes to a same-origin `Blob` URL with `type: "text/csv;charset=utf-8"`, attaches a temporary `<a download>` triggered by `click()`, and revokes the URL on the next tick. The CSV body is built from the rendered table cells via `textContent` only - no user-supplied HTML or script can survive. The filename includes a deterministic FNV-1a hash of the inputs to deduplicate; FNV is not cryptographic but is sufficient for filename uniqueness. CSP `connect-src 'self'` permits Blob URLs.
- **Glossary tooltip (utility 271)** mounts text-only `<span>` elements with `role="tooltip"` and `aria-describedby`. Definitions come from a bundled inline constant (`GLOSSARY` in `v5-platform.js`) plus the on-disk shard `data/cross/glossary.json`; both are project-authored and committed to the repo. No fetch, no string interpolation from user input.
- **Print-table CSS (utility 270)** is purely declarative; no JS path executes during print.
- **Per-state legal data (Groups S / R)** ships as same-origin static JSON shards under `data/legal/` and `data/accounting/`. Each shard's SHA-256 hash is recorded in `data/integrity.json` and `scripts/expected-hashes.json` and verified at build time by `npm run data:verify`. Mismatch surfaces a non-blocking integrity banner on first load (existing behavior).
- **Lab data (Group T)** ships as same-origin static JSON shards under `data/lab/`. IUPAC weights, buffer pKa values, and centrifuge rotor radii are static reference data; tampering requires write access to the repo.

The v5 reference pages (utility 268 lab safety, utility 267 OSHA recordkeeping) carry hardened safety notices that always render regardless of theme or layout. Tampering with the renderer in a way that suppresses the notice would be caught by [test/unit/calc-references-v5.test.js](../test/unit/calc-references-v5.test.js) (which asserts the spill-tree four-step ordering and the SDS reference in the Assess step) and by the CITATIONS coverage test.

## v12 additions and threat surface

The v12 expansion (Groups U Veterinary / V EMS / W Pilots / X Real Estate / Y Educators, +83 tiles across 5 new groups) introduces **no new server, no new origin, no new network call, and no new client-side storage**. The threat surface is unchanged from v11.

- **New `calc-vet.js` / `calc-ems.js` / `calc-aviation.js` / `calc-realestate.js` / `calc-edu.js` modules** all follow the existing vanilla-ES-module pattern. No new runtime dependencies, no new web APIs beyond what v0.10 already shipped (`textContent`, `createElement`, `SubtleCrypto` for integrity, `Blob` for CSV download (utility 269; the v2 Project Bundle Blob path retired in commit 5734d28)). The ESLint + grep lint forbidding `.innerHTML` / `.outerHTML` / `insertAdjacentHTML` / `eval` / `new Function` covers every v12 module without an exception.
- **New `data/realestate/` shards** (loan-limits.json + hud-fmr.json) ship same-origin under the existing integrity discipline. Per-folder `manifest.json` SHA-256 hashes are recorded in [data/integrity.json](../data/integrity.json) and [scripts/expected-hashes.json](../scripts/expected-hashes.json), verified at startup by `integrity.js` and at CI time by `npm run data:verify`. The realestate manifest carries the v12 §H.2 `refresh_cadence: "annual"` field per the cadence schema; tampering with the manifest moves the hash and trips the integrity banner before any tile renders.
- **Vet / EMS / aviation / edu groups are pure-math**; no new data shards landed for those groups. The bundled tables (ASPCA APCC thresholds, Lund-Browder bands, AAHA life-stage factors, ICAO standard-atmosphere coefficients, AHA PALS vital-sign ranges, IUPAC atomic data, public-domain readability formula constants) live inline in the renderer modules so the runtime-load path is identical to the v11 reference-tile pattern. No new fetch path is introduced.
- **Phase G wiring lint** ([scripts/check-wiring.mjs](../scripts/check-wiring.mjs)) closes the deployment-time gap that allowed the v5-platform.js miss to ship for the full v5 release window. The G.2 / G.3 / G.4 rules reduce the class of bug where a renamed export or an omitted FILES entry would 404 at runtime; the lint runs in `npm run audit` and gates CI. This is a defensive control against an inadvertent-but-real shipping failure rather than an adversarial threat, but it materially lowers integrity risk on each deploy.
- **Phase H data-refresh workflow** is a build-time GitHub Action; the runtime continues to read only from the bundled snapshot. The H.5 failure-handling stanza explicitly rejects auto-merging a broken PR if the upstream parser fails - the existing data ships unchanged until a maintainer triages the issue. A wrong freshness signal is treated as worse than a slightly stale one.
- **Spec-v12 §13.1 clinical-utility override** (Groups U / V) does not change the threat model. The math-aid tiles each render the v10 §B.1 limitation banner with the professional-governs notice and the canonical free-access URL. Misuse mitigation moves from spec.md §10 (the universal footer disclaimer) to spec.md §10 + the per-tile B.1 banner naming the specific clinical risk (verify against the current formulary / call APCC / receiving facility governs). No tile carries a "this is a prescription" framing.

## v13 additions and threat surface

The v13 expansion adds a build-time prerender step that emits one static
HTML shell per tile (`/tools/<id>/index.html`, 385 shells) and one per
group (`/groups/<slug>/index.html`, 24 shells), plus a regenerated
`sitemap.xml`. The expansion introduces **no new server, no new origin,
no new network call at runtime, and no new client-side storage**. The
threat surface is unchanged from v12.

- **Shells inherit the same CSP** as the home document. Each shell
  carries the same `<meta http-equiv="Content-Security-Policy">` tag
  the home document carries, and the shells are served from the same
  origin so the [../_headers](../_headers) CSP applies. `default-src
  'self'`, `connect-src 'self'`, `worker-src 'self'` are unchanged.
- **Shells carry zero JavaScript.** No `<script>` tag on any shell
  beyond the inline `<script type="application/ld+json">` block, which
  is a non-executable data block per the HTML spec. The TBT for every
  shell is 0 ms by construction.
- **JSON-LD blocks are static, validated, and grep-checked.** The
  generator in [../scripts/build-shells.mjs](../scripts/build-shells.mjs)
  escapes `<`, `>`, and `&` to their `\u` form in every text field so a
  tile name or description cannot smuggle a `</script>` close. The
  [../scripts/check-shells.mjs](../scripts/check-shells.mjs) lint
  validates that every block parses, uses
  `@context: "https://schema.org"`, and only references types on the
  closed allowlist (`WebApplication`, `WebPage`, `CollectionPage`,
  `BreadcrumbList`, `ItemList`, `ListItem`, `Offer`, `Person`, `HowTo`,
  `HowToStep`). No `FAQPage`, `Review`, `AggregateRating`, `Recipe`,
  `Course`, or `JobPosting`.
- **No runtime fetch from shells.** The "Run the calculator" link on a
  shell is a same-origin anchor to the home document's hash route
  (`/#<id>`); the SPA loads the tile from the cached shards as today.
  Shells do not fetch shards, do not fetch citations, do not fetch
  anything at runtime.
- **Sitemap and `robots.txt`** are static, same-origin, and contain only
  URLs the build pipeline generated. No external links.
- **Search Console / Bing Webmaster verification artifacts** (if used)
  are one-time bootstrap files (DNS TXT preferred; HTML file fallback)
  added to the repo at deploy time. They are observation-only and do
  not place a cookie on the visitor or send any visitor identifier to
  the search engine. Per spec-v13 §13.1 they observe the search engine,
  not the user.
- **No telemetry, no analytics SDK, no event tracking, no remarketing
  pixels.** The Phase I measurement posture is source-side only
  (Cloudflare edge metrics + Search Console aggregate data). No
  visitor-instrumentation script ships with any shell.

The character-set discipline (no emoji, no em-dash) is enforced on
shell content by the same [../scripts/grep-checks.mjs](../scripts/grep-checks.mjs)
that covers the SPA, so a shell cannot smuggle a banned codepoint
through the build.

## Reporting

Security issues should be reported through the repository's issue tracker. There is no separate disclosure process because the attack surface is the static shell and the bundled data; both are fully visible in the public repository.
