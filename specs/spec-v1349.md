# spec-v1349.md - Harden the feedback and local-agent boundaries

> Status: **IMPLEMENTED.** Security and privacy hardening only. Calculator
> formulas remain unchanged except for explicit workload ceilings on outputs
> that would otherwise allocate or loop without bound.

## 1. Outcome

The public static site remains inexpensive and anonymous even under hostile
traffic, calculator reports cannot retain identity-bearing state indefinitely,
the local MCP server cannot be driven into unbounded work, and development or
CI tooling cannot silently publish local files or execute mutable dependencies.

## 2. Required controls

### Report and D1 boundary

- Never include identity, contact, credential, payment, address, or explicitly
  private controls in a report input list or URL hash.
- If a calculator contains a private control, omit its rendered output snapshot
  because derived output can repeat or transform the private value.
- Strip page query strings and unknown hash keys from stored report URLs.
- Treat U+061C, U+200E, and U+200F as unsafe display-direction controls.
- Count verified attempts independently of accepted unique reports so duplicate
  traffic cannot create unlimited D1 batches.
- Purge all reports after 30 days and stale counters after 14 days with a daily
  scheduled Worker handler. Run the same cleanup before accepted writes.
- Disable persisted Worker invocation logs; aggregate Cloudflare metrics remain
  available without retaining request metadata.

### Static site, development, and build boundary

- The local development server builds and serves only `dist/`, binds to
  `127.0.0.1`, rejects non-local Host headers, and refuses symlinks or paths
  outside the public tree.
- The production build rejects every symlink and special file rather than
  following it into `dist/`.
- A service-worker update must cache every required shell and data asset before
  calling `skipWaiting`; a partial snapshot must not replace a known-good one.
- Secret filename ignores cover all `.env*` and `.dev.vars*` variants while
  allowing deliberately sanitized example files.

### MCP and supply-chain boundary

- Calculator functions that produce schedules use hard output-count ceilings,
  and time wrapping is constant-time.
- MCP requests run through a bounded serial queue and stdout backpressure is
  honored.
- GitHub Actions use full reviewed commit SHAs, ordinary CI has read-only
  permissions and no persisted checkout credentials, and npm-installed CI
  tools use exact versions. Lighthouse CI is removed because its current
  dependency graph has an unpatched high-severity archive traversal advisory;
  locked Playwright performance/accessibility gates remain.

## 3. Capacity model

The accepted-report ceiling remains 200/day and 5/reporter/day. Verified
attempts have separate ceilings of 400/day and 10/reporter/day. A 30-day
retention window bounds 6,000 accepted rows; even if every request approaches
the 24 KB request ceiling, payload storage remains well below D1 Free's 500 MB
per-database ceiling before ordinary SQLite overhead.

Quota-dropped, duplicate, and accepted reports remain externally
indistinguishable. When a verified-attempt ceiling is reached, the Worker
returns the same generic accepted response without Siteverify or a write batch.

## 4. Verification

- Unit tests cover private-field URL/output omission, direction controls,
  attempt preflight and accounting, retention cleanup, bounded calculator work,
  MCP recovery, service-worker atomic install, build symlink rejection, and dev
  server file/Host isolation.
- Repository gates enforce Worker routing/secrets/logging/cron settings, CI SHA
  pins and permissions, and secret filename exclusions.
- Full lint, unit, build, distribution, shell, and live Cloudflare checks pass
  before deployment.
