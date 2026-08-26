# roughlogic.com Specification v1359 -- Covers and Sales per Labor Hour (calc-kitchen.js, Group O, kitchen and food service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, kitchen and food service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group O prices plates and computes prime cost, but the productivity half of prime cost -- covers per labor hour and sales per labor hour -- is not in the catalog. These are the two numbers a manager schedules against, and computing them alongside labor cost percentage is what turns a schedule into a decision.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive labor hour count, or a negative cover count, sales figure, or labor cost, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the standard food-service productivity measures (CPLH, SPLH, labor cost percentage), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `covers-per-labor-hour` -- Covers and Sales per Labor Hour

```
CPLH             = covers / labor hours
SPLH             = net sales / labor hours
labor cost %     = labor cost / net sales x 100
average check    = net sales / covers
labor $ per cover= labor cost / covers
```

Labor cost percentage alone cannot tell a manager whether a shift was staffed right, because it moves when the
menu price moves. Covers per labor hour is menu-price-independent: it measures throughput. Sales per labor hour
sits in between, and it is the one that scales across concepts -- a fine-dining room with 2 CPLH and a $90 check
can be more productive per hour worked than a diner at 8 CPLH and a $14 check.

Reporting all five together is what makes the tile useful. A shift with a good labor percentage and a bad CPLH
was carried by a high check average, not by the schedule.

**Inputs:** covers served, total labor hours worked, net sales, total labor cost for the period.

**Outputs:** covers per labor hour, sales per labor hour, labor cost percentage, average check, and labor dollars
per cover.

## 3. Worked example

A dinner period: 420 covers, 96 labor hours across front and back of house, $12,600 net sales, $1,680 labor cost:

```
CPLH          = 420 / 96        = 4.38 covers per labor hour
SPLH          = 12,600 / 96     = $131.25
labor cost %  = 1,680 / 12,600  = 13.3%
average check = 12,600 / 420    = $30.00
labor / cover = 1,680 / 420     = $4.00
```

A 13.3% labor cost is strong, but note what carried it: SPLH of $131 on a $30 check means each labor hour turned
4.4 covers. Cut eight hours from the schedule and CPLH goes to 4.77 and labor to 12.2% -- if the covers still get
served. That last clause is the judgment the tile cannot make.

## 4. Scope and non-goals

Measurement, not scheduling. The tile takes labor hours and cost as given and does not build a schedule, forecast
covers, apply overtime rules, or distinguish front-of-house from back-of-house productivity, which move
independently and should be tracked separately. Labor cost here is wages as entered; whether it includes payroll
taxes, benefits, and workers' compensation changes the percentage materially -- the catalog's fully-burdened
labor rate tile is where that conversion belongs. Wage-and-hour law and the payroll system govern.
