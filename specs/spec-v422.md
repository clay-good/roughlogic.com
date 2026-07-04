# roughlogic.com Specification v422 -- Buck-Boost Transformer Sizing (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Third and final tile of the NEC electrical-installation trio (v420 EV charging load ->
> v421 cable tray fill -> v422 buck-boost transformer). `transformer-sizing` sizes an isolation transformer by the full load
> kVA; a buck-boost is connected as an autotransformer, so a tiny nameplate handles a large line load -- a sizing this tile
> makes explicit and the isolation formula gets very wrong.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A buck-boost transformer corrects a small voltage
> difference (for example `208 V` up to `230 V`) by adding or subtracting its secondary winding voltage in series with the
> line. Connected as an autotransformer, its required nameplate is only `load_kVA * (deltaV / V_load)`, far less than the
> line load, because the winding carries the load current at just the boost voltage. `transformer-sizing` would size it at
> the full load kVA, which oversizes it roughly tenfold. This adds the buck-boost tile to the existing **`calc-electrical.js`**
> module (Group A); no new group, trade, or dependency. Inherits spec.md through spec-v421.md.
>
> **The gap, and the evidence for it.** Boosting a `10 kVA` load at `230 V` by `deltaV = 22 V` (from `208 V`) needs a buck-
> boost of only `nameplate = 10 * 22 / 230 = 0.96 kVA` -- a standard `1 kVA` unit. Connected as an autotransformer it handles
> a line load `230/22 = 10.5` times its nameplate, which is the whole reason buck-boost transformers are so small and cheap.
> Sizing it as a full isolation transformer (`transformer-sizing`) would call for `10 kVA`, ten times too big. No tile does
> the autotransformer sizing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The load apparent power is an
apparent power (kVA); the load voltage and the voltage change are voltages (V); the required nameplate is an apparent power
(kVA); the capacity ratio is dimensionless. The v18/v21 contract: any non-finite input, or a non-positive load, voltage, or
voltage change, or a voltage change at or above the load voltage, returns `{ error }`; the tile reports the required
nameplate kVA, the next standard size, and the autotransformer capacity ratio. Citation discipline (v19/v22):
`GOVERNANCE.general` over buck-boost transformer sizing by name; `editionNote` names **the autotransformer connection of a
buck-boost transformer, the required nameplate `= load_kVA * (deltaV / V_load)` (the winding carries the load current at the
boost/buck voltage), the line capacity ratio `V_load / deltaV`, and the NEC 450 autotransformer provisions**, and states
that **this returns the isolation-transformer-equivalent nameplate for a buck-boost connected as an autotransformer, that
buck-boost transformers are typically sized from the manufacturer's line-voltage/load-current tables, that an autotransformer
does not isolate, and that it is a sizing aid, not a substitute for the manufacturer selection guide or the AHJ**.

## 2. The tile

### 2.1 `buck-boost-transformer-sizing` -- Buck-Boost Transformer Sizing

```
inputs:
  load_kva      kVA   line load to be served
  v_load        V     load (output) voltage
  delta_v       V     voltage boost (or buck) required

nameplate_kva = load_kva * (delta_v / v_load)
capacity_ratio = v_load / delta_v
```

**Pinned worked example (10 kVA load at 230 V, boost 22 V).** `nameplate = 10 * 22/230 = 0.96 kVA` -> a standard `1 kVA`
buck-boost; `capacity ratio = 230/22 = 10.5` (it handles `10.5x` its nameplate as a line load). **Cross-check (a bigger
correction).** Boosting the same load by `44 V` doubles the nameplate to `1.91 kVA` and halves the ratio to `5.2` -- more
correction, bigger transformer. A voltage change at or above the load voltage, or a non-positive input, takes the error
path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, beside `transformer-sizing`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, buck-boost autotransformer sizing, `editionNote` naming the nameplate and
capacity-ratio relations and the no-isolation caveat); `test/fixtures/worked-examples.json` (the 1 kVA example + the
double-correction cross-check); `test/fixtures/compute-map.js` (`buck-boost-transformer-sizing` ->
`computeBuckBoostTransformerSizing` in `../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `transformer-sizing` /
`voltage-drop` / `service-conductor-sizing` / `ev-charging-load`); `data/search/aliases.json` ("buck boost transformer",
"buck-boost sizing", "autotransformer sizing", "boost transformer kva", "voltage correction transformer", "208 to 230
transformer", "buck boost kva", "small voltage transformer", "line voltage correction"); the id appended to the existing
electrical renderers block in `app.js`; the `// dims:` annotation (kVA apparent power, voltages voltage, ratio
dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
capacity-ratio relation, and the delta-v-vs-load / non-positive / non-finite error seams. No new module; re-pin
`calc-electrical.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the nameplate / ratio output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (10 kVA, 230 V, 22 V -> 0.96 kVA, 10.5x).

## 5. Roadmap position

Closes the NEC electrical-installation trio: v420 the EV load, v421 the cable tray, and v422 the buck-boost transformer that
corrects a low or high supply voltage. A two-transformer three-phase buck-boost connection and a manufacturer line-current
table lookup are the deliberate next follow-ons.
