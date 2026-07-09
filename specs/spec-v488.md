# roughlogic.com Specification v488 -- EV Charge Time, AC Level 2 (calc-solar.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-solar.js`**
> (Group A, the solar / battery / EV-charging bench); no new module, group, or dependency. Inherits spec.md through
> spec-v487.md.
>
> **The gap, and the evidence for it.** The bench has `ev-charger-load` (the NEC 625 branch-circuit and panel-impact
> sizing) but nothing for the question the customer actually asks: how long does it take to charge? The arithmetic is
> simple -- energy needed / charging power -- but the catch the tile exists to flag is the one every EV owner and
> installer gets wrong: on AC Level 2 the charging power is the **lesser of the wall EVSE's output and the vehicle's
> onboard charger**, and it is almost always the onboard charger that governs. A customer who pays for a 48 A (11.5 kW)
> EVSE to charge a car with a 7.7 kW onboard charger still only charges at 7.7 kW -- the extra EVSE capacity is wasted,
> and the charge time does not budge. The tile makes that bottleneck the headline: it takes both powers, uses the
> smaller, applies a charging efficiency, and returns the hours, so the installer can right-size the EVSE to the car
> instead of overselling amperage that the vehicle cannot use.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The battery capacity and
the energy needed are energies (`M L^2 T^-2`); the EVSE, onboard-charger, and charging powers are powers
(`M L^2 T^-3`); the state-of-charge and efficiency percents are `dimensionless`; the time is `T`. The v18/v21 contract:
any non-finite input, a non-positive battery capacity or EVSE power, a negative onboard rating, a start state of charge
outside 0-100, a target at or below the start or above 100, or an efficiency outside 0-100 returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the charge-time relation by name; `editionNote` names the **AC Level 2
charge-time model (SAE J1772 onboard-charger limit; charging losses)**, prints `energy = capacity x (target - start)`,
`power = min(EVSE, onboard)`, and `time = energy / (power x efficiency)`, and states that **AC Level 2 charging is
capped by the vehicle's onboard charger (the wall EVSE cannot push more AC than the car accepts), the model assumes
constant power (true for AC Level 2 up to the target but not for DC fast charging, which tapers sharply above ~80% state
of charge, so this over-predicts a DC session near full), the efficiency covers the AC-to-DC and thermal losses so the
grid draws more than the battery stores, and the vehicle's charging curve and the installed equipment govern** -- a
planning estimate, not the vehicle's actual charging profile.

## 2. The tile

### 2.1 `ev-charge-time` -- The Hours an EV Charge Takes, Onboard-Charger Limited

```
inputs:
  battery_capacity_kwh  kWh   the vehicle's usable battery capacity
  start_soc_pct         %     the starting state of charge
  target_soc_pct        %     the target state of charge (default 80)
  evse_power_kw         kW    the wall EVSE (charger) output power
  onboard_charger_kw    kW    the vehicle's onboard AC charger limit (0 = DC fast / no AC cap)
  efficiency_pct        %     charging efficiency (default 88)

energy_needed = battery_capacity x (target_soc - start_soc) / 100     [kWh]
charge_power  = onboard > 0 ? min(evse, onboard) : evse                [kW]   AC is capped by the onboard charger
time_hr       = energy_needed / (charge_power x efficiency / 100)      [hr]
onboard_limited = onboard > 0 and onboard < evse
```

**Pinned worked example (a 75 kWh EV on an 11.5 kW EVSE with a 7.7 kW onboard charger).** Charging from 20% to 80% is
`75 x (80 - 20) / 100 = ` **45 kWh**. The 11.5 kW EVSE cannot push more than the car's 7.7 kW onboard charger, so
`charge_power = min(11.5, 7.7) = ` **7.7 kW**, and at 88% efficiency `time = 45 / (7.7 x 0.88) = 45 / 6.776 = ` **6.6
hours** -- a normal overnight charge, and the `onboard_limited` flag is set: the 48 A EVSE is oversized for this car.
**Cross-check (a bigger onboard charger earns the amperage).** Put the same session on a car with an 11.5 kW onboard
charger: `charge_power = min(11.5, 11.5) = 11.5 kW`, `time = 45 / (11.5 x 0.88) = 45 / 10.12 = ` **4.4 hours** -- the
same wall EVSE now cuts more than two hours off the charge, the number that tells the installer the 48 A circuit is only
worth it if the vehicle can accept it. The tile returns the energy needed, the governing charge power (flagged when the
onboard charger limits it), and the hours.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical", "solar"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the onboard-limited example +
the bigger-onboard cross-check); `test/fixtures/compute-map.js` (`ev-charge-time` -> `computeEvChargeTime` in
`../../calc-solar.js`); `scripts/related-tiles.mjs` (-> `ev-charger-load` / `battery-runtime` / `battery-c-rate`);
`data/search/aliases.json` ("ev charge time", "charging time", "how long to charge", "level 2 charge time", "onboard
charger", "charge duration", "ev charging hours", "time to full charge"); the id appended to the solar renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the onboard-charger min, the efficiency scaling, and the error seams (non-finite, non-positive
capacity / EVSE, out-of-range SOC and efficiency, target <= start). Hand-writes its renderer (mirroring the
calc-solar.js `battery-c-rate` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the energy / charge-power / time stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 75 kWh example -> 6.6 hours).

## 5. Roadmap position

Adds the how-long-to-charge number beside the how-big-a-circuit number: `ev-charger-load` sizes the NEC 625 branch
circuit, and this tile tells the customer the hours -- and why a bigger EVSE does not help a car with a small onboard
charger. A DC-fast-charge tapering model (a non-constant-power curve above ~80%), a cost-per-charge companion (kWh x
rate net of efficiency), and a solar-surplus-charging window are deliberate future follow-ons. Further Group A growth
stays evidence-driven.
