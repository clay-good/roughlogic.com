# roughlogic.com Specification v499 -- Motor Locked-Rotor Current from Code Letter (calc-motor.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-motor.js`**
> (Group A, the motor bench); no new module, group, or dependency. Inherits spec.md through spec-v498.md.
>
> **The gap, and the evidence for it.** The bench has `motor-fla` (running current) and `generator-motor-starting`, but
> nothing that turns a motor's nameplate **code letter** into its locked-rotor current, which is the number that sizes
> the instantaneous-trip breaker, checks the SCCR, and drives the voltage-dip calculation at start. NEC Table 430.7(B)
> maps the code letter (A through V) to a band of locked-rotor **kVA per horsepower**, and the catch is twofold. First,
> the code letter is not the design letter -- the code letter is about starting kVA, the design letter (A/B/C/D) is about
> the torque-speed curve, and they are routinely confused. Second, the common "six times full-load amps" rule of thumb
> is only right for mid-range code letters; a high-code motor (code J and up) draws seven or eight times FLA at start,
> and sizing the starting equipment off the rule of thumb undersizes it. The tile takes the horsepower, the code letter,
> the voltage, and the phase, and returns the locked-rotor kVA and amps from the table band, so the starting current is
> read off the nameplate instead of guessed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The horsepower and the
locked-rotor kVA are powers (`M L^2 T^-3`); the voltage is `M L^2 T^-3 I^-1`; the locked-rotor current is `I`; the
kVA-per-horsepower band value and the phase selector are `dimensionless`. The v18/v21 contract: any non-finite input, a
non-positive horsepower or voltage, a code letter outside A-V, or a phase other than 1 or 3 returns `{ error }`.
Citation discipline (v19/v22): `NEC` over Table 430.7(B); `editionNote` names **NEC 2023 Table 430.7(B) (locked-rotor
indicating code letters)**, prints the selected band's upper `kVA/hp`, `locked_rotor_kva = hp x kVA_per_hp`, and
`LRA = kva x 1000 / (sqrt(3) x V)` for three phase (`kva x 1000 / V` for single phase), and states that **the code
letter gives locked-rotor (starting) kVA and is not the design letter (which describes the torque-speed curve), the
"6x FLA" rule of thumb holds only for mid-range code letters and undersizes high-code motors that draw 7-8x, the tile
uses the upper end of each kVA/hp band for a conservative starting current, and the actual measured inrush and the motor
nameplate govern** -- a design aid, not a substitute for the nameplate.

## 2. The tile

### 2.1 `motor-locked-rotor-kva` -- Starting Current from the Nameplate Code Letter (Not "6x FLA")

```
inputs:
  horsepower    hp    motor rated horsepower
  code_letter   -     NEC Table 430.7(B) code letter A..V
  voltage_v     V     line-to-line (3ph) or line (1ph) voltage
  phase         -     1 or 3

kVA_per_hp = upper bound of the code-letter band (A: 3.14, ..., G: 6.29, J: 7.99, ..., V: 22.4+)   [-]
locked_rotor_kva = horsepower x kVA_per_hp                                                          [kVA]
LRA = phase == 3 ? locked_rotor_kva x 1000 / (sqrt(3) x voltage)
                 : locked_rotor_kva x 1000 / voltage                                               [A]
```

**Pinned worked example (a 25 hp, code G, 460 V three-phase motor).** Code G tops out at `6.29 kVA/hp`, so
`locked_rotor_kva = 25 x 6.29 = 157.3 kVA` and `LRA = 157250 / (sqrt(3) x 460) = ` **197.4 A**. Against the running
`34 A` full-load current of a 25 hp / 460 V motor, that is **5.8x FLA** -- the rule of thumb happens to fit a mid-range
code letter. **Cross-check (a high code letter breaks the rule of thumb).** Keep the 25 hp / 460 V motor but make it
code J (`7.99 kVA/hp`): `LRA = 25 x 7.99 x 1000 / (sqrt(3) x 460) = ` **250.7 A**, which is **7.4x FLA** -- an
instantaneous-trip breaker or a voltage-dip check sized on "6x" would be undersized for this motor. The tile returns the
selected kVA/hp, the locked-rotor kVA, and the locked-rotor amps.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`NEC`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the code-G example + the code-J cross-check);
`test/fixtures/compute-map.js` (`motor-locked-rotor-kva` -> `computeMotorLockedRotorKva` in `../../calc-motor.js`);
`scripts/related-tiles.mjs` (-> `motor-fla` / `generator-motor-starting` / `motor-vd-starting`);
`data/search/aliases.json` ("locked rotor current", "code letter", "430.7(B)", "starting kva", "lra", "motor inrush",
"locked rotor kva", "kva per hp"); the id appended to the motor renderers declare in `app.js`; the `// dims:`
annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the single-phase
path, the monotonic rise of LRA with the code letter, and the error seams (non-finite, non-positive hp / voltage,
invalid code letter, bad phase). Hand-writes its renderer (mirroring the calc-motor.js `motor-fla` pattern). Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the kVA/hp / kVA / LRA stack wraps on a phone); render-no-nan + a11y on the new tile, output read
to the value (the code-G example -> 197.4 A).

## 5. Roadmap position

Adds the starting-current number the motor bench needed beside `motor-fla` (running) and feeds `generator-motor-starting`
and `motor-vd-starting` (both of which need the locked-rotor value). A reduced-voltage-starter companion (how a
wye-delta or autotransformer start cuts the code-letter inrush) is a deliberate future follow-on. Further Group A growth
stays evidence-driven.
