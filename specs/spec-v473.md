# roughlogic.com Specification v473 -- Economic Conductor Sizing (I2R Payback) (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Third and final tile of the electrical energy-efficiency trio (v471 premium motor upgrade
> -> v472 transformer loading efficiency -> v473 economic conductor sizing). `voltage-drop` sizes a conductor to meet a
> voltage-drop limit; this tile answers the money question -- whether upsizing a heavily loaded feeder pays for itself in
> reduced I-squared-R energy loss.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A bigger conductor has lower resistance, so it wastes
> less energy as heat: the three-phase loss is `3 * I^2 * R`, and upsizing from a higher resistance to a lower one saves
> `(loss_small - loss_big) * hours * rate` a year. Compared to the extra material cost, that gives a simple payback -- the
> heart of NEC 110.14(C) economical-sizing and ASHRAE 90.1 feeder-loss thinking. `voltage-drop` checks the drop, not the
> lifetime energy cost. This adds the economic tile to the existing **`calc-electrical.js`** module (Group A); no new group,
> trade, or dependency. Inherits spec.md through spec-v472.md.
>
> **The gap, and the evidence for it.** A feeder carrying `100 A` per phase through a run with `0.20 ohm` per phase wastes
> `3 * 100^2 * 0.20 = 6.0 kW`; upsizing to `0.125 ohm` per phase drops it to `3.75 kW`, a `2.25 kW` reduction that over
> `4000 hours` at `$0.12/kWh` saves `$1,080` a year. Against an `$800` upsize cost, the payback is `800 / 1080 = 0.7 years` --
> the bigger wire pays for itself in under a year. No tile does this; a designer sized to the voltage-drop limit and never
> saw the energy payback.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The current is a current (A,
dim I); the per-phase resistances are resistances (ohm); the run hours are a time (hr); the rate is a cost per energy
(USD/kWh); the upsize cost is currency (USD); the losses are powers (kW); the saving is currency (USD/yr) and the payback a
time (yr). The v18/v21 contract: any non-finite input, or a non-positive current or resistance, or a smaller-conductor
resistance not greater than the larger's, returns `{ error }`; the tile computes the three-phase loss for each conductor,
the annual saving, and the simple payback against the upsize cost. Citation discipline (v19/v22): `GOVERNANCE.general` over
economic conductor sizing by name; `editionNote` names **the three-phase conductor loss `3 * I^2 * R` (per-phase
resistance), the annual saving `= (loss_small - loss_big) * hours * rate`, the simple payback `= upsize_cost / annual_saving`,
and the NEC 110.14(C) / ASHRAE 90.1 conductor-loss context**, and states that **this returns the energy saving and payback
of upsizing a conductor, that resistance should be at the operating temperature and the load may vary, and that it is an
economic aid, not a substitute for the ampacity and voltage-drop checks that also govern the size**.

## 2. The tile

### 2.1 `economic-conductor-sizing` -- Economic Conductor Sizing (I2R Payback)

```
inputs:
  current_a     A        per-phase load current
  r_small_ohm   ohm      per-phase resistance of the smaller conductor (run)
  r_big_ohm     ohm      per-phase resistance of the larger conductor (run)
  hours         hr       annual run hours
  rate_kwh      USD/kWh  electricity rate
  upsize_cost   USD      added material cost to upsize

loss_small_kw = 3 * current_a^2 * r_small_ohm / 1000
loss_big_kw   = 3 * current_a^2 * r_big_ohm / 1000
annual_saving = (loss_small_kw - loss_big_kw) * hours * rate_kwh
payback_yr    = upsize_cost / annual_saving
```

**Pinned worked example (100 A, 0.20 -> 0.125 ohm, 4000 hr, $0.12, $800 upsize).** loss small `6.0 kW`, loss big `3.75 kW`;
`saving = 2.25 * 4000 * 0.12 = $1,080/yr`; `payback = 800 / 1080 = 0.7 years`. **Cross-check (light load, slow payback).** At
`40 A` the losses shrink to `0.96` and `0.60 kW`, saving only `$173/yr` and pushing the payback past `4.6 years` -- upsizing
only pays on heavily loaded, long-hour feeders. A resistance ordering error or a non-positive input takes the error path;
the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, beside `voltage-drop` / `transformer-loading-efficiency`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, economic conductor sizing, `editionNote`
naming the `3*I^2*R` loss, the annual-saving and payback relations, and the NEC 110.14(C)/ASHRAE 90.1 context);
`test/fixtures/worked-examples.json` (the fast-payback example + the light-load cross-check); `test/fixtures/compute-map.js`
(`economic-conductor-sizing` -> `computeEconomicConductorSizing` in `../../calc-electrical.js`); `scripts/related-tiles.mjs`
(-> `voltage-drop` / `ampacity` / `motor-efficiency-upgrade-savings` / `transformer-loading-efficiency`);
`data/search/aliases.json` ("economic conductor", "wire size payback", "conductor upsize savings", "i2r loss", "feeder loss
savings", "economical wire size", "conductor energy loss", "upsize wire payback", "conductor loss savings"); the id
appended to the existing electrical renderers block in `app.js`; the `// dims:` annotation (current I, resistances
resistance, hours time, rate cost/energy, losses power, saving currency, payback time); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the resistance-order guard, and the non-positive /
non-finite error seams. No new module; re-pin `calc-electrical.js` on the `check:module-sizes` allowlist. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the resistance-order guard, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the losses / saving / payback set wraps
on a phone); render-no-nan + a11y sweep, output read to the value (100 A, 0.20->0.125 ohm -> $1,080/yr, 0.7 yr).

## 5. Roadmap position

Closes the electrical energy-efficiency trio: v471 the motor, v472 the transformer, and v473 the conductor -- the three
places a system quietly wastes energy. A conductor-resistance-from-size-and-length front-end (feeding this from an AWG and a
run length) is the deliberate next follow-on.
