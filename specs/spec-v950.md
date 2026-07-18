# roughlogic.com Specification v950 -- NTC Thermistor Resistance to Temperature (Beta Equation) (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v949.md. Instrumentation / controls install-ops
> sweep, beside the accepted `rtd-resistance-to-temp` tile.
>
> **The gap, and the evidence for it.** The catalog converts a platinum RTD's resistance to temperature, but not the
> OTHER ubiquitous temperature sensor -- the **NTC thermistor** (the 10 kohm sensor in nearly every HVAC controller and
> appliance). Grep confirmed no thermistor / NTC / beta / Steinhart tile. Every HVAC controls and appliance tech meters
> a thermistor. The number this settles: a 10 kohm/3950 K sensor reading **20 kohm is 10.2 C** (colder -- it's a
> negative-coefficient sensor, the opposite of the RTD).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, since the beta equation mixes resistance and
temperature nonlinearly), bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input, a non-positive resistance / R0 / beta, a reference temperature at or below absolute zero, or a
resistance that yields no positive kelvin temperature returns `{ error }`. Citation discipline (v19/v22): the NTC
thermistor beta (B-parameter) equation by name, `GOVERNANCE.general`; the note states that R0 and B come from the sensor
datasheet, that resistance falls as temperature rises (NTC, opposite of the platinum RTD), that the beta form is a
two-point fit good to about +/-0.2-1 C near T0, and that a wider span uses the 3-constant Steinhart-Hart equation -- the
datasheet R-T curve, tolerance, and self-heating govern.

## 2. The tile

### 2.1 `thermistor-beta-temp` -- NTC Thermistor Resistance to Temperature (Beta Equation)

```
inputs:
  resistance_ohms  measured thermistor resistance (ohms), default 20000
  r0_ohms          nominal resistance at the reference temp (ohms, usually 10000), default 10000
  beta_k           beta / B-parameter (K, e.g. 3435-3950), default 3950
  ref_temp_c       reference temperature T0 (C, usually 25), default 25

T0 (K) = ref_temp_c + 273.15
1/T = 1/T0 + (1/beta_k) x ln(resistance_ohms / r0_ohms)   [T in kelvin]
temperature_c = 1/(that) - 273.15;  temperature_f = temperature_c x 9/5 + 32
```

**Pinned worked example.** 20 kohm on a 10 kohm/3950 K sensor: `1/T = 1/298.15 + (1/3950) ln(2)` -> T = 283.33 K =
**10.18 C** (50.32 F). Cross-check: exactly R0 (10 kohm) returns the reference **25 C** (ln 1 = 0), and 5 kohm reads
**41.5 C** -- lower resistance is hotter, the NTC signature.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["low-voltage", "hvac"]`, beside `loop-voltage-budget`); a `tile-meta.js`
`_TILES` entry (`A`); a `citations.js` entry (NTC thermistor beta equation, `GOVERNANCE.general`); `test/fixtures/worked-
examples.json` (the 20 kohm -> 10.18 C example plus the R0 -> 25 C cross-check, pinning the temperature); `test/fixtures/
compute-map.js` (`thermistor-beta-temp` -> `computeThermistorBetaTemp`, module `../../calc-lowvoltage.js`);
`scripts/related-tiles.mjs` (-> `rtd-resistance-to-temp` / `loop-signal-scaling` / `copper-resistance`); `data/search/
aliases.json` (5 collision-checked aliases: "ntc thermistor temperature", "thermistor beta equation", "10k thermistor",
"thermistor ohms to temp", "b-parameter thermistor"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer
in the `LOWVOLTAGE_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-lowvoltage
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the base temperature, the R0 anchor, the NTC direction
(monotone decreasing in resistance), and the error seams. The calc-lowvoltage.js gzip cap and the Group A group shell
are watched at build. Home tile count 1,398 -> 1,399.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(20 kohm / 10k / 3950 / 25 -> 10.18 C).

## 5. Roadmap position

Instrumentation / controls install-ops beside `rtd-resistance-to-temp`, serving the HVAC controls tech / appliance tech
(low-voltage / HVAC). Deliberately the two-point beta fit; the sensor datasheet R-T curve, tolerance class, self-heating,
and (for a wide span) the Steinhart-Hart equation govern field accuracy. Stays evidence-driven. Continues the
instrumentation / controls install-ops sweep at 1 new spec (v950).
