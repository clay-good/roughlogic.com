# roughlogic.com Specification v351 -- PV Performance Ratio from Stacked Losses (calc-solar.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.123.0). Batch spec-v350..v352 (the PV design trio -- cell-temperature power
> (v350), the performance ratio from stacked losses (this spec), source-circuit fusing (v352)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `pv-energy-yield` takes the performance ratio as a
> single default (0.77) that "rolls up soiling, shading, mismatch, wiring, and inverter losses," but never lets a designer
> build it up from the individual loss factors -- the derate stack that a PVWatts or bankable model itemizes. The catalog
> has no PR-buildup tile. Adds one tile to the existing **`calc-solar.js`** module (Group A); no new group, trade, or
> dependency. Inherits spec.md through spec-v350.md.
>
> **The gap, and the evidence for it.** The system performance ratio is the product of the individual derate factors, each
> a `(1 - loss)`: `PR = (1 - soiling)(1 - temperature)(1 - wiring)(1 - inverter)(1 - mismatch)(1 - shading)...`. For a
> typical rooftop system with 2% soiling, 8% temperature, 2% wiring, 4% inverter, 2% mismatch, and 3% shading losses,
> `PR = 0.98 x 0.92 x 0.98 x 0.96 x 0.98 x 0.97 = 0.806` -- a better-than-default PR that feeds directly into
> `pv-energy-yield`, and one that shows exactly which loss to attack (temperature and inverter dominate here). Because the
> factors multiply, shaving the biggest loss moves the PR most, the design intuition a lumped 0.77 hides. `pv-energy-yield`
> consumes the PR; this tile builds it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

> **As-landed correction (2026-07-03):** the section 2.1 cross-check states PR = 0.833, but the exact product 0.98 x 0.95 x 0.98 x 0.98 x 0.98 x 0.97 = **0.850**. The tile computes and the fixtures pin the exact 0.850; the point (attacking the two largest losses lifts the PR most) stands.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Each loss factor and the
resulting performance ratio are dimensionless (fractions or percentages); the total loss is `1 - PR`. The v18/v21 contract:
any non-finite input, or a loss factor outside `0 <= loss < 1` (a loss at or above 100% is invalid), returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the performance-ratio derate-stack by name; `editionNote` names
**the performance ratio as the product of `(1 - loss_i)` derate factors (soiling, temperature, DC/AC wiring, inverter,
mismatch, shading, availability, nameplate, LID, connections, per the NREL PVWatts loss categories), and the default lumped
`PR ~ 0.75 to 0.80`**, and states that **this returns the multiplied performance ratio from the entered loss factors -- it
is the annual-average derate (temperature loss in particular varies by climate and is better taken from an hourly model or
`pv-cell-temperature-power`), the factors multiply (they are not additive), and it feeds `pv-energy-yield` but does not
itself compute the energy; and this is a design aid, not a bankable production model** -- an hourly simulation (PVsyst/SAM)
governs a bankable estimate.

## 2. The tile

### 2.1 `pv-performance-ratio` -- PV Performance Ratio from Stacked Losses

```
inputs (each optional, % loss):
  soiling, temperature, wiring_dc, wiring_ac, inverter, mismatch, shading,
  availability, nameplate, lid, connections   (any subset)

PR = product over entered losses of (1 - loss_i/100)
total_loss_pct = (1 - PR) * 100
```

**Pinned worked example (a typical rooftop derate stack).** soiling 2%, temperature 8%, wiring 2%, inverter 4%, mismatch
2%, shading 3%: `PR = 0.98 x 0.92 x 0.98 x 0.96 x 0.98 x 0.97 = 0.806`; total loss `= 19.4%`. This PR handed to
`pv-energy-yield` raises the annual estimate 5% over the 0.77 default. **Cross-check (clean up the two biggest losses).**
Cut temperature to 5% (better ventilation/climate) and inverter to 2% (higher-efficiency unit):
`PR = 0.98 x 0.95 x 0.98 x 0.98 x 0.98 x 0.97 = 0.833` -- attacking the two largest factors lifts the PR nearly 3 points,
where trimming an already-small 2% loss would barely move it, the multiplicative leverage the stack makes visible. The
non-finite and out-of-range-loss error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar","electrical"]`, matching `pv-energy-yield`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the derate-stack, `editionNote` naming the product-of-`(1 - loss)`
form, the PVWatts loss categories, the ~0.75 to 0.80 default, and the annual-average, multiplicative, feeds-energy-yield
caveats); `test/fixtures/worked-examples.json` (the typical stack + the cleaned-up cross-check);
`test/fixtures/compute-map.js` (`pv-performance-ratio` -> `computePvPerformanceRatio` in `../../calc-solar.js`);
`scripts/related-tiles.mjs` (-> `pv-energy-yield` / `pv-cell-temperature-power` / `pv-string-sizing` / `voltage-drop`);
`data/search/aliases.json` ("performance ratio", "PV derate", "PVWatts losses", "PR solar", "system losses PV", "soiling
loss", "PV loss stack", "derate factor solar", "performance ratio calculator"); the id appended to the existing solar
renderers block in `app.js`; the `// dims:` annotation (all losses and PR dimensionless); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the multiplicative product, the biggest-loss leverage,
and the out-of-range-loss / non-finite error seams. No new module; re-pin `calc-solar.js` on the `check:module-sizes`
allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the product assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the per-loss factors and the `PR` stack wraps on a
phone); render-no-nan + a11y sweep, output read to the value (typical stack -> PR 0.806).

## 5. Roadmap position

Middle of the PV design batch (v350..v352) in `calc-solar.js`, building the PR the energy tile consumes. Source-circuit
fusing (v352) follows. A climate-specific temperature loss from `pv-cell-temperature-power`, the full PVWatts loss category
set with defaults, and a direct chain into `pv-energy-yield` are the deliberate next follow-ons once the trio lands.
