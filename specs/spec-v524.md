# roughlogic.com Specification v524 -- Total Demand Distortion Limit Check (calc-powerquality.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-powerquality.js`**
> (Group A, the power-quality bench); no new module, group, or dependency. Inherits spec.md through spec-v523.md.
>
> **The gap, and the evidence for it.** The bench has `transformer-k-factor` and `voltage-imbalance` but no tile for the
> IEEE 519 current-distortion limit that a utility actually holds a facility to at the point of common coupling. The
> catch is that pros compare their measured distortion against total harmonic distortion (THD) or a flat 5% rule, and
> both are wrong. IEEE 519 limits **total demand distortion (TDD)** -- harmonic current as a percent of the maximum
> **demand** load, not the instantaneous fundamental -- and the limit is not fixed: it **loosens** as the short-circuit
> ratio `Isc/IL` rises, because a stiffer supply tolerates more harmonic current. A weak service (ratio under 20) is
> held to 5%, while a stiff one (ratio over 1000) is allowed 20%. The tile takes the short-circuit current at the PCC,
> the maximum demand current, and the measured TDD, and returns the applicable limit and the pass/fail, so a facility is
> judged against the right number at its actual stiffness.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The short-circuit and
maximum-demand currents are currents (`I`, in amps); their ratio, the measured TDD, and the limit are `dimensionless`
(percents). The v18/v21 contract: any non-finite input, a non-positive short-circuit current or demand current, or a
negative measured TDD returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the IEEE 519 limits
by name (IEEE 519-2022 Table 1); `editionNote` names the **IEEE 519-2022 current-distortion limits (TDD at the PCC)**,
prints `ratio = Isc / IL` and the limit by band (**ratio < 20 -> 5.0%, 20 to 50 -> 8.0%, 50 to 100 -> 12.0%, 100 to
1000 -> 15.0%, > 1000 -> 20.0%**) with the pass test `TDD <= limit`, and states that **the limit is on total demand
distortion (harmonic current over the maximum demand load) not THD or a flat 5%, it loosens as the short-circuit ratio
rises because a stiffer supply absorbs more harmonic current, individual-harmonic and even-harmonic sub-limits also
apply (evens are capped at 25% of the odd limit), and the utility agreement and a measurement study govern** -- a
screening aid, not a compliance report.

## 2. The tile

### 2.1 `tdd-ieee-519` -- The Distortion Limit That Loosens as the Supply Gets Stiffer

```
inputs:
  isc_a           A     short-circuit current at the point of common coupling
  il_a            A     maximum demand load current (over the demand interval)
  measured_tdd_pct %    measured total demand distortion

ratio = isc_a / il_a                                                  [-]
limit = ratio < 20 ? 5.0 : ratio < 50 ? 8.0 : ratio < 100 ? 12.0 : ratio <= 1000 ? 15.0 : 20.0   [%]
pass  = measured_tdd_pct <= limit
```

**Pinned worked example (Isc = 10,000 A, IL = 400 A, measured TDD 6%).** The short-circuit ratio is
`10000 / 400 = 25`, which falls in the 20-to-50 band, so the limit is **8.0%**; the measured `6%` is under it, so it
**passes**. **Cross-check (a weak service fails the same distortion).** Take the same 6% TDD on a soft service where
`Isc = 6,000 A` and `IL = 400 A`: `ratio = 15`, below 20, so the limit tightens to **5.0%** -- and now the identical
`6%` **fails**. The distortion did not change; the supply stiffness did. The tile returns the short-circuit ratio, the
applicable limit, and the pass/fail.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the passing example + the weak-
service failing cross-check); `test/fixtures/compute-map.js` (`tdd-ieee-519` -> `computeTddIeee519` in
`../../calc-powerquality.js`); `scripts/related-tiles.mjs` (-> `transformer-k-factor` / `harmonic-resonance` /
`voltage-imbalance`); `data/search/aliases.json` ("tdd", "total demand distortion", "ieee 519", "harmonic current
limit", "isc/il ratio", "distortion limit pcc", "thd vs tdd", "current distortion"); the id appended to the power-
quality renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the band boundaries (20/50/100/1000), the limit rising with the
ratio, the pass/fail flip at the same TDD, and the error seams (non-finite, non-positive Isc / IL, negative TDD). Hand-
writes its renderer (mirroring the calc-powerquality.js pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the ratio / limit / pass stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the Isc/IL = 25 example -> 8.0% limit, pass).

## 5. Roadmap position

Adds the IEEE 519 current-limit check beside `transformer-k-factor` (transformer heating from harmonics) and
`harmonic-resonance` (the cap-bank resonance). An individual-harmonic sub-limit breakdown and a voltage-distortion
(Table 2) companion are deliberate future follow-ons. Further Group A growth stays evidence-driven.
