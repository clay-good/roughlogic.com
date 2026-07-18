# roughlogic.com Specification v925 -- Rotary Phase Converter Idler Sizing (calc-motor.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-motor.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v924.md. Motor / small-shop power sweep, beside the
> accepted `reduced-voltage-starter` and `vfd-reflected-wave` tiles.
>
> **The gap, and the evidence for it.** The catalog has the motor bench (starting, VFD, protection) but nothing sizes a
> **rotary phase converter**. Grep confirmed no phase-converter tile. Every single-phase shop running three-phase
> machinery sizes an idler. The number this settles: a 10 HP lathe with a 5 HP mill also running needs a **20 HP** idler.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling motor
tiles: the motor and idler HP carry `M L^2 T^-3` (power), and the start factor is dimensionless. The v18/v21 contract: a
non-finite or non-positive HP, a start factor below 1, or a total running HP below the largest single motor returns
`{ error }`. Citation discipline (v19/v22): the idler-sizing rule by name (idler HP = max(start factor x largest motor,
total running HP)), `GOVERNANCE.general`; the note states that the idler must both start the largest motor across the
line (a ~2x factor for normal loads, ~3x for high-inertia) and run the aggregate load, that undersizing stalls the
converter while oversizing wastes idle power, and that the converter manufacturer's data and the motors' locked-rotor
current govern.

## 2. The tile

### 2.1 `rotary-phase-converter-sizing` -- Rotary Phase Converter Idler Sizing

```
inputs:
  largest_motor_hp   largest single motor started across the line (HP)
  total_running_hp   total HP running at once (HP, >= largest)
  start_factor       start allowance (~2 normal, ~3 high-inertia, default 2)

start_demand_hp = start_factor x largest_motor_hp
idler_hp_min    = max(start_demand_hp, total_running_hp)
```

**Pinned worked example.** 10 HP largest, 15 HP total running, 2x start:
`start = 2 x 10 = 20`; `idler = max(20, 15) = ` **20 HP** (starting the largest motor governs). Cross-check: a shop whose
largest motor is only 5 HP but runs 30 HP at once is `max(2 x 5, 30) = ` **30 HP** -- there the aggregate running load
governs, not the start, so the two duties trade off depending on the motor mix.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical", "machinist"]`, beside `vfd-reflected-wave`); a `tile-meta.js`
`_TILES` entry (`A`); a `citations.js` entry (idler-sizing rule, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the start-governs example plus the running-load-governs cross-check, pinning the
idler HP); `test/fixtures/compute-map.js` (`rotary-phase-converter-sizing` -> `computeRotaryPhaseConverter`, module
`../../calc-motor.js`); `scripts/related-tiles.mjs` (-> `reduced-voltage-starter` / `motor-synchronous-speed-slip` /
`three-phase`); `data/search/aliases.json` (5 collision-checked aliases: "rotary phase converter", "phase converter
sizing", "idler sizing", "phase converter hp", "single to three phase converter"), then
`node scripts/build-alias-shards.mjs`; a hand-written renderer in the `MOTOR_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-motor declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the
idler size and governing term across three motor mixes and the error seams (non-positive HP, start factor < 1, total <
largest, non-finite). The calc-motor.js gzip cap is watched at build. Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,373 -> 1,374.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(max(2 x 10, 15) -> 20 HP idler).

## 5. Roadmap position

Motor / small-shop power tile beside `reduced-voltage-starter`, serving the electrician / machine-shop owner (electrical
/ machinist). Deliberately a rule-of-thumb screen; the converter manufacturer's data and the motors' locked-rotor
current govern. Stays evidence-driven. Continues the motor / small-shop power sweep at 1 new spec (v925).
