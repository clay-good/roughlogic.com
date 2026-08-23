# spec-v1348.md - Close the calculator feedback loop

> Status: **IMPLEMENTED IN REPOSITORY; PRODUCTION PROVISIONING REQUIRED.**
> Product feedback and maintenance infrastructure. No calculator formula, citation,
> renderer, or catalog entry changes. Catalog stays **1,709**.

## 1. Outcome

A tradesperson who believes a calculator is wrong can report it without leaving the
calculator, creating an account, composing an email, or retyping the job values. Rough
Logic stores a bounded reproduction record in Cloudflare D1 so the maintainer can review
open reports weekly, reproduce them from the saved URL and values, and mark them resolved.

The feature optimizes for the smallest useful report:

1. Tap **Report a problem** near the calculator title.
2. Optionally answer **What did you expect instead?** in at most 160 characters.
3. Tap **Send report** after the background abuse check completes.

The report automatically carries the calculator identity, full page URL, current input
values, and current rendered output. An empty note is valid because the captured state can
still expose a crash, unit error, implausible result, or stale citation.

## 2. Product principles

| Principle | Requirement |
|---|---|
| Minimal effort | Two taps can send a useful report; prose is optional. |
| Visible, not obstructive | The control is in the top calculator row, has a 48 px touch target, and never blocks calculation. |
| Reproducible | Save the canonical calculator ID, server-derived name, page URL, labeled inputs, and output snapshot. |
| Mobile first | One short prompt, 160-character maximum, a live remaining-character count, and a single-column dialog at phone widths. |
| Honest privacy | Calculations remain local by default; the dialog says exactly what a report sends and asks the user not to include personal information. |
| Maintenance oriented | Reports default to `open`, can be reviewed in one D1 query, and carry resolution fields. |
| Fail closed | A broken or exhausted reporting service never affects a calculator and never falls back to unprotected storage or email. |

## 3. Scope

### 3.1 In scope

- One shared report control in the live calculator renderer, automatically covering all
  current and future registered calculators.
- Automatic client-side collection of the current calculator context.
- An optional 160-character free-text expectation.
- A same-origin Cloudflare Worker endpoint.
- Cloudflare Turnstile, loaded only when the report dialog opens, with mandatory
  server-side Siteverify validation.
- Cloudflare D1 storage, migration, duplicate suppression, per-reporter limits, and a hard
  accepted-report ceiling.
- A private maintainer workflow through authenticated Cloudflare D1 access.
- Automatic bounded retention, added by the security follow-up in spec-v1349.
- CI and contributor-documentation standards that make the feedback path mandatory for
  every new calculator, alongside website and MCP wiring.

### 3.2 Out of scope

- Email notifications, user accounts, public issue lists, attachments, screenshots,
  threaded replies, or collecting a reporter email address.
- A public or separately authenticated admin application.
- Sending reports while offline. Offline calculation continues unchanged.

## 4. User experience

### 4.1 Placement

The shared calculator header row contains:

- **Back to tools** on the left.
- **Report a problem** on the right.

Both controls wrap safely at 320 px and meet the repository's 48 px touch-target floor.
The report control uses secondary visual weight so it is findable without competing with
the calculator title or answer.

### 4.2 Dialog

The dialog is a native modal with:

- heading: **Report a problem**;
- calculator name;
- disclosure: the report includes this calculator's URL, inputs, and results;
- privacy warning: do not include names, addresses, or other personal information;
- optional textarea labeled **What did you expect instead?**;
- `maxlength=160`, with a visible remaining-character count;
- a Turnstile container;
- **Cancel** and **Send report** controls;
- a status region for loading, validation, error, and success messages.

The submit control remains disabled until Turnstile returns a token. On success, the dialog
reports **Thanks. Report saved.**, the trigger changes to **Report sent**, and duplicate
submissions from the same view are prevented. On failure, the calculator remains usable and
the user gets a short retry-later message.

### 4.3 Captured context

The browser captures at submit time:

- calculator ID and display name;
- `location.href`, including hash-state values;
- every current `input`, `select`, and `textarea` in the calculator input region, using its
  visible label and current value or checked state;
- labeled scalar outputs;
- a normalized text snapshot covering richer tables, lists, and schedules.

Collection is bounded. The output text snapshot is capped at 12,000 characters and stores a
`truncated` flag when needed. The URL and labeled inputs still reproduce large schedules, so
the defensive cap does not make those reports unactionable.

## 5. API contract

### 5.1 Routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/reports/config` | Return the public Turnstile sitekey only when reporting is fully configured. |
| `POST` | `/api/reports` | Validate and conditionally persist one anonymous report. |
| any other method | either route | `405 Method Not Allowed`. |

Cloudflare Pages serves every static asset directly. A separate API-only Worker is routed only
to `roughlogic.com/api/reports*`; it has no static asset binding, `workers.dev` URL, or public
version-preview URL.

### 5.2 Request shape

```json
{
  "calculator_id": "voltage-drop",
  "calculator_name": "Voltage Drop",
  "page_url": "https://roughlogic.com/#voltage-drop?...",
  "note": "I expected about 3% drop.",
  "inputs": [{ "label": "Load current (A)", "value": "20" }],
  "outputs": {
    "values": [{ "label": "Voltage drop", "value": "4.8 V" }],
    "text": "Voltage drop: 4.8 V ...",
    "truncated": false
  },
  "turnstile_token": "single-use-token"
}
```

The client-provided calculator name is informational only. The Worker derives the stored name
from the checked-in catalog after validating `calculator_id`.

### 5.3 Responses

| Status | Meaning |
|---|---|
| `200` | Public configuration available. |
| `202` | Submission handled. For abuse resistance, this also covers duplicate or over-quota reports that were intentionally dropped. |
| `400` | Malformed payload or failed Turnstile validation. |
| `403` | Origin, hostname, or action mismatch. |
| `405` | Wrong HTTP method. |
| `413` | Request body exceeds 24 KB. |
| `415` | Content type is not `application/json`. |
| `503` | D1, Turnstile, or required configuration is unavailable. |

Every response uses `Cache-Control: no-store` except the public configuration response, which
may be browser-cached for 5 minutes. Error bodies never expose bindings, SQL, secrets, IP data,
quota counts, or Turnstile error details.

## 6. Defensive controls

Controls are layered so bypassing one does not create an unbounded write or cost path.

### 6.1 Before D1

1. Pages serves ordinary calculator traffic without invoking the API Worker.
2. Production should apply a Cloudflare zone rate-limit rule to `/api/reports*` before the
   Worker; the deployment runbook makes this a launch requirement.
3. Only exact configured origins are accepted; missing `Origin` is rejected.
4. Only `application/json` POSTs are accepted.
5. `Content-Length` and the streamed UTF-8 body are independently capped at 24 KB; a chunked
   body is canceled as soon as it crosses the limit and encoded request bodies are rejected.
6. Unknown keys do not expand storage; every accepted field has type, count, and length limits.
   Terminal-control and bidirectional-override characters are rejected before storage.
7. Calculator IDs must exist in the checked-in `TOOLS` catalog.
8. The submitted URL must use HTTPS, match an allowed origin, and identify the submitted
   calculator in its hash or `/tools/<id>/` path.
9. Turnstile tokens are capped at 2,048 characters and validated server-side for success,
   expected hostname, and action `calculator-report`; tokens are single-use and expire.

### 6.2 Privacy-preserving rate identity

The Worker never stores a raw IP address. It creates a daily HMAC-SHA-256 value from:

```text
UTC date + CF-Connecting-IP
```

using the `REPORT_HASH_SECRET` Worker secret. Rotation is automatic because the date is part of
the input. The HMAC is used only as the D1 counter subject and cannot be reversed from the repo
or database alone.

### 6.3 D1 write gates

- Maximum **5 accepted reports per daily HMAC subject per UTC day**.
- Maximum **200 accepted reports total per UTC day**.
- Deployment may lower either limit, but code clamps configuration so it can never raise those
  ceilings without a reviewed code change.
- Exact same-day payloads share a dedupe key and only the first is stored.
- The report insert and counter increments run in one D1 batch transaction. Counters increment
  only when that request's report row exists.
- Duplicate and over-quota attempts return the same generic `202` response as accepted reports,
  preventing an attacker from probing limits while keeping extra rows at zero.
- Missing bindings, secrets, network validation, or database errors return `503`; there is no
  in-memory, log-only, email, or unverified fallback.

At the hard maximum, accepted traffic writes at most 600 logical rows per day: one report plus
two counters per accepted report, before index accounting. This is far below D1's free daily
write allowance. On the Workers Free plan, its own daily request ceiling is an additional hard
fail-closed boundary.

### 6.4 Data minimization

Stored:

- calculator and reproduction context;
- optional expectation note;
- creation time and maintenance status;
- dedupe key and bounded daily counters.

Not stored:

- raw IP address;
- user-agent string;
- email address, name, account, cookies, Turnstile token, or Turnstile response;
- arbitrary request headers;
- arbitrary client keys.

## 7. D1 model

`calculator_reports` stores immutable submission context plus maintainer-owned status fields:

- `id`, `created_at`;
- `calculator_id`, `calculator_name`, `page_url`;
- nullable `note`;
- `inputs_json`, `outputs_json`, `output_text`, `output_truncated`;
- unique `dedupe_key`;
- `status` (`open`, `resolved`, or `wont_fix`), `resolved_at`, `resolution_note`.

`report_limits` stores only `bucket`, `scope`, `subject`, and `count`. Spec-v1349
adds separate verified-attempt counters and a daily cleanup: counters expire
after 14 days and every report expires after 30 days.

## 8. Maintainer workflow

The private review surface is authenticated Cloudflare access, not a public route.

Weekly:

1. Query open reports ordered by calculator and age.
2. Open the saved URL and compare the saved inputs/output with the calculator and cited source.
3. Fix through the repository's existing spec-first, primary-source, worked-example process.
4. Mark the report `resolved` with a short note, or `wont_fix` with the reason.
5. Delete rate-counter buckets older than 14 days.

No report data is exposed from the public Worker. A future admin UI requires a separate spec,
authentication model, and security review.

## 9. Repository standard

Every calculator must have three doors:

1. Website discovery and rendering.
2. Local MCP description and execution.
3. Shared user reporting with reproducible context.

New calculators inherit the third door through `renderToolView`; they must not fork, hide, or
replace the shared report control. `scripts/check-feedback-loop.mjs` fails CI if the shared mount,
Worker route, D1 migration, or documentation standard disappears. `AGENTS.md`, the maintainer
quickstart, and contributor checklist name all three doors.

## 10. Deployment requirements

Code can ship only after the maintainer completes all external Cloudflare steps in
`docs/calculator-reports.md`:

1. Create `roughlogic-reports` D1 and add its `REPORTS_DB` binding UUID to `wrangler.jsonc`.
2. Apply D1 migrations.
3. Create a Turnstile widget restricted to production hostnames.
4. Set `TURNSTILE_SITE_KEY` as a non-secret Worker variable.
5. Set `TURNSTILE_SECRET_KEY` and a random `REPORT_HASH_SECRET` with `wrangler secret put`.
6. Add the zone rate-limit rule for `/api/reports*`.
7. Verify one accepted report, one duplicate, one invalid token, and one over-limit case.

The endpoint remains fail-closed and the dialog reports temporary unavailability until all
bindings exist.

## 11. Acceptance criteria

- Every one of 1,709 live calculator views receives the shared top-row report control.
- A new `TOOLS` row receives the control with no per-calculator edit.
- A report with no note can be submitted.
- Notes stop at 160 characters on client and server.
- The saved row carries ID, server-derived name, full valid URL, labeled inputs, and outputs.
- Rich output is bounded and marks truncation.
- Unknown calculators, cross-origin URLs, oversized bodies, extra-long values, missing origins,
  invalid Turnstile tokens, hostname mismatches, and action mismatches are rejected.
- Duplicate and quota-dropped reports write no report or counter rows and return generic success.
- Raw IP, user-agent, reporter identity, and Turnstile tokens never enter D1.
- Static asset requests never enter the report Worker.
- Reporting failure never blocks calculation, copy, print, offline use, or MCP execution.
- Lint, unit tests, build, mobile reflow, and accessibility checks pass.

## 12. Rollback

Disable reporting without redeploying the static calculators by removing or invalidating the
`TURNSTILE_SITE_KEY` Worker variable; the config endpoint then returns `503`, no report can be
accepted, D1 data remains available for review, and every calculator continues to function.
