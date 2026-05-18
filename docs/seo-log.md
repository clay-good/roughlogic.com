# SEO log

Per spec-v13 §13.1 / §17.3, this file is the append-only record of
monthly aggregate observations from Google Search Console and Bing
Webmaster Tools. Each entry follows the v6 §6 recheck-log shape:
date, observed value, note. The log is source-side only -- no
visitor instrumentation produces these numbers. The maintainer
reads the dashboards once per release cycle and appends a row.

The first row is appended after the v13 deploy and after Search
Console + Bing Webmaster Tools verification (the §10.4 / Phase I
bootstrap step). Until then this file holds the schema and the
intent.

## Format

Each entry is a stanza:

```
### YYYY-MM-DD review (covering YYYY-MM-DD through YYYY-MM-DD)

- Google Search Console: <N> impressions / <M> clicks / <K> queries
  with at least one impression. Top three queries: ...
- Bing Webmaster Tools: <N> impressions / <M> clicks. Top three
  queries: ...
- Notes: any manual-action notice, any anomalies, any planned
  follow-up.
```

The numbers are aggregate over the prior month. No per-visitor
data is recorded. No referrer URL is recorded (Google + Bing
already aggregate by query, not by referrer). The "top queries"
list is the same aggregate Search Console reports; it never
identifies an individual visitor.

## Cadence

Monthly. The maintainer's recurring task to read both dashboards
and append a row aligns with the v6 §6 quarterly recheck cycle
(the SEO log is a faster cadence because impressions accumulate
faster than code editions do, and a manual-action notice needs to
surface within a release cycle rather than within a quarter).

## Manual actions

If either dashboard surfaces a manual action (Google penalty,
structured-data warning, security issue), the entry records the
notice and the planned remediation. The remediation lands in the
next release cycle and the next entry confirms the resolution.

The schema.org allowlist in spec-v13 §7 + the
[../scripts/check-shells.mjs](../scripts/check-shells.mjs) lint
should prevent the most common structured-data warnings before
they reach the dashboard. Any warning that does reach the
dashboard is a class the lint should add coverage for.

## Entries

(First entry lands after v13 deploy + Search Console verification.)
