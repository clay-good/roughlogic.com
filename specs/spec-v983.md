# roughlogic.com Specification v983 -- Bifacial PV Rear-Side Gain (calc-solar.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-solar.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v982.md. Solar-design sweep, beside the accepted
> `pv-energy-yield` and `pv-cell-temperature-power` tiles.
>
> **The gap, and the evidence for it.** The catalog sizes strings, yield, and derates for front-only modules, but
> bifacial modules are now the default for commercial arrays and nothing accounts for the rear-side boost. Grep
> confirmed no bifacial / rear-gain tile. The number this settles: a phi 0.75 module seeing 150 W/m^2 on the back
> against 1000 W/m^2 front makes **11.25%** more power.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, a percent and watts out of irradiances and a ratio),
bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a
non-positive front irradiance or front power, a negative rear irradiance, or a bifaciality outside (0, 1] returns
`{ error }`. Citation discipline (v19/v22): the bifacial effective-irradiance model by name, `GOVERNANCE.general`; the
note explains that the bifaciality coefficient (phi) is a datasheet number (~0.65-0.90), that the rear irradiance is
what the site drives (ground albedo, mounting height, row spacing, rear shading), and that a proper bifacial ray-trace
(PVsyst / NREL) and the datasheet govern the real yield -- with the inverter sized for the boost.

## 2. The tile

### 2.1 `bifacial-pv-gain` -- Bifacial PV Rear-Side Gain

```
inputs:
  front_poa_wm2  front plane-of-array irradiance (W/m^2), default 1000
  rear_poa_wm2   rear plane-of-array irradiance (W/m^2), default 150
  bifaciality    bifaciality coefficient phi (0-1, from datasheet), default 0.75
  front_power_w  front-side nameplate power (W), default 400

bifacial_gain    = bifaciality x (rear_poa_wm2 / front_poa_wm2)
bifacial_gain_pct = 100 x bifacial_gain
effective_power_w = front_power_w x (1 + bifacial_gain)
```

**Pinned worked example.** phi 0.75, 150 W/m^2 rear, 1000 W/m^2 front, 400 W front: `gain = 0.75 x 150/1000 = 0.1125`
= **11.25%**; effective `= 400 x 1.1125 = ` **445 W**. Cross-check: a white membrane roof lifts the rear irradiance to
250 W/m^2, so `gain = 0.75 x 250/1000 = 0.1875` = **18.75%** and effective `= 400 x 1.1875 = ` **475 W**.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar"]`, beside `battery-series-parallel`); a `tile-meta.js` `_TILES`
entry (`A`); a `citations.js` entry (bifacial effective-irradiance model, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the base example plus the white-roof cross-check, pinning the gain percent and
effective power); `test/fixtures/compute-map.js` (`bifacial-pv-gain` -> `computeBifacialPvGain`, module
`../../calc-solar.js`); `scripts/related-tiles.mjs` (-> `pv-energy-yield` / `pv-cell-temperature-power` /
`pv-array-sizing`); `data/search/aliases.json` (5 collision-checked aliases: "bifacial", "bifacial gain", "rear side
gain", "bifaciality", "double sided solar"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the
`SOLAR_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-solar declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings;
a `bounds-fuzzer.test.js` block pinning both examples, the monotonic rear-irradiance / bifaciality directions, the
zero-rear identity, and the error seams. The calc-solar.js gzip cap and the Group A group shell are watched at build
(cap raised for this tile). Home tile count 1,431 -> 1,432.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(0.75 x 150/1000 -> 11.25%, 445 W).

## 5. Roadmap position

Solar design beside `pv-energy-yield`, serving the solar designer / installer (solar). Deliberately the first-order
rear-gain estimate; the module datasheet's bifaciality, the actual site albedo and rear shading, and a bifacial
ray-trace govern the real energy. Stays evidence-driven. Continues the solar-design sweep at 1 new spec (v983).
