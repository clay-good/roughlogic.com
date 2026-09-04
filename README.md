# roughlogic

**Field math for the trades. Free, fast, no ads, no accounts, works offline.**

[roughlogic.com](https://roughlogic.com) is 1,804 small, single-purpose calculators for electricians, plumbers, HVAC techs, carpenters, restoration techs, firefighters, surveyors, and dozens of other trades. Everything runs in your browser. Every answer comes from a published formula and cites its source.

<p align="center">
  <img src="docs/img/home-mobile.png" width="240" alt="roughlogic home view on a phone: a headline, one line of description, a single search box, and four tappable example questions">
  &nbsp;
  <img src="docs/img/calculator-mobile.png" width="240" alt="The Ohm's Law calculator on a phone in the light theme: the answer at the top with a Copy button on each value, the labeled inputs that produced it below, and a collapsed Details, formula, and sources at the bottom">
  &nbsp;
  <img src="docs/img/calculator-dark.png" width="240" alt="The same Ohm's Law calculator in the dark theme">
</p>

## Use it

1. Type the job the way you'd say it, numbers and all: `voltage drop 120v 150 ft 12 awg 20a`. Search by name if you'd rather, or open **All calculators** for the full list by trade.
2. The calculator opens with your numbers already in it, each box captioned with the words they came from. If one value is missing, the page asks for it in words.
3. The answer sits at the top of the page, above the inputs that produced it, and updates as you type. There is no submit button. Tap **Copy** to take a value with you.

Open a calculator directly, without a question to fill it, and it starts empty -- each box captioned with the value the page's worked example uses (`e.g. 150`), so you can see the expected unit and magnitude before typing your own over it. A box whose value is a trade convention rather than a job number (30 °C ambient, a 0.61 orifice coefficient) opens holding that convention instead.

**Every calculator's page is the same short thing**, in this order. Nothing below the example is open until you ask for it:

| | |
|---|---|
| **Title + one line** | what it does |
| **Run the calculator** | opens it with the example already loaded |
| **Example** | the exact inputs and the exact answer |
| **Collapsed detail** | One *Details, formula, and sources* drop-down at the bottom of every page -- scope, formula, sources, and assumptions, all in the one place |

Here is that Example block, from [Voltage Drop](https://roughlogic.com/tools/voltage-drop/):

| You enter | | You get | |
|---|---|---|---|
| Phase | single | Voltage drop | 7.45 V |
| Material | copper | Percent drop | 3.11 % |
| AWG | 10 | | |
| Length one-way (ft) | 150 | | |
| Current (A) | 20 | | |
| Source voltage (V) | 240 | | |

Grounded in `VD = 2 · I · R · L`, with R from NEC Ch. 9 Table 8 -- the same line the page prints under *Details, formula, and sources*. Everything is named the way the calculator names it. The machine field names an AI agent passes (`length_ft`, `drop_V`) are listed inside the collapsed formula block, so the page stays readable and the contract stays published.

Your inputs live in the URL, so a calculator is bookmarkable and shareable with its numbers preloaded. After the first load it works with no signal. No account, no email, and no tracking. A user-initiated problem report is the one explicit exception to local-only data: it sends the displayed URL, inputs, results, and an optional 160-character note to a bounded Cloudflare D1 queue.

## Use it from an AI agent

The whole catalog is available to AI agents (Claude Code, Claude Desktop, Cursor) through a local, zero-dependency [MCP](https://modelcontextprotocol.io) server that runs on your machine over stdio. No hosting, no network. Five tools (`search_calculators`, `describe_calculator`, `run_calculator`, `answer_query`, `run_calculators`) read straight from this repo, so the agent surface can never drift from the site. See [mcp/README.md](mcp/README.md).

## What's in the catalog

21 trade benches. Search spans all of them at once; the letters are internal group codes (`I` is reserved).

| | Bench | | Bench |
|---|---|---|---|
| **A** | Electrical | **N** | Stage & Live Production |
| **B** | Plumbing & Gas | **O** | Kitchen & Food Service |
| **C** | HVAC | **P** | Field, Backcountry & SAR |
| **D** | Water Damage & Mold Restoration | **Q** | Historical Reference Data |
| **E** | Carpentry & Construction | **R** | Accounting, Tax & Small-Business |
| **F** | Fire-Ground Engineering | **T** | Bench Science & Laboratory Math |
| **G** | Cross-Trade Utilities | **X** | Real Estate |
| **H** | Knowledge References | **Y** | Educators & K-12 |
| **J** | Trucking & Logistics | **Z** | Rigging & Heavy Lift |
| **K** | Mechanic - Auto, Marine, Aviation | | |
| **L** | Agriculture & Forestry | | |
| **M** | Water & Wastewater Operations | | |

One calculator is one formula on one screen. (In the source and the gate names below, a calculator is called a *tile*.) Every formula is transcribed in [docs/derivations.md](docs/derivations.md) and every citation in [docs/data-sources.md](docs/data-sources.md).

## Why you can trust the answers

The hard part of a calculator catalog is not the arithmetic. It is proving, at scale, that every tile stays correct as the catalog grows. That is a build problem here: `npm run lint` runs 57 static gates before a change can land. Fifty-six of them run for anyone who clones this repository; the fifty-seventh, `check-ngrams`, compares text against a private hash list of licensed code spans that is deliberately not published, and skips with a message when the list is absent.

| Gate | What it guarantees |
|---|---|
| `check-dimensions` | all 2,059 exported calculator functions carry a machine-parsed `// dims:` annotation declaring each input's and the output's SI dimensions, and a malformed one fails the build. It checks the **declaration**, not the arithmetic against it -- verifying the expression would need a CAS, which this repo has no dependency on |
| `check-cross-validation` | every fixture's declared tolerance is inside its group's ceiling, or carries a written justification (1,731 checks) -- it polices how loose a check is allowed to be, not the numbers themselves |
| `cross-tile-invariants` (unit test) | tiles that share a computation agree to the floating-point floor, documented inverses round-trip, and monotonic relationships stay monotonic -- 401 assertions across the five shared-computation classes spec-v14 §10 names |
| `asked-phrasing` (unit test) | the phrasing step 1 above teaches -- "Type the job the way you'd say it" -- still reaches the right calculator. A tile that ranks first for its bare name must still rank first with a question wrapped around it. The ranking harness's three older ground truths are curated aliases, tile names and tile ids, and **not one of them carries a question word**, so until 2026-09-04 a tokenizer change that stopped stripping "how many" would have broken the primary documented path with every gate green. Every 24th tile, three phrasings each; `node scripts/measure-ranking.mjs --asked` sweeps all 1,804 |
| identity coverage (ranker) | a word matched only in a tile's prose description cannot outrank a tile the query names. Ranking sorts on how many query words a tile covers before it sorts on how well, and "anywhere" used to include the description -- so "how many sheets of plywood for a 24x40 floor" opened with **Compressed Gas Cylinder Storage Separation**, whose description happens to warn that "a sheet of plywood" is the wrong barrier and to mention "clear floor". Fixed 2026-09-04 and measured against all four harness ground truths: every rate unchanged, all 63 miss rows byte-identical. It also improves the no-alias fallback -- with the alias shards blocked, "asphalt tonnage 2400 sq ft 3 in deep" used to lead with a carpet takeoff and now leads with Asphalt Tonnage |
| `chip-routing` (unit test) | the four example questions on the home view route to a calculator instead of opening a disambiguation card, and the vague queries spec-v1343 exists for still ask. Read from `index.html`, so an edited chip is covered automatically. This contract was only checked by a browser spec that costs a full CI run to hear from, and a ranking change broke a chip in exactly that gap |
| `check-bounds` | a fuzzer sweeps each tile's input domain; no NaN/∞, monotonicity where required |
| `check-worked-examples` | every tile's example reproduces a reference number it names a source for -- a published worked example where the publisher prints one, and the project's own derivation where none exists. **408 of them are first-principles**: nobody publishes a worked example for Ohm's law or a footing area, so the derivation is the check |
| `check-example-parity` | the example a page prints is the example its calculator opens (1,673 tiles statically; the 131 that declare theirs inline are driven in a real browser by `test/integration/example-parity-runtime.test.js`, so the claim covers all 1,804) |
| `check-citation-coverage` | every tile names a real, dated source with all four required fields and no orphans. Freshness tracking is narrower: 1,379 tiles cite a source on a recheck calendar, and **425 cite a source no freshness tracker covers** |
| `check-derivation-coverage` | **72 formula families** are derived in full in [docs/derivations.md](docs/derivations.md), and every tile is named there. The gate asserts the naming, which the generated per-tile index satisfies -- it does not establish that a given tile's formula is among the 72 |
| `check-dead-inputs` | no rendered field is silently ignored by the compute function, across the 1,776 computes that destructure their inputs. Five take a named object parameter the scan cannot see into and are named in the gate's own output |
| `check-fixture-keys` / `check-guard-only-inputs` / `check-render-output-keys` | each of these parses source rather than running it, so each has a set it cannot see into: a fixture whose compute takes a rest parameter, a compute with a named object signature, a compute that returns a spread. All three now **name that set and fail when it grows** -- 31, 5 and 7 respectively. Before 2026-09-04 they printed the count in a green summary and nothing read it, so coverage could fall one tile at a time |
| `check-tile-contract` | every tile is registered, crash-free, and matches its declared I/O shape |
| `check-shell-mobile` | zero page-level horizontal scroll on **every** shell at 320 px portrait. Landscape and 200% text zoom run over a representative sample -- every group hub, the home shell and an evenly-strided slice of tool shells -- because all shells come from one template and the only per-tile variable is string length |
| `check-feedback-loop` | every current and future calculator retains the shared defensive D1 reporting path |
| `check-tile-registries` | the new-tile checklist names every registry that holds all 1,804 ids, and calls no partial one mandatory |
| `check-us-defaults` | no calculator opens metric-first: every input label, factory field spec **and output label** whose parenthetical carries a metric unit needs a reviewed allowlist entry, and every entry in that allowlist must waive at least one live finding -- a dead exemption fails the build. Output labels went unscanned until 2026-09-04. It is a label heuristic: it cannot judge whether a default *value* is sensible |
| `check-build-hermetic` | the build fetches nothing; every value in `data/` is an in-tree constant, reviewable in a diff, and no shipped string claims otherwise |
| `build-citation-strings` | the source stamp a tile prints is the one `docs/citation-discipline.md` documents, word for word |
| `check-community-health` | the files GitHub renders on the repo page exist, resolve, and parse (a malformed issue form fails silently otherwise) |
| `check-notice-variants` | the notice naming who governs each answer matches what `docs/notice-variants.md` says it is |

The monthly and weekly data-refresh jobs are the one lane those gates used to miss. A pull request opened by a workflow using `GITHUB_TOKEN` triggers no further workflow runs, so every refresh PR sat with a CI run that never executed and faced only `data:verify` and the unit tests -- not the manifest, citation-freshness, verified-on-ledger or provenance-stamp gates that exist for the data path specifically. Since 2026-09-04 both scheduled jobs run `npm run lint` and the base-TIP stamp check themselves, before opening the PR, and `check-ci-claims` fails if either step is dropped.

CI adds three jobs per push: `test` (lint + unit tests + data-integrity verification + the provenance-stamp check against what the push moved from), then `accessibility` (the axe-core sweep over every SPA route, plus the shell sweep that covers each static page shape) and `integration` (the rest of the Playwright suite, plus the built-shell gates) in parallel. The two split the suite by title rather than both running it, so the 1,897-test axe pass executes once per push, not twice; `npm run test:e2e` still runs everything locally. A fourth Lighthouse job was removed on 2026-08-23 over an unpatched advisory in `@lhci/cli`; see [docs/performance.md](docs/performance.md) for what gates performance in its place. At runtime, `integrity.js` re-verifies the SHA-256 of every data manifest against `data/integrity.json`, and each shard against the hash its own manifest records, before the data reaches a calculation; the read-only posture means the worst case is a visible warning, never silent corruption.

## How it's built

Calculator execution is a client-side, offline-first static site with no accounts or analytics. One isolated Cloudflare Worker accepts user-initiated problem reports into D1; Turnstile loads only after the report dialog opens, and static requests remain asset-first.

The browser loads `index.html` + `styles.css` + `app.js` (router, search, theme, URL-hash state), which dynamic-imports one of 57 per-group calculator modules (`calc-*.js`) on first open, which reads the sharded JSON in `data/`. A service worker (`sw.js`) caches the shell and data shards keyed to the build hash, so the site works offline after the first load. The 1,826 static shells are not precached -- that is not a precache -- so a shell URL opened offline redirects to the app at the root, carrying the tile as the hash, which is why a bookmarked `/tools/ohms-law/` opens Ohm's Law rather than a page whose relative stylesheet 404s.

At build time only (never in production), `build-data.mjs` emits the integrity-hashed data shards. It fetches nothing: every value it writes -- NIST constants, NOAA design temperatures, the NCEI WMM coefficients, FHFA loan limits, HUD fair-market rents, published bulletin tables -- is transcribed into an in-tree constant by a maintainer and reviewed in a diff, so what the build produces is a deterministic function of the repository and of nothing else. `check-build-hermetic` fails on any undeclared network call in the build or the lint chain, and on any shipped string that says a value was fetched or downloaded. Where a bundled value is modeled rather than transcribed -- the commodity price series is an anchor reading plus a shape, not the published monthly numbers -- the shard, the page and the citation all say so. And `build-shells.mjs` emits one zero-JS crawlable static shell per tile (1804) and per group, the catalog hub, the not-found page Cloudflare Pages serves for every unmatched path, plus a sitemap that carries 1827 URLs, each dated from a committed content-hash ledger rather than the build clock, so a page that has not changed does not claim it has.

The home payload gzips to well under the 100 KB budget. Opening a calculator dynamic-imports only that trade's module and only the data shards it needs. See [docs/architecture.md](docs/architecture.md) and [docs/seo.md](docs/seo.md).

## Develop

```bash
npm ci             # exact locked dev tooling; the site has zero runtime deps
npm run dev        # build, then serve only dist/ on loopback
npm run build      # emit dist/ (SPA + static shells + sitemap)
npm run lint       # the full static-gate chain (57 checks) -- 56 run without the private n-gram list
npm test           # unit tests (node --test)
npm run test:e2e   # Playwright integration suite (needs a browser)
```

The repo root holds the SPA entry (`index.html`, `styles.css`, `app.js`, `sw.js`), the `calc-*.js` modules, and shared UI helpers. `data/` holds sharded JSON with per-folder manifests and integrity hashes. `scripts/` holds build and gate tooling (never runs in production). `specs/` is the numbered specification history; `docs/` holds derivations, data sources, architecture, and the audit trail. See [docs/maintainer-quickstart.md](docs/maintainer-quickstart.md) and [docs/contributor-checklist.md](docs/contributor-checklist.md).

Patches welcome. [CONTRIBUTING.md](CONTRIBUTING.md) has the hard constraints (zero runtime dependencies, no network at build time, US standards only) and the one command that has to be green before review. A wrong answer is the most valuable thing you can report: there is an issue template for it that asks for the inputs and the published source that settles it.

## License

MIT. See [LICENSE](LICENSE).
