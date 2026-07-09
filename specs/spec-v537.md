# roughlogic.com Specification v537 -- Menu Engineering Matrix (calc-kitchen.js, Group O, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, kitchen and food service); no new module, group, or dependency. Inherits spec.md through spec-v536.md.
>
> **The gap, and the evidence for it.** `plate-cost` prices a single dish at a target food-cost percent, and
> `food-cost-percentage` gives the ratio, but neither tells an operator which menu items to promote, reprice, or cut.
> The Kasavana-Smith menu-engineering model does: it plots each item on two axes -- contribution-margin dollars and
> popularity -- and sorts it into a Star (high margin, high popularity), a Plowhorse (low margin, high popularity), a
> Puzzle (high margin, low popularity), or a Dog (low margin, low popularity). The catch the tile makes explicit is that
> the margin axis is contribution-margin **dollars**, not food-cost percent: a low-food-cost item with a great percent
> can still be a Dog if it earns few dollars and sells poorly. Popularity is judged against the menu's own average share
> using the standard 70% rule. The tile takes one item's units sold and contribution margin, plus the menu context
> (total units, item count, average margin), and returns the item's margin, its popularity share, the thresholds, and
> its quadrant -- the classification that drives the menu decision.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The units sold, total
units, and item count are counts (`dimensionless`); the price, food cost, contribution margin, and average margin are
carried as `dimensionless` currency (matching the existing kitchen tiles); the popularity share and thresholds are
`dimensionless`. The v18/v21 contract: any non-finite input, a non-positive total units or item count, negative units
sold, or a price below the food cost (negative margin) returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the menu-engineering model by name (Kasavana & Smith); `editionNote` names the **Kasavana-Smith
menu-engineering classification**, prints `contribution_margin = price - food_cost`,
`popularity_share = units_sold / total_units`, `popularity_threshold = (1 / item_count) x 0.70`, and the quadrant from
`margin >= average_margin` and `popularity_share >= popularity_threshold`, and states that **the margin axis is
contribution-margin dollars not food-cost percent (a low-food-cost item can still be a Dog if it earns few dollars),
popularity is judged against the menu-average share times the 0.70 rule, the classification needs the full sales mix not
a single dish, and the operator's cost and pricing data govern** -- an analysis aid, not a pricing decision.

## 2. The tile

### 2.1 `menu-engineering` -- Star, Plowhorse, Puzzle, or Dog (on Margin Dollars, Not Food-Cost %)

```
inputs:
  units_sold        -    this item's units sold in the period
  menu_price        $    item menu price
  food_cost         $    item plate food cost
  total_units       -    total units sold across all menu items
  item_count        -    number of items on the menu
  average_margin    $    the menu's average contribution margin per item

contribution_margin  = menu_price - food_cost                             [$]
popularity_share     = units_sold / total_units                           [-]
popularity_threshold = (1 / item_count) x 0.70                            [-]
high_margin          = contribution_margin >= average_margin
high_pop             = popularity_share >= popularity_threshold
quadrant             = high_margin && high_pop ? "Star"
                     : !high_margin && high_pop ? "Plowhorse"
                     : high_margin && !high_pop ? "Puzzle" : "Dog"
```

**Pinned worked example (an item selling 200 of 1,000 units on a 10-item menu; price $12, food cost $4; menu average
margin $6).** The contribution margin is `12 - 4 = $8` (above the $6 average, so **high margin**); the popularity share
is `200 / 1,000 = 20%` against a threshold of `(1/10) x 0.70 = 7%`, so it is well above (**high popularity**) -- the
item is a **Star**: promote it and protect its recipe. **Cross-check (popular but thin is a Plowhorse).** Keep the 20%
popularity but drop the margin to `$3` (below the $6 average): now it is **low margin, high popularity** -- a
**Plowhorse**, the crowd-pleaser to gently reprice or re-portion, not a Star. The tile returns the margin, the
popularity share, the thresholds, and the quadrant.

## 3. Wiring

A `tools-data.js` row (group `O`, trades `["kitchen", "food-service"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the Star
example + the Plowhorse cross-check); `test/fixtures/compute-map.js` (`menu-engineering` -> `computeMenuEngineering` in
`../../calc-kitchen.js`); `scripts/related-tiles.mjs` (-> `plate-cost` / `food-cost-percentage` / `prime-cost`);
`data/search/aliases.json` ("menu engineering", "kasavana smith", "star plowhorse puzzle dog", "menu matrix",
"contribution margin menu", "menu popularity", "menu mix analysis", "70 percent rule menu"); the id appended to the
kitchen renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the margin and popularity thresholds, the four-quadrant
classification, and the error seams (non-finite, non-positive total / item count, negative units, price < food cost).
Hand-writes its renderer (mirroring the calc-kitchen.js `plate-cost` pattern). Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the margin / popularity / quadrant stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the Star example -> $8 margin, 20% share, Star).

## 5. Roadmap position

Turns the single-dish `plate-cost` and `food-cost-percentage` into a portfolio decision. A full-menu batch classifier
(feeding the whole item list at once) and a reprice-to-Star target (the price that moves a Puzzle's popularity or a
Plowhorse's margin) are deliberate future follow-ons. Further Group O growth stays evidence-driven.
