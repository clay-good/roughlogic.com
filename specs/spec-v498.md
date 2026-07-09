# roughlogic.com Specification v498 -- Pile Group Efficiency, Converse-Labarre (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`**
> (Group E, the geotechnical bench); no new module, group, or dependency. Inherits spec.md through spec-v497.md.
>
> **The gap, and the evidence for it.** `pile-axial-capacity` sizes a single pile and, like the alpha-method itself,
> ignores what happens when piles are driven in a cluster. A group does not carry the simple sum of its piles: the
> stress bulbs of adjacent piles overlap, so the group capacity is **less** than the count times the single-pile value.
> The Converse-Labarre formula is the standard hand check for it, and it exposes a real design trap -- efficiency falls
> as the spacing tightens, so at the common `3d` spacing a nine-pile group already loses a quarter of its nominal
> capacity, and squeezing the piles to `2d` to fit a smaller cap drops it further. Adding piles at close spacing yields
> diminishing returns, and a designer who multiplies the single-pile capacity by the pile count over-predicts the group.
> The tile takes the group layout (rows, columns, diameter, center-to-center spacing) and the single-pile allowable, and
> returns the Converse-Labarre efficiency and the group allowable load, with the reminder that a block (pier) failure is
> a separate check the tile does not replace.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The pile diameter and the
center-to-center spacing are lengths (`L`); the single-pile and group allowable loads are forces (`M L T^-2`, carried in
kip); the number of rows and columns, the angle `theta` (in degrees, an angle the lint treats as `dimensionless`), and
the efficiency are `dimensionless`. The v18/v21 contract: any non-finite input, a number of rows or columns below 1, a
non-positive diameter or spacing, a spacing smaller than the diameter (piles cannot overlap), or a negative single-pile
allowable returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the Converse-Labarre relation by
name (standard geotechnical practice); `editionNote` names the **Converse-Labarre pile-group efficiency**, prints
`theta = atan(d / s)` in degrees, `Eg = 1 - theta x ((n - 1) x m + (m - 1) x n) / (90 x m x n)`, and
`group_allowable = Eg x (m x n) x Q_single`, and states that **group capacity is less than the sum of the piles because
the stress bulbs overlap, efficiency drops as the spacing tightens (below about 3d it falls under 0.7, so close-spaced
piles give diminishing returns), the formula is an empirical friction-pile hand check, and a block / pier failure of the
group acting as a unit and settlement are separate checks the tile does not replace** -- a design aid, not the engineer
of record.

## 2. The tile

### 2.1 `pile-group-efficiency` -- Why a Pile Group Carries Less Than the Sum of Its Piles

```
inputs:
  rows_n            -     number of pile rows n
  cols_m            -     number of pile columns m
  diameter_in       in    pile diameter d
  spacing_in        in    center-to-center spacing s (>= d)
  single_allow_kip  kip   allowable capacity of one isolated pile Q_single

theta_deg  = atan(diameter_in / spacing_in) in degrees                                  [deg]
Eg         = 1 - theta_deg x ((rows_n - 1) x cols_m + (cols_m - 1) x rows_n) / (90 x cols_m x rows_n)   [-]
n_piles    = rows_n x cols_m                                                             [-]
group_kip  = Eg x n_piles x single_allow_kip                                            [kip]
naive_kip  = n_piles x single_allow_kip                                                 [kip]  (the over-prediction)
```

**Pinned worked example (a 3x3 group of 12 in piles at 3d = 36 in spacing, 100 kip each).**
`theta = atan(12 / 36) = ` **18.43 deg**; the bracket term is `(2 x 3) + (2 x 3) = 12`, so
`Eg = 1 - 18.43 x 12 / (90 x 9) = 1 - 221.2 / 810 = ` **0.727**. The group carries
`0.727 x 9 x 100 = ` **654 kip**, not the `900 kip` the naive sum implies -- a quarter of the capacity is lost to group
action. **Cross-check (tighter spacing loses more).** Squeeze the same nine piles to `2d = 24 in`:
`theta = atan(0.5) = 26.57 deg`, `Eg = 1 - 26.57 x 12 / 810 = ` **0.606**, and the group falls to
`0.606 x 9 x 100 = ` **546 kip** -- adding no piles but tightening the cap costs another 108 kip. The tile returns the
angle, the efficiency, the group allowable, and the naive sum it corrects.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 3d example + the 2d tighter-
spacing cross-check); `test/fixtures/compute-map.js` (`pile-group-efficiency` -> `computePileGroupEfficiency` in
`../../calc-geotech.js`); `scripts/related-tiles.mjs` (-> `pile-axial-capacity` / `helical-pile` /
`soil-bearing-capacity`); `data/search/aliases.json` ("pile group efficiency", "converse labarre", "pile group
capacity", "group action piles", "pile spacing efficiency", "pile cap", "group settlement", "stress bulb overlap"); the
id appended to the geotech renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-
index; a `bounds-fuzzer.test.js` block pinning both examples, the efficiency falling as spacing tightens (Eg monotonic
in s), Eg bounded in (0, 1], the group < naive relation, and the error seams (non-finite, rows/cols < 1, non-positive
diameter / spacing, spacing < diameter, negative single allowable). Hand-writes its renderer (mirroring the
calc-geotech.js `pile-axial-capacity` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the theta / efficiency / group stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 3x3 at 3d example -> Eg 0.727, 654 kip).

## 5. Roadmap position

Adds the group-action correction beside `pile-axial-capacity` (single pile) and `helical-pile`. A block-failure (group-
as-a-pier) capacity check and a group-settlement estimate (the equivalent-raft method) are the natural companions the
editionNote points to, and are deliberate future follow-ons. Further Group E growth stays evidence-driven.
