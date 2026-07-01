# roughlogic.com Specification v232 -- Power-Factor Correction Demand-Billing Savings (calc-service.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-06-30). Batch spec-v230..v232 (the electrical energy-cost-savings trio -- VFD retrofit, LED
> lighting retrofit, and power-factor demand billing). This closes the v230..v232 batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: power-factor correction is engineered and installed
> by the electrician. Adds one tile to **`calc-service.js`** (Group A, alongside the existing `pf-correction`); no new
> module, group, or dependency. Inherits spec.md through spec-v231.md.
>
> **The gap, and the evidence for it.** The catalog sizes the capacitor for a target power factor (`pf-correction`, the
> kVAR) and solves the power triangle (`power-triangle`), but it never puts a dollar figure on why the customer would
> buy the capacitor. A facility with a low power factor draws more apparent power (kVA) than it uses real power (kW),
> and the utility bills the demand in kVA -- or adds an explicit low-power-factor penalty -- so correcting the power
> factor cuts the billed demand every month, and the same reduction releases transformer and feeder capacity that would
> otherwise force a service upgrade. The savings is the kVA reduction times the demand charge, twelve months a year, and
> it usually pays the capacitor bank back in under a year. The catalog can size the bank but cannot tell the customer
> the annual dollars it returns.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The real power is a power
(kW); the apparent power and its reduction are an apparent power (kVA); the correcting capacitor is a reactive power
(kVAR); the power factors are `dimensionless`; the demand charge, the capacitor cost, and the dollar savings are
currency figures (USD, as the existing economic tiles carry them); the payback is a time (years). The v18/v21 contract:
any non-finite input, a non-positive real power, a power factor (existing or target) outside 0 (exclusive) to 1, a
target power factor not greater than the existing, or a negative demand charge / cost, returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the apparent-power and demand-savings relations by name; `editionNote`
names the **power-triangle demand-billing method** (`kVA = kW / pf`, correcting capacitor
`kVAR = kW * (tan(acos(pf_old)) - tan(acos(pf_new)))`, demand savings = kVA reduction times the $/kVA-month, twelve
months), and states that **the utility rate structure governs (some bill demand directly in kVA, some in kW with a
separate low-power-factor penalty clause -- the user enters the effective $/kVA-month), the kVA reduction also releases
that much transformer and feeder capacity (deferring a service upgrade, a benefit beyond the demand line), harmonics and
switching transients require a detuned or filtered bank the sizing here does not address, and this is a billing
estimate, not a rate-tariff analysis** -- a proposal number, not a settled utility credit.

## 2. The tile

### 2.1 `power-factor-billing-savings` -- Demand Savings and Payback from PF Correction

```
inputs:
  real_power_kw       kW             billed real power (average or peak demand), kW
  pf_existing         dimensionless  existing power factor, 0-1
  pf_target           dimensionless  target power factor, 0-1 (default 0.95), must exceed pf_existing
  demand_per_kva_mo   USD/kVA-mo     demand charge per kVA-month
  capacitor_cost      USD            installed capacitor-bank cost (default 0 -> payback null)

kva_existing  = real_power_kw / pf_existing
kva_target    = real_power_kw / pf_target
kva_reduction = kva_existing - kva_target                       # also the released service capacity
kvar_needed   = real_power_kw * (tan(acos(pf_existing)) - tan(acos(pf_target)))
annual_usd    = kva_reduction * demand_per_kva_mo * 12
payback_years = capacitor_cost > 0 ? capacitor_cost / annual_usd : null
```

**Pinned worked example (400 kW plant, 0.78 to 0.95).** A 400 kW facility at 0.78 power factor, corrected to 0.95, on
an $8/kVA-month demand rate, with a $5,685 capacitor bank: `kva_existing = 400 / 0.78 = 512.8 kVA`;
`kva_target = 400 / 0.95 = 421.1 kVA`; `kva_reduction = 91.8 kVA`;
`kvar_needed = 400 * (tan(acos 0.78) - tan(acos 0.95)) = 400 * (0.802 - 0.329) = 189.4 kVAR`;
`annual_usd = 91.8 * 8 * 12 = $8,810/yr`; `payback = 5,685 / 8,810 = ` **0.65 years** (and 91.8 kVA of service capacity
freed). **Cross-check (already-decent 0.90 to 0.95).** The same plant already at 0.90 power factor, corrected to 0.95:
`kva_existing = 400 / 0.90 = 444.4 kVA`; `kva_target = 421.1 kVA`; `kva_reduction = 23.4 kVA`;
`annual_usd = 23.4 * 8 * 12 = $2,246/yr`. Closing the last tenth of power factor returns a quarter of what the first fix
did -- power-factor correction has sharply diminishing returns above about 0.9, which is why 0.95, not unity, is the
usual target and why a plant already near 0.9 is a weaker candidate than one dragging at 0.78.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, the apparent-power and demand-savings relations, `editionNote` naming the power-triangle
demand-billing method with the rate-structure / released-capacity / harmonics / billing-estimate caveats);
`test/fixtures/worked-examples.json` (the 0.78 example + the 0.90 cross-check); `test/fixtures/compute-map.js`
(`power-factor-billing-savings` -> `computePowerFactorBillingSavings` in `../../calc-service.js`);
`scripts/related-tiles.mjs` (-> `pf-correction` / `power-triangle` / `motor-capacitor-max`); `data/search/aliases.json`
("power factor penalty", "pf penalty", "demand charge savings", "kva demand", "power factor billing", "capacitor
payback", "released capacity", "pf correction savings"); the id appended to the existing service renderers declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples and error seams (non-finite, real power <= 0, power factor out of 0 to 1, target not greater than existing,
negative demand charge / cost, the null-payback path). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the null-payback path); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the kVA-before / kVA-after / reduction / kVAR / annual-$ /
payback stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (400 kW / 0.78 to 0.95 -> 91.8 kVA,
$8,810/yr).

## 5. Roadmap position

Closes the electrical energy-cost-savings batch (v230..v232). Turns the `pf-correction` capacitor sizing and the
`power-triangle` into the demand-bill business case, completing the trio with `vfd-energy-savings` (v230) and
`lighting-retrofit-savings` (v231). A released-capacity service-upgrade-deferral valuation and a detuned-harmonic-filter
bank mode are deliberate future follow-ons.
