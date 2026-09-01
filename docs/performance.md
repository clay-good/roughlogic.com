# Performance Budget

roughlogic.com targets the same performance budget as encryptalotta and sophiewell, applied from v1. These are design targets: the Lighthouse job that asserted them was removed on 2026-08-23 over a dependency advisory, and "How the budget is enforced" below lists what actually gates a push.

## Budget targets (design; Slow 4G in Chrome DevTools / Lighthouse mobile preset)

- First Contentful Paint (FCP) under 1.0 second
- Largest Contentful Paint (LCP) under 1.5 seconds
- Time to Interactive (TTI) under 1.5 seconds
- Total Blocking Time (TBT) under 100 milliseconds
- Cumulative Layout Shift (CLS) under 0.05
- Total transfer size under 100 KB for the home view
- Total transfer size under 250 KB for any utility view including its primary data shard

## Scores (design targets; not measured in CI since 2026-08-23, see below)

- Lighthouse Performance score >= 95
- Lighthouse Accessibility score >= 95
- Lighthouse Best Practices score >= 95
- Lighthouse SEO score >= 95

## How the budget is enforced

**Lighthouse CI no longer runs.** It was removed from `.github/workflows/ci.yml` on 2026-08-23 (commit 88e7ea7f) because `@lhci/cli`'s latest release still carries an unpatched high-severity archive-traversal advisory, and a build gate is not worth a known-vulnerable dependency in the pipeline. Nothing has measured a Lighthouse *score* since. The targets and scores listed above are the design budget, not a CI assertion; until 2026-08-29 this section said the build failed on them, which was not true after the removal. `lighthouserc.json` is kept so the assertions can be reinstated if the advisory clears.

What does gate performance today, on every push:

| gate | where | what fails the build |
| --- | --- | --- |
| `check-home-payload` | `npm run lint` | home-view total over 100 KB gzipped, or any per-asset sub-budget (HTML 20 KB / CSS 25 KB / JS 40 KB) |
| `check-module-sizes` | `npm run lint` | any `calc-*.js` or support lib over its recorded gzip cap |
| `check-shells` | integration job | any prerendered shell over its 6 KB / 68 KB gzip cap |
| `perf.test.js` | integration job | home-view FCP / LCP / TBT / CLS past the hard-fail tier |

`perf.test.js` measures under a harsher profile than the table above (Chrome's Slow-3G preset plus a 4x CPU throttle, not Slow 4G), so its numbers are deliberately looser, and it runs a documented three-tier policy: the spec-v10 §10.3 targets (FCP 1.5 s / LCP 2.5 s / TBT 200 ms / CLS 0.05) warn, a 10% drift against `test/perf-baseline.json` warns, and only egregious values (FCP 5 s / LCP 10 s / TBT 1,000 ms / CLS 0.25) fail. Since 2026-08-29 it also covers the prerendered shells, restoring the surface Lighthouse used to check: the two tile shells `lighthouserc.json` still names, plus the two heaviest static documents the site serves, which are also the two that matter most to a stranger arriving from a search engine. `/groups/construction/` is the top landing page and the largest group index (45,762 B gzipped, 66% of the check-shells cap, 2.2x the `/groups/electrical/` this list originally named), and `/tools/` is the catalog hub the one-box program is gated on (47,824 B), which nothing measured at all. Size costs little on these: construction paints 3% slower than electrical for 2.2x the bytes, because the 400 ms RTT dominates a single static document. Their thresholds are measured rather than inherited, because that config ran a desktop preset on a 1.6 Mbit link while this file runs Slow-3G with a 4x CPU throttle.

Two limits worth knowing. The shell tests assert paint and layout shift but **not** total blocking time: seeding a 600 ms blocking script into a built shell left TBT at 0, because a parser-blocking script that runs before the observer registers is never attributed as a long task, so that assertion would have passed on a broken page. Script on a shell is `check-shells`' rule instead, and it does fail on that seed. The SPA's own tile views -- the hash routes a reader reaches from search and from a shared link -- are covered too, and adding that coverage found a defect: a tile view builds in two passes, so the footer sat high and got shoved down when the calculator arrived, for a CLS of 0.173 to 0.247 against a 0.05 budget (0.25 is Core Web Vitals' "poor" line). Reserving the page height for the duration of a tool route took those to 0.056 / 0.060 / 0.101. The CLS thresholds sit between the two ranges on purpose: a hard tier at 0.25 would have sat above the defect it exists to catch.

`scripts/check-ci-claims.mjs` pins the job list in README.md to the jobs `ci.yml` actually defines, so a job removed for a good reason cannot leave a claim behind again.

The home-view payload budget (100 KB after gzip) is enforced separately by `scripts/check-home-payload.mjs`, wired into `npm run lint`. The script gzips index.html, styles.css, app.js, integrity.js, theme.js, and routing.js (the files actually loaded on first paint; calculator modules and support libs are dynamic-imported on first tool open) and fails the build if the total exceeds 102400 bytes. As of 2026-08-30 (1,804 tiles) the home-view payload is **47,307 B** (46.2% of budget). Per spec-v10 §H.2 the per-asset sub-budgets are HTML 20 KB / CSS 25 KB / JS 40 KB; the JS sub-budget is the tightest at **68.3%** of cap (27,993 B of 40,960 B).

Two §H.2 extractions produced that headroom, and they are the same move made twice. The first pulled the ~30 KB `TOOLS` catalog registry out of `app.js` into a lazy-loaded `tools-data.js`. The second, on 2026-08-27, pulled the `TOOL_MODULES` tile-id-to-renderer table into a lazy-loaded `tool-modules.js`: it had reached **24.4 KB gzipped, 46% of the whole JS sub-budget**, for a table the home view never reads, and it grew by one id per tile. `app.js` gzipped fell 47,085 → 22,878 B. Between May and August the JS sub-budget had been raised five times (40 → 42 → 45 → 47 → 49 → 52 KB) to accommodate that growth; the extraction let it be **restored to its specified 40 KB**. The structural result is that the home view no longer pays for catalog growth at all -- a new tile adds a row to `tools-data.js` and an id to `tool-modules.js`, neither of which is in the first-paint payload.

## The catalog registry is the next real budget problem

`tools-data.js` holds one row per tile and is **1,090,548 B raw / 397,907 B gzipped**, at 92.5% of the 430,000 B cap in `check-module-sizes`. That cap has been raised at nearly every expansion band (most recently 400,000 to 430,000 one band earlier), and at roughly 220 gzipped bytes per tile another ~145 tiles reaches it again. Raising it once more is the cheapest move available and it is the reason the file is this size.

Measured composition, 2026-08-29:

| field | bytes | share |
| --- | --- | --- |
| `desc` | 861,836 | 79.0% |
| `name` | 73,020 | 6.7% |
| `id` | 37,676 | 3.5% |
| `trades` | 36,836 | 3.4% |
| `group` | 5,412 | 0.5% |

Descriptions are four fifths of it. Without them the registry gzips to **47,224 B** rather than 397,907 B.

Two paths pay that today, and neither needs all of it:

- **A deep link** (`/index.html#<id>`, what search results and shared links point at) loads the whole catalog before it can validate the id and read one row's name and description. It needs 1 of 1,804.
- **The first search keystroke** loads it too, because `toolMatches` searches `name + " " + desc`. This one genuinely wants every description.

So the deep-link case is a clean win, and the search case turns out not to be the tradeoff it first looked like. Search only degrades if it ranks *before* the descriptions arrive; if it awaits every description shard exactly as it awaits `tools-data.js` today, results are identical and the bytes are the same, fetched in parallel instead of serially.

Measured shapes for a split, 2026-08-29:

| | gzipped |
| --- | --- |
| index (`id` + `group` + `trades`, every tile) | 19,422 B |
| description shard, median group | 11,198 B |
| description shard, largest group (E, 479 tiles) | 107,407 B |
| **deep link today** | **397,907 B** |
| deep link, median group | 30,620 B (92% smaller) |
| deep link, largest group | 126,829 B (68% smaller) |
| first search keystroke | 409,519 B across 22 requests (3% more, in parallel) |

Two constraints any split has to respect, both found by looking rather than by reasoning:

- **`TOOLS` array order is load-bearing.** `constant-notes.js` decodes a bitmap positionally (`TOOLS.filter((t, i) => bit i)`), so 1,053 tiles' constant notes are keyed to catalog *position*, not id. An index shard preserves that; a per-group-only split would not. Reordering two tiles with different bits does flip the notes onto the wrong tiles, and `extract-constant-notes --check` correctly fails when it happens (verified by seeding exactly that swap; a swap between two tiles with the *same* bit correctly passes, because nothing changed).
- The largest group shard is 107 KB, so group E would want sub-shards the way `data/fields` already splits `e-1` / `e-2`.

A third shape, measured 2026-08-30, that the group-shard analysis above did not try: **keep one catalog and put only the LEAD SENTENCE in it**, moving the rest of each description to the lazily-fetched shards.

Measured by rebuilding the `TOOLS` array as a JS module literal in the same
shape the file ships (bare keys, one row per line) and gzipping it, so the rows
compare against each other. The same method rebuilds the file as it stands at
392,828 B against the 397,907 B it actually ships, the difference being the
comments and group headers; the 47,224 B quoted above was measured another way
and is not directly comparable to the third row here.

| | gzipped | deep link vs today |
| --- | --- | --- |
| catalog as it ships (full `desc`) | 397,907 B | -- |
| catalog carrying `leadSentence(desc)` only | **113,612 B** | 71% smaller |
| catalog carrying no description at all | 52,351 B | 87% smaller |
| rest-of-description map, all tiles | 302,631 B | fetched lazily |

What makes the middle row interesting is what a deep link does *after* the fetch. A tile view needs three things out of `desc`: the meta description, the lead under the title, and the Details body. The first two are the lead sentence. So a lead-carrying catalog renders the tile **in one pass with no second request** -- which matters because the 2026-08-29 CLS fix exists to stop tile routes rendering in two stages, and a split that puts the lead behind a second fetch reintroduces exactly that. The no-description row is 2.2x smaller again but pays a second blocking hop before the page can show its own lead.

It also sidesteps the constraint above for free: it is the same array in the same order with fewer fields per row, so the `constant-notes.js` positional bitmap is untouched.

Sharding the rest by the first letter of the id gives 24 shards with the largest at 53,574 B -- half the largest per-group shard, because group E's 479 tiles spread across the alphabet. Total bytes for a search that awaits everything: 415,681 B against 397,907 today, 4.5% more, in parallel.

The blocker is blast radius, not the search tradeoff: this rewrites how the browser loads the catalog on both the routing and search paths. The numbers and constraints are here so the decision is one step away. **It remains a product decision and is deliberately not taken here** -- what is written down is the measurement, so whoever takes it is choosing between shapes rather than guessing.

## Page weight strategy

- Single index.html, single styles.css, single app.js. No bundler in the runtime path.
- Calculator modules (57 `calc-*.js` files; the list is `ls calc-*.js`, and check-readme-counts pins the count wherever a doc quotes it -- this line said 24 until 2026-08-29, and enumerated three modules that spec-v107 had already retired) and their support libs (pure-math.js, hash-state.js, data-stamp.js, clipboard.js, ui-fields.js, ui-validity.js, tile-meta.js, limitation-banner.js, search-discovery.js, context-band.js, cost-output.js, v5-platform.js, standard-sizes.js, citations.js) are loaded via dynamic ES module imports inside renderToolView, never eagerly from the home view. Each module loads at most once (cached by promise + by the service worker) on first navigation to a tool that uses it. The home-view payload is index.html + styles.css + app.js + theme.js + integrity.js + routing.js. Two registries that used to sit inside `app.js` are now lazy-loaded and are therefore outside it: the `TOOLS` catalog registry in `tools-data.js`, dynamic-imported on the first search keystroke or tile route, and the `TOOL_MODULES` tile-id-to-renderer table in `tool-modules.js`, dynamic-imported on the first tile open by `loadRenderer()`. As of 2026-08-29 the payload gzips to **47,307 B** (46.2% of the 100 KB budget).
- Data shards under data/ load on demand only, never eagerly. The data pipeline currently produces **119 integrity-checked entries across 19 dataset folders** (as of 2026-08-29; `npm run data:verify` prints the live count) (accounting, construction, cross, crosswalks, electrical, field, fields, fire, historical, hvac, lab, legal, physical-constants, plumbing, realestate, restoration, search, summaries, trucking); the manifest hashes (one per folder) are fetched at boot, and each shard is checked against its manifest's recorded hash when it is actually fetched.
- The Manual J cooling and heating estimators and the duct sizing calculator run inside a Web Worker so they do not contribute to main-thread blocking time.

## v12 per-module budgets (spec-v12 §14.3)

Each calc-* module has a `gzip` cap enforced by `scripts/check-module-sizes.mjs`. The five v12 group modules were (the Veterinary, EMS, and Aviation benches were later retired in spec-v107, so `calc-vet.js` / `calc-ems.js` / `calc-aviation.js` no longer exist; the figures below are the v12-era snapshot):

- `calc-vet.js`: 41,000 B cap (current ~33.6 KB gzipped at 83.8 %; covers all 25 Group U tiles plus bundled vaccine, heartworm, and toxicity tables).
- `calc-ems.js`: 39,000 B cap (current ~32.2 KB gzipped at 84.5 %; covers all 27 Group V tiles plus bundled pediatric vitals ranges and the START / JumpSTART decision trees).
- `calc-aviation.js`: 39,000 B cap (current ~33.2 KB gzipped at 87.2 %; covers all 23 Group W tiles; the METAR / TAF decoder is the largest single piece at ~6 KB).
- `calc-realestate.js`: 41,000 B cap (current ~35.1 KB gzipped at 87.6 %; covers all 24 Group X tiles).
- `calc-edu.js`: 35,000 B cap (current ~30.8 KB gzipped at 90.2 %, WARN; covers all 22 Group Y tiles).

The §14.3 starter estimates (vet 22 KB / ems 25 KB / aviation 18 KB / realestate 12 KB / edu 14 KB) were planning targets; the as-shipped modules ran over those after the full §5-§9 inventories landed (the largest overruns are aviation +6 KB and realestate +7 KB, both driven by data-shard bundling, not by code growth). Caps were lifted to the actuals plus headroom; the home-view payload budget is unaffected because every group module is dynamic-imported on first tool open.

## v13 per-shell budgets (spec-v13 §12.1)

Spec-v13 added a build-time prerender step that emits one static HTML
shell per tile (`/tools/<id>/index.html`, 1,804 shells) and one per
group (`/groups/<slug>/index.html`, 21 shells), plus the catalog hub at
`/tools/` and the not-found page at `/404.html`. The shells are separate
documents from the SPA home view, served as static files by Cloudflare
Pages and reached primarily by search crawlers and direct deep links.

Per-shell targets:

- LCP under 0.8 s on simulated 4G (a single < 6 KB gzipped HTML document
  with one cached CSS load).
- FCP under 0.6 s.
- TBT 0 ms (shells carry zero JavaScript; the "Run the calculator" link
  is a plain anchor to the SPA hash route).
- CLS under 0.01 (shells render with a deterministic layout and no
  dynamic content).

Payload caps enforced by [../scripts/check-shells.mjs](../scripts/check-shells.mjs):

- Tile shell: 6,144 B gzipped.
- Group shell: 69,632 B gzipped. This section said 12 KB until
  2026-09-01, contradicting the table at the top of this file: the cap
  was raised when the catalog outgrew it, and only one of the two places
  that state it moved. The catalog hub and the not-found page are linted
  under the group cap.

Live measurements 2026-09-01, from the built `dist/`: **tile shells
2,476 B gzipped at the median and 3,779 B at the largest**
(`carburetor-altitude-jetting`); **group shells 5,249 B at the median
and 45,762 B at the largest** (`/groups/construction/`, which carries
479 tile rows). Both under cap, and both larger than the v13-close
figures this section used to quote -- tile shells carry the worked
example, the citation, and since 2026-08-31 a print-only copy of the
proof, and group hubs carry every sibling hub.
Aggregate `dist/` growth from v12 → v13 is roughly 2.5 MB uncompressed
(385 tile shells + 24 group shells + sitemap expansion). The
`scripts/build-shells.mjs` step is build-time only and does not
contribute to the home-view payload; the home view's 100 KB-after-gzip
budget is unchanged.

[../lighthouserc.json](../lighthouserc.json) audits the home URL, five
SPA hash URLs, two tile shells (`wire-ampacity`, `friction-loss`), and
one group shell (`electrical`). The Performance / Accessibility / Best
Practices scores remain ≥ 95 across all targets; the SEO score is
asserted ≥ 100 on the shell URLs per spec-v13 §12.3.

## Periodic review

Because no CI job measures a Lighthouse score any more, the score check is a manual step: the maintainer runs Lighthouse against the live site after every release, from the browser's own DevTools panel rather than the `@lhci/cli` package the pipeline dropped. If the budget is at risk, options in priority order:

1. Reduce the JS shipped on the home view (lazy-load more calculator modules behind dynamic import).
2. Pre-compress data shards and serve from same-origin cache.
3. Trim unused data fields in shards.
