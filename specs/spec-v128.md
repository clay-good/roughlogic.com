# roughlogic.com Specification v128 -- Wye / Delta Line-to-Phase Voltage and Current (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED 2026-06-23 (package 0.73.0; part of catalog 600 -> 608). Batch spec-v121..v128 (final).** In-scope catalog expansion under
> the spec-v106 trades-only charter: one electrical tile from the first-principles three-phase
> winding relations, public physics, redo-not-harm. Adds one tile to **`calc-electrical.js`** (Group
> A); no new module, group, or dependency. Inherits spec.md through spec-v127.md.
>
> **The gap, and the evidence for it.** The catalog computes three-phase power (`three-phase`) and
> solves the AC power triangle (`power-triangle`), but neither maps line quantities to phase
> (winding) quantities across the two connections: in a wye the line voltage is root-3 times the
> phase voltage while the currents are equal, and in a delta the line current is root-3 times the
> phase current while the voltages are equal. That mapping is what an electrician needs to read a
> transformer connection, set up wye-delta motor starting, interpret metering, or confirm a winding
> voltage -- and it is the one three-phase fundamental with no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Voltages are electric potential and currents are electric current (the same dimension tokens the
existing Group A `ohms-law` and `three-phase` tiles use); the root-3 factor and power factor are
`dimensionless`. The bundled root-3 (1.73205) constant is an annotated editable field. The v18/v21
contract: any non-finite input, a negative voltage or current, or an out-of-range power factor
(outside [0, 1]), returns `{ error }`; the only divisions are by the guarded-positive root-3
constant. Citation discipline (v19/v22): `GOVERNANCE.general` over the wye relation
`V_line = root-3 x V_phase, I_line = I_phase`, the delta relation
`V_line = V_phase, I_line = root-3 x I_phase`, and the connection-independent
`S = root-3 x V_line x I_line`; the equipment nameplate governs the actual connection.

## 2. The tile

### 2.1 `delta-wye-line-phase` -- Line vs Phase Voltage and Current, Wye and Delta

```
inputs:
  configuration   enum            wye (star) or delta
  line_voltage_v  V               measured line-to-line voltage
  line_current_a  I               measured line current
  power_factor    dimensionless   for the power echo (default 1.0)

wye:   phase_voltage = line_voltage_v / root3   ; phase_current = line_current_a
delta: phase_voltage = line_voltage_v           ; phase_current = line_current_a / root3
power_va = root3 x line_voltage_v x line_current_a            # connection-independent
power_w  = power_va x power_factor
```

**Pinned worked example (wye).** 208 V line, 10 A line, wye:
`phase_voltage = 208 / 1.732 = 120.1 V`, `phase_current = 10 A`,
`power_va = 1.732 x 208 x 10 = 3,602 VA`. The 120 V phase voltage is exactly the line-to-neutral a
208Y/120 system delivers. **Cross-check (delta).** 240 V line, 30 A line, delta:
`phase_voltage = 240 V`, `phase_current = 30 / 1.732 = 17.3 A`,
`power_va = 1.732 x 240 x 30 = 12,471 VA` -- the winding carries 17.3 A while the line carries 30 A,
the root-3 split that sizes delta winding conductors. The equipment nameplate governs the
connection.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the wye and delta line/phase relations and the root-3
power identity, the root-3 constant listed, `editionNote` single-edition first-principles);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`delta-wye-line-phase` -> `computeDeltaWyeLinePhase` in `../../calc-electrical.js`);
`scripts/related-tiles.mjs` (-> `three-phase` / `power-triangle` / `transformer-kva-sizing`);
`data/search/aliases.json` ("wye delta", "line to phase", "star delta", "phase voltage", "phase
current", "root 3", "208y/120"); the id appended to the existing `ELECTRICAL_RENDERERS` declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning the wye example, the delta cross-check, and error seams (non-finite, negative voltage
or current, power factor outside [0,1]). Raise the `calc-electrical.js` size cap by ~20 percent if
needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the phase-voltage, phase-
current, and power lines wrap on a phone); render-no-nan + a11y sweep, output read to the value
(208 V wye -> 120.1 V phase, 3,602 VA; 240 V delta / 30 A -> 17.3 A phase).

## 5. Roadmap position

Completes the v121..v128 electrical batch and rounds out the three-phase fundamentals alongside
`three-phase` and `power-triangle`. Further Group A growth stays evidence-driven.
