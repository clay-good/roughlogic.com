# roughlogic.com Specification v963 -- DC Ammeter Shunt Sizing (calc-solar.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-solar.js`** (Group A), no
> new module, group, or dependency. Inherits spec.md through spec-v962.md. DC-metering sweep, beside the accepted
> `battery-runtime` and `off-grid-battery` tiles.
>
> **The gap, and the evidence for it.** The catalog sizes batteries, PV circuits, and loads, but nothing sizes or reads
> the DC current SHUNT a panel meter, battery monitor, or combiner uses. Grep confirmed no shunt / ammeter-shunt tile.
> The number this settles: a 50 mV / 100 A shunt is **0.5 milliohm** and reads 50 A at 25 mV.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, mixing mV, A, ohms, and W), bounds-fuzzer, worked-
example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive rated current or
millivolt, or a negative measured millivolt returns `{ error }`. Citation discipline (v19/v22): the shunt Ohm's-law
relations by name, `GOVERNANCE.general`; the note states that shunts derate to ~2/3 of rating for continuous use, that
the sense leads tap the potential (voltage) terminals (not the current lugs) so lead resistance stays out of the
reading, and that the shunt's accuracy class and temperature coefficient and the meter's range and calibration govern.

## 2. The tile

### 2.1 `dc-shunt-sizing` -- DC Ammeter Shunt Sizing

```
inputs:
  rated_current_a    shunt rated current (A), default 100
  rated_millivolt    shunt millivolt output at rated current (mV), default 50
  measured_millivolt measured millivolt drop (mV), default 25

shunt_resistance_ohm = (rated_millivolt / 1000) / rated_current_a
measured_current_a   = rated_current_a x (measured_millivolt / rated_millivolt)
power_dissipation_w  = rated_current_a x (rated_millivolt / 1000)   [at rated current]
```

**Pinned worked example.** 100 A / 50 mV shunt reading 25 mV: `R = 0.05/100 = ` **0.5 milliohm**, current = `100 x 25/50
= ` **50 A**, and at rated current it dissipates `100 x 0.05 = ` **5 W**. Cross-check: a 200 A / 75 mV shunt is `0.075/200
= ` **0.375 milliohm**, and a full 75 mV reads the full **200 A**.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar", "electrical"]`, beside `battery-runtime`); a `tile-meta.js` `_TILES`
entry (`A`); a `citations.js` entry (shunt Ohm's law, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the
100 A example plus the 200 A cross-check, pinning the resistance, current, and dissipation); `test/fixtures/compute-
map.js` (`dc-shunt-sizing` -> `computeDcShuntSizing`, module `../../calc-solar.js`); `scripts/related-tiles.mjs` (->
`battery-runtime` / `loop-signal-scaling` / `voltage-drop`); `data/search/aliases.json` (5 collision-checked aliases:
"dc shunt", "ammeter shunt", "shunt resistor", "current shunt", "50mv shunt"), then `node scripts/build-alias-
shards.mjs`; a hand-written renderer in the `SOLAR_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id
added to the calc-solar declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the resistance, current, and dissipation,
the full-scale and zero readings, the higher-current lower-resistance direction, the linearity in measured mV, and the
error seams. The calc-solar.js gzip cap is watched at build (raised for this tile). Home tile count 1,411 -> 1,412.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(100 A / 50 mV / 25 mV -> 0.5 milliohm, 50 A, 5 W).

## 5. Roadmap position

DC metering beside `battery-runtime`, serving the solar / DC-systems installer (solar / electrical). Deliberately the
Ohm's-law shunt relations; the derating for continuous use, the potential-terminal sensing, the shunt's accuracy class
and temperature coefficient, and the meter's range and calibration govern the measurement. Stays evidence-driven.
Continues the DC-metering sweep at 1 new spec (v963).
