# roughlogic.com Specification v539 -- Cocktail ABV with Dilution (calc-kitchen.js, Group O, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, kitchen and food service); no new module, group, or dependency. Inherits spec.md through spec-v538.md.
>
> **The gap, and the evidence for it.** `pour-cost` handles bar costing but nothing gives the strength of a mixed drink,
> and the number bartenders and menu writers get wrong is the effect of **ice-melt dilution**. Shaking or stirring a
> cocktail is not just chilling -- it adds roughly 20 to 30% water by volume, which lowers the final ABV by a similar
> proportion and is essential to balance the drink. A strength or standard-drink figure that ignores the melt overstates
> the pour. The final ABV is the total pure alcohol divided by the total volume including the dilution water, and the
> standard-drink count follows from the pure-alcohol volume (0.6 fl oz per standard drink). The tile takes the
> ingredient volumes and ABVs and the prep method (which sets the dilution), and returns the final volume, the final
> ABV, and the standard-drink count -- so a menu can state an honest strength and a bar can dose responsibly.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The ingredient and dilution
volumes and the final volume are volumes (`L^3`, in fl oz); the ABVs, the method dilution percent, and the final ABV are
`dimensionless` (percents); the standard-drink count is `dimensionless`. The v18/v21 contract: any non-finite input, a
non-positive total ingredient volume, an ABV outside `0-100`, or a negative dilution percent returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the dilution relation by name (cocktail dilution, per Dave
Arnold's Liquid Intelligence); `editionNote` names the **cocktail final-ABV with dilution model**, prints
`pure_alcohol = sum(volume_i x abv_i / 100)`, `dilution_water = total_volume x method_pct / 100`,
`final_abv = pure_alcohol / (total_volume + dilution_water) x 100`, and `standard_drinks = pure_alcohol / 0.6`, and
states that **ice-melt dilution is not optional (shaking adds about 25 to 30% water, stirring 20 to 25%, lowering the
ABV 15 to 25% and balancing the drink), a strength figure that ignores the melt overstates the pour, the serving
temperature and ice type shift the actual dilution, and responsible-service practice governs** -- a planning estimate,
not a lab measurement.

## 2. The tile

### 2.1 `drink-abv-dilution` -- Why the Melt Water Is Half the Recipe

```
inputs:
  total_volume_oz    fl oz   total volume of the alcoholic ingredients
  weighted_abv_pct   %       volume-weighted ABV of the ingredients (sum(vol x abv)/sum vol)
  method             -       shaken (28%) / stirred (23%) / rocks (15%) / neat (0%) or explicit dilution %

pure_alcohol   = total_volume_oz x weighted_abv_pct / 100                        [fl oz]
dilution_water = total_volume_oz x method_pct / 100                              [fl oz]
final_volume   = total_volume_oz + dilution_water                                [fl oz]
final_abv      = pure_alcohol / final_volume x 100                               [%]
standard_drinks = pure_alcohol / 0.6                                             [-]
```

**Pinned worked example (a stirred Martini: 2 oz gin at 40% + 1 oz vermouth at 18%, stirred ~25% dilution).** The
weighted ABV is `(2 x 40 + 1 x 18) / 3 = 98 / 3 = 32.7%` over `3 oz`, so the pure alcohol is
`3 x 0.327 = 0.98 oz`. Stirring adds `3 x 0.25 = 0.75 oz` of melt water, bringing the final volume to `3.75 oz`, so the
final strength is `0.98 / 3.75 x 100 = ` **26.1% ABV** -- not the 32.7% of the un-diluted pour, a real drop the melt
produces, and `0.98 / 0.6 = ` **1.6 standard drinks**. **Cross-check (served neat overstates the strength).** The same
`3 oz` poured neat (0% dilution) is `98 / 3 = ` **32.7% ABV** -- six points higher, the overstatement a strength figure
makes when it ignores the ice. The tile returns the pure alcohol, the final volume, the final ABV, and the standard-
drink count.

## 3. Wiring

A `tools-data.js` row (group `O`, trades `["food-service", "kitchen"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the stirred
example + the neat cross-check); `test/fixtures/compute-map.js` (`drink-abv-dilution` -> `computeDrinkAbvDilution` in
`../../calc-kitchen.js`); `scripts/related-tiles.mjs` (-> `pour-cost` / `bakers-percentage` / `recipe-scale`);
`data/search/aliases.json` ("cocktail abv", "drink dilution", "final abv", "standard drinks", "ice melt dilution",
"shaken stirred dilution", "drink strength", "alcohol by volume cocktail"); the id appended to the kitchen renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the dilution by method, the final-ABV drop, the standard-drink count, and the error seams (non-
finite, non-positive volume, ABV out of range, negative dilution). Hand-writes its renderer (mirroring the
calc-kitchen.js `pour-cost` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the pure-alcohol / final-ABV / standard-drinks stack wraps on a phone); render-no-nan + a11y on
the new tile, output read to the value (the stirred example -> 26.1% ABV, 1.6 drinks).

## 5. Roadmap position

Adds drink strength beside `pour-cost` (the cost side of the same drink). A per-ingredient builder (summing volumes and
ABVs directly rather than a pre-weighted value) and a batch-cocktail scaling with water addition are deliberate future
follow-ons. Further Group O growth stays evidence-driven.
