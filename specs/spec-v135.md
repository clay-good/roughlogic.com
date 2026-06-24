# roughlogic.com Specification v135 -- Cutting Power and Spindle Torque from Material Removal Rate (calc-machining.js, Group K, 1 New Tile)

> **Status: LANDED 2026-06-23 (catalog 615, package 0.74.0). Batch spec-v129..v135 (final).** In-scope catalog expansion under
> the spec-v106 trades-only charter: one machining tile from the first-principles specific-cutting-
> energy relation, machinist-and-tooling governed, redo-not-harm. Adds one tile to
> **`calc-machining.js`** (Group K); no new module, group, or dependency. Inherits spec.md through
> spec-v134.md.
>
> **The gap, and the evidence for it.** The catalog computes the material removal rate
> (`material-removal-rate`) and the speeds and feeds that produce it (`cutting-speed-rpm`,
> `machining-time`), but never the power and torque that rate demands: will the spindle stall, is the
> motor big enough, what torque is on the cutter? Specific cutting energy turns MRR into horsepower
> and spindle torque, the check a machinist makes before committing a heavy cut, and it has no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Material removal rate is `L^3 T^-1` (in^3/min), spindle speed is `T^-1` (rpm), cutting and motor
power are power (`M L^2 T^-3`, horsepower), and spindle torque is `M L^2 T^-2` (lb-ft); machine
efficiency is `dimensionless`. The bundled unit-power table (specific cutting energy, hp per
in^3/min: ~1.0 carbon steel, ~0.33 aluminum, ~1.5 stainless / titanium) and the 5252 torque
constant (reused from v122) are annotated editable fields. The v18/v21 contract: any non-finite
input, a non-positive MRR, unit power, or rpm, or an efficiency outside (0, 1], returns `{ error }`;
the only divisions are by guarded-positive efficiency and rpm. Citation discipline (v19/v22):
`GOVERNANCE.general` over `cutting_hp = MRR x unit_power`, `motor_hp = cutting_hp / efficiency`, and
`torque = 5252 x cutting_hp / rpm`; the Machinery's Handbook unit-power values are tabular
references and the tool, sharpness, and machine govern the real draw.

## 2. The tile

### 2.1 `spindle-power-torque` -- Cutting Horsepower and Spindle Torque

```
inputs:
  mrr_in3_min     L^3 T^-1       material removal rate (from material-removal-rate)
  unit_power_hp   hp/(in3/min)   specific cutting energy (default 1.0 carbon steel)
  efficiency_pct  dimensionless  spindle drive efficiency (default 80)
  rpm             T^-1           spindle speed (for torque)

cutting_hp        = mrr_in3_min x unit_power_hp
motor_hp          = cutting_hp / (efficiency_pct / 100)
spindle_torque_lbft = 5252 x cutting_hp / rpm
```

**Pinned worked example.** 3.0 in^3/min in carbon steel (unit power 1.0), 80 percent efficient,
800 rpm: `cutting_hp = 3.0 x 1.0 = 3.0 hp`; `motor_hp = 3.0 / 0.80 = 3.75 hp`;
`spindle_torque = 5252 x 3.0 / 800 = 19.7 lb-ft`. **Cross-check (aluminum).** The same 3.0 in^3/min
in aluminum (unit power 0.33) at 800 rpm: `cutting_hp = 0.99 hp`, `motor_hp = 1.24 hp`,
`spindle_torque = 5252 x 0.99 / 800 = 6.5 lb-ft` -- aluminum draws about a third the power and
torque for the same removal rate, the expected specific-energy difference. The tool and machine
govern the real cut.

## 3. Wiring

A `tools-data.js` row (group `K`, trade `["machinist", "mechanic"]`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the cutting-hp / motor-hp / torque formulas, the
unit-power table and the 5252 constant listed, `editionNote` noting Machinery's Handbook unit-power
as a tabular reference and the tool/machine caveat); `test/fixtures/worked-examples.json` (example +
cross-check); `test/fixtures/compute-map.js` (`spindle-power-torque` -> `computeSpindlePowerTorque`
in `../../calc-machining.js`); `scripts/related-tiles.mjs` (-> `material-removal-rate` /
`cutting-speed-rpm` / `machining-time`); `data/search/aliases.json` ("cutting power", "spindle
horsepower", "unit power", "specific cutting energy", "spindle torque", "stall"); the id appended to
the existing `MACHINING_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, cross-check, and error
seams (non-finite, mrr/unit_power/rpm <= 0, efficiency outside (0,1]). Raise the `calc-machining.js`
`check-module-sizes.mjs` cap by ~20 percent if needed (dated comment); bump the `citations.js` cap
if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the cutting-hp, motor-hp, and
torque lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (3.0 in^3/min
steel / 800 rpm -> 3.0 cutting hp, 3.75 motor hp, 19.7 lb-ft).

## 5. Roadmap position

Closes the v129..v135 metal-trades batch and completes the machining cut-planning family (MRR,
speeds and feeds, time, now power and torque). Further Group K growth stays evidence-driven.
