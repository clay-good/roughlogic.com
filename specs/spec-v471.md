# roughlogic.com Specification v471 -- Premium Motor Upgrade Energy Savings (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of an electrical energy-efficiency trio (v471 premium motor upgrade ->
> v472 transformer loading efficiency -> v473 economic conductor sizing). The catalog prices a VFD retrofit and an LED
> retrofit, but not the classic motor question -- what a NEMA Premium motor saves over a standard one.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A more efficient motor draws less power for the same
> shaft output, so the annual saving is the difference in input power times the run hours and the electricity rate. Input
> power is `hp * 0.746 * load / efficiency`, so upgrading from a standard efficiency to NEMA Premium cuts the input by the
> ratio of the efficiencies. `vfd-energy-savings` and `led-retrofit-payback` cover other retrofits; nothing does the motor
> efficiency upgrade. This adds the motor tile to the existing **`calc-electrical.js`** module (Group A); no new group,
> trade, or dependency. Inherits spec.md through spec-v470.md.
>
> **The gap, and the evidence for it.** A `50 hp` motor running at `75%` load for `4000 hours` a year at `$0.12/kWh` draws
> `50 * 0.746 * 0.75 / 0.90 = 31.1 kW` at `90%` efficiency but only `29.6 kW` at `94.5%` (NEMA Premium); the `1.48 kW`
> difference over `4000 hours` at `$0.12` is `$710` a year, which pays back the premium price differential in a couple of
> years. No tile does this; a contractor weighing a premium motor had the VFD and LED tiles but not the motor efficiency
> comparison.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The horsepower is a power
(hp); the load and efficiencies are dimensionless (fractions); the run hours are a time (hr); the rate is a cost per energy
(USD/kWh); the input powers are powers (kW); the saving is currency (USD/yr). The v18/v21 contract: any non-finite input, or
a non-positive horsepower, or an efficiency outside `(0, 1]`, returns `{ error }`; the tile reports the standard and premium
input power, the demand reduction, and the annual saving. Citation discipline (v19/v22): `GOVERNANCE.general` over the motor
efficiency upgrade by name; `editionNote` names **the motor input power `= hp * 0.746 * load / efficiency` (`0.746 kW/hp`),
the annual saving `= (kW_standard - kW_premium) * hours * rate`, and NEMA Premium / MG-1 nominal efficiencies as the source
of the efficiency values**, and states that **this returns the energy saving of a higher-efficiency motor, that nameplate
nominal efficiencies and the actual load point govern, and that it is an estimating aid, not a substitute for a metered
comparison**.

## 2. The tile

### 2.1 `motor-efficiency-upgrade-savings` -- Premium Motor Upgrade Energy Savings

```
inputs:
  hp             hp       motor horsepower
  load           -        load fraction (0-1)
  eff_standard   -        existing motor efficiency
  eff_premium    -        premium motor efficiency
  hours          hr       annual run hours
  rate_kwh       USD/kWh  electricity rate

kw_standard = hp * 0.746 * load / eff_standard
kw_premium  = hp * 0.746 * load / eff_premium
annual_saving = (kw_standard - kw_premium) * hours * rate_kwh
```

**Pinned worked example (50 hp, 75% load, 90% -> 94.5%, 4000 hr, $0.12).** `kW standard = 31.08`, `kW premium = 29.60`;
`saving = (31.08 - 29.60) * 4000 * 0.12 = $710/yr`. **Cross-check (a fully loaded motor saves more).** At `100%` load the
input rises and the annual saving grows to about `$947`, because the fixed efficiency gap acts on more power. A non-positive
horsepower or an out-of-range efficiency takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, beside `vfd-energy-savings` / `led-retrofit-payback`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, motor efficiency upgrade, `editionNote` naming
the input-power and annual-saving relations and the NEMA Premium source); `test/fixtures/worked-examples.json` (the 75%
example + the full-load cross-check); `test/fixtures/compute-map.js` (`motor-efficiency-upgrade-savings` ->
`computeMotorEfficiencyUpgradeSavings` in `../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `vfd-energy-savings` /
`led-retrofit-payback` / `motor-fla` / `power-factor-billing-savings`); `data/search/aliases.json` ("motor efficiency
savings", "premium motor", "nema premium", "efficient motor payback", "motor upgrade savings", "motor energy savings",
"high efficiency motor", "motor kwh savings", "0.746 motor"); the id appended to the existing electrical renderers block in
`app.js`; the `// dims:` annotation (hp/kW power, load/efficiencies dimensionless, hours time, rate cost/energy); regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the demand reduction, and the non-positive /
out-of-range / non-finite error seams. No new module; re-pin `calc-electrical.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the kW / saving output wraps on a phone); render-no-nan + a11y
sweep, output read to the value (50 hp, 90->94.5% -> $710/yr).

## 5. Roadmap position

Opens the electrical energy-efficiency trio: `transformer-loading-efficiency` (v472) and `economic-conductor-sizing` (v473)
continue the loss-reduction theme. A premium-motor simple-payback (price differential over annual saving) tie-in is the
deliberate next follow-on.
