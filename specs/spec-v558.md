# roughlogic.com Specification v558 -- Tolerable Step and Touch Voltage (calc-elecdesign.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elecdesign.js`**
> (Group A, the electrical-design bench); no new module, group, or dependency. Inherits spec.md through spec-v557.md.
>
> **The gap, and the evidence for it.** The grounding tiles (`grounding-electrode`, `grounding-electrode-conductor`)
> size the earth connection, but meeting a target grid resistance does **not** make a substation yard safe. What
> actually protects a person during a ground fault is keeping the step and touch potentials below what the body can
> tolerate, and IEEE Std 80 sets those tolerable limits. The catch installers omit is the surface layer: a crushed-rock
> surface of high resistivity over lower-resistivity native soil raises the tolerable voltage through the `Cs`
> derating factor, which depends on the rock layer's thickness and the resistivity contrast. And the limits scale
> inversely with the square root of the fault clearing time -- a faster relay allows a higher tolerable voltage. The
> tile takes the clearing time, the surface and native resistivities, the rock-layer thickness, and the body weight, and
> returns the surface derating factor and the tolerable step and touch voltages -- the safety criteria a grid design is
> actually checked against, which grid ohms alone never gives.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The resistivities are
`M L^3 T^-3 I^-2` (ohm-m); the rock-layer thickness is a length (`L`, in m); the clearing time is a time (`T`, in s);
the tolerable step and touch voltages are `M L^2 T^-3 I^-1` (volts); the derating factor `Cs` and the empirical
constants are `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive surface or native
resistivity, a non-positive layer thickness or clearing time, or an unrecognized body weight returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the IEEE 80 limits by name; `editionNote` names the **IEEE Std
80 tolerable step and touch voltage**, prints `Cs = 1 - 0.09 x (1 - rho / rho_s) / (2 x hs + 0.09)`, and for a 50 kg
body `E_step = (1000 + 6 x Cs x rho_s) x 0.116 / sqrt(ts)` and
`E_touch = (1000 + 1.5 x Cs x rho_s) x 0.116 / sqrt(ts)` (the 0.116 body-current constant becomes 0.157 for a 70 kg
body), and states that **meeting a grid resistance target does not make the yard safe -- the step and touch potentials
must stay below these tolerable limits, a high-resistivity surface layer (crushed rock) over native soil raises the
tolerable voltage through Cs (installers who omit the rock layer under-state it), the limits scale inversely with the
square root of the fault clearing time so a faster relay allows more, and IEEE 80 and a full grid analysis govern** -- a
safety-criteria aid, not a grid design.

## 2. The tile

### 2.1 `step-touch-voltage` -- Why Meeting Grid Ohms Is Not the Same as Being Safe

```
inputs:
  clearing_time_s      s      fault clearing time ts
  surface_resistivity  ohm-m  surface layer resistivity rho_s (crushed rock ~2000-5000)
  native_resistivity   ohm-m  native soil resistivity rho
  layer_thickness_m    m      surface layer thickness hs
  body_weight          -      50 kg (0.116) or 70 kg (0.157)

Cs      = 1 - 0.09 x (1 - native_resistivity / surface_resistivity) / (2 x layer_thickness_m + 0.09)
k       = body_weight == 70 ? 0.157 : 0.116
E_step  = (1000 + 6 x Cs x surface_resistivity) x k / sqrt(clearing_time_s)      [V]
E_touch = (1000 + 1.5 x Cs x surface_resistivity) x k / sqrt(clearing_time_s)    [V]
```

**Pinned worked example (0.5 s clearing, 3000 ohm-m crushed rock over 100 ohm-m soil, 0.1 m rock, 50 kg body).**
`Cs = 1 - 0.09 x (1 - 100/3000) / (2 x 0.1 + 0.09) = 1 - 0.09 x 0.967 / 0.29 = ` **0.70**. The tolerable step voltage is
`(1000 + 6 x 0.70 x 3000) x 0.116 / sqrt(0.5) = 13,600 x 0.116 / 0.707 = ` **2,231 V**, and the tolerable touch voltage
is `(1000 + 1.5 x 0.70 x 3000) x 0.116 / 0.707 = 4,150 x 0.116 / 0.707 = ` **681 V** -- touch is far more restrictive
than step, and both depend on the rock layer that a bare-soil design would omit. **Cross-check (a faster relay allows
more).** Clear the fault in `0.2 s` instead: the step limit rises to
`13,600 x 0.116 / sqrt(0.2) = ` **3,528 V** -- higher tolerable voltage purely from the faster clearing time, the
inverse-square-root relationship that ties grid safety to protection speed. The tile returns the surface derating
factor and the tolerable step and touch voltages.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 0.5 s example + the 0.2 s
faster-clearing cross-check); `test/fixtures/compute-map.js` (`step-touch-voltage` -> `computeStepTouchVoltage` in
`../../calc-elecdesign.js`); `scripts/related-tiles.mjs` (-> `grounding-electrode` / `neutral-grounding-resistor` /
`grounding-electrode-conductor`); `data/search/aliases.json` ("step voltage", "touch voltage", "ieee 80", "tolerable
step touch", "cs surface factor", "grounding grid safety", "crushed rock layer", "ground potential rise"); the id
appended to the elecdesign renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-
index; a `bounds-fuzzer.test.js` block pinning both examples, the Cs relation, the step-vs-touch ordering, the inverse-
sqrt clearing-time scaling, the 50/70 kg constant, and the error seams (non-finite, non-positive resistivities /
thickness / time, bad body weight). Hand-writes its renderer (mirroring the calc-elecdesign.js `grounding-electrode`
pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the Cs / step / touch stack wraps on a phone); render-no-nan + a11y on the new tile, output read
to the value (the 0.5 s example -> Cs 0.70, 2,231 V step, 681 V touch).

## 5. Roadmap position

Adds the shock-safety criteria that `grounding-electrode` (ohms only) never gives, and pairs with
`neutral-grounding-resistor` (which sets the fault current those potentials come from). A ground-potential-rise and
mesh/step-voltage-attained comparison (the actual yard voltages against these limits) is a deliberate future follow-on.
Further Group A growth stays evidence-driven.
