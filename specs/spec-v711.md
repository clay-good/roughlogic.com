# roughlogic.com Specification v711 -- Max Material Removal Rate from Spindle Power (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v710.md. Sweep-9 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `spindle-power-torque` tile runs the specific-cutting-energy
> relation forward: from a removal rate it returns the motor horsepower a cut needs. The shop question is the inverse --
> **given the motor I have, how much stock can I remove per minute**. Since the spindle delivers
> `cutting_hp = motor_hp x efficiency` and each in3/min costs the unit power, `max_MRR = motor_hp x efficiency / unit_power`.
> The number this settles: a **5 hp** spindle at 80% efficiency removes up to **4.0 in3/min** of carbon steel (unit power
> 1.0), or **12.1 in3/min** of aluminum (0.33).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`spindle-power-torque` sibling: the motor and cutting horsepower are `M L^2 T^-3`, the removal rate is `L^3 T^-1`, and the
unit power and efficiency are dimensionless. The v18/v21 contract: any non-finite input, a non-positive motor horsepower
or unit power, or an efficiency outside (0, 100] returns `{ error }`. Citation discipline (v19/v22): the specific-cutting-
energy relation solved for the removal rate, `GOVERNANCE.general` matching the sibling, citing Machinery's Handbook; the
note states that **this is the power (stall) limit only -- the depth/width/feed that reaches it, the tool strength, the
rigidity, and the finish are separate limits, a light finishing pass runs far below it, and the tool and machine govern
the real cut**.

## 2. The tile

### 2.1 `spindle-max-mrr` -- Max Material Removal Rate from Spindle Power

```
inputs:
  available_motor_hp   M L^2 T^-3    spindle motor horsepower (> 0)
  unit_power_hp        dimensionless specific cutting energy, hp per in3/min (> 0, default 1.0)
  efficiency_pct       dimensionless drive efficiency (0-100, default 80)

cutting_hp = available_motor_hp x (efficiency_pct / 100)
max_mrr_in3_min = cutting_hp / unit_power_hp
```

**Pinned worked example.** motor = 5 hp, eff = 80%, unit power = 1.0 (carbon steel):
`cutting_hp = 5 x 0.80 = 4.0 hp`, `max_MRR = 4.0 / 1.0 = ` **4.0 in3/min**; feeding 4.0 in3/min back through
`spindle-power-torque` returns a 5 hp motor requirement, the input. Aluminum's lower 0.33 unit power lifts the same motor
to 12.1 in3/min.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machinist","mechanic"]`) placed beside `spindle-power-torque` in the later
spec-vNN section, well past the Group K exact-12 audit block (the original v4 Mechanic block); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (relation solved for the removal rate, `GOVERNANCE.general` matching the sibling);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`spindle-max-mrr` ->
`computeSpindleMaxMrr`); `scripts/related-tiles.mjs` (-> `spindle-power-torque` / `material-removal-rate` /
`machining-time` / `cutting-speed-rpm`); `data/search/aliases.json` (5 collision-checked question aliases: "max removal
rate for my spindle hp", "biggest cut for available horsepower", ...); the calc-machining `MACHINING_RENDERERS` map entry
via a hand-written renderer (three number fields) and the id added to the calc-machining declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeSpindlePowerTorque` across an
hp/unit-power/efficiency sweep, the lower-unit-power-higher-MRR monotonicity, and the error seams. The calc-machining.js
gzip cap is raised 15000 -> 16500 B (the module was at 97.9%). Verify at build, including `check-shells`. Lazy-loaded,
absent from home first paint. Home tile count 1,159 -> 1,160.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 4.0 in3/min for a 5 hp
carbon-steel cut at 80% efficiency).

## 5. Roadmap position

Pairs the forward power tile (`spindle-power-torque`, hp from a removal rate) with its inverse (removal rate from the
motor you have), the two halves of the power-limited cut. Further Group K machining growth stays evidence-driven.
