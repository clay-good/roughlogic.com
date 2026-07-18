# roughlogic.com Specification v949 -- Loop-Powered (2-Wire) 4-20 mA Transmitter Voltage Budget (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v948.md. Instrumentation / controls install-ops
> sweep, beside the accepted `loop-signal-scaling`, `rtd-resistance-to-temp`, and `pulse-flowmeter-k-factor` tiles.
>
> **The gap, and the evidence for it.** The catalog scales the 4-20 mA signal but never checks whether the loop can
> POWER a 2-wire transmitter -- the maximum-load-resistance / compliance-voltage check every loop designer runs. Grep
> confirmed no loop-power / two-wire / compliance / burden tile. Undersize the supply or overrun the wire and the
> transmitter starves and reads wrong. The number this settles: a 24 Vdc loop tops out at a **675 ohm** total loop
> resistance for a 10.5 V transmitter.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, mixing volts, ohms, and a fixed current),
bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a
non-positive supply, a transmitter minimum at or above the supply (no loop possible), or a negative load or wire
resistance returns `{ error }`. Citation discipline (v19/v22): the loop-power voltage-budget relation by name (2-wire
transmitter compliance-voltage practice; Ohm's law at the 20 mA worst case), `GOVERNANCE.general`; the note states that
the binding case is 20 mA (top of range), that the series burden is the sense/load resistor plus round-trip wire plus any
barrier/isolator, and that the transmitter's datasheet compliance voltage and the barrier burden govern.

## 2. The tile

### 2.1 `loop-voltage-budget` -- Loop-Powered (2-Wire) 4-20 mA Transmitter Voltage Budget

```
inputs:
  supply_v              loop DC supply (Vdc), default 24
  transmitter_min_v     transmitter minimum (compliance / lift-off) voltage, default 10.5
  load_resistance_ohms  sense/load resistor at the receiver (ohms), default 250
  wire_resistance_ohms  round-trip wire + barrier/isolator resistance (ohms), default 50

max_loop_resistance_ohms  = (supply_v - transmitter_min_v) / 0.020
voltage_at_transmitter_v  = supply_v - 0.020 x (load_resistance_ohms + wire_resistance_ohms)
margin_v                  = voltage_at_transmitter_v - transmitter_min_v
within_spec               = margin_v >= 0
```

**Pinned worked example.** 24 Vdc, 10.5 V transmitter minimum, 250 ohm sense + 50 ohm wire (300 ohm total):
max total loop resistance = `(24 - 10.5)/0.020 = ` **675 ohm**; voltage at the transmitter = `24 - 0.020 x 300 = ` **18
V** (a +7.5 V margin, **PASS**), with 375 ohm of headroom. Cross-check: push the run to **600 ohm** of wire (850 ohm
total) and the transmitter gets only `24 - 0.020 x 850 = ` **7 V** -- below its 10.5 V minimum, so it **FAILS** and the
loop reads wrong.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["low-voltage", "electrical"]`, beside `pulse-flowmeter-k-factor`); a
`tile-meta.js` `_TILES` entry (`A`); a `citations.js` entry (2-wire transmitter compliance / Ohm's law, `GOVERNANCE.
general`); `test/fixtures/worked-examples.json` (the passing example plus the starved-transmitter FAIL cross-check,
pinning the ceiling, transmitter voltage, and margin); `test/fixtures/compute-map.js` (`loop-voltage-budget` ->
`computeLoopVoltageBudget`, module `../../calc-lowvoltage.js`); `scripts/related-tiles.mjs` (-> `loop-signal-scaling` /
`rtd-resistance-to-temp` / `voltage-drop`); `data/search/aliases.json` (5 collision-checked aliases: "loop voltage
budget", "4-20ma load resistance", "transmitter compliance voltage", "2-wire loop supply", "max loop resistance"), then
`node scripts/build-alias-shards.mjs`; a hand-written renderer in the `LOWVOLTAGE_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-lowvoltage declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the ceiling, the transmitter voltage and margin, the pass/fail flip, the at-the-ceiling edge, the higher-supply
monotonicity, and the error seams. The calc-lowvoltage.js gzip cap and the Group A group shell are watched at build (cap
raised for this tile). Home tile count 1,397 -> 1,398.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(24 V / 10.5 V / 300 ohm -> 18 V, 675 ohm ceiling, PASS).

## 5. Roadmap position

Instrumentation / controls install-ops beside `loop-signal-scaling`, serving the instrumentation tech / controls
electrician (low-voltage / electrical). Deliberately the 20 mA worst-case DC budget; the transmitter datasheet compliance
voltage, the barrier/isolator burden, and the real wire resistance govern. Stays evidence-driven. Continues the
instrumentation / controls install-ops sweep at 1 new spec (v949).
