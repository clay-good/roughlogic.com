# roughlogic.com Specification v399 -- Tolerance Stack-Up: Worst-Case and RSS (calc-shop.js, Group G, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.140.0; proposed 2026-07-03). First tile of a fabrication shop-math trio (v399 tolerance stack -> v400 cone flat
> pattern -> v401 spur-gear geometry). The catalog has layout geometry (`bolt-circle`, `circular-arc`, `rolled-blank`) but
> nothing that stacks the tolerances on a chain of dimensions to predict the assembly gap -- the number that decides whether
> parts fit.**
> In-scope catalog expansion under the spec-v106 trades-only charter. When several toleranced dimensions add up across an
> assembly, the accumulated variation is found two ways: the worst-case sum `tol_wc = sum(|tol_i|)` (every part at its
> extreme, guaranteed fit) and the statistical root-sum-square `tol_rss = sqrt(sum(tol_i^2))` (realistic when parts vary
> independently). The nominal gap plus or minus each is the fit prediction. No tile does dimensional stack-up. This adds the
> tolerance tile to the existing **`calc-shop.js`** module (Group G); no new group, trade, or dependency. Inherits spec.md
> through spec-v398.md.
>
> **The gap, and the evidence for it.** A chain of three dimensions each held to `+/-0.005 in` stacks to a worst-case
> `tol_wc = 0.005 + 0.005 + 0.005 = +/-0.015 in`, but the statistical `tol_rss = sqrt(3 * 0.005^2) = +/-0.00866 in` -- the
> RSS is about `58%` of the worst case, which is why designers who assume worst-case on a long chain over-tighten every part.
> The tile reports both against the nominal gap so a fabricator can choose the honest one. No tile does this; a shop had to
> add tolerances by hand and never saw the statistical number.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The nominal gap and the
individual tolerances are lengths (in); the count is dimensionless; the worst-case and RSS accumulations are lengths (in).
The v18/v21 contract: any non-finite input, or a negative tolerance, returns `{ error }`; tolerances are entered as
equal-bilateral half-widths (a note covers unequal limits), and the tile reports the worst-case accumulation, the RSS
accumulation, and the resulting min/max gap for each. Citation discipline (v19/v22): `GOVERNANCE.general` over dimensional
tolerance stack-up by name; `editionNote` names **the ASME Y14.5 dimensioning context, the worst-case sum
`tol_wc = sum(|tol_i|)`, the statistical `tol_rss = sqrt(sum(tol_i^2))` (valid for independent, centered, capable
processes), and the min/max assembly gap as nominal plus or minus the accumulation**, and states that **this returns both
the guaranteed (worst-case) and the statistical (RSS) fit, that RSS assumes independent centered distributions with adequate
process capability, and that it is an engineering aid, not a substitute for a full GD&T tolerance analysis**.

## 2. The tile

### 2.1 `tolerance-stack-rss` -- Tolerance Stack-Up: Worst-Case and RSS

```
inputs:
  nominal_gap_in   in   nominal (mean) assembly gap
  tol1_in ..       in   bilateral tolerance half-widths of each dimension in the chain

tol_wc  = sum( |tol_i| )
tol_rss = sqrt( sum( tol_i^2 ) )
gap_wc  = nominal_gap_in +/- tol_wc
gap_rss = nominal_gap_in +/- tol_rss
```

**Pinned worked example (three dimensions at +/-0.005 in).** `tol_wc = 0.005*3 = +/-0.015 in`;
`tol_rss = sqrt(3*0.005^2) = +/-0.00866 in`. On a nominal `0.020 in` gap the worst-case fit is `0.005 to 0.035 in` and the
RSS fit is `0.0113 to 0.0287 in`. **Cross-check (RSS shrinks as the chain grows).** Add a fourth `+/-0.005` dimension and
worst-case rises to `+/-0.020` while RSS grows only to `+/-0.010` -- the statistical benefit widens with more parts. A
negative tolerance takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `G`, trades `["machinist", "fabrication"]`, beside `rolled-blank`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, ASME Y14.5 tolerance stack-up, `editionNote` naming the worst-case and
RSS relations, the independence assumption, and the min/max gap); `test/fixtures/worked-examples.json` (the three-dimension
example + the four-dimension cross-check); `test/fixtures/compute-map.js` (`tolerance-stack-rss` ->
`computeToleranceStackRss` in `../../calc-shop.js`); `scripts/related-tiles.mjs` (-> `rolled-blank` / `sine-bar` /
`decimal-to-fraction` / `cone-flat-pattern`); `data/search/aliases.json` ("tolerance stack", "tolerance stackup", "worst
case tolerance", "rss tolerance", "root sum square", "dimensional stack up", "assembly gap tolerance", "y14.5 stack",
"statistical tolerance"); the id appended to the existing shop renderers block in `app.js`; the `// dims:` annotation
(gap/tolerances length, count dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning
both examples, the worst-case-vs-RSS relation, and the negative / non-finite error seams. No new module; re-pin
`calc-shop.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the worst-case / RSS / gap output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (three at +/-0.005 -> +/-0.015 WC, +/-0.00866 RSS).

## 5. Roadmap position

Opens the fabrication shop-math trio: `cone-flat-pattern` (v400) develops a sheet-metal blank and `spur-gear-geometry`
(v401) lays out gear teeth, both of which live and die by the tolerances this tile stacks. A Monte-Carlo tolerance
distribution and an unequal-limit (asymmetric) mode are the deliberate next follow-ons.
