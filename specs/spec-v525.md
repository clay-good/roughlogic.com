# roughlogic.com Specification v525 -- Neutral Grounding Resistor Sizing (calc-elecdesign.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elecdesign.js`**
> (Group A, the electrical-design bench); no new module, group, or dependency. Inherits spec.md through spec-v524.md.
>
> **The gap, and the evidence for it.** In industrial and mission-critical systems the transformer neutral is grounded
> through a resistor, not solidly, so a ground fault draws a limited, known current instead of a destructive one -- a
> high-resistance ground (HRG) lets the plant keep running through the first fault at a few amps, while a low-resistance
> ground (LRG) limits it to a few hundred amps for fast, coordinated tripping. The bench has grounding-electrode tiles
> but nothing that sizes the resistor itself. The catch that trips people is the voltage: the resistor sees the
> **line-to-neutral** voltage across it, `V_LL / sqrt(3)`, not the line-to-line voltage, so sizing off `V_LL` makes the
> resistor a factor of `sqrt(3)` too large and the fault current too small to be sensed. The tile takes the system
> line-to-line voltage and the target ground-fault current and returns the resistor ohms and its continuous (HRG) or
> short-time (LRG) power rating, so the resistor is sized to let exactly the intended fault current flow.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The line-to-line and
line-to-neutral voltages are `M L^2 T^-3 I^-1` (volts); the target ground-fault current is a current (`I`); the resistor
value is `M L^2 T^-3 I^-2` (ohms); the power dissipation is a power (`M L^2 T^-3`, in watts). The v18/v21 contract: any
non-finite input, a non-positive line-to-line voltage, or a non-positive target current returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the NGR relations by name (IEEE 142 grounding practice); `editionNote`
names the **neutral grounding resistor sizing**, prints `V_LN = V_LL / sqrt(3)`, `R = V_LN / I_ground`, and
`P = I_ground^2 x R` (which reduces to `V_LN x I_ground`), and states that **the resistor sees the line-to-neutral
voltage not the line-to-line so sizing off V_LL makes it sqrt(3) too large and the fault current too small to detect, a
high-resistance ground limits the fault to a few amps and is rated for continuous dissipation while a low-resistance
ground limits it to 100 to 400 A and is rated only for the short trip time, the resistor current must exceed the
system's total charging current for the HRG to control transient overvoltage, and IEEE 142 and the protection scheme
govern** -- a design aid, not the engineer of record.

## 2. The tile

### 2.1 `neutral-grounding-resistor` -- Sizing the NGR Off Line-to-Neutral, Not Line-to-Line

```
inputs:
  system_voltage_ll_v  V    system line-to-line voltage
  target_fault_a       A    desired limited ground-fault current
  duty                 -    HRG (continuous) or LRG (short-time)

V_ln     = system_voltage_ll_v / sqrt(3)                [V]   the voltage across the resistor
R_ohm    = V_ln / target_fault_a                        [ohm]
P_watt   = target_fault_a^2 x R_ohm                     [W]   (= V_ln x target_fault_a)
```

**Pinned worked example (a 480 V system, high-resistance ground targeting 5 A).** The resistor sees
`480 / sqrt(3) = 277 V`, so `R = 277 / 5 = ` **55.4 ohm**, dissipating `5^2 x 55.4 = ` **1,386 W** continuously (an HRG
resistor runs hot for the duration of a standing fault, so it is rated for it). Sizing off the 480 V line-to-line by
mistake would give `96 ohm` and only `2.9 A` -- too little to trip the ground detector. **Cross-check (a low-resistance
ground limits to hundreds of amps).** Target `400 A` on the same 480 V system: `R = 277 / 400 = ` **0.69 ohm**, a heavy
short-time resistor rated only for the brief trip time, that limits the fault enough to protect equipment while still
letting protection clear it fast. The tile returns the line-to-neutral voltage, the resistor ohms, and the power rating.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the HRG example + the LRG cross-
check); `test/fixtures/compute-map.js` (`neutral-grounding-resistor` -> `computeNeutralGroundingResistor` in
`../../calc-elecdesign.js`); `scripts/related-tiles.mjs` (-> `grounding-electrode` / `egc-sizing` /
`step-touch-voltage`); `data/search/aliases.json` ("neutral grounding resistor", "ngr sizing", "high resistance
ground", "low resistance ground", "hrg lrg", "ground fault current limit", "ieee 142 grounding", "resistance grounded
system"); the id appended to the elecdesign renderers declare in `app.js`; the `// dims:` annotation; regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the V_LN = V_LL/sqrt(3) basis, the R and P
relations, and the error seams (non-finite, non-positive voltage / current). Hand-writes its renderer (mirroring the
calc-elecdesign.js `grounding-electrode` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the V_LN / R / power stack wraps on a phone); render-no-nan + a11y on the new tile, output read to
the value (the HRG example -> 55.4 ohm, 1,386 W).

## 5. Roadmap position

Adds resistance-grounding design to the bench beside `grounding-electrode` (the earth connection) and points at
`step-touch-voltage` for the shock-safety side. A charging-current check (the minimum HRG current to control transient
overvoltage) and a pulsing-NGR-for-fault-location note are deliberate future follow-ons. Further Group A growth stays
evidence-driven.
