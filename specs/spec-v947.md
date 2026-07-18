# roughlogic.com Specification v947 -- RTD (Pt100 / Pt1000) Resistance to Temperature (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v946.md. Instrumentation / controls install-ops
> sweep, beside the just-landed `loop-signal-scaling` tile.
>
> **The gap, and the evidence for it.** The catalog now scales a 4-20 mA loop, but nothing converts the other universal
> sensor reading -- a **platinum RTD's resistance** -- to temperature. Grep confirmed no RTD / Pt100 / Callendar-Van
> Dusen tile anywhere. Every instrumentation and HVAC controls tech meters an RTD and needs the temperature. The number
> this settles: a Pt100 reading **119.40 ohms is 50 C**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, since the relation is a nonlinear mix of resistance
and temperature), bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite
input, a non-positive resistance or R0, or a resistance outside the platinum range (a negative discriminant, no real
temperature) returns `{ error }`. Citation discipline (v19/v22): the IEC 60751 Callendar-Van Dusen relation by name (not
reproduced from a table), with the standard coefficients A = 3.9083e-3 and B = -5.775e-7, `GOVERNANCE.general`; the note
states that the inverse is exact for T at or above 0 C, that below 0 C the dropped C-term keeps the error within about
0.02 C to -40 C, and that the reading must be lead-compensated (3/4-wire) -- an uncompensated 2-wire measurement adds
lead resistance and reads hot; the sensor calibration, class, and self-heating govern.

## 2. The tile

### 2.1 `rtd-resistance-to-temp` -- RTD (Pt100 / Pt1000) Resistance to Temperature (IEC 60751)

```
inputs:
  resistance_ohms  measured RTD resistance (ohms), default 119.397
  r0_ohms          ice-point (0 C) resistance: 100 = Pt100, 1000 = Pt1000, default 100

A = 3.9083e-3, B = -5.775e-7  (IEC 60751)
T (C) = ( -A + sqrt( A^2 - 4 B (1 - resistance_ohms / r0_ohms) ) ) / (2 B)   [inverse of R = R0(1 + A T + B T^2)]
T (F) = T (C) x 9/5 + 32
```

**Pinned worked example.** Pt100 reading 119.397 ohms: `T = 50.00 C` (**122 F**). Cross-check: 138.5055 ohms is 100 C,
and a **Pt1000** reading 1385.055 ohms (the same resistance ratio at R0 = 1000) is also **100 C** -- the Pt100 and
Pt1000 share one curve, scaled by 10. A sub-zero 84.271 ohms returns about -40 C (the close approximation).

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["low-voltage", "hvac"]`, beside `loop-signal-scaling`); a `tile-meta.js`
`_TILES` entry (`A`); a `citations.js` entry (IEC 60751 Callendar-Van Dusen, `GOVERNANCE.general`); `test/fixtures/worked-
examples.json` (the Pt100 50 C example plus the Pt1000 100 C cross-check, pinning the temperature); `test/fixtures/
compute-map.js` (`rtd-resistance-to-temp` -> `computeRtdResistanceToTemp`, module `../../calc-lowvoltage.js`);
`scripts/related-tiles.mjs` (-> `loop-signal-scaling` / `copper-resistance` / `structured-cabling-channel`);
`data/search/aliases.json` (5 collision-checked aliases: "rtd resistance to temperature", "pt100 temperature", "pt1000
resistance", "rtd ohms to celsius", "platinum rtd"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer
in the `LOWVOLTAGE_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-lowvoltage
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the 50 C / 0 C / 100 C anchors, the Pt1000 scaling, the
sub-zero approximation, the monotonicity, and the error seams (non-positive resistance / R0, out-of-range, non-finite).
The calc-lowvoltage.js gzip cap and the Group A group shell are watched at build (cap raised for this tile). Home tile
count 1,395 -> 1,396.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(119.397 ohms / Pt100 -> 50 C).

## 5. Roadmap position

Instrumentation / controls install-ops beside `loop-signal-scaling`, serving the instrumentation tech / HVAC controls
tech (low-voltage / HVAC). Deliberately the IEC 60751 curve solved for temperature; the sensor calibration, tolerance
class, self-heating, and lead-wire compensation govern field accuracy. Stays evidence-driven. Continues the
instrumentation / controls install-ops sweep at 1 new spec (v947).
