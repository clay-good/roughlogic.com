# roughlogic.com Specification v237 -- Battery Peak Shaving Demand-Charge Savings (calc-solar.js, Group A, 1 New Tile)

> **Status: LANDED (2026-06-30, package 0.88.0; was PROPOSED 2026-06-30). Batch spec-v236..v238 (the grid-tied battery-economics trio -- TOU arbitrage, peak
> shaving, and the C-rate power limit). This spec is the middle of the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: sizing a battery to shave a demand peak is the
> commercial-storage design the solar and electrical trade sells. Adds one tile to **`calc-solar.js`** (Group A); no new
> module, group, or dependency. Inherits spec.md through spec-v236.md.
>
> **The gap, and the evidence for it.** A commercial customer's bill is often driven less by energy than by demand -- the
> single highest fifteen-minute kilowatt reading of the month, billed at ten to thirty dollars per kilowatt. A battery
> discharged during that peak shaves the reading and the charge, and it is often the fastest-paying reason to install
> storage. But the shave is energy-limited: a battery can only hold a given kilowatt reduction for as long as its usable
> energy lasts, so shaving a 40 kilowatt peak that persists for three hours needs 120 kilowatt-hours of usable energy,
> and a smaller battery simply cannot hold the full reduction across the window. The catalog values the energy side of
> storage nowhere and the demand side nowhere; a designer sizing a peak-shaving battery has no way to check whether it
> can actually hold the reduction the savings assume.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The nameplate and usable
capacities are an energy (kWh); the target, sustainable, and actual shave are a power (kW); the peak-event duration is a
time (h); the demand charge and the annual savings are currency figures (USD, as the existing economic tiles carry
them); the depth of discharge is `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive nameplate
capacity / peak-event duration / target shave / demand charge, or a depth of discharge outside 0 (exclusive) to 1,
returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the peak-shaving relations by name;
`editionNote` names the standard **demand-charge peak-shaving method** (sustainable shave `= usable / duration`, actual
shave `= min(target, sustainable)`, savings = actual shave times the $/kW-month times twelve), and states that **the
peak-event duration is how long the facility's demand stays above the shave target (from an interval-meter load
profile), the actual demand reduction depends on the battery discharging on exactly the right intervals (a controls
problem this sizing does not solve), a coincident-peak or ratchet tariff changes the billing, and this is a
demand-savings estimate, not a metered bill** -- a sizing-and-value aid, not a guaranteed demand credit.

## 2. The tile

### 2.1 `battery-peak-shaving` -- Demand-Charge Peak-Shaving Savings

```
inputs:
  nameplate_kwh     kWh            battery nameplate energy, kWh
  dod               dimensionless  usable depth of discharge, 0-1 (default 0.90)
  event_duration_h  h              hours the demand peak must be held down, h
  target_shave_kw   kW             desired demand reduction, kW
  demand_per_kw_mo  USD/kW-mo      demand charge, $/kW-month

usable_kwh        = nameplate_kwh * dod
sustainable_kw    = usable_kwh / event_duration_h        # the most it can hold for the whole window
actual_shave_kw   = min(target_shave_kw, sustainable_kw)
annual_savings    = actual_shave_kw * demand_per_kw_mo * 12
energy_limited    = sustainable_kw < target_shave_kw
```

**Pinned worked example (100 kWh battery, 3-hour peak).** A 100 kWh battery, 90 percent usable, shaving a peak that runs
3 hours, with a 40 kW target reduction on an $18/kW-month demand charge: `usable = 100 * 0.90 = 90 kWh`;
`sustainable = 90 / 3 = 30 kW`; `actual_shave = min(40, 30) = 30 kW` (energy-limited -- it cannot hold the full 40 kW
for the whole 3 hours); `annual_savings = 30 * 18 * 12 = ` **$6,480 per year**. **Cross-check (same battery, 1-hour
peak).** The same 100 kWh battery against a sharp peak that only lasts 1 hour: `sustainable = 90 / 1 = 90 kW`;
`actual_shave = min(40, 90) = 40 kW` (now energy is not the limit); `annual_savings = 40 * 18 * 12 = ` **$8,640 per
year**. The identical battery shaves the full target and saves a third more against the short peak -- the shape of the
peak, not just the battery size, sets the value, and a wide afternoon plateau demands far more storage per kilowatt
shaved than a brief spike.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical","solar"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the peak-shaving relations, `editionNote` naming the demand-charge peak-shaving method with
the duration-from-load-profile / controls-not-solved / ratchet-tariff / not-a-bill caveats);
`test/fixtures/worked-examples.json` (the 3-hour example + the 1-hour cross-check); `test/fixtures/compute-map.js`
(`battery-peak-shaving` -> `computeBatteryPeakShaving` in `../../calc-solar.js`); `scripts/related-tiles.mjs`
(-> `battery-tou-arbitrage` / `battery-c-rate` / `off-grid-battery`); `data/search/aliases.json` ("peak
shaving", "demand shaving", "demand charge battery", "peak demand reduction", "battery demand savings", "commercial
storage", "demand management", "kw shave"); the id appended to the existing solar renderers declare in `app.js`; the
`// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and
error seams (non-finite, nameplate / duration / target / charge <= 0, DoD out of 0 to 1, the energy-limited and
target-limited paths). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the energy-limited and target-limited paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the usable / sustainable / actual /
annual stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (100 kWh / 3 h / 40 kW -> 30 kW
shave, $6,480/yr).

## 5. Roadmap position

The middle of the grid-tied battery-economics batch (v236..v238). Pairs with `battery-tou-arbitrage` (v236) as the
second value stream a grid-tied battery earns (the two often stack on the same discharge), sits beside
`power-factor-billing-savings` (v232) as another demand-bill lever, and is bounded by the deliverable power in
`battery-c-rate` (v238). A ratchet-tariff and a coincident-peak (utility-called-event) mode are deliberate future
follow-ons.
