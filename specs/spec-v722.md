# roughlogic.com Specification v722 -- Max Motor HP for a Starting-Current Budget (calc-motor.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-motor.js`** (Group A), no
> new module, group, or dependency. Inherits spec.md through spec-v721.md. Sweep-11 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `motor-locked-rotor-kva` tile runs NEC 430.7(B) forward: from a
> horsepower and code letter it returns the locked-rotor (starting) current. The sizing question is the inverse -- **the
> largest motor a starting-current budget can start** (an instantaneous-trip breaker, a generator's starting-kVA limit, an
> SCCR / voltage-dip ceiling). Since LRA is linear in hp for a given code letter and voltage,
> `max_hp = budget / (kVA/hp x 1000 / (sqrt(3) x V))`. The number this settles: a **300 A** budget on a **code-G 460 V**
> feeder tops out at **~38 hp**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`motor-locked-rotor-kva` sibling: the starting current is `I` (A), the voltage is `M L^2 T^-3 I^-1`, the returned
horsepower is `M L^2 T^-3`, and the code letter, kVA/hp, and phase are dimensionless. To keep the NEC Table 430.7(B)
code-letter band and the 1-/3-phase current relation in one place, the compute reuses `computeMotorLockedRotorKva` at
`hp = 1` and divides the budget by the resulting LRA-per-hp. The v18/v21 contract: any non-finite input, a non-positive
starting current or voltage, an invalid code letter (A-V excluding I/O/Q), or a phase other than 1 or 3 returns
`{ error }`. Citation discipline (v19/v22): the LRA relation solved for the horsepower, `GOVERNANCE.electrical` matching
the sibling; the note states that **the code letter is the STARTING-kVA letter, not the design (A/B/C/D torque) letter,
this uses the conservative upper end of the band, a soft starter or wye-delta start lowers the real starting current, and
the nameplate and measured inrush govern**.

## 2. The tile

### 2.1 `motor-max-hp-for-starting-current` -- Max Motor HP for a Starting-Current Budget (NEC 430.7(B))

```
inputs:
  max_starting_current_a   I             starting-current budget (> 0)
  code_letter              dimensionless NEC 430.7(B) letter A-V (excl. I/O/Q; default G)
  voltage_v                M L^2 T^-3 I^-1  system voltage (> 0)
  phase                    dimensionless 1 or 3 (default 3)

kVA/hp = Table 430.7(B) upper band for the code letter
LRA_per_hp = kVA/hp x 1000 / (sqrt(3) x V)   [three-phase]  or  kVA/hp x 1000 / V   [single-phase]
max_horsepower = max_starting_current_a / LRA_per_hp
```

**Pinned worked example.** budget = 300 A, code G (6.29 kVA/hp), 460 V, three-phase:
`LRA_per_hp = 6.29 x 1000 / (sqrt(3) x 460) = 7.89 A/hp`, `max_hp = 300 / 7.89 = ` **38.0 hp**; feeding 38.0 hp back
through `motor-locked-rotor-kva` returns a 300 A LRA, the budget. A higher code letter (more starting kVA/hp) allows only
a smaller motor for the same budget.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`) placed beside `motor-locked-rotor-kva` (Group A is
un-audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (LRA relation solved for hp, `GOVERNANCE.electrical`
matching the sibling); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`motor-max-hp-for-starting-current` -> `computeMotorMaxHpForStartingCurrent`); `scripts/related-tiles.mjs`
(-> `motor-locked-rotor-kva` / `generator-motor-starting` / `reduced-voltage-starter` / `motor-vd-starting`);
`data/search/aliases.json` (5 collision-checked question aliases: "biggest motor a generator can start", "max motor hp for
breaker", ...); the calc-motor `MOTOR_RENDERERS` map entry via a hand-written NON-exported renderer (the shared code-letter
and phase selects, a current-budget field) and the id added to the calc-motor declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js`
block pinning the example, the round-trip through `computeMotorLockedRotorKva` across a current/code/phase sweep, the
higher-code-smaller-motor monotonicity, and the error seams. The calc-motor.js gzip cap is raised 12000 -> 13500 B (the
module was at 91.6%). Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile
count 1,170 -> 1,171.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 38 hp for a 300 A budget on
a code-G 460 V feeder).

## 5. Roadmap position

Pairs the forward locked-rotor tile (`motor-locked-rotor-kva`, current from a horsepower) with its inverse (horsepower
from a current budget), the two halves of the starting-current sizing question. Further Group A motor growth stays
evidence-driven.
