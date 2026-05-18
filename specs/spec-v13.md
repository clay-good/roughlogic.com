# roughlogic.com Specification v13 - Search Discoverability and Crawlable Surface

> **Implementation status (drafted 2026-05-18, Phases A + D + F
> landed 2026-05-18, Phases B + C + G landed 2026-05-18, status:
> partially landed).** Phase A (per-tile shells), Phase D (per-
> group shells), and Phase F (sitemap expansion) shipped first:
> 385 tile shells under `/tools/<id>/index.html`, 24 group shells
> under `/groups/<slug>/index.html`, and a sitemap with 411 URLs
> (home + changelog + 24 groups + 385 tiles). Phases B (authoring
> discipline: verb-first descriptions, profession-bearing titles
> with the §6.1 70-char title cap enforced by length-aware
> fallback, the §6.2 220-char description cap enforced against the
> HTML-escaped length), C (JSON-LD: WebApplication + BreadcrumbList
> on every tile shell, CollectionPage + BreadcrumbList + ItemList
> on every group shell, closed allowlist of schema.org types), and
> G (the `scripts/check-shells.mjs` lint that asserts shell
> presence, title + description + canonical + OG + Twitter
> structure, JSON-LD parseability and allowlist compliance, and
> the §5.4 6 KB / §8.3 12 KB gzip caps) shipped next. Per-shell
> payload at Phase C close: tile shell ~1.8 KB gzipped, group
> shell ~3.9 KB gzipped, both well under cap. Phase E (replace
> the Phase A "first 5 tiles in same group" related-tiles
> fallback with the v10 §B.2 `related` registry once tile-meta.js
> carries that field) and Phase H (extend `lighthouserc.json` to
> a representative tile shell + group shell) follow in subsequent
> commits. Phase I (post-deploy Search Console / Bing Webmaster
> Tools verification + monthly aggregate log) lands after first
> deploy. v13 is a discoverability spec. It does not add tiles,
> groups, or runtime features. It addresses one structural defect that
> every spec from v1 through v12 has carried: the site is a single-
> page application with hash-based routing, which means that every
> URL a crawler can fetch returns the same home document, and every
> per-tile heading, citation, and worked example lives behind a
> JavaScript route fragment that crawlers do not execute. The
> practical consequence: 385 tiles' worth of original, calm,
> deterministic reference content is invisible to general web search.
> A plumber typing "hazen williams calculator" or a restoration tech
> typing "psychrometric dew point calculator" into a search engine
> on a job site does not see this site in the results, even though
> the site is materially the best free answer to both queries. v13
> closes that gap by adding a per-tile prerendered HTML shell at a
> path-based URL, per-tile metadata and structured data, group
> landing pages, an expanded sitemap, and an authoring discipline
> for titles and descriptions that names the profession and the
> task. Every constraint from spec.md through spec-v12.md continues
> unchanged. No new third-party dependencies, no new licenses, no
> new storage keys, no telemetry, no AI, no advertising, no
> account, no fee. The site remains a 100 percent client-side
> static bundle.

> Foreword, in the voice of a maintainer reading a Cloudflare
> dashboard at the close of v12 and seeing 642 unique visitors
> since launch, 82 yesterday, almost all of them arriving by direct
> link or word of mouth, almost none of them arriving from a search
> engine, and realizing that the site has been a private utility
> for the people who already know it exists.
>
> The site set out to be the calm, fast, ad-free, account-free,
> ever-free reference for the trades and the professions adjacent
> to them. v1 through v9 built the catalog. v10 hardened the
> citations. v11 reduced the surface. v12 broadened the catalog
> across five professions. Each of those was the right move at the
> time, and each of them assumed that the user already knew the
> URL. None of them addressed the question a working professional
> actually asks at 7:14 on a Tuesday morning, which is not "what is
> the URL of the calm calculator site I read about" but "hazen
> williams 4 inch ductile iron 200 gpm" typed into the search bar
> that came up when they unlocked their phone.
>
> The site is invisible to that question. Not because the content
> is missing - the content is there, accurate, cited, and tested.
> The site is invisible because the structural choice that made the
> site fast (a single HTML document, all routing done in
> JavaScript, every tile delivered as a hash fragment) is the same
> structural choice that hides every tile from a crawler. A
> crawler that fetches `https://roughlogic.com/` sees the home
> document, an empty `<div id="tools-sections">`, a noscript
> notice, and a footer. A crawler that fetches
> `https://roughlogic.com/#hazen-williams` sees the same document
> (the fragment is client-side; the server returns the same
> bytes). The 385 per-tile headings, descriptions, citations, and
> worked examples that exist in the running app exist nowhere in
> the surface that a crawler can read.
>
> v13 fixes this. The fix is not a framework, not a server, not a
> rendering pipeline that runs on every request. The fix is a
> build-time step that generates one small static HTML file per
> tile (and one per group), each at a path-based URL
> (`/tools/<slug>/index.html`, `/groups/<slug>/index.html`), each
> containing the tile name as the page `<title>`, the tile
> description in a `<meta name="description">`, the source-stamp
> citation as readable text, the worked-example inputs and outputs
> as readable text, a JSON-LD `HowTo` or `SoftwareApplication`
> block describing the tile, an internal link to the live
> interactive tile (via the existing hash route), an internal link
> to the group landing page, and an internal link back to the
> home view. The interactive page (the home document, the existing
> SPA) is unchanged. The shells are reference pages: a person who
> arrives at one from a search engine reads a calm one-page
> description of the tile, sees the inputs the tile accepts, sees
> the worked example, sees the citation, and clicks one link to
> open the interactive version if they want to run their own
> numbers. A person who arrives at the home page sees the SPA, as
> before.
>
> This is the same discipline the rest of the site uses: do the
> minimum that makes the answer accessible, defer to the
> professional for the decision, and get out of the way. The
> minimum here is one static HTML file per tile. The cost is a
> few hundred kilobytes in `dist/` (each shell ~3-6 KB), a small
> addition to the build script, and a sitemap that lists the new
> URLs. The benefit is that the 385 tiles become 385 indexable
> pages, each individually findable by the search terms its
> profession actually uses.
>
> Build it the way the rest of the site was built. One tile, one
> shell, one citation, one canonical URL. Then get out of the
> search engine's way and let the result page do the rest.

This document is the v13 spec. It inherits everything from
spec.md, spec-v2.md, spec-v3.md, spec-v4.md, spec-v5.md,
spec-v6.md, spec-v7.md, spec-v8.md, spec-v9.md, spec-v10.md,
spec-v11.md, and spec-v12.md. Where v13 expands the build
pipeline or adds a new asset type, the addition is bounded by the
existing hard limits (100 percent client-side, no third-party
fetch at runtime, CSP `default-src 'self'`, no telemetry, no
account, no fee). Every other constraint from every earlier spec
remains in force.

Repository: github.com/clay-good/roughlogic.com

US standards only. Assume all visitors are in the United States.
v13 does not change the audience posture.

## 1. Inheritance

Every constraint from prior specs continues without exception.
v13 adds:

- A build-time prerender step that emits one small static HTML
  shell per tile and one per group. No runtime cost: shells are
  served as static files by Cloudflare Pages.
- Per-tile and per-group metadata (`<title>`, `<meta
  name="description">`, `<link rel="canonical">`, Open Graph,
  Twitter Card, JSON-LD).
- An expanded `sitemap.xml` that enumerates every tile shell and
  every group shell.
- No new third-party dependencies, no new licenses, no new
  storage keys, no new fetch origins, no new runtime state
  channels. The URL hash remains the only state channel for the
  interactive SPA; the shells are stateless reference pages.

The hard limits still bind:

- 100 percent client-side, single-page static, Cloudflare Pages,
  no server, no account, no telemetry, no AI, no API key, no
  third-party fetch beyond same-origin static assets.
- No localStorage / sessionStorage / cookies / IndexedDB beyond
  `rl-theme`. URL hash is the only state mechanism for the SPA;
  shells are read-only and carry no state.
- CSP `default-src 'self'`, `connect-src 'self'`, `worker-src
  'self'`. The shells inherit this CSP via `_headers` and via the
  same `<meta http-equiv>` tag the home document carries.
- WCAG 2.2 AA, 48 px touch targets, voice input, single h1 per
  view (the shell carries one h1: the tile name).
- No emojis, no em-dashes, no decorative icons. Shells use the
  same character set discipline as the home document. JSON-LD
  text is checked by the same `scripts/grep-checks.mjs`.
- Home-view payload budget under 100 KB after gzip. Shells are
  not part of the home view; they ship as separate files and are
  fetched only when a crawler or a direct visitor requests them.
- Public changelog, semver, no flags, 90-day deprecation.
- "AHJ governs" / "professional governs" posture preserved on
  every shell. The shell carries the same inline notice the
  interactive tile renders, generated from the same `NOTICE`
  constants per [calc-references.js](../calc-references.js).

## 2. The SEO problem, stated precisely

The site as built is a single-document SPA. The home document at
`https://roughlogic.com/` is the only path-based URL the server
returns; every tile is reached by setting the URL hash
(`#wire-ampacity`, `#hazen-williams`, etc.) and letting
[../app.js](../app.js) read the hash and mount the tile view via
DOM manipulation. The server, Cloudflare Pages, returns the same
bytes for every URL path that does not exist as a file: the home
`index.html`. (The SPA-fallback behavior is configured via
[../_headers](../_headers) and Cloudflare Pages' default
single-page-app routing.)

The crawler implications:

- **Googlebot, Bingbot, DuckDuckBot, etc.** fetch a URL path and
  read the HTML the server returns. Modern Googlebot does
  execute JavaScript in a deferred second-stage render, but (a)
  the second stage is rate-limited and applied selectively, (b)
  the fragment identifier is ignored for canonicalization
  purposes (`#x` is the same URL as the bare path for the
  crawler's index), and (c) other crawlers (Bing, smaller
  engines, archive crawlers, AI-summary crawlers) do not run
  JavaScript at all.
- **Search Console / Sitemap submission.** A sitemap can only
  list URLs the server resolves to distinct documents. The
  current `sitemap.xml` lists exactly one URL (the home page).
  The 385 tiles are not enumerable for submission because they
  do not have distinct URLs.
- **Social sharing / link previews.** When a tile URL is shared
  on a messaging app or a forum, the link-preview crawler
  fetches the URL and reads the `<meta property="og:*">` tags.
  The current site returns the home OG tags for every tile URL,
  so every shared link previews as "Rough Logic - Field math
  for the trades" regardless of which tile was shared.
- **AI summary crawlers** (the perplexity-class, the Brave-
  summary-class, the various LLM-training crawlers that respect
  robots.txt and read public HTML) fetch HTML and extract text.
  They cannot run the SPA. The site's calm, cited, deterministic
  content is invisible to them.

The fix is structural: emit one HTML document per tile at a
path-based URL, with the tile's content rendered statically at
build time. The interactive SPA continues to live at the home
URL. The two surfaces share the citation strings, the worked
examples, and the inline notice; they differ in interactivity.

## 3. Hard limits unchanged

Every spec-level hard limit from prior specs continues unchanged.
The limits that are most likely to be tested by the v13 work are
restated here for the contributor:

- No paid tier, no donation prompts, no Patreon, no "support us"
  banner on the shells. The shells are the same site as the SPA,
  with the same posture.
- No accounts, no email capture, no notification permissions on
  shells.
- No advertising, no tracking pixel, no analytics SDK on shells.
  Cloudflare edge metrics (zero-cookie, aggregated) remain the
  only visibility into traffic. Google Search Console (free,
  zero-cookie for the site visitor, scoped to aggregate search-
  query and impression data) is permitted because (a) it
  observes the search engine, not the user, and (b) the verified
  HTML file or DNS TXT record used to claim the property is a
  one-time bootstrapping artifact, not runtime instrumentation.
- No A/B testing on shells, ever.
- No LLM, AI, generative, or probabilistic content in shells. The
  shells render the same source-stamped tile metadata the SPA
  renders, generated from the same TOOLS array.
- No live data fetches from shells. Shells are static HTML at
  build time; they do not fetch shards at runtime. The "Open the
  calculator" link on a shell is a same-origin link to the home
  document with a tile hash; the SPA loads the tile from the
  cached shards as today.

## 4. Motivation

Three motivations, each independently sufficient:

- **Audience reach.** Cloudflare metrics at v12 close show ~640
  unique visitors over the launch window. The traffic shape is
  dominated by direct visits and word-of-mouth links. The
  professional who has not yet heard of the site is the audience
  v13 targets, and that professional searches for "voltage drop
  calculator", "pipe friction loss", "fire flow gpm", "manual j
  estimate", "psychrometric calculator", "amperage by wire
  gauge". The site answers every one of those questions calmly
  and accurately. Search needs to be able to see the answer.
- **Public-utility posture.** The site's stated posture
  (spec.md §1, repeated through every spec) is that it is a
  public utility: a free, account-free, ad-free reference for
  professionals doing math over public data. A public utility
  that is undiscoverable is a private utility for the people who
  already know it exists. The public-utility framing carries
  the obligation to be findable.
- **Source quality and answer quality.** The first page of a
  search result for any of the queries above is currently
  dominated by paid apps, ad-laden calculator farms, half-broken
  government sites, and forum threads from 2009 with a wrong
  formula in the accepted answer. The site is, on the merits,
  the better answer for every one of those queries. Putting it
  on the result page is a quality improvement for the search
  engine and the professional both.

## 5. Phase A - Per-tile prerendered HTML shells

### 5.1 Path scheme

Each tile gets one shell at `/tools/<id>/index.html`, where
`<id>` is the existing tile id from the TOOLS array in
[../app.js](../app.js). The id is already kebab-case, already
unique across the catalog, and already used as the URL hash
(`#wire-ampacity` etc.) - reusing it as the path slug means
that every internal cross-reference (citation strings, worked
examples, search-index entries) continues to point to the same
tile by the same identifier on both surfaces.

The shell URL `https://roughlogic.com/tools/wire-ampacity/` is the
canonical URL for the tile. The hash form
`https://roughlogic.com/#wire-ampacity` continues to load the
SPA tile view and is the operational URL for an interactive user
who already has the SPA open. The SPA emits a `<link
rel="canonical">` pointing to the shell URL when a tile is
opened, so that any social or messaging crawler that resolves the
hash URL still reads the canonical shell URL.

### 5.2 Shell contents

Each shell is a stand-alone HTML document of approximately 3-6
KB gzipped. The shell contains, in order:

- A standard `<head>`: charset, viewport, the same CSP meta tag
  the home document carries, `<title>` = "Tile Name - Rough
  Logic", `<meta name="description">` (per §11 authoring rules),
  `<link rel="canonical">` to the shell's own URL, Open Graph
  tags (per §7), Twitter Card tags (per §7), a `<link
  rel="stylesheet">` pointing to the same `styles.css` the home
  document uses, and a `<script type="application/ld+json">`
  block per §7.
- A `<header>` carrying the wordmark and a "Tools index" link
  back to home. No theme toggle, no search box (the shell is a
  reference page; the home document is where search lives).
- A `<main>` with:
  - A breadcrumb nav: Home > Group name > Tile name.
  - One h1 with the tile name.
  - A one-paragraph description (the tile's `desc` field,
    expanded per §11 authoring rules into 2-3 sentences).
  - A "Run the calculator" link to the SPA's hash form
    (`/#<id>`).
  - An "Inputs" list summarizing the inputs the tile accepts
    (input name + brief one-line description), pulled from the
    per-tile metadata.
  - An "Output" list summarizing the quantities the tile
    returns.
  - A "Worked example" block carrying the worked-example
    fixture's inputs and outputs as plain text (the same
    fixture the v10 §C runner uses).
  - The inline notice variant (AHJ-governs / fire SOP /
    professional-governs, depending on the tile's
    classification), from the same NOTICE constants the SPA
    uses.
  - A "Citation" block with the source-stamp string,
    publisher, edition, section, and verified-on date, pulled
    from [../citations.js](../citations.js).
  - A "Related tiles" block listing 3-6 other tiles in the
    same group, with internal links to their shells.
- A `<footer>` matching the home document's footer
  (attribution + GitHub link).
- No client-side JavaScript on the shell. Zero. The shell is a
  static reference page. The "Run the calculator" link is a
  plain anchor; the SPA loads on click.

### 5.3 Shell generation

A new build step in [../scripts/build.mjs](../scripts/build.mjs)
(or a sibling `scripts/build-shells.mjs`) reads the TOOLS array,
the citations, the worked-example fixtures, and the per-tile
meta from [../tile-meta.js](../tile-meta.js), and emits one
shell file per tile under `dist/tools/<id>/index.html`. Group
shells are emitted under `dist/groups/<group-slug>/index.html`
(see §8).

The generator is pure (no network, no async beyond file I/O,
deterministic). It is covered by a unit test that fixes a sample
tile and asserts byte-equality with a golden file under
`test/fixtures/shells/`.

### 5.4 Shell payload budget

Each shell ships under 6 KB gzipped (target 3-4 KB typical).
The aggregate dist/ growth budget for shells: 385 tile shells +
13 group shells (one per active group A-Y) + 1 sitemap
expansion. At a 5 KB average per shell, the aggregate is ~2 MB
uncompressed in `dist/`. Cloudflare Pages serves the shells
gzipped at edge; the per-shell over-the-wire cost is the 3-6 KB
budget.

The shells do not load `app.js`, do not load any `calc-*.js`,
do not load any data shard. The only CSS load is `styles.css`,
which is already part of the home view and is therefore already
cached in any visitor's browser by the time they navigate from a
shell to the SPA.

### 5.5 SPA-side canonical emission

When the SPA opens a tile (the hash-route handler in
[../app.js](../app.js)), it sets the document `<title>` and
`<meta name="description">` to match the shell's, and emits a
`<link rel="canonical" href="/tools/<id>/">` element in the
`<head>`. This means a crawler that lands on the hash URL still
sees the canonical pointing at the shell URL. The SPA already
sets the document title per tile; v13 adds the meta description
and the canonical link.

When the SPA returns to the home view, the canonical reverts to
`/` and the title reverts to "Rough Logic".

## 6. Phase B - Per-tile metadata authoring

### 6.1 Title format

`{Tile Name} - {Profession noun} - Rough Logic`

Examples:
- `Wire Ampacity - Electricians - Rough Logic`
- `Hazen-Williams Pipe Friction - Plumbers - Rough Logic`
- `Parkland Burn Fluid Resuscitation - EMS - Rough Logic`
- `Density Altitude - Pilots - Rough Logic`

The profession noun is plural because the search queries that
hit it are usually generic-trade ("electrician calculator",
"hvac formula"). Titles are derived at build time from the
tile's `name` field and the first entry in its `trades` field.
Tiles with multiple trades use the broadest trade noun. The
mapping (trade tag -> profession noun) is documented in
[../scripts/build-shells.mjs](../scripts/build-shells.mjs) and
covered by a unit test.

Title length budget: 50-60 characters target, 70 character hard
cap. The build asserts every shell title fits the cap.

### 6.2 Description format

Two to three sentences. First sentence states the calculation
("Compute the voltage drop across a single-phase or three-phase
circuit given conductor size, length, current, and material.").
Second sentence names the source standard or first principle
("Derived from the NEC table 8 resistance values per AWG.").
Optional third sentence names the audience and the task
("Used by electricians sizing a feeder or a branch circuit
before installation."). No marketing language. No "best", "free",
"easy" - the site's posture is plain.

Length budget: 140-160 characters target for the meta-description
(Google typically truncates the SERP snippet near 155); 220
character hard cap. The first 140 characters carry the verb and
the inputs. The build asserts every shell description fits the
cap.

### 6.3 Inline-page heading and lead

The shell `<h1>` is the tile name as displayed in the SPA, not
the meta-title. The lead paragraph under the h1 is a 2-3
sentence expansion of the description that names the inputs,
the output, and the citation. The lead is human-readable copy
written by the author; it is not the same string as the meta-
description.

## 7. Phase C - Structured data (JSON-LD)

### 7.1 JSON-LD block per shell

Each shell carries one `<script type="application/ld+json">`
block in the `<head>`. The block contains an array of two or
three structured-data items:

- A `WebApplication` (or `SoftwareApplication`) object: name =
  tile name, description = the meta-description, applicationCategory
  = "BusinessApplication", operatingSystem = "Any (browser)",
  offers = an `Offer` with price `"0"` and priceCurrency `"USD"`,
  isAccessibleForFree = `true`, author = the site author, url =
  the shell canonical URL.
- A `BreadcrumbList`: Home > Group landing > Tile.
- A `HowTo` (for tiles that take measurable inputs and produce a
  computed output): name = tile name, description = the meta-
  description, totalTime = "PT1M" or "PT30S" (the time a user
  would spend running the calculator), step = an ordered list of
  the inputs the tile accepts (each step's `text` field is the
  input prompt as the SPA renders it).

Tiles that are reference-only (e.g., the Y.12 periodic table,
the U.6 body condition score reference) emit a `WebPage` instead
of a `HowTo` and skip the step list. The choice between HowTo
and WebPage is driven by the per-tile meta's `kind` field added
in v10 §B.2.

### 7.2 No FAQPage schema

The site does not carry FAQ content. The universal disclaimer
in the footer is not a FAQ; do not emit `FAQPage` schema for
it. (FAQPage schema is also currently demoted by Google's
2024 update and risks a manual penalty for misuse; staying out
is the right posture.)

### 7.3 JSON-LD generation and lint

The JSON-LD generator is part of the shell builder. A new lint,
`scripts/check-jsonld.mjs`, parses every shell's JSON-LD block,
asserts the schema-required fields are present, asserts the URL
field matches the shell's canonical URL, and asserts the text
fields pass the existing grep-checks (no em-dash, no emoji).
The lint runs as part of `npm run lint`.

The schema vocabulary used is the schema.org subset that
Google Search Central documents as supported for rich results.
No custom types. No third-party schema extensions.

## 8. Phase D - Group landing pages

### 8.1 One shell per group

Each active group (A Electrical, B Plumbing, C HVAC, D
Restoration, E Carpentry / Construction, F Fire-ground, G Cross-
trade, H References, J Mechanic, K Agriculture, L Water, M Stage,
N Kitchen, O Field, P Accounting, Q Legal, R Lab, S Historical,
T Trucking, U Veterinary, V EMS, W Aviation, X Real Estate, Y
Educators) gets one shell at `/groups/<slug>/index.html`. The
slug is the lowercased profession name with hyphens
("electrical", "fire-ground", "real-estate").

### 8.2 Group shell contents

Each group shell carries:

- A `<head>` matching the per-tile shell head, with title
  format `{Group Name} Calculators - Rough Logic` and a
  description that names the trade and lists 3-5 representative
  tools.
- A breadcrumb (Home > Group name).
- An h1 with the group name and tagline.
- A one-paragraph description of the group and its scope.
- A full list of tiles in the group, each with name + one-line
  description + internal link to the tile shell.
- A link to the SPA home view filtered to the group
  (`/#group=A` etc.).
- The site footer.

Group shells emit JSON-LD `CollectionPage` + `BreadcrumbList`
+ an `ItemList` whose items are the tile shells.

### 8.3 Group shell payload budget

Each group shell ships under 12 KB gzipped (groups vary from
~15 tiles to ~30 tiles).

## 9. Phase E - Internal linking and topical clustering

### 9.1 The link graph

Every shell links:

- Up to the group shell (via the breadcrumb).
- Up to the home (via the wordmark).
- Sideways to 3-6 related tiles in the same group (via the
  "Related tiles" block).
- Sideways to 1-2 cross-group "see also" tiles where the
  reference graph already records an edge (e.g., voltage-drop ->
  wire-ampacity, fire-flow -> needed-fire-flow). The cross-group
  edges are derived from the v10 §B.2 per-tile meta `related`
  field, which already exists; v13 emits the edges as anchor
  tags in shells.

The link graph is a closed bipartite graph between shells and
the home / group shells. There are no external links from any
shell beyond the existing footer attribution to claygood.com and
the GitHub repository link, both of which carry `rel="noopener"`
already.

### 9.2 No reciprocal-link pumping, no link-farm posture

The internal link graph reflects actual reference relationships
between tiles. No tile links to another tile solely for SEO
juice. The build-time generator emits the relations from
[../tile-meta.js](../tile-meta.js); contributors do not curate
shells directly.

## 10. Phase F - Sitemap and robots

### 10.1 Sitemap expansion

[../sitemap.xml](../sitemap.xml) is regenerated at build time
from the TOOLS array and the group list. The new sitemap
contains:

- The home URL (`/`).
- One URL per group shell (`/groups/<slug>/`).
- One URL per tile shell (`/tools/<id>/`).
- The changelog page (`/changelog.html`).

Each URL carries:

- `<loc>`: the canonical URL.
- `<lastmod>`: the build timestamp from `dist/build-info.json`
  (the same stamp the SPA already emits).
- `<changefreq>`: `monthly` for tiles, `monthly` for groups,
  `weekly` for the home page. The Phase H of v12 governs the
  shard-level cadence; the sitemap cadence is a hint, not a
  contract.
- `<priority>`: 1.0 home, 0.8 group shells, 0.7 tile shells,
  0.5 changelog.

The sitemap is asserted < 50,000 URLs and < 50 MB uncompressed
by the existing build pipeline (the catalog at v12 is 385 tiles,
well under both caps).

### 10.2 Sitemap index

If the catalog ever grows past 30,000 tiles (it will not under
the v13 posture, but the architecture is recorded for
durability), the sitemap is split into per-group sitemaps under
`/sitemaps/<group>.xml` and a `/sitemap.xml` becomes a sitemap
index pointing at them. v13 ships a single sitemap; the split is
a future-proofing note.

### 10.3 Robots.txt

[../robots.txt](../robots.txt) continues to allow all crawlers.
The v13 file:

```
User-agent: *
Allow: /

Sitemap: https://roughlogic.com/sitemap.xml
```

No `Disallow` directive. No crawl-delay. No AI-specific allow/
disallow rules (the site has no robots-specific opinion about
AI crawlers; the content is freely usable per the existing
license, and an AI summary crawler that respects robots.txt is
welcome to read it).

### 10.4 Search Console submission

After deploy, the maintainer submits `sitemap.xml` to Google
Search Console and Bing Webmaster Tools. The verification method
is the DNS TXT record (preferred) or the HTML file at
`/google<hash>.html` / `/BingSiteAuth.xml` checked into the repo.
The verification file is a one-time bootstrap artifact, not
runtime instrumentation, and is exempt from the no-third-party
posture for the same reason `_headers` is. The file is the
smallest possible content; its presence is recorded in
[../docs/deployment.md](../docs/deployment.md).

## 11. Phase G - Title and description authoring rules

### 11.1 Verb-first descriptions

Descriptions begin with a verb that names the calculation.
"Compute", "Estimate", "Convert", "Look up", "Decode" are the
five admissible verbs. The verb is followed by the noun the
calculator returns and the inputs it accepts.

Bad: "A tool for electricians who need to find voltage drop."
Good: "Compute voltage drop across a single-phase or three-
phase circuit from conductor size, length, current, and
material."

The first 90 characters of a description should answer "what
does this tool compute and from what inputs" so that the SERP
snippet, which is truncated near 155 characters, carries the
answer rather than the introduction.

### 11.2 Profession-bearing titles

Every title carries the profession noun (Electricians, Plumbers,
HVAC, Fire-ground, Veterinary, EMS, Pilots, Real Estate,
Educators, Mechanics, Farmers, Truckers, Restoration, Stage,
Kitchen, Field, Accountants, Legal, Lab) in addition to the
calculation name. The profession noun is the search query the
user types when they do not know the formula name. The
calculation name is the query they type when they do.

### 11.3 No marketing language

Forbidden words in titles and descriptions: "best", "free"
(implicit on the site), "easy", "simple", "fast", "fastest",
"awesome", "ultimate", "powerful", "amazing", "cool", "killer",
"badass". The grep-checks lint adds these to the ngram banlist.

The site is free, easy, fast, and powerful. Saying so in a
title does not make the title more useful and reads as
marketing copy. The professional reading the SERP wants the
calculation name and the input list; that is what the title and
description deliver.

### 11.4 No keyword stuffing

Each title and each description names the calculation and the
profession exactly once. No "voltage drop calculator electrical
electrician ampacity wire". The grep-checks lint adds a
"repeated stem within title" check.

## 12. Phase H - Performance budget and Core Web Vitals

### 12.1 Shell-specific budgets

- LCP target: < 0.8 s on a simulated 4G connection (Cloudflare
  edge serves a < 6 KB gzipped HTML document with one CSS
  load).
- FCP target: < 0.6 s.
- TBT target: 0 ms (shells carry no JavaScript).
- CLS target: < 0.01 (shells have a deterministic layout with
  no dynamic content).
- Total payload per shell: < 35 KB after gzip (HTML + CSS, both
  cached after first load).

### 12.2 Home and group budgets unchanged

The home view's 100 KB-after-gzip budget continues unchanged.
The shells do not contribute to the home view's payload because
they are separate documents. The group shells have their own
12 KB budget (§8.3).

### 12.3 Lighthouse CI

`lighthouserc.json` is extended to run against (a) the home
URL, (b) a representative tile shell (e.g.,
`/tools/wire-ampacity/`), and (c) a representative group shell
(e.g., `/groups/electrical/`). The SEO score on all three
targets is asserted >= 100. The Performance, Accessibility,
Best Practices scores remain >= 95 across all three.

## 13. Phase I - Measurement and audit posture

### 13.1 What v13 measures

The site does not change its no-telemetry posture. The
measurement v13 records is aggregate and source-side:

- **Cloudflare edge metrics**: zero-cookie, aggregated,
  unchanged. The maintainer reads them as the v12 §4 §16
  cadence describes.
- **Google Search Console**: maintainer-side dashboard
  showing aggregate impressions, click-throughs, and search-
  query strings for the site. Search Console does not place a
  cookie on the visitor and does not send any identifier from
  the visitor to Google; it reports what the Google index has
  recorded about the site. Use of Search Console is
  exclusively maintainer-side and is the only third-party
  observation introduced by v13. It is permitted because (a)
  it observes the search engine, not the user, and (b) it does
  not require any runtime instrumentation in the site (only the
  verification artifact described in §10.4).
- **Bing Webmaster Tools**: same posture as Search Console.

The maintainer records the monthly aggregate impressions and
click-through counts in `docs/seo-log.md` (new) per release
cycle. The log entries are the same shape as the v6 §6 recheck
log: date, observed value, note.

### 13.2 What v13 does not do

- No analytics SDK (Google Analytics, Plausible, Fathom,
  Cloudflare Web Analytics beacons): none of these ship.
- No event tracking, no pageview beacons, no goal funnels.
- No remarketing tags, no conversion pixels.
- No A/B testing of title or description copy.
- No "schedule a call" call-to-action, no contact form, no
  newsletter signup.

The site is a public utility. Public utilities measure their
own health from the supply side (Cloudflare edge, Search
Console), not the demand side (analytics on the visitor's
browser).

## 14. Out of scope

The following are intentionally out of scope for v13. Each is
noted with the reason it stays out.

- **Server-side rendering at request time**: The shells are
  generated at build time and served as static files. No SSR,
  no edge workers, no runtime rendering. The simpler model is
  durable and matches the site's no-server posture.
- **Pre-rendering frameworks** (Next, Astro, SvelteKit,
  Eleventy, Hugo): not used. The shell generator is a small
  Node script using only built-ins, matching the build-data
  pipeline. No new dependency.
- **AMP**: not implemented. Google deprecated the AMP page-
  experience preference in 2021; AMP shells would be a
  maintenance cost with no SEO upside.
- **PWA install prompts**: the site already has a webmanifest
  and a service worker. v13 does not add an install prompt
  banner, an "add to home screen" CTA, or any PWA-specific
  call to action.
- **Multiple languages / hreflang**: the site is US-only per
  spec.md and spec-v12 §2. The shells are in English. The
  hreflang attribute is omitted (it would assert relationships
  to translations that do not exist).
- **Author bylines, author schema, persona pages**: the site
  is authored by one maintainer (footer attribution); the
  author surface is the GitHub repository. No per-tile author
  pages.
- **Rich-result types beyond HowTo / BreadcrumbList /
  WebApplication / CollectionPage / WebPage / ItemList**: the
  more exotic types (Recipe, Course, JobPosting) do not match
  the content. The lint enforces the closed allowlist.
- **Reviews or rating microdata**: the site has no review
  surface and emits no review schema. Fabricated reviews would
  violate Google's structured-data guidelines and the site's
  honesty posture both.
- **Backlink solicitation, guest posting, link exchanges**:
  not done. Backlinks accumulate naturally if they accumulate;
  the site does not solicit them.
- **Paid placement** (Google Ads, Bing Ads, sponsored
  placements on trade-press sites): never. Paid acquisition
  contradicts the "ever-free, ad-free" posture in both
  directions.

## 15. Build, test, deployment

### 15.1 Phase order

The phases ship in this order, gated as in v10 §F and v12 §14.1:

1. **Phase A (per-tile shells)** lands first because every
   later phase depends on the per-tile URL existing. Phase A is
   the shell generator + the per-tile assets + the SPA-side
   canonical emission.
2. **Phase B (per-tile metadata authoring)** lands next: each
   tile's title/description copy is reviewed against §11
   rules and committed.
3. **Phase C (structured data)** lands once the per-tile copy
   is stable.
4. **Phase D (group shells)** lands once tile shells are stable.
5. **Phase E (internal linking)** lands once tile + group
   shells exist.
6. **Phase F (sitemap)** lands once the URL set is final.
7. **Phase G (authoring lint)** lands incrementally with Phase
   B and is finalized before Phase F.
8. **Phase H (performance budget)** is enforced from Phase A
   forward.
9. **Phase I (measurement)** lands after first deploy.

### 15.2 Per-phase test requirements

- Phase A: unit test for the shell generator with a fixed
  TOOLS sample and a golden HTML fixture; e2e test that fetches
  `/tools/wire-ampacity/` against the dev server and asserts the
  shell renders with the expected h1, citation, and worked
  example.
- Phase B: a lint that asserts every TOOLS entry has a title
  and a description matching §11 rules.
- Phase C: a lint that parses every shell's JSON-LD block and
  validates the schema against the allowlist.
- Phase D: an e2e test for one group shell.
- Phase E: a lint that asserts every "Related tiles" link
  resolves to a real shell URL.
- Phase F: a lint that asserts every shell URL appears in the
  sitemap and every sitemap URL resolves to a real shell.
- Phase G: integrated into `scripts/grep-checks.mjs`.
- Phase H: extended `lighthouserc.json` per §12.3.
- Phase I: a manual checklist row in
  [docs/launch-checklist.md](../docs/launch-checklist.md).

### 15.3 Payload budgets

Caps:

- Per-tile shell: 6 KB gzipped, asserted by
  `scripts/check-shell-sizes.mjs`.
- Per-group shell: 12 KB gzipped.
- Aggregate `dist/` growth from v12 -> v13: under 2.5 MB
  uncompressed (385 tile shells * ~5 KB + 24 group shells *
  ~10 KB + sitemap).
- Home view: unchanged, < 100 KB after gzip, JS sub-budget
  unchanged.

### 15.4 Documentation

v13 adds these new docs:

- `docs/seo.md` (new): documents the per-tile shell model, the
  authoring rules (§11), the structured-data allowlist (§7),
  the link-graph posture (§9), and the no-telemetry
  measurement posture (§13).
- `docs/seo-log.md` (new): monthly aggregate
  impression/click-through log per §13.1.

v13 updates these existing docs:

- `README.md`: adds "Discoverable surface" subsection naming
  the shells and the sitemap.
- `docs/architecture.md`: adds the build-shells step to the
  build pipeline diagram.
- `docs/performance.md`: per-shell budgets per §12.1; the
  home-view budget is unchanged.
- `docs/threat-model.md`: confirms no new attack surface; the
  shells inherit the same CSP, the same `_headers`, and the
  same character-set discipline. The JSON-LD blocks are
  static, validated, and grep-checked.
- `docs/accessibility.md`: confirms shells pass axe-core with
  zero violations; the h1 / breadcrumb / list structure is
  semantically correct.
- `docs/deployment.md`: notes the Search Console / Bing
  Webmaster verification artifacts and the sitemap submission
  step.
- `docs/launch-checklist.md`: v13-specific gates per §16.
- `CHANGELOG.md`: one stanza per phase as it ships.

## 16. Launch checklist (v13-specific)

In addition to the prior-spec gates:

1. Every tile in the TOOLS array has a shell at
   `/tools/<id>/index.html` in `dist/`.
2. Every group has a shell at `/groups/<slug>/index.html` in
   `dist/`.
3. `sitemap.xml` enumerates every shell URL plus home and
   changelog; nothing more.
4. Every shell passes axe-core with zero violations.
5. Every shell passes the §11 lint (verb-first description,
   profession-bearing title, no banned marketing words, no
   keyword stuffing).
6. Every shell's JSON-LD block validates against the
   allowlist (§7.3).
7. `lighthouserc.json` asserts SEO score >= 100 on the home,
   one representative tile shell, and one representative
   group shell.
8. `npm run audit` passes including the v13 shell lints
   (`check-shell-sizes`, `check-jsonld`, `check-shell-links`).
9. The SPA emits a `<link rel="canonical">` to the
   corresponding shell URL when a tile is open.
10. `docs/seo.md` and `docs/seo-log.md` exist and are kept
    current.
11. Post-deploy: sitemap submitted to Google Search Console
    and Bing Webmaster Tools; verification artifacts checked
    in (DNS TXT preferred; HTML file fallback).

## 17. Operations and ongoing maintenance

### 17.1 New tile flow

When a new tile lands in a future spec:

1. The shell generator emits its shell automatically from the
   TOOLS entry + the per-tile meta + the citation.
2. The sitemap regenerates automatically.
3. The author writes the title and description per §11; the
   lint enforces the rules.
4. The post-build deploy reaches Cloudflare Pages, which
   serves the new shell at its path-based URL.
5. No manual sitemap submission is required for new tiles;
   Search Console rediscovers via the existing sitemap on its
   own cadence.

### 17.2 Tile retirement

When a tile is retired in a future spec (the v11 §1.1
retirement pattern):

1. The shell file is removed from `dist/`.
2. The shell URL is removed from the sitemap.
3. A 410 Gone response is preferred but not strictly required
   (Cloudflare Pages defaults to 404, which is acceptable for
   small retired surfaces).
4. The CHANGELOG records the retirement and the date.

### 17.3 SEO monitoring cadence

Per §13.1, the maintainer reads Search Console and Bing
Webmaster Tools at the same monthly cadence the v6 §6 recheck
discipline records. The monthly entry in `docs/seo-log.md`
captures aggregate impressions, click-throughs, and any
manual-action notice. Manual actions (the rare case where a
search engine flags a structured-data violation or a quality
issue) are addressed in the next release cycle.

### 17.4 What changes about future spec cadence

v13 does not change the spec cadence. v14 and beyond continue
to be feature specs (catalog expansions, hardening passes,
discipline tightening). The discoverability surface introduced
in v13 is durable: it is regenerated at every build, it adds
zero runtime cost, and it does not influence which tiles get
built.

## 18. Closing note

v11 made the site smaller. v12 made the site broader. v13 makes
the site findable. None of those is the work the site is built
to do; the work the site is built to do is answer the
professional's question in five seconds at no cost. But a calm,
fast, ad-free, account-free, ever-free reference for the trades
that nobody outside the founding circle has ever heard of is
half a public utility. v13 is the work that closes the half.

Build it the way the rest was built. One tile, one shell, one
canonical URL, one citation. Then get out of the search
engine's way and let the result page do its job.

The site is a public utility. Public utilities are findable.
v13 is the work that makes this one findable.
