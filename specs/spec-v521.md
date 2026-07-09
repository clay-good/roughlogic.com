# roughlogic.com Specification v521 -- Motor Short-Circuit Contribution (calc-motor.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-motor.js`**
> (Group A, the motor bench); no new module, group, or dependency. Inherits spec.md through spec-v520.md.
>
> **The gap, and the evidence for it.** `short-circuit-pp` gives the available fault current from the utility and
> transformer, but on a bus with running motors that is not the whole fault. For the first cycle after a fault, every
> spinning motor becomes a generator: its rotating inertia drives current **into** the fault, and the contribution is
> roughly the motor's full-load current divided by its subtransient reactance -- about 4 to 6 times FLA. Ignore it and
> the interrupting duty is under-reported, which can leave a panel's AIC rating exceeded by the real first-cycle
> current. The tile sums the motor contribution and adds it to the utility source, so the total first-cycle fault the
> gear must interrupt is on the table. The catch it makes explicit is that this is a **first-cycle** effect that decays
> quickly (it matters for the momentary and interrupting ratings, not the steady-state fault), and that the standard
> multiplier depends on the reference: the classic "5 times FLA" rule versus the 4x of IEEE C37.13. The tile takes the
> summed motor full-load current (or horsepower), the subtransient reactance, and the utility fault current, and returns
> the motor contribution and the total.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The motor full-load
current, the contribution, the utility fault current, and the total are currents (`I`, in amps); the per-unit
subtransient reactance is `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive summed motor
current, a subtransient reactance outside `(0, 1]`, or a negative utility fault current returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the motor-contribution relations by name (IEEE C37.13 / IEEE 141
first-cycle motor contribution); `editionNote` names the **motor short-circuit contribution (first cycle)**, prints
`contribution = motor_fla / x_subtransient_pu` and `total = utility_fault + contribution`, and states that **a running
motor feeds the fault for the first cycle at roughly its full-load current divided by its subtransient reactance (about
4 to 6 times FLA), this raises the momentary and interrupting duty the gear must survive so ignoring it can leave the
AIC rating exceeded, the contribution decays within a few cycles (it is not a steady-state source), grouped small motors
are often taken at a lumped 4x-FLA per IEEE C37.13 while a single large machine uses its own reactance, and a full
short-circuit study governs** -- a design aid, not the engineer of record.

## 2. The tile

### 2.1 `motor-fault-contribution` -- The First-Cycle Current the Utility Number Leaves Out

```
inputs:
  motor_fla_a         A     summed full-load current of the running motors on the bus
  x_subtransient_pu   -     subtransient reactance per unit (default 0.167 = 16.7%)
  utility_fault_a     A     the available fault current from the utility / transformer

contribution = motor_fla_a / x_subtransient_pu       [A]   first-cycle motor feed
total        = utility_fault_a + contribution        [A]   total first-cycle fault
```

**Pinned worked example (500 A of running motors at 16.7% subtransient reactance, on a 22 kA bus).**
`contribution = 500 / 0.167 = ` **2,994 A** -- about 6 times the motor full-load current -- so the total first-cycle
fault is `22,000 + 2,994 = ` **24,994 A**, not 22 kA. A panel rated exactly 22 kA AIC would be under-rated by the motor
feed. **Cross-check (the lumped 4x rule for grouped small motors).** Treat the same 500 A of small motors at the IEEE
C37.13 lumped `4x` (equivalent to `x = 0.25` per unit): `contribution = 500 / 0.25 = ` **2,000 A**, total
`24,000 A` -- a lower but still material adder that the utility-only number misses. The tile returns the motor
contribution and the total first-cycle fault.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the subtransient example + the
lumped-4x cross-check); `test/fixtures/compute-map.js` (`motor-fault-contribution` -> `computeMotorFaultContribution`
in `../../calc-motor.js`); `scripts/related-tiles.mjs` (-> `short-circuit-pp` / `motor-fla` / `asymmetrical-fault-xr`);
`data/search/aliases.json` ("motor fault contribution", "motor short circuit", "first cycle fault", "motor
contribution aic", "subtransient reactance", "5x fla fault", "interrupting duty motors", "momentary rating"); the id
appended to the motor renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the FLA/reactance contribution, the total sum, and the error seams
(non-finite, non-positive motor FLA, reactance out of range, negative utility fault). Hand-writes its renderer
(mirroring the calc-motor.js `motor-fla` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the contribution / total stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the 500 A example -> 2,994 A contribution, 24,994 A total).

## 5. Roadmap position

Completes the available-fault picture beside `short-circuit-pp` (utility source) and `asymmetrical-fault-xr` (the
first-cycle asymmetry), feeding the total the gear's AIC must exceed. A generator-contribution companion and a
per-motor-reactance library (by NEMA design and size) are deliberate future follow-ons. Further Group A growth stays
evidence-driven.
