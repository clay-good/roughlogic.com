# Calculator report operations

This is the launch and weekly-maintenance runbook for the anonymous calculator
feedback path introduced by [spec-v1348](../specs/spec-v1348.md). The public site
has no report-reading endpoint. Review uses authenticated Cloudflare D1 access.

Production keeps the existing `roughlogic-com` Pages project for static files.
The separate `roughlogic-reports` Worker is bound only to
`roughlogic.com/api/reports*`, so normal calculator and asset requests never
invoke it. Public `workers.dev` and version-preview URLs are explicitly disabled
so they cannot bypass the zone WAF. `wrangler pages deploy dist --project-name
roughlogic-com --branch main` publishes the static build; `wrangler deploy`
publishes the API Worker and fails if either required secret is absent.

## Launch checklist

Do not call the feature live until every item is complete. Missing configuration
fails closed and leaves all calculators operational.

### 1. Create and bind D1

From the repository root:

```sh
npx wrangler d1 create roughlogic-reports
```

Add the UUID returned by Cloudflare to `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "REPORTS_DB",
    "database_name": "roughlogic-reports",
    "database_id": "<UUID FROM CLOUDFLARE>",
    "migrations_dir": "migrations"
  }
]
```

The binding name must remain `REPORTS_DB`; the Worker intentionally treats a
missing binding as unavailable.

Apply the checked-in schema:

```sh
npx wrangler d1 migrations apply roughlogic-reports --remote
```

### 2. Create Turnstile

In Cloudflare, create a Managed Turnstile widget named `roughlogic calculator
reports` and allow only `roughlogic.com` plus an actual production alias if one
serves the site. Do not enable an unrestricted hostname.

Put the public sitekey and bounded configuration in `wrangler.jsonc`:

```jsonc
"vars": {
  "TURNSTILE_SITE_KEY": "<PUBLIC SITEKEY>",
  "REPORT_ALLOWED_ORIGINS": "https://roughlogic.com",
  "REPORT_DAILY_LIMIT": "200",
  "REPORT_REPORTER_DAILY_LIMIT": "5"
}
```

The sitekey is public by design and is safe in this MIT-licensed repository.
Never put either secret below in Git:

```sh
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put REPORT_HASH_SECRET
```

Paste the Turnstile secret into the first prompt. Paste a cryptographically
random value of at least 32 characters into the second. `.dev.vars`, `.env`,
private keys, and Wrangler local state are ignored by Git.

### 3. Add the pre-Worker rate limit

In the `roughlogic.com` zone, create a WAF rate-limiting rule with the strictest
settings the current plan offers:

- expression: request path starts with `/api/reports`;
- counting characteristic: source IP;
- threshold: 10 requests per 10 seconds per IP;
- action: block;
- mitigation duration: 10 minutes, or the closest plan-supported value.

The Cloudflare Free plan currently exposes a 10-second mitigation duration, so
production uses 10 requests per 10 seconds per IP followed by a 10-second block.
Do not weaken that rule to gain a longer duration; the D1 daily gates are the
long-window backstop.

Cover both the config GET and submission POST so neither can become an unbounded
Worker invocation path. This rule rejects floods before they invoke the Worker. Turnstile, the 5/day
daily HMAC gate, the 200/day global accepted-report ceiling, D1's free limits,
and the Workers Free request limit remain independent backstops.

### 4. Deploy and prove the path

Build once, deploy the API Worker, and then deploy the same build to Pages:

```sh
npm run build
wrangler deploy
wrangler pages deploy dist --project-name roughlogic-com --branch main
```

Then verify:

1. Open a calculator and confirm **Report a problem** appears in the top row.
2. Submit with an empty note and confirm the success message.
3. Submit the exact context again and confirm only one D1 row exists.
4. Submit a short expectation note and confirm it is saved with the URL, inputs,
   and results.
5. Temporarily use an invalid Turnstile token against the endpoint and confirm
   `400` with no D1 row.
6. Confirm ordinary static asset requests do not invoke Worker code in
   Cloudflare metrics.
7. Confirm calculator use, offline use, print, and MCP execution are unchanged.

## Weekly review

List open reports, oldest first and grouped naturally by calculator:

```sh
npx wrangler d1 execute roughlogic-reports --remote --command "SELECT id, created_at, calculator_id, note, page_url, inputs_json, outputs_json, output_text, output_truncated FROM calculator_reports WHERE status = 'open' ORDER BY calculator_id, created_at;"
```

For each report:

1. Open `page_url` to reproduce the submitted state.
2. Compare the saved values with the current calculator output.
3. Verify the formula against the calculator's primary source.
4. If a correction is needed, follow the normal numbered-spec, regression-test,
   worked-example, citation, and full-gate process.
5. Resolve the report with an audit note:

```sql
UPDATE calculator_reports
SET status = 'resolved',
    resolved_at = datetime('now'),
    resolution_note = 'Fixed in spec-vNNNN; formula and regression test updated.'
WHERE id = '<REPORT ID>';
```

Use `wont_fix` only when the saved behavior is correct or explicitly outside
the calculator's stated scope, and put that reason in `resolution_note`.

Apply a resolution through Wrangler:

```sh
npx wrangler d1 execute roughlogic-reports --remote --command "UPDATE calculator_reports SET status = 'resolved', resolved_at = datetime('now'), resolution_note = 'Fixed in spec-vNNNN.' WHERE id = '<REPORT ID>';"
```

Remove expired rate counters after review:

```sh
npx wrangler d1 execute roughlogic-reports --remote --command "DELETE FROM report_limits WHERE bucket < date('now', '-14 days');"
```

## Triage targets

The operational target is to review reports within 72 hours when practical,
with 12-24 hours preferred for credible wrong-result reports. The database is a
queue, not a guarantee: prioritize unsafe calculations, plausible formula or
unit errors, and multiple independent reports against the same calculator.

## Cost and data boundaries

- Pages serves static assets without an API Worker invocation or binding.
- Turnstile is loaded only after the report dialog opens.
- No more than 200 reports can be accepted in a UTC day without a reviewed code
  change, even if environment configuration asks for more.
- Accepted traffic writes at most one report row and two counter rows per report.
- Duplicate and over-quota submissions add zero rows.
- Raw IP addresses, user agents, identity, email, and Turnstile tokens are not
  stored.
- The client skips password, contact, payment, identity, one-time-code, and
  file inputs even if a future calculator accidentally renders one.
- Report text is limited to 160 characters; request and stored value sizes are
  independently bounded.
- Chunked bodies are canceled at 24 KB, encoded bodies are rejected, and stored
  text cannot contain terminal-control or bidirectional-override characters.
- The API Worker has no public `workers.dev`, preview, or static-asset surface.
- Cloudflare enforces Full (strict) origin validation, HTTPS-only redirects,
  TLS 1.2 or newer, one-year HSTS with subdomains and preload, and DNSSEC.

## Kill switch and recovery

Deleting `TURNSTILE_SECRET_KEY`, removing `TURNSTILE_SITE_KEY`, or disabling the
Turnstile widget makes `/api/reports/config` or validation fail closed. The user
sees a temporary-unavailability message, existing D1 reports remain intact, and
calculators continue normally.

Restore the binding or secret, confirm one report, and inspect Cloudflare Worker,
Turnstile, WAF, and D1 metrics before reopening. Never replace protection with an
unverified log or email fallback.
