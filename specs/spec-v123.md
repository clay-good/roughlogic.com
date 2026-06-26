# roughlogic.com Specification v123 -- Motor Input Power and Annual Operating Cost (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED 2026-06-23 (package 0.73.0; part of catalog 600 -> 608). Batch spec-v121..v128.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one electrical tile from first-principles electrical-input power
> and the 0.746 kW-per-HP identity, public physics, utility-tariff governed, redo-not-harm. Adds one
> tile to **`calc-electrical.js`** (Group A); no new module, group, or dependency. Inherits spec.md
> through spec-v122.md.
>
> **The gap, and the evidence for it.** The catalog sizes motor circuits and now computes motor
> speed (v121) and torque (v122), but never the operating cost -- the input kilowatts drawn at the
> motor's efficiency, the annual kilowatt-hours at a given duty, and the energy dollars. That cost,
> and the efficiency-driven delta between a standard and a premium-efficiency motor, is the number
> that justifies a retrofit and that an electrician is routinely asked to put on a quote.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Horsepower and input power are power (`M L^2 T^-3`), run hours are `T`, energy is `M L^2 T^-2`
(kWh), efficiency and load factor are `dimensionless`, and the energy rate is dollars per kWh. The
bundled 0.746 kW/HP constant is an annotated editable field. The v18/v21 contract: any non-finite
input, a non-positive horsepower or run-hours, or an efficiency outside (0, 100], returns
`{ error }`; the only division is by a guarded-positive efficiency. Citation discipline (v19/v22):
`GOVERNANCE.general` over input_kW = HP x 0.746 x load / efficiency and the kWh x rate cost; the
utility tariff and metered demand govern the actual bill.

## 2. The tile

### 2.1 `motor-operating-cost` -- Motor Input Power, Annual Energy, and Cost

```
inputs:
  hp                 M L^2 T^-3     rated motor horsepower
  efficiency_pct     dimensionless  full-load efficiency (default 93)
  load_factor_pct    dimensionless  average load as percent of rated (default 100)
  hours_per_year     T              annual run hours
  rate_usd_per_kwh   $ / (M L^2 T^-2)  energy charge (default 0.12)

input_kw    = hp x 0.746 x (load_factor_pct/100) / (efficiency_pct/100)
annual_kwh  = input_kw x hours_per_year
annual_cost = annual_kwh x rate_usd_per_kwh
```

**Pinned worked example.** 25 HP, 93 % efficient, 100 % load, 4,000 run-hours/yr, $0.12/kWh:
`input_kw = 25 x 0.746 / 0.93 = 20.05 kW`; `annual_kwh = 20.05 x 4000 = 80,215 kWh`;
`annual_cost = 80,215 x 0.12 = $9,626`. **Cross-check (premium motor).** The same duty at 95 %
efficiency: `input_kw = 25 x 0.746 / 0.95 = 19.63 kW`, `annual_cost = $9,422` -- a $204/yr energy
saving from two efficiency points, the basis of a payback calculation. The utility tariff (demand
charges, time-of-use, power-factor penalties) governs the full bill; this tile is the energy-charge
component only.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the input-power and cost formulas, the 0.746 kW/HP
constant listed, `editionNote` single-edition first-principles, an assumption noting the result is
the energy charge only and excludes demand / TOU / PF penalties); `test/fixtures/worked-
examples.json` (example + cross-check); `test/fixtures/compute-map.js` (`motor-operating-cost` ->
`computeMotorOperatingCost` in `../../calc-electrical.js`); `scripts/related-tiles.mjs` (->
`motor-shaft-torque` / `motor-fla` / `pf-correction`); `data/search/aliases.json` ("motor energy
cost", "operating cost", "kwh", "premium efficiency", "motor payback", "input kw"); the id appended
to the existing `ELECTRICAL_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, cross-check, and error
seams (non-finite, hp <= 0, hours <= 0, efficiency outside (0,100]). Raise the `calc-electrical.js`
size cap by ~20 percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-
loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the input-kW, annual-kWh, and
cost lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (25 HP / 93 % /
4,000 hr / $0.12 -> 20.05 kW, 80,215 kWh, $9,626).

## 5. Roadmap position

Closes the motor-performance family (speed v121, torque v122, operating cost) and ties to
`pf-correction` for the demand-side picture. Further Group A growth stays evidence-driven.
