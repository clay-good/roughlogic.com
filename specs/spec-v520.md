# roughlogic.com Specification v520 -- Transformer Inrush Coordination Point (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`**
> (Group A, the electrical-design bench); no new module, group, or dependency. Inherits spec.md through spec-v519.md.
>
> **The gap, and the evidence for it.** `transformer-conductor-protection` sizes the primary overcurrent device to the
> NEC 450.3 percentage limits, but a device that satisfies those limits can still **nuisance-trip on energization**. The
> instant a transformer is energized at an unfavorable point on the voltage wave, the core saturates and draws a
> magnetizing inrush current many times full load -- commonly 8 to 12 times, decaying over a few cycles. If the primary
> protective device's time-current curve does not sit to the right of that inrush point, the breaker trips every time
> the transformer is switched on, and the crew is left cycling it. The tile computes the full-load current and the
> inrush coordination point (a current multiple at a short duration) that the primary device's curve must clear, so the
> device is chosen to ride through the inrush while still protecting the transformer. The tile takes the kVA, primary
> voltage, phase, and an inrush multiple and duration, and returns the full-load current and the inrush point to plot
> against the device curve.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The transformer rating is
a power (`M L^2 T^-3`, in kVA); the primary voltage is `M L^2 T^-3 I^-1`; the full-load and inrush currents are currents
(`I`); the inrush duration is `T`; the inrush multiple and phase selector are `dimensionless`. The v18/v21 contract: any
non-finite input, a non-positive kVA or voltage, a phase other than 1 or 3, or a non-positive inrush multiple or
duration returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the inrush relations by name
(IEEE C57.109 transformer through-fault / energization; NEC 450.3 context); `editionNote` names the **transformer
energization-inrush coordination point**, prints `FLA = kVA x 1000 / (sqrt(3) x V)` for three phase
(`kVA x 1000 / V` single phase) and `inrush_point = multiple x FLA` at the stated duration, lists the common points
(**about 12x FLA at 0.1 s, up to 25x at 0.01 s**), and states that **a primary device meeting the 450.3 percentage
limits can still nuisance-trip on the magnetizing inrush, the primary time-current curve must pass to the right of the
inrush point (higher current at that short time) while staying left of the transformer damage curve, the actual inrush
depends on the point-on-wave, residual flux, and transformer design, and the manufacturer's inrush data and a
coordination study govern** -- a design aid, not the engineer of record.

## 2. The tile

### 2.1 `transformer-inrush-point` -- Why a Code-Legal Primary Device Still Trips on Energization

```
inputs:
  kva               kVA   transformer rating
  primary_voltage_v V     primary line voltage
  phase             -     1 or 3
  inrush_multiple   -     inrush as a multiple of FLA (default 12)
  duration_s        s     the point-in-time duration (default 0.1)

FLA          = phase == 3 ? kva x 1000 / (sqrt(3) x primary_voltage_v)
                          : kva x 1000 / primary_voltage_v                [A]
inrush_point = inrush_multiple x FLA                                      [A]  at duration_s
```

**Pinned worked example (a 75 kVA, 480 V three-phase transformer, 12x at 0.1 s).**
`FLA = 75 x 1000 / (sqrt(3) x 480) = 75000 / 831.4 = ` **90.2 A**, so the inrush coordination point is
`12 x 90.2 = ` **1,083 A at 0.1 s** -- the primary device's curve must sit to the right of that point, or it trips every
time the transformer is energized even though it meets the 450.3 percentage limit. **Cross-check (the very first cycle
is higher and shorter).** At the sub-cycle point, `25 x 90.2 = ` **2,255 A at 0.01 s** -- a higher current for a shorter
time, the near-instantaneous peak the device's instantaneous element must also clear. The tile returns the full-load
current and the inrush point (current and duration) to plot against the protective-device curve.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 0.1 s example + the sub-cycle
cross-check); `test/fixtures/compute-map.js` (`transformer-inrush-point` -> `computeTransformerInrushPoint` in
`../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `transformer-conductor-protection` /
`transformer-kva-sizing` / `motor-locked-rotor-kva`); `data/search/aliases.json` ("transformer inrush", "magnetizing
inrush", "inrush coordination", "nuisance trip transformer", "energization inrush", "450.3 coordination", "inrush
point", "12x fla"); the id appended to the electrical renderers declare in `app.js`; the `// dims:` annotation;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the single-phase FLA path,
the multiple-times-FLA relation, and the error seams (non-finite, non-positive kVA / voltage, bad phase, non-positive
multiple / duration). Hand-writes its renderer (mirroring the calc-electrical.js `transformer-conductor-protection`
pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the FLA / inrush-point stack wraps on a phone); render-no-nan + a11y on the new tile, output read
to the value (the 75 kVA example -> 90.2 A FLA, 1,083 A inrush).

## 5. Roadmap position

Pairs with `transformer-conductor-protection` (the 450.3 sizing) by adding the energization-coordination check that
sizing alone misses, and reuses the FLA that `motor-locked-rotor-kva` computes for motors. A damage-curve overlay (the
IEEE C57.109 through-fault points) and a device-curve pass/fail helper are deliberate future follow-ons. Further Group A
growth stays evidence-driven.
