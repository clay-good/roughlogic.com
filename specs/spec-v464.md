# roughlogic.com Specification v464 -- Alternator Charging Load Balance (calc-mechanic.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-04). Third and final tile of the engine/vehicle-systems trio (v462 prop pitch -> v463 engine
> fuel burn -> v464 alternator charging). The catalog has no charging-system tile; this one audits the electrical load
> against the alternator's real output at idle and at cruise, and flags the deficit that drains the battery at a stoplight.**
> In-scope catalog expansion under the spec-v106 trades-only charter. An alternator makes only a fraction of its rated output
> at idle and most of it at cruise, so a vehicle with a heavy accessory load (lights, blower, amps, winch) can run a deficit
> at idle even though it charges fine on the highway. The tile sums the load and compares it to the alternator output at
> idle (about `50%` of rated) and at cruise (about `90%`), reporting the surplus or deficit at each. No tile does this. This
> adds the charging tile to the existing **`calc-mechanic.js`** module (Group K); no new group, trade, or dependency.
> Inherits spec.md through spec-v463.md.
>
> **The gap, and the evidence for it.** A `65 A` accessory load on a `120 A` alternator draws more than the alternator makes
> at idle (`~50% * 120 = 60 A`), a `60 - 65 = -5 A` deficit that pulls from the battery every time the vehicle sits at a
> light; at cruise (`~90% * 120 = 108 A`) it runs a healthy `+43 A` surplus. Seeing both is what tells an installer whether a
> new stereo or light bar needs a bigger alternator. No tile does this.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The load and the alternator
rating and outputs are currents (A, dim I); the idle and cruise output fractions are dimensionless. The v18/v21 contract:
any non-finite input, or a non-positive load or alternator rating, or an output fraction outside `(0, 1]`, returns
`{ error }`; the tile computes the idle and cruise outputs from the fractions (defaults `0.50` and `0.90`), reports the
surplus or deficit at each, and flags an idle deficit. Citation discipline (v19/v22): `GOVERNANCE.general` over the
alternator charging balance by name; `editionNote` names **the load audit (sum of continuous accessory currents), the
alternator output at idle (about `50%` of rated) and at cruise (about `90%`), and the surplus/deficit as output minus load
(a negative idle balance drains the battery)**, and states that **this returns the charging balance at idle and cruise, that
actual output depends on the alternator curve, pulley ratio, and temperature, and that it is a sizing aid, not a substitute
for a measured output test**.

## 2. The tile

### 2.1 `alternator-charging-load` -- Alternator Charging Load Balance

```
inputs:
  total_load_a    A   sum of continuous electrical loads
  alternator_a    A   alternator rated output
  idle_frac       -   output fraction at idle (default 0.50)
  cruise_frac     -   output fraction at cruise (default 0.90)

idle_out    = alternator_a * idle_frac
cruise_out  = alternator_a * cruise_frac
idle_balance   = idle_out - total_load_a
cruise_balance = cruise_out - total_load_a
```

**Pinned worked example (65 A load, 120 A alternator).** idle output `60 A`, idle balance `60 - 65 = -5 A` (deficit, battery
drains at idle); cruise output `108 A`, cruise balance `108 - 65 = +43 A` (healthy surplus). **Cross-check (a bigger
alternator fixes idle).** Swap to a `160 A` alternator and idle output rises to `80 A`, turning the idle balance to `+15 A`
-- no more stoplight drain. A non-positive load or rating, or an out-of-range fraction, takes the error path; the non-finite
seam is covered.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`, beside `fuel-range` / `hp-from-torque`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, alternator charging balance, `editionNote` naming the load-audit and
idle/cruise-output relations and the deficit flag); `test/fixtures/worked-examples.json` (the deficit example + the bigger-
alternator cross-check); `test/fixtures/compute-map.js` (`alternator-charging-load` -> `computeAlternatorChargingLoad` in
`../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `battery-runtime` / `prop-pitch-selection` /
`engine-fuel-burn-gph` / `lv-dc-drop`); `data/search/aliases.json` ("alternator charging load", "charging system", "battery
drain idle", "alternator output idle", "electrical load audit", "alternator sizing", "charging balance", "12v load
alternator", "alternator amps"); the id appended to the existing mechanic renderers block in `app.js`; the `// dims:`
annotation (currents I, fractions dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the idle-deficit flag, and the non-positive / out-of-range / non-finite error seams. No new module;
re-pin `calc-mechanic.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the idle-deficit flag, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the idle / cruise balance output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (65 A load, 120 A alt -> -5 A idle, +43 A cruise).

## 5. Roadmap position

Closes the engine/vehicle-systems trio: v462 the prop, v463 the fuel, and v464 the charging system. A duty-cycle-weighted
average-load audit and a battery-reserve-during-idle-deficit tie-in to `battery-runtime` are the deliberate next follow-ons.
