# roughlogic

**Field math for the trades. Free, fast, no ads, no accounts, works offline.**

[roughlogic.com](https://roughlogic.com) is 1709 small, single-purpose calculators for electricians, plumbers, HVAC techs, carpenters, restoration techs, firefighters, surveyors, and dozens of other trades. Everything runs in your browser. Every answer comes from a published formula and cites its source.

<p align="center">
  <img src="docs/img/home-mobile.png" width="240" alt="roughlogic home view on a phone: a headline, a one-paragraph description, a single search bar, and a browse-by-trade index">
  &nbsp;
  <img src="docs/img/calculator-mobile.png" width="240" alt="The Ohm's Law calculator on a phone in the light theme, with labeled numeric inputs and live computed outputs, each with a Copy button">
  &nbsp;
  <img src="docs/img/calculator-dark.png" width="240" alt="The same Ohm's Law calculator in the dark theme">
</p>

## Use it

1. Search for what you need, or browse by trade.
2. Type your numbers. The answer updates as you type. There is no submit button.
3. Tap **Copy** to take a value with you.

Every field shows an example value as its placeholder, so you can see the expected unit and magnitude before you type over it.

**Every calculator's page is the same four things**, in this order:

| | |
|---|---|
| **Title + one line** | what it does |
| **Run the calculator** | opens it with the example already loaded |
| **Example** | the exact inputs and the exact answer |
| **Two collapsed blocks** | the formula, source, and assumptions; and the scope and limits |

Here is that Example block, from [Voltage Drop](https://roughlogic.com/tools/voltage-drop/):

| You enter | | You get | |
|---|---|---|---|
| Phase | single | `drop_V` | 7.45 |
| Material | copper | `percent` | 3.1 |
| AWG | 10 | | |
| Length one-way (ft) `length_ft` | 150 | | |
| Current (A) | 20 | | |
| Source voltage (V) | 240 | | |

Grounded in `Vd = 2 · K · I · L / CM`, NEC Ch. 9 conductor properties. Inputs are named the way the calculator names them, with the machine field name alongside when it differs; that name is what an AI agent passes.

Your inputs live in the URL, so a calculator is bookmarkable and shareable with its numbers preloaded. After the first load it works with no signal. No account, no email, no tracking, ever.

## Use it from an AI agent

The whole catalog is available to AI agents (Claude Code, Claude Desktop, Cursor) through a local, zero-dependency [MCP](https://modelcontextprotocol.io) server that runs on your machine over stdio. No hosting, no network. Four tools (`search_calculators`, `describe_calculator`, `run_calculator`, `run_calculators`) read straight from this repo, so the agent surface can never drift from the site. See [mcp/README.md](mcp/README.md).

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

The hard part of a calculator catalog is not the arithmetic. It is proving, at scale, that every tile stays correct as the catalog grows. That is a build problem here: `npm run lint` runs more than 30 static gates before a change can land.

| Gate | What it guarantees |
|---|---|
| `check-dimensions` | every formula is dimensionally consistent |
| `check-cross-validation` | independent tiles computing the same quantity agree numerically |
| `check-bounds` | a fuzzer sweeps each tile's input domain; no NaN/∞, monotonicity where required |
| `check-worked-examples` | each tile's example reproduces a publisher-verified reference number |
| `check-citation-coverage` | every tile names a real, dated source, freshness-tracked |
| `check-derivation-coverage` | every formula has a written derivation |
| `check-dead-inputs` | no rendered field is silently ignored by the compute function |
| `check-tile-contract` | every tile is registered, crash-free, and matches its declared I/O shape |
| `check-shell-mobile` | zero horizontal scroll on every page at 320 px and 200% text zoom |

CI adds four parallel jobs per push: lint + unit tests + data-integrity verification, Lighthouse (median of 3), axe-core accessibility at 320 px, and the full Playwright suite on Chromium and WebKit. At runtime, `integrity.js` re-verifies the SHA-256 of every data manifest against `data/integrity.json`; the read-only posture means the worst case is a visible warning, never silent corruption.

## How it's built

A 100% client-side static site. No server, no database, no accounts, no analytics, no runtime third-party dependency.

The browser loads `index.html` + `styles.css` + `app.js` (router, search, theme, URL-hash state), which dynamic-imports one of 57 per-group calculator modules (`calc-*.js`) on first open, which reads the sharded JSON in `data/`. A service worker (`sw.js`) caches the shell and data shards keyed to the build hash, so the site works offline after the first load.

At build time only (never in production), `build-data.mjs` refreshes the integrity-hashed data shards from NIST, NOAA, NCEI WMM, FHFA, HUD, and published bulletins, and `build-shells.mjs` emits one zero-JS crawlable static shell per tile (1709) and per group, plus a sitemap that carries 1731 URLs.

The home payload gzips to well under the 100 KB budget. Opening a calculator dynamic-imports only that trade's module and only the data shards it needs. See [docs/architecture.md](docs/architecture.md) and [docs/seo.md](docs/seo.md).

## Develop

```bash
npm install        # dev tooling only; the site itself has zero runtime deps
npm run dev        # serve the SPA locally
npm run build      # emit dist/ (SPA + static shells + sitemap)
npm run lint       # the full static-gate chain (30+ checks)
npm test           # unit tests (node --test)
npm run test:e2e   # Playwright integration suite (needs a browser)
```

The repo root holds the SPA entry (`index.html`, `styles.css`, `app.js`, `sw.js`), the `calc-*.js` modules, and shared UI helpers. `data/` holds sharded JSON with per-folder manifests and integrity hashes. `scripts/` holds build and gate tooling (never runs in production). `specs/` is the numbered specification history; `docs/` holds derivations, data sources, architecture, and the audit trail. See [docs/maintainer-quickstart.md](docs/maintainer-quickstart.md) and [docs/contributor-checklist.md](docs/contributor-checklist.md).

## License

MIT. See [LICENSE](LICENSE).
