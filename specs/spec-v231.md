# roughlogic.com Specification v231 -- LED Lighting Retrofit Savings and Payback (calc-service.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-06-30). Batch spec-v230..v232 (the electrical energy-cost-savings trio -- VFD retrofit, LED
> lighting retrofit, and power-factor demand billing). This spec is the middle of the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the lighting retrofit is quoted and installed by
> the electrician. Adds one tile to **`calc-service.js`** (Group A); no new module, group, or dependency. Inherits
> spec.md through spec-v230.md.
>
> **The gap, and the evidence for it.** The catalog computes the code lighting load for the panel
> (`commercial-lighting-load`, the Table 220.12 unit load) and the lighting design (`lumen-method`,
> `point-illuminance`), but nothing computes the retrofit savings -- the single most common energy job an electrician
> quotes. A fixture swap trades installed watts for fewer installed watts; the value is the wattage reduction times the
> annual burn hours times the energy rate, plus the demand-charge reduction if the load runs at the utility peak, and
> the payback against the install cost. Those are the four numbers on every lighting proposal, and the demand-charge
> term -- which the catalog has nowhere to compute -- often shortens the payback by a third. The catalog can size the
> breaker for the new fixtures but cannot tell the customer what the swap saves or when it pays back.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The per-fixture wattages
are a power (W); the demand reduction is a power (kW); the annual energy saved is an energy (kWh); the annual burn hours
are a time (h); the fixture count is `dimensionless`; the energy rate, demand charge, install cost, and dollar savings
are currency figures (USD, as the existing economic tiles carry them); the payback is a time (years). The v18/v21
contract: any non-finite input, a non-positive fixture count / hours, a negative wattage / rate / demand charge / cost,
or a new wattage exceeding the existing wattage (no saving), returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the savings and payback relations by name; `editionNote` names the standard
**energy-and-demand savings method** (`kWh_saved = fixtures * (W_old - W_new) / 1000 * hours`, demand savings at the
utility's $/kW-month, simple payback = cost / annual savings), and states that **the burn hours are the actual annual
operating hours (a controls or occupancy-sensor retrofit changes them and is a separate credit), the demand savings
apply only to the reduction coincident with the billed peak, an air-conditioned space also gains a cooling-energy credit
(and a heated space a small heating penalty) not included here, utility rebates are additive, and this is a simple
payback, not a discounted life-cycle analysis** -- a proposal number, not a settled measurement-and-verification.

## 2. The tile

### 2.1 `lighting-retrofit-savings` -- LED Retrofit Energy, Demand, and Payback

```
inputs:
  fixtures         dimensionless  number of fixtures retrofitted
  watts_existing   W              existing input watts per fixture (lamp + ballast)
  watts_new        W              new input watts per fixture (LED + driver)
  annual_hours     h              annual operating hours
  rate_kwh         USD/kWh        energy rate, $/kWh
  demand_per_kw_mo USD/kW-mo      demand charge per kW-month (default 0)
  install_cost     USD            total installed cost (default 0 -> payback null)

kw_saved      = fixtures * (watts_existing - watts_new) / 1000
kwh_saved     = kw_saved * annual_hours
energy_usd    = kwh_saved * rate_kwh
demand_usd    = kw_saved * demand_per_kw_mo * 12
annual_usd    = energy_usd + demand_usd
payback_years = install_cost > 0 ? install_cost / annual_usd : null
```

**Pinned worked example (100-fixture office, four-lamp T8 to LED).** One hundred fixtures cut from 128 W (a four-lamp
T8 troffer) to 44 W (an LED retrofit), 4,000 h/yr, $0.12/kWh, a $12/kW-month demand charge, $8,000 installed:
`kw_saved = 100 * (128 - 44) / 1000 = 8.4 kW`; `kwh_saved = 8.4 * 4,000 = 33,600 kWh`;
`energy_usd = 33,600 * 0.12 = $4,032`; `demand_usd = 8.4 * 12 * 12 = $1,210`; `annual_usd = 4,032 + 1,210 = $5,242`;
`payback = 8,000 / 5,242 = ` **1.53 years**. **Cross-check (no demand charge).** The same job on a small-commercial rate
with no demand charge (`demand_per_kw_mo = 0`): `annual_usd = $4,032`; `payback = 8,000 / 4,032 = ` **1.98 years**. The
demand charge alone -- the same 8.4 kW, billed on the peak twelve months a year -- adds $1,210 and pulls the payback in
by nearly half a year, which is why a lighting proposal that ignores the demand side understates its own case.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, the savings and payback relations, `editionNote` naming the energy-and-demand savings method with
the burn-hours / peak-coincident-demand / cooling-credit / simple-payback caveats); `test/fixtures/worked-examples.json`
(the demand-charge example + the no-demand cross-check); `test/fixtures/compute-map.js` (`lighting-retrofit-savings` ->
`computeLightingRetrofitSavings` in `../../calc-service.js`); `scripts/related-tiles.mjs` (-> `commercial-lighting-load`
/ `lumen-method` / `vfd-energy-savings`); `data/search/aliases.json` ("lighting retrofit", "led retrofit", "lighting
upgrade savings", "fixture swap savings", "watts saved", "lighting payback", "demand charge savings", "energy retrofit");
the id appended to the existing service renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus
+ tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, fixtures / hours <= 0,
negative wattage / rate / cost, new watts >= existing watts, the zero-cost null-payback path). Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the null-payback path); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the kW-saved / kWh / energy-$ / demand-$ / annual-$ /
payback stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (100 fixtures / 128 to 44 W ->
$5,242/yr, 1.53 yr).

## 5. Roadmap position

The middle of the electrical energy-cost-savings batch (v230..v232). Complements `commercial-lighting-load` (the panel
load) with the retrofit case, and sits between `vfd-energy-savings` (v230) and `power-factor-billing-savings` (v232). A
cooling-energy interaction credit (tying into the v227..v229 cooling-load tiles) and a discounted life-cycle / rebate
mode are deliberate future follow-ons.
