# roughlogic.com Specification v763 -- Sample Size for a Target Margin of Error (calc-edu.js, Group Y, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-edu.js`** (Group Y),
> no new module, group, or dependency. Inherits spec.md through spec-v762.md. Explore sweep #16 (entry 1).
>
> **The gap, and the evidence for it.** The `confidence-interval` tile reports the margin of error a given sample size
> buys; the inverse is the everyday survey-planning question: **how many responses do I need for a target margin?**
> Solving the proportion Wald margin `E = z * sqrt(p(1-p)/n)` for `n` gives `n = z^2 * p(1-p) / E^2`, rounded up. The
> number this settles: a **+/- 3-point** poll at **95%** with the worst-case **p = 0.5** needs **1,068** responses.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`confidence-interval` sibling: the proportion, target margin, and sample size carry the sibling's dimensionless
treatment. It reuses the sibling's `Z_CRITICAL` lookup and its proportion margin relation, solved for `n`. The v18/v21
contract: a confidence level outside {80, 90, 95, 98, 99}, a planning proportion outside `[0, 1]`, or a target margin
that is not in `(0, 1)` returns `{ error }`. Citation discipline (v19/v22): the relation solved for the sample size,
`GOVERNANCE.education` matching the sibling; the note states that this is a Wald **planning** figure -- for small `p` or
small `n` a Wilson or Clopper-Pearson design is more exact, and a finite-population correction lowers `n` when the sample
is a large fraction of the population.

## 2. The tile

### 2.1 `sample-size-for-margin` -- Sample Size for a Target Margin of Error

```
inputs:
  proportion      dimensionless planning proportion p (0 to 1; 0.5 is worst case)
  target_moe      dimensionless target margin of error E (0 to 1)
  confidence_pct  dimensionless confidence level, one of 80/90/95/98/99

z           = Z_CRITICAL[confidence_pct]
exact_n     = z^2 * p * (1 - p) / E^2
required_n  = ceil(exact_n)   (>= 1)
```

**Pinned worked example.** p = 0.5, E = 0.03, 95% (z = 1.96):
`exact_n = 1.96^2 * 0.25 / 0.03^2 = 0.9604 / 0.0009 = 1067.1`, `required_n = ` **1068**. Feeding 1,068 back through
`confidence-interval` at the same p and confidence returns a margin of `~0.0300` (just meets the target); 1,067 misses it.
`p = 0.5` is the conservative default -- a skewed planning `p` (e.g. 0.2) needs fewer responses.

## 3. Wiring

A `tools-data.js` row (group `Y`, trades `["education", "lab"]`) placed beside `confidence-interval` (Group Y is not
exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (the relation solved for `n`,
`GOVERNANCE.education` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`sample-size-for-margin` -> `computeSampleSizeForMargin`); `scripts/related-tiles.mjs`
(-> `confidence-interval` / `statistics-quickread` / `bell-curve-zscore`); `data/search/aliases.json` (5
collision-checked question aliases: "sample size for a margin of error", "how many people do i need to survey", ...);
the calc-edu `EDU_RENDERERS` map entry via a hand-written renderer (a proportion field defaulted to 0.5, a target-margin
field, and a confidence select) and the id added to the calc-edu declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the example, the round-trip through `computeConfidenceInterval` across a p/E/confidence sweep (achieved margin
meets the target; `n` is the minimum), the tighter-margin-more-samples / higher-confidence-more-samples / p=0.5-is-max
monotonicity, and the error seams. The calc-edu.js gzip cap (raised to 37000 B in this spec) covers the addition. Verify
at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,211 -> 1,212.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 1,068 for a +/- 3-point
margin at 95% with p = 0.5).

## 5. Roadmap position

Pairs the forward `confidence-interval` tile (the margin a sample size buys) with its inverse (the sample size a target
margin needs), the two halves of the proportion Wald relation. Opens Explore sweep #16; the inverse-of-existing-tile vein
is now nearly drained, and further stats planning tiles stay evidence-driven.
