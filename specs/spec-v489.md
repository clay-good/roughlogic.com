# roughlogic.com Specification v489 -- EV Charge Cost at the Meter (calc-solar.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-solar.js`**
> (Group A, the solar / battery / EV-charging bench); no new module, group, or dependency. Inherits spec.md through
> spec-v488.md.
>
> **The gap, and the evidence for it.** `ev-charge-time` (spec-v488) answers how long a charge takes; it never answers
> what it costs, and its own roadmap named a "cost-per-charge companion (kWh x rate net of efficiency)" as a deliberate
> follow-on. This is that tile. The arithmetic is simple -- energy x rate -- but it exists to flag the one number every
> EV owner and fleet estimator gets wrong: **you pay for kWh at the meter, not at the battery.** The car's dashboard
> reports the energy that landed in the pack, but AC Level 2 charging loses roughly 10-15% to the onboard rectifier and
> thermal management, so the utility meter always turns more than the pack shows. A driver who multiplies 45 kWh of
> battery energy by the electric rate under-counts the bill by that loss every single time. The tile makes the haircut
> the headline: it grosses the battery energy up by the charging efficiency to the energy actually drawn from the grid,
> prices that, and returns both the cost and the effective cost per stored kWh -- and an optional cost-per-mile when the
> vehicle's efficiency (mi/kWh) is supplied. That lets the owner compare cheap overnight home charging against a public
> DC fast charger honestly, on the number the utility actually bills.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The battery capacity, the
energy to the battery, and the energy drawn from the grid are energies (`M L^2 T^-2`); the state-of-charge and
efficiency percents are `dimensionless`; the vehicle efficiency (mi/kWh) is `L^-2 M^-1 T^2` in principle but, like every
other cost tile in the bench (`battery-tou-arbitrage`, `motor-operating-cost`), the electricity **rate** (USD/kWh), the
**cost** (USD), the **cost per stored kWh** (USD/kWh), the **cost per mile** (USD/mi), and the mi/kWh input are carried
as `dimensionless` to the lint -- currency and mileage are not physical dimensions. The v18/v21 contract: any non-finite
input, a non-positive battery capacity, a negative rate, a start state of charge outside 0-100, a target at or below the
start or above 100, an efficiency outside 0-100 (a positive efficiency is required so the grid draw is finite), or a
negative mi/kWh returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the charge-cost relation by
name; `editionNote` names the **EV charge-cost-at-the-meter model (energy metered = energy stored / charging
efficiency)**, prints `energy_to_battery = capacity x (target - start) / 100`, `grid_energy = energy_to_battery /
efficiency`, `cost = grid_energy x rate`, and `cost_per_stored_kwh = rate / efficiency`, and states that **the utility
meter draws more kWh than the battery stores because AC Level 2 charging loses about 10-15% to the onboard rectifier and
thermal load (so pricing the battery energy alone under-counts the bill), the constant-rate model ignores tiered and
time-of-use pricing and demand charges, and the local tariff and the vehicle's actual charging behavior govern** -- a
planning estimate, not a metered invoice.

## 2. The tile

### 2.1 `ev-charge-cost` -- What One EV Charge Costs at the Meter, Not the Battery

```
inputs:
  battery_capacity_kwh  kWh      the vehicle's usable battery capacity
  start_soc_pct         %        the starting state of charge
  target_soc_pct        %        the target state of charge (default 80)
  electricity_rate      $/kWh    the all-in energy rate at the meter
  efficiency_pct        %        charging efficiency (default 88)
  miles_per_kwh         mi/kWh   optional vehicle efficiency (0 = skip cost-per-mile)

energy_to_battery   = battery_capacity x (target_soc - start_soc) / 100    [kWh]
grid_energy         = energy_to_battery / (efficiency / 100)               [kWh]   metered, > battery energy
cost                = grid_energy x electricity_rate                       [$]
cost_per_stored_kwh = electricity_rate / (efficiency / 100)                [$/kWh]
cost_per_mile       = miles_per_kwh > 0 ? cost / (energy_to_battery x miles_per_kwh) : null   [$/mi]
```

**Pinned worked example (a 75 kWh EV, 20% to 80%, at $0.15/kWh).** The pack takes
`75 x (80 - 20) / 100 = ` **45 kWh**. At 88% charging efficiency the meter must supply `45 / 0.88 = ` **51.1 kWh**, so
the cost is `51.1 x 0.15 = ` **$7.67** -- not the `45 x 0.15 = $6.75` the dashboard math implies; the 12% loss is
$0.92 of that bill, invisible on the car's screen but real on the utility statement. The effective
`cost_per_stored_kwh = 0.15 / 0.88 = ` **$0.170/kWh**. At 3.5 mi/kWh the 45 kWh buys `45 x 3.5 = 157.5` miles, so
`cost_per_mile = 7.67 / 157.5 = ` **$0.049/mi** -- about a nickel a mile, the figure that undercuts a gas car.
**Cross-check (a public DC fast charger is nearly triple).** Put the same 45 kWh session on a $0.45/kWh DC fast charger
at 92% efficiency (DC bypasses the onboard AC rectifier, so it loses less): `grid_energy = 45 / 0.92 = 48.9 kWh`,
`cost = 48.9 x 0.45 = ` **$22.01**, and `cost_per_stored_kwh = 0.45 / 0.92 = $0.489/kWh` -- nearly 3x the home cost, the
number that shows a home EVSE pays for itself in charging savings. The tile returns the battery energy, the metered grid
energy, the cost, the effective cost per stored kWh, and (when a mi/kWh is given) the cost per mile.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical", "solar"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the home-charging example +
the DC-fast-charger cross-check); `test/fixtures/compute-map.js` (`ev-charge-cost` -> `computeEvChargeCost` in
`../../calc-solar.js`); `scripts/related-tiles.mjs` (-> `ev-charge-time` / `ev-charger-load` / `battery-tou-arbitrage`);
`data/search/aliases.json` ("ev charge cost", "cost to charge", "charging cost", "cost per charge", "cost per mile ev",
"electricity cost to charge", "home charging cost", "dc fast charge cost"); the id appended to the solar renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the efficiency haircut (grid energy strictly exceeds battery energy for efficiency < 100), the
cost-per-mile branch (present with a positive mi/kWh, null at zero), and the error seams (non-finite, non-positive
capacity, negative rate, out-of-range SOC and efficiency, non-positive efficiency, target <= start). Hand-writes its
renderer (mirroring the calc-solar.js `ev-charge-time` / `battery-c-rate` pattern). Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the energy / grid-energy / cost / per-mile stack wraps on a phone -- comma-space the long tokens);
render-no-nan + a11y on the new tile, output read to the value (the $0.15/kWh example -> $7.67).

## 5. Roadmap position

Completes the EV-charging trio beside `ev-charger-load` (the NEC 625 circuit) and `ev-charge-time` (the hours): this tile
is the dollars, on the meter's number rather than the dashboard's. A time-of-use aware variant (charging inside an
off-peak window), a solar-surplus self-consumption credit, and a gas-vs-EV per-mile head-to-head are deliberate future
follow-ons. Further Group A growth stays evidence-driven.
