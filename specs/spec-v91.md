# roughlogic.com Specification v91 -- Owner-Operator Load Economics (Group J, 3 New Tiles)

> **Implementation status: CLOSED -- landed 2026-06-18 (package 0.65.0; specs v90-v100 each targeted a minor individually but landed in one commit, so they stamp a single 0.65.0) (target catalog
> 637 -> 640; 25 groups; a minor stamp).** v91 inherits everything from spec.md
> through spec-v90.md and changes none of it. It adds three tiles to **Group J
> (Trucking and Logistics)** and changes no existing tile's output. **No new group,
> no new dependencies, no telemetry, no AI, US standards only.** All three land in
> `calc-trucking.js` (the existing home of every Group J tile -- see the §3 module
> note on the cap bump).
>
> **The gap, and the evidence for it.** Group J already builds the owner-operator's
> *rate* and *fleet-average* numbers: `cost-per-mile` (fixed, fuel, maintenance, and
> driver cost per mile plus the break-even rate) and `deadhead-percent` (the empty-mile
> penalty on a loaded rate). It also has `dim-weight`, `freight-density`,
> `pallet-loadout`, `bridge-formula`, `axle-load-distribution`, `hos-math`,
> `reefer-burn`, `fuel-tax-ifta`, `incoterm-decoder`, and `stopping-sight-distance`.
> What it does **not** have is the decision an owner-operator makes several times a
> day at the load board: **is this specific load worth taking** -- revenue minus all
> the costs of *these* loaded-plus-deadhead miles, as a net profit and a profit per
> mile. Nor does it compute the **fuel surcharge** off a pegged base price (the
> standard DOE-index formula every contract references), or the **maintenance and
> replacement reserve per mile** (the cents you set aside now so the tire and overhaul
> bills do not sink you later). A concept-check against the post-v90 live ids for
> load-profitability, profit-per-load, fuel-surcharge, fsc, maintenance-reserve, and
> replacement-reserve returned nothing. `cost-per-mile` builds the *average* cost
> structure; it does not judge an *individual* load with its own deadhead, tolls, and
> tie-up days. These three turn that average into the per-load go/no-go, the surcharge
> math, and the reserve discipline that keep an owner-operator solvent.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `load-profitability` carries miles over a fuel economy to a
  fuel volume, volume times a price to money, miles times a per-mile rate to money,
  and money over miles to a per-mile result; `fuel-surcharge` carries a price
  difference over a fuel economy to a money-per-mile and times miles to money;
  `maintenance-reserve` carries money over a life-in-miles to a money-per-mile and
  times miles to money. Every constant is bundled and annotated; none is hidden.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  non-positive denominator -- loaded miles, MPG, fuel price, tie-up days, the
  fuel-surcharge MPG peg, a tire life, or a PM interval -- returns `{ error }`. A
  negative dollar or mile input returns `{ error }`. Optional outputs are `null` when
  their trigger input is left at zero: `fuel-surcharge`'s *total* is `null` when no
  miles are given (the per-mile rate still computes), and `maintenance-reserve`'s
  *monthly* reserve is `null` when no monthly mileage is given. A current fuel price
  at or below the pegged base yields a fuel surcharge of exactly **zero** (a valid
  result, not an error -- there is no surcharge below the peg).
- The v19/v22 citation discipline applies. All three use **`GOVERNANCE.trucking`**
  (the governance the existing Group J tiles carry). Sources are named, never
  reproduced: the **DOE / EIA weekly national average diesel price** as the common
  fuel-surcharge index; the **standard pegged fuel-surcharge identity** (the price
  above the peg divided by an assumed MPG); and the **published owner-operator
  cost-per-mile structure** the load-profitability tile consumes. The benchmark
  *ranges* (a true all-in CPM around $1.45 to $1.85, a target margin of $0.50 to
  $0.75 over cost) are stated as representative rules of thumb the operator edits, not
  as law -- every rate, price, and life is an editable input.
- Tile ids are kebab-case and checked against the post-v90 live ids. None collides
  with `cost-per-mile`, `deadhead-percent`, `fuel-tax-ifta`, `reefer-burn`, or any
  Group R business tile (see Section 3).

## 2. The tiles

### 2.1 `load-profitability` -- Per-Load Net Profit and Profit per Mile (Group J, calc-trucking.js)

`cost-per-mile` builds the average cost structure; this judges one specific load --
revenue minus the fuel, variable, fixed, toll, and accessorial costs of *these*
loaded-plus-deadhead miles -- and reports the net profit and the profit per loaded
mile, the number that decides whether to take it.

```
inputs:
  linehaul_revenue -    the load's total pay, including any fuel surcharge (dollars)
  loaded_miles     L    revenue (loaded) miles
  deadhead_miles   L    empty miles to reach the pickup (0 if none)
  fuel_price       -    diesel price (dollars per gallon)
  mpg              -    fuel economy (miles per gallon)
  variable_cpm     -    per-mile cost other than fuel: tires, maintenance, etc. (dollars/mile)
  fixed_per_day    -    fixed cost per day: truck payment, insurance, permits (dollars/day)
  days             -    days this load ties up the truck
  tolls            -    optional tolls for the trip (dollars; 0 = off)
  other_costs      -    optional lumpers / scales / accessorials (dollars; 0 = off)

total_miles            = loaded_miles + deadhead_miles
fuel_cost              = total_miles / mpg * fuel_price
variable_cost          = total_miles * variable_cpm
fixed_cost             = fixed_per_day * days
total_cost             = fuel_cost + variable_cost + fixed_cost + tolls + other_costs
net_profit             = linehaul_revenue - total_cost
profit_per_loaded_mile = net_profit / loaded_miles
rate_per_total_mile    = linehaul_revenue / total_miles
all_in_cpm             = total_cost / total_miles
```

Outputs: the total miles, the fuel cost, the total cost, the net profit, the profit
per loaded mile, the revenue per total mile, and the all-in cost per mile (the
break-even for this load). The note line states: deadhead miles burn fuel and hours
but earn nothing, so judge a load on *total* miles, not the loaded miles the rate is
quoted on; the all-in cost per mile is your break-even, and it consumes the same
fixed and variable structure `cost-per-mile` builds; a load that pays well per loaded
mile can still lose money after a long deadhead; and count the days the load ties up
the truck against the loads you turn down to take it.

**Worked example (pinned).** $2,200 revenue, 900 loaded + 150 deadhead miles, $4.00
diesel, 6.5 MPG, $0.20 variable CPM, $250/day fixed over 2 days, $40 tolls, $0
other: total miles = **1,050**; fuel = 1,050 / 6.5 x 4.00 = **$646.15**; variable =
1,050 x 0.20 = $210; fixed = 2 x 250 = $500; total cost = 646.15 + 210 + 500 + 40 =
**$1,396.15**; net profit = 2,200 - 1,396.15 = **$803.85**; profit per loaded mile =
803.85 / 900 = **$0.89**; revenue per total mile = 2,200 / 1,050 = **$2.10**; all-in
CPM = 1,396.15 / 1,050 = **$1.33**. Cross-check (the deadhead grows to 400 miles):
total 1,300, fuel $800, variable $260, total cost $1,600, net **$600**, profit per
loaded mile 600 / 900 = **$0.67** -- the extra deadhead cost $0.22 a loaded mile.
Cross-check (a cheap load, $1,500 revenue, base costs): net = 1,500 - 1,396.15 =
**$103.85**, profit per loaded mile **$0.12** -- marginal. Degenerate inputs
(loaded_miles <= 0, mpg <= 0, fuel_price <= 0, days <= 0, any negative input,
non-finite) return an error; tolls and other_costs of 0 are valid.

### 2.2 `fuel-surcharge` -- Fuel Surcharge per Mile, Pegged-Base Method (Group J, calc-trucking.js)

The standard fuel-surcharge math: peg a base price, pay the difference above it
divided by an assumed MPG, so each penny of diesel above the peg adds one-MPG-th of a
cent per mile.

```
inputs:
  current_fuel_price -    current diesel price, the DOE/EIA index or the contract index (dollars/gal)
  base_fuel_price    -    the pegged base below which no surcharge applies (dollars/gal)
  mpg_peg            -    the MPG basis written into the surcharge schedule (e.g. 6.0)
  loaded_miles       L    optional loaded miles, to total the surcharge (0 = off)

fsc_per_mile = current_fuel_price > base_fuel_price
                 ? (current_fuel_price - base_fuel_price) / mpg_peg
                 : 0
fsc_total    = loaded_miles > 0 ? fsc_per_mile * loaded_miles : null
```

Outputs: the fuel surcharge per mile and -- when miles are given -- the total
surcharge for the load. The note line states: the standard surcharge pegs a base
price and pays the difference above it divided by an assumed MPG, so a lower MPG peg
pays a higher surcharge (it assumes a thirstier truck); the DOE/EIA national average
diesel price, updated weekly, is the common index, but the contract names the index
that governs; below the pegged base the surcharge is zero; and a surcharge only
protects you from price swings if the contract actually has one -- negotiate it
before you sign, not after fuel spikes mid-haul.

**Worked example (pinned).** Current $4.25, base $3.00, MPG peg 6.0, 900 loaded
miles: surcharge per mile = (4.25 - 3.00) / 6.0 = 1.25 / 6.0 = **$0.2083/mile**;
total = 0.2083 x 900 = **$187.50**. Cross-check (a thirstier peg, MPG 5.0): (1.25) /
5.0 = **$0.25/mile**, total **$225.00**. Cross-check (price at the peg, $3.00 =
$3.00): surcharge = **$0** and total = **$0** -- no surcharge below the base.
Degenerate inputs (current_fuel_price <= 0, base_fuel_price <= 0, mpg_peg <= 0,
non-finite) return an error; a current price at or below the base is *not* an error
(it yields zero); loaded_miles = 0 returns a `null` total.

### 2.3 `maintenance-reserve` -- Maintenance and Replacement Reserve per Mile (Group J, calc-trucking.js)

The cents per mile to set aside now -- tires, routine PM, and the big-ticket
component reserve -- so the bills are already funded when they land. The total feeds
the variable cost in `cost-per-mile` and `load-profitability`.

```
inputs:
  tire_set_cost     -    cost of a full set of tires (dollars)
  tire_life_mi      L    expected tire life (miles)
  pm_cost           -    cost of one PM service: oil, filters, lube (dollars)
  pm_interval_mi    L    miles between PM services
  major_reserve_cpm -    optional cents-per-mile set-aside for major components:
                          clutch, injectors, turbo, in-frame overhaul (dollars/mile; 0 = off)
  monthly_miles     L    optional monthly mileage, to total the monthly set-aside (0 = off)

tire_cpm        = tire_set_cost / tire_life_mi
pm_cpm          = pm_cost / pm_interval_mi
total_cpm       = tire_cpm + pm_cpm + major_reserve_cpm
monthly_reserve = monthly_miles > 0 ? total_cpm * monthly_miles : null
```

Outputs: the tire cost per mile, the PM cost per mile, the total maintenance reserve
per mile, and -- when monthly mileage is given -- the dollars to set aside each
month. The note line states: maintenance is not free miles, so set the cents aside
now; tires and routine PM are predictable and divide cleanly into a per-mile cost;
the major-component reserve covers the big failures (clutch, turbo, injectors,
in-frame) that average to a few cents a mile over the truck's life; this reserve per
mile is part of the variable cost `cost-per-mile` and `load-profitability` consume;
and keep the reserve in a separate account so it is there when the bill is.

**Worked example (pinned).** Tires $4,000 over 80,000 miles, PM $350 every 25,000
miles, a $0.10/mile major reserve, 10,000 monthly miles: tire CPM = 4,000 / 80,000 =
**$0.050**; PM CPM = 350 / 25,000 = **$0.014**; total = 0.050 + 0.014 + 0.10 =
**$0.164/mile**; monthly = 0.164 x 10,000 = **$1,640**. Cross-check (shorter tire
life, 60,000 miles): tire CPM = **$0.0667**, total **$0.1807/mile**, monthly
**$1,807**. Cross-check (no major reserve, 0): total = **$0.064/mile**, monthly
**$640**. Degenerate inputs (tire_set_cost <= 0, tire_life_mi <= 0, pm_cost <= 0,
pm_interval_mi <= 0, any negative input, non-finite) return an error;
major_reserve_cpm = 0 is valid; monthly_miles = 0 returns a `null` monthly reserve.

## 3. Concept-check and wiring

Concept-checked against the post-v90 live tiles. `cost-per-mile` builds the *average*
fixed/fuel/maintenance/driver structure and a break-even rate; `load-profitability`
judges *one* load against its own loaded-plus-deadhead miles, tolls, and tie-up days
-- a different computation that consumes the average. `deadhead-percent` reports the
empty-mile penalty as a percentage and an effective rate; it does not net out the
load's dollar costs. `fuel-tax-ifta` is a jurisdictional fuel-tax apportionment, not
a contract fuel surcharge. No live tile computes per-load net profit, a pegged fuel
surcharge, or a maintenance reserve per mile. **All three ship**, into
`calc-trucking.js`.

Per-tile wiring (each of the three): a `tools-data.js` row (group `J`, trades
`["trucking", "logistics"]` -- the trade tags the existing Group J rows use);
`tile-meta.js` `_TILES`; a `citations.js` entry (the `GOVERNANCE.trucking` governance
from Section 1; the formula string; assumptions listing the DOE/EIA index, the pegged
fuel-surcharge identity, the cost-per-mile structure consumed, and the benchmark CPM
and margin ranges, naming the owner-operator cost references without reproduction);
`test/fixtures/worked-examples.json` (every pinned example and cross-check);
`test/fixtures/compute-map.js` (module path `../../calc-trucking.js`);
`scripts/related-tiles.mjs` (`load-profitability` -> `cost-per-mile` /
`deadhead-percent` / `fuel-surcharge`; `fuel-surcharge` -> `load-profitability` /
`cost-per-mile` / `fuel-tax-ifta`; `maintenance-reserve` -> `cost-per-mile` /
`load-profitability`); `data/search/aliases.json` (e.g. `load-profitability`: "load
profit", "is this load worth it", "profit per mile", "load calculator", "rate per
mile"; `fuel-surcharge`: "fuel surcharge", "fsc", "fuel peg", "doe diesel", "fuel
adjustment"; `maintenance-reserve`: "maintenance reserve", "tire reserve",
"replacement reserve", "cents per mile maintenance", "overhaul fund"); the `app.js`
`TRUCKING_RENDERERS` declare gains all three ids; the `// dims:` annotations; and the
regenerated v14 corpus + tile-index. A `test/unit/bounds-fuzzer.test.js` block pins
every worked example, the zero-surcharge-below-peg seam, both `null`-output branches,
and every error seam.

**Module note.** `calc-trucking.js` is the home of every Group J tile, so the three
land there. It is at ~18.3 KB gzipped against a 19,500 B cap; the three tiles push it
over, so this spec **raises the `calc-trucking.js` cap** in
`scripts/check-module-sizes.mjs` to about **22,500 B** (current plus the three tiles
plus the documented ~20% headroom), the documented-cap-bump pattern v67/v69 used. If
the as-built size warrants it, the maintainer may instead split a Group J bench into
a new module (the spec-v70..v89 precedent); either way the module-size gate stays
green. Group letter (`J`) is independent of the module.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates;
`check-readme-counts` agrees at **640 tiles** and the matching sitemap URL count);
`npm test` (+3 worked-example fixtures and their cross-checks; the new bounds-fuzzer
block); `npm run build` (640 tile shells, regenerated sitemap); `npm run
data:verify`; the worked-examples runner; the 320 px shell audit (the net profit /
profit-per-mile / all-in-CPM breakdown, the surcharge per mile and total, and the
tire / PM / total reserve lines all wrap, not scroll, on a phone); and the
full-catalog render-no-nan Chromium sweep plus the a11y gate, with the rendered
output read to the value ($2,200 / 900 + 150 mi / 6.5 MPG -> $803.85 net and $0.89 a
loaded mile; $4.25 over a $3.00 peg at 6 MPG -> $0.2083 a mile; $4,000 / 80k tires +
$350 / 25k PM + $0.10 -> $0.164 a mile).

## 5. Roadmap position

v91 turns Group J's average cost numbers into per-load decisions, linking the new
tiles to the bench (`load-profitability` and `maintenance-reserve` consume the
`cost-per-mile` structure; `fuel-surcharge` feeds the revenue side of
`load-profitability`). Further growth should stay evidence-driven (a named gap an
owner-operator hits) -- candidates include a detention / demurrage tile, a truck-lease
versus buy comparison (which overlaps Group R and should land only with a named
trucking-specific need), and a load-board rate-confirmation checklist; none ships
without the field need. The standing module-cap watch adds `calc-trucking.js` after
this bump.
