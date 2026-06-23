# roughlogic.com Specification v121 -- Induction Motor Synchronous Speed and Slip (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v121..v128 (electrical motors / feeders / fault / raceway / grounding / three-phase fundamentals).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one electrical tile from the
> first-principles AC-machine speed relation, public physics, AHJ-and-manufacturer governed,
> redo-not-harm. Adds one tile to **`calc-electrical.js`** (Group A); no new module, group, or
> dependency. Inherits spec.md through spec-v120.md.
>
> **The gap, and the evidence for it.** Group A sizes motor branch circuits (`motor-fla`,
> `motor-branch-from-nameplate`), starting kVA (`generator-motor-starting`), and starting voltage
> dip (`motor-vd-starting`), but never the running speed itself: the synchronous speed set by line
> frequency and pole count, the slip that distinguishes a loaded induction motor from sync speed,
> and the rotor (slip) frequency. That trio is the first number an electrician needs when
> commissioning a motor, reading a VFD parameter set, or diagnosing a wrong-speed complaint.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Line frequency and shaft speed are `T^-1` (Hz and rev/min are both inverse-time; the bundled 120
constant carries the 60 s/min x 2-poles-per-pole-pair unit bridge), pole count and slip are
`dimensionless`. The bundled 120 constant is an annotated editable field. The v18/v21 contract: any
non-finite input, a non-positive or non-even pole count, or a non-positive line frequency, returns
`{ error }`; the only division is by a guarded-positive synchronous speed (poles > 0 and frequency
> 0 force it positive). Citation discipline (v19/v22): `GOVERNANCE.general` over the synchronous-
speed relation Ns = 120 f / P and the slip definition; the motor nameplate and manufacturer govern
the rated full-load speed.

## 2. The tile

### 2.1 `motor-synchronous-speed-slip` -- Induction Motor Synchronous Speed, Slip, and Rotor Frequency

```
inputs:
  line_freq_hz     T^-1           supply frequency (default 60)
  poles            dimensionless  number of stator poles (even integer: 2, 4, 6, 8, ...)
  rated_rpm        T^-1           nameplate full-load speed (for slip)

sync_rpm     = 120 x line_freq_hz / poles
slip         = (sync_rpm - rated_rpm) / sync_rpm
slip_pct     = slip x 100
rotor_freq_hz = slip x line_freq_hz
```

**Pinned worked example.** 60 Hz, 4-pole motor, nameplate 1750 rpm:
`sync_rpm = 120 x 60 / 4 = 1800 rpm`; `slip = (1800 - 1750) / 1800 = 0.0278 = 2.78 %`;
`rotor_freq = 0.0278 x 60 = 1.67 Hz`. **Cross-check:** a 6-pole 60 Hz motor nameplated at 1140 rpm:
`sync_rpm = 120 x 60 / 6 = 1200 rpm`, `slip = (1200 - 1140) / 1200 = 5.0 %`. The nameplate full-load
speed governs; a speed near sync indicates a lightly loaded machine, a rising slip indicates
loading or a rotor fault.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the Ns = 120 f / P and slip formulas, the 120 constant
listed, `editionNote` single-edition first-principles); `test/fixtures/worked-examples.json`
(example + cross-check); `test/fixtures/compute-map.js` (`motor-synchronous-speed-slip` ->
`computeMotorSyncSlip` in `../../calc-electrical.js`); `scripts/related-tiles.mjs` (->
`motor-fla` / `motor-vd-starting` / `motor-branch-from-nameplate`); `data/search/aliases.json`
("synchronous speed", "motor slip", "rpm", "rotor frequency", "pole count", "vfd speed"); the id
appended to the existing `ELECTRICAL_RENDERERS` declare in `app.js`; the `// dims:` annotation
(matching the existing Group A current/frequency tokens); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the example, cross-check, and error seams (non-finite,
poles <= 0 or odd, freq <= 0). Raise the `calc-electrical.js` `check-module-sizes.mjs` cap by ~20
percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned to the
live total **+1 tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the sync,
slip, and rotor-frequency lines wrap on a phone); render-no-nan + a11y sweep, output read to the
value (60 Hz / 4 poles -> 1800 rpm sync; 1750 rpm -> 2.78 % slip; 1.67 Hz rotor).

## 5. Roadmap position

Opens the motor-performance family (speed, torque v122, operating cost v123) alongside the existing
motor branch-circuit and starting tiles. Further Group A growth stays evidence-driven.
