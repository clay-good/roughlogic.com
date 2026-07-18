# roughlogic.com Specification v937 -- Fire-Alarm NAC Circuit Voltage Drop (End-of-Line) (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group
> A), no new module, group, or dependency. Inherits spec.md through spec-v936.md. Fire-alarm / low-voltage install-ops
> sweep, beside the accepted `access-control-power-supply` and `standby-battery-sizing` tiles.
>
> **The gap, and the evidence for it.** The catalog sizes the fire-alarm STANDBY BATTERY but nothing checks the NAC
> circuit's end-of-line voltage. Grep confirmed no NAC tile. Every horn/strobe circuit is checked so the far device still
> latches. The number this settles: a 0.8 A load on 250 ft of #14 leaves **19.4 V** at the end of the line -- above a 16
> V device minimum, so it passes.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling LV
tiles: the nominal / available / drop / end-of-line / device-minimum voltages carry `M L^2 T^-3 I^-1`, the current
carries `I`, the run length carries `L`, and the resistance per 1000 ft carries `M L T^-3 I^-2`. The v18/v21 contract: a
non-finite or non-positive nominal voltage, current, run length, resistance, or device minimum returns `{ error }`.
Citation discipline (v19/v22): the NAC voltage-drop method by name (CUSTV = 0.85 x nominal; loop R = 2 x length x
ohms/1000 ft; V_EOL = CUSTV - I x loop R), `GOVERNANCE.general`; the note states that the panel's usable output is its
regulated minimum (CUSTV, ~85% of nominal per NFPA 72), that a Class B circuit runs out and back (2x length), that
lumping the total current at the end is the worst case, that a failing circuit needs heavier wire / a shorter run / a
split / a NAC extender, and that the panel voltage, appliance data, the wire table, and a stamped fire-alarm design and
the AHJ govern.

## 2. The tile

### 2.1 `fire-alarm-nac-voltage-drop` -- Fire-Alarm NAC Circuit Voltage Drop (End-of-Line)

```
inputs:
  nominal_voltage_v      panel nominal voltage (V, e.g. 24)
  total_current_a        total appliance current, lumped at the end of line (A)
  run_length_ft          one-way run length (ft)
  resistance_per_1000ft  conductor resistance (ohm/1000 ft, NEC Ch 9 Table 8)
  device_min_v           listed minimum device voltage (V, e.g. 16)

available_voltage_v = 0.85 x nominal_voltage_v   (CUSTV)
loop_R              = 2 x run_length_ft x (resistance_per_1000ft / 1000)
voltage_drop_v      = total_current_a x loop_R
eol_voltage_v       = available_voltage_v - voltage_drop_v
within_spec         = eol_voltage_v >= device_min_v
```

**Pinned worked example.** 24 V panel, 0.8 A, 250 ft of #14 (2.525 ohm/1000 ft), 16 V device:
`CUSTV = 0.85 x 24 = 20.4 V`; `loop R = 2 x 250 x (2.525/1000) = 1.2625 ohm`; `drop = 0.8 x 1.2625 = 1.01 V`; `V_EOL =
20.4 - 1.01 = ` **19.39 V** >= 16 V -> **PASS**. Cross-check: doubling the run to 500 ft doubles the drop to 2.02 V,
leaving **18.38 V** -- still above 16 V, but a 1000 ft run at 2.0 A would fail and force heavier wire or a NAC extender.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["low-voltage", "fire"]`, beside `access-control-power-supply`); a
`tile-meta.js` `_TILES` entry (`A`); a `citations.js` entry (NFPA 72 NAC method, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 250 ft example plus the 500 ft cross-check, pinning the CUSTV, drop, and EOL);
`test/fixtures/compute-map.js` (`fire-alarm-nac-voltage-drop` -> `computeFireAlarmNacVoltageDrop`, module
`../../calc-lowvoltage.js`); `scripts/related-tiles.mjs` (-> `standby-battery-sizing` / `voltage-drop` /
`lv-cable-pull-footage`); `data/search/aliases.json` (5 collision-checked aliases: "nac voltage drop", "notification
appliance circuit voltage", "fire alarm voltage drop", "strobe voltage drop", "end of line voltage fire alarm"), then
`node scripts/build-alias-shards.mjs`; a hand-written renderer in the `LOWVOLTAGE_RENDERERS` map leading with the
PASS/FAIL verdict (non-exported, so no DOM-sentinel dims row), and the id added to the calc-lowvoltage declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the CUSTV, drop, EOL, verdict both ways, and the error seams (non-positive inputs,
non-finite). The calc-lowvoltage.js gzip cap is raised 19000 -> 21000 with a ledger note. Verify at build, including
`check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,385 ->
1,386.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build (cap
raise); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(20.4 - 0.8 x 1.2625 -> 19.39 V EOL, PASS vs 16 V).

## 5. Roadmap position

Fire-alarm / LV install-ops beside `access-control-power-supply`, serving the fire-alarm / LV installer (low-voltage /
fire). Deliberately a design screen; the panel's regulated voltage, the appliance data, the wire table, and a stamped
fire-alarm design and the AHJ govern the final circuit. Stays evidence-driven. Continues the fire-alarm / LV install-ops
sweep at 1 new spec (v937).
