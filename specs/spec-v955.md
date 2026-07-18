# roughlogic.com Specification v955 -- Series R-L-C Reactance, Impedance, and Resonant Frequency (calc-powerquality.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-powerquality.js`** (Group
> A), no new module, group, or dependency. Inherits spec.md through spec-v954.md. Power-quality sweep, beside the
> accepted `harmonic-resonance` and `voltage-drop-reactance` tiles.
>
> **The gap, and the evidence for it.** The catalog computes voltage drop WITH reactance (off the Table 9 R/X), the
> harmonic parallel-resonance ORDER, and the cap-bank limit -- but nothing gives the fundamental XL / XC / Z / f0 an
> electrician uses for filter, coil, and cable-reactance work. Grep confirmed no series-RLC reactance/impedance/resonant-
> frequency tile. The number this settles: a 10 ohm / 0.05 H / 50 uF branch at 60 Hz has a **35.6 ohm** impedance and a
> **100.7 Hz** resonant frequency.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, since the relations mix Hz, henries, farads, and
ohms), bounds-fuzzer, worked-example registry, and reviewer-signoff apply. This module guards finiteness inline (no
shared `_finiteGuard`); the v18/v21 contract: a non-finite input, a non-positive frequency, inductance, or capacitance,
or a negative resistance returns `{ error }`. Citation discipline (v19/v22): the series-RLC relations by name,
`GOVERNANCE.general`; the note states that this is a single-frequency, linear, lumped-element steady-state model and that
a real cable/winding is distributed with frequency-dependent resistance, so a full harmonic or transient study governs a
power-system resonance investigation.

## 2. The tile

### 2.1 `rlc-reactance-resonance` -- Series R-L-C Reactance, Impedance, and Resonant Frequency

```
inputs:
  frequency_hz    frequency (Hz), default 60
  resistance_ohm  series resistance R (ohms), default 10
  inductance_h    inductance L (H), default 0.05
  capacitance_uf  capacitance C (uF), default 50

inductive_reactance_ohm  = 2 pi f L
capacitive_reactance_ohm = 1 / (2 pi f C)          [C in farads = uF x 1e-6]
impedance_ohm            = sqrt(R^2 + (XL - XC)^2)
power_factor             = R / Z
resonant_frequency_hz    = 1 / (2 pi sqrt(L C))
```

**Pinned worked example.** 60 Hz, 10 ohm, 0.05 H, 50 uF: `XL = 2 pi 60 x 0.05 = ` **18.85 ohm**, `XC = 1/(2 pi 60 x
50e-6) = ` **53.05 ohm** (net capacitive, leading), `Z = sqrt(10^2 + 34.2^2) = ` **35.63 ohm**, PF **0.281**, and
`f0 = 1/(2 pi sqrt(0.05 x 50e-6)) = ` **100.66 Hz**. Cross-check: driving the branch at its resonant frequency (100.66
Hz) makes XL = XC, so the net reactance vanishes, Z collapses to just **R = 10 ohm**, and the power factor is **1**.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, before `harmonic-resonance`); a `tile-meta.js` `_TILES` entry
(`A`); a `citations.js` entry (series-RLC relations, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the
base example plus the at-resonance cross-check, pinning XL/XC/Z/f0/PF); `test/fixtures/compute-map.js` (`rlc-reactance-
resonance` -> `computeRlcReactanceResonance`, module `../../calc-powerquality.js`); `scripts/related-tiles.mjs` (->
`harmonic-resonance` / `pf-correction` / `voltage-drop-reactance`); `data/search/aliases.json` (5 collision-checked
aliases: "inductive reactance", "capacitive reactance", "rlc impedance", "resonant frequency", "series rlc"), then
`node scripts/build-alias-shards.mjs`; a hand-written renderer in the `POWERQUALITY_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-powerquality declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning XL/XC/Z/f0/PF, the collapse-to-R at resonance, the XL-rises / XC-falls monotonicity, the R-independence of f0,
and the error seams. The calc-powerquality.js gzip cap is watched at build (raised for this tile). Home tile count 1,403
-> 1,404.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(60 Hz / 10 / 0.05 / 50 -> Z 35.6 ohm, f0 100.7 Hz).

## 5. Roadmap position

Power quality beside `harmonic-resonance`, serving the electrician / power-quality tech (electrical). Deliberately the
single-frequency lumped-element model; a real distributed cable/winding and a full harmonic or transient study govern a
power-system resonance investigation. Stays evidence-driven. Continues the power-quality sweep at 1 new spec (v955).
