# spec-v1345.md — The catalog gets a page

> Status: **SHIPPED (2026-08-20).** Part of [scope-one-box](scope-one-box.md). Depends on [v1346](spec-v1346.md).
> New build step, one new page, one footer badge. **Pure addition: nothing is removed, no URL
> changes, no existing page is edited except to gain the badge.** Catalog stays **1,709**.

## Why

`/tools/` is a **404**. It sits directly above 1,709 pre-rendered tile pages and has no index.
Meanwhile the only way into the catalog from the home page is a 21-item trade nav that the
one-box redesign wants gone.

Those two facts resolve each other. Build the page that should already exist, put it one click
from every page in the site, and the home page's nav stops being load-bearing — **before** anyone
proposes removing it.

This spec is the additive half of that trade, and it is deliberately shipped and left alone for a
while. It changes no URL, edits no group hub, and removes no link. It can only add crawl paths.

## What it does

| | |
|---|---|
| **The page** | `/tools/`, every one of the 1,709 calculators, grouped by the catalog's own 21 trade groups. |
| **Why grouped, not A-Z** | A flat list of 1,709 names is not browsable. The groups let a reader find the neighbourhood before the name. It also mirrors what already ranks: `/groups/construction/` is the top organic landing page, so category-first is the shape this audience already uses. |
| **Each group heads with its hub link** | The group heading links `/groups/<slug>/` — a real crawlable URL, not a `#group=` fragment. This is the link the hubs do not currently get from each other. |
| **Counts** | Per group, computed from `TOOLS` at build time, so nothing here can drift the way a hand-typed count does and no new `check-readme-counts` surface is needed. |
| **Jump nav** | One pill per trade at the top. A reader 900 names deep can get back without scrolling for it. |
| **Primary action** | *Ask for it instead →* in `--accent`. Browsing is the fallback and the page says so. |
| **Entry point** | A footer badge, `All calculators`, beside *Made with ♥ by Clay Good* and GitHub — on the home page and on all 1,709 tile shells and 21 group shells. |

## What this does to the link graph, precisely

The hubs cross-link today by SPA hash (`../../#group=E`), which is a fragment, not a crawlable
URL. So hub-to-hub equity does not flow at all right now.

| | Before | After |
|---|---|---|
| Inbound internal links to `/tools/` | — (404) | **~1,731** — every shell footer plus home |
| Crawlable links into `/groups/construction/` | 466 tiles + home | 466 tiles + home + `/tools/` |
| Crawlable links into any tile page | its hub + related tiles | its hub + related tiles + `/tools/` |
| Home → hub hop count | 1 | still 1 |

Every number goes up or stays flat. There is no subtraction anywhere in this spec — that is
[v1347](spec-v1347.md), and it does not run until this page has been indexed and observed.

## Where it lives

- `scripts/build-tools-index.mjs` — **new.** Writes `dist/tools/index.html`.
- `scripts/build.mjs` — wired in after `build-shells.mjs`.
- `scripts/build-shells.mjs` — `/tools/` joins the sitemap; `shellFooter()` gains the badge, so
  all 1,730 shells get it in one edit.
- `index.html` — the same badge in the home footer.
- `styles.css` — `.tools-index`, `.ti-*`, `.all-tools-badge`. Existing tokens only.

## What shipped differently

- **Built inside `scripts/build-shells.mjs`, not as a separate `build-tools-index.mjs`.** That
  module already owns `shellHead`, `shellHeader`, `shellFooter`, `escapeHtml`, `GROUP_SLUG`,
  `jsonLdBlock`, and the sitemap writer. A second HTML-emitting script would have duplicated the
  header and footer, which is exactly the drift this spec's own gotcha warns about.
- **`<body class="shell-page">` is load-bearing and was missed on the first cut.** 40 rules in
  `styles.css` are scoped to that class, including the container width and the CTA treatment.
  Without it the page rendered as unstyled prose that *looked close enough to pass a screenshot*
  — the h1 was large, the lists were lists — while the "Ask for it instead" CTA was plain grey
  text instead of the blue button. Browser-verified, not eyeballed: the computed style said
  `padding: 0px, background: rgba(0,0,0,0)`.
- **`check-shells` did not glob the new page.** It walks `dist/tools/<id>/index.html`, so
  `dist/tools/index.html` sat directly in that folder and matched nothing. It is now linted
  explicitly under the **group** cap (45 KB gzip against a 68 KB ceiling) — at 1,709 links it is
  legitimately the largest page on the site, and it was briefly the only shipped shell no gate
  watched.
- **`check-readme-counts` computes the sitemap total from a formula**, `tiles + groups + 1`, not
  from the file. Adding a URL meant editing the formula to `+ 2` as well as the README, or the
  gate would have kept asserting a number the sitemap no longer had.

## Gotchas

- **`<body class="shell-page">` or 40 rules silently do not apply.** See above.
- **Do not make `<body>` a flex container** to pin the footer. sophiewell's v757 did, and a flex
  item cannot shrink below its content: 20 tiles with wide reference tables stopped being able to
  scroll those tables inside their own box and pushed the document to 385px inside a 320px
  viewport. `min-width: 0` is necessary but insufficient, and `flex: 1 0 auto` still cannot shrink
  because the middle `0` is `flex-shrink`. Scope any centring to the home container.
- **The group label map must degrade, not vanish.** A group present in `TOOLS` but missing from
  the page's label map still renders, under `Group <letter>`. A new trade group must appear on
  this page, not silently drop off it.
- `.ti-list` uses CSS `columns`, not grid, so names flow down each column in reading order. It
  must drop to one column under 600px — a multi-column list is exactly the shape that overflows a
  narrow phone.
- 1,709 names is a large page. Hold it to the `check-shells` gzip cap; if it does not fit, split
  the listing per group rather than truncating, and **`log()` anything dropped**. A silent
  truncation reads as "covered everything" when it did not.
- The badge goes in `shellFooter()` in `build-shells.mjs`, **not** pasted into a template twice.
  There is one footer builder and it serves all 1,730 shells.
- `app.js` line ~2133 has a *Browse all 21 trades* row in the empty-search dropdown that scrolls
  to `.home-trades`. It keeps working in this spec; [v1347](spec-v1347.md) repoints it to `/tools/`.

## Proof

- `check-dist` — `/tools/index.html` present, every one of its ~1,730 same-origin references
  resolves, and the orphan count does not rise.
- A new test asserting the page lists **every** pre-rendered tile, that the per-group counts sum
  to 1,709, that every one of the 21 group headings links a real `/groups/<slug>/` URL, and that
  the jump nav reaches every group it names.
- `check:shell-mobile` and the 320px sweep — `/tools/` at 320px, no horizontal scroll.
- `check-readme-counts` — sitemap count rises by exactly 1 (1731 → 1732).
- **No diff to any `/groups/<slug>/` shell except the footer badge.** Assert it: the group-shell
  bytes before and after should differ only in the footer block.
