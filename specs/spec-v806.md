# roughlogic.com Specification v806 -- Transformer Turns / Voltage / Current / Impedance Ratio (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`**
> (Group A), no new module, group, or dependency. Inherits spec.md through spec-v805.md. Explore sweep #25 (entry 2),
> filling the base ratio the transformer family never computes.
>
> **The gap, and the evidence for it.** `calc-electrical.js` has 8+ transformer tiles (sizing, kVA, voltage regulation,
> buck-boost, k-factor, loading efficiency, inrush) but **none computes the basic turns / voltage / current / impedance
> ratio**. Grep confirmed no `turns ratio` / `impedance ratio` tile. The numbers this settles: a 480-to-120 V transformer
> is **4:1**; 50 A on the secondary reflects to **12.5 A** on the primary; an 8 ohm load looks like **128 ohm** to the
> source.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group A
transformer siblings (`transformer-voltage-regulation`): the primary/secondary voltages carry `M L^2 T^-3 I^-1`, the
secondary current `I`, the load impedance `M L^2 T^-3 I^-2` (ohm), the turns ratio is dimensionless, the primary current
carries `I`, and the reflected impedance carries ohm. The v18/v21 contract: a non-finite input (via `_finiteGuard`), a
non-positive primary or secondary voltage, or a negative secondary current or load impedance returns `{ error }`. The
optional secondary current and load impedance return `null` outputs when left blank. Citation discipline (v19/v22): the
ideal-transformer ratios by name (first-principles circuit theory), `GOVERNANCE.general` matching the siblings; the note
states that the turns ratio equals the voltage ratio and the inverse current ratio, that impedance transforms as the
square of the ratio, and that this is the lossless nameplate ratio (winding resistance and leakage reactance are the
separate voltage-regulation tile).

## 2. The tile

### 2.1 `transformer-turns-ratio` -- Transformer Turns / Voltage / Current / Impedance Ratio

```
inputs:
  primary_voltage_v      primary voltage Vp (V)
  secondary_voltage_v    secondary voltage Vs (V)
  secondary_current_a    secondary current Is (A, optional)
  load_impedance_ohm     secondary / load impedance Zs (ohm, optional)

turns_ratio             = Vp / Vs
primary_current_a       = Is / turns_ratio          (if Is given)
reflected_impedance_ohm = turns_ratio^2 * Zs        (if Zs given)
```

**Pinned worked example.** Vp 480 V, Vs 120 V, Is 50 A, Zs 8 ohm: `a = 480/120 = ` **4 (4:1 step-down)`;
`Ip = 50/4 = ` **12.5 A**; `Zp = 4^2 x 8 = ` **128 ohm**. Cross-check: a 120-to-480 V step-up is `a = 0.25` (0.25:1).

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`) beside `transformer-voltage-regulation`; a `tile-meta.js`
`_TILES` entry (`A`); a `citations.js` entry (ideal-transformer relations, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the step-up cross-check); `test/fixtures/compute-map.js`
(`transformer-turns-ratio` -> `computeTransformerTurnsRatio`); `scripts/related-tiles.mjs` (->
`transformer-voltage-regulation` / `buck-boost-sizing` / `ohms-law`); `data/search/aliases.json` (5 collision-checked
aliases: "transformer turns ratio", "transformer voltage ratio", "reflected impedance transformer", "impedance matching
transformer ratio", "primary current from secondary current transformer"); the calc-electrical `ELECTRICAL_RENDERERS`
map entry via a non-exported renderer with Vp / Vs / Is / Zs inputs, and the id added to the calc-electrical declare list
in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the three ratios, the step-up / isolation labels, the null
optional outputs, and the error seams. The calc-electrical.js gzip cap is unchanged (fits within the spec-v804 raise).
Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint.
Home tile count 1,254 -> 1,255.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build (the
local-only module-size gate); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the
value (480 / 120 / 50 / 8 -> 4:1, 12.5 A, 128 ohm).

## 5. Roadmap position

Completes the transformer family in Group A with its base nameplate ratio, beside the regulation, sizing, and buck-boost
tiles. The catalog is very saturated; the sweep-25 queue continues (RC / LC / belt candidates). Stays evidence-driven.
