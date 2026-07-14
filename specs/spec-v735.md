# roughlogic.com Specification v735 -- Motor Run Hours for an Energy Budget (calc-motor.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-motor.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v734.md. Explore sweep #12 (entry 6).
>
> **The gap, and the evidence for it.** The `motor-operating-cost` tile runs the energy charge forward: from the run-hours
> it returns the annual cost. The facilities question is the inverse -- **how many run-hours an energy budget buys**. From
> `annual_cost = input_kW x run_hours x rate` with `input_kW = HP x 0.746 x load / efficiency`,
> `run_hours = budget / (input_kW x rate)`. The number this settles: a **25 HP** motor at **93%** and **$0.12/kWh** draws
> 20.05 kW, so a **$5,000** budget covers about **2,078 hours**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`motor-operating-cost` sibling: the horsepower, efficiency, load, and rate carry the sibling's dimensionless treatment,
the returned run-hours are `T`, and the input power and annual energy carry the sibling's convention. It reuses the
sibling's `input_kW = HP x 0.746 x load / efficiency` relation, solved for the run hours. The v18/v21 contract: any
non-finite input, a non-positive horsepower, a non-positive budget, an efficiency outside (0, 100], a non-positive load
(a motor at zero load draws no billable energy, and the term is a denominator), or a non-positive rate returns
`{ error }`. Citation discipline (v19/v22): the input-power relation solved for the run hours, `GOVERNANCE.general`
matching the sibling; the note states this is the **energy charge only** (the utility tariff -- demand, time-of-use,
power-factor -- governs the full bill, so the real hours are fewer) and that there are about **8,760 hours** in a year.

## 2. The tile

### 2.1 `motor-run-hours-for-budget` -- Motor Run Hours for an Energy Budget

```
inputs:
  hp                dimensionless rated horsepower (> 0)
  efficiency_pct    dimensionless full-load efficiency (0 < e <= 100; default 93)
  load_factor_pct   dimensionless average load (> 0; default 100)
  rate_usd_per_kwh  dimensionless energy rate ($/kWh, > 0; default 0.12)
  cost_budget_usd   dimensionless annual energy budget ($, > 0)

input_kw           = hp x 0.746 x (load_factor_pct/100) / (efficiency_pct/100)
max_hours_per_year = cost_budget_usd / (input_kw x rate_usd_per_kwh)
annual_kwh         = input_kw x max_hours_per_year
```

**Pinned worked example.** HP = 25, eff = 93%, load = 100%, rate = $0.12, budget = $5,000:
`input_kW = 25 x 0.746 x 1.0 / 0.93 = 20.05 kW`, `max_hours = 5000 / (20.05 x 0.12) = ` **2,078 hr/yr**. Feeding 2,078 hr
back through `motor-operating-cost` at the same motor returns a $5,000 annual cost, the budget. Doubling the budget to
$10,000 doubles the hours to ~4,155.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`) placed beside `motor-operating-cost` (Group A is not
exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (input-power relation solved for the run
hours, `GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`motor-run-hours-for-budget` -> `computeMotorRunHoursForBudget`);
`scripts/related-tiles.mjs` (-> `motor-operating-cost` / `motor-shaft-torque` / `pf-correction`);
`data/search/aliases.json` (5 collision-checked question aliases: "motor run hours for budget", "how long can I run
motor", ...); the calc-motor `MOTOR_RENDERERS` map entry via a hand-written renderer (five number fields) and the id added
to the calc-motor declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeMotorOperatingCost` across an HP/efficiency/load/rate/budget sweep, the bigger-budget-more-hours and
higher-rate-fewer-hours monotonicity, and the error seams. The calc-motor.js gzip cap (13500 B) holds. Verify at build,
including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,183 -> 1,184.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 2,078 hr/yr for a 25 HP
motor at 93% and $0.12/kWh on a $5,000 budget).

## 5. Roadmap position

Pairs the forward cost tile (`motor-operating-cost`, cost from the hours) with its inverse (the hours for a budget), the
two halves of the motor-energy question. Continues Explore sweep #12; further Group A motor growth stays evidence-driven.
