# roughlogic.com Specification v45 — Prerendered Shell Citation + Gate Activation

> **Implementation status: CLOSED 2026-06-11 (package stamped 0.43.0, a
> minor; catalog unchanged at 576).** v45 is a public-surface / SEO enhancement
> in the lineage of spec-v13 (the prerendered-shell model) and spec-v18 §6 (the
> shell mobile gate). It inherits everything from spec.md through spec-v44.md and
> changes none of the calculator math.
>
> v45 does two things, both about the **prerendered static shells** that
> spec-v13 stands up so the catalog's reference content is crawlable and readable
> without JavaScript:
>
> 1. **Enriches every tile shell with a "Formula and source" block** — the cited
>    formula and the source-stamp, prerendered from `CITATIONS`. Until now the
>    static shell carried the tile name, lead, related tiles, an Audience block,
>    and a Posture block, but **not the formula or the citation** — i.e. not the
>    actual reference content the prerender exists to expose (README §"Discoverable
>    surface": "the cited reference content of 576 tiles would otherwise be
>    invisible to general web search"). A reader landing on `/tools/ohms-law/`
>    from a search now sees `V = I * R` and its authority in static HTML.
> 2. **Wires the `check-shells` content gate into CI.** The gate (titles, meta
>    descriptions, canonical, Open Graph / Twitter, JSON-LD allowlist, gzip caps,
>    banned-word scan) existed since spec-v13 but was **never invoked by
>    `.github/workflows/ci.yml`** — only `check-shell-mobile` ran. v45 adds the
>    `npm run check:shells` step to the integration job (which already builds
>    `dist/`), so the entire shell content contract is now enforced on every push,
>    including the new formula/source assertion.
>
> **No new tiles, no new dependencies, no telemetry, no AI, US standards only.**
> No calculator output changes; the SPA is byte-for-byte unchanged.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. The finding

A README-accuracy audit found that README §"Discoverable surface" claimed each
tile shell carries "the inline notice, the source-stamp citation, a worked
example" — but the actual shell (and the spec-v13 shell model in `docs/seo.md`)
carried none of those. Two genuine gaps behind that drift:

- **The reference content was missing from the shells.** The prerender's stated
  purpose is to expose the cited reference content to crawlers; the shells exposed
  the tile name and editorial blocks but not the formula or the citation.
- **The shell content gate did not run in CI.** `scripts/check-shells.mjs` is a
  complete gate with a unit-test mirror, but `ci.yml` never called it, so the
  spec-v13 §5–§11 shell contract (JSON-LD allowlist, title/description caps, gzip
  budgets) was unenforced on push. A regression in any of those would have shipped
  silently.

## 2. The change

### 2.1 Shell enrichment (`scripts/build-shells.mjs`)

`build-shells.mjs` imports `CITATIONS` from `citations.js` and emits a new section
in each tile shell, placed after the "Run the calculator" link and before the
Audience block:

```html
<section class="shell-section" aria-label="Formula and source">
  <h2>Formula and source</h2>
  <p class="shell-formula">{escaped CITATIONS[id].formula}</p>
  <p class="shell-source">{escaped CITATIONS[id].edition}</p>
</section>
```

Both fields are HTML-escaped by the existing `escapeHtml`. Every tile has a
`CITATIONS` entry with a non-empty `formula` and `edition` (the v19/v22 coverage
gate guarantees it), so every tile shell carries the block. Group shells are
unchanged. The block is plain wrapping text, so it adds no horizontal-scroll risk
at 320 px, and it adds ~0.3–0.4 KB gzipped — the largest tile shell is ~2.3 KB of
the 6 KB cap, so the budget is untouched.

### 2.2 Gate (`scripts/check-shells.mjs`)

The per-tile-shell lint now also asserts the shell contains the
`aria-label="Formula and source"` section with both the `shell-formula` and
`shell-source` lines, and fails the build otherwise.

### 2.3 CI wiring (`.github/workflows/ci.yml`)

The integration job gains a `npm run check:shells` step after `npm run build`,
alongside the existing `check:shell-mobile` step, so the whole shell content
contract runs on every push.

## 3. As-landed verification

`npm run build` then `npm run check:shells` (576 tile + 24 group shells, all
within the title / description / JSON-LD / gzip contract, every tile shell
carrying the formula/source block); `npm run check:shell-mobile` (602 routes,
zero horizontal scroll at 320 px with the new text); `npm run lint`, `npm test`
(unchanged at 5,513), and `npm run data:verify` all green. A negative test
confirmed the new gate fails when the section is removed from a shell.

## 4. Roadmap position

v45 closes the prerender's reference-content gap and activates a dormant gate.
A natural follow-on, deferred here, is prerendering a **worked example** into each
shell as well (from `test/fixtures/worked-examples.json`) — higher value but more
involved, since not every tile has a fixture and the input/output formatting must
be generated as readable static text. The README claim has been corrected to
describe the shell as it is now (formula + source, Audience, related tiles,
Posture); a worked-example block would extend it later if pursued.
