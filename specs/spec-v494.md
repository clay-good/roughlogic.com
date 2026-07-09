# roughlogic.com Specification v494 -- Transformer Voltage Regulation from %R and %X (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`**
> (Group A, the electrical-design bench); no new module, group, or dependency. Inherits spec.md through spec-v493.md.
>
> **The gap, and the evidence for it.** `transformer-loading-efficiency` gives the load-vs-loss picture but never
> answers what the secondary voltage actually does under load. Voltage regulation is the drop from no-load to full-load
> at the transformer terminals, and the catch is that the nameplate `%Z` alone does not give it: the drop depends on how
> that impedance splits between resistance `%R` and reactance `%X`, **and** on the load power factor. At a lagging power
> factor the `%X sin(theta)` term dominates and the voltage sags; at a leading power factor -- an over-corrected plant,
> or a bank feeding a PV inverter exporting reactive power -- the same transformer can push the secondary **above**
> nominal, a rise that trips over-voltage relays and stresses insulation. The tile takes `%R` and `%X` (or `%Z` with an
> X/R ratio), the load power factor, and the per-unit loading, and returns the regulation with its sign, so the
> installer sees the sag on a lagging motor load and the rise on a leading one -- the number the tap changer is set from.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Every quantity here is
`dimensionless`: `%R`, `%X`, `%Z` are per-unit impedances expressed as percents, the power factor and its angle terms
are ratios, the per-unit loading is a ratio, and the resulting voltage regulation is a percent. The v18/v21 contract:
any non-finite input, a negative `%R` or `%X` (or a `%Z` smaller than a supplied `%R`, which is geometrically
impossible since `%Z = sqrt(%R^2 + %X^2)`), a power factor outside `(0, 1]`, or a negative per-unit loading returns
`{ error }`. A `leading` flag selects the sign of the reactive term. Citation discipline (v19/v22): `GOVERNANCE.general`
over the regulation relation by name (an IEEE C57 test-report quantity); `editionNote` names the **transformer voltage-
regulation approximation (from %R, %X, and load power factor)**, prints
`VR% = load x (%R x cos + %X x sin) + load^2 x (%X x cos - %R x sin)^2 / 200` with `sin` taking the load's sign
(negative for leading), and states that **the nameplate %Z does not by itself give the regulation because it depends on
the %R / %X split and the load power factor, a lagging load sags the voltage while a leading (over-corrected or
exporting) load can raise it above nominal, the second (quadrature) term is a small correction that grows with the
square of loading, and this is the terminal regulation not the full feeder drop -- conductor voltage drop adds to it**
-- a design aid, not the utility's voltage study.

## 2. The tile

### 2.1 `transformer-voltage-regulation` -- Why %Z Alone Does Not Tell You the Voltage Drop

```
inputs:
  percent_r        %     transformer resistance %R (from test report)
  percent_x        %     transformer reactance %X (from test report)
  power_factor     -     load power factor (0-1)
  leading          bool  is the load power factor leading? (default false = lagging)
  load_fraction    -     per-unit loading (1.0 = full load, default 1.0)

cos = power_factor
sin = sqrt(1 - power_factor^2) x (leading ? -1 : +1)
VR_percent = load_fraction x (percent_r x cos + percent_x x sin)
           + load_fraction^2 x (percent_x x cos - percent_r x sin)^2 / 200
```

**Pinned worked example (%R = 1.2, %X = 5.0, 0.85 lagging, full load).** `cos = 0.85`, `sin = +0.527`; the main term is
`1.2 x 0.85 + 5.0 x 0.527 = 1.02 + 2.635 = 3.655`, the quadrature correction is
`(5.0 x 0.85 - 1.2 x 0.527)^2 / 200 = (4.25 - 0.632)^2 / 200 = 0.065`, so `VR = ` **+3.72%** -- the secondary sags about
3.7% from no-load to full-load, the reactance-dominated drop a motor plant sees. **Cross-check (a leading load raises
the voltage).** Keep everything but make the 0.85 power factor **leading** (`sin = -0.527`): the main term becomes
`1.02 - 2.635 = -1.615`, and `VR = ` **-1.50%** -- the voltage now **rises** 1.5% above nominal, the over-voltage a
PV-exporting or over-corrected bus produces on the same transformer. The tile returns the signed regulation so the sag
and the rise are both visible.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the lagging-sag example + the
leading-rise cross-check); `test/fixtures/compute-map.js`
(`transformer-voltage-regulation` -> `computeTransformerVoltageRegulation` in `../../calc-electrical.js`);
`scripts/related-tiles.mjs` (-> `transformer-loading-efficiency` / `buck-boost-sizing` / `voltage-drop`);
`data/search/aliases.json` ("voltage regulation", "transformer regulation", "%r %x", "secondary voltage drop",
"leading power factor rise", "no-load to full-load", "regulation percent", "tap changer"); the id appended to the
electrical renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the sign flip between lagging and leading, the load-fraction
scaling (main term linear, quadrature term quadratic), and the error seams (non-finite, negative %R / %X, pf out of
range, negative load). Hand-writes its renderer (mirroring the calc-electrical.js `transformer-loading-efficiency`
pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the two-term regulation stack wraps on a phone); render-no-nan + a11y on the new tile, output read
to the value (the lagging example -> +3.72%, the leading -> -1.50%).

## 5. Roadmap position

Adds the terminal-voltage behavior beside `transformer-loading-efficiency` (the loss picture) and points at
`voltage-drop` for the feeder drop that stacks on top. A regulation-to-tap-setting helper (which nameplate tap recovers
nominal at the design load) and a %Z-plus-X/R input path are deliberate future follow-ons. Further Group A growth stays
evidence-driven.
