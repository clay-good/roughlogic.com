# roughlogic.com Specification v941 -- Battery-to-Inverter DC Conductor and OCPD (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`** (Group
> A), no new module, group, or dependency. Inherits spec.md through spec-v940.md. PV / ESS install-ops sweep, beside the
> accepted `pv-circuit-ampacity` and `wire-ampacity` tiles.
>
> **The gap, and the evidence for it.** The catalog sizes the PV DC circuit (690.8(A)) and does voltage drop for marine /
> LV DC, but nothing sizes the battery-to-inverter DC conductor and its OCPD. Grep confirmed no battery-inverter DC tile.
> Every off-grid / ESS job sizes this high-current run. The number this settles: a 4 kW inverter on a 48 V bank draws
> about **92.6 A**, needing a **115.7 A** conductor on a **125 A** fuse.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling
electrical tiles: the inverter power carries `M L^2 T^-3`, the battery voltage `M L^2 T^-3 I^-1`, the efficiency is
dimensionless, and the currents carry `I`. The v18/v21 contract: a non-finite or non-positive inverter power or battery
voltage, or an efficiency outside 0 to 100 percent, returns `{ error }`. Citation discipline (v19/v22): the DC-sizing
method by name (I_dc = P / (V x efficiency); conductor and OCPD at 125% of I_dc; OCPD to the next standard size per
240.6), `GOVERNANCE.general`; the note states that a lower bank voltage pulls proportionally more current, that a battery
can deliver an enormous fault current so a listed DC-rated (often Class T) fuse and disconnect are used, that the run
should be short and heavy and terminated at the battery torque, and that the inverter and battery datasheets, the
available fault current, the AHJ, and the adopted NEC edition govern.

## 2. The tile

### 2.1 `battery-inverter-dc-conductor` -- Battery-to-Inverter DC Conductor and OCPD (NEC 690.9 / 706)

```
inputs:
  inverter_power_w   inverter continuous AC power (W)
  battery_voltage_v  battery bank voltage (V)
  efficiency_pct     inverter efficiency (%, default 90)

dc_current_a            = inverter_power_w / (battery_voltage_v x efficiency_pct/100)
min_conductor_ampacity_a = 1.25 x dc_current_a
ocpd_a                  = next standard size (NEC 240.6) >= 1.25 x dc_current_a
```

**Pinned worked example.** 4 kW inverter, 48 V bank, 90% efficiency:
`I_dc = 4000 / (48 x 0.90) = ` **92.6 A**; `conductor >= 1.25 x 92.6 = ` **115.7 A** (a 1/0 Cu at 75 C); OCPD = next
standard >= 115.7 = **125 A**. Cross-check: the same 4 kW inverter on a **24 V** bank draws `4000 / (24 x 0.90) = `
**185.2 A** -- double the current and a 250 A OCPD, which is why higher bank voltages are preferred for large inverters.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar", "electrical"]`, beside `welder-resistance-circuit-conductor`); a
`tile-meta.js` `_TILES` entry (`A`); a `citations.js` entry (NEC 690.8(B) / 706 / 240.4 / 240.6, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 48 V example plus the 24 V cross-check, pinning the DC current, conductor, and
OCPD); `test/fixtures/compute-map.js` (`battery-inverter-dc-conductor` -> `computeBatteryInverterDcConductor`, module
`../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `pv-circuit-ampacity` / `wire-ampacity` /
`off-grid-battery`); `data/search/aliases.json` (5 collision-checked aliases: "battery inverter conductor", "battery
cable sizing", "inverter dc conductor", "off grid battery wire size", "battery fuse sizing"), then
`node scripts/build-alias-shards.mjs`; a hand-written renderer in the `ELECTRICAL_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-electrical declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the DC current, the 125% conductor, the next-standard OCPD across two bank voltages, and the error seams
(non-positive power / voltage, efficiency out of range, non-finite). The calc-electrical.js gzip cap and the Group A
group shell are watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build.
Lazy-loaded, absent from home first paint. Home tile count 1,389 -> 1,390.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(4000 / (48 x 0.90) -> 92.6 A, 115.7 A conductor, 125 A OCPD).

## 5. Roadmap position

PV / ESS install-ops beside `pv-circuit-ampacity`, serving the PV / off-grid installer (solar / electrical). Deliberately
a sizing estimate; the inverter and battery datasheets, the available fault current and interrupting rating, the AHJ, and
the adopted NEC edition govern. Stays evidence-driven. Continues the PV / ESS install-ops sweep at 1 new spec (v941).
