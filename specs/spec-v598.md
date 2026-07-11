# roughlogic.com Specification v598 -- Quadratic Mean Diameter From a Tally (calc-arborist.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`**
> (Group L, the forestry / arborist bench); no new module, group, or dependency. Inherits spec.md through spec-v597.md.
>
> **The gap, and the evidence for it.** Spec-v564 (`reineke-sdi`) names this tile as a deliberate follow-on:
> "a quadratic-mean-diameter helper (computing QMD from a diameter tally)." The SDI tile *requires* a quadratic mean
> diameter but makes the cruiser supply it -- and the whole point of its own note is that a plain arithmetic average is
> the wrong number, so a forester who eyeballs "about 12 inches" feeds SDI a value that understates density and thins
> the stand too late. QMD is not a mean of diameters; it is the diameter of the tree of **average basal area**, and
> because basal area goes with the square of diameter it always lands at or above the arithmetic mean. The right way to
> get it is from the tally sheet: `QMD = sqrt( sum(count x diameter^2) / total trees )`. This tile takes a diameter
> tally -- the raw list of DBH classes and their counts a cruiser records at a plot -- and returns the QMD, the tree
> count, the arithmetic mean beside it (so the gap is visible), and the total basal area the tally represents. It is
> the input `reineke-sdi` and `basal-area-prism` both assume the user already has.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The diameters and the
QMD / arithmetic mean are `L` (in); the tree count is `dimensionless`; the total basal area is `L^2` (ft^2, via the
`0.005454 x D^2` foresters' constant, carried dimensionless to the parse-only lint like the `basal-area-prism`
sibling). The tally is a free-text list, so it is not a numeric input. The v18/v21 contract: an empty tally, a tally
with no valid entry, or any token that is not a positive diameter (optionally times a positive integer count) returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the QMD definition by name (USDA Forest Service
forest-mensuration practice, matching the `reineke-sdi` sibling); `editionNote` prints
`QMD = sqrt( sum(count x diameter^2) / sum(count) )`, notes the tally token format (`diameter`, or
`diameter:count` / `diameter x count` for a class), and states that **QMD is the diameter of the tree of average
basal area (always at or above the arithmetic mean), the total basal area is `0.005454 x sum(count x diameter^2)`
ft^2 for the tallied trees (not a per-acre expansion -- a fixed- or variable-radius plot factor gives per-acre), and
the forester and the cruise design govern** -- a mensuration helper, not a cruise compilation.

## 2. The tile

### 2.1 `quadratic-mean-diameter` -- QMD, Tree Count, and Basal Area From a DBH Tally

```
inputs:
  tally  textarea   DBH tally: one token per tree ("12") or per class ("12:40" / "12 x 40"),
                    separated by commas or new lines

For each token (diameter d, count c, default c = 1):
  N        = sum(c)
  sum_sq   = sum(c x d^2)
  QMD_in   = sqrt(sum_sq / N)                         [in]
  amean_in = sum(c x d) / N                           [in]  (arithmetic mean, for contrast)
  basal_area_ft2 = 0.005454 x sum_sq                  [ft2] (total for the tallied trees)
```

**Pinned worked example (a five-tree spot tally: 8, 10, 10, 12, 14 in).**
`sum_sq = 64 + 100 + 100 + 144 + 196 = 604`, `N = 5`, so `QMD = sqrt(604 / 5) = sqrt(120.8) = ` **10.99 in** -- above
the arithmetic mean of `54 / 5 = ` **10.8 in**, and the total basal area is `0.005454 x 604 = ` **3.29 ft^2**.
**Cross-check (a class tally: 100 trees at 10 in, 50 at 14 in, 20 at 18 in).**
`sum_sq = 100 x 100 + 50 x 196 + 20 x 324 = 10,000 + 9,800 + 6,480 = 26,280`, `N = 170`,
`QMD = sqrt(26,280 / 170) = sqrt(154.59) = ` **12.43 in** against an arithmetic mean of
`2,060 / 170 = ` **12.12 in** -- the QMD sits above the average, exactly the understatement `reineke-sdi` warns about,
and the tally's basal area is `0.005454 x 26,280 = ` **143.3 ft^2**.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["forester", "timber"]`, placed beside `reineke-sdi` -- **outside** the
counted `// Group L: Agriculture` .. `// Group M` block like the other arborist tiles, so the `citations.test.js`
Group L audit count does **not** change); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (both examples, with the tally as
a string input); `test/fixtures/compute-map.js` (`quadratic-mean-diameter` -> `computeQuadraticMeanDiameter` in
`../../calc-arborist.js`); `scripts/related-tiles.mjs` (-> `reineke-sdi` / `basal-area-prism` / `log-limb-weight`);
`data/search/aliases.json` ("quadratic mean diameter", "qmd", "diameter tally", "mean stand diameter", "dbh tally",
plus question rows); the id appended to the calc-arborist declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
tally-vs-class equivalence, the QMD >= arithmetic-mean property, and the error seams (empty tally, non-numeric token,
non-positive diameter / count). Renderer uses `makeTextarea` for the tally (satisfying `check-multiline-inputs`) with
the module's `makeOutputLine` outputs. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**, `check-multiline-inputs`
sees the textarea); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (the five-tree
example -> 10.99 in QMD).

## 5. Roadmap position

Supplies the QMD that `reineke-sdi` requires and warns is mis-entered, closing the tally-to-density path with
`basal-area-prism`. The v564-named stocking-chart / thinning-target (residual TPA at a target SDI) remains a deliberate
future follow-on. Further Group L growth stays evidence-driven.
