# Discoverability and crawlable surface

This document captures the per-tile prerendered shell model spec-v13
introduced, the authoring rules the build-shells generator enforces,
the structured-data allowlist, the link-graph posture, and the no-
telemetry measurement stance. It is the operations-side companion to
[../specs/spec-v13.md](../specs/spec-v13.md).

## The model

The site is a single-page application with hash-based routing. The
home document at `https://roughlogic.com/` renders the SPA; per-tile
state is encoded in the URL hash. Crawlers (Googlebot, Bingbot,
DuckDuckBot, the AI-summary crawlers that respect robots.txt) fetch a
URL path and read the HTML the server returns; fragments are not
part of the canonicalization, and most non-Google crawlers do not
execute JavaScript at all. Without a per-tile path-based URL, the
full catalog's worth of cited, deterministic reference content is
invisible to general web search.

The fix, landed across spec-v13 Phases A through H, is one static
prerendered HTML shell per tile and one per group, each at a
path-based URL:

- `/tools/<id>/index.html` -- one per tile.
- `/groups/<slug>/index.html` -- one per active group.
- `/tools/index.html` -- the catalog hub, every tile listed under its group.

**Where the group hubs get their internal links.** The home document used to
carry a browse-by-trade strip linking all 21 hubs directly; spec-v1347 removed
it so the home page is the search box and nothing else. The hubs are now one
hop further out: every page on the site (home, tile shells, group shells)
footers to `/tools/`, and `/tools/` links all 21. All 21 also stay in
`sitemap.xml`. `/groups/construction/` is the top organic landing page, so if
its impressions move in Search Console, this is the change to look at first --
the strip is a one-block revert to `index.html`.

Shells are generated at build time by
[../scripts/build-shells.mjs](../scripts/build-shells.mjs) from the
TOOLS array in [../tools-data.js](../tools-data.js) (lazy-loaded out
of `app.js` per spec-v17 §H.2), the `GROUP_NAMES` map in
[../app.js](../app.js), and the spec-v13 Phase E per-tile `related`
registry in [../scripts/related-tiles.mjs](../scripts/related-tiles.mjs)
(moved out of `tile-meta.js` so the runtime no longer carries it).
The shells carry zero JavaScript.
The SPA at the home URL is unchanged; the shells link back to the
SPA via the existing hash route (`/#<id>`) on the "Run the
calculator" button.

## What each shell contains

Per spec-v13 §5.2:

- `<head>`: charset, viewport, the same CSP `<meta http-equiv>` the
  home document carries, `<title>` (per §6.1 authoring rules),
  `<meta name="description">` (per §6.2), `<link rel="canonical">`
  to the shell's own URL, Open Graph + Twitter Card meta, a
  `<script type="application/ld+json">` block with a
  `WebApplication` + `BreadcrumbList` (tile shells) or
  `CollectionPage` + `BreadcrumbList` + `ItemList` (group shells).
- Header with the wordmark and a "Tools index" link back to home.
- Breadcrumb (Home > Group > Tile).
- One `<h1>` with the tile name.
- Lead paragraph with the tile description.
- "Run the calculator" link to the SPA hash form.
- Formula and source block (spec-v45): the cited formula and the
  source-stamp (the `formula` and `edition` fields from `CITATIONS`,
  HTML-escaped). This prerenders the actual reference content -- the math
  and its authority -- into the static shell so it is crawlable and
  readable offline, not just the tile name. Every tile has a `CITATIONS`
  entry (the v19/v22 coverage gate), so every tile shell carries it;
  `check-shells.mjs` fails the build on a tile shell missing the block.
- Audience block naming the profession.
- Reference block, on the 20 tiles that take no inputs and therefore
  carry no worked example (OSHA Top-10, the knot and hand-signal
  references, Lockout/Tagout Steps, the GFCI/AFCI table). Their whole
  value is the table itself, and until 2026-08-31 none of it reached
  the static page. The builder renders what the tile computes on no
  inputs -- the same call `run_calculator` makes, so the page and the
  agent door cannot disagree about what the reference says.
  `check-shells` fails a page that has no worked example and prints no
  reference rows, so an unrecognised result shape has to be handled
  rather than silently rendering the old stub.
- Related tiles block (curated per the Phase E registry, filled out
  by ranking the tile's name against its group siblings, then
  balanced by the catalog-wide inbound pass below).
- Posture block restating the AHJ-governs / professional-governs
  stance.
- Footer matching the home document's footer plus the inline
  disclaimer.

## Authoring rules (Phase B)

Title format: `{Tile Name} - {Profession Noun} - Rough Logic`. Cap
70 characters; the generator falls back to `{Name} - Rough Logic`
then to a truncated name as needed, preserving the brand suffix.

Description format: two to three sentences, verb-first. The first
sentence names the calculation and the inputs. Cap 220 characters
measured against the HTML-escaped string. Tiles whose `desc` does
not lead with an admissible verb get a "Reference for" prefix.

Overflow rule (2026-09-01). A tile description is the tile's opening
sentence plus a closing "Client-side, ad-free, account-free reference
for {profession}." When the pair overruns the cap the closing sentence
is dropped whole rather than clipped, so the reader gets a complete
first sentence; only when that sentence alone overruns is it cut, and
the cut backs off to a word boundary before the ellipsis. A group hub
follows the same rule with its own closing sentence. Before this,
the cap loop shaved four characters at a time and planted the ellipsis
wherever it landed: 734 of 1,804 tile pages ended mid-word
("...flags expec...") in the search snippet, in `og:description`, in
`twitter:description` and in the JSON-LD `description`, and the only
description gate was the length cap, which a mid-word cut passes.
`check-shells` now cross-checks each truncated description back
against the tile's own `desc` and fails if the ellipsis fell inside a
word; `test/unit/shell-description-cap.test.js` pins the helper.

No marketing language. The
[../scripts/check-shells.mjs](../scripts/check-shells.mjs) lint
screens unambiguously-marketing words; the §11.3 list also names
"best" / "easy" / "simple" / "fast" / "ultimate" / "powerful" but
those have legitimate uses in trade math content the tile descs
carry and are exempted.

## Structured data (Phase C)

Closed allowlist of schema.org types: `WebApplication`, `WebPage`,
`CollectionPage`, `BreadcrumbList`, `ItemList`, `ListItem`, `Offer`,
`Person`, `HowTo`, `HowToStep`. No `FAQPage`, no `Review`, no
`AggregateRating`, no `Recipe`, no `Course`, no `JobPosting`.

`HowTo` is reserved for a future Phase E follow-up that surfaces
per-tile inputs out of tile-meta.js; the Phase C shells emit
`WebApplication` only for the tile pages.

The JSON-LD generator escapes `<`, `>`, and `&` to their `\u` form
so a tile name or description cannot smuggle a `</script>` close.
The lint validates every block parses, has
`@context: "https://schema.org"`, and only uses types on the
allowlist.

## Internal link graph (Phase E)

Every tile shell links:

- Up to the group shell (breadcrumb).
- Up to the home (wordmark).
- Sideways to 3-6 related tiles via the curated `RELATED` registry
  in [../scripts/related-tiles.mjs](../scripts/related-tiles.mjs)
  (a build-time-only module the SPA never sees; lifted out of
  tile-meta.js on 2026-05-18 so the runtime tile-meta.js stops
  growing with the editorial map). The registry covers 1,638 of the
  1,804 tiles; the catalog outgrew the Phase E expansion that once
  covered it entirely. The remaining 167, and the 185 curated
  entries that hold fewer than three links, are filled out at build
  time by ranking the tile's own name against its group siblings
  through the same `rankTools` the search box uses. Until
  2026-08-30 the fallback was "the first 5 in the same group", which
  handed every uncurated tile in a group the same five links and
  left 482 tiles receiving no related link from any tile page; the
  ranked fallback brought that to 269, and the heaviest receiver
  dropped from 50 links to 30.
- Sideways *into* every tile, which the per-tile lists alone do not
  guarantee. `relatedGraph` in the shell builder runs one pass over
  the whole catalog after the per-tile lists are built: each tile
  that received no link is appended to the list of the one group
  sibling that ranks it highest and still has room under the cap of
  six. 268 of the 269 find a host; `historical-pricing` cannot,
  being the only tile in group Q. The graph now carries 6,387 edges
  across 1,804 tiles, a mean of 3.5 inbound links per tile, and the
  heaviest receiver is unchanged at 30.
- Sideways from the SPA's hash-route view by way of the canonical
  link.
- Hub to hub. Until 2026-08-31 the group hubs cross-linked only by SPA
  hash (`../../#group=E`), which is a fragment and not a crawlable URL,
  so hub-to-hub link equity did not flow at all --
  [../specs/scope-one-box.md](../specs/scope-one-box.md) records that
  as one of three measured facts constraining the navigation. Each hub
  now carries an "Other trades" section linking the other 20 as real
  URLs with their live counts. Addition, which the charter names as the
  safe half; the home nav is untouched. `check-shells` fails a hub that
  drops a sibling.

The curated registry seeded the highest-traffic semantic edges
first (the spec.md §10 / spec-v3 §HVAC / v6 §F worked-example
sequences the citation graph already records) and filled in the
long tail in the Phase E third expansion. The
[../scripts/check-related-tiles.mjs](../scripts/check-related-tiles.mjs)
lint validates every curated entry (real TOOLS id, no self-
reference, no duplicates, cap 6 per §9.1); it says nothing about
coverage, which is what
[../test/unit/related-tiles-fallback.test.js](../test/unit/related-tiles-fallback.test.js)
now holds -- including the assertion that uncurated tiles in a group
must not all end up with the same list, and that every tile but
`historical-pricing` receives at least one inbound link.

## Not-found page

[../scripts/build-shells.mjs](../scripts/build-shells.mjs) emits
`dist/404.html`. Cloudflare Pages serves it, with a 404 status, for any
path that matches no file -- a retired tile id, a mistyped URL, a stale
external link into a catalog that has renumbered twice. The site
shipped none until 2026-08-31, so those readers got the platform's
default: no wordmark, no search, no way back into 1,804 calculators.

Every path on the page is **root-absolute**. It is served AT THE MISSED
URL, so a relative `styles.css` would resolve to `/tools/typo/styles.css`
and 404 alongside it -- an unstyled page in the moment a reader is
already lost. It carries `noindex,follow`: a 404 that invites indexing
is a 404 in the index. It is not in the sitemap and nothing links to it,
which is why [../scripts/check-dist.mjs](../scripts/check-dist.mjs)
exempts it from the orphan check -- a 404 page reached by a link is a
broken link.

`check-shells` lints it under the group cap and additionally fails on
any relative path, a missing noindex, or a missing link to `/tools/`.

## Sitemap (Phase F)

[../sitemap.xml](../sitemap.xml) is regenerated at build time by
the shell builder. It enumerates:

- The home URL (`/`).
- One URL per group shell.
- One URL per tile shell.

Each URL carries `<changefreq>` of `weekly` for home and `monthly`
for groups and tiles, and `<priority>` of 1.0 home /
0.8 group / 0.7 tile. (The changelog page that earlier carried its
own sitemap entry was retired in the search-first home refactor.)

`<lastmod>` per URL (2026-09-01). It used to be the build timestamp
from `dist/build-info.json`, on every URL. The site rebuilds on every
push, so a crawler saw all 1,827 pages claiming to have changed today,
every day, whatever had actually changed -- next to a `<changefreq>` of
`monthly` on the same URL. A lastmod that demonstrably does not track
content is worse than none: the signal gets dropped for the whole
sitemap, and the pages that really did change lose the one hint saying
so.

The date now comes from [../scripts/page-lastmod.json](../scripts/page-lastmod.json),
a committed ledger holding, for each URL, a hash of the bytes that URL
serves and the date that hash was last stamped. A page whose bytes have
not moved keeps its date. The home entry hashes `index.html` together
with `tools-data.js`, because the frame alone never changes when a tile
is added and the home page visibly does.

Re-stamp with `npm run stamp:lastmod` after a build and commit the
result. `npm run check:lastmod` runs in the integration job, after the
build, and fails if `dist/` has drifted from the ledger -- naming the
URLs -- so a changed page cannot ship with a stale date. It is in the
integration job and not the lint job for the reason
[performance.md](performance.md) gives about the per-module budget: the
lint job runs before any build, and a gate that reads `dist/` there
reads nothing. The first stamp dated all 1,827 URLs to the day the
ledger was created, which is all that was knowable then; every URL that
has not changed since keeps that date, and the ledger converges on the
truth from there.

`check-shells` matches the sitemap against `dist/` in both
directions: every `<loc>` must have a page behind it, and every
built tile, group and the catalog hub must appear in the sitemap.
The two are generated from the same TOOLS list one after the
other, which is the same "generated together" reasoning that once
let a tampered data shard through -- generated together is not
checked together. A dangling `<loc>` is a 404 handed to a crawler;
a shell missing from the sitemap is a page no crawler is told
about.

[../robots.txt](../robots.txt) is unchanged from pre-v13: it allows
all crawlers and points at the sitemap. No `Disallow` directive,
no crawl delay, no AI-specific opinion.

## Performance budgets (Phase H)

Per-shell targets:

- LCP < 0.8 s on simulated 4G (Cloudflare edge serves < 6 KB
  gzipped HTML with one CSS load).
- FCP < 0.6 s.
- TBT 0 ms (shells carry no JavaScript).
- CLS < 0.01.

Payload caps enforced by the
[../scripts/check-shells.mjs](../scripts/check-shells.mjs) lint:

- Tile shell: 6 KB gzipped.
- Group shell: 12 KB gzipped.

Live measurements at Phase H close: tile shells ~1.8 KB gzipped /
5.4 KB raw; group shells ~3.9 KB gzipped / 15.2 KB raw. The home
view's 100 KB-after-gzip budget is unchanged; shells are separate
documents.

[../lighthouserc.json](../lighthouserc.json) audits the home URL,
five SPA hash URLs (one tile per representative group), two tile
shells (`wire-ampacity`, `friction-loss`), and one group shell
(`electrical`). The Lighthouse CI workflow in
[../.github/workflows/ci.yml](../.github/workflows/ci.yml) runs
`npm ci` + `npm run build` before `lhci autorun` so `dist/`
exists at audit time.

## Measurement (Phase I)

The site does not change its no-telemetry posture. Measurement is
source-side only:

- **Cloudflare edge metrics**: zero-cookie, aggregated. Existing
  pre-v13.
- **Google Search Console** (maintainer-side): aggregate
  impressions, click-throughs, and search-query strings for the
  site. Verified via the DNS TXT record (preferred) or the HTML
  file fallback. The verification artifact is a one-time
  bootstrap; no runtime instrumentation reaches the visitor.
- **Bing Webmaster Tools** (maintainer-side): same posture.

Monthly aggregate impressions and click-through counts are recorded
in [seo-log.md](seo-log.md) per release cycle. The log is the same
shape as the v6 §6 recheck log: date, observed value, note. No
analytics SDK, no event tracking, no pageview beacons, no
remarketing tags, no conversion pixels, no A/B testing of title or
description copy.

## What v13 does not do

- No server-side rendering at request time. Shells are static at
  build time.
- No prerendering framework (Next, Astro, Eleventy, Hugo). The
  shell generator is a small Node script using only built-ins.
- No AMP, no PWA install prompts.
- No `hreflang` (US-only per spec.md / spec-v12 §2).
- No author bylines, no review microdata.
- No backlink solicitation, no guest posting, no link exchange.
- No paid placement, ever.

## Where to look in the code

- [../scripts/build-shells.mjs](../scripts/build-shells.mjs) -- the
  generator; reads TOOLS, GROUP_NAMES, and TILE_META.
- [../scripts/check-shells.mjs](../scripts/check-shells.mjs) -- the
  Phase G lint; runs in `npm run audit`.
- [../tile-meta.js](../tile-meta.js) -- the per-tile runtime
  meta registry (group, simplified flag, field-meter flag,
  a11y verification date). Build-time only; not imported by the
  SPA today.
- [../scripts/related-tiles.mjs](../scripts/related-tiles.mjs) --
  the Phase E `RELATED` map. Build-time only; consumed by
  scripts/build-shells.mjs and validated by
  scripts/check-related-tiles.mjs.
- [../sitemap.xml](../sitemap.xml) -- generated; do not edit by
  hand (the build overwrites it).
- [../lighthouserc.json](../lighthouserc.json) -- Phase H budgets
  + shell URLs.
- [../specs/spec-v13.md](../specs/spec-v13.md) -- the source-of-
  truth spec.
