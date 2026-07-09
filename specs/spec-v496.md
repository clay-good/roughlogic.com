# roughlogic.com Specification v496 -- Asymmetrical and Peak Fault Current from X/R (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`**
> (Group A, the electrical-design bench); no new module, group, or dependency. Inherits spec.md through spec-v495.md.
>
> **The gap, and the evidence for it.** `short-circuit-pp` and `conductor-short-circuit-withstand` work in symmetrical
> RMS fault current, but the first half-cycle of a real fault is not symmetrical: a DC offset rides on top of the AC
> wave, and how large it is depends on the circuit's `X/R` ratio. Close to a large transformer or generator, where `X/R`
> is high, the DC decays slowly and the very first peak can reach nearly `2.6x` the symmetrical RMS, while the first-
> cycle asymmetrical RMS can hit `1.7x`. Equipment does not care about the symmetrical value alone: a breaker's peak-
> withstand and a bus bracing rating must survive the **asymmetrical** first-cycle, and comparing a device's rating
> against the symmetrical fault under-rates it on a stiff, high-`X/R` service. The tile takes the symmetrical fault
> current and the `X/R` ratio and returns the peak instantaneous current and the asymmetrical RMS with their
> multiplying factors, so the gear is checked against the current it actually sees, not the tidy symmetrical number.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The symmetrical, peak, and
asymmetrical currents are currents (`I`); the `X/R` ratio, the exponential terms, and the multiplying factors are
`dimensionless`. The model is a standard-cycle asymmetry factor at the first peak (about half a cycle after
initiation). The v18/v21 contract: any non-finite input, a non-positive symmetrical current, or a non-positive `X/R`
ratio returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the asymmetry relations by name (an
IEEE C37 / NEMA AB-4 first-cycle model); `editionNote` names the **first-cycle fault asymmetry model (DC offset from
X/R)**, prints `I_peak = sqrt(2) x I_sym x (1 + e^(-pi / (X/R)))`,
`MF_rms = sqrt(1 + 2 x e^(-2 pi / (X/R)))`, and `I_asym_rms = I_sym x MF_rms`, and states that **the first-cycle
asymmetrical current, not the symmetrical RMS, is what a device's peak-withstand and a bus bracing rating must survive,
the DC offset and both factors grow as X/R rises (highest near large transformers and generators, approaching a 2.6x
peak and 1.7x RMS in the stiff limit), the factors assume the worst-case fully offset phase, and the interrupting-duty
rating and a protective-device coordination study govern** -- a design aid, not the engineer of record.

## 2. The tile

### 2.1 `asymmetrical-fault-xr` -- The First-Cycle Current the Symmetrical Value Hides

```
inputs:
  isym_ka   kA   symmetrical RMS fault current at the point
  x_over_r  -    the circuit X/R ratio at that point

I_peak_ka   = sqrt(2) x isym_ka x (1 + e^(-pi / x_over_r))     [kA]   first instantaneous peak
MF_rms      = sqrt(1 + 2 x e^(-2 x pi / x_over_r))             [-]    asymmetrical RMS multiplier
I_asym_ka   = isym_ka x MF_rms                                 [kA]   first-cycle asymmetrical RMS
peak_factor = I_peak_ka / isym_ka                              [-]    relative to symmetrical RMS
```

**Pinned worked example (20 kA symmetrical at X/R = 15, a stiff service near a large transformer).**
`I_peak = sqrt(2) x 20 x (1 + e^(-pi/15)) = 28.28 x (1 + 0.811) = ` **51.2 kA** -- a peak factor of **2.56x** the
symmetrical RMS. The asymmetrical RMS multiplier is `sqrt(1 + 2 x e^(-2 pi/15)) = sqrt(1 + 2 x 0.658) = ` **1.522**, so
`I_asym = 20 x 1.522 = ` **30.4 kA**. A bus braced only for 20 kA would be badly under-rated. **Cross-check (a softer,
low-X/R point offsets far less).** At the same 20 kA but `X/R = 5`, `I_peak = 28.28 x (1 + e^(-pi/5)) = ` **43.4 kA**
(peak factor 2.17x) and `MF_rms = ` **1.253** -- the DC offset decays faster, so the first-cycle stress is markedly
lower on the same symmetrical current. The tile returns the peak current, its factor, the asymmetrical RMS, and its
multiplier.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the high-X/R example + the low-X/R
cross-check); `test/fixtures/compute-map.js` (`asymmetrical-fault-xr` -> `computeAsymmetricalFaultXr` in
`../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `short-circuit-pp` / `conductor-short-circuit-withstand` /
`motor-fault-contribution`); `data/search/aliases.json` ("asymmetrical fault", "peak fault current", "x/r ratio", "dc
offset", "first cycle", "asymmetry factor", "peak withstand", "momentary rating"); the id appended to the electrical
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the monotonic rise of both factors with X/R, the peak factor bounded below 2.828 (sqrt(2) x
2) and the RMS factor below sqrt(3), and the error seams (non-finite, non-positive isym / X/R). Hand-writes its renderer
(mirroring the calc-electrical.js `short-circuit-pp` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the peak / asym / factor stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the X/R = 15 example -> 51.2 kA peak, 30.4 kA asym RMS).

## 5. Roadmap position

Completes the fault-duty picture beside `short-circuit-pp` (symmetrical available) and
`conductor-short-circuit-withstand` (the thermal I^2 t): this is the mechanical first-cycle the bracing sees. A
device-rating comparison helper (peak-withstand and asymmetrical interrupting against the computed duty) and an X/R-from-
component-impedances derivation are deliberate future follow-ons. Further Group A growth stays evidence-driven.
