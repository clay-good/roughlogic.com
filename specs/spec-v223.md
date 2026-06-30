# roughlogic.com Specification v223 -- PV Inverter Loading Ratio (DC:AC) and Clipping Onset (calc-solar.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-06-30). Batch spec-v221..v223 (the PV system-design trio -- production, row spacing, and
> inverter match). This closes the v221..v223 batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: matching the array to the inverter is the
> designer's and installer's call. Adds one tile to **`calc-solar.js`** (Group A); no new module, group, or dependency.
> Inherits spec.md through spec-v222.md.
>
> **The gap, and the evidence for it.** A PV array is almost never matched one-to-one to its inverter: the array is
> deliberately oversized against the inverter's AC rating, because the array only ever reaches its STC nameplate for a
> few hours a year, so a bigger array fills the inverter's clipping ceiling for more of the day and lifts the annual
> yield per dollar of inverter. The number that captures this is the inverter loading ratio (DC nameplate over AC
> rating, the ILR or DC:AC ratio), and the cost-optimal band -- roughly 1.1 to 1.3 -- is one of the first decisions in a
> design. Too low and the inverter is oversized and never fills; too high and the inverter clips the array's peak output
> on every clear day. The catalog sizes the strings into the inverter's MPPT *voltage* window (`pv-string-sizing`) but
> says nothing about its *power* match, so a designer has no check on whether the array-to-inverter ratio is in the
> sensible range or where clipping starts.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The DC nameplate, the AC
rating, and the clipping-onset DC power are a power (`M L^2 T^-3`, kW); the inverter loading ratio, the inverter
efficiency, and the clipping-onset fraction of nameplate are `dimensionless`. The v18/v21 contract: any non-finite
input, a non-positive DC nameplate or AC rating, or an inverter efficiency outside 0 (exclusive) to 1, returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the loading-ratio and clipping-onset relations by
name; `editionNote` names the standard **inverter loading ratio (ILR / DC:AC ratio) and NREL inverter-sizing guidance**
(`ILR = P_dc / P_ac`, clipping begins where the array's DC output exceeds `P_ac / eta_inv`), and states that **the
cost-optimal ILR band (commonly 1.1 to 1.3) shifts with the site's irradiance distribution, the module-to-inverter
price ratio, and the energy value, the clipping-onset fraction is a screening threshold (the array clips only when its
instantaneous DC output rises above that fraction of STC nameplate, near peak on cool clear days), and an accurate
annual clipping loss needs an 8760-hour production simulation this tile does not run** -- a sizing sanity check, not a
clipping-loss model.

## 2. The tile

### 2.1 `pv-inverter-ratio` -- Inverter Loading Ratio (DC:AC) and Clipping Onset

```
inputs:
  dc_kw     M L^2 T^-3     array DC nameplate at STC, kW
  ac_kw     M L^2 T^-3     inverter continuous AC rating, kW
  inv_eff   dimensionless  inverter peak efficiency, 0 to 1, default 0.96

ilr            = dc_kw / ac_kw                 # inverter loading ratio (DC:AC)
clip_dc_kw     = ac_kw / inv_eff               # DC input power at which the inverter begins to clip
clip_fraction  = clip_dc_kw / dc_kw            # that onset as a fraction of STC nameplate
verdict        = ilr < 1.1   ? "Inverter oversized -- ratio below the typical 1.1-1.3 band; it rarely fills"
               : ilr <= 1.3  ? "In the typical cost-optimal 1.1-1.3 band"
               :               "Inverter undersized -- ratio above 1.3; expect frequent clipping of array peaks"
```

**Pinned worked example (8 kW array on a 6.6 kW inverter).** An 8 kW DC array on a 6.6 kW AC inverter at 0.96 peak
efficiency: `ilr = 8 / 6.6 = 1.21`; `clip_dc_kw = 6.6 / 0.96 = 6.875 kW`; `clip_fraction = 6.875 / 8 = 0.859`; the ratio
1.21 is **in the typical 1.1-1.3 band**, and the array only clips when its DC output climbs above **85.9% of nameplate**
-- a condition reached for only a handful of hours on cool, clear days, so the clipping loss is small and the oversize
buys real extra yield. **Cross-check (same inverter, 10 kW array).** Push the array to 10 kW on the same 6.6 kW inverter:
`ilr = 10 / 6.6 = 1.52`; `clip_dc_kw = 6.875 kW` (unchanged -- it is set by the inverter); `clip_fraction = 6.875 / 10 =
0.688`. The ratio 1.52 is now **above the 1.3 band**, and clipping starts once the array passes only **68.8% of
nameplate** -- a level it clears on most sunny days, so the inverter throws away a meaningful slice of every clear-day
peak. The clipping ceiling is fixed by the inverter; raising the array lowers the fraction of nameplate at which it
bites, which is exactly the diminishing return that puts the sweet spot near 1.2.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["solar","electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the loading-ratio and clipping-onset relations, `editionNote` naming the ILR / DC:AC
definition and NREL inverter-sizing guidance with the band-shifts / screening-threshold / needs-8760-sim caveats);
`test/fixtures/worked-examples.json` (the in-band example + the undersized cross-check); `test/fixtures/compute-map.js`
(`pv-inverter-ratio` -> `computePvInverterRatio` in `../../calc-solar.js`); `scripts/related-tiles.mjs`
(-> `pv-string-sizing` / `pv-energy-yield` / `pv-circuit-ampacity`); `data/search/aliases.json` ("dc ac ratio",
"dc:ac ratio", "inverter loading ratio", "ilr", "inverter sizing", "clipping", "array oversize", "inverter match");
the id appended to the existing solar renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, DC or AC rating <= 0,
inverter efficiency out of 0 exclusive to 1, the three verdict bands). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, all three verdict-band paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the ILR / clipping-DC / clipping-fraction / verdict stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (8 kW / 6.6 kW -> 1.21 ILR, clips above 85.9%).

## 5. Roadmap position

Closes the PV system-design batch (v221..v223). Its loading ratio sets part of the performance ratio that
`pv-energy-yield` (v221) takes as an input (a high ILR adds clipping loss, lowering the PR), and it sits beside
`pv-string-sizing`, completing the array-to-inverter match on the power axis as that tile does on the voltage axis. A
climate-aware annual clipping-loss estimate (a binned irradiance distribution) is a deliberate future follow-on.
