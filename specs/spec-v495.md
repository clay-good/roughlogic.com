# roughlogic.com Specification v495 -- Capacitor Discharge Time and Bleed Resistor (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`**
> (Group A, the electrical-design bench); no new module, group, or dependency. Inherits spec.md through spec-v494.md.
>
> **The gap, and the evidence for it.** A power-factor capacitor or a drive DC-bus cap holds a lethal charge after it is
> switched off, and NEC 460.6 requires a permanent discharge means: the residual voltage must fall to 50 V or less
> within **1 minute** for capacitors rated 600 V or below, and within **5 minutes** above 600 V. The bench has no tile
> that sizes the bleed resistor or checks the discharge time, and the arithmetic has two traps. First, the resistor must
> be **permanently connected or automatically connected on loss of line** -- a manually switched bleed does not satisfy
> the code, because the one time it is forgotten is the time someone is hurt. Second, sizing the resistor is a trade-off:
> a smaller resistor discharges faster but dissipates more power continuously while the capacitor is energized, so it
> must be rated for `V^2/R` forever. The tile computes the largest resistor that still meets the code time (or the
> discharge time of a chosen resistor), the continuous power it must dissipate, and whether the result clears the 1- or
> 5-minute limit for the voltage class -- the number that keeps a de-energized bank from staying dangerous.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The capacitance is
`M^-1 L^-2 T^4 I^2`; the voltages are `M L^2 T^-3 I^-1`; the resistance is `M L^2 T^-3 I^-2`; the discharge time and the
code limit are `T`; the continuous power is `M L^2 T^-3`; the natural-log ratio is `dimensionless`. The v18/v21
contract: any non-finite input, a non-positive capacitance or initial voltage, a safe voltage at or above the initial
voltage (no discharge needed / log undefined), or a non-positive supplied resistance returns `{ error }`. Citation
discipline (v19/v22): `NEC` over 460.6; `editionNote` names **NEC 2023 460.6 (discharge of stored energy)**, prints
`V(t) = V0 x e^(-t / (R x C))`, `t_discharge = R x C x ln(V0 / V_safe)`, `R_max = t_limit / (C x ln(V0 / V_safe))`, and
`P_continuous = V0^2 / R`, and states that **the discharge means must be permanently connected to the capacitor
terminals or connect automatically on loss of line voltage (a manually switched bleed does not comply), the code limit
is 1 minute at or below 600 V and 5 minutes above 600 V to a residual of 50 V, a smaller resistor discharges faster but
dissipates more continuous power (rate it for V0^2/R with margin), and the internal discharge resistors of a listed
capacitor may already satisfy this** -- a design aid, not a substitute for the equipment listing.

## 2. The tile

### 2.1 `capacitor-discharge-time` -- Sizing the Bleed Resistor That Keeps a Switched-Off Cap Safe

```
inputs:
  capacitance_uf   uF    total capacitance to discharge
  initial_voltage  V     V0, the voltage at disconnect (peak of the bank)
  safe_voltage     V     V_safe target (default 50 per 460.6)
  time_limit_s     s     code limit (default 60 if V0 <= 600, else 300)
  resistor_ohm     ohm   a chosen bleed resistor (0 = solve for the largest that meets the limit)

C = capacitance_uf x 1e-6
ln_ratio = ln(initial_voltage / safe_voltage)
R_max     = time_limit_s / (C x ln_ratio)                    [ohm]   largest R meeting the code time
R_used    = resistor_ohm > 0 ? resistor_ohm : R_max          [ohm]
t_discharge = R_used x C x ln_ratio                          [s]
P_continuous = initial_voltage^2 / R_used                    [W]     dissipated while energized
meets_code = t_discharge <= time_limit_s
```

**Pinned worked example (a 100 uF, 600 V PF-correction cap, 1-minute class).** `ln(600 / 50) = ln(12) = 2.485`; the
largest compliant resistor is `R_max = 60 / (100e-6 x 2.485) = ` **241 kohm**, and at that value the continuous burn is
`P = 600^2 / 241458 = ` **1.49 W** -- so a permanently connected 220 kohm, 2 W (or larger) resistor discharges the bank
to 50 V inside a minute. **Cross-check (a medium-voltage cap gets the 5-minute allowance).** A 1 uF, 4160 V surge cap
is above 600 V, so the limit is 300 s: `R_max = 300 / (1e-6 x ln(4160/50)) = 300 / (1e-6 x 4.421) = ` **67.9 Mohm**, a
much larger resistor that dissipates only **0.26 W** -- the higher voltage and longer allowance let a high-value bleed
do the job with little heat. The tile returns the maximum compliant resistor (or the chosen resistor's discharge time),
the continuous power, and the pass/fail against the class limit.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`NEC`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 600 V bleed example + the MV 5-minute cross-
check); `test/fixtures/compute-map.js` (`capacitor-discharge-time` -> `computeCapacitorDischargeTime` in
`../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `pf-correction` / `motor-capacitor-max` /
`capacitor-bank-kvar`); `data/search/aliases.json` ("capacitor discharge", "bleed resistor", "460.6", "residual
voltage", "discharge time", "stored energy discharge", "cap bank safety", "rc discharge"); the id appended to the
electrical renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the R_max-meets-limit identity (t_discharge equals the limit at
R_max), the smaller-R-faster-more-power monotonicity, and the error seams (non-finite, non-positive C / V0, V_safe >=
V0, non-positive supplied resistance). Hand-writes its renderer (mirroring the calc-electrical.js `pf-correction`
pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the R_max / power / pass-fail stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 600 V example -> 241 kohm, 1.49 W, meets the 1-minute rule).

## 5. Roadmap position

Adds the safety-discharge check beside `pf-correction` and `motor-capacitor-max`, closing the "what keeps the bank from
staying charged" question those tiles do not touch. A stored-energy (0.5 C V^2) companion for arc-flash boundary work
and a series-string balancing-resistor helper are deliberate future follow-ons. Further Group A growth stays evidence-
driven.
