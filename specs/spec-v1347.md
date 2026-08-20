# spec-v1347.md — Retire the home trade strip, on evidence

> Status: **BLOCKED BY DESIGN — do not implement on schedule.** Part of
> [scope-one-box](scope-one-box.md). Depends on [v1345](spec-v1345.md), [v1337](spec-v1337.md).
> Presentation only. Catalog stays **1,709**.

## Why this is a separate spec

[v1337](spec-v1337.md) gives the home page the one-box design while keeping all 21 trade links,
demoted. This spec deletes them. It is split out because it is **the only change in the entire
program with real SEO risk**, and it should be made with data instead of taste.

The site takes ~20k/mo at the DNS layer and 120 Google clicks in 28 days, and the top organic
landing page is `/groups/construction/`. 120 clicks is small enough that a bad month is hard to
distinguish from noise and large enough to be worth protecting. So: ship the addition, wait, look,
then subtract.

## The entry conditions

**All four must hold. If any is unmet, this spec waits another cycle.** There is no deadline on
it; an indefinite delay costs the reader one quiet strip of links below the box.

| | |
|---|---|
| 1 | `/tools/` is **indexed** in Search Console — not merely submitted, not "discovered, not indexed". |
| 2 | At least **28 days** of post-v1345 data, so week-of-month seasonality does not read as a trend. |
| 3 | `/groups/construction/` impressions are **flat or up** against the prior 28 days. |
| 4 | Total site clicks are **flat or up**. |

## What it does

| | |
|---|---|
| **`nav.home-trades`** | Removed from `index.html`, with its heading and 21 links. |
| **`styles.css`** | The `.home-trades*` rules go with it. |
| **`app.js`** | The *Browse all 21 trades* row in the empty-search dropdown (~line 2133) scrolls to `.home-trades`, which will no longer exist. It repoints to `/tools/`. **This is the one functional edit in the spec and it is easy to miss** — the row only appears on an empty query, so a smoke test that types something never sees it. |
| **The no-JS path** | Becomes the footer badge → `/tools/`. Pre-rendered, and it reaches all 1,709 tiles rather than 21 hubs. |
| **`sitemap.xml`** | Unchanged. All 21 hubs stay listed, as they already are. |

## The rollback, written before the change

Reverting is one commit: restore the `<nav>` block, restore the CSS, repoint the `app.js` scroll
target. No URL moved, no redirect was added, no content changed on any hub, so there is nothing to
un-migrate.

**The trigger to use it:** `/groups/construction/` impressions down more than 20% against the
pre-change 28-day baseline, sustained over two weeks and not explained by a site-wide drop.
Revert first, diagnose after.

## Gotchas

- **Check what a full-text search finds before deleting.** `.home-trades` is referenced in
  `styles.css` (6 rules) and `app.js` (1 scroll target) today. Grep again at implementation time —
  v1337, v1340–v1344 all land in between and any of them may add a reference.
- Do not also remove the group hubs, and do not add redirects. This spec removes 21 links from one
  document. That is its entire scope.
- Re-run `check-home-payload`, the 320px sweep, and the a11y sweep: removing a landmark `nav`
  changes the document outline.

## Proof

- The four entry conditions, **recorded in the commit message with the dates and numbers observed.**
  A spec gated on evidence has to carry the evidence.
- A smoke test that the home document contains zero `.home-trades` links, that the footer badge is
  present, and that the empty-search *Browse all trades* row navigates to `/tools/`.
- `check-dist` — no orphan count increase; the 21 hubs remain reachable from `/tools/`.
