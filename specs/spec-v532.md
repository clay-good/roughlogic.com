# roughlogic.com Specification v532 -- Molarity from Concentrated Reagent (calc-lab.js, Group T, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lab.js`**
> (Group T, bench science and lab math); no new module, group, or dependency. Inherits spec.md through spec-v531.md.
>
> **The gap, and the evidence for it.** `molarity-dilution` runs the C1V1 dilution but assumes you already know the
> stock molarity. For a bottle of concentrated liquid reagent you do not -- the label gives a **weight percent and a
> density**, not a molarity. A bottle of "concentrated HCl" is 37% by weight at a density of 1.19 g/mL, and you must
> combine both with the molecular weight before you can even use a dilution calculator. The relation is
> `M = 10 x %(w/w) x density / MW`, and ignoring the purity or the density leaves the working solution off by 20 to 40%.
> The tile takes the assay percent, the density, and the molecular weight, and returns the stock molarity, and when a
> target molarity and final volume are supplied it also returns the volume of concentrate to draw -- the two numbers a
> tech needs to turn a stock bottle into a working solution. It carries the standard safety reminder to add acid to
> water, never the reverse.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The molecular weight is a
molar mass (`M N^-1` in principle, carried in g/mol); the density is `M L^-3` (g/mL); the stock and target molarities
are `N L^-3` (mol/L); the assay percent is `dimensionless`; the final and drawn volumes are volumes (`L^3`, in mL); the
`10` unit-bearing constant is `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive purity,
density, or molecular weight, a purity above 100, or (when the dilution is requested) a non-positive target molarity or
final volume returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the reagent-molarity relation
by name (standard reagent preparation); `editionNote` names the **stock molarity from assay and density**, prints
`stock_M = 10 x purity_pct x density / MW` and `volume_to_draw = target_M x final_volume / stock_M`, and states that
**a concentrated liquid reagent is labeled by weight percent and density not molarity so both must be combined with the
molecular weight (ignoring either is a 20 to 40% error), the `10` factor converts g per 100 mL to per liter, always add
concentrated acid to water not the reverse, and the reagent lot assay and lab safety procedures govern** -- a prep aid,
not a substitute for the certificate of analysis.

## 2. The tile

### 2.1 `molarity-from-stock` -- Turning a %-and-Density Bottle Into a Molarity

```
inputs:
  purity_pct     %       assay / purity (weight percent w/w)
  density_g_ml   g/mL    density (specific gravity x 1.0)
  mol_weight     g/mol   molecular weight
  target_m       mol/L   desired working molarity (0 = stock only)
  final_volume_ml mL     final volume to prepare (used with target)

stock_M         = 10 x purity_pct x density_g_ml / mol_weight            [mol/L]
volume_to_draw  = target_m > 0 ? target_m x final_volume_ml / stock_M : null   [mL]
```

**Pinned worked example (concentrated HCl: 37% w/w, density 1.19 g/mL, MW 36.46).**
`stock_M = 10 x 37 x 1.19 / 36.46 = 440.3 / 36.46 = ` **12.08 mol/L** -- the ~12 M figure every lab quotes, which you
cannot get from the percent or the density alone. To make `1.0 L` of `1.0 M` HCl, draw
`1.0 x 1000 / 12.08 = ` **82.8 mL** of the concentrate into water. **Cross-check (glacial acetic acid).** For 99.7%
acetic acid, density 1.049, MW 60.05: `stock_M = 10 x 99.7 x 1.049 / 60.05 = ` **17.4 mol/L** -- a different reagent,
a different molarity, entirely from its own percent, density, and molecular weight. The tile returns the stock molarity
and, when asked, the volume of concentrate to draw.

## 3. Wiring

A `tools-data.js` row (group `T`, trades `["lab"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the HCl example + the acetic-acid
cross-check); `test/fixtures/compute-map.js` (`molarity-from-stock` -> `computeMolarityFromStock` in
`../../calc-lab.js`); `scripts/related-tiles.mjs` (-> `molarity-dilution` / `mass-moles` / `molecular-weight`);
`data/search/aliases.json` ("molarity from stock", "concentrated reagent molarity", "percent to molarity", "stock
concentration", "12 M hcl", "reagent prep molarity", "w/w density molarity", "how to make molar solution"); the id
appended to the lab renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the 10-percent-density-over-MW relation, the volume-to-draw
dilution, and the error seams (non-finite, non-positive purity / density / MW, purity > 100, non-positive target /
volume). Hand-writes its renderer (mirroring the calc-lab.js `molarity-dilution` pattern). Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the stock-M / volume stack wraps on a phone); render-no-nan + a11y on the new tile, output read to
the value (the HCl example -> 12.08 M).

## 5. Roadmap position

Sits upstream of `molarity-dilution` (which needs the stock molarity this tile derives) and beside `mass-moles` (the
solid-from-powder path). A percent-to-molarity for common named reagents (a preset table) and a normality variant for
polyprotic acids are deliberate future follow-ons. Further Group T growth stays evidence-driven.
