# spec-v1971.md -- Request a calculator

> **Status: PROPOSED (2026-10-19). Platform spec, no tile added. Part of [scope-product-expansion](scope-product-expansion.md). Completes roadmap pillar 5 of [spec-v106](spec-v106.md) section 7, "request a tool / report a wrong number": spec-v1348 built the second half; this is the first.** Catalog stays at **2,267**.

## What it does for you

When a search finds nothing useful, the no-results card gains one line: "Can't find it? Request a calculator." The form asks what you were trying to work out (one sentence) and what you searched for (filled in from the box). It sends through the same bounded, Turnstile-protected, no-account path the "Report a problem" control already uses, and the maintainer reads it from the same D1 table. Nothing else about the site changes.

## Why

The site has no telemetry, so it cannot see what people search for and fail to find. spec-v106 named that blind spot and prescribed a request channel beside the problem report. Three spec programs have since found new tiles by reading the catalog's own notes, which finds what the catalog admits it lacks, not what readers wanted and never found. A request form is the only honest signal of demand this project can have.

## Rules

- **Two kinds, one table.** `calculator_reports` gains `kind TEXT NOT NULL DEFAULT 'problem' CHECK (kind IN ('problem', 'request'))` (migration 0003). A request stores `calculator_id = '-'`, `calculator_name = 'request'`, the home page URL, the search text in `inputs_json` as the single row `{ key: 'query', value: ... }`, the ids of the top three results the ranker showed in `outputs_json`, and the sentence in `note`.
- **Why the top three results ride along.** A request whose top result is the tile the reader wanted is a ranker miss, which is an alias row; a request with no plausible result is a catalog gap, which is a spec. The maintainer can tell the two apart without guessing. This follows the finding that ranker misses and catalog misses look identical from outside.
- **Caps, stated once.** The sentence is capped at 160 characters like the problem note, and the query at 200. The three caps (browser, Worker re-check, D1 `CHECK`) stay equal, and `check-feedback-loop` keeps asserting it.
- **Privacy, unchanged.** The same "no names, addresses, or other personal information" line, the same `data-report-sensitive` discipline, no identifier of the reader, the same per-reporter and global rate limits. A request from a tile page is not offered; the entry point is the home no-results state and the catalog hub's empty-filter state only, so a request never carries a tile's inputs.
- **Validation, additive.** The Worker's exact-key list gains `kind`; a `problem` payload is validated exactly as today, and a `request` payload must carry `calculator_id = '-'`, must not carry outputs beyond the three ids, and is refused otherwise. An old-shaped payload without `kind` is refused with 400, which is safe because the site and the Worker deploy together.
- **Status.** Requests use the same `open / resolved / wont_fix` status; "resolved" for a request means a spec number is in `resolution_note`.

## How it is built

| Piece | Change |
|---|---|
| `report-feedback.js` | A second entry, `openRequestDialog(query, topIds)`, sharing the dialog, Turnstile, status copy and send path. Title "Request a calculator". |
| `app.js` no-results card | The one line and the call, with the current query and the ranked ids. |
| `report-worker.mjs` | `validateReportPayload` learns `kind`; storage writes it. |
| `migrations/0003_report_kind.sql` | The column and its check. |
| `scripts/check-feedback-loop.mjs` | Asserts the new mount, the cap agreement for the query field, and that `kind` is in all three layers. |
| `docs/calculator-reports.md` | The weekly review gains one query: open requests, grouped by query text, with the top-result ids beside each. |

## Proof

- Worker unit tests: a request with the right shape is accepted; one with a tile id, with outputs beyond ids, or without `kind` is refused; a problem report is unchanged byte for byte against the existing fixtures.
- The `check-feedback-loop` gate is seeded red by removing the no-results mount and by setting the browser cap to 161.
- An e2e test searches for a phrase that matches nothing, opens the request form, sees the query filled in, and sees the privacy line; it does not submit (Turnstile is not exercised in CI, as today).

## Not in v1

- A public board of requests. spec-v106 allows "a static public board"; it would need a moderation step the project does not have, so requests stay in D1 and surface as specs when they become tiles.
- Request from a tile page ("this calculator should also do X"). That is a problem report with a sentence, which already works.
