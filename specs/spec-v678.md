# roughlogic.com Specification v678 -- Water Heater Input for a Target Recovery (calc-plumbing.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`** (Group B,
> plumbing), no new module, group, or dependency. Inherits spec.md through spec-v677.md.
>
> **The gap, and the evidence for it.** Spec-v16 (`water-heater-recovery`) runs the recovery relation forward: given an
> input rating, it returns the recovery gph. The equipment-selection question a plumber asks is the inverse -- **what
> input rating do I need to sustain a target recovery rate**. The forward tile makes you guess input ratings and re-read
> the gph; the inverse solves it directly. From `gph = (input x efficiency) / (8.33 x rise)`,
> `input = recovery_gph x 8.33 x rise / efficiency`, and for an electric heater the kW output is the input divided by
> 3412 BTU/hr per kW. The number this settles: a 54.9 gph recovery over a 70 F rise at 80% needs a **40,000 BTU/hr** gas
> heater, and a lighter 25.8 gph duty at 0.98 is a **4.5 kW** electric element.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`water-heater-recovery` sibling: it reuses the same `WATER_HEATER_EFFICIENCY` defaults (0.98 electric / 0.80 atmospheric
gas / 0.94 condensing gas), the same `heater_type` select, and the same `8.33` BTU/gal/F and `3412` BTU/hr-per-kW
constants; the temperature rise is `T` and the input is a power (reported as BTU/hr and kW). The v18/v21 contract: any
non-finite input, a non-positive target recovery, a set-point at or below incoming, or a non-positive efficiency returns
`{ error }`. Citation discipline (v19/v22): DOE 10 CFR 430 / AHRI 1300 recovery relation solved for the input, by name
and `GOVERNANCE.plumbing` matching the sibling; the note states that **this is the steady recovery input (the AHRI
first-hour rating also credits the stored tank volume, so a tank can meet a short peak with less input), the efficiency
defaults are test-procedure conventions and the nameplate governs, and the AHJ governs**.

## 2. The tile

### 2.1 `water-heater-input` -- Water Heater Input for a Target Recovery

```
inputs:
  heater_type          -     gas_atmospheric / gas_condensing / electric (sets the default efficiency + kW output)
  target_recovery_gph  gph   desired recovery rate (> 0)
  efficiency           -     recovery efficiency (blank = default by type)
  incoming_F           F     incoming water temperature
  setpoint_F           F     set-point temperature (> incoming)

delta_T = setpoint_F - incoming_F
input_btu_hr = target_recovery_gph x 8.33 x delta_T / efficiency
input_kw     = input_btu_hr / 3412
```

**Pinned worked example (a gas heater).** gas atmospheric, target = 54.879 gph, eff = 0.80, 50 -> 120 F (rise 70):
`input = 54.879 x 8.33 x 70 / 0.80 = ` **40,000 BTU/hr**; feeding 40,000 BTU/hr back through `water-heater-recovery`
returns 54.879 gph, the input. **Cross-check (an electric heater).** electric, eff 0.98, a 25.8 gph duty over the same
rise: `input = 25.8 x 8.33 x 70 / 0.98 = 15,354 BTU/hr = ` **4.5 kW** -- the kW output an electric element needs for that
recovery.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing"]`, beside `water-heater-recovery`; Group B has no exact-count
audit block, so no count bump); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (DOE / AHRI solved for input,
`GOVERNANCE.plumbing` matching the sibling, the note per §1); `test/fixtures/worked-examples.json` (both examples, gas
and electric); `test/fixtures/compute-map.js` (`water-heater-input` -> `computeWaterHeaterInput` in
`../../calc-plumbing.js`); `scripts/related-tiles.mjs` (-> `water-heater-recovery` / `water-heater-storage-sizing` /
`tankless-gpm` / `gas-appliance-demand`, and the forward tile links back); `data/search/aliases.json` ("water heater
input for recovery", "btu for target recovery rate", "kw for water heater recovery", plus adjacent rows);
`PLUMBING_RENDERERS["water-heater-input"]` via a hand-written renderer with the same `heater_type` `makeSelect` as the
sibling (the select feeds the efficiency default and the kW-vs-BTU display, satisfying check-dead-inputs) and the id
added to the calc-plumbing declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the default-efficiency
lookup, the round-trip through `computeWaterHeaterRecovery` for gas and electric, and the error seams. The
calc-plumbing.js gzip cap is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 40,000 BTU/hr for a 54.9 gph recovery).

## 5. Roadmap position

Pairs the forward recovery tile (`water-heater-recovery`, recovery from input) with its inverse (input from a target
recovery), the two halves of the water-heater selection question. Further Group B growth stays evidence-driven.
