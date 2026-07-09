# roughlogic.com Specification v564 -- Reineke Stand Density Index (calc-arborist.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`**
> (Group L, agriculture and forestry); no new module, group, or dependency. Inherits spec.md through spec-v563.md.
>
> **The gap, and the evidence for it.** `basal-area-prism` measures density in the field, but the metric foresters use
> to decide **when to thin** is Reineke's Stand Density Index, and the bench has none. SDI expresses a stand's density as
> the trees-per-acre it would have at a standard 10-inch quadratic mean diameter, `SDI = TPA x (QMD / 10)^1.605`, and the
> percent of the maximum SDI drives the management window: about 35% marks the onset of competition, 55 to 60% the lower
> management zone, and near 100% self-thinning (mortality). The catch is the diameter: SDI uses the **quadratic** mean
> diameter (the diameter of the tree of average basal area), not the arithmetic mean. QMD weights the large stems and is
> always at least the arithmetic mean, so plugging in a plain average diameter understates the density and can leave a
> stand thinned too late. The tile takes the trees per acre and the quadratic mean diameter, and returns the SDI and its
> percent of a specified maximum, with the management-zone context.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The trees per acre and the
SDI are `dimensionless` (counts per acre); the quadratic mean diameter is a length (`L`, in inches); the percent of
maximum and the `1.605` exponent are `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive trees
per acre or quadratic mean diameter, or a non-positive maximum SDI (when a percent is requested) returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the Reineke relation by name (Reineke 1933; USDA FS RMRS);
`editionNote` names the **Reineke Stand Density Index**, prints `SDI = TPA x (QMD / 10)^1.605` and
`percent_max = SDI / SDI_max x 100`, notes the zones (**~35% onset of competition, 55-60% lower management zone, ~100%
self-thinning**), and states that **SDI uses the quadratic mean diameter (the diameter of the tree of average basal
area, always >= the arithmetic mean) not a plain average so using the arithmetic mean understates density, the 1.605
exponent is the empirical self-thinning slope, the maximum SDI is species-specific, and a qualified silvicultural
prescription governs** -- a management aid, not a prescription.

## 2. The tile

### 2.1 `reineke-sdi` -- The Thin-Now Metric (on Quadratic, Not Arithmetic, Mean Diameter)

```
inputs:
  trees_per_acre   -    TPA (live stems per acre)
  qmd_in           in   quadratic mean diameter = sqrt(sum(d^2) / n)
  sdi_max          -    species maximum SDI (0 to skip the percent)

sdi         = trees_per_acre x (qmd_in / 10)^1.605          [-]
percent_max = sdi_max > 0 ? sdi / sdi_max x 100 : null      [%]
```

**Pinned worked example (300 trees per acre at a 10 in quadratic mean diameter, species max SDI 400).**
`SDI = 300 x (10/10)^1.605 = 300 x 1 = ` **300**, which is `300 / 400 x 100 = ` **75% of maximum** -- well into the
upper management zone, so this stand is a thinning candidate. **Cross-check (a smaller QMD lowers the index).** The same
300 trees per acre at an 8 in quadratic mean diameter: `SDI = 300 x (0.8)^1.605 = 300 x 0.700 = ` **210**, or **53% of
max** -- the lower management zone, because the smaller-diameter stand occupies less growing space. Using the arithmetic
mean (which would be below 8 in) would understate it further, the exact error the quadratic mean avoids. The tile
returns the SDI and its percent of the maximum.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["forester", "timber"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the QMD-10 example + the QMD-8
cross-check); `test/fixtures/compute-map.js` (`reineke-sdi` -> `computeReinekeSdi` in `../../calc-arborist.js`);
`scripts/related-tiles.mjs` (-> `basal-area-prism` / `timber-cruise` / `crown-pruning-dose`); `data/search/aliases.json`
("stand density index", "reineke sdi", "quadratic mean diameter", "thinning window", "sdi percent", "self thinning",
"forest density metric", "qmd"); the id appended to the arborist renderers declare in `app.js`; the `// dims:`
annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the 1.605
exponent, the percent-of-max, the QMD sensitivity, and the error seams (non-finite, non-positive TPA / QMD / SDI_max).
Hand-writes its renderer (mirroring the calc-arborist.js pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the SDI / percent-max stack wraps on a phone); render-no-nan + a11y on the new tile, output read
to the value (the QMD-10 example -> SDI 300, 75%).

## 5. Roadmap position

Adds the thinning-decision metric beside `basal-area-prism` (which measures the density it summarizes). A quadratic-mean-
diameter helper (computing QMD from a diameter tally) and a stocking-chart / thinning-target (residual TPA at a target
SDI) are deliberate future follow-ons. Further Group L growth stays evidence-driven.
