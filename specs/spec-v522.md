# roughlogic.com Specification v522 -- Reduced-Voltage Starter Current and Torque (calc-motor.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-motor.js`**
> (Group A, the motor bench); no new module, group, or dependency. Inherits spec.md through spec-v521.md.
>
> **The gap, and the evidence for it.** Beside `motor-locked-rotor-kva` (the across-the-line starting current) sits the
> question of how a reduced-voltage starter cuts it, and the bench has no tile for it. The catches are the two things
> people get backwards. First, torque falls with the **square** of the applied voltage, so a starter that drops to 65%
> voltage delivers only 42% of the locked-rotor torque -- reduce the inrush too far and the motor will not break the
> load away. Second, and the one that trips even experienced techs, an **autotransformer** starter draws a line current
> of the tap **squared** times the across-the-line value, not the tap times it: the autotransformer trades voltage for
> current, so at a 65% tap the motor sees 65% current but the **line** sees only 42%. That squared line-current
> reduction is the whole reason an autotransformer beats a reactor or solid-state start at the same reduced voltage. The
> tile takes the across-the-line locked-rotor current and torque, the starter type, and the tap, and returns the motor
> current, the line current, and the starting torque for each method.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The across-the-line and
reduced currents are currents (`I`, in amps); the locked-rotor torque and the reduced torque are carried as percents of
the across-the-line value (`dimensionless`); the tap fraction is `dimensionless`. The v18/v21 contract: any non-finite
input, a non-positive across-the-line current, a negative locked-rotor torque, an unrecognized starter type, or (for an
autotransformer) a tap outside `(0, 1]` returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over
the reduced-voltage relations by name (NEMA ICS 2; torque proportional to voltage squared); `editionNote` names the
**reduced-voltage-starter current and torque model**, prints for an autotransformer `motor_current = tap x LRA`,
`line_current = tap^2 x LRA`, and `torque = tap^2 x LRT`, for wye-delta a fixed `0.333 x` on current and torque, and for
a solid-state/reactor start `current = fraction x LRA` and `torque = fraction^2 x LRT`, and states that **torque falls
with the square of voltage so too deep a reduction stalls the start, an autotransformer's line current is the tap
squared (not the tap) because it trades voltage for current, wye-delta gives a fixed one-third of current and torque,
and the motor speed-torque curve and the load govern** -- a design aid, not the engineer of record.

## 2. The tile

### 2.1 `reduced-voltage-starter` -- Why an Autotransformer's Line Current Is the Tap Squared

```
inputs:
  across_line_lra_a   A     across-the-line locked-rotor current (LRA)
  across_line_lrt_pct %     across-the-line locked-rotor torque as a percent basis (default 100)
  starter_type        -     autotransformer / wye-delta / solid-state
  tap_fraction        -     autotransformer tap or solid-state voltage fraction (e.g. 0.65)

autotransformer:  motor_current = tap x LRA;  line_current = tap^2 x LRA;  torque = tap^2 x LRT
wye-delta:        motor_current = 0.333 x LRA; line_current = 0.333 x LRA;  torque = 0.333 x LRT
solid-state:      motor_current = tap x LRA;  line_current = tap x LRA;    torque = tap^2 x LRT
```

**Pinned worked example (600 A LRA, 100% LRT basis, autotransformer at a 65% tap).** The motor sees
`0.65 x 600 = ` **390 A**, but the **line** sees only `0.65^2 x 600 = ` **254 A**, and the starting torque is
`0.65^2 x 100 = ` **42%** of locked-rotor -- the squared line-current cut is the autotransformer's advantage, and the
42% torque is the check that the load will still break away. **Cross-check (wye-delta and solid-state at the same
setting differ).** A wye-delta start gives a fixed `0.333 x 600 = ` **200 A** on both motor and line with **33%**
torque; a solid-state (reactor-like) start at the same 65% setting draws `0.65 x 600 = 390 A` on **both** motor and line
(no squared line reduction) for the same 42% torque -- so at equal torque the autotransformer pulls far less line
current. The tile returns the motor current, the line current, and the torque for the chosen method.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the autotransformer example + the
wye-delta / solid-state cross-check); `test/fixtures/compute-map.js` (`reduced-voltage-starter` ->
`computeReducedVoltageStarter` in `../../calc-motor.js`); `scripts/related-tiles.mjs` (-> `motor-locked-rotor-kva` /
`motor-vd-starting` / `generator-motor-starting`); `data/search/aliases.json` ("reduced voltage starter",
"autotransformer starter", "wye delta start", "soft start current", "tap squared line current", "starting torque
voltage squared", "rvss", "part winding start"); the id appended to the motor renderers declare in `app.js`; the
`// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
tap-squared line current for the autotransformer, the fixed one-third for wye-delta, the voltage-squared torque, and the
error seams (non-finite, non-positive LRA, negative LRT, bad type, tap out of range). Hand-writes its renderer
(mirroring the calc-motor.js `motor-vd-starting` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the motor / line / torque stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the autotransformer example -> 390 A motor, 254 A line, 42% torque).

## 5. Roadmap position

Adds the starter-selection numbers beside `motor-locked-rotor-kva` (the across-the-line inrush) and `motor-vd-starting`
(the voltage dip). A load-torque overlay (does the reduced starting torque exceed the load's breakaway) and a
start-time / thermal-limit companion are deliberate future follow-ons. Further Group A growth stays evidence-driven.
