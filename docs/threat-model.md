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
- localStorage is used by `theme.js` for a single key (`rl-theme`) holding the literal string `"light"` or `"dark"` so the user's chosen theme survives reloads without a flash of incorrect color. No other client-side storage mechanism is used. No calculator inputs, pinned set, recents ring, or bundle data is written to localStorage; all of that lives in the URL hash only (spec.md section 11.5).
- Service worker cache holds only same-origin static shell files and bundled data shards.
- The hash-based pinning, recents, and calculator state keep state in the URL only; the user controls when and where it is shared.

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

### T10. Hostile bundle import (v2)

Threat: A user pastes a malicious `#b=...` URL or loads a malicious JSON
file via the v2 Project Bundle import affordance, hoping to inject
arbitrary tool ids, oversized payloads, or unsafe content into state.

Controls:
- `bundle.js` enforces a 32 KB size cap before parsing JSON.
- `decodeBundle` validates the bundle version (`{ version: 1 }`); other versions are rejected.
- `sanitizeBundle` filters every id in `pinned` and `recents` against the live tool registry; unknown ids are dropped.
- Tool input maps are filtered: only entries keyed by a valid tool id and whose value is a non-null object are retained.
- Bundle imports never trigger a network call; the bundle is decoded same-origin in the browser. Blob URLs used for the Download action are same-origin and CSP `connect-src 'self'` is unchanged.
- The Load Bundle file input only reads the file via `file.text()` and never evaluates it as code.

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

## Reporting

Security issues should be reported through the repository's issue tracker. There is no separate disclosure process because the attack surface is the static shell and the bundled data; both are fully visible in the public repository.
