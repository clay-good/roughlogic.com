# roughlogic.com Specification v942 -- Inverter AC Output Circuit Conductor and OCPD (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`** (Group
> A), no new module, group, or dependency. Inherits spec.md through spec-v941.md. PV / ESS install-ops sweep, beside the
> accepted `battery-inverter-dc-conductor`, `pv-circuit-ampacity`, and `pv-interconnection-busbar` tiles.
>
> **The gap, and the evidence for it.** The catalog sizes the PV DC circuit (690.8(A)), the battery DC circuit (706), and
> checks the busbar (705.12), but nothing sizes the inverter's AC OUTPUT conductor and OCPD (690.8(B)). Grep confirmed no
> AC-output tile. Every string-inverter install runs this circuit to the point of connection. The number this settles: a
> 9.6 kW inverter at 240 V single-phase puts out 40 A, needing a **50 A** conductor on a **50 A** breaker.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling
inverter tile: the AC power carries `M L^2 T^-3`, the voltage `M L^2 T^-3 I^-1`, the phase count is dimensionless, and the
currents carry `I`. The v18/v21 contract: a non-finite or non-positive power or voltage, or a phase count other than 1
or 3, returns `{ error }`. Citation discipline (v19/v22): the AC-output method by name (I = P / (V x [1 or sqrt(3)]);
conductor and OCPD at 125% of I; OCPD to the next standard size per 240.6), `GOVERNANCE.general`; the note states that
the inverter is a continuous source (125% rule), that the datasheet's rated continuous AC output current is preferred
where given, that the 705.12 busbar / point-of-connection limit is checked separately, and that this is distinct from the
DC-side 690.8(A) 156% rule -- the inverter datasheet, the AHJ, and the adopted NEC edition govern.

## 2. The tile

### 2.1 `pv-ac-output-circuit` -- Inverter AC Output Circuit Conductor and OCPD (NEC 690.8(B))

```
inputs:
  ac_power_w    inverter continuous AC output power (W)
  ac_voltage_v  AC output voltage (V, line-to-line)
  phases        1 (single-phase) or 3 (three-phase), default 1

phase_factor         = phases == 3 ? sqrt(3) : 1
continuous_current_a = ac_power_w / (ac_voltage_v x phase_factor)
min_conductor_ampacity_a = 1.25 x continuous_current_a
ocpd_a               = next standard size (NEC 240.6) >= 1.25 x continuous_current_a
```

**Pinned worked example.** 9.6 kW inverter, 240 V single-phase:
`I = 9600 / 240 = ` **40 A**; `conductor >= 1.25 x 40 = ` **50 A** (a #6 Cu at 75 C); OCPD = next standard >= 50 = **50
A**. Cross-check: the same 9.6 kW inverter at **208 V three-phase** is `9600 / (208 x sqrt(3)) = ` **26.6 A**, a 35 A OCPD
-- three-phase spreads the same power over three conductors, cutting the per-conductor current by sqrt(3).

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar", "electrical"]`, beside `battery-inverter-dc-conductor`); a
`tile-meta.js` `_TILES` entry (`A`); a `citations.js` entry (NEC 690.8(B) / 705.60 / 240.4 / 240.6, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the single-phase example plus the three-phase cross-check, pinning the current,
conductor, and OCPD); `test/fixtures/compute-map.js` (`pv-ac-output-circuit` -> `computePvAcOutputCircuit`, module
`../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `pv-interconnection-busbar` / `microinverter-branch-count` /
`pv-circuit-ampacity`); `data/search/aliases.json` (5 collision-checked aliases: "inverter ac output circuit", "inverter
output conductor", "pv ac output circuit", "inverter breaker size", "solar inverter wire size"), then
`node scripts/build-alias-shards.mjs`; a hand-written renderer in the `ELECTRICAL_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-electrical declare list in `app.js` (reusing the `_V941_STD_OCPD`
standard-size array); the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the output current, the 125% conductor, the next-standard OCPD,
the sqrt(3) three-phase factor, and the error seams (non-positive power / voltage, bad phase count, non-finite). The
calc-electrical.js gzip cap and the Group A group shell are watched at build. Verify at build, including `check-shells`
and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,390 -> 1,391.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(9600 / 240 -> 40 A, 50 A conductor, 50 A OCPD).

## 5. Roadmap position

PV / ESS install-ops beside `battery-inverter-dc-conductor`, serving the PV installer / electrician (solar / electrical).
Deliberately a sizing estimate; the inverter datasheet, the 705.12 busbar limit, the AHJ, and the adopted NEC edition
govern. Stays evidence-driven. Continues the PV / ESS install-ops sweep at 1 new spec (v942).
