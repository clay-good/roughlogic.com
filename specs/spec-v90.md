# roughlogic.com Specification v90 -- Food-Service Cost Control (Group O, 3 New Tiles)

> **Implementation status: CLOSED -- landed 2026-06-18 (package 0.65.0; specs v90-v100 each targeted a minor individually but landed in one commit, so they stamp a single 0.65.0) (target catalog
> 634 -> 637; 25 groups; a minor stamp).** v90 inherits everything from spec.md
> through spec-v89.md and changes none of it. It adds three tiles to **Group O
> (Kitchen and Food Service)** and changes no existing tile's output. **No new
> group, no new dependencies, no telemetry, no AI, US standards only.** All three
> land in `calc-kitchen.js` (the existing home of every Group O tile -- see the
> §3 module note on the cap bump).
>
> **The gap, and the evidence for it.** Group O already does the *recipe* and the
> *plate*: `recipe-scale`, `yield-ep` (yield percent and edible-portion cost),
> `pan-conversion`, `plate-cost` (plate cost and a suggested menu price at a target
> food-cost percent), `bakers-percentage`, `brine-cure`, `cooling-curve`, and
> `sous-vide-pasteurization`. What it does **not** have is the set of numbers an
> operator runs *after* service, off the books and the inventory sheet, to find out
> whether the plates are actually making money: the **period food-cost percentage**
> from the inventory count (the number that catches waste, theft, over-portioning,
> and price creep that a per-plate recipe cost can never see), the **prime cost**
> (food plus beverage plus labor, the single most-watched restaurant KPI), and the
> bar's **pour cost** (the beverage analog of plate cost, the most common single
> calculation a bar manager makes). A concept-check against the post-v89 live ids
> for food-cost-percentage, prime-cost, prime cost ratio, pour cost, pour-cost, and
> liquor cost returned nothing. `plate-cost` prices one plate from its recipe; it
> says nothing about the *actual* cost the inventory sheet reveals, about labor, or
> about the bar. These three are the first numbers a chef-owner or bar manager
> looks at on a P&L, and the catalog has none of them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `food-cost-percentage` carries a money over money to a
  dimensionless percent (and a money variance); `prime-cost` carries money sums to a
  money total and three dimensionless percents; `pour-cost` carries a volume over a
  volume to a dimensionless pour count, then money over that count to a cost per
  pour, then a cost over a dimensionless fraction to a price. Every constant (the
  US fluid-ounce of 29.5735 mL) is bundled and annotated.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  non-positive denominator -- food sales, total sales, bottle cost, bottle size,
  pour size, or target percent -- returns `{ error }`. A negative dollar input
  (inventory, purchases, labor, cost) returns `{ error }`. Optional outputs are
  `null` when their trigger input is left at zero: the theoretical-cost *variance*
  is `null` when no theoretical percent is given, and the per-drink *add* defaults
  to zero (a valid value, not off).
- The v19/v22 citation discipline applies. All three use **`GOVERNANCE.general`**
  (these are business arithmetic, not a food-safety control point -- the
  food-safety tiles `sous-vide-pasteurization`, `cooling-curve`, and `brine-cure`
  carry `GOVERNANCE.food`, and these three deliberately do not). Sources are named,
  never reproduced: the **standard restaurant-accounting identity** COGS = beginning
  inventory + purchases - ending inventory; the **prime-cost definition** (COGS plus
  total labor) from the standard restaurant P&L; and the **US fluid-ounce to
  milliliter** conversion. The published benchmark *ranges* (food cost ~28-35%,
  prime cost <=~60%, spirit pour cost ~18-24%) are stated as representative industry
  rules of thumb the operator edits, not as law -- every threshold is advisory and
  every rate is an editable input.
- Tile ids are kebab-case and checked against the post-v89 live ids. None collides
  with `plate-cost`, `yield-ep`, `recipe-scale`, `pan-conversion`,
  `bakers-percentage`, or any cost/markup tile in Group G or R (see Section 3).

## 2. The tiles

### 2.1 `food-cost-percentage` -- Period Food-Cost Percentage and Variance (Group O, calc-kitchen.js)

`plate-cost` gives the *theoretical* cost of one plate from its recipe; this gives
the *actual* food cost the inventory count reveals for a whole period, and the
variance between the two -- the gap that is waste, theft, over-portioning, spoilage,
and price creep.

```
inputs:
  beginning_inventory   -    food inventory value at the period start (dollars)
  purchases             -    food purchases during the period (dollars)
  ending_inventory      -    food inventory value at the period end (dollars)
  food_sales            -    total food sales for the period (dollars)
  theoretical_cost_pct  -    optional ideal/recipe food-cost percent to compare (0 = off)

cogs            = beginning_inventory + purchases - ending_inventory
food_cost_pct   = cogs / food_sales * 100
variance_pts    = theoretical_cost_pct > 0 ? food_cost_pct - theoretical_cost_pct : null
variance_dollars= theoretical_cost_pct > 0 ? (food_cost_pct - theoretical_cost_pct) / 100 * food_sales : null
```

Outputs: the cost of goods sold (COGS) for the period, the actual food-cost percent,
and -- when a theoretical percent is supplied -- the variance in percentage points
and in dollars (positive means actual is running *over* theoretical, an unfavorable
gap). The note line states: this is the **actual** food cost from the inventory
count, the number that catches what a per-plate recipe cost (`plate-cost`) cannot --
waste, theft, over-portioning, spoilage, and vendor price creep; full-service food
cost typically runs about 28 to 35 percent of food sales, but your target is your
own; count inventory at the same time each period and value it the same way every
time or the number lies; and a variance of more than about one or two points between
theoretical and actual is worth a walk through the walk-in.

**Worked example (pinned).** Beginning $12,000, purchases $30,000, ending $10,000,
food sales $120,000, theoretical 30 percent: COGS = 12,000 + 30,000 - 10,000 =
**$32,000**; food cost = 32,000 / 120,000 = **26.67%**; variance = 26.67 - 30 =
**-3.33 points** (favorable, running under theoretical); variance dollars = -0.0333 x
120,000 = **-$4,000** (favorable). Cross-check (a higher ending count, $14,000): COGS
= **$28,000**, food cost = **23.33%**. Cross-check (weaker sales, $100,000, same
$32,000 COGS): **32.0%**, variance **+2.0 points**, **+$2,000** unfavorable.
Degenerate inputs (food_sales <= 0, any negative dollar input, non-finite) return an
error; theoretical_cost_pct = 0 returns a `null` variance.

### 2.2 `prime-cost` -- Restaurant Prime Cost and Ratio (Group O, calc-kitchen.js)

Prime cost -- the sum of cost of goods sold and total labor -- is the single
most-watched number on a restaurant P&L because it is the cost the operator actually
controls. This rolls food, beverage, and all-in labor into the prime cost and the
three ratios a manager reads weekly.

```
inputs:
  food_cost    -    period food COGS (dollars)
  beverage_cost-    period beverage COGS (dollars; 0 if none)
  labor_cost   -    total labor: wages, salaries, payroll taxes, and benefits (dollars)
  total_sales  -    total sales for the period: food plus beverage (dollars)

cogs_total     = food_cost + beverage_cost
prime_cost     = cogs_total + labor_cost
prime_cost_pct = prime_cost / total_sales * 100
labor_pct      = labor_cost / total_sales * 100
cogs_pct       = cogs_total / total_sales * 100
```

Outputs: the total COGS, the prime cost in dollars, and the prime-cost, labor, and
COGS percents of sales. The note line states: prime cost (COGS plus labor) is the
cost you control, so it is the number to watch -- rent, utilities, and the other
fixed costs come out of what is left; the rule of thumb keeps prime cost at or below
about 60 percent of sales for full-service and nearer 55 percent for limited-service,
and much above 65 percent leaves little for profit; labor here is *all-in* (wages,
payroll taxes, and benefits), not just hourly wages; and track this weekly, not just
at month-end, because by month-end the labor is already spent.

**Worked example (pinned).** Food $32,000, beverage $8,000, labor $42,000, total
sales $140,000: COGS total = **$40,000**; prime cost = 40,000 + 42,000 =
**$82,000**; prime-cost percent = 82,000 / 140,000 = **58.57%**; labor =
**30.0%**; COGS = **28.57%**. Cross-check (labor climbs to $50,000): prime =
**$90,000** = **64.29%** of sales -- tight. Cross-check (no beverage, food $32,000,
labor $42,000, sales $120,000): prime = **$74,000** = **61.67%**. Degenerate inputs
(total_sales <= 0, any negative dollar input, non-finite) return an error.

### 2.3 `pour-cost` -- Beverage Pour Cost and Drink Price (Group O, calc-kitchen.js)

The bar's answer to `plate-cost`: from a bottle's cost and size and the house pour,
this gives the pours per bottle, the liquor cost per drink, and the menu price that
hits a target pour cost.

```
inputs:
  bottle_cost          -    cost of the bottle (dollars)
  bottle_size_ml       -    usable volume of the bottle (e.g. 750, 1000, 1750)
  pour_size_oz         -    the house pour (e.g. 1.5 for a standard shot)
  target_pour_cost_pct -    the target pour cost as a percent (e.g. 20)
  other_cost_per_drink -    optional garnish / mixer / ice cost per drink (dollars; 0 = off)

ml_per_oz        = 29.5735            (US fluid ounce)
pours_per_bottle = bottle_size_ml / (pour_size_oz * ml_per_oz)
cost_per_pour    = bottle_cost / pours_per_bottle
drink_cost       = cost_per_pour + other_cost_per_drink
suggested_price  = drink_cost / (target_pour_cost_pct / 100)
```

Outputs: the pours per bottle, the liquor cost per pour, the total cost per drink
(with the optional add), and the suggested menu price at the target pour cost. The
note line states: pour cost is the drink's cost divided by its price, and spirits
typically run about 18 to 24 percent (beer and wine higher); a free-pour bartender
easily gives away a half-ounce on a "1.5-ounce" spec, which quietly wrecks the pour
cost -- a jigger or a measured pourer pays for itself; the bottle size is the
*usable* volume; mixers, garnish, ice, and spillage are real, so fold them in with
the optional per-drink add; and round the suggested price to a sensible menu number.

**Worked example (pinned).** A $24 bottle, 750 mL, a 1.5-ounce pour, a 20 percent
target, and $0.25 of garnish: pour = 1.5 x 29.5735 = 44.36 mL; pours per bottle =
750 / 44.36 = **16.91**; cost per pour = 24 / 16.91 = **$1.42**; drink cost = 1.42 +
0.25 = **$1.67**; suggested price = 1.67 / 0.20 = **$8.35**. Cross-check (a 1.75-L
handle, same pour): pours = 1,750 / 44.36 = **39.45**, cost per pour = 24 / 39.45 =
**$0.61**. Cross-check (a 2.0-ounce over-pour from the same 750-mL bottle): pours =
750 / 59.15 = **12.68**, cost per pour = 24 / 12.68 = **$1.89** -- a third more cost
from a half-ounce of slop. Degenerate inputs (bottle_cost <= 0, bottle_size <= 0,
pour_size <= 0, target_pour_cost_pct <= 0, non-finite) return an error;
other_cost_per_drink = 0 is valid (no add).

## 3. Concept-check and wiring

Concept-checked against the post-v89 live tiles. `plate-cost` prices one plate from
its recipe and suggests a price at a target food-cost percent for that *plate*;
`food-cost-percentage` measures the *actual* period cost from the inventory count, a
different quantity entirely (and the one that exposes the gap `plate-cost` cannot
see). `yield-ep` is an ingredient-yield calculation, not a P&L ratio. No live tile
computes prime cost, labor percent, or a beverage pour cost. `markup`,
`material-cost`, and the Group R business tiles are general-purpose and do not encode
the restaurant identities. **All three ship**, into `calc-kitchen.js`.

Per-tile wiring (each of the three): a `tools-data.js` row (group `O`, trades
`["food-service"]` -- the trade tag the existing Group O rows use); `tile-meta.js`
`_TILES`; a `citations.js` entry (the `GOVERNANCE.general` governance from Section 1;
the formula string; assumptions listing every bundled constant and range -- the
COGS identity, the prime-cost definition, the 29.5735 mL fluid-ounce, and the
food-cost / prime-cost / pour-cost benchmark ranges -- naming the standard
restaurant-accounting and bar-control references without reproduction);
`test/fixtures/worked-examples.json` (every pinned example and cross-check);
`test/fixtures/compute-map.js` (module path `../../calc-kitchen.js`);
`scripts/related-tiles.mjs` (`food-cost-percentage` -> `plate-cost` / `prime-cost` /
`yield-ep`; `prime-cost` -> `food-cost-percentage` / `plate-cost` / `overtime`;
`pour-cost` -> `plate-cost` / `food-cost-percentage` / `yield-ep`);
`data/search/aliases.json` (e.g. `food-cost-percentage`: "food cost", "food cost
percentage", "cogs", "cost of goods sold", "inventory variance"; `prime-cost`:
"prime cost", "labor cost percentage", "restaurant kpi", "p&l", "cogs plus labor";
`pour-cost`: "pour cost", "liquor cost", "drink price", "bar cost", "pour size");
the `app.js` `KITCHEN_RENDERERS` declare gains all three ids; the `// dims:`
annotations; and the regenerated v14 corpus + tile-index. A
`test/unit/bounds-fuzzer.test.js` block pins every worked example, the `null`
variance branch when no theoretical percent is given, and every error seam
(non-positive denominator, negative dollar input, non-finite).

**Module note.** `calc-kitchen.js` is the home of every Group O tile, so the three
land there. It is at ~12.3 KB gzipped against a 13,000 B cap; the three small tiles
push it over, so this spec **raises the `calc-kitchen.js` cap** in
`scripts/check-module-sizes.mjs` to about **16,000 B** (current plus the three tiles
plus the documented ~20% headroom), the same documented-cap-bump pattern v67 and v69
used for `calc-construction.js`. If the as-built size warrants it instead, the
maintainer may split a Group O bench into a new module (the spec-v70..v89 precedent);
either way the module-size gate stays green. Group letter (`O`) is independent of the
module.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates;
`check-readme-counts` agrees at **637 tiles** and the matching sitemap URL count);
`npm test` (+3 worked-example fixtures and their cross-checks; the new bounds-fuzzer
block); `npm run build` (637 tile shells, regenerated sitemap); `npm run
data:verify`; the worked-examples runner; the 320 px shell audit (the COGS / food
cost / variance, the prime cost and three ratios, and the pours / cost-per-pour /
suggested-price lines all wrap, not scroll, on a phone); and the full-catalog
render-no-nan Chromium sweep plus the a11y gate, with the rendered output read to the
value ($12k/$30k/$10k on $120k -> 26.67% and -$4,000; food $32k / bev $8k / labor
$42k on $140k -> 58.57%; $24 / 750 mL / 1.5 oz at 20% -> $8.35).

## 5. Roadmap position

v90 opens the cost-control side of Group O, linking the new tiles to the existing
recipe-and-plate bench (`food-cost-percentage` and `pour-cost` are the period and bar
analogs of `plate-cost`; `prime-cost` consumes the same labor an operator already
tracks). Further growth should stay evidence-driven (a named gap a working kitchen or
bar hits) -- candidates include a walk-in / reach-in refrigeration-load tile (which
overlaps Group C and should land only with a named field need), a banquet / event
portion-and-quantity planner, and a fryer-oil cost-and-life tile; none ships without
the field need. The standing module-cap watch adds `calc-kitchen.js` after this bump.
