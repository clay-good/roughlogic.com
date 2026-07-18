# roughlogic.com Specification v968 -- EV Range Added per Hour of Charging (calc-solar.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-solar.js`** (Group A), no
> new module, group, or dependency. Inherits spec.md through spec-v967.md. EV-charging sweep, beside the accepted
> `ev-charge-time`, `ev-charger-load`, and `ev-charge-cost` tiles.
>
> **The gap, and the evidence for it.** The catalog sizes the EVSE circuit and the full charge time, but nothing answers
> the fleet/installer question "how many miles of range does this charger add per hour." Grep confirmed no range-added /
> mph-of-charge tile. The number this settles: a 7.7 kW Level 2 charger adds about **23.7 mi** of range per hour.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, mixing kW, mi/kWh, and hours), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive EVSE power
/ vehicle efficiency / target range, or a charge efficiency outside (0,1] returns `{ error }`. Citation discipline
(v19/v22): the range-per-hour energy identity by name, `GOVERNANCE.general`; the note states that the AC rate is capped
by the vehicle's onboard charger (a bigger EVSE does not charge faster -- see ev-charge-time), that a less efficient
vehicle adds fewer miles per hour, and that DC fast charging is a separate tapering process -- the onboard-charger limit
and the real efficiency govern.

## 2. The tile

### 2.1 `ev-range-per-hour` -- EV Range Added per Hour of Charging

```
inputs:
  evse_power_kw                 EVSE power (kW), default 7.7
  charge_efficiency             AC charge efficiency (0-1, ~0.88), default 0.88
  vehicle_efficiency_mi_per_kwh vehicle efficiency (mi/kWh), default 3.5
  target_range_mi               target range to add (mi), default 100

range_added_mi_per_hr = evse_power_kw x charge_efficiency x vehicle_efficiency_mi_per_kwh
hours_to_add_target   = target_range_mi / range_added_mi_per_hr
```

**Pinned worked example.** 7.7 kW EVSE, 88% efficiency, 3.5 mi/kWh, 100 mi target:
`range/hr = 7.7 x 0.88 x 3.5 = ` **23.72 mi/hr**, hours = `100/23.72 = ` **4.22 hr** (overnight). Cross-check: a less
efficient truck at **2.0 mi/kWh** adds only `7.7 x 0.88 x 2.0 = ` **13.55 mi/hr**.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical", "solar"]`, beside `ev-charge-time`); a `tile-meta.js` `_TILES`
entry (`A`); a `citations.js` entry (range-per-hour identity, `GOVERNANCE.general`); `test/fixtures/worked-examples.json`
(the base example plus the less-efficient-vehicle cross-check, pinning the range/hr and hours); `test/fixtures/compute-
map.js` (`ev-range-per-hour` -> `computeEvRangePerHour`, module `../../calc-solar.js`); `scripts/related-tiles.mjs` (->
`ev-charge-time` / `ev-charger-load` / `ev-charge-cost`); `data/search/aliases.json` (5 collision-checked aliases: "ev
range per hour", "miles per hour charging", "range added charging", "ev charging miles", "evse range"), then
`node scripts/build-alias-shards.mjs`; a hand-written renderer in the `SOLAR_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-solar declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the
range/hr and hours, the less-efficient direction, the power linearity, the inverse hours, and the error seams. The
calc-solar.js gzip cap is watched at build (raised for this tile). Home tile count 1,416 -> 1,417.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(7.7 / 0.88 / 3.5 / 100 -> 23.7 mi/hr, 4.2 hr).

## 5. Roadmap position

EV charging beside `ev-charge-time`, serving the EVSE installer / fleet manager (electrical / solar). Deliberately the
steady AC Level 2 identity; the vehicle's onboard-charger cap (ev-charge-time), the real efficiency, and DC fast
charging's tapering profile govern. Stays evidence-driven. Continues the EV-charging sweep at 1 new spec (v968).
