# roughlogic.com Specification v948 -- Pulse Flowmeter K-Factor (Frequency to Flow) (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v947.md. Instrumentation / controls install-ops
> sweep, beside the accepted `loop-signal-scaling` and `rtd-resistance-to-temp` tiles.
>
> **The gap, and the evidence for it.** The catalog scales a 4-20 mA loop and an RTD, but nothing converts the third
> common instrument output -- a **pulse (turbine / paddlewheel / PD) flowmeter's frequency** -- to flow. Grep confirmed
> no turbine / paddlewheel / totalizer / pulse-flowmeter tile (every "K-factor" hit is sprinkler, transformer, or
> sheet-metal). Every water operator, controls tech, and irrigation/industrial hand scaling a flow totalizer needs it.
> The number this settles: a 200 pulse/gal meter reading 100 Hz is **30 gpm**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, since the K-factor mixes pulses and volume),
bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a negative
frequency, or a non-positive K-factor returns `{ error }`; a zero frequency is a valid zero flow, not an error. Citation
discipline (v19/v22): the pulse-flowmeter K-factor frequency-to-rate scaling by name, `GOVERNANCE.general`; the note
states that the K-factor is stamped on the meter or its calibration certificate, that it drifts with fluid viscosity and
departs from linear below the meter's usable turndown, and that pulses-per-gallon vs per-liter vs per-cubic-foot units
must match before scaling -- the calibration certificate, the linear flow range, and the fluid govern.

## 2. The tile

### 2.1 `pulse-flowmeter-k-factor` -- Pulse Flowmeter K-Factor (Frequency to Flow)

```
inputs:
  frequency_hz              meter output frequency (Hz = pulses/sec), default 100
  k_factor_pulses_per_gal   meter K-factor (pulses per gallon), default 200

flow_gpm = frequency_hz x 60 / k_factor_pulses_per_gal
flow_gph = flow_gpm x 60
[totalized volume (gal) = pulse count / k_factor, noted]
```

**Pinned worked example.** 200 pulse/gal meter reading 100 Hz: `100 x 60 / 200 = ` **30 gpm** (1,800 gph). Cross-check:
a coarser **100 pulse/gal** meter at the same 100 Hz is `100 x 60 / 100 = ` **60 gpm** -- each pulse now represents twice
the volume; doubling the frequency likewise doubles the rate.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["low-voltage", "water"]`, beside `rtd-resistance-to-temp`); a `tile-meta.js`
`_TILES` entry (`A`); a `citations.js` entry (pulse-flowmeter K-factor scaling, `GOVERNANCE.general`); `test/fixtures/
worked-examples.json` (the 30 gpm example plus the coarser-meter cross-check, pinning the rate); `test/fixtures/compute-
map.js` (`pulse-flowmeter-k-factor` -> `computePulseFlowmeterRate`, module `../../calc-lowvoltage.js`); `scripts/related-
tiles.mjs` (-> `loop-signal-scaling` / `valve-flow-coefficient` / `weir-flow`); `data/search/aliases.json` (5 collision-
checked aliases: "flowmeter k-factor", "turbine flowmeter frequency", "pulse flowmeter flow rate", "paddlewheel flow",
"k-factor flow rate"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the `LOWVOLTAGE_RENDERERS`
map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-lowvoltage declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-
fuzzer.test.js` block pinning the base rate, the K-factor and frequency linearity, the zero-flow case, and the error
seams (negative frequency, non-positive K-factor, non-finite). The calc-lowvoltage.js gzip cap and the Group A group
shell are watched at build (cap raised for this tile). Home tile count 1,396 -> 1,397.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(100 Hz / 200 pulses/gal -> 30 gpm).

## 5. Roadmap position

Instrumentation / controls install-ops beside `loop-signal-scaling`, serving the water operator / controls tech /
industrial-maintenance hand (low-voltage / water). Deliberately the linear frequency-to-rate scaling; the meter's
calibration certificate, its linear flow range, and the fluid govern the field accuracy. Stays evidence-driven.
Continues the instrumentation / controls install-ops sweep at 1 new spec (v948).
