# roughlogic.com Specification v493 -- Generator Output Conductor at 115% (calc-feeder.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-feeder.js`**
> (Group A, the feeder / service conductor bench); no new module, group, or dependency. Inherits spec.md through
> spec-v492.md.
>
> **The gap, and the evidence for it.** The bench sizes service and feeder conductors off computed load, but the
> conductors from a generator to its first overcurrent device follow a different rule that estimators routinely get
> wrong. NEC 445.13(A) sets the ampacity of generator output conductors at not less than **115% of the generator
> nameplate current** -- not the 125% of a calculated load that governs an ordinary feeder, and not the running current
> of the connected load. The basis is the nameplate, and the multiplier is 1.15, because the machine can deliver its
> nameplate continuously and the conductor must carry it. A second provision matters: where the generator's design
> (its overload protection, or an inherently overload-limited machine) prevents the output from exceeding the nameplate,
> the conductors may be sized at 100% of nameplate. The tile takes the nameplate current (directly, or derived from kW,
> voltage, phase, and power factor), applies the 115% or 100% basis, and returns the required conductor ampacity so the
> conductor and its termination can be picked correctly.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The nameplate current and
the required ampacity are currents (`I`); the generator real power is a power (`M L^2 T^-3`); the voltage is
`M L^2 T^-3 I^-1`; the power factor and the 1.15 / 1.00 basis are `dimensionless`. When the nameplate current is
supplied directly it governs; when derived, `nameplate_current = kW x 1000 / (sqrt(3) x V x pf)` for three phase and
`kW x 1000 / (V x pf)` for single phase. The v18/v21 contract: any non-finite input, a non-positive nameplate current
(or a non-positive derived current from non-positive kW / voltage / pf, or a pf outside `(0, 1]`), returns `{ error }`.
Citation discipline (v19/v22): `NEC` over 445.13; `editionNote` names **NEC 2023 445.13(A) (generator output
conductors)**, prints `required_ampacity = basis x nameplate_current` with `basis = 1.15` (or `1.00` when the design
prevents overload beyond nameplate), and states that **the basis is the generator nameplate current, not 125% of a
computed load and not the connected running load, the 100% option applies only where the generator design prevents the
output from exceeding the nameplate rating (445.13(A) exception), the conductor still must satisfy termination-
temperature limits (110.14(C)) and any ampacity-adjustment factors, and neutral, tap, and the AHJ provisions govern** --
a design aid, not the engineer of record.

## 2. The tile

### 2.1 `generator-conductor-445` -- The 115%-of-Nameplate Rule for Generator Output Conductors

```
inputs:
  nameplate_current_a   A     generator rated output current (0 = derive from kW below)
  gen_kw                kW     generator real power (used only if nameplate current is 0)
  voltage_v             V      line-to-line (3ph) or line-to-neutral (1ph) voltage
  phase                 -      1 or 3
  power_factor          -      generator power factor (default 0.8)
  overload_limited      bool   design prevents output above nameplate? (100% basis if true)

nameplate = nameplate_current_a > 0 ? nameplate_current_a
            : phase == 3 ? gen_kw x 1000 / (sqrt(3) x voltage x power_factor)
            :              gen_kw x 1000 / (voltage x power_factor)          [A]
basis      = overload_limited ? 1.00 : 1.15                                  [-]
required_ampacity = basis x nameplate                                        [A]
```

**Pinned worked example (a 150 kW, 480 V three-phase generator at 0.8 pf, standard 115% basis).**
`nameplate = 150 x 1000 / (sqrt(3) x 480 x 0.8) = 150000 / 665.1 = ` **225.6 A**, and the required conductor ampacity
is `1.15 x 225.6 = ` **259.4 A** -- the conductor and its terminations must carry at least that, which is a larger
conductor than a 125%-of-a-smaller-computed-load feeder would suggest. **Cross-check (an overload-limited design earns
the 100% basis).** If the generator's design prevents its output from exceeding the nameplate, the basis drops to 1.00
and the required ampacity is `225.6 A` -- the full nameplate, with no 15% adder. The tile returns the nameplate current,
the applied basis, and the required conductor ampacity.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`NEC`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 115% example + the overload-limited 100%
cross-check); `test/fixtures/compute-map.js` (`generator-conductor-445` -> `computeGeneratorConductor445` in
`../../calc-feeder.js`); `scripts/related-tiles.mjs` (-> `generator-sizing` / `service-conductor-sizing` /
`termination-temp-ampacity`); `data/search/aliases.json` ("generator conductor", "445.13", "115 percent nameplate",
"generator output conductor", "genset feeder", "generator wire size", "nameplate current"); the id appended to the
feeder renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the derive-from-kW path (single and three phase), the 1.15 vs 1.00
basis switch, and the error seams (non-finite, non-positive nameplate / kW / voltage, pf out of range). Hand-writes its
renderer (mirroring the calc-feeder.js `service-conductor-sizing` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the nameplate / basis / ampacity stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 150 kW example -> 225.6 A nameplate, 259.4 A required).

## 5. Roadmap position

Adds the generator-side conductor rule beside `generator-sizing` (the machine) and `service-conductor-sizing` (the
utility side), and points at `termination-temp-ampacity` for the lug limit that finishes the conductor pick. A
generator overcurrent-protection sizing companion (445.12) and a paralleled-generator common-bus ampacity are deliberate
future follow-ons. Further Group A growth stays evidence-driven.
