# roughlogic.com Specification v434 -- Evaporator Design TD and Humidity Band (calc-refrigerant.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Third and final tile of the walk-in refrigeration trio (v432 box heat load ->
> v433 product pull-down -> v434 evaporator TD). `approach-delta-t` is the condenser approach; this tile is the evaporator
> side -- the design temperature difference between the box and the saturated suction, which sets the coil selection and the
> humidity the box holds.**
> In-scope catalog expansion under the spec-v106 trades-only charter. An evaporator coil is selected on its design
> temperature difference (TD or DTD), the box temperature minus the saturated suction temperature: `DTD = T_box - SST`. A low
> TD keeps the box humid (good for produce and flowers), a high TD dries it out (packaged goods, low-humidity storage).
> `approach-delta-t` covers the condenser, and `superheat-subcool` the line states; neither addresses the evaporator TD and
> its humidity effect. This adds the evaporator-TD tile to the existing **`calc-refrigerant.js`** module (Group C); no new
> group, trade, or dependency. Inherits spec.md through spec-v433.md.
>
> **The gap, and the evidence for it.** A `35 deg F` produce cooler on a coil with a `25 deg F` saturated suction runs a
> design TD of `35 - 25 = 10 deg F`, which holds roughly `85 to 90%` relative humidity -- right for leafy produce. Widen the
> TD to `18 deg F` (a `17 deg F` suction) and the box dries to about `65%` RH, which wilts produce but suits packaged or
> frozen storage. No tile does this; a tech picking a coil had the cycle tiles but no TD-to-humidity guide.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The box temperature and the
saturated suction temperature are temperatures (deg F); the design TD is a temperature difference (deg F); the humidity band
is a categorical/percent estimate. The v18/v21 contract: any non-finite input, or a saturated suction at or above the box
temperature (a non-positive TD, no cooling), returns `{ error }`; the tile reports the design TD and the approximate
relative-humidity band it produces. Citation discipline (v19/v22): `GOVERNANCE.general` over the evaporator design TD by
name; `editionNote` names **the evaporator design temperature difference `DTD = T_box - SST` (box temperature minus
saturated suction temperature), and the humidity bands (about `8 to 10 deg F` for `~90%` RH produce, `10 to 12 deg F` for
`~80 to 85%`, `12 to 16 deg F` for `~75 to 80%`, and `16 to 20 deg F` for low-humidity/frozen storage)**, and states that
**this returns the coil design TD and the humidity band it holds, that the bands are typical selection guidance (actual RH
depends on coil, airflow, and load), and that it is a selection aid, not a substitute for the coil manufacturer's
performance data**.

## 2. The tile

### 2.1 `evaporator-td-dtd` -- Evaporator Design TD and Humidity Band

```
inputs:
  box_temp_f    F   box (room) temperature
  sst_f         F   saturated suction temperature at the coil

dtd = box_temp_f - sst_f
band = dtd <= 10 ? "~90% RH (produce/flowers)"
     : dtd <= 12 ? "~80-85% RH (general cooler)"
     : dtd <= 16 ? "~75-80% RH (meat/packaged)"
     :             "<70% RH (low-humidity/frozen)"
```

**Pinned worked example (35 deg F box, 25 deg F SST).** `DTD = 35 - 25 = 10 deg F` -> `~90% RH`, right for produce.
**Cross-check (a drying coil).** A `17 deg F` suction gives `DTD = 18 deg F` -> `<70% RH`, which suits packaged or frozen
storage but wilts produce. A saturated suction at or above the box temperature takes the error path; the non-finite seam is
covered.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `approach-delta-t` / `superheat-subcool`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, evaporator design TD, `editionNote` naming the `DTD = box - SST`
relation and the humidity bands); `test/fixtures/worked-examples.json` (the produce example + the drying cross-check; the
string band pins with `"tolerance": {"abs": 0}`); `test/fixtures/compute-map.js` (`evaporator-td-dtd` ->
`computeEvaporatorTdDtd` in `../../calc-refrigerant.js`); `scripts/related-tiles.mjs` (-> `approach-delta-t` /
`superheat-subcool` / `walk-in-cooler-load` / `product-pull-down-load`); `data/search/aliases.json` ("evaporator td",
"design td refrigeration", "coil td", "dtd evaporator", "box temp suction td", "evaporator temperature difference",
"refrigeration humidity td", "coil selection td", "walk in humidity"); the id appended to the existing refrigerant renderers
block in `app.js`; the `// dims:` annotation (temperatures T, TD temperature difference, band categorical); regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the band boundaries, and the non-positive-TD /
non-finite error seams. No new module; re-pin `calc-refrigerant.js` on the `check:module-sizes` allowlist. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the band assignment, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the TD / band output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (35 box, 25 SST -> 10 F TD, ~90% RH).

## 5. Roadmap position

Closes the walk-in refrigeration trio: v432 the box load, v433 the product load, and v434 the coil TD that meets the total
at the right humidity. A coil-capacity-at-TD (Btu/hr per degree TD) selection tie-in is the deliberate next follow-on.
