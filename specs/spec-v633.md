# roughlogic.com Specification v633 -- Isolator Static Deflection for a Target Isolation Efficiency (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-11). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvac.js`** (Group C,
> HVAC), no new module, group, or dependency. Inherits spec.md through spec-v632.md.
>
> **The gap, and the evidence for it.** Spec-v483 (`vibration-isolation`) goes one way: enter the running speed and
> the isolator's static deflection, get the isolation efficiency. But the question a mechanical designer actually
> starts with is the inverse -- "I want 90% isolation on this 900 rpm fan, how soft a mount (how much static
> deflection) do I need to specify?" That is the number that picks a spring-mount catalog size, and the forward tile
> can only be guessed-and-checked into it. Inverting the same single-degree-of-freedom relation is exact algebra:
> from a target transmissibility the required frequency ratio, natural frequency, and static deflection all fall
> out. The number this settles: 90% isolation of a 900 rpm machine needs **0.48 in** of static deflection (a
> 4.5 Hz mount), and stepping up to 95% nearly doubles it to **0.91 in** -- the softer the mount, the better the
> isolation, and this says exactly how soft.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`vibration-isolation` forward tile: the speed is `T^-1`, the natural frequency is `T^-1`, the deflection is `L`, and
the efficiency and frequency ratio are `dimensionless`. The natural-frequency constant `3.13 = (1/2pi) sqrt(g)` with
`g = 386.4 in/s^2` is the identical universal constant the forward tile uses. The v18/v21 contract: any non-finite
input, a non-positive running speed, or a target efficiency outside `(0, 100)` percent returns `{ error }` (at 0%
the required frequency ratio is exactly sqrt(2), the isolation threshold, and 100% is unreachable). Citation
discipline (v19/v22): the ASHRAE / Den Hartog single-DOF isolator inverted by name; the note states that **the
result is the required rated static deflection under the actual load, the frequency ratio always exceeds sqrt(2) so
the mount isolates rather than amplifies, this is the undamped idealization, and the isolator selection, floor
stiffness, and seismic restraint are the mechanical engineer's** -- a design aid, not a stamped isolation design.

## 2. The tile

### 2.1 `isolator-deflection` -- How Soft a Mount for a Target Isolation Efficiency

```
inputs:
  equipment_rpm      rpm   running speed (> 0)
  target_efficiency  %     desired isolation efficiency (in (0, 100))

T          = 1 - target_efficiency/100                       [-]   required transmissibility
ratio      = sqrt(1 + 1/T)                                   [-]   required frequency ratio (> sqrt(2))
fn_hz      = (equipment_rpm/60) / ratio                      [Hz]  required isolator natural frequency
deflection = (3.13 / fn_hz)^2                                [in]  required static deflection
```

**Pinned worked example (a 900 rpm fan, 90% isolation).** equipment_rpm = 900, target = 90%: `T = 1 - 0.90 = 0.10`,
`ratio = sqrt(1 + 1/0.10) = sqrt(11) = ` **3.32**, `fn = (900/60) / 3.32 = 15 / 3.32 = ` **4.52 Hz**, `deflection =
(3.13 / 4.52)^2 = ` **0.48 in**. Feeding 0.48 in back into `vibration-isolation` returns 90% efficiency, closing the
loop. **Cross-check (tighter target).** target = 95%: `T = 0.05`, `ratio = sqrt(21) = 4.58`, `fn = ` **3.27 Hz**,
`deflection = ` **0.91 in** -- nearly double the deflection for the last five points of isolation, the softening the
inverse makes explicit.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `vibration-isolation`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (ASHRAE / Den Hartog single-DOF inverse, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`isolator-deflection` ->
`computeIsolatorDeflection` in `../../calc-hvac.js`); `scripts/related-tiles.mjs` (-> `vibration-isolation` /
`fan-affinity-laws` / `pump-specific-speed`); `data/search/aliases.json` ("isolator deflection", "spring mount
sizing", "required static deflection", "isolation efficiency to deflection", plus question rows);
`HVAC_RENDERERS["isolator-deflection"]` via the module's `_rEnv` factory (mirroring `pump-specific-speed`) and the
id added to the calc-hvac declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the exact round-trip
through `computeVibrationIsolation`, the ratio > sqrt(2) property, and the error seams (non-finite, non-positive
speed, efficiency out of (0, 100)). Group C has no exact audit-count assertion and the mechanical-governance test is
an explicit list, so no count bump. The calc-hvac.js gzip cap is expected to hold (verify at build). Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> deflection 0.48 in, fn 4.52 Hz).

## 5. Roadmap position

Completes the vibration-isolation pair spec-v483 opened: the forward tile scores a chosen mount, this one sizes the
mount for a target. Both are the same single-DOF relation, one solved each way. Further Group C growth stays
evidence-driven.
