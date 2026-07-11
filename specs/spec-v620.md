# roughlogic.com Specification v620 -- Digester Volatile-Acid to Alkalinity Ratio (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`**
> (Group M, water/wastewater treatment bench); no new module, group, or dependency. Inherits spec.md through
> spec-v619.md.
>
> **The gap, and the evidence for it.** Spec-v573 (`digester-vs-loading`) names this tile as a deliberate follow-on:
> "an alkalinity-to-volatile-acid ratio companion," and the loading tile's own note points straight at it -- an
> overloaded digester sours "as the acid-formers outrun the methane-formers and the pH and alkalinity crash." The
> loading tile tells the operator the digester *could* sour from too much feed; this tile reads the two lab numbers
> that say whether it *is* souring, days before the pH moves. The volatile-acid (VA, as acetic acid) to alkalinity
> (as CaCO3) ratio is the standard early-warning index of anaerobic-digester stability (WEF MOP; EPA operator
> training): a healthy digester sits below ~0.1, an operator starts corrective action (cut the feed, add
> alkalinity) around 0.25-0.35, and above ~0.4 the digester is going sour. The number that surprises new operators:
> pH barely moves until the ratio is already past 0.4 -- the bicarbonate buffer holds the pH steady right up until
> it is consumed, so the pH meter is the *last* indicator to flag the upset, not the first. The tile takes the two
> titrations, returns the ratio, and names the stability band.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The volatile acids
and alkalinity are concentrations carried as `dimensionless` (mg/L, matching the pattern the water tiles use for
mg/L quantities); the ratio and the alkalinity buffer margin are `dimensionless`. The v18/v21 contract: any
non-finite input, a non-positive alkalinity, or a negative volatile-acid concentration returns `{ error }` (a
volatile-acid reading of 0 is valid -- a very clean digester -- and gives a ratio of 0). Citation discipline
(v19/v22): `GOVERNANCE.general` over the VA/alkalinity stability ratio by name (WEF Manual of Practice / EPA
anaerobic-digester operator practice, matching the `digester-vs-loading` sibling); `editionNote` prints
`ratio = volatile_acids / alkalinity` (both to a common CaCO3 basis), names the bands (`< 0.1` stable, `0.1-0.25`
acceptable, `0.25-0.4` corrective action, `> 0.4` souring), and states that **the pH is a lagging indicator -- the
bicarbonate buffer holds the pH steady until the alkalinity is consumed, so the ratio flags the upset days before
the pH moves -- both readings must be to the same CaCO3 basis, and the digester monitoring and the operator
govern** -- an operating aid, not a control setpoint.

## 2. The tile

### 2.1 `va-alkalinity-ratio` -- The Early-Warning Index the pH Meter Misses

```
inputs:
  volatile_acids_mgl   mg/L   volatile acids as acetic acid (or as CaCO3)
  alkalinity_mgl       mg/L   total (bicarbonate) alkalinity as CaCO3

ratio        = volatile_acids_mgl / alkalinity_mgl              [-]
band         = ratio < 0.1  ? stable
             : ratio <= 0.25 ? acceptable
             : ratio <= 0.4  ? corrective action
             : souring
buffer_margin = alkalinity_mgl - volatile_acids_mgl            [mg/L]   (bicarbonate not yet consumed)
```

**Pinned worked example (a healthy digester).** VA 180 mg/L, alkalinity 2,400 mg/L: `ratio = 180 / 2400 = ` **0.075**
-- below 0.1, **stable**, with a 2,220 mg/L buffer margin. **Cross-check (the corrective-action band).** VA 900
mg/L, alkalinity 3,000 mg/L: `ratio = 0.30`, in the **corrective-action** band -- the operator cuts the feed and
adds alkalinity now, while the pH (still buffered) reads normal. A digester at VA 2,000 / alkalinity 2,500
(`ratio = 0.8`) is well into **souring**: the buffer is nearly gone and the pH is about to fall off a cliff.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["wastewater"]`, placed INSIDE the `// Group M: Water` .. `// Group N`
comment block beside `digester-vs-loading` -- the `citations.test.js` **Group M audit count bumps 30 -> 31**); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`va-alkalinity-ratio` ->
`computeVaAlkalinityRatio` in `../../calc-treatment.js`); `scripts/related-tiles.mjs` (-> `digester-vs-loading` /
`digester-gas-production` / `population-equivalent`); `data/search/aliases.json` ("volatile acid alkalinity ratio",
"digester stability ratio", "va alk ratio", "digester souring", plus question rows);
`TREATMENT_RENDERERS["va-alkalinity-ratio"]` via the module's `_rPool` factory (mirroring `digester-vs-loading`)
and the id added to the calc-treatment declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, each band
boundary (0.1 / 0.25 / 0.4), the zero-VA clean case, and the error seams (non-finite, non-positive alkalinity,
negative VA). The calc-treatment.js gzip cap (21000) is expected to hold (verify at build). Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block, the Group M audit count bump); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (the
pinned example -> 0.075, stable).

## 5. Roadmap position

Completes the digester-operations cluster spec-v573 opened: `digester-vs-loading` (is the feed too much),
`digester-gas-production` (what the digestion yields), and this tile (is the digester actually stable). No further
digester follow-on is named; further Group M growth stays evidence-driven.
