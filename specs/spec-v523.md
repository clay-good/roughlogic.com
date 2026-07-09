# roughlogic.com Specification v523 -- Harmonic Parallel-Resonance Order (calc-powerquality.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-powerquality.js`**
> (Group A, the power-quality bench); no new module, group, or dependency. Inherits spec.md through spec-v522.md.
>
> **The gap, and the evidence for it.** `pf-correction` sizes a capacitor bank for power factor but never checks what
> that bank does to harmonics. On a bus feeding nonlinear loads (drives, rectifiers), the power-factor capacitors and
> the system source inductance form a parallel LC circuit with a resonant frequency, and if that frequency lands on a
> harmonic the loads are producing -- the 5th, 7th, 11th, or 13th -- the resonance **amplifies** it, driving destructive
> overvoltages and currents that blow the caps or overheat transformers. The resonant order is simply
> `h = sqrt(MVA_sc / MVAR_cap)`, and the catch is counterintuitive: a **bigger** capacitor bank pulls the resonance to a
> **lower** order, toward the strong 5th and 7th, so upsizing for more power factor can walk the resonance right onto a
> dominant harmonic. The tile takes the short-circuit MVA at the bus and the capacitor bank size and returns the
> resonant order, flagging when it sits within half an order of a common harmonic -- the check `pf-correction` never
> makes.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The short-circuit MVA and
the capacitor MVAR are powers (apparent/reactive, `M L^2 T^-3`, worked in MVA and MVAR); the resonant order is
`dimensionless`. The v18/v21 contract: any non-finite input, a non-positive short-circuit MVA, or a non-positive
capacitor size returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the resonance relation by
name (IEEE 519 / IEEE 1531 harmonic filter and resonance guidance); `editionNote` names the **parallel-resonance order
of a power-factor capacitor bank**, prints `h_resonant = sqrt(MVA_sc / MVAR_cap)` and the proximity flag when
`h_resonant` is within 0.5 of the 5th, 7th, 11th, or 13th, and states that **a resonance landing on a harmonic the loads
produce amplifies it into damaging overvoltage and current, a larger capacitor bank lowers the resonant order toward the
strong low-order harmonics (so upsizing for power factor can create the problem), the estimate uses the bus short-
circuit level and the bank rating and ignores load and resistive damping, and a detuning reactor (making a filter) or a
harmonic study is the fix** -- a screening aid, not a harmonic study.

## 2. The tile

### 2.1 `harmonic-resonance` -- Why a Bigger PF Cap Bank Can Land on the 5th Harmonic

```
inputs:
  short_circuit_mva   MVA    available short-circuit power at the bus
  cap_bank_mvar       MVAR   power-factor capacitor bank rating

h_resonant = sqrt(short_circuit_mva / cap_bank_mvar)                 [-]
near       = the closest of {5, 7, 11, 13} within 0.5 of h_resonant (else none)
```

**Pinned worked example (a 200 MVA bus with a 1.2 MVAR capacitor bank).**
`h = sqrt(200 / 1.2) = sqrt(166.7) = ` **12.9** -- within half an order of the **13th** harmonic, so the flag fires:
this bank resonates near a harmonic a six-pulse drive produces, a setup that can destroy the capacitors. **Cross-check
(a bigger bank walks the resonance down onto the 9th).** Double the bank to 2.4 MVAR:
`h = sqrt(200 / 2.4) = sqrt(83.3) = ` **9.1** -- the resonance moved **down** toward the low orders as the bank grew,
the counterintuitive result that catches people upsizing for power factor. The tile returns the resonant order and the
nearest-harmonic flag.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 1.2 MVAR example + the 2.4 MVAR
cross-check); `test/fixtures/compute-map.js` (`harmonic-resonance` -> `computeHarmonicResonance` in
`../../calc-powerquality.js`); `scripts/related-tiles.mjs` (-> `pf-correction` / `transformer-k-factor` /
`tdd-ieee-519`); `data/search/aliases.json` ("harmonic resonance", "parallel resonance", "capacitor bank resonance",
"resonant order", "pf cap harmonics", "detuning reactor", "ieee 1531", "harmonic amplification"); the id appended to the
power-quality renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the sqrt relation, the resonance falling as the bank grows, the
nearest-harmonic flag window, and the error seams (non-finite, non-positive MVA / MVAR). Hand-writes its renderer
(mirroring the calc-powerquality.js `pf-correction` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the resonant-order / flag stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the 1.2 MVAR example -> order 12.9, near 13th).

## 5. Roadmap position

Adds the resonance screen `pf-correction` lacks and points at a detuning-reactor design as the fix. A detuned-filter
tuning order (the reactor size to move the series-tuned point below the 5th) and a resonance-shift-with-bank-steps
helper are deliberate future follow-ons. Further Group A growth stays evidence-driven.
