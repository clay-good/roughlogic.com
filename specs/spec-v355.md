# roughlogic.com Specification v355 -- Breakpoint Chlorination Dose (calc-treatment.js, Group M, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.124.0). Batch spec-v353..v355 (the pool-and-water chemistry trio -- chlorine dose
> (v353), pool heater sizing (v354), the breakpoint-chlorination dose (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `chlorine-demand` computes the dose to hold a target
> residual and even points to "check the breakpoint curve," but the breakpoint dose itself -- the chlorine needed to burn
> past the chloramine hump and destroy combined chlorine, a shock a pool or water operator does to clear a chloramine smell
> -- has no tile. Adds one tile to the existing **`calc-treatment.js`** module (Group M); no new group, trade, or
> dependency. Inherits spec.md through spec-v354.md.
>
> **The gap, and the evidence for it.** Combined chlorine (chloramines) forms when chlorine reacts with ammonia/organics,
> and to break past it -- the breakpoint, beyond which added chlorine stays as free residual -- takes about a 10-to-1
> weight ratio of chlorine to combined chlorine: `breakpoint_dose = 10 x combined_chlorine`. For a pool showing 0.5 ppm of
> combined chlorine, the breakpoint dose is `10 x 0.5 = 5 ppm` of free chlorine added at once -- the shock that clears the
> chloramine smell and red eyes, versus the small maintenance dose the residual tile computes. Combined chlorine is the total
> minus the free chlorine reading, and the 10x rule is the operator's standard for how hard to hit it. `chlorine-demand`
> holds the residual; this tile clears the chloramines.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The total, free, and combined
chlorine and the breakpoint dose are dimensionless concentrations (ppm); the pool/water volume (optional) is a volume (gal),
letting the ppm dose convert to a product amount. The v18/v21 contract: any non-finite input, or a free chlorine exceeding
the total (`combined < 0`), returns `{ error }`; a zero combined chlorine returns a zero breakpoint dose (nothing to burn
off). Citation discipline (v19/v22): `GOVERNANCE.general` over the breakpoint-chlorination rule by name; `editionNote`
names **the combined chlorine `= total - free`, the breakpoint dose `~ 10 x combined chlorine` (the classic 10:1 shock
ratio to reach breakpoint), and the breakpoint-curve behavior (residual falls through the chloramine hump before free
chlorine builds), per Standard Methods 4500-Cl and AWWA M14**, and states that **this returns the breakpoint shock dose in
ppm (and, with a volume, the product amount) -- it uses the ~10x rule of thumb (the exact breakpoint depends on the ammonia
and organic load and is confirmed by testing after the shock), applies to a pool or a water system with chloramine
formation, and does not add the water's baseline chlorine demand (`chlorine-demand`) or the CYA effect; and this is an
operations aid** -- the measured chemistry after the shock and the health/primacy code govern.

## 2. The tile

### 2.1 `breakpoint-chlorination` -- Breakpoint Chlorination Dose

```
inputs:
  total_ppm    ppm    total chlorine reading
  free_ppm     ppm    free chlorine reading
  ratio        -      breakpoint ratio (default 10)
  gallons      gal    volume (optional, to convert ppm -> product)
  avail        %      product available chlorine (optional)

combined = total_ppm - free_ppm                    ; combined chlorine (chloramines), ppm
dose_ppm = ratio * combined                         ; breakpoint free-chlorine dose, ppm
(optional) lb_product = dose_ppm*(gallons/1e6)*8.34 / (avail/100)
```

**Pinned worked example (total 1.5 ppm, free 1.0 ppm).** `combined = 1.5 - 1.0 = 0.5 ppm`; `dose = 10 x 0.5 = 5 ppm` of
free chlorine to reach breakpoint. For a 15,000 gal pool with 65% cal-hypo, that is
`5 x 0.015 x 8.34 / 0.65 = 0.96 lb = 15.4 oz` of shock. **Cross-check (a heavier chloramine load, combined 1.2 ppm).**
`total 2.4`, `free 1.2` -> `combined = 1.2 ppm`; `dose = 12 ppm` -- more than double, the reason a badly chloraminated pool
takes a heavy shock (and why letting combined chlorine build is expensive to fix). A pool with no combined chlorine
(`total = free`) returns a zero breakpoint dose. The non-finite and `free > total` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["pool-service","water-operations","water"]`, matching `chlorine-demand`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the breakpoint rule, `editionNote` naming
`combined = total - free`, the `10 x combined` dose, the breakpoint-curve behavior, Standard Methods 4500-Cl, and the
rule-of-thumb, confirm-by-testing, no-baseline-demand caveats); `test/fixtures/worked-examples.json` (the 0.5 ppm example +
the heavy-load cross-check); `test/fixtures/compute-map.js` (`breakpoint-chlorination` -> `computeBreakpointChlorination`
in `../../calc-treatment.js`); `scripts/related-tiles.mjs` (-> `chlorine-demand` / `pool-chlorine-dose` / `chlorine-decay`
/ `disinfection-ct`); `data/search/aliases.json` ("breakpoint chlorination", "shock chlorine", "chloramine removal",
"combined chlorine", "10 times combined", "superchlorination", "break point dose", "chloramine shock", "free vs combined
chlorine"); the id appended to the existing treatment renderers block in `app.js`; the `// dims:` annotation (chlorine
values dimensionless ppm, `gallons` volume, `avail` dimensionless); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the `total - free` combined, the `10x` dose, the zero-combined case,
and the `free > total` / non-finite error seams. No new module; re-pin `calc-treatment.js` on the `check:module-sizes`
allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the combined-and-dose assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `combined` / `dose` / product stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (total 1.5, free 1.0 -> 5 ppm dose).

## 5. Roadmap position

Closes the pool-and-water chemistry batch (v353..v355) in `calc-treatment.js`: chlorine dose, heater sizing, and breakpoint
chlorination now stand beside the salt, alkalinity, CYA, and demand tiles. A demand-inclusive shock combining
`chlorine-demand` with the breakpoint dose, a CYA-adjusted breakpoint, and a post-shock retest reminder are the deliberate
next follow-ons once the trio lands. With this batch the pool-service chemistry cluster spans free chlorine, combined
chlorine, salt, alkalinity, CYA, and heating.
